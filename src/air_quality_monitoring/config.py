from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(slots=True)
class Settings:
    app_env: str
    api_host: str
    api_port: int
    dashboard_api_url: str
    default_device_id: str
    default_location: str
    auto_seed_demo: bool
    mongodb_uri: str | None
    mongodb_database: str
    mongodb_measurements_collection: str
    mongodb_alerts_collection: str
    model_path: Path

    @classmethod
    def from_env(cls) -> "Settings":
        project_root = Path(__file__).resolve().parents[2]
        load_dotenv(project_root / ".env")
        return cls(
            app_env=os.getenv("APP_ENV", "development"),
            api_host=os.getenv("API_HOST", "127.0.0.1"),
            api_port=int(os.getenv("API_PORT", "8000")),
            dashboard_api_url=os.getenv("DASHBOARD_API_URL", "http://127.0.0.1:8000"),
            default_device_id=os.getenv("DEFAULT_DEVICE_ID", "demo-node-1"),
            default_location=os.getenv("DEFAULT_LOCATION", "Indoor Lab"),
            auto_seed_demo=_as_bool(os.getenv("AUTO_SEED_DEMO"), True),
            mongodb_uri=os.getenv("MONGODB_URI") or None,
            mongodb_database=os.getenv("MONGODB_DATABASE", "air_quality_monitoring"),
            mongodb_measurements_collection=os.getenv(
                "MONGODB_MEASUREMENTS_COLLECTION",
                "measurements",
            ),
            mongodb_alerts_collection=os.getenv(
                "MONGODB_ALERTS_COLLECTION",
                "alerts",
            ),
            model_path=project_root / os.getenv("MODEL_PATH", "artifacts/aqi_classifier.joblib"),
        )
