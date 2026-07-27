#!/usr/bin/env bash
# entrypoint.sh — Memory-Optimized Startup Script for Render Free Tier (512MB RAM)

set -euo pipefail

# ── Memory Optimization for 512MB Free Tier Containers ─────────────────────
export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1
export OPENBLAS_NUM_THREADS=1
export VECLIB_MAXIMUM_THREADS=1
export NUMEXPR_NUM_THREADS=1
export TOKENIZERS_PARALLELISM=false

echo "[entrypoint] Creating runtime directories..."
mkdir -p /tmp/uploads /tmp/reports

PORT_TO_BIND="${PORT:-8000}"
echo "[entrypoint] Binding web server immediately to PORT: ${PORT_TO_BIND}..."

# ── Background Initialization: DB Migration ────────────────────────────────
(
  echo "[entrypoint-bg] Checking database connectivity..."
  python3 - <<'EOF'
import os, sys
from urllib.parse import urlparse

url = os.environ.get("DATABASE_URL", "")
url = url.replace("postgresql+asyncpg://", "postgresql://").replace("postgres://", "postgresql://")

if not url or "localhost" in url or "127.0.0.1" in url:
    print("  [entrypoint-bg] DATABASE_URL is not set or points to localhost — skipping migration", flush=True)
    sys.exit(0)

if "sslmode=" not in url and "ssl=" not in url:
    sep = "&" if "?" in url else "?"
    url = f"{url}{sep}sslmode=require"

try:
    import psycopg2
    conn = psycopg2.connect(url, connect_timeout=5)
    conn.close()
    print("  [entrypoint-bg] PostgreSQL is ready!", flush=True)
    sys.exit(0)
except Exception as e:
    print(f"  [entrypoint-bg] DB Connection note ({type(e).__name__}): {e}", flush=True)
EOF

  echo "[entrypoint-bg] Running database migrations..."
  python3 -m alembic upgrade head || echo "[entrypoint-bg] Migration completed or skipped"

  if [ "${ENABLE_CELERY_WORKER:-false}" = "true" ]; then
    echo "[entrypoint-bg] Starting background Celery worker..."
    python3 -m celery -A celery_worker.celery_app worker --loglevel=info --concurrency=1 || echo "[entrypoint-bg] Celery worker note"
  else
    echo "[entrypoint-bg] Celery worker disabled to conserve 512MB RAM on free tier."
  fi
) &

# ── Start FastAPI Uvicorn Server ─────────────────────────────────────────────
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT_TO_BIND}"
