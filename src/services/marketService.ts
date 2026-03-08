/**
 * Market Service
 *
 * Fetches NFT listings from MintGarden and Dexie APIs.
 */

import {
  COLLECTION_ID,
  MINTGARDEN_API,
  DEXIE_API,
  CACHE_DURATIONS,
  STORAGE_KEYS,
  getNftImageUrl,
} from './constants';
import { safeStorage } from '@/utils/safeStorage';

// ============ Types ============

export interface NFTListing {
  nftId: string;
  priceXch: number;
  priceUsd?: number;
  source: 'mintgarden' | 'dexie';
  launcherId?: string;
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
  };
}

export interface MarketStats {
  floorPrice: number;
  totalListings: number;
  volume24h: number;
  avgPrice: number;
  lastUpdated: Date;
}

// ============ Cache ============

interface ListingsCache {
  data: NFTListing[] | null;
  timestamp: number;
  loading: Promise<NFTListing[]> | null;
}

const listingsCache: ListingsCache = {
  data: null,
  timestamp: 0,
  loading: null,
};

// ============ Helpers ============

function mojosToXch(mojos: number): number {
  if (mojos >= 1e9) {
    return mojos / 1e12;
  }
  return mojos;
}

function extractNftId(obj: Record<string, unknown>): string | null {
  const fields = ['token_id', 'edition_number', 'edition', 'nft_id'];
  for (const field of fields) {
    const val = obj[field];
    if (val != null) {
      const id = String(val);
      const num = parseInt(id, 10);
      if (!isNaN(num) && num >= 1 && num <= 4200) {
        return String(num);
      }
    }
  }

  // Try name pattern #123
  const name = obj.name as string | undefined;
  if (name) {
    const match = name.match(/#(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 4200) {
        return String(num);
      }
    }
  }

  return null;
}

function extractPrice(obj: Record<string, unknown>): number | null {
  const fields = ['price', 'xch_price', 'price_xch', 'amount', 'amount_xch'];
  for (const field of fields) {
    const val = obj[field] as number | undefined;
    if (val != null && val > 0) {
      return mojosToXch(val);
    }
  }
  return null;
}

// ============ LocalStorage Cache ============

function loadCachedListings(): NFTListing[] | null {
  const data = safeStorage.getJSON<{ listings: NFTListing[]; timestamp: number } | null>(STORAGE_KEYS.listings, null);
  if (!data) return null;

  const age = Date.now() - data.timestamp;

  if (age > CACHE_DURATIONS.localStorage) {
    safeStorage.removeItem(STORAGE_KEYS.listings);
    return null;
  }

  const listings = data.listings;

  // Only populate memory cache with non-empty data to prevent cache poisoning
  if (listings.length > 0) {
    listingsCache.data = listings;
    listingsCache.timestamp = data.timestamp;
  }

  return listings;
}

function saveListingsToCache(listings: NFTListing[]): void {
  // Never cache empty results — they indicate API failure, not "no listings"
  if (listings.length === 0) return;

  safeStorage.setJSON(STORAGE_KEYS.listings, {
    listings,
    timestamp: Date.now(),
  });
}

// ============ API Fetchers ============

async function fetchMintGardenListings(): Promise<NFTListing[]> {
  const listings: NFTListing[] = [];
  let page: string | null = null;
  let pageCount = 0;
  const maxPages = 5;

  try {
    while (pageCount < maxPages) {
      let url = `${MINTGARDEN_API}/collections/${COLLECTION_ID}/nfts/by_offers?size=100&sort_by=xch_price&require_price=true`;
      if (page) {
        url += `&page=${encodeURIComponent(page)}`;
      }

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
            launcherId: item.id || item.launcher_id,
            name: item.name,
          });
        }
      }

      if (!data.next) break;
      page = data.next;
      pageCount++;
    }

  } catch (error) {
    console.error('[MarketService] MintGarden error:', error);
  }

  return listings;
}

