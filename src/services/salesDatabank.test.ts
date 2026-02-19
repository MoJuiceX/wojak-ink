import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SaleRecord, SalesDatabank } from './salesDatabank';

// ============================================
// MOCK LOCALSTORAGE
// ============================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Import AFTER localStorage mock is set up so module-level code sees the mock
const {
  initializeSalesDatabank,
  getSalesForNft,
  nftHasSales,
  getSalesForTrait,
  getTraitStats,
  getAllTraitStats,
  getOverallStats,
  getRecentSales,
  exportDatabank,
  importDatabank,
  clearDatabank,
  getSalesCount,
} = await import('./salesDatabank');

// ============================================
// HELPERS
// ============================================

function makeSale(
  nftId: number,
  xchEquivalent: number,
  timestamp: number,
  traits: Record<string, string> = {},
  currency: 'XCH' | 'CAT' = 'XCH'
): SaleRecord {
  return {
    nftId,
    amount: xchEquivalent,
    currency,
    timestamp,
    traits,
    xchEquivalent,
    usdValue: xchEquivalent * 5,
    tokenCode: currency === 'CAT' ? 'BEPE' : null,
    catXchRate: currency === 'CAT' ? 0.001 : null,
  };
}

function seedDatabank(sales: SaleRecord[]): void {
  const db: SalesDatabank = {
    sales,
    lastUpdated: new Date().toISOString(),
    version: 1,
  };
  importDatabank(db);
}

// ============================================
// TESTS
// ============================================

beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  clearDatabank();
  initializeSalesDatabank();
});

describe('clearDatabank / initializeSalesDatabank', () => {
  it('starts with zero sales after clear', () => {
    seedDatabank([makeSale(1, 5, Date.now())]);
    clearDatabank();
    initializeSalesDatabank();
    expect(getSalesCount()).toBe(0);
  });

  it('initializeSalesDatabank is idempotent when localStorage is empty', () => {
    initializeSalesDatabank();
    expect(getSalesCount()).toBe(0);
  });
});

describe('getSalesCount', () => {
  it('returns 0 for empty databank', () => {
    expect(getSalesCount()).toBe(0);
  });

  it('returns correct count after import', () => {
    seedDatabank([
      makeSale(1, 4, 1000),
      makeSale(2, 5, 2000),
      makeSale(3, 6, 3000),
    ]);
    expect(getSalesCount()).toBe(3);
  });
});

describe('getSalesForNft', () => {
  it('returns empty array for unknown NFT', () => {
    expect(getSalesForNft(9999)).toEqual([]);
  });

  it('returns all sales for a known NFT', () => {
    seedDatabank([
      makeSale(1, 4, 1000),
      makeSale(1, 5, 2000),
      makeSale(2, 6, 3000),
    ]);
    const sales = getSalesForNft(1);
    expect(sales).toHaveLength(2);
  });

  it('returns sales sorted newest first', () => {
    seedDatabank([
      makeSale(1, 4, 1000),
      makeSale(1, 5, 5000),
      makeSale(1, 3, 2000),
    ]);
    const sales = getSalesForNft(1);
    expect(sales[0].timestamp).toBe(5000);
    expect(sales[1].timestamp).toBe(2000);
    expect(sales[2].timestamp).toBe(1000);
  });
});

describe('nftHasSales', () => {
  it('returns false for NFT with no sales', () => {
    expect(nftHasSales(42)).toBe(false);
  });

  it('returns true for NFT with at least one sale', () => {
    seedDatabank([makeSale(42, 4, 1000)]);
    expect(nftHasSales(42)).toBe(true);
  });
});

describe('getSalesForTrait', () => {
  it('returns empty array for unknown trait', () => {
    expect(getSalesForTrait('Background', 'Blue')).toEqual([]);
  });

  it('returns only sales that have the matching trait', () => {
    seedDatabank([
      makeSale(1, 4, 1000, { Background: 'Blue', Hat: 'Cap' }),
      makeSale(2, 5, 2000, { Background: 'Red', Hat: 'Cap' }),
      makeSale(3, 6, 3000, { Background: 'Blue', Hat: 'None' }),
    ]);
    const sales = getSalesForTrait('Background', 'Blue');
    expect(sales).toHaveLength(2);
    expect(sales.every(s => s.traits['Background'] === 'Blue')).toBe(true);
  });

  it('returns all sales for a matching Hat trait', () => {
    seedDatabank([
      makeSale(1, 4, 1000, { Hat: 'Cap' }),
      makeSale(2, 5, 2000, { Hat: 'Cap' }),
      makeSale(3, 6, 3000, { Hat: 'None' }),
    ]);
    expect(getSalesForTrait('Hat', 'Cap')).toHaveLength(2);
    expect(getSalesForTrait('Hat', 'None')).toHaveLength(1);
  });
});

