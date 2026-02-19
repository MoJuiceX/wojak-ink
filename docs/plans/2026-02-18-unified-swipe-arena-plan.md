# Unified Swipe + Arena Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the Swipe voting system and Combat Arena into one unified XP-based leaderboard, moving combat to `/arena`, adding vote XP pipeline, and cross-linking both systems.

**Architecture:** Two top-level route groups (`/swipe/*` and `/arena/*`) share the same Wojak NFTs via DID. Combat XP (~10:1 ratio over vote XP) drives a unified leaderboard. A periodic Vote XP Pipeline bridges `wojak_scores` → `combat_fighters.xp`. Route migration moves `/games/combat` → `/arena` with redirects.

**Tech Stack:** React + Vite + TypeScript, Cloudflare Pages Functions (D1 SQLite), Tailwind (layout) + theme.css (visuals), React Router, framer-motion

**Design Doc:** `docs/plans/2026-02-18-unified-swipe-arena-design.md`

---

## Package A: Route Migration + Arena Shell

### Task 1: Add `/arena` route to App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add the Arena route alongside the existing `/games/combat` route**

In `src/App.tsx`, find the CombatArena route block (around line 544-554) and add a new route for `/arena` that renders the same component. Also add a redirect from `/games/combat` to `/arena`:

```tsx
{/* Combat Arena — now lives at /arena */}
<Route
  path="arena"
  element={
    <GameErrorBoundary gameName="Combat Arena">
      <Suspense fallback={<GameLoading gameName="Combat Arena" />}>
        <CombatArena />
      </Suspense>
    </GameErrorBoundary>
  }
/>
{/* Redirect old /games/combat to /arena */}
<Route path="games/combat" element={<Navigate to="/arena" replace />} />
```

Replace the existing `games/combat` route block with the redirect. The CombatArena component stays at `src/pages/CombatArena.tsx`.

**Step 2: Verify route works**

Run: `npm run dev`

Navigate to `http://localhost:5173/arena` — should render CombatArena.
Navigate to `http://localhost:5173/games/combat` — should redirect to `/arena`.

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add /arena route, redirect /games/combat → /arena"
```

---

### Task 2: Create ArenaNav component

**Files:**
- Create: `src/components/combat/ArenaNav.tsx`
- Reference: `src/components/game/SwipeNav.tsx` (copy its pattern)

**Step 1: Create ArenaNav**

Create `src/components/combat/ArenaNav.tsx`:

```tsx
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/arena', label: 'Battle', end: true },
  { to: '/arena/leaderboard', label: 'Leaderboard', end: false },
];

export function ArenaNav() {
  return (
    <nav
      className="hide-scrollbar"
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 0,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'var(--color-bg)',
      }}
    >
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          style={({ isActive }) => ({
            padding: '12px 16px',
            fontSize: 13,
            fontWeight: 500,
            color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
            borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'color 150ms, border-color 150ms',
          })}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

