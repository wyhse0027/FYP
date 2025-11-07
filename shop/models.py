from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils import timezone

# ─── User Management ───────────────────────────────
class User(AbstractUser):
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    # Address broken into parts
    address_line1 = models.CharField(max_length=255, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)

    role = models.CharField(
        max_length=20,
        choices=[("user", "User"), ("admin", "Admin")],
        default="user"
    )

    def __str__(self):
        return self.username


# ─── Product Management ────────────────────────────
class Product(models.Model):
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    description = models.TextField()

    promo_image = models.ImageField(upload_to="products/promos/", blank=True, null=True)
    card_image = models.ImageField(upload_to="products/cards/", blank=True, null=True)

    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ProductMedia(models.Model):
    MEDIA_TYPES = [("IMAGE", "Image"), ("VIDEO", "Video")]
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="media_gallery")
    file = models.FileField(upload_to="products/media/")
    type = models.CharField(max_length=10, choices=MEDIA_TYPES, default="IMAGE")

    def __str__(self):
        return f"{self.product.name} - {self.type}"


# ─── AR Experience ─────────────────────────────────────
class ARExperience(models.Model):
    AR_TYPE_CHOICES = [
        ("MARKER", "Marker-based"),
        ("MARKERLESS", "Markerless"),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="ar_experience"
    )
    type = models.CharField(
        max_length=20,
        choices=AR_TYPE_CHOICES,
        default="MARKER",
        help_text="Select whether this AR uses a marker image or markerless tracking."
    )
    enabled = models.BooleanField(default=True)

    # 🆕 Uploadable AR app (.apk) file
    app_download_file = models.FileField(
        upload_to="ar/apk/",
        blank=True,
        null=True,
        help_text="Upload the AR mobile app (.apk) for Android users."
    )

    # ✅ Files stored in Django's media folder
    model_glb = models.FileField(
        upload_to="ar/models/",
        blank=True,
        null=True,
        help_text="Upload the exported GLB model file."
    )
    marker_mind = models.FileField(
        upload_to="ar/mind/",
        blank=True,
        null=True,
        help_text="Upload the compiled .mind file for MindAR tracking."
    )
    marker_image = models.ImageField(
        upload_to="ar/markers/",
        blank=True,
        null=True,
        help_text="Marker image for user reference (optional preview)."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "AR Experience"
        verbose_name_plural = "AR Experiences"
        ordering = ["product", "type"]

    def __str__(self):
        return f"{self.product.name} ({self.type})"

    @property
    def app_download_file_url(self):
        """Return full URL for the uploaded APK file."""
        if self.app_download_file:
            return self.app_download_file.url
        return None


# ─── Cart ─────────────────────────────────────────
class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="cart")
    created_at = models.DateTimeField(auto_now_add=True)


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)


# ─── Order ────────────────────────────────────────
class Order(models.Model):
    STATUS_CHOICES = [
        ("TO_PAY", "To Pay"),
        ("TO_SHIP", "To Ship"),
        ("TO_RECEIVE", "To Receive"),
        ("TO_RATE", "To Rate"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="TO_PAY")
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # ✅ Delivery Address fields
    fullname = models.CharField(max_length=255, default="Unknown")
    phone = models.CharField(max_length=50, default="N/A")
    line1 = models.CharField(max_length=255, default="Unknown")
    line2 = models.CharField(max_length=255, blank=True, null=True)
    postcode = models.CharField(max_length=20, default="00000")
    city = models.CharField(max_length=100, default="Unknown")
    state = models.CharField(max_length=100, default="Unknown")
    country = models.CharField(max_length=100, default="Malaysia")

    def __str__(self):
        return f"Order {self.id} by {self.user.username}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=8, decimal_places=2)


# ─── Payment ──────────────────────────────────────
class Payment(models.Model):
    METHOD_CHOICES = [
        ("CARD", "Credit/Debit Card"),
        ("FPX", "FPX Online Banking"),
        ("E_WALLET", "E-Wallet"),
        ("COD", "Cash on Delivery"),
    ]
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="payment")
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, default="PENDING")
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


# ─── Quiz & Reviews ───────────────────────────────
# shop/models.py

class Quiz(models.Model):
    """A quiz definition, global (not tied to one user)."""
    title = models.CharField(max_length=200, default="Fragrance Quiz")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class QuizQuestion(models.Model):
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="questions",
        default=1   # 👈 set default Quiz with ID=1
    )
    text = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.text


# ─── Quiz & Reviews ───────────────────────────────

