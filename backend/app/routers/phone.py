"""Sign in with a phone number using a 6-digit one-time code (OTP)."""
import hashlib
import hmac
import re
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import OtpCode, User, now
from ..security import audit, create_token
from ..serializers import user_out
from ..services.sms import SmsError, send_sms

router = APIRouter(prefix="/api/auth/phone", tags=["phone"])

CODE_TTL = timedelta(minutes=10)
RESEND_COOLDOWN = timedelta(seconds=45)
MAX_SENDS_PER_HOUR = 5
MAX_ATTEMPTS = 5


class SendIn(BaseModel):
    phone: str = Field(min_length=6, max_length=24)


class VerifyIn(BaseModel):
    phone: str = Field(min_length=6, max_length=24)
    code: str = Field(min_length=4, max_length=8)
    name: str | None = Field(default=None, max_length=120)


def normalize_phone(raw: str) -> str:
    """Converts what people type ('98200 12345', '+91-98200-12345') into E.164 format (+919820012345)."""
    digits = re.sub(r"[^\d+]", "", raw.strip())
    if digits.startswith("00"):
        digits = "+" + digits[2:]
    if not digits.startswith("+"):
        digits = digits.lstrip("0")
        if len(digits) == 10:
            digits = settings.default_country_code + digits
        else:
            digits = "+" + digits
    if not re.fullmatch(r"\+[1-9]\d{7,14}", digits):
        raise HTTPException(422, "Enter a valid mobile number, like 98200 12345 or +91 98200 12345.")
    return digits


def _hash(phone: str, code: str) -> str:
    return hmac.new(settings.jwt_secret.encode(), f"{phone}:{code}".encode(), hashlib.sha256).hexdigest()


@router.post("/send")
def send_code(body: SendIn, db: Session = Depends(get_db)):
    if not settings.providers["phone"]:
        raise HTTPException(503, "Phone sign-in isn't set up on this server yet.")
    phone = normalize_phone(body.phone)
    current = now()
    recent = db.scalars(select(OtpCode).where(OtpCode.phone == phone, OtpCode.created_at >= current - timedelta(hours=1))
                        .order_by(OtpCode.created_at.desc())).all()
    if recent and current - recent[0].created_at < RESEND_COOLDOWN:
        wait = int((RESEND_COOLDOWN - (current - recent[0].created_at)).total_seconds()) + 1
        raise HTTPException(429, f"Wait {wait} seconds before asking for another code.")
    if len(recent) >= MAX_SENDS_PER_HOUR:
        raise HTTPException(429, "Too many codes requested for this number. Try again in an hour.")

    code = f"{secrets.randbelow(1_000_000):06d}"
    for old in recent:  # only the newest code works
        old.used = True
    db.add(OtpCode(phone=phone, code_hash=_hash(phone, code), expires_at=current + CODE_TTL))
    db.commit()

    demo = not settings.sms_enabled
    if not demo:
        try:
            send_sms(phone, f"{code} is your TalentLens sign-in code. It expires in 10 minutes. Don't share it.")
        except SmsError as exc:
            raise HTTPException(502, str(exc))
    is_new = not db.scalar(select(User.id).where(User.phone == phone))
    response = {"phone": phone, "is_new_user": is_new, "expires_in": int(CODE_TTL.total_seconds()),
                "resend_in": int(RESEND_COOLDOWN.total_seconds())}
    if demo:
        response["demo_code"] = code  # only when no SMS provider is configured
    return response


@router.post("/verify")
def verify_code(body: VerifyIn, db: Session = Depends(get_db)):
    phone = normalize_phone(body.phone)
    otp = db.scalar(select(OtpCode).where(OtpCode.phone == phone, OtpCode.used.is_(False))
                    .order_by(OtpCode.created_at.desc()))
    if not otp or otp.expires_at < now():
        raise HTTPException(400, "This code has expired. Ask for a new one.")
    if otp.attempts >= MAX_ATTEMPTS:
        raise HTTPException(429, "Too many wrong attempts. Ask for a new code.")
    if not hmac.compare_digest(otp.code_hash, _hash(phone, body.code.strip())):
        otp.attempts += 1
        db.commit()
        left = MAX_ATTEMPTS - otp.attempts
        raise HTTPException(400, f"That code is incorrect. {left} {'try' if left == 1 else 'tries'} left."
                            if left else "Too many wrong attempts. Ask for a new code.")

    user = db.scalar(select(User).where(User.phone == phone))
    if not user:
        name = (body.name or "").strip()
        if len(name) < 2:
            raise HTTPException(422, "Enter your full name to create your account.")
        otp.used = True
        user = User(name=name, phone=phone, role="candidate", provider="phone")
        db.add(user)
        db.flush()
        audit(db, user, "user.signup", f"{phone[:-4]}XXXX joined with phone")
    else:
        if not user.is_active:
            raise HTTPException(403, "This account has been deactivated.")
        if user.role == "hr":
            raise HTTPException(403, "HR accounts sign in from the HR portal with their HR ID.")
        otp.used = True
        audit(db, user, "user.login", "Signed in with phone")
    db.commit()
    return {"token": create_token(user), "user": user_out(user)}

