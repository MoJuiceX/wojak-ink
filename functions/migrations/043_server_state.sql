-- Simple key-value store for server state flags (e.g., sold_out).
-- Used by the mint pipeline to cache computed state.
CREATE TABLE IF NOT EXISTS server_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
