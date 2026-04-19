"""
app/ai/analyser.py
────────────────────────────────────────────────────────────────
RentSmart ML Rental Price Analyser

1. XGBoost price prediction model (US-RA01)
   - Features: location, size, bedrooms, amenities, floor, age, seasonal
   - Target MAE < 8%, accuracy > 85%
   - Weekly retraining via Celery Beat

2. 12-month rent trend chart (US-RA02)
   - PostgreSQL aggregate: median, P25, P75 per neighbourhood

3. Comparable listings engine (US-RA03)
   - Top-10 similar properties with feature-diff table

4. Gemini AI listing moderation (US-A03)
   - Flags discriminatory / spam / policy-violating content
"""
from __future__ import annotations
import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import google.generativeai as genai
import structlog

# Optional ML dependencies
try:
    import joblib
    import numpy as np
    import pandas as pd
    import shap
    from sklearn.metrics import mean_absolute_error
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder, StandardScaler
    from xgboost import XGBRegressor
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    joblib = None
    np = None
    pd = None
    shap = None
    mean_absolute_error = None
    train_test_split = None
    LabelEncoder = None
    StandardScaler = None
    XGBRegressor = None

from app.core.config import get_settings

settings = get_settings()
logger = structlog.get_logger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)

# ── Model artifact paths ──────────────────────────────────────────────────
MODEL_PATH = "/tmp/rentsmart_xgb_model.pkl"
SCALER_PATH = "/tmp/rentsmart_scaler.pkl"
ENCODERS_PATH = "/tmp/rentsmart_encoders.pkl"

CATEGORICAL_FEATURES = ["city", "neighbourhood", "property_type"]
NUMERIC_FEATURES = [
    "bedrooms", "bathrooms", "area_sqft", "floor",
    "building_age_years", "amenity_count",
    "month_sin", "month_cos",
]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


# ═══════════════════════════════════════════════════════════════════════════
# FEATURE ENGINEERING
# ═══════════════════════════════════════════════════════════════════════════

def engineer_features(
    df: pd.DataFrame,
    encoders: Optional[Dict] = None,
    scaler: Optional[StandardScaler] = None,
    fit: bool = False,
) -> Tuple[np.ndarray, Dict, StandardScaler]:
    if not ML_AVAILABLE:
        raise RuntimeError("ML dependencies not available for feature engineering")
    
    df = df.copy()

    # Amenity count
    df["amenity_count"] = df.get("amenities", pd.Series([[] for _ in range(len(df))])).apply(
        lambda x: len(x) if isinstance(x, list) else (len(json.loads(x)) if isinstance(x, str) else 0)
    )

    # Cyclical month encoding (seasonal pricing)
    month = datetime.now().month
    df["month_sin"] = np.sin(2 * np.pi * month / 12)
    df["month_cos"] = np.cos(2 * np.pi * month / 12)

    # Fill numeric nulls
    for col in NUMERIC_FEATURES:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
        else:
            df[col] = 0

    # Categorical encoding
    if fit:
        encoders = {}
        for col in CATEGORICAL_FEATURES:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str).fillna("unknown"))
            encoders[col] = le
    else:
        for col in CATEGORICAL_FEATURES:
            le = encoders[col]
            df[col] = df[col].astype(str).fillna("unknown").apply(
                lambda v: le.transform([v])[0] if v in le.classes_ else -1
            )

    X = df[ALL_FEATURES].values.astype(float)

    if fit:
        scaler = StandardScaler()
        X = scaler.fit_transform(X)
    else:
        X = scaler.transform(X)

    return X, encoders, scaler


# ═══════════════════════════════════════════════════════════════════════════
# MODEL TRAINING
# ═══════════════════════════════════════════════════════════════════════════