**Step 2: Verify file exists and has no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep ArenaNav || echo "No errors"`

**Step 3: Commit**

```bash
git add src/components/combat/ArenaNav.tsx
git commit -m "feat: create ArenaNav component matching SwipeNav pattern"
```

---

### Task 3: Wire ArenaNav into CombatArena page

**Files:**
- Modify: `src/pages/CombatArena.tsx`

**Step 1: Import and render ArenaNav at the top of the page**

In `src/pages/CombatArena.tsx`, add the import at the top:

```tsx
import { ArenaNav } from '@/components/combat/ArenaNav';
```

Then add `<ArenaNav />` right after `<PageSEO>` and before the main content div:

```tsx
return (
  <PageTransition>
    <PageSEO
      title="Combat Arena - Wojak Battles"
      description="Battle your Wojak NFTs in turn-based combat. 18 types, abilities, moves, ELO ranking."
      path="/arena"
      type="game"
    />
    <ArenaNav />
    <div className="flex flex-col items-center p-4 gap-6 max-w-2xl mx-auto">
```

Also update the `PageSEO` path from `/games/combat` to `/arena`.

**Step 2: Verify ArenaNav renders**

Run: `npm run dev`

Navigate to `http://localhost:5173/arena` — should see Battle | Leaderboard nav tabs at top.

**Step 3: Commit**

```bash
git add src/pages/CombatArena.tsx
git commit -m "feat: wire ArenaNav into CombatArena, update SEO path to /arena"
```

---

### Task 4: Create ArenaLeaderboard page

**Files:**
- Create: `src/pages/ArenaLeaderboard.tsx`
- Reference: `src/components/combat/CombatLeaderboard.tsx` (reuse entirely)

**Step 1: Create the page wrapper**

Create `src/pages/ArenaLeaderboard.tsx`:

```tsx
import { PageTransition } from '@/components/layout/PageTransition';
import { PageSEO } from '@/components/seo';
import { ArenaNav } from '@/components/combat/ArenaNav';
import { CombatLeaderboard } from '@/components/combat/CombatLeaderboard';

export default function ArenaLeaderboard() {
  return (
    <PageTransition>
      <PageSEO
        title="Arena Leaderboard - Strongest Fighters"
        description="See the top-ranked Wojak fighters by XP, ELO, and wins."
        path="/arena/leaderboard"
      />
      <ArenaNav />
      <div className="flex flex-col items-center p-4 gap-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Strongest Fighters</h1>
        <p className="text-secondary text-center text-sm">
          The top Wojak fighters ranked by total XP and level.
        </p>
        <div className="w-full">
          <CombatLeaderboard />
        </div>
      </div>
    </PageTransition>
  );
}
```

**Step 2: Verify no TS errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep ArenaLeaderboard || echo "No errors"`

**Step 3: Commit**

```bash
git add src/pages/ArenaLeaderboard.tsx
git commit -m "feat: create ArenaLeaderboard page wrapping CombatLeaderboard"
```

---

### Task 5: Register ArenaLeaderboard route in App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add lazy import and route**

At the top of `src/App.tsx`, add the lazy import near the other page imports (after the CombatArena import around line 96):

```tsx
const ArenaLeaderboard = lazy(() => import('./pages/ArenaLeaderboard'));
```

Then add the route inside the `<Route path="/" element={<AppLayout />}>` block, right after the `/arena` route:

```tsx
<Route
  path="arena/leaderboard"
  element={
    <GameErrorBoundary gameName="Arena Leaderboard">
      <Suspense fallback={<GameLoading gameName="Arena Leaderboard" />}>
        <ArenaLeaderboard />
      </Suspense>
    </GameErrorBoundary>
  }
/>
```

**Step 2: Verify route works**

Run: `npm run dev`

Navigate to `http://localhost:5173/arena/leaderboard` — should render ArenaLeaderboard with CombatLeaderboard.

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: register /arena/leaderboard route in App.tsx"
```

---

### Task 6: Add fighters-by-DID API endpoint

**Files:**
- Modify: `functions/api/combat/fighter.ts`

**Context:** The existing `/api/combat/fighter?nftId=xxx` only returns one fighter. The CombatArena page needs to fetch ALL fighters owned by a DID. We'll add a second query parameter `ownerDid`.

**Step 1: Add DID-based query to the existing fighter endpoint**

In `functions/api/combat/fighter.ts`, modify `onRequestGet` to also support `?ownerDid=xxx`:

```tsx
// functions/api/combat/fighter.ts
// GET /api/combat/fighter?nftId=xxx — lookup a combat fighter by NFT ID
// GET /api/combat/fighter?ownerDid=xxx — lookup ALL combat fighters owned by a DID

import { jsonResponse, errorResponse, buildFighterResponse, isValidDid } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const nftId = url.searchParams.get('nftId');
  const ownerDid = url.searchParams.get('ownerDid');

  if (ownerDid) {
    if (!isValidDid(ownerDid)) return errorResponse('Invalid DID format');

    const results = await context.env.DB.prepare(
      'SELECT * FROM combat_fighters WHERE owner_did = ? ORDER BY level DESC, xp DESC'
    ).bind(ownerDid).all();

    const fighters = (results.results ?? []).map((row: any) => buildFighterResponse(row));
    return jsonResponse({ ownerDid, fighters });
  }

  if (!nftId) return errorResponse('Missing nftId or ownerDid parameter');

  const row = await context.env.DB.prepare(
    'SELECT * FROM combat_fighters WHERE nft_id = ?'
  ).bind(nftId).first();

  if (!row) return errorResponse('Fighter not found', 404);

  return jsonResponse(buildFighterResponse(row));
};
```

**Step 2: Verify endpoint works**

Run: `npm run dev`

Test with curl: `curl "http://localhost:5173/api/combat/fighter?ownerDid=did:chia:1test" | jq`
Expected: `{ "ownerDid": "...", "fighters": [] }` (empty if no fighters)

**Step 3: Commit**

```bash
git add functions/api/combat/fighter.ts
git commit -m "feat: add ownerDid query to fighter endpoint for DID-based lookup"
```

---

### Task 7: Wire DID auth and fighter loading into CombatArena

**Files:**
- Modify: `src/pages/CombatArena.tsx`

**Context:** CombatArena currently has a TODO at line 31 about auth wiring. We need to use `useSageWallet()` to get the DID, then fetch fighters from `/api/combat/fighter?ownerDid=xxx`.

**Step 1: Import useSageWallet and wire up DID + fighter loading**

Replace the contents of `src/pages/CombatArena.tsx`:

```tsx
/**
 * Combat Arena Page — /arena
 *
 * Main entry point for the combat system.
 * Shows queue panel, active battle, and recent history.
 */

