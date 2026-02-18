-- Store net_score at resolution time so displayed deltas are frozen.
ALTER TABLE battles ADD COLUMN nft_a_score_end INTEGER;
ALTER TABLE battles ADD COLUMN nft_b_score_end INTEGER;
