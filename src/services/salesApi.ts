/**
 * Sales History API Service
 *
 * Fetches completed NFT trades from Dexie
 * Indexes by trait for analytics calculations
 *
 * NOTE: Dexie's collection filter doesn't work reliably for trades,
 * so we fetch and filter client-side using our NFT metadata
 */

import { COLLECTION_ID } from './marketApi';
import { dexieQueue } from '../utils/rateLimiter';
import { loadWfpMetadataLite } from './wfpCollectionData';

const DEXIE_API = 'https://api.dexie.space/v1';

export interface NFTTrade {
  nftId: string;
  priceXch: number;
  timestamp: number;
  timestampISO: string;
  tradeId: string;
  source: 'dexie';
}

export interface TraitSalesData {
  trait: string;
  category: string;
  totalSales: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  recentSales: NFTTrade[];
}

export interface SalesIndexResult {
  trades: NFTTrade[];
  byNftId: Map<string, NFTTrade[]>;
  byTrait: Map<string, TraitSalesData>;
  totalTrades: number;
  lastUpdated: Date;
}

// Cache for sales data
interface SalesCache {
  data: SalesIndexResult | null;
  timestamp: number;
  loading: Promise<SalesIndexResult> | null;
}

const salesCache: SalesCache = {
  data: null,
  timestamp: 0,
  loading: null
};

// Cache duration: 1 hour (sales data is historical, doesn't change often)
const CACHE_DURATION = 60 * 60 * 1000;

// LocalStorage key for persistent cache
const SALES_CACHE_KEY = 'wojak_sales_index_v1';

// Shape of a single item in trade.offered / trade.requested from Dexie API
interface DexieTradeItem {
  type?: string;
  asset_id?: string | null;
  edition?: number | string | null;
  name?: string;
  amount?: number;
}

// Shape of a trade record from Dexie API
interface DexieTrade {
  offered?: DexieTradeItem[];
  requested?: DexieTradeItem[];
  price?: number;
  date_completed?: string | number;
  date_created?: string | number;
  status?: number;
  id?: string;
}

/**
 * Convert mojos to XCH
 */
function mojosToXch(mojos: number): number {
  if (mojos >= 1e9) {
    return mojos / 1e12;
  }
  return mojos;
}

/**
 * Extract NFT ID from trade object
 */
function extractNftIdFromTrade(trade: DexieTrade): string | null {
  // Check offered array
  for (const item of (trade.offered || [])) {
    if (item.type === 'nft' || item.asset_id === COLLECTION_ID) {
      if (item.edition != null) {
        const num = parseInt(String(item.edition), 10);
        if (num >= 1 && num <= 4200) return String(num);
      }
      if (item.name) {
        const match = item.name.match(/#(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= 1 && num <= 4200) return String(num);
        }
      }
    }
  }

  // Check requested array
  for (const item of (trade.requested || [])) {
    if (item.type === 'nft' || item.asset_id === COLLECTION_ID) {
      if (item.edition != null) {
        const num = parseInt(String(item.edition), 10);
        if (num >= 1 && num <= 4200) return String(num);
      }
      if (item.name) {
        const match = item.name.match(/#(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= 1 && num <= 4200) return String(num);
        }
      }
    }
  }

  return null;
}

/**
 * Extract price from trade object
 */
function extractPriceFromTrade(trade: DexieTrade): number | null {
  // Direct price field
  if (trade.price && trade.price > 0) {
    return mojosToXch(trade.price);
  }

  // Check which side has the NFT, get XCH from the other side
  const offeredHasNft = (trade.offered || []).some(
    (i: DexieTradeItem) => i.type === 'nft' || i.asset_id === COLLECTION_ID
  );

  const xchSide = offeredHasNft ? trade.requested : trade.offered;

  for (const item of (xchSide || [])) {
    if (item.asset_id === 'xch' || item.asset_id === null || item.type === 'xch') {
      if (item.amount && item.amount > 0) {
        return mojosToXch(item.amount);
      }
    }
  }

  return null;
}

/**
 * Extract timestamp from trade object
 */
