"""
app/ai/chatbot.py
────────────────────────────────────────────────────────────────
RentSmart AI Chatbot — Google Gemini 1.5 Pro + LangChain + Pinecone RAG

Flow:
  1. User message → Gemini extracts entities (location, budget, type, beds)
  2. Entities → Gemini Embedding → Pinecone similarity search
  3. Top-5 property results retrieved from DB
  4. Gemini generates grounded response with property cards
  5. Conversation history stored in Redis (multi-turn)

US-BOT01 · US-BOT02 · US-BOT03
"""
from __future__ import annotations
import json
from typing import Any, Dict, List, Optional

import google.generativeai as genai
import redis.asyncio as aioredis
import structlog
# memory import removed
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from pinecone import Pinecone, ServerlessSpec

from app.core.config import get_settings

settings = get_settings()
logger = structlog.get_logger(__name__)

# ── Gemini setup ──────────────────────────────────────────────────────────
genai.configure(api_key=settings.GEMINI_API_KEY)

llm = ChatGoogleGenerativeAI(
    model=settings.GEMINI_MODEL,
    google_api_key=settings.GEMINI_API_KEY,
    temperature=0.2,
    convert_system_message_to_human=True,
)

embeddings = GoogleGenerativeAIEmbeddings(
    model=settings.GEMINI_EMBEDDING_MODEL,
    google_api_key=settings.GEMINI_API_KEY,
)

# ── Pinecone setup ────────────────────────────────────────────────────────
pc = Pinecone(api_key=settings.PINECONE_API_KEY)


def get_index():
    existing = [i.name for i in pc.list_indexes()]
    if settings.PINECONE_INDEX not in existing:
        pc.create_index(
            name=settings.PINECONE_INDEX,
            dimension=768,    # Gemini embedding-001 dimension
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region=settings.PINECONE_ENV),
        )
    return pc.Index(settings.PINECONE_INDEX)


# ── Entity Extraction via Gemini ──────────────────────────────────────────

async def extract_entities(message: str) -> Dict[str, Any]:
    """
    Use Gemini to extract structured rental search entities from natural language.
    Example: "2BHK near MG Road under 25k" →
             {"location": "MG Road", "budget_max": 25000, "property_type": "apartment", "bedrooms": 2}
    """
    prompt = f"""You are a rental search entity extractor. Extract from the user message:
- location: neighbourhood or city name (string or null)
- budget_max: maximum monthly rent in INR as a number (number or null)  
- property_type: one of apartment|villa|studio|pg|house (string or null)
- bedrooms: number of bedrooms as integer (integer or null)
- is_area_query: true if user is asking about area prices/trends (boolean)

Respond ONLY with valid JSON. No explanation, no markdown.

User message: "{message}"
"""
    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception as e:
        logger.error("entity_extraction_failed", error=str(e))
        return {}


# ── Pinecone RAG Search ────────────────────────────────────────────────────

