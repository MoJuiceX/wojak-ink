import { checkDatabaseHealth, type CheckStatus, type HealthCheckDetail } from '../lib/health/pool';
import { checkRedisHealth } from '../lib/health/redis';
import { checkFeatureFlagsHealth } from '../lib/health/flags';

interface Env {
  DB?: unknown;
  DB_REPLICA?: unknown;
  SALES_INDEX_KV?: unknown;
  APP_VERSION?: string;
  UNLEASH_API_URL?: string;
  UNLEASH_API_KEY?: string;
  REDIS_HEALTHCHECK_URL?: string;
  REDIS_HEALTHCHECK_TOKEN?: string;
}

interface KVLike {
  get(key: string): Promise<unknown>;
}

interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  runtime: 'cloudflare-pages-functions';
  checks: Record<string, HealthCheckDetail>;
}

function isKvLike(value: unknown): value is KVLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'get' in value &&
    typeof (value as { get?: unknown }).get === 'function'
  );
}

async function checkKvHealth(env: Env): Promise<HealthCheckDetail> {
  if (!isKvLike(env.SALES_INDEX_KV)) {
    return {
      status: 'skip',
      provider: 'kv',
      reason: 'SALES_INDEX_KV binding not configured',
    };
  }

  const started = Date.now();
  try {
    await env.SALES_INDEX_KV.get('__health_probe__');
    return {
      status: 'pass',
      provider: 'kv',
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      status: 'fail',
      provider: 'kv',
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function summarizeStatus(checks: Record<string, HealthCheckDetail>): HealthReport['status'] {
  const entries = Object.entries(checks);

  const requiredFailures = entries.filter(([name, check]) => {
    if (check.status !== 'fail') return false;
    return name === 'database.primary';
  });
  if (requiredFailures.length > 0) return 'unhealthy';

  const optionalFailures = entries.filter(([, check]) => check.status === 'fail');
  if (optionalFailures.length > 0) return 'degraded';

  return 'healthy';
}

function responseStatus(status: HealthReport['status']): number {
  switch (status) {
    case 'healthy':
      return 200;
    case 'degraded':
      return 206;
    case 'unhealthy':
      return 503;
  }
}

export async function runHealthChecks(env: Env): Promise<HealthReport> {
  const [database, cache, flags, kv] = await Promise.all([
    checkDatabaseHealth(env as Record<string, unknown>),
    checkRedisHealth(env as Record<string, unknown>),
    checkFeatureFlagsHealth(env as Record<string, unknown>),
    checkKvHealth(env),
  ]);

  const checks: Record<string, HealthCheckDetail> = {
    'database.primary': database.primary,
    'database.replica': database.replica,
    'cache.redis': cache,
    'flags.unleash': flags,
    'cache.kv': kv,
    'runtime.request-handler': {
      status: 'pass' satisfies CheckStatus,
      provider: 'cloudflare-pages-functions',
    },
  };

  return {
    status: summarizeStatus(checks),
    timestamp: new Date().toISOString(),
    version: env.APP_VERSION ?? 'unknown',
    runtime: 'cloudflare-pages-functions',
    checks,
  };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const report = await runHealthChecks(context.env);
    return new Response(JSON.stringify(report), {
      status: responseStatus(report.status),
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const fallback: HealthReport = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: context.env.APP_VERSION ?? 'unknown',
      runtime: 'cloudflare-pages-functions',
      checks: {
        'runtime.request-handler': {
          status: 'fail',
          provider: 'cloudflare-pages-functions',
          error: error instanceof Error ? error.message : String(error),
        },
      },
    };

    return new Response(JSON.stringify(fallback), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
};

export const onRequest = onRequestGet;
