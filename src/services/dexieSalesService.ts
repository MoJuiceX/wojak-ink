/**
 * Dexie Sales Service
 *
 * Fetches NFT sales history with smart redundancy:
 * 1. PRIMARY: Dexie.space direct API (free)
 * 2. CACHE: If free API fails but cache is fresh (<24h), use cache
 * 3. FALLBACK: Parse.bot API (paid) - only if cache is stale
 */

import { importSales, getSalesCount, type RawSaleRecord } from './salesDatabank';
import { getHoursSinceLastSync } from '@/providers/SalesProvider';

// Dexie.space API - use Vite proxy in dev, Cloudflare function in production
const DEXIE_API = import.meta.env.DEV ? '/dexie-api/v1' : '/api/dexie/v1';

// Parse.bot API endpoint via Cloudflare proxy (PAID FALLBACK)
const PARSEBOT_SCRAPER_ID = '8237e8bc-a98d-48a1-8b6c-ebcea8ab0c36';
const PARSEBOT_API = `/api/parsebot/scraper/${PARSEBOT_SCRAPER_ID}`;

// Wojak Farmers Plot collection ID
const COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

// ============ Types ============

interface DexieOffer {
  id: string;
  date_completed: string;
  price: number;
  status: number;
  trade_id: string;
  offered: Array<{
    id: string;
    name: string;
    is_nft: boolean;
    collection?: {
      id: string;
      name: string;
    };
  }>;
  requested: Array<{
    id: string;
    code: string;
    name: string;
    amount: number;
  }>;
}

interface DexieTradesResponse {
  success: boolean;
  count: number;
  page: number;
  page_size: number;
  offers: DexieOffer[];
}

interface ParsedSale {
  nftId: number;
  nftName: string;
  amount: number;
  currency: 'XCH' | 'CAT';
  tokenCode?: string;
  tokenId?: string;
  timestamp: number;
  tradeId: string;
}

// ============ Helpers ============

/**
 * Extract edition number from NFT name
 * e.g., "Soyjak #2006" -> 2006, "Wojak #0057" -> 57
 */
