from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.interest import PropertyInterest
from app.models.transaction import PropertyTransaction
from app.services.contract_service import generate_contract
from app.services.payment_service import create_order, verify_payment
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/deals", tags=["deals"])


# ── Step 4: Buyer marks interest ──────────────────────────────
@router.post("/interest/{property_id}")
async def mark_interest(property_id: uuid.UUID,
                        db: AsyncSession = Depends(get_db),
                        current_user: dict = Depends(get_current_user)):
    buyer_id = uuid.UUID(current_user["sub"])
    existing = await db.execute(
        select(PropertyInterest).where(
            PropertyInterest.property_id == property_id,
            PropertyInterest.buyer_id == buyer_id))
    if existing.scalar():
        raise HTTPException(400, "Already marked interest")
    interest = PropertyInterest(property_id=property_id, buyer_id=buyer_id)
    db.add(interest)
    await db.commit()
    return {"message": "Interest recorded"}


# ── Step 6: Owner sees interested buyers ──────────────────────
@router.get("/interests/{property_id}")
async def get_interested_buyers(property_id: uuid.UUID,
                                db: AsyncSession = Depends(get_db),
                                current_user: dict = Depends(get_current_user)):
    from app.models.models import User
    result = await db.execute(
        select(PropertyInterest, User)
        .join(User, User.id == PropertyInterest.buyer_id)
        .where(PropertyInterest.property_id == property_id))
    return [{"buyer_id": str(u.id), "name": u.full_name,
             "email": u.email, "phone": u.phone, "interested_at": i.created_at}
            for i, u in result.all()]

# ── Step 7: Buyer requests to buy ─────────────────────────────
class BuyRequestSchema(BaseModel):
    offer_price: float

@router.post("/request/{property_id}")
async def request_purchase(property_id: uuid.UUID,
                           body: BuyRequestSchema,
                           db: AsyncSession = Depends(get_db),
                           current_user: dict = Depends(get_current_user)):
    from app.models.models import Property
    buyer_id = uuid.UUID(current_user["sub"])
    prop = await db.get(Property, property_id)
    if not prop:
        raise HTTPException(404, "Property not found")
    txn = PropertyTransaction(
        property_id=property_id,
        buyer_id=buyer_id,
        owner_id=prop.owner_id,
        offer_price=body.offer_price,
        status="requested")
    db.add(txn)
    await db.commit()
    await db.refresh(txn)
    return {"transaction_id": txn.id, "status": txn.status}


# ── Step 8: Owner approves or rejects ─────────────────────────
class DecisionSchema(BaseModel):
    action: str  # "approve" or "reject"

@router.patch("/decision/{txn_id}")
async def owner_decision(txn_id: int,
                         body: DecisionSchema,
                         db: AsyncSession = Depends(get_db),
                         current_user: dict = Depends(get_current_user)):
    owner_id = uuid.UUID(current_user["sub"])
    txn = await db.get(PropertyTransaction, txn_id)
    if not txn or txn.owner_id != owner_id:
        raise HTTPException(403, "Not authorized")
    if body.action == "approve":
        txn.status = "payment_pending"
        order = create_order(float(txn.offer_price), txn.id)
        txn.razorpay_order_id = order["id"]
        await db.commit()
        return {"status": txn.status, "razorpay_order_id": order["id"],
                "amount": float(txn.offer_price)}
    elif body.action == "reject":
        txn.status = "rejected"
        await db.commit()
        return {"status": "rejected"}
    raise HTTPException(400, "Invalid action")


# ── Owner sees all buy requests ───────────────────────────────
@router.get("/owner/requests")
async def get_owner_requests(db: AsyncSession = Depends(get_db),
                             current_user: dict = Depends(get_current_user)):
    from app.models.models import Property
    owner_id = uuid.UUID(current_user["sub"])
    result = await db.execute(
        select(PropertyTransaction, Property)
        .join(Property, Property.id == PropertyTransaction.property_id)
        .where(PropertyTransaction.owner_id == owner_id)
        .order_by(PropertyTransaction.created_at.desc()))
    return [{"id": t.id, "status": t.status,
             "offer_price": float(t.offer_price) if t.offer_price else None,
             "property_title": p.title,
             "property_id": str(p.id),
             "buyer_id": str(t.buyer_id),
             "contract_url": f"/api/v1/deals/contract/{t.id}" if t.contract_path else None}
            for t, p in result.all()]


