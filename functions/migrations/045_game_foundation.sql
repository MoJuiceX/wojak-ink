-- 045_game_foundation.sql
-- Your Wojak Game — Foundation tables

-- ============================================================
-- GAME PLAYERS — Registered game participants
-- ============================================================
CREATE TABLE IF NOT EXISTS game_players (
  did_id TEXT PRIMARY KEY,                    -- Chia DID (collector identity)
  wallet_address TEXT NOT NULL,               -- Primary wallet (from first connect)
  phase1_verified INTEGER NOT NULL DEFAULT 0, -- Has at least 1 Wojak Farmers Plot NFT
  phase1_verified_at TEXT,                    -- When verification happened
  power_level INTEGER NOT NULL DEFAULT 0,     -- Cached Power Level score (0-9000)
  power_level_updated_at TEXT,                -- Last recalculation time
  votes_today INTEGER NOT NULL DEFAULT 0,     -- Votes cast today
  votes_today_reset TEXT,                     -- Date of last reset (YYYY-MM-DD)
  total_votes_cast INTEGER NOT NULL DEFAULT 0,
  onboarding_did INTEGER NOT NULL DEFAULT 1,  -- Milestone: has DID (always 1 if registered)
  onboarding_phase1 INTEGER NOT NULL DEFAULT 0, -- Milestone: has Phase 1 NFT
  onboarding_minted INTEGER NOT NULL DEFAULT 0, -- Milestone: minted a Your Wojak
  onboarding_voted INTEGER NOT NULL DEFAULT 0,  -- Milestone: cast first vote
  onboarding_battled INTEGER NOT NULL DEFAULT 0, -- Milestone: entered first battle
  credits_earned_onboarding INTEGER NOT NULL DEFAULT 0, -- One-time credits from milestones
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_game_players_wallet ON game_players(wallet_address);
CREATE INDEX IF NOT EXISTS idx_game_players_power ON game_players(power_level DESC);

-- ============================================================
-- DID HOLDINGS — What NFTs each DID currently holds
-- ============================================================
CREATE TABLE IF NOT EXISTS did_holdings (
  did_id TEXT NOT NULL,
  nft_id TEXT NOT NULL,                       -- MintGarden launcher_id
  edition_number INTEGER,                     -- Your Wojak edition number (null for Phase 1)
  collection TEXT NOT NULL,                   -- 'phase1' or 'phase2'
  creator_wallet TEXT,                        -- phase2_mints.wallet_address (null for Phase 1)
  detected_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (did_id, nft_id)
);

CREATE INDEX IF NOT EXISTS idx_did_holdings_nft ON did_holdings(nft_id);
CREATE INDEX IF NOT EXISTS idx_did_holdings_collection ON did_holdings(did_id, collection);

-- ============================================================
-- WOJAK VOTES — Individual votes on Phase 2 NFTs
-- ============================================================
CREATE TABLE IF NOT EXISTS wojak_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_did TEXT NOT NULL,                    -- Who voted
  nft_id TEXT NOT NULL,                       -- Which NFT was voted on
  edition_number INTEGER NOT NULL,            -- For quick lookups
  vote_type INTEGER NOT NULL,                 -- 1 = like, -1 = dislike
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(voter_did, nft_id)                   -- Each user votes on each Wojak once
);

CREATE INDEX IF NOT EXISTS idx_wojak_votes_nft ON wojak_votes(nft_id);
CREATE INDEX IF NOT EXISTS idx_wojak_votes_voter ON wojak_votes(voter_did, created_at);

-- ============================================================
-- WOJAK SCORES — Cached vote tallies per NFT
-- ============================================================
CREATE TABLE IF NOT EXISTS wojak_scores (
  nft_id TEXT PRIMARY KEY,                    -- MintGarden launcher_id
  edition_number INTEGER NOT NULL UNIQUE,     -- Your Wojak edition number
  creator_wallet TEXT NOT NULL,               -- From phase2_mints.wallet_address
  likes INTEGER NOT NULL DEFAULT 0,
  dislikes INTEGER NOT NULL DEFAULT 0,
  net_score INTEGER NOT NULL DEFAULT 0,       -- likes - dislikes (cached)
  total_votes INTEGER NOT NULL DEFAULT 0,     -- likes + dislikes (cached)
  first_voted_at TEXT,
  last_voted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wojak_scores_creator ON wojak_scores(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_wojak_scores_net ON wojak_scores(net_score DESC);

-- ============================================================
-- ACTIVITY FEED — Game events for dashboard
-- ============================================================
CREATE TABLE IF NOT EXISTS game_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  did_id TEXT NOT NULL,                       -- Whose feed this belongs to
  event_type TEXT NOT NULL,                   -- 'vote_milestone', 'leaderboard_change', 'battle_result', 'burn', 'mint'
  event_data TEXT NOT NULL,                   -- JSON payload
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_game_activity_did ON game_activity(did_id, created_at DESC);

-- ============================================================
-- NFT NAMES — Custom names for Phase 2 NFTs
-- ============================================================
-- Names are stored in CHIP-0007 metadata on IPFS (immutable).
-- This table caches them for quick lookup without fetching metadata.
CREATE TABLE IF NOT EXISTS nft_names (
  edition_number INTEGER PRIMARY KEY,         -- Your Wojak edition number
  custom_name TEXT,                           -- User-provided name (max 15 chars), null if none
  full_name TEXT NOT NULL                     -- "Your Wojak #42: Pepe Slayer" or "Your Wojak #42"
);