function extractEditionFromName(name: string): number | null {
  const match = name.match(/#(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Determine if payment is in XCH or CAT token
 */
function getCurrency(tokenId: string): 'XCH' | 'CAT' {
  return tokenId === 'xch' ? 'XCH' : 'CAT';
}

// ============ API Functions ============

// Small delay to avoid rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Track if we've been rate limited this session
let dexieRateLimited = false;

/**
 * Fetch completed trades from Dexie DIRECT API (FREE)
 * Status 4 = completed trades
 * Returns null if rate limited or failed
 */
async function fetchDexieDirect(page: number = 1): Promise<DexieTradesResponse | null> {
  // Skip if we've been rate limited this session
  if (dexieRateLimited) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      offered: COLLECTION_ID,
      status: '4', // Completed trades
      page: page.toString(),
      page_size: '50',
    });

    const response = await fetch(`${DEXIE_API}/offers?${params}`);

    // Detect rate limiting
    if (response.status === 429) {
      console.warn('[DexieSales] Dexie rate limited - switching to Parse.bot fallback');
      dexieRateLimited = true;
      return null;
    }

    if (!response.ok) {
      console.warn('[DexieSales] Dexie direct API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data as DexieTradesResponse;
  } catch (error) {
    console.warn('[DexieSales] Dexie direct API failed:', error);
    return null;
  }
}

/**
 * Fetch completed trades from Parse.bot API (PAID FALLBACK)
 * Status 4 = completed trades
 */
async function fetchParseBotFallback(page: number = 1): Promise<DexieTradesResponse | null> {
  try {
    const response = await fetch(`${PARSEBOT_API}/fetch_trades_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token_id: COLLECTION_ID,
        status_filters: '4',
        page,
      }),
    });

    if (!response.ok) {
      console.error('[DexieSales] Parse.bot API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data as DexieTradesResponse;
  } catch (error) {
    console.error('[DexieSales] Parse.bot API failed:', error);
    return null;
  }
}

/**
 * Fetch a single page with redundancy: Dexie first, Parse.bot fallback
 */
export async function fetchDexieTrades(page: number = 1): Promise<DexieTradesResponse | null> {
  // Try Dexie direct API first (FREE)
  const dexieResult = await fetchDexieDirect(page);
  if (dexieResult?.offers) {
    return dexieResult;
  }

  // Fallback to Parse.bot (PAID) only if Dexie fails
  return fetchParseBotFallback(page);
}

// How old cache can be before we resort to Parse.bot (in hours)
const CACHE_FRESHNESS_THRESHOLD_HOURS = 24;

/**
 * Fetch ALL completed trades by paginating through results
 *
 * Strategy:
 * 1. Try Dexie direct API (free)
 * 2. If Dexie fails and cache is fresh (<24h) → return empty (use cache)
 * 3. If Dexie fails and cache is stale (>24h) → use Parse.bot (paid)
 */
async function fetchAllDexieTrades(): Promise<DexieOffer[]> {
  const allOffers: DexieOffer[] = [];
  let page = 1;
  let totalPages = 1;
  let usingFallback = false;

  while (page <= totalPages) {
    // Add small delay between requests to avoid rate limits (except first page)
    if (page > 1) {
      await delay(usingFallback ? 100 : 200); // Shorter delay for paid API
    }

    // Try Dexie direct first
    let response = await fetchDexieDirect(page);

    // If Dexie fails on first page, decide whether to use Parse.bot
    if (!response?.offers && page === 1 && !usingFallback) {
      const hoursSinceSync = getHoursSinceLastSync();
      const cachedSales = getSalesCount();

      // If we have fresh cache, skip Parse.bot entirely
      if (cachedSales > 0 && hoursSinceSync < CACHE_FRESHNESS_THRESHOLD_HOURS) {
        return []; // Return empty - caller will use existing cache
      }

      // Cache is stale or empty, use Parse.bot
      usingFallback = true;
      response = await fetchParseBotFallback(page);
    } else if (!response?.offers && usingFallback) {
      response = await fetchParseBotFallback(page);
    }

    if (!response?.offers || response.offers.length === 0) break;

    allOffers.push(...response.offers);

    // Calculate total pages from count and page_size
    if (page === 1) {
      totalPages = Math.ceil(response.count / response.page_size);
    }

    // Stop if we've fetched all expected records
    if (allOffers.length >= response.count) break;

    page++;
  }

  return allOffers;
}

/**
 * Parse Dexie trades into our sale format
 */
function parseTrades(offers: DexieOffer[]): ParsedSale[] {
  const sales: ParsedSale[] = [];

  for (const offer of offers) {
    // Skip if no NFT offered or no date completed
    if (!offer.offered?.[0]?.is_nft || !offer.date_completed) {
      continue;
    }

    const nft = offer.offered[0];
    const payment = offer.requested?.[0];

    if (!payment) continue;

    // Extract edition number from name
    const edition = extractEditionFromName(nft.name);
    if (!edition) {
      // Silently skip NFTs that don't match Wojak naming pattern (e.g., "Wizard XCHmas")
      continue;
    }

    const currency = getCurrency(payment.id);

    sales.push({
      nftId: edition,
      nftName: nft.name,
      amount: payment.amount,
      currency,
      tokenCode: currency === 'CAT' ? payment.code : undefined,
      tokenId: currency === 'CAT' ? payment.id : undefined,
      timestamp: new Date(offer.date_completed).getTime(),
      tradeId: offer.trade_id,
    });
  }

  return sales;
}

/**
 * Get traits for an NFT by edition number
 * This should be connected to the gallery context in the future
 */
function getTraitsForNft(edition: number): Record<string, string> {
  void edition; // TODO: Connect to NFT data to get actual traits
  // For now, return empty traits - will be enhanced later
  return {};
}

/**
 * Convert parsed sales to RawSaleRecord format for the databank
 */
function toRawSaleRecords(sales: ParsedSale[]): RawSaleRecord[] {
  return sales.map((sale) => ({
    nftId: sale.nftId,
    amount: sale.amount,
    currency: sale.currency,
    timestamp: sale.timestamp,
    traits: getTraitsForNft(sale.nftId),
  }));
}

// ============ Public API ============

/**
 * Fetch all sales from Dexie and import into databank
 * Returns the number of new sales added
 */
export async function syncDexieSales(): Promise<{
  fetched: number;
  imported: number;
  xchSales: number;
  catSales: number;
  usedCache: boolean;
}> {

  // Fetch all pages of trades
  const allOffers = await fetchAllDexieTrades();

  // Empty result means we're using cache (free API failed but cache is fresh)
  if (allOffers.length === 0) {
    const cachedSales = getSalesCount();
    if (cachedSales > 0) {
      return { fetched: 0, imported: 0, xchSales: 0, catSales: 0, usedCache: true };
    }
    console.error('[DexieSales] No trades data received and no cache available');
    return { fetched: 0, imported: 0, xchSales: 0, catSales: 0, usedCache: false };
  }


  // Parse trades
  const parsedSales = parseTrades(allOffers);

  // Count by currency
  const xchSales = parsedSales.filter((s) => s.currency === 'XCH').length;
  const catSales = parsedSales.filter((s) => s.currency === 'CAT').length;

  // Convert and import
  const rawRecords = toRawSaleRecords(parsedSales);
  const imported = await importSales(rawRecords);

  return {
    fetched: allOffers.length,
    imported,
    xchSales,
    catSales,
    usedCache: false,
  };
}

/**
 * Get raw parsed sales (for debugging/display)
 */
export async function fetchParsedSales(): Promise<ParsedSale[]> {
  const allOffers = await fetchAllDexieTrades();
  if (allOffers.length === 0) return [];
  return parseTrades(allOffers);
}

/**
 * Get summary statistics from latest fetch
 */
export async function getDexieSalesSummary(): Promise<{
  totalTrades: number;
  xchTrades: number;
  catTrades: number;
  totalXchVolume: number;
  uniqueNfts: number;
  latestSale: ParsedSale | null;
} | null> {
  const sales = await fetchParsedSales();
  if (sales.length === 0) return null;

  const xchSales = sales.filter((s) => s.currency === 'XCH');
  const catSales = sales.filter((s) => s.currency === 'CAT');
  const totalXchVolume = xchSales.reduce((sum, s) => sum + s.amount, 0);
  const uniqueNfts = new Set(sales.map((s) => s.nftId)).size;

  // Sort by timestamp descending to get latest
  const sortedSales = [...sales].sort((a, b) => b.timestamp - a.timestamp);

  return {
    totalTrades: sales.length,
    xchTrades: xchSales.length,
    catTrades: catSales.length,
    totalXchVolume,
    uniqueNfts,
    latestSale: sortedSales[0] || null,
  };
}
