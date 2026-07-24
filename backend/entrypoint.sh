#!/usr/bin/env bash
# entrypoint.sh — Docker entrypoint for EcoVision AI backend
# Runs Alembic migrations before starting the web server.

set -euo pipefail

echo "[entrypoint] Creating runtime directories..."
mkdir -p /tmp/uploads /tmp/reports

echo "[entrypoint] Running database migrations..."
alembic upgrade head

echo "[entrypoint] Starting web server..."
exec "$@"
