#!/usr/bin/env bash
# scripts/render-build.sh
# ─────────────────────────────────────────────────────────────────────────────
# Render pre-deploy build hook — runs DB migrations before the new instance
# starts serving traffic.
#
# Usage (set as "Build Command" in Render dashboard or use render.yaml):
#   bash scripts/render-build.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "==> Installing Python dependencies (CPU-only PyTorch to prevent 512MB RAM OOM)..."
pip install --upgrade pip
pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
pip install --no-cache-dir -r backend/requirements.txt

echo "==> Creating ephemeral storage directories..."
mkdir -p /tmp/uploads /tmp/reports

echo "==> Running Alembic database migrations (if DATABASE_URL is available)..."
cd backend
python -c "
import os
url = os.environ.get('DATABASE_URL', '')
if not url or 'localhost' in url or '127.0.0.1' in url:
    print('[build] DATABASE_URL not set or localhost — skipping build-time migration.')
    exit(0)
" && alembic upgrade head || echo "[build] Migration skipped/deferred to runtime entrypoint."

echo "==> Build complete ✓"

