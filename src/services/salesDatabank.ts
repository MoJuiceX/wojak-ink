/**
 * Sales Databank Service
 *
 * Stores and queries NFT sales history.
 * Used for Gallery History tab and BigPulp trait analysis.
 *
 * Server-side D1 database is the source of truth (populated by fetch-sales worker).
 * This service caches data in localStorage for offline access and fast reads.
 */

import { safeStorage } from '@/utils/safeStorage';

// ============ Types ============

export interface SaleRecord {
  nftId: number;           // Edition number (1-4200)
  amount: number;          // Original sale amount
  currency: 'XCH' | 'CAT'; // Payment currency
  timestamp: number;       // Unix timestamp (ms)
  traits: Record<string, string>; // NFT traits at time of sale
  xchEquivalent: number;   // Normalized to XCH
  usdValue: number;        // USD value at time of sale
  tokenCode: string | null;  // CAT token symbol (e.g. "BEPE", "🪄⚡️")
  catXchRate: number | null; // XCH rate used for conversion
}

export interface SalesDatabank {
  sales: SaleRecord[];
  lastUpdated: string;
  version: number;
}

export interface TraitSaleStats {
  traitCategory: string;
  traitValue: string;
  totalSales: number;
  avgPriceXch: number;
  minPriceXch: number;
  maxPriceXch: number;
  totalVolumeXch: number;
}

// ============ Constants ============

const STORAGE_KEY = 'wojak_sales_databank_v1';
const DATABANK_VERSION = 1;

// ============ State ============

let databank: SalesDatabank = {
  sales: [],
  lastUpdated: '',
  version: DATABANK_VERSION,
};

// Index for fast lookups
const salesByNftId: Map<number, SaleRecord[]> = new Map();
const salesByTrait: Map<string, SaleRecord[]> = new Map(); // "category:value" -> sales

// ============ Persistence ============

function loadDatabank(): void {
  const stored = safeStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.version === DATABANK_VERSION) {
        databank = parsed;
        rebuildIndexes();
      }
    } catch (error) {
      console.warn('[SalesDatabank] Failed to parse:', error);
    }
  }
}

function saveDatabank(): void {
  databank.lastUpdated = new Date().toISOString();
  safeStorage.setJSON(STORAGE_KEY, databank);
}

function rebuildIndexes(): void {
  salesByNftId.clear();
  salesByTrait.clear();

  for (const sale of databank.sales) {
    // Index by NFT ID
    if (!salesByNftId.has(sale.nftId)) {
      salesByNftId.set(sale.nftId, []);
    }
    salesByNftId.get(sale.nftId)!.push(sale);

    // Index by traits
    for (const [category, value] of Object.entries(sale.traits)) {
      const key = `${category}:${value}`;
      if (!salesByTrait.has(key)) {
        salesByTrait.set(key, []);
      }
      salesByTrait.get(key)!.push(sale);
    }
  }

  // Sort each NFT's sales by date (newest first)
  for (const sales of salesByNftId.values()) {
    sales.sort((a, b) => b.timestamp - a.timestamp);
  }
}

// ============ Public API ============

/**
 * Initialize the sales databank
 */
export function initializeSalesDatabank(): void {
  loadDatabank();
}

/**
 * Get all sales for a specific NFT
 * Returns newest first
 */
export function getSalesForNft(nftId: number): SaleRecord[] {
  return salesByNftId.get(nftId) || [];
}

/**
 * Check if an NFT has any sales
 */
export function nftHasSales(nftId: number): boolean {
  return salesByNftId.has(nftId) && salesByNftId.get(nftId)!.length > 0;
}

/**
 * Get all sales for NFTs with a specific trait
 */
export function getSalesForTrait(category: string, value: string): SaleRecord[] {
  const key = `${category}:${value}`;
  return salesByTrait.get(key) || [];
}

/**
 * Calculate statistics for a specific trait value
 * Used for BigPulp trait analysis
 */
export function getTraitStats(category: string, value: string): TraitSaleStats | null {
  const sales = getSalesForTrait(category, value);
  if (sales.length === 0) return null;

  const prices = sales.map(s => s.xchEquivalent);
  const totalVolume = prices.reduce((sum, p) => sum + p, 0);

  return {
    traitCategory: category,
    traitValue: value,
    totalSales: sales.length,
    avgPriceXch: totalVolume / sales.length,
    minPriceXch: Math.min(...prices),
    maxPriceXch: Math.max(...prices),
    totalVolumeXch: totalVolume,
  };
}

