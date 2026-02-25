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

const RATE_LIMIT_MS = 300; // 300ms between MintGarden API calls
const _MAX_PAGES = 50;     // Safety cap on pagination (unused - search-based approach)
const D1_BATCH_SIZE = 25;  // Max statements per D1 batch call
const CIRCUIT_BREAKER_THRESHOLD = 5; // Consecutive API failures before aborting
const PLAYERS_PER_RUN = 10; // Only sync this many players per cron run (staggered)
const DISCOVERY_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours between full collection scans
const _SKIP_IF_INDEXED_WITHIN_MS = 2 * 60 * 60 * 1000; // Skip players indexed < 2 hours ago

// In-memory cache for collection NFTs (refreshed each run)
// Key: collection ID, Value: Map<DID, NftInfo[]>
let collectionCache: Map<string, Map<string, NftInfo[]>> = new Map();

// Power level calculation constants (same as _powerLevel.ts)
const POWER_LEVEL_MAX = 10000;
const QUALITY_WEIGHT = 1.0;
const VALUE_BASE = 50;
const VALUE_LOG_SCALE = 30;
const BREADTH_BONUS = 15;
const CREATOR_QUALITY_WEIGHT = 0.5;
const CREATOR_SPREAD_BONUS = 10;

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(run(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/run') {
      const authHeader = request.headers.get('Authorization');
      if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }
      await run(env);
      return new Response('DID indexer run complete');
    }
    return new Response('DID Holdings Indexer. Use /run to trigger manually.', { status: 200 });
  },
};

async function run(env: Env) {
  console.log('[DID Indexer] Starting run...');

  // Clear collection cache at start of each run to get fresh data
  collectionCache = new Map();

  // Phase 0: Auto-discover new Farmers Plot holders — only every 12 hours
  // Check when discovery last ran via a simple DB flag
  const lastDiscovery = await env.DB.prepare(
    "SELECT value FROM kv_meta WHERE key = 'last_discovery_run'"
  ).first<{ value: string }>();

  const lastDiscoveryTime = lastDiscovery ? new Date(lastDiscovery.value).getTime() : 0;
  const shouldDiscover = (Date.now() - lastDiscoveryTime) > DISCOVERY_INTERVAL_MS;

  if (shouldDiscover) {
    try {
      const discovered = await discoverNewHolders(env);
      console.log(`[DID Indexer] Auto-discovered ${discovered} new holder(s)`);
      // Record discovery time
      await env.DB.prepare(
        "INSERT INTO kv_meta (key, value) VALUES ('last_discovery_run', datetime('now')) ON CONFLICT(key) DO UPDATE SET value = datetime('now')"
      ).run();
    } catch (err) {
      console.error('[DID Indexer] Holder discovery error (non-fatal):', err);
    }
  } else {
    const hoursAgo = Math.round((Date.now() - lastDiscoveryTime) / 3600000);
    console.log(`[DID Indexer] Skipping discovery (last ran ${hoursAgo}h ago, interval: 12h)`);
  }

  // Get the PLAYERS_PER_RUN oldest-indexed players to sync (staggered round-robin)
  // Skip players indexed within the last 2 hours
  const players = await env.DB.prepare(`
    SELECT did_id, wallet_address, last_indexed_at
    FROM game_players
    WHERE last_indexed_at IS NULL
       OR last_indexed_at < datetime('now', '-2 hours')
    ORDER BY last_indexed_at ASC NULLS FIRST
    LIMIT ?
  `).bind(PLAYERS_PER_RUN).all();

  console.log(`[DID Indexer] Syncing ${players.results.length} players (staggered, ${PLAYERS_PER_RUN} per run)`);

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
      ).bind(errMsg, did).run().catch(() => { });
    }

    // Rate limit
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`[DID Indexer] Done. Changed: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}, Synced: ${players.results.length}`);

  if (!env.ADMIN_SECRET) {
    console.warn('[DID Indexer] ADMIN_SECRET not set — battle-resolve and vote-xp calls will fail with 401');
  }

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

  // Award vote XP to combat fighters (bridges swipe votes → combat XP)
  try {
    const voteXpHeaders: Record<string, string> = {};
    if (env.ADMIN_SECRET) {
      voteXpHeaders['Authorization'] = `Bearer ${env.ADMIN_SECRET}`;
    }
    const voteXpRes = await fetch('https://wojak.ink/api/combat/vote-xp', {
      method: 'POST',
      headers: voteXpHeaders,
    });
    if (voteXpRes.ok) {
      const data = await voteXpRes.json() as { updated?: number; totalXpAwarded?: number };
      console.log(`[DID Indexer] Vote XP: ${data.updated ?? 0} fighters updated, ${data.totalXpAwarded ?? 0} XP awarded`);
    } else {
      console.error(`[DID Indexer] Vote XP returned ${voteXpRes.status}`);
    }
  } catch (err) {
    console.error('[DID Indexer] Vote XP error:', err);
  }

  // Check for timed-out combat turns (30s timeout with AI fallback)
  try {
    const timeoutHeaders: Record<string, string> = {};
    if (env.ADMIN_SECRET) {
      timeoutHeaders['Authorization'] = `Bearer ${env.ADMIN_SECRET}`;
    }
    const timeoutRes = await fetch('https://wojak.ink/api/combat/check-timeouts', {
      method: 'POST',
      headers: timeoutHeaders,
    });
    if (timeoutRes.ok) {
      const data = await timeoutRes.json() as { resolved?: number; forfeited?: number };
      console.log(`[DID Indexer] Timeouts: ${data.resolved ?? 0} resolved, ${data.forfeited ?? 0} forfeited`);
    } else {
      console.error(`[DID Indexer] Timeout check returned ${timeoutRes.status}`);
    }
  } catch (err) {
    console.error('[DID Indexer] Timeout check error:', err);
  }
}

