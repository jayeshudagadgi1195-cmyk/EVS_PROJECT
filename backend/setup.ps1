# EcoTrack AI - one-step backend setup for Windows PowerShell
# Usage (from the backend folder):
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
# Add -Reset to rebuild the demo records from scratch:
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1 -Reset

param([switch]$Reset)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "`n== EcoTrack AI backend setup ==" -ForegroundColor Green

# 1. Find Python (python or the 'py' launcher)
$python = $null
foreach ($cmd in @("python", "py")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) { $python = $cmd; break }
}
if (-not $python) {
    Write-Host "Python was not found. Install Python 3.11+ from https://www.python.org/downloads/ (tick 'Add python.exe to PATH')." -ForegroundColor Red
    exit 1
}
& $python --version

# 2. Virtual environment
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "Creating virtual environment (.venv)..."
    & $python -m venv .venv
}
$venvPy = ".\.venv\Scripts\python.exe"

# 3. Dependencies
Write-Host "Installing requirements (first run can take a few minutes)..."
& $venvPy -m pip install --upgrade pip --quiet
& $venvPy -m pip install -r requirements.txt --quiet
if ($LASTEXITCODE -ne 0) { Write-Host "pip install failed." -ForegroundColor Red; exit 1 }

# 4. Database + demo data + synthetic dataset + model training
if ($Reset) { & $venvPy init_all.py --reset } else { & $venvPy init_all.py }
if ($LASTEXITCODE -ne 0) { Write-Host "Initialisation failed." -ForegroundColor Red; exit 1 }

Write-Host "`nSetup complete. Start the API with:" -ForegroundColor Green
Write-Host "   .\run.ps1        (or: .\.venv\Scripts\python.exe app.py)`n"
