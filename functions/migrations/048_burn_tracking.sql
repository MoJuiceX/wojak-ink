-- 048_burn_tracking.sql
-- Burn tracking for credit rewards

CREATE TABLE IF NOT EXISTS wojak_burns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nft_id TEXT NOT NULL UNIQUE,                -- MintGarden launcher_id
  edition_number INTEGER NOT NULL,
  burner_did TEXT,                             -- DID of the burner (if known)
  burner_wallet TEXT,                          -- Wallet that burned
  net_score_at_burn INTEGER NOT NULL DEFAULT 0, -- likes - dislikes at time of burn
  credits_awarded INTEGER NOT NULL DEFAULT 0,  -- Credits given for this burn
  detected_via TEXT NOT NULL,                  -- 'ui' or 'indexer'
  burned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wojak_burns_burner ON wojak_burns(burner_wallet);
