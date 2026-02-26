/**
 * Treasury Service
 *
 * Fetches wallet balances, tokens, and NFTs with robust fallback mechanism.
 * Uses localStorage caching to ensure data is always available.
 */

import {
  WALLET_ADDRESS,
  SPACESCAN_API,
  COINGECKO_API,
  SPACESCAN_WALLET_URL,
} from './constants';
import { spacescanQueue, coingeckoQueue } from '@/utils/rateLimiter';
import {
  type TreasuryCache,
  type TreasuryToken,
  loadCache,
  saveCache,
  isCacheFresh,
  getRelativeTime,
  FALLBACK_DATA,
} from './treasuryFallback';

// ============ Types ============

export interface TokenBalance {
  assetId: string;
  name: string;
  symbol: string;
  balance: number;
  valueUsd: number;
  priceUsd: number;
  logoUrl?: string;
  color?: string;
}

export interface NFTItem {
  nftId: string;
  name: string;
  imageUrl: string;
  collectionId: string;
  collectionName: string;
}

export interface NFTCollection {
  collectionId: string;
  collectionName: string;
  previewImage: string;
  count: number;
  nfts: NFTItem[];
}

export interface WalletData {
  xchBalance: number;
  xchBalanceMojos: number;
  xchPriceUsd: number;
  tokens: TokenBalance[];
  totalTokenValueUsd: number;
  nftCollections: NFTCollection[];
  lastUpdated: Date;
}

// ============ Cache (in-memory for React Query) ============

let cachedWalletData: WalletData | null = null;
let cacheTimestamp = 0;

// Cache duration for React Query layer (shorter than localStorage)
const MEMORY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ============ Initialize from localStorage ============

function initializeFromLocalStorage(): void {
  const cached = loadCache();
  if (cached) {
    cachedWalletData = convertCacheToWalletData(cached);
    cacheTimestamp = cached.lastUpdated;
  }
}

// Initialize on module load
initializeFromLocalStorage();

// ============ Conversion Functions ============

/**
 * Convert TreasuryCache format to WalletData format
 */
function convertCacheToWalletData(cache: TreasuryCache): WalletData {
  const xchToken = cache.tokens.find((t) => t.id === 'xch');
  const catTokens = cache.tokens.filter((t) => t.id !== 'xch');

  const tokens: TokenBalance[] = catTokens.map((t) => ({
    assetId: t.id,
    name: t.name,
    symbol: t.symbol,
    balance: t.amount,
    valueUsd: t.valueUSD,
    priceUsd: t.priceUSD,
    logoUrl: t.logoURL,
  }));

  // Convert cached NFT collections to WalletData format
  const nftCollections: NFTCollection[] = (cache.nftCollections || []).map((c) => ({
    collectionId: c.collectionId,
    collectionName: c.collectionName,
    previewImage: c.previewImage,
    count: c.count,
    nfts: c.nfts.map((n) => ({
      nftId: n.nftId,
      name: n.name,
      imageUrl: n.imageUrl,
      collectionId: n.collectionId,
      collectionName: n.collectionName,
    })),
  }));

  return {
    xchBalance: xchToken?.amount || 0,
    xchBalanceMojos: Math.floor((xchToken?.amount || 0) * 1e12),
    xchPriceUsd: cache.xchPriceUSD,
    tokens,
    totalTokenValueUsd: catTokens.reduce((sum, t) => sum + t.valueUSD, 0),
    nftCollections,
    lastUpdated: new Date(cache.lastUpdated),
  };
}

/**
 * Convert WalletData format to TreasuryCache format for localStorage
 */
