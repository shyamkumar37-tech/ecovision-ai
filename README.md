# 🌿 EcoVision AI — Smart Campus Sustainability Platform

[![CI/CD](https://github.com/your-org/ecovision-ai/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/your-org/ecovision-ai/actions)
[![Coverage](https://codecov.io/gh/your-org/ecovision-ai/badge.svg)](https://codecov.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> Production-grade AI sustainability platform for universities and colleges.
> IBM Granite (Watsonx.ai) · RAG · ChromaDB · FastAPI · React 19

---

## ✨ Features

### Core Platform
| Feature | Description | SDG |
|---------|-------------|-----|
| **Sustainability Dashboard** | Real-time KPI cards, trend charts, composite score (0–100) | All |
| **AI Chat Assistant** | IBM Granite via Watsonx + RAG from uploaded docs, streaming | 7,11,12,13 |
| **Carbon Calculator** | IEA/IPCC emission factors, CO₂e breakdown, AI tips | SDG 13 |
| **Waste Advisor** | Category classification, disposal methods, recycling guidance | SDG 12 |
| **Document Intelligence** | PDF/DOCX upload → ChromaDB RAG → Q&A | All |
| **Report Generator** | Celery-backed PDF with SDG scores, AI insights | All |
| **Analytics** | Trends, peer benchmarking, 5-month forecasting | All |

### Production Features (New)
| Feature | Implementation |
|---------|---------------|
| **Security headers** | CSP · HSTS · X-Frame-Options · X-Content-Type-Options |
| **Rate limiting** | Redis-backed SlowAPI — 20 req/min chat, 10 req/min login |
| **Audit logging** | Every action stored in `audit_logs` table for compliance |
| **Notifications** | In-app + email alerts for threshold breaches, report ready |
| **Email system** | SMTP-based welcome, weekly digest, threshold alerts |
| **Scheduled tasks** | Celery Beat — weekly digest, threshold checks, DB cleanup |
| **Admin panel** | User management, RBAC, audit trail, platform stats |
| **CI/CD pipeline** | GitHub Actions — test, build, push to GHCR, deploy |
| **Observability** | Prometheus metrics, Sentry errors, structured JSON logs |
| **Command palette** | ⌘K global search for quick navigation |
| **Topbar** | Notifications panel, user menu, theme toggle |
| **Settings** | Profile, security overview, RBAC table, API key, danger zone |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Nginx (TLS + Gzip)                    │
│              Rate limiting · Security headers             │
└────────────────┬──────────────────┬──────────────────────┘
                 │                  │
       ┌─────────▼──────┐  ┌───────▼────────┐
       │  React 19 SPA   │  │  FastAPI + UV  │
       │  Vite · Tailwind│  │  Gunicorn 4w   │
       │  TanStack Query │  │  /api/v1/*     │
       │  Framer Motion  │  │  JWT auth      │
       └────────────────┘  └───────┬────────┘
                                   │
           ┌───────────────────────┼──────────────────┐
           │                       │                  │
    ┌──────▼──────┐  ┌─────────────▼──────┐  ┌───────▼───────┐
    │ PostgreSQL  │  │  ChromaDB           │  │  Redis        │
    │ 9 tables    │  │  RAG vectors        │  │  Cache+Queue  │
    │ Alembic     │  │  SentenceTransform  │  │  Celery broker│
    └─────────────┘  └───────────────────┘  └───────────────┘
                                │
                    ┌───────────▼──────────┐
                    │  Celery Workers       │
                    │  • Report generation  │
                    │  • Doc indexing       │
                    │  • Weekly digest      │
                    │  • Threshold alerts   │
                    └───────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │  IBM Granite LLM      │
                    │  Watsonx.ai API       │
                    │  Temperature: 0.3     │
                    └──────────────────────┘
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.11+

### 1. Clone and configure
```bash
git clone https://github.com/your-org/ecovision-ai.git
cd ecovision-ai
cp .env.example .env
# Edit .env — fill DATABASE_URL, SECRET_KEY, WATSONX_API_KEY
```

### 2. Generate a secure SECRET_KEY
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Start infrastructure
```bash
docker compose up -d postgres redis chromadb
```

### 4. Run database migrations
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
```

### 5. Start backend
```bash
uvicorn app.main:app --reload --port 8000
# Docs: http://localhost:8000/docs
```

### 6. Start Celery worker
```bash
celery -A celery_worker worker --loglevel=info
```

### 7. Start frontend
```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:8000
npm run dev
# → http://localhost:5173
```

---

## 🔐 Security Checklist

- [x] Passwords hashed with **bcrypt** (never SHA-256)
- [x] JWT access token: **30-minute TTL**
- [x] JWT refresh token: **7-day rolling TTL**
- [x] Token type field prevents token confusion attacks
- [x] CORS: **strict allowlist** only (no wildcard)
- [x] **CSP headers** prevent XSS injection
- [x] **HSTS** enforces HTTPS for 1 year
- [x] `X-Frame-Options: DENY` prevents clickjacking
- [x] Rate limiting: **20 req/min** on chat, **10/min** on login
- [x] File uploads: **MIME type + 10MB** size validation
- [x] All DB queries via **SQLAlchemy ORM** (no raw SQL)
- [x] Secrets in **environment variables only**
- [x] **Non-root Docker user** (ecovision:ecovision)
- [x] **Audit log** for all sensitive operations
- [x] **Request ID** header for distributed tracing
- [x] Nginx: blocks `.env`, `.git`, `.sql` paths
- [x] **Sentry** error tracking in production
- [x] Server version header **removed** by Nginx

---

## 📊 Database Schema

```
institutions (1) ──< users (1) ──< carbon_reports
                              ──< waste_records
                              ──< documents
                              ──< chat_history
                              ──< notifications
                              ──< audit_logs
             (1) ──< sustainability_metrics
```

**9 tables** · UUID primary keys · Alembic migrations · PostgreSQL 16

---

## 🌍 SDG Alignment

| SDG | Description | Platform Feature |
|-----|-------------|-----------------|
| **SDG 7** | Affordable and Clean Energy | Energy KPI, carbon calculator, AI energy tips |
| **SDG 11** | Sustainable Cities & Communities | Campus score, urban planning recommendations |
| **SDG 12** | Responsible Consumption & Production | Waste advisor, recycling guidance |
| **SDG 13** | Climate Action | Carbon footprint, CO₂e tracking, SBT alignment |

All AI recommendations are **auto-tagged** with relevant SDGs using keyword detection.

---

## 🧪 Testing

```bash
cd backend
pytest tests/ -v --cov=app --cov-report=term-missing
```

Test categories:
- `TestSecurity` — password hashing, JWT, token tampering
- `TestCarbonService` — emission factor calculations
- `TestWasteService` — waste analysis, percentages
- `TestSustainabilityScore` — composite score algorithm
- `TestAPIEndpoints` — HTTP integration tests, security headers

---

## 🚢 Production Deployment

### One-command deploy
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Manual Render + Vercel
1. Push to GitHub
2. Connect `backend/` to Render Web Service
3. Connect `frontend/` to Vercel
4. Set environment variables in both dashboards
5. Run `alembic upgrade head` via Render Shell
6. Update `ALLOWED_ORIGINS` to your Vercel URL

### Environment Variables Required
See `.env.example` for the complete list (24 variables).

---

## 📁 Project Structure

```
ecovision-ai/
├── .github/workflows/ci-cd.yml     # CI/CD pipeline
├── backend/
│   ├── app/
│   │   ├── ai/rag_pipeline.py       # IBM Granite + ChromaDB RAG
│   │   ├── api/routes/              # 9 route files
│   │   ├── core/                    # config, security, database, deps
│   │   ├── middleware/security.py   # CSP, HSTS, request ID, logging
│   │   ├── models/                  # 9 SQLAlchemy models
│   │   ├── schemas/schemas.py       # All Pydantic v2 schemas
│   │   └── services/                # business logic + Celery tasks
│   ├── alembic/                     # DB migrations
│   ├── tests/test_api.py            # Pytest test suite
│   ├── Dockerfile                   # Multi-stage production build
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/layout/       # Sidebar, Topbar
│       ├── pages/                   # 8 pages
│       ├── hooks/                   # TanStack Query
│       ├── stores/                  # Zustand
│       └── lib/                     # API client, utils
├── nginx/nginx.conf                 # Production Nginx
├── scripts/
│   ├── deploy.sh                    # Deployment script
│   └── init.sql                     # DB indexes + extensions
├── docker-compose.yml               # Local dev
├── docker-compose.prod.yml          # Production
└── .env.example
```

---

## 🔧 Tech Stack

**Backend**: FastAPI · SQLAlchemy 2.0 · Alembic · Pydantic v2 · JWT · bcrypt · Redis · Celery · ChromaDB · LangChain · IBM Granite · SentenceTransformers · ReportLab · Sentry · Prometheus

**Frontend**: React 19 · TypeScript · Vite · Tailwind CSS · Framer Motion · TanStack Query · Zustand · Recharts · React Hook Form · Zod · Lucide React

**Infrastructure**: PostgreSQL 16 · Redis 7 · ChromaDB · Nginx · Docker · Gunicorn · GitHub Actions

---

## 📄 License

MIT © 2025 EcoVision AI Team