import { useState, useCallback, useEffect } from 'react';
import { PageSEO } from '@/components/seo';
import { PageTransition } from '@/components/layout/PageTransition';
import { QueuePanel } from '@/components/combat/QueuePanel';
import { BattleHistory } from '@/components/combat/BattleHistory';
import { ArenaNav } from '@/components/combat/ArenaNav';
import { useSageWallet } from '@/sage-wallet';

interface FighterSummary {
  nft_id: string;
  edition: number;
  type: string;
  nature: string;
  ability: string;
  level: number;
  elo: number;
}

export default function CombatArena() {
  const { getDIDs, isConnected } = useSageWallet();
  const [ownerDid, setOwnerDid] = useState<string | null>(null);
  const [fighters, setFighters] = useState<FighterSummary[]>([]);
  const [selectedFighter, setSelectedFighter] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeBattleId, setActiveBattleId] = useState<number | null>(null);

  // Resolve DID from wallet
  useEffect(() => {
    if (!isConnected) return;
    (async () => {
      try {
        const dids = await getDIDs();
        if (dids.length > 0) {
          setOwnerDid(dids[0].did);
        }
      } catch (err) {
        console.error('[CombatArena] DID fetch error:', err);
      }
    })();
  }, [isConnected, getDIDs]);

  // Load fighters by DID
  useEffect(() => {
    if (!ownerDid) return;
    (async () => {
      try {
        const res = await fetch(`/api/combat/fighter?ownerDid=${encodeURIComponent(ownerDid)}`);
        const data = await res.json();
        setFighters(data.fighters ?? []);
        if (data.fighters?.length > 0) {
          setSelectedFighter(data.fighters[0].nft_id);
        }
      } catch (err) {
        console.error('[CombatArena] Fighter fetch error:', err);
      }
    })();
  }, [ownerDid]);

  const handleQueue = useCallback(async (nftId: string, battleMode: 'manual' | 'auto') => {
    if (!ownerDid) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/combat/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nftId, ownerDid, battleMode }),
      });
      const data = await res.json();
      setQueueStatus(data);
      if (data.battleId) {
        setActiveBattleId(data.battleId);
      }
    } catch (err) {
      console.error('[CombatArena] Queue error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [ownerDid]);

  const handleLeaveQueue = useCallback(async (nftId: string) => {
    if (!ownerDid) return;
    setIsLoading(true);
    try {
      await fetch(`/api/combat/queue?nftId=${nftId}&ownerDid=${encodeURIComponent(ownerDid)}`, { method: 'DELETE' });
      setQueueStatus(null);
    } catch (err) {
      console.error('[CombatArena] Leave queue error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [ownerDid]);

  return (
    <PageTransition>
      <PageSEO
        title="Combat Arena - Wojak Battles"
        description="Battle your Wojak NFTs in turn-based combat. 18 types, abilities, moves, ELO ranking."
        path="/arena"
        type="game"
      />
      <ArenaNav />
      <div className="flex flex-col items-center p-4 gap-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Combat Arena</h1>
        <p className="text-secondary text-center text-sm">
          Send your Wojak into battle. Earn XP, climb the leaderboard, and prove your fighter is the strongest.
        </p>

        {/* Connection prompt */}
        {!isConnected && (
          <div className="card-static p-4 w-full text-center">
            <p className="text-muted text-sm">Connect your wallet to view your fighters and enter battles.</p>
          </div>
        )}

        {/* No fighters state */}
        {isConnected && ownerDid && fighters.length === 0 && (
          <div className="card-static p-4 w-full text-center">
            <p className="text-muted text-sm">No combat fighters found. Mint a Your Wojak NFT to get started.</p>
          </div>
        )}

        {/* Queue Panel */}
        {fighters.length > 0 && (
          <div className="w-full">
            <QueuePanel
              fighters={fighters as any}
              onQueue={handleQueue}
              onLeaveQueue={handleLeaveQueue}
              queueStatus={queueStatus}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Active battle link */}
        {activeBattleId && (
          <div className="card p-4 w-full text-center">
            <p className="text-secondary text-sm mb-2">Active Battle</p>
            <a
              href={`/arena/battle/${activeBattleId}`}
              className="btn btn-primary"
            >
              Go to Battle #{activeBattleId}
            </a>
          </div>
        )}

        {/* Battle History */}
        {selectedFighter && (
          <div className="w-full">
            <h2 className="text-lg font-semibold mb-3">Recent Battles</h2>
            <BattleHistory
              nftId={selectedFighter}
              limit={10}
              onSelectBattle={(id) => window.location.href = `/arena/battle/${id}`}
            />
          </div>
        )}
      </div>
    </PageTransition>
  );
}
```

**Step 2: Verify the page renders and connects wallet**

Run: `npm run dev`

Navigate to `http://localhost:5173/arena` — should show "Connect your wallet" prompt when not connected, and fighter list when connected.

**Step 3: Commit**

```bash
git add src/pages/CombatArena.tsx
git commit -m "feat: wire DID auth, fighter loading, and BattleHistory into CombatArena"
```

---

## Package B: Vote XP Pipeline (backend)

### Task 8: Create DB migration for vote XP tracking

**Files:**
- Create: `functions/migrations/061_vote_xp_tracking.sql`

**Step 1: Write the migration**

Create `functions/migrations/061_vote_xp_tracking.sql`:

```sql
-- 061_vote_xp_tracking.sql
-- Tracks when vote XP was last calculated for each combat fighter.
-- Used by the Vote XP Pipeline to avoid double-counting.

ALTER TABLE combat_fighters ADD COLUMN vote_xp_last_updated TEXT DEFAULT NULL;
```

**Step 2: Verify the migration file exists**

Run: `ls functions/migrations/061_vote_xp_tracking.sql`

Expected: file exists.

**Step 3: Commit**

```bash
git add functions/migrations/061_vote_xp_tracking.sql
git commit -m "migration: add vote_xp_last_updated column to combat_fighters"
```

---

### Task 9: Create Vote XP API endpoint

**Files:**
- Create: `functions/api/combat/vote-xp.ts`
- Reference: `functions/api/combat/_shared.ts` for helpers

**Context:** This endpoint is called periodically (by the DID indexer worker or manually) to award XP to combat fighters based on their net upvotes. Formula: `max(0, net_likes_since_last_calc) * 2`.

**Step 1: Create the endpoint**

Create `functions/api/combat/vote-xp.ts`:

```tsx
// functions/api/combat/vote-xp.ts
// POST /api/combat/vote-xp — Award XP to combat fighters from net upvotes
// Called by DID indexer worker or admin. Requires ADMIN_SECRET.
//
// For each fighter with a matching wojak_scores entry:
// 1. Calculate net votes received since last calculation
// 2. Award XP_PER_NET_LIKE (2) XP per net positive vote
// 3. Update tracking timestamp

import { jsonResponse, errorResponse } from './_shared';

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const XP_PER_NET_LIKE = 2;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Admin auth
  const authHeader = context.request.headers.get('Authorization');
  if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
    return errorResponse('Unauthorized', 401);
  }

  const db = context.env.DB;

  // Find all fighters that have a matching wojak_scores entry (joined by nft_id).
  // For fighters that have never had vote XP calculated (vote_xp_last_updated IS NULL),
  // use all net_score. For others, use the delta since last calculation.
  const fighters = await db.prepare(`
    SELECT
      cf.nft_id,
      cf.xp,
      cf.level,
      cf.vote_xp_last_updated,
      ws.net_score,
      ws.last_voted_at
    FROM combat_fighters cf
    INNER JOIN wojak_scores ws ON cf.nft_id = ws.nft_id
    WHERE ws.net_score > 0
      AND (cf.vote_xp_last_updated IS NULL OR ws.last_voted_at > cf.vote_xp_last_updated)
  `).all();

  if (!fighters.results || fighters.results.length === 0) {
    return jsonResponse({ success: true, updated: 0, message: 'No fighters with new votes' });
  }

  let updated = 0;
  let totalXpAwarded = 0;

  for (const row of fighters.results) {
    const nftId = row.nft_id as string;
    const currentXp = row.xp as number;
    const currentLevel = row.level as number;
    const netScore = row.net_score as number;
    const lastUpdated = row.vote_xp_last_updated as string | null;

    // For first-time calculation, we need to track the baseline.
    // To avoid double-counting, we award XP only for the net_score value,
    // then mark the current time. Next run will only pick up new votes
    // (since last_voted_at > vote_xp_last_updated).
    //
    // On subsequent runs, since we filter by last_voted_at > vote_xp_last_updated,
    // any fighter that appears here had new votes. We award based on the current
    // net_score. To properly track deltas we'd need a snapshot column.
    // Simpler approach: store net_score_at_last_calc and use delta.

    // We'll award: max(0, net_score) * XP_PER_NET_LIKE if first time,
    // or delta-based if we have a previous snapshot.
    // For this, we need a snapshot column. Let's use a simple approach:
    // store last_net_score_snapshot alongside vote_xp_last_updated.
    //
    // IMPORTANT: This endpoint uses the snapshot approach. The migration
    // must also add a vote_xp_net_score_snapshot column. See Task 8 amendment.

    // For now, award XP = max(0, netScore) * XP_PER_NET_LIKE for first time,
    // and skip subsequent (delta will be handled after snapshot column added).
    if (lastUpdated !== null) {
      // Already processed — skip until we have delta tracking
      continue;
    }

    const voteXp = Math.max(0, netScore) * XP_PER_NET_LIKE;
    if (voteXp <= 0) continue;

    const newXp = currentXp + voteXp;

    // Calculate new level from XP thresholds
    const levelRow = await db.prepare(
      'SELECT MAX(level) as new_level FROM combat_level_thresholds WHERE xp_required <= ?'
    ).bind(newXp).first<{ new_level: number }>();
    const newLevel = levelRow?.new_level ?? currentLevel;

    await db.prepare(`
      UPDATE combat_fighters
      SET xp = ?, level = ?, vote_xp_last_updated = datetime('now'), updated_at = datetime('now')
      WHERE nft_id = ?
    `).bind(newXp, newLevel, nftId).run();

    updated++;
    totalXpAwarded += voteXp;
  }

  return jsonResponse({ success: true, updated, totalXpAwarded });
};
```

**Step 2: Verify no TS errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep vote-xp || echo "No errors"`

**Step 3: Commit**

```bash
git add functions/api/combat/vote-xp.ts
git commit -m "feat: create vote-xp endpoint for awarding XP from net upvotes"
```

---

### Task 10: Amend migration for net_score snapshot tracking

**Files:**
- Modify: `functions/migrations/061_vote_xp_tracking.sql`

**Context:** The vote-xp endpoint needs to track the net_score at last calculation to compute deltas on subsequent runs.

**Step 1: Update the migration**

Replace `functions/migrations/061_vote_xp_tracking.sql` with:

```sql
-- 061_vote_xp_tracking.sql
-- Tracks vote XP calculation state for each combat fighter.
-- vote_xp_last_updated: when vote XP was last awarded
-- vote_xp_net_snapshot: the net_score value at last calculation (for delta)

ALTER TABLE combat_fighters ADD COLUMN vote_xp_last_updated TEXT DEFAULT NULL;
ALTER TABLE combat_fighters ADD COLUMN vote_xp_net_snapshot INTEGER DEFAULT 0;
```

**Step 2: Commit**

```bash
git add functions/migrations/061_vote_xp_tracking.sql
git commit -m "migration: add vote_xp_net_snapshot for delta tracking"
```

---

### Task 11: Improve vote-xp endpoint with delta-based calculation

**Files:**
- Modify: `functions/api/combat/vote-xp.ts`

**Step 1: Rewrite with proper delta tracking**

Replace `functions/api/combat/vote-xp.ts` with:

```tsx
// functions/api/combat/vote-xp.ts
// POST /api/combat/vote-xp — Award XP to combat fighters from net upvotes
// Called by DID indexer worker or admin. Requires ADMIN_SECRET.
//
// For each fighter with a matching wojak_scores entry:
// 1. Calculate delta = current net_score - vote_xp_net_snapshot
// 2. Award max(0, delta) * XP_PER_NET_LIKE XP (downvotes reduce delta, never subtract XP)
// 3. Update snapshot and timestamp

import { jsonResponse, errorResponse } from './_shared';

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const XP_PER_NET_LIKE = 2;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Admin auth
  const authHeader = context.request.headers.get('Authorization');
  if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
    return errorResponse('Unauthorized', 401);
  }

  const db = context.env.DB;

  // Find fighters with new votes since last snapshot.
  // Join combat_fighters with wojak_scores by nft_id.
  // Only process fighters where net_score has changed from snapshot.
  const fighters = await db.prepare(`
    SELECT
      cf.nft_id,
      cf.xp,
      cf.level,
      cf.vote_xp_net_snapshot,
      ws.net_score
    FROM combat_fighters cf
    INNER JOIN wojak_scores ws ON cf.nft_id = ws.nft_id
    WHERE ws.net_score > cf.vote_xp_net_snapshot
  `).all();

  if (!fighters.results || fighters.results.length === 0) {
    return jsonResponse({ success: true, updated: 0, totalXpAwarded: 0, message: 'No new votes to process' });
  }

  let updated = 0;
  let totalXpAwarded = 0;

  for (const row of fighters.results) {
    const nftId = row.nft_id as string;
    const currentXp = row.xp as number;
    const currentLevel = row.level as number;
    const snapshot = row.vote_xp_net_snapshot as number;
    const netScore = row.net_score as number;

    // Delta: how much net_score increased since last snapshot
    const delta = netScore - snapshot;
    // Only award for positive delta (downvotes shrink delta, never go negative)
    const voteXp = Math.max(0, delta) * XP_PER_NET_LIKE;
    if (voteXp <= 0) continue;

    const newXp = currentXp + voteXp;

    // Calculate new level from XP thresholds
    const levelRow = await db.prepare(
      'SELECT MAX(level) as new_level FROM combat_level_thresholds WHERE xp_required <= ?'
    ).bind(newXp).first<{ new_level: number }>();
    const newLevel = levelRow?.new_level ?? currentLevel;

    await db.prepare(`
      UPDATE combat_fighters
      SET xp = ?,
          level = ?,
          vote_xp_last_updated = datetime('now'),
          vote_xp_net_snapshot = ?,
          updated_at = datetime('now')
      WHERE nft_id = ?
    `).bind(newXp, newLevel, netScore, nftId).run();

    updated++;
    totalXpAwarded += voteXp;
  }

  return jsonResponse({ success: true, updated, totalXpAwarded });
};
```

**Step 2: Verify no TS errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep vote-xp || echo "No errors"`

**Step 3: Commit**

```bash
git add functions/api/combat/vote-xp.ts
git commit -m "feat: implement delta-based vote XP calculation with snapshot tracking"
```

---

### Task 12: Wire vote-xp call into DID indexer

**Files:**
- Modify: `workers/did-indexer/worker.ts`

**Context:** The DID indexer already runs every 30 minutes and calls `/api/game/battle-resolve` at the end. We'll add a call to `/api/combat/vote-xp` right after the battle-resolve call.

**Step 1: Add the vote-xp call**

In `workers/did-indexer/worker.ts`, find the battle-resolve block (lines 99-117) and add after it:

```ts
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
```

**Step 2: Verify no TS errors in the worker**

Run: `npx tsc --noEmit --pretty 2>&1 | grep worker || echo "No errors"`

**Step 3: Commit**

```bash
git add workers/did-indexer/worker.ts
git commit -m "feat: wire vote-xp call into DID indexer worker (every 30 min)"
```

---

## Package C: Swipe Battle XP

### Task 13: Award XP to winners of community-voted battles

**Files:**
- Modify: `functions/api/game/battle-resolve.ts`

**Context:** When a community-voted Swipe battle resolves and has a winner, award 8 XP to the winning fighter's `combat_fighters.xp`. The losing fighter gets 0. This bridges the Swipe battle system into the unified XP.

**Step 1: Add XP award logic after the winner is determined**

In `functions/api/game/battle-resolve.ts`, find the block after line 134 where the battle is successfully resolved with a winner (`if (updateResult.meta.changes === 0) { ... continue; }`). After the score updates batch (line 181), add:

```tsx
      // Award combat XP to winner's fighter (if they have one)
      try {
        const SWIPE_BATTLE_WIN_XP = 8;
        const winnerFighter = await context.env.DB.prepare(
          'SELECT nft_id, xp, level FROM combat_fighters WHERE nft_id = ?'
        ).bind(winnerNftId).first<{ nft_id: string; xp: number; level: number }>();

        if (winnerFighter) {
          const newXp = winnerFighter.xp + SWIPE_BATTLE_WIN_XP;
          const levelRow = await context.env.DB.prepare(
            'SELECT MAX(level) as new_level FROM combat_level_thresholds WHERE xp_required <= ?'
          ).bind(newXp).first<{ new_level: number }>();
          const newLevel = levelRow?.new_level ?? winnerFighter.level;

          await context.env.DB.prepare(
            "UPDATE combat_fighters SET xp = ?, level = ?, updated_at = datetime('now') WHERE nft_id = ?"
          ).bind(newXp, newLevel, winnerNftId).run();
        }
      } catch (err) {
        // Non-fatal: log but don't fail the resolution
        console.error(`[Battle Resolve] Failed to award combat XP for battle ${battleId}:`, err);
      }
```

**Step 2: Verify no TS errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep battle-resolve || echo "No errors"`

**Step 3: Commit**

```bash
git add functions/api/game/battle-resolve.ts
git commit -m "feat: award 8 combat XP to winner of community-voted Swipe battles"
```

---

## Package D: Cross-Navigation + Leaderboard Tab

### Task 14: Add Arena link to SwipeNav

**Files:**
- Modify: `src/components/game/SwipeNav.tsx`

**Step 1: Add the Arena link**

In `src/components/game/SwipeNav.tsx`, add a divider and Arena link after the NAV_ITEMS loop. Replace the `SwipeNav` component:

```tsx
import { NavLink } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { Swords } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/swipe', label: 'Vote', end: true },
  { to: '/swipe/dashboard', label: 'Dashboard', end: false },
  { to: '/swipe/battles', label: 'Battles', end: false },
  { to: '/swipe/leaderboard', label: 'Leaderboard', end: false },
  { to: '/swipe/activity', label: 'Activity', end: false },
];

export function SwipeNav() {
  const { isRegistered } = useGame();

  if (!isRegistered) return null;

  return (
    <nav
      className="hide-scrollbar"
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 0,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'var(--color-bg)',
      }}
    >
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          style={({ isActive }) => ({
            padding: '12px 16px',
            fontSize: 13,
            fontWeight: 500,
            color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
            borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'color 150ms, border-color 150ms',
          })}
        >
          {item.label}
        </NavLink>
      ))}
      {/* Divider + Arena cross-link */}
      <div style={{
        width: 1,
        background: 'var(--color-border)',
        margin: '8px 4px',
        flexShrink: 0,
      }} />
      <NavLink
        to="/arena"
        style={{
          padding: '12px 16px',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text-muted)',
          borderBottom: '2px solid transparent',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          transition: 'color 150ms',
        }}
      >
        <Swords size={14} />
        Arena
      </NavLink>
    </nav>
  );
}
```

**Step 2: Verify SwipeNav renders Arena link**

Run: `npm run dev`

Navigate to `http://localhost:5173/swipe` — should see Arena link at the end of the nav.

