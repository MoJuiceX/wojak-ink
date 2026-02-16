import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onRequest } from './active-job';

const TEST_WALLET = 'xch1' + 'a'.repeat(58);

function mockStmt(firstResult: unknown = null) {
  return {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(firstResult),
    run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
    all: vi.fn().mockResolvedValue({ results: [] }),
  };
}

function createEnv(queryHandlers: Record<string, ReturnType<typeof mockStmt>> = {}) {
  return {
    DB: {
      prepare: vi.fn((query: string) => {
        for (const [sub, stmt] of Object.entries(queryHandlers)) {
          if (query.includes(sub)) return stmt;
        }
        return mockStmt();
      }),
    },
  };
}

function makeRequest(wallet: string) {
  return new Request(`https://wojak.ink/api/mint/active-job?wallet=${wallet}`, {
    method: 'GET',
    headers: { 'CF-Connecting-IP': '127.0.0.1' },
  });
}

function createContext(env: ReturnType<typeof createEnv>, request: Request) {
  return { request, env, params: {}, data: {}, functionPath: '', waitUntil: vi.fn(), passThroughOnException: vi.fn(), next: vi.fn() } as unknown as Parameters<typeof onRequest>[0];
}

describe('active-job.ts', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns active job for wallet with active mint', async () => {
    const activeJob = {
      id: 7, step: 'uploading_ipfs', mint_type: 'free', mint_number: 42,
      offer_file: null, mintgarden_launcher_id: null, error_message: null,
      credit_cost: 10000, idempotency_key: 'key-123', created_at: '2026-01-01', expires_at: null,
    };
    const env = createEnv({ 'wallet_lock IS NOT NULL': mockStmt(activeJob) });
    const req = makeRequest(TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as { job: Record<string, unknown> };
    expect(data.job).not.toBeNull();
    expect(data.job.jobId).toBe(7);
    expect(data.job.idempotencyKey).toBe('key-123');
  });

  it('returns null job when no active mint', async () => {
    const env = createEnv({ 'wallet_lock IS NOT NULL': mockStmt(null) });
    const req = makeRequest(TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as { job: unknown };
    expect(data.job).toBeNull();
  });

  it('returns 400 for invalid wallet', async () => {
    const env = createEnv();
    const req = makeRequest('invalid');
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
  });

  it('returns 405 for POST request', async () => {
    const env = createEnv();
    const req = new Request('https://wojak.ink/api/mint/active-job?wallet=' + TEST_WALLET, {
      method: 'POST', headers: { 'CF-Connecting-IP': '127.0.0.1' },
    });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(405);
  });

  it('returns CORS headers for OPTIONS', async () => {
    const env = createEnv();
    const optReq = new Request('https://wojak.ink/api/mint/active-job', { method: 'OPTIONS' });
    const ctx = createContext(env, optReq);
    const res = await onRequest(ctx);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://wojak.ink');
  });

  it('returns job with offer file for paid mint awaiting payment', async () => {
    const activeJob = {
      id: 10, step: 'awaiting_payment', mint_type: 'paid', mint_number: 100,
      offer_file: 'offer_data_here', mintgarden_launcher_id: null, error_message: null,
      credit_cost: null, idempotency_key: 'key-456', created_at: '2026-01-01', expires_at: '2026-01-01T00:20:00Z',
    };
    const env = createEnv({ 'wallet_lock IS NOT NULL': mockStmt(activeJob) });
    const req = makeRequest(TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as { job: Record<string, unknown> };
    expect(data.job.offerFile).toBe('offer_data_here');
    expect(data.job.mintType).toBe('paid');
    expect(data.job.expiresAt).toBe('2026-01-01T00:20:00Z');
  });

  it('returns job with launcher ID for nearly completed mint', async () => {
    const activeJob = {
      id: 15, step: 'finalizing', mint_type: 'free', mint_number: 200,
      offer_file: null, mintgarden_launcher_id: 'nft1xyz789', error_message: null,
      credit_cost: 10000, idempotency_key: 'key-789', created_at: '2026-01-01', expires_at: null,
    };
    const env = createEnv({ 'wallet_lock IS NOT NULL': mockStmt(activeJob) });
    const req = makeRequest(TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as { job: Record<string, unknown> };
    expect(data.job.launcherId).toBe('nft1xyz789');
    expect(data.job.step).toBe('finalizing');
  });

  it('returns 400 for missing wallet parameter', async () => {
    const env = createEnv();
    const req = new Request('https://wojak.ink/api/mint/active-job', {
      method: 'GET',
      headers: { 'CF-Connecting-IP': '127.0.0.1' },
    });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
  });

  it('returns job with credit cost converted to display units', async () => {
    const activeJob = {
      id: 20, step: 'uploading_ipfs', mint_type: 'free', mint_number: 50,
      offer_file: null, mintgarden_launcher_id: null, error_message: null,
      credit_cost: 15000, idempotency_key: 'key-abc', created_at: '2026-01-01', expires_at: null,
    };
    const env = createEnv({ 'wallet_lock IS NOT NULL': mockStmt(activeJob) });
    const req = makeRequest(TEST_WALLET);
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as { job: Record<string, unknown> };
    expect(data.job.creditCost).toBe(150); // 15000 / 100 = 150 credits
  });
});
