from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime

from air_quality_monitoring.domain.models import AlertRecord, AlertStatus, MeasurementRecord


class Repository(ABC):
    @abstractmethod
    def save_measurement(self, measurement: MeasurementRecord) -> MeasurementRecord:
        raise NotImplementedError

    @abstractmethod
    def list_measurements(
        self,
        limit: int = 100,
        since: datetime | None = None,
        device_id: str | None = None,
    ) -> list[MeasurementRecord]:
        raise NotImplementedError

    @abstractmethod
    def latest_measurement(self, device_id: str | None = None) -> MeasurementRecord | None:
        raise NotImplementedError

    @abstractmethod
    def count_measurements(self) -> int:
        raise NotImplementedError

    @abstractmethod
    def save_alert(self, alert: AlertRecord) -> AlertRecord:
        raise NotImplementedError

    @abstractmethod
    def list_alerts(
        self,
        status: AlertStatus | None = None,
        limit: int = 100,
        device_id: str | None = None,
    ) -> list[AlertRecord]:
        raise NotImplementedError

    @abstractmethod
    def list_open_alerts(self, device_id: str | None = None) -> list[AlertRecord]:
        raise NotImplementedError

    @abstractmethod
    def find_alert(self, alert_id: str) -> AlertRecord | None:
        raise NotImplementedError

    @abstractmethod
    def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> AlertRecord | None:
        raise NotImplementedError

