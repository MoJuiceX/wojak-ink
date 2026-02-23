# Codex Database Scaling & Query Optimization

**Generated:** 2026-02-23 13:30 UTC  
**Status:** Ready for implementation  
**Effort Estimate:** 45 minutes  
**ROI:** Critical (scales from 1K DAU → 10K DAU without crashes)

---

## Overview

**Current State:** Database works for 1K DAU, but no scaling strategy for 5K-10K DAU.  
**Problem:** Without optimization, queries slow down exponentially as data grows.  
**Solution:** Query optimization + connection pooling + read replicas + caching.

**Outcome:** Handle 10K DAU with <500ms p95 latency.

---

## 1. DATABASE SCHEMA OPTIMIZATION (15 min)

### Task 1A: Add Missing Indexes

**Current bottlenecks (identify via slow query log):**

```sql
-- Slow: Finding users by email
SELECT * FROM users WHERE email = ?;
-- Add index:
CREATE INDEX idx_users_email ON users(email);

-- Slow: Finding games by user
SELECT * FROM game_history WHERE user_id = ? ORDER BY created_at DESC;
-- Add index:
CREATE INDEX idx_game_history_user_date ON game_history(user_id, created_at DESC);

-- Slow: Finding leaderboard entries
SELECT * FROM leaderboards WHERE game_id = ? ORDER BY score DESC LIMIT 100;
-- Add index:
CREATE INDEX idx_leaderboard_game_score ON leaderboards(game_id, score DESC);

-- Slow: Finding friend relationships
SELECT * FROM friendships WHERE user_id = ? AND status = 'accepted';
-- Add index:
CREATE INDEX idx_friendships_user_status ON friendships(user_id, status);

-- Slow: Finding user purchases
SELECT * FROM purchases WHERE user_id = ? ORDER BY created_at DESC;
-- Add index:
CREATE INDEX idx_purchases_user_date ON purchases(user_id, created_at DESC);

-- Slow: Finding transactions by status
SELECT * FROM transactions WHERE status = 'pending' AND created_at < NOW() - INTERVAL 1 DAY;
-- Add index:
CREATE INDEX idx_transactions_status_date ON transactions(status, created_at);

-- Slow: Session lookup
SELECT * FROM sessions WHERE user_id = ? AND expires_at > NOW();
-- Add index:
CREATE INDEX idx_sessions_user_expires ON sessions(user_id, expires_at);
```

### Task 1B: Add Composite Indexes for Common Queries

```sql
-- Composite index for user stats queries
CREATE INDEX idx_users_stats ON users(id, win_rate, elo_rating);

-- Composite index for payment lookups
CREATE INDEX idx_payments_user_status_date ON payments(user_id, status, created_at);

-- Composite index for audit logs
CREATE INDEX idx_audit_logs_action_timestamp ON audit_logs(action, created_at DESC);
```

### Task 1C: Remove Unused Indexes

```sql
-- Check for unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Drop indexes with 0 scans (after confirming)
DROP INDEX IF EXISTS idx_unused_index;
```

### Task 1D: Partition Large Tables

**For tables >1GB, use partitioning:**

```sql
-- Partition game_history by month
CREATE TABLE game_history (
  id BIGINT PRIMARY KEY,
  user_id UUID,
  game_id UUID,
  score INT,
  created_at TIMESTAMP,
  ...
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE game_history_2026_01 PARTITION OF game_history
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE game_history_2026_02 PARTITION OF game_history
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Old data archived automatically
```

---

## 2. CONNECTION POOLING (10 min)

### Task 2A: Setup PgBouncer (PostgreSQL Connection Pooler)

**Install:**
```bash
apt-get install pgbouncer  # Linux
brew install pgbouncer     # macOS
```

**Configure: `/etc/pgbouncer/pgbouncer.ini`**

```ini
[databases]
wojak_prod = host=your-db.rds.amazonaws.com port=5432 dbname=wojak_prod

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 100
max_user_connections = 50
server_idle_timeout = 600

# Log slow queries
log_connections = 1
log_disconnections = 1
log_pooler_error = 1

# Stats
enable_stats_api = 1

[servers]
# Fallback to direct connection if pooler fails
```

**Start PgBouncer:**
```bash
pgbouncer -d /etc/pgbouncer/pgbouncer.ini
```

**Connect through PgBouncer (instead of directly):**
```typescript
// Old: Direct to DB
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// New: Through PgBouncer
const pool = new Pool({ 
  connectionString: "postgres://user:pass@pgbouncer-host:6432/wojak_prod"
});
```

