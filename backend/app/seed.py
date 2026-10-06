"""Demo data so a fresh deployment has something to show. Runs only when the users table is empty."""
import logging
import random
from datetime import datetime, timedelta

import numpy as np
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Application, Employee, Interview, Job, User, now as local_now
from .routers.employees import apply_prediction
from .security import audit, hash_password
from .services.attrition import synthetic_dataset
from .services.matcher import score_resume
from .services.resume_parser import parse_resume

log = logging.getLogger("talentlens.seed")
DEMO_PASSWORD = "Demo@1234"

JOBS = [
    dict(title="Backend Developer (Java)", department="Engineering", location="Mumbai (Hybrid)",
         min_experience=1, required_skills=["java", "spring boot", "mysql", "rest api", "docker", "git"],
         description="Build and maintain REST APIs for our HR platform using Java and Spring Boot. "
                     "You'll design MySQL schemas, write unit tests with JUnit, containerise services with "
                     "Docker and ship through a Jenkins CI/CD pipeline. Strong data structures and OOP fundamentals needed."),
    dict(title="Machine Learning Intern", department="Data", location="Pune", employment_type="Internship",
         min_experience=0, required_skills=["python", "machine learning", "scikit-learn", "pandas", "nlp", "sql"],
         description="Work with our data team on resume-matching and attrition models. You'll clean data with pandas, "
                     "train models with scikit-learn, evaluate them and explain results to HR stakeholders. "
                     "Exposure to NLP and statistics is a plus."),
    dict(title="HR Analytics Associate", department="People", location="Bengaluru",
         min_experience=1, required_skills=["excel", "power bi", "hr analytics", "recruitment", "communication", "sql"],
         description="Turn people data into decisions. Build dashboards in Power BI and Excel on hiring funnel, "
                     "time-to-hire and attrition, support the recruitment team and present insights to leadership."),
    dict(title="Frontend Developer (React)", department="Engineering", location="Remote",
         min_experience=2, required_skills=["react", "javascript", "typescript", "css", "rest api", "figma"],
         description="Own the candidate and recruiter web experience. Build accessible React interfaces, work closely "
                     "with designers in Figma, and integrate REST APIs. Experience with TypeScript and testing preferred."),
]

CANDIDATES = [
    ("Ananya Iyer", "Ananya Iyer\nananya.iyer@example.com | +91 98200 11223\nB.Tech Computer Engineering, VJTI Mumbai\n"
     "3 years of experience as a Java developer at FinServe (2022 - Present).\nSkills: Java, Spring Boot, Hibernate, MySQL, "
     "REST APIs, Docker, Jenkins, Git, JUnit, Data Structures, Algorithms.\nBuilt payroll microservices handling 2M requests/day.", 0),
    ("Rohan Kulkarni", "Rohan Kulkarni\nrohan.k@example.com | +91 99300 44556\nB.E. Computer Engineering, PICT Pune\n"
     "Intern at DataNest (2025 - 2026). Python, pandas, NumPy, scikit-learn, machine learning, NLP with spaCy, SQL, "
     "statistics, Tableau. Final year project: resume classifier with 89% accuracy.", 1),
    ("Sneha Patil", "Sneha Patil\nsneha.patil@example.com | +91 98765 43210\nMBA (HR), Symbiosis\n"
     "2 years of experience in talent acquisition and HR analytics at PeopleFirst (2023 - Present).\n"
     "Recruitment, onboarding, Excel, Power BI, HRMS (Zoho People), employee engagement, communication skills.", 2),
    ("Kabir Shah", "Kabir Shah\nkabir.shah@example.com\nB.Tech IT, NMIMS\n4 years of experience as frontend engineer.\n"
     "React, Redux, TypeScript, JavaScript, HTML, CSS, Tailwind, Figma, REST APIs, Jest. Led UI rebuild of a "
     "job portal used by 50k recruiters.", 3),
    ("Meera Nair", "Meera Nair\nmeera.nair@example.com | +91 90040 77889\nB.Sc Computer Science\n"
     "1 year experience. Java, JSP, Servlets, MySQL, HTML, CSS, Git. Interested in backend development.", 0),
    ("Aditya Rao", "Aditya Rao\naditya.rao@example.com\nB.E. Electronics\nPython, Excel, statistics, data analysis, "
     "Power BI. Volunteer coordinator for campus placement cell (recruitment drives, communication with companies).", 2),
    ("Ishita Verma", "Ishita Verma\nishita.v@example.com\nB.Tech Computer Engineering\nPython, deep learning, PyTorch, "
     "TensorFlow, computer vision, machine learning, Git, Linux. Research intern at IIT Bombay (2025 - 2026).", 1),
    ("Farhan Qureshi", "Farhan Qureshi\nfarhan.q@example.com\nBCA\n2 years experience in web development (2024 - Present). "
     "JavaScript, React, Node.js, Express, MongoDB, CSS, Bootstrap.", 3),
]

