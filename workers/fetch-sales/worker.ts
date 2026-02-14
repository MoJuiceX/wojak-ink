/**
 * Cloudflare Worker - Trade Values Fetcher
 * Runs every 30 minutes via Cron Trigger
 * Fetches NFT sales from Dexie API, calculates trait statistics, stores in KV
 * Also persists all trades to D1 (sales_history) as the server-side source of truth
 */

interface Env {
  TRADE_VALUES_KV: KVNamespace;
  DB: D1Database;
  COLLECTION_ID?: string;
  ADMIN_PASSWORD?: string;
}

// Favorite stats types
interface FavoriteStatsData {
  totalSaves: number;
  savesByDate: Record<string, number>;
  attributes: Record<string, Record<string, number>>;
  combinations: Record<string, number>;
  lastUpdated: string;
}

interface TrackFavoriteRequest {
  attributes: Record<string, string | string[]>;
}

// Placeholder password - CHANGE THIS in Cloudflare dashboard environment variables
const DEFAULT_ADMIN_PASSWORD = 'wojak-admin-2026';

interface DexieOffer {
  id: string;
  status: number;
  date_completed: string;
  price: number;
  offered: Array<{
    is_nft?: boolean;
    id: string;
    name: string;
    collection?: {
      id: string;
      name: string;
    };
  }>;
  requested: Array<{
    id: string;
    code: string;
    amount: number;
  }>;
  trade_id: string;
}

interface DexieResponse {
  success: boolean;
  count: number;
  page: number;
  page_size: number;
  offers: DexieOffer[];
}

interface NFTMetadata {
  edition: number;
  name: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface Sale {
  edition: number;
  price_xch: number;
  timestamp: string;
  nftName: string;
  tradeId: string;
  currency: 'XCH' | 'CAT';
  originalAmount: number;
  tokenCode: string | null;
  tokenId: string | null;
  catXchRate: number | null;
  traitsJson: string | null;
}

interface TraitStats {
  trait_name: string;
  trait_category: string;
  total_sales: number;
  outliers_excluded: number;
  average_xch: number;
  min_xch: number;
  max_xch: number;
  last_trade: string | null;
}

// MintGarden types
interface MintGardenPayment {
  puzzle_hash: string;
  amount: number;
  asset_id: string | null;
  asset: unknown;
}

interface MintGardenEvent {
  nft_id: string;
  event_index: number;
  type: number;
  timestamp: string;
  block_height: number;
  xch_price: number | null;
  payments: MintGardenPayment[];
  address: { encoded_id?: string } | null;
  previous_address: { encoded_id?: string } | null;
  nft: {
    data: {
      name: string;
    };
  };
}

interface MintGardenEventsResponse {
  items: MintGardenEvent[];
  cursor: string | null;
}

interface MintGardenTrade {
  mgEventId: string;
  edition: number;
  nftName: string;
  currency: 'XCH' | 'CAT';
  originalAmount: number;
  xchEquivalent: number;
  tokenCode: string | null;
  tokenId: string | null;
  catXchRate: number | null;
  timestamp: string;
  completedAtUnix: number;
  buyerAddress: string | null;
  sellerAddress: string | null;
  blockHeight: number;
  traitsJson: string | null;
}

// Token rate with asset_id mapping
interface TokenRateRow {
  token_code: string;
  xch_rate: number;
  asset_id: string | null;
}

// KV stored data (unchanged format for backward compat)
interface StoredData {
  trait_stats: TraitStats[];
  by_category: Record<string, TraitStats[]>;
  all_sales: Array<{
    edition: number;
    price_xch: number;
    timestamp: string;
    nftName: string;
  }>;
  total_sales_count: number;
  last_updated: string;
  fetch_duration_ms: number;
}

// Default configuration - based on API_INTEGRATION_GUIDE.md best practices
const DEFAULT_CONFIG = {
  COLLECTION_ID: 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah',
  DEXIE_API: 'https://api.dexie.space/v1',
  MINTGARDEN_API: 'https://api.mintgarden.io',
  PAGE_SIZE: 100,
  MAX_PAGES: 20,
  MG_MAX_PAGES: 30,
  // Dexie recommended: 500ms delay between pages
  RATE_LIMIT_DELAY_MS: 500,
  // Retry config
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY_MS: 1000,
  REQUEST_TIMEOUT_MS: 10000,
  // Creator sale prices to exclude (XCH only)
  EXCLUDED_PRICES: [0.3, 0.725, 0.82],
  PRICE_TOLERANCE: 0.01,
  // Metadata URL for trait lookup
  METADATA_URL: 'https://raw.githubusercontent.com/your-repo/wojak-ink-mobile/main/public/assets/nft-data/metadata.json',
  // D1 batch size
  D1_BATCH_SIZE: 25,
  // Cross-source dedup window (ms) — trades within this window on same NFT are considered the same
  DEDUP_WINDOW_MS: 60000,
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch with retry and exponential backoff
async function fetchWithRetry(
  url: string,
  retryCount = 0
): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      DEFAULT_CONFIG.REQUEST_TIMEOUT_MS
    );

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'WojakFarmersPlot/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle rate limiting (429) with exponential backoff
    if (response.status === 429) {
      if (retryCount < DEFAULT_CONFIG.MAX_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = DEFAULT_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
        console.warn(`Rate limited (429), waiting ${delay}ms before retry ${retryCount + 1}...`);
        await sleep(delay);
        return fetchWithRetry(url, retryCount + 1);
      }
      throw new Error('Rate limit exceeded after max retries');
    }

    // Retry on server errors (5xx)
    if (response.status >= 500 && retryCount < DEFAULT_CONFIG.MAX_RETRIES) {
      const delay = DEFAULT_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
      console.warn(`Server error (${response.status}), waiting ${delay}ms before retry...`);
      await sleep(delay);
      return fetchWithRetry(url, retryCount + 1);
    }

    return response;
  } catch (error) {
    // Retry on network errors
    if (retryCount < DEFAULT_CONFIG.MAX_RETRIES) {
      const delay = DEFAULT_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
      console.warn(`Network error, waiting ${delay}ms before retry...`);
      await sleep(delay);
      return fetchWithRetry(url, retryCount + 1);
    }
    throw error;
  }
}

