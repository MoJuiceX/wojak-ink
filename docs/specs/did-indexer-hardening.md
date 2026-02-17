# DID Indexer Hardening Spec

> Priority: High — the current indexer has a critical bug where a single MintGarden 429 can wipe a player's holdings. This spec addresses all fragility issues found during Phase 4 review.

---

## Current Architecture

```
[Cron: */30 * * * *] → DID Indexer Worker
    ├── For each game_players row:
    │   ├── fetchDIDNfts(did, PHASE2_COLLECTION) → MintGarden API
    │   ├── sleep(500ms)
    │   ├── fetchDIDNfts(did, PHASE1_COLLECTION) → MintGarden API
    │   ├── Diff vs did_holdings → INSERT additions, DELETE removals
    │   └── Update game_players.phase1_verified
    └── resolveBattles(env) ← REMOVED in Phase 4 (blocker C)
```

**File:** `workers/did-indexer/worker.ts`
**Schedule:** Every 30 minutes
**D1 binding:** `wojak-users`
**External dependency:** MintGarden API (`api.mintgarden.io`)

---

## Issue Inventory

| # | Issue | Severity | Section |
|---|-------|----------|---------|
| 1 | API failure wipes holdings | **Critical** | §1 |
| 2 | No D1 batch chunking | High | §2 |
| 3 | No rate limiting between pagination pages | High | §3 |
| 4 | No retry / dead-letter tracking | High | §4 |
| 5 | Infinite pagination loop risk | Medium | §5 |
| 6 | Failure count invisible in logs | Medium | §6 |
| 7 | Battle-resolve double-resolution race | High | §7 |
| 8 | No circuit breaker for sustained outages | Medium | §8 |
| 9 | `nft_names` never populated by indexer | Low | §9 |
| 10 | Concurrent run risk | Low | §10 |

---

## §1: API Failure Wipes Holdings (CRITICAL)

### Problem

`fetchDIDNfts()` returns an empty array when MintGarden returns 429 or any non-200 status. `syncDIDHoldings()` then diffs empty API results against the full DB holdings. Every existing holding appears in `toRemove`, and a batch DELETE wipes them all.

A single rate limit hit on page 1 of a single player's collection deletes ALL their NFT holdings from D1.

```
MintGarden returns 429 → fetchDIDNfts returns [] →
  diff([], currentHoldings) → toRemove = [all holdings] →
  DELETE all from did_holdings for this DID →
  phase1_verified set to 0 →
  Player cannot vote, battle, or see their collection
```

### Fix

**Never delete holdings if the API call was not successful.** Return a success flag alongside the NFT array:

```ts
interface FetchResult {
  success: boolean;
  nfts: NftInfo[];
}

async function fetchDIDNfts(did: string, collectionId: string): Promise<FetchResult> {
  const nfts: NftInfo[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const url = `https://api.mintgarden.io/nfts?collection_id=${collectionId}&owner_did=${encodeURIComponent(did)}&size=${pageSize}&page=${page}`;

    let response: Response;
    try {
      response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    } catch (err) {
      console.error(`[DID Indexer] Network error fetching ${url}:`, err);
      return { success: false, nfts }; // Return partial, flagged as failed
    }

    if (!response.ok) {
      console.error(`[DID Indexer] MintGarden API ${response.status} for ${url}`);
      return { success: false, nfts }; // Partial fetch, do NOT use for diffing
    }

    const data = await response.json() as { items: Array<{...}> };
    if (!data.items || data.items.length === 0) break;

    for (const item of data.items) {
      nfts.push({ id: item.id, edition: item.data?.metadata_json?.edition_number, creator: item.minter_address });
    }

    if (data.items.length < pageSize) break;
    page++;

    // Rate limit between pages (see §3)
    await sleep(RATE_LIMIT_MS);

    // Page cap (see §5)
    if (page > MAX_PAGES) {
      console.warn(`[DID Indexer] Hit page cap (${MAX_PAGES}) for DID ${did.slice(0, 20)}...`);
      break;
    }
  }

  return { success: true, nfts };
}
```

Then in `syncDIDHoldings`:

```ts
async function syncDIDHoldings(env: Env, did: string): Promise<boolean> {
  const phase2Result = await fetchDIDNfts(did, PHASE2_COLLECTION);
  await sleep(RATE_LIMIT_MS);
  const phase1Result = await fetchDIDNfts(did, PHASE1_COLLECTION);

  // CRITICAL: Skip diffing if EITHER fetch failed
  if (!phase2Result.success || !phase1Result.success) {
    console.warn(`[DID Indexer] Skipping diff for DID ${did.slice(0, 20)}... — API fetch incomplete`);
    return false; // No changes applied
  }

  const phase2Nfts = phase2Result.nfts;
  const phase1Nfts = phase1Result.nfts;

  // ... rest of existing diff logic
}
```

**This is the single most important fix in this spec.** It prevents data loss from API instability.

---

## §2: D1 Batch Chunking

### Problem

`env.DB.batch(statements)` is called with an unbounded array. A player with 500 NFTs generates 500 INSERT statements. D1's `batch()` has an undocumented limit (~100 statements) and will fail silently or throw on large batches.

The `workers/fetch-sales/worker.ts` already has this pattern with `D1_BATCH_SIZE = 25`.

### Fix

Add a `batchChunked` utility:

```ts
const D1_BATCH_SIZE = 25;

