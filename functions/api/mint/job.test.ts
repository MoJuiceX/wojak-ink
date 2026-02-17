import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 119, resetAt: Date.now() + 60000 }),
  getRateLimitKey: vi.fn().mockReturnValue('ip:127.0.0.1'),
  MINT_RATE_LIMITS: {
    prepare: { windowMs: 60000, maxRequests: 5, keyPrefix: 'mint-prepare' },
    confirm: { windowMs: 60000, maxRequests: 10, keyPrefix: 'mint-confirm' },
    jobPoll: { windowMs: 60000, maxRequests: 120, keyPrefix: 'mint-job' },
  },
}));

import { onRequest } from './job';
import { checkRateLimit } from '../../lib/rateLimit';

const TEST_WALLET = 'xch1' + 'a'.repeat(58);

function mockStmt(firstResult: unknown = null, runResult = { meta: { changes: 1 } }) {
  return {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(firstResult),
    run: vi.fn().mockResolvedValue(runResult),
    all: vi.fn().mockResolvedValue({ results: [] }),
  };
}

function createEnv(queryHandlers: Record<string, ReturnType<typeof mockStmt>> = {}) {
  return {
    DB: {
      prepare: vi.fn((query: string) => {
        for (const [substring, stmt] of Object.entries(queryHandlers)) {
          if (query.includes(substring)) return stmt;
        }
        return mockStmt();
      }),
    },
  };
}

function makeGetRequest(jobId: number | string, wallet: string) {
  return new Request(`https://wojak.ink/api/mint/job?id=${jobId}&wallet=${wallet}`, {
    method: 'GET',
    headers: { 'CF-Connecting-IP': '127.0.0.1' },
  });
}

function createContext(env: ReturnType<typeof createEnv>, request: Request) {
  return { request, env, params: {}, data: {}, functionPath: '', waitUntil: vi.fn(), passThroughOnException: vi.fn(), next: vi.fn() } as unknown as Parameters<typeof onRequest>[0];
}

