/**
 * BigPulp Data Hooks
 *
 * TanStack Query hooks for BigPulp intelligence data.
 * Implements stale-while-revalidate with localStorage persistence for resilience.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { bigpulpService } from '@/services/bigpulpService';
import { DATA_CACHE_MAP } from '@/config/query/cacheConfig';
import {
  loadHeatmapFromCache,
  saveHeatmapToCache,
  getCacheMetadata,
  formatCacheAge,
} from '@/services/heatmapCache';
import type { CacheMetadata } from '@/services/heatmapCache';
import type { HeatMapCell } from '@/types/bigpulp';

// Re-export cache utilities for external use
export { formatCacheAge };
export type { CacheMetadata };

// Query keys
export const bigPulpKeys = {
  all: ['bigpulp'] as const,
  market: () => [...bigPulpKeys.all, 'market'] as const,
  marketStats: () => [...bigPulpKeys.market(), 'stats'] as const,
  heatMap: () => [...bigPulpKeys.market(), 'heatmap'] as const,
  priceDistribution: () => [...bigPulpKeys.market(), 'distribution'] as const,
  attributes: () => [...bigPulpKeys.all, 'attributes'] as const,
  topSales: () => [...bigPulpKeys.all, 'topSales'] as const,
  rarestFinds: () => [...bigPulpKeys.all, 'rarestFinds'] as const,
  analysis: (id: number) => [...bigPulpKeys.all, 'analysis', id] as const,
} as const;

/**
 * Fetch market stats
 */
export function useBigPulpMarketStats() {
  return useQuery({
    queryKey: bigPulpKeys.marketStats(),
    queryFn: () => bigpulpService.getMarketStats(),
    ...DATA_CACHE_MAP.marketStats,
  });
}

/**
 * Fetch heat map data with localStorage persistence
 *
 * Implements stale-while-revalidate pattern:
 * 1. Return cached data immediately (if available)
 * 2. Fetch fresh data in background
 * 3. Update cache on success
 * 4. Fall back to cache on API failure
 */
export function useBigPulpHeatMap(enabled = true) {
  // Load initial data from cache for instant display
  const cachedData = useMemo(() => {
    const cached = loadHeatmapFromCache();
    return cached?.data;
  }, []);

  const query = useQuery({
    queryKey: bigPulpKeys.heatMap(),
    queryFn: async (): Promise<HeatMapCell[][]> => {
      try {
        const freshData = await bigpulpService.getHeatMapData();
        // Save fresh data to cache on success
        saveHeatmapToCache(freshData);
        return freshData;
      } catch (error) {
        // On failure, try to use cached data
        const cached = loadHeatmapFromCache();
        if (cached) {
          return cached.data;
        }
        // No cache available, rethrow
        throw error;
      }
    },
    // Use cached data as placeholder while fetching
    placeholderData: cachedData,
    // Keep data fresh for 5 minutes, then refetch in background
    ...DATA_CACHE_MAP.priceHistory,
    // Retry with exponential backoff on failure
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    enabled,
  });

  return query;
}

/**
 * Get heatmap cache metadata (staleness, age, source)
 * Use this to show "Last updated X ago" or "Using cached data" indicators
 */
export function useHeatmapCacheMetadata(): CacheMetadata | null {
  return useMemo(() => {
    const cached = loadHeatmapFromCache();
    if (!cached) return null;
    return getCacheMetadata(cached);
  }, []);
}

/**
 * Fetch price distribution
 */
export function useBigPulpPriceDistribution(enabled = true) {
  return useQuery({
    queryKey: bigPulpKeys.priceDistribution(),
    queryFn: () => bigpulpService.getPriceDistribution(),
    ...DATA_CACHE_MAP.marketStats,
    enabled,
  });
}

/**
 * Fetch attribute stats (merges live sales with static data)
 */
export function useBigPulpAttributes(enabled = true) {
  return useQuery({
    queryKey: bigPulpKeys.attributes(),
    queryFn: () => bigpulpService.getAttributeStats(),
    ...DATA_CACHE_MAP.traitSales, // Volatile - refresh often for live sales
    enabled,
  });
}

/**
 * Fetch top sales
 */
export function useBigPulpTopSales(enabled = true) {
  return useQuery({
    queryKey: bigPulpKeys.topSales(),
    queryFn: () => bigpulpService.getTopSales(),
    ...DATA_CACHE_MAP.listings, // Volatile
    enabled,
  });
}

/**
 * Fetch rarest finds
 */
export function useBigPulpRarestFinds(enabled = true) {
  return useQuery({
    queryKey: bigPulpKeys.rarestFinds(),
    queryFn: () => bigpulpService.getRarestFinds(),
    ...DATA_CACHE_MAP.nftMetadata, // Static
    enabled,
  });
}

/**
 * Search for NFT analysis
 */
export function useBigPulpAnalysis(id: number | null) {
  return useQuery({
    queryKey: bigPulpKeys.analysis(id!),
    queryFn: () => bigpulpService.searchNFT(id!),
    ...DATA_CACHE_MAP.nftMetadata,
    enabled: id !== null && id >= 1 && id <= 4200,
  });
}

/**
 * Mutation for searching NFT (imperative)
 */
export function useSearchNFTMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => bigpulpService.searchNFT(id),
    onSuccess: (data, id) => {
      // Cache the result
      if (data) {
        queryClient.setQueryData(bigPulpKeys.analysis(id), data);
      }
    },
  });
}

/**
 * Mutation for random analysis
 */
export function useRandomAnalysisMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => bigpulpService.getRandomAnalysis(),
    onSuccess: (data) => {
      // Extract ID and cache
      const id = parseInt(data.nft.id.replace('WFP-', ''), 10);
      queryClient.setQueryData(bigPulpKeys.analysis(id), data);
    },
  });
}

/**
 * Combined market data hook
 */
export function useBigPulpMarketData() {
  const stats = useBigPulpMarketStats();
  const heatMap = useBigPulpHeatMap();
  const distribution = useBigPulpPriceDistribution();

  return {
    stats: stats.data ?? null,
    heatMapData: heatMap.data ?? null,
    priceDistribution: distribution.data ?? null,
    isLoading: stats.isLoading || heatMap.isLoading || distribution.isLoading,
    error: stats.error || heatMap.error || distribution.error,
  };
}

/**
 * Combined ask tab data hook
 */
export function useBigPulpAskData() {
  const topSales = useBigPulpTopSales();
  const rarestFinds = useBigPulpRarestFinds();

  return {
    topSales: topSales.data ?? [],
    rarestFinds: rarestFinds.data ?? [],
    isLoading: topSales.isLoading || rarestFinds.isLoading,
    error: topSales.error || rarestFinds.error,
  };
}
