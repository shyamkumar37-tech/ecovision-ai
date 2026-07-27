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
pip install --upgrade pip
pip install --no-cache-dir -r backend/requirements.txt

echo "==> Creating ephemeral storage directories..."
mkdir -p /tmp/uploads /tmp/reports

echo "==> Running Alembic database migrations on Supabase Postgres..."
cd backend
alembic upgrade head

echo "==> Build & Migration complete ✓"

