# Wojak Swipe — Master Execution Prompt (Part 2)

> **Run this AFTER MASTER-EXECUTION.md (Part 1) is complete.**
> **Prerequisite:** `npx tsc -b && npm run build` both pass from Part 1.
> **Read `docs/specs/go-live-and-beyond.md` for full context.**
> **Run `npx tsc -b` after every commit. Run `npm run build` at each gate.**

---

## CANONICAL COLLECTION IDs

```
Wojak Farmers Plot (Phase 1): col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah
Your Wojak (Phase 2):         col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx
```

## ANTI-PATTERNS (from CLAUDE.md)

- Never `!important` in CSS
- Use `var(--color-*)` for colors, Tailwind for layout only
- Use theme classes: `.card`, `.card-static`, `.btn`, `.btn-primary`, `.badge`
- Never self-fetch own API endpoints
- Never change schema without a migration file in `functions/migrations/`
- Never add deps without documenting why in commit message

---

# ═══════════════════════════════════════════════
# PHASE A: DEPLOYMENT FIXES (must do first)
# ═══════════════════════════════════════════════

### Task A1: Fix battle-cron — re-enable cron + add auth

**CRITICAL: Without this, battles NEVER auto-resolve.**

The DID indexer's inline `resolveBattles()` was removed (Blocker C from Part 1). The battle-cron worker's cron schedule is disabled. Battles expire and sit in `status='active'` forever.

1. Read `workers/battle-cron/wrangler.toml`. Update it to:

```toml
name = "wojak-battle-cron"
main = "worker.ts"
compatibility_date = "2024-12-01"

[triggers]
crons = ["0 * * * *"]
```

2. Read `workers/battle-cron/worker.ts`. Update it to send `ADMIN_SECRET`:

```ts
interface Env {
  ADMIN_SECRET: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    console.log('[Battle Cron] Triggering battle resolution...');

    try {
      const res = await fetch('https://wojak.ink/api/game/battle-resolve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.ADMIN_SECRET}`,
        },
      });

      if (!res.ok) {
        console.error(`[Battle Cron] API returned ${res.status}`);
        return;
      }

      const data = (await res.json()) as { resolved?: number; draws?: number };
      console.log(`[Battle Cron] Done. Resolved: ${data.resolved ?? 0}, Draws: ${data.draws ?? 0}`);
    } catch (err) {
      console.error('[Battle Cron] Error:', err);
    }
  },

  async fetch(): Promise<Response> {
    return new Response('Battle Resolution Cron. Runs hourly via scheduled trigger.', { status: 200 });
  },
};
```

Commit: `fix(critical): re-enable battle-cron schedule and add ADMIN_SECRET auth`

---

### Task A2: Validate wallet address in register

Read `functions/api/game/register.ts`. Currently it only checks `if (!walletAddress)`. Add proper validation.

Find the import section. If `isValidChiaAddress` is not imported, check where it lives — likely `functions/lib/validation.ts`. If it doesn't exist there, check `functions/api/game/_shared.ts`.

Add the validation after the existing `!walletAddress` check:

```ts
// After: if (!walletAddress) return 400
// Validate format using the project's validation utility
```

If `isValidChiaAddress` is available, use it. If not, add a basic bech32m format check:

```ts
if (!walletAddress.match(/^xch1[a-z0-9]{58}$/)) {
  return Response.json({ error: 'Invalid wallet address format' }, { status: 400 });
}
```

Commit: `fix: validate wallet address format in game register endpoint`

---

### Task A3: Create game indexes migration (if not already done)

Check if a game indexes migration already exists from Part 1:

```bash
ls functions/migrations/*index* functions/migrations/*game_index*
```

If it exists, skip. If not, find the highest migration number:

```bash
ls functions/migrations/ | sort -n | tail -5
```

Create `functions/migrations/NNN_game_indexes.sql` (use next number after highest):

```sql
-- Performance indexes for game queries
CREATE INDEX IF NOT EXISTS idx_wojak_votes_voter_nft ON wojak_votes (voter_did, nft_id);
CREATE INDEX IF NOT EXISTS idx_did_holdings_did_nft ON did_holdings (did_id, nft_id);
CREATE INDEX IF NOT EXISTS idx_game_activity_did_created ON game_activity (did_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_players_power ON game_players (power_level DESC);
CREATE INDEX IF NOT EXISTS idx_wojak_scores_net ON wojak_scores (net_score DESC);
CREATE INDEX IF NOT EXISTS idx_did_holdings_did ON did_holdings (did_id);
CREATE INDEX IF NOT EXISTS idx_battles_status_ends ON battles (status, ends_at);
CREATE INDEX IF NOT EXISTS idx_credit_events_wallet ON credit_events (wallet_address);
```

Commit: `perf: add missing database indexes for game queries`

---

### Task A4: Admin game status endpoint

Create `functions/api/game/admin/status.ts`:

```ts
interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const authHeader = context.request.headers.get('Authorization');
  if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [players, voting, battles, queue, burns, indexer] = await context.env.DB.batch([
      context.env.DB.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN phase1_verified = 1 THEN 1 ELSE 0 END) as verified,
          SUM(CASE WHEN votes_today_reset = date('now') AND votes_today > 0 THEN 1 ELSE 0 END) as activeToday,
          SUM(CASE WHEN last_indexed_at IS NULL THEN 1 ELSE 0 END) as neverIndexed
        FROM game_players
      `),
      context.env.DB.prepare(`
        SELECT
          COUNT(*) as totalVotes,
          SUM(CASE WHEN created_at > datetime('now', '-24 hours') THEN 1 ELSE 0 END) as votesToday
        FROM wojak_votes
      `),
      context.env.DB.prepare(`
        SELECT
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'draw' THEN 1 ELSE 0 END) as draws,
          SUM(CASE WHEN status = 'active' AND ends_at < datetime('now') THEN 1 ELSE 0 END) as overdueActive
        FROM battles
      `),
      context.env.DB.prepare('SELECT COUNT(*) as inQueue FROM battle_queue'),
      context.env.DB.prepare(`
        SELECT COUNT(*) as total, COALESCE(SUM(credits_awarded), 0) as creditsAwarded FROM wojak_burns
      `),
      context.env.DB.prepare(`
        SELECT
          SUM(CASE WHEN last_indexed_at IS NULL THEN 1 ELSE 0 END) as neverIndexed,
          SUM(CASE WHEN last_indexed_at < datetime('now', '-24 hours') THEN 1 ELSE 0 END) as staleOver24h,
          SUM(CASE WHEN index_error_count > 0 THEN 1 ELSE 0 END) as withErrors,
          MAX(index_error_count) as highestErrorCount
        FROM game_players
      `),
    ]);

    return Response.json({
      players: players.results[0],
      voting: voting.results[0],
      battles: { ...battles.results[0], inQueue: queue.results[0]?.inQueue ?? 0 },
      burns: burns.results[0],
      indexer: indexer.results[0],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({ error: 'Status check failed', detail: String(err) }, { status: 500 });
  }
};
```

Note: `functions/api/game/admin/` directory may not exist. Create the `admin` folder first.

Commit: `feat: add admin game status health check endpoint`

---

## ═══ GATE A ═══

```bash
npx tsc -b && npm run build
```

---

# ═══════════════════════════════════════════════
# PHASE B: SECURITY LAYER 3 (Clerk↔DID Binding)
# ═══════════════════════════════════════════════

### Task B1: Create Clerk-DID binding migration

Find the next migration number after what exists:

```bash
ls functions/migrations/ | sort -n | tail -3
```

Create `functions/migrations/NNN_clerk_did_binding.sql`:

```sql
-- Bind Clerk user identity to DID (1:1 relationship)
-- Prevents multi-DID vote farming
ALTER TABLE game_players ADD COLUMN clerk_user_id TEXT UNIQUE;
```

Commit: `feat: add clerk_user_id column to game_players for identity binding`

---

### Task B2: Create verifyGameAuth helper

Create `functions/api/game/_auth.ts`:

```ts
import { authenticateRequest, type AuthResult } from '../../lib/auth';

interface GameAuthEnv {
  DB: D1Database;
  CLERK_DOMAIN?: string;
}

/**
 * Verify that the authenticated Clerk user owns the claimed DID.
 * On first authenticated call by a legacy player, binds the Clerk userId to the DID.
 * Returns the auth result or an error Response.
 */
