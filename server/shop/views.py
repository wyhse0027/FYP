from collections import Counter
import json
from io import BytesIO
from rest_framework import viewsets, permissions, status, generics, parsers, mixins, filters, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import BasePermission, IsAdminUser, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.db import transaction
from django.db.models import Avg, Count, Q, Prefetch, F
from django.http import HttpResponse
from django.utils import timezone
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth import get_user_model
from django.contrib.auth.models import update_last_login
from django.core.files.storage import default_storage
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm

from .models import (
    Product, Review, Cart, Order, Payment, CartItem, ReviewMedia,
    Quiz, QuizAnswer, QuizQuestion, QuizResult, ProductMedia, ARExperience,
    SiteAbout, Retailer, ScentPersona, OrderItem
)
from .serializers import (
    ProductSerializer, ReviewSerializer, CartSerializer,
    OrderSerializer, PaymentSerializer, CartItemSerializer,
    UserSerializer, UserSignupSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    MyTokenObtainPairSerializer, ReviewMediaSerializer,
    QuizSerializer, QuizResultSerializer, ProductMediaSerializer,
    AdminQuizSerializer, AdminQuizAnswerSerializer, AdminQuizQuestionSerializer,
    ARExperienceSerializer, SiteAboutSerializer, RetailerSerializer, 
    ScentPersonaSerializer, 
)

User = get_user_model()

# ─── admin cache ─────────────────────────────
@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_dashboard_stats(request):
    cache_key = "admin_dashboard_stats_v1"
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    data = {
        "users": User.objects.count(),
        "products": Product.objects.count(),
        "orders": Order.objects.count(),
        "payments": Payment.objects.count(),
        "quizzes": Quiz.objects.count(),
        "scentPersonas": ScentPersona.objects.count(),
        "ar": ARExperience.objects.count(),
        "reviews": Review.objects.count(),
        "retailers": Retailer.objects.count(),
    }

    # cache for 30s (admin dashboard doesn't need realtime)
    cache.set(cache_key, data, 30)
    return Response(data)


# ─── Permissions ─────────────────────────────
class IsOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user


# ─── Signup ────────────────────────────────
class UserSignupView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSignupSerializer
    permission_classes = [permissions.AllowAny]


# ─── Custom JWT (username OR email) ─────────
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


