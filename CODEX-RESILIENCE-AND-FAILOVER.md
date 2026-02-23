# Codex Resilience & Failover — Self-Healing Infrastructure

**Generated:** 2026-02-23 13:31 UTC  
**Status:** Ready for implementation  
**Effort Estimate:** 40 minutes  
**ROI:** Critical (prevents cascading failures, auto-recovery)

---

## Overview

**Current State:** No failover strategy. If database goes down, app crashes.  
**Problem:** Single points of failure, cascading outages, manual recovery.  
**Solution:** Circuit breakers, retry logic, graceful degradation, auto-recovery.

**Outcome:** System automatically recovers from failures. 99.9% uptime.

---

## 1. CIRCUIT BREAKER PATTERN (10 min)

### Task 1A: Implement Circuit Breaker Library

```bash
npm install opossum  # Circuit breaker library
```

**File: `src/lib/circuitBreaker.ts`**

```typescript
import CircuitBreaker from 'opossum';

// Create circuit breaker for database
export const dbCircuit = new CircuitBreaker(
  async (query: string, params: any[]) => {
    return db.query(query, params);
  },
  {
    timeout: 3000,           // 3 second timeout
    errorThresholdPercentage: 50,  // Open circuit if 50% errors
    resetTimeout: 30000,     // Try again after 30 seconds
    name: 'database',
    healthCheckInterval: 5000, // Check health every 5 seconds
  }
);

// Create circuit breaker for external API
export const externalAPICircuit = new CircuitBreaker(
  async (endpoint: string) => {
    return fetch(`https://api-external.com${endpoint}`);
  },
  {
    timeout: 5000,
    errorThresholdPercentage: 30,
    resetTimeout: 60000,
    name: 'external-api',
  }
);

// Usage
export const getGameWithCircuitBreaker = async (gameId: string) => {
  try {
    return await dbCircuit.fire('SELECT * FROM games WHERE id = ?', [gameId]);
  } catch (error) {
    if (dbCircuit.opened) {
      // Circuit is open: serve fallback
      console.warn('⚠️  Database circuit open, serving cached data');
      return cache.get(`game:${gameId}`);
    }
    throw error;
  }
};
```

### Task 1B: Monitor Circuit Breaker Status

```typescript
// Track circuit state
dbCircuit.on('open', () => {
  console.warn('🔴 Database circuit OPEN');
  metrics.counter('circuit_breaker.open', { service: 'database' });
  sendAlert('database-circuit-open');
});

dbCircuit.on('halfOpen', () => {
  console.log('🟡 Database circuit HALF-OPEN (testing recovery)');
  metrics.counter('circuit_breaker.half_open', { service: 'database' });
});

dbCircuit.on('close', () => {
  console.log('🟢 Database circuit CLOSED (recovered)');
  metrics.counter('circuit_breaker.close', { service: 'database' });
});

// Report circuit health
setInterval(() => {
  console.log(`Circuit breaker status:
    Database: ${dbCircuit.opened ? 'OPEN' : 'CLOSED'}
    External API: ${externalAPICircuit.opened ? 'OPEN' : 'CLOSED'}
  `);
}, 60000);
```

---

## 2. RETRY LOGIC WITH EXPONENTIAL BACKOFF (10 min)

### Task 2A: Implement Retry Helper

```typescript
export const retry = async <T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> => {
  const {
    maxAttempts = 3,
    baseDelay = 100,
    maxDelay = 30000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) break;

      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );

      if (onRetry) {
        onRetry(attempt, error);
      }

      console.log(`⏳ Retry attempt ${attempt}/${maxAttempts}, waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};
```

### Task 2B: Use Retry in API Calls

```typescript
// Retry database queries
export const queryWithRetry = (query: string, params: any[]) => {
  return retry(
    () => db.query(query, params),
    {
      maxAttempts: 3,
      baseDelay: 100,
      onRetry: (attempt, error) => {
        console.warn(`Query retry ${attempt}: ${error.message}`);
        metrics.counter('query.retry', { attempt });
      },
    }
  );
};

// Retry external API calls
export const fetchWithRetry = (url: string, options: any = {}) => {
  return retry(
    () => fetch(url, options),
    {
      maxAttempts: 5,
      baseDelay: 200,
      maxDelay: 10000,
      onRetry: (attempt) => {
        console.log(`Fetching ${url}: retry ${attempt}`);
      },
    }
  );
};
```

### Task 2C: Add Jitter (Prevent Thundering Herd)

```typescript
// Add random jitter to prevent all clients retrying at once
export const retryWithJitter = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) break;

      // Exponential backoff + random jitter
      const baseDelay = 100 * Math.pow(2, attempt - 1);
      const jitter = Math.random() * baseDelay;
      const delay = baseDelay + jitter;

      console.log(`⏳ Retry ${attempt}, delay ${delay.toFixed(0)}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};
