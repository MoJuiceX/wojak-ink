-- Add net_score snapshots at battle creation time.
-- Resolution uses delta (current - snapshot) instead of battle_votes.
ALTER TABLE battles ADD COLUMN nft_a_score_start INTEGER NOT NULL DEFAULT 0;
ALTER TABLE battles ADD COLUMN nft_b_score_start INTEGER NOT NULL DEFAULT 0;
