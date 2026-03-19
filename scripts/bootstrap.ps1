python -m ensurepip --upgrade
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e .[mqtt]

Write-Host ""
Write-Host "Backend:"
Write-Host "  uvicorn air_quality_monitoring.api.app:app --reload --host 127.0.0.1 --port 8000"
Write-Host ""
Write-Host "Dashboard:"
Write-Host "  streamlit run src/air_quality_monitoring/dashboard/app.py"