def get_category_choices():
    """
    Dynamically fetch distinct product categories.
    This ensures quiz answer dropdown matches real product categories.
    Safe even during migrations/startup.
    """
    try:
        from django.db import connection
        # ✅ Prevent crash if Product table not yet created
        if "shop_product" not in connection.introspection.table_names():
            return [("Fresh", "Fresh"), ("Bold", "Bold")]

        from .models import Product
        categories = Product.objects.values_list("category", flat=True).distinct()
        return [(c, c) for c in categories if c]
    except Exception as e:
        print(f"[WARN] get_category_choices() fallback due to: {e}")
        return [("Fresh", "Fresh"), ("Bold", "Bold")]


class QuizAnswer(models.Model):
    question = models.ForeignKey(
        "QuizQuestion", on_delete=models.CASCADE, related_name="answers"
    )
    answer_text = models.CharField(max_length=255)

    # ✅ dynamic category choices
    category = models.CharField(
        max_length=50,
        choices=get_category_choices,
        default="Fresh"
    )

    def __str__(self):
        return f"{self.question.text} → {self.answer_text}"



class QuizResult(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="results")
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="quiz_results",
        null=True,   # ✅ allow null for migration
        blank=True
    )
    recommended_category = models.CharField(max_length=100)
    recommended_products = models.ManyToManyField(Product)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username if self.user else 'Unknown'} - {self.recommended_category}"



# models.py
class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.PositiveIntegerField(default=5)
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} review for {self.product.name}"

class ReviewMedia(models.Model):
    MEDIA_TYPES = [("IMAGE", "Image"), ("VIDEO", "Video")]

    review = models.ForeignKey(
        "Review", on_delete=models.CASCADE, related_name="media_gallery"
    )
    file = models.FileField(upload_to="reviews/media/")
    type = models.CharField(max_length=10, choices=MEDIA_TYPES, default="IMAGE")

    def __str__(self):
        return f"{self.review.product.name} - {self.type}"


# ✅ Cleanup signal to safely delete file from storage
@receiver(post_delete, sender=ReviewMedia)
def delete_review_media_file(sender, instance, **kwargs):
    """
    Safely remove file from storage when ReviewMedia row is deleted.
    On Windows, this avoids PermissionError by renaming before deletion.
    """
    import os, uuid

    if instance.file and instance.file.name:
        file_path = instance.file.path
        if os.path.exists(file_path):
            try:
                # Close file handle if open
                try:
                    instance.file.close()
                except Exception:
                    pass

                # Rename first to break Windows file lock
                tmp_path = f"{file_path}.deleted_{uuid.uuid4().hex}"
                os.rename(file_path, tmp_path)

                # Try deleting renamed file
                os.remove(tmp_path)

            except PermissionError:
                # If still locked, leave renamed file for later cleanup
                print(f"[WARN] File locked, left as: {tmp_path}")
            except Exception as e:
                print(f"[ERROR] Unexpected error while deleting media file: {e}")
                
class SiteAbout(models.Model):
    """Editable 'About Us' section for the website."""

    title = models.CharField(
        max_length=150,
        default="About GERAIN CHAN",
        blank=True,
        null=True,
        help_text="Main heading for the About page."
    )
    intro_text = models.CharField(max_length=255, blank=True, null=True)
    body_text = models.TextField(blank=True, null=True)
    mission = models.TextField(blank=True, null=True)
    vision = models.TextField(blank=True, null=True)

    # ✅ Images
    hero_image = models.ImageField(
        upload_to="site/about/hero/",
        blank=True,
        null=True,
        help_text="Main banner or background image."
    )
    gallery_images = models.JSONField(default=list, blank=True, null=True)

    # ✅ Contact & social info
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    social_links = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        help_text='Example: {"instagram": "...", "facebook": "..."}'
    )

    # ✅ NEW — store uploaded social icons per platform
    social_icons = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        help_text='Example: {"instagram": "/media/site/about/icons/insta.png"}'
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Site About"
        verbose_name_plural = "Site About"
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title or "About Page"


class Retailer(models.Model):
    name = models.CharField(max_length=150)
    address = models.CharField(max_length=255)

    # 🕒 Operating hours (separate fields)
    opening_time = models.TimeField(default=timezone.now)
    closing_time = models.TimeField(default=timezone.now)
    is_open_24h = models.BooleanField(default=False, help_text="Tick if open 24 hours")

    # ☎️ Contact details
    phone = models.CharField(max_length=50, blank=True, null=True)
    map_url = models.URLField(blank=True, null=True, help_text="Optional Google Maps link")

    # 🖼️ Retailer image
    image = models.ImageField(
        upload_to="retailers/images/",
        blank=True,
        null=True,
        help_text="Upload a photo of the retailer (e.g. storefront or logo)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    # Optional helper for display
    def operating_hours_display(self):
        if self.is_open_24h:
            return "Open 24 Hours"
        return f"{self.opening_time.strftime('%H:%M')} – {self.closing_time.strftime('%H:%M')}"