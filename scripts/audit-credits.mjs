/**
 * Credit Audit Script (ESM - runs with: node scripts/audit-credits.mjs)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_PATH = path.join(__dirname, 'backfill-credits-data.sql');

const INSERT_REGEX =
  /VALUES\s*\(\s*'([^']+)',\s*'([^']+)',\s*'[^']+',\s*([\d.]+),\s*\d+,\s*(\d+),\s*\d+,\s*'[^']+',\s*'([^']+)'\)/;

function parseSql() {
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const lines = sql.split('\n');
  const wallets = new Map();
  const seenEventIds = new Set();
  const meta = {};

  for (const line of lines) {
    if (line.startsWith('-- ')) {
      const m = line.match(/^--\s*([^:]+):\s*(.+)$/);
      if (m) meta[m[1].trim()] = m[2].trim();
      continue;
    }
    if (!line.includes('INSERT OR IGNORE INTO credit_events')) continue;
    const match = line.match(INSERT_REGEX);
    if (!match) continue;
    const [, wallet, nftId, priceXchStr, creditsEarnedStr, eventTimestamp] = match;
    const eventId = `${nftId}_${eventTimestamp}`;
    if (seenEventIds.has(eventId)) continue;
    seenEventIds.add(eventId);

    const priceXch = parseFloat(priceXchStr);
    const creditsEarned = parseInt(creditsEarnedStr, 10);
    if (!wallets.has(wallet)) wallets.set(wallet, []);
    wallets.get(wallet).push({ nftId, priceXch, creditsEarned, eventTimestamp });
  }
  return { wallets, meta };
}

function summarize(wallets) {
  const result = [];
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

const { wallets, meta } = parseSql();
const summaries = summarize(wallets);

console.log('='.repeat(70));
console.log('  Credit Leaderboard Audit Report');
console.log('='.repeat(70));
console.log('\n--- Metadata ---');
console.log('XCH trades credited:', meta['XCH trades'] || '?');
console.log('CAT trades skipped:', meta['CAT trades skipped'] || '?');
console.log('Unique wallets:', summaries.length);

console.log('\n--- ALL WALLETS (by total credits) ---\n');
for (let i = 0; i < summaries.length; i++) {
  const s = summaries[i];
  console.log(`#${i + 1} ${s.wallet}`);
  console.log(`   ${s.totalXch.toFixed(3)} XCH → ${s.totalCredits.toFixed(2)} cr → ${s.freeMints} free mints`);
  for (const p of s.purchases) {
    console.log(`     NFT ${p.nftId.slice(0, 16)}... ${p.priceXch.toFixed(3)} XCH → ${(p.creditsEarned / 100).toFixed(2)} cr`);
  }
}

console.log('\n--- PLAIN WALLET LIST ---');
summaries.forEach((s) => console.log(s.wallet));

const report = { generatedAt: new Date().toISOString(), meta, summaries };
fs.writeFileSync(
  path.join(__dirname, 'audit-credits-report.json'),
  JSON.stringify(report, null, 2)
);
fs.writeFileSync(
  path.join(__dirname, '..', 'public', 'audit-credits-report.json'),
  JSON.stringify(report, null, 2)
);
console.log('\nReport saved to scripts/audit-credits-report.json and public/audit-credits-report.json');
