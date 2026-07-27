-- scripts/init.sql
-- EcoVision AI — PostgreSQL Database Initialization & Optimization Script
-- Compatible with Supabase, PostgreSQL 16+, and multi-statement transaction execution.

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";   -- composite indexes

-- 2. Create Enumeration Types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'institution_type') THEN
        CREATE TYPE institution_type AS ENUM ('university', 'college', 'institute');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'faculty', 'sustainability_officer', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
        CREATE TYPE document_status AS ENUM ('processing', 'ready', 'failed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_role') THEN
        CREATE TYPE chat_role AS ENUM ('user', 'assistant');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('alert', 'report_ready', 'doc_indexed', 'tip', 'system');
    END IF;
END $$;

-- 3. Create Core Database Tables

-- ── 1. Institutions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    type institution_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Sustainability Metrics ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sustainability_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    energy_kwh DOUBLE PRECISION DEFAULT 0.0,
    water_liters DOUBLE PRECISION DEFAULT 0.0,
    waste_kg DOUBLE PRECISION DEFAULT 0.0,
    carbon_kg DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_metric_period UNIQUE (institution_id, month, year)
);

-- ── 4. Carbon Reports ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carbon_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    electricity_kwh DOUBLE PRECISION NOT NULL,
    water_liters DOUBLE PRECISION NOT NULL,
    transport_km DOUBLE PRECISION NOT NULL,
    paper_kg DOUBLE PRECISION NOT NULL,
    total_carbon_kg DOUBLE PRECISION NOT NULL,
    recommendations JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. Waste Records ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waste_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plastic_kg DOUBLE PRECISION NOT NULL,
    paper_kg DOUBLE PRECISION NOT NULL,
    food_kg DOUBLE PRECISION NOT NULL,
    ewaste_kg DOUBLE PRECISION NOT NULL,
    ai_recommendations JSONB,
    disposal_methods JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. Documents ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    status document_status DEFAULT 'processing',
    chunk_count INTEGER,
    error_msg TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. Chat History ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    role chat_role NOT NULL,
    message TEXT NOT NULL,
    sources_used JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 8. Audit Logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    "before" JSONB,
    "after" JSONB,
    status VARCHAR(20) DEFAULT 'success',
    detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 9. Notifications ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    meta JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Performance & Lookup Indexes (Non-concurrent for transaction compatibility)

-- Users lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_institution_id ON users (institution_id);
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users (email) WHERE is_active = true;

-- Metrics query index
CREATE INDEX IF NOT EXISTS idx_metrics_institution_id ON sustainability_metrics (institution_id);
CREATE INDEX IF NOT EXISTS idx_metrics_inst_period ON sustainability_metrics (institution_id, year DESC, month DESC);

-- Carbon reports index
CREATE INDEX IF NOT EXISTS idx_carbon_reports_user_id ON carbon_reports (user_id);

-- Waste records index
CREATE INDEX IF NOT EXISTS idx_waste_records_user_id ON waste_records (user_id);

-- Documents index
CREATE INDEX IF NOT EXISTS idx_docs_user_id ON documents (user_id);
CREATE INDEX IF NOT EXISTS idx_docs_user_status ON documents (user_id, status, created_at DESC);

-- Chat session lookup
CREATE INDEX IF NOT EXISTS idx_chat_user_id ON chat_history (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_id ON chat_history (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_user_session ON chat_history (user_id, session_id, created_at DESC);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_time ON audit_logs (action, created_at DESC);

-- Notification unread filter
CREATE INDEX IF NOT EXISTS idx_notif_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications (user_id, is_read, created_at DESC) WHERE is_read = false;
