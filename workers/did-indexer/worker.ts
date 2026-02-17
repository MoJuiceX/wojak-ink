// DID Holdings Indexer
// Runs every 30 minutes. For each registered game player:
// 1. Fetches their DID's NFT holdings from MintGarden
// 2. Updates did_holdings table (add new, remove transferred)
// 3. Triggers Power Level recalculation if holdings changed

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const PHASE1_COLLECTION = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';
const PHASE2_COLLECTION = 'col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx';

const RATE_LIMIT_MS = 500; // 500ms between MintGarden API calls
const MAX_PAGES = 50;      // Safety cap on pagination
const D1_BATCH_SIZE = 25;  // Max statements per D1 batch call
const CIRCUIT_BREAKER_THRESHOLD = 5; // Consecutive API failures before aborting

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(run(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/run') {
      await run(env);
      return new Response('DID indexer run complete');
    }
    return new Response('DID Holdings Indexer. Use /run to trigger manually.', { status: 200 });
  },
};

async function run(env: Env) {
  console.log('[DID Indexer] Starting run...');

  // Get all registered players
  const players = await env.DB.prepare(
    'SELECT did_id, wallet_address FROM game_players'
  ).all();

  console.log(`[DID Indexer] Processing ${players.results.length} players`);

  let updatedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let consecutiveApiFailures = 0;

  for (const player of players.results) {
    const did = player.did_id as string;

    // Circuit breaker: abort if too many consecutive API failures
    if (consecutiveApiFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      console.error(`[DID Indexer] Circuit breaker tripped after ${CIRCUIT_BREAKER_THRESHOLD} consecutive API failures. Aborting run.`);
      break;
    }

    try {
      const result = await syncDIDHoldings(env, did);
      if (result === 'changed') {
        updatedCount++;
        consecutiveApiFailures = 0;
        await env.DB.prepare(
          "UPDATE game_players SET last_indexed_at = datetime('now'), last_index_error = NULL, index_error_count = 0 WHERE did_id = ?"
        ).bind(did).run();
      } else if (result === 'skipped') {
        skippedCount++;
        consecutiveApiFailures++;
        await env.DB.prepare(
          "UPDATE game_players SET last_index_error = 'API fetch incomplete', index_error_count = index_error_count + 1 WHERE did_id = ?"
        ).bind(did).run();
      } else {
        consecutiveApiFailures = 0; // 'unchanged' resets circuit breaker
        await env.DB.prepare(
          "UPDATE game_players SET last_indexed_at = datetime('now'), last_index_error = NULL, index_error_count = 0 WHERE did_id = ?"
        ).bind(did).run();
      }
    } catch (err) {
      console.error(`[DID Indexer] Error for DID ${did}:`, err);
      errorCount++;
      consecutiveApiFailures++;
      const errMsg = err instanceof Error ? err.message.slice(0, 200) : 'Unknown error';
      await env.DB.prepare(
        "UPDATE game_players SET last_index_error = ?, index_error_count = index_error_count + 1 WHERE did_id = ?"
      ).bind(errMsg, did).run().catch(() => {});
    }

    // Rate limit
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`[DID Indexer] Done. Changed: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}, Total: ${players.results.length}`);

  // Resolve expired battles (replaces standalone battle-cron worker)
  try {
    const battleHeaders: Record<string, string> = {};
    if (env.ADMIN_SECRET) {
      battleHeaders['Authorization'] = `Bearer ${env.ADMIN_SECRET}`;
    }
    const res = await fetch('https://wojak.ink/api/game/battle-resolve', {
      method: 'POST',
      headers: battleHeaders,
    });
    if (res.ok) {
      const data = await res.json() as { resolved?: number; draws?: number };
      console.log(`[DID Indexer] Battles resolved: ${data.resolved ?? 0}, draws: ${data.draws ?? 0}`);
    } else {
      console.error(`[DID Indexer] Battle resolve returned ${res.status}`);
    }
  } catch (err) {
    console.error('[DID Indexer] Battle resolve error:', err);
  }
}

