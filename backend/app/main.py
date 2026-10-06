import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import inspect, text

from .config import settings
from .database import Base, SessionLocal, engine
from .routers import admin, auth, employees, interviews, jobs, oauth, phone
from .services.attrition import model

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


def add_missing_columns() -> None:
    """Small forward-only migration for tables created by an earlier version of the app."""
    existing = {c["name"] for c in inspect(engine).get_columns("users")}
    with engine.begin() as conn:
        for column, ddl in (("phone", "VARCHAR(20)"), ("hr_code", "VARCHAR(20)")):
            if column not in existing:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {column} {ddl}"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    add_missing_columns()
    model.train()
    if settings.seed_demo:
        from .seed import seed
        with SessionLocal() as db:
            seed(db)
    yield


app = FastAPI(title="TalentLens API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

for r in (auth.router, oauth.router, phone.router, jobs.router, interviews.router, employees.router, admin.router):
    app.include_router(r)


@app.get("/{full_path:path}", include_in_schema=False)
def spa(full_path: str):
    """Serves the built React app; unknown paths fall back to index.html for client-side routing."""
    if full_path.startswith("api/"):
        raise HTTPException(404, "Not found")
    if not STATIC_DIR.exists():
        return {"message": "TalentLens API is running. Build the frontend to serve the UI from here.", "docs": "/docs"}
    target = (STATIC_DIR / full_path).resolve()
    if full_path and target.is_file() and STATIC_DIR in target.parents:
        return FileResponse(target)
    return FileResponse(STATIC_DIR / "index.html")
