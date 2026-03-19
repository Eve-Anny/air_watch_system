from __future__ import annotations

from datetime import datetime

from air_quality_monitoring.domain.models import AlertRecord, AlertStatus, MeasurementRecord, utc_now
from air_quality_monitoring.storage.base import Repository


class MongoRepository(Repository):
    def __init__(
        self,
        mongodb_uri: str,
        database_name: str,
        measurements_collection: str,
        alerts_collection: str,
    ) -> None:
        try:
            from pymongo import DESCENDING, MongoClient
        except ImportError as exc:
            raise RuntimeError("pymongo is required for MongoDB persistence.") from exc

        self._client = MongoClient(mongodb_uri)
        self._database = self._client[database_name]
        self._measurements = self._database[measurements_collection]
        self._alerts = self._database[alerts_collection]
        self._desc = DESCENDING
        self._measurements.create_index([("timestamp", DESCENDING)])
        self._measurements.create_index("device_id")
        self._alerts.create_index([("updated_at", DESCENDING)])
        self._alerts.create_index([("device_id", DESCENDING), ("status", DESCENDING)])

    def save_measurement(self, measurement: MeasurementRecord) -> MeasurementRecord:
        payload = measurement.model_dump(mode="python")
        self._measurements.replace_one({"id": measurement.id}, payload, upsert=True)
        return measurement

    def list_measurements(
        self,
        limit: int = 100,
        offset: int = 0,
        since: datetime | None = None,
        device_id: str | None = None,
    ) -> list[MeasurementRecord]:
        query: dict[str, object] = {}
        if since:
            query["timestamp"] = {"$gte": since}
        if device_id:
            query["device_id"] = device_id
        rows = self._measurements.find(query).sort("timestamp", self._desc).skip(max(offset, 0)).limit(limit)
        return [MeasurementRecord.model_validate(self._strip_id(row)) for row in rows]

    def latest_measurement(self, device_id: str | None = None) -> MeasurementRecord | None:
        query: dict[str, object] = {}
        if device_id:
            query["device_id"] = device_id
        row = self._measurements.find_one(query, sort=[("timestamp", self._desc)])
        return MeasurementRecord.model_validate(self._strip_id(row)) if row else None

    def count_measurements(self) -> int:
        return int(self._measurements.count_documents({}))

    def save_alert(self, alert: AlertRecord) -> AlertRecord:
        payload = alert.model_dump(mode="python")
        self._alerts.replace_one({"id": alert.id}, payload, upsert=True)
        return alert

    def list_alerts(
        self,
        status: AlertStatus | None = None,
        limit: int = 100,
        device_id: str | None = None,
    ) -> list[AlertRecord]:
        query: dict[str, object] = {}
        if status:
            query["status"] = status.value
        if device_id:
            query["device_id"] = device_id
        rows = self._alerts.find(query).sort("updated_at", self._desc).limit(limit)
        return [AlertRecord.model_validate(self._strip_id(row)) for row in rows]

    def list_open_alerts(self, device_id: str | None = None) -> list[AlertRecord]:
        return self.list_alerts(status=AlertStatus.OPEN, limit=500, device_id=device_id)

    def find_alert(self, alert_id: str) -> AlertRecord | None:
        row = self._alerts.find_one({"id": alert_id})
        return AlertRecord.model_validate(self._strip_id(row)) if row else None

    def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> AlertRecord | None:
        alert = self.find_alert(alert_id)
        if alert is None:
            return None
        updated = alert.model_copy(
            update={
                "status": AlertStatus.ACKNOWLEDGED,
                "updated_at": utc_now(),
                "acknowledged_by": acknowledged_by,
            }
        )
        self.save_alert(updated)
        return updated

    @staticmethod
    def _strip_id(document: dict | None) -> dict | None:
        if document is None:
            return None
        document.pop("_id", None)
        return document
