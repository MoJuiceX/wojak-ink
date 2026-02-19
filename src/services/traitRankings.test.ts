import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadTraitRankings,
  getTraitRank,
  getTooltipData,
  isDataLoaded,
  formatRankDisplay,
  type TraitRankingsData,
} from './traitRankings';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockData: TraitRankingsData = {
  lookup: {
    background: {
      'Cosmic Purple': { rank: 1, of: 10, count: 50 },
      'Forest Green': { rank: 2, of: 10, count: 40 },
      'Ocean Blue': { rank: 3, of: 10, count: 30 },
      'Lava Red': { rank: 4, of: 10, count: 20 },
      'Desert Sand': { rank: 5, of: 10, count: 15 },
      'Arctic White': { rank: 6, of: 10, count: 12 },
      'Storm Grey': { rank: 7, of: 10, count: 10 },
      'Jungle Mist': { rank: 8, of: 10, count: 8 },
      'Sunset Pink': { rank: 9, of: 10, count: 5 },
      'Void Black': { rank: 10, of: 10, count: 2 },
    },
    hat: {
      'None': { rank: 1, of: 3, count: 200 },
      'Cap': { rank: 2, of: 3, count: 50 },
      'Crown': { rank: 3, of: 3, count: 10 },
    },
  },
  leaderboards: {
    background: [
      { rank: 1, trait: 'Cosmic Purple', count: 50 },
      { rank: 2, trait: 'Forest Green', count: 40 },
      { rank: 3, trait: 'Ocean Blue', count: 30 },
      { rank: 4, trait: 'Lava Red', count: 20 },
      { rank: 5, trait: 'Desert Sand', count: 15 },
      { rank: 6, trait: 'Arctic White', count: 12 },
      { rank: 7, trait: 'Storm Grey', count: 10 },
      { rank: 8, trait: 'Jungle Mist', count: 8 },
      { rank: 9, trait: 'Sunset Pink', count: 5 },
      { rank: 10, trait: 'Void Black', count: 2 },
    ],
    hat: [
      { rank: 1, trait: 'None', count: 200 },
      { rank: 2, trait: 'Cap', count: 50 },
      { rank: 3, trait: 'Crown', count: 10 },
    ],
  },
};

function makeOkFetch() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => mockData,
  } as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// formatRankDisplay — pure function, no mocking needed
// ---------------------------------------------------------------------------

