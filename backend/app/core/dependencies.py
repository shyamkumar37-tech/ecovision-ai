"""
app/core/dependencies.py
────────────────────────
FastAPI dependencies:
  • get_current_user  — verifies JWT, returns User ORM object
  • require_roles     — RBAC decorator factory
  • get_db            — SQLAlchemy session factory
"""

from typing import List
from functools import wraps

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import decode_token
from app.core.database import async_session_factory
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer()


# ── Database session ──────────────────────────────────────────────────────────

async def get_db() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ── Auth dependency ───────────────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extracts and validates the Bearer JWT.
    Raises HTTP 401 on any failure — never leaks token details.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise credentials_exception

    return user


# ── RBAC dependency factory ───────────────────────────────────────────────────

def require_roles(*roles: UserRole):
    """
    Usage:
        @router.post("/upload")
        async def upload(user = Depends(require_roles(UserRole.faculty, UserRole.admin))):
            ...
    """
    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not permitted for this action.",
            )
        return current_user

    return _check


# ── Convenience role shortcuts ────────────────────────────────────────────────

def any_authenticated():
    return Depends(get_current_user)

def require_faculty_or_above():
    return Depends(require_roles(
        UserRole.faculty,
        UserRole.sustainability_officer,
        UserRole.admin,
    ))

def require_officer_or_above():
    return Depends(require_roles(
        UserRole.sustainability_officer,
        UserRole.admin,
    ))

def require_admin():
    return Depends(require_roles(UserRole.admin))
