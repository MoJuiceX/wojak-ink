import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isPreloaded,
  getNftsByBase,
  getAllNfts,
  isReady,
  getNftByEdition,
  getNextInSequence,
  getPrevInSequence,
  getPreloadProgress,
  getNextRandom,
  getWithDifferentTrait,
} from './galleryPreloader';

// The galleryPreloader module has internal state that persists across tests.
// We test the exported API in its uninitialized state first, then simulate
// initialization by calling the public init function via mocked fetch.

// ============ isReady (before init) ============

describe('isReady', () => {
  it('returns false before initialization', () => {
    // Module is freshly imported; init has not been called
    expect(isReady()).toBe(false);
  });
});

// ============ isPreloaded ============

describe('isPreloaded', () => {
  it('returns false for a URL that has never been preloaded', () => {
    expect(isPreloaded('https://example.com/unknown.png')).toBe(false);
  });

  it('returns false for an empty string URL', () => {
    expect(isPreloaded('')).toBe(false);
  });
});

// ============ getNftsByBase (before init) ============

describe('getNftsByBase', () => {
  it('returns an empty array for unknown base before init', () => {
    expect(getNftsByBase('Wojak')).toEqual([]);
  });

  it('returns an empty array for an empty string base', () => {
    expect(getNftsByBase('')).toEqual([]);
  });

  it('returns an empty array for a non-existent base name', () => {
    expect(getNftsByBase('NonExistentBase')).toEqual([]);
  });
});

// ============ getAllNfts (before init) ============

describe('getAllNfts', () => {
  it('returns an empty array before initialization', () => {
    expect(getAllNfts()).toEqual([]);
  });

  it('returns an array (possibly empty)', () => {
    expect(Array.isArray(getAllNfts())).toBe(true);
  });
});

// ============ getPreloadProgress ============

describe('getPreloadProgress', () => {
  it('returns an object with loaded and total properties', () => {
    const progress = getPreloadProgress();
    expect(typeof progress).toBe('object');
    expect(typeof progress.loaded).toBe('number');
    expect(typeof progress.total).toBe('number');
  });

  it('loaded starts at 0 before any preloading', () => {
    const progress = getPreloadProgress();
    expect(progress.loaded).toBe(0);
  });

  it('total is a positive number (14 bases * 10 images)', () => {
    const progress = getPreloadProgress();
    expect(progress.total).toBe(140);
  });

  it('loaded is always less than or equal to total initially', () => {
    const progress = getPreloadProgress();
    expect(progress.loaded).toBeLessThanOrEqual(progress.total);
  });
});

// ============ getNftByEdition (before init) ============

describe('getNftByEdition', () => {
  it('returns null for any edition before initialization', () => {
    expect(getNftByEdition('Wojak', 1)).toBeNull();
  });

  it('returns null for edition 0 before initialization', () => {
    expect(getNftByEdition('Wojak', 0)).toBeNull();
  });

  it('returns null for unknown base', () => {
    expect(getNftByEdition('UnknownBase', 100)).toBeNull();
  });
});

// ============ getNextInSequence (before init) ============

describe('getNextInSequence', () => {
  it('returns null for any base before initialization', () => {
    expect(getNextInSequence('Wojak', 1)).toBeNull();
  });

  it('returns null for empty base string', () => {
    expect(getNextInSequence('', 1)).toBeNull();
  });
});

// ============ getPrevInSequence (before init) ============

describe('getPrevInSequence', () => {
  it('returns null for any base before initialization', () => {
    expect(getPrevInSequence('Wojak', 1)).toBeNull();
  });

  it('returns null for empty base string', () => {
    expect(getPrevInSequence('', 1)).toBeNull();
  });
});

// ============ getNextRandom (before init) ============

describe('getNextRandom', () => {
  it('returns null for any base before initialization', () => {
    expect(getNextRandom('Wojak')).toBeNull();
  });

  it('returns null for an unknown base', () => {
    expect(getNextRandom('UnknownBase')).toBeNull();
  });
});

// ============ getWithDifferentTrait (before init) ============

describe('getWithDifferentTrait', () => {
  it('returns null for any base before initialization', () => {
    expect(getWithDifferentTrait('Wojak', 'Eyes', 'Laser')).toBeNull();
  });

  it('returns null for unknown base', () => {
    expect(getWithDifferentTrait('Unknown', 'Eyes', 'Laser')).toBeNull();
  });
});

// ============ Initialized state tests ============

