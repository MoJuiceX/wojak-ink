/**
 * Sales History Hook
 *
 * Provides access to NFT sales history data from the salesDatabank.
 * Data is synced from server-side D1 via SalesProvider.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  initializeSalesDatabank,
  getSalesForNft,
  nftHasSales,
  getRecentSales,
  getOverallStats,
  getSalesCount,
  loadFromServer,
  type SaleRecord,
} from '@/services/salesDatabank';
import { markSyncComplete, getHoursSinceLastSync } from '@/providers/SalesProvider';

interface UseSalesHistoryResult {
  // Sales for a specific NFT
  getSales: (nftId: number) => SaleRecord[];
  hasSales: (nftId: number) => boolean;

  // Global data
  recentSales: SaleRecord[];
  totalSales: number;
  stats: {
    totalSales: number;
    totalVolumeXch: number;
    avgPriceXch: number;
    uniqueNftsSold: number;
  };

  // Sync status
  isSyncing: boolean;
  lastSyncError: string | null;
  hoursSinceLastSync: number;
  syncSales: () => Promise<void>;
}

// Module-level initialization flag
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize the sales databank once
 */
async function ensureInitialized(): Promise<void> {
  if (isInitialized) return;

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    initializeSalesDatabank();
    isInitialized = true;
  })();

  return initializationPromise;
}

/**
 * Hook for accessing NFT sales history
 */
export function useSalesHistory(): UseSalesHistoryResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Initialize databank on mount
  useEffect(() => {
    ensureInitialized();
  }, []);

  // Get sales for a specific NFT
  const getSales = useCallback((nftId: number): SaleRecord[] => {
    return getSalesForNft(nftId);
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if NFT has sales
  const hasSales = useCallback((nftId: number): boolean => {
    return nftHasSales(nftId);
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync sales from server-side D1 database
  const syncSales = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setLastSyncError(null);

    try {
      await ensureInitialized();
      await loadFromServer();
      markSyncComplete();
      setRefreshKey(k => k + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      setLastSyncError(message);
      console.error('[useSalesHistory] Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Get hours since last sync
  const hoursSinceLastSync = getHoursSinceLastSync();

  // Get recent sales
  const recentSales = getRecentSales(10);

  // Get total sales count
  const totalSales = getSalesCount();

  // Get overall stats
  const stats = getOverallStats();

  return {
    getSales,
    hasSales,
    recentSales,
    totalSales,
    stats,
    isSyncing,
    lastSyncError,
    hoursSinceLastSync,
    syncSales,
  };
}

/**
 * Hook for getting sales for a specific NFT
 * More efficient when you only need one NFT's data
 */
export function useNftSales(nftId: number): {
  sales: SaleRecord[];
  hasSales: boolean;
  isLoading: boolean;
  lastSale: SaleRecord | null;
} {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    queueMicrotask(() => setIsLoading(true));
    ensureInitialized().then(() => {
      setSales(getSalesForNft(nftId));
      setIsLoading(false);
    });
  }, [nftId]);

  return {
    sales,
    hasSales: sales.length > 0,
    isLoading,
    lastSale: sales[0] || null,
  };
}

export default useSalesHistory;
