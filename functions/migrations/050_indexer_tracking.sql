-- 050_indexer_tracking.sql
-- Track DID indexer success/failure per player for monitoring

ALTER TABLE game_players ADD COLUMN last_indexed_at TEXT;
ALTER TABLE game_players ADD COLUMN last_index_error TEXT;
ALTER TABLE game_players ADD COLUMN index_error_count INTEGER DEFAULT 0;
