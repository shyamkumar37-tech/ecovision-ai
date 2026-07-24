#!/bin/bash
# scripts/deploy.sh — One-command production deployment
# Usage: ./scripts/deploy.sh [--skip-build] [--no-migrate]

set -euo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Pre-flight checks ──────────────────────────────────────────────
info "Running pre-flight checks..."
[[ -f ".env" ]]            || error ".env file not found. Copy .env.example and fill in values."
[[ -f "docker-compose.prod.yml" ]] || error "docker-compose.prod.yml not found"
command -v docker          &>/dev/null || error "Docker not installed"
command -v docker          &>/dev/null && docker compose version &>/dev/null || error "Docker Compose not available"

source .env
[[ "${SECRET_KEY:-change-me}" == "change-me"* ]] && error "SECRET_KEY must be changed from default!"
[[ "${POSTGRES_PASSWORD:-}" ]]                    || error "POSTGRES_PASSWORD is not set!"
[[ "${REDIS_PASSWORD:-}" ]]                       || error "REDIS_PASSWORD is not set!"

mkdir -p backend/uploads backend/reports backend/logs

info "Pre-flight checks passed ✓"

# ── Build frontend ────────────────────────────────────────────────
if [[ "${1:-}" != "--skip-build" ]]; then
  info "Building React frontend..."
  cd frontend
  npm ci --silent
  npm run build
  cd ..
  info "Frontend build complete ✓"
fi

# ── Pull/build images ─────────────────────────────────────────────
info "Building Docker images..."
docker compose -f docker-compose.prod.yml build --no-cache backend celery_worker
info "Images built ✓"

# ── Start infrastructure ──────────────────────────────────────────
info "Starting infrastructure services..."
docker compose -f docker-compose.prod.yml up -d postgres redis chromadb
info "Waiting for postgres to be ready..."
sleep 8
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U "${POSTGRES_USER:-ecovision}" || error "Postgres not ready"

# ── Database migrations ───────────────────────────────────────────
if [[ "${2:-}" != "--no-migrate" ]]; then
  info "Running Alembic migrations..."
  docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
  info "Migrations complete ✓"
fi

# ── Start all services ─────────────────────────────────────────────
info "Starting all services..."
docker compose -f docker-compose.prod.yml up -d

# ── Health check ──────────────────────────────────────────────────
info "Waiting for backend to be healthy..."
sleep 15
HEALTH=$(curl -sf http://localhost:8000/health 2>/dev/null || echo "failed")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  info "Backend healthy ✓"
else
  warning "Backend health check failed — check logs: docker logs eco_backend"
fi

info "═══════════════════════════════════════════"
info "  EcoVision AI deployed successfully! 🌿"
info "  API:     http://localhost:8000"
info "  Flower:  http://localhost:5555"
info "  Metrics: http://localhost:8000/metrics"
info "═══════════════════════════════════════════"
