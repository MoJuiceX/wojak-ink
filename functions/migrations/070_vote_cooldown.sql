-- Index for efficient 24-hour cooldown lookback
-- The feed query excludes votes within last 24 hours using (voter_did, nft_id, created_at)
CREATE INDEX IF NOT EXISTS idx_wojak_votes_cooldown
ON wojak_votes(voter_did, nft_id, created_at DESC);
