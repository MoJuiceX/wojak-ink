-- 061_vote_xp_tracking.sql
-- Tracks vote XP calculation state for each combat fighter.

ALTER TABLE combat_fighters ADD COLUMN vote_xp_last_updated TEXT DEFAULT NULL;
ALTER TABLE combat_fighters ADD COLUMN vote_xp_net_snapshot INTEGER DEFAULT 0;