describe('getTraitStats', () => {
  it('returns null for trait with no sales', () => {
    expect(getTraitStats('Background', 'Purple')).toBeNull();
  });

  it('calculates correct stats for single sale', () => {
    seedDatabank([makeSale(1, 10, 1000, { Background: 'Blue' })]);
    const stats = getTraitStats('Background', 'Blue');
    expect(stats).not.toBeNull();
    expect(stats!.totalSales).toBe(1);
    expect(stats!.avgPriceXch).toBe(10);
    expect(stats!.minPriceXch).toBe(10);
    expect(stats!.maxPriceXch).toBe(10);
    expect(stats!.totalVolumeXch).toBe(10);
    expect(stats!.traitCategory).toBe('Background');
    expect(stats!.traitValue).toBe('Blue');
  });

  it('calculates correct stats for multiple sales', () => {
    seedDatabank([
      makeSale(1, 4, 1000, { Background: 'Blue' }),
      makeSale(2, 6, 2000, { Background: 'Blue' }),
      makeSale(3, 8, 3000, { Background: 'Blue' }),
    ]);
    const stats = getTraitStats('Background', 'Blue');
    expect(stats!.totalSales).toBe(3);
    expect(stats!.minPriceXch).toBe(4);
    expect(stats!.maxPriceXch).toBe(8);
    expect(stats!.avgPriceXch).toBeCloseTo(6, 5);
    expect(stats!.totalVolumeXch).toBe(18);
  });
});

describe('getAllTraitStats', () => {
  it('returns empty array for category with no sales', () => {
    expect(getAllTraitStats('Glasses')).toEqual([]);
  });

  it('returns stats sorted by avgPriceXch descending', () => {
    seedDatabank([
      makeSale(1, 2, 1000, { Background: 'Blue' }),
      makeSale(2, 10, 2000, { Background: 'Red' }),
      makeSale(3, 5, 3000, { Background: 'Green' }),
    ]);
    const stats = getAllTraitStats('Background');
    expect(stats).toHaveLength(3);
    expect(stats[0].traitValue).toBe('Red');
    expect(stats[1].traitValue).toBe('Green');
    expect(stats[2].traitValue).toBe('Blue');
  });

  it('only returns stats for the requested category', () => {
    seedDatabank([
      makeSale(1, 5, 1000, { Background: 'Blue', Hat: 'Cap' }),
    ]);
    const stats = getAllTraitStats('Hat');
    expect(stats).toHaveLength(1);
    expect(stats[0].traitCategory).toBe('Hat');
  });
});

describe('getOverallStats', () => {
  it('returns zero stats when databank is empty', () => {
    const stats = getOverallStats();
    expect(stats.totalSales).toBe(0);
    expect(stats.totalVolumeXch).toBe(0);
    expect(stats.avgPriceXch).toBe(0);
    expect(stats.uniqueNftsSold).toBe(0);
  });

  it('calculates totalSales correctly', () => {
    seedDatabank([
      makeSale(1, 4, 1000),
      makeSale(2, 6, 2000),
    ]);
    expect(getOverallStats().totalSales).toBe(2);
  });

  it('calculates totalVolumeXch correctly', () => {
    seedDatabank([
      makeSale(1, 4, 1000),
      makeSale(2, 6, 2000),
    ]);
    expect(getOverallStats().totalVolumeXch).toBe(10);
  });

  it('calculates avgPriceXch correctly', () => {
    seedDatabank([
      makeSale(1, 4, 1000),
      makeSale(2, 6, 2000),
    ]);
    expect(getOverallStats().avgPriceXch).toBe(5);
  });

  it('counts uniqueNftsSold correctly (same NFT sold twice)', () => {
    seedDatabank([
      makeSale(1, 4, 1000),
      makeSale(1, 6, 2000),
      makeSale(2, 8, 3000),
    ]);
    expect(getOverallStats().uniqueNftsSold).toBe(2);
  });
});

describe('getRecentSales', () => {
  it('returns empty array when no sales', () => {
    expect(getRecentSales(10)).toEqual([]);
  });

  it('returns sales sorted newest first', () => {
    seedDatabank([
      makeSale(1, 4, 1000),
      makeSale(2, 5, 3000),
      makeSale(3, 6, 2000),
    ]);
    const recent = getRecentSales(10);
    expect(recent[0].timestamp).toBe(3000);
    expect(recent[1].timestamp).toBe(2000);
    expect(recent[2].timestamp).toBe(1000);
  });

  it('respects the limit parameter', () => {
    seedDatabank([
      makeSale(1, 4, 1000),
      makeSale(2, 5, 2000),
      makeSale(3, 6, 3000),
      makeSale(4, 7, 4000),
    ]);
    expect(getRecentSales(2)).toHaveLength(2);
  });

  it('defaults to 10 results', () => {
    const sales = Array.from({ length: 15 }, (_, i) =>
      makeSale(i + 1, i + 1, (i + 1) * 1000)
    );
    seedDatabank(sales);
    expect(getRecentSales()).toHaveLength(10);
  });
});

describe('exportDatabank / importDatabank', () => {
  it('exports the current databank state', () => {
    seedDatabank([makeSale(1, 5, 1000)]);
    const exported = exportDatabank();
    expect(exported.sales).toHaveLength(1);
    expect(exported.version).toBe(1);
  });

  it('imported data is accessible via getSalesForNft', () => {
    const db: SalesDatabank = {
      sales: [makeSale(99, 7, 9999)],
      lastUpdated: new Date().toISOString(),
      version: 1,
    };
    importDatabank(db);
    expect(getSalesForNft(99)).toHaveLength(1);
    expect(getSalesForNft(99)[0].xchEquivalent).toBe(7);
  });

  it('importDatabank rebuilds trait indexes', () => {
    const db: SalesDatabank = {
      sales: [makeSale(10, 3, 1000, { Hat: 'Crown' })],
      lastUpdated: new Date().toISOString(),
      version: 1,
    };
    importDatabank(db);
    expect(getSalesForTrait('Hat', 'Crown')).toHaveLength(1);
  });
});
