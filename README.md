# 🌿 EcoVision AI — Smart Campus Sustainability Platform

[![CI/CD](https://github.com/your-org/ecovision-ai/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/your-org/ecovision-ai/actions)
[![Coverage](https://codecov.io/gh/your-org/ecovision-ai/badge.svg)](https://codecov.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> Production-grade AI sustainability platform for universities and colleges.
> OpenRouter LLM · RAG · Supabase · Render · Vercel · Redis · FastAPI · React 19

---

## ✨ Features

### Core Platform
| Feature | Description | SDG |
|---------|-------------|-----|
| **Sustainability Dashboard** | Real-time KPI cards, trend charts, composite score (0–100) | All |
| **AI Chat Assistant** | OpenRouter LLM + RAG from uploaded docs, streaming | 7,11,12,13 |
| **Carbon Calculator** | IEA/IPCC emission factors, CO₂e breakdown, AI tips | SDG 13 |
| **Waste Advisor** | Category classification, disposal methods, recycling guidance | SDG 12 |
| **Document Intelligence** | PDF/DOCX upload → ChromaDB RAG → Q&A | All |
| **Report Generator** | Celery-backed PDF with SDG scores, AI insights | All |
| **Analytics** | Trends, peer benchmarking, 5-month forecasting | All |

### Production Features
| Feature | Implementation |
|---------|---------------|
| **Security headers** | CSP · HSTS · X-Frame-Options · X-Content-Type-Options |
| **Rate limiting** | Redis-backed SlowAPI — 20 req/min chat, 10 req/min login |
| **Audit logging** | Every action stored in `audit_logs` table for compliance |
| **Notifications** | In-app + email alerts for threshold breaches, report ready |
| **Email system** | SMTP-based welcome, weekly digest, threshold alerts |
| **Scheduled tasks** | Celery Beat — weekly digest, threshold checks, DB cleanup |
| **Admin panel** | User management, RBAC, audit trail, platform stats |
| **CI/CD pipeline** | GitHub Actions — test, build & release |
| **Observability** | Prometheus metrics, Sentry errors, structured JSON logs |
| **Command palette** | ⌘K global search for quick navigation |
| **Topbar** | Notifications panel, user menu, theme toggle |
| **Settings** | Profile, security overview, RBAC table, API key, danger zone |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Vercel Frontend (SPA)                  │
│              React 19 · Vite · Tailwind · Framer         │
│              Global CDN · Automatic SPA Routing          │
└────────────────────────────┬─────────────────────────────┘
                             │ HTTPS / CORS
                             ▼
┌──────────────────────────────────────────────────────────┐
│                Render Web Service (Backend)              │
│            FastAPI (Uvicorn) · Native Python Runtime     │
│                 Security headers · Rate limits           │
└────────────────┬───────────────────────────┬─────────────┘
                 │                           │
  ┌──────────────▼──────────────┐  ┌─────────▼──────────────┐
  │     Supabase PostgreSQL     │  │       Managed Redis    │
  │     (Database & Storage)    │  │  (Cache & Celery Queue)│
  │    Alembic migrations       │  └─────────┬──────────────┘
  └─────────────────────────────┘            │
                                   ┌─────────▼──────────────┐
                                   │  Render Worker Service │
                                   │  Celery Task Worker    │
                                   │  • Reports & Doc RAG   │
                                   └─────────┬──────────────┘
                                             │
                                   ┌─────────▼──────────────┐
                                   │     OpenRouter AI      │
                                   │   LLM Inference API    │
                                   └────────────────────────┘
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL (or Supabase Connection String)
- Redis (Local Redis or Managed Redis instance)

### 1. Clone and configure
```bash
git clone https://github.com/your-org/ecovision-ai.git
cd ecovision-ai
cp .env.example .env
# Edit .env — fill DATABASE_URL, SECRET_KEY, REDIS_URL, OPENROUTER_API_KEY
```

### 2. Generate a secure SECRET_KEY
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Run database migrations
```bash
cd backend
python -m venv venv
# On Linux/macOS: source venv/bin/activate
# On Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
```

### 4. Start backend API
```bash
uvicorn app.main:app --reload --port 8000
# Docs: http://localhost:8000/docs
```

### 5. Start Celery worker (in a separate terminal)
```bash
cd backend
celery -A app.core.celery_app worker --loglevel=info
```

### 6. Start frontend
```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_BASE_URL=http://localhost:8000
npm run dev
# → http://localhost:5173
```

---

## 🔐 Security Checklist

- [x] Passwords hashed with **bcrypt** (never SHA-256)
- [x] JWT access token: **30-minute TTL**
- [x] JWT refresh token: **7-day rolling TTL**
- [x] Token type field prevents token confusion attacks
- [x] CORS: **strict allowlist** configured for Vercel domain
- [x] **CSP headers** prevent XSS injection
- [x] **HSTS** enforces HTTPS in production
- [x] `X-Frame-Options: DENY` prevents clickjacking
- [x] Rate limiting: **20 req/min** on chat, **10/min** on login
- [x] File uploads: **MIME type + 10MB** size validation
- [x] All DB queries via **SQLAlchemy ORM** (no raw SQL)
- [x] Secrets in **environment variables only**
- [x] **Audit log** for all sensitive operations
- [x] **Request ID** header for distributed tracing
- [x] **Sentry** error tracking in production

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

**9 tables** · UUID primary keys · Alembic migrations · PostgreSQL 16 (Supabase)

---

## 🌍 SDG Alignment

| SDG | Description | Platform Feature |
|-----|-------------|-----------------|
| **SDG 7** | Affordable and Clean Energy | Energy KPI, carbon calculator, AI energy tips |
| **SDG 11** | Sustainable Cities & Communities | Campus score, urban planning recommendations |
| **SDG 12** | Responsible Consumption & Production | Waste advisor, recycling guidance |
| **SDG 13** | Climate Action | Carbon footprint, CO₂e tracking, SBT alignment |

---

## 🧪 Testing

```bash
cd backend
pytest tests/ -v --cov=app --cov-report=term-missing
```

---

## 🚢 Production Deployment

### 1. Database Setup (Supabase)
1. Create a project on [Supabase](https://supabase.com).
2. Under **Project Settings -> Database -> Connection string**, copy your URI.
3. Use Session Pooler (`port 5432`) or Transaction Pooler (`port 6543`).

### 2. Backend & Worker Setup (Render)
1. Push your code to GitHub.
2. Log in to [Render](https://render.com) and click **New -> Blueprint**.
3. Select this repository. Render automatically reads `render.yaml` to provision:
   - `ecovision-backend` Web Service (Native Python)
   - `ecovision-celery` Worker Service (Native Python)
   - `ecovision-redis` Managed Redis Instance
4. In Render Dashboard, set `DATABASE_URL` for `ecovision-backend` and `ecovision-celery` to your Supabase PostgreSQL connection string.
5. Set `ALLOWED_ORIGINS` to your Vercel frontend URL.

### 3. Frontend Setup (Vercel)
1. Import your project into [Vercel](https://vercel.com).
2. Set the Root Directory to `./frontend` or use root with automatic Vercel project detection.
3. Configure the environment variable:
   - `VITE_API_BASE_URL` = `https://ecovision-backend.onrender.com`
4. Deploy! `vercel.json` will automatically configure Vite SPA routing.

---

## 📁 Project Structure

```
ecovision-ai/
├── .github/workflows/ci-cd.yml     # CI/CD pipeline
├── backend/
│   ├── app/
│   │   ├── ai/rag_pipeline.py       # OpenRouter RAG Pipeline
│   │   ├── api/routes/              # 9 API route modules
│   │   ├── core/                    # Security, database, configuration
│   │   ├── middleware/security.py   # Security headers, rate limiters
│   │   ├── models/                  # SQLAlchemy models
│   │   ├── schemas/schemas.py       # Pydantic schemas
│   │   └── services/                # Business logic & Celery tasks
│   ├── alembic/                     # DB migrations
│   ├── entrypoint.sh                # Native backend runner
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/ layout/      # Sidebar, Topbar, navigation
│   │   ├── pages/                   # Application pages
│   │   ├── hooks/                   # Custom TanStack query hooks
│   │   ├── stores/                  # Zustand global stores
│   │   └── lib/                     # API client & helpers
│   ├── package.json
│   └── vercel.json                  # Vercel configuration for SPA
├── scripts/
│   ├── deploy.sh                    # Build & migration check utility
│   ├── init.sql                     # Supabase/Postgres init script
│   └── render-build.sh              # Render build & migration hook
├── render.yaml                      # Render Blueprint specification
├── vercel.json                      # Root Vercel configuration
└── .env.example                     # Environment template
```

---

## 🔧 Tech Stack

**Backend**: FastAPI · Native Python · SQLAlchemy 2.0 · Alembic · Pydantic v2 · JWT · bcrypt · Redis · Celery · ChromaDB · LangChain · OpenRouter LLM · SentenceTransformers · ReportLab · Sentry · Prometheus

**Frontend**: React 19 · TypeScript · Vite · Vercel · Tailwind CSS · Framer Motion · TanStack Query · Zustand · Recharts · React Hook Form · Zod · Lucide React

**Hosting Infrastructure**: Render (Backend Web Service & Celery Worker) · Vercel (Frontend SPA) · Supabase (PostgreSQL 16) · Redis (Managed Broker & Cache) · GitHub Actions


---

## 📄 License

MIT © 2025 EcoVision AI Team