function extractTimestamp(trade: DexieTrade): number | null {
  const dateStr = trade.date_completed || trade.date_created;
  if (!dateStr) return null;

  if (typeof dateStr === 'string') {
    return Date.parse(dateStr);
  }
  if (typeof dateStr === 'number') {
    // If too small, assume seconds
    return dateStr > 10_000_000_000 ? dateStr : dateStr * 1000;
  }
  return null;
}

/**
 * Fetch completed trades from Dexie
 * Uses shared rate limiter to prevent 429 errors
 */
async function fetchDexieTrades(maxPages = 50): Promise<NFTTrade[]> {
  const trades: NFTTrade[] = [];
  let page = 1;


  try {
    while (page <= maxPages) {
      const url = new URL(`${DEXIE_API}/offers`);
      url.searchParams.set('type', 'nft');
      url.searchParams.set('collection', COLLECTION_ID);
      url.searchParams.set('status', '4'); // Completed trades only
      url.searchParams.set('page_size', '100');
      url.searchParams.set('page', String(page));

      // Use rate-limited fetch
      const data = await dexieQueue.add(async () => {
        const response = await fetch(url.toString());
        if (!response.ok) {
          const error = new Error(`Dexie fetch failed: ${response.status}`) as Error & { status: number };
          error.status = response.status;
          throw error;
        }
        return response.json() as Promise<{ offers?: DexieTrade[] }>;
      });

      const offers: DexieTrade[] = data.offers || [];

      if (offers.length === 0) break;

      for (const offer of offers) {
        if (offer.status !== 4) continue; // Only completed

        const nftId = extractNftIdFromTrade(offer);
        const priceXch = extractPriceFromTrade(offer);
        const timestamp = extractTimestamp(offer);

        if (nftId && priceXch && timestamp) {
          trades.push({
            nftId,
            priceXch,
            timestamp,
            timestampISO: new Date(timestamp).toISOString(),
            tradeId: offer.id || `dexie-${nftId}-${timestamp}`,
            source: 'dexie'
          });
        }
      }


      page++;
    }

  } catch (error) {
    console.error('[SalesAPI] Dexie error:', error);
  }

  return trades;
}

// NFT metadata shape from metadata.json
interface NFTMetadataItem {
  name?: string;
  edition?: number;
  attributes?: Array<{ trait_type: string; value: string }>;
}

/**
 * Load NFT metadata for trait lookups
 */
async function loadNftMetadata(): Promise<Map<string, NFTMetadataItem>> {
  try {
    const data = await loadWfpMetadataLite() as NFTMetadataItem[];

    const metadataMap = new Map<string, NFTMetadataItem>();
    for (const nft of data) {
      // Extract ID from name or edition
      const match = nft.name?.match(/#(\d+)/);
      const id = match ? match[1] : String(nft.edition);
      if (id) {
        metadataMap.set(id, nft);
      }
    }

    return metadataMap;
  } catch (error) {
    console.error('[SalesAPI] Failed to load metadata:', error);
    return new Map();
  }
}

/**
 * Build trait sales index from trades and metadata
 */
function buildTraitIndex(
  trades: NFTTrade[],
  metadata: Map<string, NFTMetadataItem>
): Map<string, TraitSalesData> {
  const traitSales = new Map<string, { prices: number[]; trades: NFTTrade[] }>();

  for (const trade of trades) {
    const nftMeta = metadata.get(trade.nftId);
    if (!nftMeta || !nftMeta.attributes) continue;

    for (const attr of nftMeta.attributes) {
      const key = `${attr.trait_type}:${attr.value}`;

      if (!traitSales.has(key)) {
        traitSales.set(key, { prices: [], trades: [] });
      }

      const entry = traitSales.get(key)!;
      entry.prices.push(trade.priceXch);
      entry.trades.push(trade);
    }
  }

  // Calculate stats for each trait
  const result = new Map<string, TraitSalesData>();

  for (const [key, data] of traitSales.entries()) {
    const [category, trait] = key.split(':');
    const prices = data.prices;

    if (prices.length === 0) continue;

    result.set(key, {
      trait,
      category,
      totalSales: prices.length,
      avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      recentSales: data.trades
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10)
    });
  }

  return result;
}

