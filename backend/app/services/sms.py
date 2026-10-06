import logging

import httpx

from ..config import settings

log = logging.getLogger("talentlens.sms")


class SmsError(RuntimeError):
    pass


def send_sms(to: str, body: str) -> None:
    """Sends an SMS through Twilio's REST API."""
    if not settings.sms_enabled:
        log.info("SMS (Twilio not configured) to=%s: %s", to, body)
        return
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
    try:
        r = httpx.post(url, data={"To": to, "From": settings.twilio_from, "Body": body},
                       auth=(settings.twilio_account_sid, settings.twilio_auth_token), timeout=15)
    except httpx.HTTPError as exc:
        raise SmsError("Couldn't reach the SMS service. Try again in a minute.") from exc
    if r.status_code >= 400:
        log.error("Twilio error %s: %s", r.status_code, r.text[:300])
        message = r.json().get("message", "") if "json" in r.headers.get("content-type", "") else ""
        if "unverified" in message.lower():
            raise SmsError("This number isn't verified on the Twilio trial account. Verify it in Twilio first.")
        raise SmsError("We couldn't send the code to this number. Check it and try again.")
