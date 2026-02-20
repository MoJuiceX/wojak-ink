-- 075_owner_address.sql
-- Add owner_address to combat_fighters for wallet-based identity.
-- Users without a DID now appear on the players leaderboard via their wallet address.
-- owner_did remains unchanged; owner_address is the minting wallet at creation time.

ALTER TABLE combat_fighters ADD COLUMN owner_address TEXT NOT NULL DEFAULT '';

-- Index for leaderboard GROUP BY queries
CREATE INDEX IF NOT EXISTS idx_combat_fighters_owner_address
  ON combat_fighters(owner_address);