STAGE_PLAN = ["hired", "interview", "offer", "shortlisted", "applied", "rejected", "applied", "shortlisted"]

FIRST = ["Aarav", "Diya", "Vihaan", "Saanvi", "Reyansh", "Anika", "Arjun", "Kiara", "Advait", "Myra", "Kabir",
         "Aanya", "Dhruv", "Ira", "Shaurya", "Navya", "Atharv", "Riya", "Yash", "Tara"]
LAST = ["Sharma", "Patel", "Deshmukh", "Joshi", "Menon", "Reddy", "Gupta", "Kapoor", "Bose", "Pillai", "Naik", "Malhotra"]
DEPTS = [("Engineering", "Software Engineer"), ("Sales", "Account Executive"), ("People", "HR Executive"),
         ("Data", "Data Analyst"), ("Operations", "Operations Associate"), ("Support", "Support Specialist")]


def seed(db: Session) -> None:
    if db.scalar(select(func.count()).select_from(User)):
        return
    log.info("Seeding demo data")
    rng = random.Random(11)
    pw = hash_password(DEMO_PASSWORD)
    hr = User(name="Priya Sharma", email="hr@talentlens.app", password_hash=pw, role="hr", hr_code="HR-DEMO-0001")
    interviewer = User(name="Arjun Mehta", email="arjun@talentlens.app", password_hash=pw, role="hr",
                       hr_code="HR-DEMO-0002")
    demo_candidate = User(name="Demo Candidate", email="candidate@talentlens.app", password_hash=pw, role="candidate")
    db.add_all([hr, interviewer, demo_candidate])
    db.flush()

    now = local_now().replace(second=0)
    jobs = []
    for i, spec in enumerate(JOBS):
        job = Job(created_by=hr.id, created_at=now - timedelta(days=50 - i * 6), **spec)
        db.add(job)
        jobs.append(job)
    db.flush()

    for idx, (name, resume, job_idx) in enumerate(CANDIDATES):
        email = name.lower().replace(" ", ".") + "@example.com"
        cand = User(name=name, email=email, password_hash=pw, role="candidate")
        db.add(cand)
        db.flush()
        job = jobs[job_idx]
        parsed = parse_resume(resume)
        score, details = score_resume(resume, parsed, job.description, job.required_skills, job.min_experience)
        created = now - timedelta(days=rng.randint(3, 45))
        stage = STAGE_PLAN[idx]
        app = Application(job_id=job.id, candidate_id=cand.id, stage=stage, cover_note="",
                          resume_filename=f"{name.replace(' ', '_')}_Resume.txt", resume_mime="text/plain",
                          resume_data=resume.encode(), resume_text=resume, parsed=parsed,
                          match_score=score, match_details=details, created_at=created,
                          hired_at=created + timedelta(days=18) if stage == "hired" else None)
        db.add(app)
        db.flush()
        if stage == "interview":
            start = (now + timedelta(days=1)).replace(hour=11, minute=0)
            db.add(Interview(application_id=app.id, interviewer_id=interviewer.id, starts_at=start,
                             duration_minutes=45, mode="video", location="Google Meet link in email"))
        if stage == "offer":
            db.add(Interview(application_id=app.id, interviewer_id=hr.id, starts_at=created + timedelta(days=5),
                             duration_minutes=60, mode="onsite", location="Bengaluru office",
                             status="completed", rating=5, feedback="Strong analytical thinking and stakeholder skills."))

    X, _ = synthetic_dataset(n=32, seed=5)
    for row in X:
        dept, role = rng.choice(DEPTS)
        name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
        emp = Employee(name=name, email=name.lower().replace(" ", ".") + "@talentlens.app", department=dept,
                       job_role=role, age=int(row[0]), monthly_income=float(row[1]), years_at_company=float(row[2]),
                       overtime=bool(row[3]), job_satisfaction=int(row[4]), work_life_balance=int(row[5]),
                       environment_satisfaction=int(row[6]), distance_from_home=float(row[7]),
                       years_since_last_promotion=float(row[8]), num_companies_worked=int(row[9]),
                       percent_salary_hike=float(row[10]))
        apply_prediction(emp)
        db.add(emp)
    audit(db, None, "system.seed", "Loaded demo data")
    db.commit()
