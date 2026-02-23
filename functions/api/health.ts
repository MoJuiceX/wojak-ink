// Health Check Endpoint
// Used by Kubernetes probes and load balancers to determine pod health
// Returns detailed status of all system components

import { writePool, readPool } from '../../src/lib/pool';
import { redis, cache } from '../../src/lib/redis';
import { logger } from '../../src/lib/logger';
import { metrics } from '../../src/lib/metrics';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  database: {
    primary: boolean;
    replica: boolean;
  };
  cache: {
    redis: boolean;
  };
  memory: {
    used_mb: number;
    total_mb: number;
    usage_percent: number;
  };
  uptime_seconds: number;
  checks: {
    [key: string]: boolean;
  };
}

const startTime = Date.now();

async function checkDatabase(): Promise<{ primary: boolean; replica: boolean }> {
  const primary = await checkPool(writePool, 'primary');
  const replica = await checkPool(readPool, 'replica');
  return { primary, replica };
}

async function checkPool(
  pool: any,
  name: string
): Promise<boolean> {
  try {
    const startTime = Date.now();
    await pool.query('SELECT 1');
    const duration = Date.now() - startTime;

    if (duration > 2000) {
      logger.warn(`Database ${name} slow query`, { duration });
      return false;
    }

    return true;
  } catch (error) {
    logger.error(`Database ${name} check failed`, { error });
    metrics.counter('health.check.db_fail', 1, { pool: name });
    return false;
  }
}

async function checkCache(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed', { error });
    metrics.counter('health.check.redis_fail', 1);
    return false;
  }
}

function checkMemory(): {
  used_mb: number;
  total_mb: number;
  usage_percent: number;
} {
  const memUsage = process.memoryUsage();
  const used = Math.round(memUsage.heapUsed / 1024 / 1024);
  const total = Math.round(memUsage.heapTotal / 1024 / 1024);
  const percent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

  return {
    used_mb: used,
    total_mb: total,
    usage_percent: percent,
  };
}

function getUptime(): number {
  return Math.round((Date.now() - startTime) / 1000);
}

export default async function handler(req: Request): Promise<Response> {
  try {
    // Run all health checks in parallel
    const [dbHealth, cacheHealth, memHealth] = await Promise.all([
      checkDatabase(),
      checkCache(),
      Promise.resolve(checkMemory()),
    ]);

    const uptime = getUptime();

    // Determine overall status
    const allChecks = {
      'database.primary': dbHealth.primary,
      'database.replica': dbHealth.replica,
      'cache.redis': cacheHealth,
      'memory.ok': memHealth.usage_percent < 90,
    };

    const checkResults = Object.values(allChecks);
    const healthy = checkResults.every((check) => check === true);
    const degraded =
      !healthy && checkResults.filter((check) => check === true).length > 0;

    const status: HealthCheckResult = {
      status: healthy ? 'healthy' : degraded ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      database: dbHealth,
      cache: {
        redis: cacheHealth,
      },
      memory: memHealth,
      uptime_seconds: uptime,
      checks: allChecks,
    };

    // Log health check result
    if (!healthy) {
      logger.warn('Health check failed', { status });
      metrics.counter('health.check.failure', 1);
    } else {
      metrics.counter('health.check.success', 1);
    }

    // Return appropriate HTTP status
    const httpStatus = healthy ? 200 : degraded ? 206 : 503;

    return new Response(JSON.stringify(status), {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('Health check endpoint error', { error });

    const errorStatus: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      database: { primary: false, replica: false },
      cache: { redis: false },
      memory: {
        used_mb: 0,
        total_mb: 0,
        usage_percent: 0,
      },
      uptime_seconds: getUptime(),
      checks: {
        error: false,
      },
    };

    return new Response(JSON.stringify(errorStatus), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
