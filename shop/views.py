from collections import Counter
import json
from rest_framework import viewsets, permissions, status, generics, parsers, mixins, filters, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import BasePermission, IsAdminUser, AllowAny
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.db.models import Q
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth import get_user_model
from django.contrib.auth.models import update_last_login
from django.core.files.storage import default_storage

from .models import (
    Product, Review, Cart, Order, Payment, CartItem, ReviewMedia,
    Quiz, QuizAnswer, QuizQuestion, QuizResult, ProductMedia, ARExperience,
    SiteAbout, Retailer
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
)

User = get_user_model()


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

        user = User.objects.get(email=serializer.validated_data["email"])
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        reset_link = f"{request.build_absolute_uri('/')}reset-password/{uid}/{token}/"

        send_mail(
            "Password Reset",
            f"Click here to reset your password: {reset_link}",
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
        )
        return Response({"detail": "Password reset email sent"})


# ─── Password Reset (Confirm) ──────────────
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
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context


# ─── Reviews ───────────────────────────────
class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        pid = self.request.query_params.get("product")
        return self.queryset.filter(product_id=pid) if pid else self.queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context


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
        return Order.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        order = self.get_object()
        if order.status != "TO_PAY":
            return Response({"error": "Order cannot be paid."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = "TO_SHIP"
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status not in ["TO_PAY", "TO_SHIP"]:
            return Response({"error": "Order cannot be cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = "CANCELLED"
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"])
    def ship(self, request, pk=None):
        order = self.get_object()
        if order.status != "TO_SHIP":
            return Response({"error": "Order cannot be shipped."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = "TO_RECEIVE"
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"])
    def deliver(self, request, pk=None):
        order = self.get_object()
        if order.status != "TO_RECEIVE":
            return Response({"error": "Order cannot be delivered."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = "TO_RATE"
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        order = self.get_object()
        if order.status != "TO_RATE":
            return Response({"error": "Order cannot be completed."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = "COMPLETED"
        order.save()
        return Response(OrderSerializer(order).data)


# ─── Payments ──────────────────────────────
class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]


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

        selected_answers = QuizAnswer.objects.filter(id__in=answers)
        category_counts = Counter([ans.category for ans in selected_answers])

        if not category_counts:
            return Response({"error": "No answers provided"}, status=400)

        top_category = category_counts.most_common(1)[0][0]
        products = Product.objects.filter(category=top_category)

        quiz = Quiz.objects.get(id=quiz_id)
        result = QuizResult.objects.create(
            user=request.user,
            quiz=quiz,
            recommended_category=top_category,
        )
        result.recommended_products.set(products)

        return Response({
            "category": top_category,
            "products": ProductSerializer(products, many=True, context={"request": request}).data,
        })


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
    
    # ✅ Remove promo image
    @action(detail=True, methods=["delete"], url_path="remove-promo")
    def remove_promo(self, request, pk=None):
        product = self.get_object()
        if product.promo_image:
            product.promo_image.delete(save=False)  # delete from storage
            product.promo_image = None
            product.save(update_fields=["promo_image"])
            return Response({"detail": "Promo image removed"}, status=status.HTTP_204_NO_CONTENT)
        return Response({"detail": "No promo image to delete"}, status=status.HTTP_400_BAD_REQUEST)

    # ✅ Remove card image
    @action(detail=True, methods=["delete"], url_path="remove-card")
    def remove_card(self, request, pk=None):
        product = self.get_object()
        if product.card_image:
            product.card_image.delete(save=False)
            product.card_image = None
            product.save(update_fields=["card_image"])
            return Response({"detail": "Card image removed"}, status=status.HTTP_204_NO_CONTENT)
        return Response({"detail": "No card image to delete"}, status=status.HTTP_400_BAD_REQUEST)


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
        instance.file.delete(save=False)  # remove from storage
        instance.delete()
        return Response({"detail": "Media deleted"}, status=status.HTTP_204_NO_CONTENT)

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
