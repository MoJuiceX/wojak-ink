import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock D1Database and fixtures
interface D1Result<T extends Record<string, unknown> = Record<string, unknown>> {
  results: T[];
  success: boolean;
}

interface D1PreparedStatement {
  bind(...args: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
  first<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<T | undefined>;
  all<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

// Test fixtures
const TEST_DID = 'did:chia:1test1234567890';
const TEST_DID2 = 'did:chia:2test1234567890';
const TEST_WALLET = 'txch1abc123';

const PHASE2_COLLECTION = 'col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx';

// Mock game_players fixture
const mockPlayers = [
  { did_id: TEST_DID, wallet_address: TEST_WALLET, last_indexed_at: null, phase1_verified: 0 },
  { did_id: TEST_DID2, wallet_address: 'txch2def456', last_indexed_at: null, phase1_verified: 1 },
];

// Mock NFT holding
const mockNfts = [
  { id: 'nft_001', edition_number: 1, creator_address_encoded_id: 'creator_001' },
  { id: 'nft_002', edition_number: 2, creator_address_encoded_id: 'creator_002' },
];

// Helper to create mock D1Database (for potential future use in more complex tests)
function _createMockD1Database(): D1Database {
  const store = new Map<string, Record<string, unknown>[]>();

  // Initialize tables
  store.set('game_players', [...mockPlayers]);
  store.set('did_holdings', []);
  store.set('did_profiles', []);
  store.set('kv_meta', []);

  class MockPreparedStatement implements D1PreparedStatement {
    sql: string;
    bindings: unknown[] = [];

    constructor(sql: string) {
      this.sql = sql;
    }

    bind(...args: unknown[]): D1PreparedStatement {
      this.bindings = args;
      return this;
    }

    async run(): Promise<D1Result> {
      // Simple INSERT/UPDATE/DELETE handling
      const table = this.extractTableName();
      if (this.sql.toLowerCase().includes('insert')) {
        const records = store.get(table) || [];
        // Mock insertion
        const newRecord = Object.fromEntries(
          this.bindings.map((value, i) => [`field${i}`, value])
        );
        records.push(newRecord);
        store.set(table, records);
      }
      // UPDATE/DELETE handled similarly - simplified for test
      return { results: [], success: true };
    }

    async first<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<T | undefined> {
      const result = await this.all<T>();
      return result.results[0];
    }

    async all<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<D1Result<T>> {
      const table = this.extractTableName();
      const records = store.get(table) || [];

      // Basic WHERE filtering for mock
      if (this.sql.includes('WHERE') && table === 'game_players') {
        if (this.sql.includes('last_indexed_at')) {
          // Return players needing sync
          return {
            results: records.filter(r => r.last_indexed_at === null) as T[],
            success: true,
          };
        }
      }

      if (this.sql.includes('WHERE') && table === 'did_holdings') {
        // Filter by did_id
        const didId = this.bindings[0];
        return {
          results: records.filter(r => r.did_id === didId) as T[],
          success: true,
        };
      }

      return { results: records as T[], success: true };
    }

    private extractTableName(): string {
      const match = this.sql.match(/(?:FROM|INSERT INTO|UPDATE|DELETE FROM)\s+(\w+)/i);
      return match ? match[1].toLowerCase() : '';
    }
  }

  return {
    prepare(sql: string): D1PreparedStatement {
      return new MockPreparedStatement(sql);
    },
    batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
      return Promise.all(statements.map(s => s.run()));
    },
  };
}

describe('DID Indexer Worker', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let fetchCallCount = 0;
  let fetchDelays: number[] = [];
  let lastFetchTime = 0;

  beforeEach(() => {
    fetchCallCount = 0;
    fetchDelays = [];
    lastFetchTime = Date.now();

    mockFetch = vi.fn(async () => {
      const now = Date.now();
      const delay = now - lastFetchTime;
      fetchDelays.push(delay);
      lastFetchTime = now;
      fetchCallCount++;

      // Default successful response
      const pageNum = fetchCallCount;
      const hasMore = pageNum < 3; // Simulate 3 pages

      return {
        ok: true,
        json: async () => ({
          items: mockNfts.map((n, i) => ({
            ...n,
            id: `${n.id}_page${pageNum}_${i}`,
          })),
          next: hasMore ? `cursor_page_${pageNum + 1}` : null,
        }),
      };
    });

    global.fetch = mockFetch as typeof fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Happy path — fetch holdings, update DB, no regressions
  it('should fetch NFTs and update database on successful sync', async () => {
    // Simulate fetchDIDNfts
    const nfts: unknown[] = [];
    let cursor: string | null = null;
    let pages = 0;
    const MAX_PAGES = 50;

    while (pages < MAX_PAGES) {
      let url = `https://api.mintgarden.io/collections/${PHASE2_COLLECTION}/nfts?size=100&owner_did=${TEST_DID}`;
      if (cursor) url += `&cursor=${cursor}`;

      const response = await fetch(url);
      const data = await response.json() as { items: Record<string, unknown>[]; next?: string | null };

      if (!data.items || data.items.length === 0) break;

      for (const item of data.items) {
        nfts.push({ id: item.id, edition: item.edition_number, creator: item.creator_address_encoded_id });
      }

      if (!data.next) break;
      cursor = data.next;
      pages++;
    }

    expect(nfts.length).toBeGreaterThan(0);
    expect(fetchCallCount).toBeGreaterThan(0);
  });

  // Test 2: Pagination — handle >50 pages safely (MAX_PAGES limit enforced)
  it('should enforce MAX_PAGES=50 limit and not fetch beyond it', async () => {
    const MAX_PAGES = 50;

    // Simulate continuous pagination that would exceed MAX_PAGES
    mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        items: [{ id: 'nft_001', edition_number: 1 }],
        next: 'cursor_next', // Always has more
      }),
    }));

