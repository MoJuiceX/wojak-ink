/**
 * BigPulp Service
 *
 * Loads BigPulp Intelligence data from JSON files and real market APIs.
 */

import type {
  NFTAnalysis,
  MarketStats,
  HeatMapCell,
  PriceDistribution,
  AttributeStats,
  NFTSale,
  NFTBasic,
  RarityTier,
} from '@/types/bigpulp';
import { COLLECTION_SIZE, getNftImageUrl } from './constants';
import { marketService } from './marketService';
import { getRecentSales, type SaleRecord } from './salesDatabank';
import { fetchCollectionStats } from './nftDataService';
import { getCurrentXchPrice } from './historicalPriceService';

// ============ Types for JSON Data ============

interface NFTTakeEntry {
  token_id: number;
  open_rarity_rank: number;
  take: string;
  tone: string;
  flags?: {
    is_top_10?: boolean;
    has_crown?: boolean;
    [key: string]: unknown;
  };
}

// Interface kept for future use
// interface TraitInsight {
//   trait_name: string;
//   category: string;
//   rarity: number;
//   value_assessment: string;
// }

// ============ Cache ============

let nftTakesCache: Record<string, NFTTakeEntry> | null = null;

// ============ Loaders ============

async function loadNftTakes(): Promise<Record<string, NFTTakeEntry>> {
  if (nftTakesCache) return nftTakesCache;

  try {
    const response = await fetch('/assets/BigPulp/nft_takes_v2.json');
    if (!response.ok) throw new Error('Failed to load NFT takes');
    nftTakesCache = await response.json();
    return nftTakesCache!;
  } catch (error) {
    console.error('Failed to load NFT takes:', error);
    return {};
  }
}

// Function kept for future use - loads trait insights JSON
// async function loadTraitInsights(): Promise<TraitInsight[]> {
//   if (traitInsightsCache) return traitInsightsCache;
//   try {
//     const response = await fetch('/assets/BigPulp/trait_insights.json');
//     if (!response.ok) throw new Error('Failed to load trait insights');
//     traitInsightsCache = await response.json();
//     return traitInsightsCache!;
//   } catch (error) {
//     console.error('Failed to load trait insights:', error);
//     return [];
//   }
// }

// Types for trait rankings data
interface TraitRankingEntry {
  rank: number;
  of: number;
  count: number;
}

interface TraitRankingsData {
  lookup: Record<string, Record<string, TraitRankingEntry>>;
}

// Cache for trait rankings
let traitRankingsCache: TraitRankingsData | null = null;

// Cache for metadata (NFT ID -> traits mapping)
interface MetadataEntry {
  edition: number;
  attributes: Array<{ trait_type: string; value: string }>;
}
let metadataCache: MetadataEntry[] | null = null;

async function loadTraitRankings(): Promise<TraitRankingsData> {
  if (traitRankingsCache) return traitRankingsCache;

  try {
    const response = await fetch('/assets/nft-data/trait_rankings.json');
    if (!response.ok) throw new Error('Failed to load trait rankings');
    traitRankingsCache = await response.json();
    return traitRankingsCache!;
  } catch (error) {
    console.error('Failed to load trait rankings:', error);
    return { lookup: {} };
  }
}

async function loadMetadata(): Promise<MetadataEntry[]> {
  if (metadataCache) return metadataCache;

  try {
    const response = await fetch('/assets/nft-data/metadata.json');
    if (!response.ok) throw new Error('Failed to load metadata');
    metadataCache = await response.json();
    return metadataCache!;
  } catch (error) {
    console.error('Failed to load metadata:', error);
    return [];
  }
}

/**
 * Get proper NFT name based on base character from metadata
 * e.g., "Alien Wojak #3666", "Bepe Soyjak #3768", "Papa Tang #0785"
 */
function getNftName(edition: number, metadata: MetadataEntry[]): string {
  const paddedId = String(edition).padStart(4, '0');
  const nftMetadata = metadata.find(m => m.edition === edition);

  if (nftMetadata) {
    const baseAttr = nftMetadata.attributes.find(a => a.trait_type === 'Base');
    if (baseAttr) {
      return `${baseAttr.value} #${paddedId}`;
    }
  }

  // Fallback to generic name if metadata not found
  return `Wojak #${paddedId}`;
}

