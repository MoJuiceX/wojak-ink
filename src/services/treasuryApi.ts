/**
 * Treasury API Service
 * Fetches wallet balances, tokens, and NFTs dynamically from SpaceScan
 *
 * NOTE: XCH price functions delegate to treasuryService for centralized caching.
 * All components share the same 15-minute cache.
 */

import { WALLET_ADDRESS } from './treasuryConstants';
import { spacescanQueue, coingeckoQueue } from '../utils/rateLimiter';
import { treasuryService } from './treasuryService';
import { getBrowserStorage } from '../utils/browserStorage';

// Use proxies to avoid CORS issues
// Dev: Vite proxy, Prod: Cloudflare Pages Function
const isDev = import.meta.env.DEV;
const SPACESCAN_API = isDev ? '/spacescan-api' : '/api/spacescan';
const COINGECKO_API = isDev ? '/coingecko-api' : '/api/coingecko';

// Types
export interface TokenBalance {
  asset_id: string;
  name: string;
  symbol: string;
  balance: number; // in token units
  value_usd: number;
  price_usd: number;
  logo_url?: string;
  color?: string; // Optional - for UI display
}

export interface NFTItem {
  nft_id: string;
  name: string;
  image_url: string;
  collection_id: string;
  collection_name: string;
}

export interface NFTCollection {
  collection_id: string;
  collection_name: string;
  preview_image: string;
  count: number;
  nfts: NFTItem[];
}

export interface WalletData {
  xch_balance: number; // in XCH units
  xch_balance_mojos: number;
  xch_price_usd: number;
  tokens: TokenBalance[];
  total_token_value_usd: number;
  nft_collections: NFTCollection[];
  last_updated: Date;
}

// LocalStorage keys
const STORAGE_KEY = 'wojak_treasury_data';
const STORAGE_TIMESTAMP_KEY = 'wojak_treasury_timestamp';
const STORAGE_XCH_PRICE_KEY = 'wojak_xch_price';
const STORAGE_XCH_BALANCE_KEY = 'wojak_xch_balance';

// Cache for API responses
let cachedData: WalletData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes - conservative refresh interval

// Rate limit tracking
let lastApiCall: number = 0;
const MIN_API_INTERVAL = 30 * 60 * 1000; // 30 minutes between full API refreshes

// XCH price cache - never show $0
let cachedXchPrice: number = 5.0; // Default fallback price

// XCH balance cache - never show 0
let cachedXchBalance: { xch: number; mojo: number } = { xch: 0.1, mojo: 100000000000 }; // Default fallback

// Load persisted data from localStorage on module init
function loadPersistedData(): void {
  try {
    const storage = getBrowserStorage();
    if (!storage) return;

    const storedPrice = storage.getItem(STORAGE_XCH_PRICE_KEY);
    if (storedPrice) {
      const price = parseFloat(storedPrice);
      if (price > 0) cachedXchPrice = price;
    }

    const storedBalance = storage.getItem(STORAGE_XCH_BALANCE_KEY);
    if (storedBalance) {
      const balance = JSON.parse(storedBalance);
      if (balance.xch > 0) cachedXchBalance = balance;
    }

    const storedData = storage.getItem(STORAGE_KEY);
    const storedTimestamp = storage.getItem(STORAGE_TIMESTAMP_KEY);
    if (storedData && storedTimestamp) {
      const data = JSON.parse(storedData);
      data.last_updated = new Date(data.last_updated);
      cachedData = data;
      cacheTimestamp = parseInt(storedTimestamp, 10);
    }
  } catch (e) {
    console.warn('Failed to load persisted treasury data:', e);
  }
}

// Save data to localStorage
function persistData(data: WalletData): void {
  try {
    const storage = getBrowserStorage();
    if (!storage) return;

    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    storage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
    storage.setItem(STORAGE_XCH_PRICE_KEY, data.xch_price_usd.toString());
    storage.setItem(STORAGE_XCH_BALANCE_KEY, JSON.stringify({
      xch: data.xch_balance,
      mojo: data.xch_balance_mojos
    }));
  } catch (e) {
    console.warn('Failed to persist treasury data:', e);
  }
}

