import { safeStorage } from '@/utils/safeStorage';

/**
 * Treasury Fallback Service
 *
 * Vanilla JavaScript-style data fetching with localStorage caching and graceful fallback.
 * Ensures the Treasury page always displays data, even during rate limits or network issues.
 *
 * Strategy:
 * 1. Load from localStorage cache immediately on page load
 * 2. Render UI with cached data (never show empty state)
 * 3. Check if cache is stale (> 30 minutes)
 * 4. If stale, attempt async fetch from SpaceScan APIs
 * 5. On success: update cache and re-render
 * 6. On failure: silently fall back to cached data (no error shown to user)
 * 7. If no cache exists: use hardcoded dummy data
 */

// ============================================
// CONFIGURATION
// ============================================

// Wallet address (hardcoded for reliability)
const WALLET_ADDRESS = 'xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd';

// LocalStorage key for treasury cache
const CACHE_KEY = 'treasuryCache';

// Cache freshness threshold (5 minutes in milliseconds)
const CACHE_FRESH_DURATION = 5 * 60 * 1000;

// API timeout (15 seconds)
const API_TIMEOUT = 15000;

// API base URLs (use proxy in dev and prod to avoid CORS)
const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const SPACESCAN_API = isDev ? '/spacescan-api' : '/api/spacescan';
const COINGECKO_API = isDev ? '/coingecko-api' : '/api/coingecko';

// ============================================
// TYPES
// ============================================

export interface TreasuryToken {
  id: string;
  name: string;
  symbol: string;
  amount: number;
  priceUSD: number;
  priceXCH: number;
  valueUSD: number;
  logoURL: string;
}

export interface CachedNFTItem {
  nftId: string;
  name: string;
  imageUrl: string;
  collectionId: string;
  collectionName: string;
}

export interface CachedNFTCollection {
  collectionId: string;
  collectionName: string;
  previewImage: string;
  count: number;
  nfts: CachedNFTItem[];
}

export interface TreasuryCache {
  tokens: TreasuryToken[];
  totalUSD: number;
  totalXCH: number;
  xchPriceUSD: number;
  lastUpdated: number; // timestamp in ms
  lastUpdatedHuman: string; // computed relative time
  nftCollections?: CachedNFTCollection[]; // Optional for backwards compatibility
}

// ============================================
// FALLBACK LOGO
// ============================================

/**
 * Default placeholder logo - a simple orange circle with "?"
 * This is a data URI so it works offline and never fails to load.
 * Used when token logo URL fails or is missing.
 */
export const FALLBACK_LOGO = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDUiIGZpbGw9IiNmNWE2MjMiLz48dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksIC1hcHBsZS1zeXN0ZW0sIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNDAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+PzwvdGV4dD48L3N2Zz4=';

/**
 * Custom token icons for specific symbols
 * Maps token symbols to local icon paths
 */
const CUSTOM_TOKEN_ICONS: Record<string, string> = {
  // Main token
  XCH: '/assets/icons/icon_XCH.png',
  // CAT tokens with custom icons
  HOA: '/assets/icons/Icon_HOA.webp',
  SPELL: '/assets/icons/Icon_SP.webp',
  NECK: '/assets/icons/Icon_NeckCoin.webp',
  '$CHIA': '/assets/icons/Icon_VersaceFerrariVegasApartmentPatek9000Inu.webp',
  PP: '/assets/icons/Icon_PP.webp',
  BEPE: '/assets/icons/Icon_Bepe.webp',
  SPROUT: '/assets/icons/Icon_Sprout.webp',
  CASTER: '/assets/icons/Icon_Caster.webp',
  PIZZA: '/assets/icons/Icon_Pizza.webp',
  JOCK: '/assets/icons/Icon_jock.webp',
  LOVE: '/assets/icons/Icon_love.webp',
  CHAD: '/assets/icons/Icon_chad.webp',
  G4M: '/assets/icons/Icon_g4m.webp',
  COOKIES: '/assets/icons/Icon_cookies.webp',
};