def train_model(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Train XGBoost rental price model on a DataFrame of active listings.
    Requires columns: bedrooms, bathrooms, area_sqft, floor, building_age_years,
                      city, neighbourhood, property_type, amenities, price_per_month
    Returns metrics dict.
    """
    if not ML_AVAILABLE:
        return {"error": "ML dependencies not available for model training"}
    
    logger.info("model.training.start", rows=len(df))

    if len(df) < 50:
        return {"error": "Not enough data to train (< 50 samples)"}

    X, encoders, scaler = engineer_features(df, fit=True)
    y = df["price_per_month"].values.astype(float)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = XGBRegressor(
        n_estimators=400,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        n_jobs=-1,
        tree_method="hist",
        eval_metric="mae",
        early_stopping_rounds=30,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    mae_pct = mae / np.mean(y_test) * 100

    # SHAP feature importance
    explainer = shap.TreeExplainer(model)
    shap_vals = explainer.shap_values(X_test[:min(100, len(X_test))])
    importance = {
        feat: round(float(np.abs(shap_vals[:, i]).mean()), 2)
        for i, feat in enumerate(ALL_FEATURES)
    }

    # Persist artifacts
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(encoders, ENCODERS_PATH)

    metrics = {
        "mae": round(mae, 2),
        "mae_pct": round(mae_pct, 2),
        "n_train": len(X_train),
        "n_test": len(X_test),
        "feature_importance": importance,
        "trained_at": datetime.utcnow().isoformat(),
    }
    logger.info("model.training.done", mae_pct=mae_pct)
    return metrics


# ═══════════════════════════════════════════════════════════════════════════
# PRICE PREDICTION (US-RA01)
# ═══════════════════════════════════════════════════════════════════════════

def predict_rent(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict optimal monthly rent for a given property.
    Returns suggested_price, P25/P75 confidence band, top SHAP features.
    """
    if not ML_AVAILABLE:
        base = features.get("bedrooms", 1) * 8000
        return {
            "suggested_price": base,
            "confidence_low": round(base * 0.85),
            "confidence_high": round(base * 1.15),
            "currency": "INR",
            "note": "ML dependencies not installed. Using fallback estimate.",
            "shap_top_features": None,
        }
    
    if not os.path.exists(MODEL_PATH):
        # Return a rule-based estimate as fallback before model is trained
        base = features.get("bedrooms", 1) * 8000
        return {
            "suggested_price": base,
            "confidence_low": round(base * 0.85),
            "confidence_high": round(base * 1.15),
            "currency": "INR",
            "note": "Using fallback estimate — ML model not yet trained.",
            "shap_top_features": None,
        }

    model: XGBRegressor = joblib.load(MODEL_PATH)
    scaler: StandardScaler = joblib.load(SCALER_PATH)
    encoders: Dict = joblib.load(ENCODERS_PATH)

    df = pd.DataFrame([features])
    X, _, _ = engineer_features(df, encoders=encoders, scaler=scaler, fit=False)

    predicted = float(model.predict(X)[0])

    # SHAP explanation for this specific prediction
    explainer = shap.TreeExplainer(model)
    shap_vals = explainer.shap_values(X)[0]
    shap_dict = {feat: round(float(v), 1) for feat, v in zip(ALL_FEATURES, shap_vals)}
    top_features = dict(sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)[:5])

    return {
        "suggested_price": round(predicted),
        "confidence_low": round(predicted * 0.87),
        "confidence_high": round(predicted * 1.13),
        "currency": "INR",
        "shap_top_features": top_features,
    }


# ═══════════════════════════════════════════════════════════════════════════
# RENT TREND CHART (US-RA02)
# ═══════════════════════════════════════════════════════════════════════════

async def get_rent_trend(
    neighbourhood: str,
    property_type: Optional[str],
    db_session,
) -> Dict[str, Any]:
    """
    Return 12-month P25 / median / P75 rent trend for a neighbourhood.
    Queries PostgreSQL using window aggregates.
    """
    from sqlalchemy import text

    result = await db_session.execute(
        text("""
            SELECT
                TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price_per_month) AS p25,
                PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY price_per_month) AS median,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price_per_month) AS p75,
                COUNT(*) AS cnt
            FROM properties
            WHERE neighbourhood ILIKE :neighbourhood
              AND (:ptype IS NULL OR property_type = :ptype)
              AND status = 'active'
              AND created_at >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at)
        """),
        {"neighbourhood": neighbourhood, "ptype": property_type},
    )
    rows = result.fetchall()

    if not rows:
        return {"error": f"No data for neighbourhood: {neighbourhood}"}

    months = [r.month for r in rows]
    p25 = [round(r.p25) for r in rows]
    median = [round(r.median) for r in rows]
    p75 = [round(r.p75) for r in rows]

    yoy = None
    if len(median) >= 2:
        yoy = round((median[-1] - median[0]) / median[0] * 100, 1)

    return {
        "neighbourhood": neighbourhood,
        "property_type": property_type or "all",
        "months": months,
        "p25": p25,
        "median": median,
        "p75": p75,
        "yoy_change_pct": yoy,
        "trend": "rising" if (yoy or 0) > 2 else "falling" if (yoy or 0) < -2 else "stable",
    }


