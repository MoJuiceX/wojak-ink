# Wojak Swipe — Master Execution Prompt

> **This is a self-contained execution plan. Read each phase's spec file BEFORE starting that phase.**
> **Run `npx tsc -b` after every commit. Run `npm run build` at the end of each phase.**
> **If a build fails, fix it before moving to the next phase.**

---

## CANONICAL COLLECTION IDs (use everywhere)

```
Wojak Farmers Plot (Phase 1): col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah
Your Wojak (Phase 2):         col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx
```

## ANTI-PATTERNS (from CLAUDE.md — never violate these)

- Never `!important` in CSS
- Use `var(--color-*)` for colors, Tailwind for layout only
- Use theme classes: `.card`, `.card-static`, `.btn`, `.btn-primary`, `.badge`
- Never self-fetch own API endpoints
- Never change schema without a migration file in `functions/migrations/`
- Never add deps without documenting why in commit message

---

# ═══════════════════════════════════════════════
# PHASE 4: Game Polish & Bug Fixes
# ═══════════════════════════════════════════════
#
# Spec: docs/specs/wojak-swipe-phase4.md
# Handoff: .claude/handoff/WOJAK-SWIPE-PHASE4.md
#
# Read .claude/handoff/WOJAK-SWIPE-PHASE4.md for the full
# execution order with code samples. Summary below.
# ═══════════════════════════════════════════════

## Phase 4 Tasks (in order)

**Check if each task was already done by a previous CLI session. Read the relevant file first. If the fix is already present, skip to the next task.**

### BLOCKER A: Fix collection IDs (3 files)

Check `workers/did-indexer/worker.ts` lines 11-12 and `functions/api/game/_shared.ts` lines 4-5. If the collection IDs are already correct (matching the canonical IDs above), skip this blocker.

If not fixed:
1. `workers/did-indexer/worker.ts`: Set PHASE1_COLLECTION and PHASE2_COLLECTION to correct IDs
2. `functions/api/game/_shared.ts`: Set PHASE1_COLLECTION_ID and PHASE2_COLLECTION_ID to correct IDs
3. Commit: `fix(critical): correct collection IDs in game system`

### BLOCKER B: Fix nftCoinId in burn flow

Check `src/components/game/CollectionScroll.tsx` — look for how `nftCoinId` is passed to `NftDetailModal` or `BurnButton`. If it fetches from MintGarden API on demand (not passing `nft.nftId` directly), skip.

If not fixed:
1. Add state for coinId + loading in the modal
2. Add handleBurnClick that fetches `https://api.mintgarden.io/nfts/${nft.nftId}` to get the real coin ID
3. Show BurnButton only after coinId is loaded
4. Commit: `fix(critical): fetch real nftCoinId from MintGarden before burn`

### BLOCKER C: Deduplicate battle resolution

Check `workers/did-indexer/worker.ts` — if there is still an inline `resolveBattles()` function, remove it and the `await resolveBattles(env)` call. The canonical resolution lives in `functions/api/game/battle-resolve.ts`. If already removed, skip.

Commit: `fix: remove duplicate battle resolution from DID indexer`

### Task 1: Power level recalc + collection refresh after burn

In `CollectionScroll.tsx`:
- Destructure `refreshPowerLevel` from `useGame()` in NftDetailModal
- Add refreshKey state to CollectionScroll, pass refresh callback to modal
- onBurned calls refreshPowerLevel() AND triggers collection re-fetch

Commit: `fix: recalculate power level and refresh collection after burn`

### Task 2: Fix LatestEventBanner event types

In `LatestEventBanner.tsx`:
- Replace `battle_result` handling with `battle_won`, `battle_lost`, `battle_draw`
- Update formatEvent() for each actual event type with correct data shapes
- See handoff for exact format strings

Commit: `fix: align LatestEventBanner with actual game_activity event types`

### Task 3: Image fallback for MintGarden thumbnails

Add `onError` handler to every `<img>` using `assets.mintgarden.io` in:
- `SwipeCard.tsx`
- `CollectionScroll.tsx` (thumbnails + modal)
- `ActiveBattleCard.tsx` (both images)

Use inline SVG data URI fallback (see handoff for the exact string).

Commit: `fix: add image fallback for MintGarden thumbnail failures`

### Task 4: Vote failure feedback

