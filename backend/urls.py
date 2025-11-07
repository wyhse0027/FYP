from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),

    # ─── Core API ───────────────────────────────
    path("api/", include("shop.urls")),

    # ─── JWT Auth (for manual login / fallback) ─
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # ─── User Auth (Email + Social) ─────────────
    path("api/auth/", include("dj_rest_auth.urls")),
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),

    # Allauth for social logins (Google, etc.)
    path("accounts/", include("allauth.urls")),

    # Optional: Explicit Google provider URLs
    path("api/auth/google/", include("allauth.socialaccount.providers.google.urls")),
]

# ─── Serve Media Files in Development ──────────
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
