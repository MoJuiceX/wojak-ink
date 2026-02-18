-- functions/migrations/061_mint_jobs_combat_moves.sql
-- Store combat move selections on mint jobs for fighter creation at finalization
ALTER TABLE mint_jobs ADD COLUMN combat_moves_json TEXT;
