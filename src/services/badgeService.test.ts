import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getQualificationDisplayName,
  getCachedBadgeSystem,
  getCachedBadgeMapping,
  getCachedNFTBadges,
  type NFTBadgeInfo,
  type BadgeSystem,
  type BadgeMapping,
} from './badgeService';

// Reset module-level caches between tests
beforeEach(() => {
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// getQualificationDisplayName — pure synchronous function
// ---------------------------------------------------------------------------
describe('getQualificationDisplayName', () => {
  it('returns "Primary Only" for primary_only', () => {
    expect(getQualificationDisplayName('primary_only')).toBe('Primary Only');
  });

  it('returns "Primary + Secondary" for primary_plus_secondary', () => {
    expect(getQualificationDisplayName('primary_plus_secondary')).toBe('Primary + Secondary');
  });

  it('returns "2 Primaries" for two_primaries', () => {
    expect(getQualificationDisplayName('two_primaries')).toBe('2 Primaries');
  });

  it('returns "Both Primaries" for both_primaries_required', () => {
    expect(getQualificationDisplayName('both_primaries_required')).toBe('Both Primaries');
  });

  it('returns the raw qualification string for an unknown value (default branch)', () => {
    // Cast to satisfy TS; exercises the default branch
    const unknown = 'totally_unknown' as NFTBadgeInfo['qualification'];
    expect(getQualificationDisplayName(unknown)).toBe('totally_unknown');
  });
});

// ---------------------------------------------------------------------------
// getCachedBadgeSystem / getCachedBadgeMapping — synchronous cache readers
// ---------------------------------------------------------------------------
describe('getCachedBadgeSystem', () => {
  it('returns null when no data has been loaded yet', () => {
    // The caches are module-level; in a fresh import they are null.
    // Because vitest runs each file in isolation, this should be null.
    expect(getCachedBadgeSystem()).toBeNull();
  });
});

describe('getCachedBadgeMapping', () => {
  it('returns null when no data has been loaded yet', () => {
    expect(getCachedBadgeMapping()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getCachedNFTBadges — synchronous, depends on loaded cache
// ---------------------------------------------------------------------------
describe('getCachedNFTBadges', () => {
  it('returns null when badge mapping cache is not populated', () => {
    expect(getCachedNFTBadges(42)).toBeNull();
    expect(getCachedNFTBadges('1')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// async functions — mock fetch so we can exercise logic without real files
// ---------------------------------------------------------------------------

function makeBadgeSystem(overrides: Partial<BadgeSystem> = {}): BadgeSystem {
  return {
    version: '2.2',
    total_collection: 10,
    nfts_with_badges: 3,
    coverage_percent: 30,
    qualification_rules: {
      standard: 'primary + secondary',
      primary_only: 'primary only',
      both_primaries_required: 'both required',
    },
    badges_ranked_by_rarity: [
      { name: 'Rare Badge', count: 1, emoji: '💎' },
      { name: 'Common Badge', count: 5, emoji: '🏅' },
    ],
    badges: {
      'Rare Badge': {
        count: 1,
        emoji: '💎',
        type: 'primary_only',
        primary: { Head: ['Crown'] },
        secondary: {},
        lore: 'Very rare',
      },
      'Common Badge': {
        count: 5,
        emoji: '🏅',
        type: 'primary_plus_secondary',
        primary: { Clothes: ['Chia Farmer'] },
        secondary: {},
        lore: 'Pretty common',
      },
    },
    special_flags: {
      'HOAMI Edition': { description: 'Special edition' },
    },
    ...overrides,
  };
}

function makeBadgeMapping(overrides: Partial<BadgeMapping> = {}): BadgeMapping {
  return {
    version: '2.2',
    total_nfts_with_badges: 2,
    badge_counts: { 'Rare Badge': 1, 'Common Badge': 1 },
    nft_badges: {
      '1': {
        badges: [
          { badge: 'Rare Badge', qualification: 'primary_only', matched: ['Head:Crown'] },
        ],
        flags: ['HOAMI Edition'],
      },
      '2': {
        badges: [
          {
            badge: 'Common Badge',
            qualification: 'primary_plus_secondary',
            matched: ['Clothes:Chia Farmer'],
          },
        ],
        flags: [],
      },
      '3': {
        badges: [],
        flags: ['High Five'],
      },
    },
    ...overrides,
  };
}

describe('loadBadgeSystem (mocked fetch)', () => {
  it('parses the JSON response from fetch and returns a BadgeSystem', async () => {
    const system = makeBadgeSystem();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => system,
    } as unknown as Response);

    // Re-import to get a fresh module with empty cache (vitest isolates modules per test file
    // but not per test — we call directly and check the fetch was called)
    const { loadBadgeSystem: load } = await import('./badgeService');
    const result = await load();
    expect(result.version).toBe('2.2');
    expect(result.badges['Rare Badge'].emoji).toBe('💎');
  });

  it('throws when the fetch response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
    } as unknown as Response);

    // Clear cache by re-importing is not straightforward; test the throw path by
    // mocking the non-ok response and testing loadBadgeMapping instead (different URL)
    const { loadBadgeMapping: load } = await import('./badgeService');
    await expect(load()).rejects.toThrow('Failed to load badge mapping');
  });
});

describe('getNFTBadges (mocked fetch)', () => {
  it('returns the entry for a known NFT ID (numeric)', async () => {
    const mapping = makeBadgeMapping();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mapping,
    } as unknown as Response);

    const { getNFTBadges: get } = await import('./badgeService');
    const entry = await get(1);
    expect(entry).not.toBeNull();
    expect(entry!.badges[0].badge).toBe('Rare Badge');
    expect(entry!.flags).toContain('HOAMI Edition');
  });

  it('returns null for an NFT ID not present in the mapping', async () => {
    const mapping = makeBadgeMapping();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mapping,
    } as unknown as Response);

    const { getNFTBadges: get } = await import('./badgeService');
    const entry = await get(999);
    expect(entry).toBeNull();
  });

  it('accepts a string ID and resolves correctly', async () => {
    const mapping = makeBadgeMapping();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mapping,
    } as unknown as Response);

    const { getNFTBadges: get } = await import('./badgeService');
    const entry = await get('2');
    expect(entry!.badges[0].badge).toBe('Common Badge');
  });
});

describe('getNFTsWithBadge (mocked fetch)', () => {
  it('returns only IDs whose badges include the named badge', async () => {
    const mapping = makeBadgeMapping();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mapping,
    } as unknown as Response);

    const { getNFTsWithBadge: get } = await import('./badgeService');
    const ids = await get('Rare Badge');
    expect(ids).toEqual(['1']);
  });

  it('returns an empty array when no NFTs have the badge', async () => {
    const mapping = makeBadgeMapping();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mapping,
    } as unknown as Response);

    const { getNFTsWithBadge: get } = await import('./badgeService');
    const ids = await get('Non-Existent Badge');
    expect(ids).toHaveLength(0);
  });
});

