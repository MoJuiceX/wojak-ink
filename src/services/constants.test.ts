import { describe, it, expect } from 'vitest';
import {
  COLLECTION_ID,
  COLLECTION_SIZE,
  NFT_IPFS_CID,
  WALLET_ADDRESS,
  WALLET_PUZZLE_HASH,
  WALLET_DISPLAY,
  XCH_DECIMALS,
  CAT_DECIMALS,
  SPACESCAN_WALLET_URL,
  MINTGARDEN_COLLECTION_URL,
  getNftImageUrl,
  getNftThumbnailUrl,
  getMintGardenNftUrl,
  getMintGardenSearchUrl,
  getMintGardenWalletUrl,
  CACHE_DURATIONS,
  STORAGE_KEYS,
} from './constants';

// ============================================
// STATIC CONSTANTS
// ============================================

describe('COLLECTION_ID', () => {
  it('is a non-empty string', () => {
    expect(typeof COLLECTION_ID).toBe('string');
    expect(COLLECTION_ID.length).toBeGreaterThan(0);
  });

  it('starts with col1', () => {
    expect(COLLECTION_ID.startsWith('col1')).toBe(true);
  });
});

describe('COLLECTION_SIZE', () => {
  it('equals 4200', () => {
    expect(COLLECTION_SIZE).toBe(4200);
  });
});

describe('NFT_IPFS_CID', () => {
  it('is a non-empty string', () => {
    expect(typeof NFT_IPFS_CID).toBe('string');
    expect(NFT_IPFS_CID.length).toBeGreaterThan(0);
  });
});

describe('WALLET_ADDRESS', () => {
  it('starts with xch1', () => {
    expect(WALLET_ADDRESS.startsWith('xch1')).toBe(true);
  });
});

