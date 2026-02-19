-- Burn tracking for combat fighters
-- Adds columns to track when and by whom a fighter was burned

ALTER TABLE combat_fighters ADD COLUMN burned_at TEXT DEFAULT NULL;
ALTER TABLE combat_fighters ADD COLUMN burned_by_did TEXT DEFAULT NULL;

-- Index for finding eligible (non-burned) Wojaks by power score
-- Partial index excludes already-burned fighters
CREATE INDEX IF NOT EXISTS idx_fighters_power_asc ON combat_fighters(power_score ASC)
WHERE burned_at IS NULL;
