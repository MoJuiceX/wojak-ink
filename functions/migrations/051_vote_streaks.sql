-- 051_vote_streaks.sql
-- Track consecutive daily voting streaks

ALTER TABLE game_players ADD COLUMN vote_streak INTEGER DEFAULT 0;
ALTER TABLE game_players ADD COLUMN vote_streak_last_date TEXT;
ALTER TABLE game_players ADD COLUMN vote_streak_longest INTEGER DEFAULT 0;
