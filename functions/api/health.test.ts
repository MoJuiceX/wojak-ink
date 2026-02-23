import { describe, expect, it, vi, afterEach } from 'vitest';
import { onRequestGet, runHealthChecks } from './health';

describe('functions/api/health', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns healthy when optional integrations are unconfigured', async () => {
    const db = {
      prepare: () => ({
        first: vi.fn().mockResolvedValue({ ok: 1 }),
      }),
    };

    const report = await runHealthChecks({ DB: db, APP_VERSION: 'test' });
    expect(report.status).toBe('healthy');
    expect(report.checks['database.primary'].status).toBe('pass');
    expect(report.checks['cache.redis'].status).toBe('skip');
    expect(report.checks['flags.unleash'].status).toBe('skip');
  });

  it('returns degraded when optional checks fail but primary db passes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('fail', { status: 500 })) as unknown as typeof fetch,
    );

    const db = {
      prepare: () => ({
        first: vi.fn().mockResolvedValue({ ok: 1 }),
      }),
    };

    const report = await runHealthChecks({
      DB: db,
      REDIS_HEALTHCHECK_URL: 'https://example.com/redis-health',
    });
    expect(report.status).toBe('degraded');
    expect(report.checks['database.primary'].status).toBe('pass');
    expect(report.checks['cache.redis'].status).toBe('fail');
  });

  it('returns unhealthy when primary database check fails', async () => {
    const db = {
      prepare: () => ({
        first: vi.fn().mockRejectedValue(new Error('db down')),
      }),
    };

    const response = await onRequestGet({ env: { DB: db } } as Parameters<typeof onRequestGet>[0]);
    expect(response.status).toBe(503);
    const body = (await response.json()) as { status: string; checks: Record<string, { status: string }> };
    expect(body.status).toBe('unhealthy');
    expect(body.checks['database.primary'].status).toBe('fail');
  });
});