**Step 3: Commit**

```bash
git add src/components/game/SwipeNav.tsx
git commit -m "feat: add Arena cross-link to SwipeNav with divider"
```

---

### Task 15: Add Swipe link to ArenaNav

**Files:**
- Modify: `src/components/combat/ArenaNav.tsx`

**Step 1: Add the Swipe cross-link**

Update `src/components/combat/ArenaNav.tsx` to add a Swipe link with icon:

```tsx
import { NavLink } from 'react-router-dom';
import { Heart } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/arena', label: 'Battle', end: true },
  { to: '/arena/leaderboard', label: 'Leaderboard', end: false },
];

export function ArenaNav() {
  return (
    <nav
      className="hide-scrollbar"
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 0,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'var(--color-bg)',
      }}
    >
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          style={({ isActive }) => ({
            padding: '12px 16px',
            fontSize: 13,
            fontWeight: 500,
            color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
            borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'color 150ms, border-color 150ms',
          })}
        >
          {item.label}
        </NavLink>
      ))}
      {/* Divider + Swipe cross-link */}
      <div style={{
        width: 1,
        background: 'var(--color-border)',
        margin: '8px 4px',
        flexShrink: 0,
      }} />
      <NavLink
        to="/swipe"
        style={{
          padding: '12px 16px',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text-muted)',
          borderBottom: '2px solid transparent',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          transition: 'color 150ms',
        }}
      >
        <Heart size={14} />
        Swipe
      </NavLink>
    </nav>
  );
}
```

