import Redis from 'ioredis';
import { logger } from './logger';
import { metrics } from './metrics';

// Redis client configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  enableReadyCheck: true,
  enableOfflineQueue: true,
  lazyConnect: false,
});

// Event handlers
redis.on('connect', () => {
  logger.info('Redis connected');
  metrics.counter('redis.connection.success');
});

redis.on('error', (err) => {
  logger.error('Redis error', { error: err.message });
  metrics.counter('redis.connection.error');
});

redis.on('reconnecting', () => {
  logger.warn('Redis reconnecting...');
  metrics.counter('redis.reconnect');
});

// Cache key builder
function buildCacheKey(namespace: string, key: string | any[]): string {
  if (Array.isArray(key)) {
    return `${namespace}:${JSON.stringify(key)}`;
  }
  return `${namespace}:${key}`;
}

// Main cache interface
export const cache = {
  // Get a value
  async get<T>(namespace: string, key: string | any[]): Promise<T | null> {
    const cacheKey = buildCacheKey(namespace, key);
    const start = Date.now();

    try {
      const value = await redis.get(cacheKey);
      const duration = Date.now() - start;

      metrics.histogram('cache.get.duration', duration);

      if (value) {
        metrics.counter('cache.hit', 1, { namespace });
        return JSON.parse(value) as T;
      }

      metrics.counter('cache.miss', 1, { namespace });
      return null;
    } catch (error) {
      logger.error('Cache get error', { error, cacheKey });
      metrics.counter('cache.error', 1, { operation: 'get' });
      return null; // Return null on error, don't break the request
    }
  },

  // Set a value
  async set<T>(
    namespace: string,
    key: string | any[],
    value: T,
    ttlSeconds: number = 3600
  ): Promise<boolean> {
    const cacheKey = buildCacheKey(namespace, key);
    const start = Date.now();

    try {
      const serialized = JSON.stringify(value);
      await redis.setex(cacheKey, ttlSeconds, serialized);
      const duration = Date.now() - start;

      metrics.histogram('cache.set.duration', duration);
      metrics.counter('cache.set', 1, { namespace });

      return true;
    } catch (error) {
      logger.error('Cache set error', { error, cacheKey });
      metrics.counter('cache.error', 1, { operation: 'set' });
      return false;
    }
  },

  // Delete a value
  async del(namespace: string, key: string | any[]): Promise<boolean> {
    const cacheKey = buildCacheKey(namespace, key);

    try {
      const result = await redis.del(cacheKey);
      metrics.counter('cache.delete', 1, { namespace });
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error', { error, cacheKey });
      metrics.counter('cache.error', 1, { operation: 'delete' });
      return false;
    }
  },

  // Delete by pattern
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;

      const deleted = await redis.del(...keys);
      metrics.counter('cache.delete_pattern', deleted);
      logger.info('Deleted cache keys by pattern', { pattern, deleted });

      return deleted;
    } catch (error) {
      logger.error('Cache delete pattern error', { error, pattern });
      metrics.counter('cache.error', 1, { operation: 'delete_pattern' });
      return 0;
    }
  },

  // Get or compute
  async getOrSet<T>(
    namespace: string,
    key: string | any[],
    compute: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T> {
    // Try cache first
    const cached = await cache.get<T>(namespace, key);
    if (cached) return cached;

    // Compute value
    const value = await compute();

    // Cache it
    await cache.set(namespace, key, value, ttlSeconds);

    return value;
  },

  // Increment a counter
  async incr(namespace: string, key: string): Promise<number> {
    const cacheKey = buildCacheKey(namespace, key);

    try {
      const result = await redis.incr(cacheKey);
      metrics.counter('cache.incr', 1);
      return result;
    } catch (error) {
      logger.error('Cache incr error', { error, cacheKey });
      throw error;
    }
  },

  // Set with expiration
  async setWithExpiry(
    namespace: string,
    key: string,
    value: any,
    ttlSeconds: number
  ): Promise<boolean> {
    const cacheKey = buildCacheKey(namespace, key);

    try {
      const serialized = JSON.stringify(value);
      await redis.setex(cacheKey, ttlSeconds, serialized);
      return true;
    } catch (error) {
      logger.error('Cache setWithExpiry error', { error, cacheKey });
      return false;
    }
  },

  // List operations
  async lpush(namespace: string, key: string, ...values: any[]): Promise<number> {
    const cacheKey = buildCacheKey(namespace, key);
    const serialized = values.map((v) => JSON.stringify(v));

    try {
      const result = await redis.lpush(cacheKey, ...serialized);
      return result;
    } catch (error) {
      logger.error('Cache lpush error', { error, cacheKey });
      throw error;
    }
  },

  async lrange<T>(
    namespace: string,
    key: string,
    start: number,
    stop: number
  ): Promise<T[]> {
    const cacheKey = buildCacheKey(namespace, key);

    try {
      const values = await redis.lrange(cacheKey, start, stop);
      return values.map((v) => JSON.parse(v)) as T[];
    } catch (error) {
      logger.error('Cache lrange error', { error, cacheKey });
      return [];
    }
  },

  // Hash operations (good for objects)
  async hset(namespace: string, key: string, field: string, value: any): Promise<number> {
    const cacheKey = buildCacheKey(namespace, key);

    try {
      const result = await redis.hset(cacheKey, field, JSON.stringify(value));
      return result;
    } catch (error) {
      logger.error('Cache hset error', { error, cacheKey });
      throw error;
    }
  },

  async hget<T>(namespace: string, key: string, field: string): Promise<T | null> {
    const cacheKey = buildCacheKey(namespace, key);

    try {
      const value = await redis.hget(cacheKey, field);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache hget error', { error, cacheKey });
      return null;
    }
  },

  async hgetall<T>(namespace: string, key: string): Promise<Record<string, T>> {
    const cacheKey = buildCacheKey(namespace, key);

    try {
      const values = await redis.hgetall(cacheKey);
      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(values)) {
        result[field] = JSON.parse(value as string) as T;
      }
      return result;
    } catch (error) {
      logger.error('Cache hgetall error', { error, cacheKey });
      return {};
    }
  },

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return false;
    }
  },

  // Clear all (WARNING: production use only with caution)
  async flushAll(): Promise<void> {
    try {
      await redis.flushall();
      logger.warn('Redis flushed - all cache cleared');
    } catch (error) {
      logger.error('Cache flush error', { error });
      throw error;
    }
  },
};

// Cache decorator for functions
export function Cached(
  namespace: string = 'default',
  ttl: number = 3600
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;

      try {
        // Try cache
        const cached = await cache.get(namespace, cacheKey);
        if (cached !== null) {
          metrics.counter('cache.decorator.hit');
          return cached;
        }
      } catch (error) {
        logger.warn('Cache lookup failed, proceeding with computation', { error });
      }

      // Compute value
      const result = await originalMethod.apply(this, args);

      // Cache result
      try {
        await cache.set(namespace, cacheKey, result, ttl);
      } catch (error) {
        logger.warn('Cache storage failed', { error });
      }

      return result;
    };

    return descriptor;
  };
}

// Export Redis client for advanced operations
export { redis };

// Graceful shutdown
export async function closeRedis() {
  logger.info('Closing Redis connection...');
  await redis.quit();
  logger.info('Redis connection closed');
}