function isExcludedPrice(price: number): boolean {
  return DEFAULT_CONFIG.EXCLUDED_PRICES.some(
    excluded => Math.abs(price - excluded) < DEFAULT_CONFIG.PRICE_TOLERANCE
  );
}

// Extract edition number from NFT name like "Wojak #0644" or "Bepe Waifu #4124"
function extractEdition(nftName: string): number | null {
  const match = nftName.match(/#(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Filter outliers using IQR method
function filterOutliers(prices: number[]): { filtered: number[]; outliersRemoved: number } {
  if (prices.length < 4) {
    return { filtered: prices, outliersRemoved: 0 };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const filtered = prices.filter(p => p >= lowerBound && p <= upperBound);

  return {
    filtered,
    outliersRemoved: prices.length - filtered.length,
  };
}

// Load CAT token rates from D1 (includes asset_id mappings)
async function loadTokenRates(db: D1Database): Promise<{
  byCode: Map<string, number>;
  byAssetId: Map<string, { tokenCode: string; xchRate: number }>;
}> {
  const byCode = new Map<string, number>();
  const byAssetId = new Map<string, { tokenCode: string; xchRate: number }>();
  try {
    const result = await db.prepare(
      'SELECT token_code, xch_rate, asset_id FROM cat_token_rates'
    ).all<TokenRateRow>();

    for (const row of result.results) {
      byCode.set(row.token_code, row.xch_rate);
      if (row.asset_id) {
        byAssetId.set(row.asset_id, { tokenCode: row.token_code, xchRate: row.xch_rate });
      }
    }
  } catch (error) {
    console.warn('Failed to load token rates from D1:', error);
  }
  return { byCode, byAssetId };
}

// Get XCH rate for a CAT token by code or asset_id
function getTokenXchRate(
  tokenCode: string,
  ratesByCode: Map<string, number>,
  tokenId?: string | null,
  ratesByAssetId?: Map<string, { tokenCode: string; xchRate: number }>
): number {
  // Try exact match on code
  if (ratesByCode.has(tokenCode)) {
    return ratesByCode.get(tokenCode)!;
  }
  // Try with $ prefix
  if (ratesByCode.has(`$${tokenCode}`)) {
    return ratesByCode.get(`$${tokenCode}`)!;
  }
  // Try without $ prefix
  if (tokenCode.startsWith('$') && ratesByCode.has(tokenCode.slice(1))) {
    return ratesByCode.get(tokenCode.slice(1))!;
  }
  // Fallback: look up by asset_id (handles emoji codes that don't match text entries)
  if (tokenId && ratesByAssetId?.has(tokenId)) {
    return ratesByAssetId.get(tokenId)!.xchRate;
  }
  // Conservative fallback for truly unknown tokens
  return 0.000001;
}

// Dexie tickers response types
interface DexieTicker {
  ticker_id: string;
  base_currency: string;   // Token symbol (e.g. "BEPE", "🪄⚡️")
  base_id: string;         // Asset ID (hex string)
  target_currency: string; // "XCH"
  last_price: string;
}

// Cached tickers from Dexie for auto-discovery of new tokens
let cachedDexieTickers: DexieTicker[] = [];

/**
 * Refresh CAT token rates from Dexie's public tickers API.
 * Updates rates in cat_token_rates for tokens we already track.
 * Also caches tickers for auto-discovery of unknown tokens during trade processing.
 * Matches by asset_id (base_id from Dexie) — most reliable since
 * token symbols can be emoji or have $ prefixes.
 */
async function refreshTokenRatesFromDexie(db: D1Database): Promise<number> {
  try {
    const response = await fetch('https://api.dexie.space/v2/prices/tickers');
    if (!response.ok) {
      console.warn(`Dexie tickers API returned ${response.status}`);
      return 0;
    }

    const data = await response.json() as { success?: boolean; tickers?: DexieTicker[] };
    const tickers = data.tickers;
    if (!Array.isArray(tickers) || tickers.length === 0) return 0;

    // Cache tickers for auto-discovery during trade processing
    cachedDexieTickers = tickers;

    // Load all tokens with their asset_ids
    const existing = await db.prepare(
      'SELECT token_code, asset_id, token_id FROM cat_token_rates'
    ).all<{ token_code: string; asset_id: string | null; token_id: string | null }>();

    // Build lookup sets for matching
    const knownAssetIds = new Set<string>();
    const knownTokenIds = new Set<string>();
    for (const row of existing.results) {
      if (row.asset_id) knownAssetIds.add(row.asset_id);
      if (row.token_id) knownTokenIds.add(row.token_id);
    }

    let updated = 0;

    for (const ticker of tickers) {
      if (ticker.target_currency !== 'XCH') continue;

      const assetId = ticker.base_id;
      if (!assetId) continue;

      const rate = parseFloat(ticker.last_price);
      if (!rate || rate <= 0) continue;

      // Match by asset_id (matches both asset_id and token_id columns)
      if (knownAssetIds.has(assetId)) {
        // Update ALL rows with this asset_id (handles BEPE + $BEPE etc.)
        await db.prepare(
          `UPDATE cat_token_rates SET xch_rate = ?, source = 'dexie', updated_at = datetime('now')
           WHERE asset_id = ?`
        ).bind(rate, assetId).run();
        updated++;
      } else if (knownTokenIds.has(assetId)) {
        // token_id match — also backfill the asset_id
        await db.prepare(
          `UPDATE cat_token_rates SET xch_rate = ?, asset_id = ?, source = 'dexie', updated_at = datetime('now')
           WHERE token_id = ?`
        ).bind(rate, assetId, assetId).run();
        updated++;
      }
    }

    return updated;
  } catch (error) {
    console.warn('Failed to refresh token rates from Dexie:', error);
    return 0;
  }
}

/**
 * Auto-discover and persist a new CAT token rate from cached Dexie tickers.
 * Called when an unknown token is encountered during trade processing.
 * Returns the discovered rate, or null if not found.
 */
async function autoDiscoverTokenRate(
  db: D1Database,
  tokenCode: string,
  tokenId: string,
  ratesByCode: Map<string, number>,
  ratesByAssetId: Map<string, { tokenCode: string; xchRate: number }>
): Promise<number | null> {
  // Look up in cached tickers by asset_id
  const ticker = cachedDexieTickers.find(
    t => t.target_currency === 'XCH' && t.base_id === tokenId
  );
  if (!ticker) return null;

  const rate = parseFloat(ticker.last_price);
  if (!rate || rate <= 0) return null;

  // Insert into cat_token_rates
  try {
    await db.prepare(`
      INSERT INTO cat_token_rates (token_code, token_id, xch_rate, asset_id, source, updated_at)
      VALUES (?, ?, ?, ?, 'dexie', datetime('now'))
      ON CONFLICT(token_code) DO UPDATE SET
        xch_rate = excluded.xch_rate,
        token_id = COALESCE(excluded.token_id, cat_token_rates.token_id),
        asset_id = COALESCE(excluded.asset_id, cat_token_rates.asset_id),
        source = 'dexie',
        updated_at = datetime('now')
    `).bind(tokenCode, tokenId, rate, tokenId).run();

    // Update in-memory rate maps
    ratesByCode.set(tokenCode, rate);
    ratesByAssetId.set(tokenId, { tokenCode, xchRate: rate });

    console.warn(`Auto-discovered token: ${tokenCode} (${tokenId}) rate=${rate} XCH`);
    return rate;
  } catch (error) {
    console.warn(`Failed to auto-discover token ${tokenCode}:`, error);
    return null;
  }
}

// Fetch all trades from Dexie API (XCH + CAT) with retry logic and circuit breaker
async function fetchAllTrades(
  collectionId: string,
  ratesByCode: Map<string, number>,
  metadataMap: Map<number, NFTMetadata>,
  ratesByAssetId?: Map<string, { tokenCode: string; xchRate: number }>,
  db?: D1Database
): Promise<Sale[]> {
  const allTrades: Sale[] = [];
  let page = 1;
  let hasMore = true;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;

  console.warn('Fetching all trades (XCH + CAT) from Dexie API...');

  while (hasMore && page <= DEFAULT_CONFIG.MAX_PAGES) {
    // Fetch ALL completed trades (no requested=xch filter)
    const url = `${DEFAULT_CONFIG.DEXIE_API}/offers?status=4&offered=${collectionId}&page=${page}&page_size=${DEFAULT_CONFIG.PAGE_SIZE}&compact=true`;

    console.warn(`Fetching page ${page}...`);

    try {
      const response = await fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`Dexie API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as DexieResponse;

      if (!data.success) {
        throw new Error('Dexie API returned error');
      }

      // Reset error counter on success
      consecutiveErrors = 0;

      for (const offer of data.offers) {
        // Get NFT info from offered array
        const nftOffer = offer.offered?.find(o => o.is_nft);
        if (!nftOffer) continue;

        const payment = offer.requested?.[0];
        if (!payment) continue;

        const edition = extractEdition(nftOffer.name);
        if (!edition) {
          console.warn(`Could not extract edition from: ${nftOffer.name}`);
          continue;
        }

        const currency: 'XCH' | 'CAT' = payment.id === 'xch' ? 'XCH' : 'CAT';
        const originalAmount = payment.amount;

        // Calculate XCH equivalent
        let priceXch: number;
        let catXchRate: number | null = null;
        const tokenCode = currency === 'CAT' ? (payment.code || null) : null;
        const tokenId = currency === 'CAT' ? payment.id : null;

        if (currency === 'XCH') {
          priceXch = originalAmount;
          // Skip creator sales (XCH only)
          if (isExcludedPrice(priceXch)) {
            continue;
          }
        } else {
          // CAT sale — look up conversion rate
          catXchRate = getTokenXchRate(payment.code || '', ratesByCode, payment.id, ratesByAssetId);

          // Auto-discover unknown tokens from cached Dexie tickers
          if (catXchRate === 0.000001 && db && payment.id) {
            const discovered = await autoDiscoverTokenRate(
              db, payment.code || payment.id, payment.id, ratesByCode, ratesByAssetId || new Map()
            );
            if (discovered) {
              catXchRate = discovered;
            } else {
              console.warn(`Unknown CAT token: ${payment.code} (id: ${payment.id}), using fallback rate`);
            }
          } else if (catXchRate === 0.000001) {
            console.warn(`Unknown CAT token: ${payment.code} (id: ${payment.id}), using fallback rate`);
          }

          priceXch = originalAmount * catXchRate;
        }

        // Build traits JSON from metadata
        const metadata = metadataMap.get(edition);
        let traitsJson: string | null = null;
        if (metadata?.attributes) {
          const traits: Record<string, string> = {};
          for (const attr of metadata.attributes) {
            traits[attr.trait_type] = attr.value;
          }
          traitsJson = JSON.stringify(traits);
        }

        allTrades.push({
          edition,
          nftName: nftOffer.name,
          price_xch: priceXch,
          timestamp: offer.date_completed,
          tradeId: offer.trade_id,
          currency,
          originalAmount,
          tokenCode,
          tokenId,
          catXchRate,
          traitsJson,
        });
      }

      console.warn(`Page ${page}: ${data.offers.length} offers, ${allTrades.length} valid trades total`);

      // Check if more pages
      hasMore = data.offers.length === DEFAULT_CONFIG.PAGE_SIZE;
      page++;

      // Rate limiting - 500ms delay between pages
      if (hasMore) {
        await sleep(DEFAULT_CONFIG.RATE_LIMIT_DELAY_MS);
      }
    } catch (error) {
      consecutiveErrors++;
      console.error(`Error fetching page ${page}:`, error);

      // Circuit breaker: stop on too many consecutive errors
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.warn(`Circuit breaker triggered after ${consecutiveErrors} consecutive errors`);
        hasMore = false;
        break;
      }

      // Wait longer after error before trying next page
      await sleep(DEFAULT_CONFIG.RATE_LIMIT_DELAY_MS * 2);
      page++;
    }
  }

  return allTrades;
}

// Fetch metadata from KV or GitHub
async function fetchMetadata(env: Env): Promise<Map<number, NFTMetadata>> {
  // Try KV first
  const cached = await env.TRADE_VALUES_KV.get('metadata_cache', 'json') as NFTMetadata[] | null;
  if (cached) {
    console.warn('Using cached metadata from KV');
    const map = new Map<number, NFTMetadata>();
    for (const nft of cached) {
      map.set(nft.edition, nft);
    }
    return map;
  }

  // Fetch from GitHub (fallback)
  console.warn('Fetching metadata from GitHub...');
  try {
    const response = await fetch(DEFAULT_CONFIG.METADATA_URL);
    if (response.ok) {
      const data = await response.json() as NFTMetadata[];
      // Cache in KV for 24 hours
      await env.TRADE_VALUES_KV.put('metadata_cache', JSON.stringify(data), {
        expirationTtl: 86400,
      });
      const map = new Map<number, NFTMetadata>();
      for (const nft of data) {
        map.set(nft.edition, nft);
      }
      return map;
    }
  } catch (error) {
    console.warn('Failed to fetch metadata:', error);
  }

  return new Map();
}

// Calculate trait statistics (uses XCH-equivalent prices for all sales)
function calculateTraitStats(
  sales: Sale[],
  metadataMap: Map<number, NFTMetadata>
): { traitStats: TraitStats[]; byCategory: Record<string, TraitStats[]> } {
  // Collect sales by trait
  const traitSales = new Map<string, { prices: number[]; timestamps: string[] }>();

  for (const sale of sales) {
    const metadata = metadataMap.get(sale.edition);
    if (!metadata?.attributes) continue;

    for (const attr of metadata.attributes) {
      const category = attr.trait_type.toLowerCase().replace(/\s+/g, '_');
      const key = `${category}:::${attr.value}`;

      if (!traitSales.has(key)) {
        traitSales.set(key, { prices: [], timestamps: [] });
      }
      const data = traitSales.get(key)!;
      data.prices.push(sale.price_xch);
      data.timestamps.push(sale.timestamp);
    }
  }

  // Calculate stats for each trait
  const traitStats: TraitStats[] = [];

  for (const [key, data] of traitSales) {
    const [category, traitName] = key.split(':::');
    const { filtered, outliersRemoved } = filterOutliers(data.prices);

    if (filtered.length === 0) continue;

    const sortedTimestamps = [...data.timestamps].sort().reverse();
    const avg = filtered.reduce((a, b) => a + b, 0) / filtered.length;

    traitStats.push({
      trait_name: traitName,
      trait_category: category,
      total_sales: filtered.length,
      outliers_excluded: outliersRemoved,
      average_xch: Math.round(avg * 1000) / 1000,
      min_xch: Math.min(...filtered),
      max_xch: Math.max(...filtered),
      last_trade: sortedTimestamps[0] || null,
    });
  }

  // Sort by average price descending
  traitStats.sort((a, b) => b.average_xch - a.average_xch);

  // Group by category
  const byCategory: Record<string, TraitStats[]> = {};
  for (const stat of traitStats) {
    if (!byCategory[stat.trait_category]) {
      byCategory[stat.trait_category] = [];
    }
    byCategory[stat.trait_category].push(stat);
  }

  return { traitStats, byCategory };
}

// Fetch trades from MintGarden API (type=2 ownership transfer events with payment)
async function fetchMintGardenTrades(
  collectionId: string,
  ratesByAssetId: Map<string, { tokenCode: string; xchRate: number }>,
  metadataMap: Map<number, NFTMetadata>,
  lastTimestamp: string | null
): Promise<MintGardenTrade[]> {
  const trades: MintGardenTrade[] = [];
  let cursor: string | null = null;
  let consecutiveErrors = 0;

  console.warn('Fetching trades from MintGarden API...');

  for (let page = 0; page < DEFAULT_CONFIG.MG_MAX_PAGES; page++) {
    const url = new URL(`${DEFAULT_CONFIG.MINTGARDEN_API}/events`);
    url.searchParams.set('collection', collectionId);
    url.searchParams.set('type', '2');
    url.searchParams.set('size', '100');
    if (cursor) url.searchParams.set('cursor', cursor);

    try {
      const response = await fetchWithRetry(url.toString());
      if (!response.ok) {
        throw new Error(`MintGarden API error: ${response.status}`);
      }

      const data = await response.json() as MintGardenEventsResponse;
      const items = data.items || [];
      if (items.length === 0) break;

      consecutiveErrors = 0;
      let reachedLastSync = false;

      for (const event of items) {
        // Stop if we've reached previously synced data
        if (lastTimestamp && event.timestamp <= lastTimestamp) {
          reachedLastSync = true;
          break;
        }

        const xchPrice = event.xch_price;
        const hasXch = xchPrice !== null && xchPrice > 0;
        const catPayments = event.payments.filter(p => p.asset_id !== null && p.amount > 0);
        const hasCat = catPayments.length > 0;

        // Skip free transfers (no payment)
        if (!hasXch && !hasCat) continue;

        // Extract edition from name
        const edition = extractEdition(event.nft?.data?.name || '');
        if (!edition) continue;

        const mgEventId = `${event.nft_id}_${event.event_index}`;
        const completedAtUnix = new Date(event.timestamp).getTime();

        // Build traits JSON from metadata
        const metadata = metadataMap.get(edition);
        let traitsJson: string | null = null;
        if (metadata?.attributes) {
          const traits: Record<string, string> = {};
          for (const attr of metadata.attributes) {
            traits[attr.trait_type] = attr.value;
          }
          traitsJson = JSON.stringify(traits);
        }

        if (hasXch && !hasCat) {
          // XCH trade
          trades.push({
            mgEventId,
            edition,
            nftName: event.nft?.data?.name || `Wojak #${String(edition).padStart(4, '0')}`,
            currency: 'XCH',
            originalAmount: xchPrice!,
            xchEquivalent: xchPrice!,
            tokenCode: null,
            tokenId: null,
            catXchRate: null,
            timestamp: event.timestamp,
            completedAtUnix,
            buyerAddress: event.address?.encoded_id || null,
            sellerAddress: event.previous_address?.encoded_id || null,
            blockHeight: event.block_height,
            traitsJson,
          });
        } else if (hasCat) {
          // CAT trade — aggregate payments by asset_id
          const assetTotals = new Map<string, number>();
          for (const p of catPayments) {
            const aid = p.asset_id!;
            assetTotals.set(aid, (assetTotals.get(aid) || 0) + p.amount);
          }

          // Use the asset_id with the largest total amount
          let mainAssetId = '';
          let mainAmount = 0;
          for (const [aid, total] of assetTotals) {
            if (total > mainAmount) {
              mainAssetId = aid;
              mainAmount = total;
            }
          }

          const rateInfo = ratesByAssetId.get(mainAssetId);
          const tokenCode = rateInfo?.tokenCode || 'UNKNOWN';
          const catXchRate = rateInfo?.xchRate || 0;
          const xchEquivalent = catXchRate > 0 ? mainAmount * catXchRate : 0;

          if (!rateInfo) {
            console.warn(`MintGarden: Unknown CAT asset_id ${mainAssetId} for edition #${edition}`);
          }

          trades.push({
            mgEventId,
            edition,
            nftName: event.nft?.data?.name || `Wojak #${String(edition).padStart(4, '0')}`,
            currency: 'CAT',
            originalAmount: mainAmount,
            xchEquivalent,
            tokenCode,
            tokenId: mainAssetId,
            catXchRate,
            timestamp: event.timestamp,
            completedAtUnix,
            buyerAddress: event.address?.encoded_id || null,
            sellerAddress: event.previous_address?.encoded_id || null,
            blockHeight: event.block_height,
            traitsJson,
          });
        }
      }

      if (reachedLastSync) break;

      cursor = data.cursor;
      if (!cursor) break;

      // Rate limiting
      await sleep(DEFAULT_CONFIG.RATE_LIMIT_DELAY_MS);
    } catch (error) {
      consecutiveErrors++;
      console.error(`MintGarden page ${page} error:`, error);
      if (consecutiveErrors >= 3) {
        console.warn('MintGarden: Circuit breaker triggered');
        break;
      }
      await sleep(DEFAULT_CONFIG.RATE_LIMIT_DELAY_MS * 2);
    }
  }

  console.warn(`MintGarden: ${trades.length} paid trades found`);
  return trades;
}

