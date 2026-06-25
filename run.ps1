<#
  Cleared — one-command demo runner (Windows / PowerShell).

  Usage:
    .\run.ps1            # install, build (if needed), seed demo data, launch
    .\run.ps1 -Build     # force a fresh frontend build
    .\run.ps1 -Fresh     # delete the local DB first (clean slate)
    .\run.ps1 -Port 9000 # run on a different port

  After it starts, open http://localhost:8000 and log in with:
    demo@cleared.com.au / demo1234   (this account is also an admin)
#>
param(
  [switch]$Build,
  [switch]$Fresh,
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "==> Cleared demo runner" -ForegroundColor Cyan

# 1. Python venv + deps
if (-not (Test-Path "venv\Scripts\python.exe")) {
  Write-Host "==> Creating virtualenv..." -ForegroundColor Cyan
  python -m venv venv
}
$py = ".\venv\Scripts\python.exe"
Write-Host "==> Installing Python dependencies..." -ForegroundColor Cyan
& $py -m pip install --quiet --upgrade pip
& $py -m pip install --quiet -r requirements.txt

# 2. Frontend build (only if missing, unless -Build)
if ($Build -or -not (Test-Path "frontend\dist\index.html")) {
  Write-Host "==> Building frontend..." -ForegroundColor Cyan
  Push-Location frontend
  if (-not (Test-Path "node_modules")) { npm install } else { npm install --no-audit --no-fund }
  npm run build
  Pop-Location
} else {
  Write-Host "==> Frontend already built (use -Build to rebuild)." -ForegroundColor DarkGray
}

# 3. Environment
if (-not $env:ANTHROPIC_API_KEY) {
  $env:CLEARED_MOCK = "1"
  Write-Host "==> No ANTHROPIC_API_KEY found - running in offline mock mode." -ForegroundColor Yellow
} else {
  Write-Host "==> ANTHROPIC_API_KEY found - assessments will use Claude." -ForegroundColor Green
}
$env:CLEARED_ADMIN_EMAILS = "demo@cleared.com.au"
if (-not $env:CLEARED_SECRET_KEY) {
  $env:CLEARED_SECRET_KEY = -join ((1..48) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
}

if ($Fresh -and (Test-Path "data\cleared.db")) {
  Write-Host "==> Removing existing database (--Fresh)..." -ForegroundColor Yellow
  Remove-Item "data\cleared.db*" -Force -ErrorAction SilentlyContinue
}

# 4. Seed demo data
Write-Host "==> Seeding demo data..." -ForegroundColor Cyan
& $py -m cleared.cli seed-demo

# 5. Launch
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Cleared is starting on http://localhost:$Port" -ForegroundColor Green
Write-Host "  Login:  demo@cleared.com.au  /  demo1234  (admin)" -ForegroundColor Green
Write-Host "  API docs:  http://localhost:$Port/docs" -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
& $py -m uvicorn cleared.api:app --host 0.0.0.0 --port $Port
