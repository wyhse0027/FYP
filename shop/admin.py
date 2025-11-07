from django.contrib import admin
from django.utils.html import format_html
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import (
    User, Product, ARExperience,
    Cart, CartItem, Order, OrderItem, Payment,
    Quiz, QuizQuestion, QuizAnswer, QuizResult,
    Review, ProductMedia, ReviewMedia, SiteAbout, Retailer
)

# ─── User Admin ───────────────────────────
@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Profile", {
            "fields": (
                "avatar", "phone", "address_line1", "postal_code",
                "city", "state", "country", "role"
            )
        }),
    )
    list_display = ("username", "email", "role", "phone", "last_login", "is_active")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("username", "email", "phone")


# ─── Product & AR ─────────────────────────
class ProductMediaInline(admin.TabularInline):
    """Inline editor for extra product images/videos."""
    model = ProductMedia
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price", "stock", "created_at")
    search_fields = ("name", "category", "tags")
    list_filter = ("category", "created_at")
    inlines = [ProductMediaInline]  # ✅ show media inside Product page


@admin.register(ARExperience)
class ARExperienceAdmin(admin.ModelAdmin):
    list_display = ("product", "type", "enabled", "app_download_file_display", "updated_at")
    list_filter = ("type", "enabled")
    search_fields = ("product__name",)
    readonly_fields = ("created_at", "updated_at", "app_download_file_display")

    fieldsets = (
        (None, {
            "fields": (
                "product", "type", "enabled",
                "app_download_file", "app_download_file_display",
                "model_glb", "marker_mind", "marker_image",
            )
        }),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    # ✅ Show link to the uploaded APK file
    def app_download_file_display(self, obj):
        if obj.app_download_file:
            return format_html(
                '<a href="{}" target="_blank">📱 Download APK</a>', obj.app_download_file.url
            )
        return "No APK uploaded"
    app_download_file_display.short_description = "App Download (APK)"

@admin.register(ProductMedia)
class ProductMediaAdmin(admin.ModelAdmin):
    list_display = ("product", "type", "file")
    list_filter = ("type",)
    search_fields = ("product__name",)


# ─── Cart ─────────────────────────────────
class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "created_at")
    inlines = [CartItemInline]


# ─── Orders & Payments ────────────────────
class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "total", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("id", "user__username", "user__email")
    inlines = [OrderItemInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("order", "method", "amount", "status", "created_at")
    list_filter = ("method", "status")


# ─── Quiz ─────────────────────────────────
@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "created_at")
    search_fields = ("title",)

@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "text")


@admin.register(QuizAnswer)
class QuizAnswerAdmin(admin.ModelAdmin):
    list_display = ("get_quiz", "question", "answer_text")

    def get_quiz(self, obj):
        return obj.question.quiz
    get_quiz.short_description = "Quiz"


@admin.register(QuizResult)
class QuizResultAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "quiz", "recommended_category", "created_at")
    list_filter = ("recommended_category", "created_at")
    search_fields = ("user__username", "quiz__title")



# ─── Reviews ──────────────────────────────
class ReviewMediaInline(admin.TabularInline):
    """Inline editor for extra review images/videos."""
    model = ReviewMedia
    extra = 1


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("product__name", "user__username", "comment")
    inlines = [ReviewMediaInline]   # ✅ show media uploads inside Review page


@admin.register(ReviewMedia)
class ReviewMediaAdmin(admin.ModelAdmin):
    list_display = ("review", "type", "file")
    list_filter = ("type",)
    search_fields = ("review__product__name", "review__user__username")

@admin.register(SiteAbout)
class SiteAboutAdmin(admin.ModelAdmin):
    list_display = ("title", "updated_at", "icon_preview")
    readonly_fields = ("updated_at", "icon_preview_display")
    fieldsets = (
        ("About Content", {
            "fields": (
                "title", "intro_text", "body_text",
                "mission", "vision",
                "hero_image", "gallery_images",
            )
        }),
        ("Contact & Social", {
            "fields": (
                "contact_email", "contact_phone", "address",
                "social_links", "social_icons",  # ✅ show icons JSON in admin
                "icon_preview_display",          # ✅ image preview area
            )
        }),
        ("System Info", {"fields": ("updated_at",)}),
    )

    def icon_preview(self, obj):
        """Short summary for list view."""
        if not obj.social_icons:
            return "-"
        count = len(obj.social_icons)
        return f"{count} icon{'s' if count != 1 else ''}"
    icon_preview.short_description = "Social Icons"

    def icon_preview_display(self, obj):
        """Visual preview inside the edit form."""
        if not obj.social_icons:
            return "No icons uploaded yet."
        html = ""
        for name, url in obj.social_icons.items():
            html += f'<div style="display:inline-block; text-align:center; margin:5px;">'
            html += f'<img src="{url}" width="40" height="40" style="border-radius:6px; margin-bottom:3px; background:#fff; padding:3px;"/><br>'
            html += f'<span style="font-size:12px; color:#555;">{name}</span></div>'
        return format_html(html)
    icon_preview_display.short_description = "Icon Preview"

@admin.register(Retailer)
class RetailerAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "address",
        "operating_hours_display",
        "phone",
        "updated_at",
        "image_preview",
    )
    list_filter = ("is_open_24h", "updated_at")
    search_fields = ("name", "address", "phone")

    readonly_fields = ("image_preview_display", "created_at", "updated_at")

    fieldsets = (
        ("Basic Info", {
            "fields": ("name", "address", "phone", "map_url")
        }),
        ("Operating Hours", {
            "fields": ("is_open_24h", "opening_time", "closing_time")
        }),
        ("Image", {
            "fields": ("image", "image_preview_display")
        }),
        ("System Info", {
            "fields": ("created_at", "updated_at")
        }),
    )

    # 🕒 Display readable hours in list view
    def operating_hours_display(self, obj):
        if obj.is_open_24h:
            return "Open 24 Hours"
        if obj.opening_time and obj.closing_time:
            return f"{obj.opening_time.strftime('%H:%M')} – {obj.closing_time.strftime('%H:%M')}"
        return "-"
    operating_hours_display.short_description = "Operating Hours"

    # 🖼️ Small preview in list view
    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" width="60" height="60" style="object-fit:cover;border-radius:6px;" />',
                obj.image.url
            )
        return "No Image"
    image_preview.short_description = "Image"

    # 🖼️ Larger preview in form view
    def image_preview_display(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" width="200" style="object-fit:cover;border-radius:10px;" />',
                obj.image.url
            )
        return "No image uploaded yet."
    image_preview_display.short_description = "Image Preview"

