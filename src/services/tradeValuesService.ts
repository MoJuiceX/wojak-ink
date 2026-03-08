/**
 * Trade Values Service
 * Fetches trait statistics from Cloudflare Worker API
 * Falls back to local JSON if API unavailable
 */

import traitValuesData from '../data/trait-values.json';
import { loadWfpMetadataLite } from './wfpCollectionData';

// Cloudflare Worker API endpoint
const WORKER_API_URL = 'https://wojak-mobile-trade-fetcher.abitsolvesthis.workers.dev';

// Cache duration: 5 minutes
const CACHE_DURATION_MS = 5 * 60 * 1000;

export interface TraitStats {
  trait_name: string;
  trait_category: string;
  total_sales: number;
  outliers_excluded: number;
  average_xch: number;
  min_xch: number;
  max_xch: number;
  last_trade: string | null;
}

export interface Sale {
  edition: number;
  price_xch: number;
  timestamp: string;
  nftName?: string;
  traits?: Record<string, string>;
}

export interface TradeValuesData {
  trait_stats: TraitStats[];
  all_sales?: Sale[];
  total_sales_count: number;
  last_updated: string | null;
  source?: 'api' | 'local';
  error?: string;
}

export interface TraitSalesData {
  trait_name: string;
  sales: Sale[];
  total_sales: number;
}

// Cache
interface CachedData {
  data: TradeValuesData;
  timestamp: number;
}

let cache: CachedData | null = null;

/**
 * Check if cache is still valid
 */
function isCacheValid(): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < CACHE_DURATION_MS;
}

/**
 * Fetch trait values from Worker API
 */
async function fetchFromAPI(category?: string): Promise<TradeValuesData> {
  const url = category && category !== 'all'
    ? `${WORKER_API_URL}/trait-values?category=${encodeURIComponent(category)}`
    : `${WORKER_API_URL}/trait-values`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    trait_stats: data.trait_stats || [],
    all_sales: data.all_sales,
    total_sales_count: data.total_sales_count || 0,
    last_updated: data.last_updated || null,
    source: 'api',
  };
}

/**
 * Get trait values from local JSON fallback
 */
function getLocalData(category?: string): TradeValuesData {
  let stats = traitValuesData.trait_stats as TraitStats[];

  if (category && category !== 'all') {
    stats = stats.filter(
      t => t.trait_category.toLowerCase() === category.toLowerCase()
    );
  }

  return {
    trait_stats: stats,
    total_sales_count: traitValuesData.total_trades_analyzed,
    last_updated: traitValuesData.generated_at,
    source: 'local',
  };
}

/**
 * Fetch all trait statistics
 * Tries API first, falls back to local JSON
 */
export async function fetchTradeValues(category?: string): Promise<TradeValuesData> {
  // Return cached data if valid and no category filter
  // (category-filtered requests bypass cache for simplicity)
  if (!category && isCacheValid() && cache) {
    return cache.data;
  }

  try {
    // Try fetching from Worker API
    const apiData = await fetchFromAPI(category);

    // Cache full data (only for non-filtered requests)
    if (!category || category === 'all') {
      cache = {
        data: apiData,
        timestamp: Date.now(),
      };
    }

    return apiData;
  } catch (error) {
    console.warn('API fetch failed, using local data:', error);

    // Fall back to local JSON
    const localData = getLocalData(category);
    return localData;
  }
}

/**
 * Force refresh data from API (bypass cache)
 */
export async function refreshTradeValues(): Promise<TradeValuesData> {
  cache = null;
  return fetchTradeValues();
}

// Cache for NFT metadata
let nftMetadataCache: Array<{ edition: number; attributes: Array<{ trait_type: string; value: string }> }> | null = null;

async function loadNftMetadata() {
  if (nftMetadataCache) return nftMetadataCache;

  try {
    nftMetadataCache = await loadWfpMetadataLite();
    return nftMetadataCache;
  } catch (err) {
    console.error('Failed to load NFT metadata:', err);
    return [];
  }
}

/**
 * Fetch sales for a specific trait
 */