async function batchChunked(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  for (let i = 0; i < statements.length; i += D1_BATCH_SIZE) {
    const chunk = statements.slice(i, i + D1_BATCH_SIZE);
    await db.batch(chunk);
  }
}
```

Replace `env.DB.batch(statements)` with `await batchChunked(env.DB, statements)` in `syncDIDHoldings`.

---

## §3: Intra-Pagination Rate Limiting

### Problem

`fetchDIDNfts` makes back-to-back requests for each page with no delay. A player with 500 Phase 2 NFTs triggers 5 rapid consecutive requests to MintGarden, increasing 429 risk.

### Fix

Add `await sleep(RATE_LIMIT_MS)` between pagination pages (shown in §1 code sample above). This adds 500ms between each page request.

---

## §4: Retry / Failure Tracking

### Problem

Failed DID syncs are logged to console and forgotten. There is no record of which DIDs failed, how many times, or when they last succeeded. Console logs are ephemeral in Cloudflare Workers.

### Fix (Lightweight — no new tables)

Add a `last_indexed_at` and `last_index_error` column to `game_players`:

```sql
-- Migration: NNN_indexer_tracking.sql
ALTER TABLE game_players ADD COLUMN last_indexed_at TEXT;
ALTER TABLE game_players ADD COLUMN last_index_error TEXT;
ALTER TABLE game_players ADD COLUMN index_error_count INTEGER DEFAULT 0;
```

Update on success:
```ts
await env.DB.prepare(
  "UPDATE game_players SET last_indexed_at = datetime('now'), last_index_error = NULL, index_error_count = 0 WHERE did_id = ?"
).bind(did).run();
```

Update on failure:
```ts
await env.DB.prepare(
  "UPDATE game_players SET last_index_error = ?, index_error_count = index_error_count + 1 WHERE did_id = ?"
).bind(errorMessage.slice(0, 200), did).run();
```

This enables:
- Querying for persistently failing DIDs: `SELECT * FROM game_players WHERE index_error_count > 5`
- Detecting stale players: `SELECT * FROM game_players WHERE last_indexed_at < datetime('now', '-2 hours')`
- Admin dashboard stats in the future

### Fix (Advanced — future consideration)

Use Cloudflare Queues to fan out indexer work per-DID with automatic retries. This is more complex and not needed for the current player count (< 100 players).

---

## §5: Pagination Page Cap

### Problem

`fetchDIDNfts` has a `while(true)` loop with no maximum page count. A buggy API response that always returns `pageSize` items would loop indefinitely until the Worker hits its CPU/wall-clock limit.

### Fix

Add a constant and guard:

```ts
const MAX_PAGES = 50; // 50 pages × 100 NFTs = 5,000 max (far exceeds any realistic collection)
```

Guard added in the `while` loop (shown in §1 code sample).

---

## §6: Failure Visibility in Logs

### Problem

The summary log line `"Done. X/Y players had changes"` does not distinguish between "no changes" and "failed". A run where 50 out of 100 players errored looks identical to a run where those 50 simply had no changes.

### Fix

Add counters:

```ts
let updatedCount = 0;
let errorCount = 0;
let skippedCount = 0; // API fetch incomplete

