import json
import urllib.request
from unittest.mock import patch

import pytest
from django.core import mail
from django.core.cache import cache
from rest_framework.test import APIClient


class FakeHTTPResponse:
    status = 201

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return b'{"messageId":"test-message-id"}'


@pytest.fixture(autouse=True)
def clear_email_state():
    cache.clear()
    mail.outbox = []


@pytest.mark.django_db
def test_password_reset_falls_back_to_locmem_without_brevo_key(settings, django_user_model):
    settings.BREVO_API_KEY = ""
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    settings.DEFAULT_FROM_EMAIL = "no-reply@example.com"
    settings.FRONTEND_URL = "http://localhost:3000"
    user = django_user_model.objects.create_user(
        username="reset-email-user",
        email="reset-email@example.com",
        password="Old-Email-47!",
    )

    with patch.object(urllib.request, "urlopen") as urlopen:
        response = APIClient().post(
            "/api/auth/password-reset/",
            {"email": user.email},
            format="json",
        )

    assert response.status_code == 200
    assert urlopen.call_count == 0
    assert len(mail.outbox) == 1
    email = mail.outbox[0]
    assert email.to == [user.email]
    assert "Reset your password" in email.subject
    assert "http://localhost:3000/reset-password/" in email.body


def test_send_transactional_email_posts_brevo_http_payload(settings):
    import shop.email_service as email_service

    assert hasattr(email_service, "send_transactional_email")

    settings.BREVO_API_KEY = "test-brevo-api-key"
    settings.DEFAULT_FROM_EMAIL = "sender@example.com"

    with patch.object(urllib.request, "urlopen", return_value=FakeHTTPResponse()) as urlopen:
        email_service.send_transactional_email(
            "Brevo subject",
            "Brevo plain-text body",
            ["first@example.com", "second@example.com"],
        )

    assert urlopen.call_count == 1
    request = urlopen.call_args.args[0]
    headers = {key.lower(): value for key, value in request.header_items()}
    payload = json.loads(request.data.decode("utf-8"))

    assert request.full_url == "https://api.brevo.com/v3/smtp/email"
    assert request.get_method() == "POST"
    assert headers["api-key"] == "test-brevo-api-key"
    assert headers["accept"] == "application/json"
    assert headers["content-type"] == "application/json"
    assert payload == {
        "sender": {"email": "sender@example.com"},
        "to": [
            {"email": "first@example.com"},
            {"email": "second@example.com"},
        ],
        "subject": "Brevo subject",
        "textContent": "Brevo plain-text body",
    }