export async function fetchTraitSales(traitName: string): Promise<TraitSalesData> {
  // Get all sales from cache or API
  const data = await fetchTradeValues();

  if (!data.all_sales || data.all_sales.length === 0) {
    return {
      trait_name: traitName,
      sales: [],
      total_sales: 0,
    };
  }

  // Load NFT metadata to check traits
  const metadata = await loadNftMetadata();
  if (!metadata || metadata.length === 0) {
    return {
      trait_name: traitName,
      sales: [],
      total_sales: 0,
    };
  }

  // Build a set of edition numbers that have this trait
  const editionsWithTrait = new Set<number>();
  for (const nft of metadata) {
    const hasTrait = nft.attributes?.some(
      attr => attr.value.toLowerCase() === traitName.toLowerCase()
    );
    if (hasTrait) {
      editionsWithTrait.add(nft.edition);
    }
  }

  // Filter sales to only those NFTs that have this trait
  const filteredSales = data.all_sales.filter(sale => editionsWithTrait.has(sale.edition));

  return {
    trait_name: traitName,
    sales: filteredSales,
    total_sales: filteredSales.length,
  };
}

/**
 * Format relative time (e.g., "2h ago", "3d ago")
 */
export function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return '—';

  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Format XCH value
 */
export function formatXCH(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '—';
  return value.toFixed(decimals);
}

// Collection stats interface
export interface CollectionStats {
  supply: number;
  floor_xch: number;
  volume_xch: number;
  trade_count: number;
  market_cap_xch: number;
  collectors: number;
}

// Cache for collection stats (shorter duration since it changes more frequently)
const COLLECTION_STATS_CACHE_DURATION_MS = 2 * 60 * 1000; // 2 minutes
let collectionStatsCache: { data: CollectionStats; timestamp: number } | null = null;

// Use Vite proxy in development to avoid CORS issues
const isDev = import.meta.env.DEV;
const MINTGARDEN_API = isDev ? '/mintgarden-api' : 'https://api.mintgarden.io';

/**
 * Fetch collection statistics from MintGarden API
 */
export async function fetchCollectionStats(): Promise<CollectionStats> {
  // Return cached data if valid
  if (collectionStatsCache && Date.now() - collectionStatsCache.timestamp < COLLECTION_STATS_CACHE_DURATION_MS) {
    return collectionStatsCache.data;
  }

  const COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

  try {
    // Fetch collection stats and listings in parallel
    const [collectionResponse, listingsResponse] = await Promise.all([
      fetch(`${MINTGARDEN_API}/collections/${COLLECTION_ID}`),
      fetch(`${MINTGARDEN_API}/collections/${COLLECTION_ID}/nfts/by_offers?size=10&sort_by=xch_price&require_price=true`)
    ]);

    if (!collectionResponse.ok) {
      throw new Error(`MintGarden API error: ${collectionResponse.status}`);
    }

    const data = await collectionResponse.json();

    // Calculate floor from actual listings (most accurate)
    let floorPrice = 0;
    if (listingsResponse.ok) {
      const listingsData = await listingsResponse.json();
      const items = listingsData.items || [];
      if (items.length > 0) {
        // Get the lowest price from first few listings
        const prices = items
          .map((item: Record<string, unknown>) => (item.xch_price || item.price) as number)
          .filter((p: number) => p > 0);
        if (prices.length > 0) {
          floorPrice = Math.min(...prices);
        }
      }
    }

    // Fallback to collection API floor if no listings found
    if (floorPrice === 0) {
      floorPrice = data.floor || data.floor_price || 0;
    }

    const supply = data.supply || 4200;

    const stats: CollectionStats = {
      supply,
      floor_xch: floorPrice,
      volume_xch: data.volume || 0,
      trade_count: data.trade_count || 0,
      market_cap_xch: floorPrice * supply,
      collectors: data.owners_count || 0,
    };

    // Cache the results
    collectionStatsCache = {
      data: stats,
      timestamp: Date.now(),
    };

    return stats;
  } catch (error) {
    console.error('Failed to fetch collection stats:', error);

    // Return fallback values
    return {
      supply: 4200,
      floor_xch: 4.85,
      volume_xch: 527,
      trade_count: 753,
      market_cap_xch: 20369,
      collectors: 89,
    };
  }
}
