/**
 * Historical Credit Backfill Script
 *
 * Fetches ALL trade events from MintGarden Events API for the
 * Wojak Farmers Plot collection and calculates retroactive credits.
 *
 * Usage:
 *   npx wrangler d1 execute wojak-users --local --file=functions/migrations/030_credit_system.sql
 *   npx tsx scripts/backfill-credits.ts
 *
 * Or run against remote D1:
 *   npx tsx scripts/backfill-credits.ts --remote
 *
 * This script is IDEMPOTENT — safe to run multiple times.
 * Duplicate events are skipped via UNIQUE constraint on event_id.
 *
 * Configuration:
 *   - Uses fixed 1.0 XCH floor for all historical events
 *   - Only XCH trades earn credits (CAT trades skipped)
 *   - Retroactive from a date determined by examining event data
 */

// ============ Configuration ============

const MINTGARDEN_API = 'https://api.mintgarden.io';
const COLLECTION_ID =
  'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

// Fixed floor price for backfill (no historical floor data available)
const BACKFILL_FLOOR_XCH = 1.0;
const BACKFILL_FLOOR_STORED = 100; // x100

// Credit formula constants
const CREDITS_PER_FLOOR = 50;
const MIN_EFFECTIVE_FLOOR = 0.5;
const WHALE_COEFFICIENT = 0.2;

// Rate limiting
const DELAY_BETWEEN_PAGES_MS = 500;
const MAX_PAGES = 200; // Safety limit (200 pages = 20,000 events)

// ============ Types ============

interface MintGardenEvent {
  nft_id: string;
  event_index: number;
  type: number;
  timestamp: string;
  xch_price: number;
  address: {
    id: string;
    encoded_id: string;
  };
  previous_address?: {
    id: string;
    encoded_id: string;
  };
  previous_owner?: {
    encoded_id: string;
    name?: string;
  };
  nft?: {
    id: string;
    data?: {
      name?: string;
    };
  };
  payments?: Array<{
    asset_id: string | null;
    amount: number;
  }>;
}

interface MintGardenEventsResponse {
  items: MintGardenEvent[];
  next: string | null;
  previous: string | null;
  size: number;
}

interface BackfillStats {
  totalEvents: number;
  xchTrades: number;
  catTradesSkipped: number;
  noAddressSkipped: number;
  creditsAwarded: number;
  uniqueWallets: Set<string>;
  totalXchVolume: number;
  totalCreditsUnits: number;
  earliestEvent: string;
  latestEvent: string;
}

// ============ Credit Calculation ============

function calculateCredits(priceXch: number, floorXch: number): {
  credits: number;
  multiplier: number;
} {
  const effectiveFloor = Math.max(MIN_EFFECTIVE_FLOOR, floorXch);
  const priceRatio = Math.max(1, priceXch / effectiveFloor);
  const whaleMultiplier = 1 + WHALE_COEFFICIENT * Math.log(priceRatio);
  const rawCredits = CREDITS_PER_FLOOR * priceRatio * whaleMultiplier;

  return {
    credits: Math.round(rawCredits * 100),
    multiplier: Math.round(whaleMultiplier * 10000),
  };
}

// ============ MintGarden API ============

async function fetchAllTradeEvents(): Promise<MintGardenEvent[]> {
  const allEvents: MintGardenEvent[] = [];
  let cursor: string | null = null;
  let pageCount = 0;
  const pageSize = 100;

  console.log(`\nFetching trade events from MintGarden...`);
  console.log(`Collection: ${COLLECTION_ID}`);
  console.log(`API: ${MINTGARDEN_API}\n`);

  while (pageCount < MAX_PAGES) {
    const url = new URL(`${MINTGARDEN_API}/events`);
    url.searchParams.set('collection', COLLECTION_ID);
    url.searchParams.set('type', '2'); // trade events
    url.searchParams.set('size', String(pageSize));
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        break;
      }

      const data = (await response.json()) as MintGardenEventsResponse;
      const events = data.items || [];

      if (events.length === 0) {
        console.log(`Page ${pageCount}: no more events`);
        break;
      }

      allEvents.push(...events);
      console.log(
        `Page ${pageCount}: ${events.length} events (total: ${allEvents.length})`
      );

      // Cursor-based pagination — detect infinite loop
      // MintGarden returns the same cursor when there's no more data
      if (data.next && data.next !== cursor) {
        cursor = data.next;
      } else {
        console.log(`Page ${pageCount}: reached end of data (cursor unchanged)`);
        break; // No more pages or cursor didn't advance
      }

      pageCount++;
      // Rate limit
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_PAGES_MS));
    } catch (error) {
      console.error(`Error fetching page ${pageCount}:`, error);
      break;
    }
  }

  console.log(`\nTotal events fetched: ${allEvents.length}`);
  return allEvents;
}

// ============ SQL Generation ============

/**
 * Generate SQL INSERT statements for all credit events.
 * Uses INSERT OR IGNORE for idempotency.
 */
