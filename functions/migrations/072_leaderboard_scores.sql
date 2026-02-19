-- Migration: 072_leaderboard_scores
-- Creates the leaderboard_scores table for arcade game scores
-- This table was referenced in API code but missing from migrations

CREATE TABLE IF NOT EXISTS leaderboard_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  level INTEGER,
  metadata TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index for leaderboard queries (get top scores per game)
CREATE INDEX IF NOT EXISTS idx_leaderboard_game_score ON leaderboard_scores(game_id, score DESC);

-- Index for user's scores (get user's high score per game)
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_game ON leaderboard_scores(user_id, game_id, score DESC);

-- Index for idempotency key lookup
CREATE INDEX IF NOT EXISTS idx_leaderboard_idempotency ON leaderboard_scores(idempotency_key);

-- Index for rank calculations
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard_scores(game_id, score DESC, created_at);
