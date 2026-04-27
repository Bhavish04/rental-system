"""app/main.py — FastAPI application entry point"""
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.endpoints.deals import router as deals_router

from app.core.config import get_settings
from app.api.v1.endpoints import auth, properties, bookings, reviews, ai, admin

settings = get_settings()
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("rentsmart.startup", env=settings.ENV)
    yield
    logger.info("rentsmart.shutdown")

app = FastAPI(
    title="RentSmart API",
    version="1.0.0",
    description="AI-Powered Rental Booking Platform — Gemini + Pinecone + XGBoost",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Health check
@app.get("/health", tags=["ops"])

# Health check
@app.get("/health", tags=["ops"])
async def health():
    return {"status": "ok", "version": "1.0.0", "env": settings.ENV}

# Global error handler
@app.exception_handler(Exception)
async def global_handler(request, exc):
    logger.error("unhandled_error", path=str(request.url), error=str(exc))
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Register all routers
app.include_router(auth.router,       prefix="/api/v1/auth",       tags=["Auth"])
app.include_router(properties.router, prefix="/api/v1/properties", tags=["Properties"])
app.include_router(bookings.router,   prefix="/api/v1/bookings",   tags=["Bookings"])
app.include_router(reviews.router,    prefix="/api/v1/reviews",    tags=["Reviews"])
app.include_router(ai.router,         prefix="/api/v1/ai",         tags=["AI"])
app.include_router(admin.router,      prefix="/api/v1/admin",      tags=["Admin"])
app.include_router(deals_router,      prefix="/api/v1")