import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Employee, User
from ..security import audit, require_hr
from ..serializers import employee_out
from ..services.attrition import FEATURES, IBM_COLUMNS, model

router = APIRouter(prefix="/api/employees", tags=["employees"])


class EmployeeIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(default="", max_length=255)
    department: str = Field(default="", max_length=80)
    job_role: str = Field(default="", max_length=120)
    age: int = Field(ge=16, le=80)
    monthly_income: float = Field(gt=0)
    years_at_company: float = Field(ge=0, le=60)
    overtime: bool = False
    job_satisfaction: int = Field(ge=1, le=4)
    work_life_balance: int = Field(ge=1, le=4)
    environment_satisfaction: int = Field(ge=1, le=4)
    distance_from_home: float = Field(ge=0, le=500)
    years_since_last_promotion: float = Field(ge=0, le=60)
    num_companies_worked: int = Field(ge=0, le=40)
    percent_salary_hike: float = Field(ge=0, le=100)


def apply_prediction(emp: Employee) -> None:
    result = model.predict({f: getattr(emp, f) for f in FEATURES})
    emp.attrition_risk = result["risk"]
    emp.risk_level = result["level"]
    emp.risk_factors = result["drivers"]


@router.get("")
def list_employees(user: User = Depends(require_hr), db: Session = Depends(get_db)):
    return [employee_out(e) for e in db.scalars(select(Employee).order_by(Employee.attrition_risk.desc())).all()]


@router.get("/model")
def model_info(user: User = Depends(require_hr)):
    return model.info


@router.post("/predict")
def what_if(body: EmployeeIn, user: User = Depends(require_hr)):
    return model.predict(body.model_dump())


@router.post("")
def create_employee(body: EmployeeIn, user: User = Depends(require_hr), db: Session = Depends(get_db)):
    emp = Employee(**body.model_dump())
    apply_prediction(emp)
    db.add(emp)
    audit(db, user, "employee.create", f"Added {emp.name} ({emp.risk_level} risk)")
    db.commit()
    return employee_out(emp)


@router.put("/{emp_id}")
def update_employee(emp_id: int, body: EmployeeIn, user: User = Depends(require_hr), db: Session = Depends(get_db)):
    emp = db.get(Employee, emp_id)
    if not emp:
        raise HTTPException(404, "Employee not found.")
    for key, value in body.model_dump().items():
        setattr(emp, key, value)
    apply_prediction(emp)
    audit(db, user, "employee.update", f"Updated {emp.name} ({emp.risk_level} risk)")
    db.commit()
    return employee_out(emp)


@router.delete("/{emp_id}")
def delete_employee(emp_id: int, user: User = Depends(require_hr), db: Session = Depends(get_db)):
    emp = db.get(Employee, emp_id)
    if not emp:
        raise HTTPException(404, "Employee not found.")
    audit(db, user, "employee.delete", f"Removed {emp.name}")
    db.delete(emp)
    db.commit()
    return {"ok": True}


@router.post("/import")
async def import_csv(file: UploadFile = File(...), user: User = Depends(require_hr), db: Session = Depends(get_db)):
    """Accepts our own column names or the IBM HR Analytics column names."""
    text = (await file.read()).decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(400, "The CSV is empty.")
    headers = set(reader.fieldnames)
    use_ibm = IBM_COLUMNS["monthly_income"] in headers
    missing = [f for f in FEATURES if (IBM_COLUMNS[f] if use_ibm else f) not in headers]
    if missing:
        raise HTTPException(400, f"The CSV is missing these columns: {', '.join(missing)}. "
                                 "Download the template to see the expected format.")
    added, skipped = 0, 0
    for n, row in enumerate(reader, start=1):
        if n > 2000:
            break
        try:
            values = {}
            for f in FEATURES:
                raw = (row[IBM_COLUMNS[f]] if use_ibm else row[f]).strip()
                values[f] = raw.lower() in ("yes", "true", "1") if f == "overtime" else float(raw)
            emp = Employee(
                name=(row.get("name") or (f"Employee {row.get('EmployeeNumber', n)}" if use_ibm else f"Employee {n}"))[:120],
                email=(row.get("email") or "")[:255],
                department=(row.get("department") or row.get("Department") or "")[:80],
                job_role=(row.get("job_role") or row.get("JobRole") or "")[:120],
                **{k: (int(v) if k in ("age", "job_satisfaction", "work_life_balance",
                                       "environment_satisfaction", "num_companies_worked") else v)
                   for k, v in values.items()})
            apply_prediction(emp)
            db.add(emp)
            added += 1
        except (ValueError, KeyError):
            skipped += 1
    audit(db, user, "employee.import", f"Imported {added} employees from {file.filename}")
    db.commit()
    return {"added": added, "skipped": skipped}
