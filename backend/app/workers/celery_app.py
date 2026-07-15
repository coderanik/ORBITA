"""
Celery app initialization for background tasks.
"""

import os
from celery import Celery

# Set default broker and backend if not in env
BROKER_URL = os.getenv("CELERY_BROKER_URL", "amqp://guest:guest@localhost:5672//")
RESULT_BACKEND = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "orbita_workers",
    broker=BROKER_URL,
    backend=RESULT_BACKEND,
    include=[
        "app.workers.tasks.tle_updater",
        "app.workers.tasks.space_weather",
        "app.workers.tasks.conjunction_scan",
        "app.workers.tasks.telemetry_ingest",
        "app.workers.tasks.kessler_sim",
    ]
)

# Optional configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_concurrency=4
)

if __name__ == "__main__":
    celery_app.start()
