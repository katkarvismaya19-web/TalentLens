"""Scores how well a resume fits a job description.

Score (0–100) = weighted blend of:
  * skill coverage  — share of the job's required skills found in the resume
  * text similarity — TF-IDF cosine similarity between resume and job description
  * experience fit  — candidate's years vs. the job's minimum
"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .skills import normalize_skill, text_has_skill


def text_similarity(a: str, b: str) -> float:
    if not a.strip() or not b.strip():
        return 0.0
    try:
        vectors = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True).fit_transform([a, b])
    except ValueError:  # only stop words
        return 0.0
    return float(cosine_similarity(vectors[0], vectors[1])[0][0])


def score_resume(resume_text: str, parsed: dict, job_description: str,
                 required_skills: list[str], min_experience: float) -> tuple[float, dict]:
    lowered = resume_text.lower()
    required = [normalize_skill(s) for s in required_skills if s.strip()]
    resume_skills = set(parsed.get("skills", []))
    matched = [s for s in required if s in resume_skills or text_has_skill(lowered, s)]
    missing = [s for s in required if s not in matched]

    similarity = text_similarity(resume_text, job_description)
    # Raw cosine between a resume and a JD rarely exceeds ~0.4, so scale it to a 0–1 range.
    similarity_score = min(1.0, similarity / 0.35)

    years = float(parsed.get("experience_years") or 0)
    experience_fit = 1.0 if not min_experience else min(1.0, years / min_experience)

    if required:
        skill_score = len(matched) / len(required)
        total = 0.55 * skill_score + 0.30 * similarity_score + 0.15 * experience_fit
    else:
        skill_score = None
        total = 0.75 * similarity_score + 0.25 * experience_fit

    details = {
        "matched_skills": matched,
        "missing_skills": missing,
        "skill_coverage": round(skill_score * 100) if skill_score is not None else None,
        "text_similarity": round(similarity_score * 100),
        "experience_years": years,
        "experience_fit": round(experience_fit * 100),
    }
    return round(total * 100, 1), details
