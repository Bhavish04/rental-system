"""app/schemas/schemas.py — All Pydantic request/response schemas"""
from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ── Auth ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    phone: Optional[str] = None
    role: str = "client"   # client | owner

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    full_name: str

class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: Optional[str]
    role: str
    is_verified: bool
    avatar_url: Optional[str]

    class Config:
        from_attributes = True


# ── Properties ─────────────────────────────────────────────────────────────

class PropertyCreate(BaseModel):
    title: str
    description: Optional[str] = None
    property_type: str
    bedrooms: int = Field(..., ge=1, le=20)
    bathrooms: int = Field(..., ge=1, le=10)
    area_sqft: Optional[float] = None
    floor: Optional[int] = None
    building_age_years: Optional[int] = None
    address: str
    city: str
    neighbourhood: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    price_per_month: float = Field(..., gt=0)
    amenities: List[str] = []

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price_per_month: Optional[float] = None
    amenities: Optional[List[str]] = None

class PropertyOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    property_type: str
    bedrooms: int
    bathrooms: int
    area_sqft: Optional[float]
    city: str
    neighbourhood: Optional[str]
    address: str
    latitude: Optional[float]
    longitude: Optional[float]
    price_per_month: float
    suggested_price: Optional[float]
    fair_price_badge: bool
    amenities: List[str]
    status: str
    avg_rating: float
    total_reviews: int
    photos: List[Dict] = []
    owner: Optional[Dict] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PropertySearchParams(BaseModel):
    city: Optional[str] = None
    neighbourhood: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: float = 5.0
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    amenities: Optional[List[str]] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, le=100)


# ── Bookings ───────────────────────────────────────────────────────────────

class BookingCreate(BaseModel):
    property_id: UUID
    check_in: datetime
    check_out: datetime
    gateway: str = "razorpay"

class BookingOut(BaseModel):
    id: UUID
    property_id: UUID
    check_in: datetime
    check_out: datetime
    total_nights: int
    total_amount: float
    status: str
    refund_status: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class BookingCreateResponse(BaseModel):
    booking_id: str
    gateway_order_id: str
    amount: float
    currency: str = "INR"


# ── Reviews ────────────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    booking_id: UUID
    rating: int = Field(..., ge=1, le=5)
    body: Optional[str] = None

class ReviewOut(BaseModel):
    id: UUID
    rating: int
    body: Optional[str]
    owner_reply: Optional[str]
    author: Optional[Dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── AI ─────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    session_id: str
    response: str
    properties: List[Dict] = []

class PriceAnalyserRequest(BaseModel):
    city: str
    neighbourhood: str
    property_type: str
    bedrooms: int
    bathrooms: int
    area_sqft: Optional[float] = None
    floor: Optional[int] = None
    building_age_years: Optional[int] = None
    amenities: List[str] = []

class PriceAnalyserResponse(BaseModel):
    suggested_price: float
    confidence_low: float
    confidence_high: float
    currency: str = "INR"
    shap_top_features: Optional[Dict] = None


# ── Admin ──────────────────────────────────────────────────────────────────

class ReportResponse(BaseModel):
    period: str
    start_date: str
    end_date: str
    total_bookings: int
    confirmed_bookings: int
    total_revenue_inr: float
    unique_clients: int
    new_users: int
