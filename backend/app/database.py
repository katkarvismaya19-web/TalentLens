import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

SSL_PARAMS = {"ssl-mode", "ssl_mode", "sslmode", "ssl"}


def _prepare(url: str) -> tuple[str, dict]:
    """Removes ssl options PyMySQL doesn't understand (Aiven/TiDB add ?ssl-mode=REQUIRED)
    and turns them into an encrypted connection instead."""
    if url.startswith("sqlite"):
        return url, {"check_same_thread": False}
    parts = urlsplit(url)
    query = parse_qsl(parts.query)
    wants_ssl = os.getenv("DB_SSL", "").lower() in {"1", "true", "yes", "required"}
    kept = []
    for key, value in query:
        if key.lower() in SSL_PARAMS:
            wants_ssl = wants_ssl or value.lower() not in {"disabled", "false", "0", "disable"}
        else:
            kept.append((key, value))
    clean = urlunsplit(parts._replace(query=urlencode(kept)))
    # A non-empty ssl dict makes PyMySQL encrypt the connection (TLS).
    return clean, ({"ssl": {"check_hostname": False}} if wants_ssl else {})


_url, _connect_args = _prepare(settings.database_url)
engine = create_engine(
    _url,
    pool_pre_ping=True,
    connect_args=_connect_args,
    **({} if _url.startswith("sqlite") else {"pool_recycle": 280}),
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()