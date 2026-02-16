-- Migration 044: CAT credit whitelist (DB-backed instead of hardcoded)
-- Allows managing which CAT tokens earn credits via admin API.

CREATE TABLE IF NOT EXISTS cat_credit_whitelist (
  token_code TEXT PRIMARY KEY,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  added_by TEXT NOT NULL DEFAULT 'migration'
);

-- Seed with current hardcoded whitelist from credit-tracker worker
INSERT OR IGNORE INTO cat_credit_whitelist (token_code, added_by) VALUES
  ('BEPE', 'migration'),
  ('🪄⚡️', 'migration'),
  ('✨❤️‍🔥🧙‍♂️', 'migration'),
  ('HOA', 'migration'),
  ('NeckCoin', 'migration'),
  ('$CHIA', 'migration'),
  ('PP', 'migration'),
  ('WOJAK', 'migration');
