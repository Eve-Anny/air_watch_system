from __future__ import annotations

import random
from datetime import datetime, timezone
from pathlib import Path

from air_quality_monitoring.domain.aqi import compute_aqi
from air_quality_monitoring.domain.models import AQICategory, MeasurementIn, MeasurementRecord, ModelStatus


class ModelService:
    FEATURES = ["pm25", "pm10", "no2", "so2", "o3", "voc", "temperature", "humidity"]

    def __init__(self, model_path: Path) -> None:
        self._model_path = model_path
        self._artifact: dict | None = None
        self._status = ModelStatus()
        self._load_artifact()

    def predict(self, measurement: MeasurementIn) -> tuple[AQICategory, float, str] | None:
        if self._artifact is None:
            self._load_artifact()
        if self._artifact is None:
            return None

        import pandas as pd

        model = self._artifact["model"]
        frame = pd.DataFrame([self._feature_row(measurement)])
        probabilities = model.predict_proba(frame)[0]
        classes = list(model.classes_)
        best_index = int(probabilities.argmax())
        return (
            AQICategory(classes[best_index]),
            float(probabilities[best_index]),
            str(self._artifact["version"]),
        )

    def train(self, records: list[MeasurementRecord]) -> ModelStatus:
        from joblib import dump
        import pandas as pd
        from sklearn.ensemble import RandomForestClassifier

        rows = [self._training_row(record) for record in records]
        if len(rows) < 200:
            rows.extend(self._synthetic_training_rows(max(400, 600 - len(rows))))

        frame = pd.DataFrame(rows)
        model = RandomForestClassifier(
            n_estimators=250,
            max_depth=12,
            random_state=42,
            class_weight="balanced",
        )
        model.fit(frame[self.FEATURES], frame["label"])

        trained_at = datetime.now(timezone.utc)
        version = f"rf-{trained_at:%Y%m%d%H%M%S}"
        artifact = {
            "model": model,
            "version": version,
            "trained_at": trained_at,
            "training_samples": len(frame),
        }

        self._model_path.parent.mkdir(parents=True, exist_ok=True)
        dump(artifact, self._model_path)
        self._artifact = artifact
        self._status = ModelStatus(
            available=True,
            version=version,
            trained_at=trained_at,
            training_samples=len(frame),
        )
        return self._status

    def status(self) -> ModelStatus:
        if self._artifact is None:
            self._load_artifact()
        return self._status

    def _load_artifact(self) -> None:
        if not self._model_path.exists():
            self._artifact = None
            self._status = ModelStatus()
            return
        from joblib import load

        artifact = load(self._model_path)
        self._artifact = artifact
        self._status = ModelStatus(
            available=True,
            version=str(artifact["version"]),
            trained_at=artifact["trained_at"],
            training_samples=int(artifact["training_samples"]),
        )

    def _feature_row(self, measurement: MeasurementIn | MeasurementRecord) -> dict[str, float]:
        return {
            "pm25": float(measurement.pm25),
            "pm10": float(measurement.pm10),
            "no2": float(measurement.no2),
            "so2": float(measurement.so2),
            "o3": float(measurement.o3),
            "voc": float(measurement.voc or 0.0),
            "temperature": float(measurement.temperature),
            "humidity": float(measurement.humidity),
        }

    def _training_row(self, record: MeasurementRecord) -> dict[str, float | str]:
        row: dict[str, float | str] = self._feature_row(record)
        row["label"] = record.predicted_category.value if record.predicted_category else record.aqi_category.value
        return row

    def _synthetic_training_rows(self, count: int) -> list[dict[str, float | str]]:
        rows: list[dict[str, float | str]] = []
        generator = random.Random(42)

        for _ in range(count):
            payload = MeasurementIn(
                device_id="synthetic-node",
                location="Synthetic Training Set",
                pm25=generator.uniform(3, 18),
                pm10=generator.uniform(8, 55),
                no2=generator.uniform(5, 35),
                so2=generator.uniform(3, 30),
                o3=generator.uniform(20, 115),
                voc=generator.uniform(20, 400),
                temperature=generator.uniform(21, 34),
                humidity=generator.uniform(32, 72),
            )

            if generator.random() < 0.35:
                pollutant = generator.choice(["pm25", "pm10", "no2", "so2", "o3"])
                spike = {
                    "pm25": generator.uniform(35, 120),
                    "pm10": generator.uniform(90, 260),
                    "no2": generator.uniform(55, 180),
                    "so2": generator.uniform(65, 190),
                    "o3": generator.uniform(140, 280),
                }[pollutant]
                payload = payload.model_copy(update={pollutant: spike})

            computation = compute_aqi(payload)
            row: dict[str, float | str] = self._feature_row(payload)
            row["label"] = computation.category.value
            rows.append(row)

        return rows

