-- 082_ai_auth_sessions.sql
-- Wallet signature authentication sessions for AI credit endpoints.
-- Flow: challenge (nonce) → verify (BLS sig) → session_token (24h TTL).

CREATE TABLE IF NOT EXISTS ai_auth_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  session_token TEXT UNIQUE,
  public_key TEXT,
  nonce TEXT,
  nonce_expires_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_auth_token ON ai_auth_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_ai_auth_wallet ON ai_auth_sessions(wallet_address);
