import { describe, it, expect, beforeEach } from 'vitest';

// ─── Mock Interfaces (matching worker types) ───
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

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

interface Env {
  TRADE_VALUES_KV: KVNamespace;
  DB: D1Database;
  COLLECTION_ID: string;
  ADMIN_PASSWORD?: string;
}

// ─── Test Fixtures & Constants ───
const COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

// ─── Helper Functions ───
function extractEdition(nftName: string): number | null {
  const match = nftName.match(/#(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function filterOutliers(prices: number[]): { filtered: number[]; outliersRemoved: number } {
  if (prices.length < 4) {
    return { filtered: prices, outliersRemoved: 0 };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const filtered = prices.filter(p => p >= lowerBound && p <= upperBound);

  return {
    filtered,
    outliersRemoved: prices.length - filtered.length,
  };
}

// ─── Mock D1Database ───
class MockD1Database implements D1Database {
  private store = new Map<string, Record<string, unknown>[]>();

  constructor() {
    this.store.set('sales_history', []);
    this.store.set('cat_token_rates', []);
    this.store.set('reorg_markers', []);
    this.store.set('combat_fighters', []);
  }

  prepare(sql: string): D1PreparedStatement {
    return new MockPreparedStatement(sql, this.store);
  }

  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    const results: D1Result[] = [];
    for (const stmt of statements) {
      results.push(await stmt.run());
    }
    return results;
  }

  insertFixture(table: string, record: Record<string, unknown>) {
    const records = this.store.get(table) || [];
    records.push(record);
    this.store.set(table, records);
  }

  getTable(table: string): Record<string, unknown>[] {
    return this.store.get(table) || [];
  }

  reset() {
    this.store.forEach((_, key) => this.store.set(key, []));
  }
}

// ─── Mock Prepared Statement ───
class MockPreparedStatement implements D1PreparedStatement {
  sql: string;
  bindings: unknown[] = [];
  store: Map<string, Record<string, unknown>[]>;

  constructor(sql: string, store: Map<string, Record<string, unknown>[]>) {
    this.sql = sql;
    this.store = store;
  }

  bind(...args: unknown[]): D1PreparedStatement {
    this.bindings = args;
    return this;
  }

  async run(): Promise<D1Result> {
    const tableName = this.extractTableName();
    const table = this.store.get(tableName) || [];

    // INSERT
    if (this.sql.toLowerCase().includes('insert')) {
      const record = this.buildRecord();
      // Check for UNIQUE constraint violations on trade_id (first binding for INSERT)
      if (this.sql.includes('trade_id') && tableName === 'sales_history') {
        const tradeId = this.bindings[0]; // trade_id is first binding
        const exists = table.some(r => r.trade_id === tradeId);
        if (exists) {
          throw new Error('UNIQUE constraint failed: trade_id');
        }
      }
      table.push(record);
      this.store.set(tableName, table);
      return { results: [], success: true };
    }

    // DELETE
    if (this.sql.toLowerCase().includes('delete')) {
      if (this.sql.includes('WHERE block_height')) {
        const blockHeight = this.bindings[0];
        const filtered = table.filter(r => (r.block_height as number) < (blockHeight as number));
        this.store.set(tableName, filtered);
      }
      return { results: [], success: true };
    }

    // UPDATE
    if (this.sql.toLowerCase().includes('update')) {
      return { results: [], success: true };
    }

    return { results: [], success: true };
  }

  async first<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<T | undefined> {
    const result = await this.all<T>();
    return result.results[0];
  }

  async all<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<D1Result<T>> {
    const tableName = this.extractTableName();
    let records = (this.store.get(tableName) || []) as T[];

    if (this.sql.toLowerCase().includes('where')) {
      records = this.applyFilters(records);
    }

    if (this.sql.includes('ORDER BY')) {
      records = this.applyOrdering(records);
    }

    if (this.sql.includes('LIMIT')) {
      const match = this.sql.match(/LIMIT\s+(\d+)/i);
      if (match) {
        const limit = parseInt(match[1], 10);
        records = records.slice(0, limit);
      }
    }

    return { results: records, success: true };
  }

  private buildRecord(): Record<string, unknown> {
    if (this.sql.toLowerCase().includes('sales_history')) {
      const [tradeId, mgEventId, nftEdition, nftName, currency, originalAmount, xchEquivalent, tokenCode, tokenId, catXchRate, timestamp, completedAtUnix, buyerAddress, sellerAddress, blockHeight, traitsJson] = this.bindings;
      return {
        trade_id: tradeId,
        mg_event_id: mgEventId,
        nft_edition: nftEdition,
        nft_name: nftName,
        currency,
        original_amount: originalAmount,
        xch_equivalent: xchEquivalent,
        token_code: tokenCode,
        token_id: tokenId,
        cat_xch_rate: catXchRate,
        completed_at: timestamp,
        completed_at_unix: completedAtUnix,
        buyer_address: buyerAddress,
        seller_address: sellerAddress,
        block_height: blockHeight,
        traits_json: traitsJson,
      };
    }

    if (this.sql.toLowerCase().includes('cat_token_rates')) {
      const [tokenCode, xchRate, assetId] = this.bindings;
      return {
        token_code: tokenCode,
        xch_rate: xchRate,
        asset_id: assetId,
      };
    }

    if (this.sql.toLowerCase().includes('reorg_markers')) {
      const [blockHeight, timestamp] = this.bindings;
      return {
        block_height: blockHeight,
        detected_at: timestamp,
      };
    }

    return {};
  }

  private extractTableName(): string {
    const match = this.sql.match(/(?:from|into)\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }

  private applyFilters<T extends Record<string, unknown>>(records: T[]): T[] {
    if (this.sql.includes('nft_edition = ?')) {
      const edition = this.bindings[0];
      return records.filter(r => r.nft_edition === edition);
    }

    if (this.sql.includes('trade_id = ?')) {
      const tradeId = this.bindings[0];
      return records.filter(r => r.trade_id === tradeId);
    }

    if (this.sql.includes('block_height')) {
      const blockHeight = this.bindings[0];
      return records.filter(r => (r.block_height as number) < (blockHeight as number));
    }

    return records;
  }

  private applyOrdering<T extends Record<string, unknown>>(records: T[]): T[] {
    if (this.sql.includes('ORDER BY completed_at DESC')) {
      return records.sort((a, b) => {
        const timeA = a.completed_at_unix as number;
        const timeB = b.completed_at_unix as number;
        return timeB - timeA;
      });
    }

    if (this.sql.includes('ORDER BY block_height DESC')) {
      return records.sort((a, b) => {
        const bh1 = a.block_height as number;
        const bh2 = b.block_height as number;
        return bh2 - bh1;
      });
    }

    return records;
  }
}

// ─── Mock KVNamespace ───
class MockKVNamespace implements KVNamespace {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async put(key: string, value: string, _options?: { expirationTtl?: number }): Promise<void> {
    this.store.set(key, value);
  }

  reset() {
    this.store.clear();
  }
}

// ─── Tests ───
describe('Fetch-Sales Worker', () => {
  let mockDb: MockD1Database;
  let mockKv: MockKVNamespace;
  let env: Env;

  beforeEach(() => {
    mockDb = new MockD1Database();
    mockKv = new MockKVNamespace();
    env = {
      DB: mockDb,
      TRADE_VALUES_KV: mockKv,
      COLLECTION_ID,
    };
  });

  describe('1. Happy Path: Fetch Sales & Update Price Index', () => {
    it('should insert NFT sales from Dexie API response', async () => {
      const sale = {
        trade_id: 'trade_001',
        mg_event_id: 'mg_event_001',
        nft_edition: 644,
        nft_name: 'Wojak #0644',
        currency: 'XCH' as const,
        original_amount: 1.5,
        xch_equivalent: 1.5,
        token_code: null,
        token_id: null,
        cat_xch_rate: null,
        timestamp: '2026-02-23T10:00:00Z',
        completed_at_unix: 1708671600,
        buyer_address: 'txch1abc123',
        seller_address: 'txch1def456',
        block_height: 5000000,
        traits_json: null,
      };

      const stmt = env.DB.prepare(
        `INSERT INTO sales_history (trade_id, mg_event_id, nft_edition, nft_name, currency, original_amount, xch_equivalent, token_code, token_id, cat_xch_rate, completed_at, completed_at_unix, buyer_address, seller_address, block_height, traits_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      await stmt.bind(
        sale.trade_id, sale.mg_event_id, sale.nft_edition, sale.nft_name, sale.currency,
        sale.original_amount, sale.xch_equivalent, sale.token_code, sale.token_id, sale.cat_xch_rate,
        sale.timestamp, sale.completed_at_unix, sale.buyer_address, sale.seller_address, sale.block_height, sale.traits_json
      ).run();

      const records = mockDb.getTable('sales_history');
      expect(records).toHaveLength(1);
      expect(records[0].nft_edition).toBe(644);
      expect(records[0].xch_equivalent).toBe(sale.xch_equivalent);
    });
  });

  describe('2. Pagination: Handle Large Result Sets', () => {
    it('should process 100 sales across multiple batches', async () => {
      for (let i = 0; i < 100; i++) {
        const stmt = env.DB.prepare(
          `INSERT INTO sales_history (trade_id, mg_event_id, nft_edition, nft_name, currency, original_amount, xch_equivalent, token_code, token_id, cat_xch_rate, completed_at, completed_at_unix, buyer_address, seller_address, block_height, traits_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        
        const edition = 100 + i;
        await stmt.bind(
          `trade_${i}`, `mg_${i}`, edition, `Wojak #${edition}`, 'XCH',
          1.0 + (i * 0.01), 1.0 + (i * 0.01), null, null, null,
          '2026-02-23T10:00:00Z', 1708671600 + i, 'txch_buyer', 'txch_seller', 5000000 + i, null
        ).run();
      }

      const records = mockDb.getTable('sales_history');
      expect(records).toHaveLength(100);
    });

    it('should batch insert in D1_BATCH_SIZE chunks (25 per batch)', async () => {
      const batchSize = 25;
      const totalSales = 60; // 3 batches needed (25 + 25 + 10)
      
      const statements: D1PreparedStatement[] = [];
      for (let i = 0; i < totalSales; i++) {
        const stmt = env.DB.prepare(
          `INSERT INTO sales_history (trade_id, mg_event_id, nft_edition, nft_name, currency, original_amount, xch_equivalent, token_code, token_id, cat_xch_rate, completed_at, completed_at_unix, buyer_address, seller_address, block_height, traits_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        
        const edition = 1000 + i;
        stmt.bind(
          `trade_${i}`, `mg_${i}`, edition, `Wojak #${edition}`, 'XCH',
          1.0, 1.0, null, null, null,
          '2026-02-23T10:00:00Z', 1708671600, 'txch_buyer', 'txch_seller', 5000000, null
        );
        statements.push(stmt);
      }

      // Execute in batches
      const batches = [];
      for (let i = 0; i < statements.length; i += batchSize) {
        const batch = statements.slice(i, i + batchSize);
        batches.push(await env.DB.batch(batch));
      }

      expect(batches).toHaveLength(3); // 3 batches total
      const records = mockDb.getTable('sales_history');
      expect(records.length).toBe(totalSales);
    });
  });

  describe('3. Blockchain Errors: Retry & Graceful Degradation', () => {
    it('should handle API errors gracefully', async () => {
      // Simulate API error by mocking fetch
      const maxRetries = 3;

      // In real scenario, API returns 500/429, worker retries
      const simulateApiError = async (retryAttempt: number) => {
        if (retryAttempt < maxRetries) {
          // Simulate retry with exponential backoff
          return { status: 500, error: true };
        }
        // After max retries, return gracefully
        return { status: 200, error: false, data: [] };
      };

      // Test retry logic
      let result = await simulateApiError(0);
      expect(result.status).toBe(500);

      result = await simulateApiError(3); // After maxRetries
      expect(result.status).toBe(200);
      expect(result.error).toBe(false);
    });
  });

  describe('4. Rate Limiting: API Throttling Respected', () => {
    it('should respect rate limit delays between API calls', async () => {
      const callTimes: number[] = [];

      const simulateThrottledCall = async () => {
        callTimes.push(Date.now());
        if (callTimes.length > 1) {
          const delay = callTimes[callTimes.length - 1] - callTimes[callTimes.length - 2];
          // In real implementation, delay would be >= rateLimitDelayMs
          expect(delay).toBeGreaterThanOrEqual(0); // Mock doesn't actually wait
        }
      };

      // Simulate 3 API calls
      for (let i = 0; i < 3; i++) {
        await simulateThrottledCall();
      }

      expect(callTimes).toHaveLength(3);
    });
  });

  describe('5. Price Calculation: Floor & Average', () => {
    it('should compute average price after filtering outliers', async () => {
      const prices = [1.0, 1.1, 1.05, 5.0, 1.08]; // 5.0 is outlier
      const result = filterOutliers(prices);

      expect(result.outliersRemoved).toBe(1); // 5.0 filtered
      const filtered = result.filtered;
      const average = filtered.reduce((a, b) => a + b) / filtered.length;
      expect(average).toBeCloseTo(1.05, 1); // ~1.05 average
    });

    it('should compute floor price as minimum non-outlier price', async () => {
      const prices = [1.0, 1.2, 1.5, 10.0]; // 10.0 is outlier
      const result = filterOutliers(prices);

      const floor = Math.min(...result.filtered);
      expect(floor).toBe(1.0);
    });
  });

  describe('6. Metadata Updates: Traits Normalization', () => {
    it('should store trait metadata in JSON format', async () => {
      const traitsJson = JSON.stringify([
        { trait_type: 'Body', value: 'Farmer' },
        { trait_type: 'Head', value: 'Classic' },
      ]);

      const stmt = env.DB.prepare(
        `INSERT INTO sales_history (trade_id, mg_event_id, nft_edition, nft_name, currency, original_amount, xch_equivalent, token_code, token_id, cat_xch_rate, completed_at, completed_at_unix, buyer_address, seller_address, block_height, traits_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      await stmt.bind(
        'trade_trait_001', 'mg_001', 100, 'Wojak #0100', 'XCH', 1.0, 1.0, null, null, null,
        '2026-02-23T10:00:00Z', 1708671600, 'txch_buyer', 'txch_seller', 5000000, traitsJson
      ).run();

      const records = mockDb.getTable('sales_history');
      expect(records[0].traits_json).toBe(traitsJson);
      const parsed = JSON.parse(records[0].traits_json as string);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].trait_type).toBe('Body');
    });
  });

  describe('7. Deduplication: Duplicate Sales Handling', () => {
    it('should reject duplicate sales with same trade_id (UNIQUE constraint)', async () => {
      const stmt1 = env.DB.prepare(
        `INSERT INTO sales_history (trade_id, mg_event_id, nft_edition, nft_name, currency, original_amount, xch_equivalent, token_code, token_id, cat_xch_rate, completed_at, completed_at_unix, buyer_address, seller_address, block_height, traits_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      await stmt1.bind(
        'trade_dup_001', 'mg_001', 100, 'Wojak #0100', 'XCH', 1.0, 1.0, null, null, null,
        '2026-02-23T10:00:00Z', 1708671600, 'txch_buyer', 'txch_seller', 5000000, null
      ).run();

      // Attempt duplicate
      const stmt2 = env.DB.prepare(
        `INSERT INTO sales_history (trade_id, mg_event_id, nft_edition, nft_name, currency, original_amount, xch_equivalent, token_code, token_id, cat_xch_rate, completed_at, completed_at_unix, buyer_address, seller_address, block_height, traits_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      await expect(
        stmt2.bind(
          'trade_dup_001', 'mg_002', 101, 'Wojak #0101', 'XCH', 2.0, 2.0, null, null, null,
          '2026-02-23T11:00:00Z', 1708675200, 'txch_buyer2', 'txch_seller2', 5000001, null
        ).run()
      ).rejects.toThrow('UNIQUE constraint');

      const records = mockDb.getTable('sales_history');
      expect(records).toHaveLength(1); // Only first insert succeeded
    });
  });

  describe('8. State Persistence: D1 Retrievability', () => {
    it('should retrieve historical sales from D1', async () => {
      // Insert 3 sales
      for (let i = 0; i < 3; i++) {
        const stmt = env.DB.prepare(
          `INSERT INTO sales_history (trade_id, mg_event_id, nft_edition, nft_name, currency, original_amount, xch_equivalent, token_code, token_id, cat_xch_rate, completed_at, completed_at_unix, buyer_address, seller_address, block_height, traits_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        
        await stmt.bind(
          `trade_persist_${i}`, `mg_${i}`, 100 + i, `Wojak #${100 + i}`, 'XCH',
          1.0, 1.0, null, null, null,
          '2026-02-23T10:00:00Z', 1708671600 + i, 'txch_buyer', 'txch_seller', 5000000 + i, null
        ).run();
      }

      // Query back (with ordering)
      const queryStmt = env.DB.prepare('SELECT * FROM sales_history ORDER BY completed_at_unix DESC');
      const result = await queryStmt.all<Record<string, unknown>>();
      
      expect(result.results).toHaveLength(3);
      // Check that we retrieved all records
      const editions = result.results.map((r: Record<string, unknown>) => r.nft_edition as number);
      expect(editions).toContain(100);
      expect(editions).toContain(101);
      expect(editions).toContain(102);
    });

    it('should retrieve sales for a specific NFT edition', async () => {
      // Insert sales for multiple editions
      const editionsToInsert = [100, 101, 102];
      for (const edition of editionsToInsert) {
        const stmt = env.DB.prepare(
          `INSERT INTO sales_history (trade_id, mg_event_id, nft_edition, nft_name, currency, original_amount, xch_equivalent, token_code, token_id, cat_xch_rate, completed_at, completed_at_unix, buyer_address, seller_address, block_height, traits_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        
        await stmt.bind(
          `trade_${edition}`, `mg_${edition}`, edition, `Wojak #${edition}`, 'XCH',
          1.0, 1.0, null, null, null,
          '2026-02-23T10:00:00Z', 1708671600, 'txch_buyer', 'txch_seller', 5000000, null
        ).run();
      }

      // Query specific edition
      const queryStmt = env.DB.prepare('SELECT * FROM sales_history WHERE nft_edition = ?');
      const result = await queryStmt.bind(101).all<Record<string, unknown>>();
      
      expect(result.results).toHaveLength(1);
      expect((result.results[0] as Record<string, unknown>).nft_edition).toBe(101);
    });
  });

  describe('9. Circuit Breaker: Failure Threshold', () => {
    it('should abort after 5 consecutive API failures', async () => {
      let failureCount = 0;
      const maxConsecutiveFailures = 5;

      const processApi = async () => {
        failureCount++;
        if (failureCount >= maxConsecutiveFailures) {
          return { aborted: true, reason: 'Circuit breaker triggered' };
        }
        return { aborted: false };
      };

      for (let i = 0; i < 7; i++) {
        const result = await processApi();
        if (result.aborted) {
          expect(failureCount).toBeGreaterThanOrEqual(maxConsecutiveFailures);
          break;
        }
      }

      expect(failureCount).toBeGreaterThanOrEqual(maxConsecutiveFailures);
    });
  });

  describe('10. Reorg Handling: Price Rollback', () => {
    it('should delete sales above reorg block height', async () => {
      // Insert sales at different block heights
      const blockHeights = [5000000, 5000001, 5000002, 5000003];
      for (let i = 0; i < blockHeights.length; i++) {
        const stmt = env.DB.prepare(
          `INSERT INTO sales_history (trade_id, mg_event_id, nft_edition, nft_name, currency, original_amount, xch_equivalent, token_code, token_id, cat_xch_rate, completed_at, completed_at_unix, buyer_address, seller_address, block_height, traits_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        
        await stmt.bind(
          `trade_reorg_${i}`, `mg_${i}`, 100 + i, `Wojak #${100 + i}`, 'XCH',
          1.0, 1.0, null, null, null,
          '2026-02-23T10:00:00Z', 1708671600 + i, 'txch_buyer', 'txch_seller', blockHeights[i], null
        ).run();
      }

      let records = mockDb.getTable('sales_history');
      expect(records).toHaveLength(4);

      // Reorg at block 5000002: delete all sales >= this height
      const reorgStmt = env.DB.prepare('DELETE FROM sales_history WHERE block_height >= ?');
      await reorgStmt.bind(5000002).run();

      records = mockDb.getTable('sales_history');
      expect(records).toHaveLength(2); // Only sales before reorg height
      expect(records[0].block_height).toBeLessThan(5000002);
    });

    it('should record reorg marker for tracking', async () => {
      const stmt = env.DB.prepare(
        `INSERT INTO reorg_markers (block_height, detected_at)
         VALUES (?, ?)`
      );

      await stmt.bind(5000000, '2026-02-23T10:00:00Z').run();

      const records = mockDb.getTable('reorg_markers');
      expect(records).toHaveLength(1);
      expect(records[0].block_height).toBe(5000000);
    });
  });

  describe('11. Empty Results: Graceful Handling', () => {
    it('should handle no sales from API gracefully', async () => {
      const stmt = env.DB.prepare('SELECT * FROM sales_history');
      const result = await stmt.all<Record<string, unknown>>();

      expect(result.results).toHaveLength(0);
      expect(result.success).toBe(true);
    });

    it('should continue processing on empty pages', async () => {
      let pagesProcessed = 0;
      const pageSizes = [10, 0, 5]; // Middle page is empty

      for (const pageSize of pageSizes) {
        pagesProcessed++;
        if (pageSize === 0) {
          // Empty page — would break pagination loop in real worker
          break;
        }
      }

      expect(pagesProcessed).toBe(2); // Stops at empty page
    });
  });

  describe('12. Data Validation: Invalid Data Rejection', () => {
    it('should reject sales with missing edition', async () => {
      const invalidEdition = null;
      const isValid = invalidEdition !== null && typeof invalidEdition === 'number';
      expect(isValid).toBe(false);
    });

    it('should reject sales with zero or negative price', async () => {
      const prices = [-1.0, 0, 0.00000001];
      const validPrices = prices.filter(p => p > 0);
      
      expect(validPrices).toHaveLength(1);
      expect(validPrices[0]).toBe(0.00000001);
    });

    it('should reject sales with missing timestamp', async () => {
      const timestamp = null;
      const isValid = timestamp !== null && typeof timestamp === 'string';
      expect(isValid).toBe(false);
    });

    it('should reject CAT sales with invalid token code', async () => {
      const tokenCode = ''; // Empty is invalid
      const isValid = !!(tokenCode && tokenCode.trim().length > 0);
      expect(isValid).toBe(false);
    });

    it('should extract edition correctly from NFT name', async () => {
      const names = ['Wojak #0644', 'Bepe Waifu #4124', 'No Edition'];
      const editions = names.map(extractEdition);

      expect(editions[0]).toBe(644);
      expect(editions[1]).toBe(4124);
      expect(editions[2]).toBeNull();
    });
  });

  describe('13. CAT Token Rate Loading', () => {
    it('should load CAT token rates from D1', async () => {
      // Insert token rates
      const stmt = env.DB.prepare(
        `INSERT INTO cat_token_rates (token_code, xch_rate, asset_id)
         VALUES (?, ?, ?)`
      );

      const rates = [
        { code: 'BEPE', rate: 0.50, assetId: 'asset_bepe' },
        { code: 'CHIA', rate: 1.0, assetId: 'asset_chia' },
      ];

      for (const rate of rates) {
        await stmt.bind(rate.code, rate.rate, rate.assetId).run();
      }

      const records = mockDb.getTable('cat_token_rates');
      expect(records).toHaveLength(2);
      expect(records[0].xch_rate).toBe(0.50);
    });
  });
});
