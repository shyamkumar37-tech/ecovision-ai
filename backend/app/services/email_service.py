"""
app/services/email_service.py
──────────────────────────────
Async email sending via SMTP (Resend / SendGrid / AWS SES).
Used for:
  - Welcome emails on registration
  - Energy threshold alerts
  - Weekly sustainability digest
  - Report ready notifications
  - Password reset (future)
"""

from __future__ import annotations

import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from loguru import logger

from app.core.config import settings


# ── HTML email templates ──────────────────────────────────────────

_BASE = """
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body {{ margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',sans-serif }}
  .wrap {{ max-width:560px;margin:0 auto;padding:24px 16px }}
  .card {{ background:#fff;border-radius:16px;padding:32px;border:1px solid #bbf7d0 }}
  .logo {{ display:flex;align-items:center;gap:10px;margin-bottom:24px }}
  .logo-ico {{ width:36px;height:36px;background:linear-gradient(135deg,#22c55e,#14b8a6);border-radius:9px }}
  .logo-txt {{ font-weight:700;font-size:16px;color:#166534 }}
  h2 {{ color:#166534;font-size:20px;margin:0 0 12px }}
  p {{ color:#334155;font-size:14px;line-height:1.6;margin:0 0 12px }}
  .metric {{ display:flex;justify-content:space-between;padding:10px 14px;background:#f0fdf4;border-radius:10px;margin:6px 0 }}
  .metric-label {{ color:#5f8860;font-size:13px }}
  .metric-val {{ color:#166534;font-weight:700;font-size:13px }}
  .btn {{ display:inline-block;padding:12px 24px;background:#22c55e;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;margin-top:16px }}
  .sdg {{ display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;margin:2px }}
  .sdg-13 {{ background:rgba(20,184,166,.12);color:#0d9488;border:1px solid rgba(20,184,166,.25) }}
  .footer {{ margin-top:20px;text-align:center;font-size:11px;color:#94a3b8 }}
  .divider {{ border:none;border-top:1px solid #dcfce7;margin:18px 0 }}
</style>
</head>
<body>
<div class="wrap">
  <div class="logo">
    <div class="logo-ico"></div>
    <span class="logo-txt">EcoVision AI</span>
  </div>
  <div class="card">
    {content}
  </div>
  <div class="footer">
    EcoVision AI · Smart Campus Sustainability Platform<br>
    SDG 7 · SDG 11 · SDG 12 · SDG 13<br>
    <a href="#" style="color:#94a3b8">Unsubscribe</a>
  </div>
</div>
</body>
</html>
"""


def _welcome(name: str, role: str) -> str:
    return _BASE.format(content=f"""
<h2>Welcome to EcoVision AI, {name}! 🌿</h2>
<p>Your account has been created as <strong>{role.replace('_',' ').title()}</strong>.
You can now track campus sustainability metrics, calculate carbon footprint,
and get AI-powered recommendations aligned with the UN SDGs.</p>
<hr class="divider">
<p><strong>What you can do:</strong></p>
<p>📊 Monitor energy, water, waste, and carbon metrics<br>
🤖 Chat with IBM Granite AI for actionable insights<br>
📄 Upload sustainability documents for RAG-powered Q&A<br>
📈 Generate PDF reports with SDG alignment scores</p>
<a href="{settings.ALLOWED_ORIGINS[0] if settings.ALLOWED_ORIGINS else '#'}" class="btn">Open Dashboard</a>
""")


def _alert(name: str, metric: str, value: float, unit: str, threshold: float) -> str:
    pct = round((value / threshold - 1) * 100, 1)
    return _BASE.format(content=f"""
<h2>⚠️ Sustainability Alert</h2>
<p>Hi {name}, your campus <strong>{metric}</strong> has exceeded the monthly threshold.</p>
<div class="metric"><span class="metric-label">{metric}</span><span class="metric-val">{value:,.1f} {unit}</span></div>
<div class="metric"><span class="metric-label">Threshold</span><span class="metric-val">{threshold:,.1f} {unit}</span></div>
<div class="metric"><span class="metric-label">Overage</span><span class="metric-val" style="color:#ef4444">+{pct}%</span></div>
<p style="margin-top:14px">Recommended action: Review your energy dashboard and identify high-consumption zones.
The AI assistant can suggest immediate interventions.</p>
<a href="{settings.ALLOWED_ORIGINS[0] if settings.ALLOWED_ORIGINS else '#'}/analytics" class="btn">View Analytics</a>
""")


def _weekly_digest(name: str, score: float, energy: float, carbon: float, tip: str) -> str:
    return _BASE.format(content=f"""
<h2>🌱 Your Weekly Sustainability Digest</h2>
<p>Hi {name}, here's your campus sustainability summary for this week.</p>
<div class="metric"><span class="metric-label">Composite Score</span><span class="metric-val">{score}/100</span></div>
<div class="metric"><span class="metric-label">Energy (kWh)</span><span class="metric-val">{energy:,.0f}</span></div>
<div class="metric"><span class="metric-label">Carbon (kg CO₂)</span><span class="metric-val">{carbon:,.0f}</span></div>
<hr class="divider">
<p><strong>🤖 AI Sustainability Tip of the Week:</strong></p>
<p style="font-style:italic;color:#166534">{tip}</p>
<p><span class="sdg sdg-13">SDG 13: Climate Action</span></p>
<a href="{settings.ALLOWED_ORIGINS[0] if settings.ALLOWED_ORIGINS else '#'}" class="btn">Open Dashboard</a>
""")


def _report_ready(name: str, title: str, download_url: str) -> str:
    return _BASE.format(content=f"""
<h2>📊 Your Report is Ready</h2>
<p>Hi {name}, your sustainability report <strong>"{title}"</strong> has been generated and is ready to download.</p>
<p>The report includes energy metrics, water consumption, waste analysis, carbon footprint,
and SDG alignment scores with AI-generated insights.</p>
<a href="{download_url}" class="btn">Download PDF Report</a>
""")


# ── SMTP send ─────────────────────────────────────────────────────

async def send_email(
    to: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
) -> bool:
    """
    Send an email via SMTP. Returns True on success, False on failure.
    Non-blocking — runs in a thread pool.
    """
    if not settings.SMTP_HOST:
        logger.debug("SMTP not configured — email suppressed to {}", to)
        return False

    def _send():
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = settings.EMAILS_FROM
        msg["To"]      = to
        if text:
            msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAILS_FROM, [to], msg.as_string())

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _send)
        logger.info("Email sent to {}: {}", to, subject)
        return True
    except Exception as e:
        logger.error("Email failed to {}: {}", to, e)
        return False


# ── Convenience senders ───────────────────────────────────────────

async def send_welcome(to: str, name: str, role: str) -> bool:
    return await send_email(to, "Welcome to EcoVision AI 🌿", _welcome(name, role))


async def send_threshold_alert(to: str, name: str, metric: str, value: float, unit: str, threshold: float) -> bool:
    return await send_email(to, f"⚠️ EcoVision Alert: {metric} threshold exceeded", _alert(name, metric, value, unit, threshold))


async def send_weekly_digest(to: str, name: str, score: float, energy: float, carbon: float, tip: str) -> bool:
    return await send_email(to, "🌱 Your Weekly Sustainability Digest", _weekly_digest(name, score, energy, carbon, tip))


async def send_report_ready(to: str, name: str, title: str, download_url: str) -> bool:
    return await send_email(to, f"📊 Report Ready: {title}", _report_ready(name, title, download_url))
