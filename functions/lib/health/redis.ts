import type { HealthCheckDetail } from './pool';

export interface RedisHealthOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function normalizeRedisHealthResponse(payload: unknown, textFallback: string): boolean {
  if (typeof payload === 'object' && payload !== null) {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.healthy === 'boolean') return obj.healthy;
    if (typeof obj.ok === 'boolean') return obj.ok;
    if (typeof obj.status === 'string') {
      return ['ok', 'pass', 'healthy', 'pong'].includes(obj.status.toLowerCase());
    }
    if (typeof obj.result === 'string') {
      return obj.result.toUpperCase() === 'PONG';
    }
  }

  const normalized = textFallback.trim().toUpperCase();
  return normalized === 'PONG' || normalized === 'OK' || normalized === 'HEALTHY';
}

export async function checkRedisHealth(
  env: Record<string, unknown>,
  options: RedisHealthOptions = {}
): Promise<HealthCheckDetail> {
  const urlValue = env.REDIS_HEALTHCHECK_URL;
  if (typeof urlValue !== 'string' || urlValue.trim() === '') {
    return {
      status: 'skip',
      provider: 'none',
      reason: 'REDIS_HEALTHCHECK_URL not configured',
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 2000;
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const token = typeof env.REDIS_HEALTHCHECK_TOKEN === 'string' ? env.REDIS_HEALTHCHECK_TOKEN : undefined;
    const response = await fetchImpl(urlValue, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: controller.signal,
    });

    const rawText = await response.text();
    let payload: unknown = rawText;
    try {
      payload = JSON.parse(rawText);
    } catch {
      // Plain text responses are supported.
    }

    const healthy = response.ok && normalizeRedisHealthResponse(payload, rawText);
    return {
      status: healthy ? 'pass' : 'fail',
      provider: 'http-redis-probe',
      latencyMs: Date.now() - started,
      ...(healthy ? {} : { error: `Unexpected probe response (status ${response.status})` }),
    };
  } catch (error) {
    return {
      status: 'fail',
      provider: 'http-redis-probe',
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}
