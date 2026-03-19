from __future__ import annotations

from collections import Counter
from pathlib import Path
from statistics import mean

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from air_quality_monitoring.bootstrap import get_container
from air_quality_monitoring.domain.models import AlertRecord, AlertStatus, MeasurementIn, MeasurementRecord, SummarySnapshot


class AlertAcknowledgeRequest(BaseModel):
    acknowledged_by: str = Field(default="dashboard-operator", min_length=1)


def frontend_dist_dir() -> Path:
    return Path(__file__).resolve().parents[3] / "frontend" / "dist"


def register_frontend(app: FastAPI) -> None:
    dist_dir = frontend_dist_dir()
    assets_dir = dist_dir / "assets"

    if not dist_dir.exists():
        return

    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/", include_in_schema=False)
    def serve_frontend_index() -> FileResponse:
        return FileResponse(dist_dir / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend_route(full_path: str) -> FileResponse:
        if full_path.startswith(("api/", "docs", "redoc", "openapi.json", "health")):
            raise HTTPException(status_code=404, detail="Not found")

        requested_path = (dist_dir / full_path).resolve()
        try:
            requested_path.relative_to(dist_dir.resolve())
        except ValueError as exc:
            raise HTTPException(status_code=404, detail="Not found") from exc

        if requested_path.is_file():
            return FileResponse(requested_path)

        return FileResponse(dist_dir / "index.html")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Air Quality Monitoring API",
        version="0.1.0",
        description="Real-time air quality monitoring backend with alerts and ML support.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    container = get_container()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "storage": container.repository.__class__.__name__}

    @app.post("/api/v1/measurements", response_model=MeasurementRecord)
    def create_measurement(payload: MeasurementIn) -> MeasurementRecord:
        measurement, _ = container.ingestion_service.ingest(payload)
        return measurement

    @app.get("/api/v1/measurements", response_model=list[MeasurementRecord])
    def list_measurements(
        limit: int = Query(default=120, ge=1, le=1000),
        offset: int = Query(default=0, ge=0),
        device_id: str | None = None,
    ) -> list[MeasurementRecord]:
        return container.repository.list_measurements(limit=limit, offset=offset, device_id=device_id)

    @app.get("/api/v1/measurements/latest", response_model=MeasurementRecord | None)
    def latest_measurement(device_id: str | None = None) -> MeasurementRecord | None:
        return container.repository.latest_measurement(device_id=device_id)

    @app.get("/api/v1/alerts", response_model=list[AlertRecord])
    def list_alerts(
        status: AlertStatus | None = None,
        limit: int = Query(default=100, ge=1, le=500),
        device_id: str | None = None,
    ) -> list[AlertRecord]:
        return container.repository.list_alerts(status=status, limit=limit, device_id=device_id)

    @app.post("/api/v1/alerts/{alert_id}/acknowledge", response_model=AlertRecord)
    def acknowledge_alert(alert_id: str, payload: AlertAcknowledgeRequest) -> AlertRecord:
        alert = container.repository.acknowledge_alert(alert_id, payload.acknowledged_by)
        if alert is None:
            raise HTTPException(status_code=404, detail="Alert not found")
        return alert

    @app.post("/api/v1/simulator/seed", response_model=list[MeasurementRecord])
    def seed_demo_data(
        count: int = Query(default=48, ge=1, le=500),
        device_id: str | None = None,
        location: str | None = None,
    ) -> list[MeasurementRecord]:
        resolved_device = device_id or container.settings.default_device_id
        resolved_location = location or container.settings.default_location
        batch = container.simulator_service.generate_batch(
            count=count,
            device_id=resolved_device,
            location=resolved_location,
        )
        seeded: list[MeasurementRecord] = []
        for payload in batch:
            measurement, _ = container.ingestion_service.ingest(payload)
            seeded.append(measurement)
        return seeded

    @app.post("/api/v1/models/train")
    def train_model() -> dict[str, object]:
        records = container.repository.list_measurements(limit=5000)
        status = container.model_service.train(records)
        return status.model_dump(mode="json")

    @app.get("/api/v1/summary", response_model=SummarySnapshot)
    def summary(device_id: str | None = None) -> SummarySnapshot:
        latest = container.repository.latest_measurement(device_id=device_id)
        measurements = container.repository.list_measurements(limit=240, device_id=device_id)
        open_alerts = container.repository.list_open_alerts(device_id=device_id)
        stats = build_stats(measurements)
        return SummarySnapshot(
            latest_measurement=latest,
            open_alerts=open_alerts,
            model_status=container.model_service.status(),
            stats=stats,
        )

    register_frontend(app)

    return app


def build_stats(measurements: list[MeasurementRecord]) -> dict[str, object]:
    if not measurements:
        return {
            "measurement_count": 0,
            "aqi_average": None,
            "aqi_peak": None,
            "category_breakdown": {},
            "average_pollutants": {},
            "latest_timestamp": None,
        }

    category_breakdown = Counter(item.aqi_category.value for item in measurements)
    pollutant_names = ["pm25", "pm10", "no2", "so2", "o3", "voc", "temperature", "humidity"]
    average_pollutants = {
        pollutant: round(mean(float(getattr(item, pollutant) or 0.0) for item in measurements), 2)
        for pollutant in pollutant_names
    }
    return {
        "measurement_count": len(measurements),
        "aqi_average": round(mean(item.computed_index for item in measurements), 2),
        "aqi_peak": round(max(item.computed_index for item in measurements), 2),
        "category_breakdown": dict(category_breakdown),
        "average_pollutants": average_pollutants,
        "latest_timestamp": measurements[0].timestamp,
    }


app = create_app()
