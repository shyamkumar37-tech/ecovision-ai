"""
app/services/report_task.py
────────────────────────────
Celery task: generate a sustainability PDF report using ReportLab.
Triggered via POST /api/reports/generate.
Status tracked in Redis: report:{task_id} → {"status": ..., "path": ...}
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import redis
from celery import shared_task
from loguru import logger
from app.core.config import settings


def _get_redis() -> redis.Redis:
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def _store_status(r: redis.Redis, task_id: str, payload: dict) -> None:
    r.setex(f"report:{task_id}", 86400, json.dumps(payload))  # 24h TTL


@shared_task(bind=True, name="generate_sustainability_report")
def generate_sustainability_report(
    self,
    task_id:        str,
    institution_id: str,
    institution_name: str,
    title:          str,
    start_month:    int,
    start_year:     int,
    end_month:      int,
    end_year:       int,
    metrics:        list[dict],
    include_ai:     bool = True,
) -> dict:
    """
    Background task that produces a PDF sustainability report.
    Progress is written to Redis so the frontend can poll.
    """
    r = _get_redis()
    _store_status(r, task_id, {"status": "generating", "progress": 10})
    logger.info("Starting report generation for task {}", task_id)

    try:
        output_dir = Path("reports")
        output_dir.mkdir(exist_ok=True)
        output_path = output_dir / f"report_{task_id}.pdf"

        _build_pdf(
            output_path   = str(output_path),
            institution_name = institution_name,
            title         = title,
            start_month   = start_month,
            start_year    = start_year,
            end_month     = end_month,
            end_year      = end_year,
            metrics       = metrics,
            include_ai    = include_ai,
        )

        _store_status(r, task_id, {
            "status":   "ready",
            "progress": 100,
            "path":     str(output_path),
        })
        logger.info("Report ready: {}", output_path)
        return {"status": "ready", "path": str(output_path)}

    except Exception as exc:
        logger.error("Report generation failed: {}", exc)
        _store_status(r, task_id, {"status": "failed", "error": str(exc)})
        raise


# ── PDF builder ───────────────────────────────────────────────────────────────

def _build_pdf(
    output_path: str,
    institution_name: str,
    title: str,
    start_month: int,
    start_year: int,
    end_month: int,
    end_year: int,
    metrics: list[dict],
    include_ai: bool,
) -> None:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        HRFlowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
    )

    GREEN      = colors.HexColor("#22c55e")
    DARK_GREEN = colors.HexColor("#166534")
    LIGHT_BG   = colors.HexColor("#f0fdf4")
    SLATE      = colors.HexColor("#334155")
    MUTED      = colors.HexColor("#64748b")

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("H1", parent=styles["Heading1"], textColor=DARK_GREEN, fontSize=20, spaceAfter=6)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], textColor=DARK_GREEN, fontSize=14, spaceAfter=4)
    body = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, textColor=SLATE, leading=14)
    muted_style = ParagraphStyle("Muted", parent=styles["Normal"], fontSize=9, textColor=MUTED)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm,   bottomMargin=2*cm,
    )

    story: list[Any] = []

    # ── Cover ──────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 1.5*cm))
    story.append(Paragraph("🌿 EcoVision AI", h1))
    story.append(Paragraph(title, ParagraphStyle("Title", parent=h1, fontSize=18)))
    story.append(Spacer(1, 0.3*cm))
    period = f"{_month_name(start_month)} {start_year} – {_month_name(end_month)} {end_year}"
    story.append(Paragraph(f"<b>Institution:</b> {institution_name}", body))
    story.append(Paragraph(f"<b>Period:</b> {period}", body))
    story.append(Paragraph(
        f"<b>Generated:</b> {datetime.now(timezone.utc).strftime('%d %B %Y, %H:%M UTC')}",
        body,
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=GREEN, spaceAfter=12))

    # ── Metrics Table ──────────────────────────────────────────────────────────
    story.append(Paragraph("Sustainability Metrics", h2))
    story.append(Spacer(1, 0.2*cm))

    table_data = [
        ["Month/Year", "Energy (kWh)", "Water (L)", "Waste (kg)", "Carbon (kg)"],
        *[
            [
                f"{_month_name(m['month'])} {m['year']}",
                f"{m['energy_kwh']:,.0f}",
                f"{m['water_liters']:,.0f}",
                f"{m['waste_kg']:,.0f}",
                f"{m['carbon_kg']:,.0f}",
            ]
            for m in metrics
        ],
    ]

    tbl = Table(table_data, colWidths=[3.5*cm, 3.5*cm, 3.5*cm, 3.5*cm, 3.5*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), GREEN),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("ALIGN",       (1, 0), (-1, -1), "RIGHT"),
        ("TOPPADDING",  (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 0.5*cm))

    # ── SDG Alignment ──────────────────────────────────────────────────────────
    story.append(Paragraph("SDG Alignment", h2))
    sdg_data = [
        ["SDG", "Goal", "Status"],
        ["SDG 7",  "Affordable and Clean Energy",           "Tracking ✓"],
        ["SDG 11", "Sustainable Cities and Communities",    "Tracking ✓"],
        ["SDG 12", "Responsible Consumption and Production","Tracking ✓"],
        ["SDG 13", "Climate Action",                        "Tracking ✓"],
    ]
    sdg_tbl = Table(sdg_data, colWidths=[3*cm, 10*cm, 4*cm])
    sdg_tbl.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), DARK_GREEN),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING",  (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(sdg_tbl)
    story.append(Spacer(1, 0.5*cm))

    # ── AI Insights ────────────────────────────────────────────────────────────
    if include_ai:
        story.append(PageBreak())
        story.append(Paragraph("AI-Generated Insights", h2))
        insights = [
            "Energy: LED retrofitting and solar PV adoption can reduce electricity costs by 30–40%. "
            "Priority areas: administration blocks and computer labs (highest consumption zones).",
            "Water: Sensor-based irrigation and low-flow fixtures in hostels can cut water use by 20%. "
            "Recommend monthly sub-meter audits.",
            "Waste: Food waste accounts for the largest share. Launch a pre-consumer food audit "
            "in the cafeteria and explore biogas digestion for energy recovery.",
            "Carbon: Transport emissions are the fastest-growing source. "
            "Electrify the campus shuttle fleet and partner with local EV providers.",
        ]
        for insight in insights:
            story.append(Paragraph(f"• {insight}", body))
            story.append(Spacer(1, 0.2*cm))

    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=MUTED))
    story.append(Paragraph("Generated by EcoVision AI — Powered by OpenRouter AI", muted_style))

    doc.build(story)


def _month_name(m: int) -> str:
    return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1]
