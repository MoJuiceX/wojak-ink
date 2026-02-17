# Game Performance & Indexing

> **Priority:** Medium — not urgent at current scale (< 100 players, < 5,000 NFTs), but will become critical at 1,000+ players.
> **Scope:** SQL indexes, feed query optimization, DID indexer scaling, stale data management.

---

## Current Scale

| Table | Estimated Rows | Growth Rate |
|-------|---------------|-------------|
| `game_players` | ~10-50 | Slow (new registrations) |
| `phase2_mints` | ~4-100 | Moderate (user-generated) |
| `did_holdings` | ~50-500 | Moderate (indexer refreshes) |
| `wojak_votes` | ~100-1,000 | Fast (10 votes/day/player) |
| `wojak_scores` | ~4-100 | Same as phase2_mints |
| `battles` | ~10-50 | Moderate |
| `game_activity` | ~50-500 | Fast (multiple events per action) |
| `credit_events` | ~100-500 | Moderate |

At this scale, everything is fast. The issues below become real at 10x-100x these numbers.

---

## Issue 1: Feed Query — Full Table Scan with Expensive Subqueries

**File:** `functions/api/game/feed.ts` (lines 36-73)

The feed query is the most expensive game query. For each request, it:

1. Scans all `phase2_mints` WHERE `status = 'minted' AND mintgarden_launcher_id IS NOT NULL`
2. For each row, runs three NOT EXISTS subqueries:
   - Check if voter already voted on this NFT (scan `wojak_votes`)
   - Check if NFT was created by the voter (compare `wallet_address`)
   - Check if voter holds this NFT (scan `did_holdings`)