async function fetchDexieListings(): Promise<NFTListing[]> {
  const listings: NFTListing[] = [];
  let page = 1;
  const maxPages = 5;

  try {
    while (page <= maxPages) {
      const url = `${DEXIE_API}/offers?type=nft&collection=${COLLECTION_ID}&status=0&page_size=100&page=${page}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Dexie fetch failed: ${response.status}`);
      }
      const data = await response.json();

      const offers = data.offers || [];
      if (offers.length === 0) break;

      for (const offer of offers) {
        if (offer.status !== 0) continue;

        let nftId: string | null = null;
        let priceXch: number | null = null;

        // Extract NFT ID from offered array
        for (const item of offer.offered || []) {
          if (item.type === 'nft' || item.asset_id === COLLECTION_ID) {
            nftId = extractNftId(item);
            break;
          }
        }

        // Get XCH price from requested array
        for (const item of offer.requested || []) {
          if (item.type === 'xch' || item.asset_id === null || item.asset_id === 'xch') {
            priceXch = mojosToXch(item.amount || 0);
            break;
          }
        }

        // Fallback to offer.price
        if (!priceXch && offer.price) {
          priceXch = mojosToXch(offer.price);
        }

        if (nftId && priceXch) {
          listings.push({
            nftId,
            priceXch,
            source: 'dexie',
            listingDate: offer.date_created ? Date.parse(offer.date_created) : undefined,
          });
        }
      }

      page++;
    }

  } catch (error) {
    console.error('[MarketService] Dexie error:', error);
  }

  return listings;
}

