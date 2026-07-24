#!/usr/bin/env bash
# entrypoint.sh — Docker entrypoint for EcoVision AI backend
# Runs Alembic migrations before starting the web server.

set -euo pipefail

echo "[entrypoint] Creating runtime directories..."
mkdir -p /tmp/uploads /tmp/reports

echo "[entrypoint] Running database migrations..."
# Use 'python -m alembic' to guarantee the correct Python + site-packages
python -m alembic upgrade head

echo "[entrypoint] Starting web server..."
exec "$@"
