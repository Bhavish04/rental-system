"""app/api/v1/endpoints/properties.py — Property CRUD + Search"""
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, update, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Property, PropertyPhoto, PropertyStatus
from app.schemas.schemas import PropertyCreate, PropertyOut, PropertyUpdate
from app.ai.chatbot import index_property_to_pinecone

router = APIRouter()


@router.get("/search")
async def search_properties(
    city: Optional[str] = None,
    neighbourhood: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    property_type: Optional[str] = None,
    bedrooms: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Search active properties with filters. Public endpoint."""
    q = select(Property).where(Property.status == PropertyStatus.ACTIVE)

    if city:
        q = q.where(Property.city.ilike(f"%{city}%"))
    if neighbourhood:
        q = q.where(Property.neighbourhood.ilike(f"%{neighbourhood}%"))
    if min_price:
        q = q.where(Property.price_per_month >= min_price)
    if max_price:
        q = q.where(Property.price_per_month <= max_price)
    if property_type:
        q = q.where(Property.property_type == property_type)
    if bedrooms:
        q = q.where(Property.bedrooms == bedrooms)

    total_q = q
    q = q.offset((page - 1) * page_size).limit(page_size)
    q = q.options(selectinload(Property.photos))
    results = (await db.execute(q)).scalars().all()


    return {
        "total": len(results),
        "page": page,
        "page_size": page_size,
        "results": [_serialize(p) for p in results],
    }


@router.get("/{property_id}")
async def get_property(property_id: str, db: AsyncSession = Depends(get_db)):
    prop = await _get_or_404(property_id, db)
    return _serialize(prop)


@router.post("/", status_code=201)
async def create_property(
    req: PropertyCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners can create listings")

    prop = Property(
        owner_id=uuid.UUID(current_user["sub"]),
        **req.model_dump(exclude={"amenities"}),
        amenities=req.amenities,
        status=PropertyStatus.PENDING_REVIEW,
    )
    db.add(prop)
    await db.commit()
    await db.refresh(prop)

    # Reload with photos eagerly to avoid async lazy load error
    prop = await _get_or_404(str(prop.id), db)

    # Index into Pinecone for chatbot RAG
    try:
        await index_property_to_pinecone(_serialize(prop))
    except Exception:
        pass

    return _serialize(prop)

@router.patch("/{property_id}")
async def update_property(
    property_id: str,
    req: PropertyUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prop = await _get_or_404(property_id, db)
    if str(prop.owner_id) != current_user["sub"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not your property")

    for field, value in req.model_dump(exclude_none=True).items():
        setattr(prop, field, value)

    await db.commit()
    await db.refresh(prop)
    await index_property_to_pinecone(_serialize(prop))
    return _serialize(prop)


@router.get("/owner/my")
async def my_properties(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    results = (
        await db.execute(
            select(Property)
            .where(Property.owner_id == uuid.UUID(current_user["sub"]))
            .options(selectinload(Property.photos))
        )
    ).scalars().all()
    return [_serialize(p) for p in results]

@router.post("/{property_id}/photos")
async def add_photos(
    property_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import os, base64, re

    prop = await _get_or_404(property_id, db)
    if str(prop.owner_id) != current_user["sub"] and current_user["role"] != "admin":
        raise HTTPException(403, "Not your property")

    # Use absolute path relative to this file
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
    upload_dir = os.path.join(base_dir, "static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    photos = body.get("photos", [])
    saved = 0

    for i, photo_data in enumerate(photos):
        url = photo_data if isinstance(photo_data, str) else photo_data.get("url", "")
        if not url:
            continue

        if url.startswith("data:image"):
            try:
                match = re.match(r'data:image/(\w+);base64,(.+)', url, re.DOTALL)
                if not match:
                    # try jpeg
                    match = re.match(r'data:image/jpeg;base64,(.+)', url, re.DOTALL)
                    if match:
                        ext = 'jpg'
                        data = base64.b64decode(match.group(1))
                    else:
                        continue
                else:
                    ext = match.group(1)
                    if ext == 'jpeg':
                        ext = 'jpg'
                    data = base64.b64decode(match.group(2))

                filename = f"{uuid.uuid4()}.{ext}"
                filepath = os.path.join(upload_dir, filename)
                with open(filepath, "wb") as f:
                    f.write(data)
                url = f"/static/uploads/{filename}"
            except Exception as e:
                print(f"[PHOTOS] Error saving photo {i}: {e}")
                continue
        
        ph = PropertyPhoto(
            property_id=prop.id,
            url=url,
            is_primary=(i == 0),
            sort_order=i,
        )
        db.add(ph)
        saved += 1

    await db.commit()
    return {"message": f"{saved} photos saved"}

@router.delete("/{property_id}")
async def delete_property(
    property_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import delete as sa_delete
    from app.models.interest import PropertyInterest
    from app.models.transaction import PropertyTransaction

    prop = await _get_or_404(property_id, db)
    if str(prop.owner_id) != current_user["sub"] and current_user["role"] != "admin":
        raise HTTPException(403, "Not your property")

    from app.models.models import ModerationLog
    # Delete related records first to avoid FK violations
    await db.execute(sa_delete(PropertyInterest).where(PropertyInterest.property_id == prop.id))
    await db.execute(sa_delete(PropertyTransaction).where(PropertyTransaction.property_id == prop.id))
    await db.execute(sa_delete(ModerationLog).where(ModerationLog.property_id == prop.id))
    await db.delete(prop)
    await db.commit()
    return {"message": "Property deleted"}

# ── Helpers ──────────────────────────────────────────────────────────────
async def _get_or_404(property_id: str, db: AsyncSession) -> Property:
    prop = (
        await db.execute(
            select(Property)
            .where(Property.id == uuid.UUID(property_id))
            .options(selectinload(Property.photos))
        )
    ).scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop


def _serialize(p: Property) -> dict:
    return {
        "id": str(p.id),
        "title": p.title,
        "description": p.description,
        "property_type": p.property_type,
        "bedrooms": p.bedrooms,
        "bathrooms": p.bathrooms,
        "area_sqft": p.area_sqft,
        "floor": p.floor,
        "address": p.address,
        "city": p.city,
        "neighbourhood": p.neighbourhood,
        "pincode": p.pincode,
        "latitude": p.latitude,
        "longitude": p.longitude,
        "price_per_month": p.price_per_month,
        "suggested_price": p.suggested_price,
        "fair_price_badge": p.fair_price_badge,
        "amenities": p.amenities or [],
        "status": p.status.value if hasattr(p.status, "value") else p.status,
        "avg_rating": p.avg_rating,
        "total_reviews": p.total_reviews,
        "owner_id": str(p.owner_id),
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "photos": [{"url": ph.url, "is_primary": ph.is_primary}
                   for ph in (p.photos or [])],
    }
