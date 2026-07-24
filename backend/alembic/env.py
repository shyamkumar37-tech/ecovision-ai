"""
alembic/env.py
──────────────
Async-compatible Alembic migration environment.
Run:  alembic upgrade head
      alembic revision --autogenerate -m "description"
"""

import asyncio
from logging.config import fileConfig

from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

from app.core.config import settings
from app.core.database import Base

# Import all models so Alembic sees them in metadata
from app.models.user import (  # noqa: F401
    Institution, User, SustainabilityMetric,
    CarbonReport, WasteRecord, Document, ChatHistory,
)

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _async_url(url: str) -> str:
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    if "sslmode=require" in url:
        url = url.replace("sslmode=require", "ssl=require")
    return url


def run_migrations_offline() -> None:
    context.configure(
        url               = _async_url(settings.DATABASE_URL),
        target_metadata   = target_metadata,
        literal_binds     = True,
        dialect_opts      = {"paramstyle": "named"},
        compare_type      = True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection      = connection,
        target_metadata = target_metadata,
        compare_type    = True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    engine = create_async_engine(_async_url(settings.DATABASE_URL))
    async with engine.begin() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