3. LEFT JOINs `wojak_scores` and `nft_names`
4. Orders by a random weighted formula (can't use an index)
5. Limits to 10-20 results

### Missing indexes

```sql
-- Speed up the "already voted" exclusion
CREATE INDEX IF NOT EXISTS idx_wojak_votes_voter_nft
  ON wojak_votes (voter_did, nft_id);

-- Speed up the "voter holds this NFT" exclusion
CREATE INDEX IF NOT EXISTS idx_did_holdings_did_nft
  ON did_holdings (did_id, nft_id);

-- Speed up the feed base query (minted NFTs with launcher ID)
CREATE INDEX IF NOT EXISTS idx_pm_feed
  ON phase2_mints (status, mintgarden_launcher_id)
  WHERE status = 'minted' AND mintgarden_launcher_id IS NOT NULL;
```

Check if `idx_wojak_votes_nft` already exists (it was mentioned in migration 045) — it may cover `(voter_did, nft_id)` or just `(nft_id)`. If the latter, a composite index is needed.

### Future optimization: Materialized "voteable" table

At 10,000+ mints and 50,000+ votes, the NOT EXISTS subqueries become expensive. A pre-computed table could help:

```sql
CREATE TABLE voteable_feed (
  did_id TEXT NOT NULL,
  nft_id TEXT NOT NULL,
  edition_number INTEGER,
  weight REAL DEFAULT 1.0,
  PRIMARY KEY (did_id, nft_id)
);
```

Populated by a background job that pre-computes which NFTs each DID hasn't voted on. The feed query becomes a simple SELECT from this table. **Don't build this yet** — only when feed latency exceeds 500ms.

---

## Issue 2: Activity Query Missing Index

**File:** `functions/api/game/activity.ts`

```sql
SELECT * FROM game_activity WHERE did_id = ? ORDER BY created_at DESC LIMIT ?
```

Needs a composite index:

```sql
CREATE INDEX IF NOT EXISTS idx_game_activity_did_created
  ON game_activity (did_id, created_at DESC);
```

---

## Issue 3: Leaderboard Query Performance

**File:** `functions/api/game/leaderboard.ts`

```sql
SELECT did_id, wallet_address, power_level FROM game_players
ORDER BY power_level DESC LIMIT ? OFFSET ?
```

Needs an index:

```sql
CREATE INDEX IF NOT EXISTS idx_game_players_power
  ON game_players (power_level DESC);
```

**File:** `functions/api/game/top-wojaks.ts` (if it exists)

The top-wojaks query likely orders by `net_score` from `wojak_scores`:

```sql
CREATE INDEX IF NOT EXISTS idx_wojak_scores_net
  ON wojak_scores (net_score DESC);
```

---

## Issue 4: DID Indexer Scaling

**Current behavior:** Sequential processing of ALL players, 2 API calls per player, 500ms rate limit between each. O(N) wall-clock time.

| Players | Time per run | Runs per hour | Risk |
|---------|-------------|---------------|------|
| 50 | ~75s | 2 | None |
| 200 | ~5 min | 2 | None |
| 500 | ~12 min | 2 | Getting close |
| 1,000 | ~25 min | 2 | May overlap |
| 2,000 | ~50 min | 2 | Will overlap |

### Scaling options (in order of complexity)

**Option A: Skip inactive players (recommended first step)**

Only index players who have been active recently:

```ts
const players = await env.DB.prepare(`
  SELECT did_id, wallet_address FROM game_players
  WHERE updated_at > datetime('now', '-7 days')
     OR last_indexed_at IS NULL
     OR last_indexed_at < datetime('now', '-24 hours')
  ORDER BY COALESCE(last_indexed_at, '2000-01-01') ASC
  LIMIT 200
`).all();
```

This prioritizes: players who were never indexed, players not indexed in 24h, and recently active players. Caps at 200 per run. Inactive players (no activity in 7 days) drop to once-daily indexing.

Requires the `last_indexed_at` column from the DID Indexer Hardening spec.

**Option B: Parallel fan-out with Cloudflare Queues**

Instead of sequential processing, publish each DID to a Queue. A consumer Worker processes them in parallel (with concurrency controls). This removes the sequential bottleneck.

Higher complexity. Save for when player count exceeds 1,000.

**Option C: Event-driven updates**

Instead of polling all players every 30 minutes, only update when something changes:
- After a mint completes, update the minter's holdings immediately
- After a burn, remove from holdings immediately (already done by `burn.ts`)
- Use the 30-minute cron only as a catch-all reconciliation for transfers detected on-chain

This is the ideal architecture but requires webhook support or change detection.

---

## Issue 5: Power Level Staleness

**Problem:** `game_players.power_level` is only updated when someone explicitly calls `GET /api/game/power-level?did=`. The leaderboard sorts by this cached value. After battles resolve (changing `wojak_scores`), after burns (removing holdings), and after the DID indexer updates holdings, the power level is stale.

### Fix options

**Option A: Trigger recalc from the DID indexer (recommended)**

After `syncDIDHoldings` reports changes for a DID, call the power-level calculation for that player:

```ts
if (result === 'changed') {
  // Recalc power level inline
  await recalcPowerLevel(env, did);
  updatedCount++;
}
```

Extract the calculation logic from `power-level.ts` into a shared function that can be called from both the API endpoint and the indexer.

**Option B: Periodic batch recalc**

Add a cron job that recalculates all power levels every hour:

```sql
-- For each player, recalc and update
UPDATE game_players SET power_level = (
  -- ... inline the formula
) WHERE did_id = ?
```

Simpler but less responsive.

**Option C: Mark dirty, recalc on read**

Add a `power_level_dirty` flag. Set it to 1 after any event that changes inputs (burn, battle resolve, indexer change). When `power-level.ts` is called, always recalc if dirty. The leaderboard would show stale values between explicit calls.

**Recommendation:** Option A is best — the indexer already knows when holdings change and can trigger recalc immediately.

---

## Issue 6: `wojak_votes` Table Growth

`wojak_votes` grows by up to 10 rows per player per day. With 100 daily active players, that's 1,000 rows/day or 365,000 rows/year. The table is queried by:
- `feed.ts`: NOT EXISTS subquery per feed item per request
- `vote.ts`: UNIQUE constraint check on insert

### Index check

Migration 045 creates `idx_wojak_votes_nft` — verify it's `(voter_did, nft_id)` not just `(nft_id)`. If the latter, the feed's NOT EXISTS subquery can't efficiently look up "has this voter voted on this NFT?"

If the index is only on `nft_id`, add:

```sql
CREATE INDEX IF NOT EXISTS idx_wojak_votes_voter_nft
  ON wojak_votes (voter_did, nft_id);
```

### Future: Archive old votes

Votes older than 90 days are rarely queried (the feed only cares about "has this DID voted on this NFT ever"). They could be archived to a `wojak_votes_archive` table to keep the main table small. **Not needed yet.**

---

## Migration: All Indexes

Combine all missing indexes into one migration:

```sql
-- Migration: NNN_game_indexes.sql

-- Feed query: voter already voted on this NFT
CREATE INDEX IF NOT EXISTS idx_wojak_votes_voter_nft
  ON wojak_votes (voter_did, nft_id);

-- Feed query: voter holds this NFT
CREATE INDEX IF NOT EXISTS idx_did_holdings_did_nft
  ON did_holdings (did_id, nft_id);

-- Activity feed: events by DID ordered by time
CREATE INDEX IF NOT EXISTS idx_game_activity_did_created
  ON game_activity (did_id, created_at DESC);

-- Leaderboard: players ordered by power level
CREATE INDEX IF NOT EXISTS idx_game_players_power
  ON game_players (power_level DESC);

-- Top Wojaks: scores ordered by net score
CREATE INDEX IF NOT EXISTS idx_wojak_scores_net
  ON wojak_scores (net_score DESC);

-- Collection: holdings by DID
CREATE INDEX IF NOT EXISTS idx_did_holdings_did
  ON did_holdings (did_id);

-- Battle list: active battles by end time
CREATE INDEX IF NOT EXISTS idx_battles_status_ends
  ON battles (status, ends_at);

-- Credit balance: credits by wallet
CREATE INDEX IF NOT EXISTS idx_credit_events_wallet
  ON credit_events (wallet_address);
```

**Note:** Check which of these already exist in migrations 045/049 before creating duplicates. `CREATE INDEX IF NOT EXISTS` is safe but wastes migration time.

---

## Implementation Priority

| # | Issue | When to Fix | Effort |
|---|-------|-------------|--------|
| 1 | Missing SQL indexes | Now (migration only, zero risk) | Small |
| 2 | Activity query index | Now | Tiny |
| 3 | Leaderboard index | Now | Tiny |
| 4 | DID indexer scaling (Option A) | After indexer hardening | Small |
| 5 | Power level staleness | After indexer hardening | Medium |
| 6 | Vote table growth | When rows > 100k | Small |
| — | Materialized feed | When feed latency > 500ms | Large |
| — | Queue-based indexer | When players > 1,000 | Large |
