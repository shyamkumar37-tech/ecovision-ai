"""
app/services/document_task.py
──────────────────────────────
Celery task that indexes an uploaded document into ChromaDB.
Updates the Document DB record with status + chunk count on completion.
"""

from __future__ import annotations

from celery import shared_task
from loguru import logger
from sqlalchemy import create_engine, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import Document, DocumentStatus


def _sync_session():
    """Synchronous SQLAlchemy session for Celery worker context."""
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
    engine = create_engine(sync_url, pool_pre_ping=True)
    return Session(engine)


@shared_task(bind=True, name="index_document_task", max_retries=3, default_retry_delay=30)
def index_document_task(
    self,
    document_id:    str,
    file_path:      str,
    filename:       str,
    mime_type:      str,
    institution_id: str,
) -> dict:
    """
    1. Extract text from file
    2. Split into chunks
    3. Embed + store in ChromaDB
    4. Update Document.status and Document.chunk_count in PostgreSQL
    """
    from app.ai.rag_pipeline import index_document
    logger.info("Indexing document {} ({})", filename, document_id)

    session = _sync_session()
    try:
        chunk_count = index_document(
            document_id    = document_id,
            file_path      = file_path,
            filename       = filename,
            mime_type      = mime_type,
            institution_id = institution_id,
        )

        session.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(status=DocumentStatus.ready, chunk_count=chunk_count)
        )
        session.commit()
        logger.info("Document {} indexed: {} chunks", document_id, chunk_count)
        return {"status": "ready", "chunks": chunk_count}

    except Exception as exc:
        logger.error("Indexing failed for {}: {}", document_id, exc)
        session.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(status=DocumentStatus.failed, error_msg=str(exc))
        )
        session.commit()
        raise self.retry(exc=exc)

    finally:
        session.close()
