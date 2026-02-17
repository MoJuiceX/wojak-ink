-- 047_splitxch.sql
-- SplitXCH splitter address cache

CREATE TABLE IF NOT EXISTS splitter_addresses (
  creator_wallet TEXT NOT NULL,
  wave INTEGER NOT NULL DEFAULT 1,
  splitter_address TEXT NOT NULL,
  splitxch_id TEXT NOT NULL,
  creator_points INTEGER NOT NULL,
  treasury_points INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (creator_wallet, wave)
);
