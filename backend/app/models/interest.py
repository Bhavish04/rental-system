from sqlalchemy import Column, Integer, DateTime, UniqueConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class PropertyInterest(Base):
    __tablename__ = "property_interests"
    id = Column(Integer, primary_key=True)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    __table_args__ = (UniqueConstraint("property_id", "buyer_id"),)