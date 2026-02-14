-- Add a rolling usage score that decays over time.
-- The updated_at column already exists; we add last_decay_at to track
-- when we last applied decay, and effective_usage as the decayed score.
ALTER TABLE trait_usage ADD COLUMN effective_usage REAL NOT NULL DEFAULT 0;
ALTER TABLE trait_usage ADD COLUMN last_decay_at TEXT NOT NULL DEFAULT (datetime('now'));

-- Backfill: set effective_usage = usage_count for existing rows
UPDATE trait_usage SET effective_usage = usage_count, last_decay_at = datetime('now');
