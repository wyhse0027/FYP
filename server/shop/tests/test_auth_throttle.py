import pytest
from django.core.cache import cache
from rest_framework.test import APIClient


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


def assert_throttle_limit(client, method, url, payload_factory, allowed_attempts):
    for attempt in range(allowed_attempts):
        response = getattr(client, method)(
            url,
            payload_factory(attempt),
            format="json",
        )
        assert response.status_code != 429

    response = getattr(client, method)(
        url,
        payload_factory(allowed_attempts),
        format="json",
    )
    assert response.status_code == 429


@pytest.mark.django_db
def test_login_is_throttled_after_five_attempts():
    client = APIClient()

    assert_throttle_limit(
        client,
        "post",
        "/api/token/",
        lambda _attempt: {"username": "missing-user", "password": "wrong-password"},
        allowed_attempts=5,
    )


@pytest.mark.django_db
def test_auth_login_is_throttled_after_five_attempts():
    client = APIClient()

    assert_throttle_limit(
        client,
        "post",
        "/api/auth/login/",
        lambda _attempt: {"username": "missing-user", "password": "wrong-password"},
        allowed_attempts=5,
    )


@pytest.mark.django_db
def test_signup_is_throttled_after_five_attempts():
    client = APIClient()

    assert_throttle_limit(
        client,
        "post",
        "/api/signup/",
        lambda attempt: {
            "username": f"throttle-user-{attempt}",
            "email": f"throttle-{attempt}@example.com",
            "password": "Signup-Throttle-47!",
        },
        allowed_attempts=5,
    )


@pytest.mark.django_db
def test_password_reset_request_is_throttled_after_three_attempts():
    client = APIClient()

    assert_throttle_limit(
        client,
        "post",
        "/api/auth/password-reset/",
        lambda attempt: {"email": f"missing-{attempt}@example.com"},
        allowed_attempts=3,
    )


@pytest.mark.django_db
def test_password_reset_confirm_is_throttled_after_three_attempts():
    client = APIClient()

    assert_throttle_limit(
        client,
        "post",
        "/api/auth/password-reset-confirm/",
        lambda _attempt: {
            "uid": "invalid",
            "token": "invalid",
            "new_password": "Reset-Throttle-47!",
        },
        allowed_attempts=3,
    )
