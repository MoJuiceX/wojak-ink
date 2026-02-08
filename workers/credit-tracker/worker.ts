/**
 * Cloudflare Worker — Credit Tracker
 *
 * Runs every 30 minutes via Cron Trigger.
 * Fetches trade events from MintGarden Events API,
 * calculates credits for XCH purchases, and stores in D1.
 * Also takes a daily floor price snapshot.
 *
 * Credits are stored as INTEGER x100 (50 credits = 5000 units).
 * Only XCH trades earn credits (CAT trades are excluded).
 */

// ============ Types ============

interface Env {
  DB: D1Database;
  TRADE_VALUES_KV: KVNamespace;
  COLLECTION_ID?: string;
  MINTGARDEN_API_KEY?: string;
}

interface MintGardenEvent {
  nft_id: string;
  event_index: number;
  type: number; // 2 = trade
  timestamp: string;
  xch_price: number;
  address: {
    id: string;
    encoded_id: string; // buyer wallet (xch1...)
  };
  previous_address?: {
    id: string;
    encoded_id: string; // seller wallet
  };
  previous_owner?: {
    encoded_id: string;
    name?: string;
  };
  nft?: {
    id: string;
    encoded_id?: string;
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
  next: string | null; // cursor for next page
  previous: string | null;
  size: number;
}

interface MintGardenCollectionStats {
  id: string;
  name: string;
  floor_price?: number;
}

interface CreditCalculation {
  credits: number; // integer x100
  multiplier: number; // integer x10000
}

// ============ Constants ============

const MINTGARDEN_API = 'https://api.mintgarden.io';
const DEFAULT_COLLECTION_ID =
  'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

// KV keys
const KV_LAST_EVENT_TIMESTAMP = 'credit_last_event_timestamp';
const KV_LAST_FLOOR_SNAPSHOT_DATE = 'credit_last_floor_snapshot_date';
const KV_CURRENT_FLOOR_PRICE = 'current_floor_price';

// Credit system constants
const CREDITS_PER_FLOOR_PURCHASE = 50; // 50 credits at floor price
const MINIMUM_EFFECTIVE_FLOOR = 0.5; // 0.5 XCH minimum floor cap
const WHALE_BONUS_COEFFICIENT = 0.2; // ln coefficient for whale bonus
const FREE_MINT_COST = 10000; // 100 credits = 10000 units (x100)

// ============ Credit Calculation ============

/**
 * Calculate credits earned for an XCH purchase.
 *
 * Formula:
 *   effective_floor = max(0.5, current_floor)
 *   price_ratio = max(1, price / effective_floor)
 *   whale_multiplier = 1 + 0.2 * ln(price_ratio)
 *   credits = 50 * price_ratio * whale_multiplier
 *
 * Stored as integer x100 for precision.
 */
function calculateCredits(priceXch: number, floorXch: number): CreditCalculation {
  const effectiveFloor = Math.max(MINIMUM_EFFECTIVE_FLOOR, floorXch);
  const priceRatio = Math.max(1, priceXch / effectiveFloor);
  const whaleMultiplier = 1 + WHALE_BONUS_COEFFICIENT * Math.log(priceRatio);
  const rawCredits = CREDITS_PER_FLOOR_PURCHASE * priceRatio * whaleMultiplier;

  return {
    credits: Math.round(rawCredits * 100),
    multiplier: Math.round(whaleMultiplier * 10000),
  };
}

// ============ MintGarden API ============

/**
 * Fetch trade events from MintGarden Events API.
 * Type 2 = trade events. Uses cursor-based pagination.
 * URL: GET /events?collection={ID}&type=2&size=100&cursor={next}
 */
async function fetchTradeEvents(
  collectionId: string,
  sinceTimestamp?: string,
  apiKey?: string
): Promise<MintGardenEvent[]> {
  const allEvents: MintGardenEvent[] = [];
  let cursor: string | null = null;
  const pageSize = 100;
  let pageCount = 0;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`${MINTGARDEN_API}/events`);
    url.searchParams.set('collection', collectionId);
    url.searchParams.set('type', '2'); // trade events
    url.searchParams.set('size', String(pageSize));
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      const response = await fetch(url.toString(), { headers });

      if (!response.ok) {
        console.error(
          `[CreditTracker] MintGarden events API error: ${response.status} ${response.statusText}`
        );
        break;
      }

      const data = (await response.json()) as MintGardenEventsResponse;
      const events = data.items || [];

      if (events.length === 0) {
        hasMore = false;
        break;
      }

      // Filter: only events after our last processed timestamp
      for (const event of events) {
        if (sinceTimestamp && event.timestamp <= sinceTimestamp) {
          // Events are sorted newest-first; we've reached already-processed ones
          hasMore = false;
          break;
        }
        allEvents.push(event);
      }

