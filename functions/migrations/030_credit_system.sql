-- Phase 2: Your Wojak — Credit system and minting tables
-- Run once against wojak-users D1 database.

-- credit_events: one row per XCH trade that earns credits
CREATE TABLE IF NOT EXISTS credit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  nft_id TEXT NOT NULL,
  event_id TEXT UNIQUE NOT NULL,
  price_xch REAL NOT NULL,
  floor_at_time INTEGER NOT NULL,
  credits_earned INTEGER NOT NULL,
  whale_multiplier INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'mintgarden',
  event_timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ce_wallet ON credit_events(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ce_timestamp ON credit_events(event_timestamp);

-- credit_spends: one row per free mint (100 credits = 10000 units)
CREATE TABLE IF NOT EXISTS credit_spends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  mint_id INTEGER NOT NULL,
  credits_spent INTEGER NOT NULL DEFAULT 10000,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cs_wallet ON credit_spends(wallet_address);

-- floor_price_snapshots: one reading per day (floor_xch stored as x100)
CREATE TABLE IF NOT EXISTS floor_price_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  floor_xch INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'mintgarden',
  snapshot_date TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- phase2_mints: all Your Wojak mints (paid and free)
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

-- trait_usage: per-trait usage counts (incremented at confirmation only)
CREATE TABLE IF NOT EXISTS trait_usage (
  trait_category TEXT NOT NULL,
  trait_name TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (trait_category, trait_name)
);
