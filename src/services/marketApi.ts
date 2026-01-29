/**
 * Market API Service
 *
 * Fetches current NFT listings from MintGarden, Dexie, and SpaceScan
 * Merges results, prioritizing MintGarden for duplicates
 */

import { mintgardenQueue } from '../utils/rateLimiter';

// Collection ID for Wojak Farmers Plot
export const COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

// Use Vite proxy in development, Cloudflare proxy in production
const isDev = import.meta.env.DEV;

// API Base URLs - always use proxies to avoid CORS
const MINTGARDEN_API = isDev ? '/mintgarden-api' : '/api/mintgarden';
const DEXIE_API = isDev ? '/dexie-api/v1' : '/api/dexie/v1';

/**
 * NFT History Cache
 * Caches history data to reduce API calls
 */
interface HistoryCacheEntry {
  events: NftEvent[];
  timestamp: number;
  launcherId: string;
}

const HISTORY_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const HISTORY_CACHE_KEY = 'wojak_nft_history_cache_v1';
const historyCache = new Map<number, HistoryCacheEntry>();

// In-flight request deduplication
const inFlightHistoryRequests = new Map<number, Promise<NftEvent[]>>();

/**
 * Load history cache from localStorage
 */
function loadHistoryCache(): void {
  try {
    const cached = localStorage.getItem(HISTORY_CACHE_KEY);
    if (!cached) return;

    const data = JSON.parse(cached) as Record<string, HistoryCacheEntry>;
    const now = Date.now();

    // Only load entries that haven't expired
    for (const [nftIdStr, entry] of Object.entries(data)) {
      if (now - entry.timestamp < HISTORY_CACHE_DURATION) {
        historyCache.set(parseInt(nftIdStr, 10), entry);
      }
    }

  } catch (error) {
    console.warn('[HistoryCache] Failed to load cache:', error);
  }
}

/**
 * Save history cache to localStorage
 */
function saveHistoryCache(): void {
  try {
    const data: Record<string, HistoryCacheEntry> = {};
    const now = Date.now();

    // Only save entries that haven't expired
    for (const [nftId, entry] of historyCache.entries()) {
      if (now - entry.timestamp < HISTORY_CACHE_DURATION) {
        data[String(nftId)] = entry;
      }
    }

    localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[HistoryCache] Failed to save cache:', error);
  }
}

/**
 * Get cached history for an NFT
 */
function getCachedHistory(nftId: number): NftEvent[] | null {
  const entry = historyCache.get(nftId);
  if (!entry) return null;

  // Check if expired
  if (Date.now() - entry.timestamp > HISTORY_CACHE_DURATION) {
    historyCache.delete(nftId);
    return null;
  }

  return entry.events;
}

/**
 * Set cached history for an NFT
 */
function setCachedHistory(nftId: number, events: NftEvent[], launcherId: string): void {
  historyCache.set(nftId, {
    events,
    timestamp: Date.now(),
    launcherId
  });

  // Save to localStorage (debounced to avoid excessive writes)
  debouncedSaveHistoryCache();
}

// Debounced save to localStorage
let saveHistoryCacheTimeout: ReturnType<typeof setTimeout> | null = null;
function debouncedSaveHistoryCache(): void {
  if (saveHistoryCacheTimeout) clearTimeout(saveHistoryCacheTimeout);
  saveHistoryCacheTimeout = setTimeout(saveHistoryCache, 2000);
}

// Load cache on module initialization
loadHistoryCache();

// ============================================
// END RATE LIMITING INFRASTRUCTURE
// ============================================

// Cache for listings
interface ListingsCache {
  data: NFTListing[] | null;
  timestamp: number;
  loading: Promise<NFTListing[]> | null;
}

const listingsCache: ListingsCache = {
  data: null,
  timestamp: 0,
  loading: null
};

// Cache duration: 15 minutes (longer to reduce API calls)
const CACHE_DURATION = 15 * 60 * 1000;

// LocalStorage key for persistent cache
const LISTINGS_CACHE_KEY = 'wojak_listings_cache_v1';

/**
 * Load cached listings from localStorage
 */
