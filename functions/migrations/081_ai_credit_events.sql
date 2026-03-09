-- AI credit earning events: non-purchase credit grants.
-- Run once against wojak-users D1 database.

CREATE TABLE IF NOT EXISTS ai_credit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  credits_earned INTEGER NOT NULL,
  source_ref TEXT,
  metadata TEXT,
  event_timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_events_wallet
  ON ai_credit_events(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ai_credit_events_type
  ON ai_credit_events(event_type);
