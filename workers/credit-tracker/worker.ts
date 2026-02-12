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

const FETCH_RETRIES = 3;
const FETCH_BACKOFF_MS = [1000, 2000, 4000];
const BATCH_INSERT_SIZE = 10;
const BATCH_EXISTING_CHUNK = 50;

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

async function fetchWithRetry(
  url: string,
  opts: RequestInit = {},
  retries = FETCH_RETRIES
): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.ok || res.status === 404) return res;
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status}`);
        if (i < retries - 1 && FETCH_BACKOFF_MS[i] != null) {
          await new Promise((r) => setTimeout(r, FETCH_BACKOFF_MS[i]));
        }
        continue;
      }
      return res;
    } catch (e) {
      lastError = e;
      if (i < retries - 1 && FETCH_BACKOFF_MS[i] != null) {
        await new Promise((r) => setTimeout(r, FETCH_BACKOFF_MS[i]));
      }
    }
  }
  throw lastError;
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
 * Get floor price (x100) for the given date.
 * Uses a 7-day rolling average of snapshots ending on or before that date.
 * This smooths out short-term manipulation (e.g. someone listing at 0.5 XCH
 * to artificially lower the floor and inflate their credit multiplier).
 */
async function getFloorForDate(db: D1Database, eventDate: string): Promise<number> {
  const rows = await db
    .prepare(
      'SELECT floor_xch FROM floor_price_snapshots WHERE snapshot_date <= ? ORDER BY snapshot_date DESC LIMIT 7'
    )
    .bind(eventDate)
    .all<{ floor_xch: number }>();
  const snapshots = rows.results || [];
  if (snapshots.length === 0) return FLOOR_FALLBACK_XCH;
  const sum = snapshots.reduce((acc, r) => acc + r.floor_xch, 0);
  return Math.round(sum / snapshots.length);
}

async function ensureFloorSnapshot(
  env: Env,
  today: string
): Promise<number> {
  const lastDate = await env.TRADE_VALUES_KV.get(KV_KEY_LAST_FLOOR_DATE);
  if (lastDate === today) return getLatestFloorStored(env.DB);

  const url = `${MINTGARDEN_API}/collections/${env.COLLECTION_ID}`;
  let res: Response;
  try {
    res = await fetchWithRetry(url, { headers: { Accept: 'application/json' } });
  } catch (e) {
    console.error('[CreditTracker] Collection API error after retries:', e);
    return getLatestFloorStored(env.DB);
  }
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
  const insertedTimestamps: string[] = [];
  const floorCache = new Map<string, number>();

  for (let page = 0; page < 20; page++) {
    const url = new URL(`${MINTGARDEN_API}/events`);
    url.searchParams.set('collection', collectionId);
    url.searchParams.set('type', '2');
    url.searchParams.set('size', '100');
    if (cursor) url.searchParams.set('cursor', cursor);

    let res: Response;
    try {
      res = await fetchWithRetry(url.toString(), {
        headers: { Accept: 'application/json' },
      });
    } catch (e) {
      console.error('[CreditTracker] Events API error after retries:', e);
      break;
    }
    if (!res.ok) {
      console.error('[CreditTracker] Events API error:', res.status);
      break;
    }

    const data = (await res.json()) as MintGardenEventsResponse;
    const items = data.items || [];
    if (items.length === 0) break;

    const candidates = items.filter((event) => {
      if (!event.xch_price || event.xch_price <= 0) return false;
      if (!event.address?.encoded_id) return false;
      if (lastTs && event.timestamp <= lastTs) return false;
      return true;
    });
    processed += candidates.length;

    const eventIds = candidates.map(
      (e) => `${e.nft_id}_${e.event_index}_${e.timestamp}`
    );
    const existingSet = new Set<string>();
    for (let i = 0; i < eventIds.length; i += BATCH_EXISTING_CHUNK) {
      const chunk = eventIds.slice(i, i + BATCH_EXISTING_CHUNK);
      const placeholders = chunk.map(() => '?').join(',');
      const rows = await env.DB.prepare(
        `SELECT event_id FROM credit_events WHERE event_id IN (${placeholders})`
      )
        .bind(...chunk)
        .all<{ event_id: string }>();
      for (const r of rows.results || []) existingSet.add(r.event_id);
    }

    const toInsert: Array<{
      wallet: string;
      nft_id: string;
      event_id: string;
      price_xch: number;
      floor_stored: number;
      credits: number;
      multiplier: number;
      timestamp: string;
    }> = [];
    for (const event of candidates) {
      const eventId = `${event.nft_id}_${event.event_index}_${event.timestamp}`;
      if (existingSet.has(eventId)) continue;
      const eventDate = event.timestamp.slice(0, 10);
      let floorStored = floorCache.get(eventDate);
      if (floorStored === undefined) {
        floorStored = await getFloorForDate(env.DB, eventDate);
        floorCache.set(eventDate, floorStored);
      }
      const floorXch = floorStored / 100;
      const calc = calculateCredits(event.xch_price, floorXch);
      toInsert.push({
        wallet: event.address!.encoded_id,
        nft_id: event.nft_id,
        event_id: eventId,
        price_xch: event.xch_price,
        floor_stored: floorStored,
        credits: calc.credits,
        multiplier: calc.multiplier,
        timestamp: event.timestamp,
      });
    }

    for (let i = 0; i < toInsert.length; i += BATCH_INSERT_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_INSERT_SIZE);
      const values = batch
        .map(
          () =>
            `(?, ?, ?, ?, ?, ?, ?, 'mintgarden', ?)`
        )
        .join(',');
      const stmt = env.DB.prepare(
        `INSERT INTO credit_events
         (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp)
         VALUES ${values}`
      );
      const bound = batch.flatMap((r) => [
        r.wallet,
        r.nft_id,
        r.event_id,
        r.price_xch,
        r.floor_stored,
        r.credits,
        r.multiplier,
        r.timestamp,
      ]);
      try {
        await stmt.bind(...bound).run();
        inserted += batch.length;
        for (const r of batch) insertedTimestamps.push(r.timestamp);
      } catch (e) {
        if (String(e).includes('UNIQUE')) {
          for (const r of batch) insertedTimestamps.push(r.timestamp);
          continue;
        }
        console.error('[CreditTracker] Batch insert error:', e);
      }
    }

    if (data.next && data.next !== cursor) {
      cursor = data.next;
    } else {
      break;
    }
  }

  if (insertedTimestamps.length > 0) {
    const latestInserted = insertedTimestamps.reduce((a, b) =>
      a > b ? a : b
    );
    await setLastTimestamp(env.TRADE_VALUES_KV, latestInserted);
  }
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
