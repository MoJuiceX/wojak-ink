/**
 * Credit Audit Script
 *
 * Parses backfill-credits-data.sql to produce:
 * 1. Full list of all wallets
 * 2. Per-wallet: NFTs bought, price XCH, credits earned
 * 3. Verification formulas
 *
 * Run: npx tsx scripts/audit-credits.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SQL_PATH = path.join(__dirname, 'backfill-credits-data.sql');

interface Purchase {
  nftId: string;
  priceXch: number;
  creditsEarned: number; // stored units (÷100 = display)
  eventTimestamp: string;
}

interface WalletSummary {
  wallet: string;
  purchases: Purchase[];
  totalXch: number;
  totalCredits: number; // display units
  freeMints: number;
}

// Parse INSERT lines: extract wallet, nft_id, price_xch, credits_earned, event_timestamp
const INSERT_REGEX =
  /VALUES\s*\(\s*'([^']+)',\s*'([^']+)',\s*'[^']+',\s*([\d.]+),\s*\d+,\s*(\d+),\s*\d+,\s*'[^']+',\s*'([^']+)'\)/;

function parseSql(): { wallets: Map<string, Purchase[]>; meta: Record<string, string> } {
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const lines = sql.split('\n');
  const wallets = new Map<string, Purchase[]>();
  const seenEventIds = new Set<string>();
  const meta: Record<string, string> = {};

  for (const line of lines) {
    if (line.startsWith('-- ')) {
      const m = line.match(/^--\s*(\w[\w\s]+):\s*(.+)$/);
      if (m) meta[m[1].trim()] = m[2].trim();
      continue;
    }
    if (!line.includes('INSERT OR IGNORE INTO credit_events')) continue;

    const match = line.match(INSERT_REGEX);
    if (!match) continue;

    const [, wallet, nftId, priceXchStr, creditsEarnedStr, eventTimestamp] = match;
    const eventId = `${nftId}_${eventTimestamp}`;
    if (seenEventIds.has(eventId)) continue; // dedupe (SQL has some dupes)
    seenEventIds.add(eventId);

    const priceXch = parseFloat(priceXchStr);
    const creditsEarned = parseInt(creditsEarnedStr, 10);

    if (!wallets.has(wallet)) wallets.set(wallet, []);
    wallets.get(wallet)!.push({
      nftId,
      priceXch,
      creditsEarned,
      eventTimestamp,
    });
  }

  return { wallets, meta };
}

function summarize(wallets: Map<string, Purchase[]>): WalletSummary[] {
  const result: WalletSummary[] = [];

  for (const [wallet, purchases] of wallets) {
    const totalXch = purchases.reduce((s, p) => s + p.priceXch, 0);
    const totalCreditsUnits = purchases.reduce((s, p) => s + p.creditsEarned, 0);
    const totalCreditsDisplay = totalCreditsUnits / 100;
    const freeMints = Math.floor(totalCreditsUnits / 10000);

    result.push({
      wallet,
      purchases: purchases.sort((a, b) => b.eventTimestamp.localeCompare(a.eventTimestamp)),
      totalXch,
      totalCredits: totalCreditsDisplay,
      freeMints,
    });
  }

  result.sort((a, b) => b.totalCredits - a.totalCredits);
  return result;
}

function main() {
  console.log('='.repeat(70));
  console.log('  Credit Leaderboard Audit Report');
  console.log('='.repeat(70));

  const { wallets, meta } = parseSql();
  const summaries = summarize(wallets);

  console.log('\n--- Backfill metadata ---');
  console.log('Collection:', meta['Collection'] || 'N/A');
  console.log('Total events:', meta['Total events'] || 'N/A');
  console.log('XCH trades credited:', meta['XCH trades'] || 'N/A');
  console.log('CAT trades skipped:', meta['CAT trades skipped'] || 'N/A');
  console.log('Unique wallets:', summaries.length);

  console.log('\n' + '='.repeat(70));
  console.log('  ALL WALLETS (sorted by total credits)');
  console.log('='.repeat(70));

  for (let i = 0; i < summaries.length; i++) {
    const s = summaries[i];
    console.log(`\n#${i + 1} ${s.wallet}`);
    console.log(`   Total: ${s.totalXch.toFixed(3)} XCH → ${s.totalCredits.toFixed(2)} credits → ${s.freeMints} free mints`);
    console.log(`   Purchases:`);
    for (const p of s.purchases) {
      const crDisplay = (p.creditsEarned / 100).toFixed(2);
      const shortNft = p.nftId.slice(0, 12) + '...';
      console.log(`     - NFT ${shortNft}  ${p.priceXch.toFixed(3)} XCH  → ${crDisplay} cr  (${p.eventTimestamp})`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('  PLAIN WALLET LIST (copy-paste)');
  console.log('='.repeat(70));
  for (const s of summaries) {
    console.log(s.wallet);
  }

  console.log('\n' + '='.repeat(70));
  console.log('  XCH vs CAT');
  console.log('='.repeat(70));
  console.log(`
  ONLY XCH BUYS EARN CREDITS.

  The backfill and credit-tracker worker explicitly skip CAT trades:
  - MintGarden Events API returns xch_price for XCH trades, 0 or null for CAT
  - Script: if (!event.xch_price || event.xch_price <= 0) → catTradesSkipped++; continue
  - Your backfill: ${meta['CAT trades skipped'] || '?'} CAT trades were skipped.
  `);

  console.log('\n' + '='.repeat(70));
  console.log('  HOW TO AUDIT');
  console.log('='.repeat(70));
  console.log(`
  1. Verify against MintGarden Events API:
     GET https://api.mintgarden.io/events?collection=col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah&type=2&size=100
     - Match event_id (nft_id_eventIndex_timestamp), wallet (address.encoded_id), xch_price

  2. Spot-check credit formula:
     credits = 50 * (price/floor) * (1 + 0.2*ln(price/floor))
     Floor = 1.0 XCH for backfill. Stored as units: credits_earned/100 = display credits.

  3. Verify a specific wallet:
     GET /api/credits/history?wallet=xch1...&limit=50
     Compare event_id, priceXch, creditsEarned to this report.

  4. Re-run credit formula on sample:
     scripts/backfill-credits.ts lines 96-108: calculateCredits(priceXch, floorXch)
  `);

  // Optional: write JSON for programmatic use
  const outPath = path.join(__dirname, 'audit-credits-report.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        meta,
        wallets: summaries.map((s) => ({
          wallet: s.wallet,
          totalXch: s.totalXch,
          totalCredits: s.totalCredits,
          freeMints: s.freeMints,
          purchaseCount: s.purchases.length,
          purchases: s.purchases,
        })),
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`\nJSON report written to: ${outPath}`);
}

main();
