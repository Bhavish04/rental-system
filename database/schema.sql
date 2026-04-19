-- ================================================================
-- RentSmart — Complete PostgreSQL Schema
-- Stack: PostgreSQL 16 · PostGIS · UUID
-- Run: psql -U rentsmart -d rentsmart -f schema.sql
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enums ──────────────────────────────────────────────────────
CREATE TYPE user_role        AS ENUM ('client','owner','admin');
CREATE TYPE booking_status   AS ENUM ('pending','confirmed','cancelled','completed','auto_declined');
CREATE TYPE property_status  AS ENUM ('draft','pending_review','active','inactive','rejected');
CREATE TYPE payment_status   AS ENUM ('pending','captured','refunded','failed');

-- ── Users ───────────────────────────────────────────────────────
CREATE TABLE users (
    id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               VARCHAR(255) UNIQUE NOT NULL,
    phone               VARCHAR(20)  UNIQUE,
    full_name           VARCHAR(255) NOT NULL,
    password_hash       VARCHAR(255),
    role                user_role    NOT NULL DEFAULT 'client',
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    is_verified         BOOLEAN      NOT NULL DEFAULT FALSE,
    avatar_url          VARCHAR(512),
    sso_provider        VARCHAR(50),
    sso_uid             VARCHAR(255),
    notification_prefs  JSONB        NOT NULL DEFAULT '{"email":true,"sms":true}',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ── Refresh Tokens ─────────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) UNIQUE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Properties ──────────────────────────────────────────────────
CREATE TABLE properties (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id            UUID            NOT NULL REFERENCES users(id),
    title               VARCHAR(255)    NOT NULL,
    description         TEXT,
    property_type       VARCHAR(50)     NOT NULL,
    bedrooms            INTEGER         NOT NULL,
    bathrooms           INTEGER         NOT NULL,
    area_sqft           FLOAT,
    floor               INTEGER,
    building_age_years  INTEGER,
    address             TEXT            NOT NULL,
    city                VARCHAR(100)    NOT NULL,
    neighbourhood       VARCHAR(100),
    pincode             VARCHAR(20),
    latitude            FLOAT,
    longitude           FLOAT,
    price_per_month     FLOAT           NOT NULL,
    suggested_price     FLOAT,
    fair_price_badge    BOOLEAN         NOT NULL DEFAULT FALSE,
    amenities           JSONB           NOT NULL DEFAULT '[]',
    status              property_status NOT NULL DEFAULT 'draft',
    avg_rating          FLOAT           NOT NULL DEFAULT 0,
    total_reviews       INTEGER         NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_prop_owner        ON properties(owner_id);
CREATE INDEX idx_prop_city         ON properties(city);
CREATE INDEX idx_prop_neighbourhood ON properties(neighbourhood);
CREATE INDEX idx_prop_status       ON properties(status);
CREATE INDEX idx_prop_type         ON properties(property_type);
CREATE INDEX idx_prop_price        ON properties(price_per_month);

-- ── Property Photos ─────────────────────────────────────────────
CREATE TABLE property_photos (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    url         VARCHAR(512) NOT NULL,
    is_primary  BOOLEAN     NOT NULL DEFAULT FALSE,
    sort_order  INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Availability (blocked dates) ───────────────────────────────
CREATE TABLE availability (
    id           UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id  UUID  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    blocked_date DATE  NOT NULL,
    reason       VARCHAR(50) DEFAULT 'owner_block',
    UNIQUE(property_id, blocked_date)
);
CREATE INDEX idx_avail_property ON availability(property_id);

-- ── Bookings ────────────────────────────────────────────────────
CREATE TABLE bookings (
    id                   UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id            UUID           NOT NULL REFERENCES users(id),
    property_id          UUID           NOT NULL REFERENCES properties(id),
    check_in             TIMESTAMPTZ    NOT NULL,
    check_out            TIMESTAMPTZ    NOT NULL,
    total_nights         INTEGER        NOT NULL,
    total_amount         FLOAT          NOT NULL,
    status               booking_status NOT NULL DEFAULT 'pending',
    cancellation_reason  TEXT,
    refund_status        VARCHAR(50),
    auto_decline_at      TIMESTAMPTZ,
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bookings_client   ON bookings(client_id);
CREATE INDEX idx_bookings_property ON bookings(property_id);
CREATE INDEX idx_bookings_status   ON bookings(status);
CREATE INDEX idx_bookings_dates    ON bookings(check_in, check_out);

-- ── Payments ────────────────────────────────────────────────────
CREATE TABLE payments (
    id                  UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id          UUID           UNIQUE NOT NULL REFERENCES bookings(id),
    gateway             VARCHAR(20)    NOT NULL,
    gateway_order_id    VARCHAR(255)   UNIQUE,
    gateway_payment_id  VARCHAR(255)   UNIQUE,
    amount              FLOAT          NOT NULL,
    currency            VARCHAR(10)    NOT NULL DEFAULT 'INR',
    status              payment_status NOT NULL DEFAULT 'pending',
    webhook_events      JSONB          NOT NULL DEFAULT '[]',
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── Reviews ─────────────────────────────────────────────────────
CREATE TABLE reviews (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id  UUID        UNIQUE NOT NULL REFERENCES bookings(id),
    property_id UUID        NOT NULL REFERENCES properties(id),
    author_id   UUID        NOT NULL REFERENCES users(id),
    rating      INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body        TEXT,
    owner_reply TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reviews_property ON reviews(property_id);

-- ── Wishlist ────────────────────────────────────────────────────
CREATE TABLE wishlist (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, property_id)
);

-- ── Saved Searches ──────────────────────────────────────────────
CREATE TABLE saved_searches (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(100),
    filters    JSONB       NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Moderation Log ──────────────────────────────────────────────
CREATE TABLE moderation_log (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID        NOT NULL REFERENCES properties(id),
    admin_id    UUID        REFERENCES users(id),
    action      VARCHAR(50) NOT NULL,
    ai_result   JSONB,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mod_property ON moderation_log(property_id);

-- ── ML Model Versions ───────────────────────────────────────────
CREATE TABLE ml_model_versions (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name   VARCHAR(100) NOT NULL,
    version      VARCHAR(50)  NOT NULL,
    mae_pct      FLOAT,
    n_train      INTEGER,
    metrics      JSONB,
    is_active    BOOLEAN     NOT NULL DEFAULT FALSE,
    trained_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Auto updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','properties','bookings','payments','reviews']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_upd_%I BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t
    );
  END LOOP;
END;
$$;

-- ── Auto avg_rating update on new review ───────────────────────
CREATE OR REPLACE FUNCTION update_property_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE properties
  SET avg_rating    = (SELECT COALESCE(AVG(rating),0) FROM reviews WHERE property_id = NEW.property_id),
      total_reviews = (SELECT COUNT(*)               FROM reviews WHERE property_id = NEW.property_id)
  WHERE id = NEW.property_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_property_rating();
