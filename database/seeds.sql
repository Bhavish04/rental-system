-- ================================================================
-- RentSmart — Seed Data (dev / demo)
-- Run after schema.sql
-- Note: password_hash below = bcrypt("Password123")
-- ================================================================

-- ── Users ──────────────────────────────────────────────────────
INSERT INTO users (id, email, phone, full_name, password_hash, role, is_active, is_verified) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@rentsmart.in',   '+919900000001', 'Super Admin',      '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin',  TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000002', 'owner1@example.com',   '+919900000002', 'Ramesh Kumar',     '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'owner',  TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000003', 'owner2@example.com',   '+919900000003', 'Sunita Sharma',    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'owner',  TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000004', 'client1@example.com',  '+919900000004', 'Aditya Nair',      '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'client', TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000005', 'client2@example.com',  '+919900000005', 'Priya Menon',      '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'client', TRUE, TRUE);

-- Default password for all seed users: Password123

-- ── Properties ──────────────────────────────────────────────────
INSERT INTO properties (
    id, owner_id, title, description, property_type,
    bedrooms, bathrooms, area_sqft, floor, building_age_years,
    address, city, neighbourhood, pincode,
    latitude, longitude, price_per_month,
    amenities, status, avg_rating, total_reviews
) VALUES
(
    'aaa00000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'Spacious 2BHK in Indiranagar',
    'Bright and airy 2BHK apartment with modular kitchen, high-speed WiFi, and 24/7 security. Walking distance to 100 Feet Road and metro station.',
    'apartment', 2, 2, 1100, 3, 5,
    '42, 12th Main Rd, HAL 2nd Stage', 'Bengaluru', 'Indiranagar', '560038',
    12.9784, 77.6408, 28000,
    '["wifi","parking","gym","security","power_backup","lift"]',
    'active', 4.5, 12
),
(
    'aaa00000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'Cosy Studio near Koramangala',
    'Fully furnished studio ideal for working professionals. Minutes from top startups, restaurants, and cafes on 5th Block.',
    'studio', 1, 1, 450, 2, 8,
    '18, 5th Block, Koramangala', 'Bengaluru', 'Koramangala', '560034',
    12.9352, 77.6245, 15000,
    '["wifi","security","power_backup"]',
    'active', 4.2, 8
),
(
    'aaa00000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'Luxury 3BHK Villa — Whitefield',
    'Independent villa with private garden, modular kitchen, 2 covered parking spaces, and 24/7 water supply. 5 mins from ITPL.',
    'villa', 3, 3, 2200, 1, 3,
    '7, Palm Grove Layout, Whitefield', 'Bengaluru', 'Whitefield', '560066',
    12.9698, 77.7500, 55000,
    '["wifi","parking","garden","security","power_backup","water_purifier","air_conditioning"]',
    'active', 4.8, 5
),
(
    'aaa00000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000003',
    '1BHK in Bandra West — Sea View',
    'Well-maintained 1BHK with sea breeze, close to Linking Road and Carter Road promenade. Fully furnished.',
    'apartment', 1, 1, 600, 4, 10,
    '33, Pali Hill, Bandra West', 'Mumbai', 'Bandra West', '400050',
    19.0596, 72.8295, 40000,
    '["wifi","security","lift","power_backup"]',
    'active', 4.3, 15
),
(
    'aaa00000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000002',
    '2BHK near Cyber City — Gurgaon',
    'Modern flat in gated society, walking distance to Cyber City IT hub. Metro station 200m away. Swimming pool included.',
    'apartment', 2, 2, 950, 7, 4,
    'Tower C, DLF Phase 2, Sector 25', 'Gurgaon', 'DLF Phase 2', '122002',
    28.4957, 77.0855, 32000,
    '["wifi","parking","gym","swimming_pool","security","lift","power_backup"]',
    'active', 4.1, 9
),
(
    'aaa00000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000003',
    'Premium PG near HSR Layout',
    'Fully managed PG with meals included, high-speed internet, housekeeping, and AC rooms. Best for IT professionals.',
    'pg', 1, 1, 200, 1, 2,
    '14, 27th Main, Sector 1, HSR Layout', 'Bengaluru', 'HSR Layout', '560102',
    12.9147, 77.6424, 12000,
    '["wifi","air_conditioning","security","meals_included","housekeeping"]',
    'active', 4.0, 20
);

-- ── Bookings ─────────────────────────────────────────────────────
INSERT INTO bookings (id, client_id, property_id, check_in, check_out, total_nights, total_amount, status) VALUES
(
    'bbb00000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000004',
    'aaa00000-0000-0000-0000-000000000001',
    '2026-04-10 11:00:00+05:30',
    '2026-05-10 11:00:00+05:30',
    30, 28000, 'confirmed'
),
(
    'bbb00000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000005',
    'aaa00000-0000-0000-0000-000000000004',
    '2026-03-01 12:00:00+05:30',
    '2026-03-31 12:00:00+05:30',
    30, 40000, 'completed'
);

-- ── Payments ─────────────────────────────────────────────────────
INSERT INTO payments (booking_id, gateway, gateway_order_id, gateway_payment_id, amount, currency, status) VALUES
(
    'bbb00000-0000-0000-0000-000000000001',
    'razorpay', 'order_demo_001', 'pay_demo_001', 28000, 'INR', 'captured'
),
(
    'bbb00000-0000-0000-0000-000000000002',
    'razorpay', 'order_demo_002', 'pay_demo_002', 40000, 'INR', 'captured'
);

-- ── Reviews ──────────────────────────────────────────────────────
INSERT INTO reviews (booking_id, property_id, author_id, rating, body, owner_reply) VALUES
(
    'bbb00000-0000-0000-0000-000000000002',
    'aaa00000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005',
    5,
    'Amazing flat! Super clean, great sea breeze view, and the owner was very responsive. Highly recommended!',
    'Thank you Priya! It was a pleasure hosting you. Hope to see you again!'
);
