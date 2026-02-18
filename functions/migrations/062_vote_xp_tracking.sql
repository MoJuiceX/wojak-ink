-- 062_vote_xp_tracking.sql
-- Tracks when vote XP was last calculated for each combat fighter.
-- Used by the Vote XP Pipeline to avoid double-counting.

ALTER TABLE combat_fighters ADD COLUMN vote_xp_last_updated TEXT DEFAULT NULL;