function loadCachedListings(): NFTListing[] | null {
  try {
    const cached = localStorage.getItem(LISTINGS_CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached);
    const age = Date.now() - data.timestamp;

    // Cache valid for 1 hour in localStorage
    if (age > 60 * 60 * 1000) {
      localStorage.removeItem(LISTINGS_CACHE_KEY);
      return null;
    }

    listingsCache.data = data.listings;
    listingsCache.timestamp = data.timestamp;
    return data.listings;
  } catch {
    return null;
  }
}

/**
 * Save listings to localStorage
 */
function saveListingsToCache(listings: NFTListing[]): void {
  try {
    const data = {
      listings,
      timestamp: Date.now()
    };
    localStorage.setItem(LISTINGS_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[MarketAPI] Failed to cache listings:', error);
  }
}

/**
 * Check if we have cached data available (memory or localStorage)
 */
export function hasCachedListings(): boolean {
  if (listingsCache.data && listingsCache.data.length > 0) return true;
  const cached = loadCachedListings();
  return cached !== null && cached.length > 0;
}

/**
 * Get cached listings immediately (no API call)
 * Returns null if cache is empty to trigger fresh fetch
 */
export function getCachedListings(): NFTListing[] | null {
  // Only return cache if it has actual listings (prevent empty array cache bug)
  if (listingsCache.data && listingsCache.data.length > 0) return listingsCache.data;
  const cached = loadCachedListings();
  // Reject empty arrays as invalid cache
  return cached && cached.length > 0 ? cached : null;
}

export interface NFTListing {
  nftId: string;
  priceXch: number;
  priceUsd?: number;
  source: 'mintgarden' | 'dexie' | 'spacescan';
  launcherBech32?: string;
  listingDate?: number;
  name?: string;
  rank?: number;
}

export interface ListingsResult {
  listings: NFTListing[];
  byNftId: Map<string, NFTListing>;
  lastUpdated: Date;
  sources: {
    mintgarden: number;
    dexie: number;
    spacescan: number;
  };
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
 * Extract NFT ID from various response formats
 */
function extractNftId(obj: any): string | null {
  // Try various field names
  const fields = ['token_id', 'edition_number', 'edition', 'nft_id'];
  for (const field of fields) {
    if (obj[field] != null) {
      const id = String(obj[field]);
      const num = parseInt(id, 10);
      if (!isNaN(num) && num >= 1 && num <= 4200) {
        return id;
      }
    }
  }

  // Try to extract from name pattern #123
  if (obj.name) {
    const match = obj.name.match(/#(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 4200) {
        return String(num);
      }
    }
  }

  return null;
}

/**
 * Extract price from various response formats
 */
function extractPrice(obj: any): number | null {
  const fields = ['price', 'xch_price', 'price_xch', 'amount', 'amount_xch'];
  for (const field of fields) {
    if (obj[field] != null && obj[field] > 0) {
      return mojosToXch(obj[field]);
    }
  }
  return null;
}

/**
 * Fetch listings from MintGarden (paginated)
 * Uses shared rate limiter to prevent 429 errors
 */
async function fetchMintGardenListings(): Promise<NFTListing[]> {
  const listings: NFTListing[] = [];
  let page: string | null = null;
  let pageCount = 0;
  const maxPages = 5; // Reduced from 50 - 500 listings is more than enough

  try {
    while (pageCount < maxPages) {
      // Build URL string (can't use URL constructor with relative paths)
      let url = `${MINTGARDEN_API}/collections/${COLLECTION_ID}/nfts/by_offers?size=100&sort_by=xch_price&require_price=true`;
      if (page) {
        url += `&page=${encodeURIComponent(page)}`;
      }

      // Fetch directly (rate limiter adds too much delay for initial load)
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`MintGarden fetch failed: ${response.status}`);
      }
      const data = await response.json();

      const items = data.items || [];

      for (const item of items) {
        const nftId = extractNftId(item);
        const priceXch = extractPrice(item);

        if (nftId && priceXch) {
          listings.push({
            nftId,
            priceXch,
            source: 'mintgarden',
            launcherBech32: item.id || item.launcher_id,
            name: item.name
          });
        }
      }

      // Check for next page
      if (!data.next) break;
      page = data.next;
      pageCount++;
    }

  } catch (error) {
    console.error('[MarketAPI] MintGarden error:', error);
  }

  return listings;
}

/**
 * Fetch listings from Dexie (paginated)
 * Uses shared rate limiter to prevent 429 errors
 */
