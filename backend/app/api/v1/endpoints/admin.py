"""app/api/v1/endpoints/admin.py — Admin portal endpoints"""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.models import ModerationLog, Property, PropertyStatus, User
from app.ai.analyser import moderate_listing

router = APIRouter()


# ── Reports (US-A01) ──────────────────────────────────────────────────────

@router.get("/reports")
async def admin_reports(
    start: datetime = Query(...),
    end: datetime = Query(...),
    period: str = Query("daily"),
    _: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stats = (await db.execute(text("""
        SELECT
            COUNT(b.id)                                    AS total_bookings,
            COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) AS confirmed_bookings,
            COALESCE(SUM(p.amount), 0)                     AS total_revenue,
            COUNT(DISTINCT b.client_id)                    AS unique_clients
        FROM bookings b
        LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'captured'
        WHERE b.created_at BETWEEN :start AND :end
    """), {"start": start, "end": end})).fetchone()

    new_users = (await db.execute(text("""
        SELECT COUNT(*) FROM users WHERE created_at BETWEEN :start AND :end
    """), {"start": start, "end": end})).scalar()

    return {
        "period": period,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "total_bookings": stats.total_bookings,
        "confirmed_bookings": stats.confirmed_bookings,
        "total_revenue_inr": float(stats.total_revenue),
        "unique_clients": stats.unique_clients,
        "new_users": new_users,
    }


# ── Leaderboard (US-A02) ──────────────────────────────────────────────────

@router.get("/leaderboard")
async def leaderboard(
    metric: str = Query("top_owners"),
    period_days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    _: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if metric == "top_owners":
        q = text("""
            SELECT u.id, u.full_name,
                   COUNT(b.id) AS bookings,
                   COALESCE(SUM(pay.amount), 0) AS revenue
            FROM users u
            JOIN properties prop ON prop.owner_id = u.id
            JOIN bookings b ON b.property_id = prop.id
            LEFT JOIN payments pay ON pay.booking_id = b.id AND pay.status = 'captured'
            WHERE b.created_at >= NOW() - :days * INTERVAL '1 day'
            GROUP BY u.id, u.full_name
            ORDER BY revenue DESC LIMIT :limit
        """)
    elif metric == "top_properties":
        q = text("""
            SELECT p.id, p.title, p.city,
                   COUNT(b.id) AS bookings,
                   p.avg_rating
            FROM properties p
            JOIN bookings b ON b.property_id = p.id
            WHERE b.created_at >= NOW() - :days * INTERVAL '1 day'
            GROUP BY p.id, p.title, p.city, p.avg_rating
            ORDER BY bookings DESC LIMIT :limit
        """)
    else:
        raise HTTPException(400, f"Unknown metric: {metric}")

    rows = (await db.execute(q, {"days": period_days, "limit": limit})).fetchall()
    return [dict(r._mapping) for r in rows]


# ── AI Moderation (US-A03) ────────────────────────────────────────────────

@router.post("/moderate/{property_id}")
async def ai_moderate(
    property_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Run Gemini AI content check on a listing before approval."""
    from sqlalchemy import select
    prop = (await db.execute(
        select(Property).where(Property.id == uuid.UUID(property_id))
    )).scalar_one_or_none()
    if not prop:
        raise HTTPException(404, "Property not found")

    result = await moderate_listing(prop.title, prop.description or "", prop.amenities or [])

    log = ModerationLog(
        property_id=prop.id,
        admin_id=uuid.UUID(current_user["sub"]),
        action="ai_check",
        ai_result=result,
    )
    db.add(log)
    await db.commit()

    return {"property_id": property_id, **result}


@router.post("/approve/{property_id}")
async def approve_listing(
    property_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Property)
        .where(Property.id == uuid.UUID(property_id))
        .values(status=PropertyStatus.ACTIVE)
    )
    log = ModerationLog(
        property_id=uuid.UUID(property_id),
        admin_id=uuid.UUID(current_user["sub"]),
        action="approve",
    )
    db.add(log)
    await db.commit()
    return {"status": "approved", "property_id": property_id}


@router.post("/reject/{property_id}")
async def reject_listing(
    property_id: str,
    body: dict,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Property)
        .where(Property.id == uuid.UUID(property_id))
        .values(status=PropertyStatus.REJECTED)
    )
    log = ModerationLog(
        property_id=uuid.UUID(property_id),
        admin_id=uuid.UUID(current_user["sub"]),
        action="reject",
        notes=body.get("reason", ""),
    )
    db.add(log)
    await db.commit()
    return {"status": "rejected"}


# ── User Management (US-A04) ──────────────────────────────────────────────

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    _: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    users = (await db.execute(select(User).offset((page - 1) * 20).limit(20))).scalars().all()
    return [
        {"id": str(u.id), "email": u.email, "full_name": u.full_name,
         "role": u.role.value, "is_active": u.is_active, "is_verified": u.is_verified}
        for u in users
    ]


@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    _: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(User).where(User.id == uuid.UUID(user_id)).values(is_active=False)
    )
    await db.commit()
    return {"status": "suspended", "user_id": user_id}


@router.post("/users/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: str,
    _: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(User).where(User.id == uuid.UUID(user_id)).values(is_active=True)
    )
    await db.commit()
    return {"status": "active", "user_id": user_id}

@router.get("/properties/pending")
async def pending_properties(
    _: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    results = (await db.execute(
        select(Property).where(Property.status == PropertyStatus.PENDING_REVIEW)
    )).scalars().all()
    return [{"id": str(p.id), "title": p.title, "city": p.city,
             "neighbourhood": p.neighbourhood, "price_per_month": p.price_per_month,
             "property_type": p.property_type, "bedrooms": p.bedrooms,
             "created_at": p.created_at.isoformat() if p.created_at else None}
            for p in results]