for (const player of players.results) {
  const did = player.did_id as string;
  try {
    const result = await syncDIDHoldings(env, did);
    if (result === 'changed') updatedCount++;
    else if (result === 'skipped') skippedCount++;
    // 'unchanged' is the third possibility
  } catch (err) {
    console.error(`[DID Indexer] Error for DID ${did}:`, err);
    errorCount++;
  }
  await sleep(RATE_LIMIT_MS);
}

console.log(`[DID Indexer] Done. Changed: ${updatedCount}, Skipped (API issues): ${skippedCount}, Errors: ${errorCount}, Total: ${players.results.length}`);
```

Change `syncDIDHoldings` return type to `'changed' | 'unchanged' | 'skipped'`.

---

## §7: Battle-Resolve Double-Resolution Race

### Problem

`battle-resolve.ts` finds all expired active battles and resolves them in sequence. If called twice concurrently (e.g., manual POST while hourly cron fires), both calls find the same battles before either marks them resolved. Both execute the full resolution: double-awarding `wojak_scores` and double-inserting `game_activity` events.

### Fix

Use an optimistic lock pattern. Change the UPDATE from:

```sql
UPDATE battles SET status = 'completed', winner_nft_id = ?, resolved_at = datetime('now') WHERE id = ?
```

To:

```sql
UPDATE battles SET status = 'completed', winner_nft_id = ?, resolved_at = datetime('now')
WHERE id = ? AND status = 'active'
```

Check the `changes` count after the UPDATE. If 0 changes, another resolver already handled this battle — skip the rest of the batch.

```ts
const updateResult = await env.DB.prepare(`
  UPDATE battles SET status = 'completed', winner_nft_id = ?, resolved_at = datetime('now')
  WHERE id = ? AND status = 'active'
`).bind(winnerNftId, battleId).run();

if (updateResult.meta.changes === 0) {
  console.log(`[Battle Resolve] Battle ${battleId} already resolved by another process, skipping`);
  continue;
}

// Only now do the score updates and activity inserts
await env.DB.batch([...scoreAndActivityStatements]);
```

Same pattern for draw resolution.

---

## §8: Circuit Breaker for Sustained Outages

### Problem

If MintGarden is completely down, every player's fetch fails. With §1's fix, no deletions happen (good), but the indexer still makes 2 × N API calls that all fail, wasting Worker CPU time and potentially hitting MintGarden rate limits harder when it comes back.

### Fix

Add an early-exit circuit breaker:

```ts
const CIRCUIT_BREAKER_THRESHOLD = 5; // consecutive failures before stopping

let consecutiveApiFailures = 0;

for (const player of players.results) {
  if (consecutiveApiFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    console.error(`[DID Indexer] Circuit breaker tripped after ${CIRCUIT_BREAKER_THRESHOLD} consecutive API failures. Aborting run.`);
    break;
  }

  const did = player.did_id as string;
  try {
    const result = await syncDIDHoldings(env, did);
    if (result === 'skipped') {
      consecutiveApiFailures++;
    } else {
      consecutiveApiFailures = 0; // Reset on success
    }
  } catch (err) {
    console.error(`[DID Indexer] Error for DID ${did}:`, err);
    consecutiveApiFailures++;
  }

  await sleep(RATE_LIMIT_MS);
}
```

After 5 consecutive failures (API returns errors for 5 players in a row), the run aborts early. This protects both the Worker and MintGarden from unnecessary load.

---

## §9: `nft_names` Population

### Problem

`nft_names` is only written by `functions/api/mint/process.ts` during NFT minting. If an NFT was minted before migration 045 introduced `nft_names`, or if `process.ts` failed partway through, the name row is missing. The `collection.ts` and `battle-list.ts` queries LEFT JOIN on `nft_names`, so missing rows cause `name` to fallback to `"Your Wojak #N"` — which is acceptable but suboptimal.

### Fix (Optional — Low Priority)

Add a name-backfill step to the indexer that runs ONLY for Phase 2 NFTs missing from `nft_names`:

```ts
async function backfillMissingNames(env: Env): Promise<void> {
  const missing = await env.DB.prepare(`
    SELECT dh.edition_number FROM did_holdings dh
    LEFT JOIN nft_names nn ON dh.edition_number = nn.edition_number
    WHERE dh.collection = 'phase2' AND nn.edition_number IS NULL
    GROUP BY dh.edition_number
    LIMIT 20
  `).all();

  if (missing.results.length === 0) return;

  const statements: D1PreparedStatement[] = [];
  for (const row of missing.results) {
    const edition = row.edition_number as number;
    statements.push(
      env.DB.prepare(
        "INSERT OR IGNORE INTO nft_names (edition_number, full_name) VALUES (?, ?)"
      ).bind(edition, `Your Wojak #${edition}`)
    );
  }

  await batchChunked(env.DB, statements);
  console.log(`[DID Indexer] Backfilled ${missing.results.length} missing nft_names`);
}
```

Call at the end of `run()`, after the main player loop. Limit 20 per run to avoid overhead.

---

## §10: Concurrent Run Prevention

### Problem

If a scheduled run takes longer than 30 minutes (possible with 200+ players and rate limiting), the next cron trigger fires while the first is still running. Both read the same DB state and compute the same diffs. While `INSERT OR IGNORE` prevents duplicate inserts, the concurrent DELETEs and UPDATEs are wasteful and could cause confusing log output.

### Fix (Lightweight)

Use a D1-based lock:

```ts
async function acquireLock(env: Env): Promise<boolean> {
  // Try to claim the lock. If last_run_started is recent (< 25 min), another run is active.
  const result = await env.DB.prepare(`
    UPDATE game_settings SET value = datetime('now')
    WHERE key = 'indexer_last_run_started'
    AND (value IS NULL OR datetime(value) < datetime('now', '-25 minutes'))
  `).run();
  return result.meta.changes > 0;
}

