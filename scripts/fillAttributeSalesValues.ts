/**
 * Fill Attribute Sales CSV Values
 *
 * Reads the cleaned CSV file and fills in:
 * - XCH value (column E) - converted from CAT tokens using TibetSwap rates
 * - Dollar value (column F) - XCH value × $5.25
 */

import * as fs from 'fs';

// TibetSwap exchange rates (XCH per token) - calculated from raw reserves
// Formula: (xch_reserve / 1e12) / (token_reserve / 1000)
const CAT_TO_XCH_RATES: Record<string, number> = {
  '✨❤️‍🔥🧙‍♂️': 2.926,      // Caster: 283.109 / 96.744
  '❤️': 0.0001178,          // LOVE: 630.21 / 5,350,524.237
  '🪄⚡️': 0.0001381,        // Spell Power: 451.63 / 3,270,190.206
  'HOA': 0.0003176,          // HOA: 478.99 / 1,507,903.354
  'NeckCoin': 3.006,         // NeckCoin: 1,251.12 / 416.195
  'BEPE': 0.0000204,         // BEPE: 3,125.45 / 153,172,206.232
};

const XCH_USD_RATE = 5.25; // Current XCH price in USD

interface SaleRow {
  category: string;
  attribute: string;
  price: number;
  currency: string;
  xchValue: number;
  dollarValue: number;
  nftEdition: string;
  tradeDate: string;
}

function parseCSV(content: string): SaleRow[] {
  const lines = content.trim().split('\n');
  const rows: SaleRow[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Parse CSV properly (handle commas in values)
    const parts = line.split(',');

    if (parts.length >= 8) {
      rows.push({
        category: parts[0],
        attribute: parts[1],
        price: parseFloat(parts[2]) || 0,
        currency: parts[3],
        xchValue: 0,
        dollarValue: 0,
        nftEdition: parts[6],
        tradeDate: parts[7],
      });
    }
  }

  return rows;
}

function calculateXCHValue(price: number, currency: string): number {
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

function formatNumber(num: number, decimals: number = 4): string {
  return num.toFixed(decimals);
}

function main() {
  const inputPath = '/Users/abit_hex/Downloads/correct_attribute_sales.csv';
  const outputPath = '/Users/abit_hex/Downloads/correct_attribute_sales_filled.csv';

  console.warn('Reading CSV file...');
  const content = fs.readFileSync(inputPath, 'utf-8');
  const rows = parseCSV(content);

  console.warn(`Processing ${rows.length} rows...`);

  // Calculate values
  for (const row of rows) {
    row.xchValue = calculateXCHValue(row.price, row.currency);
    row.dollarValue = row.xchValue * XCH_USD_RATE;
  }

  // Generate output CSV
  const outputLines: string[] = [];
  outputLines.push('Category,Attribute,Price,Currency,XCH value,Dollar value,NFT_Edition,Trade_Date');

  for (const row of rows) {
    outputLines.push(
      `${row.category},${row.attribute},${row.price},${row.currency},${formatNumber(row.xchValue)},${formatNumber(row.dollarValue, 2)},${row.nftEdition},${row.tradeDate}`
    );
  }

  fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf-8');
  console.warn(`Output written to: ${outputPath}`);

  // Print summary
  const currencies = [...new Set(rows.map(r => r.currency))];
  console.warn('\nCurrency breakdown:');
  for (const currency of currencies) {
    const currencyRows = rows.filter(r => r.currency === currency);
    const totalXCH = currencyRows.reduce((sum, r) => sum + r.xchValue, 0);
    console.warn(`  ${currency}: ${currencyRows.length} rows, ${formatNumber(totalXCH, 2)} XCH total`);
  }

  const totalXCH = rows.reduce((sum, r) => sum + r.xchValue, 0);
  const totalUSD = totalXCH * XCH_USD_RATE;
  console.warn(`\nTotal: ${formatNumber(totalXCH, 2)} XCH = $${formatNumber(totalUSD, 2)}`);
}

main();
