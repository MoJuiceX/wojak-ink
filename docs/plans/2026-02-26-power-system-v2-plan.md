# Power System v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the dual power system with one simple formula (Plots×20 + Wojak votes + Collection Bonus), computed live everywhere.

**Architecture:** `_power.ts` becomes the single source of truth. The leaderboard and my-score both compute power live. The complex formula (_powerLevel.ts, power-level.ts, indexer recalc) is deleted. Collection bonus = 10% of net_score for top-42% Wojaks from other creators (DID check).

**Tech Stack:** Cloudflare Pages Functions (TypeScript), D1 SQL, React + Tailwind frontend.

**Design doc:** `docs/plans/2026-02-26-power-system-v2-design.md`

---

## Task 1: Rewrite `_power.ts` — New Collection Bonus

**Files:**
- Modify: `functions/api/fight-club/_power.ts` (entire file)

**Step 1: Rewrite `calculateCollectionBonus()`**

Remove the `walletAddress` parameter. Remove `sales_history` dependency. New logic:

```typescript
/**
 * Calculate collection bonus for holding top-ranked Wojaks from other creators.
 * Formula: 10% of net_score for each qualifying Wojak.
 * Qualifying = in top 42% by net_score AND creator DID != holder DID.
 */
export async function calculateCollectionBonus(
  db: D1Database,
  didId: string,
): Promise<{
  bonus: number;
  collectedCount: number;
  uniqueCreators: number;
}> {
  // 1. Compute top 42% threshold across ALL Your Wojaks
  const thresholdResult = await db.prepare(`
    SELECT net_score as threshold FROM wojak_scores
    ORDER BY net_score DESC
    LIMIT 1 OFFSET (SELECT CAST(COUNT(*) * 0.42 AS INTEGER) FROM wojak_scores)
  `).first<{ threshold: number }>();
  const threshold = thresholdResult?.threshold ?? 0;

  // 2. Find qualifying Wojaks:
  //    - Held by this DID
  //    - In top 42% by net_score
  //    - Creator's DID != holder DID (or creator has no DID = definitely different person)
  const result = await db.prepare(`
    SELECT
      dh.nft_id,
      ws.net_score,
      pm.wallet_address as creator_wallet,
      creator_gp.did_id as creator_did
    FROM did_holdings dh
    JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
    JOIN phase2_mints pm ON pm.mintgarden_launcher_id = dh.nft_id
    LEFT JOIN game_players creator_gp ON creator_gp.wallet_address = pm.wallet_address
    WHERE dh.did_id = ?
      AND dh.collection = 'phase2'
      AND ws.net_score >= ?
      AND (creator_gp.did_id IS NULL OR creator_gp.did_id != ?)
    ORDER BY ws.net_score DESC
  `).bind(didId, threshold, didId).all();

  const collected = result.results || [];
  const uniqueCreators = new Set(collected.map(w => w.creator_wallet as string)).size;

  // 3. Sum bonus: 10% of net_score per qualifying Wojak, floored at 0
  const bonus = collected.reduce((sum, w) => {
    const score = (w.net_score as number) || 0;
    return sum + Math.max(0, Math.floor(score * 0.10));
  }, 0);

  return { bonus, collectedCount: collected.length, uniqueCreators };
}
```

**Step 2: Update `calculateFullPower()` signature**

Remove `walletAddress` parameter:

```typescript
export async function calculateFullPower(
  db: D1Database,
  didId: string,
): Promise<PowerBreakdown> {
  const [plotResult, wojakResult, collectionResult] = await Promise.all([
    calculatePlotPower(db, didId),
    calculateWojakPower(db, didId),
    calculateCollectionBonus(db, didId),
  ]);

  return {
    plotPower: plotResult.power,
    plotCount: plotResult.count,
    wojakPower: wojakResult.power,
    wojakCount: wojakResult.count,
    collectionBonus: collectionResult.bonus,
    collectedWojakCount: collectionResult.collectedCount,
    uniqueCreatorsCount: collectionResult.uniqueCreators,
    totalPower: plotResult.power + wojakResult.power + collectionResult.bonus,
  };
}
```

