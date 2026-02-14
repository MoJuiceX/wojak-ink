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
// === Economic constants ===
// Royalty: 10% on Farmers Plot sales. Your Wojak mint: 0.2 XCH.
// CREDITS_PER_XCH = (0.10 / 0.20) * 100 = 50
// At floor, 1 purchase = 1 free mint (revenue-neutral with royalty income).
const CREDITS_PER_XCH = 50;

// Asymptotic whale bonus cap: multiplier never exceeds 1.30.
// Wash trading breaks even at ~3x floor, max ~1% profit at extreme prices.
const MAX_WHALE_BONUS = 0.30;

const MIN_EFFECTIVE_FLOOR = 0.5;
const FLOOR_FALLBACK_XCH = 100; // 1.0 XCH (x100) when no snapshot

// Only these CAT tokens earn credits. Others are excluded to limit
// pricing risk (unreliable conversions, token dumps, etc.).
const CAT_TOKEN_WHITELIST = new Set([
  'BEPE',
  '\u{1FA84}\u26A1\uFE0F',       // Wand+Lightning
  '\u2728\u2764\uFE0F\u200D\u{1F525}\u{1F9D9}\u200D\u2642\uFE0F', // Sparkle+Mage
  'HOA',
  'NeckCoin',
  '$CHIA',
  'PP',
]);

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

  // Asymptotic multiplier: approaches (1 + MAX_WHALE_BONUS) but never exceeds it
  const whaleMultiplier = 1 + (MAX_WHALE_BONUS * (1 - 1 / priceRatio));

  // Credits proportional to XCH spent (not floor multiples)
  const rawCredits = CREDITS_PER_XCH * priceXch * whaleMultiplier;

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
    const url = new URL(request.url);

    if (url.pathname.endsWith('/run') && request.method === 'POST') {
      await run(env);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname.endsWith('/reprocess-cat') && request.method === 'POST') {
      // Find CAT trades that have wallets but NO credit_event, ignoring cursor
      const result = await backfillMissingCatCredits(env);
      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Credit tracker worker. POST /run to trigger manually.', {
      status: 200,
    });
  },
};

/**
 * Process CAT token sales from D1 sales_history.
 * Awards credits using xch_equivalent (already converted by fetch-sales worker).
 * Uses buyer_address from MintGarden enrichment as the wallet.
 * Falls back to seller_address if buyer not available (seller earned the trade).
 */
async function processCatSales(env: Env): Promise<{ processed: number; inserted: number }> {
  // Get the last CAT event timestamp we processed
  const KV_KEY_LAST_CAT = 'last_cat_credit_timestamp';
  const lastCatTs = await env.TRADE_VALUES_KV.get(KV_KEY_LAST_CAT);

  // Query CAT trades from sales_history that have wallet addresses and valid XCH equivalent
  let query = `SELECT
    trade_id, nft_edition, nft_name, currency, token_code,
    xch_equivalent, buyer_address, seller_address,
    completed_at, completed_at_unix
  FROM sales_history
  WHERE currency = 'CAT'
    AND xch_equivalent > 0.01`;

  const params: (string | number)[] = [];
  if (lastCatTs) {
    query += ' AND completed_at > ?';
    params.push(lastCatTs);
  }
  query += ' ORDER BY completed_at ASC LIMIT 200';

  const result = await env.DB.prepare(query).bind(...params)
    .all<{
      trade_id: string;
      nft_edition: number;
      nft_name: string;
      currency: string;
      token_code: string;
      xch_equivalent: number;
      buyer_address: string | null;
      seller_address: string | null;
      completed_at: string;
      completed_at_unix: number;
    }>();

  const rows = result.results || [];
  if (rows.length === 0) return { processed: 0, inserted: 0 };

  // Build event IDs and check which already exist
  const eventIds = rows.map(r => `cat_${r.trade_id}`);
  const existingSet = new Set<string>();
  for (let i = 0; i < eventIds.length; i += BATCH_EXISTING_CHUNK) {
    const chunk = eventIds.slice(i, i + BATCH_EXISTING_CHUNK);
    const placeholders = chunk.map(() => '?').join(',');
    const existing = await env.DB.prepare(
      `SELECT event_id FROM credit_events WHERE event_id IN (${placeholders})`
    ).bind(...chunk).all<{ event_id: string }>();
    for (const r of existing.results || []) existingSet.add(r.event_id);
  }

  const floorCache = new Map<string, number>();
  let inserted = 0;
  let latestTimestamp = lastCatTs || '';

  for (const row of rows) {
    const eventId = `cat_${row.trade_id}`;
    if (existingSet.has(eventId)) {
      if (row.completed_at > latestTimestamp) latestTimestamp = row.completed_at;
      continue;
    }

    // Only whitelisted CAT tokens earn credits
    if (!CAT_TOKEN_WHITELIST.has(row.token_code)) {
      if (row.completed_at > latestTimestamp) latestTimestamp = row.completed_at;
      continue;
    }

    // Use buyer_address for credits (the person who bought the NFT)
    const wallet = row.buyer_address || row.seller_address;
    if (!wallet) {
      if (row.completed_at > latestTimestamp) latestTimestamp = row.completed_at;
      continue;
    }

    // Get floor price for the trade date
    const eventDate = row.completed_at.slice(0, 10);
    let floorStored = floorCache.get(eventDate);
    if (floorStored === undefined) {
      floorStored = await getFloorForDate(env.DB, eventDate);
      floorCache.set(eventDate, floorStored);
    }
    const floorXch = floorStored / 100;
    const calc = calculateCredits(row.xch_equivalent, floorXch);

    try {
      await env.DB.prepare(
        `INSERT INTO credit_events
         (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'sales_history', ?)`
      ).bind(
        wallet,
        `nft_edition_${row.nft_edition}`,
        eventId,
        row.xch_equivalent,
        floorStored,
        calc.credits,
        calc.multiplier,
        row.completed_at
      ).run();
      inserted++;
    } catch (e) {
      if (!String(e).includes('UNIQUE')) {
        console.error('[CreditTracker] CAT insert error:', e);
      }
    }

    if (row.completed_at > latestTimestamp) latestTimestamp = row.completed_at;
  }

  if (latestTimestamp && latestTimestamp !== lastCatTs) {
    await env.TRADE_VALUES_KV.put(KV_KEY_LAST_CAT, latestTimestamp);
  }

  return { processed: rows.length, inserted };
}

