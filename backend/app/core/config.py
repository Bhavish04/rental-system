"""app/core/config.py — Central settings loaded from .env"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "RentSmart"
    ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production"

    # PostgreSQL
    DATABASE_URL: str = "postgresql+asyncpg://rentsmart:password@localhost:5432/rentsmart"
    DB_POOL_SIZE: int = 20

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET: str = "jwt-secret-change-in-prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Google Gemini ──────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-pro"
    GEMINI_EMBEDDING_MODEL: str = "models/embedding-001"

    # ── Pinecone ───────────────────────────────────────────────
    PINECONE_API_KEY: str = ""
    PINECONE_ENV: str = "us-east-1"
    PINECONE_INDEX: str = "rentsmart-properties"

    # Payment
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Notifications
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@rentsmart.in"
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    # Google Cloud
    GCS_BUCKET: str = "rentsmart-media"
    GCS_PROJECT: str = "rentsmart-prod"
    GOOGLE_MAPS_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000", "https://rentsmart.in"]

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