In `VotingFeed.tsx`, add `.then()/.catch()` to the `castVote()` call with `toast.error('Vote failed to save')`.

Commit: `fix: show toast when vote fails to save`

### Task 5: Burn error feedback

In `BurnButton.tsx`, add error state. In catch block, `setError('Burn failed. Your NFT was not destroyed.')`. Clear error when dialog opens.

Commit: `fix: show error message when burn fails`

### Task 6: CollectionScroll error state

Add error state + retry button. On fetch failure, show "Couldn't load collection." with a Retry button that re-triggers the fetch.

Commit: `fix: show error state with retry when collection fails to load`

### Task 7: Add rank + credits to power-level response

In `functions/api/game/power-level.ts`, add rank query (`SELECT COUNT(*) as above FROM game_players WHERE power_level > ?`) and credits query (`SELECT COALESCE(SUM(credits_earned), 0) FROM credit_events WHERE wallet_address = ?`). Add both to response JSON.

Commit: `feat: include rank and credits in power-level API response`

### Task 8 (optional): Feed append instead of replace

In `GameContext.tsx`, change `setFeed(data.feed)` to append new items using a Set for deduplication.

Commit: `fix: append new feed items instead of replacing to prevent flicker`

### Task 9 (optional): Remove misleading vote undo

Remove the undo feature from VotingFeed.tsx and VoteButtons.tsx — it only changes local state, the backend vote is already recorded.

Commit: `chore: remove UI-only vote undo to avoid misleading users`

## Phase 4 Gate

```bash
npx tsc -b && npm run build
```

Both must pass. Fix any errors before proceeding.

---

# ═══════════════════════════════════════════════
# SMOKE TEST (abbreviated — verify critical paths)
# ═══════════════════════════════════════════════
#
# Full spec: docs/specs/wojak-swipe-smoke-test.md
#
# You can't run a full manual smoke test, but you CAN
# verify the API layer and type safety. Do these checks:
# ═══════════════════════════════════════════════

## API Smoke Checks

```bash
# 1. Verify the build succeeded (already done above)

# 2. Verify collection IDs are correct in deployed code
grep -n "col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah" workers/did-indexer/worker.ts functions/api/game/_shared.ts
grep -n "col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx" workers/did-indexer/worker.ts functions/api/game/_shared.ts
# Both should return matches in both files

# 3. Verify no duplicate battle resolution
grep -n "resolveBattles" workers/did-indexer/worker.ts
# Should NOT find a function definition — only potentially a fetch() call to the API

# 4. Verify image fallback exists
grep -n "onError" src/components/game/SwipeCard.tsx src/components/game/CollectionScroll.tsx src/components/game/ActiveBattleCard.tsx
# Should find onError handlers in all three files

# 5. Verify vote error handling
grep -n "toast.error" src/components/game/VotingFeed.tsx
# Should find toast.error for vote failure

# 6. Verify rank/credits in power-level response
grep -n "rank" functions/api/game/power-level.ts
grep -n "credits" functions/api/game/power-level.ts
# Should find rank and credits being added to the response

# 7. Type check everything
npx tsc -b
```

If any check fails, go back and fix it before proceeding.

---

# ═══════════════════════════════════════════════
# SPEC 2: DID INDEXER HARDENING
# ═══════════════════════════════════════════════
#
# Spec: docs/specs/did-indexer-hardening.md
# Handoff: .claude/handoff/DID-INDEXER-HARDENING.md
#
# Read the handoff for exact code. Summary below.
# ═══════════════════════════════════════════════

### Task H1: Fix fetchDIDNfts to return success flag (CRITICAL)

In `workers/did-indexer/worker.ts`:

1. Create `FetchResult` interface: `{ success: boolean; nfts: NftInfo[] }`
2. Rewrite `fetchDIDNfts` to return `FetchResult`. On any fetch error or non-200 response, return `{ success: false, nfts: partial }` instead of just returning partial results
3. Add `await sleep(RATE_LIMIT_MS)` between pagination pages
4. Add `MAX_PAGES = 50` constant and guard against infinite loops
5. In `syncDIDHoldings`, check `phase2Result.success && phase1Result.success` before diffing. If either failed, return `'skipped'` (no changes applied — **never delete holdings based on incomplete API data**)
6. Change `syncDIDHoldings` return type to `'changed' | 'unchanged' | 'skipped'`

