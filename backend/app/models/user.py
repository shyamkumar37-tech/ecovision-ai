"""
app/models/  ── All ORM models in one file for clarity.
─────────────
7 tables:
  Institution · User · SustainabilityMetric · CarbonReport
  WasteRecord · Document · ChatHistory
"""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, Enum, Float, ForeignKey,
    Integer, JSON, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())

def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── Enumerations ──────────────────────────────────────────────────────────────

class InstitutionType(str, PyEnum):
    university = "university"
    college    = "college"
    institute  = "institute"


class UserRole(str, PyEnum):
    student                = "student"
    faculty                = "faculty"
    sustainability_officer = "sustainability_officer"
    admin                  = "admin"


class DocumentStatus(str, PyEnum):
    processing = "processing"
    ready      = "ready"
    failed     = "failed"


class ChatRole(str, PyEnum):
    user      = "user"
    assistant = "assistant"


# ── 1. Institution ─────────────────────────────────────────────────────────────

class Institution(Base):
    __tablename__ = "institutions"

    id:       Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    name:     Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    type:     Mapped[InstitutionType] = mapped_column(
        Enum(InstitutionType, name="institution_type", create_type=False), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    # relationships
    users:   Mapped[list["User"]]                = relationship(back_populates="institution")
    metrics: Mapped[list["SustainabilityMetric"]] = relationship(back_populates="institution")


# ── 2. User ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id:              Mapped[str]      = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    email:           Mapped[str]      = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str]      = mapped_column(String(255), nullable=False)
    full_name:       Mapped[str]      = mapped_column(String(255), nullable=False)
    role:            Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role", create_type=False), nullable=False)
    is_active:       Mapped[bool]     = mapped_column(Boolean, default=True)
    institution_id:  Mapped[str]      = mapped_column(ForeignKey("institutions.id"), nullable=False)
    created_at:      Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at:      Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    institution:    Mapped["Institution"]        = relationship(back_populates="users")
    carbon_reports: Mapped[list["CarbonReport"]] = relationship(back_populates="user")
    waste_records:  Mapped[list["WasteRecord"]]  = relationship(back_populates="user")
    documents:      Mapped[list["Document"]]     = relationship(back_populates="user")
    chat_history:   Mapped[list["ChatHistory"]]  = relationship(back_populates="user")


# ── 3. SustainabilityMetric ───────────────────────────────────────────────────

class SustainabilityMetric(Base):
    __tablename__ = "sustainability_metrics"
    __table_args__ = (
        UniqueConstraint("institution_id", "month", "year", name="uq_metric_period"),
    )

    id:             Mapped[str]   = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    institution_id: Mapped[str]   = mapped_column(ForeignKey("institutions.id"), nullable=False, index=True)
    month:          Mapped[int]   = mapped_column(Integer, nullable=False)   # 1–12
    year:           Mapped[int]   = mapped_column(Integer, nullable=False)
    energy_kwh:     Mapped[float] = mapped_column(Float, default=0.0)
    water_liters:   Mapped[float] = mapped_column(Float, default=0.0)
    waste_kg:       Mapped[float] = mapped_column(Float, default=0.0)
    carbon_kg:      Mapped[float] = mapped_column(Float, default=0.0)
    created_at:     Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at:     Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    institution: Mapped["Institution"] = relationship(back_populates="metrics")


# ── 4. CarbonReport ───────────────────────────────────────────────────────────

class CarbonReport(Base):
    __tablename__ = "carbon_reports"

    id:               Mapped[str]   = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id:          Mapped[str]   = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    electricity_kwh:  Mapped[float] = mapped_column(Float, nullable=False)
    water_liters:     Mapped[float] = mapped_column(Float, nullable=False)
    transport_km:     Mapped[float] = mapped_column(Float, nullable=False)
    paper_kg:         Mapped[float] = mapped_column(Float, nullable=False)
    total_carbon_kg:  Mapped[float] = mapped_column(Float, nullable=False)
    recommendations:  Mapped[dict]  = mapped_column(JSON, default=list)  # list[str]
    created_at:       Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship(back_populates="carbon_reports")


# ── 5. WasteRecord ────────────────────────────────────────────────────────────

class WasteRecord(Base):
    __tablename__ = "waste_records"

    id:                  Mapped[str]   = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id:             Mapped[str]   = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    plastic_kg:          Mapped[float] = mapped_column(Float, nullable=False)
    paper_kg:            Mapped[float] = mapped_column(Float, nullable=False)
    food_kg:             Mapped[float] = mapped_column(Float, nullable=False)
    ewaste_kg:           Mapped[float] = mapped_column(Float, nullable=False)
    ai_recommendations:  Mapped[dict]  = mapped_column(JSON, default=list)
    disposal_methods:    Mapped[dict]  = mapped_column(JSON, default=dict)
    created_at:          Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship(back_populates="waste_records")


# ── 6. Document ───────────────────────────────────────────────────────────────

class Document(Base):
    __tablename__ = "documents"

    id:          Mapped[str]            = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id:     Mapped[str]            = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    filename:    Mapped[str]            = mapped_column(String(500), nullable=False)
    file_path:   Mapped[str]            = mapped_column(String(1000), nullable=False)
    mime_type:   Mapped[str]            = mapped_column(String(100), nullable=False)
    file_size:   Mapped[int]            = mapped_column(Integer, nullable=False)
    status:      Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="document_status", create_type=False), default=DocumentStatus.processing
    )
    chunk_count: Mapped[Optional[int]]  = mapped_column(Integer, nullable=True)
    error_msg:   Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    created_at:  Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=_now)
    updated_at:  Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship(back_populates="documents")


# ── 7. ChatHistory ────────────────────────────────────────────────────────────

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id:           Mapped[str]      = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id:      Mapped[str]      = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    session_id:   Mapped[str]      = mapped_column(String(100), nullable=False, index=True)
    role:         Mapped[ChatRole] = mapped_column(Enum(ChatRole, name="chat_role", create_type=False), nullable=False)
    message:      Mapped[str]      = mapped_column(Text, nullable=False)
    sources_used: Mapped[dict]     = mapped_column(JSON, default=list)  # list of source citations
    created_at:   Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship(back_populates="chat_history")
