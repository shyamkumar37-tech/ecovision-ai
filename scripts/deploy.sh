#!/bin/bash
# scripts/deploy.sh — Non-Docker local check & build utility for EcoVision AI
# Usage: ./scripts/deploy.sh [--skip-build] [--no-migrate]

set -euo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Pre-flight checks ──────────────────────────────────────────────
info "Running pre-flight checks..."
[[ -f ".env" ]] || warning ".env file not found. Ensure environment variables are configured in Render/Vercel dashboards."
command -v python3 &>/dev/null || command -v python &>/dev/null || error "Python is required"
command -v node    &>/dev/null || error "Node.js is required"

mkdir -p backend/uploads backend/reports backend/logs

info "Pre-flight checks passed ✓"

# ── Build frontend (for Vercel local validation) ───────────────────
if [[ "${1:-}" != "--skip-build" ]]; then
  info "Building React frontend for Vercel target..."
  cd frontend
  npm ci --silent
  npm run build
  cd ..
  info "Frontend build complete ✓"
fi

# ── Database migrations (Supabase Postgres) ────────────────────────
if [[ "${2:-}" != "--no-migrate" ]]; then
  info "Running Alembic migrations against Supabase Database..."
  cd backend
  alembic upgrade head
  cd ..
  info "Migrations complete ✓"
fi

info "═══════════════════════════════════════════════════════════"
info "  EcoVision AI build & migrations verified! 🌿"
info "  - Backend & Celery Worker target: Render (runtime: python)"
info "  - Frontend target:               Vercel"
info "  - Database target:               Supabase PostgreSQL"
info "  - Cache/Queue target:            Redis"
info "═══════════════════════════════════════════════════════════"