function convertWalletDataToCache(data: WalletData): TreasuryCache {
  const tokens: TreasuryToken[] = [
    {
      id: 'xch',
      name: 'Chia',
      symbol: 'XCH',
      amount: data.xchBalance,
      priceUSD: data.xchPriceUsd,
      priceXCH: 1,
      valueUSD: data.xchBalance * data.xchPriceUsd,
      logoURL: '/assets/icons/icon_XCH.png',
    },
    ...data.tokens.map((t) => ({
      id: t.assetId,
      name: t.name,
      symbol: t.symbol,
      amount: t.balance,
      priceUSD: t.priceUsd,
      priceXCH: data.xchPriceUsd > 0 ? t.priceUsd / data.xchPriceUsd : 0,
      valueUSD: t.valueUsd,
      logoURL: t.logoUrl || '',
    })),
  ];

  const totalUSD = tokens.reduce((sum, t) => sum + t.valueUSD, 0);

  // Convert NFT collections for caching
  const nftCollections = data.nftCollections.map((c) => ({
    collectionId: c.collectionId,
    collectionName: c.collectionName,
    previewImage: c.previewImage,
    count: c.count,
    nfts: c.nfts.map((n) => ({
      nftId: n.nftId,
      name: n.name,
      imageUrl: n.imageUrl,
      collectionId: n.collectionId,
      collectionName: n.collectionName,
    })),
  }));

  return {
    tokens,
    totalUSD,
    totalXCH: data.xchPriceUsd > 0 ? totalUSD / data.xchPriceUsd : 0,
    xchPriceUSD: data.xchPriceUsd,
    lastUpdated: data.lastUpdated.getTime(),
    lastUpdatedHuman: getRelativeTime(data.lastUpdated.getTime()),
    nftCollections,
  };
}

// ============ API Fetchers ============

async function fetchXchPrice(): Promise<number> {
  // First check localStorage for recent price
  const cached = loadCache();
  const cachedPrice = cached?.xchPriceUSD || FALLBACK_DATA.xchPriceUSD;

  try {
    const data = await coingeckoQueue.add(async () => {
      const response = await fetch(
        `${COINGECKO_API}/api/v3/simple/price?ids=chia&vs_currencies=usd`
      );
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      return response.json();
    });

    const price = data.chia?.usd;
    if (price && price > 0) {
      return price;
    }

    return cachedPrice;
  } catch {
    console.warn('[Treasury] XCH price fetch failed, using cached:', cachedPrice);
    return cachedPrice;
  }
}

async function fetchXchBalance(): Promise<{ xch: number; mojo: number }> {
  // First check localStorage for recent balance
  const cached = loadCache();
  const xchToken = cached?.tokens.find((t) => t.id === 'xch');
  const cachedBalance = {
    xch: xchToken?.amount || FALLBACK_DATA.tokens[0].amount,
    mojo: Math.floor((xchToken?.amount || FALLBACK_DATA.tokens[0].amount) * 1e12),
  };

  try {
    const data = await spacescanQueue.add(async () => {
      const response = await fetch(
        `${SPACESCAN_API}/address/xch-balance/${WALLET_ADDRESS}`
      );
      if (!response.ok) {
        throw new Error(`SpaceScan API error: ${response.status}`);
      }
      return response.json();
    });

    const xch = data.xch || 0;
    const mojo = data.mojo || 0;

    if (xch > 0) {
      return { xch, mojo };
    }

    return cachedBalance;
  } catch {
    console.warn('[Treasury] XCH balance fetch failed, using cached:', cachedBalance.xch);
    return cachedBalance;
  }
}

