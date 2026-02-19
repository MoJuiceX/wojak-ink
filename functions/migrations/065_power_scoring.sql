-- functions/migrations/065_power_scoring.sql
-- Power scoring system for Fight Club rankings

-- Add power score columns to combat_fighters
-- power_score = vote_power + battle_power (computed on update)
ALTER TABLE combat_fighters ADD COLUMN power_score INTEGER DEFAULT 0;
ALTER TABLE combat_fighters ADD COLUMN vote_power INTEGER DEFAULT 0;
ALTER TABLE combat_fighters ADD COLUMN battle_power INTEGER DEFAULT 0;

-- DID display names for leaderboard
CREATE TABLE IF NOT EXISTS did_profiles (
  did_id TEXT PRIMARY KEY,
  display_name TEXT,
  name_source TEXT DEFAULT 'chain' CHECK(name_source IN ('chain', 'custom', 'random')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_fighters_power ON combat_fighters(power_score DESC);
CREATE INDEX IF NOT EXISTS idx_fighters_owner_power ON combat_fighters(owner_did, power_score DESC);