async def rag_search_properties(entities: Dict[str, Any], top_k: int = 5) -> List[Dict]:
    """
    Embed the search query using Gemini embeddings, then search Pinecone
    for semantically similar properties. Apply metadata filters.
    """
    # Build descriptive text for embedding
    parts = []
    if entities.get("bedrooms"):
        parts.append(f"{entities['bedrooms']}BHK")
    if entities.get("property_type"):
        parts.append(entities["property_type"])
    if entities.get("location"):
        parts.append(f"near {entities['location']}")
    if entities.get("budget_max"):
        parts.append(f"under ₹{entities['budget_max']} per month")

    query_text = " ".join(parts) if parts else "rental apartment"

    try:
        # Get Gemini embedding for the query
        query_vector = embeddings.embed_query(query_text)

        # Build Pinecone metadata filters
        filters: Dict[str, Any] = {"status": {"$eq": "active"}}
        if entities.get("property_type"):
            filters["property_type"] = {"$eq": entities["property_type"]}
        if entities.get("bedrooms"):
            filters["bedrooms"] = {"$eq": int(entities["bedrooms"])}
        if entities.get("budget_max"):
            filters["price_per_month"] = {"$lte": float(entities["budget_max"])}

        index = get_index()
        results = index.query(
            vector=query_vector,
            top_k=top_k,
            filter=filters,
            include_metadata=True,
        )

        return [
            {
                "id": m.id,
                "title": m.metadata.get("title", ""),
                "city": m.metadata.get("city", ""),
                "neighbourhood": m.metadata.get("neighbourhood", ""),
                "property_type": m.metadata.get("property_type", ""),
                "bedrooms": m.metadata.get("bedrooms"),
                "price_per_month": m.metadata.get("price_per_month"),
                "avg_rating": m.metadata.get("avg_rating", 0),
                "fair_price_badge": m.metadata.get("fair_price_badge", False),
                "primary_photo": m.metadata.get("primary_photo", ""),
                "deep_link": f"/property/{m.id}",
                "score": round(m.score, 3),
            }
            for m in results.matches
        ]
    except Exception as e:
        logger.error("pinecone_search_failed", error=str(e))
        return []


# ── Area Rent Guide ────────────────────────────────────────────────────────