Commit: `fix(critical): prevent DID indexer from wiping holdings on MintGarden API errors`

### Task H2: Add D1 batch chunking

Add `batchChunked()` utility (chunk size 25, matching `workers/fetch-sales/worker.ts` pattern). Replace `env.DB.batch(statements)` with `batchChunked(env.DB, statements)`.

Commit: `fix: chunk D1 batch writes to avoid exceeding batch limits in DID indexer`

### Task H3: Logging counters + circuit breaker

In `run()`:
- Add `updatedCount`, `errorCount`, `skippedCount` counters
- Add circuit breaker: `consecutiveApiFailures` counter, abort after 5 consecutive failures
- Update summary log: `Changed: X, Skipped: Y, Errors: Z, Total: N`

Commit: `fix: add circuit breaker and detailed logging to DID indexer`

### Task H4: Battle-resolve optimistic lock

In `functions/api/game/battle-resolve.ts`:
- Change UPDATE WHERE to include `AND status = 'active'`
- Check `meta.changes === 0` — if already resolved, skip score updates
- Do the same for draw resolution

Commit: `fix: prevent double-resolution race in battle-resolve with optimistic lock`

### Task H5 (optional): Indexer tracking columns

1. Create migration `functions/migrations/NNN_indexer_tracking.sql` with `last_indexed_at`, `last_index_error`, `index_error_count` columns on `game_players`
2. Update indexer to write these after each player sync

Commit: `feat: add indexer tracking columns to game_players for failure monitoring`

## Indexer Hardening Gate

```bash
npx tsc -b && npm run build
```

---

# ═══════════════════════════════════════════════
# SPEC 4: SECURITY HARDENING (Layers 1-2)
# ═══════════════════════════════════════════════
#
# Spec: docs/specs/game-security-hardening.md
#
# Layer 1 is tiny. Layer 2 is mechanical. Layer 3 needs
# a migration and is optional for this run.
# ═══════════════════════════════════════════════

### Task S1: Layer 1 — ADMIN_SECRET on battle-resolve

In `functions/api/game/battle-resolve.ts`, add at the top of `onRequestPost`:

```ts
const authHeader = context.request.headers.get('Authorization');
if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

Add `ADMIN_SECRET?: string;` to the Env interface if not present.

Then update wherever battle-resolve is called (DID indexer or battle-cron worker) to send the `Authorization: Bearer ${env.ADMIN_SECRET}` header. Check the DID indexer's `run()` function — if it calls `fetch('https://wojak.ink/api/game/battle-resolve', ...)`, add the auth header.

Commit: `fix: require ADMIN_SECRET auth on battle-resolve endpoint`

### Task S2: Layer 1 — ADMIN_SECRET on DID indexer /run

In `workers/did-indexer/worker.ts`, add auth check on the `/run` path:

```ts
if (url.pathname === '/run') {
  const authHeader = request.headers.get('Authorization');
  if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  await run(env);
  return new Response('DID indexer run complete');
}
```

Add `ADMIN_SECRET?: string;` to the Env interface.

Commit: `fix: require auth on DID indexer manual trigger endpoint`

### Task S3: Layer 2 — Clerk JWT on game write endpoints

**This is the biggest task in this phase. Take it methodically.**

1. First, update `GameContext.tsx` (frontend) to send Clerk JWT with every game API call:

Read how `CurrencyContext.tsx` or another context calls `Clerk.getToken()`. Then add a helper to `GameContext.tsx`:

```tsx
const getAuthHeaders = async (): Promise<HeadersInit> => {
  try {
    const clerk = (window as any).Clerk;
    if (!clerk?.session) return { 'Content-Type': 'application/json' };
    const token = await clerk.session.getToken();
    if (!token) return { 'Content-Type': 'application/json' };
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
};
```

Then update every `fetch()` call in the context to use `headers: await getAuthHeaders()`.

**Important:** Also check if there are direct fetch calls in components (e.g., `BattleQueuePanel.tsx`, `BattleCard.tsx`, `CollectionScroll.tsx`) that bypass GameContext. Those also need auth headers.

2. Then, add `authenticateRequest()` to each backend write endpoint:

**Files to update** (add auth check at top of handler):
- `functions/api/game/register.ts`
- `functions/api/game/vote.ts`
- `functions/api/game/burn.ts`
- `functions/api/game/verify-phase1.ts`
- `functions/api/game/battle-queue.ts`
- `functions/api/game/battle-vote.ts`

Pattern for each:
```ts
import { authenticateRequest } from '../../lib/auth';

// Inside handler:
const auth = await authenticateRequest(context.request, context.env.CLERK_DOMAIN);
if (!auth) {
  return Response.json({ error: 'Authentication required' }, { status: 401 });
}
```

Add `CLERK_DOMAIN?: string;` to each file's Env interface if not present.

**DO NOT add auth to read-only endpoints** (feed, leaderboard, top-wojaks, power-level, battle-list, collection, activity). Those stay public.

Commit: `feat: add Clerk JWT authentication to all game write endpoints`

## Security Gate

```bash
npx tsc -b && npm run build
```

---

# ═══════════════════════════════════════════════
# SPEC 5: ECONOMY FIXES
# ═══════════════════════════════════════════════
#
# Spec: docs/specs/game-economy-fixes.md
# ═══════════════════════════════════════════════

### Task E1: Fix worker burn INSERT columns

In `workers/credit-tracker/worker.ts`, find the burn credit INSERT (search for `source='burn'` or `burn_${nftId}`). Update it to include all columns:

```sql
INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, event_timestamp)
VALUES (?, ?, ?, 0, 0, ?, 100, 'burn', 'burn', ?)
```

Commit: `fix: align credit-tracker worker burn inserts with credit_events schema`

### Task E2: Wire onboarding_minted milestone

In `functions/api/mint/process.ts`, after the mint is finalized (after the batch that creates the `phase2_mints` row), add a check for the first-mint bonus:

```ts
const walletAddress = /* get from the mint job */;
const player = await env.DB.prepare(
  'SELECT did_id, onboarding_minted FROM game_players WHERE wallet_address = ?'
).bind(walletAddress).first();

