from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from shop.views import ThrottledLoginView

# ✅ add these imports
from shop.password_reset_sendgrid import (
    PasswordResetRequestSendGrid,
    PasswordResetConfirmSendGrid,
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # ─── Core API ───────────────────────────────
    path("api/", include("shop.urls")),

    # ─── User Auth (Email + Social) ─────────────
    path("api/auth/login/", ThrottledLoginView.as_view()),

    # Custom password reset (transactional email)
    path("api/auth/password-reset/", PasswordResetRequestSendGrid.as_view()),
    path("api/auth/password-reset-confirm/", PasswordResetConfirmSendGrid.as_view()),

    # Allauth for social logins (Google, etc.)
    path("accounts/", include("allauth.urls")),

]

# ─── Serve Media Files in Development ──────────
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
