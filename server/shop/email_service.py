import json
import logging
import urllib.error
import urllib.request

from django.conf import settings
from django.core.mail import send_mail


logger = logging.getLogger(__name__)

BREVO_TRANSACTIONAL_EMAIL_URL = "https://api.brevo.com/v3/smtp/email"


def send_transactional_email(
    subject: str,
    message: str,
    to_emails: list[str],
    from_email: str | None = None,
) -> int:
    """
    Send a plain-text transactional email.

    Production uses Brevo's HTTP API when BREVO_API_KEY is configured. Local
    development and tests fall back to Django's configured email backend
    (console/locmem), so CI never makes a live network call.
    """
    sender = from_email or settings.DEFAULT_FROM_EMAIL

    if not settings.BREVO_API_KEY:
        return send_mail(subject, message, sender, to_emails)

    payload = {
        "sender": {"email": sender},
        "to": [{"email": email} for email in to_emails],
        "subject": subject,
        "textContent": message,
    }
    request = urllib.request.Request(
        BREVO_TRANSACTIONAL_EMAIL_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-key": settings.BREVO_API_KEY,
            "accept": "application/json",
            "content-type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            status_code = getattr(response, "status", None)
            if status_code is None:
                status_code = response.getcode()
            body = response.read()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        logger.error("Brevo transactional email failed with status %s: %s", exc.code, body)
        raise RuntimeError(f"Brevo transactional email failed with status {exc.code}") from exc
    except urllib.error.URLError as exc:
        logger.error("Brevo transactional email request failed: %s", exc.reason)
        raise RuntimeError("Brevo transactional email request failed") from exc

    if status_code < 200 or status_code >= 300:
        decoded_body = body.decode("utf-8", errors="replace")
        logger.error("Brevo transactional email failed with status %s: %s", status_code, decoded_body)
        raise RuntimeError(f"Brevo transactional email failed with status {status_code}")

    return status_code
