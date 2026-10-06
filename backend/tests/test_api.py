import io
from datetime import date, datetime, timedelta

from docx import Document

from app.services.matcher import score_resume
from app.services.resume_parser import parse_resume
from app.services.skills import extract_skills


# ---------- unit tests ----------

def test_skill_extraction_respects_word_boundaries():
    skills = extract_skills("Worked with JavaScript, React.js, C++ and Node.js")
    assert "javascript" in skills and "react" in skills and "c++" in skills and "node.js" in skills
    assert "java" not in skills


def test_resume_parser_fields():
    parsed = parse_resume("Riya Desai\nriya@example.com | +91 98200 12345\nB.Tech\n3 years of experience in Python")
    assert parsed["name"] == "Riya Desai"
    assert parsed["email"] == "riya@example.com"
    assert parsed["experience_years"] == 3
    assert "B.Tech" in parsed["education"] and "python" in parsed["skills"]


def test_better_resume_scores_higher():
    jd = "Python developer with machine learning and SQL experience"
    strong = "Python, machine learning, scikit-learn, SQL, pandas. 2 years of experience."
    weak = "Graphic designer skilled in Photoshop and illustration."
    s1, _ = score_resume(strong, parse_resume(strong), jd, ["python", "machine learning", "sql"], 1)
    s2, _ = score_resume(weak, parse_resume(weak), jd, ["python", "machine learning", "sql"], 1)
    assert s1 > s2 + 30


# ---------- API tests ----------

def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_signup_validation_and_login(client):
    weak = client.post("/api/auth/signup", json={"name": "Test", "email": "t@example.com", "password": "password"})
    assert weak.status_code == 422
    ok = client.post("/api/auth/signup", json={"name": "Test User", "email": "t@example.com", "password": "Passw0rd!"})
    assert ok.status_code == 200 and ok.json()["user"]["role"] == "candidate"
    dup = client.post("/api/auth/signup", json={"name": "Test User", "email": "T@example.com", "password": "Passw0rd!"})
    assert dup.status_code == 409
    bad = client.post("/api/auth/login", json={"email": "t@example.com", "password": "wrong-pass1"})
    assert bad.status_code == 401


def test_candidate_cannot_use_hr_routes(client, candidate):
    assert client.get("/api/dashboard", headers=candidate).status_code == 403
    assert client.get("/api/employees", headers=candidate).status_code == 403


def test_oauth_unconfigured_redirects_with_message(client):
    r = client.get("/api/auth/oauth/google/start", follow_redirects=False)
    assert r.status_code in (302, 303, 307) and "/login?error=" in r.headers["location"]
    assert client.get("/api/auth/providers").json()["google"] is False


