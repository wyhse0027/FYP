import json
from datetime import datetime, time
from rest_framework import serializers
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.contrib.auth.models import update_last_login
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    User, Product, ProductMedia, ARExperience, Review, ReviewMedia,
    Cart, CartItem, Order, OrderItem, Payment,
    Quiz, QuizQuestion, QuizAnswer, QuizResult, SiteAbout, Retailer,
    ScentPersona,
)

User = get_user_model()

# put this near the top of serializers.py
class StringListField(serializers.Field):
    """
    Accepts:
      - a real list: ["citrus", "marine"]
      - a JSON string: '["citrus", "marine"]'
      - a comma string: "citrus, marine"
    Always returns a clean Python list of strings.
    """
    def to_internal_value(self, data):
        if data is None or data == "":
            return []

        # Already list/tuple (eg. multipart sending multiple keys)
        if isinstance(data, (list, tuple)):
            items = data
        elif isinstance(data, str):
            # Try JSON first
            try:
                parsed = json.loads(data)
                if isinstance(parsed, (list, tuple)):
                    items = parsed
                else:
                    # not a list -> treat as comma string
                    items = [data]
            except Exception:
                # "citrus, marine" case
                items = [v.strip() for v in data.split(",") if v.strip()]
        else:
            items = [data]

        return [str(v).strip() for v in items if str(v).strip()]

    def to_representation(self, value):
        if not value:
            return []
        if isinstance(value, (list, tuple)):
            return [str(v) for v in value]
        return [str(value)]


# ─── Users ───────────────────────
class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "phone", "avatar", "role",
            "address_line1", "address_line2", "postal_code", "city", "state", "country",
            "last_login", "date_joined"
        ]
        read_only_fields = ["id", "role"]

    def get_avatar_url(self, obj):
        request = self.context.get("request")
        if obj.avatar:
            return request.build_absolute_uri(obj.avatar.url)
        return None

class UserSignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


# ─── Custom JWT (username OR email) ─────────────
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get("username")
        _password = attrs.get("password")

        try:
            user = User.objects.get(Q(username=username_or_email) | Q(email=username_or_email))
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid username/email or password")

        attrs["username"] = user.username
        data = super().validate(attrs)

        # ✅ Update last login timestamp
        update_last_login(None, user)

        # ✅ Include user info
        data["user"] = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "last_login": user.last_login,
            "date_joined": user.date_joined,
        }
        return data


# ─── Password Reset ────────────────────────────
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=6)

    def validate(self, attrs):
        try:
            uid = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = User.objects.get(pk=uid)
        except Exception:
            raise serializers.ValidationError("Invalid reset link")

        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError("Invalid or expired token")

        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user



# ─── Products & AR ───────────────
class ProductMediaSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    class Meta:
        model = ProductMedia
        fields = ["id", "file", "type"]

    def get_file(self, obj):
        request = self.context.get("request")
        if obj.file:
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return None

    def get_type(self, obj):
        return obj.type.lower()


