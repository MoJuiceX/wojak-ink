# DID Indexer Fix Spec

> **Priority:** HIGH — Holdings never sync; `did_holdings` table stays empty
> **File:** `workers/did-indexer/worker.ts`
> **Root cause:** `fetchDIDNfts()` calls a non-existent MintGarden endpoint (returns 404)
> **Date:** 2026-02-18

---

## Problem

### The Broken Call (line 220)

```ts
const url = `https://api.mintgarden.io/nfts?collection_id=${collectionId}&owner_did=${encodeURIComponent(did)}&size=${pageSize}&page=${page}`;
```

**This endpoint does not exist.** Verified: `GET /nfts?collection_id=X&owner_did=Y` returns 404.

The root `/nfts` path only works as `/nfts/{encoded_id}` for individual NFT lookup.

### Impact

Every call to `fetchDIDNfts()` returns `{ success: false, nfts: [] }` (line 229-234). This causes `syncDIDHoldings()` to return `'skipped'` (line 129). For every player, on every run:

1. Holdings are never synced → `did_holdings` table stays **empty**
2. `skippedCount` increments → `consecutiveApiFailures` increments (line 73)
3. After 5 players, circuit breaker trips (line 58-60) → run aborts
4. `game_players.last_index_error` gets set to `'API fetch incomplete'`
5. `game_players.index_error_count` steadily increases

### Downstream effects of empty `did_holdings`:
- **Feed exclusion broken:** `NOT EXISTS (SELECT 1 FROM did_holdings WHERE did_id = ? AND nft_id = ?)` always passes → users see their own NFTs in the voting feed
- **Vote self-check broken:** `SELECT 1 FROM did_holdings WHERE did_id = ? AND nft_id = ?` in vote.ts line 72-73 never matches → users can vote on NFTs they own
- **Phase 1 re-verification broken:** Line 194-197 sets `phase1_verified` based on `phase1Nfts.length > 0`, but since fetch always fails, it never updates. Currently benign because `verify-phase1.ts` sets it separately, but the indexer was supposed to also revoke verification if NFT is transferred.

---

## Correct MintGarden Endpoints (from MINTGARDEN-API.md)

| Endpoint | Filters | Status |
|----------|---------|--------|
| `GET /profile/{did}/nfts?type=owned&size=100` | No collection filter, returns ALL owned NFTs | ✅ 200 |
| `GET /address/{xch}/nfts?type=owned&collection_id={col}&size=100` | Has collection filter | ✅ 200 |
| ~~`GET /nfts?collection_id=X&owner_did=Y`~~ | ~~N/A~~ | ❌ 404 |

---

## Recommended Fix: Use `/profile/{did}/nfts`

**Why this over `/address/{xch}/nfts`:**
- `fetchDIDNfts` receives `did` (not wallet address) — no lookup needed
- Consistent with `verify-phase1.ts` slow path
- The indexer already calls this for both Phase 1 and Phase 2, so getting all NFTs in one call is actually more efficient

### Approach: Single call per player, filter client-side

Instead of 2 calls per player (one per collection), make **1 paginated call** to get all owned NFTs, then partition by `collection_id`.

---

## Exact Code Changes

### Replace `fetchDIDNfts` (lines 214-263)

```ts
interface NftInfo {
  id: string;         // bech32m encoded_id (nft1...)
  collection: string; // 'phase1' | 'phase2' | 'unknown'
  edition?: number;
  creator?: string;
}

interface FetchAllResult {
  success: boolean;
  phase1Nfts: NftInfo[];
  phase2Nfts: NftInfo[];
}

/**
 * Fetch ALL owned NFTs for a DID from MintGarden, partitioned by collection.
 * Uses /profile/{did}/nfts?type=owned which returns all collections.
 * Client-side filters into Phase 1 and Phase 2.
 */
