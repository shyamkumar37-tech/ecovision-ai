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

echo "==> Installing Python dependencies..."
pip install --no-cache-dir -r requirements.txt

echo "==> Creating /tmp/uploads and /tmp/reports directories..."
mkdir -p /tmp/uploads /tmp/reports

echo "==> Running Alembic database migrations..."
cd /app 2>/dev/null || true
alembic upgrade head

echo "==> Build complete ✓"