class ProductSerializer(serializers.ModelSerializer):
    promo_image = serializers.SerializerMethodField()
    card_image = serializers.SerializerMethodField()
    media_gallery = ProductMediaSerializer(many=True, read_only=True)
    ar_experience = serializers.SerializerMethodField()

    promo_image_file = serializers.ImageField(write_only=True, required=False)
    card_image_file = serializers.ImageField(write_only=True, required=False)
    gallery_files = serializers.ListField(
        child=serializers.FileField(
            max_length=100000, allow_empty_file=False, use_url=False
        ),
        write_only=True,
        required=False,
    )
    rating_avg = serializers.FloatField(read_only=True)
    rating_count = serializers.IntegerField(read_only=True)

    # ✅ writable tags
    tags = serializers.JSONField(required=False)

    class Meta:
        model = Product
        fields = [
            "id", "name", "category", "target", "price",
            "stock", "description",
            "promo_image", "card_image",
            "promo_image_file", "card_image_file", "gallery_files",
            "tags", "media_gallery",
            "ar_experience", "created_at",
            "rating_avg","rating_count",
        ]

    # ─── Helpers ─────────────────────────────
    def get_ar_experience(self, obj):
        experience = ARExperience.objects.filter(product=obj).first()
        if not experience:
            return None
        return ARExperienceSerializer(experience, context=self.context).data

    def _build_url(self, file_field):
        request = self.context.get("request")
        if file_field:
            return request.build_absolute_uri(file_field.url) if request else file_field.url
        return None

    def get_promo_image(self, obj):
        return self._build_url(obj.promo_image)

    def get_card_image(self, obj):
        return self._build_url(obj.card_image)

    def validate_tags(self, value):
        """Ensure tags are always stored as a clean list of strings"""
        if not value:
            return []
        if isinstance(value, list):
            return [str(t).strip() for t in value if str(t).strip()]
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return [str(t).strip() for t in parsed if str(t).strip()]
            except Exception:
                return [t.strip() for t in value.split(",") if t.strip()]
        return []
    
    def get_tags(self, obj):
        raw = obj.tags
        if not raw:
            return []
        if isinstance(raw, list):
            return raw
        if isinstance(raw, str):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(t).strip() for t in parsed if str(t).strip()]
            except Exception:
                # fallback: split by comma
                return [t.strip() for t in raw.split(",") if t.strip()]
        return []

    # ─── Create / Update ─────────────────────
    def create(self, validated_data):
        tags = self.validate_tags(validated_data.pop("tags", [])) # default []
        promo = validated_data.pop("promo_image_file", None)
        card = validated_data.pop("card_image_file", None)
        gallery = validated_data.pop("gallery_files", [])

        product = Product.objects.create(**validated_data)
        product.tags = tags
        if promo:
            product.promo_image = promo
        if card:
            product.card_image = card
        product.save()

        for f in gallery:
            ProductMedia.objects.create(
                product=product,
                file=f,
                type="VIDEO" if getattr(f, "content_type", "").startswith("video") else "IMAGE",
            )
        return product

    def update(self, instance, validated_data):
        tags_present = "tags" in validated_data
        if tags_present:
            tags = self.validate_tags(validated_data.pop("tags"))
        else:
            validated_data.pop("tags", None)  # ignore if absent
        promo = validated_data.pop("promo_image_file", None)
        card = validated_data.pop("card_image_file", None)
        gallery = validated_data.pop("gallery_files", [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if tags_present:
            instance.tags = tags
        if promo:
            instance.promo_image = promo
        if card:
            instance.card_image = card
        instance.save()

        for f in gallery:
            ProductMedia.objects.create(
                product=instance,
                file=f,
                type="VIDEO" if getattr(f, "content_type", "").startswith("video") else "IMAGE",
            )
        return instance
    
class ProductLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name"]

class ARExperienceSerializer(serializers.ModelSerializer):
    product = ProductLiteSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        source="product",
        write_only=True
    )

    # ✅ Writable fields
    marker_image = serializers.ImageField(required=False, allow_null=True)
    model_glb = serializers.FileField(required=False, allow_null=True)
    marker_mind = serializers.FileField(required=False, allow_null=True)
    app_download_file = serializers.FileField(required=False, allow_null=True)

    # ✅ Auto-built URL fields
    model_glb_url = serializers.SerializerMethodField()
    marker_mind_url = serializers.SerializerMethodField()
    marker_image_url = serializers.SerializerMethodField()
    app_download_file_url = serializers.SerializerMethodField()

    class Meta:
        model = ARExperience
        fields = [
            "id", "product", "product_id",
            "type", "enabled",
            "app_download_file", "app_download_file_url",
            "model_glb", "marker_mind", "marker_image",
            "model_glb_url", "marker_mind_url", "marker_image_url",
            "created_at", "updated_at",
        ]

    # ─── URL Builders ─────────────────────────
    def _url(self, request, file_field):
        if file_field:
            return request.build_absolute_uri(file_field.url) if request else file_field.url
        return None

    def get_model_glb_url(self, obj):
        return self._url(self.context.get("request"), obj.model_glb)

    def get_marker_mind_url(self, obj):
        return self._url(self.context.get("request"), obj.marker_mind)

    def get_marker_image_url(self, obj):
        return self._url(self.context.get("request"), obj.marker_image)

    def get_app_download_file_url(self, obj):
        return self._url(self.context.get("request"), obj.app_download_file)

    # ─── Replace/Delete Logic for all uploadable fields ────────────────────────
    def update(self, instance, validated_data):
        for field in ["marker_image", "model_glb", "marker_mind", "app_download_file"]:
            new_file = validated_data.pop(field, serializers.empty)
            if new_file is None:
                getattr(instance, field).delete(save=False)
                setattr(instance, field, None)
            elif new_file is not serializers.empty:
                old_file = getattr(instance, field)
                if old_file:
                    old_file.delete(save=False)
                setattr(instance, field, new_file)
        return super().update(instance, validated_data)

    
# ─── Reviews ─────────────────────
class ReviewMediaSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()

    class Meta:
        model = ReviewMedia
        fields = ["id", "file", "type"]

    def get_file(self, obj):
        request = self.context.get("request")
        if obj.file:
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return None


class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    # what you return
    product = ProductSerializer(read_only=True)

    # what you accept in POST
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        source="product",          # fills validated_data["product"]
        write_only=True,
    )

    media_gallery = ReviewMediaSerializer(many=True, read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "user",
            "product",      # read-only nested
            "product_id",   # write-only FK
            "rating",
            "comment",
            "media_gallery",
            "files",
            "created_at",
        ]
        read_only_fields = ["id", "user", "media_gallery", "created_at"]

    files = serializers.ListField(
        child=serializers.FileField(
            max_length=100000,
            allow_empty_file=False,
            use_url=False
        ),
        write_only=True,
        required=False,
    )

    def create(self, validated_data):
        request = self.context.get("request")
        files = validated_data.pop("files", [])
        # validated_data now includes "product" from product_id
        review = Review.objects.create(user=request.user, **validated_data)

        for f in files:
            ReviewMedia.objects.create(
                review=review,
                file=f,
                type=(
                    "VIDEO"
                    if getattr(f, "content_type", "").startswith("video")
                    else "IMAGE"
                ),
            )

        return review

    def update(self, instance, validated_data):
        files = validated_data.pop("files", [])
        instance.rating = validated_data.get("rating", instance.rating)
        instance.comment = validated_data.get("comment", instance.comment)
        instance.save()

        for f in files:
            ReviewMedia.objects.create(
                review=instance,
                file=f,
                type="VIDEO" if hasattr(f, "content_type") and f.content_type.startswith("video") else "IMAGE",
            )
        return instance