/**
 * Known placeholder/broken logo URLs that should trigger fallback
 */
const BROKEN_LOGO_PATTERNS = [
  'placeholder',
  'default',
  'missing',
  'unknown',
];

/**
 * Check if a logo URL should be considered broken/placeholder
 */
export function isLogoUrlBroken(url: string | undefined): boolean {
  if (!url || url.trim() === '') return true;

  // Must start with http, https, or / to be a valid URL
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    return true;
  }

  // Check for known broken URL patterns
  const lowerUrl = url.toLowerCase();
  if (BROKEN_LOGO_PATTERNS.some(pattern => lowerUrl.includes(pattern))) {
    return true;
  }

  // dexie.space icons are often broken - treat as broken
  if (lowerUrl.includes('icons.dexie.space')) {
    return true;
  }

  return false;
}

/**
 * Get the best logo URL for a token
 * Checks for custom icons first, then validates the provided URL
 */
export function getTokenLogo(symbol: string, providedUrl?: string): string {
  const upperSymbol = (symbol || '').toUpperCase();

  // Check for custom icon first - always preferred
  if (CUSTOM_TOKEN_ICONS[upperSymbol]) {
    return CUSTOM_TOKEN_ICONS[upperSymbol];
  }

  // Use provided URL if valid
  if (providedUrl && !isLogoUrlBroken(providedUrl)) {
    return providedUrl;
  }

  // Generate fallback SVG
  return getFallbackLogo(symbol);
}

/**
 * Get a fallback logo URL for a token
 * Uses custom icon if available, otherwise generates SVG with first letter
 */
