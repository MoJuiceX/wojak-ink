import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the rate limiter BEFORE importing salesApi, so the module-level
// `dexieQueue` is replaced with a simple pass-through.
// ---------------------------------------------------------------------------
vi.mock('../utils/rateLimiter', () => ({
  dexieQueue: {
    add: (fn: () => unknown) => fn(),
  },
  mintgardenQueue: {
    add: (fn: () => unknown) => fn(),
  },
  rateLimitedFetch: vi.fn(),
}));

import {
  fetchSalesIndex,
  getTraitSales,
  getAllTraitSales,
  getTraitSalesByCategory,
  getNftSalesHistory,
  type NFTTrade,
} from './salesApi';

// ---------------------------------------------------------------------------
// Helpers / fixtures
// ---------------------------------------------------------------------------

function makeTrade(nftId: string, priceXch: number, timestamp = 1_700_000_000_000): NFTTrade {
  return {
    nftId,
    priceXch,
    timestamp,
    timestampISO: new Date(timestamp).toISOString(),
    tradeId: `test-${nftId}-${timestamp}`,
    source: 'dexie',
  };
}

const COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

// Minimal Dexie offer shape that contains an NFT in `offered` and XCH in `requested`
function makeDexieOffer(
  nftId: number,
  priceInXch: number,
  dateCompleted = '2024-01-15T12:00:00Z'
) {
  return {
    status: 4,
    id: `offer-${nftId}`,
    date_completed: dateCompleted,
    offered: [
      {
        type: 'nft',
        asset_id: COLLECTION_ID,
        edition: nftId,
        name: `Your Wojak #${String(nftId).padStart(4, '0')}`,
      },
    ],
    requested: [
      {
        type: 'xch',
        asset_id: null,
        amount: priceInXch * 1e12, // convert XCH to mojos
      },
    ],
  };
}

// Minimal metadata array for 3 NFTs
const mockMetadata = [
  {
    name: 'Your Wojak #0001',
    edition: 1,
    attributes: [
      { trait_type: 'Background', value: 'Blue' },
      { trait_type: 'Clothes', value: 'Hoodie' },
    ],
  },
  {
    name: 'Your Wojak #0042',
    edition: 42,
    attributes: [
      { trait_type: 'Background', value: 'Red' },
      { trait_type: 'Clothes', value: 'Hoodie' },
    ],
  },
  {
    name: 'Your Wojak #0100',
    edition: 100,
    attributes: [
      { trait_type: 'Background', value: 'Blue' },
      { trait_type: 'Clothes', value: 'T-Shirt' },
    ],
  },
];

/**
 * Creates a fetch spy that:
 * - Returns `offers` for the first Dexie offers call, then empty array
 * - Returns mockMetadata for the metadata.json call
 */