// Types for attribute stats JSON (pre-generated from CSV)
interface AttributeStatsJSON {
  generatedAt: string;
  totalAttributes: number;
  totalSalesRecords: number;
  xchUsdRate: number;
  outlierNote: string;
  attributes: Record<string, {
    category: string;
    value: string;
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    totalSales: number;
    lastSaleDate: string;
    lastSalePrice: number;
    sales: Array<{
      nftEdition: number;
      priceXCH: number;
      priceUSD: number;
      date: string;
      originalPrice: number;
      originalCurrency: string;
    }>;
  }>;
}

// Cache for attribute stats JSON
let attributeStatsJSONCache: AttributeStatsJSON | null = null;

async function loadAttributeStatsJSON(): Promise<AttributeStatsJSON | null> {
  if (attributeStatsJSONCache) return attributeStatsJSONCache;

  try {
    const response = await fetch('/assets/nft-data/attribute_stats.json');
    if (!response.ok) throw new Error('Failed to load attribute stats JSON');
    attributeStatsJSONCache = await response.json();
    return attributeStatsJSONCache;
  } catch (error) {
    console.warn('Failed to load attribute_stats.json, falling back to dynamic calculation:', error);
    return null;
  }
}

async function loadTraitStats(): Promise<AttributeStats[]> {
  // Don't use cache - always merge live sales with static data
  // TanStack Query handles caching at a higher level

  // Try to load from pre-generated JSON first (our fallback/baseline data)
  const jsonData = await loadAttributeStatsJSON();

  if (jsonData) {
    // Load trait rankings for NFT counts and metadata for live sales merge
    const [traitRankings, metadata] = await Promise.all([
      loadTraitRankings(),
      loadMetadata(),
    ]);

    // Build NFT ID -> traits lookup for merging live sales
    const nftTraitsMap = new Map<number, Record<string, string>>();
    for (const nft of metadata) {
      const traits: Record<string, string> = {};
      for (const attr of nft.attributes) {
        traits[attr.trait_type] = attr.value;
      }
      nftTraitsMap.set(nft.edition, traits);
    }

    // Get live sales from databank
    const liveSales = getRecentSales(10000);

    // Get the timestamp of the JSON generation to filter only newer sales
    const jsonGeneratedAt = new Date(jsonData.generatedAt).getTime();

    // Filter to only sales that happened after JSON was generated
    const newSales = liveSales.filter(sale => sale.timestamp > jsonGeneratedAt);

    // Build a map of new sales per attribute
    const newSalesMap = new Map<string, Array<{
      nftId: number;
      price: number;
      date: Date;
    }>>();

    for (const sale of newSales) {
      const nftTraits = nftTraitsMap.get(sale.nftId);
      if (!nftTraits) continue;

      for (const [category, value] of Object.entries(nftTraits)) {
        const key = `${category}|${value}`;
        if (!newSalesMap.has(key)) {
          newSalesMap.set(key, []);
        }
        newSalesMap.get(key)!.push({
          nftId: sale.nftId,
          price: sale.xchEquivalent,
          date: new Date(sale.timestamp),
        });
      }
    }

    const stats: AttributeStats[] = [];

    for (const [, attr] of Object.entries(jsonData.attributes)) {
      // Get NFT count from trait rankings
      const traitData = traitRankings.lookup[attr.category]?.[attr.value];
      const count = traitData?.count || 0;

      // Get any new sales for this attribute
      const attrKey = `${attr.category}|${attr.value}`;
      const attrNewSales = newSalesMap.get(attrKey) || [];

      // Merge existing sales with new sales, deduplicating by nftId + price + date
      const existingSales = attr.sales.map(sale => ({
        nftId: String(sale.nftEdition),
        nftImage: getNftImageUrl(sale.nftEdition),
        price: sale.priceXCH,
        date: new Date(sale.date),
      }));

      const allSales = [
        ...attrNewSales.map(s => ({
          nftId: String(s.nftId),
          nftImage: getNftImageUrl(s.nftId),
          price: s.price,
          date: s.date,
        })),
        ...existingSales,
      ];

      // Deduplicate: same NFT sold at same price within 1 day = duplicate
      const seen = new Set<string>();
      const mergedSales = allSales
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .filter(sale => {
          // Create key: nftId + rounded price + date rounded to day
          const dayTimestamp = Math.floor(sale.date.getTime() / (24 * 60 * 60 * 1000));
          const key = `${sale.nftId}-${sale.price.toFixed(2)}-${dayTimestamp}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

      // Recalculate stats including new sales
      const allPrices = [
        ...attrNewSales.map(s => s.price),
        ...attr.sales.map(s => s.priceXCH),
      ];

      const totalSales = allPrices.length;
      const avgPrice = totalSales > 0
        ? allPrices.reduce((sum, p) => sum + p, 0) / totalSales
        : 0;
      const minPrice = totalSales > 0 ? Math.min(...allPrices) : 0;
      const maxPrice = totalSales > 0 ? Math.max(...allPrices) : 0;

      // Determine last sale date (most recent from merged sales)
      const lastSaleDate = mergedSales.length > 0 ? mergedSales[0].date : undefined;

      stats.push({
        category: attr.category,
        value: attr.value,
        count,
        rarity: count > 0 ? (count / COLLECTION_SIZE) * 100 : 0,
        totalSales,
        avgPrice,
        minPrice,
        maxPrice,
        lastSalePrice: mergedSales.length > 0 ? mergedSales[0].price : 0,
        lastSaleDate,
        recentSales: mergedSales,
      });
    }

    // Also add attributes with no sales from trait rankings (check new sales too)
    for (const [category, traits] of Object.entries(traitRankings.lookup)) {
      for (const [value, data] of Object.entries(traits)) {
        const key = `${category}|${value}`;
        if (!jsonData.attributes[key]) {
          // Check if there are new live sales for this attribute
          const attrNewSales = newSalesMap.get(key) || [];

          if (attrNewSales.length > 0) {
            // This attribute now has sales from live data
            const prices = attrNewSales.map(s => s.price);
            const salesList = attrNewSales
              .map(s => ({
                nftId: String(s.nftId),
                nftImage: getNftImageUrl(s.nftId),
                price: s.price,
                date: s.date,
              }))
              .sort((a, b) => b.date.getTime() - a.date.getTime());

            // Deduplicate: same NFT sold at same price within 1 day = duplicate
            const seen = new Set<string>();
            const mergedSales = salesList.filter(sale => {
              const dayTimestamp = Math.floor(sale.date.getTime() / (24 * 60 * 60 * 1000));
              const key = `${sale.nftId}-${sale.price.toFixed(2)}-${dayTimestamp}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });

            stats.push({
              category,
              value,
              count: data.count,
              rarity: (data.count / COLLECTION_SIZE) * 100,
              totalSales: prices.length,
              avgPrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
              minPrice: Math.min(...prices),
              maxPrice: Math.max(...prices),
              lastSaleDate: mergedSales[0]?.date,
              recentSales: mergedSales,
            });
          } else {
            stats.push({
              category,
              value,
              count: data.count,
              rarity: (data.count / COLLECTION_SIZE) * 100,
              totalSales: 0,
              avgPrice: 0,
              minPrice: 0,
              maxPrice: 0,
              lastSaleDate: undefined,
              recentSales: [],
            });
          }
        }
      }
    }

    // Sort by category then by average price (highest first for attributes with sales)
    stats.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      // Put attributes with sales first
      if (a.totalSales > 0 && b.totalSales === 0) return -1;
      if (a.totalSales === 0 && b.totalSales > 0) return 1;
      return b.avgPrice - a.avgPrice;
    });

    return stats;
  }

  // Fallback: Load from trait rankings and salesDatabank (dynamic calculation)
  const traitRankings = await loadTraitRankings();
  const metadata = await loadMetadata();

  // Build NFT ID -> traits lookup
  const nftTraitsMap = new Map<number, Record<string, string>>();
  for (const nft of metadata) {
    const traits: Record<string, string> = {};
    for (const attr of nft.attributes) {
      traits[attr.trait_type] = attr.value;
    }
    nftTraitsMap.set(nft.edition, traits);
  }

  // Get all sales from databank
  const allSales = getRecentSales(10000);

  // Build trait -> sales mapping with timestamps
  interface TraitSaleData {
    prices: number[];
    lastTimestamp: number;
  }
  const traitSalesMap = new Map<string, TraitSaleData>();

  for (const sale of allSales) {
    const nftTraits = nftTraitsMap.get(sale.nftId);
    if (!nftTraits) continue;

    for (const [category, value] of Object.entries(nftTraits)) {
      const key = `${category}:${value}`;
      if (!traitSalesMap.has(key)) {
        traitSalesMap.set(key, { prices: [], lastTimestamp: 0 });
      }
      const data = traitSalesMap.get(key)!;
      data.prices.push(sale.xchEquivalent);
      if (sale.timestamp > data.lastTimestamp) {
        data.lastTimestamp = sale.timestamp;
      }
    }
  }

  // Build AttributeStats array from trait rankings
  const stats: AttributeStats[] = [];

  for (const [category, traits] of Object.entries(traitRankings.lookup)) {
    for (const [value, data] of Object.entries(traits)) {
      const key = `${category}:${value}`;
      const salesData = traitSalesMap.get(key);
      const prices = salesData?.prices || [];

      const totalSales = prices.length;
      const avgPrice = totalSales > 0
        ? prices.reduce((sum, p) => sum + p, 0) / totalSales
        : 0;
      const minPrice = totalSales > 0 ? Math.min(...prices) : 0;
      const maxPrice = totalSales > 0 ? Math.max(...prices) : 0;
      const lastSaleDate = salesData?.lastTimestamp
        ? new Date(salesData.lastTimestamp)
        : undefined;

      stats.push({
        value,
        category,
        count: data.count,
        rarity: (data.count / COLLECTION_SIZE) * 100,
        totalSales,
        avgPrice,
        minPrice,
        maxPrice,
        lastSaleDate,
        recentSales: [],
      });
    }
  }

  // Sort by category then by rarity (rarer first)
  stats.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.rarity - b.rarity;
  });

  return stats;
}