# ── Buyer sees their own requests ─────────────────────────────
@router.get("/buyer/requests")
async def get_buyer_requests(db: AsyncSession = Depends(get_db),
                             current_user: dict = Depends(get_current_user)):
    from app.models.models import Property
    buyer_id = uuid.UUID(current_user["sub"])
    result = await db.execute(
        select(PropertyTransaction, Property)
        .join(Property, Property.id == PropertyTransaction.property_id)
        .where(PropertyTransaction.buyer_id == buyer_id)
        .order_by(PropertyTransaction.created_at.desc()))
    return [{"id": t.id, "status": t.status,
             "offer_price": float(t.offer_price) if t.offer_price else None,
             "property_title": p.title,
             "razorpay_order_id": t.razorpay_order_id,
             "contract_url": f"/api/v1/deals/contract/{t.id}" if t.contract_path else None}
            for t, p in result.all()]


# ── Step 10: Verify payment + Step 9: Generate contract ───────
class PaymentVerifySchema(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@router.post("/payment/verify/{txn_id}")
async def verify_and_complete(txn_id: int,
                              body: PaymentVerifySchema,
                              db: AsyncSession = Depends(get_db),
                              current_user: dict = Depends(get_current_user)):
    from app.models.models import Property, User
    buyer_id = uuid.UUID(current_user["sub"])
    txn = await db.get(PropertyTransaction, txn_id)
    if not txn or txn.buyer_id != buyer_id:
        raise HTTPException(403, "Not authorized")

    if not verify_payment(body.razorpay_order_id,
                          body.razorpay_payment_id,
                          body.razorpay_signature):
        raise HTTPException(400, "Payment verification failed")

    buyer = await db.get(User, txn.buyer_id)
    owner = await db.get(User, txn.owner_id)
    prop  = await db.get(Property, txn.property_id)

    contract_path = generate_contract(
        txn.id,
        getattr(buyer, 'full_name', str(txn.buyer_id)),
        getattr(owner, 'full_name', str(txn.owner_id)),
        prop.title,
        getattr(prop, 'address', 'N/A'),
        float(txn.offer_price))

    txn.razorpay_payment_id = body.razorpay_payment_id
    txn.contract_path = contract_path
    txn.status = "completed"
    prop.status = "sold"
    await db.commit()
    return {"status": "completed",
            "contract_url": f"/api/v1/deals/contract/{txn_id}"}


# ── Download contract PDF ──────────────────────────────────────
@router.get("/contract/{txn_id}")
async def download_contract(txn_id: int,
                            db: AsyncSession = Depends(get_db),
                            current_user: dict = Depends(get_current_user)):
    current_uid = uuid.UUID(current_user["sub"])
    txn = await db.get(PropertyTransaction, txn_id)
    if not txn or current_uid not in [txn.buyer_id, txn.owner_id]:
        raise HTTPException(403, "Not authorized")
    if not txn.contract_path:
        raise HTTPException(404, "Contract not yet generated")
    return FileResponse(txn.contract_path, media_type="application/pdf",
                        filename=f"contract_{txn_id}.pdf")


# ── Admin: approve/reject property ────────────────────────────
@router.patch("/admin/property/{property_id}")
async def admin_approve_property(property_id: uuid.UUID,
                                 action: str,
                                 db: AsyncSession = Depends(get_db),
                                 current_user: dict = Depends(get_current_user)):
    from app.models.models import Property
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admins only")
    prop = await db.get(Property, property_id)
    if not prop:
        raise HTTPException(404, "Property not found")
    prop.status = "approved" if action == "approve" else "rejected"
    await db.commit()
    return {"property_id": str(property_id), "status": prop.status}

# ── Interest count for all owner properties ───────────────────
@router.get("/owner/interest-counts")
async def get_interest_counts(db: AsyncSession = Depends(get_db),
                              current_user: dict = Depends(get_current_user)):
    from app.models.models import Property
    from sqlalchemy import func
    owner_id = uuid.UUID(current_user["sub"])
    result = await db.execute(
        select(PropertyInterest.property_id, func.count(PropertyInterest.id).label("count"),
               Property.title)
        .join(Property, Property.id == PropertyInterest.property_id)
        .where(Property.owner_id == owner_id)
        .group_by(PropertyInterest.property_id, Property.title))
    return [{"property_id": str(r.property_id), "title": r.title, "count": r.count}
            for r in result.all()]