async def get_area_guide(neighbourhood: str) -> Dict[str, Any]:
    """
    Retrieve area rent stats from Pinecone metadata aggregation.
    Returns median rent, P25/P75, and trend indicator.
    """
    try:
        query_vector = embeddings.embed_query(f"rental price {neighbourhood}")
        index = get_index()
        results = index.query(
            vector=query_vector,
            top_k=50,
            filter={"neighbourhood": {"$eq": neighbourhood}, "status": {"$eq": "active"}},
            include_metadata=True,
        )

        prices = [
            m.metadata["price_per_month"]
            for m in results.matches
            if m.metadata.get("price_per_month")
        ]

        if not prices:
            return {"error": f"No data available for {neighbourhood}"}

        sorted_prices = sorted(prices)
        n = len(sorted_prices)
        median = sorted_prices[n // 2]
        p25 = sorted_prices[int(n * 0.25)]
        p75 = sorted_prices[int(n * 0.75)]

        return {
            "neighbourhood": neighbourhood,
            "listings_count": n,
            "median_rent": round(median),
            "p25_rent": round(p25),
            "p75_rent": round(p75),
            "trend": "stable",   # real: compute from time-series in DB
            "currency": "INR",
        }
    except Exception as e:
        logger.error("area_guide_failed", error=str(e))
        return {"error": str(e)}


# ── System Prompt ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are RentBot, RentSmart's helpful AI assistant for finding rental properties in India.

Your capabilities:
1. Find rental properties matching user requirements (location, budget, bedrooms, type)
2. Provide area rent price guides and market trends
3. Answer questions about the booking process

Response guidelines:
- Be concise, friendly, and helpful
- Always show prices in ₹ (INR) format like ₹25,000/month
- When listing properties, present them as numbered cards with key details
- Include "Book this →" deep links for each property
- If the query is ambiguous, ask ONE clarifying question
- Never make up property details — only use data provided to you

When you receive property search results, format each property like:
**1. [Title]** ⭐ [rating]
📍 [neighbourhood], [city]  |  🛏 [beds]BHK  |  💰 ₹[price]/month
[Fair Price ✓] (if applicable)
👉 [Book this →](/property/[id])
"""


# ── Main Chat Engine ──────────────────────────────────────────────────────

class ChatbotEngine:
    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client

    async def chat(self, session_id: str, user_message: str) -> Dict[str, Any]:
        # 1. Load conversation history from Redis
        history_key = f"chat:history:{session_id}"
        raw = await self.redis.get(history_key)
        history: List[Dict] = json.loads(raw) if raw else []

        # 2. Extract entities from user message
        entities = await extract_entities(user_message)
        logger.info("chatbot.entities", session_id=session_id, entities=entities)

        matched_properties: List[Dict] = []
        context_data = ""

        # 3. RAG: search properties if it's a property query
        if entities and not entities.get("is_area_query"):
            matched_properties = await rag_search_properties(entities)
            if matched_properties:
                prop_lines = []
                for i, p in enumerate(matched_properties, 1):
                    badge = " ✅ Fair Price" if p.get("fair_price_badge") else ""
                    prop_lines.append(
                        f"{i}. **{p['title']}** ⭐{p['avg_rating']}\n"
                        f"   📍 {p.get('neighbourhood','')}, {p['city']} | "
                        f"🛏 {p.get('bedrooms','')}BHK | "
                        f"💰 ₹{p['price_per_month']:,.0f}/month{badge}\n"
                        f"   👉 [Book this →]({p['deep_link']})"
                    )
                context_data = "PROPERTY RESULTS:\n" + "\n".join(prop_lines)

        # 4. Area guide if user is asking about neighbourhood prices
        elif entities.get("is_area_query") and entities.get("location"):
            guide = await get_area_guide(entities["location"])
            if "error" not in guide:
                context_data = (
                    f"AREA DATA for {guide['neighbourhood']}:\n"
                    f"Median Rent: ₹{guide['median_rent']:,}/month\n"
                    f"Range: ₹{guide['p25_rent']:,} – ₹{guide['p75_rent']:,}/month\n"
                    f"Active Listings: {guide['listings_count']}\n"
                    f"Trend: {guide['trend'].title()}"
                )

        # 5. Build conversation messages for Gemini
        messages = [{"role": "user", "parts": [SYSTEM_PROMPT]}]

        # Add history
        for turn in history[-10:]:   # last 10 turns
            messages.append({"role": "user", "parts": [turn["human"]]})
            messages.append({"role": "model", "parts": [turn["ai"]]})

        # Current user message with context
        user_content = user_message
        if context_data:
            user_content = f"{user_message}\n\n[CONTEXT]\n{context_data}"

        messages.append({"role": "user", "parts": [user_content]})

        # 6. Call Gemini
        try:
            model = genai.GenerativeModel(settings.GEMINI_MODEL)
            chat = model.start_chat(history=messages[:-1])
            response = chat.send_message(user_content)
            reply = response.text
        except Exception as e:
            logger.error("gemini_error", error=str(e))
            reply = (
                "I'm having trouble connecting right now. "
                "Please try again in a moment!"
            )

        # 7. Persist updated history in Redis (1 hour TTL)
        history.append({"human": user_message, "ai": reply})
        history = history[-20:]   # keep last 20 turns
        await self.redis.setex(history_key, 3600, json.dumps(history))

        return {
            "session_id": session_id,
            "response": reply,
            "properties": matched_properties,
        }


# ── Pinecone Indexing (called when property is created/updated) ───────────

async def index_property_to_pinecone(property_data: Dict[str, Any]) -> bool:
    """
    Create a rich text embedding of a property and upsert into Pinecone.
    Call this whenever a property is created or updated.
    """
    try:
        text = (
            f"{property_data.get('bedrooms', '')}BHK "
            f"{property_data.get('property_type', '')} "
            f"in {property_data.get('neighbourhood', '')} "
            f"{property_data.get('city', '')}. "
            f"Price ₹{property_data.get('price_per_month', 0)}/month. "
            f"Amenities: {', '.join(property_data.get('amenities', []))}. "
            f"{property_data.get('description', '')}"
        )

        vector = embeddings.embed_query(text)
        index = get_index()

        index.upsert(vectors=[{
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
                "primary_photo": property_data.get("primary_photo", ""),
            },
        }])
        logger.info("pinecone.indexed", id=property_data["id"])
        return True
    except Exception as e:
        logger.error("pinecone.index_failed", error=str(e))
        return False
