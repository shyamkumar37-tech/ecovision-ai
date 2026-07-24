"""
app/models/audit.py — Audit trail for all sensitive operations
──────────────────────────────────────────────────────────────
Records every create/update/delete/login event with user, IP,
action, and before/after snapshot for compliance and forensics.
"""
from datetime import datetime, timezone
from typing import Optional
import uuid
from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


def _uuid(): return str(uuid.uuid4())
def _now(): return datetime.now(timezone.utc)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id:          Mapped[str]           = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id:     Mapped[Optional[str]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action:      Mapped[str]           = mapped_column(String(100), nullable=False, index=True)
    resource:    Mapped[str]           = mapped_column(String(100), nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ip_address:  Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent:  Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    before:      Mapped[Optional[dict]]= mapped_column(JSON, nullable=True)
    after:       Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status:      Mapped[str]           = mapped_column(String(20), default="success")  # success | failure
    detail:      Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at:  Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=_now, index=True)
