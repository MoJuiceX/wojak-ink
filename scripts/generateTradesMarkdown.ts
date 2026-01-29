/**
 * Generate Trades Markdown
 * 
 * Creates a comprehensive markdown file with all Wojak Farmers Plot trades:
 * - Price for each NFT sold in XCH and USD
 * - Price for each metadata attribute (listed one by one)
 * - Summary of unique NFTs sold
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default XCH/USD rate (fallback if we can't fetch)
// Current rate: $4.2/XCH (as of 2026-01-24)
// Note: Historical rates vary, but we use this as a reasonable default
const DEFAULT_XCH_USD_RATE = 4.2;

// Token rates for CAT to XCH conversion (from historicalPriceService)
// These are the CORRECT rates - the CSV has wrong values, so we recalculate
const TOKEN_RATES: Record<string, number> = {
  'BEPE': 0.0000204,        // 1 BEPE = 0.0000204 XCH
  '🪄⚡️': 0.000138,        // 1 🪄⚡️ = 0.000138 XCH
  'HOA': 0.000318,          // 1 HOA = 0.000318 XCH
  '$HOA': 0.000318,
  'PIZZA': 0.00000285,      // 1 PIZZA = 0.00000285 XCH
  '$PIZZA': 0.00000285,
  'G4M': 0.00000175,        // 1 G4M = 0.00000175 XCH
  '$G4M': 0.00000175,
  'SPROUT': 0.00000932,     // 1 SPROUT = 0.00000932 XCH
  '$SPROUT': 0.00000932,
  '❤️': 0.000118,           // 1 ❤️ = 0.000118 XCH
  'LOVE': 0.000118,
  '$LOVE': 0.000118,
  '$CHIA': 0.0039,          // 1 $CHIA = 0.0039 XCH
  'NeckCoin': 3.006,         // 1 NeckCoin = 3.006 XCH
  '$NECKCOIN': 3.006,
  '✨❤️‍🔥🧙‍♂️': 2.926,    // 1 ✨❤️‍🔥🧙‍♂️ = 2.926 XCH
  'JOCK': 0.0173,            // 1 JOCK = 0.0173 XCH
  'PP': 0.0025,              // 1 PP = 0.0025 XCH
};

interface Trade {
  nftEdition: number;
  price: number;
  currency: string;
  xchEquivalent: number;
  usdValue: number;
  tradeDate: string;
  traits: Array<{ category: string; value: string }>;
  attributePriceXch: number; // Price per attribute in XCH
  attributePriceUsd: number; // Price per attribute in USD
}

/**
 * Get XCH/USD rate for a date (simplified - uses default for now)
 * In production, you'd fetch from CoinGecko API
 */
function getXchUsdRate(): number {
  // For now, use default rate
  // TODO: Fetch from CoinGecko API for historical accuracy
  return DEFAULT_XCH_USD_RATE;
}

/**
 * Convert CAT token amount to XCH using correct rates
 * The CSV has wrong conversion rates, so we recalculate here
 */
function convertToXCH(amount: number, currency: string): number {
  if (currency === 'XCH') return amount;
  const rate = TOKEN_RATES[currency];
  if (rate) {
    const xch = amount * rate;
    return xch;
  }
  console.warn(`Unknown CAT token: ${currency}, using conservative default rate`);
  return amount * 0.000001; // Very conservative default for unknown tokens
}

