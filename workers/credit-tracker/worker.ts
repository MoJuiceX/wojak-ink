/**
 * Credit Tracker Worker
 *
 * Runs every 30 minutes via Cron. Fetches MintGarden trade events for the
 * Wojak collection, calculates credits (XCH-only), and writes to D1.
 * Once per day writes a floor price snapshot.
 *
 * Bindings: DB (D1), TRADE_VALUES_KV (KV), COLLECTION_ID (var)
 * Optional secret: MINTGARDEN_API_KEY
 */

const MINTGARDEN_API = 'https://api.mintgarden.io';
const KV_KEY_LAST_TIMESTAMP = 'last_credit_event_timestamp';
const KV_KEY_LAST_FLOOR_DATE = 'last_floor_snapshot_date';
const CREDITS_PER_FLOOR = 50;
const FLOOR_FALLBACK_XCH = 100; // 1.0 XCH when no snapshot for date
const MIN_EFFECTIVE_FLOOR = 0.5;
const WHALE_COEFFICIENT = 0.2;

interface Env {
  DB: D1Database;
  TRADE_VALUES_KV: KVNamespace;
  COLLECTION_ID: string;
  MINTGARDEN_API_KEY?: string;
}

interface MintGardenEvent {
  nft_id: string;
  event_index: number;
  type: number;
  timestamp: string;
  xch_price: number;
  address?: { id: string; encoded_id: string };
  previous_address?: { id: string; encoded_id: string };
  nft?: { id: string; data?: { name?: string } };
}

interface MintGardenEventsResponse {
  items: MintGardenEvent[];
  next: string | null;
  previous: string | null;
  size: number;
}

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

async function getLastTimestamp(kv: KVNamespace): Promise<string | null> {
  return kv.get(KV_KEY_LAST_TIMESTAMP);
}

async function setLastTimestamp(kv: KVNamespace, timestamp: string): Promise<void> {
  await kv.put(KV_KEY_LAST_TIMESTAMP, timestamp);
}

async function getLatestFloorStored(db: D1Database): Promise<number> {
  const row = await db
    .prepare(
      'SELECT floor_xch FROM floor_price_snapshots ORDER BY snapshot_date DESC LIMIT 1'
    )
    .first<{ floor_xch: number }>();
  return row?.floor_xch ?? FLOOR_FALLBACK_XCH;
}

/**
 * Get floor price (x100) for the given date. Uses latest snapshot on or before that date.
 */
async function getFloorForDate(db: D1Database, eventDate: string): Promise<number> {
  const row = await db
    .prepare(
      'SELECT floor_xch FROM floor_price_snapshots WHERE snapshot_date <= ? ORDER BY snapshot_date DESC LIMIT 1'
    )
    .bind(eventDate)
    .first<{ floor_xch: number }>();
  return row?.floor_xch ?? FLOOR_FALLBACK_XCH;
}

async function ensureFloorSnapshot(
  env: Env,
  today: string
): Promise<number> {
  const lastDate = await env.TRADE_VALUES_KV.get(KV_KEY_LAST_FLOOR_DATE);
  if (lastDate === today) return getLatestFloorStored(env.DB);

  const url = `${MINTGARDEN_API}/collections/${env.COLLECTION_ID}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    console.error('[CreditTracker] Collection API error:', res.status);
    return getLatestFloorStored(env.DB);
  }

  const data = (await res.json()) as { floor?: number; floor_price?: number };
  const floorXch = data.floor ?? data.floor_price ?? 1.0;
  const floorStored = Math.round(floorXch * 100);

  await env.DB.prepare(
    `INSERT INTO floor_price_snapshots (floor_xch, source, snapshot_date)
     VALUES (?, 'mintgarden', ?)`
  )
    .bind(floorStored, today)
    .run();

  await env.TRADE_VALUES_KV.put(KV_KEY_LAST_FLOOR_DATE, today);
  return floorStored;
}

async function processEvents(env: Env): Promise<{ processed: number; inserted: number }> {
  const collectionId = env.COLLECTION_ID;
  const lastTs = await getLastTimestamp(env.TRADE_VALUES_KV);
  let cursor: string | null = null;
  let processed = 0;
  let inserted = 0;
  let latestTimestamp = lastTs;
  const floorCache = new Map<string, number>();

  for (let page = 0; page < 20; page++) {
    const url = new URL(`${MINTGARDEN_API}/events`);
    url.searchParams.set('collection', collectionId);
    url.searchParams.set('type', '2');
    url.searchParams.set('size', '100');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      console.error('[CreditTracker] Events API error:', res.status);
      break;
    }

    const data = (await res.json()) as MintGardenEventsResponse;
    const items = data.items || [];
    if (items.length === 0) break;

    for (const event of items) {
      if (!event.xch_price || event.xch_price <= 0) continue;
      if (!event.address?.encoded_id) continue;
      if (lastTs && event.timestamp <= lastTs) continue;

      processed++;
      if (event.timestamp > (latestTimestamp || '')) latestTimestamp = event.timestamp;

      const eventId = `${event.nft_id}_${event.event_index}_${event.timestamp}`;
      const existing = await env.DB.prepare(
        'SELECT 1 FROM credit_events WHERE event_id = ?'
      )
        .bind(eventId)
        .first();
      if (existing) continue;

      const eventDate = event.timestamp.slice(0, 10);
      let floorStored = floorCache.get(eventDate);
      if (floorStored === undefined) {
        floorStored = await getFloorForDate(env.DB, eventDate);
        floorCache.set(eventDate, floorStored);
      }
      const floorXch = floorStored / 100;
      const calc = calculateCredits(event.xch_price, floorXch);

      try {
        await env.DB.prepare(
          `INSERT INTO credit_events
           (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'mintgarden', ?)`
        )
          .bind(
            event.address.encoded_id,
            event.nft_id,
            eventId,
            event.xch_price,
            floorStored,
            calc.credits,
            calc.multiplier,
            event.timestamp
          )
          .run();
        inserted++;
      } catch (e) {
        if (String(e).includes('UNIQUE')) continue;
        console.error('[CreditTracker] Insert error:', e);
      }
    }

    if (data.next && data.next !== cursor) {
      cursor = data.next;
    } else {
      break;
    }
  }

  if (latestTimestamp) await setLastTimestamp(env.TRADE_VALUES_KV, latestTimestamp);
  return { processed, inserted };
}

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(run(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.url.endsWith('/run') && request.method === 'POST') {
      await run(env);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Credit tracker worker. POST /run to trigger manually.', {
      status: 200,
    });
  },
};

async function run(env: Env): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await ensureFloorSnapshot(env, today);
  const { processed, inserted } = await processEvents(env);
  console.log(`[CreditTracker] Processed ${processed} events, inserted ${inserted} credit_events`);
}
