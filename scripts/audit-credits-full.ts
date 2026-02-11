/**
 * Full Credit Audit — Floor 1.0 XCH
 *
 * 1. Fetches ALL XCH trade events from MintGarden
 * 2. Computes expected credits with floor = 1.0 XCH
 * 3. Compares to DB (event presence + credit amounts)
 * 4. Generates leaderboard and fix SQL if needed
 *
 * Usage:
 *   npx tsx scripts/audit-credits-full.ts --compare=https://wojak.ink
 *   npx tsx scripts/audit-credits-full.ts --db-file=scripts/backfill-credits-data.sql
 *
 * --db-file accepts:
 *   - .sql: Parse backfill SQL (scripts/backfill-credits-data.sql)
 *   - .json: Audit API response with events array
 */

const MINTGARDEN_API = 'https://api.mintgarden.io';
const COLLECTION_ID =
  'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';
const DELAY_MS = 500;
const MAX_PAGES = 200;

const FLOOR_XCH = 1.0;
const CREDITS_PER_FLOOR = 50;
const MIN_EFFECTIVE_FLOOR = 0.5;
const WHALE_COEFFICIENT = 0.2;

interface MintGardenEvent {
  nft_id: string;
  event_index: number;
  timestamp: string;
  xch_price: number;
  address?: { encoded_id: string };
}

interface MintGardenEventsResponse {
  items: MintGardenEvent[];
  next: string | null;
}

function parseArgs(): { compareBase: string | null; dbFile: string | null } {
  const args = process.argv.slice(2);
  let compareBase: string | null = null;
  let dbFile: string | null = null;
  for (const arg of args) {
    if (arg.startsWith('--compare=')) compareBase = arg.slice(10).trim() || null;
    if (arg.startsWith('--db-file=')) dbFile = arg.slice(10).trim() || null;
  }
  return { compareBase, dbFile };
}

function eventId(e: MintGardenEvent): string {
  return `${e.nft_id}_${e.event_index}_${e.timestamp}`;
}

function calculateCredits(priceXch: number, floorXch: number): number {
  const effectiveFloor = Math.max(MIN_EFFECTIVE_FLOOR, floorXch);
  const priceRatio = Math.max(1, priceXch / effectiveFloor);
  const whaleMultiplier = 1 + WHALE_COEFFICIENT * Math.log(priceRatio);
  const rawCredits = CREDITS_PER_FLOOR * priceRatio * whaleMultiplier;
  return Math.round(rawCredits * 100);
}

async function fetchAllXchEvents(): Promise<MintGardenEvent[]> {
  const all: MintGardenEvent[] = [];
  let cursor: string | null = null;
  let page = 0;

  while (page < MAX_PAGES) {
    const url = new URL(`${MINTGARDEN_API}/events`);
    url.searchParams.set('collection', COLLECTION_ID);
    url.searchParams.set('type', '2');
    url.searchParams.set('size', '100');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`MintGarden API ${res.status}`);

    const data = (await res.json()) as MintGardenEventsResponse;
    const items = data.items ?? [];
    if (items.length === 0) break;

    for (const e of items) {
      if (e.xch_price > 0 && e.address?.encoded_id) all.push(e);
    }

    if (data.next && data.next !== cursor) cursor = data.next;
    else break;
    page++;
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  return all;
}

async function fetchDbEventsFromApi(baseUrl: string): Promise<
  Map<
    string,
    { walletAddress: string; priceXch: number; creditsEarned: number; floorAtTime: number }
  >
> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/credits/audit-events?since=2020-01-01&full=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Audit API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    events?: Array<{
      eventId: string;
      walletAddress: string;
      priceXch: number;
      creditsEarned: number;
      floorAtTime: number;
    }>;
  };
  const map = new Map<
    string,
    { walletAddress: string; priceXch: number; creditsEarned: number; floorAtTime: number }
  >();
  for (const ev of data.events ?? []) {
    map.set(ev.eventId, {
      walletAddress: ev.walletAddress,
      priceXch: ev.priceXch,
      creditsEarned: ev.creditsEarned,
      floorAtTime: ev.floorAtTime,
    });
  }
  return map;
}

