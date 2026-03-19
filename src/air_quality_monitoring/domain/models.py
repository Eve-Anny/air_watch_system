from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AQICategory(str, Enum):
    GOOD = "Good"
    MODERATE = "Moderate"
    UNHEALTHY = "Unhealthy"
    HAZARDOUS = "Hazardous"


class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class MeasurementIn(BaseModel):
    device_id: str = Field(default="demo-node-1", min_length=1)
    location: str = Field(default="Indoor Lab", min_length=1)
    timestamp: datetime | None = None
    pm25: float = Field(ge=0)
    pm10: float = Field(ge=0)
    no2: float = Field(ge=0)
    so2: float = Field(ge=0)
    o3: float = Field(ge=0)
    voc: float | None = Field(default=None, ge=0)
    temperature: float
    humidity: float = Field(ge=0, le=100)


class MeasurementRecord(MeasurementIn):
    id: str = Field(default_factory=lambda: uuid4().hex)
    ingested_at: datetime = Field(default_factory=utc_now)
    computed_index: float
    aqi_category: AQICategory
    dominant_pollutant: str
    ratios: dict[str, float]
    predicted_category: AQICategory | None = None
    model_confidence: float | None = None
    model_version: str | None = None


class AlertCandidate(BaseModel):
    key: str
    title: str
    message: str
    pollutant: str
    severity: AlertSeverity
    threshold: float
    observed: float


class AlertRecord(BaseModel):
    id: str = Field(default_factory=lambda: uuid4().hex)
    device_id: str
    pollutant: str
    severity: AlertSeverity
    status: AlertStatus = AlertStatus.OPEN
    title: str
    message: str
    threshold: float
    observed: float
    measurement_id: str
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    acknowledged_by: str | None = None


class ModelStatus(BaseModel):
    available: bool = False
    version: str | None = None
    trained_at: datetime | None = None
    training_samples: int = 0


class SummarySnapshot(BaseModel):
    latest_measurement: MeasurementRecord | None
    open_alerts: list[AlertRecord]
    model_status: ModelStatus
    stats: dict[str, Any]

