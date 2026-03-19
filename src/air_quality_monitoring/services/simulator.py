from __future__ import annotations

import random
from datetime import timedelta

from air_quality_monitoring.domain.models import MeasurementIn, utc_now


class SimulatorService:
    def __init__(self, seed: int = 42) -> None:
        self._random = random.Random(seed)

    def generate_measurement(
        self,
        device_id: str,
        location: str,
        minutes_ago: int = 0,
    ) -> MeasurementIn:
        reading = MeasurementIn(
            device_id=device_id,
            location=location,
            timestamp=utc_now() - timedelta(minutes=minutes_ago),
            pm25=self._random.uniform(5, 22),
            pm10=self._random.uniform(15, 58),
            no2=self._random.uniform(6, 28),
            so2=self._random.uniform(4, 26),
            o3=self._random.uniform(28, 110),
            voc=self._random.uniform(30, 280),
            temperature=self._random.uniform(22, 33),
            humidity=self._random.uniform(34, 68),
        )

        if self._random.random() < 0.2:
            pollutant = self._random.choice(["pm25", "pm10", "no2", "so2", "o3"])
            spike = {
                "pm25": self._random.uniform(45, 140),
                "pm10": self._random.uniform(110, 280),
                "no2": self._random.uniform(60, 160),
                "so2": self._random.uniform(70, 170),
                "o3": self._random.uniform(130, 260),
            }[pollutant]
            reading = reading.model_copy(update={pollutant: spike})

        return reading

    def generate_batch(
        self,
        count: int,
        device_id: str,
        location: str,
    ) -> list[MeasurementIn]:
        return [
            self.generate_measurement(device_id=device_id, location=location, minutes_ago=count - index)
            for index in range(count)
        ]

