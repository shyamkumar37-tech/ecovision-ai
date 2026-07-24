-- scripts/init.sql
-- PostgreSQL initialization script
-- Runs once on first container start

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";   -- composite indexes

-- Performance indexes (run after alembic migrations)
-- These are created separately so alembic handles schema, we handle perf

-- Partial index: only active users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active
  ON users (email) WHERE is_active = true;

-- Covering index for metrics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_inst_period
  ON sustainability_metrics (institution_id, year DESC, month DESC);

-- Chat session lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_user_session
  ON chat_history (user_id, session_id, created_at DESC);

-- Audit log time-series queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_user_time
  ON audit_logs (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_action_time
  ON audit_logs (action, created_at DESC);

-- Document status filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_docs_user_status
  ON documents (user_id, status, created_at DESC);

-- Notification unread filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notif_user_unread
  ON notifications (user_id, is_read, created_at DESC)
  WHERE is_read = false;
