"""
app/models/notification.py — In-app + email notification system
"""
from datetime import datetime, timezone
from enum import Enum as PyEnum
import uuid
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


def _uuid(): return str(uuid.uuid4())
def _now(): return datetime.now(timezone.utc)


class NotificationType(str, PyEnum):
    alert        = "alert"        # threshold breach
    report_ready = "report_ready" # PDF generated
    doc_indexed  = "doc_indexed"  # RAG indexing complete
    tip          = "tip"          # weekly AI sustainability tip
    system       = "system"       # admin broadcast


class Notification(Base):
    __tablename__ = "notifications"

    id:         Mapped[str]                  = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id:    Mapped[str]                  = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type:       Mapped[NotificationType]     = mapped_column(Enum(NotificationType, name="notification_type"), nullable=False)
    title:      Mapped[str]                  = mapped_column(String(255), nullable=False)
    body:       Mapped[str]                  = mapped_column(Text, nullable=False)
    meta:       Mapped[dict]                 = mapped_column(JSON, default=dict)
    is_read:    Mapped[bool]                 = mapped_column(Boolean, default=False)
    email_sent: Mapped[bool]                 = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime]             = mapped_column(DateTime(timezone=True), default=_now, index=True)
