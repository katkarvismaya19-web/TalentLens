from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import AuditLog, User

ALGORITHM = "HS256"
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(password.encode()[:72], hashed.encode())
    except ValueError:
        return False


def create_token(user: User) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(user.id), "role": user.role, "exp": expires}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def sign_state(data: dict, minutes: int = 10) -> str:
    """Short-lived signed token used as the OAuth `state` parameter."""
    payload = {**data, "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes), "typ": "oauth"}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def read_state(token: str) -> dict:
    data = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    if data.get("typ") != "oauth":
        raise jwt.InvalidTokenError("wrong token type")
    return data


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in to continue.")
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=[ALGORITHM])
        if payload.get("typ") == "oauth":
            raise jwt.InvalidTokenError()
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session has expired. Sign in again.")
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "This account is no longer active.")
    return user


def require_hr(user: User = Depends(get_current_user)) -> User:
    if user.role != "hr":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only HR team members can do this.")
    return user


def audit(db: Session, user: User | None, action: str, detail: str = "") -> None:
    db.add(AuditLog(user_id=user.id if user else None, action=action, detail=detail[:500]))
