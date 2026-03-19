from __future__ import annotations

from dataclasses import dataclass

from air_quality_monitoring.domain.models import AQICategory, MeasurementIn


WHO_GUIDELINES: dict[str, float] = {
    "pm25": 15.0,
    "pm10": 45.0,
    "no2": 25.0,
    "so2": 40.0,
    "o3": 100.0,
}


@dataclass(slots=True)
class AQIComputation:
    index: float
    category: AQICategory
    dominant_pollutant: str
    ratios: dict[str, float]


def guideline_ratios(measurement: MeasurementIn) -> dict[str, float]:
    ratios: dict[str, float] = {}
    for pollutant, guideline in WHO_GUIDELINES.items():
        value = float(getattr(measurement, pollutant))
        ratios[pollutant] = round(value / guideline, 4)
    return ratios


def category_from_index(index: float) -> AQICategory:
    if index <= 100:
        return AQICategory.GOOD
    if index <= 200:
        return AQICategory.MODERATE
    if index <= 400:
        return AQICategory.UNHEALTHY
    return AQICategory.HAZARDOUS


def compute_aqi(measurement: MeasurementIn) -> AQIComputation:
    ratios = guideline_ratios(measurement)
    dominant_pollutant = max(ratios, key=ratios.get)
    index = round(ratios[dominant_pollutant] * 100, 2)
    return AQIComputation(
        index=index,
        category=category_from_index(index),
        dominant_pollutant=dominant_pollutant,
        ratios=ratios,
    )

