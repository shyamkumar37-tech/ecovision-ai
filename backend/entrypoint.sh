#!/usr/bin/env bash
# entrypoint.sh — Startup script for EcoVision AI backend
# Waits for PostgreSQL (Supabase) to be reachable, then runs Alembic migrations and starts web server.

set -euo pipefail


echo "[entrypoint] Creating runtime directories..."
mkdir -p /tmp/uploads /tmp/reports

# ── Debug: show DB host (password masked) ──────────────────────────────────
DB_HOST=$(python3 -c "
import os, sys
from urllib.parse import urlparse
url = os.environ.get('DATABASE_URL', 'NOT_SET')
parsed = urlparse(url)
print(parsed.hostname or 'localhost-default-NOT-INJECTED')
" 2>/dev/null || echo "parse-error")
echo "[entrypoint] DATABASE_URL host: ${DB_HOST}"

if [ "$DB_HOST" = "localhost-default-NOT-INJECTED" ] || [ "$DB_HOST" = "localhost" ] || [ "$DB_HOST" = "127.0.0.1" ]; then
  echo "[entrypoint] WARNING: DATABASE_URL points to localhost — check Render env var injection!"
  echo "[entrypoint] DATABASE_URL=${DATABASE_URL:-<not set>}"
fi

# ── Wait for PostgreSQL to accept connections ─────────────────────────────
echo "[entrypoint] Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_DELAY=3

for i in $(seq 1 $MAX_RETRIES); do
  if python3 - <<'EOF'
import os, sys
from urllib.parse import urlparse

url = os.environ.get("DATABASE_URL", "")
url = url.replace("postgresql+asyncpg://", "postgresql://").replace("postgres://", "postgresql://")

if not url or "localhost" in url or "127.0.0.1" in url:
    print(f"  DB URL appears to be localhost ({url[:40]}...) — skipping wait", flush=True)
    sys.exit(0)

if "sslmode=" not in url and "ssl=" not in url:
    sep = "&" if "?" in url else "?"
    url = f"{url}{sep}sslmode=require"

try:
    import psycopg2
    conn = psycopg2.connect(url, connect_timeout=5)
    conn.close()
    sys.exit(0)
except Exception as e:
    print(f"  Not ready ({type(e).__name__}): {e}", flush=True)
    sys.exit(1)
EOF
  then
    echo "[entrypoint] PostgreSQL is ready!"
    break
  fi

  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "[entrypoint] ERROR: PostgreSQL not reachable after ${MAX_RETRIES} attempts. Aborting."
    exit 1
  fi

  echo "[entrypoint] Attempt $i/$MAX_RETRIES — retrying in ${RETRY_DELAY}s..."
  sleep $RETRY_DELAY
done

# ── Run Alembic migrations & background Celery worker ─────────────────────────
echo "[entrypoint] Running database migrations..."
(python3 -m alembic upgrade head || echo "[entrypoint] Alembic migration warning: continuing with app startup") &

echo "[entrypoint] Starting background Celery worker..."
(python3 -m celery -A celery_worker.celery_app worker --loglevel=info --concurrency=1 || echo "[entrypoint] Celery startup warning") &

# ── Start the web server ────────────────────────────────────────────────────
echo "[entrypoint] Starting web server..."
PORT_TO_BIND="${PORT:-8000}"
echo "[entrypoint] Binding web server to PORT: ${PORT_TO_BIND}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT_TO_BIND}"
