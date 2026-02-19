-- Subscription system for Fight Club premium features
-- Trial: 14 days free, 4 battles/day
-- Free: 1 battle/day
-- Premium: 4 battles/day, 1 XCH/month

CREATE TABLE IF NOT EXISTS subscriptions (
  did_id TEXT PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'trial',  -- 'trial', 'free', 'premium'
  trial_started_at TEXT,
  trial_expires_at TEXT,
  premium_started_at TEXT,
  premium_expires_at TEXT,
  total_paid_xch REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Track payment transactions
CREATE TABLE IF NOT EXISTS subscription_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  did_id TEXT NOT NULL,
  amount_xch REAL NOT NULL,
  tx_id TEXT,  -- Chia transaction ID for verification
  payment_address TEXT,
  status TEXT DEFAULT 'pending',  -- 'pending', 'confirmed', 'failed'
  days_granted INTEGER DEFAULT 30,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (did_id) REFERENCES subscriptions(did_id)
);

-- Index for payment lookups
CREATE INDEX IF NOT EXISTS idx_subscription_payments_did ON subscription_payments(did_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_tx ON subscription_payments(tx_id);
