import pytest
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient


def signup_payload(password):
    return {
        "username": "policy-user",
        "email": "policy@example.com",
        "password": password,
    }


def reset_confirm_payload(user, password):
    return {
        "uid": urlsafe_base64_encode(force_bytes(user.pk)),
        "token": default_token_generator.make_token(user),
        "new_password": password,
    }


@pytest.mark.django_db
def test_signup_rejects_common_password(django_user_model):
    response = APIClient().post(
        "/api/signup/",
        signup_payload("password"),
        format="json",
    )

    assert response.status_code == 400
    assert "password" in response.json()
    assert not django_user_model.objects.filter(username="policy-user").exists()


@pytest.mark.django_db
def test_signup_accepts_strong_password(django_user_model):
    response = APIClient().post(
        "/api/signup/",
        signup_payload("Scented-Policy-47!"),
        format="json",
    )

    assert response.status_code == 201
    assert django_user_model.objects.filter(username="policy-user").exists()


@pytest.mark.django_db
def test_password_reset_confirm_rejects_common_password(django_user_model):
    user = django_user_model.objects.create_user(
        username="reset-policy-user",
        email="reset-policy@example.com",
        password="Old-Policy-47!",
    )

    response = APIClient().post(
        "/api/auth/password-reset-confirm/",
        reset_confirm_payload(user, "password"),
        format="json",
    )

    assert response.status_code == 400
    assert "new_password" in response.json()
    user.refresh_from_db()
    assert user.check_password("Old-Policy-47!")


@pytest.mark.django_db
def test_password_reset_confirm_accepts_strong_password(django_user_model):
    user = django_user_model.objects.create_user(
        username="reset-strong-user",
        email="reset-strong@example.com",
        password="Old-Policy-47!",
    )

    response = APIClient().post(
        "/api/auth/password-reset-confirm/",
        reset_confirm_payload(user, "New-Scented-Policy-47!"),
        format="json",
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.check_password("New-Scented-Policy-47!")
