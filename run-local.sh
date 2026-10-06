#!/usr/bin/env bash
# One command to run TalentLens on macOS/Linux/WSL. Needs Python 3.11+ and Node 20+.
set -e
cd "$(dirname "$0")"
echo "Building the frontend..."
(cd frontend && npm install --no-audit --no-fund && npm run build)
rm -rf backend/static && cp -r frontend/dist backend/static
echo "Setting up the backend..."
cd backend
[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install -q -r requirements.txt
echo "TalentLens is starting on http://localhost:8000"
echo "Candidates: /login   HR: /hr/login (demo HR ID HR-DEMO-0001, password Demo@1234)"
exec .venv/bin/python -m uvicorn app.main:app --port "${PORT:-8000}"
