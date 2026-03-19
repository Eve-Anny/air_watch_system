from __future__ import annotations

from datetime import datetime
from threading import RLock

from air_quality_monitoring.domain.models import AlertRecord, AlertStatus, MeasurementRecord, utc_now
from air_quality_monitoring.storage.base import Repository


class MemoryRepository(Repository):
    def __init__(self) -> None:
        self._measurements: dict[str, MeasurementRecord] = {}
        self._alerts: dict[str, AlertRecord] = {}
        self._lock = RLock()

    def save_measurement(self, measurement: MeasurementRecord) -> MeasurementRecord:
        with self._lock:
            self._measurements[measurement.id] = measurement
            return measurement

    def list_measurements(
        self,
        limit: int = 100,
        offset: int = 0,
        since: datetime | None = None,
        device_id: str | None = None,
    ) -> list[MeasurementRecord]:
        with self._lock:
            values = list(self._measurements.values())
        if device_id:
            values = [item for item in values if item.device_id == device_id]
        if since:
            values = [item for item in values if item.timestamp and item.timestamp >= since]
        values.sort(key=lambda item: item.timestamp or item.ingested_at, reverse=True)
        start = max(offset, 0)
        return values[start : start + limit]

    def latest_measurement(self, device_id: str | None = None) -> MeasurementRecord | None:
        measurements = self.list_measurements(limit=1, device_id=device_id)
        return measurements[0] if measurements else None

    def count_measurements(self) -> int:
        with self._lock:
            return len(self._measurements)

    def save_alert(self, alert: AlertRecord) -> AlertRecord:
        with self._lock:
            self._alerts[alert.id] = alert
            return alert

    def list_alerts(
        self,
        status: AlertStatus | None = None,
        limit: int = 100,
        device_id: str | None = None,
    ) -> list[AlertRecord]:
        with self._lock:
            values = list(self._alerts.values())
        if device_id:
            values = [item for item in values if item.device_id == device_id]
        if status:
            values = [item for item in values if item.status is status]
        values.sort(key=lambda item: item.updated_at, reverse=True)
        return values[:limit]

    def list_open_alerts(self, device_id: str | None = None) -> list[AlertRecord]:
        return self.list_alerts(status=AlertStatus.OPEN, limit=500, device_id=device_id)

    def find_alert(self, alert_id: str) -> AlertRecord | None:
        with self._lock:
            return self._alerts.get(alert_id)

    def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> AlertRecord | None:
        with self._lock:
            alert = self._alerts.get(alert_id)
            if alert is None:
                return None
            updated = alert.model_copy(
                update={
                    "status": AlertStatus.ACKNOWLEDGED,
                    "updated_at": utc_now(),
                    "acknowledged_by": acknowledged_by,
                }
            )
            self._alerts[alert_id] = updated
            return updated
