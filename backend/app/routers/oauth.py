"""Sign in with Google and Microsoft (OAuth 2.0 / OpenID Connect authorization-code flow)."""
import logging
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import User
from ..security import audit, create_token, read_state, sign_state

router = APIRouter(prefix="/api/auth/oauth", tags=["oauth"])
log = logging.getLogger("talentlens.oauth")
OAUTH_PROVIDERS = ("google", "microsoft")

GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO = "https://openidconnect.googleapis.com/v1/userinfo"


def _ms(path: str) -> str:
    return f"https://login.microsoftonline.com/{settings.microsoft_tenant}/oauth2/v2.0/{path}"


def redirect_uri(provider: str) -> str:
    return f"{settings.public_url}/api/auth/oauth/{provider}/callback"


def _fail(message: str) -> RedirectResponse:
    return RedirectResponse(f"{settings.frontend_url}/login?{urlencode({'error': message})}", status_code=303)


@router.get("/{provider}/start")
def start(provider: str):
    if provider not in OAUTH_PROVIDERS:
        return _fail("Unknown sign-in provider.")
    if not settings.providers[provider]:
        return _fail(f"{provider.capitalize()} sign-in isn't set up on this server yet.")
    state = sign_state({"provider": provider})
    if provider == "google":
        params = {"client_id": settings.google_client_id, "redirect_uri": redirect_uri("google"),
                  "response_type": "code", "scope": "openid email profile", "state": state,
                  "prompt": "select_account"}
        return RedirectResponse(f"{GOOGLE_AUTH}?{urlencode(params)}")
    params = {"client_id": settings.microsoft_client_id, "redirect_uri": redirect_uri("microsoft"),
              "response_type": "code", "response_mode": "query",
              "scope": "openid email profile User.Read", "state": state, "prompt": "select_account"}
    return RedirectResponse(f"{_ms('authorize')}?{urlencode(params)}")


async def _google_profile(client: httpx.AsyncClient, code: str) -> dict:
    token = (await client.post(GOOGLE_TOKEN, data={
        "code": code, "client_id": settings.google_client_id, "client_secret": settings.google_client_secret,
        "redirect_uri": redirect_uri("google"), "grant_type": "authorization_code"})).raise_for_status().json()
    info = (await client.get(GOOGLE_USERINFO, headers={
        "Authorization": f"Bearer {token['access_token']}"})).raise_for_status().json()
    if not info.get("email_verified", True):
        raise ValueError("Your Google email isn't verified.")
    return {"email": info["email"], "name": info.get("name") or info["email"].split("@")[0],
            "avatar_url": info.get("picture")}


async def _microsoft_profile(client: httpx.AsyncClient, code: str) -> dict:
    token = (await client.post(_ms("token"), data={
        "code": code, "client_id": settings.microsoft_client_id,
        "client_secret": settings.microsoft_client_secret, "redirect_uri": redirect_uri("microsoft"),
        "grant_type": "authorization_code", "scope": "openid email profile User.Read"})).raise_for_status().json()
    me = (await client.get("https://graph.microsoft.com/v1.0/me", headers={
        "Authorization": f"Bearer {token['access_token']}"})).raise_for_status().json()
    email = me.get("mail") or me.get("userPrincipalName")
    if not email:
        raise ValueError("Your Microsoft account has no email address.")
    return {"email": email, "name": me.get("displayName") or email.split("@")[0], "avatar_url": None}


@router.get("/{provider}/callback")
async def callback(provider: str, request: Request, db: Session = Depends(get_db)):
    if provider not in OAUTH_PROVIDERS:
        return _fail("Unknown sign-in provider.")
    params = dict(request.query_params)
    if params.get("error"):
        return _fail("Sign-in was cancelled.")
    try:
        state = read_state(params.get("state", ""))
        if state.get("provider") != provider:
            raise ValueError
    except Exception:
        return _fail("Your sign-in link expired. Try again.")
    code = params.get("code")
    if not code:
        return _fail("Sign-in didn't complete. Try again.")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            if provider == "google":
                profile = await _google_profile(client, code)
            else:
                profile = await _microsoft_profile(client, code)
    except ValueError as exc:
        return _fail(str(exc))
    except Exception:
        log.exception("%s sign-in failed", provider)
        return _fail(f"{provider.capitalize()} sign-in failed. Check the OAuth settings and try again.")

    email = profile["email"].lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        user = User(email=email, name=profile["name"][:120], role="candidate", provider=provider,
                    avatar_url=profile.get("avatar_url"))
        db.add(user)
        db.flush()
        audit(db, user, "user.signup", f"{email} joined with {provider}")
    else:
        if not user.is_active:
            return _fail("This account has been deactivated.")
        if user.role == "hr":
            return _fail("HR accounts sign in from the HR portal with their HR ID.")
        if profile.get("avatar_url") and not user.avatar_url:
            user.avatar_url = profile["avatar_url"]
        audit(db, user, "user.login", f"Signed in with {provider}")
    db.commit()
    return RedirectResponse(f"{settings.frontend_url}/auth/callback#token={create_token(user)}", status_code=303)
