/**
 * Regenerate attribute_stats.json from live D1 sales data
 *
 * Pulls all sales from the production /api/sales/history endpoint
 * and rebuilds the attribute stats file with fresh data.
 *
 * Usage: npx tsx scripts/regenerateAttributeStats.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://wojak.ink/api/sales/history?limit=5000&sort=newest';
const METADATA_PATH = path.join(__dirname, '..', 'public', 'assets', 'nft-data', 'metadata.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'assets', 'nft-data', 'attribute_stats.json');

interface SaleItem {
  nftId: number;
  nftName: string;
  currency: 'XCH' | 'CAT';
  amount: number;
  xchEquivalent: number;
  usdValue: number | null;
  timestamp: number;
  completedAt: string;
  traits: Record<string, string>;
  tokenCode: string | null;
  catXchRate: number | null;
}

interface MetadataEntry {
  edition: number;
  attributes: Array<{ trait_type: string; value: string }>;
}

interface AttrSale {
  nftEdition: number;
  priceXCH: number;
  priceUSD: number;
  date: string;
  originalPrice: number;
  originalCurrency: string;
}

interface AttrStats {
  category: string;
  value: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  totalSales: number;
  lastSaleDate: string;
  lastSalePrice: number;
  sales: AttrSale[];
}

async function main() {
  console.log('Fetching sales from D1 API...');
  let response = await fetch(API_URL);
  if (!response.ok) {
    console.warn(`First attempt failed with HTTP ${response.status}, retrying in 5s...`);
    await new Promise(r => setTimeout(r, 5000));
    response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`API fetch failed after retry: HTTP ${response.status}`);
    }
  }
  const data = await response.json() as { items: SaleItem[]; total: number };
  console.log(`Got ${data.items.length} sales (total: ${data.total})`);

  // Load metadata for trait mapping
  console.log('Loading metadata...');
  const metadata: MetadataEntry[] = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'));
  const nftTraitsMap = new Map<number, Record<string, string>>();
  for (const nft of metadata) {
    const traits: Record<string, string> = {};
    for (const attr of nft.attributes) {
      traits[attr.trait_type] = attr.value;
    }
    nftTraitsMap.set(nft.edition, traits);
  }

  // Build attribute stats
  const attrMap = new Map<string, AttrStats>();
  const XCH_USD_RATE = 5.32; // Current approximate rate

  for (const sale of data.items) {
    // Use traits from the sale record, or fall back to metadata
    const traits = (sale.traits && Object.keys(sale.traits).length > 0)
      ? sale.traits
      : nftTraitsMap.get(sale.nftId) || {};

    const priceXCH = sale.xchEquivalent;
    const priceUSD = sale.usdValue ?? priceXCH * XCH_USD_RATE;
    const dateStr = sale.completedAt ? sale.completedAt.split('T')[0] : new Date(sale.timestamp).toISOString().split('T')[0];

    for (const [category, value] of Object.entries(traits)) {
      const key = `${category}|${value}`;

      if (!attrMap.has(key)) {
        attrMap.set(key, {
          category,
          value,
          minPrice: priceXCH,
          maxPrice: priceXCH,
          avgPrice: 0,
          totalSales: 0,
          lastSaleDate: dateStr,
          lastSalePrice: priceXCH,
          sales: [],
        });
      }

      const attr = attrMap.get(key)!;
      attr.sales.push({
        nftEdition: sale.nftId,
        priceXCH,
        priceUSD,
        date: dateStr,
        originalPrice: sale.amount,
        originalCurrency: sale.currency,
      });
      attr.totalSales++;
      attr.minPrice = Math.min(attr.minPrice, priceXCH);
      attr.maxPrice = Math.max(attr.maxPrice, priceXCH);

      // Track latest sale
      if (dateStr > attr.lastSaleDate) {
        attr.lastSaleDate = dateStr;
        attr.lastSalePrice = priceXCH;
      }
    }
  }

  // Calculate averages
  for (const attr of attrMap.values()) {
    const total = attr.sales.reduce((sum, s) => sum + s.priceXCH, 0);
    attr.avgPrice = attr.totalSales > 0 ? total / attr.totalSales : 0;
    // Round to reasonable precision
    attr.avgPrice = Math.round(attr.avgPrice * 10000) / 10000;
    attr.minPrice = Math.round(attr.minPrice * 10000) / 10000;
    attr.maxPrice = Math.round(attr.maxPrice * 10000) / 10000;
    // Sort sales newest first
    attr.sales.sort((a, b) => b.date.localeCompare(a.date));
  }

  // Build output
  const attributes: Record<string, AttrStats> = {};
  for (const [key, stats] of attrMap) {
    attributes[key] = stats;
  }

  // Find latest sale date
  let latestDate = '';
  for (const sale of data.items) {
    const d = sale.completedAt || new Date(sale.timestamp).toISOString();
    if (d > latestDate) latestDate = d;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    totalAttributes: attrMap.size,
    totalSalesRecords: data.items.length,
    xchUsdRate: XCH_USD_RATE,
    outlierNote: 'Currently using simple average. If outliers become an issue, implement filterOutliers() function to exclude values beyond 2 standard deviations.',
    lastProcessedDate: latestDate,
    attributes,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nDone! Wrote ${attrMap.size} attributes from ${data.items.length} sales.`);

  // Show top 5 by avgPrice
  const sorted = [...attrMap.values()].sort((a, b) => b.avgPrice - a.avgPrice);
  console.log('\nTop 10 Valuable Attributes:');
  for (const attr of sorted.slice(0, 10)) {
    console.log(`  ${attr.category}|${attr.value}: avg=${attr.avgPrice.toFixed(2)} min=${attr.minPrice.toFixed(2)} max=${attr.maxPrice.toFixed(2)} (${attr.totalSales} sales)`);
  }

  // Show top 5 by maxPrice
  const sortedByMax = [...attrMap.values()].sort((a, b) => b.maxPrice - a.maxPrice);
  console.log('\nTop 10 by Max Price:');
  for (const attr of sortedByMax.slice(0, 10)) {
    console.log(`  ${attr.category}|${attr.value}: max=${attr.maxPrice.toFixed(2)} avg=${attr.avgPrice.toFixed(2)} (${attr.totalSales} sales)`);
  }
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