export async function verifyGameAuth(
  request: Request,
  env: GameAuthEnv,
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

  // If DID is bound to a different Clerk user, reject
  if (player.clerk_user_id && player.clerk_user_id !== auth.userId) {
    return Response.json({ error: 'DID does not belong to your account' }, { status: 403 });
  }

  // First authenticated call by a legacy (pre-L3) player — bind now
  if (!player.clerk_user_id) {
    await env.DB.prepare(
      'UPDATE game_players SET clerk_user_id = ? WHERE did_id = ? AND clerk_user_id IS NULL'
    ).bind(auth.userId, did).run();
  }

  return { userId: auth.userId };
}

/** Type guard: returns true if the result is an error Response */
export function isAuthError(result: { userId: string } | Response): result is Response {
  return result instanceof Response;
}
```

Commit: `feat: create verifyGameAuth helper for Clerk-DID binding verification`

---

### Task B3: Update register.ts for Clerk binding

Read `functions/api/game/register.ts`. The Part 1 CLI added `authenticateRequest()`. Now extend it:

After the auth check, before the upsert:

```ts
// Check if this Clerk user already has a different DID
const existingBinding = await context.env.DB.prepare(
  'SELECT did_id FROM game_players WHERE clerk_user_id = ?'
).bind(auth.userId).first();

if (existingBinding && existingBinding.did_id !== did) {
  return Response.json({
    error: 'Your account is already linked to a different DID. Contact support to change.'
  }, { status: 409 });
}
```

Then update the INSERT/UPSERT to include `clerk_user_id`:

In the INSERT values, add `auth.userId` for `clerk_user_id`.
In the ON CONFLICT DO UPDATE, use:
```sql
clerk_user_id = COALESCE(game_players.clerk_user_id, excluded.clerk_user_id)
```

This prevents overwriting an existing binding but allows first-time binding.

Commit: `feat: bind Clerk user to DID on registration (1:1 enforcement)`

---

### Task B4: Update write endpoints to use verifyGameAuth

Replace the `authenticateRequest()` call with `verifyGameAuth()` in these files:

- `functions/api/game/vote.ts`
- `functions/api/game/burn.ts`
- `functions/api/game/battle-queue.ts`
- `functions/api/game/battle-vote.ts`
- `functions/api/game/verify-phase1.ts`

Pattern for each:

```ts
import { verifyGameAuth, isAuthError } from './_auth';

// Replace:
//   const auth = await authenticateRequest(request, env.CLERK_DOMAIN);
//   if (!auth) return 401;
// With:
const authResult = await verifyGameAuth(context.request, context.env, did);
if (isAuthError(authResult)) return authResult;
// authResult.userId is available if needed
```

**Do NOT change `register.ts`** — it uses plain `authenticateRequest()` because it creates the binding.

**Do NOT change `battle-resolve.ts`** — it uses `ADMIN_SECRET`, not Clerk auth.

Commit: `feat: enforce Clerk-DID binding on all game write endpoints`

---

## ═══ GATE B ═══

```bash
npx tsc -b && npm run build
```

---

# ═══════════════════════════════════════════════
# PHASE C: RATE LIMITING
# ═══════════════════════════════════════════════

### Task C1: Add game rate limit configs

Read `functions/lib/rateLimit.ts`. Add game-specific rate limit configs after the existing `MINT_RATE_LIMITS`:

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

Commit: `feat: add game-specific rate limit configurations`

---

### Task C2: Wire rate limits to game endpoints

In each game write endpoint, after the auth check (after `verifyGameAuth` or `authenticateRequest`), add rate limiting:

```ts
import { checkRateLimit, getRateLimitKey, GAME_RATE_LIMITS } from '../../lib/rateLimit';

