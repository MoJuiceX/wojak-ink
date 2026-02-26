/**
 * Cache Configuration
 *
 * Defines cache timing based on data volatility.
 * staleTime: How long data is considered "fresh" (no refetch)
 * gcTime: How long to keep inactive data in memory
 */

export const CACHE_CONFIG = {
  // Static data - NFT metadata doesn't change
  static: {
    staleTime: 30 * 60 * 1000, // 30 minutes fresh
    gcTime: 60 * 60 * 1000, // 1 hour in cache
  },

  // Semi-static - changes occasionally
  semiStatic: {
    staleTime: 5 * 60 * 1000, // 5 minutes fresh
    gcTime: 30 * 60 * 1000, // 30 minutes in cache
  },

  // Treasury - refreshes every 5 minutes so new tokens/NFTs show up quickly
  treasury: {
    staleTime: 5 * 60 * 1000, // 5 minutes fresh
    gcTime: 30 * 60 * 1000, // 30 minutes in cache
  },

  // Price data - needs to be relatively fresh
  price: {
    staleTime: 15 * 60 * 1000, // 15 minutes fresh
    gcTime: 60 * 60 * 1000, // 1 hour in cache
  },

  // Volatile - changes frequently
  volatile: {
    staleTime: 60 * 1000, // 1 minute fresh
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
  },

  // Real-time - always fresh
  realtime: {
    staleTime: 0, // Always stale
    gcTime: 5 * 60 * 1000, // 5 minutes in cache
    refetchInterval: 60 * 1000, // Poll every 60 seconds
  },
} as const;

// Apply to specific data types
export const DATA_CACHE_MAP = {
  // NFT data
  nftMetadata: CACHE_CONFIG.static,
  nftTraits: CACHE_CONFIG.static,
  nftHistory: CACHE_CONFIG.semiStatic,

  // Market data
  listings: CACHE_CONFIG.volatile,
  floorPrice: CACHE_CONFIG.volatile,
  marketStats: CACHE_CONFIG.volatile,
  priceHistory: CACHE_CONFIG.semiStatic,

  // Wallet/Treasury data
  walletNFTs: CACHE_CONFIG.semiStatic,
  walletBalance: CACHE_CONFIG.treasury,  // Aggressive caching - treasury rarely changes
  tokenPrices: CACHE_CONFIG.price,       // Price should stay relatively fresh (15 min)

  // Trait data
  traitRarity: CACHE_CONFIG.static,
  traitSales: CACHE_CONFIG.volatile,

  // Leaderboard data
  leaderboard: CACHE_CONFIG.volatile,
} as const;

export type CacheCategory = keyof typeof CACHE_CONFIG;
export type DataCacheKey = keyof typeof DATA_CACHE_MAP;
