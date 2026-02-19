-- 062_vote_xp_tracking.sql
-- Tracks vote XP calculation state for each combat fighter.
-- vote_xp_last_updated: when vote XP was last awarded
-- vote_xp_net_snapshot: the net_score value at last calculation (for delta)

ALTER TABLE combat_fighters ADD COLUMN vote_xp_last_updated TEXT DEFAULT NULL;
ALTER TABLE combat_fighters ADD COLUMN vote_xp_net_snapshot INTEGER DEFAULT 0;
