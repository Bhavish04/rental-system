"""app/models/models.py — All SQLAlchemy ORM models"""
from __future__ import annotations
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


# ── Enums ──────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    CLIENT = "client"
    OWNER = "owner"
    ADMIN = "admin"

class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    AUTO_DECLINED = "auto_declined"

class PropertyStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    ACTIVE = "active"
    INACTIVE = "inactive"
    REJECTED = "rejected"

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    CAPTURED = "captured"
    REFUNDED = "refunded"
    FAILED = "failed"


# ── Users ──────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=True)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.CLIENT, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    avatar_url = Column(String(512), nullable=True)
    sso_provider = Column(String(50), nullable=True)
    notification_prefs = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    bookings = relationship("Booking", back_populates="client", foreign_keys="Booking.client_id")
    properties = relationship("Property", back_populates="owner")
    wishlist = relationship("Wishlist", back_populates="user")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    token_hash = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Properties ─────────────────────────────────────────────────────────────

class Property(Base):
    __tablename__ = "properties"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    property_type = Column(String(50), nullable=False)   # apartment|villa|studio|pg
    bedrooms = Column(Integer, nullable=False)
    bathrooms = Column(Integer, nullable=False)
    area_sqft = Column(Float)
    floor = Column(Integer)
    building_age_years = Column(Integer)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False, index=True)
    neighbourhood = Column(String(100), index=True)
    pincode = Column(String(20))
    latitude = Column(Float)
    longitude = Column(Float)
    price_per_month = Column(Float, nullable=False)
    suggested_price = Column(Float)
    fair_price_badge = Column(Boolean, default=False)
    amenities = Column(JSONB, default=list)
    status = Column(Enum(PropertyStatus), default=PropertyStatus.DRAFT)
    avg_rating = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="properties")
    photos = relationship("PropertyPhoto", back_populates="property", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="property")
    reviews = relationship("Review", back_populates="property")
    availability = relationship("Availability", back_populates="property", cascade="all, delete-orphan")


class PropertyPhoto(Base):
    __tablename__ = "property_photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"))
    url = Column(String(512), nullable=False)
    is_primary = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    property = relationship("Property", back_populates="photos")


class Availability(Base):
    __tablename__ = "availability"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), index=True)
    blocked_date = Column(DateTime(timezone=True), nullable=False)
    reason = Column(String(50), default="owner_block")
    __table_args__ = (UniqueConstraint("property_id", "blocked_date"),)

    property = relationship("Property", back_populates="availability")


# ── Bookings ───────────────────────────────────────────────────────────────

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    check_in = Column(DateTime(timezone=True), nullable=False)
    check_out = Column(DateTime(timezone=True), nullable=False)
    total_nights = Column(Integer, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING)
    cancellation_reason = Column(Text)
    refund_status = Column(String(50))
    auto_decline_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    client = relationship("User", back_populates="bookings", foreign_keys=[client_id])
    property = relationship("Property", back_populates="bookings")
    payment = relationship("Payment", back_populates="booking", uselist=False)
    review = relationship("Review", back_populates="booking", uselist=False)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), unique=True, nullable=False)
    gateway = Column(String(20), nullable=False)
    gateway_order_id = Column(String(255), unique=True)
    gateway_payment_id = Column(String(255), unique=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    webhook_events = Column(JSONB, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    booking = relationship("Booking", back_populates="payment")


# ── Reviews ────────────────────────────────────────────────────────────────

class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), unique=True, nullable=False)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, index=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    body = Column(Text)
    owner_reply = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    booking = relationship("Booking", back_populates="review")
    property = relationship("Property", back_populates="reviews")


# ── Wishlist ───────────────────────────────────────────────────────────────

class Wishlist(Base):
    __tablename__ = "wishlist"
    __table_args__ = (UniqueConstraint("user_id", "property_id"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="wishlist")


# ── Moderation Log ─────────────────────────────────────────────────────────

class ModerationLog(Base):
    __tablename__ = "moderation_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"))
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False)   # approve|reject|flag
    ai_result = Column(JSONB)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
