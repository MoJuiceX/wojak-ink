# Wojak Swipe — Go-Live & Beyond

> **Purpose:** Everything the CLI needs to do AFTER the current 23-task master execution finishes.
> **Streams:** Deployment fixes → Security L3 → Phase 5 features → Rate limiting → Player UX polish
> **Prerequisite:** `MASTER-EXECUTION.md` tasks are all committed and passing `npx tsc -b && npm run build`.

---

## CRITICAL FINDING: Battle-Cron Is Broken

The battle-cron worker (`workers/battle-cron/`) has its cron schedule **disabled**:

```toml
# wrangler.toml (current)
# Cron removed — battle resolution now runs inside did-indexer (every 30 min).
# This worker is kept for manual /run trigger but no longer scheduled.
```

The comment says resolution happens in the DID indexer. But Phase 4 BLOCKER C **removed** the inline `resolveBattles()` from the DID indexer. After the current CLI run:

- DID indexer: no longer resolves battles ✅ (correct — removed duplicate)
- Battle-cron: cron disabled ❌ (no schedule)
- Battle-resolve endpoint: now requires `ADMIN_SECRET` auth ✅

**Result: Battles never auto-resolve. They expire and sit in `status='active'` forever.**

### Fix Required

1. Re-enable cron in `workers/battle-cron/wrangler.toml`:
```toml
[triggers]
crons = ["0 * * * *"]
```

2. Add `ADMIN_SECRET` to battle-cron so it can authenticate:
```toml
# No D1 or KV needed — this worker only makes an HTTP call
```
Secret must be set via: `cd workers/battle-cron && npx wrangler secret put ADMIN_SECRET`