function stubFetchWithOffers(offers: object[]) {
  let firstOfferCall = true;

  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
    const urlStr = String(url);

    if (urlStr.includes('metadata.json')) {
      return { ok: true, json: async () => mockMetadata } as Response;
    }

    if (urlStr.includes('/offers')) {
      if (firstOfferCall) {
        firstOfferCall = false;
        return { ok: true, json: async () => ({ offers }) } as Response;
      }
      return { ok: true, json: async () => ({ offers: [] }) } as Response;
    }

    return { ok: false, status: 404, json: async () => ({}) } as Response;
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// fetchSalesIndex — integration test with mocked fetch
// ---------------------------------------------------------------------------

describe('salesApi', () => {
  describe('fetchSalesIndex', () => {
    it('returns a SalesIndexResult with expected shape', async () => {
      stubFetchWithOffers([makeDexieOffer(1, 5.0), makeDexieOffer(42, 8.0)]);

      const result = await fetchSalesIndex(true);

      expect(result).toHaveProperty('trades');
      expect(result).toHaveProperty('byNftId');
      expect(result).toHaveProperty('byTrait');
      expect(result).toHaveProperty('totalTrades');
      expect(result).toHaveProperty('lastUpdated');
    });

    it('byNftId is a Map', async () => {
      stubFetchWithOffers([makeDexieOffer(1, 5.0)]);

      const result = await fetchSalesIndex(true);

      expect(result.byNftId instanceof Map).toBe(true);
    });

    it('totalTrades matches trades array length', async () => {
      stubFetchWithOffers([
        makeDexieOffer(1, 5.0),
        makeDexieOffer(42, 8.0),
        makeDexieOffer(100, 3.0),
      ]);

      const result = await fetchSalesIndex(true);

      expect(result.totalTrades).toBe(result.trades.length);
    });

    it('byTrait is a Map', async () => {
      stubFetchWithOffers([makeDexieOffer(1, 5.0)]);

      const result = await fetchSalesIndex(true);

      expect(result.byTrait instanceof Map).toBe(true);
    });

    it('handles empty offer response gracefully', async () => {
      stubFetchWithOffers([]);

      const result = await fetchSalesIndex(true);

      expect(result.trades).toHaveLength(0);
      expect(result.totalTrades).toBe(0);
    });

    it('lastUpdated is a Date instance', async () => {
      stubFetchWithOffers([]);

      const result = await fetchSalesIndex(true);

      expect(result.lastUpdated instanceof Date).toBe(true);
    });

    it('trades array contains NFTTrade objects with correct priceXch', async () => {
      stubFetchWithOffers([makeDexieOffer(1, 5.5)]);

      const result = await fetchSalesIndex(true);

      // At least one trade should have priceXch ~5.5
      const trade = result.trades.find((t) => t.nftId === '1');
      expect(trade).toBeDefined();
      expect(trade?.priceXch).toBeCloseTo(5.5);
    });

    it('trade nftId is stored as a string', async () => {
      stubFetchWithOffers([makeDexieOffer(42, 8.0)]);

      const result = await fetchSalesIndex(true);

      for (const trade of result.trades) {
        expect(typeof trade.nftId).toBe('string');
      }
    });

    it('trade source is "dexie"', async () => {
      stubFetchWithOffers([makeDexieOffer(1, 5.0)]);

      const result = await fetchSalesIndex(true);

      for (const trade of result.trades) {
        expect(trade.source).toBe('dexie');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getAllTraitSales
  // ---------------------------------------------------------------------------

  describe('getAllTraitSales', () => {
    it('returns an array', async () => {
      stubFetchWithOffers([makeDexieOffer(1, 5.0), makeDexieOffer(42, 8.0)]);

      const result = await getAllTraitSales();
      expect(Array.isArray(result)).toBe(true);
    });

    it('result items have TraitSalesData fields when non-empty', async () => {
      stubFetchWithOffers([makeDexieOffer(1, 5.0)]);

      await fetchSalesIndex(true);
      const result = await getAllTraitSales();

      for (const item of result) {
        expect(typeof item.category).toBe('string');
        expect(typeof item.trait).toBe('string');
        expect(typeof item.totalSales).toBe('number');
        expect(typeof item.avgPrice).toBe('number');
        expect(typeof item.minPrice).toBe('number');
        expect(typeof item.maxPrice).toBe('number');
        expect(Array.isArray(item.recentSales)).toBe(true);
      }
    });

    it('result items are sorted by avgPrice descending when multiple traits', async () => {
      // Both Blue (5 XCH) and Red (8 XCH) backgrounds are indexed
      stubFetchWithOffers([makeDexieOffer(1, 5.0), makeDexieOffer(42, 8.0)]);

      await fetchSalesIndex(true);
      const result = await getAllTraitSales();

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].avgPrice).toBeGreaterThanOrEqual(result[i + 1].avgPrice);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getTraitSalesByCategory
  // ---------------------------------------------------------------------------

  describe('getTraitSalesByCategory', () => {
    it('returns an array', async () => {
      stubFetchWithOffers([makeDexieOffer(1, 5.0)]);

      const result = await getTraitSalesByCategory('Background');
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns an empty array for an unknown category', async () => {
      stubFetchWithOffers([]);

      await fetchSalesIndex(true);
      const result = await getTraitSalesByCategory('NonExistentCategory');
      expect(result).toHaveLength(0);
    });

    it('all returned items have the requested category', async () => {
      stubFetchWithOffers([
        makeDexieOffer(1, 5.0),
        makeDexieOffer(42, 8.0),
        makeDexieOffer(100, 3.0),
      ]);

      await fetchSalesIndex(true);
      const result = await getTraitSalesByCategory('Clothes');

      for (const entry of result) {
        expect(entry.category).toBe('Clothes');
      }
    });

    it('results are sorted by avgPrice descending', async () => {
      stubFetchWithOffers([
        makeDexieOffer(1, 5.0),
        makeDexieOffer(42, 8.0),
        makeDexieOffer(100, 3.0),
      ]);

      await fetchSalesIndex(true);
      const result = await getTraitSalesByCategory('Background');

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].avgPrice).toBeGreaterThanOrEqual(result[i + 1].avgPrice);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getNftSalesHistory
  // ---------------------------------------------------------------------------

  describe('getNftSalesHistory', () => {
    it('returns an array', async () => {
      stubFetchWithOffers([makeDexieOffer(1, 5.0)]);

      await fetchSalesIndex(true);
      const result = await getNftSalesHistory('1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns empty array for an NFT with no sales', async () => {
      stubFetchWithOffers([makeDexieOffer(1, 5.0)]);

      await fetchSalesIndex(true);
      const result = await getNftSalesHistory('9999');
      expect(result).toHaveLength(0);
    });

    it('each trade in the history has required NFTTrade fields', async () => {
      stubFetchWithOffers([makeDexieOffer(42, 8.0)]);

      await fetchSalesIndex(true);
      const result = await getNftSalesHistory('42');

      for (const trade of result) {
        expect(typeof trade.nftId).toBe('string');
        expect(typeof trade.priceXch).toBe('number');
        expect(typeof trade.timestamp).toBe('number');
        expect(typeof trade.timestampISO).toBe('string');
        expect(typeof trade.tradeId).toBe('string');
        expect(trade.source).toBe('dexie');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getTraitSales
  // ---------------------------------------------------------------------------

  describe('getTraitSales', () => {
    it('returns null for an unknown category:trait combination', async () => {
      stubFetchWithOffers([]);

      await fetchSalesIndex(true);
      const result = await getTraitSales('Unknown', 'Trait');
      expect(result).toBeNull();
    });

    it('returns null for a valid category but non-existent trait', async () => {
      stubFetchWithOffers([makeDexieOffer(1, 5.0)]);

      await fetchSalesIndex(true);
      const result = await getTraitSales('Background', 'NonExistentColor');
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // NFTTrade fixture validation
  // ---------------------------------------------------------------------------

  describe('NFTTrade shape', () => {
    it('makeTrade helper produces a valid NFTTrade object', () => {
      const t = makeTrade('1', 5.0, 1_700_000_000_000);
      expect(t.nftId).toBe('1');
      expect(t.priceXch).toBe(5.0);
      expect(t.source).toBe('dexie');
      expect(typeof t.timestampISO).toBe('string');
      expect(typeof t.tradeId).toBe('string');
    });

    it('timestamp is stored as milliseconds (number > 1e12)', () => {
      const t = makeTrade('42', 8.0, 1_700_000_000_000);
      expect(t.timestamp).toBeGreaterThan(1e12);
    });

    it('timestampISO is a valid ISO date string', () => {
      const t = makeTrade('1', 5.0, 1_700_000_000_000);
      expect(() => new Date(t.timestampISO)).not.toThrow();
      expect(t.timestampISO).toContain('T');
    });
  });
});
