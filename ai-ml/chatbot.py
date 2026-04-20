#backend/app/ai/chatbot.py

from __future__ import annotations
import json
from typing import Any, Dict, List

import google.generativeai as genai
import redis.asyncio as aioredis
import structlog

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from pinecone import Pinecone, ServerlessSpec

from app.core.config import get_settings

settings = get_settings()
logger = structlog.get_logger(__name__)

# ── Gemini setup ─────────────────────────────────────────
genai.configure(api_key=settings.GEMINI_API_KEY)

llm = ChatGoogleGenerativeAI(
    model=settings.GEMINI_MODEL,
    google_api_key=settings.GEMINI_API_KEY,
    temperature=0.2,
)

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key=settings.GEMINI_API_KEY,
)

# ── Pinecone setup ───────────────────────────────────────
pc = Pinecone(api_key=settings.PINECONE_API_KEY)


def get_index():
    existing = [i.name for i in pc.list_indexes()]
    if settings.PINECONE_INDEX not in existing:
        pc.create_index(
            name=settings.PINECONE_INDEX,
            dimension=3072,   # ✅ FIXED
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region=settings.PINECONE_ENV),
        )
    return pc.Index(settings.PINECONE_INDEX)


# ── Entity Extraction ─────────────────────────────────────
async def extract_entities(message: str) -> Dict[str, Any]:
    prompt = f"""
Extract:
location, budget_max, property_type, bedrooms, is_area_query

Return ONLY JSON.

User: {message}
"""
    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(prompt)
        text = response.text.strip()

        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        return json.loads(text.strip())
    except Exception as e:
        logger.error("entity_error", error=str(e))
        return {}


# ── Pinecone Search ───────────────────────────────────────
async def rag_search_properties(entities: Dict[str, Any], top_k: int = 5):

    parts = []
    if entities.get("bedrooms"):
        parts.append(f"{entities['bedrooms']}BHK")
    if entities.get("property_type"):
        parts.append(entities["property_type"])
    if entities.get("location"):
        parts.append(f"near {entities['location']}")
    if entities.get("budget_max"):
        parts.append(f"under ₹{entities['budget_max']}")

    query_text = " ".join(parts) if parts else "rental apartment"

    try:
        query_vector = [0.1] * 3072

        filters: Dict[str, Any] = {"status": {"$eq": "active"}}

        if entities.get("property_type"):
            filters["property_type"] = {"$eq": entities["property_type"]}
        if entities.get("bedrooms"):
            filters["bedrooms"] = {"$eq": int(entities["bedrooms"])}
        if entities.get("budget_max"):
            filters["price_per_month"] = {"$lte": float(entities["budget_max"])}

        vector = [0.1] * 3072
        index = get_index()

        results = index.query(
            vector=query_vector,
            top_k=top_k,
            filter=filters,
            include_metadata=True,
        )

        # 🔥 fallback
        if not results.matches:
            results = index.query(
                vector=query_vector,
                top_k=top_k,
                include_metadata=True,
            )

        properties = []
        for m in results.matches:
            if m.score < -1:
                continue

            meta = m.metadata or {}

            properties.append({
                "id": m.id,
                "title": meta.get("title", ""),
                "city": meta.get("city", ""),
                "neighbourhood": meta.get("neighbourhood", ""),
                "property_type": meta.get("property_type", ""),
                "bedrooms": meta.get("bedrooms", 0),
                "price_per_month": meta.get("price_per_month", 0),
                "avg_rating": meta.get("avg_rating", 0),
                "fair_price_badge": meta.get("fair_price_badge", False),
                "score": round(m.score, 3),
                "deep_link": f"/property/{m.id}",
            })

        return properties

    except Exception as e:
        logger.error("pinecone_error", error=str(e))
        return []


# ── Chat Engine ───────────────────────────────────────────
class ChatbotEngine:
    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client

    async def chat(self, session_id: str, user_message: str):

        # 🔹 Safe Redis load
        history_key = f"chat:{session_id}"
        raw = None

        try:
            history = json.loads(raw) if raw else []
        except:
            history = []

        # 🔹 Extract entities
        entities = await extract_entities(user_message)

        # 🔹 Search
        properties = await rag_search_properties(entities)

        # 🔹 Build context
        context = ""
        if properties:
            for i, p in enumerate(properties, 1):
                context += f"""
{i}. {p['title']}
📍 {p['neighbourhood']}, {p['city']}
🛏 {p['bedrooms']}BHK
💰 ₹{p['price_per_month']}/month
"""

        final_input = user_message
        if context:
            final_input += f"\n\nAvailable Properties:\n{context}"

        # 🔹 LLM call (LangChain)
        try:
            response = llm.invoke(final_input)
            reply = response.content
        except Exception as e:
            logger.error("llm_error", error=str(e))
            reply = "Error generating response."

        # 🔹 Save history
        history.append({"human": user_message, "ai": reply})
        history = history[-20:]
        #await self.redis.setex(history_key, 3600, json.dumps(history))

        return {
            "session_id": session_id,
            "response": reply,
            "properties": properties,
        }


# ── Index Property ────────────────────────────────────────
async def index_property_to_pinecone(property_data: Dict[str, Any]):

    try:


        vector = [0.1] * 3072
        index = get_index()

        index.upsert([{
            "id": str(property_data["id"]),
            "values": vector,
            "metadata": {
                "title": property_data.get("title", ""),
                "city": property_data.get("city", ""),
                "neighbourhood": property_data.get("neighbourhood", ""),
                "property_type": property_data.get("property_type", ""),
                "bedrooms": int(property_data.get("bedrooms", 0)),
                "price_per_month": float(property_data.get("price_per_month", 0)),
                "avg_rating": float(property_data.get("avg_rating", 0)),
                "fair_price_badge": bool(property_data.get("fair_price_badge", False)),
                "status": property_data.get("status", "active"),
            }
        }])
        print("✅ Inserted:", property_data["title"])
        return True

    except Exception as e:
        logger.error("index_error", error=str(e))
        return False