-- Database Monitoring Views & Queries
-- Use these to track performance and identify bottlenecks

-- Slow Query Log (PostgreSQL)
-- Enable in postgresql.conf:
-- log_min_duration_statement = 1000  # Log queries > 1 second
-- shared_preload_libraries = 'pg_stat_statements'

-- View: Index usage statistics
CREATE OR REPLACE VIEW v_index_usage AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  CASE
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'LOW_USE'
    ELSE 'ACTIVE'
  END as status
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- View: Table size and row count
CREATE OR REPLACE VIEW v_table_sizes AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size,
  (SELECT reltuples::bigint FROM pg_class WHERE relname = tablename) as estimated_rows
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- View: Slow queries (requires pg_stat_statements)
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT
  query,
  calls,
  mean_exec_time::numeric(10,2) as avg_ms,
  max_exec_time::numeric(10,2) as max_ms,
  total_exec_time::numeric(15,2) as total_ms,
  stddev_exec_time::numeric(10,2) as stddev_ms,
  rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- View: Connection pool status
CREATE OR REPLACE VIEW v_connections AS
SELECT
  datname as database,
  usename as user,
  application_name,
  count(*) as connections,
  max(now() - backend_start) as oldest_connection,
  count(CASE WHEN state = 'active' THEN 1 END) as active_queries,
  count(CASE WHEN state = 'idle' THEN 1 END) as idle_connections
FROM pg_stat_activity
WHERE datname IS NOT NULL
GROUP BY datname, usename, application_name
ORDER BY connections DESC;

-- View: Lock information
CREATE OR REPLACE VIEW v_locks AS
SELECT
  pid,
  usename,
  application_name,
  state,
  query_start,
  now() - query_start as query_duration,
  query
FROM pg_stat_activity
WHERE state IS DISTINCT FROM 'idle'
ORDER BY query_start ASC;

-- View: Cache hit ratio (higher is better)
CREATE OR REPLACE VIEW v_cache_hit_ratio AS
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio,
  round(
    100 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)),
    2
  ) as cache_hit_percent
FROM pg_statio_user_tables;

-- View: Disk I/O statistics
CREATE OR REPLACE VIEW v_io_statistics AS
SELECT
  schemaname,
  tablename,
  seq_scan as sequential_scans,
  seq_tup_read as rows_sequentially_read,
  idx_scan as index_scans,
  idx_tup_fetch as rows_fetched_by_index,
  CASE
    WHEN (seq_scan + idx_scan) = 0 THEN 0
    ELSE round(100.0 * idx_scan / (seq_scan + idx_scan), 2)
  END as index_usage_percent
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY seq_scan DESC;

-- View: Vacuum and autovacuum status
CREATE OR REPLACE VIEW v_vacuum_status AS
SELECT
  schemaname,
  tablename,
  last_vacuum as last_manual_vacuum,
  last_autovacuum as last_auto_vacuum,
  vacuum_count + autovacuum_count as total_vacuums,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  CASE
    WHEN n_live_tup = 0 THEN 0
    ELSE round(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2)
  END as dead_rows_percent
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY n_dead_tup DESC;

-- View: Replication lag (for read replicas)
CREATE OR REPLACE VIEW v_replication_lag AS
SELECT
  client_addr as replica_ip,
  replay_lag as replication_lag,
  flush_lsn,
  replay_lsn,
  CASE
    WHEN replay_lag IS NULL THEN 'PRIMARY'
    WHEN replay_lag < INTERVAL '1 second' THEN 'GOOD'
    WHEN replay_lag < INTERVAL '5 seconds' THEN 'WARNING'
    ELSE 'CRITICAL'
  END as status
FROM pg_stat_replication;

-- Function: Monitor connection pool (for PgBouncer)
CREATE OR REPLACE FUNCTION monitor_pool_status()
RETURNS TABLE(
  database_name text,
  total_connections int,
  available_connections int,
  idle_connections int,
  active_connections int,
  waiting_queries int
) AS $$
  SELECT
    datname,
    count(*),
    count(CASE WHEN state = 'idle' THEN 1 END),
    count(CASE WHEN state = 'idle' THEN 1 END),
    count(CASE WHEN state = 'active' THEN 1 END),
    count(CASE WHEN wait_event IS NOT NULL THEN 1 END)
  FROM pg_stat_activity
  WHERE datname IS NOT NULL
  GROUP BY datname;
$$ LANGUAGE SQL;

-- Function: Analyze specific table performance
CREATE OR REPLACE FUNCTION analyze_table_performance(table_name text)
RETURNS TABLE(
  metric_name text,
  metric_value text
) AS $$
DECLARE
  v_seq_scans bigint;
  v_idx_scans bigint;
  v_live_rows bigint;
  v_dead_rows bigint;
  v_cache_ratio numeric;
BEGIN
  SELECT seq_scan, idx_scan, n_live_tup, n_dead_tup INTO v_seq_scans, v_idx_scans, v_live_rows, v_dead_rows
  FROM pg_stat_user_tables
  WHERE relname = table_name;
  
  RETURN QUERY
  SELECT 'Sequential Scans'::text, v_seq_scans::text
  UNION ALL
  SELECT 'Index Scans', v_idx_scans::text
  UNION ALL
  SELECT 'Live Rows', v_live_rows::text
  UNION ALL
  SELECT 'Dead Rows', v_dead_rows::text
  UNION ALL
  SELECT 'Index Usage %', (CASE WHEN (v_seq_scans + v_idx_scans) = 0 THEN 0 ELSE round(100.0 * v_idx_scans / (v_seq_scans + v_idx_scans), 2) END)::text;
END;
$$ LANGUAGE plpgsql;

-- Queries to run regularly:
-- SELECT * FROM v_index_usage WHERE status = 'UNUSED';
-- SELECT * FROM v_slow_queries LIMIT 10;
-- SELECT * FROM v_cache_hit_ratio;
-- SELECT * FROM v_vacuum_status;
-- SELECT * FROM v_connections;
-- SELECT * FROM v_replication_lag;
