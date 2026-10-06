from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, undefer

from ..config import settings
from ..database import get_db
from ..models import STAGES, Application, Job, User, now
from ..security import audit, get_current_user, require_hr
from ..serializers import application_out, job_out
from ..services.notify import notify
from ..services.matcher import score_resume
from ..services.resume_parser import ResumeError, extract_text, parse_resume
from ..services.skills import normalize_skill

router = APIRouter(prefix="/api", tags=["jobs"])


class JobIn(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    department: str = Field(default="", max_length=80)
    location: str = Field(default="", max_length=120)
    employment_type: str = Field(default="Full-time", max_length=40)
    description: str = Field(min_length=20)
    required_skills: list[str] = []
    min_experience: float = Field(default=0, ge=0, le=40)
    status: str = "open"


class StageIn(BaseModel):
    stage: str


def _clean_skills(skills: list[str]) -> list[str]:
    seen, out = set(), []
    for s in skills:
        n = normalize_skill(s)
        if n and n not in seen:
            seen.add(n)
            out.append(n)
    return out


def rescore(db: Session, job: Job) -> None:
    apps = db.scalars(select(Application).options(undefer(Application.resume_text))
                      .where(Application.job_id == job.id)).all()
    for a in apps:
        a.match_score, a.match_details = score_resume(
            a.resume_text, a.parsed or {}, job.description, job.required_skills or [], job.min_experience)


# ---------- jobs ----------

@router.get("/jobs")
def list_jobs(q: str = "", status: str = "", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    counts = dict(db.execute(select(Application.job_id, func.count()).group_by(Application.job_id)).all())
    stmt = select(Job).order_by(Job.created_at.desc())
    if user.role != "hr":
        stmt = stmt.where(Job.status == "open")
    elif status:
        stmt = stmt.where(Job.status == status)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Job.title.ilike(like), Job.department.ilike(like), Job.location.ilike(like)))
    jobs = db.scalars(stmt).all()
    return [job_out(j, counts.get(j.id, 0) if user.role == "hr" else None) for j in jobs]


@router.post("/jobs")
def create_job(body: JobIn, user: User = Depends(require_hr), db: Session = Depends(get_db)):
    job = Job(**body.model_dump(exclude={"required_skills"}), required_skills=_clean_skills(body.required_skills),
              created_by=user.id)
    db.add(job)
    db.flush()
    audit(db, user, "job.create", f"Posted '{job.title}'")
    db.commit()
    return job_out(job, 0)


def _get_job(db: Session, job_id: int) -> Job:
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "This job no longer exists.")
    return job


