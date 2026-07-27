"""
app/api/routes/dashboard.py  +  carbon.py  +  waste.py
chat.py  +  documents.py  +  reports.py
─────────────────────────────────────────────────────
All route handlers in a single file for concise delivery.
In production, split into individual files per domain.
"""

# ═══════════════════════════════════════════════════════════════════════════════
# dashboard.py
# ═══════════════════════════════════════════════════════════════════════════════

import json
import os
import uuid
from pathlib import Path
from typing import List

import redis as redis_lib
from fastapi import (
    APIRouter, Depends, File, HTTPException,
    Request, UploadFile, status,
)
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import (
    get_current_user, get_db,
    require_faculty_or_above,
)
from app.models.user import (
    CarbonReport, ChatHistory, ChatRole,
    Document, DocumentStatus,
    SustainabilityMetric, User, WasteRecord,
)
from app.schemas.schemas import (
    CarbonCalculateRequest, CarbonCalculateResponse, CarbonBreakdown, CarbonReportOut,
    ChatHistoryOut, ChatMessageRequest, ChatSource,
    DocumentOut,
    KPISummary, MetricOut, MetricUpsertRequest,
    MonthlyDataPoint, ReportGenerateRequest, ReportOut,
    SDGScore, TrendsResponse,
    WasteAnalyzeRequest, WasteAnalyzeResponse, WasteCategory as WasteCatSchema,
    WasteRecordOut,
)
from app.services.carbon_service import calculate_carbon
from app.services.report_task import generate_sustainability_report
from app.services.sustainability_score import calculate_score
from app.services.waste_service import analyze_waste


def _get_redis():
    try:
        return redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@dashboard_router.get("/metrics", response_model=KPISummary)
async def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """KPI cards — latest month vs previous month for the user's institution."""
    result = await db.execute(
        select(SustainabilityMetric)
        .where(SustainabilityMetric.institution_id == current_user.institution_id)
        .order_by(desc(SustainabilityMetric.year), desc(SustainabilityMetric.month))
        .limit(2)
    )
    rows = result.scalars().all()

    if not rows:
        return KPISummary(
            energy_kwh=0, water_liters=0, waste_kg=0, carbon_kg=0,
            sustainability_score=0, trend="stable", score_delta=0,
        )

    latest   = rows[0]
    previous = rows[1] if len(rows) > 1 else None

    score = calculate_score(
        latest.energy_kwh, latest.water_liters, latest.waste_kg, latest.carbon_kg,
        prev_composite=calculate_score(
            previous.energy_kwh, previous.water_liters,
            previous.waste_kg,   previous.carbon_kg,
        ).composite if previous else None,
    )

    return KPISummary(
        energy_kwh          = latest.energy_kwh,
        water_liters        = latest.water_liters,
        waste_kg            = latest.waste_kg,
        carbon_kg           = latest.carbon_kg,
        sustainability_score= score.composite,
        trend               = score.trend,
        score_delta         = score.score_delta,
    )