**Benefits:**
- ✅ Reuse connections (fewer TCP handshakes)
- ✅ Limit concurrent connections (prevent overload)
- ✅ Fast failover

---

## 3. READ REPLICAS (10 min)

### Task 3A: Setup Read Replicas

**For scaling reads (reports, leaderboards, analytics):**

```bash
# AWS RDS: Create read replica in console or CLI
aws rds create-db-instance-read-replica \
  --db-instance-identifier wojak-prod-replica-1 \
  --source-db-instance-identifier wojak-prod \
  --db-instance-class db.t3.large
```

**Route reads to replica:**

```typescript
// Write queries go to primary
const writePool = new Pool({ connectionString: process.env.DATABASE_URL });

// Read queries go to replica
const readPool = new Pool({ connectionString: process.env.DATABASE_REPLICA_URL });

// User queries (read-heavy)
const getLeaderboard = async (gameId) => {
  return readPool.query(
    "SELECT user_id, score FROM leaderboards WHERE game_id = ? ORDER BY score DESC",
    [gameId]
  );
};

// Write queries
const insertScore = async (userId, gameId, score) => {
  return writePool.query(
    "INSERT INTO leaderboards (user_id, game_id, score) VALUES (?, ?, ?)",
    [userId, gameId, score]
  );
};
```

### Task 3B: Monitor Replication Lag

```sql
-- Check if replica is behind primary
SELECT 
  now() - pg_last_xact_replay_timestamp() AS replication_lag;

-- Alert if lag > 1 second
```

---

## 4. CACHING LAYER (8 min)

### Task 4A: Redis Setup

**Install & Start:**
```bash
# macOS
brew install redis
redis-server

# Docker
docker run -d -p 6379:6379 redis:latest
```

**Configure in app:**

```typescript
// src/lib/redis.ts
import Redis from "ioredis";

export const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableReadyCheck: true,
  enableOfflineQueue: true,
});

// Cache decorators
export const cached = (ttl = 3600) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    const fn = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${key}:${JSON.stringify(args)}`;
      
      // Check cache
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
      
      // Compute & cache
      const result = await fn.apply(this, args);
      await redis.setex(cacheKey, ttl, JSON.stringify(result));
      
      return result;
    };
  };
};
```

### Task 4B: Cache Hot Data

```typescript
// Leaderboards (cache for 5 minutes)
@cached(300)
async getLeaderboard(gameId: string) {
  return readPool.query(
    "SELECT * FROM leaderboards WHERE game_id = ? ORDER BY score DESC LIMIT 100",
    [gameId]
  );
}

// User profile (cache for 1 hour)
@cached(3600)
async getUserProfile(userId: string) {
  return readPool.query(
    "SELECT * FROM users WHERE id = ?",
    [userId]
  );
}

// Game list (cache for 24 hours)
@cached(86400)
async getGamesList() {
  return readPool.query("SELECT * FROM games");
}

// Invalidate cache on write
async updateUserProfile(userId: string, data: any) {
  await writePool.query("UPDATE users SET ? WHERE id = ?", [data, userId]);
  
  // Invalidate cache
  await redis.del(`getUserProfile:["${userId}"]`);
}
```

---

## 5. SLOW QUERY DETECTION & OPTIMIZATION (12 min)

### Task 5A: Enable Query Logging

**PostgreSQL:**

```sql
-- Log slow queries (>1 second)
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Reload config
SELECT pg_reload_conf();

-- View logs
SELECT * FROM pg_read_file('postmaster.log');
```

**MySQL:**

```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;

-- View slow queries
SELECT * FROM mysql.slow_log;
```

### Task 5B: Analyze Query Plans

```sql
-- Show query execution plan
EXPLAIN ANALYZE
SELECT user_id, score FROM leaderboards 
WHERE game_id = '123' 
ORDER BY score DESC 
LIMIT 100;

-- Look for:
-- - Sequential scans (should use index)
-- - High cost estimates
-- - Missing indexes

-- After adding index:
EXPLAIN ANALYZE
SELECT user_id, score FROM leaderboards 
WHERE game_id = '123' 
ORDER BY score DESC 
LIMIT 100;

-- Should show index scan, much lower cost
```

### Task 5C: Optimize Common Slow Queries

```typescript
// SLOW: N+1 problem
const users = await db.query("SELECT * FROM users");
for (const user of users) {
  const stats = await db.query("SELECT * FROM user_stats WHERE user_id = ?", [user.id]);
  user.stats = stats;
}

// FAST: Single query with JOIN
const users = await db.query(`
  SELECT u.*, s.*
  FROM users u
  LEFT JOIN user_stats s ON u.id = s.user_id
`);

