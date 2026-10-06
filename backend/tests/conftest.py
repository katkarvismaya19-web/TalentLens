import os
import sys
from pathlib import Path

DB = Path(__file__).parent / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{DB}"
os.environ["SEED_DEMO"] = "true"
os.environ["JWT_SECRET"] = "test-secret-with-enough-length-1234567890"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session")
def client():
    if DB.exists():
        DB.unlink()
    from app.main import app
    with TestClient(app) as c:
        yield c
    DB.unlink(missing_ok=True)


def login(client, email, password="Demo@1234"):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="session")
def hr(client):
    r = client.post("/api/auth/hr/login", json={"hr_code": "HR-DEMO-0001", "password": "Demo@1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="session")
def candidate(client):
    return login(client, "candidate@talentlens.app")
