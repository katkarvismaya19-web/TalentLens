"""Skill vocabulary used for resume parsing and job matching.

Each canonical skill maps to the spellings people actually write on resumes.
"""
import re

SKILLS: dict[str, list[str]] = {
    # Programming languages
    "python": ["python"], "java": ["java", "core java"], "javascript": ["javascript", "js", "es6"],
    "typescript": ["typescript", "ts"], "c": ["c language", "c programming"], "c++": ["c++", "cpp"],
    "c#": ["c#", "csharp"], "go": ["golang", "go lang"], "rust": ["rust"], "kotlin": ["kotlin"],
    "swift": ["swift"], "php": ["php"], "ruby": ["ruby"], "r": ["r programming", "rstudio"],
    "scala": ["scala"], "dart": ["dart"], "matlab": ["matlab"], "sql": ["sql"], "bash": ["bash", "shell scripting"],
    # Web
    "html": ["html", "html5"], "css": ["css", "css3"], "react": ["react", "react.js", "reactjs"],
    "angular": ["angular", "angularjs"], "vue": ["vue", "vue.js", "vuejs"], "next.js": ["next.js", "nextjs"],
    "node.js": ["node.js", "nodejs", "node"], "express": ["express", "express.js", "expressjs"],
    "tailwind": ["tailwind", "tailwindcss"], "bootstrap": ["bootstrap"], "redux": ["redux"],
    "django": ["django"], "flask": ["flask"], "fastapi": ["fastapi"], "spring boot": ["spring boot", "springboot"],
    "spring": ["spring framework", "spring mvc"], "hibernate": ["hibernate"], "jsp": ["jsp", "servlets", "servlet"],
    "rest api": ["rest api", "restful", "rest apis", "rest"], "graphql": ["graphql"], ".net": [".net", "asp.net", "dotnet"],
    "laravel": ["laravel"], "flutter": ["flutter"], "react native": ["react native"], "android": ["android"],
    "ios": ["ios development", "ios"],
    # Data / AI
    "machine learning": ["machine learning", "ml"], "deep learning": ["deep learning"],
    "nlp": ["nlp", "natural language processing"], "computer vision": ["computer vision", "opencv"],
    "tensorflow": ["tensorflow"], "pytorch": ["pytorch"], "scikit-learn": ["scikit-learn", "sklearn", "scikit learn"],
    "pandas": ["pandas"], "numpy": ["numpy"], "data analysis": ["data analysis", "data analytics"],
    "data visualization": ["data visualization", "data visualisation"], "power bi": ["power bi", "powerbi"],
    "tableau": ["tableau"], "excel": ["excel", "ms excel", "advanced excel"], "statistics": ["statistics"],
    "llm": ["llm", "large language models", "genai", "generative ai"],
    # Databases
    "mysql": ["mysql"], "postgresql": ["postgresql", "postgres"], "mongodb": ["mongodb", "mongo"],
    "mariadb": ["mariadb"], "oracle": ["oracle db", "oracle database", "pl/sql"], "redis": ["redis"],
    "firebase": ["firebase"], "dbms": ["dbms", "database management"],
    # DevOps / cloud
    "docker": ["docker"], "kubernetes": ["kubernetes", "k8s"], "jenkins": ["jenkins"], "git": ["git"],
    "github": ["github"], "ci/cd": ["ci/cd", "cicd", "continuous integration"], "aws": ["aws", "amazon web services"],
    "azure": ["azure"], "gcp": ["gcp", "google cloud"], "linux": ["linux", "ubuntu"], "ansible": ["ansible"],
    "terraform": ["terraform"], "maven": ["maven"], "ant": ["apache ant"], "tomcat": ["tomcat"],
    "selenium": ["selenium"], "junit": ["junit"], "devops": ["devops"],
    # CS fundamentals
    "data structures": ["data structures", "dsa"], "algorithms": ["algorithms"], "oop": ["oop", "object oriented"],
    "operating systems": ["operating systems"], "computer networks": ["computer networks", "networking"],
    "cyber security": ["cyber security", "cybersecurity", "information security"], "system design": ["system design"],
    "microservices": ["microservices"], "agile": ["agile", "scrum"], "jira": ["jira"],
    # Design
    "figma": ["figma"], "ui/ux": ["ui/ux", "ux design", "ui design", "user experience"], "photoshop": ["photoshop"],
    # HR / business
    "recruitment": ["recruitment", "recruiting", "talent acquisition", "hiring"],
    "onboarding": ["onboarding"], "payroll": ["payroll"], "hr analytics": ["hr analytics", "people analytics"],
    "employee engagement": ["employee engagement"], "performance management": ["performance management", "appraisal"],
    "hrms": ["hrms", "hris", "workday", "successfactors", "zoho people"], "labour law": ["labour law", "labor law"],
    "communication": ["communication skills", "communication"], "leadership": ["leadership", "team lead"],
    "negotiation": ["negotiation"], "presentation": ["presentation skills", "presentations"],
    "project management": ["project management"], "digital marketing": ["digital marketing", "seo", "sem"],
    "sales": ["sales", "business development"], "content writing": ["content writing", "copywriting"],
}

_PATTERNS = {
    skill: [re.compile(r"(?<![a-z0-9+#])" + re.escape(alias) + r"(?![a-z0-9+#])") for alias in aliases]
    for skill, aliases in SKILLS.items()
}


def normalize_skill(raw: str) -> str:
    """Map a free-text skill (e.g. 'ReactJS') to its canonical name."""
    value = raw.strip().lower()
    for skill, aliases in SKILLS.items():
        if value == skill or value in aliases:
            return skill
    return value


def extract_skills(text: str) -> list[str]:
    lowered = text.lower()
    found = [skill for skill, patterns in _PATTERNS.items() if any(p.search(lowered) for p in patterns)]
    # "java" is also found inside "javascript" by humans, but our boundary regex already prevents that.
    return sorted(found)


def text_has_skill(text_lower: str, skill: str) -> bool:
    skill = normalize_skill(skill)
    patterns = _PATTERNS.get(skill) or [
        re.compile(r"(?<![a-z0-9+#])" + re.escape(skill) + r"(?![a-z0-9+#])")]
    return any(p.search(text_lower) for p in patterns)