async function releaseLock(env: Env): Promise<void> {
  await env.DB.prepare(
    "UPDATE game_settings SET value = NULL WHERE key = 'indexer_last_run_started'"
  ).run();
}
```

Requires a `game_settings` table (or repurpose an existing key-value mechanism):

```sql
CREATE TABLE IF NOT EXISTS game_settings (key TEXT PRIMARY KEY, value TEXT);
INSERT OR IGNORE INTO game_settings (key, value) VALUES ('indexer_last_run_started', NULL);
```

Wrap `run()`:
```ts
async function run(env: Env) {
  if (!await acquireLock(env)) {
    console.log('[DID Indexer] Another run is still active, skipping.');
    return;
  }
  try {
    // ... existing logic
  } finally {
    await releaseLock(env);
  }
}
```

---

## Implementation Priority

| Priority | Issue | Effort |
|----------|-------|--------|
| **P0** | §1: API failure wipes holdings | Small — modify `fetchDIDNfts` return type + guard in `syncDIDHoldings` |
| **P0** | §7: Battle-resolve double-resolution | Small — add `AND status = 'active'` + changes check |
| **P1** | §2: D1 batch chunking | Small — add `batchChunked` utility |
| **P1** | §3: Intra-pagination rate limit | Tiny — add `await sleep()` in loop |
| **P1** | §6: Failure visibility in logs | Small — add counters |
| **P1** | §8: Circuit breaker | Small — add counter + early exit |
| **P2** | §4: Failure tracking columns | Medium — migration + update logic |
| **P2** | §5: Page cap | Tiny — add constant + guard |
| **P3** | §9: nft_names backfill | Medium — new function + query |
| **P3** | §10: Concurrent run lock | Medium — new table + lock logic |

### Suggested Execution Order

1. §1 + §3 + §5 together (all in `fetchDIDNfts` + `syncDIDHoldings`)
2. §2 (`batchChunked` utility)
3. §6 + §8 together (counters + circuit breaker in `run()`)
4. §7 (battle-resolve optimistic lock — standalone)
5. §4 (migration + tracking — can wait)
6. §9 + §10 (optional, low priority)

---

## Testing

After implementing, verify:

```bash
# 1. Deploy the updated indexer
cd workers/did-indexer && npx wrangler deploy

# 2. Trigger a manual run
curl -s https://did-indexer.YOUR_SUBDOMAIN.workers.dev/run

# 3. Check Worker logs for the new summary format
wrangler tail --name did-indexer

# Expected log line:
# [DID Indexer] Done. Changed: 5, Skipped (API issues): 0, Errors: 0, Total: 12

# 4. Verify holdings are correct
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT did_id, COUNT(*) as nfts FROM did_holdings GROUP BY did_id;"

# 5. Simulate API failure — temporarily set wrong collection ID and verify NO deletions occur
# (revert immediately after test)
```
