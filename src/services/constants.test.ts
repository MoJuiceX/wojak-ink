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
  CACHE_DURATIONS,
  STORAGE_KEYS,
  getNftImageUrl,
  getNftThumbnailUrl,
  getMintGardenNftUrl,
  getMintGardenSearchUrl,
  getMintGardenWalletUrl,
} from './constants';

// ============ Collection Info ============

describe('Collection constants', () => {
  it('COLLECTION_ID has the expected value', () => {
    expect(COLLECTION_ID).toBe(
      'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah',
    );
  });

  it('COLLECTION_SIZE is 4200', () => {
    expect(COLLECTION_SIZE).toBe(4200);
  });

  it('NFT_IPFS_CID has the expected CID', () => {
    expect(NFT_IPFS_CID).toBe(
      'bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq',
    );
  });
});

// ============ Treasury / Wallet ============

describe('Wallet constants', () => {
  it('WALLET_ADDRESS starts with xch1', () => {
    expect(WALLET_ADDRESS.startsWith('xch1')).toBe(true);
  });

  it('WALLET_ADDRESS has the expected full value', () => {
    expect(WALLET_ADDRESS).toBe(
      'xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd',
    );
  });

  it('WALLET_PUZZLE_HASH has the expected hex value', () => {
    expect(WALLET_PUZZLE_HASH).toBe(
      '8f53b331e60904f8ae324b7781ad94ce1d9a4e8a2fbcc33622518a5a24a0e727',
    );
  });

  it('WALLET_DISPLAY is a truncated form of WALLET_ADDRESS', () => {
    const expectedStart = WALLET_ADDRESS.slice(0, 10);
    const expectedEnd = WALLET_ADDRESS.slice(-6);
    expect(WALLET_DISPLAY).toBe(`${expectedStart}...${expectedEnd}`);
  });

  it('WALLET_DISPLAY length is shorter than WALLET_ADDRESS', () => {
    expect(WALLET_DISPLAY.length).toBeLessThan(WALLET_ADDRESS.length);
  });
});

// ============ Decimals ============

describe('Decimal constants', () => {
  it('XCH_DECIMALS is 12', () => {
    expect(XCH_DECIMALS).toBe(12);
  });

  it('CAT_DECIMALS is 3', () => {
    expect(CAT_DECIMALS).toBe(3);
  });
});

// ============ External Link Constants ============

describe('External link constants', () => {
  it('SPACESCAN_WALLET_URL contains the wallet address', () => {
    expect(SPACESCAN_WALLET_URL).toContain(WALLET_ADDRESS);
  });

  it('SPACESCAN_WALLET_URL points to spacescan.io', () => {
    expect(SPACESCAN_WALLET_URL).toContain('spacescan.io');
  });

  it('MINTGARDEN_COLLECTION_URL points to mintgarden.io', () => {
    expect(MINTGARDEN_COLLECTION_URL).toContain('mintgarden.io');
  });
});

// ============ Cache Durations ============

describe('CACHE_DURATIONS', () => {
  it('listings is 15 minutes in milliseconds', () => {
    expect(CACHE_DURATIONS.listings).toBe(15 * 60 * 1000);
  });

  it('walletData is 6 hours in milliseconds', () => {
    expect(CACHE_DURATIONS.walletData).toBe(6 * 60 * 60 * 1000);
  });

  it('nftHistory is 30 minutes in milliseconds', () => {
    expect(CACHE_DURATIONS.nftHistory).toBe(30 * 60 * 1000);
  });

  it('traitStats is 5 minutes in milliseconds', () => {
    expect(CACHE_DURATIONS.traitStats).toBe(5 * 60 * 1000);
  });

  it('xchPrice is 30 minutes in milliseconds', () => {
    expect(CACHE_DURATIONS.xchPrice).toBe(30 * 60 * 1000);
  });

  it('localStorage is 1 hour in milliseconds', () => {
    expect(CACHE_DURATIONS.localStorage).toBe(60 * 60 * 1000);
  });
});

// ============ Storage Keys ============

describe('STORAGE_KEYS', () => {
  it('listings key has the expected value', () => {
    expect(STORAGE_KEYS.listings).toBe('wojak_listings_cache_v1');
  });

  it('nftHistory key has the expected value', () => {
    expect(STORAGE_KEYS.nftHistory).toBe('wojak_nft_history_cache_v1');
  });

  it('walletData key has the expected value', () => {
    expect(STORAGE_KEYS.walletData).toBe('wojak_treasury_data');
  });

  it('walletTimestamp key has the expected value', () => {
    expect(STORAGE_KEYS.walletTimestamp).toBe('wojak_treasury_timestamp');
  });

  it('xchPrice key has the expected value', () => {
    expect(STORAGE_KEYS.xchPrice).toBe('wojak_xch_price');
  });

  it('xchBalance key has the expected value', () => {
    expect(STORAGE_KEYS.xchBalance).toBe('wojak_xch_balance');
  });

  it('all keys are unique (no duplicates)', () => {
    const values = Object.values(STORAGE_KEYS);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ============ getNftImageUrl ============

describe('getNftImageUrl', () => {
  it('pads single-digit IDs to 4 characters', () => {
    const url = getNftImageUrl(1);
    expect(url).toContain('0001.png');
  });

  it('pads three-digit IDs to 4 characters', () => {
    const url = getNftImageUrl(42);
    expect(url).toContain('0042.png');
  });

  it('does not pad IDs that are already 4 digits', () => {
    const url = getNftImageUrl(1234);
    expect(url).toContain('1234.png');
  });

  it('uses the correct IPFS CID in the URL', () => {
    const url = getNftImageUrl(1);
    expect(url).toContain(NFT_IPFS_CID);
  });

  it('accepts a string nftId and produces the same URL as a numeric ID', () => {
    expect(getNftImageUrl('7')).toBe(getNftImageUrl(7));
  });

  it('uses the w3s.link gateway', () => {
    const url = getNftImageUrl(1);
    expect(url).toContain('w3s.link');
  });
});

// ============ getNftThumbnailUrl ============

describe('getNftThumbnailUrl', () => {
  it('returns the same URL as getNftImageUrl (thumbnails not yet separate)', () => {
    expect(getNftThumbnailUrl(100)).toBe(getNftImageUrl(100));
  });
});

// ============ getMintGardenNftUrl ============

describe('getMintGardenNftUrl', () => {
  it('includes the provided launcher ID in the URL', () => {
    const launcherId = 'nft1abc123';
    expect(getMintGardenNftUrl(launcherId)).toContain(launcherId);
  });

  it('points to mintgarden.io/nfts/', () => {
    expect(getMintGardenNftUrl('nft1test')).toContain('mintgarden.io/nfts/');
  });
});

// ============ getMintGardenSearchUrl ============

describe('getMintGardenSearchUrl', () => {
  it('includes the nftId as a search param', () => {
    const url = getMintGardenSearchUrl(42);
    expect(url).toContain('search=42');
  });

  it('is based on MINTGARDEN_COLLECTION_URL', () => {
    const url = getMintGardenSearchUrl(1);
    expect(url.startsWith(MINTGARDEN_COLLECTION_URL)).toBe(true);
  });
});

// ============ getMintGardenWalletUrl ============

describe('getMintGardenWalletUrl', () => {
  it('includes the provided address in the URL', () => {
    const addr = 'xch1testaddress';
    expect(getMintGardenWalletUrl(addr)).toContain(addr);
  });

  it('points to mintgarden.io/addresses/', () => {
    expect(getMintGardenWalletUrl('xch1test')).toContain('mintgarden.io/addresses/');
  });
});
