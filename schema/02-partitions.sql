-- Table Partitioning for Large Time-Series Data
-- Partitions game_history and events by month for better performance

-- Create partitioned game_history table
CREATE TABLE IF NOT EXISTS game_history_partitioned (
  id BIGSERIAL,
  user_id UUID NOT NULL,
  game_id UUID NOT NULL,
  score INT NOT NULL,
  result VARCHAR(50),
  duration_seconds INT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for 2024-2026 (extend as needed)
CREATE TABLE IF NOT EXISTS game_history_2024_01 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE IF NOT EXISTS game_history_2024_02 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE IF NOT EXISTS game_history_2024_03 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE IF NOT EXISTS game_history_2024_04 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE IF NOT EXISTS game_history_2024_05 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE IF NOT EXISTS game_history_2024_06 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE IF NOT EXISTS game_history_2024_07 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE IF NOT EXISTS game_history_2024_08 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE IF NOT EXISTS game_history_2024_09 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE IF NOT EXISTS game_history_2024_10 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE IF NOT EXISTS game_history_2024_11 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE IF NOT EXISTS game_history_2024_12 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE IF NOT EXISTS game_history_2025_01 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS game_history_2025_02 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS game_history_2025_03 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS game_history_2025_04 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE IF NOT EXISTS game_history_2025_05 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE IF NOT EXISTS game_history_2025_06 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS game_history_2025_07 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE IF NOT EXISTS game_history_2025_08 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE IF NOT EXISTS game_history_2025_09 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE IF NOT EXISTS game_history_2025_10 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE IF NOT EXISTS game_history_2025_11 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE IF NOT EXISTS game_history_2025_12 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE IF NOT EXISTS game_history_2026_01 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS game_history_2026_02 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS game_history_2026_03 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS game_history_2026_04 PARTITION OF game_history_partitioned
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- Create indexes on each partition
CREATE INDEX IF NOT EXISTS idx_game_history_partitioned_user_date
  ON game_history_partitioned(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_partitioned_game_date
  ON game_history_partitioned(game_id, created_at DESC);

-- Create partitioned events table (same pattern)
CREATE TABLE IF NOT EXISTS events_partitioned (
  id BIGSERIAL,
  user_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP NOT NULL,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Events partitions (recent months only)
CREATE TABLE IF NOT EXISTS events_2026_01 PARTITION OF events_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS events_2026_02 PARTITION OF events_partitioned
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS events_2026_03 PARTITION OF events_partitioned
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_partitioned_user_type_date
  ON events_partitioned(user_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_partitioned_type_date
  ON events_partitioned(event_type, created_at DESC);

-- Migration step: Copy data from original table if it exists
-- BEGIN;
-- INSERT INTO game_history_partitioned 
--   SELECT * FROM game_history;
-- DROP TABLE game_history;
-- ALTER TABLE game_history_partitioned RENAME TO game_history;
-- COMMIT;

-- Automatic partition creation for future months (PostgreSQL 14+)
-- CREATE OR REPLACE FUNCTION create_game_history_partition()
-- RETURNS void AS $$
-- DECLARE
--   partition_name TEXT;
--   start_date DATE;
--   end_date DATE;
-- BEGIN
--   start_date := DATE_TRUNC('month', CURRENT_DATE);
--   end_date := start_date + INTERVAL '1 month';
--   partition_name := 'game_history_' || TO_CHAR(start_date, 'YYYY_MM');
--   
--   EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF game_history_partitioned
--     FOR VALUES FROM (%L) TO (%L)',
--     partition_name, start_date, end_date);
-- END;
-- $$ LANGUAGE plpgsql;
