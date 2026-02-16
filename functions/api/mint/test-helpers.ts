import { vi } from 'vitest';

// Mock D1 result
interface MockD1Result {
  results?: unknown[];
  meta?: { changes?: number; last_row_id?: number };
}

// Create a chainable mock D1 statement
export function createMockStatement(result: MockD1Result | unknown = null) {
  const stmt = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(result),
    run: vi.fn().mockResolvedValue({ meta: (result as MockD1Result)?.meta || { changes: 1, last_row_id: 1 } }),
    all: vi.fn().mockResolvedValue({ results: (result as MockD1Result)?.results || [] }),
  };
  return stmt;
}

// Track prepared statements by query
export function createMockDB() {
  const stmtMap = new Map<string, ReturnType<typeof createMockStatement>>();
  const db = {
    prepare: vi.fn((query: string) => {
      if (stmtMap.has(query)) return stmtMap.get(query)!;
      return createMockStatement();
    }),
    batch: vi.fn().mockResolvedValue([]),
    _mockQuery: (querySubstring: string, result: MockD1Result | unknown) => {
      const stmt = createMockStatement(result);
      const originalPrepare = db.prepare;
      db.prepare = vi.fn((query: string) => {
        if (query.includes(querySubstring)) return stmt;
        return originalPrepare(query);
      });
      return stmt;
    },
    _stmtMap: stmtMap,
  };
  return db;
}

export function createMockKV() {
  const store = new Map<string, string>();
  return {
    put: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    delete: vi.fn(async (key: string) => { store.delete(key); }),
    _store: store,
  };
}

export function createMockEnv(overrides: Record<string, unknown> = {}) {
  return {
    DB: createMockDB(),
    MINT_JOBS_KV: createMockKV(),
    PINATA_JWT: 'test-jwt',
    PINATA_GATEWAY: 'test-gateway.mypinata.cloud',
    PHASE2_COLLECTION_UUID: 'test-collection-uuid',
    PHASE2_PROFILE_ID: 'test-profile-id',
    PHASE2_ROYALTY_ADDRESS: 'xch1testaddress',
    PHASE2_ROYALTY_PCT: '10',
    MINTGARDEN_API_KEY: 'test-api-key',
    MINT_CRON_SECRET: 'test-cron-secret',
    ...overrides,
  };
}

// Valid Chia bech32m address for testing (62 chars: xch1 + 58 lowercase alphanumeric)
export const TEST_WALLET = 'xch1' + 'a'.repeat(58);
export const TEST_WALLET_2 = 'xch1' + 'b'.repeat(58);

export function createMockRequest(body: unknown, method = 'POST', url = 'https://wojak.ink/api/mint/submit') {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '127.0.0.1'
    },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  });
}

export function createMockContext(env: ReturnType<typeof createMockEnv>) {
  const waitUntilPromises: Promise<unknown>[] = [];
  return {
    request: null as unknown as Request, // Set per test
    env,
    params: {},
    data: {},
    functionPath: '',
    waitUntil: vi.fn((promise: Promise<unknown>) => { waitUntilPromises.push(promise); }),
    passThroughOnException: vi.fn(),
    next: vi.fn(),
    _waitUntilPromises: waitUntilPromises,
  };
}

export const VALID_SUBMIT_BODY = {
  walletAddress: TEST_WALLET,
  selectedLayers: { Background: 'bg/orange.png', Base: 'base/classic.png', Clothes: 'clothes/tee.png' },
  selectedColors: {},
  imageBase64: btoa('fake-png-image-data'),
  mintType: 'free' as const,
  idempotencyKey: 'test-key-123',
};
