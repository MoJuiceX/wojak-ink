/**
 * Generate Attribute Statistics
 *
 * Processes the filled attribute sales CSV and generates statistics for each attribute:
 * - Minimum price (XCH)
 * - Maximum price (XCH)
 * - Average price (XCH)
 * - Total sales count
 * - Last sale date
 * - Individual sales (for detail view)
 *
 * OUTLIER HANDLING (for future implementation):
 * Currently, we calculate simple averages. If outliers become an issue
 * (e.g., an NFT selling for 100x the normal price), we can:
 * 1. Use median instead of mean
 * 2. Exclude values beyond 2-3 standard deviations
 * 3. Use trimmed mean (exclude top/bottom 10%)
 *
 * The data structure preserves individual sales for transparency,
 * allowing users to see exactly how averages are calculated.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface SaleRecord {
  nftEdition: number;
  priceXCH: number;
  priceUSD: number;
  date: string;
  originalPrice: number;
  originalCurrency: string;
}

interface AttributeStats {
  category: string;
  value: string;
  // Statistics
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  totalSales: number;
  lastSaleDate: string;
  lastSalePrice: number;
  // For detail view - individual sales
  sales: SaleRecord[];
}

interface AttributeStatsOutput {
  generatedAt: string;
  totalAttributes: number;
  totalSalesRecords: number;
  xchUsdRate: number;
  // Note about outlier handling
  outlierNote: string;
  // Attribute stats keyed by "Category|Value"
  attributes: Record<string, AttributeStats>;
}

function parseCSV(content: string): Array<{
  category: string;
  attribute: string;
  price: number;
  currency: string;
  xchValue: number;
  dollarValue: number;
  nftEdition: number;
  tradeDate: string;
}> {
  // Normalize line endings (handle Windows \r\n)
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '');
  const lines = normalizedContent.trim().split('\n');
  const rows: Array<{
    category: string;
    attribute: string;
    price: number;
    currency: string;
    xchValue: number;
    dollarValue: number;
    nftEdition: number;
    tradeDate: string;
  }> = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 8) {
      rows.push({
        category: parts[0],
        attribute: parts[1],
        price: parseFloat(parts[2]) || 0,
        currency: parts[3],
        xchValue: parseFloat(parts[4]) || 0,
        dollarValue: parseFloat(parts[5]) || 0,
        nftEdition: parseInt(parts[6]) || 0,
        tradeDate: parts[7].trim(), // Trim any trailing whitespace
      });
    }
  }

  return rows;
}

function calculateStats(sales: SaleRecord[]): {
  min: number;
  max: number;
  avg: number;
  lastDate: string;
  lastPrice: number;
} {
  if (sales.length === 0) {
    return { min: 0, max: 0, avg: 0, lastDate: '', lastPrice: 0 };
  }

  const prices = sales.map(s => s.priceXCH);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;

  // Sort by date to find the most recent sale
  const sortedByDate = [...sales].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastSale = sortedByDate[0];

  return {
    min,
    max,
    avg,
    lastDate: lastSale.date,
    lastPrice: lastSale.priceXCH,
  };
}

/**
 * Future outlier detection function
 * Uncomment and use when outliers become a problem
 */
// function filterOutliers(sales: SaleRecord[], stdDevMultiplier: number = 2): SaleRecord[] {
//   if (sales.length < 3) return sales;
//
//   const prices = sales.map(s => s.priceXCH);
//   const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
//   const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
//   const stdDev = Math.sqrt(variance);
//
//   const lowerBound = mean - stdDevMultiplier * stdDev;
//   const upperBound = mean + stdDevMultiplier * stdDev;
//
//   return sales.filter(s => s.priceXCH >= lowerBound && s.priceXCH <= upperBound);
// }

function main() {
  const inputPath = '/Users/abit_hex/Downloads/correct_attribute_sales_filled.csv';
  const outputPath = path.join(__dirname, '../public/assets/nft-data/attribute_stats.json');

  console.warn('Reading CSV file...');
  const content = fs.readFileSync(inputPath, 'utf-8');
  const rows = parseCSV(content);
  console.warn(`Parsed ${rows.length} rows`);

  // Group sales by attribute (Category|Value)
  const attributeSalesMap = new Map<string, SaleRecord[]>();

  for (const row of rows) {
    const key = `${row.category}|${row.attribute}`;

    if (!attributeSalesMap.has(key)) {
      attributeSalesMap.set(key, []);
    }

    attributeSalesMap.get(key)!.push({
      nftEdition: row.nftEdition,
      priceXCH: row.xchValue,
      priceUSD: row.dollarValue,
      date: row.tradeDate,
      originalPrice: row.price,
      originalCurrency: row.currency,
    });
  }

  console.warn(`Found ${attributeSalesMap.size} unique attributes`);

  // Calculate statistics for each attribute
  const attributeStats: Record<string, AttributeStats> = {};

  for (const [key, sales] of attributeSalesMap) {
    const [category, value] = key.split('|');
    const stats = calculateStats(sales);

    // Sort sales by date (newest first) for display
    const sortedSales = [...sales].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    attributeStats[key] = {
      category,
      value,
      minPrice: Math.round(stats.min * 10000) / 10000,
      maxPrice: Math.round(stats.max * 10000) / 10000,
      avgPrice: Math.round(stats.avg * 10000) / 10000,
      totalSales: sales.length,
      lastSaleDate: stats.lastDate,
      lastSalePrice: Math.round(stats.lastPrice * 10000) / 10000,
      sales: sortedSales,
    };
  }

  // Create output object
  const output: AttributeStatsOutput = {
    generatedAt: new Date().toISOString(),
    totalAttributes: attributeSalesMap.size,
    totalSalesRecords: rows.length,
    xchUsdRate: 5.25,
    outlierNote:
      'Currently using simple average. If outliers become an issue, ' +
      'implement filterOutliers() function to exclude values beyond 2 standard deviations.',
    attributes: attributeStats,
  };

  // Write JSON file
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.warn(`\nOutput written to: ${outputPath}`);

  // Print summary
  console.warn('\n=== Summary ===');
  console.warn(`Total unique attributes: ${output.totalAttributes}`);
  console.warn(`Total sales records: ${output.totalSalesRecords}`);

  // Top 10 most sold attributes
  const sortedByCount = Object.values(attributeStats).sort(
    (a, b) => b.totalSales - a.totalSales
  );
  console.warn('\nTop 10 most sold attributes:');
  for (let i = 0; i < Math.min(10, sortedByCount.length); i++) {
    const attr = sortedByCount[i];
    console.warn(
      `  ${i + 1}. ${attr.category}: ${attr.value} - ${attr.totalSales} sales, avg ${attr.avgPrice.toFixed(4)} XCH`
    );
  }

  // Top 10 highest average price
  const sortedByAvg = Object.values(attributeStats).sort(
    (a, b) => b.avgPrice - a.avgPrice
  );
  console.warn('\nTop 10 highest average price attributes:');
  for (let i = 0; i < Math.min(10, sortedByAvg.length); i++) {
    const attr = sortedByAvg[i];
    console.warn(
      `  ${i + 1}. ${attr.category}: ${attr.value} - avg ${attr.avgPrice.toFixed(4)} XCH (${attr.totalSales} sales)`
    );
  }
}

main();
