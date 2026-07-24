"""
app/schemas/  ── All Pydantic v2 request / response schemas.
──────────────
Organised by domain: auth, metrics, carbon, waste, documents, chat, reports.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models.user import ChatRole, DocumentStatus, InstitutionType, UserRole


# ── Shared helpers ────────────────────────────────────────────────────────────

class OrmBase(BaseModel):
    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════════════════════════

class InstitutionCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    location: str = Field(..., min_length=2, max_length=255)
    type: InstitutionType


class InstitutionOut(OrmBase):
    id: str
    name: str
    location: str
    type: InstitutionType
    created_at: datetime


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: UserRole = UserRole.student
    institution_id: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(OrmBase):
    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    institution_id: str
    created_at: datetime


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

class KPISummary(BaseModel):
    energy_kwh: float
    water_liters: float
    waste_kg: float
    carbon_kg: float
    sustainability_score: float
    trend: str                        # "improved" | "declined" | "stable"
    score_delta: float                # vs previous month


class SDGScore(BaseModel):
    sdg_7_energy: float
    sdg_11_urban: float
    sdg_12_consumption: float
    sdg_13_climate: float


class MonthlyDataPoint(BaseModel):
    month: str                        # e.g. "2025-01"
    energy_kwh: float
    water_liters: float
    waste_kg: float
    carbon_kg: float
    sustainability_score: float


class TrendsResponse(BaseModel):
    data_points: List[MonthlyDataPoint]
    sdg_scores: SDGScore


# ══════════════════════════════════════════════════════════════════════════════
# CARBON CALCULATOR
# ══════════════════════════════════════════════════════════════════════════════

class CarbonCalculateRequest(BaseModel):
    electricity_kwh: float = Field(..., ge=0)
    water_liters: float = Field(..., ge=0)
    transport_km: float = Field(..., ge=0)
    paper_kg: float = Field(..., ge=0)


class CarbonBreakdown(BaseModel):
    electricity_co2: float
    water_co2: float
    transport_co2: float
    paper_co2: float


class CarbonCalculateResponse(BaseModel):
    total_carbon_kg: float
    breakdown: CarbonBreakdown
    recommendations: List[str]
    sdg_tags: List[str]
    annual_projection_kg: float
    potential_savings_kg: float       # if all tips followed


class CarbonReportOut(OrmBase):
    id: str
    electricity_kwh: float
    water_liters: float
    transport_km: float
    paper_kg: float
    total_carbon_kg: float
    recommendations: List[str]
    created_at: datetime


# ══════════════════════════════════════════════════════════════════════════════
# WASTE ADVISOR
# ══════════════════════════════════════════════════════════════════════════════

class WasteAnalyzeRequest(BaseModel):
    plastic_kg: float = Field(..., ge=0)
    paper_kg: float = Field(..., ge=0)
    food_kg: float = Field(..., ge=0)
    ewaste_kg: float = Field(..., ge=0)


class WasteCategory(BaseModel):
    category: str
    weight_kg: float
    percentage: float
    disposal_method: str
    recycling_potential: str          # "high" | "medium" | "low"


class WasteAnalyzeResponse(BaseModel):
    total_waste_kg: float
    categories: List[WasteCategory]
    ai_recommendations: List[str]
    sustainability_impact_score: float
    sdg_tags: List[str]


class WasteRecordOut(OrmBase):
    id: str
    plastic_kg: float
    paper_kg: float
    food_kg: float
    ewaste_kg: float
    ai_recommendations: List[str]
    disposal_methods: Dict[str, Any]
    created_at: datetime


# ══════════════════════════════════════════════════════════════════════════════
# DOCUMENTS (RAG)
# ══════════════════════════════════════════════════════════════════════════════

class DocumentOut(OrmBase):
    id: str
    filename: str
    mime_type: str
    file_size: int
    status: DocumentStatus
    chunk_count: Optional[int]
    created_at: datetime


# ══════════════════════════════════════════════════════════════════════════════
# CHAT
# ══════════════════════════════════════════════════════════════════════════════

class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: str = Field(..., min_length=1, max_length=100)


class ChatSource(BaseModel):
    filename: str
    page: Optional[int]
    chunk_text: str                   # brief excerpt


class ChatMessageResponse(BaseModel):
    """Used for non-streaming responses and history."""
    id: str
    role: ChatRole
    message: str
    sources_used: List[ChatSource]
    sdg_tags: List[str]
    created_at: datetime


class ChatHistoryOut(OrmBase):
    id: str
    session_id: str
    role: ChatRole
    message: str
    sources_used: List[Any]
    created_at: datetime


# ══════════════════════════════════════════════════════════════════════════════
# REPORTS
# ══════════════════════════════════════════════════════════════════════════════

class ReportGenerateRequest(BaseModel):
    title: str = Field(default="Sustainability Report")
    start_month: int = Field(..., ge=1, le=12)
    start_year: int = Field(..., ge=2020)
    end_month: int = Field(..., ge=1, le=12)
    end_year: int = Field(..., ge=2020)
    include_ai_insights: bool = True
    include_sdg_alignment: bool = True

    @model_validator(mode="after")
    def check_date_range(self) -> "ReportGenerateRequest":
        start = self.start_year * 12 + self.start_month
        end   = self.end_year   * 12 + self.end_month
        if end < start:
            raise ValueError("end date must be after start date")
        return self


class ReportOut(BaseModel):
    id: str
    status: str                       # "queued" | "generating" | "ready" | "failed"
    title: str
    download_url: Optional[str]
    created_at: datetime


# ══════════════════════════════════════════════════════════════════════════════
# METRICS (input)
# ══════════════════════════════════════════════════════════════════════════════

class MetricUpsertRequest(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020)
    energy_kwh: float = Field(..., ge=0)
    water_liters: float = Field(..., ge=0)
    waste_kg: float = Field(..., ge=0)
    carbon_kg: float = Field(..., ge=0)


class MetricOut(OrmBase):
    id: str
    institution_id: str
    month: int
    year: int
    energy_kwh: float
    water_liters: float
    waste_kg: float
    carbon_kg: float
    created_at: datetime