/**
 * Load cached sales data from localStorage
 */
function loadCachedSales(): SalesIndexResult | null {
  try {
    const cached = localStorage.getItem(SALES_CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached);
    const age = Date.now() - data.timestamp;

    // Cache valid for 24 hours
    if (age > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(SALES_CACHE_KEY);
      return null;
    }

    // Reconstruct Maps
    return {
      trades: data.trades,
      byNftId: new Map(data.byNftIdArray),
      byTrait: new Map(data.byTraitArray),
      totalTrades: data.totalTrades,
      lastUpdated: new Date(data.timestamp)
    };
  } catch {
    return null;
  }
}

/**
 * Save sales data to localStorage
 */
function saveSalesToCache(result: SalesIndexResult): void {
  try {
    const data = {
      trades: result.trades,
      byNftIdArray: Array.from(result.byNftId.entries()),
      byTraitArray: Array.from(result.byTrait.entries()),
      totalTrades: result.totalTrades,
      timestamp: Date.now()
    };
    localStorage.setItem(SALES_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[SalesAPI] Failed to cache sales data:', error);
  }
}

/**
 * Fetch all sales data and build index
 */
export async function fetchSalesIndex(forceRefresh = false): Promise<SalesIndexResult> {
  const now = Date.now();

  // Return memory cache if fresh
  if (!forceRefresh && salesCache.data && (now - salesCache.timestamp) < CACHE_DURATION) {
    return salesCache.data;
  }

  // Check localStorage cache
  if (!forceRefresh) {
    const cached = loadCachedSales();
    if (cached) {
      salesCache.data = cached;
      salesCache.timestamp = cached.lastUpdated.getTime();
      return cached;
    }
  }

  // If already loading, wait
  if (salesCache.loading) {
    return salesCache.loading;
  }

  // Start loading
  salesCache.loading = (async () => {

    // Fetch trades and metadata in parallel
    const [trades, metadata] = await Promise.all([
      fetchDexieTrades(50),
      loadNftMetadata()
    ]);

    // Group trades by NFT ID
    const byNftId = new Map<string, NFTTrade[]>();
    for (const trade of trades) {
      if (!byNftId.has(trade.nftId)) {
        byNftId.set(trade.nftId, []);
      }
      byNftId.get(trade.nftId)!.push(trade);
    }

    // Build trait index
    const byTrait = buildTraitIndex(trades, metadata);

    const result: SalesIndexResult = {
      trades,
      byNftId,
      byTrait,
      totalTrades: trades.length,
      lastUpdated: new Date()
    };

    // Cache results
    salesCache.data = result;
    salesCache.timestamp = Date.now();
    salesCache.loading = null;
    saveSalesToCache(result);


    return result;
  })();

  return salesCache.loading;
}

/**
 * Get sales data for a specific trait
 */
export async function getTraitSales(category: string, trait: string): Promise<TraitSalesData | null> {
  const index = await fetchSalesIndex();
  const key = `${category}:${trait}`;
  return index.byTrait.get(key) || null;
}

/**
 * Get all trait sales sorted by average price
 */
export async function getAllTraitSales(): Promise<TraitSalesData[]> {
  const index = await fetchSalesIndex();
  return Array.from(index.byTrait.values())
    .sort((a, b) => b.avgPrice - a.avgPrice);
}

/**
 * Get trait sales for a specific category
 */
export async function getTraitSalesByCategory(category: string): Promise<TraitSalesData[]> {
  const index = await fetchSalesIndex();
  return Array.from(index.byTrait.values())
    .filter(t => t.category === category)
    .sort((a, b) => b.avgPrice - a.avgPrice);
}

/**
 * Get sales history for a specific NFT
 */
export async function getNftSalesHistory(nftId: string): Promise<NFTTrade[]> {
  const index = await fetchSalesIndex();
  return index.byNftId.get(nftId) || [];
}