// Persist MintGarden trades to D1 with cross-source deduplication
async function persistMintGardenToD1(
  db: D1Database,
  trades: MintGardenTrade[]
): Promise<{ inserted: number; enriched: number }> {
  if (trades.length === 0) return { inserted: 0, enriched: 0 };

  let insertedCount = 0;
  let enrichedCount = 0;
  const batchSize = DEFAULT_CONFIG.D1_BATCH_SIZE;

  for (let i = 0; i < trades.length; i += batchSize) {
    const batch = trades.slice(i, i + batchSize);
    const statements: D1PreparedStatement[] = [];

    for (const trade of batch) {
      // Check if a Dexie trade exists for same NFT within ±60s window
      const existing = await db.prepare(
        `SELECT id, trade_id FROM sales_history
         WHERE nft_edition = ?
           AND ABS(completed_at_unix - ?) < ?
         LIMIT 1`
      ).bind(trade.edition, trade.completedAtUnix, DEFAULT_CONFIG.DEDUP_WINDOW_MS).first<{
        id: number;
        trade_id: string;
      }>();

      if (existing) {
        // Enrich existing Dexie trade with MintGarden wallet data
        statements.push(
          db.prepare(
            `UPDATE sales_history
             SET mg_event_id = ?,
                 buyer_address = COALESCE(buyer_address, ?),
                 seller_address = COALESCE(seller_address, ?),
                 block_height = COALESCE(block_height, ?)
             WHERE id = ? AND mg_event_id IS NULL`
          ).bind(
            trade.mgEventId,
            trade.buyerAddress,
            trade.sellerAddress,
            trade.blockHeight,
            existing.id
          )
        );
        enrichedCount++;
      } else {
        // Insert as new MintGarden-sourced trade
        const tradeId = `mg_${trade.mgEventId}`;
        statements.push(
          db.prepare(
            `INSERT OR IGNORE INTO sales_history
              (trade_id, nft_edition, nft_name, currency, original_amount, token_code, token_id,
               xch_equivalent, cat_xch_rate, traits_json, completed_at, completed_at_unix, source,
               mg_event_id, buyer_address, seller_address, block_height)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'mintgarden', ?, ?, ?, ?)`
          ).bind(
            tradeId,
            trade.edition,
            trade.nftName,
            trade.currency,
            trade.originalAmount,
            trade.tokenCode,
            trade.tokenId,
            trade.xchEquivalent,
            trade.catXchRate,
            trade.traitsJson,
            trade.timestamp,
            trade.completedAtUnix,
            trade.mgEventId,
            trade.buyerAddress,
            trade.sellerAddress,
            trade.blockHeight
          )
        );
        insertedCount++;
      }
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }
  }

  // Update MintGarden sync cursor
  if (trades.length > 0) {
    const latestTimestamp = trades.reduce((latest, t) =>
      t.timestamp > latest ? t.timestamp : latest, trades[0].timestamp);

    const totalResult = await db.prepare(
      "SELECT COUNT(*) as total FROM sales_history WHERE source = 'mintgarden'"
    ).first<{ total: number }>();

    await db.prepare(
      `UPDATE sales_sync_state
       SET mg_last_timestamp = ?,
           mg_total_synced = ?,
           updated_at = datetime('now')
       WHERE id = 1`
    ).bind(latestTimestamp, totalResult?.total ?? 0).run();
  }

  return { inserted: insertedCount, enriched: enrichedCount };
}

