// POST /api/profile/refresh-did
// Body: { did: string }
// Manually triggers DID holdings sync for a single DID
// Rate limited to 1 refresh per DID per 5 minutes

import { checkRateLimit } from '../../lib/rateLimit';

interface Env {
  DB: D1Database;
}

const PHASE1_COLLECTION = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';
const PHASE2_COLLECTION = 'col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx';
const RATE_LIMIT_MS = 500;
const D1_BATCH_SIZE = 25;

// Rate limit: 1 request per DID per 5 minutes
const REFRESH_RATE_LIMIT = {
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 1,
  keyPrefix: 'did-refresh',
};

function isValidDid(did: string): boolean {
  return /^did:chia:1[a-z0-9]{58}$/.test(did);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  const maxPages = 20;

  while (page <= maxPages) {
    const url = `https://api.mintgarden.io/nfts?collection_id=${collectionId}&owner_did=${encodeURIComponent(did)}&size=${pageSize}&page=${page}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error(`[refresh-did] MintGarden API error: ${response.status}`);
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
    await sleep(RATE_LIMIT_MS);
  }

  return nfts;
}

async function batchChunked(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  for (let i = 0; i < statements.length; i += D1_BATCH_SIZE) {
    const chunk = statements.slice(i, i + D1_BATCH_SIZE);
    await db.batch(chunk);
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as { did: string };
    const { did } = body;

    if (!did || !isValidDid(did)) {
      return Response.json({ error: 'Invalid DID format' }, { status: 400 });
    }

    const db = context.env.DB;

    // Rate limit: 1 refresh per DID per 5 minutes
    const rl = await checkRateLimit(db, `did:${did}`, REFRESH_RATE_LIMIT);
    if (!rl.allowed) {
      const waitMinutes = Math.ceil((rl.resetAt - Date.now()) / 60000);
      return Response.json({
        error: `Please wait ${waitMinutes} minute(s) between refreshes`,
        retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000),
      }, { status: 429 });
    }

    // Verify player exists
    const player = await db.prepare(
      'SELECT wallet_address FROM game_players WHERE did_id = ?'
    ).bind(did).first<{ wallet_address: string }>();

    if (!player) {
      return Response.json({ error: 'DID not registered' }, { status: 404 });
    }

    // Fetch Phase 2 NFTs from MintGarden
    const phase2Nfts = await fetchDIDNfts(did, PHASE2_COLLECTION);
    await sleep(RATE_LIMIT_MS);
    // Fetch Phase 1 NFTs from MintGarden
    const phase1Nfts = await fetchDIDNfts(did, PHASE1_COLLECTION);

    // Get current DB holdings
    const currentHoldings = await db.prepare(
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

    // Apply changes
    const statements: D1PreparedStatement[] = [];

    for (const nft of toAdd) {
      statements.push(
        db.prepare(`
          INSERT OR IGNORE INTO did_holdings (did_id, nft_id, edition_number, collection, creator_wallet)
          VALUES (?, ?, ?, ?, ?)
        `).bind(did, nft.id, nft.edition || null, nft.collection, nft.creator || null)
      );
    }

    for (const nftId of toRemove) {
      statements.push(
        db.prepare('DELETE FROM did_holdings WHERE did_id = ? AND nft_id = ?').bind(did, nftId)
      );
    }

    // Update combat_fighters owner_did for Phase 2 NFTs this DID now owns
    let fightersLinked = 0;
    for (const nft of phase2Nfts) {
      // Check if this NFT has a combat_fighters entry with a different owner
      const fighter = await db.prepare(
        'SELECT owner_did FROM combat_fighters WHERE nft_id = ?'
      ).bind(nft.id).first<{ owner_did: string }>();

      if (fighter && fighter.owner_did !== did) {
        statements.push(
          db.prepare(`
            UPDATE combat_fighters SET owner_did = ?, updated_at = datetime('now') WHERE nft_id = ?
          `).bind(did, nft.id)
        );
        fightersLinked++;
      }
    }

    if (statements.length > 0) {
      await batchChunked(db, statements);
    }

    // Update Phase 1 verification status
    const hasPhase1 = phase1Nfts.length > 0;
    await db.prepare(
      "UPDATE game_players SET phase1_verified = ?, phase1_nft_count = ?, last_indexed_at = datetime('now') WHERE did_id = ?"
    ).bind(hasPhase1 ? 1 : 0, phase1Nfts.length, did).run();

    const totalNfts = phase2Nfts.length + phase1Nfts.length;
    const added = toAdd.length;
    const removed = toRemove.length;

    console.log(`[refresh-did] DID ${did.slice(0, 20)}...: ${totalNfts} NFTs (+${added} -${removed}), ${fightersLinked} fighters linked`);

    return Response.json({
      success: true,
      nftsFound: totalNfts,
      phase1Count: phase1Nfts.length,
      phase2Count: phase2Nfts.length,
      added,
      removed,
      fightersLinked,
    });
  } catch (error) {
    console.error('[refresh-did] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
