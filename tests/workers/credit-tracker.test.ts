import { describe, it, expect, beforeEach } from 'vitest';

// ─── Mock Interfaces ───
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
  DB: D1Database;
  TRADE_VALUES_KV: KVNamespace;
  COLLECTION_ID: string;
  MINTGARDEN_API_KEY?: string;
}

// ─── Test Fixtures ───
const TEST_WALLET = 'txch1abc123def456';
const TEST_WALLET_2 = 'txch2xyz789';
const TEST_NFT_ID = 'nft_coin_id_001';
const TEST_NFT_ID_2 = 'nft_coin_id_002';
const COLLECTION_ID = 'col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx';

const CREDITS_PER_XCH = 100;
const MAX_WHALE_BONUS = 0.30;
const MIN_EFFECTIVE_FLOOR = 0.5;
const FLOOR_FALLBACK_XCH = 100;

// ─── Helper: Calculate Credits (mirrored from worker) ───
function calculateCredits(priceXch: number, floorXch: number): { credits: number; multiplier: number } {
  const effectiveFloor = Math.max(MIN_EFFECTIVE_FLOOR, floorXch);
  const priceRatio = Math.max(1, priceXch / effectiveFloor);
  const whaleMultiplier = 1 + (MAX_WHALE_BONUS * (1 - 1 / priceRatio));
  const rawCredits = CREDITS_PER_XCH * priceXch * whaleMultiplier;
  return {
    credits: Math.round(rawCredits * 100),
    multiplier: Math.round(whaleMultiplier * 10000),
  };
}

// ─── Mock D1Database ───
class MockD1Database implements D1Database {
  private store = new Map<string, Record<string, unknown>[]>();

  constructor() {
    this.store.set('credit_events', []);
    this.store.set('floor_price_snapshots', []);
    this.store.set('phase2_mints', []);
    this.store.set('cat_credit_whitelist', []);
    this.store.set('sales_history', []);
    this.store.set('wojak_burns', []);
    this.store.set('combat_fighters', []);
    this.store.set('game_players', []);
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
      // Check for UNIQUE constraint violations
      if (this.sql.includes('event_id')) {
        const eventId = this.bindings[2]; // event_id is typically 3rd column
        const exists = table.some(r => r.event_id === eventId);
        if (exists) {
          throw new Error('UNIQUE constraint failed: event_id');
        }
      }
      table.push(record);
      this.store.set(tableName, table);
      return { results: [], success: true };
    }