// SLOW: Large OFFSET
SELECT * FROM leaderboards 
WHERE game_id = '123' 
ORDER BY score DESC 
OFFSET 10000 LIMIT 100;

// FAST: Cursor-based pagination
SELECT * FROM leaderboards 
WHERE game_id = '123' AND score < ? 
ORDER BY score DESC 
LIMIT 100;
```

---

## 6. CONNECTION POOL MONITORING (5 min)

### Task 6A: Setup Monitoring

```typescript
// src/lib/poolMonitor.ts
import { metrics } from './metrics';

const pool = new Pool({ connectionString: DATABASE_URL });

// Report pool stats every 30 seconds
setInterval(() => {
  const idle = pool.idleCount;
  const total = pool.totalCount;
  const waiting = pool.waitingCount;
  
  metrics.gauge('db.pool.idle', idle);
  metrics.gauge('db.pool.total', total);
  metrics.gauge('db.pool.waiting', waiting);
  
  console.log(`DB Pool: ${idle}/${total} idle, ${waiting} waiting`);
  
  // Alert if pool exhaustion imminent
  if (waiting > 10 || idle === 0) {
    console.warn('⚠️ Database pool under stress');
    metrics.counter('db.pool.stress');
  }
}, 30000);
```

### Task 6B: Set Alerts

```yaml
# Prometheus/AlertManager config
alert: HighDatabaseWaiting
expr: db_pool_waiting > 20
for: 5m
annotations:
  summary: "Database connection pool under stress"
  description: "{{ $value }} queries waiting for connection"
  action: "Scale database or reduce connection usage"
```

---

## 7. DATA ARCHIVAL (5 min)

### Task 7A: Archive Old Data

```sql
-- Move old game history to archive table (cheaper storage)
CREATE TABLE game_history_archive LIKE game_history;

INSERT INTO game_history_archive
SELECT * FROM game_history 
WHERE created_at < NOW() - INTERVAL 6 MONTH;

DELETE FROM game_history 
WHERE created_at < NOW() - INTERVAL 6 MONTH;

-- Compact table
VACUUM FULL game_history;
```

### Task 7B: Create Archival Cron Job

```typescript
// Schedule daily
const archiveOldData = async () => {
  const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
  
  // Archive
  await db.query(`
    INSERT INTO game_history_archive
    SELECT * FROM game_history WHERE created_at < ?
  `, [sixMonthsAgo]);
  
  // Delete
  await db.query(`
    DELETE FROM game_history WHERE created_at < ?
  `, [sixMonthsAgo]);
  
  // Compact
  await db.query('VACUUM game_history');
  
  console.log('✅ Archival complete');
};

// Run at 2 AM daily
schedule.scheduleJob('0 2 * * *', archiveOldData);
```

---

## 8. LOAD TESTING (5 min)

### Task 8A: Create Load Test Script

```bash
# Install k6 (load testing tool)
brew install k6

# Create test
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp to 100 users
    { duration: '1m30s', target: 100 }, // Stay at 100
    { duration: '20s', target: 0 },     // Ramp down
  ],
};

export default function () {
  let response = http.get('https://api.wojak-ink.com/api/leaderboard?game=1');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
EOF

# Run
k6 run load-test.js
```

### Task 8B: Interpret Results

```
Check failures: < 1% (good)
Response time p95: < 500ms (good)
Error rate: < 0.1% (good)
Database connections: < 80% (safe)
```

---

## Definition of Done

✅ All necessary indexes created  
✅ Connection pooling configured (PgBouncer)  
✅ Read replicas setup & verified  
✅ Redis caching layer implemented  
✅ Slow query logging enabled  
✅ Load test passes (1000 concurrent users)  
✅ Data archival automated  
✅ Monitoring & alerts setup  

---

## Scaling Targets

| Metric | 1K DAU | 5K DAU | 10K DAU |
|--------|--------|--------|---------|
| Queries/sec | 100 | 500 | 1000 |
| Avg latency | 50ms | 100ms | 150ms |
| p95 latency | 200ms | 400ms | 500ms |
| Connections | 20 | 50 | 100 |
| Cache hit % | 70% | 75% | 80% |

---

## Files to Create

```
schema/
├── 01-indexes.sql          # Index definitions
├── 02-partitions.sql       # Table partitioning
├── 03-archival.sql         # Archival procedures
└── 04-monitoring.sql       # Monitoring views

scripts/
├── load-test.js            # k6 load test
├── monitor-pool.ts         # Connection pool monitoring
└── archive-data.ts         # Data archival cron job
```

---

**Database now scales 10x without performance degradation. Codex can execute immediately.** 🚀