// Backfill wallet addresses for trades missing buyer_address
// Queries MintGarden per-NFT to find matching type=2 events
// editionLimit caps how many unique editions to process per call (Worker CPU limit)
async function backfillWalletAddresses(
  db: D1Database,
  collectionId: string,
  editionLimit: number = 20,
): Promise<{ checked: number; updated: number; errors: number; remaining: number }> {
  // Find all trades missing buyer_address with meaningful xch_equivalent
  const missing = await db.prepare(
    `SELECT id, nft_edition, completed_at_unix, trade_id
     FROM sales_history
     WHERE buyer_address IS NULL
       AND xch_equivalent > 0.01
     ORDER BY completed_at_unix ASC`
  ).all<{ id: number; nft_edition: number; completed_at_unix: number; trade_id: string }>();

  const rows = missing.results || [];
  if (rows.length === 0) return { checked: 0, updated: 0, errors: 0, remaining: 0 };

  console.warn(`[Backfill] ${rows.length} trades missing wallet addresses`);

  // Group by edition to batch MintGarden lookups
  const byEdition = new Map<number, typeof rows>();
  for (const row of rows) {
    if (!byEdition.has(row.nft_edition)) {
      byEdition.set(row.nft_edition, []);
    }
    byEdition.get(row.nft_edition)!.push(row);
  }

  const totalEditions = byEdition.size;
  console.warn(`[Backfill] ${totalEditions} unique editions to look up (limit: ${editionLimit})`);

  let updated = 0;
  let errors = 0;
  let editionsProcessed = 0;
  const BACKFILL_DEDUP_WINDOW_MS = 300000; // ±5 minutes — wider window for cross-source matching

  for (const [edition, trades] of byEdition) {
    if (editionsProcessed >= editionLimit) break;
    editionsProcessed++;
    try {
      // Step 1: Find MintGarden encoded_id for this edition
      // Search by number — MintGarden does substring matching on NFT names, so verify edition_number
      const searchUrl = `${DEFAULT_CONFIG.MINTGARDEN_API}/collections/${collectionId}/nfts?size=5&search=${edition}`;
      const searchResp = await fetchWithRetry(searchUrl);
      if (!searchResp.ok) {
        console.warn(`[Backfill] Search failed for edition #${edition}: ${searchResp.status}`);
        errors++;
        await sleep(500);
        continue;
      }

      const searchData = await searchResp.json() as { items?: Array<{ encoded_id: string; edition_number: number }> };
      // Verify exact edition match (search is fuzzy — "644" can match "2644")
      const matchItem = searchData.items?.find(item => item.edition_number === edition);
      const encodedId = matchItem?.encoded_id;
      if (!encodedId) {
        console.warn(`[Backfill] No MintGarden NFT found for edition #${edition}`);
        errors++;
        await sleep(300);
        continue;
      }

      // Step 2: Fetch NFT detail which includes events inline
      const nftUrl = `${DEFAULT_CONFIG.MINTGARDEN_API}/nfts/${encodedId}`;
      const nftResp = await fetchWithRetry(nftUrl);
      if (!nftResp.ok) {
        console.warn(`[Backfill] NFT detail failed for edition #${edition}: ${nftResp.status}`);
        errors++;
        await sleep(500);
        continue;
      }

      const nftData = await nftResp.json() as { events?: MintGardenEvent[] };
      // Filter to type=2 (ownership transfer) events only
      const events = (nftData.events || []).filter(e => e.type === 2);

      if (events.length === 0) {
        await sleep(300);
        continue;
      }

      // Step 3: Match each missing trade to a MintGarden event by timestamp proximity
      const statements: D1PreparedStatement[] = [];

      for (const trade of trades) {
        // Find the closest event within the window
        let bestMatch: MintGardenEvent | null = null;
        let bestDiff = BACKFILL_DEDUP_WINDOW_MS;

        for (const event of events) {
          const eventUnix = new Date(event.timestamp).getTime();
          const diff = Math.abs(eventUnix - trade.completed_at_unix);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestMatch = event;
          }
        }

        if (bestMatch) {
          const buyerAddr = bestMatch.address?.encoded_id || null;
          const sellerAddr = bestMatch.previous_address?.encoded_id || null;
          const mgEventId = `${bestMatch.nft_id}_${bestMatch.event_index}`;

          if (buyerAddr || sellerAddr) {
            statements.push(
              db.prepare(
                `UPDATE sales_history
                 SET buyer_address = COALESCE(buyer_address, ?),
                     seller_address = COALESCE(seller_address, ?),
                     mg_event_id = COALESCE(mg_event_id, ?),
                     block_height = COALESCE(block_height, ?)
                 WHERE id = ?`
              ).bind(buyerAddr, sellerAddr, mgEventId, bestMatch.block_height, trade.id)
            );
            updated++;
          }
        }
      }

      // Execute batch updates for this edition
      if (statements.length > 0) {
        // D1 batch limit: process in chunks of 25
        for (let i = 0; i < statements.length; i += DEFAULT_CONFIG.D1_BATCH_SIZE) {
          const chunk = statements.slice(i, i + DEFAULT_CONFIG.D1_BATCH_SIZE);
          await db.batch(chunk);
        }
      }

      // Rate limiting between NFT lookups
      await sleep(400);
    } catch (error) {
      console.warn(`[Backfill] Error processing edition #${edition}:`, error);
      errors++;
      await sleep(500);
    }
  }

  const remaining = totalEditions - editionsProcessed;
  console.warn(`[Backfill] Done: ${updated} updated, ${errors} errors, ${remaining} editions remaining`);
  return { checked: rows.length, updated, errors, remaining };
}

