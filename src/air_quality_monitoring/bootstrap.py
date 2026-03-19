from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from air_quality_monitoring.config import Settings
from air_quality_monitoring.services.ingestion import IngestionService
from air_quality_monitoring.services.ml import ModelService
from air_quality_monitoring.services.simulator import SimulatorService
from air_quality_monitoring.storage.base import Repository
from air_quality_monitoring.storage.memory import MemoryRepository
from air_quality_monitoring.storage.mongo import MongoRepository


@dataclass(slots=True)
class AppContainer:
    settings: Settings
    repository: Repository
    model_service: ModelService
    ingestion_service: IngestionService
    simulator_service: SimulatorService


def _build_repository(settings: Settings) -> Repository:
    if settings.mongodb_uri:
        return MongoRepository(
            mongodb_uri=settings.mongodb_uri,
            database_name=settings.mongodb_database,
            measurements_collection=settings.mongodb_measurements_collection,
            alerts_collection=settings.mongodb_alerts_collection,
        )
    return MemoryRepository()


@lru_cache(maxsize=1)
def get_container() -> AppContainer:
    settings = Settings.from_env()
    repository = _build_repository(settings)
    model_service = ModelService(settings.model_path)
    ingestion_service = IngestionService(repository=repository, model_service=model_service)
    simulator_service = SimulatorService()
    return AppContainer(
        settings=settings,
        repository=repository,
        model_service=model_service,
        ingestion_service=ingestion_service,
        simulator_service=simulator_service,
    )
