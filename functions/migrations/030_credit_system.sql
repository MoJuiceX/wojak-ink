-- =====================================================
-- Phase 2: Your Wojak — Credit System
-- Migration 030: Tables for credits, mints, trait usage
-- =====================================================
-- Credits are stored as INTEGER x100 (50.00 credits = 5000 units)
-- Prices are stored as INTEGER x100000 (0.2 XCH = 20000 units)
-- Floor prices are stored as INTEGER x100 (1.0 XCH = 100 units)
-- Whale multipliers are stored as INTEGER x10000 (1.0x = 10000 units)
-- =====================================================

-- =====================================================
-- 1. CREDIT EVENTS
-- One row per XCH trade that earns credits.
-- CAT trades are excluded (XCH-only credit system).
-- event_id is UNIQUE for idempotent backfill/processing.
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  nft_id TEXT NOT NULL,
  event_id TEXT UNIQUE NOT NULL,
  price_xch REAL NOT NULL,
  floor_at_time INTEGER NOT NULL DEFAULT 100,
  credits_earned INTEGER NOT NULL,
  whale_multiplier INTEGER NOT NULL DEFAULT 10000,
  source TEXT NOT NULL DEFAULT 'mintgarden',
  event_timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ce_wallet ON credit_events(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ce_timestamp ON credit_events(event_timestamp);

-- =====================================================
-- 2. CREDIT SPENDS
-- One row per free mint redemption.
-- 100 credits = 10000 stored units per free mint.
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_spends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  mint_id INTEGER NOT NULL,
  credits_spent INTEGER NOT NULL DEFAULT 10000,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cs_wallet ON credit_spends(wallet_address);

-- =====================================================
-- 3. FLOOR PRICE SNAPSHOTS
-- One reading per day (simplest approach).
-- Used for credit calculations — rolling average not needed
-- given low trading volume.
-- =====================================================
CREATE TABLE IF NOT EXISTS floor_price_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  floor_xch INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'mintgarden',
  snapshot_date TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =====================================================
-- 4. PHASE 2 MINTS
-- All Your Wojak mints (pending, minted, expired, failed).
-- mint_number is assigned at confirmation only (no gaps).
-- offer_file stores the full offer string for copy-paste.
-- =====================================================
CREATE TABLE IF NOT EXISTS phase2_mints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mint_number INTEGER UNIQUE,
  wallet_address TEXT NOT NULL,
  layers_json TEXT NOT NULL,
  colors_json TEXT NOT NULL,
  ipfs_image_uri TEXT,
  ipfs_metadata_uri TEXT,
  image_hash TEXT,
  metadata_hash TEXT,
  mint_type TEXT NOT NULL CHECK(mint_type IN ('paid', 'free')),
  total_price_xch INTEGER,
  trait_surcharge_xch INTEGER,
  highest_surcharge_trait TEXT,
  mintgarden_launcher_id TEXT,
  offer_file TEXT,
  offer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'minted', 'expired', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  minted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pm_wallet ON phase2_mints(wallet_address);
CREATE INDEX IF NOT EXISTS idx_pm_status ON phase2_mints(status);

-- =====================================================
-- 5. TRAIT USAGE
-- Per-trait usage counts for dynamic pricing.
-- Incremented at mint confirmation only.
-- Surcharge formula: 0.2 * ln(1 + usage_count / 20)
-- =====================================================
CREATE TABLE IF NOT EXISTS trait_usage (
  trait_category TEXT NOT NULL,
  trait_name TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (trait_category, trait_name)
);