# ─── Cart & Orders ───────────────
class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source="product", write_only=True
    )

    class Meta:
        model = CartItem
        fields = ["id", "product", "product_id", "quantity"]

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user
        cart, _ = Cart.objects.get_or_create(user=user)
        product = validated_data["product"]
        qty = validated_data.get("quantity", 1)

        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={"quantity": qty}
        )

        if not created:
            item.quantity += qty
            item.save()
        return item


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Cart
        fields = ["id", "user", "items", "created_at"]


class OrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source="product", write_only=True
    )
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_id", "quantity", "price"]
        extra_kwargs = {"price": {"read_only": True}}


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    user = UserSerializer(read_only=True)

    fullname = serializers.CharField(required=True)
    phone = serializers.CharField(required=True)
    line1 = serializers.CharField(required=True)
    line2 = serializers.CharField(required=False, allow_blank=True)
    postcode = serializers.CharField(required=True)
    city = serializers.CharField(required=True)
    state = serializers.CharField(required=True)
    country = serializers.CharField(required=True)

    payment = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "status",
            "total",
            "items",
            "fullname",
            "phone",
            "line1",
            "line2",
            "postcode",
            "city",
            "state",
            "country",
            "created_at",
            "payment",
        ]
        read_only_fields = ["id", "user", "status", "total", "created_at", "payment"]

    def get_payment(self, obj):
        """
        Compact payment summary for frontend:
        { method, status, transaction_id, created_at, amount }
        """
        try:
            p = obj.payment
        except Payment.DoesNotExist:
            return None

        return {
            "method": p.method,
            "status": p.status,
            "transaction_id": p.transaction_id,
            "amount": str(p.amount),
            "created_at": p.created_at,
        }
    
    def create(self, validated_data):
        """
        Create Order + OrderItems, compute total, decrement stock.
        Order starts as TO_PAY.
        """
        request = self.context["request"]
        user = request.user

        items_data = validated_data.pop("items", [])
        order = Order.objects.create(user=user, status="TO_PAY", **validated_data)

        total = 0
        for item_data in items_data:
            product = item_data["product"]
            qty = item_data["quantity"]

            if product.stock < qty:
                raise serializers.ValidationError(
                    {"detail": f"Not enough stock for {product.name}. Remaining: {product.stock}"}
                )

            product.stock -= qty
            product.save()

            price = product.price
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=qty,
                price=price,
            )
            total += float(price) * qty

        order.total = total
        order.save()
        return order


