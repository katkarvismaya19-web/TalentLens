from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import STAGES, Application, AuditLog, Employee, Interview, Job, User, now
from ..security import require_hr
from ..serializers import employee_out, interview_out, user_out

router = APIRouter(prefix="/api", tags=["admin"])


@router.get("/dashboard")
def dashboard(user: User = Depends(require_hr), db: Session = Depends(get_db)):
    apps = db.scalars(select(Application)).all()
    stage_counts = Counter(a.stage for a in apps)
    hired = [a for a in apps if a.stage == "hired" and a.hired_at]
    time_to_hire = (sum((a.hired_at - a.created_at).days for a in hired) / len(hired)) if hired else None

    today = now().date()
    week_start = today - timedelta(days=today.weekday())
    weeks = [week_start - timedelta(weeks=i) for i in range(7, -1, -1)]
    per_week = Counter()
    for a in apps:
        d = a.created_at.date()
        per_week[d - timedelta(days=d.weekday())] += 1

    job_counts = Counter(a.job_id for a in apps)
    jobs = {j.id: j for j in db.scalars(select(Job)).all()}
    employees = db.scalars(select(Employee).order_by(Employee.attrition_risk.desc())).all()
    dept: dict[str, list[float]] = {}
    for e in employees:
        dept.setdefault(e.department or "Unassigned", []).append(e.attrition_risk)

    upcoming = db.scalars(select(Interview).where(
        Interview.status == "scheduled", Interview.starts_at >= now() - timedelta(hours=1))
        .order_by(Interview.starts_at).limit(5)).all()

    return {
        "open_jobs": sum(1 for j in jobs.values() if j.status == "open"),
        "total_applications": len(apps),
        "in_pipeline": sum(1 for a in apps if a.stage not in ("hired", "rejected")),
        "hired": stage_counts.get("hired", 0),
        "avg_match": round(sum(a.match_score for a in apps) / len(apps), 1) if apps else None,
        "avg_time_to_hire_days": round(time_to_hire, 1) if time_to_hire is not None else None,
        "funnel": [{"stage": s, "count": stage_counts.get(s, 0)} for s in STAGES],
        "weekly": [{"week": w.strftime("%d %b"), "applications": per_week.get(w, 0)} for w in weeks],
        "top_jobs": [{"id": jid, "title": jobs[jid].title, "applicants": c}
                     for jid, c in job_counts.most_common(5) if jid in jobs],
        "upcoming_interviews": [interview_out(i) for i in upcoming],
        "attrition": {
            "total": len(employees),
            "high": sum(1 for e in employees if e.risk_level == "high"),
            "medium": sum(1 for e in employees if e.risk_level == "medium"),
            "low": sum(1 for e in employees if e.risk_level == "low"),
            "at_risk": [employee_out(e) for e in employees[:5] if e.risk_level != "low"],
            "by_department": sorted(
                [{"department": d, "avg_risk": round(sum(v) / len(v), 1), "headcount": len(v)} for d, v in dept.items()],
                key=lambda x: x["avg_risk"], reverse=True),
        },
    }


@router.get("/users")
def list_users(role: str = "", user: User = Depends(require_hr), db: Session = Depends(get_db)):
    stmt = select(User).order_by(User.created_at.desc())
    if role:
        stmt = stmt.where(User.role == role)
    return [user_out(u) for u in db.scalars(stmt).all()]


@router.get("/audit")
def audit_log(user: User = Depends(require_hr), db: Session = Depends(get_db)):
    rows = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(200)).all()
    return [{"id": r.id, "action": r.action, "detail": r.detail, "created_at": r.created_at,
             "user": {"id": r.user.id, "name": r.user.name} if r.user else None} for r in rows]


@router.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(select(func.count()).select_from(User))
    return {"status": "ok"}