// ============ Data Generators ============

/**
 * Pretty number options for price increments
 */
const PRETTY_INCREMENTS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50];

/**
 * Round to the nearest "pretty" increment
 */
function roundToNearestPretty(value: number): number {
  // Find the closest pretty increment
  let closest = PRETTY_INCREMENTS[0];
  let minDiff = Math.abs(value - closest);

  for (const inc of PRETTY_INCREMENTS) {
    const diff = Math.abs(value - inc);
    if (diff < minDiff) {
      minDiff = diff;
      closest = inc;
    }
  }

  return closest;
}

/**
 * Round a price down to a pretty boundary
 */
function roundDownToPretty(price: number, increment: number): number {
  return Math.floor(price / increment) * increment;
}

/**
 * Calculate equal-width price bins using hybrid approach:
 * 1. Get floor price and 90th percentile
 * 2. Calculate optimal increment = (p90 - floor) / 7
 * 3. Round to pretty number
 * 4. Generate 8 equal-width columns + open-ended last column
 *
 * This runs automatically whenever market data is refreshed.
 */
function calculateDynamicPriceBins(prices: number[]): { boundaries: number[]; labels: string[] } {
  if (prices.length === 0) {
    // Fallback to default bins if no listings
    return {
      boundaries: [0, 1, 2, 3, 4, 5, 6, 10, Infinity],
      labels: ['0-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-10', '10+'],
    };
  }

  // Sort prices ascending
  const sorted = [...prices].sort((a, b) => a - b);
  const n = sorted.length;

  // Get floor (minimum) and 90th percentile
  const floor = sorted[0];
  const p90Index = Math.floor(0.9 * n);
  const p90 = sorted[Math.min(p90Index, n - 1)];

  // Calculate raw increment to cover floor to p90 in 7 columns
  // (8th column will be open-ended for the expensive tail)
  const rawIncrement = (p90 - floor) / 7;

  // Round to nearest pretty increment
  const increment = roundToNearestPretty(rawIncrement);

  // Start from floor rounded down to pretty boundary
  const start = roundDownToPretty(floor, increment);

  // Generate 8 boundaries (7 equal-width columns + open-ended)
  const boundaries: number[] = [];
  for (let i = 0; i < 8; i++) {
    boundaries.push(start + i * increment);
  }
  boundaries.push(Infinity); // Open-ended last column

  // Generate labels
  const labels = boundaries.slice(0, -1).map((min, i) => {
    const max = boundaries[i + 1];
    if (max === Infinity) {
      return `${min}+`;
    }
    // Format numbers nicely (remove unnecessary decimals)
    const minStr = min % 1 === 0 ? min.toString() : min.toFixed(1);
    const maxStr = max % 1 === 0 ? max.toString() : max.toFixed(1);
    return `${minStr}-${maxStr}`;
  });

  return { boundaries, labels };
}