async function fetchDbEventsFromLeaderboardAndHistory(baseUrl: string): Promise<
  Map<
    string,
    { walletAddress: string; priceXch: number; creditsEarned: number; floorAtTime: number }
  >
> {
  const base = baseUrl.replace(/\/$/, '');
  const map = new Map<
    string,
    { walletAddress: string; priceXch: number; creditsEarned: number; floorAtTime: number }
  >();

  let offset = 0;
  const limit = 100;
  let wallets: string[] = [];

  do {
    const lbRes = await fetch(`${base}/api/credits/leaderboard?limit=${limit}&offset=${offset}`);
    if (!lbRes.ok) throw new Error(`Leaderboard API ${lbRes.status}`);
    const lbData = (await lbRes.json()) as { items?: Array<{ wallet: string }> };
    const rows = lbData.items ?? [];
    if (rows.length === 0) break;
    wallets = rows.map((r) => r.wallet);
    offset += rows.length;

    for (const wallet of wallets) {
      const histRes = await fetch(`${base}/api/credits/history?wallet=${encodeURIComponent(wallet)}&limit=100`);
      if (!histRes.ok) continue;
      const histData = (await histRes.json()) as { items?: Array<{ eventId: string; priceXch: number; creditsEarned: number }> };
      for (const item of histData.items ?? []) {
        const creditsUnits = Math.round((item.creditsEarned ?? 0) * 100);
        map.set(item.eventId, {
          walletAddress: wallet,
          priceXch: item.priceXch ?? 0,
          creditsEarned: creditsUnits,
          floorAtTime: 100,
        });
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  } while (wallets.length >= limit);

  return map;
}

async function main() {
  const { compareBase, dbFile } = parseArgs();

  console.log('='.repeat(70));
  console.log('  Full Credit Audit — Floor 1.0 XCH');
  console.log('='.repeat(70));

  console.log('\n1. Fetching ALL XCH trade events from MintGarden...');
  const xchEvents = await fetchAllXchEvents();
  console.log(`   Total XCH trades: ${xchEvents.length}`);
  if (xchEvents.length === 0) {
    console.log('   No events. Exiting.');
    return;
  }
  const newest = xchEvents[0]!.timestamp;
  const oldest = xchEvents[xchEvents.length - 1]!.timestamp;
  console.log(`   Date range: ${oldest} to ${newest}`);

  console.log('\n2. Computing expected credits (floor = 1.0 XCH)...');
  const expected = new Map<
    string,
    { nftId: string; wallet: string; priceXch: number; creditsUnits: number; timestamp: string }
  >();
  const leaderboard = new Map<string, number>();
  for (const e of xchEvents) {
    const eid = eventId(e);
    const credits = calculateCredits(e.xch_price, FLOOR_XCH);
    expected.set(eid, {
      nftId: e.nft_id,
      wallet: e.address!.encoded_id,
      priceXch: e.xch_price,
      creditsUnits: credits,
      timestamp: e.timestamp,
    });
    const prev = leaderboard.get(e.address!.encoded_id) ?? 0;
    leaderboard.set(e.address!.encoded_id, prev + credits);
  }

  const sortedLeaderboard = [...leaderboard.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([wallet, units], i) => ({
      rank: i + 1,
      wallet,
      creditsUnits: units,
      creditsDisplay: (units / 100).toFixed(2),
      freeMints: Math.floor(units / 10000),
    }));

  console.log(`   Expected leaderboard (top 5):`);
  for (const row of sortedLeaderboard.slice(0, 5)) {
    console.log(`     #${row.rank} ${row.wallet.slice(0, 12)}...${row.wallet.slice(-6)}  ${row.creditsDisplay} cr  ${row.freeMints} free mints`);
  }

  const fs = await import('fs');
  const outDir = 'scripts';
  fs.writeFileSync(
    `${outDir}/audit-expected-leaderboard.json`,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        floorXch: FLOOR_XCH,
        totalXchTrades: xchEvents.length,
        leaderboard: sortedLeaderboard,
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`\n   Saved: ${outDir}/audit-expected-leaderboard.json`);

  const compareLabel = compareBase ?? (dbFile ? `file ${dbFile}` : null);
  if (!compareBase && !dbFile) {
    console.log('\n   To compare with DB, run:');
    console.log('   npx tsx scripts/audit-credits-full.ts --compare=https://wojak.ink');
    console.log('   Or: npx tsx scripts/audit-credits-full.ts --db-file=scripts/db-credit-events.json');
    console.log('\n' + '='.repeat(70));
    return;
  }

  console.log('\n3. Fetching DB state from', compareLabel, '...');
  let dbEvents: Map<
    string,
    { walletAddress: string; priceXch: number; creditsEarned: number; floorAtTime: number }
  >;

  if (dbFile) {
    const fs = await import('fs');
    const raw = fs.readFileSync(dbFile, 'utf8');
    dbEvents = new Map();

    if (dbFile.endsWith('.sql')) {
      const INSERT_REGEX =
        /VALUES\s*\(\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*([\d.]+),\s*(\d+),\s*(\d+),\s*\d+,\s*'[^']+',\s*'[^']+'\)/;
      for (const line of raw.split('\n')) {
        if (!line.includes('INSERT OR IGNORE INTO credit_events')) continue;
        const m = line.match(INSERT_REGEX);
        if (!m) continue;
        const [, , , eventId, priceXchStr, , creditsEarnedStr] = m;
        dbEvents.set(eventId!, {
          walletAddress: m[1]!.replace(/''/g, "'"),
          priceXch: parseFloat(priceXchStr ?? '0'),
          creditsEarned: parseInt(creditsEarnedStr ?? '0', 10),
          floorAtTime: 100,
        });
      }
    } else {
      const data = JSON.parse(raw) as { events?: Array<{ eventId: string; walletAddress: string; priceXch: number; creditsEarned: number; floorAtTime: number }> };
      for (const ev of data.events ?? []) {
        dbEvents.set(ev.eventId, {
          walletAddress: ev.walletAddress,
          priceXch: ev.priceXch,
          creditsEarned: ev.creditsEarned,
          floorAtTime: ev.floorAtTime ?? 100,
        });
      }
    }
  } else {
    try {
      dbEvents = await fetchDbEventsFromApi(compareBase!);
      if (dbEvents.size === 0) {
        console.log('   Audit API returned no events, trying leaderboard+history...');
        dbEvents = await fetchDbEventsFromLeaderboardAndHistory(compareBase!);
      }
    } catch {
      console.log('   Audit API unavailable, using leaderboard+history...');
      dbEvents = await fetchDbEventsFromLeaderboardAndHistory(compareBase!);
    }
  }
  console.log(`   DB events: ${dbEvents.size}`);

  const missing: string[] = [];
  const creditMismatches: Array<{
    eventId: string;
    wallet: string;
    priceXch: number;
    expectedCredits: number;
    dbCredits: number;
  }> = [];

  for (const [eid, exp] of expected) {
    const db = dbEvents.get(eid);
    if (!db) {
      missing.push(eid);
      continue;
    }
    if (db.creditsEarned !== exp.creditsUnits) {
      creditMismatches.push({
        eventId: eid,
        wallet: exp.wallet,
        priceXch: exp.priceXch,
        expectedCredits: exp.creditsUnits,
        dbCredits: db.creditsEarned,
      });
    }
  }

  const extra = [...dbEvents.keys()].filter((id) => !expected.has(id));

  console.log('\n4. Audit results:');
  console.log(`   Missing from DB:     ${missing.length}`);
  console.log(`   Credit mismatches:   ${creditMismatches.length}`);
  console.log(`   Extra in DB:        ${extra.length}`);

  if (missing.length > 0) {
    console.log('\n   Sample missing event_ids:');
    missing.slice(0, 10).forEach((id) => console.log(`     ${id}`));
    if (missing.length > 10) console.log(`     ... and ${missing.length - 10} more`);
  }

  if (creditMismatches.length > 0) {
    console.log('\n   Sample credit mismatches:');
    for (const m of creditMismatches.slice(0, 5)) {
      console.log(`     ${m.eventId.slice(0, 40)}...`);
      console.log(`       price ${m.priceXch} XCH  expected ${m.expectedCredits}  db ${m.dbCredits}`);
    }
    if (creditMismatches.length > 5) console.log(`     ... and ${creditMismatches.length - 5} more`);
  }

  const status =
    missing.length === 0 && creditMismatches.length === 0 ? 'OK' : 'DISCREPANCIES';

  const report = {
    generatedAt: new Date().toISOString(),
    compareBase: compareBase ?? dbFile,
    floorXch: FLOOR_XCH,
    mintGardenCount: xchEvents.length,
    dbCount: dbEvents.size,
    missingCount: missing.length,
    creditMismatchCount: creditMismatches.length,
    extraCount: extra.length,
    missingEventIds: missing,
    creditMismatches,
    status,
    expectedLeaderboard: sortedLeaderboard,
  };

  fs.writeFileSync(
    `${outDir}/audit-credits-full-report.json`,
    JSON.stringify(report, null, 2),
    'utf8'
  );
  console.log(`\n   Report: ${outDir}/audit-credits-full-report.json`);

  if (status !== 'OK') {
    console.log('\n5. Generating fix SQL...');
    const inserts: string[] = [];
    const updates: string[] = [];

    for (const eid of missing) {
      const exp = expected.get(eid)!;
      const wallet = exp.wallet.replace(/'/g, "''");
      const nftId = exp.nftId.replace(/'/g, "''");
      const eventIdEsc = eid.replace(/'/g, "''");
      const ts = exp.timestamp.replace(/'/g, "''");
      const whaleMult = Math.round(
        (1 + WHALE_COEFFICIENT * Math.log(Math.max(1, exp.priceXch / FLOOR_XCH))) * 10000
      );
      inserts.push(
        `INSERT OR IGNORE INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp) ` +
          `VALUES ('${wallet}', '${nftId}', '${eventIdEsc}', ${exp.priceXch}, 100, ${exp.creditsUnits}, ${whaleMult}, 'audit-backfill', '${ts}');`
      );
    }

    for (const m of creditMismatches) {
      const eventIdEsc = m.eventId.replace(/'/g, "''");
      updates.push(
        `UPDATE credit_events SET floor_at_time = 100, credits_earned = ${m.expectedCredits} WHERE event_id = '${eventIdEsc}';`
      );
    }

    const fixSql = [
      '-- Credit Audit Fix — Floor 1.0 XCH',
      `-- Generated: ${new Date().toISOString()}`,
      `-- Missing: ${missing.length}  Mismatches: ${creditMismatches.length}`,
      '',
      ...inserts,
      ...updates,
    ].join('\n');

    fs.writeFileSync(`${outDir}/audit-credits-fix.sql`, fixSql, 'utf8');
    console.log(`   Fix SQL: ${outDir}/audit-credits-fix.sql`);
    console.log(`\n   To apply: npx wrangler d1 execute wojak-users --remote --file=${outDir}/audit-credits-fix.sql`);
  } else {
    console.log('\n5. No fix needed. Leaderboard is correct.');
  }

  console.log('\n' + '='.repeat(70));
  console.log(`  Status: ${status}`);
  console.log('='.repeat(70));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