export function getFallbackLogo(symbol: string): string {
  const upperSymbol = (symbol || '').toUpperCase();

  // Check for custom icon first
  if (CUSTOM_TOKEN_ICONS[upperSymbol]) {
    return CUSTOM_TOKEN_ICONS[upperSymbol];
  }

  // Create a simple SVG with the first letter of the symbol
  const letter = (symbol || '?').charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#f5a623"/><text x="50" y="65" font-family="Arial, sans-serif" font-size="45" font-weight="bold" fill="white" text-anchor="middle">${letter}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// ============================================
// HARDCODED FALLBACK DATA
// ============================================

/**
 * Hardcoded data for first-time visitors or when ALL APIs fail.
 * Based on realistic values from the actual Wojak.ink treasury wallet.
 *
 * THIS DATA ENSURES THE PAGE NEVER SHOWS EMPTY STATE.
 * - Always shows bubbles to pop
 * - Always shows a total value
 * - Always shows token list
 *
 * Update these values periodically to stay somewhat accurate.
 * Last updated: 2025-01-21
 */
/**
 * No hardcoded NFT collections — data is fetched dynamically from SpaceScan.
 * Keeping an empty array ensures the UI shows a loading state until fresh data arrives,
 * instead of displaying stale collection data with wrong counts.
 */
const FALLBACK_NFT_COLLECTIONS: CachedNFTCollection[] = [];

const FALLBACK_DATA: TreasuryCache = {
  tokens: [
    // XCH - The main holding (always first)
    {
      id: 'xch',
      name: 'Chia',
      symbol: 'XCH',
      amount: 146.0,
      priceUSD: 5.27,
      priceXCH: 1,
      valueUSD: 769.42,
      logoURL: '/assets/icons/icon_XCH.png',
    },
    // CAT tokens - sorted by value descending (from actual SpaceScan data)
    {
      id: 'e816ee...bdc23d',
      name: 'HOA COIN',
      symbol: 'HOA',
      amount: 67557,
      priceUSD: 0.00176,
      priceXCH: 0.00033,
      valueUSD: 119.07,
      logoURL: '',
    },
    {
      id: 'eb2155...38e4c4',
      name: 'Spell Power',
      symbol: 'SPELL',
      amount: 151230,
      priceUSD: 0.000764,
      priceXCH: 0.000145,
      valueUSD: 115.48,
      logoURL: '',
    },
    {
      id: '1ad673...8bd9da',
      name: 'NeckCoin',
      symbol: 'NECK',
      amount: 6,
      priceUSD: 15.08,
      priceXCH: 2.86,
      valueUSD: 90.46,
      logoURL: '',
    },
    {
      id: '693269...e21ddb',
      name: 'VersaceFerrariVegasApartmentPatek9000Inu',
      symbol: '$CHIA',
      amount: 4140,
      priceUSD: 0.0217,
      priceXCH: 0.0041,
      valueUSD: 90.04,
      logoURL: '',
    },
    {
      id: '84d31c...cbef37',
      name: 'PP',
      symbol: 'PP',
      amount: 6380,
      priceUSD: 0.0139,
      priceXCH: 0.00264,
      valueUSD: 88.75,
      logoURL: '',
    },
    {
      id: 'ccda69...f8bf1d',
      name: 'BEPE',
      symbol: 'BEPE',
      amount: 769520,
      priceUSD: 0.000115,
      priceXCH: 0.0000218,
      valueUSD: 88.19,
      logoURL: '',
    },
    {
      id: 'ab558b...bb463b',
      name: 'SPROUT',
      symbol: 'SPROUT',
      amount: 1010038,
      priceUSD: 0.000052,
      priceXCH: 0.0000099,
      valueUSD: 52.53,
      logoURL: '',
    },
    {
      id: 'a09af8...6305e6',
      name: 'Caster',
      symbol: 'CASTER',
      amount: 2,
      priceUSD: 15.41,
      priceXCH: 2.92,
      valueUSD: 30.82,
      logoURL: '',
    },
    // Small holdings (<$10) - shown in "Other Tokens" list
    {
      id: 'dd37f6...a80638',
      name: 'PIZZA',
      symbol: 'PIZZA',
      amount: 75038,
      priceUSD: 0.0000167,
      priceXCH: 0.00000316,
      valueUSD: 1.25,
      logoURL: '',
    },
    {
      id: '3b19b6...a9612e',
      name: 'JOCK',
      symbol: 'JOCK',
      amount: 10005,
      priceUSD: 0.000095,
      priceXCH: 0.000018,
      valueUSD: 0.95,
      logoURL: '',
    },
    {
      id: '70010d...549e50',
      name: 'LOVE',
      symbol: 'LOVE',
      amount: 1113,
      priceUSD: 0.000647,
      priceXCH: 0.000123,
      valueUSD: 0.72,
      logoURL: '',
    },
    {
      id: '0941dc...cea754',
      name: 'Chad',
      symbol: 'CHAD',
      amount: 3,
      priceUSD: 0.18,
      priceXCH: 0.034,
      valueUSD: 0.54,
      logoURL: '',
    },
    {
      id: '37b231...40596e',
      name: 'go4me',
      symbol: 'G4M',
      amount: 33333,
      priceUSD: 0.00001,
      priceXCH: 0.0000019,
      valueUSD: 0.33,
      logoURL: '',
    },
    {
      id: '370b11...a0059c',
      name: 'Cookies',
      symbol: 'COOKIES',
      amount: 200,
      priceUSD: 0.0004,
      priceXCH: 0.000076,
      valueUSD: 0.08,
      logoURL: '',
    },
  ],
  totalUSD: 1448.63,
  totalXCH: 274.88,
  xchPriceUSD: 5.27,
  lastUpdated: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago (indicates stale)
  lastUpdatedHuman: '1 day ago',
  nftCollections: FALLBACK_NFT_COLLECTIONS,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Compute human-readable relative time from timestamp
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Human-readable string like "Just now", "5 minutes ago", "2 hours ago"
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

/**
 * Check if cache is fresh (less than CACHE_FRESH_DURATION old)
 * @param timestamp - Cache timestamp in milliseconds
 * @returns true if cache is fresh, false if stale
 */
export function isCacheFresh(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_FRESH_DURATION;
}

/**
 * Fetch with timeout wrapper
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeout - Timeout in milliseconds
 * @returns Response or throws on timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================
// CACHE FUNCTIONS
// ============================================

/**
 * Load treasury data from localStorage cache
 * @returns Cached data or null if not found/invalid
 */
export function loadCache(): TreasuryCache | null {
  const data = safeStorage.getJSON<TreasuryCache | null>(CACHE_KEY, null);
  if (!data) return null;

  // Validate required fields exist
  if (!data.tokens || !Array.isArray(data.tokens) || typeof data.lastUpdated !== 'number') {
    console.warn('[TreasuryFallback] Invalid cache structure, ignoring');
    return null;
  }

  // Update the human-readable time (recompute on every load)
  data.lastUpdatedHuman = getRelativeTime(data.lastUpdated);

  return data;
}

/**
 * Save treasury data to localStorage cache
 * @param data - Treasury data to cache
 */
export function saveCache(data: TreasuryCache): void {
  // Update timestamp and human-readable time before saving
  data.lastUpdated = Date.now();
  data.lastUpdatedHuman = getRelativeTime(data.lastUpdated);

  safeStorage.setJSON(CACHE_KEY, data);
}

/**
 * Get data with fallback chain: cache -> fetch -> hardcoded
 * This ALWAYS returns data, never null or empty.
 * @returns Treasury data (from cache, fresh fetch, or hardcoded fallback)
 */
export function getDataWithFallback(): TreasuryCache {
  // Try to load from cache first
  const cached = loadCache();

  if (cached) {
    return cached;
  }

  // No cache - return hardcoded fallback data
  // This ensures first-time visitors see something
  console.warn('[TreasuryFallback] No cache found, using hardcoded fallback data');
  return { ...FALLBACK_DATA, lastUpdatedHuman: getRelativeTime(FALLBACK_DATA.lastUpdated) };
}

// ============================================
// API FETCH FUNCTIONS
// ============================================

/**
 * Fetch XCH price from CoinGecko API
 * @returns XCH price in USD or null on failure
 */
async function fetchXchPrice(): Promise<number | null> {
  try {
    const response = await fetchWithTimeout(
      `${COINGECKO_API}/api/v3/simple/price?ids=chia&vs_currencies=usd`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data?.chia?.usd;

    if (typeof price === 'number' && price > 0) {
      return price;
    }

    return null;
  } catch (error) {
    console.warn('[TreasuryFallback] Failed to fetch XCH price:', error);
    return null;
  }
}

/**
 * Fetch XCH balance from SpaceScan API
 * @returns XCH balance or null on failure
 */
async function fetchXchBalance(): Promise<{ xch: number; mojo: number } | null> {
  try {
    const response = await fetchWithTimeout(
      `${SPACESCAN_API}/address/xch-balance/${WALLET_ADDRESS}`
    );

    if (!response.ok) {
      throw new Error(`SpaceScan XCH balance API error: ${response.status}`);
    }

    const data = await response.json();
    const xch = data?.xch || 0;
    const mojo = data?.mojo || 0;

    return { xch, mojo };
  } catch (error) {
    console.warn('[TreasuryFallback] Failed to fetch XCH balance:', error);
    return null;
  }
}

/**
 * Fetch CAT token balances from SpaceScan API
 * @returns Array of token balances or null on failure
 */
async function fetchTokenBalances(): Promise<TreasuryToken[] | null> {
  try {
    const response = await fetchWithTimeout(
      `${SPACESCAN_API}/address/token-balance/${WALLET_ADDRESS}`
    );

    if (!response.ok) {
      throw new Error(`SpaceScan token balance API error: ${response.status}`);
    }

    const data = await response.json();
    const tokens = data?.data || data || [];

    if (!Array.isArray(tokens)) {
      return null;
    }

    // Map API response to our token format
    const mappedTokens: TreasuryToken[] = tokens
      .filter((token: Record<string, unknown>) => token.name)
      .map((token: Record<string, unknown>) => ({
        id: (token.asset_id as string) || '',
        name: (token.name as string) || 'Unknown',
        symbol: ((token.symbol || token.name) as string) || '???',
        amount: (token.balance as number) || 0,
        priceUSD: (token.price as number) || 0,
        priceXCH: 0, // Will be calculated later
        valueUSD: (token.total_value as number) || 0,
        logoURL: (token.preview_url as string) || '',
      }));

    return mappedTokens;
  } catch (error) {
    console.warn('[TreasuryFallback] Failed to fetch token balances:', error);
    return null;
  }
}

/**
 * Main fetch function - fetches all treasury data from APIs
 * Returns null on any failure (caller should use cached data)
 *
 * @param forceRefresh - If true, ignores cache freshness check
 * @returns Fresh treasury data or null on failure
 */
export async function fetchTreasuryData(forceRefresh = false): Promise<TreasuryCache | null> {
  // Check cache freshness (unless force refresh)
  if (!forceRefresh) {
    const cached = loadCache();
    if (cached && isCacheFresh(cached.lastUpdated)) {
      // Cache is fresh, no need to fetch
      return cached;
    }
  }

  try {
    // Fetch XCH price first (from CoinGecko - separate rate limit)
    const xchPrice = await fetchXchPrice();

    // If we can't get XCH price, use cached value or fallback
    const effectiveXchPrice = xchPrice || loadCache()?.xchPriceUSD || FALLBACK_DATA.xchPriceUSD;

    // Fetch XCH balance
    const xchBalance = await fetchXchBalance();

    // Fetch CAT token balances
    const catTokens = await fetchTokenBalances();

    // If we got neither XCH balance nor CAT tokens, consider it a failure
    if (!xchBalance && !catTokens) {
      console.warn('[TreasuryFallback] Both XCH balance and token fetch failed');
      return null;
    }

    // Build tokens array
    const tokens: TreasuryToken[] = [];

    // Add XCH as the first token
    if (xchBalance) {
      tokens.push({
        id: 'xch',
        name: 'Chia',
        symbol: 'XCH',
        amount: xchBalance.xch,
        priceUSD: effectiveXchPrice,
        priceXCH: 1,
        valueUSD: xchBalance.xch * effectiveXchPrice,
        logoURL: '/assets/icons/icon_XCH.png',
      });
    }

    // Add CAT tokens (if fetched)
    if (catTokens && catTokens.length > 0) {
      // Calculate priceXCH for each token
      const processedCats = catTokens.map((token) => ({
        ...token,
        priceXCH: effectiveXchPrice > 0 ? token.priceUSD / effectiveXchPrice : 0,
        // Recalculate valueUSD if not provided
        valueUSD: token.valueUSD || token.amount * token.priceUSD,
      }));

      tokens.push(...processedCats);
    }

    // If we only have CAT tokens (no XCH), add XCH from cache or fallback
    if (!xchBalance && tokens.length > 0) {
      const cachedXch = loadCache()?.tokens.find((t) => t.id === 'xch');
      if (cachedXch) {
        tokens.unshift({
          ...cachedXch,
          priceUSD: effectiveXchPrice,
          valueUSD: cachedXch.amount * effectiveXchPrice,
        });
      }
    }

    // Calculate totals
    const totalUSD = tokens.reduce((sum, t) => sum + t.valueUSD, 0);
    const totalXCH = effectiveXchPrice > 0 ? totalUSD / effectiveXchPrice : 0;

    // Build cache object
    const newData: TreasuryCache = {
      tokens,
      totalUSD,
      totalXCH,
      xchPriceUSD: effectiveXchPrice,
      lastUpdated: Date.now(),
      lastUpdatedHuman: 'Just now',
    };

    // Save to cache
    saveCache(newData);

    return newData;
  } catch (error) {
    // Any unexpected error - return null, caller will use cache
    console.warn('[TreasuryFallback] Unexpected error during fetch:', error);
    return null;
  }
}

// ============================================
// MAIN INITIALIZATION FUNCTION
// ============================================

/**
 * Initialize treasury data with fallback chain.
 * Call this on page load.
 *
 * Strategy:
 * 1. Immediately return cached/fallback data (never empty)
 * 2. If cache is stale, trigger async fetch
 * 3. On fetch success: update cache, call onUpdate callback
 * 4. On fetch failure: silently keep using cached data
 *
 * @param onUpdate - Callback called when fresh data is available
 * @param forceRefresh - If true, always attempt fetch regardless of cache freshness
 * @returns Immediate data (from cache or fallback)
 */
export async function initTreasuryData(
  onUpdate?: (data: TreasuryCache) => void,
  forceRefresh = false
): Promise<TreasuryCache> {
  // Step 1: Get immediate data (cache or fallback)
  const immediateData = getDataWithFallback();

  // Step 2: Check if we need to fetch fresh data
  const shouldFetch = forceRefresh || !isCacheFresh(immediateData.lastUpdated);

  if (shouldFetch) {
    // Step 3: Attempt async fetch (non-blocking)
    fetchTreasuryData(forceRefresh)
      .then((freshData) => {
        if (freshData && onUpdate) {
          // Step 4a: Success - call update callback with fresh data
          onUpdate(freshData);
        }
        // Step 4b: Failure (freshData is null) - silently keep using cached data
        // No error shown to user, no action needed
      })
      .catch((err) => {
        console.warn('[Treasury] Unexpected refresh error, keeping cached data:', err);
      });
  }

  // Return immediate data (caller can render right away)
  return immediateData;
}

/**
 * Force refresh treasury data (for refresh button)
 * @param onUpdate - Callback called when fresh data is available
 * @returns Promise that resolves to fresh data or cached fallback
 */
export async function refreshTreasuryData(
  onUpdate?: (data: TreasuryCache) => void
): Promise<TreasuryCache> {
  // Try to fetch fresh data
  const freshData = await fetchTreasuryData(true);

  if (freshData) {
    // Success - return fresh data
    if (onUpdate) onUpdate(freshData);
    return freshData;
  }

  // Failure - return cached/fallback data
  return getDataWithFallback();
}

// ============================================
// HELPER FUNCTIONS FOR UI
// ============================================

/**
 * Get visible tokens (value >= $1) sorted by value descending
 * @param data - Treasury cache data
 * @returns Filtered and sorted tokens
 */
export function getVisibleTokens(data: TreasuryCache): TreasuryToken[] {
  return data.tokens
    .filter((t) => t.valueUSD >= 1)
    .sort((a, b) => b.valueUSD - a.valueUSD);
}

/**
 * Get small holdings (value < $1) sorted by value descending
 * @param data - Treasury cache data
 * @returns Filtered and sorted tokens
 */
export function getSmallHoldings(data: TreasuryCache): TreasuryToken[] {
  return data.tokens
    .filter((t) => t.valueUSD < 1 && t.valueUSD > 0)
    .sort((a, b) => b.valueUSD - a.valueUSD);
}

/**
 * Check if currently using stale data
 * @param data - Treasury cache data
 * @returns true if data is stale (> 30 minutes old)
 */
export function isDataStale(data: TreasuryCache): boolean {
  return !isCacheFresh(data.lastUpdated);
}

// ============================================
// EXPORTS
// ============================================

export {
  WALLET_ADDRESS,
  CACHE_KEY,
  CACHE_FRESH_DURATION,
  FALLBACK_DATA,
};