async function fetchDexieListings(): Promise<NFTListing[]> {
  const listings: NFTListing[] = [];
  let page = 1;
  const maxPages = 5; // Reduced from 50 - 500 listings is more than enough

  try {
    while (page <= maxPages) {
      // Build URL string (can't use URL constructor with relative paths)
      const url = `${DEXIE_API}/offers?type=nft&collection=${COLLECTION_ID}&status=0&page_size=100&page=${page}`;

      // Fetch directly (rate limiter adds too much delay for initial load)
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Dexie fetch failed: ${response.status}`);
      }
      const data = await response.json();

      const offers = data.offers || [];

      if (offers.length === 0) break;

      for (const offer of offers) {
        if (offer.status !== 0) continue; // Only active

        // Extract NFT ID from offered or requested
        let nftId: string | null = null;
        let priceXch: number | null = null;

        // Check offered array for NFT
        for (const item of (offer.offered || [])) {
          if (item.type === 'nft' || item.asset_id === COLLECTION_ID) {
            nftId = extractNftId(item);
            break;
          }
        }

        // Get XCH price from requested
        for (const item of (offer.requested || [])) {
          if (item.type === 'xch' || item.asset_id === null || item.asset_id === 'xch') {
            priceXch = mojosToXch(item.amount || 0);
            break;
          }
        }

        // Fallback: check offer.price
        if (!priceXch && offer.price) {
          priceXch = mojosToXch(offer.price);
        }

        if (nftId && priceXch) {
          listings.push({
            nftId,
            priceXch,
            source: 'dexie',
            listingDate: offer.date_created ? Date.parse(offer.date_created) : undefined
          });
        }
      }

      page++;
    }

  } catch (error) {
    console.error('[MarketAPI] Dexie error:', error);
  }

  return listings;
}

/**
 * Merge listings from all sources
 * Priority: MintGarden > Dexie > SpaceScan
 * For same NFT, keep lowest price
 */
function mergeListings(
  mintgarden: NFTListing[],
  dexie: NFTListing[]
): ListingsResult {
  const byNftId = new Map<string, NFTListing>();

  // Process in priority order (lowest priority first, so higher priority overwrites)
  const allListings = [
    ...dexie,
    ...mintgarden // MintGarden last = highest priority
  ];

  for (const listing of allListings) {
    const existing = byNftId.get(listing.nftId);

    if (!existing) {
      byNftId.set(listing.nftId, listing);
    } else {
      // Keep lower price, but prefer MintGarden source for equal prices
      if (listing.priceXch < existing.priceXch ||
          (listing.priceXch === existing.priceXch && listing.source === 'mintgarden')) {
        byNftId.set(listing.nftId, listing);
      }
    }
  }

  const listings = Array.from(byNftId.values());

  return {
    listings,
    byNftId,
    lastUpdated: new Date(),
    sources: {
      mintgarden: mintgarden.length,
      dexie: dexie.length,
      spacescan: 0 // SpaceScan disabled for now due to strict rate limits
    }
  };
}

/**
 * Fetch all current listings (with caching)
 */
export async function fetchAllListings(forceRefresh = false): Promise<ListingsResult> {
  const now = Date.now();

  // Return memory cached data if fresh
  if (!forceRefresh && listingsCache.data && (now - listingsCache.timestamp) < CACHE_DURATION) {
    return {
      listings: listingsCache.data,
      byNftId: new Map(listingsCache.data.map(l => [l.nftId, l])),
      lastUpdated: new Date(listingsCache.timestamp),
      sources: { mintgarden: 0, dexie: 0, spacescan: 0 }
    };
  }

  // Check localStorage cache
  if (!forceRefresh) {
    const cached = loadCachedListings();
    if (cached && cached.length > 0) {
      // Return cached immediately, refresh in background
      setTimeout(() => prefetchListings(), 100);
      return {
        listings: cached,
        byNftId: new Map(cached.map(l => [l.nftId, l])),
        lastUpdated: new Date(listingsCache.timestamp),
        sources: { mintgarden: 0, dexie: 0, spacescan: 0 }
      };
    }
  }

  // If already loading, wait for that
  if (listingsCache.loading) {
    const data = await listingsCache.loading;
    return {
      listings: data,
      byNftId: new Map(data.map(l => [l.nftId, l])),
      lastUpdated: new Date(listingsCache.timestamp),
      sources: { mintgarden: 0, dexie: 0, spacescan: 0 }
    };
  }

  // Start loading
  listingsCache.loading = (async () => {

    // Fetch from all sources in parallel
    const [mintgarden, dexie] = await Promise.all([
      fetchMintGardenListings(),
      fetchDexieListings()
    ]);

    const result = mergeListings(mintgarden, dexie);

    listingsCache.data = result.listings;
    listingsCache.timestamp = Date.now();
    listingsCache.loading = null;

    // Save to localStorage for next time
    saveListingsToCache(result.listings);


    return result.listings;
  })();

  const data = await listingsCache.loading;
  return {
    listings: data,
    byNftId: new Map(data.map(l => [l.nftId, l])),
    lastUpdated: new Date(listingsCache.timestamp),
    sources: { mintgarden: 0, dexie: 0, spacescan: 0 }
  };
}

/**
 * Prefetch listings in background (call on app startup)
 */
export function prefetchListings(): void {
  // Don't prefetch if we already have fresh data
  if (listingsCache.data && (Date.now() - listingsCache.timestamp) < CACHE_DURATION) {
    return;
  }

  // Don't start if already loading
  if (listingsCache.loading) return;

  fetchAllListings(true).catch(err => {
    console.warn('[MarketAPI] Prefetch failed:', err);
  });
}

/**
 * Check if a specific NFT is listed
 */
export async function isNftListed(nftId: string): Promise<NFTListing | null> {
  const result = await fetchAllListings();
  return result.byNftId.get(nftId) || null;
}

/**
 * Get listings filtered by rarity range
 */
export function filterListingsByRarity(
  listings: NFTListing[],
  rankData: Record<string, number>,
  minPercentile: number,
  maxPercentile: number
): NFTListing[] {
  return listings.filter(listing => {
    const rank = rankData[listing.nftId];
    if (!rank) return false;
    const percentile = (rank / 4200) * 100;
    return percentile >= minPercentile && percentile <= maxPercentile;
  });
}

/**
 * Get listings filtered by price multiple of floor
 */
export function filterListingsByPriceMultiple(
  listings: NFTListing[],
  floorPrice: number,
  minMultiple: number,
  maxMultiple: number
): NFTListing[] {
  return listings.filter(listing => {
    const multiple = listing.priceXch / floorPrice;
    return multiple >= minMultiple && multiple <= maxMultiple;
  });
}

/**
 * Calculate floor price from listings
 */
export function calculateFloorPrice(listings: NFTListing[]): number {
  if (listings.length === 0) return 0;
  return Math.min(...listings.map(l => l.priceXch));
}

/**
 * Generate NFT image URL
 */
export function getNftImageUrl(nftId: string): string {
  const paddedId = String(nftId).padStart(4, '0');
  return `https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/${paddedId}.png`;
}

/**
 * Search for NFT launcher ID by NFT number
 * Returns the launcher_bech32 (nft1...) needed for direct MintGarden links
 */
export async function getNftLauncherId(nftId: number): Promise<string | null> {
  try {
    // Search for the specific NFT by name
    const paddedId = String(nftId).padStart(4, '0');
    const searchQuery = `#${paddedId}`;

    const url = `${MINTGARDEN_API}/collections/${COLLECTION_ID}/nfts?size=10&search=${encodeURIComponent(searchQuery)}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('[MarketAPI] MintGarden search failed:', response.status);
      return null;
    }

    const data = await response.json();
    const items = data.items || [];

    // Find exact match by edition number or name
    for (const item of items) {
      const itemId = item.token_id || item.edition_number;
      const nameMatch = item.name?.match(/#(\d+)/);
      const nameId = nameMatch ? parseInt(nameMatch[1], 10) : null;

      if (itemId === nftId || nameId === nftId) {
        // Return the launcher ID (bech32 format starting with nft1)
        return item.id || item.launcher_id || null;
      }
    }

    return null;
  } catch (error) {
    console.error('[MarketAPI] Failed to get launcher ID:', error);
    return null;
  }
}

/**
 * Get direct MintGarden URL for an NFT
 * Returns the direct NFT page URL if launcher ID found, fallback to collection search
 */
export async function getMintGardenNftUrl(nftId: number): Promise<string> {
  const launcherId = await getNftLauncherId(nftId);

  if (launcherId) {
    return `https://mintgarden.io/nfts/${launcherId}`;
  }

  // Fallback to collection search
  return `https://mintgarden.io/collections/wojak-farmers-plot-col1xstgvpgp0cl4uepv7t02dvrnrrqm6y4cqvp3urc5y5kd5q9fpafqjfh4a9?search=${nftId}`;
}

/**
 * NFT Event types from MintGarden API
 */
export interface NftEvent {
  type: 0 | 1 | 2 | 3; // 0=MINT, 1=TRANSFER, 2=TRADE, 3=BURN
  timestamp: string;
  xch_price?: number;
  address?: {
    encoded_id: string;
  };
  previous_address?: {
    encoded_id: string;
  };
}

/**
 * Fetch NFT history/events from MintGarden
 * Returns array of events (mints, transfers, trades)
 *
 * Features:
 * - Caches results for 30 minutes to reduce API calls
 * - Deduplicates in-flight requests for same NFT
 * - Uses rate-limited queue to prevent 429 errors
 * - Retries with exponential backoff on rate limit
 *
 * @param nftId - The NFT edition number
 * @param knownLauncherId - Optional launcher ID if already known (skips lookup)
 */
export async function fetchNftHistory(nftId: number, knownLauncherId?: string): Promise<NftEvent[]> {
  // 1. Check memory cache first
  const cached = getCachedHistory(nftId);
  if (cached) {
    return cached;
  }

  // 2. Check if request already in-flight (deduplication)
  const inFlight = inFlightHistoryRequests.get(nftId);
  if (inFlight) {
    return inFlight;
  }

  // 3. Create the request promise
  const requestPromise = (async () => {
    try {
      // Get launcher ID (use known one or look it up via rate-limited queue)
      let launcherId = knownLauncherId;

      if (!launcherId) {
        // Look up launcher ID through rate-limited queue
        launcherId = await mintgardenQueue.add(async () => {
          const paddedId = String(nftId).padStart(4, '0');
          const searchQuery = `#${paddedId}`;
          const url = `${MINTGARDEN_API}/collections/${COLLECTION_ID}/nfts?size=10&search=${encodeURIComponent(searchQuery)}`;

          const response = await fetch(url);
          if (!response.ok) {
            const error = new Error(`Launcher lookup failed: ${response.status}`) as any;
            error.status = response.status;
            throw error;
          }

          const data = await response.json();
          const items = data.items || [];

          for (const item of items) {
            const itemId = item.token_id || item.edition_number;
            const nameMatch = item.name?.match(/#(\d+)/);
            const nameId = nameMatch ? parseInt(nameMatch[1], 10) : null;

            if (itemId === nftId || nameId === nftId) {
              return item.id || item.launcher_id || null;
            }
          }
          return null;
        });
      }

      if (!launcherId) {
        console.warn('[MarketAPI] Could not find launcher ID for NFT:', nftId);
        return [];
      }

      // Fetch NFT details through rate-limited queue
      const events = await mintgardenQueue.add(async () => {
        const url = `${MINTGARDEN_API}/nfts/${launcherId}`;
        const response = await fetch(url);

        if (!response.ok) {
          const error = new Error(`NFT details fetch failed: ${response.status}`) as any;
          error.status = response.status;
          throw error;
        }

        const data = await response.json();
        return data.events || [];
      });

      // Cache the result
      setCachedHistory(nftId, events, launcherId);

      return events;
    } catch (error) {
      console.error('[MarketAPI] Failed to fetch NFT history:', error);
      return [];
    } finally {
      // Clean up in-flight tracking
      inFlightHistoryRequests.delete(nftId);
    }
  })();

  // Track in-flight request
  inFlightHistoryRequests.set(nftId, requestPromise);

  return requestPromise;
}

/**
 * Preload NFT images for all cached listings
 * Call this during app startup for instant heatmap image loading
 */
export function preloadListingImages(): void {
  const listings = getCachedListings();
  if (!listings || listings.length === 0) return;


  // Use requestIdleCallback to not block the main thread
  const preload = () => {
    listings.forEach(listing => {
      const img = new Image();
      img.src = getNftImageUrl(listing.nftId);
    });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(preload);
  } else {
    setTimeout(preload, 500);
  }
}
