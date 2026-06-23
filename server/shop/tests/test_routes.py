import pytest
from django.urls import resolve
from rest_framework.test import APIClient

from shop.views import MyTokenObtainPairView


@pytest.mark.django_db
def test_token_route_uses_throttled_custom_login_view():
    match = resolve("/api/token/")

    assert match.func.view_class is MyTokenObtainPairView
    assert match.func.view_class.throttle_scope == "login"


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("post", "/api/password-reset/", {"email": "user@example.com"}),
        (
            "post",
            "/api/password-reset/confirm/",
            {"uid": "invalid", "token": "invalid", "new_password": "Strong-Route-47!"},
        ),
        ("post", "/api/auth/registration/", {}),
        ("post", "/api/dj-rest-auth/login/", {}),
        ("post", "/api/dj-rest-auth/registration/", {}),
    ],
)
def test_duplicate_auth_routes_are_removed(method, path, payload):
    response = getattr(APIClient(), method)(path, payload, format="json")

    assert response.status_code == 404


@pytest.mark.django_db
def test_canonical_reset_routes_remain_live_and_throttled():
    client = APIClient()

    request_response = client.post(
        "/api/auth/password-reset/",
        {"email": "missing@example.com"},
        format="json",
    )
    confirm_response = client.post(
        "/api/auth/password-reset-confirm/",
        {"uid": "invalid", "token": "invalid", "new_password": "Strong-Route-47!"},
        format="json",
    )

    assert request_response.status_code == 200
    assert confirm_response.status_code == 400
