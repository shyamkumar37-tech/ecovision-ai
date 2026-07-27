"""Initial schema — all 9 tables

Revision ID: 001_initial
Revises: 
Create Date: 2025-06-01 00:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── institutions ──────────────────────────────────────────────
    op.create_table(
        'institutions',
        sa.Column('id',         UUID(as_uuid=False), primary_key=True),
        sa.Column('name',       sa.String(255), nullable=False),
        sa.Column('location',   sa.String(255), nullable=False),
        sa.Column('type',       sa.Enum('university','college','institute', name='institution_type', create_type=False), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # ── users ─────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id',              UUID(as_uuid=False), primary_key=True),
        sa.Column('email',           sa.String(255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name',       sa.String(255), nullable=False),
        sa.Column('role',            sa.Enum('student','faculty','sustainability_officer','admin', name='user_role', create_type=False), nullable=False),
        sa.Column('is_active',       sa.Boolean(), default=True, nullable=False),
        sa.Column('institution_id',  UUID(as_uuid=False), sa.ForeignKey('institutions.id'), nullable=False),
        sa.Column('created_at',      sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at',      sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_institution_id', 'users', ['institution_id'])

    # ── sustainability_metrics ────────────────────────────────────
    op.create_table(
        'sustainability_metrics',
        sa.Column('id',             UUID(as_uuid=False), primary_key=True),
        sa.Column('institution_id', UUID(as_uuid=False), sa.ForeignKey('institutions.id'), nullable=False),
        sa.Column('month',          sa.Integer(), nullable=False),
        sa.Column('year',           sa.Integer(), nullable=False),
        sa.Column('energy_kwh',     sa.Float(), default=0.0),
        sa.Column('water_liters',   sa.Float(), default=0.0),
        sa.Column('waste_kg',       sa.Float(), default=0.0),
        sa.Column('carbon_kg',      sa.Float(), default=0.0),
        sa.Column('created_at',     sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at',     sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('institution_id', 'month', 'year', name='uq_metric_period'),
    )
    op.create_index('ix_metrics_institution_id', 'sustainability_metrics', ['institution_id'])

    # ── carbon_reports ────────────────────────────────────────────
    op.create_table(
        'carbon_reports',
        sa.Column('id',              UUID(as_uuid=False), primary_key=True),
        sa.Column('user_id',         UUID(as_uuid=False), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('electricity_kwh', sa.Float(), nullable=False),
        sa.Column('water_liters',    sa.Float(), nullable=False),
        sa.Column('transport_km',    sa.Float(), nullable=False),
        sa.Column('paper_kg',        sa.Float(), nullable=False),
        sa.Column('total_carbon_kg', sa.Float(), nullable=False),
        sa.Column('recommendations', sa.JSON()),
        sa.Column('created_at',      sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_carbon_reports_user_id', 'carbon_reports', ['user_id'])

    # ── waste_records ─────────────────────────────────────────────
    op.create_table(
        'waste_records',
        sa.Column('id',                 UUID(as_uuid=False), primary_key=True),
        sa.Column('user_id',            UUID(as_uuid=False), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('plastic_kg',         sa.Float(), nullable=False),
        sa.Column('paper_kg',           sa.Float(), nullable=False),
        sa.Column('food_kg',            sa.Float(), nullable=False),
        sa.Column('ewaste_kg',          sa.Float(), nullable=False),
        sa.Column('ai_recommendations', sa.JSON()),
        sa.Column('disposal_methods',   sa.JSON()),
        sa.Column('created_at',         sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_waste_records_user_id', 'waste_records', ['user_id'])

    # ── documents ─────────────────────────────────────────────────
    op.create_table(
        'documents',
        sa.Column('id',          UUID(as_uuid=False), primary_key=True),
        sa.Column('user_id',     UUID(as_uuid=False), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('filename',    sa.String(500), nullable=False),
        sa.Column('file_path',   sa.String(1000), nullable=False),
        sa.Column('mime_type',   sa.String(100), nullable=False),
        sa.Column('file_size',   sa.Integer(), nullable=False),
        sa.Column('status',      sa.Enum('processing','ready','failed', name='document_status', create_type=False), default='processing'),
        sa.Column('chunk_count', sa.Integer(), nullable=True),
        sa.Column('error_msg',   sa.Text(), nullable=True),
        sa.Column('created_at',  sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at',  sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_documents_user_id', 'documents', ['user_id'])

    # ── chat_history ──────────────────────────────────────────────
    op.create_table(
        'chat_history',
        sa.Column('id',           UUID(as_uuid=False), primary_key=True),
        sa.Column('user_id',      UUID(as_uuid=False), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('session_id',   sa.String(100), nullable=False),
        sa.Column('role',         sa.Enum('user','assistant', name='chat_role', create_type=False), nullable=False),
        sa.Column('message',      sa.Text(), nullable=False),
        sa.Column('sources_used', sa.JSON()),
        sa.Column('created_at',   sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_chat_history_user_id',    'chat_history', ['user_id'])
    op.create_index('ix_chat_history_session_id', 'chat_history', ['session_id'])

    # ── audit_logs ────────────────────────────────────────────────
    op.create_table(
        'audit_logs',
        sa.Column('id',          UUID(as_uuid=False), primary_key=True),
        sa.Column('user_id',     UUID(as_uuid=False), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action',      sa.String(100), nullable=False),
        sa.Column('resource',    sa.String(100), nullable=False),
        sa.Column('resource_id', sa.String(100), nullable=True),
        sa.Column('ip_address',  sa.String(45), nullable=True),
        sa.Column('user_agent',  sa.String(500), nullable=True),
        sa.Column('before',      sa.JSON(), nullable=True),
        sa.Column('after',       sa.JSON(), nullable=True),
        sa.Column('status',      sa.String(20), default='success'),
        sa.Column('detail',      sa.Text(), nullable=True),
        sa.Column('created_at',  sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_audit_logs_user_id',    'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_action',     'audit_logs', ['action'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])

    # ── notifications ─────────────────────────────────────────────
    op.create_table(
        'notifications',
        sa.Column('id',         UUID(as_uuid=False), primary_key=True),
        sa.Column('user_id',    UUID(as_uuid=False), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type',       sa.Enum('alert','report_ready','doc_indexed','tip','system', name='notification_type', create_type=False), nullable=False),
        sa.Column('title',      sa.String(255), nullable=False),
        sa.Column('body',       sa.Text(), nullable=False),
        sa.Column('meta',       sa.JSON()),
        sa.Column('is_read',    sa.Boolean(), default=False),
        sa.Column('email_sent', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_notifications_user_id',    'notifications', ['user_id'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])


def downgrade() -> None:
    for table in ['notifications','audit_logs','chat_history','documents',
                  'waste_records','carbon_reports','sustainability_metrics','users','institutions']:
        op.drop_table(table)
    for enum in ['institution_type','user_role','document_status','chat_role','notification_type']:
        sa.Enum(name=enum).drop(op.get_bind(), checkfirst=True)