// Persist trades to D1 sales_history table
async function persistToD1(db: D1Database, trades: Sale[]): Promise<number> {
  if (trades.length === 0) return 0;

  let insertedCount = 0;
  const batchSize = DEFAULT_CONFIG.D1_BATCH_SIZE;

  // Update sync state to running
  await db.prepare(
    `UPDATE sales_sync_state SET sync_status = 'running', updated_at = datetime('now') WHERE id = 1`
  ).run();

  try {
    for (let i = 0; i < trades.length; i += batchSize) {
      const batch = trades.slice(i, i + batchSize);
      const statements: D1PreparedStatement[] = [];

      for (const trade of batch) {
        const completedAtUnix = new Date(trade.timestamp).getTime();
        statements.push(
          db.prepare(
            `INSERT OR IGNORE INTO sales_history
              (trade_id, nft_edition, nft_name, currency, original_amount, token_code, token_id,
               xch_equivalent, cat_xch_rate, traits_json, completed_at, completed_at_unix, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dexie')`
          ).bind(
            trade.tradeId,
            trade.edition,
            trade.nftName,
            trade.currency,
            trade.originalAmount,
            trade.tokenCode,
            trade.tokenId,
            trade.price_xch,
            trade.catXchRate,
            trade.traitsJson,
            trade.timestamp,
            completedAtUnix
          )
        );
      }

      const results = await db.batch(statements);
      for (const result of results) {
        if (result.meta?.changes) {
          insertedCount += result.meta.changes;
        }
      }
    }

    // Get total count and latest timestamp
    const countResult = await db.prepare(
      'SELECT COUNT(*) as total FROM sales_history'
    ).first<{ total: number }>();

    const latestResult = await db.prepare(
      'SELECT completed_at FROM sales_history ORDER BY completed_at_unix DESC LIMIT 1'
    ).first<{ completed_at: string }>();

    // Update sync state to idle with stats
    await db.prepare(
      `UPDATE sales_sync_state
       SET sync_status = 'idle',
           last_sync_at = datetime('now'),
           total_synced = ?,
           last_trade_timestamp = ?,
           error_message = NULL,
           updated_at = datetime('now')
       WHERE id = 1`
    ).bind(
      countResult?.total ?? 0,
      latestResult?.completed_at ?? null
    ).run();

    return insertedCount;
  } catch (error) {
    // Update sync state to error
    await db.prepare(
      `UPDATE sales_sync_state
       SET sync_status = 'error',
           error_message = ?,
           updated_at = datetime('now')
       WHERE id = 1`
    ).bind(String(error)).run();

    throw error;
  }
}

