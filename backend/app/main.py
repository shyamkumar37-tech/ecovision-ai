"""
app/main.py — Production FastAPI with full security, monitoring, observability
"""
import sentry_sdk
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

try:
    import prometheus_fastapi_instrumentator.routing as pfi_routing
    _orig_get_route_name = pfi_routing._get_route_name
    def _safe_get_route_name(scope, routes):
        clean_routes = [r for r in routes if hasattr(r, "path")]
        return _orig_get_route_name(scope, clean_routes)
    pfi_routing._get_route_name = _safe_get_route_name
except Exception:
    pass
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from app.core.config import settings
from app.core.database import create_tables
from app.middleware.security import (
    RequestIDMiddleware, RequestLoggingMiddleware,
    RequestSizeLimitMiddleware, SecurityHeadersMiddleware,
)
from app.api.routes.auth import router as auth_router
from app.api.routes.routes import (
    carbon_router, chat_router, dashboard_router,
    docs_router, reports_router, waste_router,
)

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)
logger = structlog.get_logger()

if settings.SENTRY_DSN and settings.ENVIRONMENT == "production":
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.2, environment=settings.ENVIRONMENT)

limiter = Limiter(key_func=get_remote_address, storage_uri=settings.REDIS_URL, default_limits=["200/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup", env=settings.ENVIRONMENT, version=settings.APP_VERSION)
    if settings.ENVIRONMENT == "development":
        await create_tables()
    yield
    logger.info("shutdown")

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME, version=settings.APP_VERSION,
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
        lifespan=lifespan,
    )
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RequestSizeLimitMiddleware, max_size_mb=settings.MAX_UPLOAD_SIZE_MB)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET","POST","PUT","DELETE","OPTIONS"],
        allow_headers=["Authorization","Content-Type","X-Request-ID"],
        expose_headers=["X-Request-ID"],
        max_age=600,
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    for prefix in ["/api/v1", "/api"]:
        app.include_router(auth_router,      prefix=prefix)
        app.include_router(dashboard_router, prefix=prefix)
        app.include_router(carbon_router,    prefix=prefix)
        app.include_router(waste_router,     prefix=prefix)
        app.include_router(docs_router,      prefix=prefix)
        app.include_router(chat_router,      prefix=prefix)
        app.include_router(reports_router,   prefix=prefix)

    @app.get("/health", include_in_schema=False)
    async def health():
        return {"status": "ok", "version": settings.APP_VERSION}

    @app.get("/ready", include_in_schema=False)
    async def ready():
        import redis as r_lib
        from sqlalchemy import text
        from app.core.database import async_session_factory
        checks = {"database": False, "redis": False}
        try:
            async with async_session_factory() as s:
                await s.execute(text("SELECT 1"))
            checks["database"] = True
        except Exception: pass
        try:
            r_lib.from_url(settings.REDIS_URL).ping()
            checks["redis"] = True
        except Exception: pass
        ok = all(checks.values())
        return JSONResponse(status_code=200 if ok else 503, content={"status": "ready" if ok else "degraded", "checks": checks})

    Instrumentator(should_group_status_codes=True, excluded_handlers=["/health","/ready","/metrics"]).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

    @app.exception_handler(Exception)
    async def generic_handler(request: Request, exc: Exception):
        logger.error("unhandled", error=str(exc), path=request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    return app

app = create_app()