// Initialize persisted data
loadPersistedData();

// Note: mojosToXch function removed - use direct calculation where needed

/**
 * Fetch XCH price from CoinGecko
 * Always returns a valid price (never 0) - uses cached/default as fallback
 * Uses rate limiter to prevent 429 errors
 */
async function fetchXchPrice(): Promise<number> {
  try {
    const data = await coingeckoQueue.add(async () => {
      const response = await fetch(
        `${COINGECKO_API}/api/v3/simple/price?ids=chia&vs_currencies=usd`
      );
      if (!response.ok) {
        const error = Object.assign(new Error(`CoinGecko API error: ${response.status}`), { status: response.status });
        throw error;
      }
      return response.json();
    });

    const price = data.chia?.usd;

    // Only update cache if we got a valid price
    if (price && price > 0) {
      cachedXchPrice = price;
      return price;
    }

    // Return cached price if API returned invalid data
    console.warn('Invalid XCH price from API, using cached:', cachedXchPrice);
    return cachedXchPrice;
  } catch (error) {
    console.error('Failed to fetch XCH price, using cached:', cachedXchPrice, error);
    return cachedXchPrice;
  }
}

/**
 * Fetch XCH balance for wallet
 * Docs: https://docs.spacescan.io/api/address/xch_balance/
 * Response: { status: "success", xch: 1124.36, mojo: 1124367548806078 }
 * Always returns a valid balance (never 0) - uses cached/default as fallback
 * Uses rate limiter to prevent 429 errors
 */
async function fetchXchBalance(): Promise<{ xch: number; mojo: number }> {
  try {
    const data = await spacescanQueue.add(async () => {
      const response = await fetch(
        `${SPACESCAN_API}/address/xch-balance/${WALLET_ADDRESS}`
      );

      if (!response.ok) {
        const error = Object.assign(new Error(`Spacescan API error: ${response.status}`), { status: response.status });
        throw error;
      }

      return response.json();
    });

    const xch = data.xch || 0;
    const mojo = data.mojo || 0;

    // Only update cache if we got valid data
    if (xch > 0) {
      cachedXchBalance = { xch, mojo };
      return cachedXchBalance;
    }

    // Return cached balance if API returned invalid data
    console.warn('Invalid XCH balance from API, using cached:', cachedXchBalance);
    return cachedXchBalance;
  } catch (error) {
    console.error('Failed to fetch XCH balance, using cached:', cachedXchBalance, error);
    return cachedXchBalance;
  }
}

// Cached token balances (for fallback)
let cachedTokens: TokenBalance[] = [];

/**
 * Fetch CAT token balances from SpaceScan API
 * Endpoint: /address/token-balance/{address}
 * Returns tokens sorted by USD value (highest first)
 */
async function fetchTokenBalances(): Promise<TokenBalance[]> {
  try {
    const data = await spacescanQueue.add(async () => {
      const response = await fetch(
        `${SPACESCAN_API}/address/token-balance/${WALLET_ADDRESS}`
      );

      if (!response.ok) {
        const error = Object.assign(new Error(`SpaceScan token API error: ${response.status}`), { status: response.status });
        throw error;
      }

      return response.json();
    });

    // Response format: { status: "success", data: [...tokens] }
    const tokens = data.data || data || [];

    const tokenBalances: TokenBalance[] = tokens
      .filter((token: Record<string, unknown>) => token.name) // Skip unnamed/unknown tokens
      .map((token: Record<string, unknown>) => ({
        asset_id: token.asset_id as string,
        name: token.name as string,
        symbol: (token.symbol || token.name) as string,
        balance: (token.balance as number) || 0,
        value_usd: (token.total_value as number) || 0,
        price_usd: (token.price as number) || 0,
        logo_url: token.preview_url as string | undefined,
      }))
      .sort((a: TokenBalance, b: TokenBalance) => b.value_usd - a.value_usd);

    // Cache for fallback
    if (tokenBalances.length > 0) {
      cachedTokens = tokenBalances;
    }

    return tokenBalances;
  } catch {
    // Return cached tokens on error
    return cachedTokens;
  }
}