**Step 2: Verify ArenaNav renders Swipe link**

Run: `npm run dev`

Navigate to `http://localhost:5173/arena` — should see Swipe link at the end of nav.

**Step 3: Commit**

```bash
git add src/components/combat/ArenaNav.tsx
git commit -m "feat: add Swipe cross-link to ArenaNav with divider"
```

---

### Task 16: Add Fighters tab to the main /leaderboard page

**Files:**
- Modify: `src/types/leaderboard.ts`
- Modify: `src/components/Leaderboard/Leaderboard.tsx`

**Context:** The existing `/leaderboard` page shows arcade game scores. We need to add a "Fighters" tab that shows the combat leaderboard. The game selector sidebar already lists games. We'll add "Combat Arena" as a special game entry that loads from the combat leaderboard API instead of the arcade leaderboard API.

**Step 1: Add 'combat-arena' to GameId type**

In `src/types/leaderboard.ts`, add `'combat-arena'` to the `GameId` union type:

```tsx
export type GameId =
  | 'orange-stack'
  | 'memory-match'
  | 'orange-pong'
  | 'wojak-runner'
  | 'orange-juggle'
  | 'knife-game'
  | 'color-reaction'
  | 'merge-2048'
  | 'block-puzzle'
  | 'flappy-orange'
  | 'citrus-drop'
  | 'orange-snake'
  | 'brick-breaker'
  | 'wojak-whack'
  | 'combat-arena';
```