async function generateHeatMapData(): Promise<HeatMapCell[][]> {
  // Load real listings, NFT takes for rarity data, metadata for names, and current XCH price
  const [listingsResult, takes, metadata, xchPriceUsd] = await Promise.all([
    marketService.fetchAllListings(),
    loadNftTakes(),
    loadMetadata(),
    getCurrentXchPrice(),
  ]);

  const listings = listingsResult.listings;

  // Create a map of NFT ID -> rarity rank
  const rarityMap = new Map<string, number>();
  for (const [id, entry] of Object.entries(takes)) {
    rarityMap.set(id, entry.open_rarity_rank);
  }

  // Calculate dynamic price bins based on actual listing distribution
  const allPrices = listings.map(l => l.priceXch);
  const { boundaries: priceBins, labels: priceLabels } = calculateDynamicPriceBins(allPrices);

  // Rarity bin boundaries (10 bins: Top 10%, 20%, ..., 90%, Bottom 10%)
  const rarityBinDefs = [
    { label: 'Top 10%', minRank: 1, maxRank: 420 },
    { label: '20%', minRank: 421, maxRank: 840 },
    { label: '30%', minRank: 841, maxRank: 1260 },
    { label: '40%', minRank: 1261, maxRank: 1680 },
    { label: '50%', minRank: 1681, maxRank: 2100 },
    { label: '60%', minRank: 2101, maxRank: 2520 },
    { label: '70%', minRank: 2521, maxRank: 2940 },
    { label: '80%', minRank: 2941, maxRank: 3360 },
    { label: '90%', minRank: 3361, maxRank: 3780 },
    { label: 'Bottom 10%', minRank: 3781, maxRank: 4200 },
  ];

  // Generate 10x8 heatmap grid based on rarity/price distribution
  const grid: HeatMapCell[][] = [];

  for (let row = 0; row < 10; row++) {
    const rowCells: HeatMapCell[] = [];
    const rarityMinRank = rarityBinDefs[row].minRank;
    const rarityMaxRank = rarityBinDefs[row].maxRank;

    for (let col = 0; col < 8; col++) {
      const priceMin = priceBins[col];
      const priceMax = priceBins[col + 1];

      // Count listings that match this cell
      const matchingListings = listings.filter(listing => {
        const rank = rarityMap.get(listing.nftId) || COLLECTION_SIZE;
        const inRarityBin = rank >= rarityMinRank && rank <= rarityMaxRank;
        const inPriceBin = listing.priceXch >= priceMin && listing.priceXch < priceMax;
        return inRarityBin && inPriceBin;
      });

      const count = matchingListings.length;
      const maxCount = 50; // For normalization
      const intensity = Math.min(count / maxCount, 1);

      rowCells.push({
        rarityBin: {
          index: row,
          label: rarityBinDefs[row].label,
          minRank: rarityMinRank,
          maxRank: rarityMaxRank,
        },
        priceBin: {
          index: col,
          label: priceLabels[col],
          minPrice: priceMin,
          maxPrice: priceMax,
        },
        count,
        nfts: matchingListings.map(l => ({
          id: `WFP-${l.nftId.padStart(4, '0')}`,
          tokenId: l.launcherId || `nft1${l.nftId.padStart(4, '0')}`,
          name: l.name || getNftName(parseInt(l.nftId, 10), metadata),
          characterType: 'wojak' as const,
          imageUrl: getNftImageUrl(l.nftId),
          thumbnailUrl: getNftImageUrl(l.nftId),
          priceXch: l.priceXch,
          priceUsd: l.priceXch * xchPriceUsd,
        })),
        intensity,
        label: `${count} NFTs, ${rarityBinDefs[row].label}, price ${priceLabels[col]} XCH`,
      });
    }
    grid.push(rowCells);
  }

  return grid;
}