async function fetchTokenBalances(): Promise<TokenBalance[]> {
  // First check localStorage for recent tokens
  const cached = loadCache();
  const cachedTokens: TokenBalance[] = cached
    ? cached.tokens
        .filter((t) => t.id !== 'xch')
        .map((t) => ({
          assetId: t.id,
          name: t.name,
          symbol: t.symbol,
          balance: t.amount,
          valueUsd: t.valueUSD,
          priceUsd: t.priceUSD,
          logoUrl: t.logoURL,
        }))
    : FALLBACK_DATA.tokens
        .filter((t) => t.id !== 'xch')
        .map((t) => ({
          assetId: t.id,
          name: t.name,
          symbol: t.symbol,
          balance: t.amount,
          valueUsd: t.valueUSD,
          priceUsd: t.priceUSD,
          logoUrl: t.logoURL,
        }));

  try {
    const data = await spacescanQueue.add(async () => {
      const response = await fetch(
        `${SPACESCAN_API}/address/token-balance/${WALLET_ADDRESS}`
      );
      if (!response.ok) {
        throw new Error(`SpaceScan token API error: ${response.status}`);
      }
      return response.json();
    });

    const tokens = data.data || data || [];

    const tokenBalances: TokenBalance[] = tokens
      .filter((token: Record<string, unknown>) => token.name)
      .map((token: Record<string, unknown>) => ({
        assetId: token.asset_id as string,
        name: token.name as string,
        symbol: (token.symbol || token.name) as string,
        balance: (token.balance || 0) as number,
        valueUsd: (token.total_value || 0) as number,
        priceUsd: (token.price || 0) as number,
        logoUrl: token.preview_url as string | undefined,
      }))
      .sort((a: TokenBalance, b: TokenBalance) => b.valueUsd - a.valueUsd);

    if (tokenBalances.length > 0) {
      return tokenBalances;
    }

    // No tokens returned - use cached
    return cachedTokens;
  } catch {
    console.warn('[Treasury] Token fetch failed, using cached:', cachedTokens.length, 'tokens');
    return cachedTokens;
  }
}

/**
 * Get cached/fallback NFT collections from localStorage or hardcoded data
 */
function getCachedNFTCollections(): NFTCollection[] {
  const cached = loadCache();
  if (cached?.nftCollections?.length) {
    return cached.nftCollections.map((c) => ({
      collectionId: c.collectionId,
      collectionName: c.collectionName,
      previewImage: c.previewImage,
      count: c.count,
      nfts: c.nfts.map((n) => ({
        nftId: n.nftId,
        name: n.name,
        imageUrl: n.imageUrl,
        collectionId: n.collectionId,
        collectionName: n.collectionName,
      })),
    }));
  }
  // Use hardcoded fallback
  if (FALLBACK_DATA.nftCollections?.length) {
    return FALLBACK_DATA.nftCollections.map((c) => ({
      collectionId: c.collectionId,
      collectionName: c.collectionName,
      previewImage: c.previewImage,
      count: c.count,
      nfts: [],
    }));
  }
  return [];
}

/**
 * Derive a collection name from NFT names in the group.
 * SpaceScan doesn't return collection_name, so we extract it
 * from the NFT name by stripping trailing "#NUMBER" or edition numbers.
 */
