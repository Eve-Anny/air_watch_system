from __future__ import annotations

from air_quality_monitoring.domain.aqi import WHO_GUIDELINES
from air_quality_monitoring.domain.models import (
    AQICategory,
    AlertCandidate,
    AlertSeverity,
    MeasurementRecord,
)


def _pollutant_label(pollutant: str) -> str:
    labels = {
        "pm25": "PM2.5",
        "pm10": "PM10",
        "no2": "NO2",
        "so2": "SO2",
        "o3": "O3",
        "overall": "overall AQI",
        "temperature": "temperature",
        "humidity-high": "humidity",
        "humidity-low": "humidity",
    }
    return labels.get(pollutant, pollutant.upper())


def evaluate_alert_candidates(measurement: MeasurementRecord) -> list[AlertCandidate]:
    candidates: list[AlertCandidate] = []

    for pollutant, ratio in measurement.ratios.items():
        if ratio < 1:
            continue
        guideline = WHO_GUIDELINES[pollutant]
        severity = AlertSeverity.INFO
        if ratio >= 4:
            severity = AlertSeverity.CRITICAL
        elif ratio >= 2:
            severity = AlertSeverity.WARNING

        label = _pollutant_label(pollutant)
        candidates.append(
            AlertCandidate(
                key=pollutant,
                pollutant=pollutant,
                severity=severity,
                threshold=guideline,
                observed=float(getattr(measurement, pollutant)),
                title=f"{label} threshold exceeded",
                message=(
                    f"{label} is {getattr(measurement, pollutant):.1f}, above the WHO-aligned "
                    f"guideline of {guideline:.1f}."
                ),
            )
        )

    if measurement.aqi_category in {AQICategory.UNHEALTHY, AQICategory.HAZARDOUS}:
        severity = (
            AlertSeverity.CRITICAL
            if measurement.aqi_category is AQICategory.HAZARDOUS
            else AlertSeverity.WARNING
        )
        candidates.append(
            AlertCandidate(
                key="overall",
                pollutant="overall",
                severity=severity,
                threshold=200.0,
                observed=measurement.computed_index,
                title=f"{measurement.aqi_category.value} air quality detected",
                message=(
                    f"The current AQI score is {measurement.computed_index:.1f}. "
                    f"The dominant pollutant is {measurement.dominant_pollutant.upper()}."
                ),
            )
        )

    if measurement.temperature >= 38:
        candidates.append(
            AlertCandidate(
                key="temperature",
                pollutant="temperature",
                severity=AlertSeverity.WARNING,
                threshold=38.0,
                observed=measurement.temperature,
                title="High temperature condition",
                message="Ambient temperature is above the operating comfort threshold.",
            )
        )

    if measurement.humidity >= 75:
        candidates.append(
            AlertCandidate(
                key="humidity-high",
                pollutant="humidity-high",
                severity=AlertSeverity.WARNING,
                threshold=75.0,
                observed=measurement.humidity,
                title="High humidity condition",
                message="Humidity is high enough to affect comfort and sensor stability.",
            )
        )

    if measurement.humidity <= 30:
        candidates.append(
            AlertCandidate(
                key="humidity-low",
                pollutant="humidity-low",
                severity=AlertSeverity.INFO,
                threshold=30.0,
                observed=measurement.humidity,
                title="Low humidity condition",
                message="Humidity is below the recommended comfort range.",
            )
        )

    return candidates
