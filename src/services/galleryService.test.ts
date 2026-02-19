/**
 * Unit tests for galleryService.
 *
 * The public methods all depend on fetch(), so we mock globalThis.fetch
 * to return controlled metadata + rarity payloads. This lets us exercise
 * the filtering, sorting, ID-normalisation, and search logic without a
 * real network or DOM.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal raw metadata entry matching the internal RawMetadata shape. */
function makeMetadataEntry(
  edition: number,
  base: string = 'Wojak',
  overrides: Record<string, unknown> = {}
) {
  return {
    name: `Wojak Farmers Plot #${String(edition).padStart(4, '0')}`,
    description: 'A wojak',
    image: `ipfs://QmFake/${edition}.png`,
    edition,
    date: 1700000000000,
    attributes: [
      { trait_type: 'Base', value: base },
      { trait_type: 'Clothes', value: 'Tee' },
      { trait_type: 'Background', value: 'Blue' },
    ],
    ...overrides,
  };
}

/** Rarity entry format: [rank, score, tier_letter, ...trait_values] */
function makeRarityEntry(rank: number, score: number, tier: string) {
  return [rank, score, tier, 'Wojak', 'None', 'None', 'None', 'None', 'Tee', 'Blue'] as const;
}

// ── Fresh service instance factory ───────────────────────────────────────────
// We need a fresh instance per test because the module caches data in
// module-level Maps/variables. Re-importing dynamically gives us isolation.

async function freshService() {
  // Reset module registry so caches are cleared between tests
  vi.resetModules();
  const mod = await import('./galleryService');
  return mod.galleryService;
}

// ── Fetch mock builder ────────────────────────────────────────────────────────

