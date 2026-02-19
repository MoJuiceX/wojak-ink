-- Backfill vote_power and power_score from existing wojak_scores
-- net_score = likes - dislikes, which is exactly vote_power
-- This migration populates rankings from existing Swipe vote data

-- Step 1: Update existing combat_fighters with vote power from wojak_scores
UPDATE combat_fighters
SET
  vote_power = COALESCE((
    SELECT ws.net_score
    FROM wojak_scores ws
    WHERE ws.nft_id = combat_fighters.nft_id
  ), 0),
  power_score = COALESCE((
    SELECT ws.net_score
    FROM wojak_scores ws
    WHERE ws.nft_id = combat_fighters.nft_id
  ), 0) + COALESCE(combat_fighters.battle_power, 0)
WHERE EXISTS (
  SELECT 1 FROM wojak_scores ws WHERE ws.nft_id = combat_fighters.nft_id
);

-- Step 2: For any scored NFTs not in combat_fighters, insert them
-- This happens when NFTs have been voted on but never entered combat
-- We need to know their owner_did, so only insert where we can resolve it
INSERT OR IGNORE INTO combat_fighters (nft_id, edition, owner_did, vote_power, power_score, battle_power, elo, level, wins, losses, draws, created_at)
SELECT
  ws.nft_id,
  ws.edition_number,
  COALESCE(dh.did, ''),
  ws.net_score,
  ws.net_score,
  0,
  1000,
  1,
  0, 0, 0,
  datetime('now')
FROM wojak_scores ws
LEFT JOIN did_holdings dh ON dh.nft_id = ws.nft_id
WHERE ws.nft_id NOT IN (SELECT nft_id FROM combat_fighters)
AND ws.total_votes > 0;
