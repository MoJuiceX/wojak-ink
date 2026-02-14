/* eslint-disable react-refresh/only-export-components */
/**
 * Sales Provider
 *
 * Initializes the sales databank from localStorage cache.
 * Syncs from server-side D1 database (populated by fetch-sales worker).
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { initializeSalesDatabank, loadFromServer } from '@/services/salesDatabank';

interface SalesProviderProps {
  children: React.ReactNode;
}

// Storage key for last sync timestamp
const LAST_SYNC_KEY = 'wojak_sales_last_sync';

// Get hours since last sync
export function getHoursSinceLastSync(): number {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  if (!lastSync) return Infinity;
  const hours = (Date.now() - parseInt(lastSync, 10)) / (1000 * 60 * 60);
  return hours;
}

// Mark sync as complete
export function markSyncComplete(): void {
  localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
}

export function SalesProvider({ children }: SalesProviderProps) {
  const hasInitialized = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Initialize databank from localStorage (instant, offline-capable)
    initializeSalesDatabank();

    // Sync from server immediately (don't delay — BigPulp queries need this data)
    (async () => {
      try {
        const serverAdded = await loadFromServer();

        if (serverAdded > 0) {
          markSyncComplete();
          // Force refetch all bigpulp queries with fresh data
          queryClient.invalidateQueries({ queryKey: ['bigpulp'] });
        }
      } catch (error) {
        console.error('[SalesProvider] Sync failed:', error);
      }
    })();
  }, [queryClient]);

  return <>{children}</>;
}

export default SalesProvider;
