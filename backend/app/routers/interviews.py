from datetime import date, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Application, Interview, User, now
from ..security import audit, get_current_user, require_hr
from ..serializers import interview_out
from ..services.notify import notify

router = APIRouter(prefix="/api/interviews", tags=["interviews"])

WORK_START, WORK_END, STEP_MIN = 9, 18, 30


class InterviewIn(BaseModel):
    application_id: int
    interviewer_id: int
    starts_at: datetime
    duration_minutes: int = Field(default=45, ge=15, le=240)
    mode: str = "video"
    location: str = Field(default="", max_length=300)


class InterviewUpdate(BaseModel):
    status: str | None = None
    feedback: str | None = None
    rating: int | None = Field(default=None, ge=1, le=5)


class SlotQuery(BaseModel):
    application_id: int
    interviewer_id: int
    day: date
    duration_minutes: int = Field(default=45, ge=15, le=240)


def _busy(db: Session, interviewer_id: int, candidate_id: int, day_start: datetime, day_end: datetime,
          exclude_id: int | None = None) -> list[tuple[datetime, datetime, str]]:
    """All scheduled interviews that block either the interviewer or the candidate in a window."""
    rows = db.scalars(select(Interview).join(Application).where(
        Interview.status == "scheduled",
        Interview.starts_at < day_end,
        Interview.starts_at >= day_start - timedelta(hours=5),
        (Interview.interviewer_id == interviewer_id) | (Application.candidate_id == candidate_id),
    )).all()
    out = []
    for i in rows:
        if i.id == exclude_id:
            continue
        who = "The interviewer" if i.interviewer_id == interviewer_id else "The candidate"
        out.append((i.starts_at, i.starts_at + timedelta(minutes=i.duration_minutes), who))
    return out


def _overlaps(start: datetime, end: datetime, busy: list) -> tuple | None:
    # Two intervals overlap when each starts before the other ends.
    return next((b for b in busy if start < b[1] and b[0] < end), None)


@router.get("")
def list_interviews(upcoming: bool = False, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(Interview).join(Application).order_by(Interview.starts_at)
    if user.role != "hr":
        stmt = stmt.where(Application.candidate_id == user.id)
    if upcoming:
        stmt = stmt.where(Interview.starts_at >= now() - timedelta(hours=1), Interview.status == "scheduled")
    return [interview_out(i) for i in db.scalars(stmt).all()]


@router.post("/suggest")
def suggest_slots(body: SlotQuery, user: User = Depends(require_hr), db: Session = Depends(get_db)):
    """Greedy scan of the working day in 30-minute steps, returning the first free slots."""
    app = db.get(Application, body.application_id)
    if not app:
        raise HTTPException(404, "Application not found.")
    day_start = datetime.combine(body.day, datetime.min.time())
    busy = _busy(db, body.interviewer_id, app.candidate_id, day_start, day_start + timedelta(days=1))
    slots, cursor = [], day_start.replace(hour=WORK_START)
    last_start = day_start.replace(hour=WORK_END) - timedelta(minutes=body.duration_minutes)
    earliest = now() + timedelta(minutes=30)
    while cursor <= last_start and len(slots) < 12:
        end = cursor + timedelta(minutes=body.duration_minutes)
        if cursor >= earliest and not _overlaps(cursor, end, busy):
            slots.append(cursor)
        cursor += timedelta(minutes=STEP_MIN)
    return {"slots": slots}


@router.post("")
def schedule(body: InterviewIn, background: BackgroundTasks, user: User = Depends(require_hr),
             db: Session = Depends(get_db)):
    app = db.get(Application, body.application_id)
    if not app:
        raise HTTPException(404, "Application not found.")
    interviewer = db.get(User, body.interviewer_id)
    if not interviewer or interviewer.role != "hr":
        raise HTTPException(422, "Pick an interviewer from your HR team.")
    if body.mode not in ("video", "onsite", "phone"):
        raise HTTPException(422, "Mode must be video, onsite or phone.")
    start = body.starts_at.replace(tzinfo=None, second=0, microsecond=0)
    if start < now():
        raise HTTPException(422, "Pick a time in the future.")
    end = start + timedelta(minutes=body.duration_minutes)
    clash = _overlaps(start, end, _busy(db, interviewer.id, app.candidate_id, start - timedelta(days=1), end))
    if clash:
        raise HTTPException(409, f"{clash[2]} already has an interview from "
                                 f"{clash[0]:%H:%M} to {clash[1]:%H:%M}. Pick another time or use suggested slots.")
    interview = Interview(application_id=app.id, interviewer_id=interviewer.id, starts_at=start,
                          duration_minutes=body.duration_minutes, mode=body.mode, location=body.location)
    db.add(interview)
    if app.stage in ("applied", "shortlisted"):
        app.stage = "interview"
    db.flush()
    audit(db, user, "interview.schedule", f"{app.candidate.name} with {interviewer.name} on {start:%d %b %Y %H:%M}")
    db.commit()
    where = body.location or {"video": "A video link will be shared", "onsite": "Our office",
                              "phone": "We'll call you"}[body.mode]
    background.add_task(notify, app.candidate, f"Interview scheduled: {app.job.title}",
                        f"Hi {app.candidate.name},\n\nYour {body.mode} interview for {app.job.title} is on "
                        f"{start:%A, %d %B %Y at %H:%M} ({body.duration_minutes} minutes).\nWhere: {where}\n"
                        f"Interviewer: {interviewer.name}\n\nTalentLens",
                        f"TalentLens: {body.mode} interview for {app.job.title} on {start:%d %b, %H:%M}. {where}")
    db.refresh(interview)
    return interview_out(interview)


@router.patch("/{interview_id}")
def update_interview(interview_id: int, body: InterviewUpdate, user: User = Depends(require_hr),
                     db: Session = Depends(get_db)):
    interview = db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(404, "Interview not found.")
    if body.status is not None:
        if body.status not in ("scheduled", "completed", "cancelled"):
            raise HTTPException(422, "Status must be scheduled, completed or cancelled.")
        interview.status = body.status
    if body.feedback is not None:
        interview.feedback = body.feedback[:5000]
    if body.rating is not None:
        interview.rating = body.rating
    audit(db, user, "interview.update", f"Interview #{interview.id} marked {interview.status}")
    db.commit()
    return interview_out(interview)