/**
 * Fetch NFTs owned by the wallet
 * Docs: https://docs.spacescan.io/api/address/nft_balance/
 * Response: Array of { nft_id, name, collection_id, preview_url }
 * Uses rate limiter to prevent 429 errors
 */
async function fetchWalletNfts(): Promise<NFTCollection[]> {
  try {
    const data = await spacescanQueue.add(async () => {
      const response = await fetch(
        `${SPACESCAN_API}/address/nft-balance/${WALLET_ADDRESS}`
      );

      if (!response.ok) {
        const error = Object.assign(new Error(`Spacescan NFT API error: ${response.status}`), { status: response.status });
        throw error;
      }

      return response.json();
    });

    // SpaceScan response: { status: "success", balance: [...nfts] }
    const nfts = Array.isArray(data) ? data : (data.balance || data.nfts || data.data || []);

    // Group NFTs by collection
    const collectionMap = new Map<string, NFTCollection>();

    for (const nft of nfts) {
      const collectionId = nft.collection_id || nft.collectionId || 'unknown';
      const collectionName = nft.collection_name || nft.collectionName || 'Unknown Collection';

      if (!collectionMap.has(collectionId)) {
        collectionMap.set(collectionId, {
          collection_id: collectionId,
          collection_name: collectionName,
          preview_image: nft.preview_url || nft.image_url || nft.data_url || '',
          count: 0,
          nfts: [],
        });
      }

      const collection = collectionMap.get(collectionId)!;
      collection.count++;
      collection.nfts.push({
        nft_id: nft.nft_id || nft.id || '',
        name: nft.name || `NFT #${collection.count}`,
        image_url: nft.preview_url || nft.image_url || nft.data_url || '',
        collection_id: collectionId,
        collection_name: collectionName,
      });
    }

    return Array.from(collectionMap.values());
  } catch (error) {
    console.error('Failed to fetch wallet NFTs:', error);
    return [];
  }
}

/**
 * Get cached wallet data instantly (for immediate display)
 * Returns null if no cached data exists
 */
export function getCachedWalletData(): WalletData | null {
  return cachedData;
}

/**
 * Check if cache is stale and needs refresh
 */
export function isCacheStale(): boolean {
  if (!cachedData) return true;
  return (Date.now() - cacheTimestamp) >= CACHE_DURATION;
}

/**
 * Fetch all wallet data (main entry point)
 * @param forceRefresh - Force a fresh fetch even if cache is valid
 * @param backgroundRefresh - If true, won't block on rate limits
 */
export async function fetchWalletData(forceRefresh = false, backgroundRefresh = false): Promise<WalletData> {
  // Check cache
  const now = Date.now();
  if (!forceRefresh && cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedData;
  }

  // Rate limit protection - always return cache if we're being rate limited
  if (now - lastApiCall < MIN_API_INTERVAL) {
    if (cachedData) return cachedData;
    // If no cache and this is a background refresh, don't wait
    if (backgroundRefresh) {
      // Return default data instead of throwing
      return getDefaultWalletData();
    }
  }
  lastApiCall = now;

  try {
    // Fetch API data sequentially - rate limiter handles spacing
    // CoinGecko first (different API)
    const xchPrice = await fetchXchPrice();

    // SpaceScan calls - rate limiter adds delays automatically
    const xchData = await fetchXchBalance();
    const tokens = await fetchTokenBalances();
    const nftCollections = await fetchWalletNfts();

    // Calculate total token value from fetched data
    const totalTokenValue = tokens.reduce((sum, token) => sum + token.value_usd, 0);

    const walletData: WalletData = {
      xch_balance: xchData.xch,
      xch_balance_mojos: xchData.mojo,
      xch_price_usd: xchPrice,
      tokens,
      total_token_value_usd: totalTokenValue,
      nft_collections: nftCollections,
      last_updated: new Date(),
    };

    // Update cache and persist
    cachedData = walletData;
    cacheTimestamp = now;
    persistData(walletData);

    return walletData;
  } catch {
    // On any error, return cached data if available
    if (cachedData) {
      return cachedData;
    }
    // Otherwise return default data
    return getDefaultWalletData();
  }
}

