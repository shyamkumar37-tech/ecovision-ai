"""
app/api/routes/notifications.py
────────────────────────────────
GET  /api/v1/notifications           → list unread + recent
POST /api/v1/notifications/{id}/read → mark one read
POST /api/v1/notifications/read-all  → mark all read
DELETE /api/v1/notifications/{id}    → delete

app/api/routes/admin.py
────────────────────────
GET  /api/v1/admin/users             → list all users (admin only)
PUT  /api/v1/admin/users/{id}        → update user role/status
GET  /api/v1/admin/audit-log         → paginated audit trail
GET  /api/v1/admin/stats             → platform-wide stats
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc, func

from app.core.dependencies import get_db, get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.models.notification import Notification
from pydantic import BaseModel


# ══════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════

notifications_router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotifOut(BaseModel):
    model_config = {"from_attributes": True}
    id: str
    type: str
    title: str
    body: str
    is_read: bool
    created_at: datetime


@notifications_router.get("", response_model=List[NotifOut])
async def list_notifications(
    unread_only: bool = False,
    limit: int = Query(default=20, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        q = q.where(Notification.is_read == False)  # noqa: E712
    q = q.order_by(desc(Notification.created_at)).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@notifications_router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(func.count()).select_from(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)  # noqa: E712
    )
    return {"count": result.scalar_one()}


@notifications_router.post("/{notif_id}/read", status_code=204)
async def mark_read(
    notif_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.id == notif_id, Notification.user_id == current_user.id)
        .values(is_read=True)
    )


@notifications_router.post("/read-all", status_code=204)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id)
        .values(is_read=True)
    )


@notifications_router.delete("/{notif_id}", status_code=204)
async def delete_notification(
    notif_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notif_id,
            Notification.user_id == current_user.id
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.delete(notif)


# ══════════════════════════════════════════════════════════════════
# ADMIN
# ══════════════════════════════════════════════════════════════════

admin_router = APIRouter(prefix="/admin", tags=["Admin"])

_admin_only = Depends(require_roles(UserRole.admin))


class UserAdminOut(BaseModel):
    model_config = {"from_attributes": True}
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    institution_id: str
    created_at: datetime


class UserUpdatePayload(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class AuditLogOut(BaseModel):
    model_config = {"from_attributes": True}
    id: str
    user_id: Optional[str]
    action: str
    resource: str
    resource_id: Optional[str]
    ip_address: Optional[str]
    status: str
    created_at: datetime


@admin_router.get("/users", response_model=List[UserAdminOut])
async def list_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    _: User = _admin_only,
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    result = await db.execute(
        select(User).order_by(desc(User.created_at)).offset(offset).limit(limit)
    )
    return result.scalars().all()


@admin_router.put("/users/{user_id}", response_model=UserAdminOut)
async def update_user(
    user_id: str,
    payload: UserUpdatePayload,
    _: User = _admin_only,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    await db.flush()
    await db.refresh(user)
    return user


@admin_router.get("/audit-log", response_model=List[AuditLogOut])
async def get_audit_log(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=200),
    action: Optional[str] = None,
    _: User = _admin_only,
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    q = select(AuditLog).order_by(desc(AuditLog.created_at))
    if action:
        q = q.where(AuditLog.action == action)
    q = q.offset(offset).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@admin_router.get("/stats")
async def platform_stats(
    _: User = _admin_only,
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import SustainabilityMetric, Document, CarbonReport

    users_total = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    users_active = (await db.execute(select(func.count()).select_from(User).where(User.is_active == True))).scalar_one()  # noqa
    docs_total = (await db.execute(select(func.count()).select_from(Document))).scalar_one()
    carbon_total = (await db.execute(select(func.count()).select_from(CarbonReport))).scalar_one()

    return {
        "users":        {"total": users_total, "active": users_active},
        "documents":    {"total": docs_total},
        "carbon_calcs": {"total": carbon_total},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