const rlKey = getRateLimitKey(context.request, authResult.userId);
const rl = await checkRateLimit(context.env.DB, rlKey, GAME_RATE_LIMITS.vote);
if (!rl.allowed) {
  return Response.json({ error: 'Rate limited. Try again later.' }, { status: 429 });
}
```

Use the matching rate limit config for each endpoint:
- `register.ts` → `GAME_RATE_LIMITS.register`
- `vote.ts` → `GAME_RATE_LIMITS.vote`
- `burn.ts` → `GAME_RATE_LIMITS.burn`
- `verify-phase1.ts` → `GAME_RATE_LIMITS.verifyPhase1`
- `battle-queue.ts` → `GAME_RATE_LIMITS.battleQueue`
- `battle-vote.ts` → `GAME_RATE_LIMITS.battleVote`

Commit: `feat: wire rate limiting to all game write endpoints`

---

## ═══ GATE C ═══

```bash
npx tsc -b && npm run build
```

---

# ═══════════════════════════════════════════════
# PHASE D: PHASE 5 FEATURES
# ═══════════════════════════════════════════════
#
# Full spec: docs/specs/wojak-swipe-phase5.md
# Handoff: .claude/handoff/WOJAK-SWIPE-PHASE5.md
#
# Read the handoff for detailed implementation.
# ═══════════════════════════════════════════════

### Task D1: Extract shared event formatting

Read `src/components/game/LatestEventBanner.tsx`. Find the event formatting logic (`formatEvent` or equivalent function, `EVENT_ICONS` map, `EVENT_LINKS` map).

Create `src/lib/gameEvents.ts`. Move the formatting logic there. Export all utilities.

Update `LatestEventBanner.tsx` to import from the new file.

Commit: `refactor: extract game event formatting to shared utility`

---

### Task D2: Activity Feed Page

1. Read `functions/api/game/activity.ts`. Add `offset` parameter if not present:
```ts
const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0'));
```
Add `OFFSET ?` to the query and bind `offset`.

2. Create `src/pages/GameActivity.tsx`:
- Import `GameProvider`, `SwipeAutoRegister`, `useGame`
- Gate check: if no player, show GateChecklist
- Fetch activity with pagination (limit 20, offset state)
- Format each event using `formatEvent()` from `src/lib/gameEvents.ts`
- Show relative timestamps (e.g. "2 hours ago")
- "Load More" button
- Empty state: "No activity yet. Start voting!" with link to `/swipe`
- Loading skeleton
- Error state with retry

3. Add route in `src/App.tsx`: lazy import `GameActivity` at `/swipe/activity`

4. Add "View all →" link in `LatestEventBanner.tsx`

Commit: `feat: add activity feed page at /swipe/activity`

---

### Task D3: Battle History Tab

1. Read `functions/api/game/battle-list.ts`. Add support for `?status=history`:
```ts
if (status === 'history') {
  statusClause = "status IN ('completed', 'draw')";
  orderClause = 'ORDER BY resolved_at DESC';
}
```
Add `offset` parameter for pagination if not present.

2. In the battles page (find it — likely `src/pages/GameBattles.tsx` or within `BattleView`):
- Add state: `activeTab: 'active' | 'history'`
- Add tab buttons at top: "Active" / "History"
- History tab fetches `?status=history&limit=10`
- Render completed battles with: outcome badge (Won/Lost/Draw), vote counts, resolved date
- Both NFT images should have `onError` fallback (Phase 4 pattern)

Commit: `feat: add battle history tab to /swipe/battles`

---

### Task D4: NFT Naming

1. Create `functions/api/game/nft-name.ts`:

```ts
// POST /api/game/nft-name
// Body: { did: string, editionNumber: number, name: string }
//
// Auth: verifyGameAuth (Clerk + DID binding)
// Validation: name 1-30 chars, /^[a-zA-Z0-9 .,!?'-]+$/
// Ownership check: did_holdings WHERE did_id = ? AND edition_number = ?
// Write: INSERT OR REPLACE INTO nft_names (edition_number, custom_name) VALUES (?, ?)
//   ON CONFLICT(edition_number) DO UPDATE SET custom_name = ?
```

2. In `CollectionScroll.tsx` NftDetailModal:
- Show current name with pencil icon
- On pencil click: inline text input replaces name
- Enter → POST `/api/game/nft-name`
- Escape → cancel edit
- Success → update local state
- Error → show error, revert

Commit: `feat: allow players to name their Phase 2 NFTs`

---

### Task D5: Vote Streaks

Migration 051 already exists. Check if the streak logic is already in `vote.ts`. If not:

1. Add `getYesterdayString()` to `functions/api/game/_shared.ts`:
```ts
export function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}
```

2. In `functions/api/game/vote.ts`, after the 10th vote (when `votesRemaining === 0`):
```ts
const today = getTodayString();
const yesterday = getYesterdayString();
let newStreak: number;

