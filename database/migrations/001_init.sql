-- ============================================================================
-- 001_init.sql - initial schema for Lawas Journeys
-- Conventions: snake_case columns, INTEGER prices in Rupiah, JSON stored as TEXT,
-- timestamps stored as ISO-8601 UTC strings.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Catalogue
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  tagline     TEXT,
  image       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE destinations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  tagline     TEXT,
  description TEXT,
  image       TEXT,
  best_time   TEXT    NOT NULL DEFAULT '{}',   -- JSON: { summary, dry: {...}, rainy: {...} }
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE attractions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  destination_id INTEGER NOT NULL REFERENCES destinations (id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,
  description    TEXT,
  location       TEXT,
  image          TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_attractions_destination ON attractions (destination_id);

CREATE TABLE packages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT    NOT NULL UNIQUE,
  title           TEXT    NOT NULL,
  destination_id  INTEGER NOT NULL REFERENCES destinations (id) ON DELETE RESTRICT,
  categories      TEXT    NOT NULL DEFAULT '[]',   -- JSON array, e.g. ["Culture","Heritage"]
  summary         TEXT,
  description     TEXT,
  duration_days   INTEGER NOT NULL CHECK (duration_days > 0),
  duration_nights INTEGER NOT NULL CHECK (duration_nights >= 0),
  group_type      TEXT    NOT NULL DEFAULT 'Small Group',
  min_pax         INTEGER NOT NULL DEFAULT 2 CHECK (min_pax > 0),
  max_pax         INTEGER NOT NULL DEFAULT 10 CHECK (max_pax >= min_pax),
  difficulty      TEXT    NOT NULL DEFAULT 'Easy',
  price           INTEGER NOT NULL CHECK (price >= 0),
  original_price  INTEGER CHECK (original_price IS NULL OR original_price >= 0),
  rating          REAL    NOT NULL DEFAULT 0,
  review_count    INTEGER NOT NULL DEFAULT 0,
  image           TEXT,
  highlights      TEXT    NOT NULL DEFAULT '[]',   -- JSON array of strings
  itinerary       TEXT    NOT NULL DEFAULT '[]',   -- JSON array of { day, title, description }
  includes        TEXT    NOT NULL DEFAULT '[]',   -- JSON array of strings
  excludes        TEXT    NOT NULL DEFAULT '[]',   -- JSON array of strings
  is_featured     INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_packages_destination ON packages (destination_id);
CREATE INDEX idx_packages_featured    ON packages (is_featured);

CREATE TABLE articles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT    NOT NULL UNIQUE,
  title         TEXT    NOT NULL,
  excerpt       TEXT,
  content       TEXT    NOT NULL DEFAULT '',        -- plain text, paragraphs separated by a blank line
  category      TEXT    NOT NULL,
  image         TEXT,
  author        TEXT    NOT NULL DEFAULT 'Lawas Journeys Editorial',
  tags          TEXT    NOT NULL DEFAULT '[]',      -- JSON array of strings
  read_minutes  INTEGER NOT NULL DEFAULT 5 CHECK (read_minutes > 0),
  is_featured   INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  published_at  TEXT    NOT NULL,                   -- YYYY-MM-DD
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_articles_category  ON articles (category);
CREATE INDEX idx_articles_published ON articles (published_at DESC);

-- ----------------------------------------------------------------------------
-- Customers & authentication
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ----------------------------------------------------------------------------
-- Bookings & payments
-- ----------------------------------------------------------------------------
CREATE TABLE bookings (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  code           TEXT    NOT NULL UNIQUE,           -- public reference, e.g. LJ-261029-7K4Q
  package_id     INTEGER NOT NULL REFERENCES packages (id) ON DELETE RESTRICT,
  package_title  TEXT    NOT NULL,                  -- snapshot, survives later package edits
  user_id        INTEGER REFERENCES users (id) ON DELETE SET NULL,
  customer_name  TEXT    NOT NULL,
  customer_email TEXT    NOT NULL,
  customer_phone TEXT    NOT NULL,
  travel_date    TEXT    NOT NULL,                  -- YYYY-MM-DD
  guests         INTEGER NOT NULL CHECK (guests > 0),
  unit_price     INTEGER NOT NULL CHECK (unit_price >= 0),
  total_price    INTEGER NOT NULL CHECK (total_price >= 0),
  notes          TEXT,
  status         TEXT    NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  payment_status TEXT    NOT NULL DEFAULT 'unpaid'
                   CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'expired')),
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_bookings_user   ON bookings (user_id);
CREATE INDEX idx_bookings_email  ON bookings (customer_email);
CREATE INDEX idx_bookings_status ON bookings (status);

CREATE TABLE payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     TEXT    NOT NULL UNIQUE,             -- sent to the payment gateway
  booking_id   INTEGER NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  provider     TEXT    NOT NULL,
  amount       INTEGER NOT NULL CHECK (amount >= 0),
  status       TEXT    NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'settlement', 'expire', 'cancel', 'deny')),
  payment_type TEXT,
  snap_token   TEXT,
  redirect_url TEXT,
  expires_at   TEXT    NOT NULL,
  paid_at      TEXT,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_payments_booking ON payments (booking_id);

-- ----------------------------------------------------------------------------
-- Leads
-- ----------------------------------------------------------------------------
CREATE TABLE custom_trips (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL,
  phone         TEXT    NOT NULL,
  destinations  TEXT    NOT NULL DEFAULT '[]',      -- JSON array of destination names
  interests     TEXT    NOT NULL DEFAULT '[]',      -- JSON array of category names
  travel_date   TEXT,
  duration_days INTEGER,
  guests        INTEGER NOT NULL DEFAULT 2 CHECK (guests > 0),
  budget_range  TEXT,
  message       TEXT,
  status        TEXT    NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'contacted', 'quoted', 'closed')),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_custom_trips_status ON custom_trips (status);

CREATE TABLE subscribers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