async function generatePriceDistribution(): Promise<PriceDistribution> {
  // Get real listings
  const listingsResult = await marketService.fetchAllListings();
  const listings = listingsResult.listings;
  const total = listings.length || 1; // Avoid division by zero

  // Use the same dynamic price bins as the heatmap
  const allPrices = listings.map(l => l.priceXch);
  const { boundaries, labels } = calculateDynamicPriceBins(allPrices);

  // Generate bins using the same boundaries as the heatmap
  const bins = labels.map((label, i) => {
    const minPrice = boundaries[i];
    const maxPrice = boundaries[i + 1];

    const count = listings.filter(l =>
      l.priceXch >= minPrice && l.priceXch < maxPrice
    ).length;

    return {
      range: `${label} XCH`,
      minPrice,
      maxPrice,
      count,
      percentage: Math.round((count / total) * 100),
    };
  });

  return {
    bins,
    totalListed: total,
  };
}

// ============ Service Interface ============

export interface IBigPulpService {
  searchNFT(id: number): Promise<NFTAnalysis | null>;
  getRandomAnalysis(): Promise<NFTAnalysis>;
  getMarketStats(): Promise<MarketStats>;
  getHeatMapData(): Promise<HeatMapCell[][]>;
  getPriceDistribution(): Promise<PriceDistribution>;
  getAttributeStats(): Promise<AttributeStats[]>;
  getTopSales(): Promise<NFTSale[]>;
  getRarestFinds(): Promise<NFTBasic[]>;
}

