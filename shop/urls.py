from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .social_views import GoogleLoginView
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    ProductViewSet, ReviewViewSet, CartViewSet,
    OrderViewSet, PaymentViewSet, CartItemViewSet,
    UserSignupView, MeView, UpdateMeView,
    PasswordResetRequestView, PasswordResetConfirmView,
    MyTokenObtainPairView, ReviewMediaViewSet,
    QuizViewSet, QuizSubmitView,
    AdminUserViewSet, AdminProductViewSet,
    AdminProductMediaViewSet, AdminOrderViewSet,
    AdminQuizViewSet, AdminQuizQuestionViewSet, AdminQuizAnswerViewSet,
    ARExperienceViewSet, ARDeleteMarkerView, ARDeleteGLBView, ARDeleteMindView,
    AdminReviewViewSet, SiteAboutViewSet, RetailerViewSet, AdminPaymentViewSet,
    ScentPersonaViewSet,
    AdminCategoryList,
)

# ─── Routers ───────────────────────────────────────────────
router = DefaultRouter()
router.register("products", ProductViewSet)
router.register("reviews", ReviewViewSet)
router.register("carts", CartViewSet)
router.register("orders", OrderViewSet)
router.register("payments", PaymentViewSet)
router.register("cart-items", CartItemViewSet)
router.register("review-media", ReviewMediaViewSet, basename="review-media")
router.register("quizzes", QuizViewSet, basename="quiz")
router.register("ar", ARExperienceViewSet, basename="ar-experience")
router.register("site/about", SiteAboutViewSet, basename="site-about")
router.register("retailers", RetailerViewSet, basename="retailers")
router.register("scent-personas", ScentPersonaViewSet, basename="scent-personas")

# ─── Admin Routers ─────────────────────────────────────────
admin_router = DefaultRouter()
admin_router.register("users", AdminUserViewSet, basename="admin-users")
admin_router.register("products", AdminProductViewSet, basename="admin-products")
admin_router.register("product-media", AdminProductMediaViewSet, basename="admin-product-media")
admin_router.register("orders", AdminOrderViewSet, basename="admin-orders")
admin_router.register("quizzes", AdminQuizViewSet, basename="admin-quizzes")
admin_router.register("quiz-questions", AdminQuizQuestionViewSet, basename="admin-quiz-questions")
admin_router.register("quiz-answers", AdminQuizAnswerViewSet, basename="admin-quiz-answers")
admin_router.register("reviews", AdminReviewViewSet, basename="admin-reviews")
admin_router.register("payments", AdminPaymentViewSet, basename="admin-payments")
admin_router.register("scent-personas", ScentPersonaViewSet, basename="admin-scent-personas")

# ─── URL Patterns ──────────────────────────────────────────
urlpatterns = [
    path("", include(router.urls)),

    # Auth / JWT
    path("signup/", UserSignupView.as_view(), name="user-signup"),
    path("me/", MeView.as_view(), name="user-me"),
    path("me/update/", UpdateMeView.as_view(), name="user-update"),
    path("token/", MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/google/", GoogleLoginView.as_view(), name="google-login"),

    # Password Reset
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),

    # Quiz
    path("quiz-submit/", QuizSubmitView.as_view(), name="quiz-submit"),

    # Admin Endpoints
    path("admin/", include(admin_router.urls)),
    path("ar/<int:pk>/delete-marker/", ARDeleteMarkerView.as_view(), name="ar-delete-marker"),
    path("ar/<int:pk>/delete-glb/", ARDeleteGLBView.as_view(), name="ar-delete-glb"),
    path("ar/<int:pk>/delete-mind/", ARDeleteMindView.as_view(), name="ar-delete-mind"),

    # Category dropdown (optional)
    path("admin/categories/", AdminCategoryList, name="admin-category-list"),

    # ✅ Add Social Login (Google)
    path("dj-rest-auth/", include("dj_rest_auth.urls")),
    path("dj-rest-auth/registration/", include("dj_rest_auth.registration.urls")),
    path("accounts/", include("allauth.urls")),  # required for Google OAuth callbacks
]