function generateSQL(events: MintGardenEvent[]): {
  sql: string;
  stats: BackfillStats;
} {
  const stats: BackfillStats = {
    totalEvents: events.length,
    xchTrades: 0,
    catTradesSkipped: 0,
    noAddressSkipped: 0,
    creditsAwarded: 0,
    uniqueWallets: new Set(),
    totalXchVolume: 0,
    totalCreditsUnits: 0,
    earliestEvent: '',
    latestEvent: '',
  };

  const insertStatements: string[] = [];

  for (const event of events) {
    // Track timestamps
    if (!stats.earliestEvent || event.timestamp < stats.earliestEvent) {
      stats.earliestEvent = event.timestamp;
    }
    if (!stats.latestEvent || event.timestamp > stats.latestEvent) {
      stats.latestEvent = event.timestamp;
    }

    // Skip non-XCH trades
    if (!event.xch_price || event.xch_price <= 0) {
      stats.catTradesSkipped++;
      continue;
    }

    // Skip if no buyer wallet
    if (!event.address?.encoded_id) {
      stats.noAddressSkipped++;
      continue;
    }

    // Calculate credits
    const calc = calculateCredits(event.xch_price, BACKFILL_FLOOR_XCH);

    stats.xchTrades++;
    stats.uniqueWallets.add(event.address.encoded_id);
    stats.totalXchVolume += event.xch_price;
    stats.totalCreditsUnits += calc.credits;

    // Compose unique event ID and escape single quotes
    const walletAddr = event.address.encoded_id.replace(/'/g, "''");
    const nftId = event.nft_id.replace(/'/g, "''");
    const eventId = `${event.nft_id}_${event.event_index}_${event.timestamp}`.replace(/'/g, "''");
    const timestamp = event.timestamp.replace(/'/g, "''");

    insertStatements.push(
      `INSERT OR IGNORE INTO credit_events ` +
        `(wallet_address, nft_id, event_id, price_xch, floor_at_time, ` +
        `credits_earned, whale_multiplier, source, event_timestamp) ` +
        `VALUES ('${walletAddr}', '${nftId}', '${eventId}', ${event.xch_price}, ` +
        `${BACKFILL_FLOOR_STORED}, ${calc.credits}, ${calc.multiplier}, 'mintgarden', '${timestamp}');`
    );
  }

  stats.creditsAwarded = insertStatements.length;

  // Also insert a floor price snapshot for the backfill period
  const floorSnapshotSQL =
    `INSERT OR IGNORE INTO floor_price_snapshots ` +
    `(floor_xch, source, snapshot_date) ` +
    `VALUES (${BACKFILL_FLOOR_STORED}, 'backfill', '${new Date().toISOString().split('T')[0]}');`;

  const sql = [
    '-- =====================================================',
    '-- Credit Backfill — Auto-generated',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Collection: ${COLLECTION_ID}`,
    `-- Floor price used: ${BACKFILL_FLOOR_XCH} XCH (fixed for backfill)`,
    `-- Total events: ${stats.totalEvents}`,
    `-- XCH trades: ${stats.xchTrades}`,
    `-- CAT trades skipped: ${stats.catTradesSkipped}`,
    `-- Unique wallets: ${stats.uniqueWallets.size}`,
    '-- =====================================================',
    '',
    '-- Floor price snapshot',
    floorSnapshotSQL,
    '',
    '-- Credit events',
    ...insertStatements,
  ].join('\n');

  return { sql, stats };
}

// ============ Main ============

async function main() {
  console.log('='.repeat(60));
  console.log('  Phase 2: Your Wojak — Credit Backfill');
  console.log('='.repeat(60));

  // Step 1: Fetch all trade events
  const events = await fetchAllTradeEvents();

  if (events.length === 0) {
    console.log('\nNo events found. Exiting.');
    return;
  }

  // Step 2: Generate SQL
  const { sql, stats } = generateSQL(events);

  // Step 3: Write SQL file
  const outputPath = 'scripts/backfill-credits-data.sql';
  const fs = await import('fs');
  fs.writeFileSync(outputPath, sql, 'utf8');

  // Step 4: Print summary
  console.log('\n' + '='.repeat(60));
  console.log('  Backfill Summary');
  console.log('='.repeat(60));
  console.log(`  Total events fetched:    ${stats.totalEvents}`);
  console.log(`  XCH trades (credited):   ${stats.xchTrades}`);
  console.log(`  CAT trades (skipped):    ${stats.catTradesSkipped}`);
  console.log(`  No address (skipped):    ${stats.noAddressSkipped}`);
  console.log(`  Unique wallets:          ${stats.uniqueWallets.size}`);
  console.log(
    `  Total XCH volume:        ${stats.totalXchVolume.toFixed(3)} XCH`
  );
  console.log(
    `  Total credits awarded:   ${(stats.totalCreditsUnits / 100).toFixed(2)} credits`
  );
  console.log(
    `  Free mints earned:       ${Math.floor(stats.totalCreditsUnits / 10000)}`
  );
  console.log(`  Earliest event:          ${stats.earliestEvent}`);
  console.log(`  Latest event:            ${stats.latestEvent}`);
  console.log(`  Floor price used:        ${BACKFILL_FLOOR_XCH} XCH (fixed)`);
  console.log('='.repeat(60));

  console.log(`\nSQL written to: ${outputPath}`);
  console.log(`\nTo apply the backfill:`);
  console.log(
    `  npx wrangler d1 execute wojak-users --file=${outputPath}`
  );
  console.log(
    `  (add --local for local testing, or --remote for production)`
  );

  // Print top wallets preview
  const walletCredits = new Map<string, number>();
  for (const event of events) {
    if (!event.xch_price || event.xch_price <= 0) continue;
    if (!event.address?.encoded_id) continue;
    const calc = calculateCredits(event.xch_price, BACKFILL_FLOOR_XCH);
    const prev = walletCredits.get(event.address.encoded_id) || 0;
    walletCredits.set(event.address.encoded_id, prev + calc.credits);
  }

  const topWallets = [...walletCredits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (topWallets.length > 0) {
    console.log('\nTop 10 wallets by credits:');
    for (const [wallet, credits] of topWallets) {
      const displayCredits = (credits / 100).toFixed(2);
      const freeMints = Math.floor(credits / 10000);
      const truncated = `${wallet.slice(0, 10)}...${wallet.slice(-6)}`;
      console.log(
        `  ${truncated}  ${displayCredits.padStart(10)} credits  (${freeMints} free mints)`
      );
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