class PaymentSerializer(serializers.ModelSerializer):
    order = OrderSerializer(read_only=True)
    order_id = serializers.PrimaryKeyRelatedField(
        queryset=Order.objects.all(),
        source="order",
        write_only=True,
    )

    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "order_id",
            "method",
            "amount",
            "status",
            "transaction_id",
            "created_at",
        ]
        read_only_fields = ["id", "order", "amount", "status", "transaction_id", "created_at"]



# ─── Quiz Serializers ───────────────
class QuizAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAnswer
        fields = ["id", "answer_text", "category"]


class QuizQuestionSerializer(serializers.ModelSerializer):
    answers = QuizAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = QuizQuestion
        fields = ["id", "text", "answers"]


class QuizSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ["id", "title", "label", "audience", "questions"]

class QuizResultSerializer(serializers.ModelSerializer):
    recommended_products = ProductSerializer(many=True, read_only=True)
    persona = serializers.SerializerMethodField()

    class Meta:
        model = QuizResult
        fields = ["id", "recommended_category", "recommended_products", "persona", "created_at"]
    
    def get_persona(self, obj):
        from .models import ScentPersona

        try:
            persona = ScentPersona.objects.get(category=obj.recommended_category)
        except ScentPersona.DoesNotExist:
            return None

        return ScentPersonaSerializer(persona, context=self.context).data

# ─── Admin Quiz Serializers (Writable) ───────────────
class AdminQuizSerializer(serializers.ModelSerializer):
    allowed_products = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        many=True,
        required=False
    )

    class Meta:
        model = Quiz
        fields = ["id", "title", "label", "audience", "allowed_products", "created_at"]
        read_only_fields = ["id", "created_at"]



class AdminQuizQuestionSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)

    class Meta:
        model = QuizQuestion
        fields = ["id", "quiz", "quiz_title", "text", "created_at"]
        read_only_fields = ["id", "quiz_title", "created_at"]


class AdminQuizAnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source="question.text", read_only=True)

    class Meta:
        model = QuizAnswer
        fields = ["id", "question", "question_text", "answer_text", "category"]
        read_only_fields = ["id", "question_text"]

class ScentPersonaSerializer(serializers.ModelSerializer):
    # Expose URLs for images
    image_url = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()

    # ✅ Frontend sends/reads "description", but we store it in `tagline`
    description = serializers.CharField(
        source="tagline",
        required=False,
        allow_blank=True
    )

    # ✅ NEW:
    scent_notes = StringListField(required=False)
    occasions = StringListField(required=False)

    class Meta:
        model = ScentPersona
        fields = [
            "id",
            "category",
            "persona_name",
            "description",      # <-> tagline
            "scent_notes",
            "occasions",
            "image",
            "image_url",
            "cover_image",
            "cover_image_url",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]

    # ---------- URL helpers ----------
    def _url(self, file_field):
        request = self.context.get("request")
        if file_field:
            return request.build_absolute_uri(file_field.url) if request else file_field.url
        return None

    def get_image_url(self, obj):
        return self._url(obj.image)

    def get_cover_image_url(self, obj):
        return self._url(obj.cover_image)