/**
 * Backfill: find CAT trades with wallets that have no credit_event, regardless of cursor.
 * Uses a LEFT JOIN to find gaps — safe to call repeatedly.
 */
async function backfillMissingCatCredits(env: Env): Promise<{ processed: number; inserted: number; remaining: number }> {
  const tokens = [...CAT_TOKEN_WHITELIST];
  const placeholders = tokens.map(() => '?').join(',');

  const result = await env.DB.prepare(
    `SELECT sh.trade_id, sh.nft_edition, sh.nft_name, sh.currency, sh.token_code,
            sh.xch_equivalent, sh.buyer_address, sh.seller_address,
            sh.completed_at, sh.completed_at_unix
     FROM sales_history sh
     LEFT JOIN credit_events ce ON ce.event_id = 'cat_' || sh.trade_id
     WHERE sh.currency = 'CAT'
       AND sh.xch_equivalent > 0.01
       AND sh.token_code IN (${placeholders})
       AND (sh.buyer_address IS NOT NULL OR sh.seller_address IS NOT NULL)
       AND ce.event_id IS NULL
     ORDER BY sh.completed_at ASC
     LIMIT 200`
  ).bind(...tokens).all<{
    trade_id: string;
    nft_edition: number;
    nft_name: string;
    currency: string;
    token_code: string;
    xch_equivalent: number;
    buyer_address: string | null;
    seller_address: string | null;
    completed_at: string;
    completed_at_unix: number;
  }>();

  const rows = result.results || [];
  if (rows.length === 0) return { processed: 0, inserted: 0, remaining: 0 };

  const floorCache = new Map<string, number>();
  let inserted = 0;

  for (const row of rows) {
    const wallet = row.buyer_address || row.seller_address;
    if (!wallet) continue;

    const eventDate = row.completed_at.slice(0, 10);
    let floorStored = floorCache.get(eventDate);
    if (floorStored === undefined) {
      floorStored = await getFloorForDate(env.DB, eventDate);
      floorCache.set(eventDate, floorStored);
    }
    const floorXch = floorStored / 100;
    const calc = calculateCredits(row.xch_equivalent, floorXch);

    try {
      await env.DB.prepare(
        `INSERT INTO credit_events
         (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'sales_history', ?)`
      ).bind(
        wallet,
        `nft_edition_${row.nft_edition}`,
        `cat_${row.trade_id}`,
        row.xch_equivalent,
        floorStored,
        calc.credits,
        calc.multiplier,
        row.completed_at
      ).run();
      inserted++;
    } catch (e) {
      if (!String(e).includes('UNIQUE')) {
        console.error('[CreditTracker] Backfill CAT insert error:', e);
      }
    }
  }

  // Count how many whitelisted trades are still missing
  const remaining = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM sales_history sh
     LEFT JOIN credit_events ce ON ce.event_id = 'cat_' || sh.trade_id
     WHERE sh.currency = 'CAT'
       AND sh.xch_equivalent > 0.01
       AND sh.token_code IN (${placeholders})
       AND (sh.buyer_address IS NOT NULL OR sh.seller_address IS NOT NULL)
       AND ce.event_id IS NULL`
  ).bind(...tokens).first<{ cnt: number }>();

  return { processed: rows.length, inserted, remaining: remaining?.cnt ?? 0 };
}

async function run(env: Env): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await ensureFloorSnapshot(env, today);

  // Process XCH trades from MintGarden events (existing)
  const { processed, inserted } = await processEvents(env);
  console.log(`[CreditTracker] XCH: ${processed} events, ${inserted} credit_events`);

  // Process CAT trades from D1 sales_history (new)
  try {
    const catResult = await processCatSales(env);
    console.log(`[CreditTracker] CAT: ${catResult.processed} trades, ${catResult.inserted} credit_events`);
  } catch (e) {
    // CAT processing is additive — don't fail the whole run
    console.error('[CreditTracker] CAT processing error (non-fatal):', e);
  }
}
