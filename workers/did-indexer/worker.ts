// DID Holdings Indexer
// Runs every 30 minutes. For each registered game player:
// 1. Fetches their DID's NFT holdings from MintGarden
// 2. Updates did_holdings table (add new, remove transferred)
// 3. Triggers Power Level recalculation if holdings changed

interface Env {
  DB: D1Database;
}

const PHASE1_COLLECTION = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';
const PHASE2_COLLECTION = 'col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx';

const RATE_LIMIT_MS = 500; // 500ms between MintGarden API calls

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

  for (const player of players.results) {
    const did = player.did_id as string;

    try {
      const changed = await syncDIDHoldings(env, did);
      if (changed) updatedCount++;
    } catch (err) {
      console.error(`[DID Indexer] Error for DID ${did}:`, err);
    }

    // Rate limit
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`[DID Indexer] Done. ${updatedCount}/${players.results.length} players had changes.`);

  // Resolve expired battles (replaces standalone battle-cron worker)
  try {
    const res = await fetch('https://wojak.ink/api/game/battle-resolve', { method: 'POST' });
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

async function syncDIDHoldings(env: Env, did: string): Promise<boolean> {
  // Fetch Phase 2 NFTs from MintGarden
  const phase2Nfts = await fetchDIDNfts(did, PHASE2_COLLECTION);
  // Fetch Phase 1 NFTs from MintGarden
  const phase1Nfts = await fetchDIDNfts(did, PHASE1_COLLECTION);

  await sleep(RATE_LIMIT_MS); // Rate limit between the two calls

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
    return false; // No changes
  }

  // Apply changes in a batch
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
    await env.DB.batch(statements);
  }

  // Check Phase 1 verification status
  const hasPhase1 = phase1Nfts.length > 0;
  await env.DB.prepare(
    "UPDATE game_players SET phase1_verified = ?, updated_at = datetime('now') WHERE did_id = ?"
  ).bind(hasPhase1 ? 1 : 0, did).run();

  console.log(`[DID Indexer] DID ${did.slice(0, 20)}...: +${toAdd.length} -${toRemove.length} NFTs`);
  return true;
}

interface NftInfo {
  id: string;
  edition?: number;
  creator?: string;
}

async function fetchDIDNfts(did: string, collectionId: string): Promise<NftInfo[]> {
  const nfts: NftInfo[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const url = `https://api.mintgarden.io/nfts?collection_id=${collectionId}&owner_did=${encodeURIComponent(did)}&size=${pageSize}&page=${page}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error(`MintGarden API error: ${response.status} for ${url}`);
      break;
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
  }

  return nfts;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
