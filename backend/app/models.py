from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import (JSON, Boolean, DateTime, Float, ForeignKey, Integer,
                        LargeBinary, String, Text, UniqueConstraint)
from sqlalchemy.dialects import mysql
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .config import settings
from .database import Base

BigText = Text().with_variant(mysql.MEDIUMTEXT(), "mysql")
BigBlob = LargeBinary().with_variant(mysql.LONGBLOB(), "mysql")

STAGES = ["applied", "shortlisted", "interview", "offer", "hired", "rejected"]
ROLES = ["hr", "candidate"]


def now() -> datetime:
    """Current wall-clock time in the app's time zone, stored without tzinfo."""
    return datetime.now(ZoneInfo(settings.timezone)).replace(tzinfo=None, microsecond=0)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, index=True, nullable=True)
    hr_code: Mapped[str | None] = mapped_column(String(20), unique=True, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="candidate")
    provider: Mapped[str] = mapped_column(String(20), default="email")
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    department: Mapped[str] = mapped_column(String(80), default="")
    location: Mapped[str] = mapped_column(String(120), default="")
    employment_type: Mapped[str] = mapped_column(String(40), default="Full-time")
    description: Mapped[str] = mapped_column(BigText, default="")
    required_skills: Mapped[list] = mapped_column(JSON, default=list)
    min_experience: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(20), default="open")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    applications: Mapped[list["Application"]] = relationship(
        back_populates="job", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("job_id", "candidate_id", name="uq_job_candidate"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    stage: Mapped[str] = mapped_column(String(20), default="applied")
    cover_note: Mapped[str] = mapped_column(Text, default="")
    resume_filename: Mapped[str] = mapped_column(String(255), default="")
    resume_mime: Mapped[str] = mapped_column(String(120), default="")
    resume_data: Mapped[bytes | None] = mapped_column(BigBlob, nullable=True, deferred=True)
    resume_text: Mapped[str] = mapped_column(BigText, default="", deferred=True)
    parsed: Mapped[dict] = mapped_column(JSON, default=dict)
    match_score: Mapped[float] = mapped_column(Float, default=0)
    match_details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)
    hired_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    job: Mapped[Job] = relationship(back_populates="applications")
    candidate: Mapped[User] = relationship()
    interviews: Mapped[list["Interview"]] = relationship(
        back_populates="application", cascade="all, delete-orphan")


class Interview(Base):
    __tablename__ = "interviews"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), index=True)
    interviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=45)
    mode: Mapped[str] = mapped_column(String(20), default="video")
    location: Mapped[str] = mapped_column(String(300), default="")
    status: Mapped[str] = mapped_column(String(20), default="scheduled")
    feedback: Mapped[str] = mapped_column(Text, default="")
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    application: Mapped[Application] = relationship(back_populates="interviews")
    interviewer: Mapped[User] = relationship()


class Employee(Base):
    __tablename__ = "employees"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), default="")
    department: Mapped[str] = mapped_column(String(80), default="")
    job_role: Mapped[str] = mapped_column(String(120), default="")
    age: Mapped[int] = mapped_column(Integer, default=30)
    monthly_income: Mapped[float] = mapped_column(Float, default=50000)
    years_at_company: Mapped[float] = mapped_column(Float, default=2)
    overtime: Mapped[bool] = mapped_column(Boolean, default=False)
    job_satisfaction: Mapped[int] = mapped_column(Integer, default=3)
    work_life_balance: Mapped[int] = mapped_column(Integer, default=3)
    environment_satisfaction: Mapped[int] = mapped_column(Integer, default=3)
    distance_from_home: Mapped[float] = mapped_column(Float, default=10)
    years_since_last_promotion: Mapped[float] = mapped_column(Float, default=1)
    num_companies_worked: Mapped[int] = mapped_column(Integer, default=1)
    percent_salary_hike: Mapped[float] = mapped_column(Float, default=12)
    attrition_risk: Mapped[float] = mapped_column(Float, default=0)
    risk_level: Mapped[str] = mapped_column(String(10), default="low")
    risk_factors: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(60))
    detail: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now, index=True)

    user: Mapped[User | None] = relationship()


class OtpCode(Base):
    """One-time sign-in code sent to a phone. Only a hash of the code is stored."""
    __tablename__ = "otp_codes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    phone: Mapped[str] = mapped_column(String(20), index=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now, index=True)