Add to `GAME_NAMES`:

```tsx
export const GAME_NAMES: Record<GameId, string> = {
  // ... existing entries ...
  'combat-arena': 'Combat Arena',
};
```

Add to `ACTIVE_GAME_IDS`:

```tsx
export const ACTIVE_GAME_IDS: GameId[] = [
  'combat-arena',  // Fighters tab - first in list
  'orange-stack',
  // ... rest unchanged
];
```

Add to `GAME_EMOJIS` (in `Leaderboard.tsx`):

```tsx
'combat-arena': '⚔️',
```

**Step 2: Handle combat-arena in Leaderboard.tsx**

In `src/components/Leaderboard/Leaderboard.tsx`, modify the `fetchLeaderboard` function to detect `combat-arena` and fetch from a different API:

Find the `fetchLeaderboard` callback (around line 139) and add a branch at the start:

```tsx
const fetchLeaderboard = useCallback(async (gameId: GameId, tf: TimeframeType) => {
  setIsLoading(true);
  setError(null);

  try {
    if (gameId === 'combat-arena') {
      // Combat leaderboard uses a different API
      const response = await fetch('/api/combat/leaderboard?sortBy=level&limit=100');
      if (!response.ok) throw new Error('Failed to fetch combat leaderboard');
      const data = await response.json();

      // Transform combat fighters to leaderboard entries
      const entriesFromCombat = (data.fighters || []).map((f: any, idx: number) => ({
        rank: idx + 1,
        userId: f.nft_id,
        displayName: `#${f.edition} ${f.type}`,
        avatar: { type: 'emoji' as const, value: '⚔️', source: 'default' as const },
        score: f.xp,
        level: f.level,
        createdAt: new Date().toISOString(),
      }));

      setEntries(entriesFromCombat);
      setUserPosition(null);
      setResetTime(undefined);
    } else {
      // Original arcade leaderboard fetch
      const response = await fetch(`/api/leaderboard/${gameId}?limit=100&timeframe=${tf}`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      const data = await response.json();

      const entriesWithUser = (data.entries || []).map((entry: LeaderboardEntryData) => ({
        ...entry,
        isCurrentUser: user?.id === entry.userId,
      }));

      setEntries(entriesWithUser);
      setUserPosition(data.userPosition || null);
      setResetTime(data.resetTime);
    }
  } catch (err) {
    console.error('[Leaderboard] Fetch error:', err);
    setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
  } finally {
    setIsLoading(false);
  }
}, [user?.id]);
```

**Step 3: Verify Fighters tab appears and loads**

Run: `npm run dev`

Navigate to `http://localhost:5173/leaderboard` — should see "Combat Arena" in the game sidebar/dropdown. Clicking it should fetch from `/api/combat/leaderboard`.

