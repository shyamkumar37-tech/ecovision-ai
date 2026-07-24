"""
app/api/routes/auth.py
──────────────────────
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET  /api/auth/me
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import async_session_factory
from app.core.dependencies import get_db, get_current_user
from app.core.security import (
    create_access_token, create_refresh_token,
    decode_token, hash_password, verify_password,
)
from app.models.user import User, Institution
from app.schemas.schemas import (
    TokenPair, UserLogin, UserOut, UserRegister, RefreshRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new user. Email must be unique."""
    # Check for existing user
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Verify institution exists
    inst = await db.execute(select(Institution).where(Institution.id == body.institution_id))
    if not inst.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Institution not found")

    user = User(
        email           = body.email,
        hashed_password = hash_password(body.password),
        full_name       = body.full_name,
        role            = body.role,
        institution_id  = body.institution_id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenPair)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate and return JWT access + refresh tokens."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Constant-time comparison to prevent user enumeration
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    return TokenPair(
        access_token  = create_access_token(user.id, user.role),
        refresh_token = create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh_tokens(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Issue a new token pair from a valid refresh token."""
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    return TokenPair(
        access_token  = create_access_token(user.id, user.role),
        refresh_token = create_refresh_token(user.id),
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user