@router.get("/jobs/{job_id}")
def get_job(job_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = _get_job(db, job_id)
    if user.role != "hr" and job.status != "open":
        raise HTTPException(404, "This job is no longer accepting applications.")
    data = job_out(job)
    if user.role != "hr":
        mine = db.scalar(select(Application).where(Application.job_id == job_id, Application.candidate_id == user.id))
        data["my_application"] = application_out(mine, include_candidate=False) if mine else None
    return data


@router.put("/jobs/{job_id}")
def update_job(job_id: int, body: JobIn, user: User = Depends(require_hr), db: Session = Depends(get_db)):
    job = _get_job(db, job_id)
    for key, value in body.model_dump(exclude={"required_skills"}).items():
        setattr(job, key, value)
    job.required_skills = _clean_skills(body.required_skills)
    rescore(db, job)
    audit(db, user, "job.update", f"Updated '{job.title}' and re-scored applicants")
    db.commit()
    return job_out(job)


@router.delete("/jobs/{job_id}")
def delete_job(job_id: int, user: User = Depends(require_hr), db: Session = Depends(get_db)):
    job = _get_job(db, job_id)
    audit(db, user, "job.delete", f"Deleted '{job.title}'")
    db.delete(job)
    db.commit()
    return {"ok": True}


@router.get("/jobs/{job_id}/applicants")
def applicants(job_id: int, user: User = Depends(require_hr), db: Session = Depends(get_db)):
    _get_job(db, job_id)
    apps = db.scalars(select(Application).where(Application.job_id == job_id)
                      .order_by(Application.match_score.desc())).all()
    return [application_out(a) for a in apps]


# ---------- applications ----------

@router.post("/jobs/{job_id}/apply")
async def apply(job_id: int, background: BackgroundTasks, resume: UploadFile = File(...),
                cover_note: str = Form(""), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "candidate":
        raise HTTPException(403, "HR accounts can't apply to jobs. Sign in with a candidate account.")
    job = _get_job(db, job_id)
    if job.status != "open":
        raise HTTPException(400, "This job is no longer accepting applications.")
    if db.scalar(select(Application.id).where(Application.job_id == job_id, Application.candidate_id == user.id)):
        raise HTTPException(409, "You've already applied to this job.")
    data = await resume.read()
    if len(data) > settings.max_resume_mb * 1024 * 1024:
        raise HTTPException(413, f"Resume is larger than {settings.max_resume_mb} MB. Upload a smaller file.")
    try:
        text = extract_text(resume.filename or "", data)
    except ResumeError as exc:
        raise HTTPException(400, str(exc))
    if len(text.split()) < 20:
        raise HTTPException(400, "We couldn't find text in this resume. If it's a scanned image, upload a text-based PDF or DOCX.")
    parsed = parse_resume(text)
    score, details = score_resume(text, parsed, job.description, job.required_skills or [], job.min_experience)
    app = Application(job_id=job.id, candidate_id=user.id, cover_note=cover_note[:3000],
                      resume_filename=(resume.filename or "resume")[:255],
                      resume_mime=resume.content_type or "application/octet-stream",
                      resume_data=data, resume_text=text, parsed=parsed, match_score=score, match_details=details)
    db.add(app)
    db.flush()
    audit(db, user, "application.create", f"{user.name} applied for '{job.title}' (match {score:.0f}%)")
    db.commit()
    background.add_task(notify, user, f"Application received: {job.title}",
                        f"Hi {user.name},\n\nWe've received your application for {job.title}. "
                        "We'll let you know when your status changes.\n\nTalentLens",
                        f"TalentLens: we've received your application for {job.title}.")
    db.refresh(app)
    return application_out(app, include_candidate=False)


@router.get("/applications/mine")
def my_applications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    apps = db.scalars(select(Application).where(Application.candidate_id == user.id)
                      .order_by(Application.created_at.desc())).all()
    out = []
    for a in apps:
        item = application_out(a, include_candidate=False)
        item.pop("match_details")  # scoring internals stay with HR
        item["interviews"] = [
            {"id": i.id, "starts_at": i.starts_at, "duration_minutes": i.duration_minutes,
             "mode": i.mode, "location": i.location, "status": i.status}
            for i in a.interviews if i.status != "cancelled"]
        out.append(item)
    return out


@router.get("/applications")
def list_applications(stage: str = "", job_id: int | None = None, user: User = Depends(require_hr),
                      db: Session = Depends(get_db)):
    stmt = select(Application).order_by(Application.match_score.desc())
    if stage:
        stmt = stmt.where(Application.stage == stage)
    if job_id:
        stmt = stmt.where(Application.job_id == job_id)
    return [application_out(a) for a in db.scalars(stmt).all()]


def _get_application(db: Session, app_id: int, user: User) -> Application:
    app = db.get(Application, app_id)
    if not app or (user.role != "hr" and app.candidate_id != user.id):
        raise HTTPException(404, "Application not found.")
    return app


@router.get("/applications/{app_id}")
def get_application(app_id: int, user: User = Depends(require_hr), db: Session = Depends(get_db)):
    return application_out(_get_application(db, app_id, user))


@router.patch("/applications/{app_id}/stage")
def move_stage(app_id: int, body: StageIn, background: BackgroundTasks, user: User = Depends(require_hr),
               db: Session = Depends(get_db)):
    if body.stage not in STAGES:
        raise HTTPException(422, f"Stage must be one of: {', '.join(STAGES)}.")
    app = _get_application(db, app_id, user)
    previous = app.stage
    app.stage = body.stage
    app.hired_at = now() if body.stage == "hired" else None
    audit(db, user, "application.stage", f"{app.candidate.name} for '{app.job.title}': {previous} to {body.stage}")
    db.commit()
    messages = {
        "shortlisted": "Good news: you've been shortlisted. We'll be in touch about next steps.",
        "offer": "Congratulations! We'd like to make you an offer. Our HR team will contact you shortly.",
        "hired": "Welcome aboard! Your onboarding details will follow.",
        "rejected": "Thank you for your interest. We've decided to move forward with other candidates this time.",
    }
    if body.stage in messages and previous != body.stage:
        background.add_task(notify, app.candidate, f"Update on your application: {app.job.title}",
                            f"Hi {app.candidate.name},\n\n{messages[body.stage]}\n\nTalentLens",
                            f"TalentLens, {app.job.title}: {messages[body.stage]}")
    return application_out(app)


@router.get("/applications/{app_id}/resume")
def download_resume(app_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    app = db.scalar(select(Application).options(undefer(Application.resume_data)).where(Application.id == app_id))
    if not app or (user.role != "hr" and app.candidate_id != user.id) or not app.resume_data:
        raise HTTPException(404, "Resume not found.")
    safe_name = app.resume_filename.replace('"', "")
    return Response(app.resume_data, media_type=app.resume_mime or "application/octet-stream",
                    headers={"Content-Disposition": f'inline; filename="{safe_name}"'})