def test_full_hiring_flow(client, hr, candidate):
    job = client.post("/api/jobs", headers=hr, json={
        "title": "Python Developer", "department": "Engineering", "location": "Mumbai",
        "description": "Build APIs in Python with FastAPI, SQL databases and Docker deployments.",
        "required_skills": ["Python", "FastAPI", "SQL", "Docker"], "min_experience": 1}).json()
    assert job["required_skills"] == ["python", "fastapi", "sql", "docker"]

    doc = Document()
    doc.add_paragraph("Demo Candidate")
    doc.add_paragraph("candidate@talentlens.app | +91 99999 88888")
    doc.add_paragraph("2 years of experience building Python and FastAPI services with SQL and Docker on Linux. "
                      "Wrote unit tests, CI pipelines and REST APIs for production systems.")
    buf = io.BytesIO()
    doc.save(buf)
    r = client.post(f"/api/jobs/{job['id']}/apply", headers=candidate,
                    files={"resume": ("resume.docx", buf.getvalue(),
                                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
                    data={"cover_note": "Keen to join."})
    assert r.status_code == 200, r.text
    app = r.json()
    assert app["match_score"] > 70
    assert client.post(f"/api/jobs/{job['id']}/apply", headers=candidate,
                       files={"resume": ("resume.docx", buf.getvalue(), "application/octet-stream")}).status_code == 409

    ranked = client.get(f"/api/jobs/{job['id']}/applicants", headers=hr).json()
    assert ranked[0]["candidate"]["email"] == "candidate@talentlens.app"
    assert client.get(f"/api/applications/{app['id']}/resume", headers=hr).status_code == 200

    hr_users = client.get("/api/users?role=hr", headers=hr).json()
    interviewer = hr_users[0]["id"]
    tomorrow = date.today() + timedelta(days=2)
    slots = client.post("/api/interviews/suggest", headers=hr, json={
        "application_id": app["id"], "interviewer_id": interviewer, "day": str(tomorrow)}).json()["slots"]
    assert slots
    first = client.post("/api/interviews", headers=hr, json={
        "application_id": app["id"], "interviewer_id": interviewer, "starts_at": slots[0], "duration_minutes": 60})
    assert first.status_code == 200, first.text
    clash_time = (datetime.fromisoformat(slots[0]) + timedelta(minutes=30)).isoformat()
    clash = client.post("/api/interviews", headers=hr, json={
        "application_id": app["id"], "interviewer_id": interviewer, "starts_at": clash_time})
    assert clash.status_code == 409

    moved = client.patch(f"/api/applications/{app['id']}/stage", headers=hr, json={"stage": "hired"}).json()
    assert moved["stage"] == "hired" and moved["hired_at"]
    mine = client.get("/api/applications/mine", headers=candidate).json()
    assert mine[0]["stage"] == "hired" and "match_details" not in mine[0]


def test_attrition_prediction(client, hr):
    risky = {"name": "Risky", "age": 25, "monthly_income": 22000, "years_at_company": 1, "overtime": True,
             "job_satisfaction": 1, "work_life_balance": 1, "environment_satisfaction": 1, "distance_from_home": 40,
             "years_since_last_promotion": 1, "num_companies_worked": 5, "percent_salary_hike": 6}
    safe = {**risky, "name": "Safe", "age": 42, "monthly_income": 180000, "years_at_company": 9, "overtime": False,
            "job_satisfaction": 4, "work_life_balance": 4, "environment_satisfaction": 4, "distance_from_home": 4,
            "num_companies_worked": 1, "percent_salary_hike": 20}
    r1 = client.post("/api/employees", headers=hr, json=risky).json()
    r2 = client.post("/api/employees", headers=hr, json=safe).json()
    assert r1["risk_level"] == "high" and r1["risk_factors"]
    assert r2["risk_level"] == "low"
    info = client.get("/api/employees/model", headers=hr).json()
    assert info["roc_auc"] > 0.7


def test_dashboard(client, hr):
    d = client.get("/api/dashboard", headers=hr).json()
    assert d["total_applications"] >= 9 and len(d["weekly"]) == 8 and d["attrition"]["total"] >= 32


# ---------- phone sign-in ----------

def test_phone_otp_signup_and_login(client):
    assert client.get("/api/auth/providers").json()["phone"] is True
    bad = client.post("/api/auth/phone/send", json={"phone": "12345"})
    assert bad.status_code == 422

    sent = client.post("/api/auth/phone/send", json={"phone": "98200 12345"}).json()
    assert sent["phone"] == "+919820012345" and sent["is_new_user"] is True
    code = sent["demo_code"]
    assert len(code) == 6

    again = client.post("/api/auth/phone/send", json={"phone": "+91 98200-12345"})
    assert again.status_code == 429  # resend cooldown

    wrong = client.post("/api/auth/phone/verify", json={"phone": "9820012345", "code": "000000" if code != "000000" else "111111"})
    assert wrong.status_code == 400 and "tries left" in wrong.json()["detail"]

    no_name = client.post("/api/auth/phone/verify", json={"phone": "9820012345", "code": code})
    assert no_name.status_code == 422

    ok = client.post("/api/auth/phone/verify", json={"phone": "9820012345", "code": code, "name": "Phone User"})
    assert ok.status_code == 200, ok.text
    user = ok.json()["user"]
    assert user["phone"] == "+919820012345" and user["email"] is None and user["role"] == "candidate"

    reuse = client.post("/api/auth/phone/verify", json={"phone": "9820012345", "code": code})
    assert reuse.status_code == 400  # a code works only once

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {ok.json()['token']}"}).json()
    assert me["name"] == "Phone User"


def test_apple_removed(client):
    assert "apple" not in client.get("/api/auth/providers").json()
    r = client.get("/api/auth/oauth/apple/start", follow_redirects=False)
    assert "Unknown" in r.headers["location"] or "error" in r.headers["location"]


# ---------- HR portal ----------

def test_hr_portal_signup_login_and_isolation(client):
    r = client.post("/api/auth/hr/signup", json={"name": "Neha Rao", "email": "neha@acme.in", "password": "Recruit2026"})
    assert r.status_code == 200, r.text
    code = r.json()["hr_code"]
    assert code.startswith("HR-") and len(code) == 12 and r.json()["user"]["role"] == "hr"

    # The HR ID works in any reasonable format
    for typed in (code, code.lower(), code.replace("-", " ")):
        ok = client.post("/api/auth/hr/login", json={"hr_code": typed, "password": "Recruit2026"})
        assert ok.status_code == 200, typed
    assert client.post("/api/auth/hr/login", json={"hr_code": code, "password": "wrong-pass1"}).status_code == 401

    # HR can't use the candidate login, and candidates can't use the HR portal
    blocked = client.post("/api/auth/login", json={"email": "neha@acme.in", "password": "Recruit2026"})
    assert blocked.status_code == 403 and "HR portal" in blocked.json()["detail"]
    assert client.post("/api/auth/hr/login", json={"hr_code": "HR-DEMO-0001", "password": "nope12345"}).status_code == 401

    # Forgotten HR ID
    rec = client.post("/api/auth/hr/recover", json={"email": "neha@acme.in", "password": "Recruit2026"})
    assert rec.json()["hr_code"] == code
    assert client.post("/api/auth/hr/recover", json={"email": "candidate@talentlens.app",
                                                     "password": "Demo@1234"}).status_code == 401


def test_candidate_signup_cannot_create_hr(client):
    r = client.post("/api/auth/signup", json={"name": "Sneaky", "email": "sneaky@example.com",
                                              "password": "Passw0rd!", "role": "hr"})
    assert r.status_code == 200 and r.json()["user"]["role"] == "candidate"
