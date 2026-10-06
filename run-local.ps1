# One command to run TalentLens on Windows (PowerShell).
# Needs Python 3.11+ and Node 20+. Usage:  .\run-local.ps1   then open http://localhost:8000
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Building the frontend..." -ForegroundColor Cyan
Push-Location frontend
npm install --no-audit --no-fund
npm run build
Pop-Location

if (Test-Path backend\static) { Remove-Item -Recurse -Force backend\static }
Copy-Item -Recurse frontend\dist backend\static

Write-Host "Setting up the backend..." -ForegroundColor Cyan
Push-Location backend
if (-not (Test-Path .venv)) { python -m venv .venv }
.\.venv\Scripts\python.exe -m pip install -q -r requirements.txt
Write-Host "TalentLens is starting on http://localhost:8000" -ForegroundColor Green
Write-Host "Candidates: /login   HR: /hr/login (demo HR ID HR-DEMO-0001, password Demo@1234)"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
Pop-Location