// Main scheduled handler
export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    void ctx; // Required parameter, not currently used
    const startTime = Date.now();
    console.warn(`[${new Date().toISOString()}] Starting scheduled sales fetch from Dexie...`);

    const collectionId = env.COLLECTION_ID || DEFAULT_CONFIG.COLLECTION_ID;

    try {
      // Step 1: Refresh token rates from Dexie tickers + load metadata in parallel
      const [metadataMap, ratesRefreshed] = await Promise.all([
        fetchMetadata(env),
        refreshTokenRatesFromDexie(env.DB),
      ]);
      console.warn(`Metadata loaded for ${metadataMap.size} NFTs, ${ratesRefreshed} token rates refreshed from Dexie`);

      // Step 1b: Load token rates (now with fresh Dexie prices)
      const tokenRates = await loadTokenRates(env.DB);
      console.warn(`${tokenRates.byCode.size} token rates loaded, ${tokenRates.byAssetId.size} asset mappings`);

      // Step 2: Fetch all trades from Dexie (XCH + CAT)
      const trades = await fetchAllTrades(collectionId, tokenRates.byCode, metadataMap, tokenRates.byAssetId, env.DB);
      console.warn(`Total trades from Dexie: ${trades.length}`);

      if (trades.length === 0) {
        console.warn('No trades found, storing empty data');
        const emptyData: StoredData = {
          trait_stats: [],
          by_category: {},
          all_sales: [],
          total_sales_count: 0,
          last_updated: new Date().toISOString(),
          fetch_duration_ms: Date.now() - startTime,
        };
        await env.TRADE_VALUES_KV.put('trade_values_data', JSON.stringify(emptyData));
        return;
      }

      // Step 3: Calculate trait statistics (all sales, using XCH-equivalent)
      const { traitStats, byCategory } = calculateTraitStats(trades, metadataMap);
      console.warn(`Calculated stats for ${traitStats.length} traits`);

      // Step 4: Store in KV (backward-compatible format)
      const storedData: StoredData = {
        trait_stats: traitStats,
        by_category: byCategory,
        all_sales: trades.map(t => ({
          edition: t.edition,
          price_xch: t.price_xch,
          timestamp: t.timestamp,
          nftName: t.nftName,
        })),
        total_sales_count: trades.length,
        last_updated: new Date().toISOString(),
        fetch_duration_ms: Date.now() - startTime,
      };

      await env.TRADE_VALUES_KV.put(
        'trade_values_data',
        JSON.stringify(storedData),
        {
          metadata: {
            total_sales: trades.length,
            total_traits: traitStats.length,
            last_updated: storedData.last_updated,
          },
        }
      );

      console.warn(`Successfully stored data in KV (took ${Date.now() - startTime}ms)`);

      // Step 5: Persist all Dexie trades to D1 (INSERT OR IGNORE handles dedup)
      const newInD1 = await persistToD1(env.DB, trades);
      console.warn(`D1 (Dexie): ${newInD1} new trades inserted`);

      // Step 6: Fetch MintGarden trades and persist with cross-source dedup
      try {
        const mgSyncState = await env.DB.prepare(
          'SELECT mg_last_timestamp FROM sales_sync_state WHERE id = 1'
        ).first<{ mg_last_timestamp: string | null }>();

        const mgTrades = await fetchMintGardenTrades(
          collectionId,
          tokenRates.byAssetId,
          metadataMap,
          mgSyncState?.mg_last_timestamp ?? null
        );

        if (mgTrades.length > 0) {
          const mgResult = await persistMintGardenToD1(env.DB, mgTrades);
          console.warn(`D1 (MintGarden): ${mgResult.inserted} new, ${mgResult.enriched} enriched with wallet data`);
        }
      } catch (mgError) {
        // MintGarden is secondary — don't fail the whole sync if it errors
        console.warn('MintGarden sync failed (non-fatal):', mgError);
      }

      // Log summary
      const xchCount = trades.filter(t => t.currency === 'XCH').length;
      const catCount = trades.filter(t => t.currency === 'CAT').length;
      console.warn(`Summary: ${xchCount} XCH trades (Dexie), ${catCount} CAT trades (Dexie)`);

      console.warn('Top 5 traits by average price:');
      for (const stat of traitStats.slice(0, 5)) {
        console.warn(`  ${stat.trait_category}/${stat.trait_name}: ${stat.average_xch} XCH`);
      }

    } catch (error) {
      console.error('Error in scheduled fetch:', error);
      throw error;
    }
  },

  // HTTP handler for manual trigger and API access
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Manual trigger endpoint
    if (url.pathname === '/trigger-fetch') {
      ctx.waitUntil(this.scheduled({} as ScheduledController, env, ctx));
      return new Response(
        JSON.stringify({ message: 'Fetch triggered', timestamp: new Date().toISOString() }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Backfill wallet addresses from MintGarden for trades missing buyer_address
    // ?limit=N to control batch size (default 20), ?wait=true to wait for results
    if (url.pathname === '/backfill-wallets') {
      const collectionId = env.COLLECTION_ID || DEFAULT_CONFIG.COLLECTION_ID;
      const editionLimit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 100);

      const result = await backfillWalletAddresses(env.DB, collectionId, editionLimit);
      return new Response(
        JSON.stringify({
          message: result.remaining > 0 ? 'Backfill batch complete — call again for more' : 'Backfill complete',
          ...result,
          timestamp: new Date().toISOString(),
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // D1 sync status endpoint
    if (url.pathname === '/sync-status') {
      try {
        const state = await env.DB.prepare(
          'SELECT * FROM sales_sync_state WHERE id = 1'
        ).first();

        const [d1Count, sourceBreakdown, kvData] = await Promise.all([
          env.DB.prepare('SELECT COUNT(*) as total FROM sales_history').first<{ total: number }>(),
          env.DB.prepare(
            "SELECT source, COUNT(*) as count FROM sales_history GROUP BY source"
          ).all<{ source: string; count: number }>(),
          env.TRADE_VALUES_KV.get('trade_values_data', 'json') as Promise<StoredData | null>,
        ]);

        const sources: Record<string, number> = {};
        for (const row of sourceBreakdown.results) {
          sources[row.source] = row.count;
        }

        return new Response(
          JSON.stringify({
            d1: {
              totalSales: d1Count?.total ?? 0,
              bySource: sources,
              syncStatus: state?.sync_status ?? 'unknown',
              lastSyncAt: state?.last_sync_at ?? null,
              lastTradeTimestamp: state?.last_trade_timestamp ?? null,
              errorMessage: state?.error_message ?? null,
              mintgarden: {
                lastTimestamp: state?.mg_last_timestamp ?? null,
                totalSynced: state?.mg_total_synced ?? 0,
              },
            },
            kv: {
              totalSales: kvData?.total_sales_count ?? 0,
              lastUpdated: kvData?.last_updated ?? null,
            },
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: String(error) }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    // Get trait values data
    if (url.pathname === '/trait-values' || url.pathname === '/api/trait-values') {
      try {
        const data = await env.TRADE_VALUES_KV.get('trade_values_data', 'json') as StoredData | null;
        if (data) {
          // Optional category filter
          const category = url.searchParams.get('category');
          if (category && data.by_category[category]) {
            return new Response(
              JSON.stringify({
                trait_stats: data.by_category[category],
                total_sales_count: data.total_sales_count,
                last_updated: data.last_updated,
              }),
              { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }
        return new Response(
          JSON.stringify({ error: 'No data available yet' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: String(error) }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    // Status endpoint
    if (url.pathname === '/status') {
      try {
        const data = await env.TRADE_VALUES_KV.get('trade_values_data', 'json') as StoredData | null;
        if (data) {
          return new Response(
            JSON.stringify({
              status: 'ok',
              source: 'dexie',
              last_updated: data.last_updated,
              total_sales: data.total_sales_count,
              total_traits: data.trait_stats.length,
              fetch_duration_ms: data.fetch_duration_ms,
              categories: Object.keys(data.by_category),
            }),
            { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        return new Response(
          JSON.stringify({ status: 'no_data', message: 'No data in KV yet' }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ status: 'error', error: String(error) }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    // ============ FAVORITE STATS ENDPOINTS ============

    // Track a favorite save (POST /api/favorite-stats/track)
    if (url.pathname === '/api/favorite-stats/track' && request.method === 'POST') {
      try {
        const body = await request.json() as TrackFavoriteRequest;

        // Get existing stats or create new
        let stats = await env.TRADE_VALUES_KV.get('favorite_stats', 'json') as FavoriteStatsData | null;
        if (!stats) {
          stats = {
            totalSaves: 0,
            savesByDate: {},
            attributes: {},
            combinations: {},
            lastUpdated: new Date().toISOString(),
          };
        }

        // Increment total saves
        stats.totalSaves++;

        // Track by date
        const today = new Date().toISOString().split('T')[0];
        stats.savesByDate[today] = (stats.savesByDate[today] || 0) + 1;

        // Track attributes
        const attrNames: string[] = [];
        for (const [category, value] of Object.entries(body.attributes)) {
          if (!value) continue;

          // Initialize category if needed
          if (!stats.attributes[category]) {
            stats.attributes[category] = {};
          }

          // Handle array values (like Mouth with overlays)
          const values = Array.isArray(value) ? value : [value];
          for (const v of values) {
            // Extract attribute name from path
            const match = v.match(/\/([^/]+)\.png$/i);
            const attrName = match ? match[1].replace(/^[A-Z]+_/, '') : v;
            stats.attributes[category][attrName] = (stats.attributes[category][attrName] || 0) + 1;
            attrNames.push(attrName);
          }
        }

        // Track combinations (top 2-3 most distinctive attributes)
        if (attrNames.length >= 2) {
          // Sort for consistent combo keys
          const sortedAttrs = attrNames.slice(0, 3).sort();
          const comboKey = sortedAttrs.join(' + ');
          stats.combinations[comboKey] = (stats.combinations[comboKey] || 0) + 1;
        }

        stats.lastUpdated = new Date().toISOString();

        // Store updated stats
        await env.TRADE_VALUES_KV.put('favorite_stats', JSON.stringify(stats));

        return new Response(
          JSON.stringify({ success: true, totalSaves: stats.totalSaves }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: String(error) }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    // Get favorite stats (GET /api/favorite-stats) - password protected
    if (url.pathname === '/api/favorite-stats' && request.method === 'GET') {
      const password = url.searchParams.get('password');
      const adminPassword = env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

      if (password !== adminPassword) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      try {
        const stats = await env.TRADE_VALUES_KV.get('favorite_stats', 'json') as FavoriteStatsData | null;
        if (!stats) {
          return new Response(
            JSON.stringify({
              totalSaves: 0,
              savesByDate: {},
              attributes: {},
              combinations: {},
              lastUpdated: null,
            }),
            { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        return new Response(JSON.stringify(stats), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: String(error) }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    // Reset favorite stats (POST /api/favorite-stats/reset) - password protected
    if (url.pathname === '/api/favorite-stats/reset' && request.method === 'POST') {
      const password = url.searchParams.get('password');
      const adminPassword = env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

      if (password !== adminPassword) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      try {
        await env.TRADE_VALUES_KV.delete('favorite_stats');
        return new Response(
          JSON.stringify({ success: true, message: 'Stats reset' }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: String(error) }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    return new Response(
      'Wojak Trade Values API (Dexie + MintGarden)\n\nEndpoints:\n- GET /trait-values - Get all trait statistics\n- GET /trait-values?category=head - Filter by category\n- GET /status - Check worker status\n- GET /sync-status - Check D1 sync health (Dexie + MintGarden)\n- POST /trigger-fetch - Manually trigger data refresh\n- GET /backfill-wallets - Backfill missing wallet addresses from MintGarden\n- GET /backfill-wallets?wait=true - Backfill and wait for results\n- POST /api/favorite-stats/track - Track favorite save\n- GET /api/favorite-stats?password=xxx - Get favorite stats (admin)',
      { status: 200, headers: { 'Content-Type': 'text/plain', ...corsHeaders } }
    );
  },
};
