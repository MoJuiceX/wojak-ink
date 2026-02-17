-- 049_battles.sql
-- Battle system tables

CREATE TABLE IF NOT EXISTS battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nft_a_id TEXT NOT NULL,                     -- Challenger NFT
  nft_a_edition INTEGER NOT NULL,
  nft_a_owner_did TEXT NOT NULL,
  nft_b_id TEXT NOT NULL,                     -- Opponent NFT
  nft_b_edition INTEGER NOT NULL,
  nft_b_owner_did TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active', 'completed', 'cancelled', 'draw')),
  winner_nft_id TEXT,                         -- NULL until resolved
  votes_a INTEGER NOT NULL DEFAULT 0,
  votes_b INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ends_at TEXT NOT NULL,                      -- started_at + 24 hours
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status, ends_at);
CREATE INDEX IF NOT EXISTS idx_battles_nft_a ON battles(nft_a_id);
CREATE INDEX IF NOT EXISTS idx_battles_nft_b ON battles(nft_b_id);

-- Battle votes (1 per user per battle, separate from daily cap)
CREATE TABLE IF NOT EXISTS battle_votes (
  battle_id INTEGER NOT NULL,
  voter_did TEXT NOT NULL,
  voted_for TEXT NOT NULL,                    -- 'a' or 'b'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (battle_id, voter_did)
);

-- Battle queue (waiting for matchmaking)
CREATE TABLE IF NOT EXISTS battle_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nft_id TEXT NOT NULL UNIQUE,                -- One queue entry per NFT
  edition_number INTEGER NOT NULL,
  owner_did TEXT NOT NULL,
  queued_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Battle roster (which NFTs are battle-ready)
CREATE TABLE IF NOT EXISTS battle_roster (
  did_id TEXT NOT NULL,
  nft_id TEXT NOT NULL,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (did_id, nft_id)
);
