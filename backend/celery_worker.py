"""
celery_worker.py — Production Celery application
─────────────────────────────────────────────────
Run worker:  celery -A celery_worker worker --loglevel=info -Q default,reports,indexing
Run beat:    celery -A celery_worker beat   --loglevel=info
Run flower:  celery -A celery_worker flower --port=5555
"""

from celery import Celery
from app.core.config import settings
from app.services.scheduled_tasks import BEAT_SCHEDULE

celery_app = Celery(
    "ecovision",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer    = "json",
    result_serializer  = "json",
    accept_content     = ["json"],
    timezone           = "UTC",
    enable_utc         = True,
    task_track_started = True,
    task_routes        = {
        "generate_sustainability_report": {"queue": "reports"},
        "index_document_task":            {"queue": "indexing"},
        "send_weekly_digest":             {"queue": "default"},
        "check_threshold_alerts":         {"queue": "default"},
        "cleanup_old_chat_sessions":      {"queue": "default"},
    },
    beat_schedule=BEAT_SCHEDULE,
    worker_max_tasks_per_child=100,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
)

celery_app.autodiscover_tasks([
    "app.services.report_task",
    "app.services.document_task",
    "app.services.scheduled_tasks",
])