@dashboard_router.get("/trends", response_model=TrendsResponse)
async def get_dashboard_trends(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Last 6 months of metric data for charts."""
    result = await db.execute(
        select(SustainabilityMetric)
        .where(SustainabilityMetric.institution_id == current_user.institution_id)
        .order_by(SustainabilityMetric.year, SustainabilityMetric.month)
        .limit(6)
    )
    rows = result.scalars().all()

    data_points = [
        MonthlyDataPoint(
            month               = f"{r.year}-{r.month:02d}",
            energy_kwh          = r.energy_kwh,
            water_liters        = r.water_liters,
            waste_kg            = r.waste_kg,
            carbon_kg           = r.carbon_kg,
            sustainability_score= calculate_score(
                r.energy_kwh, r.water_liters, r.waste_kg, r.carbon_kg
            ).composite,
        )
        for r in rows
    ]

    last = rows[-1] if rows else None
    sdg = calculate_score(
        last.energy_kwh, last.water_liters, last.waste_kg, last.carbon_kg
    ) if last else calculate_score(0, 0, 0, 0)

    return TrendsResponse(
        data_points = data_points,
        sdg_scores  = SDGScore(
            sdg_7_energy      = sdg.sdg_7_score,
            sdg_11_urban      = sdg.sdg_11_score,
            sdg_12_consumption= sdg.sdg_12_score,
            sdg_13_climate    = sdg.sdg_13_score,
        ),
    )


@dashboard_router.post("/metrics", response_model=MetricOut, status_code=201)
async def upsert_metric(
    body: MetricUpsertRequest,
    current_user: User = Depends(require_faculty_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """Insert or update a monthly metric record (faculty+ only)."""
    result = await db.execute(
        select(SustainabilityMetric).where(
            SustainabilityMetric.institution_id == current_user.institution_id,
            SustainabilityMetric.month == body.month,
            SustainabilityMetric.year  == body.year,
        )
    )
    metric = result.scalar_one_or_none()

    if metric:
        metric.energy_kwh   = body.energy_kwh
        metric.water_liters = body.water_liters
        metric.waste_kg     = body.waste_kg
        metric.carbon_kg    = body.carbon_kg
    else:
        metric = SustainabilityMetric(
            institution_id = current_user.institution_id, **body.model_dump()
        )
        db.add(metric)

    await db.flush()
    await db.refresh(metric)
    return metric


# ─────────────────────────────────────────────────────────────────────────────
# CARBON CALCULATOR
# ─────────────────────────────────────────────────────────────────────────────

carbon_router = APIRouter(prefix="/carbon", tags=["Carbon Calculator"])


@carbon_router.post("/calculate", response_model=CarbonCalculateResponse)
async def carbon_calculate(
    body: CarbonCalculateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = calculate_carbon(
        body.electricity_kwh, body.water_liters, body.transport_km, body.paper_kg
    )

    # Persist to DB
    report = CarbonReport(
        user_id         = current_user.id,
        electricity_kwh = body.electricity_kwh,
        water_liters    = body.water_liters,
        transport_km    = body.transport_km,
        paper_kg        = body.paper_kg,
        total_carbon_kg = result.total_carbon_kg,
        recommendations = result.recommendations,
    )
    db.add(report)

    return CarbonCalculateResponse(
        total_carbon_kg    = result.total_carbon_kg,
        breakdown          = CarbonBreakdown(
            electricity_co2 = result.electricity_co2,
            water_co2       = result.water_co2,
            transport_co2   = result.transport_co2,
            paper_co2       = result.paper_co2,
        ),
        recommendations    = result.recommendations,
        sdg_tags           = result.sdg_tags,
        annual_projection_kg = result.annual_projection,
        potential_savings_kg = result.potential_savings,
    )


@carbon_router.get("/history", response_model=List[CarbonReportOut])
async def carbon_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CarbonReport)
        .where(CarbonReport.user_id == current_user.id)
        .order_by(desc(CarbonReport.created_at))
        .limit(20)
    )
    return result.scalars().all()


# ─────────────────────────────────────────────────────────────────────────────
# WASTE ADVISOR
# ─────────────────────────────────────────────────────────────────────────────

waste_router = APIRouter(prefix="/waste", tags=["Waste Advisor"])


@waste_router.post("/analyze", response_model=WasteAnalyzeResponse)
async def waste_analyze(
    body: WasteAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = analyze_waste(
        body.plastic_kg, body.paper_kg, body.food_kg, body.ewaste_kg
    )

    record = WasteRecord(
        user_id            = current_user.id,
        plastic_kg         = body.plastic_kg,
        paper_kg           = body.paper_kg,
        food_kg            = body.food_kg,
        ewaste_kg          = body.ewaste_kg,
        ai_recommendations = result.ai_recommendations,
        disposal_methods   = result.disposal_methods,
    )
    db.add(record)

    return WasteAnalyzeResponse(
        total_waste_kg           = result.total_waste_kg,
        categories               = [
            WasteCatSchema(
                category            = c.category,
                weight_kg           = c.weight_kg,
                percentage          = c.percentage,
                disposal_method     = c.disposal_method,
                recycling_potential = c.recycling_potential,
            )
            for c in result.categories
        ],
        ai_recommendations       = result.ai_recommendations,
        sustainability_impact_score = result.sustainability_impact,
        sdg_tags                 = result.sdg_tags,
    )


@waste_router.get("/history", response_model=List[WasteRecordOut])
async def waste_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WasteRecord)
        .where(WasteRecord.user_id == current_user.id)
        .order_by(desc(WasteRecord.created_at))
        .limit(20)
    )
    return result.scalars().all()


# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENTS (RAG)
# ─────────────────────────────────────────────────────────────────────────────

docs_router = APIRouter(prefix="/documents", tags=["Document Intelligence"])


@docs_router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(require_faculty_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """Upload a PDF/DOCX/TXT and trigger async RAG indexing."""
    # Validate MIME type
    if file.content_type not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported file type")

    # Validate file size
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit")

    # Save file
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(exist_ok=True)
    file_id   = str(uuid.uuid4())
    safe_name = f"{file_id}_{file.filename}"
    file_path = upload_dir / safe_name
    file_path.write_bytes(content)

    # Create DB record
    doc = Document(
        user_id   = current_user.id,
        filename  = file.filename,
        file_path = str(file_path),
        mime_type = file.content_type,
        file_size = len(content),
        status    = DocumentStatus.processing,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)

    # Trigger Celery indexing task
    from app.services.document_task import index_document_task
    index_document_task.delay(
        doc.id, str(file_path), file.filename,
        file.content_type, current_user.institution_id,
    )

    return doc


@docs_router.get("", response_model=List[DocumentOut])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(desc(Document.created_at))
    )
    return result.scalars().all()


@docs_router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove vectors from ChromaDB
    from app.ai.rag_pipeline import delete_document_chunks
    delete_document_chunks(doc_id)

    # Remove file from disk
    Path(doc.file_path).unlink(missing_ok=True)
    await db.delete(doc)


# ─────────────────────────────────────────────────────────────────────────────
# CHAT (streaming)
# ─────────────────────────────────────────────────────────────────────────────

chat_router = APIRouter(prefix="/chat", tags=["AI Chat"])


@chat_router.post("/message")
async def chat_message(
    body: ChatMessageRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Streaming RAG chat endpoint.
    Returns a StreamingResponse with token-by-token text.
    Metadata (sources + SDG tags) appended as sentinel lines at the end.
    """
    r = _get_redis()

    # Persist user message
    user_msg = ChatHistory(
        user_id    = current_user.id,
        session_id = body.session_id,
        role       = ChatRole.user,
        message    = body.message,
    )
    db.add(user_msg)
    await db.flush()

    def _generate():
        from app.ai.rag_pipeline import query_rag
        result = query_rag(body.message, current_user.institution_id, r)
        yield result["answer"]
        yield f"\n\n__SOURCES__:{json.dumps(result['sources'])}"
        yield f"\n__SDGS__:{json.dumps(result['sdg_tags'])}"

    return StreamingResponse(_generate(), media_type="text/plain")


@chat_router.get("/history", response_model=List[ChatHistoryOut])
async def chat_history(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatHistory)
        .where(
            ChatHistory.user_id    == current_user.id,
            ChatHistory.session_id == session_id,
        )
        .order_by(ChatHistory.created_at)
        .limit(100)
    )
    return result.scalars().all()