**Step 4: Commit**

```bash
git add src/types/leaderboard.ts src/components/Leaderboard/Leaderboard.tsx
git commit -m "feat: add Combat Arena (Fighters) tab to main leaderboard page"
```

---

## Package E: Infrastructure Audit

### Task 17: Verify and document DID indexer deployment status

**Files:**
- No code changes — investigation task
- Reference: `workers/did-indexer/wrangler.toml`, `workers/battle-cron/wrangler.toml`

**Step 1: Check if the DID indexer is deployed**

Run: `npx wrangler deployments list --name wojak-did-indexer 2>&1 | head -20`

If it returns deployment info, the worker is live. If not, it needs to be deployed.

**Step 2: Verify ADMIN_SECRET is bound**

Run: `npx wrangler secret list --name wojak-did-indexer 2>&1`

Check if `ADMIN_SECRET` is in the list. If not:

Run: `echo "Ask user to set ADMIN_SECRET: npx wrangler secret put ADMIN_SECRET --name wojak-did-indexer"`

**Step 3: Verify collection IDs against MintGarden**

The collection IDs in `workers/did-indexer/worker.ts` are:
- Phase 1: `col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah`
- Phase 2: `col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx`

Verify by checking: `curl "https://api.mintgarden.io/collections/col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah" | jq .name`