describe('WALLET_PUZZLE_HASH', () => {
  it('is a 64-character hex string', () => {
    expect(WALLET_PUZZLE_HASH).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('WALLET_DISPLAY', () => {
  it('contains an ellipsis', () => {
    expect(WALLET_DISPLAY).toContain('...');
  });

  it('starts with the first 10 chars of the wallet address', () => {
    expect(WALLET_DISPLAY.startsWith(WALLET_ADDRESS.slice(0, 10))).toBe(true);
  });

  it('ends with the last 6 chars of the wallet address', () => {
    expect(WALLET_DISPLAY.endsWith(WALLET_ADDRESS.slice(-6))).toBe(true);
  });
});

describe('XCH_DECIMALS', () => {
  it('equals 12', () => {
    expect(XCH_DECIMALS).toBe(12);
  });
});

describe('CAT_DECIMALS', () => {
  it('equals 3', () => {
    expect(CAT_DECIMALS).toBe(3);
  });
});

describe('SPACESCAN_WALLET_URL', () => {
  it('contains the wallet address', () => {
    expect(SPACESCAN_WALLET_URL).toContain(WALLET_ADDRESS);
  });

  it('starts with https://www.spacescan.io', () => {
    expect(SPACESCAN_WALLET_URL.startsWith('https://www.spacescan.io')).toBe(true);
  });
});

describe('MINTGARDEN_COLLECTION_URL', () => {
  it('starts with https://mintgarden.io', () => {
    expect(MINTGARDEN_COLLECTION_URL.startsWith('https://mintgarden.io')).toBe(true);
  });
});

// ============================================
// getNftImageUrl
// ============================================

describe('getNftImageUrl', () => {
  it('returns a same-origin resolver URL for a valid edition', () => {
    const url = getNftImageUrl(1);
    expect(url).toBe('/api/farmers-plot/image/1');
  });

  it('uses the resolver instead of the legacy IPFS gateway for indexed editions', () => {
    const url = getNftImageUrl(42);
    expect(url).toBe('/api/farmers-plot/image/42');
  });

  it('routes missing upstream editions through the same resolver', () => {
    const url = getNftImageUrl(2370);
    expect(url).toBe('/api/farmers-plot/image/2370');
  });

  it('supports four-digit editions through the resolver', () => {
    const url = getNftImageUrl(4200);
    expect(url).toBe('/api/farmers-plot/image/4200');
  });

  it('accepts a string ID', () => {
    const url = getNftImageUrl('7');
    expect(url).toBe('/api/farmers-plot/image/7');
  });

  it('returns a same-origin path for in-range editions', () => {
    const url = getNftImageUrl(100);
    expect(url.startsWith('/api/farmers-plot/image/')).toBe(true);
  });

  it('returns the resolver path for in-range editions', () => {
    const url = getNftImageUrl(999);
    expect(url).toBe('/api/farmers-plot/image/999');
  });

  it('falls back to the legacy IPFS URL for out-of-range editions', () => {
    const url = getNftImageUrl(9999);
    expect(url).toContain(NFT_IPFS_CID);
    expect(url).toContain('9999.png');
  });
});

// ============================================
// getNftThumbnailUrl
// ============================================

describe('getNftThumbnailUrl', () => {
  it('returns same URL as getNftImageUrl', () => {
    const imgUrl = getNftImageUrl(100);
    const thumbUrl = getNftThumbnailUrl(100);
    expect(thumbUrl).toBe(imgUrl);
  });

  it('returns the same stable manifest URL for fallback editions', () => {
    const url = getNftThumbnailUrl(5);
    expect(url).toBe(getNftImageUrl(5));
  });
});

// ============================================
// getMintGardenNftUrl
// ============================================

describe('getMintGardenNftUrl', () => {
  it('contains the launcher ID', () => {
    const launcherId = 'nft1abc123xyz';
    const url = getMintGardenNftUrl(launcherId);
    expect(url).toContain(launcherId);
  });

  it('starts with the mintgarden nfts path', () => {
    const url = getMintGardenNftUrl('nft1abc');
    expect(url).toContain('mintgarden.io/nfts/');
  });
});

// ============================================
// getMintGardenSearchUrl
// ============================================

describe('getMintGardenSearchUrl', () => {
  it('contains the search query parameter', () => {
    const url = getMintGardenSearchUrl(42);
    expect(url).toContain('search=42');
  });

  it('contains the collection URL', () => {
    const url = getMintGardenSearchUrl(1);
    expect(url).toContain(MINTGARDEN_COLLECTION_URL);
  });
});

// ============================================
// getMintGardenWalletUrl
// ============================================

describe('getMintGardenWalletUrl', () => {
  it('contains the address', () => {
    const addr = 'xch1testaddress123';
    const url = getMintGardenWalletUrl(addr);
    expect(url).toContain(addr);
  });

  it('uses mintgarden.io/addresses/ path', () => {
    const url = getMintGardenWalletUrl('xch1test');
    expect(url).toContain('mintgarden.io/addresses/');
  });
});

// ============================================
// CACHE_DURATIONS
// ============================================

describe('CACHE_DURATIONS', () => {
  it('listings is 15 minutes in ms', () => {
    expect(CACHE_DURATIONS.listings).toBe(15 * 60 * 1000);
  });

  it('walletData is 6 hours in ms', () => {
    expect(CACHE_DURATIONS.walletData).toBe(6 * 60 * 60 * 1000);
  });

  it('nftHistory is 30 minutes in ms', () => {
    expect(CACHE_DURATIONS.nftHistory).toBe(30 * 60 * 1000);
  });

  it('xchPrice is 30 minutes in ms', () => {
    expect(CACHE_DURATIONS.xchPrice).toBe(30 * 60 * 1000);
  });

  it('localStorage is 1 hour in ms', () => {
    expect(CACHE_DURATIONS.localStorage).toBe(60 * 60 * 1000);
  });

  it('traitStats is 5 minutes in ms', () => {
    expect(CACHE_DURATIONS.traitStats).toBe(5 * 60 * 1000);
  });
});

// ============================================
// STORAGE_KEYS
// ============================================

describe('STORAGE_KEYS', () => {
  it('has a listings key', () => {
    expect(typeof STORAGE_KEYS.listings).toBe('string');
    expect(STORAGE_KEYS.listings.length).toBeGreaterThan(0);
  });

  it('has a nftHistory key', () => {
    expect(typeof STORAGE_KEYS.nftHistory).toBe('string');
  });

  it('has a walletData key', () => {
    expect(typeof STORAGE_KEYS.walletData).toBe('string');
  });

  it('has an xchPrice key', () => {
    expect(typeof STORAGE_KEYS.xchPrice).toBe('string');
  });

  it('all keys are unique strings', () => {
    const keys = Object.values(STORAGE_KEYS);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});