      // Use cursor for next page — detect infinite loop
      // MintGarden returns the same cursor when there's no more data
      if (data.next && data.next !== cursor && hasMore) {
        cursor = data.next;
      } else {
        hasMore = false;
      }

      pageCount++;

      // Safety: max 20 pages (2000 events per run)
      if (pageCount >= 20) {
        console.warn('[CreditTracker] Reached 20 page limit, stopping pagination');
        hasMore = false;
      }
    } catch (error) {
      console.error('[CreditTracker] Error fetching events:', error);
      hasMore = false;
    }
  }

  return allEvents;
}

/**
 * Fetch collection floor price from MintGarden.
 */
async function fetchFloorPrice(
  collectionId: string,
  apiKey?: string
): Promise<number | null> {
  try {
    const url = `${MINTGARDEN_API}/collections/${collectionId}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.error(`[CreditTracker] Floor price fetch failed: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as MintGardenCollectionStats;
    return data.floor_price ?? null;
  } catch (error) {
    console.error('[CreditTracker] Error fetching floor price:', error);
    return null;
  }
}

// ============ Database Operations ============

/**
 * Get the current floor price from KV or latest snapshot.
 */
async function getCurrentFloor(env: Env): Promise<number> {
  // Try KV first (fastest)
  const kvFloor = await env.TRADE_VALUES_KV.get(KV_CURRENT_FLOOR_PRICE);
  if (kvFloor) {
    return parseFloat(kvFloor);
  }

  // Fall back to latest D1 snapshot
  try {
    const result = await env.DB.prepare(
      `SELECT floor_xch FROM floor_price_snapshots
       ORDER BY snapshot_date DESC LIMIT 1`
    ).first<{ floor_xch: number }>();

    if (result) {
      return result.floor_xch / 100; // stored as x100
    }
  } catch (error) {
    console.error('[CreditTracker] Error reading floor from D1:', error);
  }

  // Default: 1.0 XCH (same as backfill assumption)
  return 1.0;
}

/**
 * Insert a credit event into D1. Skips duplicates via UNIQUE event_id.
 */
/**
 * Generate a unique event ID from MintGarden event data.
 * MintGarden events don't have a top-level `id` field,
 * so we compose one from nft_id + event_index + timestamp.
 */
function getEventId(event: MintGardenEvent): string {
  return `${event.nft_id}_${event.event_index}_${event.timestamp}`;
}

async function insertCreditEvent(
  db: D1Database,
  event: MintGardenEvent,
  floorXch: number,
  calculation: CreditCalculation
): Promise<boolean> {
  const eventId = getEventId(event);

  try {
    await db
      .prepare(
        `INSERT OR IGNORE INTO credit_events
         (wallet_address, nft_id, event_id, price_xch, floor_at_time,
          credits_earned, whale_multiplier, source, event_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'mintgarden', ?)`
      )
      .bind(
        event.address.encoded_id,
        event.nft_id,
        eventId,
        event.xch_price,
        Math.round(floorXch * 100), // store as x100
        calculation.credits,
        calculation.multiplier,
        event.timestamp
      )
      .run();

    return true;
  } catch (error) {
    console.error(`[CreditTracker] Error inserting credit event ${eventId}:`, error);
    return false;
  }
}

/**
 * Take a floor price snapshot (once per day).
 */
async function takeFloorSnapshot(env: Env, floorXch: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    await env.DB
      .prepare(
        `INSERT OR IGNORE INTO floor_price_snapshots
         (floor_xch, source, snapshot_date)
         VALUES (?, 'mintgarden', ?)`
      )
      .bind(Math.round(floorXch * 100), today)
      .run();

    // Update KV cache
    await env.TRADE_VALUES_KV.put(KV_CURRENT_FLOOR_PRICE, String(floorXch));
    await env.TRADE_VALUES_KV.put(KV_LAST_FLOOR_SNAPSHOT_DATE, today);

    console.log(`[CreditTracker] Floor price snapshot: ${floorXch} XCH on ${today}`);
  } catch (error) {
    console.error('[CreditTracker] Error saving floor snapshot:', error);
  }
}

// ============ Main Processing ============

/**
 * Process new trade events and award credits.
 */
