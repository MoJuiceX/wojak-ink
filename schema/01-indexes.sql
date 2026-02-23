-- Database Indexes for Query Optimization
-- Applied to all tables to improve performance at scale

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_stats ON users(id, win_rate, elo_rating);

-- Game history indexes (critical for leaderboards)
CREATE INDEX IF NOT EXISTS idx_game_history_user_date 
  ON game_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_game_date 
  ON game_history(game_id, created_at DESC);

-- Leaderboard indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_game_score 
  ON leaderboards(game_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_game 
  ON leaderboards(user_id, game_id);

-- Friendships and relationships
CREATE INDEX IF NOT EXISTS idx_friendships_user_status 
  ON friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status 
  ON friendships(friend_id, status);

-- Purchase and transaction records
CREATE INDEX IF NOT EXISTS idx_purchases_user_date 
  ON purchases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_status 
  ON purchases(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_status_date 
  ON transactions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_status 
  ON transactions(user_id, status, created_at DESC);

-- Session management
CREATE INDEX IF NOT EXISTS idx_sessions_user_expires 
  ON sessions(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_token 
  ON sessions(token);

-- Payment processing
CREATE INDEX IF NOT EXISTS idx_payments_user_status_date 
  ON payments(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status 
  ON payments(status, created_at DESC);

-- Audit logs for compliance
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp 
  ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date 
  ON audit_logs(user_id, created_at DESC);

-- Notifications (read-heavy)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON notifications(user_id, is_read, created_at DESC);

-- Analytics and reporting
CREATE INDEX IF NOT EXISTS idx_events_user_type_date 
  ON events(user_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type_date 
  ON events(event_type, created_at DESC);

-- Activity tracking
CREATE INDEX IF NOT EXISTS idx_user_activity_user_date 
  ON user_activity(user_id, activity_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_active_date 
  ON users(is_active, updated_at DESC);

-- Partial indexes for common filters
CREATE INDEX IF NOT EXISTS idx_active_sessions 
  ON sessions(user_id) WHERE expires_at > CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_pending_payments 
  ON payments(user_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_accepted_friendships 
  ON friendships(user_id) WHERE status = 'accepted';

-- BRIN indexes for time-series data (if using PostgreSQL)
-- CREATE INDEX idx_events_brin ON events USING BRIN (created_at);

-- Analyze query patterns to ensure indexes are being used
ANALYZE;

-- Show index statistics
-- SELECT schemaname, tablename, indexname, idx_scan
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan ASC;