describe('getNFTsWithFlag (mocked fetch)', () => {
  it('returns IDs whose flags array contains the specified flag', async () => {
    const mapping = makeBadgeMapping();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mapping,
    } as unknown as Response);

    const { getNFTsWithFlag: get } = await import('./badgeService');
    const ids = await get('HOAMI Edition');
    expect(ids).toEqual(['1']);
  });

  it('returns an empty array when no NFTs have the flag', async () => {
    const mapping = makeBadgeMapping();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mapping,
    } as unknown as Response);

    const { getNFTsWithFlag: get } = await import('./badgeService');
    const ids = await get('Unknown Flag');
    expect(ids).toHaveLength(0);
  });
});

describe('hasBadges (mocked fetch)', () => {
  it('returns true for an NFT that has at least one badge', async () => {
    const mapping = makeBadgeMapping();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mapping,
    } as unknown as Response);

    const { hasBadges: has } = await import('./badgeService');
    expect(await has('1')).toBe(true);
  });

  it('returns false for an NFT with an empty badges array', async () => {
    const mapping = makeBadgeMapping();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mapping,
    } as unknown as Response);

    const { hasBadges: has } = await import('./badgeService');
    expect(await has('3')).toBe(false);
  });

  it('returns false for an NFT not in the mapping at all', async () => {
    const mapping = makeBadgeMapping();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mapping,
    } as unknown as Response);

    const { hasBadges: has } = await import('./badgeService');
    expect(await has(999)).toBe(false);
  });
});
