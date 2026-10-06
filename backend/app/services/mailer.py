import logging
import smtplib
from email.message import EmailMessage

from ..config import settings

log = logging.getLogger("talentlens.mail")


def send_email(to: str, subject: str, body: str) -> None:
    """Sends a plain-text email. Runs in a background task, so it never blocks a request."""
    if not to:
        return
    if not settings.smtp_host:
        log.info("Email (SMTP not configured) to=%s subject=%s", to, subject)
        return
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password or "")
            server.send_message(msg)
    except Exception:  # never let email failures break the app
        log.exception("Failed to send email to %s", to)
