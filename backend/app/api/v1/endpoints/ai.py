"""app/api/v1/endpoints/ai.py — AI endpoints: chatbot + analyser"""
from typing import Optional
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.schemas import ChatRequest, PriceAnalyserRequest
from app.ai.chatbot import ChatbotEngine
from app.ai.analyser import get_comparables, get_rent_trend, predict_rent

settings = get_settings()
router = APIRouter()


async def get_redis():
    client = aioredis.from_url(settings.REDIS_URL)
    try:
        yield client
    finally:
        await client.aclose()


# ── Chatbot ───────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat(
    req: ChatRequest,
    redis: aioredis.Redis = Depends(get_redis),
):
    """
    US-BOT01/02/03 — Natural language property search + area rent guide.
    No auth required (guests can use chatbot).
    """
    engine = ChatbotEngine(redis)
    return await engine.chat(req.session_id, req.message)


# ── Price Analyser ────────────────────────────────────────────────────────

@router.post("/predict-rent")
async def predict_rent_endpoint(req: PriceAnalyserRequest):
    """US-RA01 — Predict optimal monthly rent for a property (XGBoost)."""
    features = req.model_dump()
    return predict_rent(features)


@router.get("/trend")
async def rent_trend(
    neighbourhood: str,
    property_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """US-RA02 — 12-month rent trend chart data (P25/median/P75)."""
    return await get_rent_trend(neighbourhood, property_type, db)


@router.get("/comparables/{property_id}")
async def comparables(
    property_id: str,
    db: AsyncSession = Depends(get_db),
):
    """US-RA03 — Comparable listings with feature-diff table."""
    return await get_comparables(property_id, db)