function mockFetch(
  metadata: unknown[],
  rarity: Record<string, unknown>
) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((url: RequestInfo | URL) => {
    const urlStr = String(url);
    const body = urlStr.includes('rarity') ? rarity : metadata;
    return Promise.resolve(
      new Response(JSON.stringify(body), { status: 200 })
    );
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('galleryService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── fetchAllNFTs ────────────────────────────────────────────────────────────

  describe('fetchAllNFTs', () => {
    it('returns one NFT per metadata entry', async () => {
      mockFetch(
        [makeMetadataEntry(1), makeMetadataEntry(2)],
        {
          '1': makeRarityEntry(1, 99.5, 'l'),
          '2': makeRarityEntry(2, 50.0, 'r'),
        }
      );
      const svc = await freshService();
      const nfts = await svc.fetchAllNFTs();
      expect(nfts).toHaveLength(2);
    });

    it('maps edition number to padded token ID with WFP- prefix', async () => {
      mockFetch(
        [makeMetadataEntry(7)],
        { '7': makeRarityEntry(10, 80.0, 'e') }
      );
      const svc = await freshService();
      const [nft] = await svc.fetchAllNFTs();
      expect(nft.id).toBe('WFP-0007');
      expect(nft.tokenId).toBe('0007');
    });

    it('resolves rarityTier to "legendary" for tier letter "l"', async () => {
      mockFetch(
        [makeMetadataEntry(1)],
        { '1': makeRarityEntry(1, 99.0, 'l') }
      );
      const svc = await freshService();
      const [nft] = await svc.fetchAllNFTs();
      expect(nft.rarityTier).toBe('legendary');
    });

    it('resolves rarityTier to "epic" for tier letter "e"', async () => {
      mockFetch(
        [makeMetadataEntry(1)],
        { '1': makeRarityEntry(5, 90.0, 'e') }
      );
      const svc = await freshService();
      const [nft] = await svc.fetchAllNFTs();
      expect(nft.rarityTier).toBe('epic');
    });

    it('resolves rarityTier to "rare" for tier letter "r"', async () => {
      mockFetch(
        [makeMetadataEntry(1)],
        { '1': makeRarityEntry(50, 70.0, 'r') }
      );
      const svc = await freshService();
      const [nft] = await svc.fetchAllNFTs();
      expect(nft.rarityTier).toBe('rare');
    });

    it('resolves rarityTier to "uncommon" for tier letter "u"', async () => {
      mockFetch(
        [makeMetadataEntry(1)],
        { '1': makeRarityEntry(200, 55.0, 'u') }
      );
      const svc = await freshService();
      const [nft] = await svc.fetchAllNFTs();
      expect(nft.rarityTier).toBe('uncommon');
    });

    it('resolves rarityTier to "common" for tier letter "c"', async () => {
      mockFetch(
        [makeMetadataEntry(1)],
        { '1': makeRarityEntry(800, 30.0, 'c') }
      );
      const svc = await freshService();
      const [nft] = await svc.fetchAllNFTs();
      expect(nft.rarityTier).toBe('common');
    });

    it('falls back to "common" when no rarity entry exists for an NFT', async () => {
      mockFetch([makeMetadataEntry(42)], {});
      const svc = await freshService();
      const [nft] = await svc.fetchAllNFTs();
      expect(nft.rarityTier).toBe('common');
    });

    it('marks isSpecialEdition true when rarityRank <= 100', async () => {
      mockFetch(
        [makeMetadataEntry(1)],
        { '1': makeRarityEntry(50, 95.0, 'l') }
      );
      const svc = await freshService();
      const [nft] = await svc.fetchAllNFTs();
      expect(nft.isSpecialEdition).toBe(true);
    });

    it('marks isSpecialEdition false when rarityRank > 100', async () => {
      mockFetch(
        [makeMetadataEntry(1)],
        { '1': makeRarityEntry(101, 60.0, 'r') }
      );
      const svc = await freshService();
      const [nft] = await svc.fetchAllNFTs();
      expect(nft.isSpecialEdition).toBe(false);
    });

    it('maps Base value "Soyjak" to characterType "soyjak"', async () => {
      mockFetch(
        [makeMetadataEntry(1, 'Soyjak')],
        { '1': makeRarityEntry(100, 65.0, 'r') }
      );
      const svc = await freshService();
      const [nft] = await svc.fetchAllNFTs();
      expect(nft.characterType).toBe('soyjak');
    });

    it('maps Base value "Waifu" to characterType "waifu"', async () => {
      mockFetch(
        [makeMetadataEntry(1, 'Waifu')],
        { '1': makeRarityEntry(200, 55.0, 'u') }
      );
      const svc = await freshService();
      const [nft] = await svc.fetchAllNFTs();
      expect(nft.characterType).toBe('waifu');
    });

    it('maps unknown Base value to characterType "wojak"', async () => {
      mockFetch(
        [makeMetadataEntry(1, 'UnknownBase')],
        { '1': makeRarityEntry(300, 40.0, 'c') }
      );
      const svc = await freshService();
      const [nft] = await svc.fetchAllNFTs();
      expect(nft.characterType).toBe('wojak');
    });
  });

  // ── fetchNFTsByCharacter ────────────────────────────────────────────────────

  describe('fetchNFTsByCharacter', () => {
    it('returns only NFTs matching the requested characterType', async () => {
      mockFetch(
        [makeMetadataEntry(1, 'Wojak'), makeMetadataEntry(2, 'Soyjak'), makeMetadataEntry(3, 'Wojak')],
        {
          '1': makeRarityEntry(10, 85.0, 'e'),
          '2': makeRarityEntry(5, 90.0, 'e'),
          '3': makeRarityEntry(20, 75.0, 'r'),
        }
      );
      const svc = await freshService();
      const nfts = await svc.fetchNFTsByCharacter('soyjak');
      expect(nfts).toHaveLength(1);
      expect(nfts[0].characterType).toBe('soyjak');
    });

    it('returns NFTs sorted by rarityRank ascending', async () => {
      mockFetch(
        [makeMetadataEntry(1, 'Wojak'), makeMetadataEntry(2, 'Wojak'), makeMetadataEntry(3, 'Wojak')],
        {
          '1': makeRarityEntry(30, 70.0, 'r'),
          '2': makeRarityEntry(5, 92.0, 'e'),
          '3': makeRarityEntry(15, 80.0, 'e'),
        }
      );
      const svc = await freshService();
      const nfts = await svc.fetchNFTsByCharacter('wojak');
      expect(nfts.map(n => n.rarityRank)).toEqual([5, 15, 30]);
    });

    it('returns empty array when no NFTs match the characterType', async () => {
      mockFetch(
        [makeMetadataEntry(1, 'Wojak')],
        { '1': makeRarityEntry(1, 99.0, 'l') }
      );
      const svc = await freshService();
      const nfts = await svc.fetchNFTsByCharacter('waifu');
      expect(nfts).toHaveLength(0);
    });
  });

  // ── fetchNFTById ────────────────────────────────────────────────────────────

  describe('fetchNFTById', () => {
    it('returns an NFT when looked up by plain numeric string', async () => {
      mockFetch(
        [makeMetadataEntry(42)],
        { '42': makeRarityEntry(100, 65.0, 'r') }
      );
      const svc = await freshService();
      const nft = await svc.fetchNFTById('42');
      expect(nft).not.toBeNull();
      expect(nft!.id).toBe('WFP-0042');
    });

    it('returns an NFT when looked up with WFP- prefix', async () => {
      mockFetch(
        [makeMetadataEntry(42)],
        { '42': makeRarityEntry(100, 65.0, 'r') }
      );
      const svc = await freshService();
      const nft = await svc.fetchNFTById('WFP-0042');
      expect(nft).not.toBeNull();
      expect(nft!.id).toBe('WFP-0042');
    });

    it('returns null for an edition that does not exist', async () => {
      mockFetch(
        [makeMetadataEntry(1)],
        { '1': makeRarityEntry(1, 99.0, 'l') }
      );
      const svc = await freshService();
      const nft = await svc.fetchNFTById('9999');
      expect(nft).toBeNull();
    });
  });

  // ── searchNFTs ──────────────────────────────────────────────────────────────

  describe('searchNFTs', () => {
    it('returns empty array for an empty query string', async () => {
      mockFetch([makeMetadataEntry(1)], { '1': makeRarityEntry(1, 99.0, 'l') });
      const svc = await freshService();
      const results = await svc.searchNFTs('');
      expect(results).toHaveLength(0);
    });

    it('returns empty array for whitespace-only query', async () => {
      mockFetch([makeMetadataEntry(1)], { '1': makeRarityEntry(1, 99.0, 'l') });
      const svc = await freshService();
      const results = await svc.searchNFTs('   ');
      expect(results).toHaveLength(0);
    });

    it('finds an NFT by edition number with # prefix', async () => {
      mockFetch(
        [makeMetadataEntry(7)],
        { '7': makeRarityEntry(10, 80.0, 'e') }
      );
      const svc = await freshService();
      const results = await svc.searchNFTs('#7');
      expect(results).toHaveLength(1);
      expect(results[0].tokenId).toBe('0007');
    });

    it('finds an NFT by bare edition number', async () => {
      mockFetch(
        [makeMetadataEntry(7)],
        { '7': makeRarityEntry(10, 80.0, 'e') }
      );
      const svc = await freshService();
      const results = await svc.searchNFTs('7');
      expect(results).toHaveLength(1);
    });

    it('finds NFTs by name substring (case-insensitive)', async () => {
      mockFetch(
        [makeMetadataEntry(1), makeMetadataEntry(2)],
        {
          '1': makeRarityEntry(10, 85.0, 'e'),
          '2': makeRarityEntry(20, 70.0, 'r'),
        }
      );
      const svc = await freshService();
      const results = await svc.searchNFTs('wojak farmers');
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty array when query matches nothing', async () => {
      mockFetch(
        [makeMetadataEntry(1)],
        { '1': makeRarityEntry(1, 99.0, 'l') }
      );
      const svc = await freshService();
      const results = await svc.searchNFTs('xyzzy-no-match');
      expect(results).toHaveLength(0);
    });

    it('caps search results at 50 items', async () => {
      // Create 60 entries that all match "wojak farmers"
      const entries = Array.from({ length: 60 }, (_, i) => makeMetadataEntry(i + 1));
      const rarityMap: Record<string, unknown> = {};
      entries.forEach((_e, i) => {
        rarityMap[String(i + 1)] = makeRarityEntry(i + 1, 50.0, 'c');
      });
      mockFetch(entries, rarityMap);
      const svc = await freshService();
      const results = await svc.searchNFTs('wojak');
      expect(results.length).toBeLessThanOrEqual(50);
    });
  });

  // ── getFirstNImageUrlsPerCharacter ──────────────────────────────────────────

  describe('getFirstNImageUrlsPerCharacter', () => {
    it('returns a Map keyed by characterType', async () => {
      mockFetch(
        [makeMetadataEntry(1, 'Wojak'), makeMetadataEntry(2, 'Soyjak')],
        {
          '1': makeRarityEntry(1, 90.0, 'e'),
          '2': makeRarityEntry(2, 85.0, 'e'),
        }
      );
      const svc = await freshService();
      const result = await svc.getFirstNImageUrlsPerCharacter(5);
      expect(result.has('wojak')).toBe(true);
      expect(result.has('soyjak')).toBe(true);
    });

    it('respects the count cap — returns at most N URLs per character', async () => {
      const entries = [
        makeMetadataEntry(1, 'Wojak'),
        makeMetadataEntry(2, 'Wojak'),
        makeMetadataEntry(3, 'Wojak'),
        makeMetadataEntry(4, 'Wojak'),
        makeMetadataEntry(5, 'Wojak'),
      ];
      const rarityMap: Record<string, unknown> = {};
      entries.forEach((_e, i) => {
        rarityMap[String(i + 1)] = makeRarityEntry(i + 1, 80.0 - i, 'r');
      });
      mockFetch(entries, rarityMap);
      const svc = await freshService();
      const result = await svc.getFirstNImageUrlsPerCharacter(3);
      expect(result.get('wojak')!.length).toBe(3);
    });

    it('returns all URLs when N is larger than available NFTs', async () => {
      mockFetch(
        [makeMetadataEntry(1, 'Waifu'), makeMetadataEntry(2, 'Waifu')],
        {
          '1': makeRarityEntry(1, 90.0, 'e'),
          '2': makeRarityEntry(2, 80.0, 'r'),
        }
      );
      const svc = await freshService();
      const result = await svc.getFirstNImageUrlsPerCharacter(10);
      expect(result.get('waifu')!.length).toBe(2);
    });
  });

  // ── prefetchData ────────────────────────────────────────────────────────────

  describe('prefetchData', () => {
    it('resolves without error when fetch succeeds', async () => {
      mockFetch(
        [makeMetadataEntry(1)],
        { '1': makeRarityEntry(1, 99.0, 'l') }
      );
      const svc = await freshService();
      await expect(svc.prefetchData()).resolves.toBeUndefined();
    });

    it('calling prefetchData twice does not trigger duplicate fetch calls', async () => {
      mockFetch(
        [makeMetadataEntry(1)],
        { '1': makeRarityEntry(1, 99.0, 'l') }
      );
      const svc = await freshService();
      await svc.prefetchData();
      const callCountAfterFirst = vi.mocked(globalThis.fetch).mock.calls.length;
      await svc.prefetchData();
      // Second call should not issue any more fetch requests
      expect(vi.mocked(globalThis.fetch).mock.calls.length).toBe(callCountAfterFirst);
    });
  });
});
