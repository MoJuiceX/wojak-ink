/**
 * Cloudflare Worker - Trade Values Fetcher
 * Runs every 30 minutes via Cron Trigger
 * Fetches NFT sales from Dexie API, calculates trait statistics, stores in KV
 */

interface Env {
  TRADE_VALUES_KV: KVNamespace;
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

interface StoredData {
  trait_stats: TraitStats[];
  by_category: Record<string, TraitStats[]>;
  all_sales: Sale[];
  total_sales_count: number;
  last_updated: string;
  fetch_duration_ms: number;
}

// Default configuration - based on API_INTEGRATION_GUIDE.md best practices
const DEFAULT_CONFIG = {
  COLLECTION_ID: 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah',
  DEXIE_API: 'https://api.dexie.space/v1',
  PAGE_SIZE: 100,
  MAX_PAGES: 20,
  // Dexie recommended: 500ms delay between pages
  RATE_LIMIT_DELAY_MS: 500,
  // Retry config
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY_MS: 1000,
  REQUEST_TIMEOUT_MS: 10000,
  // Creator sale prices to exclude
  EXCLUDED_PRICES: [0.3, 0.725, 0.82],
  PRICE_TOLERANCE: 0.01,
  // Metadata URL for trait lookup
  METADATA_URL: 'https://raw.githubusercontent.com/your-repo/wojak-ink-mobile/main/public/assets/nft-data/metadata.json',
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

// Fetch all trades from Dexie API with retry logic and circuit breaker
async function fetchAllTrades(collectionId: string): Promise<Sale[]> {
  const allTrades: Sale[] = [];
  let page = 1;
  let hasMore = true;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;

  console.warn('Fetching trades from Dexie API...');

  while (hasMore && page <= DEFAULT_CONFIG.MAX_PAGES) {
    const url = `${DEFAULT_CONFIG.DEXIE_API}/offers?status=4&offered=${collectionId}&requested=xch&page=${page}&page_size=${DEFAULT_CONFIG.PAGE_SIZE}&compact=true`;

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

        // Get XCH amount from requested array
        const xchRequest = offer.requested?.find(r => r.id === 'xch');
        if (!xchRequest) continue;

        const edition = extractEdition(nftOffer.name);
        if (!edition) {
          console.warn(`Could not extract edition from: ${nftOffer.name}`);
          continue;
        }

        const price = xchRequest.amount;

        // Skip creator sales
        if (isExcludedPrice(price)) {
          continue;
        }

        allTrades.push({
          edition,
          nftName: nftOffer.name,
          price_xch: price,
          timestamp: offer.date_completed,
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

// Calculate trait statistics
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
      // Step 1: Fetch all trades from Dexie
      const trades = await fetchAllTrades(collectionId);
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

      // Step 2: Fetch metadata for trait lookup
      const metadataMap = await fetchMetadata(env);
      console.warn(`Metadata loaded for ${metadataMap.size} NFTs`);

      // Step 3: Calculate trait statistics
      const { traitStats, byCategory } = calculateTraitStats(trades, metadataMap);
      console.warn(`Calculated stats for ${traitStats.length} traits`);

      // Step 4: Store in KV
      const storedData: StoredData = {
        trait_stats: traitStats,
        by_category: byCategory,
        all_sales: trades,
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

      console.warn(`Successfully stored data in KV (took ${storedData.fetch_duration_ms}ms)`);

      // Log top traits
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
      'Wojak Trade Values API\n\nEndpoints:\n- GET /trait-values - Get all trait statistics\n- GET /trait-values?category=head - Filter by category\n- GET /status - Check worker status\n- POST /trigger-fetch - Manually trigger data refresh\n- POST /api/favorite-stats/track - Track favorite save\n- GET /api/favorite-stats?password=xxx - Get favorite stats (admin)',
      { status: 200, headers: { 'Content-Type': 'text/plain', ...corsHeaders } }
    );
  },
};
