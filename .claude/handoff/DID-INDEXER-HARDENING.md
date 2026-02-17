# DID Indexer Hardening — CLI Execution Prompt

> Full spec with analysis and code samples: `docs/specs/did-indexer-hardening.md`
> Read the full spec BEFORE starting. This handoff is the execution order.

---

## CRITICAL CONTEXT

### Anti-patterns (from CLAUDE.md)
- Never `!important` in CSS
- Never change schema without a migration file — `functions/migrations/NNN_description.sql`
- Never add deps without documenting why

### The Problem
The DID indexer has a critical bug: if MintGarden returns a 429 or any error on page 1 of a DID's NFT fetch, `fetchDIDNfts()` returns an empty array. `syncDIDHoldings()` then diffs that empty array against the DB, computing all holdings as "removed," and DELETEs everything. A single rate limit hit wipes a player's entire NFT collection from D1.

---

## EXECUTION ORDER

Do these in exact order. Run `npx tsc -b` after each commit.

---

### Task 1: Fix fetchDIDNfts to return success flag (P0 — CRITICAL)

**File:** `workers/did-indexer/worker.ts`

1. Change the `NftInfo[]` return type to `FetchResult`:

```ts
interface FetchResult {
  success: boolean;
  nfts: NftInfo[];
}
```

2. Rewrite `fetchDIDNfts` to return `{ success: false, nfts: [] }` on any error (network or HTTP), and `{ success: true, nfts }` on full completion. See `docs/specs/did-indexer-hardening.md` §1 for the complete function.

3. Add intra-pagination rate limiting: `await sleep(RATE_LIMIT_MS)` between pages.

4. Add page cap: `const MAX_PAGES = 50;` — break if page exceeds this.

5. In `syncDIDHoldings`, guard against incomplete fetches:

```ts
const phase2Result = await fetchDIDNfts(did, PHASE2_COLLECTION);
await sleep(RATE_LIMIT_MS);
const phase1Result = await fetchDIDNfts(did, PHASE1_COLLECTION);

if (!phase2Result.success || !phase1Result.success) {
  console.warn(`[DID Indexer] Skipping diff for DID ${did.slice(0, 20)}... — API fetch incomplete`);
  return 'skipped';
}

const phase2Nfts = phase2Result.nfts;
const phase1Nfts = phase1Result.nfts;
```

6. Change `syncDIDHoldings` return type from `boolean` to `'changed' | 'unchanged' | 'skipped'`.

**Commit:** `fix(critical): prevent DID indexer from wiping holdings on MintGarden API errors`

---

### Task 2: Add D1 batch chunking

**File:** `workers/did-indexer/worker.ts`

1. Add utility function:

```ts
const D1_BATCH_SIZE = 25;

async function batchChunked(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  for (let i = 0; i < statements.length; i += D1_BATCH_SIZE) {
    const chunk = statements.slice(i, i + D1_BATCH_SIZE);
    await db.batch(chunk);
  }
}
```

2. Replace `await env.DB.batch(statements)` in `syncDIDHoldings` with `await batchChunked(env.DB, statements)`.

**Commit:** `fix: chunk D1 batch writes to avoid exceeding batch limits in DID indexer`

---

### Task 3: Add logging counters + circuit breaker

**File:** `workers/did-indexer/worker.ts`

1. In `run()`, add counters:

```ts
let updatedCount = 0;
let errorCount = 0;
let skippedCount = 0;
const CIRCUIT_BREAKER_THRESHOLD = 5;
let consecutiveApiFailures = 0;
```

2. Add circuit breaker check at top of player loop:

```ts
if (consecutiveApiFailures >= CIRCUIT_BREAKER_THRESHOLD) {
  console.error(`[DID Indexer] Circuit breaker tripped after ${CIRCUIT_BREAKER_THRESHOLD} consecutive API failures. Aborting run.`);
  break;
}
```

3. Update the per-player result tracking:

```ts
const result = await syncDIDHoldings(env, did);
if (result === 'changed') { updatedCount++; consecutiveApiFailures = 0; }
else if (result === 'skipped') { skippedCount++; consecutiveApiFailures++; }
else { consecutiveApiFailures = 0; } // 'unchanged' resets circuit breaker
```

4. In the catch block:
```ts
errorCount++;
consecutiveApiFailures++;
```

5. Update summary log:
```ts
console.log(`[DID Indexer] Done. Changed: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}, Total: ${players.results.length}`);
```

**Commit:** `fix: add circuit breaker and detailed logging to DID indexer`

---

### Task 4: Fix battle-resolve double-resolution race

**File:** `functions/api/game/battle-resolve.ts`

1. Change the UPDATE query for completed battles to include an optimistic lock:

```sql
UPDATE battles SET status = 'completed', winner_nft_id = ?, resolved_at = datetime('now')
WHERE id = ? AND status = 'active'
```

2. Check `meta.changes` before proceeding with score updates:

```ts
const updateResult = await env.DB.prepare(`
  UPDATE battles SET status = 'completed', winner_nft_id = ?, resolved_at = datetime('now')
  WHERE id = ? AND status = 'active'
`).bind(winnerNftId, battleId).run();

if (updateResult.meta.changes === 0) {
  console.log(`[Battle Resolve] Battle ${battleId} already resolved, skipping`);
  continue;
}
```

3. Do the same for draw resolution — the draw UPDATE should also include `AND status = 'active'` and check changes.

4. Move the score update and activity insert AFTER the status check (don't include them in the same batch as the status update — they should only execute if the status update succeeded).

**Commit:** `fix: prevent double-resolution race in battle-resolve with optimistic lock`

---

### Task 5 (optional): Add indexer tracking columns

**File:** New migration + `workers/did-indexer/worker.ts`

1. Create migration `functions/migrations/NNN_indexer_tracking.sql`:

```sql
ALTER TABLE game_players ADD COLUMN last_indexed_at TEXT;
ALTER TABLE game_players ADD COLUMN last_index_error TEXT;
ALTER TABLE game_players ADD COLUMN index_error_count INTEGER DEFAULT 0;
```

2. In `syncDIDHoldings` (or after it returns in `run()`), update tracking:

On success:
```ts
await env.DB.prepare(
  "UPDATE game_players SET last_indexed_at = datetime('now'), last_index_error = NULL, index_error_count = 0 WHERE did_id = ?"
).bind(did).run();
```

On failure/skip:
```ts
await env.DB.prepare(
  "UPDATE game_players SET last_index_error = ?, index_error_count = index_error_count + 1 WHERE did_id = ?"
).bind(errorMessage.slice(0, 200), did).run();
```

3. Run the migration:
```bash
npx wrangler d1 execute wojak-users --remote --file functions/migrations/NNN_indexer_tracking.sql
```

**Commit:** `feat: add indexer tracking columns to game_players for failure monitoring`

---

## FINAL VERIFICATION

```bash
# Type check
npx tsc -b

# Deploy indexer
cd workers/did-indexer && npx wrangler deploy

# Deploy battle-cron (if battle-resolve.ts changed)
npm run build && npx wrangler pages deploy dist

# Trigger manual run and tail logs
curl -s https://did-indexer.YOUR_SUBDOMAIN.workers.dev/run &
wrangler tail --name did-indexer

# Expected log format:
# [DID Indexer] Done. Changed: 5, Skipped: 0, Errors: 0, Total: 12
```
