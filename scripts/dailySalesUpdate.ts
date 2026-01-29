/**
 * Daily Sales Update Script
 *
 * Runs daily via GitHub Actions to:
 * 1. Fetch new sales from Dexie API since last update
 * 2. Convert CAT tokens to XCH using TibetSwap rates
 * 3. Map NFT editions to their attributes
 * 4. Append new sales to attribute_stats.json
 * 5. Recalculate statistics
 *
 * State tracking:
 * - Reads lastProcessedDate from attribute_stats.json
 * - Only processes trades newer than this date
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Collection ID for BigPulp Wojak.Ink (bech32m format)
const COLLECTION_ID = 'col1m8m3tdxqt74u0ka5g3t9vtxjfx52muz7sstaqmqs6h2e9mncm5wsx57nrn';

// TibetSwap exchange rates (XCH per token)
const CAT_TO_XCH_RATES: Record<string, number> = {
  '✨❤️‍🔥🧙‍♂️': 2.926,      // Caster
  '❤️': 0.0001178,          // LOVE
  '🪄⚡️': 0.0001381,        // Spell Power
  'HOA': 0.0003176,
  'NeckCoin': 3.006,
  'BEPE': 0.0000204,
};

const XCH_USD_RATE = 5.25;

// Types matching actual Dexie API response
interface DexieNFTItem {
  is_nft: true;
  id: string;
  name: string;
  collection?: {
    id: string;
    name: string;
  };
}

interface DexieCurrencyItem {
  id: string;
  code: string;
  name: string;
  amount: number;
}

type DexieItem = DexieNFTItem | DexieCurrencyItem;

interface DexieOffer {
  id: string;
  status: number;
  date_completed: string;
  price: number;
  offered: DexieItem[];
  requested: DexieItem[];
  trade_id: string;
}

interface NFTMetadata {
  edition: number;
  attributes: Array<{ trait_type: string; value: string }>;
}

interface SaleRecord {
  nftEdition: number;
  priceXCH: number;
  priceUSD: number;
  date: string;
  originalPrice: number;
  originalCurrency: string;
  tradeId?: string;
}

interface AttributeStats {
  category: string;
  value: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  totalSales: number;
  lastSaleDate: string;
  lastSalePrice: number;
  sales: SaleRecord[];
}

interface AttributeStatsOutput {
  generatedAt: string;
  totalAttributes: number;
  totalSalesRecords: number;
  xchUsdRate: number;
  outlierNote: string;
  lastProcessedDate?: string;
  lastProcessedTimestamp?: number;
  attributes: Record<string, AttributeStats>;
}

function isNFTItem(item: DexieItem): item is DexieNFTItem {
  return 'is_nft' in item && item.is_nft === true;
}

function isCurrencyItem(item: DexieItem): item is DexieCurrencyItem {
  return 'amount' in item && !('is_nft' in item);
}

async function fetchNewSales(sinceDate: Date): Promise<DexieOffer[]> {
  const allTrades: DexieOffer[] = [];
  let page = 1;
  const pageSize = 100;
  let hasMore = true;

  console.warn(`Fetching trades since: ${sinceDate.toISOString()}`);

  while (hasMore) {
    const url = `https://api.dexie.space/v1/offers?offered_or_requested=${COLLECTION_ID}&status=4&page=${page}&page_size=${pageSize}&sort=date_completed&order=desc`;

    console.warn(`Fetching page ${page}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Dexie API error: ${response.status}`);
    }

    const data = await response.json();
    const offers: DexieOffer[] = data.offers || [];

    if (offers.length === 0) {
      hasMore = false;
      break;
    }

    // Filter trades newer than sinceDate
    const newTrades = offers.filter(o => {
      const tradeDate = new Date(o.date_completed);
      return tradeDate > sinceDate;
    });

    if (newTrades.length === 0) {
      hasMore = false;
    } else {
      allTrades.push(...newTrades);

      if (newTrades.length < offers.length) {
        hasMore = false;
      } else {
        page++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  console.warn(`Found ${allTrades.length} new trades`);
  return allTrades;
}

function extractNftInfo(offer: DexieOffer): { id: string; name: string; collectionName: string } | null {
  // NFT could be in offered or requested
  const allItems = [...offer.offered, ...offer.requested];
  const nftItem = allItems.find(isNFTItem);

  if (nftItem) {
    return {
      id: nftItem.id,
      name: nftItem.name,
      collectionName: nftItem.collection?.name || '',
    };
  }

  return null;
}

function extractPrice(offer: DexieOffer): { amount: number; currency: string } | null {
  // Price is the non-NFT item (what was paid for the NFT)
  const nftInOffered = offer.offered.some(isNFTItem);
  const paymentSide = nftInOffered ? offer.requested : offer.offered;
  const payment = paymentSide.find(isCurrencyItem);

  if (payment) {
    return {
      amount: payment.amount,
      currency: payment.code || 'XCH',
    };
  }

  return null;
}

function convertToXCH(price: number, currency: string): number {
  if (currency === 'XCH') {
    return price;
  }

  const rate = CAT_TO_XCH_RATES[currency];
  if (rate) {
    return price * rate;
  }

  console.warn(`Unknown currency: ${currency}`);
  return 0;
}

function extractEditionFromName(name: string): number | null {
  // Extract edition from name like "Wojak #0123" or "Wojak #123"
  const match = name.match(/#0*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function recalculateStats(sales: SaleRecord[]): {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  lastSaleDate: string;
  lastSalePrice: number;
} {
  if (sales.length === 0) {
    return { minPrice: 0, maxPrice: 0, avgPrice: 0, lastSaleDate: '', lastSalePrice: 0 };
  }

  const prices = sales.map(s => s.priceXCH);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

  const sortedByDate = [...sales].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastSale = sortedByDate[0];

  return {
    minPrice: Math.round(minPrice * 10000) / 10000,
    maxPrice: Math.round(maxPrice * 10000) / 10000,
    avgPrice: Math.round(avgPrice * 10000) / 10000,
    lastSaleDate: lastSale.date,
    lastSalePrice: Math.round(lastSale.priceXCH * 10000) / 10000,
  };
}

async function main() {
  const statsPath = path.join(__dirname, '../public/assets/nft-data/attribute_stats.json');
  const metadataPath = path.join(__dirname, '../public/assets/nft-data/metadata.json');

  // Load existing stats
  console.warn('Loading existing attribute stats...');
  const existingStats: AttributeStatsOutput = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));

  // Load metadata for attribute mapping
  console.warn('Loading NFT metadata...');
  const metadata: NFTMetadata[] = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  const metadataByEdition = new Map<number, NFTMetadata>();
  for (const nft of metadata) {
    metadataByEdition.set(nft.edition, nft);
  }

  // Get date of last update
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let lastDate: Date;

  if (existingStats.lastProcessedDate) {
    lastDate = new Date(existingStats.lastProcessedDate);
  } else if (existingStats.lastProcessedTimestamp) {
    lastDate = new Date(existingStats.lastProcessedTimestamp * 1000);
  } else {
    lastDate = thirtyDaysAgo;
  }

  // Fetch new sales from Dexie
  const newTrades = await fetchNewSales(lastDate);

  if (newTrades.length === 0) {
    console.warn('No new trades found. Exiting.');
    return;
  }

  // Create a set of existing trade IDs to avoid duplicates
  const existingTradeIds = new Set<string>();
  for (const attr of Object.values(existingStats.attributes)) {
    for (const sale of attr.sales) {
      if (sale.tradeId) {
        existingTradeIds.add(sale.tradeId);
      }
    }
  }

  // Process new trades
  let newSalesCount = 0;
  let skippedCount = 0;
  let latestDate = lastDate;

  for (const offer of newTrades) {
    // Skip if we've already processed this trade
    if (existingTradeIds.has(offer.id)) {
      continue;
    }

    // Extract NFT info
    const nftInfo = extractNftInfo(offer);
    if (!nftInfo) {
      skippedCount++;
      continue;
    }

    // Filter to only our collection
    if (!nftInfo.collectionName.includes('Wojak') && !nftInfo.collectionName.includes('BigPulp')) {
      skippedCount++;
      continue;
    }

    // Extract edition from NFT name
    const edition = extractEditionFromName(nftInfo.name);
    if (!edition) {
      console.warn(`Could not extract edition from name: ${nftInfo.name}`);
      skippedCount++;
      continue;
    }

    // Get attributes from our local metadata
    const nftMetadata = metadataByEdition.get(edition);
    if (!nftMetadata) {
      console.warn(`No metadata found for edition ${edition}`);
      skippedCount++;
      continue;
    }

    // Extract price
    const priceInfo = extractPrice(offer);
    if (!priceInfo) {
      console.warn(`Could not extract price from offer ${offer.id}`);
      skippedCount++;
      continue;
    }

    // Convert price to XCH
    const xchValue = convertToXCH(priceInfo.amount, priceInfo.currency);
    if (xchValue === 0 && priceInfo.amount > 0) {
      console.warn(`Unknown currency ${priceInfo.currency} for offer ${offer.id}`);
      skippedCount++;
      continue;
    }

    const usdValue = xchValue * XCH_USD_RATE;
    const saleDate = offer.date_completed.split('T')[0];

    // Create sale record
    const saleRecord: SaleRecord = {
      nftEdition: edition,
      priceXCH: Math.round(xchValue * 10000) / 10000,
      priceUSD: Math.round(usdValue * 100) / 100,
      date: saleDate,
      originalPrice: priceInfo.amount,
      originalCurrency: priceInfo.currency,
      tradeId: offer.id,
    };

    console.warn(`  #${edition}: ${priceInfo.amount} ${priceInfo.currency} = ${saleRecord.priceXCH} XCH (${nftInfo.name})`);

    // Add sale to each attribute
    for (const attr of nftMetadata.attributes) {
      const key = `${attr.trait_type}|${attr.value}`;

      if (!existingStats.attributes[key]) {
        existingStats.attributes[key] = {
          category: attr.trait_type,
          value: attr.value,
          minPrice: saleRecord.priceXCH,
          maxPrice: saleRecord.priceXCH,
          avgPrice: saleRecord.priceXCH,
          totalSales: 0,
          lastSaleDate: saleDate,
          lastSalePrice: saleRecord.priceXCH,
          sales: [],
        };
      }

      existingStats.attributes[key].sales.push(saleRecord);
      existingStats.attributes[key].totalSales++;
    }

    newSalesCount++;
    const tradeDate = new Date(offer.date_completed);
    if (tradeDate > latestDate) {
      latestDate = tradeDate;
    }
  }

  console.warn(`\nProcessed ${newSalesCount} new sales (skipped ${skippedCount} non-matching)`);

  if (newSalesCount === 0) {
    console.warn('No new Wojak sales after filtering. Exiting.');
    return;
  }

  // Recalculate statistics
  console.warn('Recalculating statistics...');
  let totalSalesRecords = 0;

  for (const attr of Object.values(existingStats.attributes)) {
    attr.sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const stats = recalculateStats(attr.sales);
    attr.minPrice = stats.minPrice;
    attr.maxPrice = stats.maxPrice;
    attr.avgPrice = stats.avgPrice;
    attr.lastSaleDate = stats.lastSaleDate;
    attr.lastSalePrice = stats.lastSalePrice;

    totalSalesRecords += attr.sales.length;
  }

  // Update metadata
  existingStats.generatedAt = new Date().toISOString();
  existingStats.totalAttributes = Object.keys(existingStats.attributes).length;
  existingStats.totalSalesRecords = totalSalesRecords;
  existingStats.lastProcessedDate = latestDate.toISOString();
  delete existingStats.lastProcessedTimestamp;

  // Write updated stats
  console.warn('Writing updated attribute stats...');
  fs.writeFileSync(statsPath, JSON.stringify(existingStats, null, 2), 'utf-8');

  console.warn('\n=== Update Summary ===');
  console.warn(`New sales processed: ${newSalesCount}`);
  console.warn(`Total attributes: ${existingStats.totalAttributes}`);
  console.warn(`Total sales records: ${existingStats.totalSalesRecords}`);
  console.warn(`Last processed: ${latestDate.toISOString()}`);
}

main().catch(console.error);