3. Update `worker.ts` to send the auth header:
```ts
const res = await fetch('https://wojak.ink/api/game/battle-resolve', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${env.ADMIN_SECRET}` },
});
```

4. Update the Env interface:
```ts
interface Env { ADMIN_SECRET: string; }
```

---

## CRITICAL FINDING: DID Indexer Missing ADMIN_SECRET Binding

The CLI is adding `ADMIN_SECRET` auth to the DID indexer's `/run` endpoint. But `workers/did-indexer/wrangler.toml` has no secret binding — the worker can't read `env.ADMIN_SECRET` without it being set.

### Fix Required

Secret must be set via: `cd workers/did-indexer && npx wrangler secret put ADMIN_SECRET`

(No wrangler.toml change needed — Cloudflare Workers automatically bind secrets set via `wrangler secret put` to `env`.)

---

## Stream A: Deployment Fixes & Config (Pre-Launch)

These are code changes and config tasks that must happen before deploying.

### A1: Fix battle-cron (see above)

Re-enable cron, add ADMIN_SECRET env, send auth header in fetch.

### A2: Create game indexes migration

The performance spec calls for 8 indexes. The CLI's current execution plan includes creating this migration, but verify it exists. If not, create `functions/migrations/052_game_indexes.sql`:

```sql
CREATE INDEX IF NOT EXISTS idx_wojak_votes_voter_nft ON wojak_votes (voter_did, nft_id);
CREATE INDEX IF NOT EXISTS idx_did_holdings_did_nft ON did_holdings (did_id, nft_id);
CREATE INDEX IF NOT EXISTS idx_game_activity_did_created ON game_activity (did_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_players_power ON game_players (power_level DESC);
CREATE INDEX IF NOT EXISTS idx_wojak_scores_net ON wojak_scores (net_score DESC);
CREATE INDEX IF NOT EXISTS idx_did_holdings_did ON did_holdings (did_id);
CREATE INDEX IF NOT EXISTS idx_battles_status_ends ON battles (status, ends_at);
CREATE INDEX IF NOT EXISTS idx_credit_events_wallet ON credit_events (wallet_address);
```

### A3: Validate wallet address on register

In `functions/api/game/register.ts`, add `isValidChiaAddress()` check on the `walletAddress` parameter (import from `functions/lib/validation.ts`). Currently it only checks non-empty.

### A4: Admin status endpoint

Create `functions/api/game/admin/status.ts` — the health check endpoint from `docs/specs/game-admin-observability.md` Endpoint 1. This is essential for verifying the system is healthy after deploy.

---

## Stream B: Security Layer 3 (Clerk↔DID Binding)

**Product decision: Strict 1-DID-per-account. One Clerk user can only control one DID.** This prevents multi-DID vote farming.

### B1: Migration

Create `functions/migrations/053_clerk_did_binding.sql`:

```sql
ALTER TABLE game_players ADD COLUMN clerk_user_id TEXT UNIQUE;
```

### B2: Pre-binding script

Before deploying L3, run a one-time SQL to bind existing players whose wallet matches a Clerk profile:

```sql
UPDATE game_players SET clerk_user_id = (
  SELECT p.user_id FROM profiles p
  WHERE p.wallet_address = game_players.wallet_address
  LIMIT 1
) WHERE clerk_user_id IS NULL;
```

This runs after migration 053 is applied to remote D1.

### B3: Create verifyGameAuth helper

Create `functions/api/game/_auth.ts`:

```ts
import { authenticateRequest } from '../../lib/auth';

export async function verifyGameAuth(
  request: Request,
  env: { DB: D1Database; CLERK_DOMAIN?: string },
  did: string
): Promise<{ userId: string } | Response> {
  const auth = await authenticateRequest(request, env.CLERK_DOMAIN);
  if (!auth) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const player = await env.DB.prepare(
    'SELECT clerk_user_id FROM game_players WHERE did_id = ?'
  ).bind(did).first();

  if (!player) {
    return Response.json({ error: 'Player not registered' }, { status: 404 });
  }

  if (player.clerk_user_id && player.clerk_user_id !== auth.userId) {
    return Response.json({ error: 'DID does not belong to your account' }, { status: 403 });
  }

  // First authenticated call by a legacy player — bind now
  if (!player.clerk_user_id) {
    await env.DB.prepare(
      'UPDATE game_players SET clerk_user_id = ? WHERE did_id = ? AND clerk_user_id IS NULL'
    ).bind(auth.userId, did).run();
  }

  return { userId: auth.userId };
}
```

### B4: Update write endpoints to use verifyGameAuth

Replace the simple `authenticateRequest()` call (added by the current CLI run in L2) with `verifyGameAuth()` in:
- `vote.ts`
- `burn.ts`
- `battle-queue.ts`
- `battle-vote.ts`
- `verify-phase1.ts`

Keep plain `authenticateRequest()` on `register.ts` (that's where the binding is created, can't verify it yet).

In `register.ts`, add the binding logic:
```ts
const auth = await authenticateRequest(request, env.CLERK_DOMAIN);
if (!auth) return 401;

// Check if this Clerk user already has a different DID
const existing = await env.DB.prepare(
  'SELECT did_id FROM game_players WHERE clerk_user_id = ?'
).bind(auth.userId).first();

if (existing && existing.did_id !== did) {
  return Response.json({
    error: 'Your account is already linked to a different DID'
  }, { status: 409 });
}

// Store clerk_user_id in the upsert
```

### B5: Update register.ts upsert

Add `clerk_user_id` to the INSERT and ON CONFLICT:
```sql
INSERT INTO game_players (did_id, wallet_address, clerk_user_id, ...)
ON CONFLICT(did_id) DO UPDATE SET
  wallet_address = excluded.wallet_address,
  clerk_user_id = COALESCE(game_players.clerk_user_id, excluded.clerk_user_id),
  ...
```

---

## Stream C: Rate Limiting (Layer 4)

### C1: Add game rate limit configs

In `functions/lib/rateLimit.ts`, add:

```ts
export const GAME_RATE_LIMITS = {
  vote:         { maxRequests: 20,  windowMs: 60_000,  key: 'game-vote' },
  register:     { maxRequests: 3,   windowMs: 300_000, key: 'game-register' },
  burn:         { maxRequests: 5,   windowMs: 60_000,  key: 'game-burn' },
  verifyPhase1: { maxRequests: 5,   windowMs: 300_000, key: 'game-verify' },
  battleQueue:  { maxRequests: 10,  windowMs: 60_000,  key: 'game-bq' },
  battleVote:   { maxRequests: 20,  windowMs: 60_000,  key: 'game-bvote' },
};
```

### C2: Wire rate limiting to game endpoints

In each write endpoint, after auth check:
```ts
import { checkRateLimit, getRateLimitKey, GAME_RATE_LIMITS } from '../../lib/rateLimit';

const rlKey = getRateLimitKey(context.request, auth.userId);
const rl = await checkRateLimit(context.env.DB, rlKey, GAME_RATE_LIMITS.vote);
if (!rl.allowed) {
  return Response.json({ error: 'Rate limited. Try again later.' }, { status: 429 });
}
```

### C3: Rate limit cleanup

The `rate_limits` table is already cleaned by `functions/api/mint/cleanup.ts` (deletes entries > 24h). Verify this cleanup runs on the mint-cron schedule. If game rate limit entries grow too fast, consider a shorter cleanup window.

---

## Stream D: Phase 5 Features

Read `docs/specs/wojak-swipe-phase5.md` and `.claude/handoff/WOJAK-SWIPE-PHASE5.md` for details.

### D1: Extract shared event formatting utility

Move `formatEvent()` from `LatestEventBanner.tsx` to `src/lib/gameEvents.ts`. Export `formatEvent`, `EVENT_ICONS`, `EVENT_LINKS`.

### D2: Activity Feed Page

- Add `offset` param to `functions/api/game/activity.ts`
- Create `src/pages/GameActivity.tsx` at route `/swipe/activity`
- "View all →" link in LatestEventBanner
- Add nav link in swipe navigation

### D3: Battle History Tab

- Add `?status=history` to `functions/api/game/battle-list.ts`
- Add "Active" / "History" tab toggle in battles page
- Render completed battles with outcome badges

### D4: NFT Naming

- Create `POST /api/game/nft-name` endpoint
- Add inline edit in NftDetailModal (CollectionScroll)

### D5: Vote Streaks

- Migration 051 already exists (CLI created it)
- Add streak logic to `vote.ts` (after 10th vote)
- Add `getYesterdayString()` helper to `_shared.ts`
- Show streak in `PostRoundSummary` and `PowerLevelDisplay`
- Handle `streak_milestone` in `formatEvent()`

### D6: Creator Stats

- Create `GET /api/game/creator-stats?wallet=` endpoint
- Create `CreatorStatsCard` component
- Add to dashboard (visible if player has minted ≥ 1 NFT)

---

## Stream E: Player Experience Polish

### E1: Power Level tooltip/explainer

Add an info icon (ℹ️) next to the power level display. On click, show a modal or popover:

> **Power Level** measures your standing in the Wojak ecosystem.
>
> **From your collection:** Quality and diversity of NFTs you hold. Rare pieces and unique creators boost your score.
>
> **From your creations:** How well-received your minted Wojaks are. More votes from diverse collectors = higher score.
>
> **Max:** 9,000 (legend tier)

### E2: Credits explainer

Add tooltip on credits display:

> **Credits** are earned from trading NFTs and burning Wojaks. Spend them on free mints at the generator.

### E3: "Why vote?" context on voting page

Add a subtle one-liner below the instruction text (first 3 visits only):

> Your votes shape which Wojaks rise and which get burned. Vote wisely.

### E4: Gallery page banner (optional)

Add a dismissible banner/card at the top of the Gallery page:

```tsx
<Link to="/swipe" className="card p-4 flex items-center gap-4">
  <Heart className="text-red-500" />
  <div>
    <span className="font-bold">Wojak Swipe is live!</span>
    <span className="text-secondary">Vote, battle, burn — the Wojak metagame</span>
  </div>
  <span className="badge badge-success">NEW</span>
</Link>
```

Dismissible via localStorage `wojak_swipe_banner_dismissed`.

---

## Deployment Checklist (After All Code Is Committed)

### Step 1: Apply Migrations to Remote D1

Check which are already applied:
```bash
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

Apply any missing game migrations in order:
```bash
npx wrangler d1 execute wojak-users --remote --file=functions/migrations/045_game_foundation.sql
npx wrangler d1 execute wojak-users --remote --file=functions/migrations/048_burn_tracking.sql
npx wrangler d1 execute wojak-users --remote --file=functions/migrations/049_battles.sql
npx wrangler d1 execute wojak-users --remote --file=functions/migrations/050_indexer_tracking.sql
npx wrangler d1 execute wojak-users --remote --file=functions/migrations/051_vote_streaks.sql
npx wrangler d1 execute wojak-users --remote --file=functions/migrations/052_game_indexes.sql
npx wrangler d1 execute wojak-users --remote --file=functions/migrations/053_clerk_did_binding.sql
```

### Step 2: Pre-bind Existing Players (L3)

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "UPDATE game_players SET clerk_user_id = (SELECT p.user_id FROM profiles p WHERE p.wallet_address = game_players.wallet_address LIMIT 1) WHERE clerk_user_id IS NULL;"
```

### Step 3: Wipe Stale Holdings

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "DELETE FROM did_holdings;"
```

### Step 4: Deploy Workers

```bash
cd workers/did-indexer && npx wrangler deploy && cd ../..
cd workers/battle-cron && npx wrangler deploy && cd ../..
cd workers/credit-tracker && npx wrangler deploy && cd ../..
```

### Step 5: Set Worker Secrets

```bash
cd workers/did-indexer && npx wrangler secret put ADMIN_SECRET && cd ../..
cd workers/battle-cron && npx wrangler secret put ADMIN_SECRET && cd ../..
```

(User will be prompted to enter the secret value interactively)

### Step 6: Deploy Pages

```bash
npm run build && npx wrangler pages deploy dist --project-name=wojak-ink
```

### Step 7: Verify CLERK_DOMAIN Secret

```bash
npx wrangler pages secret list --project-name=wojak-ink
# Verify CLERK_DOMAIN is in the list
# If not: npx wrangler pages secret put CLERK_DOMAIN --project-name=wojak-ink
```

### Step 8: Trigger DID Indexer

```bash
curl -s -X POST https://wojak-did-indexer.YOUR_SUBDOMAIN.workers.dev/run \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

Wait 2-3 minutes for indexing to complete.

### Step 9: Verify

```bash
# Check holdings populated
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT COUNT(*) FROM did_holdings;"

# Check game health
curl -s https://wojak.ink/api/game/admin/status \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" | jq .

# Run smoke test checks from docs/specs/wojak-swipe-smoke-test.md
```

---

## Execution Order Summary

| # | Task | Stream | Effort |
|---|------|--------|--------|
| 1 | Fix battle-cron (re-enable cron + auth header) | A | Small |
| 2 | Validate wallet address in register | A | Tiny |
| 3 | Game indexes migration (if not already done) | A | Tiny |
| 4 | Admin status endpoint | A | Medium |
| 5 | Security L3 migration | B | Tiny |
| 6 | verifyGameAuth helper | B | Small |
| 7 | Update register.ts for Clerk binding | B | Small |
| 8 | Update all write endpoints to verifyGameAuth | B | Small |
| 9 | Rate limit configs | C | Small |
| 10 | Wire rate limits to endpoints | C | Small |
| 11 | Extract event formatting utility | D | Small |
| 12 | Activity feed page | D | Medium |
| 13 | Battle history tab | D | Medium |
| 14 | NFT naming endpoint + UI | D | Small |
| 15 | Vote streak logic + UI | D | Medium |
| 16 | Creator stats endpoint + card | D | Medium |
| 17 | Power level explainer tooltip | E | Small |
| 18 | Credits explainer tooltip | E | Tiny |
| 19 | "Why vote?" context text | E | Tiny |
| 20 | Gallery banner (optional) | E | Small |
