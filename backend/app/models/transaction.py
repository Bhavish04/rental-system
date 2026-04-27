from sqlalchemy import Column, Integer, DateTime, String, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class PropertyTransaction(Base):
    __tablename__ = "property_transactions"
    id = Column(Integer, primary_key=True)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="requested")
    offer_price = Column(Numeric(12, 2))
    razorpay_order_id = Column(String(100))
    razorpay_payment_id = Column(String(100))
    contract_path = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())