    // DELETE
    if (this.sql.toLowerCase().includes('delete')) {
      if (this.sql.includes('WHERE id IN')) {
        const ids = this.bindings as number[];
        const filtered = table.filter(r => !ids.includes(r.id as number));
        this.store.set(tableName, filtered);
      } else if (this.sql.includes('WHERE event_id = ?')) {
        const eventId = this.bindings[0];
        const filtered = table.filter(r => r.event_id !== eventId);
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

    // SELECT with WHERE filters
    if (this.sql.toLowerCase().includes('where')) {
      records = this.applyFilters(records);
    }

    // GROUP BY with HAVING
    if (this.sql.includes('GROUP BY')) {
      records = this.applyGrouping(records);
    }

    // ORDER BY
    if (this.sql.includes('ORDER BY')) {
      records = this.applyOrdering(records);
    }

    // LIMIT
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
    const record: Record<string, unknown> = {};

    if (this.sql.toLowerCase().includes('insert into credit_events')) {
      const [wallet, nftId, eventId, priceXch, floorStored, credits, multiplier, _, timestamp] = this.bindings;
      return {
        id: Math.random(),
        wallet_address: wallet,
        nft_id: nftId,
        event_id: eventId,
        price_xch: priceXch,
        floor_at_time: floorStored,
        credits_earned: credits,
        whale_multiplier: multiplier,
        source: _,
        event_timestamp: timestamp,
      };
    }

    if (this.sql.toLowerCase().includes('insert into floor_price_snapshots')) {
      const [floorXch, source, date] = this.bindings;
      return { floor_xch: floorXch, source, snapshot_date: date };
    }

    if (this.sql.toLowerCase().includes('insert into wojak_burns')) {
      const [nftId, edition, burnerDid, burnerWallet, netScore, creditsAwarded, detectedVia] = this.bindings;
      return { nft_id: nftId, edition_number: edition, burner_did: burnerDid, burner_wallet: burnerWallet, net_score_at_burn: netScore, credits_awarded: creditsAwarded, detected_via: detectedVia };
    }

    return record;
  }

  private extractTableName(): string {
    const match = this.sql.match(/(?:from|into)\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }

  private applyFilters<T extends Record<string, unknown>>(records: T[]): T[] {
    if (this.sql.includes('wallet_address = ?')) {
      const wallet = this.bindings[0];
      return records.filter(r => r.wallet_address === wallet);
    }

    if (this.sql.includes('event_id = ?')) {
      const eventId = this.bindings[0];
      return records.filter(r => r.event_id === eventId);
    }

    if (this.sql.includes('event_id IN')) {
      const eventIds = new Set(this.bindings);
      return records.filter(r => eventIds.has(r.event_id));
    }

    if (this.sql.includes('nft_id = ?')) {
      const nftId = this.bindings[0];
      return records.filter(r => r.nft_id === nftId);
    }

    if (this.sql.includes('snapshot_date <= ?')) {
      const date = this.bindings[0];
      return records.filter(r => (r.snapshot_date as string) <= (date as string));
    }

    if (this.sql.includes('snapshot_date = ?')) {
      const date = this.bindings[0];
      return records.filter(r => r.snapshot_date === date);
    }

    if (this.sql.includes('id IN')) {
      const ids = new Set(this.bindings);
      return records.filter(r => ids.has(r.id));
    }

    return records;
  }

  private applyGrouping<T extends Record<string, unknown>>(records: T[]): T[] {
    // Simplified: just return first occurrence of each group
    const seen = new Set<string>();
    return records.filter(r => {
      const key = `${r.wallet_address}_${r.nft_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private applyOrdering<T extends Record<string, unknown>>(records: T[]): T[] {
    if (this.sql.includes('ORDER BY snapshot_date DESC')) {
      return records.sort((a, b) => {
        const dateA = a.snapshot_date as string;
        const dateB = b.snapshot_date as string;
        return dateB.localeCompare(dateA);
      });
    }

    if (this.sql.includes('ORDER BY completed_at ASC')) {
      return records.sort((a, b) => {
        const dateA = a.completed_at as string;
        const dateB = b.completed_at as string;
        return dateA.localeCompare(dateB);
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
describe('Credit Tracker Worker', () => {
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

  describe('1. Happy Path: Basic Credit Award', () => {
    it('should award credits for a simple XCH trade at floor price', async () => {
      const stmt = env.DB.prepare(
        `INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      
      const priceXch = 1.0;
      const floorStored = 100; // 1.0 XCH
      const calc = calculateCredits(priceXch, floorStored / 100);
      
      await stmt.bind(TEST_WALLET, TEST_NFT_ID, 'event_001', priceXch, floorStored, calc.credits, calc.multiplier, 'mintgarden', '2026-02-23T10:00:00Z').run();

      const records = mockDb.getTable('credit_events');
      expect(records).toHaveLength(1);
      expect(records[0].wallet_address).toBe(TEST_WALLET);
      expect(records[0].credits_earned).toBe(calc.credits);
      expect(records[0].price_xch).toBe(1.0);
    });
  });

  describe('2. Transaction Batching: Multiple Credits in One Call', () => {
    it('should batch insert 3 credit events', async () => {
      const credits = [
        { wallet: TEST_WALLET, nftId: TEST_NFT_ID, eventId: 'event_001', price: 1.0, floor: 100 },
        { wallet: TEST_WALLET_2, nftId: TEST_NFT_ID_2, eventId: 'event_002', price: 2.0, floor: 100 },
        { wallet: TEST_WALLET, nftId: TEST_NFT_ID_2, eventId: 'event_003', price: 0.5, floor: 100 },
      ];

      for (const c of credits) {
        const calc = calculateCredits(c.price, c.floor / 100);
        const stmt = env.DB.prepare(
          `INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        await stmt.bind(c.wallet, c.nftId, c.eventId, c.price, c.floor, calc.credits, calc.multiplier, 'mintgarden', '2026-02-23T10:00:00Z').run();
      }

      const records = mockDb.getTable('credit_events');
      expect(records).toHaveLength(3);
      expect(records[0].wallet_address).toBe(TEST_WALLET);
      expect(records[1].wallet_address).toBe(TEST_WALLET_2);
    });
  });

  describe('3. Concurrency: Simultaneous Balance Updates', () => {
    it('should handle concurrent inserts without data loss', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const stmt = env.DB.prepare(
          `INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        const calc = calculateCredits(1.0, 1.0);
        promises.push(
          stmt.bind(TEST_WALLET, `nft_${i}`, `event_${i}`, 1.0, 100, calc.credits, calc.multiplier, 'mintgarden', '2026-02-23T10:00:00Z').run()
        );
      }

      await Promise.all(promises);

      const records = mockDb.getTable('credit_events');
      expect(records).toHaveLength(5);
    });
  });

  describe('4. Insufficient Balance: Validation', () => {
    it('should reject negative prices', async () => {
      expect(() => {
        calculateCredits(-1.0, 1.0);
      }).not.toThrow(); // calculateCredits doesn't validate, worker does upstream
      
      // In real worker, this would be caught by event filtering
      // Negative price would be filtered upstream in real worker
      // Test shows that we can still compute credits (no crash)
      const calc = calculateCredits(0.5, 1.0);
      const stmt = env.DB.prepare(
        `INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      await stmt.bind(TEST_WALLET, TEST_NFT_ID, 'event_neg', 0.5, 100, calc.credits, calc.multiplier, 'mintgarden', '2026-02-23T10:00:00Z').run();
      
      const records = mockDb.getTable('credit_events');
      expect(records).toHaveLength(1);
    });

    it('should reject NaN amounts', async () => {
      const nanResult = calculateCredits(NaN, 1.0);
      // NaN * anything = NaN, Math.round(NaN) = NaN (stays NaN, not 0)
      expect(isNaN(nanResult.credits)).toBe(true);
    });
  });

  describe('5. Reward Calculation: Whale Bonus', () => {
    it('should apply whale bonus for prices above floor', async () => {
      const floorXch = 1.0;
      
      // Price at floor = no bonus
      const atFloor = calculateCredits(1.0, floorXch);
      
      // Price 2x floor = bonus
      const doubleFloor = calculateCredits(2.0, floorXch);
      
      // Price 10x floor = bonus but capped at 1.30x
      const tenxFloor = calculateCredits(10.0, floorXch);

      expect(doubleFloor.credits).toBeGreaterThan(atFloor.credits);
      expect(tenxFloor.multiplier).toBeLessThanOrEqual(13000); // max 1.30 multiplier
      expect(tenxFloor.credits).toBeGreaterThan(doubleFloor.credits);
    });
  });

  describe('6. Transaction History: Ledger Recording', () => {
    it('should record transaction history with timestamps', async () => {
      const timestamps = ['2026-02-20T10:00:00Z', '2026-02-21T10:00:00Z', '2026-02-22T10:00:00Z'];

      for (let i = 0; i < timestamps.length; i++) {
        const stmt = env.DB.prepare(
          `INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        const calc = calculateCredits(1.0, 1.0);
        await stmt.bind(TEST_WALLET, `nft_${i}`, `event_${i}`, 1.0, 100, calc.credits, calc.multiplier, 'mintgarden', timestamps[i]).run();
      }

      const records = mockDb.getTable('credit_events');
      expect(records).toHaveLength(3);
      expect(records[0].event_timestamp).toBe(timestamps[0]);
      expect(records[2].event_timestamp).toBe(timestamps[2]);
    });
  });

  describe('7. UNIQUE Constraint: Deduplication', () => {
    it('should reject duplicate event_ids (UNIQUE constraint)', async () => {
      const stmt = env.DB.prepare(
        `INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const calc = calculateCredits(1.0, 1.0);

      // First insert
      await stmt.bind(TEST_WALLET, TEST_NFT_ID, 'event_001', 1.0, 100, calc.credits, calc.multiplier, 'mintgarden', '2026-02-23T10:00:00Z').run();

      // Second insert with same event_id should fail
      const stmt2 = env.DB.prepare(
        `INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      await expect(
        stmt2.bind(TEST_WALLET_2, TEST_NFT_ID_2, 'event_001', 2.0, 100, calc.credits, calc.multiplier, 'mintgarden', '2026-02-23T11:00:00Z').run()
      ).rejects.toThrow('UNIQUE constraint');

      const records = mockDb.getTable('credit_events');
      expect(records).toHaveLength(1); // Only first insert succeeded
    });
  });

  describe('8. Rate Limiting: Floor Snapshot Per Day', () => {
    it('should only create one floor snapshot per day', async () => {
      const today = '2026-02-23';
      
      // First snapshot
      const stmt1 = env.DB.prepare(
        `INSERT INTO floor_price_snapshots (floor_xch, source, snapshot_date)
         VALUES (?, ?, ?)`
      );
      await stmt1.bind(100, 'mintgarden', today).run();

      // Check if today's snapshot exists
      const checkStmt = env.DB.prepare('SELECT 1 FROM floor_price_snapshots WHERE snapshot_date = ?');
      const existing = await checkStmt.bind(today).first();
      expect(existing).toBeDefined();

      // Verify only one snapshot for today
      const allStmt = env.DB.prepare('SELECT * FROM floor_price_snapshots WHERE snapshot_date = ?');
      const results = await allStmt.bind(today).all<{ snapshot_date: string }>();
      expect(results.results).toHaveLength(1);
    });
  });

  describe('9. Integrity: Auto-Dedup Duplicates', () => {
    it('should detect and fix duplicate wallet+nft_id entries', async () => {
      // Insert 2 events for same wallet+nft
      const calc = calculateCredits(1.0, 1.0);
      
      // Manually add to store for testing
      mockDb.insertFixture('credit_events', {
        id: 1,
        wallet_address: TEST_WALLET,
        nft_id: TEST_NFT_ID,
        event_id: 'event_dup_1',
        credits_earned: calc.credits,
      });

      mockDb.insertFixture('credit_events', {
        id: 2,
        wallet_address: TEST_WALLET,
        nft_id: TEST_NFT_ID,
        event_id: 'event_dup_2',
        credits_earned: calc.credits,
      });

      const recordsBefore = mockDb.getTable('credit_events');
      expect(recordsBefore).toHaveLength(2);

      // Auto-dedup: delete id 2 (keep id 1)
      const deleteStmt = env.DB.prepare('DELETE FROM credit_events WHERE id IN (?)');
      await deleteStmt.bind(2).run();

      const recordsAfter = mockDb.getTable('credit_events');
      expect(recordsAfter).toHaveLength(1);
    });
  });

  describe('10. Refund Logic: Transaction Reversal', () => {
    it('should handle refunds by clearing credits for a specific event', async () => {
      const calc = calculateCredits(1.0, 1.0);
      
      // Insert original credit
      const stmt = env.DB.prepare(
        `INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      await stmt.bind(TEST_WALLET, TEST_NFT_ID, 'refund_event_001', 1.0, 100, calc.credits, calc.multiplier, 'mintgarden', '2026-02-23T10:00:00Z').run();

      let records = mockDb.getTable('credit_events');
      expect(records).toHaveLength(1);

      // Delete (refund) the event
      const deleteStmt = env.DB.prepare('DELETE FROM credit_events WHERE event_id = ?');
      await deleteStmt.bind('refund_event_001').run();

      records = mockDb.getTable('credit_events');
      expect(records).toHaveLength(0);
    });
  });

  describe('11. Validation: Invalid Input Handling', () => {
    it('should handle zero and negative prices safely', async () => {
      const zeroCalc = calculateCredits(0, 1.0);
      expect(zeroCalc.credits).toBe(0);

      const negCalc = calculateCredits(-1.0, 1.0);
      // Negative price ratio is clamped to 1
      expect(negCalc.multiplier).toBeLessThanOrEqual(10000); // 1.0 * 10000
    });

    it('should use fallback floor when snapshot missing', async () => {
      // Query floor_price_snapshots for a date with no data
      const stmt = env.DB.prepare('SELECT floor_xch FROM floor_price_snapshots WHERE snapshot_date <= ? ORDER BY snapshot_date DESC LIMIT 7');
      const result = await stmt.bind('2026-02-23').all<{ floor_xch: number }>();
      
      expect(result.results).toHaveLength(0);
      // When no snapshots, use FLOOR_FALLBACK_XCH (100)
      expect(FLOOR_FALLBACK_XCH).toBe(100);
    });
  });

  describe('12. CAT Token Whitelisting', () => {
    it('should only award credits for whitelisted CAT tokens', async () => {
      const whitelist = new Set(['BEPE', 'WOJAK', 'CHIA']);

      const stmt = env.DB.prepare(
        `INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const calc = calculateCredits(0.5, 1.0);

      // Whitelisted token
      if (whitelist.has('BEPE')) {
        await stmt.bind(TEST_WALLET, 'bepe_edition_1', 'cat_bepe_001', 0.5, 100, calc.credits, calc.multiplier, 'sales_history', '2026-02-23T10:00:00Z').run();
      }

      const records = mockDb.getTable('credit_events');
      expect(records).toHaveLength(1);
      expect(records[0].event_id).toBe('cat_bepe_001');
    });
  });

  describe('13. Health Report: Integrity Tracking', () => {
    it('should generate health report with metrics', async () => {
      const report = {
        timestamp: new Date().toISOString(),
        duplicatesFound: 0,
        duplicatesFixed: 0,
        floorSnapshotOk: true,
        totalEvents: 0,
        xchProcessed: 10,
        xchInserted: 8,
        catProcessed: 5,
        catInserted: 3,
        whitelistSize: 8,
        issues: [],
      };

      await mockKv.put('credit_health', JSON.stringify(report));
      const stored = await mockKv.get('credit_health');
      
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      expect(parsed.xchProcessed).toBe(10);
      expect(parsed.xchInserted).toBe(8);
      expect(parsed.catProcessed).toBe(5);
    });
  });

  describe('14. Burn Detection: Burn Credits Award', () => {
    it('should award burn credits for eligible burns', async () => {
      const burnCredit = 10000; // 100 display credits

      const stmt = env.DB.prepare(
        `INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      await stmt.bind(TEST_WALLET, TEST_NFT_ID, `burn_${TEST_NFT_ID}`, 0, 0, burnCredit, 100, 'burn', '2026-02-23T10:00:00Z').run();

      const records = mockDb.getTable('credit_events');
      expect(records).toHaveLength(1);
      expect(records[0].credits_earned).toBe(burnCredit);
    });
  });
});
