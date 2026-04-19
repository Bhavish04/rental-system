"""app/api/v1/endpoints/bookings.py"""
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Booking, BookingStatus, Payment, PaymentStatus, Property, PropertyStatus, Availability
from app.schemas.schemas import BookingCreate, BookingCreateResponse

settings = get_settings()
router = APIRouter()

rz = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


@router.post("/", response_model=BookingCreateResponse, status_code=201)
async def create_booking(
    req: BookingCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prop = (await db.execute(
        select(Property).where(Property.id == req.property_id)
    )).scalar_one_or_none()

    if not prop or prop.status != PropertyStatus.ACTIVE:
        raise HTTPException(404, "Property not available")

    # Check date conflicts
    overlap = (await db.execute(
        select(Booking).where(
            Booking.property_id == req.property_id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
            Booking.check_in < req.check_out,
            Booking.check_out > req.check_in,
        )
    )).scalar_one_or_none()
    if overlap:
        raise HTTPException(409, "Property not available for those dates")

    nights = (req.check_out - req.check_in).days
    if nights <= 0:
        raise HTTPException(400, "check_out must be after check_in")

    total = round(prop.price_per_month / 30 * nights, 2)

    booking = Booking(
        client_id=uuid.UUID(current_user["sub"]),
        property_id=req.property_id,
        check_in=req.check_in,
        check_out=req.check_out,
        total_nights=nights,
        total_amount=total,
        status=BookingStatus.PENDING,
        auto_decline_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(booking)
    await db.flush()

    # Create Razorpay order
    order = rz.order.create({
        "amount": int(total * 100),
        "currency": "INR",
        "receipt": str(booking.id),
        "payment_capture": 1,
    })

    payment = Payment(
        booking_id=booking.id,
        gateway="razorpay",
        gateway_order_id=order["id"],
        amount=total,
        currency="INR",
    )
    db.add(payment)
    await db.commit()

    return BookingCreateResponse(
        booking_id=str(booking.id),
        gateway_order_id=order["id"],
        amount=total,
    )


@router.get("/my")
async def my_bookings(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bookings = (await db.execute(
        select(Booking).where(Booking.client_id == uuid.UUID(current_user["sub"]))
    )).scalars().all()
    return [
        {
            "id": str(b.id),
            "property_id": str(b.property_id),
            "check_in": b.check_in.isoformat(),
            "check_out": b.check_out.isoformat(),
            "total_nights": b.total_nights,
            "total_amount": b.total_amount,
            "status": b.status.value,
            "refund_status": b.refund_status,
        }
        for b in bookings
    ]


@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    booking = (await db.execute(
        select(Booking).where(Booking.id == uuid.UUID(booking_id))
    )).scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if str(booking.client_id) != current_user["sub"]:
        raise HTTPException(403, "Not your booking")
    if booking.status not in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
        raise HTTPException(400, "Cannot cancel this booking")

    booking.status = BookingStatus.CANCELLED
    booking.cancellation_reason = body.get("reason", "")
    booking.refund_status = "processing"

    if booking.payment and booking.payment.gateway_payment_id:
        rz.payment.refund(booking.payment.gateway_payment_id,
                          {"amount": int(booking.total_amount * 100)})
        booking.payment.status = PaymentStatus.REFUNDED

    await db.commit()
    return {"status": "cancelled", "refund_status": "processing"}


@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    try:
        rz.utility.verify_webhook_signature(payload.decode(), sig, settings.RAZORPAY_KEY_SECRET)
    except Exception:
        raise HTTPException(400, "Invalid webhook signature")

    event = json.loads(payload)
    entity = event.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = entity.get("order_id")
    payment_id = entity.get("id")
    status = entity.get("status")

    payment = (await db.execute(
        select(Payment).where(Payment.gateway_order_id == order_id)
    )).scalar_one_or_none()

    if payment and status == "captured":
        payment.gateway_payment_id = payment_id
        payment.status = PaymentStatus.CAPTURED
        payment.booking.status = BookingStatus.CONFIRMED

    await db.commit()
    return {"status": "ok"}