if (player.vote_streak_last_date === yesterday) {
  newStreak = (player.vote_streak || 0) + 1;
} else if (player.vote_streak_last_date === today) {
  newStreak = player.vote_streak || 1;
} else {
  newStreak = 1;
}

const STREAK_MILESTONES: Record<number, number> = { 3: 300, 7: 500, 14: 1000, 30: 2000, 100: 5000 };
const milestone = STREAK_MILESTONES[newStreak];

const streakStatements = [
  context.env.DB.prepare(`
    UPDATE game_players SET vote_streak = ?, vote_streak_last_date = ?,
    vote_streak_longest = MAX(COALESCE(vote_streak_longest, 0), ?)
    WHERE did_id = ?
  `).bind(newStreak, today, newStreak, voterDid),
];

if (milestone) {
  streakStatements.push(
    context.env.DB.prepare(`
      INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, event_timestamp)
      VALUES (?, 'streak', ?, 0, 0, ?, 100, 'streak', 'streak', datetime('now'))
    `).bind(player.wallet_address, `streak_${voterDid}_${newStreak}`, milestone),
    context.env.DB.prepare(`
      INSERT INTO game_activity (did_id, event_type, event_data)
      VALUES (?, 'streak_milestone', ?)
    `).bind(voterDid, JSON.stringify({ days: newStreak, credits: milestone })),
  );
}

await context.env.DB.batch(streakStatements);
```

3. Include `voteStreak`, `voteStreakLongest` in the `register` and `power-level` responses.

4. In `PostRoundSummary.tsx`, show streak info.

5. Update `formatEvent()` in `src/lib/gameEvents.ts` to handle `streak_milestone`.

Commit: `feat: add vote streak tracking with milestone credits`

---

### Task D6: Creator Stats

1. Create `functions/api/game/creator-stats.ts`:

```ts
// GET /api/game/creator-stats?wallet=xch1...
// No auth needed (read-only, like leaderboard)
// Returns: mintedCount, totalLikes, totalDislikes, totalVotes, avgNetScore, topNft
```

Queries (see `docs/specs/wojak-swipe-phase5.md` Feature 5 for exact SQL).

2. Create `src/components/game/CreatorStatsCard.tsx`:
- Fetch on mount if player has minted ≥ 1 NFT
- Show: minted count, total votes received, avg net score, top performer
- Use `.card` class

3. Add to `GameDashboard.tsx` after CollectionScroll section.

Commit: `feat: add creator stats card to swipe dashboard`

---

## ═══ GATE D ═══

```bash
npx tsc -b && npm run build
```

---

# ═══════════════════════════════════════════════
# PHASE E: PLAYER EXPERIENCE POLISH
# ═══════════════════════════════════════════════

### Task E1: Power Level explainer

In `PowerLevelDisplay.tsx`, add an info icon (use an `ℹ` character or an SVG icon from the project's icon set) next to "Power Level". On click, toggle a popover/section:

```tsx
<div className="text-secondary text-sm mt-2">
  <p>Your Power Level reflects your standing in the Wojak ecosystem.</p>
  <p className="mt-1"><strong>Holdings:</strong> Quality and diversity of NFTs you collect</p>
  <p><strong>Creations:</strong> How well your minted Wojaks perform in votes</p>
</div>
```

Use a state toggle, not a modal. Keep it simple.

Commit: `feat: add power level explainer to dashboard`

---

### Task E2: Gallery banner for Wojak Swipe

Read `src/pages/Gallery.tsx`. Add a dismissible banner at the top (above the gallery grid):

```tsx
const [bannerDismissed, setBannerDismissed] = useState(
  () => localStorage.getItem('wojak_swipe_banner_dismissed') === 'true'
);

