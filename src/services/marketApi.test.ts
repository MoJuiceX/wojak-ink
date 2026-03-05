import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  COLLECTION_ID,
  hasCachedListings,
  getCachedListings,
  filterListingsByRarity,
  filterListingsByPriceMultiple,
  calculateFloorPrice,
  getNftImageUrl,
  type NFTListing,
} from './marketApi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeListing(nftId: string, priceXch: number, source: NFTListing['source'] = 'mintgarden'): NFTListing {
  return { nftId, priceXch, source };
}

// ---------------------------------------------------------------------------
// COLLECTION_ID constant
// ---------------------------------------------------------------------------

describe('marketApi', () => {
  describe('COLLECTION_ID', () => {
    it('is a non-empty string', () => {
      expect(typeof COLLECTION_ID).toBe('string');
      expect(COLLECTION_ID.length).toBeGreaterThan(0);
    });

    it('starts with "col"', () => {
      expect(COLLECTION_ID.startsWith('col')).toBe(true);
    });

    it('contains only alphanumeric characters', () => {
      expect(/^[a-z0-9]+$/.test(COLLECTION_ID)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateFloorPrice
  // ---------------------------------------------------------------------------

  describe('calculateFloorPrice', () => {
    it('returns 0 for an empty listings array', () => {
      expect(calculateFloorPrice([])).toBe(0);
    });

    it('returns the single listing price for a one-element array', () => {
      expect(calculateFloorPrice([makeListing('1', 5.5)])).toBe(5.5);
    });

    it('returns the minimum price from multiple listings', () => {
      const listings = [
        makeListing('1', 10),
        makeListing('2', 3),
        makeListing('3', 7),
      ];
      expect(calculateFloorPrice(listings)).toBe(3);
    });

    it('handles all identical prices', () => {
      const listings = [makeListing('1', 2), makeListing('2', 2), makeListing('3', 2)];
      expect(calculateFloorPrice(listings)).toBe(2);
    });

    it('handles fractional XCH prices correctly', () => {
      const listings = [makeListing('1', 0.001), makeListing('2', 0.0005), makeListing('3', 0.01)];
      expect(calculateFloorPrice(listings)).toBe(0.0005);
    });

    it('returns the first element price when it is also the minimum', () => {
      const listings = [makeListing('1', 1), makeListing('2', 5), makeListing('3', 10)];
      expect(calculateFloorPrice(listings)).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getNftImageUrl
  // ---------------------------------------------------------------------------

  describe('getNftImageUrl', () => {
    it('returns a string URL', () => {
      expect(typeof getNftImageUrl('1')).toBe('string');
    });

    it('returns a same-origin resolver URL for a valid edition', () => {
      const url = getNftImageUrl('1');
      expect(url).toBe('/api/farmers-plot/image/1');
    });

    it('uses the same-origin resolver instead of the legacy IPFS gateway for indexed editions', () => {
      const url = getNftImageUrl('42');
      expect(url).toBe('/api/farmers-plot/image/42');
    });

    it('routes missing upstream editions through the same resolver', () => {
      const url = getNftImageUrl('2370');
      expect(url).toBe('/api/farmers-plot/image/2370');
    });

    it('supports three-digit NFT IDs through the resolver', () => {
      const url = getNftImageUrl('123');
      expect(url).toBe('/api/farmers-plot/image/123');
    });

    it('supports four-digit NFT IDs through the resolver', () => {
      const url = getNftImageUrl('4200');
      expect(url).toBe('/api/farmers-plot/image/4200');
    });

    it('falls back to IPFS for out-of-range IDs', () => {
      expect(getNftImageUrl('9999')).toContain('/ipfs/');
    });

    it('returns the resolver path for in-range editions', () => {
      expect(getNftImageUrl('100')).toBe('/api/farmers-plot/image/100');
    });

    it('returns a valid same-origin resolver path', () => {
      expect(getNftImageUrl('1')).toMatch(/^\/api\/farmers-plot\/image\/1$/);
    });
  });

  // ---------------------------------------------------------------------------
  // filterListingsByRarity
  // ---------------------------------------------------------------------------

  describe('filterListingsByRarity', () => {
    const listings: NFTListing[] = [
      makeListing('1', 5),
      makeListing('420', 10),
      makeListing('2100', 8),
      makeListing('4200', 3),
    ];

    // Rank data: lower rank number = rarer
    // percentile = (rank / 4200) * 100
    const rankData: Record<string, number> = {
      '1': 42,       // percentile = 1%
      '420': 420,    // percentile = 10%
      '2100': 2100,  // percentile = 50%
      '4200': 4200,  // percentile = 100%
    };

    it('returns an empty array when no listings match the range', () => {
      const result = filterListingsByRarity(listings, rankData, 80, 90);
      expect(result).toHaveLength(0);
    });

    it('includes listings within the percentile range', () => {
      // NFT #1 is at ~1%, NFT #420 at ~10% — both within 0-15%
      const result = filterListingsByRarity(listings, rankData, 0, 15);
      const ids = result.map((l) => l.nftId);
      expect(ids).toContain('1');
      expect(ids).toContain('420');
      expect(ids).not.toContain('2100');
    });

    it('excludes listings without rank data', () => {
      const extraListing = makeListing('9999', 7);
      const result = filterListingsByRarity([...listings, extraListing], rankData, 0, 100);
      expect(result.map((l) => l.nftId)).not.toContain('9999');
    });

    it('includes the full range when min=0 and max=100', () => {
      const result = filterListingsByRarity(listings, rankData, 0, 100);
      expect(result).toHaveLength(4);
    });

    it('returns an empty array for empty listings', () => {
      expect(filterListingsByRarity([], rankData, 0, 100)).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // filterListingsByPriceMultiple
  // ---------------------------------------------------------------------------

  describe('filterListingsByPriceMultiple', () => {
    const listings: NFTListing[] = [
      makeListing('1', 10),  // 1x floor
      makeListing('2', 20),  // 2x floor
      makeListing('3', 30),  // 3x floor
      makeListing('4', 50),  // 5x floor
    ];
    const floor = 10;

    it('returns exact-multiple match when min === max === 1', () => {
      const result = filterListingsByPriceMultiple(listings, floor, 1, 1);
      expect(result).toHaveLength(1);
      expect(result[0].nftId).toBe('1');
    });

    it('returns listings in the 1x-3x range', () => {
      const result = filterListingsByPriceMultiple(listings, floor, 1, 3);
      const ids = result.map((l) => l.nftId);
      expect(ids).toContain('1');
      expect(ids).toContain('2');
      expect(ids).toContain('3');
      expect(ids).not.toContain('4');
    });

    it('returns an empty array when floor is 0 (avoids division by zero edge)', () => {
      // With floor=0, multiple = Infinity — nothing will match a finite range
      const result = filterListingsByPriceMultiple(listings, 0, 1, 5);
      expect(result).toHaveLength(0);
    });

    it('returns an empty array for an empty listings array', () => {
      expect(filterListingsByPriceMultiple([], floor, 1, 5)).toHaveLength(0);
    });

    it('only returns listings with multiple >= minMultiple', () => {
      const result = filterListingsByPriceMultiple(listings, floor, 4, 10);
      expect(result.map((l) => l.nftId)).toContain('4');
      expect(result.map((l) => l.nftId)).not.toContain('3');
    });
  });

  // ---------------------------------------------------------------------------
  // hasCachedListings and getCachedListings
  // These rely on module-level in-memory state + localStorage.
  // We simply assert consistent return types.
  // ---------------------------------------------------------------------------

  describe('hasCachedListings', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns a boolean', () => {
      expect(typeof hasCachedListings()).toBe('boolean');
    });

    it('returns false when localStorage is empty and memory cache is empty', () => {
      expect(hasCachedListings()).toBe(false);
    });
  });

  describe('getCachedListings', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns null or an array', () => {
      const result = getCachedListings();
      expect(result === null || Array.isArray(result)).toBe(true);
    });

    it('returns null when localStorage is empty and memory cache is empty', () => {
      expect(getCachedListings()).toBeNull();
    });
  });
});
