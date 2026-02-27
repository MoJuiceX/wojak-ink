import { describe, it, expect } from 'vitest';
import {
  getRelativeTime,
  isCacheFresh,
  isLogoUrlBroken,
  getTokenLogo,
  getFallbackLogo,
  getVisibleTokens,
  getSmallHoldings,
  isDataStale,
  FALLBACK_LOGO,
  CACHE_FRESH_DURATION,
  type TreasuryCache,
  type TreasuryToken,
} from './treasuryFallback';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeToken(overrides: Partial<TreasuryToken> = {}): TreasuryToken {
  return {
    id: 'test-token',
    name: 'Test Token',
    symbol: 'TEST',
    amount: 100,
    priceUSD: 1,
    priceXCH: 0.1,
    valueUSD: 100,
    logoURL: '',
    ...overrides,
  };
}

function makeCache(tokens: TreasuryToken[], lastUpdated: number = Date.now()): TreasuryCache {
  return {
    tokens,
    totalUSD: tokens.reduce((sum, t) => sum + t.valueUSD, 0),
    totalXCH: tokens.reduce((sum, t) => sum + t.amount * t.priceXCH, 0),
    xchPriceUSD: 5.27,
    lastUpdated,
    lastUpdatedHuman: 'Just now',
  };
}

// ─── FALLBACK_LOGO ────────────────────────────────────────────────────────────

