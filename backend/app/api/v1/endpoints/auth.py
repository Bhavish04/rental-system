"""app/api/v1/endpoints/auth.py — Auth: register, login, OTP, refresh"""
import hashlib
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.models import RefreshToken, User, UserRole
from app.schemas.schemas import LoginRequest, OTPVerifyRequest, RegisterRequest, TokenResponse

router = APIRouter()

# Redis dependency
async def get_redis():
    client = aioredis.from_url("redis://localhost:6379/0")
    try:
        yield client
    finally:
        await client.aclose()


@router.post("/register", status_code=201)
async def register(
    req: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    existing = (await db.execute(select(User).where(User.email == req.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=req.email,
        full_name=req.full_name,
        password_hash=hash_password(req.password),
        phone=req.phone,
        role=UserRole(req.role),
        is_verified=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Send OTP (store in Redis for 5 min)
    otp = "".join(secrets.choice(string.digits) for _ in range(6))
    await redis.setex(f"otp:{req.email}", 300, otp)
    # In production: call SendGrid to email the OTP
    # For dev: log it
    print(f"[DEV] OTP for {req.email}: {otp}")

    return {"message": "Registration successful. Check your email for OTP.", "user_id": str(user.id)}


@router.post("/verify-otp")
async def verify_otp(
    req: OTPVerifyRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    stored = await redis.get(f"otp:{req.email}")
    if not stored or stored.decode() != req.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user = (await db.execute(select(User).where(User.email == req.email))).scalar_one_or_none()
    if user:
        user.is_verified = True
        await db.commit()

    await redis.delete(f"otp:{req.email}")
    return {"message": "Email verified successfully"}


@router.post("/login", response_model=TokenResponse)
async def login(
    req: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    user: Optional[User] = (
        await db.execute(select(User).where(User.email == req.email))
    ).scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account suspended")

    access = create_access_token(str(user.id), user.role.value)
    raw_rt, hashed_rt = create_refresh_token()

    rt = RefreshToken(
        user_id=user.id,
        token_hash=hashed_rt,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(rt)
    await db.commit()

    return TokenResponse(
        access_token=access,
        refresh_token=raw_rt,
        user_id=str(user.id),
        role=user.role.value,
        full_name=user.full_name,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: dict, db: AsyncSession = Depends(get_db)):
    raw = body.get("refresh_token", "")
    hashed = hashlib.sha256(raw.encode()).hexdigest()

    rt: Optional[RefreshToken] = (
        await db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == hashed,
                RefreshToken.revoked == False,  # noqa
            )
        )
    ).scalar_one_or_none()

    if not rt or rt.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token invalid or expired")

    user = (await db.execute(select(User).where(User.id == rt.user_id))).scalar_one()
    rt.revoked = True

    access = create_access_token(str(user.id), user.role.value)
    new_raw, new_hash = create_refresh_token()

    new_rt = RefreshToken(
        user_id=user.id,
        token_hash=new_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(new_rt)
    await db.commit()

    return TokenResponse(
        access_token=access,
        refresh_token=new_raw,
        user_id=str(user.id),
        role=user.role.value,
        full_name=user.full_name,
    )