Expected: Should return the Phase 1 collection name ("Wojak Farmers Plot").

If names are swapped, swap the constant values in `worker.ts`.

**Step 4: Check if battle-cron is deployed separately**

Run: `npx wrangler deployments list --name wojak-battle-cron 2>&1 | head -10`

If deployed AND the DID indexer is also deployed (and running), battle-cron is redundant. Document the finding.

**Step 5: Commit any fixes**

If collection IDs needed swapping:
```bash
git add workers/did-indexer/worker.ts
git commit -m "fix: correct collection ID assignment in DID indexer"
```

---

## Package F: Build Verification

### Task 18: Verify TypeScript compilation

**Files:**
- No changes — verification only

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --pretty`

Expected: No errors. If there are errors, fix them before proceeding.

**Step 2: Run build**

Run: `npm run build`

Expected: Build succeeds with no errors.

**Step 3: Commit any fixes needed**

```bash
git add -A
git commit -m "fix: resolve any build errors from arena integration"
```

---

### Task 19: Verify all routes work in dev

**Files:**
- No changes — verification only

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Verify each route**

- `http://localhost:5173/arena` → CombatArena with ArenaNav
- `http://localhost:5173/arena/leaderboard` → ArenaLeaderboard with CombatLeaderboard
- `http://localhost:5173/games/combat` → Redirects to `/arena`
- `http://localhost:5173/swipe` → GameVoting with SwipeNav (should have Arena link)
- `http://localhost:5173/leaderboard` → Should show Combat Arena in game selector

**Step 3: Document any issues found**

If routes don't work, investigate and fix. Typical issues:
- Missing lazy import
- Route order conflict
- Component import path wrong

---

### Task 20: Final commit and summary

**Step 1: Check for uncommitted changes**

Run: `git status`

**Step 2: If any uncommitted changes, stage and commit**

```bash
git add -A
git commit -m "feat: complete unified Swipe + Arena integration

- Routes: /arena, /arena/leaderboard, redirect /games/combat → /arena
- ArenaNav + SwipeNav cross-links
- Fighters-by-DID API endpoint
- Vote XP pipeline (delta-based, called by DID indexer)
- Swipe battle XP (8 XP to winner)
- Combat Arena tab in main leaderboard
- DB migration for vote XP tracking columns"
```

**Step 3: List all changes**

Run: `git log --oneline -15`

Verify all commits are present and in order.