# ─── Password Reset (Request) ──────────────
class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Do NOT leak whether email exists
            return Response(
                {"detail": "If the email exists, a reset link has been sent."},
                status=status.HTTP_200_OK,
            )

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # use frontend URL, not backend
        frontend_base = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{frontend_base}/reset-password/{uid}/{token}"

        message = (
            "You requested a password reset for your account.\n\n"
            f"Click the link below to set a new password:\n{reset_link}\n\n"
            "If you did not request this, you can ignore this email."
        )

        send_mail(
            "Password Reset",
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
        )

        return Response(
            {"detail": "If the email exists, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


# ─── Password Reset (Confirm) ──────a────────
class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password has been reset successfully"})


# ─── Current Logged-In User ────────────────
class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        serializer = UserSerializer(request.user, context={"request": request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)



class UpdateMeView(generics.UpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


# ─── Products ──────────────────────────────
class ProductViewSet(viewsets.ReadOnlyModelViewSet):  # ✅ switch to ReadOnly if you don't need public write
    queryset = Product.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = ProductSerializer

    def get_queryset(self):
        return (
            Product.objects
            .all()
            .annotate(
                rating_avg=Avg("reviews__rating"),
                rating_count=Count(
                    "reviews__id",
                    filter=Q(reviews__rating__isnull=False),
                    distinct=True,
                ),
            )
            # ✅ KILL N+1: gallery + ar
            .prefetch_related(
                "media_gallery",
                Prefetch(
                    "ar_experience",
                    queryset=ARExperience.objects.only(
                        "id","product_id","type","enabled",
                        "model_glb","marker_mind","marker_image","app_download_file",
                        "created_at","updated_at"
                    ),
                ),
            )
            .order_by("id")
        )

    def get_serializer_context(self):
        return {"request": self.request}


# ─── Reviews ───────────────────────────────
class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        qs = (
            Review.objects
            .select_related("user", "product")        # ✅ kill N+1
            .prefetch_related("media_gallery")        # ✅ kill N+1
            .order_by("-created_at")
        )
        pid = self.request.query_params.get("product")
        return qs.filter(product_id=pid) if pid else qs

    def get_serializer_context(self):
        return {"request": self.request}

class ReviewMediaViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = ReviewMedia.objects.all()
    serializer_class = ReviewMediaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ReviewMedia.objects.filter(review__user=self.request.user)


# ─── Cart ──────────────────────────────────
class CartViewSet(viewsets.ModelViewSet):
    queryset = Cart.objects.all()
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # prevent 401 spam
        if not self.request.user.is_authenticated:
            return Cart.objects.none()
        return Cart.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            raise PermissionDenied("Login required to create a cart.")



class CartItemViewSet(viewsets.ModelViewSet):
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return CartItem.objects.none()
        return CartItem.objects.filter(cart__user=self.request.user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


# ─── Orders ────────────────────────────────
class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = (
            Order.objects
            .select_related("user")
            .select_related("payment")  # OneToOne
            .prefetch_related(
                Prefetch("items", queryset=OrderItem.objects.select_related("product"))
            )
            .order_by("-created_at")
        )
        if user.is_staff or user.is_superuser:
            return qs
        return qs.filter(user=user)

    def get_serializer_context(self):
        return {"request": self.request}

    def create(self, request, *args, **kwargs):
        # ✅ atomic checkout creation
        with transaction.atomic():
            return super().create(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        with transaction.atomic():
            order = self.get_object()

            if order.status != "TO_PAY":
                return Response({"error": "Order cannot be paid."}, status=400)

            method = request.data.get("method")
            txid = request.data.get("transaction_id")
            success_raw = request.data.get("success", True)

            success = (
                success_raw.lower() in ["1", "true", "yes", "y"]
                if isinstance(success_raw, str)
                else bool(success_raw)
            )

            if method not in ["CARD", "FPX", "E_WALLET"]:
                return Response({"error": "Invalid or missing payment method."}, status=400)

            payment = Payment.objects.filter(order=order).first()
            if not payment:
                payment = Payment.objects.create(
                    order=order, amount=order.total, method=method, status="PENDING"
                )

            payment.method = method
            payment.amount = order.total
            if txid:
                payment.transaction_id = txid

            if not success:
                payment.status = "FAILED"
                payment.save(update_fields=["method", "amount", "transaction_id", "status"])
                order.status = "TO_PAY"
                order.save(update_fields=["status"])
                return Response(
                    {"detail": "Payment failed.", "order": OrderSerializer(order, context={"request": request}).data},
                    status=400
                )

            payment.status = "SUCCESS"
            if not payment.transaction_id:
                payment.transaction_id = f"PAY-{timezone.now().strftime('%Y%m%d%H%M%S')}-{order.id}"

            order.status = "TO_SHIP"
            payment.save(update_fields=["method", "amount", "transaction_id", "status"])
            order.save(update_fields=["status"])

            return Response(OrderSerializer(order, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        with transaction.atomic():
            order = self.get_object()

            if order.status not in ["TO_PAY", "TO_SHIP"]:
                return Response({"error": "Order cannot be cancelled."}, status=400)

            # ✅ restock efficiently
            for item in order.items.all():
                Product.objects.filter(id=item.product_id).update(
                    stock=F("stock") + item.quantity
                )

            # ✅ sync payment
            payment = Payment.objects.filter(order=order).first()
            if payment and payment.status in ["PENDING", "SUCCESS"]:
                payment.status = "CANCELLED"
                payment.save(update_fields=["status"])

            order.status = "CANCELLED"
            order.save(update_fields=["status"])

            return Response(OrderSerializer(order, context={"request": request}).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def ship(self, request, pk=None):
        order = self.get_object()

        if order.status != "TO_SHIP":
            return Response({"error": "Order cannot be shipped."}, status=400)

        payment = Payment.objects.filter(order=order).first()
        if not payment:
            return Response({"error": "No payment record."}, status=400)

        if payment.method != "COD" and payment.status != "SUCCESS":
            return Response({"error": "Payment not successful."}, status=400)

        order.status = "TO_RECEIVE"
        order.save(update_fields=["status"])
        return Response(OrderSerializer(order, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def deliver(self, request, pk=None):
        with transaction.atomic():
            order = self.get_object()

            if order.status != "TO_RECEIVE":
                return Response({"error": "Order cannot be delivered."}, status=400)

            order.status = "TO_RATE"
            order.save(update_fields=["status"])

            # ✅ COD becomes SUCCESS when delivered (keep this rule)
            payment = Payment.objects.filter(order=order).first()
            if payment and payment.method == "COD" and payment.status != "SUCCESS":
                payment.status = "SUCCESS"
                if not payment.transaction_id:
                    payment.transaction_id = f"COD-{timezone.now().strftime('%Y%m%d%H%M%S')}-{order.id}"
                payment.save(update_fields=["status", "transaction_id"])

            return Response(OrderSerializer(order, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        order = self.get_object()
        if order.status != "TO_RATE":
            return Response({"error": "Order cannot be completed."}, status=400)
        order.status = "COMPLETED"
        order.save(update_fields=["status"])
        return Response(OrderSerializer(order, context={"request": request}).data)
    

    @action(detail=True, methods=["get"], url_path="receipt-pdf")
    def receipt_pdf(self, request, pk=None):
        """
        Generate a PDF for this order.

        - If payment is SUCCESS -> acts as a Payment Receipt.
        - If payment is COD / PENDING -> acts as Order Confirmation / Invoice.
        - Always accessible only by the order owner (enforced by get_queryset()).
        """
        order = self.get_object()
        try:
            payment = order.payment
        except Payment.DoesNotExist:
            payment = None

        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        # ─── Header / Brand ─────────────────────────────────
        y = height - 30 * mm
        p.setFont("Helvetica-Bold", 18)
        p.drawString(25 * mm, y, "GERAIN CHAN OFFICIAL STORE")

        # Decide document title based on payment status
        is_paid = bool(payment and payment.status == "SUCCESS")
        doc_title = "Payment Receipt" if is_paid else "Order Confirmation / Invoice"

        y -= 8 * mm
        p.setFont("Helvetica", 11)
        p.drawString(25 * mm, y, doc_title)

        # ─── Order Details ──────────────────────────────────
        y -= 10 * mm
        p.setFont("Helvetica", 10)
        p.drawString(25 * mm, y, f"Order ID: {order.id}")
        y -= 5 * mm
        p.drawString(
            25 * mm,
            y,
            f"Order Date: {order.created_at.strftime('%Y-%m-%d %H:%M')}",
        )
        y -= 5 * mm
        p.drawString(25 * mm, y, f"Order Status: {order.status}")

        # ─── Customer / Shipping Info ───────────────────────
        y -= 10 * mm
        p.setFont("Helvetica-Bold", 11)
        p.drawString(25 * mm, y, "Bill To / Ship To:")
        p.setFont("Helvetica", 10)

        address_lines = [
            order.fullname,
            f"Phone: {order.phone}",
            order.line1,
            order.line2 or "",
            f"{order.postcode} {order.city}",
            f"{order.state}, {order.country}",
        ]
        for line in address_lines:
            if line:
                y -= 5 * mm
                p.drawString(25 * mm, y, line)

        # ─── Items Header ───────────────────────────────────
        y -= 10 * mm
        p.setFont("Helvetica-Bold", 11)
        p.drawString(25 * mm, y, "Items")
        p.setFont("Helvetica", 10)

        y -= 6 * mm
        p.drawString(25 * mm, y, "Product")
        p.drawString(110 * mm, y, "Qty")
        p.drawString(130 * mm, y, "Price")
        p.drawString(160 * mm, y, "Total")

        y -= 4 * mm
        p.line(25 * mm, y, 185 * mm, y)

        # ─── Items List ─────────────────────────────────────
        for item in order.items.all():
            line_total = float(item.price) * item.quantity

            y -= 7 * mm
            if y < 40 * mm:
                p.showPage()
                p.setFont("Helvetica", 10)
                y = height - 30 * mm

                # re-draw columns header on new page
                p.setFont("Helvetica-Bold", 11)
                p.drawString(25 * mm, y, "Items (cont.)")
                p.setFont("Helvetica", 10)
                y -= 6 * mm
                p.drawString(25 * mm, y, "Product")
                p.drawString(110 * mm, y, "Qty")
                p.drawString(130 * mm, y, "Price")
                p.drawString(160 * mm, y, "Total")
                y -= 4 * mm
                p.line(25 * mm, y, 185 * mm, y)

            p.drawString(25 * mm, y, item.product.name[:40])
            p.drawString(112 * mm, y, str(item.quantity))
            p.drawRightString(150 * mm, y, f"RM {float(item.price):.2f}")
            p.drawRightString(185 * mm, y, f"RM {line_total:.2f}")

        # ─── Total ──────────────────────────────────────────
        y -= 10 * mm
        p.line(120 * mm, y, 185 * mm, y)
        y -= 6 * mm
        p.setFont("Helvetica-Bold", 11)
        p.drawRightString(150 * mm, y, "Total:")
        p.drawRightString(185 * mm, y, f"RM {float(order.total):.2f}")

        # ─── Payment Info ───────────────────────────────────
        y -= 12 * mm
        p.setFont("Helvetica-Bold", 11)
        p.drawString(25 * mm, y, "Payment")
        p.setFont("Helvetica", 10)

        if payment:
            method = payment.method
            status = payment.status
            txid = payment.transaction_id or "-"
        else:
            method = "N/A"
            status = "N/A"
            txid = "-"

        y -= 6 * mm
        p.drawString(25 * mm, y, f"Method: {method}")
        y -= 5 * mm
        p.drawString(25 * mm, y, f"Status: {status}")

        # Only show TX ID for successful non-COD payments
        if is_paid and method != "COD":
            y -= 5 * mm
            p.drawString(25 * mm, y, f"Transaction ID: {txid}")

        # ─── Footer ─────────────────────────────────────────
        y -= 15 * mm
        p.setFont("Helvetica-Oblique", 9)

        if is_paid:
            p.drawString(
                25 * mm,
                y,
                "Thank you for your payment and for shopping with GERAIN CHAN.",
            )
        elif method == "COD":
            p.drawString(
                25 * mm,
                y,
                "Thank you for your order. For COD, please pay the amount due upon delivery.",
            )
        else:
            p.drawString(
                25 * mm,
                y,
                "Thank you for your order. Payment is pending.",
            )

        p.showPage()
        p.save()
        buffer.seek(0)

        filename = f"order_{order.id}.pdf"
        response = HttpResponse(buffer, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

# ─── Payments ──────────────────────────────
class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related("order", "order__user")
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Payment.objects.none()
        if user.is_staff or user.is_superuser:
            return self.queryset
        # Normal user: only see own payments
        return self.queryset.filter(order__user=user)

    def perform_create(self, serializer):
        user = self.request.user
        order = serializer.validated_data["order"]

        # Security: order must belong to current user
        if order.user != user:
            raise PermissionDenied("You cannot create a payment for this order.")

        # One payment per order (safe check for OneToOne)
        if Payment.objects.filter(order=order).exists():
            raise serializers.ValidationError({"detail": "Payment already exists for this order."})

        # Amount & status are server-controlled
        serializer.save(
            amount=order.total,
            status="PENDING",
        )

    def update(self, request, *args, **kwargs):
        # Only admins can directly edit payments
        if not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied("Only admins can modify payments directly.")
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        # Only admins can delete (DFD 6.6)
        if not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied("Only admins can delete payments.")
        return super().destroy(request, *args, **kwargs)


# ─── Quizzes ───────────────────────────────
class QuizViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [permissions.AllowAny]


class QuizSubmitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        quiz_id = request.data.get("quiz")
        answers = request.data.get("answers", [])

        quiz = get_object_or_404(Quiz, id=quiz_id)

        selected_answers = QuizAnswer.objects.filter(id__in=answers)
        if not selected_answers.exists():
            return Response({"error": "No answers provided"}, status=status.HTTP_400_BAD_REQUEST)

        category_counts = Counter(
            [a.category for a in selected_answers if a.category]
        )
        top_category = category_counts.most_common(1)[0][0] if category_counts else None

        products_qs = Product.objects.all()

        # 1) category filter from answers
        if top_category:
            products_qs = products_qs.filter(category=top_category)

        # 2) audience filter from quiz -> product.target
        if quiz.audience == "MEN":
            products_qs = products_qs.filter(target__in=["MEN", "UNISEX"])
        elif quiz.audience == "WOMEN":
            products_qs = products_qs.filter(target__in=["WOMEN", "UNISEX"])
        elif quiz.audience == "UNISEX":
            products_qs = products_qs.filter(target="UNISEX")
        # ANY = no restriction

        # 3) whitelist (tight control)
        allowed_ids = list(quiz.allowed_products.values_list("id", flat=True))
        if allowed_ids:
            products_qs = products_qs.filter(id__in=allowed_ids)

        products_qs = products_qs.distinct()

        # create result row
        result = QuizResult.objects.create(
            user=request.user,
            quiz=quiz,
            recommended_category=top_category or "",
        )
        result.recommended_products.set(products_qs)

        # 🔥 return full result including persona
        serializer = QuizResultSerializer(result, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


# ─── Admin User Management ───────────────────────────────
class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context

class AdminProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx
    
    # ✅ Remove promo image (idempotent)
    @action(detail=True, methods=["delete"], url_path="remove-promo")
    def remove_promo(self, request, pk=None):
        product = self.get_object()

        if not product.promo_image:
            # was 400, change to 200
            return Response({"detail": "Promo image already removed."}, status=status.HTTP_200_OK)

        # delete file + clear db
        product.promo_image.delete(save=False)
        product.promo_image = None
        product.save(update_fields=["promo_image"])

        return Response({"detail": "Promo image removed."}, status=status.HTTP_200_OK)


    # ✅ Remove card image (idempotent)
    @action(detail=True, methods=["delete"], url_path="remove-card")
    def remove_card(self, request, pk=None):
        product = self.get_object()

        if not product.card_image:
            # was 400, change to 200
            return Response({"detail": "Card image already removed."}, status=status.HTTP_200_OK)

        product.card_image.delete(save=False)
        product.card_image = None
        product.save(update_fields=["card_image"])

        return Response({"detail": "Card image removed."}, status=status.HTTP_200_OK)



class AdminProductMediaViewSet(viewsets.ModelViewSet):
    queryset = ProductMedia.objects.all()
    serializer_class = ProductMediaSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        pid = self.request.query_params.get("product")
        return self.queryset.filter(product_id=pid) if pid else self.queryset
    
class AdminOrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().select_related("user").prefetch_related("items__product")
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAdminUser]

    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get("status")

        valid_statuses = ["TO_PAY", "TO_SHIP", "TO_RECEIVE", "TO_RATE", "COMPLETED", "CANCELLED"]
        if new_status not in valid_statuses:
            return Response({"error": "Invalid status"}, status=400)

        order.status = new_status
        order.save()
        return Response(OrderSerializer(order, context={"request": request}).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({"detail": "Order deleted"}, status=status.HTTP_204_NO_CONTENT)


# ─── Admin Quiz Management ───────────────────────────────
class AdminQuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.all()
    serializer_class = AdminQuizSerializer
    permission_classes = [permissions.IsAdminUser]


class AdminQuizQuestionViewSet(viewsets.ModelViewSet):
    queryset = QuizQuestion.objects.all()
    serializer_class = AdminQuizQuestionSerializer
    permission_classes = [permissions.IsAdminUser]


class AdminQuizAnswerViewSet(viewsets.ModelViewSet):
    queryset = QuizAnswer.objects.all()
    serializer_class = AdminQuizAnswerSerializer
    permission_classes = [permissions.IsAdminUser]

@api_view(["GET"])
@permission_classes([IsAdminUser])
def AdminCategoryList(request):
    """
    Returns a list of all unique product categories for dropdowns.
    Used by the admin panel when adding/editing products.
    """
    cats = list(Product.objects.values_list("category", flat=True).distinct())
    return Response(sorted(cats))

class ScentPersonaViewSet(viewsets.ModelViewSet):
    """
    Public:
      - GET /scent-personas/
      - GET /scent-personas/{id}/
      - GET /scent-personas/?category=FRESH

    Admin:
      - POST /admin/scent-personas/
      - PATCH/PUT /admin/scent-personas/{id}/
      - DELETE /admin/scent-personas/{id}/
    """
    queryset = ScentPersona.objects.all().order_by("category", "persona_name")
    serializer_class = ScentPersonaSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category__iexact=category)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx
    
    @action(detail=False, methods=["get"], url_path="by-category/(?P<category>[^/]+)")
    def by_category(self, request, category=None):
        persona = get_object_or_404(ScentPersona, category__iexact=category)
        serializer = self.get_serializer(persona)
        return Response(serializer.data)


# ─── AR ───────────────────────────────
class ARExperienceViewSet(viewsets.ModelViewSet):
    queryset = ARExperience.objects.all()
    serializer_class = ARExperienceSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    # ✅ Add this
    def get_queryset(self):
        queryset = super().get_queryset()
        request = self.request

        # Allow both numeric ID and name
        product_id = request.query_params.get("product")
        product_name = request.query_params.get("product__name")

        if product_id:
            queryset = queryset.filter(product_id=product_id)
        elif product_name:
            queryset = queryset.filter(product__name__iexact=product_name)

        return queryset
        
class ARDeleteMarkerView(APIView):
    def delete(self, request, pk):
        ar = get_object_or_404(ARExperience, pk=pk)
        if ar.marker_image:
            ar.marker_image.delete(save=False)
            ar.marker_image = None
            ar.save(update_fields=["marker_image"])
            return Response({"detail": "Marker deleted."})
        return Response({"detail": "No marker found."}, status=404)

class ARDeleteGLBView(APIView):
    def delete(self, request, pk):
        ar = get_object_or_404(ARExperience, pk=pk)
        if ar.model_glb:
            ar.model_glb.delete(save=False)
            ar.model_glb = None
            ar.save(update_fields=["model_glb"])
            return Response({"detail": "GLB deleted."})
        return Response({"detail": "No GLB found."}, status=404)


class ARDeleteMindView(APIView):
    def delete(self, request, pk):
        ar = get_object_or_404(ARExperience, pk=pk)
        if ar.marker_mind:
            ar.marker_mind.delete(save=False)
            ar.marker_mind = None
            ar.save(update_fields=["marker_mind"])
            return Response({"detail": "MIND deleted."})
        return Response({"detail": "No MIND file found."}, status=404)

# ─── Admin Review Management ───────────────────────────────
class AdminReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all().select_related("user", "product").prefetch_related("media_gallery")
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "product__name", "user__username"]
    ordering = ["-created_at"]  # default newest first

    def get_queryset(self):
        qs = super().get_queryset()
        product_name = self.request.query_params.get("product")
        if product_name:
            qs = qs.filter(product__name__icontains=product_name)
        return qs
    
# ─── Site Information (About Us) ─────────────────────────────
class SiteAboutViewSet(viewsets.ModelViewSet):
    """Public + Admin access for the About Us section."""
    queryset = SiteAbout.objects.all().order_by('-updated_at')
    serializer_class = SiteAboutSerializer
    permission_classes = [permissions.AllowAny]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def create(self, request, *args, **kwargs):
        if SiteAbout.objects.exists():
            existing = SiteAbout.objects.first()
            serializer = self.get_serializer(existing, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            print("❌ SiteAbout validation errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()

        # ✅ Safely load existing icons
        icons = instance.social_icons
        if isinstance(icons, str):
            try:
                icons = json.loads(icons)
            except json.JSONDecodeError:
                icons = {}

        # ✅ Handle uploaded icons
        for key, file in request.FILES.items():
            if key.startswith("social_icon_"):
                platform = key.replace("social_icon_", "")
                file_path = default_storage.save(f"social_icons/{file.name}", file)
                icons[platform] = request.build_absolute_uri(default_storage.url(file_path))

        # ✅ Save updated icons back as JSON
        data["social_icons"] = json.dumps(icons)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)
    
class RetailerViewSet(viewsets.ModelViewSet):
    queryset = Retailer.objects.all().order_by("name")
    serializer_class = RetailerSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    # add this create override so you can see real validation messages
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            print("❌ Retailer create errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class AdminPaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related("order", "order__user")
    serializer_class = PaymentSerializer
    permission_classes = [IsAdminUser]

    def update(self, request, *args, **kwargs):
        """
        Admin can edit payment fields like status/method/transaction_id.

        We do NOT rely on PaymentSerializer writable config here because for
        normal users these fields should stay server-controlled.

        Also keeps the related order in a consistent state:

        - SUCCESS (non-COD) + order TO_PAY -> order TO_SHIP
        - FAILED -> ensure order is TO_PAY so user can retry
        - CANCELLED -> no automatic order cancel (can be customized)
        """
        partial = kwargs.pop("partial", False)
        payment = self.get_object()
        data = request.data

        allowed_statuses = ["PENDING", "SUCCESS", "FAILED", "CANCELLED"]

        # Read incoming values (fallback to existing)
        new_status = data.get("status", payment.status)
        new_method = data.get("method", payment.method)
        new_txid = data.get("transaction_id", payment.transaction_id)
        new_amount = data.get("amount", payment.amount)

        # Validate status
        if new_status not in allowed_statuses:
            return Response(
                {"error": "Invalid status"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Optionally, validate method if provided
        if new_method and new_method not in ["COD", "CARD", "FPX", "E_WALLET"]:
            return Response(
                {"error": "Invalid method"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Apply changes to Payment ---
        payment.status = new_status
        payment.method = new_method
        payment.transaction_id = new_txid
        payment.amount = new_amount
        payment.save()

        # --- Sync related Order (non-final only) ---
        order = payment.order
        if order and order.status not in ["COMPLETED", "CANCELLED"]:
            if new_status == "SUCCESS":
                # For non-COD successful payments: if order was waiting to be paid, move it forward
                if payment.method != "COD" and order.status == "TO_PAY":
                    order.status = "TO_SHIP"
                    order.save()

            elif new_status == "FAILED":
                # Ensure order is payable again so user can retry
                if order.status not in ["TO_PAY", "CANCELLED"]:
                    order.status = "TO_PAY"
                    order.save()

            elif new_status == "CANCELLED":
                # Intentionally do nothing to order by default.
                # You can uncomment this if your business rule wants it.
                # if order.status == "TO_PAY":
                #     order.status = "CANCELLED"
                #     order.save()
                pass

            # PENDING: no auto-change to order

        # Return updated payment
        serializer = self.get_serializer(payment)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        Allow admin to delete a payment record.
        Does NOT touch the order.
        """
        instance = self.get_object()
        instance.delete()
        return Response({"detail": "Payment deleted"}, status=status.HTTP_204_NO_CONTENT)

