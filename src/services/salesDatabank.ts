/**
 * Sales Databank Service
 *
 * Stores and queries NFT sales history.
 * Used for Gallery History tab and BigPulp trait analysis.
 *
 * Data is stored in localStorage and can be updated incrementally
 * from Parse.bot Dexie scraping.
 */

import { convertSalePrice, getXchPrice } from './historicalPriceService';

// ============ Types ============

export interface RawSaleRecord {
  nftId: number;           // Edition number (1-4200)
  amount: number;          // Original sale amount
  currency: 'XCH' | 'CAT'; // Payment currency
  timestamp: number;       // Unix timestamp (ms)
  traits: Record<string, string>; // NFT traits at time of sale
}

export interface SaleRecord extends RawSaleRecord {
  xchEquivalent: number;   // Normalized to XCH
  usdValue: number;        // USD value at time of sale
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
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.version === DATABANK_VERSION) {
        databank = parsed;
        rebuildIndexes();
      }
      // else: version mismatch, start fresh (silent)
    }
  } catch (error) {
    console.warn('[SalesDatabank] Failed to load:', error);
  }
}

function saveDatabank(): void {
  try {
    databank.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(databank));
  } catch (error) {
    console.warn('[SalesDatabank] Failed to save:', error);
  }
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
 * Import raw sales from Parse.bot
 * Converts prices and adds to databank
 */
export async function importSales(rawSales: RawSaleRecord[]): Promise<number> {
  let addedCount = 0;

  for (const raw of rawSales) {
    // Check for duplicates (same NFT, same timestamp)
    const existing = databank.sales.find(
      s => s.nftId === raw.nftId && s.timestamp === raw.timestamp
    );
    if (existing) continue;

    // Convert price to XCH equivalent and USD
    const priceInfo = await convertSalePrice(
      raw.amount,
      raw.currency,
      new Date(raw.timestamp)
    );

    const sale: SaleRecord = {
      ...raw,
      xchEquivalent: priceInfo.xchEquivalent,
      usdValue: priceInfo.usdValue,
    };

    databank.sales.push(sale);
    addedCount++;
  }

  if (addedCount > 0) {
    rebuildIndexes();
    saveDatabank();
  }

  return addedCount;
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
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get total number of sales
 */
export function getSalesCount(): number {
  return databank.sales.length;
}

/**
 * Fix suspicious CAT token sales with wrong conversion rates
 * This targets sales where CAT amounts were converted with wrong rates
 *
 * Known patterns:
 * - PIZZA sales: 550,000 PIZZA should be ~1.57 XCH, not 25+ XCH
 * - G4M sales: 366,666 G4M should be ~0.64 XCH, not 16+ XCH
 * - SPROUT sales: 110,000 SPROUT should be ~1.02 XCH, not 5+ XCH
 * - Any CAT sale showing >3 XCH with huge original amounts is likely wrong
 */
export async function fixSuspiciousSales(): Promise<number> {
  try {

    let fixedCount = 0;

    // Token rate estimates based on amount ranges
    // Different token types tend to have different value per token
    const getEstimatedRate = (amount: number): number => {
      // SPROUT-like (100k-200k range): ~0.00000932 XCH per token
      if (amount >= 100000 && amount < 200000) return 0.00000932;
      // G4M-like (300k-400k range): ~0.00000175 XCH per token
      if (amount >= 300000 && amount < 500000) return 0.00000175;
      // PIZZA-like (500k+ range): ~0.00000285 XCH per token
      if (amount >= 500000) return 0.00000285;
      // Default conservative rate for unknown ranges
      return 0.000005;
    };

    for (const sale of databank.sales) {
      try {
        if (sale.currency !== 'CAT') continue;

        // Check if this looks like a miscalculated token sale
        // Pattern: huge original amount (>50k) + high XCH equivalent (>2)
        if (sale.amount > 50000 && sale.xchEquivalent > 2) {
          // Use estimated rate based on amount range
          const estimatedRate = getEstimatedRate(sale.amount);
          const newXchEquivalent = sale.amount * estimatedRate;

          // Only fix if the new value is significantly lower (at least 40% reduction)
          if (newXchEquivalent < sale.xchEquivalent * 0.6) {
            const xchPrice = await getXchPrice(new Date(sale.timestamp));


            sale.xchEquivalent = newXchEquivalent;
            sale.usdValue = newXchEquivalent * xchPrice;
            fixedCount++;
          }
        }
      } catch (saleError) {
        console.warn(`[SalesDatabank] Error fixing sale for NFT ${sale.nftId}:`, saleError);
      }
    }

    if (fixedCount > 0) {
      rebuildIndexes();
      saveDatabank();
    }

    return fixedCount;
  } catch (error) {
    console.error('[SalesDatabank] Error in fixSuspiciousSales:', error);
    return 0;
  }
}