function getRarityTier(rank: number): RarityTier {
  if (rank <= 42) return 'legendary';
  if (rank <= 200) return 'epic';
  if (rank <= 500) return 'rare';
  if (rank <= 1500) return 'uncommon';
  return 'common';
}

class BigPulpService implements IBigPulpService {
  async searchNFT(id: number): Promise<NFTAnalysis | null> {
    if (id < 1 || id > COLLECTION_SIZE) return null;

    const [takes, metadata] = await Promise.all([
      loadNftTakes(),
      loadMetadata(),
    ]);
    const take = takes[String(id)];
    const rank = take?.open_rarity_rank || id;

    const paddedId = String(id).padStart(4, '0');

    return {
      nft: {
        id: `WFP-${paddedId}`,
        tokenId: `nft1${paddedId}`,
        name: getNftName(id, metadata),
        characterType: 'wojak',
        imageUrl: getNftImageUrl(id),
        thumbnailUrl: getNftImageUrl(id),
      },
      rarity: {
        rank,
        totalSupply: COLLECTION_SIZE,
        percentile: (rank / COLLECTION_SIZE) * 100,
        score: (COLLECTION_SIZE - rank) / COLLECTION_SIZE * 100,
        tier: getRarityTier(rank),
        typeRank: rank,
        typeTotal: COLLECTION_SIZE,
      },
      market: {
        isListed: false,
        floorPrice: 0.55,
        floorPriceUSD: 0.55 * 5.34, // Approximate XCH price
      },
      badges: take?.flags?.is_top_10 ? [{
        id: 'top-10',
        type: 'top-10-percent',
        label: 'Top 10%',
        description: 'This NFT is in the top 10% by rarity',
        color: 'purple',
        icon: 'star',
        priority: 1,
      }] : [],
      provenance: {
        highValueTraits: [],
        traitSynergies: [],
      },
      rareCombos: [],
    };
  }

  async getRandomAnalysis(): Promise<NFTAnalysis> {
    const randomId = Math.floor(Math.random() * COLLECTION_SIZE) + 1;
    const analysis = await this.searchNFT(randomId);
    return analysis!;
  }

