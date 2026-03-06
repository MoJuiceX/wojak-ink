/**
 * Tests for historicalPriceService.
 *
 * Strategy:
 * - Mock @/utils/rateLimiter so no real HTTP calls are made.
 * - Stub localStorage before import (happy-dom stub omits removeItem in this env).
 * - Use addPriceToCache / clearPriceCache to control the module-level cache state.
 * - Test sync functions directly: getTokenRate, getCatPrice, getPriceCache,
 *   addPriceToCache, clearPriceCache.
 * - Test convertSalePrice with pre-seeded cache so getXchPrice resolves without
 *   any network call.
 *
 * Functions skipped (require live network / complex async mocking with little value):
 *   initializePriceService, fetchXchPriceForDate, fetchXchPriceRange,
 *   fetchCurrentCatPrice, fetchCatTradeHistory, convertSalePrices, getCurrentXchPrice.
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { muteConsole } from '@/tests/muteConsole';

// Stub localStorage before importing the service.
// happy-dom's localStorage stub in this vitest env omits removeItem.
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }),
  length: 0,
  key: vi.fn(() => null),
};

beforeAll(() => {
  vi.stubGlobal('localStorage', localStorageMock);
});
muteConsole();

// Mock the rate limiter — no real HTTP requests in tests.
vi.mock('@/utils/rateLimiter', () => ({
  rateLimitedFetch: vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
}));

import {
  getTokenRate,
  getCatPrice,
  getPriceCache,
  addPriceToCache,
  clearPriceCache,
  convertSalePrice,
} from './historicalPriceService';

// ============ Helpers ============

function dateOf(isoDate: string): Date {
  return new Date(isoDate);
}

// Reset cache before each test to prevent cross-test state leakage.
beforeEach(() => {
  clearPriceCache();
});

// ============ clearPriceCache / getPriceCache ============

describe('clearPriceCache', () => {
  it('resets xchUsd to an empty object', () => {
    addPriceToCache(dateOf('2024-01-15'), 25.00, undefined);
    clearPriceCache();
    expect(getPriceCache().xchUsd).toEqual({});
  });

  it('resets catXch to an empty object', () => {
    addPriceToCache(dateOf('2024-01-15'), undefined, 0.00005);
    clearPriceCache();
    expect(getPriceCache().catXch).toEqual({});
  });

  it('resets lastUpdated to empty string', () => {
    clearPriceCache();
    expect(getPriceCache().lastUpdated).toBe('');
  });
});

// ============ addPriceToCache / getPriceCache ============

describe('addPriceToCache', () => {
  it('stores an XCH/USD price keyed by YYYY-MM-DD', () => {
    addPriceToCache(dateOf('2024-06-01'), 30.50, undefined);
    expect(getPriceCache().xchUsd['2024-06-01']).toBe(30.50);
  });

  it('stores a CAT/XCH price keyed by YYYY-MM-DD', () => {
    addPriceToCache(dateOf('2024-06-01'), undefined, 0.00012);
    expect(getPriceCache().catXch['2024-06-01']).toBe(0.00012);
  });

  it('can store both xchUsd and catXch in one call', () => {
    addPriceToCache(dateOf('2024-06-01'), 28.00, 0.00008);
    const cache = getPriceCache();
    expect(cache.xchUsd['2024-06-01']).toBe(28.00);
    expect(cache.catXch['2024-06-01']).toBe(0.00008);
  });

  it('does not write xchUsd when argument is undefined', () => {
    addPriceToCache(dateOf('2024-07-01'), undefined, 0.0001);
    expect(getPriceCache().xchUsd['2024-07-01']).toBeUndefined();
  });

  it('does not write catXch when argument is undefined', () => {
    addPriceToCache(dateOf('2024-07-01'), 22.00, undefined);
    expect(getPriceCache().catXch['2024-07-01']).toBeUndefined();
  });

  it('overwrites an existing price for the same date', () => {
    addPriceToCache(dateOf('2024-06-01'), 20.00, undefined);
    addPriceToCache(dateOf('2024-06-01'), 35.00, undefined);
    expect(getPriceCache().xchUsd['2024-06-01']).toBe(35.00);
  });

  it('getPriceCache returns an object with xchUsd, catXch, and lastUpdated keys', () => {
    const cache = getPriceCache();
    expect(cache).toHaveProperty('xchUsd');
    expect(cache).toHaveProperty('catXch');
    expect(cache).toHaveProperty('lastUpdated');
  });
});

// ============ getTokenRate ============

describe('getTokenRate', () => {
  it('returns the PIZZA rate when tokenType is "PIZZA"', () => {
    expect(getTokenRate('PIZZA')).toBeCloseTo(0.00000285);
  });

  it('returns the same PIZZA rate for the aliased "$PIZZA" key', () => {
    expect(getTokenRate('$PIZZA')).toBeCloseTo(0.00000285);
  });

  it('returns the BEPE rate', () => {
    expect(getTokenRate('BEPE')).toBeCloseTo(0.0000204);
  });

  it('returns the NeckCoin rate (~3 XCH per token)', () => {
    expect(getTokenRate('NeckCoin')).toBeCloseTo(3.006);
  });

  it('returns the HOA rate', () => {
    expect(getTokenRate('HOA')).toBeCloseTo(0.000318);
  });

  it('returns the LOVE rate for the "LOVE" key', () => {
    expect(getTokenRate('LOVE')).toBeCloseTo(0.000118);
  });

  it('returns the default rate (0.000001) for an unknown token', () => {
    expect(getTokenRate('UNKNOWN_TOKEN')).toBe(0.000001);
  });

  it('returns the default rate when tokenType is undefined', () => {
    expect(getTokenRate(undefined)).toBe(0.000001);
  });

  it('returns the default rate when tokenType is an empty string', () => {
    expect(getTokenRate('')).toBe(0.000001);
  });

  it('SPROUT and $SPROUT return the same rate', () => {
    expect(getTokenRate('SPROUT')).toBe(getTokenRate('$SPROUT'));
  });

  it('G4M and $G4M return the same rate', () => {
    expect(getTokenRate('G4M')).toBe(getTokenRate('$G4M'));
  });
});

// ============ getCatPrice ============

describe('getCatPrice', () => {
  it('returns the cached CAT price for an exact date match', () => {
    addPriceToCache(dateOf('2024-05-10'), undefined, 0.00007);
    expect(getCatPrice(dateOf('2024-05-10'))).toBe(0.00007);
  });

  it('returns the closest cached date when exact date is missing', () => {
    addPriceToCache(dateOf('2024-05-01'), undefined, 0.00009);
    const price = getCatPrice(dateOf('2024-05-03'));
    expect(price).toBe(0.00009);
  });

  it('returns the fallback default (0.00005) when cache is empty', () => {
    expect(getCatPrice(dateOf('2024-01-01'))).toBe(0.00005);
  });

  it('prefers the closer of two cached dates', () => {
    addPriceToCache(dateOf('2024-03-01'), undefined, 0.00003);
    addPriceToCache(dateOf('2024-03-20'), undefined, 0.00006);
    // 2024-03-18: 2 days from Mar 20, 17 days from Mar 01 => picks Mar 20
    const price = getCatPrice(dateOf('2024-03-18'));
    expect(price).toBe(0.00006);
  });

  it('returns exact match price over nearby cache entry', () => {
    addPriceToCache(dateOf('2024-06-10'), undefined, 0.00011);
    addPriceToCache(dateOf('2024-06-11'), undefined, 0.00022);
    expect(getCatPrice(dateOf('2024-06-10'))).toBe(0.00011);
  });
});

// ============ convertSalePrice ============

describe('convertSalePrice', () => {
  it('converts an XCH sale using the cached XCH price', async () => {
    addPriceToCache(dateOf('2024-04-01'), 25.00, undefined);
    const result = await convertSalePrice(2, 'XCH', dateOf('2024-04-01'));
    expect(result.originalAmount).toBe(2);
    expect(result.currency).toBe('XCH');
    expect(result.xchEquivalent).toBe(2);
    expect(result.usdValue).toBeCloseTo(50.00);
    expect(result.xchPriceAtSale).toBe(25.00);
  });

  it('converts a CAT sale using a named tokenType rate', async () => {
    addPriceToCache(dateOf('2024-04-01'), 20.00, undefined);
    const result = await convertSalePrice(10000, 'CAT', dateOf('2024-04-01'), 'BEPE');
    expect(result.currency).toBe('CAT');
    expect(result.xchEquivalent).toBeCloseTo(10000 * 0.0000204);
    expect(result.catPriceAtSale).toBeCloseTo(0.0000204);
  });

  it('converts a CAT sale using getCatPrice when no tokenType is given', async () => {
    addPriceToCache(dateOf('2024-04-01'), 20.00, 0.00005);
    const result = await convertSalePrice(1000, 'CAT', dateOf('2024-04-01'));
    expect(result.xchEquivalent).toBeCloseTo(1000 * 0.00005);
    expect(result.catPriceAtSale).toBeCloseTo(0.00005);
  });

  it('falls back to default XCH price (25) when cache is empty and fetch fails', async () => {
    const result = await convertSalePrice(1, 'XCH', dateOf('2020-01-01'));
    expect(result.xchPriceAtSale).toBe(25);
    expect(result.usdValue).toBe(25);
  });

  it('usdValue for XCH sale equals amount * xchPrice', async () => {
    addPriceToCache(dateOf('2024-06-15'), 40.00, undefined);
    const result = await convertSalePrice(5, 'XCH', dateOf('2024-06-15'));
    expect(result.usdValue).toBeCloseTo(200.00);
  });

  it('catPriceAtSale is defined and positive on CAT sales', async () => {
    addPriceToCache(dateOf('2024-04-01'), 30.00, 0.00007);
    const result = await convertSalePrice(500, 'CAT', dateOf('2024-04-01'));
    expect(result.catPriceAtSale).toBeDefined();
    expect(result.catPriceAtSale).toBeGreaterThan(0);
  });
});