**Step 3: Update imports**

Remove unused imports from `_shared.ts`:
```typescript
import { PLOT_POWER_VALUE } from '../game/_shared';
```
(Remove `COLLECTION_BONUS_PER_WOJAK` and `COLLECTION_BONUS_MAX` imports.)

**Step 4: Commit**

```bash
git add functions/api/fight-club/_power.ts
git commit -m "feat: rewrite collection bonus — 10% of net_score for top-42% Wojaks from other creators"
```

---

## Task 2: Clean Up `_shared.ts`

**Files:**
- Modify: `functions/api/game/_shared.ts:1-20`

**Step 1: Remove dead constants**

Remove these lines:
- `export const POWER_LEVEL_MAX = 9000;` (line 5)
- `export const COLLECTION_BONUS_PER_WOJAK = 10;` (line 11)
- `export const COLLECTION_BONUS_MAX = 42;` (line 12)
- `export const COLLECTION_BONUS_CAP = 25;` (line 15)
- The entire `COLLECTION_BONUS_TIERS` array (lines 16-20)
- The `getCollectionBonusPerWojak` function (lines 23-25)

Keep: `PLOT_POWER_VALUE`, `VOTES_PER_DAY*`, `PHASE*_COLLECTION_ID`, and everything else.

**Step 2: Check for broken imports**

Search for any file importing the removed constants. Fix or remove:
- `POWER_LEVEL_MAX` — imported by `_powerLevel.ts` (being deleted), `my-score.ts` (`COLLECTION_BONUS_CAP` used in meta response — remove from meta)
- `COLLECTION_BONUS_PER_WOJAK` / `COLLECTION_BONUS_MAX` — imported by `_power.ts` (already removed in Task 1)

**Step 3: Commit**

```bash
git add functions/api/game/_shared.ts
git commit -m "chore: remove dead power constants from _shared.ts"
```

---

## Task 3: Gut `_powerLevel.ts` — Keep Only Utilities

**Files:**
- Modify: `functions/api/game/_powerLevel.ts`

**Step 1: Remove `recalcPowerLevel()` and keep utilities**

Delete lines 1-106 (the entire `recalcPowerLevel` function, imports, and constants). Keep only `getNftHolderDid()` (lines 112-117) and `getNftCreatorDid()` (lines 123-140).

New file should be:

```typescript
// NFT ownership utilities
// Used by: vote.ts, battle-resolve.ts

/**
 * Get the DID that holds a specific NFT.
 * Returns null if not held by any registered player.
 */
export async function getNftHolderDid(db: D1Database, nftId: string): Promise<string | null> {
  const holder = await db.prepare(
    'SELECT did_id FROM did_holdings WHERE nft_id = ?'
  ).bind(nftId).first<{ did_id: string }>();
  return holder?.did_id ?? null;
}

/**
 * Get the DID of the creator of an NFT (by wallet address).
 * Returns null if creator is not a registered player.
 */
export async function getNftCreatorDid(db: D1Database, nftId: string): Promise<string | null> {
  const creatorRow = await db.prepare(`
    SELECT creator_wallet FROM wojak_scores WHERE nft_id = ?
    UNION ALL
    SELECT wallet_address AS creator_wallet FROM phase2_mints WHERE mintgarden_launcher_id = ?
    LIMIT 1
  `).bind(nftId, nftId).first<{ creator_wallet: string }>();

  if (!creatorRow?.creator_wallet) return null;

  const player = await db.prepare(
    'SELECT did_id FROM game_players WHERE wallet_address = ?'
  ).bind(creatorRow.creator_wallet).first<{ did_id: string }>();

  return player?.did_id ?? null;
}
```

**Step 2: Delete `_powerLevel.test.ts`**

```bash
rm functions/api/game/_powerLevel.test.ts
```

**Step 3: Commit**

```bash
git add functions/api/game/_powerLevel.ts
git rm functions/api/game/_powerLevel.test.ts
git commit -m "refactor: remove recalcPowerLevel from _powerLevel.ts, keep NFT utilities"
```

