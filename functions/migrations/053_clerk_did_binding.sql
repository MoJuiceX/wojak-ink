-- Bind Clerk user identity to DID (1:1 relationship)
-- Prevents multi-DID vote farming
-- Note: SQLite ALTER TABLE doesn't support UNIQUE inline, so we add column + index separately
ALTER TABLE game_players ADD COLUMN clerk_user_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_players_clerk_user_id ON game_players (clerk_user_id) WHERE clerk_user_id IS NOT NULL;
