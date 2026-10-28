# Start the EcoTrack AI API on http://127.0.0.1:5000
# Usage: powershell -ExecutionPolicy Bypass -File .\run.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "Virtual environment not found - run setup.ps1 first." -ForegroundColor Red
    exit 1
}
& .\.venv\Scripts\python.exe app.py
