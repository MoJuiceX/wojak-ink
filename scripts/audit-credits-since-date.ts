/**
 * Credit Audit: Verify all XCH buys since a date are in credit_events
 *
 * 1. Fetches XCH trade events from MintGarden (same source as backfill)
 * 2. Filters to events with timestamp >= sinceDate
 * 3. Optionally compares to DB via /api/credits/audit-events?since=...
 *
 * Usage:
 *   npx tsx scripts/audit-credits-since-date.ts --since=2026-01-05
 *   npx tsx scripts/audit-credits-since-date.ts --since=2026-01-05 --compare=https://wojak.ink
 *
 * Default since: 2026-01-05
 */

const MINTGARDEN_API = 'https://api.mintgarden.io';
const COLLECTION_ID =
  'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';
const DELAY_MS = 500;
const MAX_PAGES = 200;

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

function parseArgs(): { since: string; compareBase: string | null } {
  const args = process.argv.slice(2);
  let since = '2026-01-05';
  let compareBase: string | null = null;

  for (const arg of args) {
    if (arg.startsWith('--since=')) since = arg.slice(8).trim();
    if (arg.startsWith('--compare=')) compareBase = arg.slice(10).trim() || null;
  }

  return { since, compareBase };
}

async function fetchMintGardenEventsSince(since: string): Promise<MintGardenEvent[]> {
  const all: MintGardenEvent[] = [];
  let cursor: string | null = null;
  let page = 0;

  // MintGarden returns newest first; stop when we pass the cutoff
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

    let passedCutoff = false;
    for (const e of items) {
      if (e.timestamp < since) passedCutoff = true;
      else all.push(e);
    }
    if (passedCutoff) break;

    if (data.next && data.next !== cursor) cursor = data.next;
    else break;
    page++;
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  return all;
}

function eventId(e: MintGardenEvent): string {
  return `${e.nft_id}_${e.event_index}_${e.timestamp}`;
}

async function fetchDbEventIds(baseUrl: string, since: string): Promise<Set<string>> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/credits/audit-events?since=${since}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Audit API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { eventIds?: string[]; count?: number };
  const list = data.eventIds ?? [];
  return new Set(list);
}

async function main() {
  const { since, compareBase } = parseArgs();
  const sinceDate = new Date(since);
  const sinceIso = sinceDate.toISOString().slice(0, 10);

  console.log('='.repeat(70));
  console.log('  Credit Audit: All XCH buys since', sinceIso);
  console.log('='.repeat(70));

  console.log('\nFetching MintGarden trade events (newest first, until', sinceIso, ')...');
  const eventsSince = await fetchMintGardenEventsSince(sinceIso);

  const xchSince = eventsSince.filter(
    (e) => e.xch_price > 0 && e.address?.encoded_id && e.timestamp >= sinceIso
  );

  const mintGardenIds = new Set(xchSince.map(eventId));

  console.log(`  Events fetched (since ${sinceIso}): ${eventsSince.length}`);
  console.log(`  XCH trades since ${sinceIso}: ${xchSince.length}`);
  if (xchSince.length > 0) {
    const oldest = xchSince[xchSince.length - 1]!.timestamp;
    const newest = xchSince[0]!.timestamp;
    console.log(`  Event date range: ${oldest} to ${newest}`);
  }

  const outPath = `scripts/audit-mintgarden-since-${sinceIso.replace(/-/g, '')}.json`;
  const fs = await import('fs');
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        since: sinceIso,
        generatedAt: new Date().toISOString(),
        mintGarden: {
          totalEventsFetched: eventsSince.length,
          xchTradesSince: xchSince.length,
          eventIds: [...mintGardenIds],
          events: xchSince.map((e) => ({
            eventId: eventId(e),
            nftId: e.nft_id,
            wallet: e.address!.encoded_id,
            priceXch: e.xch_price,
            timestamp: e.timestamp,
          })),
        },
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`\nMintGarden snapshot saved: ${outPath}`);

  if (compareBase) {
    console.log(`\nComparing to DB at ${compareBase}...`);
    const dbIds = await fetchDbEventIds(compareBase, sinceIso);

    const missing = [...mintGardenIds].filter((id) => !dbIds.has(id));
    const extra = [...dbIds].filter((id) => !mintGardenIds.has(id));

    console.log(`  DB event_ids since ${sinceIso}: ${dbIds.size}`);
    console.log(`  Missing from DB: ${missing.length}`);
    console.log(`  In DB but not MintGarden (check date): ${extra.length}`);

    if (missing.length > 0) {
      console.log('\n  Missing event_ids:');
      missing.slice(0, 20).forEach((id) => console.log(`    ${id}`));
      if (missing.length > 20) console.log(`    ... and ${missing.length - 20} more`);
    }

    const report = {
      since: sinceIso,
      generatedAt: new Date().toISOString(),
      compareBase,
      mintGardenCount: mintGardenIds.size,
      dbCount: dbIds.size,
      missingCount: missing.length,
      extraCount: extra.length,
      missingEventIds: missing,
      status: missing.length === 0 ? 'OK' : 'MISSING_EVENTS',
    };
    const reportPath = `scripts/audit-credits-since-${sinceIso.replace(/-/g, '')}-report.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\nAudit report: ${reportPath}`);
    console.log(`\nStatus: ${report.status}`);
  } else {
    console.log('\nTo compare with the database, run:');
    console.log(`  npx tsx scripts/audit-credits-since-date.ts --since=${sinceIso} --compare=https://wojak.ink`);
  }

  console.log('\n' + '='.repeat(70));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