# ═══════════════════════════════════════════════════════════════════════════
# COMPARABLE LISTINGS ENGINE (US-RA03)
# ═══════════════════════════════════════════════════════════════════════════

async def get_comparables(property_id: str, db_session) -> Dict[str, Any]:
    """
    Find up to 10 comparable listings for a subject property.
    Returns a feature-diff table and 'Your price vs comps' summary.
    """
    from sqlalchemy import text
    import statistics

    # Fetch subject property
    subj = (await db_session.execute(
        text("SELECT * FROM properties WHERE id = :id"), {"id": property_id}
    )).fetchone()

    if not subj:
        return {"error": "Property not found"}

    # Fetch comparables: same city + type, ±1 bedroom, ±20% price
    comps_q = await db_session.execute(
        text("""
            SELECT id, title, neighbourhood, bedrooms, bathrooms,
                   area_sqft, price_per_month, avg_rating, amenities, fair_price_badge
            FROM properties
            WHERE city = :city
              AND property_type = :ptype
              AND ABS(bedrooms - :beds) <= 1
              AND status = 'active'
              AND id != :id
              AND price_per_month BETWEEN :min_p AND :max_p
            ORDER BY ABS(price_per_month - :target) ASC
            LIMIT 10
        """),
        {
            "city": subj.city,
            "ptype": subj.property_type,
            "beds": subj.bedrooms,
            "id": property_id,
            "min_p": subj.price_per_month * 0.80,
            "max_p": subj.price_per_month * 1.20,
            "target": subj.price_per_month,
        },
    )
    comps = comps_q.fetchall()

    prices = [c.price_per_month for c in comps]
    comp_median = round(statistics.median(prices)) if prices else None
    pct_vs_median = (
        round((subj.price_per_month - comp_median) / comp_median * 100, 1)
        if comp_median else None
    )

    return {
        "subject": {
            "id": property_id,
            "price": subj.price_per_month,
            "bedrooms": subj.bedrooms,
            "area_sqft": subj.area_sqft,
            "neighbourhood": subj.neighbourhood,
        },
        "comparables": [
            {
                "id": str(c.id),
                "title": c.title,
                "neighbourhood": c.neighbourhood,
                "bedrooms": c.bedrooms,
                "bathrooms": c.bathrooms,
                "area_sqft": c.area_sqft,
                "price_per_month": c.price_per_month,
                "avg_rating": c.avg_rating,
                "fair_price_badge": c.fair_price_badge,
                "price_diff": round(c.price_per_month - subj.price_per_month),
                "bed_diff": c.bedrooms - subj.bedrooms,
                "area_diff": round((c.area_sqft or 0) - (subj.area_sqft or 0)),
            }
            for c in comps
        ],
        "comp_median_price": comp_median,
        "price_vs_median_pct": pct_vs_median,
        "verdict": (
            "Below Market ↓" if (pct_vs_median or 0) < -5 else
            "Above Market ↑" if (pct_vs_median or 0) > 5 else
            "Fair Market Price ✓"
        ),
    }


# ═══════════════════════════════════════════════════════════════════════════
# GEMINI AI LISTING MODERATION (US-A03)
# ═══════════════════════════════════════════════════════════════════════════

async def moderate_listing(title: str, description: str, amenities: List[str]) -> Dict[str, Any]:
    """
    Use Gemini to check a listing for policy violations before publishing.
    Returns: {safe, flags, recommendation, explanation}
    """
    prompt = f"""You are a content moderation AI for an Indian rental platform.
Analyse this listing for policy violations.

Title: {title}
Description: {description or '(none)'}
Amenities: {', '.join(amenities) if amenities else '(none)'}

Check for:
1. Discriminatory language (caste, religion, gender, nationality restrictions)
2. Spam/fake listing indicators (unrealistic pricing, duplicate content)
3. Adult or illegal content
4. Misleading claims about amenities or location

Respond ONLY with JSON (no markdown):
{{
  "safe": true/false,
  "flags": ["list of specific issues found"],
  "recommendation": "approve" | "reject" | "needs_review",
  "explanation": "one sentence reason"
}}"""

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
        logger.error("moderation_failed", error=str(e))
        return {
            "safe": True,
            "flags": [],
            "recommendation": "needs_review",
            "explanation": "AI moderation unavailable — manual review required.",
        }
