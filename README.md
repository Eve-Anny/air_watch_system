# Air Quality Monitoring System

This repository implements the project described in your presentation:

- FastAPI backend for ingestion, analytics, alert handling, and ML training
- React dashboard for live monitoring, alerts, and manual ingestion
- WHO-aligned AQI scoring from PM2.5, PM10, NO2, SO2, and O3
- Alert engine with open, acknowledged, and resolved states
- Random Forest classifier pipeline for AQI category prediction
- In-memory demo mode by default, with optional MongoDB persistence

## Architecture

The system is split into four layers:

1. `api`: receives measurements, exposes summaries, alerts, and model endpoints
2. `services`: AQI calculation, alert evaluation, ingestion orchestration, simulation, and ML
3. `storage`: pluggable repository backed by memory or MongoDB
4. `frontend`: Vite/React dashboard served by FastAPI after build

## Local Setup

This machine currently has Python `3.14.3` installed but does not have `pip` yet. Start with:

```powershell
python -m ensurepip --upgrade
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e .[mqtt]
```

If a third-party package fails on Python 3.14, install Python 3.13 and repeat the same steps with that interpreter.

Copy the example configuration:

```powershell
Copy-Item .env.example .env
```

Install the dashboard dependencies:

```powershell
Set-Location frontend
cmd /c npm install
Set-Location ..
```

## Run The Backend

```powershell
python -m uvicorn air_quality_monitoring.api.app:app --reload --host 127.0.0.1 --port 8000
```

Once the frontend has been built, the API serves the dashboard from `http://127.0.0.1:8000/`.

Useful API routes:

- `GET /health`
- `POST /api/v1/measurements`
- `GET /api/v1/measurements/latest`
- `GET /api/v1/measurements?limit=120`
- `GET /api/v1/summary`
- `GET /api/v1/alerts`
- `POST /api/v1/alerts/{alert_id}/acknowledge`
- `POST /api/v1/simulator/seed?count=48`
- `POST /api/v1/models/train`

## Build The Dashboard

```powershell
Set-Location frontend
cmd /c npm run build
Set-Location ..
```

For local frontend development with hot reload:

```powershell
Set-Location frontend
cmd /c npm run dev
```

The dashboard is designed to work in two phases:

- Demo phase: use the seed button or `/api/v1/simulator/seed`
- Hardware phase: publish sensor payloads through the MQTT subscriber or call the ingestion API directly

## MQTT Bridge

Install the optional MQTT dependency, then run:

Install Mosquitto on Windows

Open this page in your browser:

https://mosquitto.org/download/

After installation, close Git Bash and open it again. Then test:

mosquitto -v

If the command is still not found, run it directly:

"/c/Program Files/mosquitto/mosquitto.exe" -v

```powershell
source .venv/Scripts/activate
python -m air_quality_monitoring.mqtt_subscriber --broker 127.0.0.1 --topic air-quality/readings
```

Expected payload:

```json
{
  "device_id": "esp32-node-1",
  "location": "Chemistry Lab",
  "pm25": 18.2,
  "pm10": 41.5,
  "no2": 12.0,
  "so2": 9.1,
  "o3": 46.0,
  "voc": 120.0,
  "temperature": 27.4,
  "humidity": 52.0
}
```

## Testing

The included tests cover the core AQI and alert logic without external dependencies:

```powershell
python -m unittest discover -s tests
```


# Running Project local

## Run Consumer publisher for data sim
source .venv/Scripts/activate
python -m air_quality_monitoring.mqtt_subscriber --broker 127.0.0.1 --topic air-quality/readings

## Activate Environment Run Backend 
source .venv/Scripts/activate
python -m uvicorn air_quality_monitoring.api.app:app --reload --host 127.0.0.1 --port 8000

## Run Frontend
cd frontend/
npm run dev