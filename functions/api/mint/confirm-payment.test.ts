import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./process', () => ({
  finalizeJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./auditHelper', () => ({
  logMintStep: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 }),
  getRateLimitKey: vi.fn().mockReturnValue('ip:127.0.0.1'),
  MINT_RATE_LIMITS: {
    prepare: { windowMs: 60000, maxRequests: 5, keyPrefix: 'mint-prepare' },
    confirm: { windowMs: 60000, maxRequests: 10, keyPrefix: 'mint-confirm' },
    jobPoll: { windowMs: 60000, maxRequests: 120, keyPrefix: 'mint-job' },
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { onRequest } from './confirm-payment';
import { finalizeJob } from './process';
import { checkRateLimit } from '../../lib/rateLimit';

const TEST_WALLET = 'xch1' + 'a'.repeat(58);

function mockStmt(firstResult: unknown = null) {
  return {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(firstResult),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
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
    MINT_JOBS_KV: { put: vi.fn(), get: vi.fn(), delete: vi.fn() },
    PHASE2_COLLECTION_UUID: 'test-uuid',
    PINATA_JWT: 'jwt',
    PINATA_GATEWAY: 'gw',
    PHASE2_PROFILE_ID: 'pid',
    PHASE2_ROYALTY_ADDRESS: 'addr',
    PHASE2_ROYALTY_PCT: '10',
    MINTGARDEN_API_KEY: 'key',
  };
}

function makeRequest(body: unknown) {
  return new Request('https://wojak.ink/api/mint/confirm-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.0.0.1' },
    body: JSON.stringify(body),
  });
}

function createContext(env: ReturnType<typeof createEnv>, request: Request) {
  return { request, env, params: {}, data: {}, functionPath: '', waitUntil: vi.fn(), passThroughOnException: vi.fn(), next: vi.fn() } as unknown as Parameters<typeof onRequest>[0];
}

