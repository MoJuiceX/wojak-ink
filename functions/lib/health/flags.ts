import type { HealthCheckDetail } from './pool';

export interface FlagsHealthOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function toFeaturesUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, '');
  if (normalized.endsWith('/client/features')) return normalized;
  return `${normalized}/client/features`;
}

export async function checkFeatureFlagsHealth(
  env: Record<string, unknown>,
  options: FlagsHealthOptions = {}
): Promise<HealthCheckDetail> {
  const baseUrl = typeof env.UNLEASH_API_URL === 'string' ? env.UNLEASH_API_URL : '';
  const apiKey = typeof env.UNLEASH_API_KEY === 'string' ? env.UNLEASH_API_KEY : '';

  if (!baseUrl || !apiKey) {
    return {
      status: 'skip',
      provider: 'unleash',
      reason: 'UNLEASH_API_URL/UNLEASH_API_KEY not configured',
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 2000;
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(toFeaturesUrl(baseUrl), {
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    return {
      status: response.ok ? 'pass' : 'fail',
      provider: 'unleash',
      latencyMs: Date.now() - started,
      ...(response.ok ? {} : { error: `HTTP ${response.status}` }),
    };
  } catch (error) {
    return {
      status: 'fail',
      provider: 'unleash',
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}
