"""
app/services/scheduled_tasks.py
─────────────────────────────────
Celery Beat periodic tasks:
  • weekly_sustainability_digest  — every Monday 08:00
  • check_threshold_alerts        — every 6 hours
  • cleanup_old_sessions          — every night at 02:00
  • warm_rag_cache                — every hour
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta

from celery import shared_task
from celery.schedules import crontab
from loguru import logger
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings


def _sync_db() -> Session:
    url = settings.DATABASE_URL.replace("+asyncpg", "")
    return Session(create_engine(url, pool_pre_ping=True))


# ── Beat schedule (added to celery_worker.py) ────────────────────
BEAT_SCHEDULE = {
    "weekly-digest": {
        "task":     "send_weekly_digest",
        "schedule": crontab(hour=8, minute=0, day_of_week=1),  # Monday 08:00
    },
    "check-thresholds": {
        "task":     "check_threshold_alerts",
        "schedule": crontab(minute=0, hour="*/6"),             # every 6h
    },
    "cleanup-sessions": {
        "task":     "cleanup_old_chat_sessions",
        "schedule": crontab(hour=2, minute=0),                 # 02:00 daily
    },
}


@shared_task(name="send_weekly_digest")
def send_weekly_digest_task():
    """Send weekly sustainability digest to all sustainability officers."""
    import asyncio
    from app.services.email_service import send_weekly_digest
    from app.models.user import User, UserRole, SustainabilityMetric
    from app.services.sustainability_score import calculate_score

    db = _sync_db()
    try:
        officers = db.execute(
            select(User).where(
                User.role.in_([UserRole.sustainability_officer, UserRole.admin]),
                User.is_active == True,  # noqa: E712
            )
        ).scalars().all()

        tip = (
            "Install occupancy sensors in all lecture halls — automated shutdown "
            "when rooms are empty reduces electricity consumption by 20–25% (SDG 7)."
        )

        for user in officers:
            # Get latest metric
            metric = db.execute(
                select(SustainabilityMetric)
                .where(SustainabilityMetric.institution_id == user.institution_id)
                .order_by(SustainabilityMetric.year.desc(), SustainabilityMetric.month.desc())
                .limit(1)
            ).scalar_one_or_none()

            if metric:
                score = calculate_score(
                    metric.energy_kwh, metric.water_liters,
                    metric.waste_kg,   metric.carbon_kg,
                ).composite
                asyncio.run(send_weekly_digest(
                    user.email, user.full_name, score,
                    metric.energy_kwh, metric.carbon_kg, tip,
                ))
                logger.info("Weekly digest sent to {}", user.email)

    except Exception as e:
        logger.error("Weekly digest failed: {}", e)
        raise
    finally:
        db.close()


@shared_task(name="check_threshold_alerts")
def check_threshold_alerts_task():
    """
    Check if any institution's latest metrics exceed configured thresholds.
    Thresholds: energy > 65,000 kWh, carbon > 28,000 kg, waste > 17,000 kg
    """
    import asyncio
    from app.models.user import User, UserRole, SustainabilityMetric
    from app.services.email_service import send_threshold_alert

    THRESHOLDS = {
        "energy_kwh":   65_000,
        "carbon_kg":    28_000,
        "waste_kg":     17_000,
        "water_liters": 4_000_000,
    }

    db = _sync_db()
    try:
        metrics = db.execute(
            select(SustainabilityMetric).order_by(
                SustainabilityMetric.year.desc(), SustainabilityMetric.month.desc()
            )
        ).scalars().all()

        for m in metrics:
            for field, threshold in THRESHOLDS.items():
                val = getattr(m, field)
                if val > threshold:
                    # Find officer for this institution
                    officer = db.execute(
                        select(User).where(
                            User.institution_id == m.institution_id,
                            User.role == UserRole.sustainability_officer,
                            User.is_active == True,  # noqa
                        ).limit(1)
                    ).scalar_one_or_none()

                    if officer:
                        unit_map = {"energy_kwh":"kWh","carbon_kg":"kg","waste_kg":"kg","water_liters":"L"}
                        asyncio.run(send_threshold_alert(
                            officer.email, officer.full_name,
                            field.replace("_"," ").title(),
                            val, unit_map[field], threshold,
                        ))

    except Exception as e:
        logger.error("Threshold alert check failed: {}", e)
    finally:
        db.close()


@shared_task(name="cleanup_old_chat_sessions")
def cleanup_old_chat_sessions_task():
    """Delete chat history older than 90 days to keep DB lean."""
    from app.models.user import ChatHistory
    from sqlalchemy import delete

    db = _sync_db()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=90)
        result = db.execute(
            delete(ChatHistory).where(ChatHistory.created_at < cutoff)
        )
        db.commit()
        logger.info("Cleaned {} old chat messages", result.rowcount)
    except Exception as e:
        logger.error("Chat cleanup failed: {}", e)
        db.rollback()
    finally:
        db.close()