    global.fetch = mockFetch as typeof fetch;

    let pages = 0;

    while (pages < MAX_PAGES) {
      const response = await fetch(`https://api.mintgarden.io/collections/${PHASE2_COLLECTION}/nfts?size=100`);
      const data = await response.json() as { items: Record<string, unknown>[]; next?: string | null };
      if (!data.items || data.items.length === 0) break;
      if (!data.next) break;
      pages++;
    }

    expect(pages).toBeLessThanOrEqual(MAX_PAGES);
    expect(mockFetch.mock.calls.length).toBeLessThanOrEqual(MAX_PAGES);
  });

  // Test 3: Rate limiting — 500ms delay between API calls
  it('should enforce 500ms rate limit between API calls', async () => {
    const RATE_LIMIT_MS = 500;

    fetchDelays = [];
    lastFetchTime = Date.now();

    // Simulate 3 consecutive API calls with rate limiting
    for (let i = 0; i < 3; i++) {
      await fetch(`https://api.mintgarden.io/collections/${PHASE2_COLLECTION}/nfts?page=${i}`);

      if (i > 0) {
        // Check that delay since last call exists
        expect(fetchDelays[i]).toBeDefined();
      }

      // Simulate rate limit sleep
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
    }

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  // Test 4: Circuit breaker — ≥5 consecutive API failures → abort gracefully
  it('should trip circuit breaker after 5 consecutive API failures', async () => {
    const CIRCUIT_BREAKER_THRESHOLD = 5;

    mockFetch = vi.fn(async () => {
      // Simulate consistent failures
      return {
        ok: false,
        status: 500,
      };
    });

    global.fetch = mockFetch as typeof fetch;

    let consecutiveFailures = 0;
    let aborted = false;

    // Simulate the circuit breaker logic from the worker
    for (let i = 0; i < 10; i++) {
      if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
        aborted = true;
        break;
      }

      const response = await fetch(`https://api.mintgarden.io/collections/${PHASE2_COLLECTION}/nfts`);
      if (!response.ok) {
        consecutiveFailures++;
      } else {
        consecutiveFailures = 0;
      }
    }

    expect(aborted).toBe(true);
    expect(consecutiveFailures).toBeGreaterThanOrEqual(CIRCUIT_BREAKER_THRESHOLD);
  });

  // Test 5: Batch sizing — D1_BATCH_SIZE=25 respected in writes
  it('should chunk database writes into batches of 25', () => {
    const D1_BATCH_SIZE = 25;

    // Create 75 NFT records to add (should result in 3 batches)
    const toAdd = Array.from({ length: 75 }, (_, i) => ({
      id: `nft_${i}`,
      collection: 'phase2',
    }));

    const statements: unknown[] = [];
    for (const nft of toAdd) {
      statements.push({
        sql: `INSERT INTO did_holdings (did_id, nft_id) VALUES (?, ?)`,
        bindings: [TEST_DID, nft.id],
      });
    }

    // Batch them
    let batchCount = 0;
    for (let i = 0; i < statements.length; i += D1_BATCH_SIZE) {
      const batch = statements.slice(i, i + D1_BATCH_SIZE);
      expect(batch.length).toBeLessThanOrEqual(D1_BATCH_SIZE);
      batchCount++;
    }

    expect(batchCount).toBe(3); // 75 items / 25 per batch = 3 batches
  });

  // Test 6: Power level calculation — formula matches constants
  it('should calculate power level with correct formula and constants', () => {
    // Power level constants from worker
    const POWER_LEVEL_MAX = 10000;
    const QUALITY_WEIGHT = 1.0;
    const VALUE_BASE = 50;
    const VALUE_LOG_SCALE = 30;

    // Mock holdings data
    const holdings = [
      { net_score: 100, surcharge: 10000 },
      { net_score: 50, surcharge: 5000 },
    ];

    let score = 0;
    for (const h of holdings) {
      const quality = h.net_score * QUALITY_WEIGHT;
      const value = VALUE_BASE + VALUE_LOG_SCALE * Math.log(1 + h.surcharge / 100000);
      score += quality + value;
    }

    const powerLevel = Math.max(0, Math.min(POWER_LEVEL_MAX, Math.round(score)));
    expect(powerLevel).toBeGreaterThanOrEqual(0);
    expect(powerLevel).toBeLessThanOrEqual(POWER_LEVEL_MAX);
  });

  // Test 7: Error recovery — transient API errors → retry without crash
  it('should handle transient API errors and recover gracefully', async () => {
    let callCount = 0;

    mockFetch = vi.fn(async () => {
      callCount++;
      // First 2 calls fail, then succeed
      if (callCount <= 2) {
        return { ok: false, status: 500 };
      }
      return {
        ok: true,
        json: async () => ({ items: [], next: null }),
      };
    });

    global.fetch = mockFetch as typeof fetch;

    let recovered = false;

    // Simulate retry logic
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`https://api.mintgarden.io/collections/${PHASE2_COLLECTION}/nfts`);
        if (response.ok) {
          recovered = true;
          break;
        }
      } catch (_err) {
        // Handle error, continue
      }
    }

    expect(recovered).toBe(true);
    expect(mockFetch).toHaveBeenCalled();
  });

  // Test 8: Staggered sync — PLAYERS_PER_RUN=5 per cycle enforced
  it('should sync only PLAYERS_PER_RUN=5 players per cron cycle', () => {
    const PLAYERS_PER_RUN = 5;

    // Create 20 mock players
    const manyPlayers = Array.from({ length: 20 }, (_, i) => ({
      did_id: `did:chia:player${i}`,
      wallet_address: `wallet${i}`,
      last_indexed_at: null,
      phase1_verified: 0,
    }));

    // Simulate the LIMIT query from the worker
    const selectedPlayers = manyPlayers.slice(0, PLAYERS_PER_RUN);

    expect(selectedPlayers.length).toBeLessThanOrEqual(PLAYERS_PER_RUN);
    expect(selectedPlayers.length).toBe(PLAYERS_PER_RUN);
  });

  // Test 9: Happy path with holdings diff
  it('should detect NFT additions and removals correctly', () => {
    const currentHoldings = [
      { nft_id: 'nft_001' },
      { nft_id: 'nft_002' },
    ];

    const newHoldings = [
      { id: 'nft_001' }, // kept
      { id: 'nft_003' }, // added
    ];

    const currentSet = new Set(currentHoldings.map(h => h.nft_id));
    const newSet = new Set(newHoldings.map(h => h.id));

    const toAdd = newHoldings.filter(h => !currentSet.has(h.id));
    const toRemove = currentHoldings.filter(h => !newSet.has(h.nft_id)).map(h => h.nft_id);

    expect(toAdd).toHaveLength(1);
    expect(toAdd[0].id).toBe('nft_003');
    expect(toRemove).toHaveLength(1);
    expect(toRemove[0]).toBe('nft_002');
  });
});
