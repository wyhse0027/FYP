from unittest.mock import patch

import pytest
from rest_framework.test import APIClient


def google_payload(email="Test@Example.com", *, email_verified=True, name="Test User"):
    return {
        "email": email,
        "email_verified": email_verified,
        "name": name,
    }


@pytest.mark.django_db
@patch("shop.social_views.id_token.verify_oauth2_token")
def test_google_login_rejects_unverified_email(verify_token, django_user_model):
    verify_token.return_value = google_payload(email_verified=False)

    response = APIClient().post(
        "/api/auth/google/",
        {"id_token": "token"},
        format="json",
    )

    assert response.status_code == 400
    assert django_user_model.objects.count() == 0


@pytest.mark.django_db
@patch("shop.social_views.id_token.verify_oauth2_token")
def test_google_login_uses_case_insensitive_normalized_email_identity(
    verify_token, django_user_model
):
    verify_token.side_effect = [
        google_payload(email="Test@Example.com"),
        google_payload(email="test@example.com"),
    ]
    client = APIClient()

    first = client.post("/api/auth/google/", {"id_token": "token-1"}, format="json")
    second = client.post("/api/auth/google/", {"id_token": "token-2"}, format="json")

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["user"]["id"] == second.json()["user"]["id"]
    assert django_user_model.objects.count() == 1
    assert django_user_model.objects.get().email == "test@example.com"


@pytest.mark.django_db
@patch("shop.social_views.id_token.verify_oauth2_token")
def test_google_login_returns_generic_error_for_verification_exception(verify_token):
    verify_token.side_effect = ValueError("raw provider failure should not leak")

    response = APIClient().post(
        "/api/auth/google/",
        {"id_token": "token"},
        format="json",
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid Google token."}


@pytest.mark.django_db
@patch("shop.social_views.id_token.verify_oauth2_token")
def test_google_login_handles_username_collision_deterministically(
    verify_token, django_user_model
):
    django_user_model.objects.create_user(
        username="test",
        email="other@example.com",
        password="password",
    )
    verify_token.return_value = google_payload(email="Test@Example.com")

    response = APIClient().post(
        "/api/auth/google/",
        {"id_token": "token"},
        format="json",
    )

    assert response.status_code == 200
    created = django_user_model.objects.get(email="test@example.com")
    assert created.username != "test"
    assert response.json()["user"]["id"] == created.id
