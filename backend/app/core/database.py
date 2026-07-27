"""
app/core/database.py
────────────────────
Async SQLAlchemy 2.0 engine, session factory, and Base declarative class.
All models import Base from here to stay in one metadata registry.
"""

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


def _build_async_url(url: str) -> str:
    """
    Convert a sync postgresql:// URL to asyncpg dialect.
    Supabase & Render supply postgresql:// — asyncpg requires postgresql+asyncpg://.
    """
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    if "sslmode=require" in url or "sslmode=prefer" in url:
        url = url.replace("sslmode=require", "ssl=require").replace("sslmode=prefer", "ssl=require")
    elif "ssl=" not in url and not ("localhost" in url or "127.0.0.1" in url):
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}ssl=require"
    return url


engine: AsyncEngine = create_async_engine(
    _build_async_url(settings.DATABASE_URL),
    echo=settings.DEBUG,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,          # detects stale connections
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,      # safe for async — objects stay usable after commit
)


async def create_tables() -> None:
    """Create all tables — used in tests and first-run. Prefer Alembic in prod."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
