import { describe, it, expect, beforeEach } from 'vitest';
import { marketService, type NFTListing, type MarketStats } from './marketService';

// Mock localStorage for tests that might touch it
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeListing(overrides: Partial<NFTListing> = {}): NFTListing {
  return {
    nftId: '1',
    priceXch: 1.0,
    source: 'mintgarden',
    ...overrides,
  };
}

// ─── marketService.getFloorPrice ─────────────────────────────────────────────

describe('marketService.getFloorPrice', () => {
  it('returns 0 for an empty listings array', () => {
    expect(marketService.getFloorPrice([])).toBe(0);
  });

  it('returns the single price for a single listing', () => {
    const listings = [makeListing({ priceXch: 2.5 })];
    expect(marketService.getFloorPrice(listings)).toBe(2.5);
  });

  it('returns the lowest price from multiple listings', () => {
    const listings = [
      makeListing({ priceXch: 5.0 }),
      makeListing({ priceXch: 1.5 }),
      makeListing({ priceXch: 3.0 }),
    ];
    expect(marketService.getFloorPrice(listings)).toBe(1.5);
  });

  it('handles listings with equal prices', () => {
    const listings = [
      makeListing({ priceXch: 2.0 }),
      makeListing({ priceXch: 2.0 }),
    ];
    expect(marketService.getFloorPrice(listings)).toBe(2.0);
  });

  it('handles fractional prices correctly', () => {
    const listings = [
      makeListing({ priceXch: 0.75 }),
      makeListing({ priceXch: 0.5 }),
      makeListing({ priceXch: 1.25 }),
    ];
    expect(marketService.getFloorPrice(listings)).toBe(0.5);
  });

  it('handles a large number of listings', () => {
    const listings = Array.from({ length: 100 }, (_, i) =>
      makeListing({ priceXch: i + 1 })
    );
    expect(marketService.getFloorPrice(listings)).toBe(1);
  });
});

// ─── marketService.getMarketStats ────────────────────────────────────────────

describe('marketService.getMarketStats', () => {
  it('returns zero values for empty listings', () => {
    const stats: MarketStats = marketService.getMarketStats([]);
    expect(stats.floorPrice).toBe(0);
    expect(stats.totalListings).toBe(0);
    expect(stats.avgPrice).toBe(0);
    expect(stats.volume24h).toBe(0);
  });

  it('returns correct totalListings count', () => {
    const listings = [makeListing(), makeListing({ nftId: '2' }), makeListing({ nftId: '3' })];
    const stats = marketService.getMarketStats(listings);
    expect(stats.totalListings).toBe(3);
  });

  it('calculates floor price correctly', () => {
    const listings = [
      makeListing({ priceXch: 3.0 }),
      makeListing({ priceXch: 1.0 }),
      makeListing({ priceXch: 5.0 }),
    ];
    const stats = marketService.getMarketStats(listings);
    expect(stats.floorPrice).toBe(1.0);
  });

  it('calculates average price correctly', () => {
    const listings = [
      makeListing({ priceXch: 1.0 }),
      makeListing({ priceXch: 2.0 }),
      makeListing({ priceXch: 3.0 }),
    ];
    const stats = marketService.getMarketStats(listings);
    expect(stats.avgPrice).toBeCloseTo(2.0, 5);
  });

  it('returns lastUpdated as a Date instance', () => {
    const stats = marketService.getMarketStats([]);
    expect(stats.lastUpdated).toBeInstanceOf(Date);
  });

  it('volume24h is 0 (not yet implemented in service)', () => {
    const listings = [makeListing({ priceXch: 10 })];
    const stats = marketService.getMarketStats(listings);
    expect(stats.volume24h).toBe(0);
  });

  it('handles a single listing correctly', () => {
    const listings = [makeListing({ priceXch: 4.5 })];
    const stats = marketService.getMarketStats(listings);
    expect(stats.floorPrice).toBe(4.5);
    expect(stats.avgPrice).toBe(4.5);
    expect(stats.totalListings).toBe(1);
  });

  it('average is skewed by high-price outlier', () => {
    const listings = [
      makeListing({ priceXch: 1.0 }),
      makeListing({ priceXch: 1.0 }),
      makeListing({ priceXch: 100.0 }),
    ];
    const stats = marketService.getMarketStats(listings);
    // avg = (1 + 1 + 100) / 3 ≈ 34
    expect(stats.avgPrice).toBeCloseTo(34.0, 1);
    expect(stats.floorPrice).toBe(1.0);
  });
});

// ─── marketService.getNftImageUrl ─────────────────────────────────────────────

describe('marketService.getNftImageUrl', () => {
  it('returns a string for any nftId', () => {
    const url = marketService.getNftImageUrl('1');
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });

  it('returns a same-origin resolver URL for indexed editions', () => {
    const url = marketService.getNftImageUrl('42');
    expect(url).toBe('/api/farmers-plot/image/42');
  });

  it('returns different URLs for different nftIds', () => {
    const url1 = marketService.getNftImageUrl('1');
    const url2 = marketService.getNftImageUrl('2');
    expect(url1).not.toBe(url2);
  });

  it('handles nftId "1" correctly', () => {
    const url = marketService.getNftImageUrl('1');
    expect(url).toBeTruthy();
  });

  it('returns a URL for a large nftId like "4200"', () => {
    const url = marketService.getNftImageUrl('4200');
    expect(url).toBeTruthy();
    expect(url).toBe('/api/farmers-plot/image/4200');
  });
});

// ─── marketService.hasCachedListings ─────────────────────────────────────────

describe('marketService.hasCachedListings', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('returns a boolean', () => {
    const result = marketService.hasCachedListings();
    expect(typeof result).toBe('boolean');
  });
});

// ─── marketService.getCachedListings ─────────────────────────────────────────

describe('marketService.getCachedListings', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('returns null or an array', () => {
    const result = marketService.getCachedListings();
    expect(result === null || Array.isArray(result)).toBe(true);
  });
});
