-- Migration: 073_missing_tables
-- Creates tables that were referenced in API code but missing from migrations

-- Messages table for user notifications/inbox
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(user_id, read) WHERE read = 0;

-- NFT cache for chat eligibility checks
CREATE TABLE IF NOT EXISTS nft_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  collection_id TEXT NOT NULL,
  nft_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(wallet_address, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_nft_cache_wallet ON nft_cache(wallet_address, collection_id);

-- Rate limits for guest voting and other rate-limited operations
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL DEFAULT (datetime('now')),
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- KV store for simple key-value configuration
CREATE TABLE IF NOT EXISTS kv_store (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User best ranks for leaderboard tracking
CREATE TABLE IF NOT EXISTS user_best_ranks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  best_rank INTEGER NOT NULL,
  achieved_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, game_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_best_ranks_user ON user_best_ranks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_best_ranks_game ON user_best_ranks(game_id, best_rank);