describe('job.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 119, resetAt: Date.now() + 60000 });
  });

  it('returns 405 for non-GET requests', async () => {
    const env = createEnv();
    const req = new Request('https://wojak.ink/api/mint/job', { method: 'POST', headers: { 'CF-Connecting-IP': '127.0.0.1' } });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(405);
  });

  it('returns 400 for missing job id', async () => {
    const env = createEnv();
    const req = new Request(`https://wojak.ink/api/mint/job?wallet=${TEST_WALLET}`, { method: 'GET', headers: { 'CF-Connecting-IP': '127.0.0.1' } });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid wallet', async () => {
    const env = createEnv();
    const req = makeGetRequest(1, 'badwallet');
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
  });

  it('returns 404 when job not found', async () => {
    const env = createEnv({ 'FROM mint_jobs': mockStmt(null) });
    const req = makeGetRequest(999, TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(404);
  });

  it('returns correct step info for processing job', async () => {
    const jobRow = {
      id: 1, wallet_address: TEST_WALLET, mint_type: 'free', step: 'uploading_ipfs',
      mint_number: 42, mintgarden_launcher_id: null, offer_file: null,
      error_message: null, error_code: null, credit_cost: 10000, credit_spend_id: 1,
      created_at: '2026-01-01T00:00:00Z', expires_at: null,
    };
    const env = createEnv({ 'FROM mint_jobs': mockStmt(jobRow) });
    const req = makeGetRequest(1, TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.step).toBe('uploading_ipfs');
    expect(data.stepLabel).toContain('IPFS');
    expect(data.stepNumber).toBe(3);
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });
    const env = createEnv();
    const req = makeGetRequest(1, TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(429);
  });

  it('inline-expires awaiting_payment jobs past expires_at', async () => {
    const pastDate = new Date(Date.now() - 60000).toISOString();
    const jobRow = {
      id: 1, wallet_address: TEST_WALLET, mint_type: 'paid', step: 'awaiting_payment',
      mint_number: 42, mintgarden_launcher_id: null, offer_file: 'offer-data',
      error_message: null, error_code: null, credit_cost: null, credit_spend_id: null,
      created_at: '2026-01-01T00:00:00Z', expires_at: pastDate,
    };
    const updateStmt = mockStmt();
    const env = createEnv({ 'FROM mint_jobs': mockStmt(jobRow), 'UPDATE mint_jobs SET step': updateStmt });
    const req = makeGetRequest(1, TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as Record<string, unknown>;
    expect(data.step).toBe('failed');
    expect(data.error).toContain('expired');
  });

  it('returns completed job with launcher ID', async () => {
    const jobRow = {
      id: 1, wallet_address: TEST_WALLET, mint_type: 'free', step: 'completed',
      mint_number: 42, mintgarden_launcher_id: 'nft1abc123', offer_file: null,
      error_message: null, error_code: null, credit_cost: 10000, credit_spend_id: 1,
      created_at: '2026-01-01T00:00:00Z', expires_at: null,
    };
    const env = createEnv({ 'FROM mint_jobs': mockStmt(jobRow) });
    const req = makeGetRequest(1, TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as Record<string, unknown>;
    expect(data.step).toBe('completed');
    expect(data.launcherId).toBe('nft1abc123');
    expect(data.mintgardenUrl).toContain('nft1abc123');
  });

  it('returns CORS headers for OPTIONS', async () => {
    const env = createEnv();
    const optReq = new Request('https://wojak.ink/api/mint/job', { method: 'OPTIONS' });
    const ctx = createContext(env, optReq);
    const res = await onRequest(ctx);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://wojak.ink');
  });

  it('returns credits spent and remaining for completed free mint', async () => {
    const jobRow = {
      id: 1, wallet_address: TEST_WALLET, mint_type: 'free', step: 'completed',
      mint_number: 42, mintgarden_launcher_id: 'nft1abc123', offer_file: null,
      error_message: null, error_code: null, credit_cost: 10000, credit_spend_id: 1,
      created_at: '2026-01-01T00:00:00Z', expires_at: null,
    };
    const env = createEnv({});
    env.DB.prepare = vi.fn((query: string) => {
      if (query.includes('FROM mint_jobs')) return mockStmt(jobRow);
      if (query.includes('COALESCE(SUM(credits_earned)')) return mockStmt({ balance: 15000 });
      return mockStmt();
    });
    const req = makeGetRequest(1, TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as Record<string, unknown>;
    expect(data.creditsSpent).toBe(100); // 10000 / 100
    expect(data.creditsRemaining).toBe(150); // 15000 / 100
  });

  it('returns failed job with error message', async () => {
    const jobRow = {
      id: 1, wallet_address: TEST_WALLET, mint_type: 'free', step: 'failed',
      mint_number: null, mintgarden_launcher_id: null, offer_file: null,
      error_message: 'IPFS upload failed', error_code: 'IPFS_UPLOAD_FAILED', credit_cost: 10000, credit_spend_id: 1,
      created_at: '2026-01-01T00:00:00Z', expires_at: null,
    };
    const env = createEnv({ 'FROM mint_jobs': mockStmt(jobRow) });
    const req = makeGetRequest(1, TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as Record<string, unknown>;
    expect(data.step).toBe('failed');
    expect(data.error).toBeDefined();
  });

  it('returns refunded job with creditsRefunded flag', async () => {
    const jobRow = {
      id: 1, wallet_address: TEST_WALLET, mint_type: 'free', step: 'refunded',
      mint_number: null, mintgarden_launcher_id: null, offer_file: null,
      error_message: 'Processing timed out', error_code: 'TIMEOUT', credit_cost: 10000, credit_spend_id: null,
      created_at: '2026-01-01T00:00:00Z', expires_at: null,
    };
    const env = createEnv({});
    env.DB.prepare = vi.fn((query: string) => {
      if (query.includes('FROM mint_jobs')) return mockStmt(jobRow);
      if (query.includes('COALESCE(SUM(credits_earned)')) return mockStmt({ balance: 20000 });
      return mockStmt();
    });
    const req = makeGetRequest(1, TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as Record<string, unknown>;
    expect(data.step).toBe('refunded');
    expect(data.creditsRefunded).toBe(true);
  });

  it('returns 400 for non-integer job id', async () => {
    const env = createEnv();
    const req = makeGetRequest('abc', TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
  });

  it('returns 400 for zero job id', async () => {
    const env = createEnv();
    const req = makeGetRequest(0, TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative job id', async () => {
    const env = createEnv();
    const req = makeGetRequest(-1, TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
  });

  it('returns queue position for mint_queued jobs', async () => {
    const jobRow = {
      id: 5, wallet_address: TEST_WALLET, mint_type: 'free', step: 'mint_queued',
      mint_number: 42, mintgarden_launcher_id: null, offer_file: null,
      error_message: null, error_code: null, credit_cost: 10000, credit_spend_id: 1,
      created_at: '2026-02-17T10:00:05Z', expires_at: null,
    };
    const env = createEnv({});
    env.DB.prepare = vi.fn((query: string) => {
      if (query.includes('FROM mint_jobs') && query.includes('WHERE id')) return mockStmt(jobRow);
      if (query.includes("step = 'mint_queued'") && query.includes('created_at <')) return mockStmt({ position: 2 });
      if (query.includes("step = 'mint_queued'") && query.includes('COUNT(*)') && !query.includes('created_at')) return mockStmt({ total: 7 });
      return mockStmt();
    });
    const req = makeGetRequest(5, TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.step).toBe('mint_queued');
    expect(data.queuePosition).toBe(3); // 2 + 1 (1-indexed)
    expect(data.queueTotal).toBe(7);
    expect((data.stepLabel as string)).toContain('#3');
  });
});
