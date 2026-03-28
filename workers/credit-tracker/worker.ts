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
const AI_CREDITS_PER_XCH_SPENT = 8;
// === Economic constants ===
// Royalty: 10% on Farmers Plot sales. Your Wojak mint: 0.1 XCH.
// CREDITS_PER_XCH = (0.10 / 0.10) * 100 = 100
// At floor, 1 purchase = 1 free mint (revenue-neutral with royalty income).
const CREDITS_PER_XCH = 100;

// Asymptotic whale bonus cap: multiplier never exceeds 1.30.
// Wash trading breaks even at ~3x floor, max ~1% profit at extreme prices.
const MAX_WHALE_BONUS = 0.30;

const MIN_EFFECTIVE_FLOOR = 0.5;
const FLOOR_FALLBACK_XCH = 100; // 1.0 XCH (x100) when no snapshot

// Only these CAT tokens earn credits. Others are excluded to limit
// pricing risk (unreliable conversions, token dumps, etc.).
// Kept as fallback if cat_credit_whitelist table doesn't exist yet.
const HARDCODED_WHITELIST = [
  'BEPE',
  '\u{1FA84}\u26A1\uFE0F',       // SpellPower (Wand+Lightning)
  '\u2728\u2764\uFE0F\u200D\u{1F525}\u{1F9D9}\u200D\u2642\uFE0F', // Caster (Sparkle+Mage)
  'HOA',
  'NeckCoin',
  '$CHIA',
  'PP',
  'WOJAK',                        // Wojak CAT (38a507...)
];

const KV_KEY_CREDIT_HEALTH = 'credit_health';

/**
 * Load CAT token whitelist from D1 instead of hardcoded Set.
 * Falls back to hardcoded list if table doesn't exist yet.
 */
