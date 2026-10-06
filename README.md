# TalentLens: AI-powered recruitment and employee retention

TalentLens screens resumes, ranks candidates against each job, books interviews without clashes, and predicts which employees are at risk of leaving, with the reasons behind each prediction.

Two kinds of users, with separate sign-in pages:
- **Candidates** (`/login`, `/signup`): sign in with email, Google, Microsoft or a phone number. They browse open roles, apply with a resume, and track their applications and interviews.
- **HR team** (`/hr/login`, `/hr/signup`): an HR member signs up on the HR portal and gets a personal **HR ID** (for example `HR-7K3P-9QXM`). From then on they sign in with HR ID + password only. HR can post jobs, see ranked applicants, run the hiring pipeline, schedule interviews, monitor attrition risk and see the activity log.

HR accounts are blocked from the candidate sign-in (email, Google, Microsoft and phone), and candidates are redirected away from every HR page. Lost HR IDs can be recovered on the HR sign-in page with the work email and password.

## Features and the engineering subjects they cover

| Module | What it does | Subjects |
|---|---|---|
| Resume parser | Extracts name, email, phone, skills, experience, education and links from PDF/DOCX/TXT | NLP, regular expressions |
| Candidate matching | Score = 55% skill coverage + 30% TF-IDF cosine similarity with the job description + 15% experience fit | Machine learning, information retrieval |
| Hiring pipeline | Applied → Shortlisted → Interview → Offer → Hired / Not selected, drag-and-drop board | Software engineering, DBMS |
| Interview scheduler | Interval-overlap conflict check for interviewer and candidate; greedy free-slot finder | Algorithms, data structures |
| Attrition predictor | Logistic regression with standardised features, explainable per-employee risk drivers, live what-if | Machine learning, statistics |
| Dashboard | Funnel, applications per week, time-to-hire, department risk | Data analytics and visualisation |
| Auth and security | Separate HR portal with personal HR IDs, bcrypt passwords, JWT sessions, OAuth 2.0 / OpenID Connect (Google, Microsoft), phone sign-in with one-time SMS codes, role-based access, audit log | Information security, computer networks |
| Notifications | Email (SMTP), or SMS for phone-only users, on application, stage change and interview booking | Computer networks |
| DevOps | Multi-stage Docker build, Docker Compose, Jenkins pipeline, cloud deploy on Railway | DevOps, cloud computing |

**Tech stack:** FastAPI (Python 3.12), SQLAlchemy, MySQL (SQLite for local dev), scikit-learn, React 18 + Vite + Tailwind CSS, Recharts, Docker, Jenkins, Railway.

## Demo accounts

With `SEED_DEMO=true` (the default), the first start loads sample jobs, candidates, interviews and 32 employees. All demo accounts use the password `Demo@1234`.

| Sign in at | With | Who |
|---|---|---|
| /hr/login | HR ID `HR-DEMO-0001` | Priya Sharma, HR manager |
| /hr/login | HR ID `HR-DEMO-0002` | Arjun Mehta, HR interviewer |
| /login | candidate@talentlens.app | Demo candidate |

Set `SEED_DEMO=false` before going live with real users.

---

## Deploy on Railway

1. Push this folder to a new GitHub repository.
2. On railway.app: **New Project → Deploy from GitHub repo**, and pick the repo. Railway finds the `Dockerfile`.
3. In the same project: **+ Create → Database → MySQL**.
4. Open the app service → **Variables → Raw Editor**, paste, and replace the secret:
   ```
   DATABASE_URL=${{MySQL.MYSQL_URL}}
   JWT_SECRET=paste-a-long-random-string-here
   PORT=8000
   SEED_DEMO=true
   ```
   Generate a secret with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
5. App service → **Settings → Networking → Generate Domain** on port **8000**.
6. Add one more variable with that domain, then click **Deploy**:
   ```
   PUBLIC_URL=https://your-app.up.railway.app
   ```
7. Open the domain. Candidates sign in at `/login`, HR at `/hr/login` (demo HR ID `HR-DEMO-0001`).

Every push to `main` redeploys automatically.

## Set up Google, Microsoft and phone sign-in

Each button turns on when its variables are set. Without them, the buttons show but are disabled, and email sign-in still works.

For Google and Microsoft, the **redirect URI** is:
```
https://your-app.up.railway.app/api/auth/oauth/<provider>/callback
```
where `<provider>` is `google` or `microsoft`.

### Google (free)
1. Go to console.cloud.google.com → create a project.
2. **APIs & Services → OAuth consent screen** → External → fill in the app name and your email → add yourself as a test user.
3. **Credentials → Create credentials → OAuth client ID** → Web application.
4. Authorised redirect URI: `https://your-app.up.railway.app/api/auth/oauth/google/callback`. For local testing, also add `http://localhost:8000/api/auth/oauth/google/callback`.
5. Copy the values into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Microsoft (free)
1. Go to portal.azure.com → **Microsoft Entra ID → App registrations → New registration**.
2. Supported account types: *Accounts in any organizational directory and personal Microsoft accounts*.
3. Redirect URI: platform **Web**, `https://your-app.up.railway.app/api/auth/oauth/microsoft/callback`.
4. **Certificates & secrets → New client secret**, and copy the **Value** (not the ID).
5. Set `MICROSOFT_CLIENT_ID` (Application (client) ID) and `MICROSOFT_CLIENT_SECRET`. Keep `MICROSOFT_TENANT=common`.