// Sync DID profile name from chain — only overrides 'random' names
async function syncDIDProfileName(env: Env, did: string): Promise<void> {
  try {
    // Check current name source — only update if 'random' (user hasn't customized)
    const profile = await env.DB.prepare(
      'SELECT name_source FROM did_profiles WHERE did_id = ?'
    ).bind(did).first<{ name_source: string | null }>();

    // If name_source is 'custom', user has set their own name — don't override
    if (profile?.name_source === 'custom') {
      return;
    }

    // Fetch DID profile from MintGarden
    const url = `https://api.mintgarden.io/profiles/${encodeURIComponent(did)}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      // DID profile not found or API error — skip silently
      return;
    }

    const data = await response.json() as {
      name?: string;
      twitter_handle?: string;
    };

    // If DID has a name on chain, use it
    const chainName = data.name?.trim();
    if (chainName && chainName.length >= 2 && chainName.length <= 20) {
      // Validate: alphanumeric + spaces only
      if (/^[a-zA-Z0-9 ]+$/.test(chainName)) {
        await env.DB.prepare(`
          INSERT INTO did_profiles (did_id, display_name, name_source, created_at, updated_at)
          VALUES (?, ?, 'chain', datetime('now'), datetime('now'))
          ON CONFLICT(did_id) DO UPDATE SET
            display_name = CASE WHEN name_source = 'random' OR name_source IS NULL THEN ? ELSE display_name END,
            name_source = CASE WHEN name_source = 'random' OR name_source IS NULL THEN 'chain' ELSE name_source END,
            updated_at = datetime('now')
        `).bind(did, chainName, chainName).run();

        console.log(`[DID Indexer] Updated DID ${did.slice(0, 20)}... name from chain: ${chainName}`);
      }
    }
  } catch (err) {
    // Non-critical — log and continue
    console.warn(`[DID Indexer] Failed to sync profile name for DID ${did.slice(0, 20)}...:`, err);
  }
}

async function syncDIDHoldings(env: Env, did: string): Promise<'changed' | 'unchanged' | 'skipped'> {
  // Sync DID profile name from chain (if user hasn't customized)
  await syncDIDProfileName(env, did);
  await sleep(RATE_LIMIT_MS);

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

  // Event-driven power level recalculation
  try {
    const newPowerLevel = await recalcPowerLevel(env.DB, did);
    if (newPowerLevel !== null) {
      console.log(`[DID Indexer] DID ${did.slice(0, 20)}... power level: ${newPowerLevel}`);
    }
  } catch (err) {
    console.warn(`[DID Indexer] Power level recalc error for DID ${did.slice(0, 20)}...:`, err);
  }

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

/**
 * Fetch all NFTs from a collection using search-based pagination.
 * MintGarden's cursor pagination doesn't work properly, so we use search
 * queries with number prefixes to get different "pages" of data.
 * Returns a Map of DID -> NFTs owned by that DID.
 */
async function fetchCollectionWithSearch(collectionId: string): Promise<Map<string, NftInfo[]> | null> {
  const didToNfts = new Map<string, NftInfo[]>();
  const seenIds = new Set<string>();
  const pageSize = 100;

  // Determine search prefixes based on collection
  // Phase 1 (Farmer's Plot): ~4200 NFTs numbered #0001-#4200 (4-digit)
  // Phase 2 (Your Wojak): ~376 NFTs numbered #1-#376 (variable digits)
  const isPhase1 = collectionId === PHASE1_COLLECTION;
  const searchPrefixes = isPhase1
    ? Array.from({ length: 43 }, (_, i) => String(i).padStart(2, '0')) // '00' to '42'
    : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']; // Single digits for Phase 2

  console.log(`[DID Indexer] Fetching ${isPhase1 ? 'Phase 1' : 'Phase 2'} collection with ${searchPrefixes.length} search queries...`);

  for (const prefix of searchPrefixes) {
    const searchParam = encodeURIComponent(`#${prefix}`);
    const url = `https://api.mintgarden.io/collections/${collectionId}/nfts?size=${pageSize}&search=${searchParam}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });
    } catch (err) {
      console.error(`[DID Indexer] Network error fetching collection:`, err);
      return null;
    }

    if (!response.ok) {
      console.error(`[DID Indexer] MintGarden API error: ${response.status}`);
      return null;
    }

    const data = await response.json() as {
      items: Array<{
        id: string;
        edition_number?: number;
        creator_address_encoded_id?: string;
        owner_encoded_id?: string;
      }>;
    };

    if (data.items) {
      for (const item of data.items) {
        // Skip duplicates (search queries may overlap)
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);

        // Only process NFTs with valid DID owners
        const ownerDid = item.owner_encoded_id;
        if (ownerDid && ownerDid.startsWith('did:chia:')) {
          const nftInfo: NftInfo = {
            id: item.id,
            edition: item.edition_number,
            creator: item.creator_address_encoded_id,
          };

          const existing = didToNfts.get(ownerDid) || [];
          existing.push(nftInfo);
          didToNfts.set(ownerDid, existing);
        }
      }
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log(`[DID Indexer] Fetched ${seenIds.size} NFTs, ${didToNfts.size} unique DIDs`);
  return didToNfts;
}

/**
 * Ensure collection cache is populated for a given collection.
 */
async function ensureCollectionCache(collectionId: string): Promise<boolean> {
  if (collectionCache.has(collectionId)) {
    return true;
  }

  const result = await fetchCollectionWithSearch(collectionId);
  if (result === null) {
    return false;
  }

  collectionCache.set(collectionId, result);
  return true;
}

/**
 * Get NFTs owned by a specific DID from a collection.
 * Uses cached collection data (populated via search-based pagination).
 * Note: MintGarden's owner_did parameter doesn't work, so we fetch all
 * collection NFTs and filter locally.
 */
async function fetchDIDNfts(did: string, collectionId: string): Promise<FetchResult> {
  // Ensure collection is cached
  if (!await ensureCollectionCache(collectionId)) {
    return { success: false, nfts: [] };
  }

  const didMap = collectionCache.get(collectionId);
  if (!didMap) {
    return { success: false, nfts: [] };
  }

  // Get NFTs owned by this specific DID
  const nfts = didMap.get(did) || [];
  return { success: true, nfts };
}

async function batchChunked(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  for (let i = 0; i < statements.length; i += D1_BATCH_SIZE) {
    const chunk = statements.slice(i, i + D1_BATCH_SIZE);
    await db.batch(chunk);
  }
}

/**
 * Discover new Farmers Plot holders from MintGarden collection listing.
 * Uses search-based pagination to fetch all NFTs and extract unique owner DIDs.
 * Auto-creates game_players rows for any DIDs that don't already exist.
 * Returns the count of newly created players.
 */
async function discoverNewHolders(env: Env): Promise<number> {
  const holderDids = new Map<string, { name?: string; wallet?: string }>();
  const seenIds = new Set<string>();
  const pageSize = 100;

  // Use search-based pagination (cursor pagination doesn't work)
  // Phase 1 NFTs are numbered #0001-#4200 (4-digit format)
  const searchPrefixes = Array.from({ length: 43 }, (_, i) => String(i).padStart(2, '0')); // '00' to '42'

  console.log(`[DID Indexer] Discovery: fetching Phase 1 NFTs with ${searchPrefixes.length} search queries...`);

  for (const prefix of searchPrefixes) {
    const searchParam = encodeURIComponent(`#${prefix}`);
    const url = `https://api.mintgarden.io/collections/${PHASE1_COLLECTION}/nfts?size=${pageSize}&search=${searchParam}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });
    } catch (err) {
      console.error(`[DID Indexer] Discovery: network error on search ${prefix}:`, err);
      continue; // Continue with other prefixes
    }

    if (!response.ok) {
      console.error(`[DID Indexer] Discovery: MintGarden returned ${response.status} on search ${prefix}`);
      continue;
    }

    const data = await response.json() as {
      items: Array<{
        id: string;
        encoded_id: string;
        owner_encoded_id?: string;
        owner_id?: string;
        owner_name?: string;
        owner_address_encoded_id?: string;
        edition_number?: number;
      }>;
    };

    if (!data.items) continue;

    for (const item of data.items) {
      // Skip duplicates
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);

      const ownerDid = item.owner_encoded_id;
      // Only process valid DID owners (skip if no DID or not a valid DID)
      if (ownerDid && ownerDid.startsWith('did:chia:')) {
        if (!holderDids.has(ownerDid)) {
          holderDids.set(ownerDid, {
            name: item.owner_name,
            wallet: item.owner_address_encoded_id,
          });
        }
      }
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log(`[DID Indexer] Discovery: found ${holderDids.size} unique DIDs holding ${seenIds.size} Farmers Plot NFTs`);

  if (holderDids.size === 0) return 0;

  // Check which DIDs are already registered
  let newCount = 0;
  const didEntries = Array.from(holderDids.entries());

  // Process in chunks to avoid overwhelming D1
  for (let i = 0; i < didEntries.length; i += D1_BATCH_SIZE) {
    const chunk = didEntries.slice(i, i + D1_BATCH_SIZE);
    const statements: D1PreparedStatement[] = [];

    for (const [did, info] of chunk) {
      // Check if player already exists
      const existing = await env.DB.prepare(
        'SELECT 1 FROM game_players WHERE did_id = ?'
      ).bind(did).first();

      if (!existing) {
        // Auto-create player row
        const wallet = info.wallet || '';
        statements.push(
          env.DB.prepare(`
            INSERT OR IGNORE INTO game_players (did_id, wallet_address, phase1_verified, votes_today_reset)
            VALUES (?, ?, 1, ?)
          `).bind(did, wallet, new Date().toISOString().split('T')[0])
        );

        // Auto-create profile with MintGarden name if available
        if (info.name && info.name.trim().length >= 2) {
          statements.push(
            env.DB.prepare(`
              INSERT INTO did_profiles (did_id, display_name, name_source, created_at, updated_at)
              VALUES (?, ?, 'chain', datetime('now'), datetime('now'))
              ON CONFLICT(did_id) DO UPDATE SET
                display_name = CASE WHEN name_source = 'random' OR name_source IS NULL THEN ? ELSE display_name END,
                name_source = CASE WHEN name_source = 'random' OR name_source IS NULL THEN 'chain' ELSE name_source END,
                updated_at = datetime('now')
            `).bind(did, info.name.trim(), info.name.trim())
          );
        }

        newCount++;
        console.log(`[DID Indexer] Auto-enrolled: ${did.slice(0, 25)}... (${info.name || 'unnamed'})`);
      }
    }

    if (statements.length > 0) {
      await batchChunked(env.DB, statements);
    }
  }

  return newCount;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Recalculate power level for a player after holdings change.
 * Same algorithm as _powerLevel.ts but inline for worker use.
 */
async function recalcPowerLevel(db: D1Database, did: string): Promise<number | null> {
  const player = await db.prepare(
    'SELECT wallet_address, phase1_verified FROM game_players WHERE did_id = ?'
  ).bind(did).first<{ wallet_address: string; phase1_verified: number }>();

  if (!player) return null;

  // Only calculate for verified holders
  if (!player.phase1_verified) {
    return 0;
  }

  const walletAddress = player.wallet_address;

  // Calculate holdings score
  const holdings = await db.prepare(`
    SELECT
      dh.nft_id,
      dh.creator_wallet,
      COALESCE(ws.net_score, 0) as net_score,
      COALESCE(pm.trait_surcharge_xch, 0) as surcharge
    FROM did_holdings dh
    LEFT JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
    LEFT JOIN phase2_mints pm ON pm.mint_number = dh.edition_number
    WHERE dh.did_id = ? AND dh.collection = 'phase2'
  `).bind(did).all();

  let holdingsScore = 0;
  const seenCreators = new Set<string>();

  for (const nft of holdings.results) {
    const quality = (nft.net_score as number) * QUALITY_WEIGHT;
    const surchargeXch = (nft.surcharge as number) / 100000;
    const value = VALUE_BASE + VALUE_LOG_SCALE * Math.log(1 + surchargeXch);

    let breadth = 0;
    const creator = nft.creator_wallet as string;
    if (creator && creator !== walletAddress && !seenCreators.has(creator)) {
      seenCreators.add(creator);
      breadth = BREADTH_BONUS;
    }

    holdingsScore += quality + value + breadth;
  }

  // Calculate creations score
  const creationStats = await db.prepare(`
    SELECT
      COALESCE(SUM(ws.net_score), 0) as total_net_score,
      COUNT(DISTINCT dh.did_id) as unique_collectors
    FROM wojak_scores ws
    LEFT JOIN did_holdings dh ON dh.nft_id = ws.nft_id AND dh.did_id != ?
    WHERE ws.creator_wallet = ?
  `).bind(did, walletAddress).first();

  const creatorQuality = ((creationStats?.total_net_score as number) || 0) * CREATOR_QUALITY_WEIGHT;
  const creatorSpread = ((creationStats?.unique_collectors as number) || 0) * CREATOR_SPREAD_BONUS;
  const creationsScore = creatorQuality + creatorSpread;

  // Total power level
  const rawTotal = holdingsScore + creationsScore;
  const powerLevel = Math.max(0, Math.min(POWER_LEVEL_MAX, Math.round(rawTotal)));

  // Update the database
  await db.prepare(`
    UPDATE game_players
    SET power_level = ?, power_level_updated_at = datetime('now'), updated_at = datetime('now')
    WHERE did_id = ?
  `).bind(powerLevel, did).run();

  return powerLevel;
}
