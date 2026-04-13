"""app/api/v1/endpoints/reviews.py"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Review, Booking, BookingStatus
from app.schemas.schemas import ReviewCreate

router = APIRouter()

@router.post("/", status_code=201)
async def create_review(
    req: ReviewCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    booking = (await db.execute(
        select(Booking).where(
            Booking.id == req.booking_id,
            Booking.client_id == uuid.UUID(current_user["sub"]),
        )
    )).scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.status != BookingStatus.COMPLETED:
        raise HTTPException(400, "Review only allowed after completed stay")

    review = Review(
        booking_id=req.booking_id,
        property_id=booking.property_id,
        author_id=uuid.UUID(current_user["sub"]),
        rating=req.rating,
        body=req.body,
    )
    db.add(review)
    await db.commit()
    return {"message": "Review submitted"}

@router.patch("/{review_id}/reply")
async def owner_reply(
    review_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    review = (await db.execute(
        select(Review).where(Review.id == uuid.UUID(review_id))
    )).scalar_one_or_none()
    if not review:
        raise HTTPException(404, "Review not found")
    review.owner_reply = body.get("reply", "")
    await db.commit()
    return {"message": "Reply saved"}