  async getMarketStats(): Promise<MarketStats> {
    // Fallback storage keys
    const FALLBACK_VOLUME_KEY = 'wojak_alltime_volume_fallback';
    const FALLBACK_TRADES_KEY = 'wojak_alltime_trades_fallback';

    // Get fallback values from localStorage
    const getFallbacks = () => ({
      totalVolume: parseFloat(localStorage.getItem(FALLBACK_VOLUME_KEY) || '0'),
      tradeCount: parseInt(localStorage.getItem(FALLBACK_TRADES_KEY) || '0', 10),
    });

    // Save successful values as fallbacks
    const saveFallbacks = (volume: number, trades: number) => {
      if (volume > 0) localStorage.setItem(FALLBACK_VOLUME_KEY, String(volume));
      if (trades > 0) localStorage.setItem(FALLBACK_TRADES_KEY, String(trades));
    };

    // Fetch real listings, collection stats, and current XCH price in parallel
    const fallbacks = getFallbacks();
    const [listingsResult, collectionStats, xchUsdPrice] = await Promise.all([
      marketService.fetchAllListings(),
      fetchCollectionStats().catch((error) => {
        console.warn('[BigPulp] Collection stats fetch failed, using fallbacks:', error.message);
        return {
          floorPrice: 0,
          totalItems: COLLECTION_SIZE,
          totalVolume: fallbacks.totalVolume, // Use fallback
          tradeCount: fallbacks.tradeCount,   // Use fallback
          name: 'Wojak Farmers Plot',
          description: '',
          thumbnailUri: '',
        };
      }),
      getCurrentXchPrice(),
    ]);

    // Save successful values as fallbacks for future use
    if (collectionStats.totalVolume > 0 || collectionStats.tradeCount > 0) {
      saveFallbacks(collectionStats.totalVolume, collectionStats.tradeCount);
    }
    const listings = listingsResult.listings;

    // Get floor price (lowest listing)
    const floorPrice = listings.length > 0
      ? Math.min(...listings.map(l => l.priceXch))
      : 0;

    // Get ceiling price (highest listing)
    const ceilingPrice = listings.length > 0
      ? Math.max(...listings.map(l => l.priceXch))
      : 0;

    // Calculate average and median
    const sortedPrices = [...listings].map(l => l.priceXch).sort((a, b) => a - b);
    const avgPrice = listings.length > 0
      ? sortedPrices.reduce((sum, p) => sum + p, 0) / listings.length
      : 0;
    const medianPrice = listings.length > 0
      ? sortedPrices[Math.floor(sortedPrices.length / 2)]
      : 0;

    return {
      listedCount: listings.length,
      totalSupply: COLLECTION_SIZE,
      floorPrice,
      floorPriceUSD: floorPrice * xchUsdPrice,
      ceilingPrice,
      averagePrice: avgPrice,
      medianPrice,
      totalVolume: collectionStats.totalVolume,
      totalVolumeUSD: collectionStats.totalVolume * xchUsdPrice,
      totalTrades: collectionStats.tradeCount,
      marketCap: COLLECTION_SIZE * floorPrice,
      marketCapUSD: COLLECTION_SIZE * floorPrice * xchUsdPrice,
      lastUpdated: listingsResult.lastUpdated,
    };
  }

  async getHeatMapData(): Promise<HeatMapCell[][]> {
    return await generateHeatMapData();
  }

  async getPriceDistribution(): Promise<PriceDistribution> {
    return await generatePriceDistribution();
  }

  async getAttributeStats(): Promise<AttributeStats[]> {
    return loadTraitStats();
  }

  async getTopSales(): Promise<NFTSale[]> {
    // Get ALL sales from the databank to find true highest sales
    const allSales = getRecentSales(10000);

    if (allSales.length === 0) {
      // Return empty array if no sales data available
      return [];
    }

    // Load metadata to get proper NFT names
    const metadata = await loadMetadata();

    // Sort by price (highest first) and take top 10
    const topSales = [...allSales]
      .sort((a, b) => b.xchEquivalent - a.xchEquivalent)
      .slice(0, 10);

    return topSales.map((sale: SaleRecord) => {
      const paddedId = String(sale.nftId).padStart(4, '0');
      return {
        nft: {
          id: `WFP-${paddedId}`,
          tokenId: `nft1${paddedId}`,
          name: getNftName(sale.nftId, metadata),
          characterType: 'wojak' as const,
          imageUrl: getNftImageUrl(sale.nftId),
          thumbnailUrl: getNftImageUrl(sale.nftId),
        },
        price: sale.xchEquivalent,
        priceUSD: sale.usdValue,
        date: new Date(sale.timestamp),
        buyer: '', // Not stored in databank currently
        seller: '',
      };
    });
  }

  async getRarestFinds(): Promise<NFTBasic[]> {
    // Load NFT takes to get real rarity rankings
    const takes = await loadNftTakes();
    // Load metadata to get proper NFT names
    const metadata = await loadMetadata();

    // Convert to array and sort by rarity rank
    const rankedNfts = Object.entries(takes)
      .map(([id, entry]) => ({
        id: parseInt(id, 10),
        rank: entry.open_rarity_rank,
      }))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 10);

    return rankedNfts.map(({ id }) => {
      const paddedId = String(id).padStart(4, '0');
      return {
        id: `WFP-${paddedId}`,
        tokenId: `nft1${paddedId}`,
        name: getNftName(id, metadata),
        characterType: 'wojak' as const,
        imageUrl: getNftImageUrl(id),
        thumbnailUrl: getNftImageUrl(id),
      };
    });
  }
}

// Singleton instance
export const bigpulpService = new BigPulpService();