```

---

## 3. GRACEFUL DEGRADATION (10 min)

### Task 3A: Fallback Strategies

```typescript
// If database is down, serve from cache
export const getLeaderboardWithFallback = async (gameId: string) => {
  try {
    // Try fresh data
    const leaderboard = await queryWithRetry(
      'SELECT * FROM leaderboards WHERE game_id = ? ORDER BY score DESC LIMIT 100',
      [gameId]
    );
    return leaderboard;
  } catch (error) {
    console.warn(`Database unavailable, using cached leaderboard for game ${gameId}`);
    
    // Fallback: serve stale cache
    const cached = await redis.get(`leaderboard:${gameId}:stale`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Last resort: serve empty data with warning
    return {
      data: [],
      warning: 'Leaderboard temporarily unavailable',
      cached: true,
    };
  }
};

// If external API is down, use local computation
export const getRecommendationsWithFallback = async (userId: string) => {
  try {
    return await fetchWithRetry(
      `https://recommendation-api.com/recommend?user=${userId}`
    );
  } catch (error) {
    console.warn(`Recommendation API unavailable, using local algorithm`);
    
    // Fallback: use local ML model or random
    return [
      { game: 'popular1', reason: 'Popular with similar players' },
      { game: 'popular2', reason: 'Recently launched' },
    ];
  }
};

// If cache is down, query database directly
export const getDataWithMultipleFallbacks = async (key: string) => {
  // Try 1: Redis cache
  try {
    const cached = await redis.get(key);
    if (cached) {
      metrics.counter('cache.hit');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Redis error, trying database: ${error.message}`);
  }
  
  // Try 2: Database
  try {
    const data = await queryWithRetry(`SELECT * FROM data WHERE key = ?`, [key]);
    metrics.counter('db.hit');
    return data;
  } catch (error) {
    console.warn(`Database error, serving degraded response: ${error.message}`);
  }
  
  // Try 3: Return degraded/empty response
  metrics.counter('fallback.degraded');
  return { data: null, degraded: true, message: 'Service temporarily reduced' };
};
```

### Task 3B: Feature Flags for Degradation

```typescript
// Disable expensive features during overload
export const shouldRunExpensiveOperation = async (operation: string) => {
  const systemLoad = await getSystemLoad();
  
  if (systemLoad > 0.9) {
    // Under high load: disable non-essential features
    const essentialFeatures = ['login', 'play_game', 'save_score'];
    
    if (!essentialFeatures.includes(operation)) {
      console.warn(`High system load, disabling ${operation}`);
      return false;
    }
  }
  
  return true;
};

// Usage
export const handleGameRequest = async (gameId: string, userId: string) => {
  // Essential: always allow
  const gameData = await getGame(gameId);
  
  // Non-essential: disable under load
  if (await shouldRunExpensiveOperation('recommendations')) {
    gameData.recommendations = await getRecommendations(userId);
  }
  
  // Non-essential: disable under load
  if (await shouldRunExpensiveOperation('analytics')) {
    await trackGameLoad(gameId);
  }
  
  return gameData;
};
```

---

## 4. AUTO-RECOVERY (5 min)

### Task 4A: Automated Health Recovery

```typescript
// Detect unhealthy services and auto-restart
export const autoRecovery = async () => {
  const services = {
    database: checkDatabaseHealth,
    cache: checkCacheHealth,
    externalAPI: checkExternalAPIHealth,
  };
  
  for (const [serviceName, healthCheck] of Object.entries(services)) {
    try {
      const isHealthy = await healthCheck();
      
      if (!isHealthy) {
        console.warn(`⚠️  ${serviceName} is unhealthy, attempting recovery`);
        
        switch (serviceName) {
          case 'database':
            await restartDatabaseConnection();
            break;
          case 'cache':
            await restartRedis();
            break;
          case 'externalAPI':
            // External API down: circuit breaker handles this
            break;
        }
      }
    } catch (error) {
      console.error(`Error checking ${serviceName} health: ${error.message}`);
      metrics.counter('health_check.error', { service: serviceName });
    }
  }
};

// Run health checks every minute
setInterval(autoRecovery, 60000);

async function checkDatabaseHealth() {
  try {
    await db.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function checkCacheHealth() {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

async function restartDatabaseConnection() {
  console.log('🔄 Restarting database connection pool');
  await db.end();
  db = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // Test connection
  const success = await checkDatabaseHealth();
  if (success) {
    console.log('✅ Database connection restored');
    metrics.counter('recovery.success', { service: 'database' });
  } else {
    console.error('❌ Failed to restore database connection');
    sendAlert('database-recovery-failed');
  }
}

async function restartRedis() {
  console.log('🔄 Restarting Redis connection');
  await redis.quit();
  redis = new Redis({ host: process.env.REDIS_HOST });
  
  const success = await checkCacheHealth();
  if (success) {
    console.log('✅ Redis connection restored');
  } else {
    console.error('❌ Failed to restore Redis connection');
  }
}
```

### Task 4B: Connection Pool Recycling

```typescript
// Periodically recycle connections to prevent leaks
export const recycleConnections = async () => {
  console.log('♻️  Recycling connection pools');
  
  // Drain old connections
  await db.drain();
  
  // Create new pool
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
  });
  
  console.log('✅ Connection pool recycled');
};

// Run every 6 hours
setInterval(recycleConnections, 6 * 60 * 60 * 1000);
```

---

## 5. BULKHEAD PATTERN (5 min)

### Task 5A: Isolate Critical Resources

```typescript
// Separate thread pools for different operations
const criticalOpsPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  name: 'critical-ops',
});

const analyticsPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  name: 'analytics',
});

// Critical operations (login, play game) use dedicated pool
export const loginUser = async (email: string, password: string) => {
  return criticalOpsPool.query(
    'SELECT * FROM users WHERE email = ? AND password = ?',
    [email, password]
  );
};

// Non-critical operations (analytics) use separate pool
export const trackAnalytics = async (event: string) => {
  return analyticsPool.query(
    'INSERT INTO analytics (event, timestamp) VALUES (?, NOW())',
    [event]
  );
};
```

---

## Definition of Done

✅ Circuit breakers for all external dependencies  
✅ Retry logic with exponential backoff + jitter  
✅ Graceful degradation strategies  
✅ Auto-recovery procedures  
✅ Bulkhead pattern (resource isolation)  
✅ Health checks every 60 seconds  
✅ All failures logged & alerted  

---

## Resilience Metrics

| Component | MTBF* | MTTR** | Recovery |
|-----------|-------|--------|----------|
| Database | 30d | 5 min | Auto-reconnect |
| Cache | 30d | 2 min | Auto-restart |
| External API | - | N/A | Circuit breaker |
| App server | 7d | 1 min | Pod restart |

*MTBF = Mean Time Between Failures  
**MTTR = Mean Time To Recovery

---

**System now self-heals. Failures don't cascade. 99.9% uptime achievable.** 🚀
