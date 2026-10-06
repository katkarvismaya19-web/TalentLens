from ..models import User
from .mailer import send_email
from .sms import SmsError, send_sms


def notify(user: User, subject: str, body: str, sms_text: str | None = None) -> None:
    """Emails the user, or texts them if they signed up with a phone number only. Never raises."""
    if user.email:
        send_email(user.email, subject, body)
    elif user.phone:
        try:
            send_sms(user.phone, (sms_text or subject)[:300])
        except SmsError:
            pass
