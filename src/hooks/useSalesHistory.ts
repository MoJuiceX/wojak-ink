/**
 * useSalesHistory Hook
 *
 * React hook for accessing NFT sales history from the databank.
 * Used in Gallery History tab and BigPulp trait analysis.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  initializeSalesDatabank,
  getSalesForNft,
  getTraitStats,
  getAllTraitStats,
  getOverallStats,
  getSalesCount,
  type SaleRecord,
  type TraitSaleStats,
} from '@/services/salesDatabank';
import { initializePriceService } from '@/services/historicalPriceService';

// Track initialization
let isInitialized = false;
let initPromise: Promise<void> | null = null;

async function initialize(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await initializePriceService();
    initializeSalesDatabank();
    isInitialized = true;
  })();

  return initPromise;
}

/**
 * Hook to get sales history for a specific NFT
 */
export function useSalesHistory(nftId: number) {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSales, setHasSales] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      await initialize();
      if (!mounted) return;

      const nftSales = getSalesForNft(nftId);
      setSales(nftSales);
      setHasSales(nftSales.length > 0);
      setIsLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [nftId]);

  return { sales, isLoading, hasSales };
}

/**
 * Hook to get trait statistics for BigPulp analysis
 */
export function useTraitStats(category: string, value?: string) {
  const [stats, setStats] = useState<TraitSaleStats | TraitSaleStats[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      await initialize();
      if (!mounted) return;

      if (value) {
        // Get stats for specific trait value
        const traitStats = getTraitStats(category, value);
        setStats(traitStats);
      } else {
        // Get stats for all values in category
        const allStats = getAllTraitStats(category);
        setStats(allStats);
      }
      setIsLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [category, value]);

  return { stats, isLoading };
}

/**
 * Hook to get overall sales statistics
 */
export function useOverallStats() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalVolumeXch: 0,
    avgPriceXch: 0,
    uniqueNftsSold: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      await initialize();
      if (!mounted) return;

      const overallStats = getOverallStats();
      setStats(overallStats);
      setIsLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  // Refresh function
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await initialize();
    const overallStats = getOverallStats();
    setStats(overallStats);
    setIsLoading(false);
  }, []);

  return { stats, isLoading, refresh };
}

/**
 * Hook to check if databank has any data
 */
export function useSalesDatabank() {
  const [salesCount, setSalesCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      await initialize();
      if (!mounted) return;

      setSalesCount(getSalesCount());
      setIsInitialized(true);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return { salesCount, isInitialized };
}

export type { SaleRecord, TraitSaleStats };
