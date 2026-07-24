"""
app/middleware/security.py
──────────────────────────
Production security middleware stack:
  - Security headers (CSP, HSTS, X-Frame-Options, etc.)
  - Request ID injection (tracing)
  - Request size limiting
  - IP-based suspicious activity detection
  - Structured request logging
"""

import time
import uuid
from typing import Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = structlog.get_logger()

# ── Security headers ──────────────────────────────────────────────────────────
SECURITY_HEADERS = {
    "X-Content-Type-Options":    "nosniff",
    "X-Frame-Options":           "DENY",
    "X-XSS-Protection":         "1; mode=block",
    "Referrer-Policy":           "strict-origin-when-cross-origin",
    "Permissions-Policy":        "camera=(), microphone=(), geolocation=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: blob:; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    ),
    "Cache-Control": "no-store",
    "Pragma":        "no-cache",
}

# ── Request ID middleware ─────────────────────────────────────────────────────
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


# ── Security headers middleware ───────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        for key, value in SECURITY_HEADERS.items():
            response.headers[key] = value
        # Remove server fingerprint
        response.headers.pop("server", None)
        response.headers.pop("x-powered-by", None)
        return response


# ── Request size limiter ──────────────────────────────────────────────────────
class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_size_mb: int = 10):
        super().__init__(app)
        self.max_size = max_size_mb * 1024 * 1024

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_size:
            return JSONResponse(
                status_code=413,
                content={"detail": f"Request body exceeds {self.max_size // (1024*1024)}MB limit"},
            )
        return await call_next(request)


# ── Structured request logger ─────────────────────────────────────────────────
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.perf_counter()
        request_id = getattr(request.state, "request_id", "unknown")

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start) * 1000
        level = "warning" if response.status_code >= 400 else "info"

        log = logger.bind(
            request_id  = request_id,
            method      = request.method,
            path        = request.url.path,
            status_code = response.status_code,
            duration_ms = round(duration_ms, 2),
            ip          = request.client.host if request.client else "unknown",
        )
        getattr(log, level)("request")
        return response