async function fetchDIDOwnedNfts(did: string): Promise<FetchAllResult> {
  const allNfts: NftInfo[] = [];
  let cursor: string | null = null;
  let pages = 0;
  const pageSize = 100;

  while (pages < MAX_PAGES) {
    let url = `https://api.mintgarden.io/profile/${encodeURIComponent(did)}/nfts?type=owned&size=${pageSize}`;
    if (cursor) {
      url += `&page=${encodeURIComponent(cursor)}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });
    } catch (err) {
      console.error(`[DID Indexer] Network error fetching ${url}:`, err);
      return { success: false, phase1Nfts: [], phase2Nfts: [] };
    }

    if (!response.ok) {
      console.error(`[DID Indexer] MintGarden API error: ${response.status} for DID ${did.slice(0, 20)}...`);
      return { success: false, phase1Nfts: [], phase2Nfts: [] };
    }

    const data = await response.json() as {
      items: Array<{
        encoded_id?: string;
        id?: string;
        collection_id?: string;
        edition_number?: number;
        creator_address_encoded_id?: string;
      }>;
      next?: string | null;
    };

    if (!data.items || data.items.length === 0) break;

    for (const item of data.items) {
      const nftId = item.encoded_id || item.id;
      if (!nftId) continue;

      let collection: 'phase1' | 'phase2' | 'unknown' = 'unknown';
      if (item.collection_id === PHASE1_COLLECTION) collection = 'phase1';
      else if (item.collection_id === PHASE2_COLLECTION) collection = 'phase2';

      if (collection !== 'unknown') {
        allNfts.push({
          id: nftId,
          collection,
          edition: item.edition_number,
          creator: item.creator_address_encoded_id,
        });
      }
    }

    // Cursor-based pagination
    if (!data.next || data.items.length < pageSize) break;
    cursor = data.next;
    pages++;

    // Rate limit between pages
    await sleep(RATE_LIMIT_MS);
  }

  return {
    success: true,
    phase1Nfts: allNfts.filter(n => n.collection === 'phase1'),
    phase2Nfts: allNfts.filter(n => n.collection === 'phase2'),
  };
}
```

### Update `syncDIDHoldings` (lines 120-200)

Replace the two separate `fetchDIDNfts` calls with the single combined call:

```ts
async function syncDIDHoldings(env: Env, did: string): Promise<'changed' | 'unchanged' | 'skipped'> {
  // Single API call fetches all owned NFTs, partitioned by collection
  const result = await fetchDIDOwnedNfts(did);

  if (!result.success) {
    console.warn(`[DID Indexer] Skipping diff for DID ${did.slice(0, 20)}... — API fetch incomplete`);
    return 'skipped';
  }

  const { phase1Nfts, phase2Nfts } = result;

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

  console.log(`[DID Indexer] DID ${did.slice(0, 20)}...: +${toAdd.length} -${toRemove.length} NFTs (P1: ${phase1Nfts.length}, P2: ${phase2Nfts.length})`);
  return 'changed';
}
```

### Delete `fetchDIDNfts` and `NftInfo`/`FetchResult` (lines 203-263)

Replace with the new `fetchDIDOwnedNfts` and updated types shown above.

---

## Key Behavioral Changes

| Before | After |
|--------|-------|
| 2 API calls per player (Phase 1 + Phase 2) | 1 paginated call per player (all collections) |
| Always 404 → `{ success: false }` | Actual data returned |
| Uses page numbers (`page=1, 2, 3...`) | Uses cursor strings from `next` field |
| NFT IDs stored as hex `item.id` | NFT IDs stored as bech32m `item.encoded_id` (preferred) |
| Circuit breaker trips after 5 players | Circuit breaker only trips on real failures |

---

## ⚠️ Important: ID Format Consistency

The old code used `item.id` (hex internal ID). The new code prefers `item.encoded_id` (bech32m `nft1...`).

**This means:**
- New `did_holdings` entries will have bech32m `nft_id` values
- The feed query joins on: `dh.nft_id = pm.mintgarden_launcher_id`
- If `phase2_mints.mintgarden_launcher_id` stores hex but `did_holdings.nft_id` stores bech32m, the join won't match

**This is related to the LAUNCHER-ID-FORMAT.md spec.** The fix here should use the same format that `phase2_mints.mintgarden_launcher_id` stores. If that's hex, use `item.id`. If bech32m, use `item.encoded_id`.

**Safe default:** Keep using `item.encoded_id || item.id` (same as `detectLauncherByWallet`) and ensure `phase2_mints` also stores bech32m. See LAUNCHER-ID-FORMAT.md for the full analysis.

---

## Testing

1. **Unit test the new function** with a known DID that holds NFTs:
   ```bash
   curl -s "https://api.mintgarden.io/profile/did:chia:15j5d0fm0x65nz7w6jr4c5any8mzrkru2x6l9uy2f0vcrc6jfedcqp20n4q/nfts?type=owned&size=5" | jq '.items | length'
   ```

2. **Manually trigger the indexer** after deploy:
   ```bash
   curl -H "Authorization: Bearer $ADMIN_SECRET" https://did-indexer.wojak-ink.workers.dev/run
   ```

3. **Verify `did_holdings` populated:**
   ```sql
   SELECT COUNT(*) FROM did_holdings;
   SELECT did_id, COUNT(*) as count FROM did_holdings GROUP BY did_id;
   ```

4. **Verify circuit breaker doesn't trip:** Check logs for `Circuit breaker tripped` — should no longer appear.

5. **Verify Phase 1 status updates:** Check `game_players.phase1_verified` matches actual holdings.

---

## Files to Change

| File | Change |
|------|--------|
| `workers/did-indexer/worker.ts` | Replace `fetchDIDNfts` with `fetchDIDOwnedNfts`, update `syncDIDHoldings` |

**No migration needed** — the `did_holdings` table schema doesn't change, only the data that populates it.

---

## Commit Message

```
fix(did-indexer): replace broken MintGarden endpoint with working profile API

The /nfts?collection_id=X&owner_did=Y endpoint returns 404 (doesn't exist).
Switched to /profile/{did}/nfts?type=owned with cursor-based pagination and
client-side collection filtering. Also reduced from 2 API calls per player
to 1 paginated call. Fixes: did_holdings never populated, circuit breaker
tripping on every run, feed exclusion not working.
```
