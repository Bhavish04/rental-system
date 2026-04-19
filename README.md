# 🏠 RentSmart — AI-Powered Rental Booking Platform

**Stack:** React.js · Python FastAPI · PostgreSQL · Google Gemini · Pinecone

---

## 📁 Project Structure

```
rentsmart/
├── frontend/                    ← React.js (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/          ← Reusable UI components
│   │   │   ├── common/          ← Button, Card, Modal, Badge, Input
│   │   │   ├── layout/          ← Navbar, Footer, Sidebar
│   │   │   ├── property/        ← PropertyCard, PropertyDetail, SearchBar
│   │   │   ├── booking/         ← BookingForm, BookingCard, Calendar
│   │   │   ├── chat/            ← ChatWidget, ChatMessage, ChatInput
│   │   │   ├── analyser/        ← PriceAnalyser, TrendChart, CompsTable
│   │   │   ├── admin/           ← ReportsPanel, Leaderboard, ModerationQueue
│   │   │   └── auth/            ← LoginForm, RegisterForm, OTPVerify
│   │   ├── pages/               ← Home, Search, PropertyDetail, Dashboard, Admin
│   │   ├── hooks/               ← useAuth, useProperties, useBooking, useChat
│   │   ├── context/             ← AuthContext, CartContext
│   │   ├── lib/                 ← axios instance, helpers, constants
│   │   └── styles/              ← global.css, tailwind config
│   ├── package.json
│   └── vite.config.js
│
├── backend/                     ← Python FastAPI
│   ├── app/
│   │   ├── main.py              ← FastAPI app entry
│   │   ├── core/
│   │   │   ├── config.py        ← Pydantic settings
│   │   │   ├── security.py      ← JWT + password hashing
│   │   │   └── database.py      ← SQLAlchemy async engine
│   │   ├── models/              ← SQLAlchemy ORM models
│   │   ├── schemas/             ← Pydantic request/response schemas
│   │   ├── api/v1/endpoints/    ← Route handlers (auth, properties, bookings, admin, ai)
│   │   ├── services/            ← Business logic services
│   │   └── ai/
│   │       ├── chatbot.py       ← 🤖 Gemini + LangChain + Pinecone RAG
│   │       └── analyser.py      ← 📊 XGBoost price model + trends + comps
│   ├── alembic/                 ← DB migrations
│   ├── requirements.txt
│   └── Dockerfile
│
└── database/
    ├── schema.sql               ← Complete PostgreSQL schema
    ├── seeds.sql                ← Sample data
    └── elasticsearch_mapping.json
```

---

## 🚀 Quick Start

### 1. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in your API keys
alembic upgrade head          # run migrations
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local    # set VITE_API_URL=http://localhost:8000
npm run dev                   # http://localhost:5173
```

### 3. Docker (everything)
```bash
cp .env.example .env
docker compose up --build
# Frontend → http://localhost:3000
# API docs → http://localhost:8000/docs
```

---

## 🔑 Required API Keys (.env)

| Key | Where to get |
|-----|-------------|
| `GEMINI_API_KEY` | https://aistudio.google.com |
| `PINECONE_API_KEY` | https://pinecone.io |
| `RAZORPAY_KEY_ID/SECRET` | https://razorpay.com |
| `SENDGRID_API_KEY` | https://sendgrid.com |
| `TWILIO_*` | https://twilio.com |

---

## 🤖 AI/ML Features

- **Chatbot**: Gemini 1.5 Pro + Pinecone RAG — natural language property search
- **Price Analyser**: XGBoost model — predicts optimal rent with P25/P75 range
- **Trend Chart**: 12-month rent trends (median, P25, P75) per neighbourhood
- **Comparables**: Top-10 similar listings with feature-diff table
- **AI Moderation**: Gemini reviews listings for policy violations automatically