if (player && !player.onboarding_minted) {
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE game_players SET onboarding_minted = 1, updated_at = datetime('now') WHERE wallet_address = ? AND onboarding_minted = 0"
    ).bind(walletAddress),
    env.DB.prepare(`
      INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, event_timestamp)
      VALUES (?, 'onboarding_first_mint', 'onboarding_mint_' || ?, 0, 0, 500, 100, 'onboarding', 'onboarding', datetime('now'))
    `).bind(walletAddress, walletAddress),
    env.DB.prepare(`
      INSERT INTO game_activity (did_id, event_type, event_data)
      VALUES (?, 'mint_milestone', ?)
    `).bind(player.did_id, JSON.stringify({ milestone: 'first_mint', credits: 500 })),
  ]);
}
```

Commit: `feat: award first-mint onboarding credits when player mints their first Wojak`

## Economy Gate

```bash
npx tsc -b && npm run build
```

---

# ═══════════════════════════════════════════════
# SPEC 6: PERFORMANCE — SQL INDEXES
# ═══════════════════════════════════════════════
#
# Spec: docs/specs/game-performance-indexing.md
# ═══════════════════════════════════════════════

### Task P1: Create index migration

First, check which indexes already exist in `functions/migrations/045_game_foundation.sql` and `functions/migrations/049_battles.sql`. Then create a new migration for the missing ones.

Find the highest existing migration number (list `functions/migrations/` and find the highest NNN prefix). Create the next one:

```sql
-- functions/migrations/NNN_game_indexes.sql

-- Feed: has voter already voted on this NFT?
CREATE INDEX IF NOT EXISTS idx_wojak_votes_voter_nft
  ON wojak_votes (voter_did, nft_id);

-- Feed: does voter hold this NFT?
CREATE INDEX IF NOT EXISTS idx_did_holdings_did_nft
  ON did_holdings (did_id, nft_id);

-- Activity page: events by DID ordered by time
CREATE INDEX IF NOT EXISTS idx_game_activity_did_created
  ON game_activity (did_id, created_at DESC);

-- Leaderboard: players by power level
CREATE INDEX IF NOT EXISTS idx_game_players_power
  ON game_players (power_level DESC);

-- Top Wojaks: scores by net score
CREATE INDEX IF NOT EXISTS idx_wojak_scores_net
  ON wojak_scores (net_score DESC);

