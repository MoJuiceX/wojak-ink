-- Bind Clerk user identity to DID (1:1 relationship)
-- Prevents multi-DID vote farming
ALTER TABLE game_players ADD COLUMN clerk_user_id TEXT UNIQUE;