describe('galleryPreloader after initialization', () => {
  const mockNfts = [
    {
      name: 'Wojak #0001',
      description: '',
      image: 'https://cdn.example.com/0001.png',
      edition: 1,
      attributes: [{ trait_type: 'Base', value: 'Wojak' }, { trait_type: 'Eyes', value: 'Laser' }],
    },
    {
      name: 'Wojak #0002',
      description: '',
      image: 'https://cdn.example.com/0002.png',
      edition: 2,
      attributes: [{ trait_type: 'Base', value: 'Wojak' }, { trait_type: 'Eyes', value: 'Normal' }],
    },
    {
      name: 'Wojak #0003',
      description: '',
      image: 'https://cdn.example.com/0003.png',
      edition: 3,
      attributes: [{ trait_type: 'Base', value: 'Wojak' }, { trait_type: 'Eyes', value: 'Laser' }],
    },
    {
      name: 'Soyjak #0010',
      description: '',
      image: 'https://cdn.example.com/0010.png',
      edition: 10,
      attributes: [{ trait_type: 'Base', value: 'Soyjak' }],
    },
  ];

  beforeEach(async () => {
    // Mock global fetch to return our mock NFT metadata
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockNfts),
    }));

    // Dynamic import to get a fresh module reference
    const module = await import('./galleryPreloader');
    // Call initGalleryPreloader — will use our mocked fetch
    await module.initGalleryPreloader();
  });

  it('isReady returns true after initialization', async () => {
    const module = await import('./galleryPreloader');
    expect(module.isReady()).toBe(true);
  });

  it('getAllNfts returns the full metadata array after init', async () => {
    const module = await import('./galleryPreloader');
    const allNfts = module.getAllNfts();
    // Should contain all 4 mock NFTs
    expect(allNfts.length).toBe(4);
  });

  it('getNftsByBase returns NFTs for a valid base after init', async () => {
    const module = await import('./galleryPreloader');
    const wojakNfts = module.getNftsByBase('Wojak');
    expect(wojakNfts.length).toBe(3);
  });

  it('getNftsByBase returns empty array for base with no NFTs', async () => {
    const module = await import('./galleryPreloader');
    const alienNfts = module.getNftsByBase('Alien Wojak');
    expect(alienNfts).toEqual([]);
  });

  it('getNftByEdition returns correct NFT after init', async () => {
    const module = await import('./galleryPreloader');
    const nft = module.getNftByEdition('Wojak', 1);
    expect(nft).not.toBeNull();
    expect(nft!.edition).toBe(1);
  });

  it('getNftByEdition returns null for unknown edition', async () => {
    const module = await import('./galleryPreloader');
    const nft = module.getNftByEdition('Wojak', 9999);
    expect(nft).toBeNull();
  });

  it('getNextInSequence wraps around to beginning at end', async () => {
    const module = await import('./galleryPreloader');
    // Edition 3 is the last in sorted order for Wojak
    const next = module.getNextInSequence('Wojak', 3);
    expect(next).not.toBeNull();
    // Should wrap to first (edition 1)
    expect(next!.edition).toBe(1);
  });

  it('getNextInSequence returns next NFT in sequence', async () => {
    const module = await import('./galleryPreloader');
    const next = module.getNextInSequence('Wojak', 1);
    expect(next).not.toBeNull();
    expect(next!.edition).toBe(2);
  });

  it('getPrevInSequence wraps around to end at beginning', async () => {
    const module = await import('./galleryPreloader');
    // Edition 1 is first in sorted order
    const prev = module.getPrevInSequence('Wojak', 1);
    expect(prev).not.toBeNull();
    // Should wrap to last (edition 3)
    expect(prev!.edition).toBe(3);
  });

  it('getPrevInSequence returns previous NFT in sequence', async () => {
    const module = await import('./galleryPreloader');
    const prev = module.getPrevInSequence('Wojak', 3);
    expect(prev).not.toBeNull();
    expect(prev!.edition).toBe(2);
  });

  it('getWithDifferentTrait returns an NFT with a different trait value', async () => {
    const module = await import('./galleryPreloader');
    // From Wojak NFTs: editions 1 and 3 have Laser eyes, edition 2 has Normal
    const different = module.getWithDifferentTrait('Wojak', 'Eyes', 'Laser');
    expect(different).not.toBeNull();
    const eyesTrait = different!.attributes.find(a => a.trait_type === 'Eyes');
    expect(eyesTrait?.value).toBe('Normal');
  });

  it('getWithDifferentTrait returns null when no candidates have different trait', async () => {
    const module = await import('./galleryPreloader');
    // All Soyjak NFTs don't have a "Unique" Eyes trait
    const different = module.getWithDifferentTrait('Soyjak', 'Eyes', 'NonExistent');
    // No Soyjak NFTs have any Eyes trait at all, so candidates would have Eyes !== 'NonExistent'
    // Soyjak #0010 has no Eyes attribute, so trait is undefined — won't pass filter
    expect(different).toBeNull();
  });
});