describe('confirm-payment.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 });
    mockFetch.mockReset();
  });

  it('returns 404 when job not found', async () => {
    const env = createEnv({ 'awaiting_payment': mockStmt(null) });
    const req = makeRequest({ jobId: 999, walletAddress: TEST_WALLET });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(404);
  });

  it('returns 400 for missing jobId', async () => {
    const env = createEnv();
    const req = makeRequest({ walletAddress: TEST_WALLET });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid wallet', async () => {
    const env = createEnv();
    const req = makeRequest({ jobId: 1, walletAddress: 'bad' });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
  });

  it('verifies launcher and finalizes paid mint', async () => {
    const awaitingJob = {
      id: 1, wallet_address: TEST_WALLET, mint_type: 'paid', step: 'awaiting_payment',
      mint_number: 42, mintgarden_launcher_id: 'nft1stored', offer_file: 'offer-data',
    };
    const finalJob = { mint_number: 42, mintgarden_launcher_id: 'nft1stored', phase2_mint_id: 100 };
    const env = createEnv({
      'awaiting_payment': mockStmt(awaitingJob),
      'SELECT mint_number': mockStmt(finalJob),
    });

    // Mock MintGarden verification
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ owner_address: { encoded_id: TEST_WALLET } }),
    });

    const req = makeRequest({ jobId: 1, walletAddress: TEST_WALLET });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as Record<string, unknown>;
    expect(data.success).toBe(true);
    expect(finalizeJob).toHaveBeenCalled();
  });

  it('returns pending when NFT not on-chain yet (stored launcher)', async () => {
    const awaitingJob = {
      id: 1, wallet_address: TEST_WALLET, mint_type: 'paid', step: 'awaiting_payment',
      mint_number: 42, mintgarden_launcher_id: 'nft1stored', offer_file: 'offer-data',
    };
    const env = createEnv({ 'awaiting_payment': mockStmt(awaitingJob) });

    mockFetch.mockResolvedValue({ ok: false }); // MintGarden returns not found

    const req = makeRequest({ jobId: 1, walletAddress: TEST_WALLET });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as Record<string, unknown>;
    expect(data.pending).toBe(true);
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });
    const env = createEnv();
    const req = makeRequest({ jobId: 1, walletAddress: TEST_WALLET });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(429);
  });

  it('returns CORS headers for OPTIONS', async () => {
    const env = createEnv();
    const optReq = new Request('https://wojak.ink/api/mint/confirm-payment', { method: 'OPTIONS' });
    const ctx = createContext(env, optReq);
    const res = await onRequest(ctx);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://wojak.ink');
  });

  it('returns 405 for non-POST requests', async () => {
    const env = createEnv();
    const req = new Request('https://wojak.ink/api/mint/confirm-payment', {
      method: 'GET',
      headers: { 'CF-Connecting-IP': '127.0.0.1' },
    });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(405);
  });

  it('auto-detects NFT by wallet when no launcher ID stored', async () => {
    const awaitingJob = {
      id: 1, wallet_address: TEST_WALLET, mint_type: 'paid', step: 'awaiting_payment',
      mint_number: 42, mintgarden_launcher_id: null, offer_file: 'offer-data', // No launcher ID stored
    };
    const finalJob = { mint_number: 42, mintgarden_launcher_id: 'nft1detected', phase2_mint_id: 100 };
    const env = createEnv({
      'awaiting_payment': mockStmt(awaitingJob),
      'SELECT mint_number': mockStmt(finalJob),
    });

    // Mock MintGarden wallet NFT query for auto-detection
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ encoded_id: 'nft1detected', data: { edition_number: 42 } }],
      }),
    });

    const req = makeRequest({ jobId: 1, walletAddress: TEST_WALLET });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as Record<string, unknown>;
    expect(data.success).toBe(true);
    expect(finalizeJob).toHaveBeenCalled();
  });

  it('returns pending when auto-detection finds no matching NFT', async () => {
    const awaitingJob = {
      id: 1, wallet_address: TEST_WALLET, mint_type: 'paid', step: 'awaiting_payment',
      mint_number: 42, mintgarden_launcher_id: null, offer_file: 'offer-data',
    };
    const env = createEnv({ 'awaiting_payment': mockStmt(awaitingJob) });

    // Mock MintGarden wallet NFT query - no matching edition number
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ encoded_id: 'nft1other', data: { edition_number: 99 } }], // Different edition
      }),
    });

    const req = makeRequest({ jobId: 1, walletAddress: TEST_WALLET });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as Record<string, unknown>;
    expect(data.pending).toBe(true);
    expect(data.message).toContain('detect');
  });

  it('returns pending on MintGarden network error', async () => {
    const awaitingJob = {
      id: 1, wallet_address: TEST_WALLET, mint_type: 'paid', step: 'awaiting_payment',
      mint_number: 42, mintgarden_launcher_id: 'nft1stored', offer_file: 'offer-data',
    };
    const env = createEnv({ 'awaiting_payment': mockStmt(awaitingJob) });

    mockFetch.mockRejectedValue(new Error('Network error'));

    const req = makeRequest({ jobId: 1, walletAddress: TEST_WALLET });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as Record<string, unknown>;
    expect(data.pending).toBe(true);
    expect(data.message).toContain('Could not verify');
  });

  it('uses caller-provided launcherId over stored one', async () => {
    const awaitingJob = {
      id: 1, wallet_address: TEST_WALLET, mint_type: 'paid', step: 'awaiting_payment',
      mint_number: 42, mintgarden_launcher_id: 'nft1stored', offer_file: 'offer-data',
    };
    const finalJob = { mint_number: 42, mintgarden_launcher_id: 'nft1provided', phase2_mint_id: 100 };
    const env = createEnv({
      'awaiting_payment': mockStmt(awaitingJob),
      'SELECT mint_number': mockStmt(finalJob),
    });

    // Should verify the provided launcher ID
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ owner_address: { encoded_id: TEST_WALLET } }),
    });

    const req = makeRequest({ jobId: 1, walletAddress: TEST_WALLET, launcherId: 'nft1provided' });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as Record<string, unknown>;
    expect(data.success).toBe(true);

    // Verify fetch was called with provided launcher ID
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('nft1provided'));
  });

  it('rejects invalid JSON body', async () => {
    const env = createEnv();
    const req = new Request('https://wojak.ink/api/mint/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.0.0.1' },
      body: 'not valid json',
    });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(400);
  });

  it('returns 500 when DB is not configured', async () => {
    const env = { ...createEnv(), DB: undefined };
    const req = makeRequest({ jobId: 1, walletAddress: TEST_WALLET });
    const ctx = createContext(env as any, req);
    const res = await onRequest(ctx);
    expect(res.status).toBe(500);
  });

  it('returns pending when owner mismatch on verification', async () => {
    const awaitingJob = {
      id: 1, wallet_address: TEST_WALLET, mint_type: 'paid', step: 'awaiting_payment',
      mint_number: 42, mintgarden_launcher_id: 'nft1stored', offer_file: 'offer-data',
    };
    const env = createEnv({ 'awaiting_payment': mockStmt(awaitingJob) });

    // Mock MintGarden returning different owner
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ owner_address: { encoded_id: 'xch1different' } }),
    });

    const req = makeRequest({ jobId: 1, walletAddress: TEST_WALLET });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as Record<string, unknown>;
    expect(data.pending).toBe(true);
    // Message says "The offer may not have been accepted" or similar
    expect(data.message).toContain('may not have been accepted');
  });

  it('returns mintgardenUrl in success response', async () => {
    const awaitingJob = {
      id: 1, wallet_address: TEST_WALLET, mint_type: 'paid', step: 'awaiting_payment',
      mint_number: 42, mintgarden_launcher_id: 'nft1stored', offer_file: 'offer-data',
    };
    const finalJob = { mint_number: 42, mintgarden_launcher_id: 'nft1stored', phase2_mint_id: 100 };
    const env = createEnv({
      'awaiting_payment': mockStmt(awaitingJob),
      'SELECT mint_number': mockStmt(finalJob),
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ owner_address: { encoded_id: TEST_WALLET } }),
    });

    const req = makeRequest({ jobId: 1, walletAddress: TEST_WALLET });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as Record<string, unknown>;
    expect(data.success).toBe(true);
    expect(data.mintgardenUrl).toContain('mintgarden.io');
    expect(data.mintgardenUrl).toContain('nft1stored');
  });
});
