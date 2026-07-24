# Stage 1: Builder
FROM python:3.11-slim AS builder
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev libmagic1 curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt* backend/requirements.txt* /build/
RUN if [ -f /build/requirements.txt ]; then pip install --no-cache-dir --user -r /build/requirements.txt; else pip install --no-cache-dir --user -r /build/backend/requirements.txt; fi
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Stage 2: Development
FROM builder AS development
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY --from=builder /root/.cache /root/.cache
COPY . .
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/root/.local/lib/python3.11/site-packages
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000","--reload"]

# Stage 3: Production (DEFAULT final stage for Docker builds)
FROM python:3.11-slim AS production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 libmagic1 curl && rm -rf /var/lib/apt/lists/*
RUN groupadd -r ecovision \
    && mkdir -p /home/ecovision \
    && useradd -r -g ecovision -d /home/ecovision -s /sbin/nologin ecovision \
    && chown ecovision:ecovision /home/ecovision
COPY --from=builder /root/.local  /home/ecovision/.local
COPY --from=builder /root/.cache  /home/ecovision/.cache
RUN chown -R ecovision:ecovision /home/ecovision/.local /home/ecovision/.cache
COPY --chown=ecovision:ecovision . .
RUN mkdir -p /tmp/uploads /tmp/reports logs \
    && chown -R ecovision:ecovision /tmp/uploads /tmp/reports logs \
    && chmod +x entrypoint.sh
USER ecovision
ENV HOME=/home/ecovision
ENV PATH=/home/ecovision/.local/bin:$PATH
ENV PYTHONPATH=/home/ecovision/.local/lib/python3.11/site-packages
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
ENV HF_HOME=/home/ecovision/.cache/huggingface
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
ENTRYPOINT ["./entrypoint.sh"]
CMD ["gunicorn","app.main:app","-k","uvicorn.workers.UvicornWorker","-w","1","--bind","0.0.0.0:8000","--timeout","120","--access-logfile","-","--error-logfile","-"]
