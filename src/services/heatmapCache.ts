/**
 * Heatmap Cache Service
 *
 * Implements stale-while-revalidate pattern with localStorage persistence.
 * Provides resilient data access when API is unavailable or rate-limited.
 *
 * Strategy:
 * 1. On page load, immediately return cached data if available
 * 2. Attempt to fetch fresh data in background
 * 3. On success, update cache and UI with new data
 * 4. On failure, continue showing cached data with staleness indicator
 */

import type { HeatMapCell } from '@/types/bigpulp';
import { safeStorage } from '@/utils/safeStorage';

// ============ Types ============

interface CachedHeatmapData {
  version: number; // Schema version for cache invalidation
  data: HeatMapCell[][];
  timestamp: number; // When data was fetched
  priceBinConfig: {
    floor: number;
    p90: number;
    increment: number;
    boundaries: number[];
    labels: string[];
  };
}

export interface CacheMetadata {
  lastUpdated: Date;
  isStale: boolean;
  ageMinutes: number;
  source: 'live' | 'cache';
}

// ============ Constants ============

const CACHE_KEY = 'wojak_heatmap_cache_v1';
const CACHE_VERSION = 1;

// Cache is considered stale after 30 minutes
const STALE_THRESHOLD_MS = 30 * 60 * 1000;

// Cache expires completely after 24 hours (force refresh)
const EXPIRY_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// ============ Cache Operations ============

/**
 * Save heatmap data to localStorage with metadata
 */
export function saveHeatmapToCache(
  data: HeatMapCell[][],
  priceBinConfig?: {
    floor: number;
    p90: number;
    increment: number;
    boundaries: number[];
    labels: string[];
  }
): void {
  const cached: CachedHeatmapData = {
    version: CACHE_VERSION,
    data,
    timestamp: Date.now(),
    priceBinConfig: priceBinConfig || extractPriceBinConfig(data),
  };
  safeStorage.setJSON(CACHE_KEY, cached);
}

/**
 * Extract price bin configuration from heatmap data
 */
function extractPriceBinConfig(data: HeatMapCell[][]): CachedHeatmapData['priceBinConfig'] {
  if (!data || data.length === 0 || !data[0]) {
    return {
      floor: 0,
      p90: 10,
      increment: 1,
      boundaries: [0, 1, 2, 3, 4, 5, 6, 10, Infinity],
      labels: ['0-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-10', '10+'],
    };
  }

  const priceBins = data[0].map(cell => cell.priceBin);
  const boundaries = priceBins.map(bin => bin.minPrice);
  boundaries.push(priceBins[priceBins.length - 1]?.maxPrice ?? Infinity);
  const labels = priceBins.map(bin => bin.label);

  // Estimate floor and increment from boundaries
  const floor = boundaries[0];
  const increment = boundaries.length > 1 ? boundaries[1] - boundaries[0] : 1;
  const p90 = boundaries[boundaries.length - 2] ?? 10;

  return { floor, p90, increment, boundaries, labels };
}

/**
 * Load heatmap data from localStorage
 * Returns null if no cache, expired, or schema mismatch
 */
export function loadHeatmapFromCache(): CachedHeatmapData | null {
  const cached = safeStorage.getJSON<CachedHeatmapData | null>(CACHE_KEY, null);
  if (!cached) return null;

  // Check schema version
  if (cached.version !== CACHE_VERSION) {
    clearHeatmapCache();
    return null;
  }

  // Check if completely expired (24 hours)
  const age = Date.now() - cached.timestamp;
  if (age > EXPIRY_THRESHOLD_MS) {
    clearHeatmapCache();
    return null;
  }

  return cached;
}

/**
 * Get cache metadata (staleness, age, etc.)
 */
export function getCacheMetadata(cached: CachedHeatmapData | null): CacheMetadata {
  if (!cached) {
    return {
      lastUpdated: new Date(),
      isStale: true,
      ageMinutes: 0,
      source: 'live',
    };
  }

  const age = Date.now() - cached.timestamp;
  const ageMinutes = Math.floor(age / 60000);
  const isStale = age > STALE_THRESHOLD_MS;

  return {
    lastUpdated: new Date(cached.timestamp),
    isStale,
    ageMinutes,
    source: 'cache',
  };
}

/**
 * Clear the heatmap cache
 */
export function clearHeatmapCache(): void {
  safeStorage.removeItem(CACHE_KEY);
}

/**
 * Check if we have valid cached data
 */
export function hasCachedHeatmap(): boolean {
  return loadHeatmapFromCache() !== null;
}

/**
 * Format cache age for display
 */
export function formatCacheAge(ageMinutes: number): string {
  if (ageMinutes < 1) return 'just now';
  if (ageMinutes === 1) return '1 minute ago';
  if (ageMinutes < 60) return `${ageMinutes} minutes ago`;

  const hours = Math.floor(ageMinutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

// ============ Integration Helpers ============

/**
 * Create a query function that uses cache as fallback
 * This wraps the original fetch function with cache logic
 */
export function createCachedHeatmapFetcher(
  fetchFn: () => Promise<HeatMapCell[][]>
): () => Promise<{ data: HeatMapCell[][]; metadata: CacheMetadata }> {
  return async () => {
    const cached = loadHeatmapFromCache();

    try {
      // Attempt to fetch fresh data
      const freshData = await fetchFn();

      // Success! Save to cache and return
      saveHeatmapToCache(freshData);

      return {
        data: freshData,
        metadata: {
          lastUpdated: new Date(),
          isStale: false,
          ageMinutes: 0,
          source: 'live' as const,
        },
      };
    } catch (error) {
      console.warn('[HeatmapCache] Fetch failed, using cached data:', error);

      // Fetch failed - use cache if available
      if (cached) {
        const metadata = getCacheMetadata(cached);
        return {
          data: cached.data,
          metadata: { ...metadata, source: 'cache' as const },
        };
      }

      // No cache available - rethrow the error
      throw error;
    }
  };
}

/**
 * Get initial data from cache for TanStack Query
 * This enables instant display while fresh data loads
 */
export function getInitialHeatmapData(): HeatMapCell[][] | undefined {
  const cached = loadHeatmapFromCache();
  if (cached) {
    return cached.data;
  }
  return undefined;
}
