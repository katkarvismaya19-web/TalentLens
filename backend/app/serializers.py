"""Converts ORM objects into the JSON shapes the frontend uses."""
from .models import Application, Employee, Interview, Job, User


def user_out(u: User) -> dict:
    return {"id": u.id, "email": u.email, "phone": u.phone, "name": u.name, "role": u.role,
            "provider": u.provider, "avatar_url": u.avatar_url, "created_at": u.created_at,
            "hr_code": u.hr_code if u.role == "hr" else None}


def job_out(j: Job, applicant_count: int | None = None) -> dict:
    data = {
        "id": j.id, "title": j.title, "department": j.department, "location": j.location,
        "employment_type": j.employment_type, "description": j.description,
        "required_skills": j.required_skills or [], "min_experience": j.min_experience,
        "status": j.status, "created_at": j.created_at,
    }
    if applicant_count is not None:
        data["applicant_count"] = applicant_count
    return data


def application_out(a: Application, include_candidate: bool = True) -> dict:
    data = {
        "id": a.id, "job_id": a.job_id, "stage": a.stage, "cover_note": a.cover_note,
        "resume_filename": a.resume_filename, "parsed": a.parsed or {},
        "match_score": a.match_score, "match_details": a.match_details or {},
        "created_at": a.created_at, "updated_at": a.updated_at, "hired_at": a.hired_at,
        "job": {"id": a.job.id, "title": a.job.title, "department": a.job.department,
                "location": a.job.location} if a.job else None,
    }
    if include_candidate and a.candidate:
        data["candidate"] = {"id": a.candidate.id, "name": a.candidate.name, "email": a.candidate.email,
                             "phone": a.candidate.phone}
    return data


def interview_out(i: Interview) -> dict:
    app = i.application
    return {
        "id": i.id, "application_id": i.application_id, "starts_at": i.starts_at,
        "duration_minutes": i.duration_minutes, "mode": i.mode, "location": i.location,
        "status": i.status, "feedback": i.feedback, "rating": i.rating,
        "interviewer": {"id": i.interviewer.id, "name": i.interviewer.name} if i.interviewer else None,
        "candidate": {"id": app.candidate.id, "name": app.candidate.name, "email": app.candidate.email,
                      "phone": app.candidate.phone}
        if app and app.candidate else None,
        "job": {"id": app.job.id, "title": app.job.title} if app and app.job else None,
    }


def employee_out(e: Employee) -> dict:
    return {c.name: getattr(e, c.name) for c in Employee.__table__.columns}
