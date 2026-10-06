"""Employee attrition (resignation) risk model.

A logistic-regression classifier with standardised features. Logistic regression is
used on purpose: each prediction can be explained by per-feature contributions,
which HR needs ("why is this person at risk?").

Training data:
  * If ATTRITION_CSV points to the IBM HR Analytics dataset
    (WA_Fn-UseC_-HR-Employee-Attrition.csv from Kaggle), the model trains on it.
  * Otherwise it trains on a synthetic dataset that follows the same patterns
    (overtime, low satisfaction, stalled promotions and long commutes raise risk).
"""
import csv
import logging
from datetime import datetime
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from ..config import settings

log = logging.getLogger("talentlens.attrition")

FEATURES = [
    "age", "monthly_income", "years_at_company", "overtime", "job_satisfaction",
    "work_life_balance", "environment_satisfaction", "distance_from_home",
    "years_since_last_promotion", "num_companies_worked", "percent_salary_hike",
]

IBM_COLUMNS = {
    "age": "Age", "monthly_income": "MonthlyIncome", "years_at_company": "YearsAtCompany",
    "overtime": "OverTime", "job_satisfaction": "JobSatisfaction", "work_life_balance": "WorkLifeBalance",
    "environment_satisfaction": "EnvironmentSatisfaction", "distance_from_home": "DistanceFromHome",
    "years_since_last_promotion": "YearsSinceLastPromotion", "num_companies_worked": "NumCompaniesWorked",
    "percent_salary_hike": "PercentSalaryHike",
}


def _explain(feature: str, value: float) -> str:
    """Plain-language reason for a feature that pushes risk up."""
    if feature == "overtime":
        return "Regularly works overtime"
    if feature == "job_satisfaction":
        return f"Low job satisfaction ({int(value)}/4)"
    if feature == "work_life_balance":
        return f"Poor work-life balance ({int(value)}/4)"
    if feature == "environment_satisfaction":
        return f"Unhappy with work environment ({int(value)}/4)"
    if feature == "years_since_last_promotion":
        return f"No promotion in {value:g} years"
    if feature == "distance_from_home":
        return f"Long commute ({value:g} km)"
    if feature == "num_companies_worked":
        return f"Has changed jobs often ({int(value)} companies)"
    if feature == "monthly_income":
        return "Pay is low compared to peers"
    if feature == "percent_salary_hike":
        return f"Small last salary hike ({value:g}%)"
    if feature == "years_at_company":
        return "Still new to the company"
    if feature == "age":
        return "Early-career employee"
    return feature.replace("_", " ").capitalize()


def synthetic_dataset(n: int = 4000, seed: int = 7) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    age = rng.integers(21, 59, n)
    years_at_company = np.clip(rng.gamma(2.0, 2.5, n), 0, age - 20).round(1)
    monthly_income = np.clip(rng.lognormal(10.9, 0.45, n) + (age - 21) * 1200, 15000, 400000).round(-2)
    overtime = (rng.random(n) < 0.28).astype(float)
    job_satisfaction = rng.integers(1, 5, n)
    work_life_balance = rng.integers(1, 5, n)
    environment_satisfaction = rng.integers(1, 5, n)
    distance_from_home = np.clip(rng.gamma(1.6, 6.5, n), 1, 60).round(0)
    years_since_last_promotion = np.clip(rng.gamma(1.2, 1.8, n), 0, years_at_company).round(0)
    num_companies_worked = rng.integers(0, 9, n)
    percent_salary_hike = rng.integers(5, 26, n).astype(float)

    logit = (
        -1.55
        + 1.35 * overtime
        - 0.42 * (job_satisfaction - 2.5)
        - 0.38 * (work_life_balance - 2.5)
        - 0.30 * (environment_satisfaction - 2.5)
        + 0.028 * (distance_from_home - 10)
        + 0.16 * (years_since_last_promotion - 2)
        + 0.12 * (num_companies_worked - 2.5)
        - 0.75 * (np.log(monthly_income) - np.log(60000))
        - 0.045 * (percent_salary_hike - 14)
        - 0.09 * (years_at_company - 4)
        - 0.03 * (age - 35)
    )
    prob = 1 / (1 + np.exp(-logit))
    y = (rng.random(n) < prob).astype(int)
    X = np.column_stack([
        age, monthly_income, years_at_company, overtime, job_satisfaction, work_life_balance,
        environment_satisfaction, distance_from_home, years_since_last_promotion,
        num_companies_worked, percent_salary_hike,
    ]).astype(float)
    return X, y


def ibm_dataset(path: str) -> tuple[np.ndarray, np.ndarray]:
    rows, labels = [], []
    with open(path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            values = []
            for feature in FEATURES:
                raw = row[IBM_COLUMNS[feature]]
                values.append(1.0 if raw == "Yes" else 0.0 if raw == "No" else float(raw))
            rows.append(values)
            labels.append(1 if row["Attrition"] == "Yes" else 0)
    return np.array(rows, dtype=float), np.array(labels)


class AttritionModel:
    def __init__(self):
        self.pipeline = None
        self.info: dict = {}

    def train(self) -> None:
        source = "synthetic"
        if settings.attrition_csv and Path(settings.attrition_csv).exists():
            X, y = ibm_dataset(settings.attrition_csv)
            source = "IBM HR Analytics dataset"
        else:
            X, y = synthetic_dataset()
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
        pipeline = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, class_weight="balanced"))
        pipeline.fit(X_train, y_train)
        proba = pipeline.predict_proba(X_test)[:, 1]
        coef = pipeline[-1].coef_[0]
        self.pipeline = pipeline
        self.info = {
            "algorithm": "Logistic regression (standardised features, balanced classes)",
            "trained_on": source,
            "rows": int(len(y)),
            "attrition_rate": round(float(y.mean()) * 100, 1),
            "accuracy": round(float(accuracy_score(y_test, proba >= 0.5)) * 100, 1),
            "roc_auc": round(float(roc_auc_score(y_test, proba)), 3),
            "trained_at": datetime.now().replace(microsecond=0).isoformat(),
            "weights": sorted(
                [{"feature": f, "weight": round(float(w), 3)} for f, w in zip(FEATURES, coef)],
                key=lambda item: abs(item["weight"]), reverse=True),
        }
        log.info("Attrition model trained on %s: AUC %.3f", source, self.info["roc_auc"])

    def predict(self, record: dict) -> dict:
        if self.pipeline is None:
            self.train()
        x = np.array([[float(record[f]) for f in FEATURES]])
        probability = float(self.pipeline.predict_proba(x)[0, 1])
        scaler, model = self.pipeline[0], self.pipeline[-1]
        contributions = scaler.transform(x)[0] * model.coef_[0]
        drivers = [
            {"feature": FEATURES[i], "reason": _explain(FEATURES[i], x[0][i]), "impact": round(float(c), 3)}
            for i, c in sorted(enumerate(contributions), key=lambda item: item[1], reverse=True)
            if c > 0.15
        ][:4]
        level = "high" if probability >= 0.7 else "medium" if probability >= 0.45 else "low"
        return {"risk": round(probability * 100, 1), "level": level, "drivers": drivers}


model = AttritionModel()
