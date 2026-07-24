# Stage 1: Builder
FROM python:3.11-slim AS builder
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev libmagic1 curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt /build/requirements.txt
RUN pip install --no-cache-dir -r /build/requirements.txt

# Stage 2: Production (DEFAULT final stage for Docker builds)
FROM python:3.11-slim AS production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 libmagic1 curl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY . .
RUN if [ -d backend ]; then cp -rn backend/* . 2>/dev/null || true; fi
RUN mkdir -p /tmp/uploads /tmp/reports logs && chmod +x entrypoint.sh
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
ENTRYPOINT ["./entrypoint.sh"]
CMD ["gunicorn","app.main:app","-k","uvicorn.workers.UvicornWorker","-w","1","--bind","0.0.0.0:8000","--timeout","120","--access-logfile","-","--error-logfile","-"]
