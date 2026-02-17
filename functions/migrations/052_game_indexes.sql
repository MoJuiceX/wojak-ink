-- 052: Game performance indexes
-- Optimizes feed query (most expensive game query), vote exclusion, and holdings lookup.

-- Feed query: fast check if voter already voted on this NFT
CREATE INDEX IF NOT EXISTS idx_wojak_votes_voter_nft
  ON wojak_votes (voter_did, nft_id);

-- Feed query: fast check if voter holds this NFT
CREATE INDEX IF NOT EXISTS idx_did_holdings_did_nft
  ON did_holdings (did_id, nft_id);

-- Feed base query: minted NFTs with launcher ID (partial index)
CREATE INDEX IF NOT EXISTS idx_pm_feed
  ON phase2_mints (status, mintgarden_launcher_id)
  WHERE status = 'minted' AND mintgarden_launcher_id IS NOT NULL;
