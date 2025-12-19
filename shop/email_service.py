import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail


def send_via_sendgrid(subject: str, message: str, to_emails: list[str], from_email: str | None = None) -> int:
    """
    Send a plain-text email using SendGrid Web API.
    Returns HTTP status code (202 means accepted).
    """
    api_key = os.getenv("SENDGRID_API_KEY")
    if not api_key:
        raise RuntimeError("SENDGRID_API_KEY not set in environment (.env)")

    sender = from_email or os.getenv("DEFAULT_FROM_EMAIL", "no-reply@example.com")

    mail = Mail(
        from_email=sender,
        to_emails=to_emails,
        subject=subject,
        plain_text_content=message,
    )

    resp = SendGridAPIClient(api_key).send(mail)
    return resp.status_code