{!bannerDismissed && (
  <Link to="/swipe" className="card p-4 flex items-center gap-4 mb-4">
    <Heart size={24} style={{ color: 'var(--color-error)' }} />
    <div className="flex-1">
      <span className="font-bold" style={{ color: 'var(--color-text)' }}>Wojak Swipe is live!</span>
      <span className="text-secondary ml-2">Vote, battle, and burn</span>
    </div>
    <span className="badge badge-success">NEW</span>
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        localStorage.setItem('wojak_swipe_banner_dismissed', 'true');
        setBannerDismissed(true);
      }}
      className="btn btn-ghost"
      style={{ padding: '4px 8px', fontSize: '14px' }}
    >✕</button>
  </Link>
)}
```

Import `Heart` from whatever icon library the project uses (check existing imports in other files — likely `lucide-react`).

Commit: `feat: add Wojak Swipe promotional banner to Gallery page`

---

## ═══ GATE E (FINAL) ═══

```bash
npx tsc -b && npm run build
```

---

# ═══════════════════════════════════════════════
# FINAL VERIFICATION
# ═══════════════════════════════════════════════

```bash
# 1. Full type check + build
npx tsc -b && npm run build

# 2. Battle-cron has cron enabled
grep -n "crons" workers/battle-cron/wrangler.toml
# Should show: crons = ["0 * * * *"]

# 3. Battle-cron sends auth header
grep -n "ADMIN_SECRET\|Authorization" workers/battle-cron/worker.ts
# Should find both

# 4. verifyGameAuth used in write endpoints
grep -rn "verifyGameAuth" functions/api/game/vote.ts functions/api/game/burn.ts functions/api/game/battle-queue.ts functions/api/game/battle-vote.ts functions/api/game/verify-phase1.ts
# Should return matches in ALL files

# 5. register.ts has Clerk binding logic
grep -n "clerk_user_id" functions/api/game/register.ts
# Should find it in the INSERT/UPSERT

# 6. Rate limits wired
grep -rn "checkRateLimit" functions/api/game/vote.ts functions/api/game/register.ts functions/api/game/burn.ts
# Should return matches in all files

# 7. Admin status endpoint exists
ls functions/api/game/admin/status.ts
# Should exist

# 8. Activity page exists
ls src/pages/GameActivity.tsx
# Should exist

# 9. Event formatting extracted
ls src/lib/gameEvents.ts
# Should exist

# 10. Gallery banner
grep -n "swipe_banner" src/pages/Gallery.tsx
# Should find the localStorage key

# 11. NFT naming endpoint
ls functions/api/game/nft-name.ts
# Should exist

# 12. Creator stats
ls functions/api/game/creator-stats.ts
ls src/components/game/CreatorStatsCard.tsx
# Both should exist

# 13. All migrations exist
ls functions/migrations/*clerk* functions/migrations/*game_index* functions/migrations/*vote_streak*
# Should find all three migration files
```

---

# SUMMARY OF ALL COMMITS (expected ~20)

Phase A — Deployment Fixes:
1. `fix(critical): re-enable battle-cron schedule and add ADMIN_SECRET auth`
2. `fix: validate wallet address format in game register endpoint`
3. `perf: add missing database indexes for game queries` (if not done in Part 1)
4. `feat: add admin game status health check endpoint`

Phase B — Security L3:
5. `feat: add clerk_user_id column to game_players for identity binding`
6. `feat: create verifyGameAuth helper for Clerk-DID binding verification`
7. `feat: bind Clerk user to DID on registration (1:1 enforcement)`
8. `feat: enforce Clerk-DID binding on all game write endpoints`

Phase C — Rate Limiting:
9. `feat: add game-specific rate limit configurations`
10. `feat: wire rate limiting to all game write endpoints`

Phase D — Phase 5 Features:
11. `refactor: extract game event formatting to shared utility`
12. `feat: add activity feed page at /swipe/activity`
13. `feat: add battle history tab to /swipe/battles`
14. `feat: allow players to name their Phase 2 NFTs`
15. `feat: add vote streak tracking with milestone credits`
16. `feat: add creator stats card to swipe dashboard`

Phase E — UX Polish:
17. `feat: add power level explainer to dashboard`
18. `feat: add Wojak Swipe promotional banner to Gallery page`