async function processEvents(env: Env): Promise<{ processed: number; credited: number }> {
  const collectionId = env.COLLECTION_ID || DEFAULT_COLLECTION_ID;

  // Get last processed timestamp
  const lastTimestamp = await env.TRADE_VALUES_KV.get(KV_LAST_EVENT_TIMESTAMP);

  // Fetch new events from MintGarden
  const events = await fetchTradeEvents(collectionId, lastTimestamp || undefined, env.MINTGARDEN_API_KEY);

  if (events.length === 0) {
    return { processed: 0, credited: 0 };
  }

  console.log(`[CreditTracker] Processing ${events.length} new trade events`);

  // Get current floor price for credit calculation
  const currentFloor = await getCurrentFloor(env);

  let processed = 0;
  let credited = 0;
  let latestTimestamp = lastTimestamp || '';

  for (const event of events) {
    processed++;

    // Skip non-XCH trades (CAT trades excluded from credit system)
    if (!event.xch_price || event.xch_price <= 0) {
      console.log(`[CreditTracker] Skipping non-XCH trade: ${event.id}`);
      continue;
    }

    // Skip if no buyer wallet
    if (!event.address?.encoded_id) {
      console.log(`[CreditTracker] Skipping event with no buyer address: ${event.id}`);
      continue;
    }

    // Calculate credits
    const calculation = calculateCredits(event.xch_price, currentFloor);

    // Insert into D1
    const inserted = await insertCreditEvent(env.DB, event, currentFloor, calculation);
    if (inserted) {
      credited++;
      console.log(
        `[CreditTracker] Credited wallet ${event.address.encoded_id.slice(0, 12)}... ` +
          `${(calculation.credits / 100).toFixed(2)} credits ` +
          `(${event.xch_price} XCH, ${(calculation.multiplier / 10000).toFixed(4)}x whale bonus)`
      );
    }

    // Track latest timestamp
    if (event.timestamp > latestTimestamp) {
      latestTimestamp = event.timestamp;
    }
  }

  // Update last processed timestamp
  if (latestTimestamp) {
    await env.TRADE_VALUES_KV.put(KV_LAST_EVENT_TIMESTAMP, latestTimestamp);
  }

  return { processed, credited };
}

/**
 * Check if we need a floor price snapshot today.
 */
async function maybeSnapshotFloor(env: Env): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const lastSnapshotDate = await env.TRADE_VALUES_KV.get(KV_LAST_FLOOR_SNAPSHOT_DATE);

  if (lastSnapshotDate === today) {
    return; // Already took a snapshot today
  }

  const collectionId = env.COLLECTION_ID || DEFAULT_COLLECTION_ID;
  const floorPrice = await fetchFloorPrice(collectionId, env.MINTGARDEN_API_KEY);

  if (floorPrice !== null && floorPrice > 0) {
    await takeFloorSnapshot(env, floorPrice);
  } else {
    console.warn('[CreditTracker] Could not fetch floor price, skipping snapshot');
  }
}

// ============ Worker Entry Points ============

export default {
  /**
   * Cron trigger handler — runs every 30 minutes.
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[CreditTracker] Cron triggered at ${new Date().toISOString()}`);

    try {
      // 1. Process new trade events → award credits
      const result = await processEvents(env);
      console.log(
        `[CreditTracker] Done: ${result.processed} events processed, ${result.credited} credited`
      );

      // 2. Take daily floor price snapshot if needed
      await maybeSnapshotFloor(env);
    } catch (error) {
      console.error('[CreditTracker] Fatal error in scheduled handler:', error);
    }
  },

  /**
   * HTTP handler — for manual triggers and status checks.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // GET /status — worker health check
    if (url.pathname === '/status') {
      const lastTimestamp = await env.TRADE_VALUES_KV.get(KV_LAST_EVENT_TIMESTAMP);
      const lastFloorDate = await env.TRADE_VALUES_KV.get(KV_LAST_FLOOR_SNAPSHOT_DATE);
      const currentFloor = await env.TRADE_VALUES_KV.get(KV_CURRENT_FLOOR_PRICE);

      // Get total credit events count
      let totalEvents = 0;
      let totalWallets = 0;
      try {
        const eventsResult = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM credit_events'
        ).first<{ count: number }>();
        totalEvents = eventsResult?.count || 0;

        const walletsResult = await env.DB.prepare(
          'SELECT COUNT(DISTINCT wallet_address) as count FROM credit_events'
        ).first<{ count: number }>();
        totalWallets = walletsResult?.count || 0;
      } catch {
        // Tables might not exist yet
      }

      return new Response(
        JSON.stringify({
          status: 'ok',
          worker: 'credit-tracker',
          lastEventTimestamp: lastTimestamp || 'never',
          lastFloorSnapshotDate: lastFloorDate || 'never',
          currentFloorPrice: currentFloor ? parseFloat(currentFloor) : null,
          totalCreditEvents: totalEvents,
          totalWallets: totalWallets,
          timestamp: new Date().toISOString(),
        }),
        { headers: corsHeaders }
      );
    }

    // POST /trigger — manual event processing
    if (url.pathname === '/trigger' && request.method === 'POST') {
      try {
        const result = await processEvents(env);
        await maybeSnapshotFloor(env);

        return new Response(
          JSON.stringify({
            success: true,
            processed: result.processed,
            credited: result.credited,
          }),
          { headers: corsHeaders }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Not found. Available: GET /status, POST /trigger' }),
      { status: 404, headers: corsHeaders }
    );
  },
};