-- Holdings lookup by DID
CREATE INDEX IF NOT EXISTS idx_did_holdings_did
  ON did_holdings (did_id);

-- Battle resolution: find expired active battles
CREATE INDEX IF NOT EXISTS idx_battles_status_ends
  ON battles (status, ends_at);

-- Credit balance: sum by wallet
CREATE INDEX IF NOT EXISTS idx_credit_events_wallet
  ON credit_events (wallet_address);
```

Commit: `perf: add missing database indexes for game queries`

## Performance Gate

```bash
npx tsc -b && npm run build
```

---

# ═══════════════════════════════════════════════
# FINAL VERIFICATION
# ═══════════════════════════════════════════════

Run all verification in sequence:

```bash
# 1. Full type check
npx tsc -b

# 2. Full build
npm run build

# 3. Verify collection IDs
grep -rn "col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah" workers/did-indexer/worker.ts functions/api/game/_shared.ts
grep -rn "col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx" workers/did-indexer/worker.ts functions/api/game/_shared.ts

# 4. Verify no bogus collection ID remains
grep -rn "col1z0ef7w5n" functions/ workers/ src/
# Should return NO matches

# 5. Verify auth on write endpoints
grep -rn "authenticateRequest" functions/api/game/vote.ts functions/api/game/burn.ts functions/api/game/register.ts functions/api/game/battle-queue.ts functions/api/game/battle-vote.ts functions/api/game/verify-phase1.ts
# Should return matches in ALL files

# 6. Verify ADMIN_SECRET on battle-resolve
grep -n "ADMIN_SECRET" functions/api/game/battle-resolve.ts
# Should return matches

# 7. Verify image fallbacks
grep -rn "onError" src/components/game/SwipeCard.tsx src/components/game/CollectionScroll.tsx src/components/game/ActiveBattleCard.tsx
# Should return matches in all three

# 8. Verify DID indexer safety
grep -n "success.*false" workers/did-indexer/worker.ts
# Should find the safety check that prevents deletions on API failure
```

If ALL checks pass, the work is complete.

---

# REFERENCE: What NOT to deploy from CLI

The following are spec files written by the advisor session. They should be committed alongside the implementation code, but their content is for reference — do NOT create code for specs that aren't listed in the execution order above:

- `docs/specs/game-admin-observability.md` — future admin dashboard (not implemented here)
- `docs/specs/wojak-swipe-phase5.md` — Phase 5 features (future)
- `docs/specs/game-security-hardening.md` Layer 3+ — DID binding (future, needs product decision)

---

# SUMMARY OF ALL COMMITS (expected)

Phase 4:
1. `fix(critical): correct collection IDs in game system` (if not already done)
2. `fix(critical): fetch real nftCoinId from MintGarden before burn` (if not already done)
3. `fix: remove duplicate battle resolution from DID indexer` (if not already done)
4. `fix: recalculate power level and refresh collection after burn`
5. `fix: align LatestEventBanner with actual game_activity event types`
6. `fix: add image fallback for MintGarden thumbnail failures`
7. `fix: show toast when vote fails to save`
8. `fix: show error message when burn fails`
9. `fix: show error state with retry when collection fails to load`
10. `feat: include rank and credits in power-level API response`
11. `fix: append new feed items instead of replacing to prevent flicker` (optional)
12. `chore: remove UI-only vote undo to avoid misleading users` (optional)

DID Indexer Hardening:
13. `fix(critical): prevent DID indexer from wiping holdings on MintGarden API errors`
14. `fix: chunk D1 batch writes to avoid exceeding batch limits in DID indexer`
15. `fix: add circuit breaker and detailed logging to DID indexer`
16. `fix: prevent double-resolution race in battle-resolve with optimistic lock`
17. `feat: add indexer tracking columns to game_players` (optional)

Security:
18. `fix: require ADMIN_SECRET auth on battle-resolve endpoint`
19. `fix: require auth on DID indexer manual trigger endpoint`
20. `feat: add Clerk JWT authentication to all game write endpoints`

Economy:
21. `fix: align credit-tracker worker burn inserts with credit_events schema`
22. `feat: award first-mint onboarding credits when player mints their first Wojak`

Performance:
23. `perf: add missing database indexes for game queries`