function mergeListings(mintgarden: NFTListing[], dexie: NFTListing[]): ListingsResult {
  const byNftId = new Map<string, NFTListing>();

  // Process in priority order (lowest priority first, so higher priority overwrites)
  const allListings = [...dexie, ...mintgarden];

  for (const listing of allListings) {
    const existing = byNftId.get(listing.nftId);

    if (!existing) {
      byNftId.set(listing.nftId, listing);
    } else {
      // Keep lower price, prefer MintGarden for equal prices
      if (
        listing.priceXch < existing.priceXch ||
        (listing.priceXch === existing.priceXch && listing.source === 'mintgarden')
      ) {
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
    },
  };
}

// ============ Service Interface ============

export interface IMarketService {
  fetchAllListings(forceRefresh?: boolean): Promise<ListingsResult>;
  getCachedListings(): NFTListing[] | null;
  hasCachedListings(): boolean;
  getFloorPrice(listings: NFTListing[]): number;
  getMarketStats(listings: NFTListing[]): MarketStats;
  getNftImageUrl(nftId: string): string;
  prefetchListings(): void;
}

class MarketService implements IMarketService {
  async fetchAllListings(forceRefresh = false): Promise<ListingsResult> {
    const now = Date.now();

    // Return memory cached data if fresh
    if (!forceRefresh && listingsCache.data && now - listingsCache.timestamp < CACHE_DURATIONS.listings) {
      return {
        listings: listingsCache.data,
        byNftId: new Map(listingsCache.data.map(l => [l.nftId, l])),
        lastUpdated: new Date(listingsCache.timestamp),
        sources: { mintgarden: 0, dexie: 0 },
      };
    }

    // Check localStorage cache
    if (!forceRefresh) {
      const cached = loadCachedListings();
      if (cached && cached.length > 0) {
        // Return cached immediately, refresh in background
        setTimeout(() => this.prefetchListings(), 100);
        return {
          listings: cached,
          byNftId: new Map(cached.map(l => [l.nftId, l])),
          lastUpdated: new Date(listingsCache.timestamp),
          sources: { mintgarden: 0, dexie: 0 },
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
        sources: { mintgarden: 0, dexie: 0 },
      };
    }

    // Start loading
    listingsCache.loading = (async () => {

      const [mintgarden, dexie] = await Promise.all([
        fetchMintGardenListings(),
        fetchDexieListings(),
      ]);

      const result = mergeListings(mintgarden, dexie);

      // Only update caches with non-empty results to prevent cache poisoning
      // from temporary API failures
      if (result.listings.length > 0) {
        listingsCache.data = result.listings;
        listingsCache.timestamp = Date.now();
        saveListingsToCache(result.listings);
      }
      listingsCache.loading = null;

      return result.listings;
    })();

    const data = await listingsCache.loading;
    return {
      listings: data,
      byNftId: new Map(data.map(l => [l.nftId, l])),
      lastUpdated: new Date(listingsCache.timestamp),
      sources: { mintgarden: 0, dexie: 0 },
    };
  }

  getCachedListings(): NFTListing[] | null {
    // Only return cache if it has actual listings (prevent empty array cache bug)
    if (listingsCache.data && listingsCache.data.length > 0) return listingsCache.data;
    const cached = loadCachedListings();
    // Reject empty arrays as invalid cache
    return cached && cached.length > 0 ? cached : null;
  }

  hasCachedListings(): boolean {
    if (listingsCache.data && listingsCache.data.length > 0) return true;
    const cached = loadCachedListings();
    return cached !== null && cached.length > 0;
  }

  getFloorPrice(listings: NFTListing[]): number {
    if (listings.length === 0) return 0;
    return Math.min(...listings.map(l => l.priceXch));
  }

  getMarketStats(listings: NFTListing[]): MarketStats {
    const floor = this.getFloorPrice(listings);
    const avg = listings.length > 0
      ? listings.reduce((sum, l) => sum + l.priceXch, 0) / listings.length
      : 0;

    return {
      floorPrice: floor,
      totalListings: listings.length,
      volume24h: 0, // Would need sales data
      avgPrice: avg,
      lastUpdated: new Date(),
    };
  }

  getNftImageUrl(nftId: string): string {
    return getNftImageUrl(nftId);
  }

  prefetchListings(): void {
    if (listingsCache.data && Date.now() - listingsCache.timestamp < CACHE_DURATIONS.listings) {
      return;
    }

    if (listingsCache.loading) return;

    this.fetchAllListings(true).catch(err => {
      console.warn('[MarketService] Prefetch failed:', err);
    });
  }
}

// Singleton instance
export const marketService = new MarketService();

// ============ NFT Owner Service ============

interface OwnerCache {
  data: Map<string, string>;
  timestamp: number;
  loading: Promise<Map<string, string>> | null;
}

const ownerCache: OwnerCache = {
  data: new Map(),
  timestamp: 0,
  loading: null,
};

async function fetchNftOwners(): Promise<Map<string, string>> {
  const owners = new Map<string, string>();
  let page: string | null = null;
  let pageCount = 0;
  const maxPages = 50; // Fetch all ~4200 NFTs (100 per page)

  try {
    while (pageCount < maxPages) {
      let url = `${MINTGARDEN_API}/collections/${COLLECTION_ID}/nfts?size=100`;
      if (page) {
        url += `&page=${encodeURIComponent(page)}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`MintGarden fetch failed: ${response.status}`);
      }
      const data = await response.json();

      const items = data.items || [];
      if (items.length === 0) break;

      for (const item of items) {
        const nftId = extractNftId(item);
        const ownerAddress = item.owner_address_encoded_id;

        if (nftId && ownerAddress) {
          owners.set(nftId, ownerAddress);
        }
      }

      if (!data.next) break;
      page = data.next;
      pageCount++;
    }

  } catch (error) {
    console.error('[MarketService] Owner fetch error:', error);
  }

  return owners;
}

export interface NftOwnerInfo {
  address: string;
  name: string | null;
  profileUrl: string;
}

export async function getNftOwner(nftId: string): Promise<NftOwnerInfo | null> {
  // Check cache first
  const cached = ownerCache.data.get(nftId);
  if (cached) {
    return JSON.parse(cached) as NftOwnerInfo;
  }

  // Fetch owner for this specific NFT - search by edition number only
  // NFT names vary by character type (e.g., "Wojak #1234", "Bepe Soyjak #4023")
  try {
    const url = `${MINTGARDEN_API}/collections/${COLLECTION_ID}/nfts?size=1&search=${nftId}`;

    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const items = data.items || [];

    if (items.length > 0) {
      const item = items[0];
      const ownerAddress = item.owner_address_encoded_id;
      const ownerName = item.owner_name || null;
      const ownerId = item.owner_id;

      // Build profile URL
      let profileUrl: string;
      if (ownerName && ownerId) {
        // MintGarden profile format: /profile/{name_slug}-{owner_id}
        const nameSlug = ownerName.trim().toLowerCase().replace(/\s+/g, '_');
        profileUrl = `https://mintgarden.io/profile/${nameSlug}-${ownerId}`;
      } else if (ownerAddress) {
        // Fallback to Spacescan for wallets without MintGarden profile
        profileUrl = `https://www.spacescan.io/address/${ownerAddress}`;
      } else {
        return null;
      }

      const ownerInfo: NftOwnerInfo = {
        address: ownerAddress || '',
        name: ownerName,
        profileUrl,
      };

      ownerCache.data.set(nftId, JSON.stringify(ownerInfo));
      return ownerInfo;
    }

    return null;
  } catch {
    return null;
  }
}

export function getCachedNftOwner(nftId: string): string | null {
  return ownerCache.data.get(nftId) || null;
}

export async function prefetchNftOwners(): Promise<void> {
  if (ownerCache.data.size > 0 && Date.now() - ownerCache.timestamp < CACHE_DURATIONS.listings) {
    return;
  }

  if (ownerCache.loading) return;

  ownerCache.loading = fetchNftOwners();
  const owners = await ownerCache.loading;
  ownerCache.data = owners;
  ownerCache.timestamp = Date.now();
  ownerCache.loading = null;
}