function deriveCollectionName(nftNames: string[]): string {
  if (nftNames.length === 0) return 'Unknown Collection';
  const firstName = nftNames[0];
  // Strip trailing #NUMBER (e.g., "Mojo Friends #2573" → "Mojo Friends")
  const stripped = firstName.replace(/\s*#\d+\s*$/, '').trim();
  return stripped || firstName;
}

/**
 * Fetch NFTs from SpaceScan API (returns ALL NFTs, unlike MintGarden which caps at ~50).
 * Groups by collection_id and derives collection names from NFT names.
 */
async function fetchNFTCollections(): Promise<NFTCollection[]> {
  // Get cached/fallback collections to use if API fails
  const fallbackCollections = getCachedNFTCollections();

  try {
    const data = await spacescanQueue.add(async () => {
      const response = await fetch(
        `${SPACESCAN_API}/address/nft-balance/${WALLET_ADDRESS}`
      );
      if (!response.ok) {
        throw new Error(`SpaceScan NFT API error: ${response.status}`);
      }
      return response.json();
    });

    const nfts = data.balance || data.data || [];
    if (!Array.isArray(nfts) || nfts.length === 0) {
      return fallbackCollections;
    }

    // Group NFTs by collection with deduplication
    const collectionMap = new Map<string, NFTCollection>();
    const seenNftIds = new Set<string>();

    for (const nft of nfts) {
      const nftId = (nft.nft_id as string) || (nft.encoded_id as string) || '';

      // Skip if we've already seen this NFT (deduplication)
      if (!nftId || seenNftIds.has(nftId)) {
        continue;
      }
      seenNftIds.add(nftId);

      const collectionId = (nft.collection_id as string) || 'uncategorized';
      const nftName = (nft.name as string) || 'Unknown NFT';
      const previewUrl = (nft.preview_url as string) || '';

      const nftItem: NFTItem = {
        nftId,
        name: nftName,
        imageUrl: previewUrl,
        collectionId,
        collectionName: '', // Set after grouping
      };

      if (collectionMap.has(collectionId)) {
        const collection = collectionMap.get(collectionId)!;
        collection.nfts.push(nftItem);
        collection.count = collection.nfts.length;
      } else {
        collectionMap.set(collectionId, {
          collectionId,
          collectionName: '', // Set after grouping
          previewImage: previewUrl,
          count: 1,
          nfts: [nftItem],
        });
      }
    }

    // Derive collection names from NFT names and update all entries
    for (const collection of collectionMap.values()) {
      const names = collection.nfts.map(n => n.name);
      const derivedName = deriveCollectionName(names);
      collection.collectionName = derivedName;
      for (const nft of collection.nfts) {
        nft.collectionName = derivedName;
      }

      // Ensure preview image uses first NFT with a valid URL
      if (!collection.previewImage) {
        const nftWithImage = collection.nfts.find(n => n.imageUrl);
        if (nftWithImage) {
          collection.previewImage = nftWithImage.imageUrl;
        }
      }
    }

    // Convert to array and sort by count descending
    return Array.from(collectionMap.values())
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.warn('[Treasury] NFT fetch failed, using fallback:', error);
    return fallbackCollections;
  }
}

function getDefaultWalletData(): WalletData {
  // Use localStorage cache or hardcoded fallback
  const cached = loadCache();
  if (cached) {
    return convertCacheToWalletData(cached);
  }

  return convertCacheToWalletData(FALLBACK_DATA);
}

// ============ Service Interface ============

export interface ITreasuryService {
  fetchWalletData(forceRefresh?: boolean): Promise<WalletData>;
  getCachedWalletData(): WalletData; // Always returns data (never null) - uses fallback if needed
  isCacheStale(): boolean;
  getXchPrice(): Promise<number>;
  getCachedXchPrice(): number;
  getWalletExplorerUrl(): string;
  prefetchWalletData(): void;
}

class TreasuryService implements ITreasuryService {
  private lastApiCall = 0;
  private readonly minApiInterval = 60 * 1000; // 1 minute between API calls

  async fetchWalletData(forceRefresh = false): Promise<WalletData> {
    const now = Date.now();

    // Check memory cache first (for React Query)
    // BUT: Skip if memory cache has no NFT collections
    if (!forceRefresh && cachedWalletData && now - cacheTimestamp < MEMORY_CACHE_DURATION) {
      if (cachedWalletData.nftCollections?.length > 0) {
        return cachedWalletData;
      }
    }

    // Check localStorage cache
    const localCache = loadCache();
    // Skip localStorage cache since it doesn't include NFT collections
    // Always fetch fresh if we have no NFT collections in memory
    if (!forceRefresh && localCache && isCacheFresh(localCache.lastUpdated) && (cachedWalletData?.nftCollections?.length ?? 0) > 0) {
      cachedWalletData = convertCacheToWalletData(localCache);
      cacheTimestamp = localCache.lastUpdated;
      return cachedWalletData!;
    }

    // Rate limit protection - prevent hammering APIs
    // BUT: Allow refetch if we have no NFT collections
    if (now - this.lastApiCall < this.minApiInterval && (cachedWalletData?.nftCollections?.length ?? 0) > 0) {
      return cachedWalletData!;
    }
    this.lastApiCall = now;

    // Fetch fresh data from APIs
    // Use Promise.allSettled to fetch all data in parallel and handle partial failures
    const [xchPriceResult, xchBalanceResult, tokensResult, nftsResult] = await Promise.allSettled([
      fetchXchPrice(),
      fetchXchBalance(),
      fetchTokenBalances(),
      fetchNFTCollections(),
    ]);

    // Extract values with fallbacks
    const xchPrice =
      xchPriceResult.status === 'fulfilled'
        ? xchPriceResult.value
        : localCache?.xchPriceUSD || FALLBACK_DATA.xchPriceUSD;

    const xchData =
      xchBalanceResult.status === 'fulfilled'
        ? xchBalanceResult.value
        : { xch: localCache?.tokens.find((t) => t.id === 'xch')?.amount || 0, mojo: 0 };

    const tokens =
      tokensResult.status === 'fulfilled'
        ? tokensResult.value
        : localCache
          ? localCache.tokens
              .filter((t) => t.id !== 'xch')
              .map((t) => ({
                assetId: t.id,
                name: t.name,
                symbol: t.symbol,
                balance: t.amount,
                valueUsd: t.valueUSD,
                priceUsd: t.priceUSD,
                logoUrl: t.logoURL,
              }))
          : [];

    const nftCollections =
      nftsResult.status === 'fulfilled' ? nftsResult.value : getCachedNFTCollections();

    const totalTokenValue = tokens.reduce((sum, token) => sum + token.valueUsd, 0);

    const walletData: WalletData = {
      xchBalance: xchData.xch,
      xchBalanceMojos: xchData.mojo,
      xchPriceUsd: xchPrice,
      tokens,
      totalTokenValueUsd: totalTokenValue,
      nftCollections,
      lastUpdated: new Date(),
    };

    // Update memory cache
    cachedWalletData = walletData;
    cacheTimestamp = now;

    // Persist to localStorage
    saveCache(convertWalletDataToCache(walletData));

    return walletData;
  }

  getCachedWalletData(): WalletData {
    // First try memory cache
    if (cachedWalletData) {
      return cachedWalletData;
    }

    // Then try localStorage
    const localCache = loadCache();
    if (localCache) {
      cachedWalletData = convertCacheToWalletData(localCache);
      cacheTimestamp = localCache.lastUpdated;
      return cachedWalletData;
    }

    // Return fallback data so UI is never empty
    return getDefaultWalletData();
  }

  isCacheStale(): boolean {
    const localCache = loadCache();
    if (!localCache) return true;
    // Check if we have actual NFTs (not just empty collections)
    const totalNfts = cachedWalletData?.nftCollections?.reduce((sum, c) => sum + (c.nfts?.length ?? 0), 0) ?? 0;
    if (totalNfts === 0) return true;
    return !isCacheFresh(localCache.lastUpdated);
  }

  async getXchPrice(): Promise<number> {
    // Check localStorage - only use if fresh (< 1 hour old)
    const cached = loadCache();
    const MAX_PRICE_AGE = 60 * 60 * 1000; // 1 hour
    const isFresh = cached && (Date.now() - cached.lastUpdated) < MAX_PRICE_AGE;

    if (isFresh && cached.xchPriceUSD > 0) {
      return cached.xchPriceUSD;
    }

    // Cache is stale or missing - fetch fresh price
    return fetchXchPrice();
  }

  getCachedXchPrice(): number {
    const cached = loadCache();
    return cached?.xchPriceUSD || FALLBACK_DATA.xchPriceUSD;
  }

  getWalletExplorerUrl(): string {
    return SPACESCAN_WALLET_URL;
  }

  prefetchWalletData(): void {
    // Check if we already have fresh data
    const localCache = loadCache();
    if (localCache && isCacheFresh(localCache.lastUpdated)) {
      return; // Data is fresh, no need to prefetch
    }

    // Delay startup API calls to avoid rate limits
    setTimeout(() => {
      this.fetchWalletData(false).catch(() => {
        // Background prefetch failed silently - we have fallback data
      });
    }, 5000);
  }
}

// Singleton instance
export const treasuryService = new TreasuryService();
