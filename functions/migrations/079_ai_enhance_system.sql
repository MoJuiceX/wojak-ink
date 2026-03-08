-- AI Enhance system: credits, usage, and enhancement storage.
-- Run once against wojak-users D1 database.

-- AI credit purchases (buying credits with XCH)
CREATE TABLE IF NOT EXISTS ai_credit_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  credits_purchased INTEGER NOT NULL,
  xch_paid_mojos INTEGER NOT NULL,
  bundle_tier TEXT NOT NULL,
  offer_file TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT,
  expires_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_purchases_wallet
  ON ai_credit_purchases(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ai_credit_purchases_status
  ON ai_credit_purchases(status);

-- AI credit usage (one row per successful edit)
CREATE TABLE IF NOT EXISTS ai_credit_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  enhancement_id INTEGER NOT NULL,
  credits_spent INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_usage_wallet
  ON ai_credit_usage(wallet_address);

-- AI enhanced images (persisted creations)
CREATE TABLE IF NOT EXISTS ai_enhancements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  category TEXT NOT NULL,
  prompt TEXT NOT NULL,
  constrained_prompt TEXT,
  reve_request_id TEXT,
  reve_version TEXT,
  parent_enhancement_id INTEGER,
  base_layers_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_enhancements_wallet
  ON ai_enhancements(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ai_enhancements_parent
  ON ai_enhancements(parent_enhancement_id);