class SiteAboutSerializer(serializers.ModelSerializer):
    hero_image = serializers.ImageField(required=False, allow_null=True)
    hero_image_url = serializers.SerializerMethodField()
    gallery_images = serializers.JSONField(required=False, default=list)
    social_links = serializers.JSONField(required=False, default=dict)

    title = serializers.CharField(required=False, allow_blank=True)
    intro_text = serializers.CharField(required=False, allow_blank=True)
    body_text = serializers.CharField(required=False, allow_blank=True)
    mission = serializers.CharField(required=False, allow_blank=True)
    vision = serializers.CharField(required=False, allow_blank=True)
    contact_email = serializers.EmailField(required=False, allow_blank=True)
    contact_phone = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)

    # ────────────────────────────────
    # Normalize before DRF JSONField validation
    # ────────────────────────────────
    def run_validation(self, data=serializers.empty):
        # Convert QueryDict → dict
        if hasattr(data, "dict"):
            data = data.dict()

        # Flatten 1-element lists
        for key, val in list(data.items()):
            if isinstance(val, list) and len(val) == 1:
                data[key] = val[0]

        # Parse JSON strings *before* DRF touches them
        for field in ["social_links", "gallery_images"]:
            raw = data.get(field)
            if isinstance(raw, str):
                try:
                    data[field] = json.loads(raw)
                except json.JSONDecodeError:
                    # fallback to simple text parsing
                    if field == "social_links":
                        pairs = [v.split(":", 1) for v in raw.split(",") if ":" in v]
                        data[field] = {k.strip(): v.strip() for k, v in pairs}
                    elif field == "gallery_images":
                        data[field] = [v.strip() for v in raw.split(",") if v.strip()]

        return super().run_validation(data)

    # ────────────────────────────────
    # Usual normalization for hero_image, etc.
    # ────────────────────────────────
    def to_internal_value(self, data):
        print("\n[DEBUG] Raw incoming data =>", data)
        data = data.copy()

        # Flatten any 1-element lists
        for key, value in list(data.items()):
            if isinstance(value, list) and len(value) == 1:
                data[key] = value[0]

        # Ignore hero_image if it’s a URL
        hero_val = data.get("hero_image")
        if hero_val and isinstance(hero_val, str) and hero_val.startswith("http"):
            data.pop("hero_image", None)

        # Remove read-only fields
        for field in ["hero_image_url", "updated_at", "id"]:
            data.pop(field, None)

        return super().to_internal_value(data)

    class Meta:
        model = SiteAbout
        fields = [
            "id", "title", "intro_text", "body_text",
            "mission", "vision",
            "hero_image", "hero_image_url", "gallery_images",
            "contact_email", "contact_phone", "address",
            "social_links", "social_icons", "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]

    def validate_social_icons(self, value):
        if not value:
            return {}
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                pass
        return value


    def get_hero_image_url(self, obj):
        request = self.context.get("request")
        if obj.hero_image:
            return request.build_absolute_uri(obj.hero_image.url) if request else obj.hero_image.url
        return None


    # ─── Clean up Gallery Field (JSON safe) ───────
    def validate_gallery_images(self, value):
        if not value:
            return []
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                return [v.strip() for v in value.split(",") if v.strip()]
        return value

    # ─── Clean up Social Links Field (JSON safe) ──
    def validate_social_links(self, value):
        if not value:
            return {}
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                pass
        return value


class RetailerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Retailer
        fields = [
            "id", "name", "address",
            "opening_time", "closing_time", "is_open_24h",
            "phone", "map_url",
            "image", "image_url",
            "created_at", "updated_at",
        ]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image:
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None

    # Accept "HH:MM" strings and coerce to time
    def to_internal_value(self, data):
        data = data.copy()

        def coerce_time(field):
            raw = data.get(field)
            if isinstance(raw, str) and len(raw) == 5 and raw[2] == ":":
                # "HH:MM"
                try:
                    t = datetime.strptime(raw, "%H:%M").time()
                    data[field] = t
                except ValueError:
                    pass
            # If already "HH:MM:SS" DRF will handle; if file upload uses multipart, leaving as-is is fine.

        # Only coerce when not 24h
        is_24h = data.get("is_open_24h")
        if str(is_24h).lower() in ("true", "1", "on", "yes"):
            # Let validator handle the relationship
            pass
        else:
            coerce_time("opening_time")
            coerce_time("closing_time")

        return super().to_internal_value(data)

    def validate(self, attrs):
        """
        - If is_open_24h, opening/closing are optional.
        - Else, both are required and opening < closing.
        """
        is_24h = attrs.get("is_open_24h", False)

        if is_24h:
            return attrs

        opening = attrs.get("opening_time") or getattr(self.instance, "opening_time", None)
        closing = attrs.get("closing_time") or getattr(self.instance, "closing_time", None)

        if not opening or not closing:
            raise serializers.ValidationError({"detail": "opening_time and closing_time are required unless store is open 24 hours."})

        if isinstance(opening, time) and isinstance(closing, time) and not (opening < closing):
            raise serializers.ValidationError({"detail": "closing_time must be later than opening_time."})

        return attrs