### Phone number (one-time SMS code)
Phone sign-in works out of the box in **demo mode**: no SMS is sent, and the code is shown on screen. This is fine for a project demo. To send real SMS:

1. Sign up at twilio.com. The free trial includes credit.
2. Get a Twilio phone number from the console.
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM` (the Twilio number, e.g. `+15551234567`).
4. Set `OTP_DEMO_MODE=false` so codes are never shown on screen.

On the trial, Twilio only texts numbers you've verified in its console. Sending to Indian numbers at scale also needs DLT registration, which is a TRAI rule.

How it works: codes are 6 digits, valid for 10 minutes and usable once. Only a hash of each code is stored. A number gets at most 5 codes an hour, with 45 seconds between requests, and 5 wrong tries cancel the code. Numbers without a country code are treated as Indian (`DEFAULT_COUNTRY_CODE=+91`).

### Who becomes HR?
Only people who sign up on the HR portal (`/hr/signup`). Google, Microsoft, phone and the candidate sign-up page always create **candidate** accounts. Set `COMPANY_CODE` before going live. The HR sign-up page then asks for that code, so the public can't create HR accounts.

## Email notifications (optional)
With Gmail: turn on 2-step verification, create an **App Password**, then set:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=you@gmail.com
```
Without SMTP, emails are written to the server log instead.

## Train the attrition model on real data (optional)
By default the model trains on a synthetic dataset that follows real attrition patterns. To use the IBM HR Analytics dataset, download `WA_Fn-UseC_-HR-Employee-Attrition.csv` from Kaggle, put it in the container or a mounted volume, and set `ATTRITION_CSV` to its path. That dataset's salaries are in US dollars, so enter employee salaries in the same unit. The **Retention → Import CSV** button also accepts that file to load employees.

---

## Run locally

**Quickest way: one command.** It builds the frontend, connects it to the backend and starts everything on http://localhost:8000:
```powershell
.\run-local.ps1          # Windows PowerShell
./run-local.sh           # macOS / Linux / WSL
```
If PowerShell blocks the script, run `Set-ExecutionPolicy -Scope Process Bypass` first.

**Or run the two parts separately while developing:**

**Backend** (Python 3.12):
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows PowerShell (macOS/Linux: source .venv/bin/activate)
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```
This uses a local SQLite file. API docs are at http://localhost:8000/docs.

**Frontend** (Node 20+), in a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. API calls are proxied to port 8000.

**Full stack with Docker** (app + MySQL):
```bash
copy .env.example .env          # macOS/Linux: cp .env.example .env
docker compose up --build
```
Open http://localhost:8000.

**Tests:**
```bash
cd backend
python -m pytest -q
```

## Jenkins
The `Jenkinsfile` runs backend tests (JUnit report), builds the frontend, builds the Docker image, starts the container and checks `/api/health` and the UI. The agent needs Python 3, Node 20+ and Docker.

## Project structure
```
backend/
  app/
    main.py              FastAPI app, startup, serves the built frontend
    config.py            environment settings
    models.py            database tables (SQLAlchemy)
    security.py          password hashing, JWT, role checks, audit log
    seed.py              demo data
    routers/             auth, oauth, phone, jobs + applications, interviews, employees, dashboard/admin
    services/            resume_parser, skills, matcher, attrition (ML), mailer, sms, notify
  tests/                 pytest suite
frontend/
  src/
    pages/               candidate Login/Signup, HR portal (HrLogin, HrSignup), HR pages, candidate pages
    components/          layout, score ring, modals, sign-in buttons, phone sign-in
    lib/                 API client, auth context, formatting
Dockerfile               multi-stage build (Node → Python)
docker-compose.yml       app + MySQL for local use
Jenkinsfile              CI/CD pipeline
```

## API overview
| Method | Path | Who |
|---|---|---|
| POST | /api/auth/signup, /api/auth/login | candidates |
| POST | /api/auth/hr/signup, /api/auth/hr/login, /api/auth/hr/recover | HR portal |
| GET | /api/auth/oauth/{google,microsoft}/start | anyone |
| POST | /api/auth/phone/send, /api/auth/phone/verify | anyone |
| GET/POST/PUT/DELETE | /api/jobs, /api/jobs/{id} | HR (candidates can read open jobs) |
| POST | /api/jobs/{id}/apply | candidate |
| GET | /api/jobs/{id}/applicants | HR, ranked by match |
| PATCH | /api/applications/{id}/stage | HR |
| GET | /api/applications/mine | candidate |
| POST | /api/interviews/suggest, /api/interviews | HR |
| GET/POST/PUT/DELETE | /api/employees, /api/employees/predict, /api/employees/import | HR |
| GET | /api/dashboard, /api/users, /api/audit | HR |
| GET | /api/health | anyone |

Full interactive docs: `/docs` on any running instance.
