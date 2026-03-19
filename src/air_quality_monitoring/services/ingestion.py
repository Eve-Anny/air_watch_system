from __future__ import annotations

from air_quality_monitoring.domain.alerts import evaluate_alert_candidates
from air_quality_monitoring.domain.aqi import compute_aqi
from air_quality_monitoring.domain.models import (
    AlertRecord,
    AlertStatus,
    MeasurementIn,
    MeasurementRecord,
    utc_now,
)
from air_quality_monitoring.services.ml import ModelService
from air_quality_monitoring.storage.base import Repository


class IngestionService:
    def __init__(self, repository: Repository, model_service: ModelService) -> None:
        self._repository = repository
        self._model_service = model_service

    def ingest(self, payload: MeasurementIn) -> tuple[MeasurementRecord, list[AlertRecord]]:
        timestamp = payload.timestamp or utc_now()
        normalized = payload.model_copy(update={"timestamp": timestamp})
        computation = compute_aqi(normalized)
        prediction = self._model_service.predict(normalized)

        measurement = MeasurementRecord(
            **normalized.model_dump(),
            computed_index=computation.index,
            aqi_category=computation.category,
            dominant_pollutant=computation.dominant_pollutant,
            ratios=computation.ratios,
            predicted_category=prediction[0] if prediction else None,
            model_confidence=prediction[1] if prediction else None,
            model_version=prediction[2] if prediction else None,
        )
        self._repository.save_measurement(measurement)
        alerts = self._sync_alerts(measurement)
        return measurement, alerts

    def _sync_alerts(self, measurement: MeasurementRecord) -> list[AlertRecord]:
        candidates = {candidate.key: candidate for candidate in evaluate_alert_candidates(measurement)}
        open_alerts = {
            alert.pollutant: alert
            for alert in self._repository.list_open_alerts(device_id=measurement.device_id)
        }

        touched: list[AlertRecord] = []
        now = utc_now()

        for key, candidate in candidates.items():
            existing = open_alerts.get(key)
            if existing:
                updated = existing.model_copy(
                    update={
                        "severity": candidate.severity,
                        "title": candidate.title,
                        "message": candidate.message,
                        "threshold": candidate.threshold,
                        "observed": candidate.observed,
                        "measurement_id": measurement.id,
                        "updated_at": now,
                        "status": AlertStatus.OPEN,
                    }
                )
                self._repository.save_alert(updated)
                touched.append(updated)
                continue

            alert = AlertRecord(
                device_id=measurement.device_id,
                pollutant=candidate.key,
                severity=candidate.severity,
                title=candidate.title,
                message=candidate.message,
                threshold=candidate.threshold,
                observed=candidate.observed,
                measurement_id=measurement.id,
            )
            self._repository.save_alert(alert)
            touched.append(alert)

        for key, existing in open_alerts.items():
            if key in candidates:
                continue
            resolved = existing.model_copy(
                update={
                    "status": AlertStatus.RESOLVED,
                    "updated_at": now,
                }
            )
            self._repository.save_alert(resolved)
            touched.append(resolved)

        return touched