# ─────────────────────────────────────────────────────────────────────────────
# REPORTS
# ─────────────────────────────────────────────────────────────────────────────

reports_router = APIRouter(prefix="/reports", tags=["Reports"])


@reports_router.post("/generate", response_model=ReportOut, status_code=202)
async def generate_report(
    body: ReportGenerateRequest,
    current_user: User = Depends(require_faculty_or_above()),
    db: AsyncSession = Depends(get_db),
):
    """Enqueue a Celery PDF generation task. Returns task_id immediately."""
    # Fetch metrics for the requested period
    result = await db.execute(
        select(SustainabilityMetric)
        .where(SustainabilityMetric.institution_id == current_user.institution_id)
        .order_by(SustainabilityMetric.year, SustainabilityMetric.month)
    )
    metrics = [
        {
            "month": m.month, "year": m.year,
            "energy_kwh": m.energy_kwh, "water_liters": m.water_liters,
            "waste_kg": m.waste_kg,      "carbon_kg": m.carbon_kg,
        }
        for m in result.scalars().all()
    ]

    task_id = str(uuid.uuid4())

    generate_sustainability_report.delay(
        task_id          = task_id,
        institution_id   = current_user.institution_id,
        institution_name = current_user.institution_id,  # replace with inst.name in prod
        title            = body.title,
        start_month      = body.start_month,
        start_year       = body.start_year,
        end_month        = body.end_month,
        end_year         = body.end_year,
        metrics          = metrics,
        include_ai       = body.include_ai_insights,
    )

    from datetime import datetime, timezone
    return ReportOut(
        id           = task_id,
        status       = "queued",
        title        = body.title,
        download_url = None,
        created_at   = datetime.now(timezone.utc),
    )


@reports_router.get("/{task_id}", response_model=ReportOut)
async def get_report_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """Poll report generation status."""
    from datetime import datetime, timezone
    r = _get_redis()
    if not r:
        raise HTTPException(status_code=503, detail="Cache unavailable")

    raw = r.get(f"report:{task_id}")
    if not raw:
        raise HTTPException(status_code=404, detail="Report not found")

    data = json.loads(raw)
    download_url = None
    if data["status"] == "ready":
        download_url = f"/api/reports/{task_id}/download"

    return ReportOut(
        id           = task_id,
        status       = data["status"],
        title        = "Sustainability Report",
        download_url = download_url,
        created_at   = datetime.now(timezone.utc),
    )


@reports_router.get("/{task_id}/download")
async def download_report(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    r = _get_redis()
    raw = r.get(f"report:{task_id}") if r else None
    if not raw:
        raise HTTPException(status_code=404, detail="Report not found")

    data = json.loads(raw)
    if data["status"] != "ready":
        raise HTTPException(status_code=409, detail="Report not ready yet")

    path = Path(data["path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Report file missing")

    return FileResponse(
        path        = str(path),
        media_type  = "application/pdf",
        filename    = f"EcoVision_Report_{task_id[:8]}.pdf",
    )