async function main() {
  const csvPath = path.join(__dirname, '../attribute_sales.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  // Skip header
  const dataLines = lines.slice(1);

  // Group by NFT Edition and Trade Date (unique trades)
  const tradesMap = new Map<string, Trade>();

  for (const line of dataLines) {
    // Parse CSV line (handling quoted fields)
    const matches = line.match(/("(?:[^"]|"")*"|[^,]+)(?=\s*,|\s*$)/g);
    if (!matches || matches.length < 7) continue;

    const category = matches[0].replace(/^"|"$/g, '').replace(/""/g, '"');
    const attribute = matches[1].replace(/^"|"$/g, '').replace(/""/g, '"');
    const price = parseFloat(matches[2]);
    const currency = matches[3].replace(/^"|"$/g, '');
    // IGNORE the CSV's xchEquivalent - it's wrong! Recalculate it properly
    const nftEdition = parseInt(matches[5], 10);
    const tradeDate = matches[6].replace(/^"|"$/g, '');

    // Skip JOCK token trades - conversion rate is incorrect/unreliable
    if (currency === 'JOCK') {
      continue;
    }

    const tradeKey = `${nftEdition}-${tradeDate}`;

    if (!tradesMap.has(tradeKey)) {
      // RECALCULATE XCH equivalent using correct rates (CSV values are wrong!)
      const xchEquivalent = convertToXCH(price, currency);
      
      // Calculate USD value
      const xchUsdRate = getXchUsdRate();
      const usdValue = xchEquivalent * xchUsdRate;
      const attributePriceXch = xchEquivalent / 7; // Divide by 7 attributes
      const attributePriceUsd = usdValue / 7;

      tradesMap.set(tradeKey, {
        nftEdition,
        price,
        currency,
        xchEquivalent,
        usdValue,
        tradeDate,
        traits: [],
        attributePriceXch,
        attributePriceUsd,
      });
    }

    const trade = tradesMap.get(tradeKey)!;
    trade.traits.push({ category, value: attribute });
  }

  // Convert to array and sort by date (newest first), then by edition
  const trades = Array.from(tradesMap.values()).sort((a, b) => {
    const dateCompare = b.tradeDate.localeCompare(a.tradeDate);
    if (dateCompare !== 0) return dateCompare;
    return a.nftEdition - b.nftEdition;
  });

  // Calculate statistics
  const xchTrades = trades.filter(t => t.currency === 'XCH').length;
  const catTrades = trades.filter(t => t.currency !== 'XCH').length;
  const totalXchVolume = trades.reduce((sum, t) => sum + t.xchEquivalent, 0);
  const totalUsdVolume = trades.reduce((sum, t) => sum + t.usdValue, 0);
  const avgPriceXch = totalXchVolume / trades.length;
  const avgPriceUsd = totalUsdVolume / trades.length;
  const uniqueNfts = new Set(trades.map(t => t.nftEdition)).size;

  // Generate markdown
  const mdLines: string[] = [];
  
  mdLines.push('# Wojak Farmers Plot - Complete Trade History');
  mdLines.push('');
  mdLines.push(`**Collection ID:** \`col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah\``);
  mdLines.push('');
  mdLines.push(`**Total Trades:** ${trades.length}`);
  mdLines.push(`**Unique NFTs Sold:** ${uniqueNfts}`);
  mdLines.push(`**Last Updated:** ${new Date().toISOString().split('T')[0]}`);
  mdLines.push('');
  mdLines.push('---');
  mdLines.push('');

  // Summary Statistics
  mdLines.push('## Summary Statistics');
  mdLines.push('');
  mdLines.push(`- **Total Trades:** ${trades.length}`);
  mdLines.push(`- **Unique NFTs Sold:** ${uniqueNfts}`);
  mdLines.push(`- **XCH Trades:** ${xchTrades}`);
  mdLines.push(`- **CAT Trades:** ${catTrades}`);
  mdLines.push(`- **Total Volume (XCH):** ${totalXchVolume.toFixed(4)} XCH`);
  mdLines.push(`- **Total Volume (USD):** $${totalUsdVolume.toFixed(2)}`);
  mdLines.push(`- **Average Price (XCH):** ${avgPriceXch.toFixed(4)} XCH`);
  mdLines.push(`- **Average Price (USD):** $${avgPriceUsd.toFixed(2)}`);
  mdLines.push(`- **XCH/USD Rate Used:** $${DEFAULT_XCH_USD_RATE}/XCH (current rate - historical rates may vary)`);
  mdLines.push('');
  mdLines.push('---');
  mdLines.push('');

  // Unique NFTs Summary
  mdLines.push('## Unique NFTs Sold Summary');
  mdLines.push('');
  mdLines.push(`**Total Unique NFTs Sold:** ${uniqueNfts}`);
  mdLines.push('');
  mdLines.push('| NFT # | Trade Date | Price (XCH) | Price (USD) | Currency |');
  mdLines.push('|-------|------------|-------------|-------------|----------|');

  // Group by NFT edition to show unique NFTs
  const nftMap = new Map<number, Trade>();
  for (const trade of trades) {
    // Keep the most recent trade for each NFT
    if (!nftMap.has(trade.nftEdition)) {
      nftMap.set(trade.nftEdition, trade);
    } else {
      const existing = nftMap.get(trade.nftEdition)!;
      if (trade.tradeDate > existing.tradeDate) {
        nftMap.set(trade.nftEdition, trade);
      }
    }
  }

  const uniqueNftTrades = Array.from(nftMap.values()).sort((a, b) => a.nftEdition - b.nftEdition);
  
  for (const trade of uniqueNftTrades) {
    mdLines.push(
      `| #${trade.nftEdition.toString().padStart(4, '0')} | ${trade.tradeDate} | ${trade.xchEquivalent.toFixed(4)} XCH | $${trade.usdValue.toFixed(2)} | ${trade.currency} |`
    );
  }

  mdLines.push('');
  mdLines.push('---');
  mdLines.push('');

  // All Trades with Attribute Details
  mdLines.push('## All Trades - Complete Details');
  mdLines.push('');
  mdLines.push('### Trade Information');
  mdLines.push('');
  mdLines.push('Each trade shows:');
  mdLines.push('- NFT edition number and trade date');
  mdLines.push('- Total price in XCH and USD');
  mdLines.push('- All 7 attributes with their individual prices');
  mdLines.push('');
  mdLines.push('---');
  mdLines.push('');

  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i];
    
    mdLines.push(`### Trade ${i + 1}: NFT #${trade.nftEdition.toString().padStart(4, '0')} - ${trade.tradeDate}`);
    mdLines.push('');
    mdLines.push('**Trade Summary:**');
    mdLines.push(`- **NFT Edition:** #${trade.nftEdition}`);
    mdLines.push(`- **Trade Date:** ${trade.tradeDate}`);
    mdLines.push(`- **Price:** ${trade.price} ${trade.currency}`);
    mdLines.push(`- **XCH Equivalent:** ${trade.xchEquivalent.toFixed(4)} XCH`);
    mdLines.push(`- **USD Value:** $${trade.usdValue.toFixed(2)}`);
    mdLines.push(`- **Price per Attribute (XCH):** ${trade.attributePriceXch.toFixed(6)} XCH`);
    mdLines.push(`- **Price per Attribute (USD):** $${trade.attributePriceUsd.toFixed(4)}`);
    mdLines.push('');
    mdLines.push('**Attributes (with individual prices):**');
    mdLines.push('');
    mdLines.push('| Category | Attribute | Price (XCH) | Price (USD) |');
    mdLines.push('|----------|-----------|-------------|-------------|');
    
    for (const trait of trade.traits) {
      mdLines.push(
        `| ${trait.category} | ${trait.value} | ${trade.attributePriceXch.toFixed(6)} XCH | $${trade.attributePriceUsd.toFixed(4)} |`
      );
    }
    
    mdLines.push('');
    mdLines.push('---');
    mdLines.push('');
  }

  // Attribute Price Summary
  mdLines.push('## Attribute Price Summary');
  mdLines.push('');
  mdLines.push('This section shows the average price for each attribute value across all trades.');
  mdLines.push('');
  
  // Calculate attribute-level statistics
  const attributeStats = new Map<string, { count: number; totalXch: number; totalUsd: number }>();
  
  for (const trade of trades) {
    for (const trait of trade.traits) {
      const key = `${trait.category}:${trait.value}`;
      if (!attributeStats.has(key)) {
        attributeStats.set(key, { count: 0, totalXch: 0, totalUsd: 0 });
      }
      const stats = attributeStats.get(key)!;
      stats.count++;
      stats.totalXch += trade.attributePriceXch;
      stats.totalUsd += trade.attributePriceUsd;
    }
  }

  // Group by category
  const byCategory = new Map<string, Array<{ value: string; count: number; avgXch: number; avgUsd: number }>>();
  
  for (const [key, stats] of attributeStats.entries()) {
    const [category, value] = key.split(':');
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push({
      value,
      count: stats.count,
      avgXch: stats.totalXch / stats.count,
      avgUsd: stats.totalUsd / stats.count,
    });
  }

  // Sort categories
  const categories = Array.from(byCategory.keys()).sort();
  
  for (const category of categories) {
    mdLines.push(`### ${category}`);
    mdLines.push('');
    mdLines.push('| Attribute | Sales Count | Avg Price (XCH) | Avg Price (USD) |');
    mdLines.push('|-----------|-------------|-----------------|-----------------|');
    
    const attributes = byCategory.get(category)!;
    attributes.sort((a, b) => b.avgXch - a.avgXch); // Sort by price descending
    
    for (const attr of attributes) {
      mdLines.push(
        `| ${attr.value} | ${attr.count} | ${attr.avgXch.toFixed(6)} XCH | $${attr.avgUsd.toFixed(4)} |`
      );
    }
    
    mdLines.push('');
  }

  mdLines.push('---');
  mdLines.push('');
  mdLines.push('## Notes');
  mdLines.push('');
  mdLines.push('- Trades are sorted by date (newest first), then by NFT edition number');
  mdLines.push('- XCH Equivalent is calculated using TibetSwap/Dexie exchange rates for CAT tokens');
  mdLines.push('- USD values are calculated using the current XCH/USD rate of $4.2/XCH');
  mdLines.push('  - **Note:** Historical XCH/USD rates vary significantly. For accurate USD values, fetch historical rates from CoinGecko API for each trade date');
  mdLines.push('- Attribute prices are calculated by dividing the total NFT price by 7 (number of attributes)');
  mdLines.push('- This data is sourced from Dexie.space API (completed trades only, status=4)');
  mdLines.push('- Collection: Wojak Farmers Plot (4,200 NFTs on Chia blockchain)');
  mdLines.push('- If an NFT was sold multiple times, only the most recent sale is shown in the "Unique NFTs Sold Summary"');
  mdLines.push('');

  // Write markdown file
  const outputPath = path.join(__dirname, '../docs/WOJAK-FARMERS-PLOT-TRADES.md');
  fs.writeFileSync(outputPath, mdLines.join('\n'), 'utf-8');

  console.warn(`Generated markdown file: ${outputPath}`);
  console.warn(`   Total trades: ${trades.length}`);
  console.warn(`   Unique NFTs sold: ${uniqueNfts}`);
  console.warn(`   XCH trades: ${xchTrades}`);
  console.warn(`   CAT trades: ${catTrades}`);
  console.warn(`   Total volume: ${totalXchVolume.toFixed(4)} XCH ($${totalUsdVolume.toFixed(2)})`);
  console.warn(`   Average price: ${avgPriceXch.toFixed(4)} XCH ($${avgPriceUsd.toFixed(2)})`);
}

main().catch(console.error);
