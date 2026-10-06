import re
import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import User
from ..security import audit, create_token, get_current_user, hash_password, verify_password
from ..serializers import user_out

router = APIRouter(prefix="/api/auth", tags=["auth"])

HR_PORTAL_MESSAGE = "HR accounts sign in from the HR portal with their HR ID."
# No 0/O or 1/I/L, so the ID is easy to read out and type.
_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


class SignupIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class HrSignupIn(SignupIn):
    company_code: str | None = None


class HrLoginIn(BaseModel):
    hr_code: str = Field(min_length=4, max_length=24)
    password: str


class HrRecoverIn(BaseModel):
    email: EmailStr
    password: str


def _session(user: User) -> dict:
    return {"token": create_token(user), "user": user_out(user)}


def _check_password(password: str) -> None:
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise HTTPException(422, "Use a password with at least one letter and one number.")


def new_hr_code(db: Session) -> str:
    while True:
        raw = "".join(secrets.choice(_ALPHABET) for _ in range(8))
        code = f"HR-{raw[:4]}-{raw[4:]}"
        if not db.scalar(select(User.id).where(User.hr_code == code)):
            return code


def clean_hr_code(raw: str) -> str:
    """Accepts 'hr7k3p9qxm', 'HR 7K3P 9QXM' or 'HR-7K3P-9QXM'."""
    value = re.sub(r"[^A-Za-z0-9]", "", raw).upper()
    if value.startswith("HR"):
        value = value[2:]
    if value.startswith("DEMO"):  # demo IDs look like HR-DEMO-0001
        return f"HR-DEMO-{value[4:]}"
    return f"HR-{value[:4]}-{value[4:]}" if len(value) == 8 else raw.strip().upper()


@router.get("/providers")
def providers():
    return {**settings.providers, "company_code_required": bool(settings.company_code), "demo": settings.seed_demo}


# ---------- candidates ----------

@router.post("/signup")
def signup(body: SignupIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    _check_password(body.password)
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "An account with this email already exists. Sign in instead.")
    user = User(name=body.name.strip(), email=email, password_hash=hash_password(body.password),
                role="candidate", provider="email")
    db.add(user)
    db.flush()
    audit(db, user, "user.signup", f"{email} joined as a candidate")
    db.commit()
    return _session(user)


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        if user and not user.password_hash:
            raise HTTPException(401, f"This account uses {user.provider.capitalize()} sign-in. Use that button instead.")
        raise HTTPException(401, "Email or password is incorrect.")
    if user.role == "hr":
        raise HTTPException(403, HR_PORTAL_MESSAGE)
    if not user.is_active:
        raise HTTPException(403, "This account has been deactivated.")
    audit(db, user, "user.login", "Signed in with email")
    db.commit()
    return _session(user)


# ---------- HR portal ----------

@router.post("/hr/signup")
def hr_signup(body: HrSignupIn, db: Session = Depends(get_db)):
    if settings.company_code and (body.company_code or "").strip() != settings.company_code:
        raise HTTPException(403, "That company access code is incorrect. Ask your HR admin for it.")
    email = body.email.lower()
    _check_password(body.password)
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "This email is already registered. Use a different work email.")
    user = User(name=body.name.strip(), email=email, password_hash=hash_password(body.password),
                role="hr", provider="email", hr_code=new_hr_code(db))
    db.add(user)
    db.flush()
    audit(db, user, "hr.signup", f"{user.name} created an HR account ({user.hr_code})")
    db.commit()
    return {**_session(user), "hr_code": user.hr_code}


@router.post("/hr/login")
def hr_login(body: HrLoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.hr_code == clean_hr_code(body.hr_code)))
    if not user or user.role != "hr" or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "HR ID or password is incorrect.")
    if not user.is_active:
        raise HTTPException(403, "This account has been deactivated.")
    audit(db, user, "hr.login", "Signed in to the HR portal")
    db.commit()
    return _session(user)


@router.post("/hr/recover")
def hr_recover(body: HrRecoverIn, db: Session = Depends(get_db)):
    """Shows a forgotten HR ID after the person proves who they are with email and password."""
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or user.role != "hr" or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "No HR account matches that email and password.")
    audit(db, user, "hr.recover", "Looked up their HR ID")
    db.commit()
    return {"hr_code": user.hr_code}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return user_out(user)
