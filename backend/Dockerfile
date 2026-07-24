# Stage 1: Builder
FROM python:3.11-slim AS builder
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev libmagic1 curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Stage 2: Production
FROM python:3.11-slim AS production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 libmagic1 curl && rm -rf /var/lib/apt/lists/*
RUN groupadd -r ecovision && useradd -r -g ecovision -d /app ecovision
COPY --from=builder /root/.local /home/ecovision/.local
COPY --from=builder /root/.cache /home/ecovision/.cache
COPY --chown=ecovision:ecovision . .
RUN mkdir -p /tmp/uploads /tmp/reports logs && chown -R ecovision:ecovision /tmp/uploads /tmp/reports logs
RUN chmod +x entrypoint.sh
USER ecovision
ENV PATH=/home/ecovision/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
ENV HF_HOME=/home/ecovision/.cache/huggingface
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 CMD curl -f http://localhost:8000/health || exit 1
ENTRYPOINT ["./entrypoint.sh"]
CMD ["gunicorn","app.main:app","-k","uvicorn.workers.UvicornWorker","-w","2","--bind","0.0.0.0:8000","--timeout","120","--access-logfile","-","--error-logfile","-"]

# Stage 3: Development
FROM production AS development
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000","--reload"]