async function syncDIDHoldings(env: Env, did: string): Promise<'changed' | 'unchanged' | 'skipped'> {
  // Fetch Phase 2 NFTs from MintGarden
  const phase2Result = await fetchDIDNfts(did, PHASE2_COLLECTION);
  await sleep(RATE_LIMIT_MS);
  // Fetch Phase 1 NFTs from MintGarden
  const phase1Result = await fetchDIDNfts(did, PHASE1_COLLECTION);

  // Guard: if either fetch failed, skip the diff entirely to avoid data wipe
  if (!phase2Result.success || !phase1Result.success) {
    console.warn(`[DID Indexer] Skipping diff for DID ${did.slice(0, 20)}... — API fetch incomplete`);
    return 'skipped';
  }

  const phase2Nfts = phase2Result.nfts;
  const phase1Nfts = phase1Result.nfts;

  // Get current DB holdings
  const currentHoldings = await env.DB.prepare(
    'SELECT nft_id, collection FROM did_holdings WHERE did_id = ?'
  ).bind(did).all();

  const currentSet = new Set(currentHoldings.results.map(r => r.nft_id as string));
  const newSet = new Set([
    ...phase2Nfts.map(n => n.id),
    ...phase1Nfts.map(n => n.id),
  ]);

  // Find additions and removals
  const toAdd: { id: string; collection: string; edition?: number; creator?: string }[] = [];
  const toRemove: string[] = [];

  for (const nft of phase2Nfts) {
    if (!currentSet.has(nft.id)) {
      toAdd.push({ id: nft.id, collection: 'phase2', edition: nft.edition, creator: nft.creator });
    }
  }
  for (const nft of phase1Nfts) {
    if (!currentSet.has(nft.id)) {
      toAdd.push({ id: nft.id, collection: 'phase1' });
    }
  }
  for (const current of currentHoldings.results) {
    if (!newSet.has(current.nft_id as string)) {
      toRemove.push(current.nft_id as string);
    }
  }

  if (toAdd.length === 0 && toRemove.length === 0) {
    return 'unchanged';
  }

  // Apply changes in chunked batches
  const statements: D1PreparedStatement[] = [];

  for (const nft of toAdd) {
    statements.push(
      env.DB.prepare(`
        INSERT OR IGNORE INTO did_holdings (did_id, nft_id, edition_number, collection, creator_wallet)
        VALUES (?, ?, ?, ?, ?)
      `).bind(did, nft.id, nft.edition || null, nft.collection, nft.creator || null)
    );
  }

  for (const nftId of toRemove) {
    statements.push(
      env.DB.prepare('DELETE FROM did_holdings WHERE did_id = ? AND nft_id = ?').bind(did, nftId)
    );
  }

  if (statements.length > 0) {
    await batchChunked(env.DB, statements);
  }

  // Check Phase 1 verification status
  const hasPhase1 = phase1Nfts.length > 0;
  await env.DB.prepare(
    "UPDATE game_players SET phase1_verified = ?, updated_at = datetime('now') WHERE did_id = ?"
  ).bind(hasPhase1 ? 1 : 0, did).run();

  console.log(`[DID Indexer] DID ${did.slice(0, 20)}...: +${toAdd.length} -${toRemove.length} NFTs`);
  return 'changed';
}

interface NftInfo {
  id: string;
  edition?: number;
  creator?: string;
}

interface FetchResult {
  success: boolean;
  nfts: NftInfo[];
}

async function fetchDIDNfts(did: string, collectionId: string): Promise<FetchResult> {
  const nfts: NftInfo[] = [];
  let page = 1;
  const pageSize = 100;

  while (page <= MAX_PAGES) {
    const url = `https://api.mintgarden.io/nfts?collection_id=${collectionId}&owner_did=${encodeURIComponent(did)}&size=${pageSize}&page=${page}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });
    } catch (err) {
      console.error(`[DID Indexer] Network error fetching ${url}:`, err);
      return { success: false, nfts: [] };
    }

    if (!response.ok) {
      console.error(`[DID Indexer] MintGarden API error: ${response.status} for ${url}`);
      return { success: false, nfts: [] };
    }

    const data = await response.json() as {
      items: Array<{
        id: string;
        data?: { metadata_json?: { edition_number?: number } };
        minter_address?: string;
      }>;
    };

    if (!data.items || data.items.length === 0) break;

    for (const item of data.items) {
      nfts.push({
        id: item.id,
        edition: item.data?.metadata_json?.edition_number,
        creator: item.minter_address,
      });
    }

    if (data.items.length < pageSize) break;
    page++;

    // Rate limit between pages
    await sleep(RATE_LIMIT_MS);
  }

  return { success: true, nfts };
}

async function batchChunked(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  for (let i = 0; i < statements.length; i += D1_BATCH_SIZE) {
    const chunk = statements.slice(i, i + D1_BATCH_SIZE);
    await db.batch(chunk);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