/**
 * Get stats for all trait values in a category
 * Returns sorted by average price (highest first)
 */
export function getAllTraitStats(category: string): TraitSaleStats[] {
  const stats: TraitSaleStats[] = [];
  const seenValues = new Set<string>();

  for (const sale of databank.sales) {
    const value = sale.traits[category];
    if (value && !seenValues.has(value)) {
      seenValues.add(value);
      const traitStats = getTraitStats(category, value);
      if (traitStats) {
        stats.push(traitStats);
      }
    }
  }

  // Sort by average price descending
  stats.sort((a, b) => b.avgPriceXch - a.avgPriceXch);
  return stats;
}

/**
 * Get overall sales statistics
 */
export function getOverallStats(): {
  totalSales: number;
  totalVolumeXch: number;
  avgPriceXch: number;
  uniqueNftsSold: number;
} {
  if (databank.sales.length === 0) {
    return {
      totalSales: 0,
      totalVolumeXch: 0,
      avgPriceXch: 0,
      uniqueNftsSold: 0,
    };
  }

  const totalVolume = databank.sales.reduce((sum, s) => sum + s.xchEquivalent, 0);
  const uniqueNfts = new Set(databank.sales.map(s => s.nftId)).size;

  return {
    totalSales: databank.sales.length,
    totalVolumeXch: totalVolume,
    avgPriceXch: totalVolume / databank.sales.length,
    uniqueNftsSold: uniqueNfts,
  };
}

/**
 * Get recent sales across all NFTs
 */
export function getRecentSales(limit: number = 10): SaleRecord[] {
  return [...databank.sales]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Load sales from the server-side D1 database.
 * Hydrates the in-memory databank, deduplicates, and caches to localStorage.
 * Returns the number of new sales added.
 */
export async function loadFromServer(): Promise<number> {
  try {
    const response = await fetch('/api/sales/history?limit=5000&sort=newest');
    if (!response.ok) {
      console.warn('[SalesDatabank] Server fetch failed:', response.status);
      return 0;
    }

    const data = await response.json() as {
      items: Array<{
        nftId: number;
        amount: number;
        currency: 'XCH' | 'CAT';
        timestamp: number;
        traits: Record<string, string>;
        xchEquivalent: number;
        usdValue: number;
        tokenCode: string | null;
        catXchRate: number | null;
      }>;
      total: number;
    };

    if (!data.items || data.items.length === 0) return 0;

    let addedCount = 0;

    for (const item of data.items) {
      // Deduplicate by nftId + timestamp
      const existing = databank.sales.find(
        s => s.nftId === item.nftId && s.timestamp === item.timestamp
      );
      if (existing) continue;

      databank.sales.push({
        nftId: item.nftId,
        amount: item.amount,
        currency: item.currency,
        timestamp: item.timestamp,
        traits: item.traits || {},
        xchEquivalent: item.xchEquivalent,
        usdValue: item.usdValue || 0,
        tokenCode: item.tokenCode ?? null,
        catXchRate: item.catXchRate ?? null,
      });
      addedCount++;
    }

    if (addedCount > 0) {
      rebuildIndexes();
      saveDatabank();
    }

    return addedCount;
  } catch (error) {
    console.warn('[SalesDatabank] Server load failed, using localStorage:', error);
    return 0;
  }
}

/**
 * Export databank for backup
 */
export function exportDatabank(): SalesDatabank {
  return { ...databank };
}

/**
 * Import databank from backup
 */
export function importDatabank(data: SalesDatabank): void {
  databank = data;
  databank.version = DATABANK_VERSION;
  rebuildIndexes();
  saveDatabank();
}

/**
 * Clear all sales data
 */
export function clearDatabank(): void {
  databank = {
    sales: [],
    lastUpdated: '',
    version: DATABANK_VERSION,
  };
  salesByNftId.clear();
  salesByTrait.clear();
  safeStorage.removeItem(STORAGE_KEY);
}

/**
 * Get total number of sales
 */
export function getSalesCount(): number {
  return databank.sales.length;
}