describe('traitRankings', () => {
  describe('formatRankDisplay', () => {
    it('formats rank 1 of 10 correctly', () => {
      expect(formatRankDisplay(1, 10)).toBe('#1 of 10');
    });

    it('formats rank in the middle correctly', () => {
      expect(formatRankDisplay(5, 100)).toBe('#5 of 100');
    });

    it('formats rank equal to total correctly', () => {
      expect(formatRankDisplay(36, 36)).toBe('#36 of 36');
    });

    it('formats rank 1 of 1 (single-trait category)', () => {
      expect(formatRankDisplay(1, 1)).toBe('#1 of 1');
    });

    it('includes the hash prefix', () => {
      expect(formatRankDisplay(3, 7).startsWith('#')).toBe(true);
    });

    it('separates rank and total with " of "', () => {
      expect(formatRankDisplay(2, 5)).toContain(' of ');
    });
  });

  // -------------------------------------------------------------------------
  // loadTraitRankings — mocks fetch; also tests error path via dynamic import
  // -------------------------------------------------------------------------

  describe('loadTraitRankings', () => {
    it('fetches from the expected URL', async () => {
      const fetchMock = makeOkFetch();
      await loadTraitRankings();
      expect(fetchMock).toHaveBeenCalledWith('/assets/nft-data/trait_rankings.json');
    });

    it('returns an object with lookup and leaderboards keys', async () => {
      makeOkFetch();
      const data = await loadTraitRankings();
      expect(data).toHaveProperty('lookup');
      expect(data).toHaveProperty('leaderboards');
    });

    /**
     * The error-path test must use a fresh module instance so the internal
     * module-level cache (`rankingsData`) is null. We achieve this by calling
     * vi.resetModules() and then dynamically importing the module.
     */
    it('throws when the HTTP response is not ok (fresh module)', async () => {
      vi.resetModules();
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        json: async () => ({}),
      } as Response);

      // Dynamic import gives us a fresh, uncached module instance.
      const { loadTraitRankings: freshLoad } = await import('./traitRankings?fresh=' + Date.now());
      await expect(freshLoad()).rejects.toThrow('Failed to load trait rankings');
    });
  });

  // -------------------------------------------------------------------------
  // getTraitRank — requires warm cache (data loaded first)
  // -------------------------------------------------------------------------

  describe('getTraitRank', () => {
    beforeEach(async () => {
      makeOkFetch();
      await loadTraitRankings();
    });

    it('returns correct rank info for a known category and trait', () => {
      const info = getTraitRank('background', 'Cosmic Purple');
      expect(info).not.toBeNull();
      expect(info?.rank).toBe(1);
      expect(info?.count).toBe(50);
    });

    it('returns rank info for a mid-tier trait', () => {
      const info = getTraitRank('background', 'Desert Sand');
      expect(info?.rank).toBe(5);
      expect(info?.of).toBe(10);
    });

    it('returns null for an unknown trait value', () => {
      expect(getTraitRank('background', 'Neon Yellow')).toBeNull();
    });

    it('returns null for an unknown category', () => {
      expect(getTraitRank('eyes', 'Big Eyes')).toBeNull();
    });

    it('returns rank info for hat category', () => {
      const info = getTraitRank('hat', 'Crown');
      expect(info?.rank).toBe(3);
      expect(info?.count).toBe(10);
    });
  });

  // -------------------------------------------------------------------------
  // isDataLoaded
  // -------------------------------------------------------------------------

  describe('isDataLoaded', () => {
    it('returns true once data has been loaded', async () => {
      makeOkFetch();
      await loadTraitRankings();
      expect(isDataLoaded()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // getTooltipData
  // -------------------------------------------------------------------------

  describe('getTooltipData', () => {
    beforeEach(async () => {
      makeOkFetch();
      await loadTraitRankings();
    });

    it('returns null for an unknown category', () => {
      expect(getTooltipData('eyes', 'Red Eyes')).toBeNull();
    });

    it('returns null for an unknown trait in a valid category', () => {
      expect(getTooltipData('background', 'Neon Yellow')).toBeNull();
    });

    it('returns full leaderboard for small categories (6 or fewer traits)', () => {
      // "hat" has 3 traits — below the 6-entry threshold
      const result = getTooltipData('hat', 'Cap');
      expect(result).not.toBeNull();
      expect(result?.contextWindow.length).toBe(3);
      expect(result?.rarest).toBeNull();
      expect(result?.mostCommon).toBeNull();
    });

    it('sets rarest bookend only when currentRank > 3 (large category)', () => {
      // rank 5 in a 10-entry leaderboard — rarest should be shown
      const result = getTooltipData('background', 'Desert Sand');
      expect(result?.currentRank).toBe(5);
      expect(result?.rarest).not.toBeNull();
      expect(result?.rarest?.trait).toBe('Cosmic Purple');
    });

    it('does not set rarest bookend for rank 1 trait', () => {
      const result = getTooltipData('background', 'Cosmic Purple');
      expect(result?.currentRank).toBe(1);
      expect(result?.rarest).toBeNull();
    });

    it('sets mostCommon bookend when currentRank < total - 2', () => {
      // rank 1 in a 10-entry list — mostCommon should appear
      const result = getTooltipData('background', 'Cosmic Purple');
      expect(result?.mostCommon).not.toBeNull();
      expect(result?.mostCommon?.trait).toBe('Void Black');
    });

    it('does not set mostCommon bookend for the last-ranked trait', () => {
      // rank 10 in a 10-entry list — 10 is NOT < 10 - 2 (8)
      const result = getTooltipData('background', 'Void Black');
      expect(result?.mostCommon).toBeNull();
    });

    it('includes the correct category and currentTrait in the result', () => {
      const result = getTooltipData('background', 'Ocean Blue');
      expect(result?.category).toBe('background');
      expect(result?.currentTrait).toBe('Ocean Blue');
    });

    it('context window contains the current trait entry', () => {
      const result = getTooltipData('background', 'Desert Sand');
      const names = result?.contextWindow.map((e) => e.trait) ?? [];
      expect(names).toContain('Desert Sand');
    });

    it('total reflects the full leaderboard length', () => {
      const result = getTooltipData('background', 'Ocean Blue');
      expect(result?.total).toBe(10);
    });
  });
});
