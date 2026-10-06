"""Runtime configuration, read once from environment variables."""
import os
from urllib.parse import quote_plus


def _env(key: str, default=None):
    value = os.getenv(key)
    return value if value not in (None, "") else default


def _bool(key: str, default: bool) -> bool:
    value = _env(key)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _database_url() -> str:
    url = _env("DATABASE_URL")
    if url:
        # Railway exposes MySQL as mysql://... — SQLAlchemy needs the driver name.
        if url.startswith("mysql://"):
            url = "mysql+pymysql://" + url[len("mysql://"):]
        return url
    host = _env("DB_HOST")
    if host:
        user = quote_plus(_env("DB_USER", "root"))
        password = quote_plus(_env("DB_PASSWORD", ""))
        port = _env("DB_PORT", "3306")
        name = _env("DB_NAME", "talentlens")
        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}"
    return "sqlite:///./talentlens.db"


class Settings:
    def __init__(self):
        self.app_name = "TalentLens"
        self.database_url = _database_url()
        self.jwt_secret = _env("JWT_SECRET", "dev-only-secret-change-me-in-production")
        self.jwt_expire_minutes = int(_env("JWT_EXPIRE_MINUTES", "1440"))
        self.public_url = _env("PUBLIC_URL", "http://localhost:8000").rstrip("/")
        self.frontend_url = _env("FRONTEND_URL", self.public_url).rstrip("/")
        self.company_code = _env("COMPANY_CODE") or _env("HR_SIGNUP_CODE")  # needed to create HR accounts, if set
        self.seed_demo = _bool("SEED_DEMO", True)
        self.max_resume_mb = int(_env("MAX_RESUME_MB", "5"))

        # OAuth providers — each is enabled only when its credentials are present.
        self.google_client_id = _env("GOOGLE_CLIENT_ID")
        self.google_client_secret = _env("GOOGLE_CLIENT_SECRET")
        self.microsoft_client_id = _env("MICROSOFT_CLIENT_ID")
        self.microsoft_client_secret = _env("MICROSOFT_CLIENT_SECRET")
        self.microsoft_tenant = _env("MICROSOFT_TENANT", "common")

        # Phone sign-in: one-time codes sent by SMS through Twilio.
        self.twilio_account_sid = _env("TWILIO_ACCOUNT_SID")
        self.twilio_auth_token = _env("TWILIO_AUTH_TOKEN")
        self.twilio_from = _env("TWILIO_FROM")  # your Twilio phone number, e.g. +15551234567
        self.default_country_code = _env("DEFAULT_COUNTRY_CODE", "+91")
        # Without Twilio, show the code on screen so the demo still works. Turn off for real users.
        self.otp_demo_mode = _bool("OTP_DEMO_MODE", True)

        # Email (optional). Without SMTP_HOST, emails are logged instead of sent.
        self.smtp_host = _env("SMTP_HOST")
        self.smtp_port = int(_env("SMTP_PORT", "587"))
        self.smtp_user = _env("SMTP_USER")
        self.smtp_password = _env("SMTP_PASSWORD")
        self.smtp_from = _env("SMTP_FROM", self.smtp_user or "no-reply@talentlens.app")

        self.attrition_csv = _env("ATTRITION_CSV")
        # All dates are stored and shown in this time zone (servers usually run on UTC).
        self.timezone = _env("APP_TIMEZONE", "Asia/Kolkata")

    @property
    def sms_enabled(self) -> bool:
        return bool(self.twilio_account_sid and self.twilio_auth_token and self.twilio_from)

    @property
    def providers(self) -> dict:
        return {
            "google": bool(self.google_client_id and self.google_client_secret),
            "microsoft": bool(self.microsoft_client_id and self.microsoft_client_secret),
            "phone": self.sms_enabled or self.otp_demo_mode,
        }


settings = Settings()