---

## Task 4: Remove `recalcPowerLevel` From Callers

**Files:**
- Modify: `functions/api/game/vote.ts:8,251-262`
- Modify: `functions/api/game/battle-resolve.ts:13,220-223`
- Modify: `functions/api/combat/burn-assign-power.ts:6,51`
- Delete: `functions/api/game/power-level.ts`

**Step 1: Update `vote.ts`**

Line 8 — change import:
```typescript
// BEFORE:
import { recalcPowerLevel, getNftHolderDid, getNftCreatorDid } from './_powerLevel';
// AFTER:
import { getNftHolderDid, getNftCreatorDid } from './_powerLevel';
```

Lines 251-262 — remove entire power recalc block:
```typescript
// DELETE this entire block:
    // Event-driven power level updates
    // Recalc for holder of voted NFT and creator (their scores changed)
    if (netScoreDelta !== 0) {
      try {
        const holderDid = await getNftHolderDid(context.env.DB, nftId);
        const creatorDid = await getNftCreatorDid(context.env.DB, nftId);
        if (holderDid) await recalcPowerLevel(context.env.DB, holderDid);
        if (creatorDid && creatorDid !== holderDid) await recalcPowerLevel(context.env.DB, creatorDid);
      } catch (err) {
        console.warn('Power level recalc error (non-fatal):', err);
      }
    }
```

Note: `getNftHolderDid` and `getNftCreatorDid` are no longer used in vote.ts after removing this block. Remove the import entirely:
```typescript
// AFTER: (remove the import line entirely if unused)
```
Check if they're used elsewhere in vote.ts first.

**Step 2: Update `battle-resolve.ts`**

Line 13 — change import:
```typescript
// BEFORE:
import { recalcPowerLevel, getNftHolderDid, getNftCreatorDid } from './_powerLevel';
// AFTER:
import { getNftHolderDid, getNftCreatorDid } from './_powerLevel';
```

Lines 220-223 — remove recalcPowerLevel call:
```typescript
// DELETE:
        for (const did of affectedDids) {
          await recalcPowerLevel(context.env.DB, did);
        }
```

Keep the `getNftHolderDid`/`getNftCreatorDid` calls above since `affectedDids` may still be used for other purposes. Check context — if `affectedDids` is ONLY used for recalcPowerLevel, remove the entire try/catch block.

**Step 3: Update `burn-assign-power.ts`**

Line 6 — remove import:
```typescript
// DELETE:
import { recalcPowerLevel } from '../game/_powerLevel';
```

Line 51 — remove call, update response:
```typescript
// BEFORE:
    const newPowerLevel = await recalcPowerLevel(db, did);
    return jsonResponse({
      success: true,
      nftId,
      powerLevel: newPowerLevel ?? 0,
      message: '+50 power assigned.',
    });

// AFTER:
    return jsonResponse({
      success: true,
      nftId,
      message: '+50 power assigned.',
    });
```

**Step 4: Delete `power-level.ts` endpoint**

```bash
rm functions/api/game/power-level.ts
```

**Step 5: Commit**

```bash
git add functions/api/game/vote.ts functions/api/game/battle-resolve.ts functions/api/combat/burn-assign-power.ts
git rm functions/api/game/power-level.ts
git commit -m "refactor: remove all recalcPowerLevel calls, delete power-level endpoint"
```

---

## Task 5: Update `recalc-power-levels.ts` Admin Endpoint

**Files:**
- Modify: `functions/api/game/recalc-power-levels.ts`

**Step 1: Rewrite to use simple formula**

This admin endpoint is still useful for manual recalculation. Update it to use `calculateFullPower` from `_power.ts` and write the total to `game_players.power_level`:

```typescript
// POST /api/game/recalc-power-levels
// Batch recalculates power levels for all phase1_verified players using simple formula.

import { calculateFullPower } from '../fight-club/_power';

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const authHeader = context.request.headers.get('Authorization');
  if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const players = await context.env.DB.prepare(`
      SELECT did_id FROM game_players WHERE phase1_verified = 1
    `).all();

    const playerList = players.results || [];
    if (playerList.length === 0) {
      return Response.json({ success: true, updated: 0, message: 'No verified players.' });
    }

    let updated = 0;
    const errors: string[] = [];

    for (const player of playerList) {
      const did = player.did_id as string;
      try {
        const power = await calculateFullPower(context.env.DB, did);
        await context.env.DB.prepare(`
          UPDATE game_players
          SET power_level = ?, power_level_updated_at = datetime('now'), updated_at = datetime('now')
          WHERE did_id = ?
        `).bind(power.totalPower, did).run();
        updated += 1;
      } catch (err) {
        errors.push(`${did}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return Response.json({
      success: true,
      updated,
      total: playerList.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Recalc power levels error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
```

**Step 2: Commit**

```bash
git add functions/api/game/recalc-power-levels.ts
git commit -m "refactor: recalc-power-levels uses simple formula from _power.ts"
```

---

## Task 6: Remove Complex Formula From Indexer

**Files:**
- Modify: `workers/did-indexer/worker.ts`

**Step 1: Remove power calculation constants (lines 27-34)**

Delete:
```typescript
// Power level calculation constants (same as _powerLevel.ts)
const POWER_LEVEL_MAX = 10000;
const QUALITY_WEIGHT = 1.0;
const VALUE_BASE = 50;
const VALUE_LOG_SCALE = 30;
const BREADTH_BONUS = 15;
const CREATOR_QUALITY_WEIGHT = 0.5;
const CREATOR_SPREAD_BONUS = 10;
```

**Step 2: Remove `recalcPowerLevel()` function (lines 695-770)**

Delete the entire `async function recalcPowerLevel(...)` function.

**Step 3: Remove `recalcPowerLevel` calls**

Find all calls in the indexer:
- Line 361: `await recalcPowerLevel(env.DB, did);` — remove
- Line 394: `const newPowerLevel = await recalcPowerLevel(env.DB, did);` — remove (and any log that references `newPowerLevel`)

Replace with a comment if needed:
```typescript
// Power level is computed live by the API — no caching needed
```

**Step 4: Commit**

```bash
git add workers/did-indexer/worker.ts
git commit -m "refactor: remove complex power formula from DID indexer"
```

---

## Task 7: Fix `vote-leaderboard.ts` — Add Collection Bonus

**Files:**
- Modify: `functions/api/fight-club/vote-leaderboard.ts:175-322`

This is the most complex change. The leaderboard SQL needs a new CTE for collection bonus.

**Step 1: Rewrite `handlePlayers()` SQL**

Add two new CTEs: `top_threshold` and `collection_bonus`. Update the final SELECT to include collection_bonus in total_power.

```typescript
async function handlePlayers(db: D1Database, limit: number, offset: number, callerDid: string | null, start: number) {
  const playersQuery = `
    WITH top_threshold AS (
      SELECT COALESCE(
        (SELECT net_score FROM wojak_scores
         ORDER BY net_score DESC
         LIMIT 1 OFFSET (SELECT CAST(COUNT(*) * 0.42 AS INTEGER) FROM wojak_scores)),
        0
      ) as threshold
    ),
    wojak_scores_by_did AS (
      SELECT
        dh.did_id,
        ws.nft_id,
        ws.net_score,
        ws.total_votes,
        ws.edition_number,
        ROW_NUMBER() OVER (
          PARTITION BY dh.did_id
          ORDER BY ws.net_score DESC, ws.total_votes DESC, ws.edition_number ASC
        ) AS rn
      FROM did_holdings dh
      JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
      WHERE dh.collection = 'phase2'
    ),
    plot_counts AS (
      SELECT did_id, COUNT(*) as plot_count
      FROM did_holdings
      WHERE collection = 'phase1'
      GROUP BY did_id
    ),
    collection_bonus AS (
      SELECT
        dh.did_id,
        SUM(
          CASE
            WHEN ws.net_score >= (SELECT threshold FROM top_threshold)
                 AND (creator_gp.did_id IS NULL OR creator_gp.did_id != dh.did_id)
                 AND CAST(ws.net_score * 0.10 AS INTEGER) > 0
            THEN CAST(ws.net_score * 0.10 AS INTEGER)
            ELSE 0
          END
        ) as bonus,
        COUNT(
          CASE
            WHEN ws.net_score >= (SELECT threshold FROM top_threshold)
                 AND (creator_gp.did_id IS NULL OR creator_gp.did_id != dh.did_id)
            THEN 1
          END
        ) as collected_count
      FROM did_holdings dh
      JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
      JOIN phase2_mints pm ON pm.mintgarden_launcher_id = dh.nft_id
      LEFT JOIN game_players creator_gp ON creator_gp.wallet_address = pm.wallet_address
      WHERE dh.collection = 'phase2'
      GROUP BY dh.did_id
    ),
    player_scores AS (
      SELECT
        gp.did_id,
        dp.display_name,
        COALESCE(pc.plot_count, 0) as plot_count,
        COALESCE(pc.plot_count, 0) * ${PLOT_POWER_VALUE} as plot_power,
        COALESCE(SUM(wsd.net_score), 0) AS wojak_power,
        COUNT(DISTINCT wsd.nft_id) AS wojak_count,
        COALESCE(cb.bonus, 0) as collection_bonus,
        COALESCE(cb.collected_count, 0) as collected_count,
        MAX(CASE WHEN wsd.rn = 1 THEN wsd.net_score END) AS best_wojak_score,
        (
          SELECT pm.ipfs_image_uri
          FROM wojak_scores_by_did wsd2
          JOIN phase2_mints pm ON pm.mintgarden_launcher_id = wsd2.nft_id AND pm.status = 'minted'
          WHERE wsd2.did_id = gp.did_id AND wsd2.rn = 1
          LIMIT 1
        ) AS best_wojak_image
      FROM game_players gp
      LEFT JOIN did_profiles dp ON dp.did_id = gp.did_id
      LEFT JOIN wojak_scores_by_did wsd ON wsd.did_id = gp.did_id
      LEFT JOIN plot_counts pc ON pc.did_id = gp.did_id
      LEFT JOIN collection_bonus cb ON cb.did_id = gp.did_id
      WHERE gp.phase1_verified = 1
        AND gp.did_id IS NOT NULL AND gp.did_id != ''
      GROUP BY gp.did_id
    )
    SELECT
      ps.did_id,
      ps.display_name,
      ps.plot_count,
      ps.plot_power,
      ps.wojak_power,
      ps.wojak_count,
      ps.collection_bonus,
      ps.collected_count,
      (ps.plot_power + ps.wojak_power + ps.collection_bonus) as total_power,
      ps.best_wojak_score,
      ps.best_wojak_image
    FROM player_scores ps
    ORDER BY
      total_power DESC,
      ps.wojak_count DESC,
      ps.plot_count DESC,
      ps.did_id ASC
    LIMIT ? OFFSET ?
  `;

  const results = await db.prepare(playersQuery).bind(limit, offset).all();
```

**Step 2: Update the player mapping to include collection bonus**

In the `.map()` callback, add:
```typescript
      collectionBonus: (row.collection_bonus as number) || 0,
      collectedCount: (row.collected_count as number) || 0,
```

And update `totalPower` and `playerScore` to read from `row.total_power` (which now includes collection bonus).

**Step 3: Update the `yourRankQuery`**

The caller's rank query also needs collection bonus. Add the same `top_threshold` and `collection_bonus` CTEs, and change the rank comparison to include it:

```sql
WHERE (plot_power + wojak_power + collection_bonus) > (
  SELECT COALESCE(plot_power + wojak_power + collection_bonus, 0)
  FROM player_scores WHERE did_id = ?
)
```

**Step 4: Commit**

```bash
git add functions/api/fight-club/vote-leaderboard.ts
git commit -m "feat: include collection bonus in player leaderboard ranking"
```

---

## Task 8: Fix `my-score.ts` — Include Collection Bonus in Rank

**Files:**
- Modify: `functions/api/fight-club/my-score.ts:7,107,110,123-154`

**Step 1: Remove walletAddress from calculateFullPower call**

Line 110:
```typescript
// BEFORE:
const power = await calculateFullPower(db, did, walletAddress);
// AFTER:
const power = await calculateFullPower(db, did);
```

(The `walletAddress` variable at line 107 can be removed if unused elsewhere — check first.)

**Step 2: Fix the rank query to include collection bonus**

Lines 123-154 — the rank query currently only uses `plot_power + wojak_power`. Add the same `top_threshold` and `collection_bonus` CTEs, then compare against `plot_power + wojak_power + collection_bonus`.

**Step 3: Remove `COLLECTION_BONUS_CAP` from import and meta response**

Line 7:
```typescript
// BEFORE:
import { PLOT_POWER_VALUE, COLLECTION_BONUS_CAP } from '../game/_shared';
// AFTER:
import { PLOT_POWER_VALUE } from '../game/_shared';
```

Remove `collectionBonusCap` from the `meta` objects in responses (around lines 72 and 209).

**Step 4: Commit**

```bash
git add functions/api/fight-club/my-score.ts
git commit -m "fix: include collection bonus in my-score rank calculation"
```

---

## Task 9: Update Frontend — Dashboard + Rankings

**Files:**
- Modify: `src/pages/GameDashboard.tsx:16-46,70-76`
- Modify: `src/components/game/PowerLevelDisplay.tsx` (entire file)
- Modify: `src/components/combat/FightClubRankings.tsx:338,351-360,418-422,425`

**Step 1: Update `PowerLevelDisplay.tsx`**

Change the breakdown format from complex (holdings/creations) to simple (plots/wojaks/collection):

```typescript
interface PowerLevelDisplayProps {
  level: number;
  rank?: number;
  credits?: number;
  voteStreak?: number;
  breakdown?: {
    plotPower: number;
    plotCount: number;
    wojakPower: number;
    wojakCount: number;
    collectionBonus: number;
    collectedCount: number;
  };
}
```

Update the breakdown display section to show:
```
From plots:      +180 (9 Farmer's Plots)
From Wojaks:     +94  (12 Your Wojaks)
Collection bonus: +10 (3 top Wojaks from others)
```

Update the `getTier()` thresholds for the simple formula scale (scores will be much lower than the complex formula):
```typescript
function getTier(level: number) {
  if (level >= 500) return { name: 'Legend', class: 'tier-legend', label: 'Legend' };
  if (level >= 250) return { name: 'Elite', class: 'tier-top', label: 'Elite' };
  if (level >= 120) return { name: 'Strong', class: 'tier-serious', label: 'Strong' };
  if (level >= 60)  return { name: 'Serious', class: 'tier-active', label: 'Serious' };
  if (level >= 25)  return { name: 'Active', class: 'tier-casual', label: 'Active' };
  return { name: 'Casual', class: 'tier-casual', label: 'Casual' };
}
```

Note: these thresholds match the tier system in `my-score.ts` (lines 16-23). Verify they match.

**Step 2: Update `GameDashboard.tsx`**

Change the API call from `/api/game/power-level` to `/api/fight-club/my-score`:

```typescript
interface PowerData {
  rank?: number;
  credits?: number;
  voteStreak?: number;
  breakdown?: {
    plotPower: number;
    plotCount: number;
    wojakPower: number;
    wojakCount: number;
    collectionBonus: number;
    collectedCount: number;
  };
}

// In useEffect:
fetch(`/api/fight-club/my-score?did=${player.did}`)
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      setPowerData({
        rank: data.rank,
        breakdown: data.power ? {
          plotPower: data.power.plotPower,
          plotCount: data.power.plotCount,
          wojakPower: data.power.wojakPower,
          wojakCount: data.power.wojakCount,
          collectionBonus: data.power.collectionBonus,
          collectedCount: data.power.collectedWojakCount,
        } : undefined,
      });
    }
  })
```

**Step 3: Update `FightClubRankings.tsx` — show collection bonus**

In the player rows (around line 418-422), add collection bonus to the collection counts:
```tsx
<span className="collection-counts">
  <span className="collection-plot">{player.plotCount || 0} Farmers</span>
  <span className="collection-divider">·</span>
  <span className="collection-wojak">{player.wojakCount || 0} Your Wojaks</span>
  {player.collectionBonus > 0 && (
    <>
      <span className="collection-divider">·</span>
      <span className="text-accent">+{player.collectionBonus} bonus</span>
    </>
  )}
</span>
```

In the top-ten card back (lines 351-360), add collection bonus:
```tsx
<div className="top-ten-back-stats">
  <div className="back-stat">
    <span className="back-stat-value collection-plot">{player.plotCount || 0}</span>
    <span className="back-stat-label">Farmers</span>
  </div>
  <div className="back-stat">
    <span className="back-stat-value collection-wojak">{player.wojakCount || 0}</span>
    <span className="back-stat-label">Your Wojaks</span>
  </div>
  {player.collectionBonus > 0 && (
    <div className="back-stat">
      <span className="back-stat-value text-accent">+{player.collectionBonus}</span>
      <span className="back-stat-label">Bonus</span>
    </div>
  )}
</div>
```

**Step 4: Commit**

```bash
git add src/components/game/PowerLevelDisplay.tsx src/pages/GameDashboard.tsx src/components/combat/FightClubRankings.tsx
git commit -m "feat: show collection bonus in dashboard and rankings"
```

---

## Task 10: Build and Verify

**Step 1: Build**

```bash
npm run build
```

Fix any TypeScript errors. Common issues:
- Removed imports still referenced
- Changed function signatures not updated at call sites
- Missing properties in response types

**Step 2: Verify no broken imports**

```bash
grep -r "POWER_LEVEL_MAX" functions/ src/ workers/ --include="*.ts" --include="*.tsx"
grep -r "COLLECTION_BONUS_PER_WOJAK\|COLLECTION_BONUS_MAX\|COLLECTION_BONUS_CAP" functions/ src/ --include="*.ts" --include="*.tsx"
grep -r "power-level" functions/ src/ --include="*.ts" --include="*.tsx" | grep -v ".md" | grep -v "node_modules"
```

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build errors from power system v2 migration"
```

---

## Task 11: Deploy and Verify

**Step 1: Deploy**

```bash
npm run build && npx wrangler pages deploy dist --project-name wojak-ink
```

**Step 2: Verify leaderboard**

Open `https://wojak.ink` → Fight Club → Rankings → Players tab.
- Players should show collection bonus in their breakdown
- Ranking order should include collection bonus in total power
- "Jeetin' Jimmy" should show whatever collection bonus they've earned

**Step 3: Verify my-score**

As a logged-in user, check "Your Power Level" section. Should show:
- Farmer's Plots power
- Your Wojaks power
- Collection bonus (if any)

**Step 4: Deploy indexer**

```bash
npx wrangler deploy --config workers/did-indexer/wrangler.toml
```

---

## Execution Order Summary

```
Task 1:  Rewrite _power.ts (collection bonus formula)
Task 2:  Clean up _shared.ts (remove dead constants)
Task 3:  Gut _powerLevel.ts (keep utilities only)
Task 4:  Remove recalcPowerLevel from all callers + delete power-level.ts
Task 5:  Update recalc-power-levels.ts admin endpoint
Task 6:  Remove complex formula from indexer
Task 7:  Fix vote-leaderboard.ts (add collection bonus to SQL)
Task 8:  Fix my-score.ts (include collection bonus in rank)
Task 9:  Update frontend (dashboard + rankings)
Task 10: Build and verify
Task 11: Deploy and verify
```

Tasks 1-6 can be done quickly (mostly deletions). Tasks 7-8 are the meat (SQL rewrites). Task 9 is frontend polish.