async function loadWhitelist(db: D1Database): Promise<Set<string>> {
  try {
    const rows = await db.prepare(
      'SELECT token_code FROM cat_credit_whitelist'
    ).all<{ token_code: string }>();
    const tokens = (rows.results || []).map(r => r.token_code);
    if (tokens.length > 0) return new Set(tokens);
  } catch {
    // Table might not exist yet — fall back to hardcoded
  }
  return new Set(HARDCODED_WHITELIST);
}

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

    // Cross-path dedup: look up which NFT coin IDs map to which editions
    // so we can check if a CAT credit already exists for the same wallet+edition.
    // Query one at a time — batching LIKE patterns causes D1 "LIKE pattern too complex" errors.
    const coinIds = candidates.map(e => e.nft_id);
    const editionLookup = new Map<string, number>();
    for (const coinId of coinIds) {
      if (editionLookup.has(coinId)) continue;
      const row = await env.DB.prepare(
        `SELECT nft_edition FROM sales_history
         WHERE substr(mg_event_id, 1, length(?)) = ? LIMIT 1`
      ).bind(coinId, coinId).first<{ nft_edition: number }>();
      if (row) editionLookup.set(coinId, row.nft_edition);
    }

    for (const event of candidates) {
      const eventId = `${event.nft_id}_${event.event_index}_${event.timestamp}`;
      if (existingSet.has(eventId)) continue;

      // Cross-path dedup: skip if this wallet already has credit for this edition via CAT path
      const edition = editionLookup.get(event.nft_id);
      if (edition && event.address?.encoded_id) {
        const existing = await env.DB.prepare(
          `SELECT 1 FROM credit_events
           WHERE wallet_address = ? AND nft_id = ? LIMIT 1`
        ).bind(event.address.encoded_id, `nft_edition_${edition}`).first();
        if (existing) {
          console.log(`[CreditTracker] Skipping XCH event for edition ${edition} — already credited via CAT path`);
          continue;
        }
      }

      // Anti-wash-trading: skip if buyer is the original minter of this NFT
      if (event.address?.encoded_id) {
        const mint = await env.DB.prepare(
          'SELECT wallet_address FROM phase2_mints WHERE mintgarden_launcher_id = ?'
        ).bind(event.nft_id).first<{ wallet_address: string }>();
        if (mint && mint.wallet_address === event.address.encoded_id) {
          console.log(`[Anti-Wash] Self-buy detected: ${event.address.encoded_id.slice(0, 15)}... bought own edition`);
          continue;
        }
      }

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

      // Grant AI credits for Farmer Plot trades proportionally to XCH spent.
      for (const r of batch) {
        const aiCredits = Math.floor(r.price_xch * AI_CREDITS_PER_XCH_SPENT);
        if (aiCredits > 0) {
          try {
            await env.DB.prepare(
              `INSERT OR IGNORE INTO ai_credit_events
                (wallet_address, event_id, event_type, credits_earned, source_ref, metadata, event_timestamp)
               VALUES (?, ?, 'farmer_plot_trade', ?, ?, ?, ?)`
            ).bind(
              r.wallet,
              `farmer_plot_${r.event_id}`,
              aiCredits,
              r.nft_id,
              JSON.stringify({
                priceXch: r.price_xch,
                collection: 'farmer_plot',
                aiCreditsPerXchSpent: AI_CREDITS_PER_XCH_SPENT,
              }),
              r.timestamp
            ).run();
          } catch (e) {
            if (!String(e).includes('UNIQUE')) {
              console.error('[CreditTracker] AI credit insert error:', e);
            }
          }
        }
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
      const whitelist = await loadWhitelist(env.DB);
      const result = await backfillMissingCatCredits(env, whitelist);
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
async function processCatSales(env: Env, whitelist: Set<string>): Promise<{ processed: number; inserted: number }> {
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
    if (!whitelist.has(row.token_code)) {
      if (row.completed_at > latestTimestamp) latestTimestamp = row.completed_at;
      continue;
    }

    // Use buyer_address for credits (the person who bought the NFT)
    const wallet = row.buyer_address || row.seller_address;
    if (!wallet) {
      if (row.completed_at > latestTimestamp) latestTimestamp = row.completed_at;
      continue;
    }

    // Same-path dedup: Dexie can report the same trade with two different trade_ids
    // (offer and acceptance coins). Check if this wallet+edition already has a CAT credit.
    const samePathCheck = await env.DB.prepare(
      `SELECT 1 FROM credit_events WHERE wallet_address = ? AND nft_id = ? LIMIT 1`
    ).bind(wallet, `nft_edition_${row.nft_edition}`).first();
    if (samePathCheck) {
      if (row.completed_at > latestTimestamp) latestTimestamp = row.completed_at;
      continue;
    }

    // Cross-path dedup: check if this wallet already has credit for this edition via XCH path
    // XCH path stores nft_id as hex coin ID, so check via sales_history.mg_event_id linkage
    const crossPathCheck = await env.DB.prepare(
      `SELECT ce.id FROM credit_events ce
       INNER JOIN sales_history sh
         ON substr(sh.mg_event_id, 1, length(ce.nft_id)) = ce.nft_id
         AND sh.nft_edition = ?
       WHERE ce.wallet_address = ?
         AND ce.nft_id NOT LIKE 'nft_edition_%'
       LIMIT 1`
    ).bind(row.nft_edition, wallet).first();
    if (crossPathCheck) {
      console.log(`[CreditTracker] Skipping CAT event for edition ${row.nft_edition} — already credited via XCH path`);
      if (row.completed_at > latestTimestamp) latestTimestamp = row.completed_at;
      continue;
    }

    // Anti-wash-trading: skip if buyer is the original minter
    const mintCheck = await env.DB.prepare(
      'SELECT wallet_address FROM phase2_mints WHERE mint_number = ?'
    ).bind(row.nft_edition).first<{ wallet_address: string }>();
    if (mintCheck && mintCheck.wallet_address === wallet) {
      console.log(`[Anti-Wash] Self-buy detected (CAT): ${wallet.slice(0, 15)}... bought own edition ${row.nft_edition}`);
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
async function backfillMissingCatCredits(env: Env, whitelist: Set<string>): Promise<{ processed: number; inserted: number; remaining: number }> {
  const tokens = [...whitelist];
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

    // Same-path dedup: Dexie can report same trade with two different trade_ids
    const samePathCheck = await env.DB.prepare(
      `SELECT 1 FROM credit_events WHERE wallet_address = ? AND nft_id = ? LIMIT 1`
    ).bind(wallet, `nft_edition_${row.nft_edition}`).first();
    if (samePathCheck) continue;

    // Cross-path dedup: check if this wallet already has credit for this edition via XCH path
    const crossPathCheck = await env.DB.prepare(
      `SELECT ce.id FROM credit_events ce
       INNER JOIN sales_history sh
         ON substr(sh.mg_event_id, 1, length(ce.nft_id)) = ce.nft_id
         AND sh.nft_edition = ?
       WHERE ce.wallet_address = ?
         AND ce.nft_id NOT LIKE 'nft_edition_%'
       LIMIT 1`
    ).bind(row.nft_edition, wallet).first();
    if (crossPathCheck) continue;

    // Anti-wash-trading: skip if buyer is the original minter
    const mintCheck = await env.DB.prepare(
      'SELECT wallet_address FROM phase2_mints WHERE mint_number = ?'
    ).bind(row.nft_edition).first<{ wallet_address: string }>();
    if (mintCheck && mintCheck.wallet_address === wallet) continue;

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

interface HealthReport {
  timestamp: string;
  duplicatesFound: number;
  duplicatesFixed: number;
  floorSnapshotOk: boolean;
  totalEvents: number;
  xchProcessed: number;
  xchInserted: number;
  catProcessed: number;
  catInserted: number;
  whitelistSize: number;
  issues: string[];
}

/**
 * Post-processing integrity check. Runs after every cron execution.
 * Detects and auto-fixes duplicates, validates data health.
 */
async function runIntegrityCheck(
  env: Env,
  xchResult: { processed: number; inserted: number },
  catResult: { processed: number; inserted: number },
  whitelistSize: number
): Promise<HealthReport> {
  const issues: string[] = [];
  let duplicatesFound = 0;
  let duplicatesFixed = 0;

  // 1. Check for duplicate credit entries (same wallet + same nft_id)
  const dupes = await env.DB.prepare(
    `SELECT wallet_address, nft_id, COUNT(*) as cnt, GROUP_CONCAT(id) as ids
     FROM credit_events
     GROUP BY wallet_address, nft_id
     HAVING COUNT(*) > 1`
  ).all<{ wallet_address: string; nft_id: string; cnt: number; ids: string }>();

  for (const dup of dupes.results || []) {
    duplicatesFound += dup.cnt - 1;
    const idList = dup.ids.split(',').map(Number).sort((a, b) => a - b);
    // Keep the first (earliest) ID, delete the rest
    const toDelete = idList.slice(1);
    if (toDelete.length > 0) {
      const placeholders = toDelete.map(() => '?').join(',');
      await env.DB.prepare(
        `DELETE FROM credit_events WHERE id IN (${placeholders})`
      ).bind(...toDelete).run();
      duplicatesFixed += toDelete.length;
      issues.push(`Auto-fixed ${toDelete.length} duplicate(s) for ${dup.nft_id} on wallet ${dup.wallet_address.slice(0, 10)}...`);
    }
  }

  // 2. Check floor price snapshot exists for today
  const today = new Date().toISOString().slice(0, 10);
  const floorRow = await env.DB.prepare(
    'SELECT 1 FROM floor_price_snapshots WHERE snapshot_date = ?'
  ).bind(today).first();
  const floorSnapshotOk = !!floorRow;
  if (!floorSnapshotOk) {
    issues.push('No floor price snapshot for today');
  }

  // 3. Count total events
  const totalRow = await env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM credit_events'
  ).first<{ cnt: number }>();

  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    duplicatesFound,
    duplicatesFixed,
    floorSnapshotOk,
    totalEvents: totalRow?.cnt ?? 0,
    xchProcessed: xchResult.processed,
    xchInserted: xchResult.inserted,
    catProcessed: catResult.processed,
    catInserted: catResult.inserted,
    whitelistSize,
    issues,
  };

  // Store health report in KV for alert worker to read
  await env.TRADE_VALUES_KV.put(KV_KEY_CREDIT_HEALTH, JSON.stringify(report), {
    expirationTtl: 86400, // 24h TTL
  });

  if (issues.length > 0) {
    console.warn(`[CreditTracker] Health issues: ${issues.join('; ')}`);
  }

  return report;
}

// ─── Burn Detection ───
// MintGarden event type 3 = burn (NFT sent to burn address)
// Simplified burn credits: bottom 25% by power_score, burner != minter = 100 credits

const KV_KEY_LAST_BURN_TIMESTAMP = 'last_burn_event_timestamp';

// Burn reward: 100 display credits = 10000 stored units
const BURN_CREDIT_AMOUNT = 10000;

async function detectBurns(env: Env): Promise<{ detected: number; credited: number }> {
  const collectionId = env.COLLECTION_ID;
  const lastBurnTs = await env.TRADE_VALUES_KV.get(KV_KEY_LAST_BURN_TIMESTAMP);
  let detected = 0;
  let credited = 0;
  let latestTimestamp = lastBurnTs || '';
  let cursor: string | null = null;

  // Fetch burn events (type=3) from MintGarden
  for (let page = 0; page < 5; page++) {
    const url = new URL(`${MINTGARDEN_API}/events`);
    url.searchParams.set('collection', collectionId);
    url.searchParams.set('type', '3'); // burn events
    url.searchParams.set('size', '100');
    if (cursor) url.searchParams.set('cursor', cursor);

    let res: Response;
    try {
      res = await fetchWithRetry(url.toString(), {
        headers: { Accept: 'application/json' },
      });
    } catch (e) {
      console.error('[CreditTracker] Burn events API error:', e);
      break;
    }
    if (!res.ok) break;

    const data = (await res.json()) as MintGardenEventsResponse;
    const items = data.items || [];
    if (items.length === 0) break;

    for (const event of items) {
      // Skip events we've already processed
      if (lastBurnTs && event.timestamp <= lastBurnTs) continue;

      const nftId = event.nft_id;
      if (!nftId) continue;

      // Check if already recorded in wojak_burns
      const existing = await env.DB.prepare(
        'SELECT 1 FROM wojak_burns WHERE nft_id = ?'
      ).bind(nftId).first();
      if (existing) {
        if (event.timestamp > latestTimestamp) latestTimestamp = event.timestamp;
        continue;
      }

      detected++;

      // Look up edition number from phase2_mints
      const mint = await env.DB.prepare(
        'SELECT mint_number, wallet_address FROM phase2_mints WHERE mintgarden_launcher_id = ?'
      ).bind(nftId).first<{ mint_number: number; wallet_address: string }>();

      if (!mint) {
        // Not a Phase 2 NFT we know about
        if (event.timestamp > latestTimestamp) latestTimestamp = event.timestamp;
        continue;
      }

      // Get fighter power score for eligibility check
      const fighter = await env.DB.prepare(
        'SELECT power_score FROM combat_fighters WHERE nft_id = ?'
      ).bind(nftId).first<{ power_score: number }>();

      // Calculate 25th percentile threshold for burn eligibility
      const thresholdRow = await env.DB.prepare(`
        WITH ranked AS (
          SELECT power_score,
            NTILE(4) OVER (ORDER BY power_score ASC) as quartile
          FROM combat_fighters
          WHERE burned_at IS NULL
        )
        SELECT MAX(power_score) as threshold FROM ranked WHERE quartile = 1
      `).first<{ threshold: number }>();

      const powerScore = fighter?.power_score ?? 0;
      const threshold = thresholdRow?.threshold ?? 0;
      const isEligible = fighter && powerScore <= threshold;

      // Resolve burner wallet: previous_address is who sent the burn
      const burnerWallet = event.previous_address?.encoded_id || mint.wallet_address;

      // Check eligibility: bottom 25% AND burner != minter
      const isSelfBurn = burnerWallet === mint.wallet_address;
      let creditsToAward = 0;

      if (!isEligible) {
        console.log(`[CreditTracker] Burn not eligible: edition ${mint.mint_number} power ${powerScore} > threshold ${threshold}`);
      } else if (isSelfBurn) {
        console.log(`[CreditTracker] Self-burn detected: ${burnerWallet.slice(0, 15)}... burned own edition ${mint.mint_number} - no credits`);
      } else {
        // Eligible burn by non-minter: award 100 credits
        creditsToAward = BURN_CREDIT_AMOUNT;
      }

      // Resolve DID (if registered game player)
      const player = await env.DB.prepare(
        'SELECT did_id FROM game_players WHERE wallet_address = ?'
      ).bind(burnerWallet).first<{ did_id: string }>();

      try {
        // Always record the burn, but only award credits if eligible
        const statements = [
          env.DB.prepare(`
            INSERT INTO wojak_burns (nft_id, edition_number, burner_did, burner_wallet, net_score_at_burn, credits_awarded, detected_via)
            VALUES (?, ?, ?, ?, ?, ?, 'indexer')
          `).bind(nftId, mint.mint_number, player?.did_id || null, burnerWallet, powerScore, creditsToAward),
          env.DB.prepare(
            'DELETE FROM did_holdings WHERE nft_id = ?'
          ).bind(nftId),
        ];

        // Only create credit event if credits > 0
        if (creditsToAward > 0) {
          statements.push(
            env.DB.prepare(`
              INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, event_timestamp)
              VALUES (?, ?, ?, 0, 0, ?, 100, 'burn', 'burn', ?)
            `).bind(burnerWallet, nftId, `burn_${nftId}`, creditsToAward, event.timestamp)
          );
        }

        await env.DB.batch(statements);
        credited++;
      } catch (e) {
        if (!String(e).includes('UNIQUE')) {
          console.error('[CreditTracker] Burn insert error:', e);
        }
      }

      if (event.timestamp > latestTimestamp) latestTimestamp = event.timestamp;
    }

    if (!data.next || data.next === cursor) break;
    cursor = data.next;
  }

  if (latestTimestamp && latestTimestamp !== lastBurnTs) {
    await env.TRADE_VALUES_KV.put(KV_KEY_LAST_BURN_TIMESTAMP, latestTimestamp);
  }

  return { detected, credited };
}

async function run(env: Env): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await ensureFloorSnapshot(env, today);

  // Load whitelist from DB (falls back to hardcoded if table missing)
  const whitelist = await loadWhitelist(env.DB);
  console.log(`[CreditTracker] Whitelist: ${whitelist.size} tokens`);

  // Process XCH trades from MintGarden events
  const xchResult = await processEvents(env);
  console.log(`[CreditTracker] XCH: ${xchResult.processed} events, ${xchResult.inserted} credit_events`);

  // Process CAT trades from D1 sales_history
  let catResult = { processed: 0, inserted: 0 };
  try {
    catResult = await processCatSales(env, whitelist);
    console.log(`[CreditTracker] CAT: ${catResult.processed} trades, ${catResult.inserted} credit_events`);
  } catch (e) {
    console.error('[CreditTracker] CAT processing error (non-fatal):', e);
  }

  // Detect burn events from MintGarden and award credits
  let burnResult = { detected: 0, credited: 0 };
  try {
    burnResult = await detectBurns(env);
    console.log(`[CreditTracker] Burns: ${burnResult.detected} detected, ${burnResult.credited} credited`);
  } catch (e) {
    console.error('[CreditTracker] Burn detection error (non-fatal):', e);
  }

  // Post-processing integrity check + auto-dedup
  const health = await runIntegrityCheck(env, xchResult, catResult, whitelist.size);
  console.log(`[CreditTracker] Health: ${health.totalEvents} total events, ${health.duplicatesFixed} dupes fixed, ${health.issues.length} issues`);
}
