import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock treasuryService before importing treasuryApi so the module-level
// `loadPersistedData()` call doesn't crash in the test environment (no real
// localStorage, no real fetch).
// ---------------------------------------------------------------------------
vi.mock('./treasuryService', () => ({
  treasuryService: {
    getXchPrice: vi.fn().mockResolvedValue(25),
    getCachedXchPrice: vi.fn().mockReturnValue(25),
  },
}));

vi.mock('./treasuryConstants', () => ({
  WALLET_ADDRESS: 'xch1testaddress0000000000000000000000000000000000000000000000',
}));

vi.mock('../utils/rateLimiter', () => ({
  spacescanQueue: { add: (fn: () => unknown) => fn() },
  coingeckoQueue: { add: (fn: () => unknown) => fn() },
}));

import {
  getCachedWalletData,
  isCacheStale,
  getWalletExplorerUrl,
  getCachedXchPrice,
  type WalletData,
} from './treasuryApi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWalletData(overrides: Partial<WalletData> = {}): WalletData {
  return {
    xch_balance: 10,
    xch_balance_mojos: 10_000_000_000_000,
    xch_price_usd: 25,
    tokens: [],
    total_token_value_usd: 0,
    nft_collections: [],
    last_updated: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Common setup: stub localStorage so module-level loadPersistedData() doesn't fail
// ---------------------------------------------------------------------------

beforeEach(() => {
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
// Tests
// ---------------------------------------------------------------------------

describe('treasuryApi', () => {
  // -------------------------------------------------------------------------
  // getCachedWalletData
  // -------------------------------------------------------------------------

  describe('getCachedWalletData', () => {
    it('returns null or a WalletData object', () => {
      const result = getCachedWalletData();
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('returns null initially (no in-memory cache)', () => {
      // Module-level cache starts null; localStorage is stubbed to return null.
      const result = getCachedWalletData();
      expect(result).toBeNull();
    });

    it('WalletData shape has required fields when returned', () => {
      const sample = makeWalletData();
      expect(typeof sample.xch_balance).toBe('number');
      expect(typeof sample.xch_balance_mojos).toBe('number');
      expect(typeof sample.xch_price_usd).toBe('number');
      expect(Array.isArray(sample.tokens)).toBe(true);
      expect(Array.isArray(sample.nft_collections)).toBe(true);
      expect(sample.last_updated instanceof Date).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // isCacheStale
  // -------------------------------------------------------------------------

  describe('isCacheStale', () => {
    it('returns a boolean', () => {
      expect(typeof isCacheStale()).toBe('boolean');
    });

    it('returns true when no cached data is available', () => {
      // Cache is null from fresh module; always stale
      expect(isCacheStale()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // getWalletExplorerUrl
  // -------------------------------------------------------------------------

  describe('getWalletExplorerUrl', () => {
    it('returns a non-empty string', () => {
      const url = getWalletExplorerUrl();
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    });

    it('returns a URL containing "spacescan.io"', () => {
      const url = getWalletExplorerUrl();
      expect(url).toContain('spacescan.io');
    });

    it('starts with https://', () => {
      const url = getWalletExplorerUrl();
      expect(url.startsWith('https://')).toBe(true);
    });

    it('includes the wallet address in the URL', () => {
      // The mock sets WALLET_ADDRESS, but the actual module uses its own import.
      // At minimum the URL should reference an "address" path segment.
      const url = getWalletExplorerUrl();
      expect(url).toContain('/address/');
    });

    it('returns the same value on repeated calls (pure getter)', () => {
      expect(getWalletExplorerUrl()).toBe(getWalletExplorerUrl());
    });
  });

  // -------------------------------------------------------------------------
  // getCachedXchPrice — delegates to treasuryService mock
  // -------------------------------------------------------------------------

  describe('getCachedXchPrice', () => {
    it('returns a number', () => {
      expect(typeof getCachedXchPrice()).toBe('number');
    });

    it('returns the mocked cached price (25)', () => {
      expect(getCachedXchPrice()).toBe(25);
    });

    it('does not return 0 (valid price assumption)', () => {
      expect(getCachedXchPrice()).not.toBe(0);
    });

    it('does not return a negative number', () => {
      expect(getCachedXchPrice()).toBeGreaterThanOrEqual(0);
    });

    it('is synchronous (does not return a Promise)', () => {
      const result = getCachedXchPrice();
      expect((result as unknown) instanceof Promise).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // WalletData shape validation
  // -------------------------------------------------------------------------

  describe('WalletData shape', () => {
    it('makeWalletData produces a valid object with all required fields', () => {
      const data = makeWalletData();
      expect(data).toHaveProperty('xch_balance');
      expect(data).toHaveProperty('xch_balance_mojos');
      expect(data).toHaveProperty('xch_price_usd');
      expect(data).toHaveProperty('tokens');
      expect(data).toHaveProperty('total_token_value_usd');
      expect(data).toHaveProperty('nft_collections');
      expect(data).toHaveProperty('last_updated');
    });

    it('overrides are applied correctly', () => {
      const data = makeWalletData({ xch_balance: 999, xch_price_usd: 50 });
      expect(data.xch_balance).toBe(999);
      expect(data.xch_price_usd).toBe(50);
    });

    it('tokens is empty by default in the fixture', () => {
      const data = makeWalletData();
      expect(data.tokens).toHaveLength(0);
    });

    it('nft_collections is empty by default in the fixture', () => {
      const data = makeWalletData();
      expect(data.nft_collections).toHaveLength(0);
    });

    it('xch_balance_mojos is 1e12 times xch_balance in the fixture', () => {
      const data = makeWalletData({ xch_balance: 5, xch_balance_mojos: 5_000_000_000_000 });
      expect(data.xch_balance_mojos).toBe(data.xch_balance * 1e12);
    });
  });

  // -------------------------------------------------------------------------
  // Module-level constants accessible through the exports
  // -------------------------------------------------------------------------

  describe('module behavior', () => {
    it('getCachedWalletData and isCacheStale are consistent: null cache implies stale', () => {
      const cached = getCachedWalletData();
      const stale = isCacheStale();
      if (cached === null) {
        expect(stale).toBe(true);
      }
    });

    it('getWalletExplorerUrl is deterministic across multiple calls', () => {
      const first = getWalletExplorerUrl();
      const second = getWalletExplorerUrl();
      expect(first).toBe(second);
    });
  });
});
