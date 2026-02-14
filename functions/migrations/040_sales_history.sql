-- Migration 040: Server-side sales history
-- Stores all completed Dexie trades (XCH + CAT) for the Wojak Farmers Plot collection.
-- Source of truth for BigPulp analytics and sales display.

-- ============================================================
-- 1. Sales History Table
-- ============================================================

CREATE TABLE IF NOT EXISTS sales_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Trade identification (Dexie trade_id is the natural dedup key)
  trade_id TEXT NOT NULL UNIQUE,
  nft_edition INTEGER NOT NULL,
  nft_name TEXT,

  -- Payment details (raw from Dexie)
  currency TEXT NOT NULL DEFAULT 'XCH' CHECK (currency IN ('XCH', 'CAT')),
  original_amount REAL NOT NULL,
  token_code TEXT,
  token_id TEXT,

  -- Converted values (computed server-side)
  xch_equivalent REAL NOT NULL,
  usd_value REAL,
  xch_usd_rate REAL,
  cat_xch_rate REAL,

  -- Traits snapshot for trait-based queries
  traits_json TEXT,

  -- Timestamps
  completed_at TEXT NOT NULL,
  completed_at_unix INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- Source tracking
  source TEXT NOT NULL DEFAULT 'dexie' CHECK (source IN ('dexie', 'parsebot'))
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sh_edition ON sales_history(nft_edition);
CREATE INDEX IF NOT EXISTS idx_sh_completed_desc ON sales_history(completed_at_unix DESC);
CREATE INDEX IF NOT EXISTS idx_sh_edition_time ON sales_history(nft_edition, completed_at_unix DESC);
CREATE INDEX IF NOT EXISTS idx_sh_currency ON sales_history(currency);

-- ============================================================
-- 2. Sync State Table (singleton row for cursor tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS sales_sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_sync_at TEXT,
  last_trade_timestamp TEXT,
  total_synced INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'idle' CHECK (sync_status IN ('idle', 'running', 'error')),
  error_message TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO sales_sync_state (id) VALUES (1);

-- ============================================================
-- 3. CAT Token Conversion Rates
-- ============================================================

CREATE TABLE IF NOT EXISTS cat_token_rates (
  token_code TEXT PRIMARY KEY,
  token_id TEXT,
  xch_rate REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'dexie', 'tbitswap')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed with known rates from historicalPriceService.ts
INSERT OR IGNORE INTO cat_token_rates (token_code, xch_rate, source) VALUES
  ('PIZZA', 0.00000285, 'manual'),
  ('$PIZZA', 0.00000285, 'manual'),
  ('G4M', 0.00000175, 'manual'),
  ('$G4M', 0.00000175, 'manual'),
  ('BEPE', 0.0000204, 'manual'),
  ('$BEPE', 0.0000204, 'manual'),
  ('LOVE', 0.000118, 'manual'),
  ('$LOVE', 0.000118, 'manual'),
  ('HOA', 0.000318, 'manual'),
  ('$HOA', 0.000318, 'manual'),
  ('SPROUT', 0.00000932, 'manual'),
  ('$SPROUT', 0.00000932, 'manual'),
  ('NeckCoin', 3.006, 'manual'),
  ('$NECKCOIN', 3.006, 'manual');