describe('FALLBACK_LOGO', () => {
  it('is a data URI', () => {
    expect(FALLBACK_LOGO).toMatch(/^data:/);
  });

  it('is a base64-encoded SVG', () => {
    expect(FALLBACK_LOGO).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});

// ─── CACHE_FRESH_DURATION ────────────────────────────────────────────────────

describe('CACHE_FRESH_DURATION', () => {
  it('is 5 minutes in milliseconds', () => {
    expect(CACHE_FRESH_DURATION).toBe(5 * 60 * 1000);
  });
});

// ─── getRelativeTime ──────────────────────────────────────────────────────────

describe('getRelativeTime', () => {
  it('returns "Just now" for timestamps less than 60 seconds ago', () => {
    expect(getRelativeTime(Date.now() - 30_000)).toBe('Just now');
  });

  it('returns "Just now" for very recent timestamp (1 second ago)', () => {
    expect(getRelativeTime(Date.now() - 1_000)).toBe('Just now');
  });

  it('returns "1 minute ago" for exactly 1 minute ago', () => {
    expect(getRelativeTime(Date.now() - 60_000)).toBe('1 minute ago');
  });

  it('returns "X minutes ago" for 2-59 minutes', () => {
    expect(getRelativeTime(Date.now() - 5 * 60_000)).toBe('5 minutes ago');
    expect(getRelativeTime(Date.now() - 30 * 60_000)).toBe('30 minutes ago');
  });

  it('returns "1 hour ago" for exactly 1 hour', () => {
    expect(getRelativeTime(Date.now() - 60 * 60_000)).toBe('1 hour ago');
  });

  it('returns "X hours ago" for 2-23 hours', () => {
    expect(getRelativeTime(Date.now() - 3 * 60 * 60_000)).toBe('3 hours ago');
  });

  it('returns "1 day ago" for exactly 1 day', () => {
    expect(getRelativeTime(Date.now() - 24 * 60 * 60_000)).toBe('1 day ago');
  });

  it('returns "X days ago" for multiple days', () => {
    expect(getRelativeTime(Date.now() - 3 * 24 * 60 * 60_000)).toBe('3 days ago');
  });

  it('returns "X days ago" for 7 days', () => {
    expect(getRelativeTime(Date.now() - 7 * 24 * 60 * 60_000)).toBe('7 days ago');
  });
});

// ─── isCacheFresh ────────────────────────────────────────────────────────────

describe('isCacheFresh', () => {
  it('returns true for a timestamp just set', () => {
    expect(isCacheFresh(Date.now())).toBe(true);
  });

  it('returns true for a timestamp 3 minutes ago', () => {
    expect(isCacheFresh(Date.now() - 3 * 60_000)).toBe(true);
  });

  it('returns false for a timestamp 6 minutes ago (past 5 min threshold)', () => {
    expect(isCacheFresh(Date.now() - 6 * 60_000)).toBe(false);
  });

  it('returns false for a timestamp 1 hour ago', () => {
    expect(isCacheFresh(Date.now() - 60 * 60_000)).toBe(false);
  });

  it('returns false for a timestamp from yesterday', () => {
    expect(isCacheFresh(Date.now() - 24 * 60 * 60_000)).toBe(false);
  });
});

// ─── isLogoUrlBroken ─────────────────────────────────────────────────────────

describe('isLogoUrlBroken', () => {
  it('returns true for undefined', () => {
    expect(isLogoUrlBroken(undefined)).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(isLogoUrlBroken('')).toBe(true);
  });

  it('returns true for whitespace-only string', () => {
    expect(isLogoUrlBroken('   ')).toBe(true);
  });

  it('returns true for URLs with "placeholder" in them', () => {
    expect(isLogoUrlBroken('https://example.com/placeholder.png')).toBe(true);
  });

  it('returns true for URLs with "missing" in them', () => {
    expect(isLogoUrlBroken('https://example.com/missing-icon.png')).toBe(true);
  });

  it('returns true for icons.dexie.space URLs', () => {
    expect(isLogoUrlBroken('https://icons.dexie.space/abc123.webp')).toBe(true);
  });

  it('returns true for relative paths that do not start with /', () => {
    expect(isLogoUrlBroken('assets/icon.png')).toBe(true);
  });

  it('returns false for valid https URLs', () => {
    expect(isLogoUrlBroken('https://example.com/icon.png')).toBe(false);
  });

  it('returns false for valid http URLs', () => {
    expect(isLogoUrlBroken('http://example.com/icon.png')).toBe(false);
  });

  it('returns false for local paths starting with /', () => {
    expect(isLogoUrlBroken('/assets/icons/icon_XCH.png')).toBe(false);
  });
});

// ─── getTokenLogo ────────────────────────────────────────────────────────────

describe('getTokenLogo', () => {
  it('returns custom icon path for XCH', () => {
    const logo = getTokenLogo('XCH');
    expect(logo).toBe('/assets/icons/icon_XCH.png');
  });

  it('returns custom icon path for HOA (case insensitive)', () => {
    const logo = getTokenLogo('hoa');
    expect(logo).toBe('/assets/icons/Icon_HOA.webp');
  });

  it('returns custom icon path for SPELL', () => {
    const logo = getTokenLogo('SPELL');
    expect(logo).toBe('/assets/icons/Icon_SP.webp');
  });

  it('returns custom icon for BEPE', () => {
    const logo = getTokenLogo('BEPE');
    expect(logo).toBe('/assets/icons/Icon_Bepe.webp');
  });

  it('returns providedUrl if valid and no custom icon exists', () => {
    const url = 'https://example.com/custom-token.png';
    const logo = getTokenLogo('UNKNOWN_TOKEN', url);
    expect(logo).toBe(url);
  });

  it('returns fallback SVG if providedUrl is broken and no custom icon', () => {
    const logo = getTokenLogo('XYZ', 'https://icons.dexie.space/broken.webp');
    // Falls back to generated SVG data URI
    expect(logo).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('returns fallback SVG for unknown token with no provided URL', () => {
    const logo = getTokenLogo('NEWCOIN');
    expect(logo).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('prefers custom icon over provided URL', () => {
    // XCH has a custom icon, so provided URL should be ignored
    const logo = getTokenLogo('XCH', 'https://example.com/custom.png');
    expect(logo).toBe('/assets/icons/icon_XCH.png');
  });
});

// ─── getFallbackLogo ──────────────────────────────────────────────────────────

describe('getFallbackLogo', () => {
  it('returns custom icon path for known symbols', () => {
    expect(getFallbackLogo('XCH')).toBe('/assets/icons/icon_XCH.png');
    expect(getFallbackLogo('NECK')).toBe('/assets/icons/Icon_NeckCoin.webp');
  });

  it('returns a data URI SVG for unknown symbols', () => {
    const logo = getFallbackLogo('UNKNOWN');
    expect(logo).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('encodes the first letter of the symbol in the SVG', () => {
    const logo = getFallbackLogo('ABC');
    const decoded = atob(logo.replace('data:image/svg+xml;base64,', ''));
    expect(decoded).toContain('A');
  });

  it('handles empty symbol by using "?" character', () => {
    const logo = getFallbackLogo('');
    const decoded = atob(logo.replace('data:image/svg+xml;base64,', ''));
    expect(decoded).toContain('?');
  });

  it('uses uppercase for the first letter', () => {
    const logo = getFallbackLogo('abc');
    const decoded = atob(logo.replace('data:image/svg+xml;base64,', ''));
    expect(decoded).toContain('A');
    expect(decoded).not.toContain('>a<');
  });
});

// ─── getVisibleTokens ────────────────────────────────────────────────────────

describe('getVisibleTokens', () => {
  it('filters out tokens with valueUSD less than 1', () => {
    const tokens = [
      makeToken({ valueUSD: 100 }),
      makeToken({ symbol: 'SMALL', valueUSD: 0.5 }),
    ];
    const visible = getVisibleTokens(makeCache(tokens));
    expect(visible).toHaveLength(1);
    expect(visible[0].symbol).toBe('TEST');
  });

  it('includes tokens with valueUSD exactly 1', () => {
    const tokens = [makeToken({ valueUSD: 1 })];
    const visible = getVisibleTokens(makeCache(tokens));
    expect(visible).toHaveLength(1);
  });

  it('returns tokens sorted by valueUSD descending', () => {
    const tokens = [
      makeToken({ symbol: 'LOW', valueUSD: 5 }),
      makeToken({ symbol: 'HIGH', valueUSD: 100 }),
      makeToken({ symbol: 'MID', valueUSD: 50 }),
    ];
    const visible = getVisibleTokens(makeCache(tokens));
    expect(visible[0].symbol).toBe('HIGH');
    expect(visible[1].symbol).toBe('MID');
    expect(visible[2].symbol).toBe('LOW');
  });

  it('returns empty array when no tokens meet the threshold', () => {
    const tokens = [makeToken({ valueUSD: 0.1 }), makeToken({ symbol: 'TINY', valueUSD: 0 })];
    const visible = getVisibleTokens(makeCache(tokens));
    expect(visible).toHaveLength(0);
  });

  it('returns all tokens when all are above threshold', () => {
    const tokens = [
      makeToken({ symbol: 'A', valueUSD: 10 }),
      makeToken({ symbol: 'B', valueUSD: 20 }),
    ];
    const visible = getVisibleTokens(makeCache(tokens));
    expect(visible).toHaveLength(2);
  });
});

// ─── getSmallHoldings ────────────────────────────────────────────────────────

describe('getSmallHoldings', () => {
  it('returns only tokens with valueUSD between 0 and 1', () => {
    const tokens = [
      makeToken({ symbol: 'BIG', valueUSD: 100 }),
      makeToken({ symbol: 'SMALL', valueUSD: 0.5 }),
      makeToken({ symbol: 'ZERO', valueUSD: 0 }),
    ];
    const small = getSmallHoldings(makeCache(tokens));
    expect(small).toHaveLength(1);
    expect(small[0].symbol).toBe('SMALL');
  });

  it('excludes tokens with valueUSD >= 1', () => {
    const tokens = [makeToken({ valueUSD: 1 })];
    const small = getSmallHoldings(makeCache(tokens));
    expect(small).toHaveLength(0);
  });

  it('excludes tokens with valueUSD of 0', () => {
    const tokens = [makeToken({ valueUSD: 0 })];
    const small = getSmallHoldings(makeCache(tokens));
    expect(small).toHaveLength(0);
  });

  it('returns tokens sorted by valueUSD descending', () => {
    const tokens = [
      makeToken({ symbol: 'A', valueUSD: 0.1 }),
      makeToken({ symbol: 'B', valueUSD: 0.9 }),
      makeToken({ symbol: 'C', valueUSD: 0.5 }),
    ];
    const small = getSmallHoldings(makeCache(tokens));
    expect(small[0].symbol).toBe('B');
    expect(small[1].symbol).toBe('C');
    expect(small[2].symbol).toBe('A');
  });
});

// ─── isDataStale ─────────────────────────────────────────────────────────────

describe('isDataStale', () => {
  it('returns false for freshly updated cache', () => {
    const cache = makeCache([], Date.now());
    expect(isDataStale(cache)).toBe(false);
  });

  it('returns false for cache updated 3 minutes ago', () => {
    const cache = makeCache([], Date.now() - 3 * 60_000);
    expect(isDataStale(cache)).toBe(false);
  });

  it('returns true for cache updated 6 minutes ago (past 5 min threshold)', () => {
    const cache = makeCache([], Date.now() - 6 * 60_000);
    expect(isDataStale(cache)).toBe(true);
  });

  it('returns true for cache updated 1 hour ago', () => {
    const cache = makeCache([], Date.now() - 60 * 60_000);
    expect(isDataStale(cache)).toBe(true);
  });
});