/**
 * Get default wallet data when API fails and no cache is available
 */
function getDefaultWalletData(): WalletData {
  const tokens = cachedTokens.length > 0 ? cachedTokens : [];
  const totalTokenValue = tokens.reduce((sum, token) => sum + token.value_usd, 0);

  return {
    xch_balance: cachedXchBalance.xch,
    xch_balance_mojos: cachedXchBalance.mojo,
    xch_price_usd: cachedXchPrice,
    tokens,
    total_token_value_usd: totalTokenValue,
    nft_collections: [],
    last_updated: new Date(),
  };
}

/**
 * Prefetch wallet data in background (call on app start)
 * Delays initial request to avoid rate limiting on startup
 */
export function prefetchWalletData(): void {
  // Skip if we have valid cached data
  if (!isCacheStale()) {
    return;
  }

  // Delay startup API calls by 15 seconds to avoid rate limits
  // This gives time for other more critical API calls to complete first
  setTimeout(() => {
    fetchWalletData(true, true).catch(() => {
      // Background prefetch failed silently - will use cached data
    });
  }, 15000);
}

/**
 * Preload token logo images from cached data
 */
export function preloadTokenLogos(): void {
  // Use cached tokens if available
  const tokens = cachedTokens.length > 0 ? cachedTokens : [];
  const logos = tokens
    .filter(t => t.logo_url)
    .map(t => t.logo_url!);

  logos.forEach(url => {
    const img = new Image();
    img.src = url;
  });
}

/**
 * Preload NFT collection preview images from cached data
 * Call this after prefetchWalletData() completes
 */
export function preloadNftImages(): void {
  if (!cachedData || !cachedData.nft_collections) return;

  const imageUrls: string[] = [];

  // Collect all preview images from collections
  cachedData.nft_collections.forEach(collection => {
    // Collection preview image
    if (collection.preview_image) {
      imageUrls.push(collection.preview_image);
    }
    // Individual NFT images (limit to first 4 per collection to avoid too many requests)
    collection.nfts.slice(0, 4).forEach(nft => {
      if (nft.image_url) {
        imageUrls.push(nft.image_url);
      }
    });
  });

  // Preload unique images
  const uniqueUrls = [...new Set(imageUrls)];
  uniqueUrls.forEach(url => {
    const img = new Image();
    img.src = url;
  });

}

/**
 * Prefetch all treasury data and preload images
 * Designed to be called during boot sequence
 * Returns a promise that resolves when data is fetched (images load in background)
 */
export async function prefetchTreasuryWithImages(): Promise<void> {
  try {
    // Fetch wallet data (includes NFT collections)
    await fetchWalletData(true, true);

    // Preload images in background (non-blocking)
    preloadTokenLogos();
    preloadNftImages();
  } catch (error) {
    console.warn('[Treasury] Prefetch failed, will retry on Treasury visit:', error);
  }
}

/**
 * Get wallet explorer URL
 */
export function getWalletExplorerUrl(): string {
  return `https://www.spacescan.io/address/${WALLET_ADDRESS}`;
}

/**
 * Get current XCH price in USD
 * Delegates to centralized treasuryService for shared caching (15-minute cache)
 */
export async function getXchPrice(): Promise<number> {
  return treasuryService.getXchPrice();
}

/**
 * Get cached XCH price instantly (no API call)
 * Delegates to centralized treasuryService for shared caching
 */
export function getCachedXchPrice(): number {
  return treasuryService.getCachedXchPrice();
}
