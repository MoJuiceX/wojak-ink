# DID Power System & Collection Bonus Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the unified power system with Farmer's Plot power, Your Wojak vote power, and collection diversity bonus.

**Architecture:** Extend existing fight-club APIs with new power calculations. Reuse fetch-sales worker to sync Phase 2 sales. Add database columns to track collection and nft_id in sales_history.

**Tech Stack:** Cloudflare Workers, D1 SQLite, TypeScript, React

---

## Task 1: Database Migration

**Files:**
- Create: `functions/migrations/077_collection_bonus.sql`

**Step 1: Write the migration file**

```sql
-- Migration 077: Collection bonus support
-- Adds columns to sales_history for Phase 2 tracking and collection bonus calculation

-- Add collection column to distinguish Phase 1 vs Phase 2 sales
ALTER TABLE sales_history ADD COLUMN collection TEXT DEFAULT 'phase1';

-- Add nft_id to link sales to did_holdings/wojak_scores
ALTER TABLE sales_history ADD COLUMN nft_id TEXT;

-- Indexes for collection bonus queries
CREATE INDEX IF NOT EXISTS idx_sh_collection ON sales_history(collection);
CREATE INDEX IF NOT EXISTS idx_sh_nft_id ON sales_history(nft_id);
CREATE INDEX IF NOT EXISTS idx_sh_buyer_collection ON sales_history(buyer_address, collection);

-- Update sync state for Phase 2 tracking
ALTER TABLE sales_sync_state ADD COLUMN phase2_last_timestamp TEXT;
ALTER TABLE sales_sync_state ADD COLUMN phase2_total_synced INTEGER DEFAULT 0;
```

**Step 2: Verify migration file exists**

Run: `ls -la functions/migrations/077_collection_bonus.sql`
Expected: File exists with correct permissions

**Step 3: Commit migration**

```bash
git add functions/migrations/077_collection_bonus.sql
git commit -m "feat(db): add collection bonus schema (migration 077)

- Add collection column to sales_history for phase1/phase2
- Add nft_id column to link sales to NFT records
- Add indexes for collection bonus queries
- Add phase2 sync state columns"
```

---

## Task 2: Add Power Constants

**Files:**
- Modify: `functions/api/game/_shared.ts`

**Step 1: Read the current file**

Review `functions/api/game/_shared.ts` to understand existing constants.

**Step 2: Add power system constants**

Add after line 7 (after PHASE2_COLLECTION_ID):

```typescript
// Power System Constants
export const PLOT_POWER_VALUE = 20; // Flat power per Farmer's Plot NFT
export const PLAYER_TOP_N = 10; // Top N Wojak vote scores count
export const COLLECTION_BONUS_CAP = 25; // Max Wojaks for collection bonus

// Collection bonus tiers based on unique creators
export const COLLECTION_BONUS_TIERS = [
  { minCreators: 11, bonusPerWojak: 7 },
  { minCreators: 6, bonusPerWojak: 5 },
  { minCreators: 3, bonusPerWojak: 3 },
] as const;

export function getCollectionBonusPerWojak(uniqueCreators: number): number {
  for (const tier of COLLECTION_BONUS_TIERS) {
    if (uniqueCreators >= tier.minCreators) {
      return tier.bonusPerWojak;
    }
  }
  return 0;
}
```

**Step 3: Verify no TypeScript errors**

Run: `cd /Users/abit_hex/wojak-ink && npx tsc --noEmit --project tsconfig.node.json 2>&1 | head -20`
Expected: No errors related to _shared.ts

**Step 4: Commit**

```bash
git add functions/api/game/_shared.ts
git commit -m "feat: add power system constants

- PLOT_POWER_VALUE: 20 pts per Farmer's Plot
- PLAYER_TOP_N: top 10 Wojak scores count
- COLLECTION_BONUS_CAP: max 25 Wojaks for bonus
- Collection bonus tiers: 3+ creators = 3pts, 6+ = 5pts, 11+ = 7pts"
```

---

## Task 3: Create Power Calculation Helper

**Files:**
- Create: `functions/api/fight-club/_power.ts`

**Step 1: Create the power calculation module**

```typescript
// Power calculation helpers for the DID power system
// DID Power = Plot Power + Wojak Power + Collection Bonus

import {
  PLOT_POWER_VALUE,
  PLAYER_TOP_N,
  COLLECTION_BONUS_CAP,
  getCollectionBonusPerWojak,
} from '../game/_shared';

interface PowerBreakdown {
  plotPower: number;
  plotCount: number;
  wojakPower: number;
  wojakCount: number;
  collectionBonus: number;
  collectedWojakCount: number;
  uniqueCreatorsCount: number;
  totalPower: number;
}

/**
 * Calculate Farmer's Plot power (Phase 1 NFTs)
 */
export async function calculatePlotPower(
  db: D1Database,
  didId: string
): Promise<{ power: number; count: number }> {
  const result = await db.prepare(
    `SELECT COUNT(*) as cnt FROM did_holdings WHERE did_id = ? AND collection = 'phase1'`
  ).bind(didId).first<{ cnt: number }>();

  const count = result?.cnt || 0;
  return { power: count * PLOT_POWER_VALUE, count };
}

/**
 * Calculate Your Wojak power from vote scores (top N)
 */
export async function calculateWojakPower(
  db: D1Database,
  didId: string
): Promise<{ power: number; count: number; topWojaks: Array<{ nftId: string; score: number }> }> {
  const result = await db.prepare(`
    SELECT ws.nft_id, ws.net_score
    FROM did_holdings dh
    JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
    WHERE dh.did_id = ? AND dh.collection = 'phase2'
    ORDER BY ws.net_score DESC, ws.total_votes DESC, ws.edition_number ASC
    LIMIT ?
  `).bind(didId, PLAYER_TOP_N).all();

  const topWojaks = (result.results || []).map(w => ({
    nftId: w.nft_id as string,
    score: (w.net_score as number) || 0,
  }));

  const power = topWojaks.reduce((sum, w) => sum + w.score, 0);
  return { power, count: topWojaks.length, topWojaks };
}

/**
 * Calculate collection bonus for bought Wojaks from other creators
 */
export async function calculateCollectionBonus(
  db: D1Database,
  didId: string,
  walletAddress: string
): Promise<{
  bonus: number;
  collectedCount: number;
  uniqueCreators: number;
  bonusPerWojak: number;
}> {
  // Find Wojaks that:
  // 1. Are in the holder's DID
  // 2. Were BOUGHT (exist in sales_history with buyer = holder's wallet)
  // 3. Are from OTHER creators (creator_wallet != holder's wallet)
  const result = await db.prepare(`
    SELECT
      dh.nft_id,
      pm.wallet_address as creator_wallet,
      ws.net_score
    FROM did_holdings dh
    JOIN phase2_mints pm ON pm.mintgarden_launcher_id = dh.nft_id
    JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
    JOIN sales_history sh ON sh.nft_id = dh.nft_id
      AND sh.buyer_address = ?
      AND sh.collection = 'phase2'
    WHERE dh.did_id = ?
      AND dh.collection = 'phase2'
      AND pm.wallet_address != ?
    ORDER BY ws.net_score DESC
    LIMIT ?
  `).bind(walletAddress, didId, walletAddress, COLLECTION_BONUS_CAP).all();

  const collected = result.results || [];
  const collectedCount = collected.length;

  // Count unique creators
  const uniqueCreators = new Set(collected.map(w => w.creator_wallet as string)).size;

  // Calculate bonus based on diversity tier
  const bonusPerWojak = getCollectionBonusPerWojak(uniqueCreators);
  const bonus = collectedCount * bonusPerWojak;

  return { bonus, collectedCount, uniqueCreators, bonusPerWojak };
}

/**
 * Calculate full power breakdown for a DID
 */
export async function calculateFullPower(
  db: D1Database,
  didId: string,
  walletAddress: string
): Promise<PowerBreakdown> {
  const [plotResult, wojakResult, collectionResult] = await Promise.all([
    calculatePlotPower(db, didId),
    calculateWojakPower(db, didId),
    calculateCollectionBonus(db, didId, walletAddress),
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

**Step 2: Verify no TypeScript errors**

Run: `cd /Users/abit_hex/wojak-ink && npx tsc --noEmit --project tsconfig.node.json 2>&1 | grep -E "(error|_power)" | head -10`
Expected: No errors

**Step 3: Commit**

```bash
git add functions/api/fight-club/_power.ts
git commit -m "feat: add power calculation helpers

- calculatePlotPower: flat 20 pts per Farmer's Plot
- calculateWojakPower: sum of top 10 vote scores
- calculateCollectionBonus: diversity bonus for bought Wojaks
- calculateFullPower: combined power breakdown"
```

---

## Task 4: Update my-score API

**Files:**
- Modify: `functions/api/fight-club/my-score.ts`

**Step 1: Read current implementation**

Review `functions/api/fight-club/my-score.ts` for current structure.

**Step 2: Import power helpers and update response**

Replace the player score calculation section with power breakdown. Add imports at top:

```typescript
import { calculateFullPower } from './_power';
import { PLOT_POWER_VALUE, PLAYER_TOP_N, COLLECTION_BONUS_CAP } from '../game/_shared';
```

**Step 3: Update the main calculation logic**

Replace lines ~96-118 (the wojakScores query and playerScore calculation) with:

```typescript
        // Get player's wallet address for collection bonus calculation
        const playerWallet = await db.prepare(
            'SELECT wallet_address FROM game_players WHERE did_id = ?'
        ).bind(did).first<{ wallet_address: string }>();

        const walletAddress = playerWallet?.wallet_address || '';

        // Calculate full power breakdown
        const power = await calculateFullPower(db, did, walletAddress);

        // Use total power as player score for ranking
        const playerScore = power.totalPower;
        const eligibleWojakCount = power.wojakCount;
        const totalWojakCount = power.plotCount + power.wojakCount; // Both collections
```

**Step 4: Update the response to include power breakdown**

Update the JSON response (around line 183) to include new fields:

```typescript
        return json({
            success: true,
            registered: true,
            did,
            ranked,
            rank,
            playerScore,
            tier,
            // Power breakdown
            power: {
                total: power.totalPower,
                plotPower: power.plotPower,
                plotCount: power.plotCount,
                wojakPower: power.wojakPower,
                wojakCount: power.wojakCount,
                collectionBonus: power.collectionBonus,
                collectedWojakCount: power.collectedWojakCount,
                uniqueCreatorsCount: power.uniqueCreatorsCount,
            },
            // Legacy fields for backward compat
            eligibleWojakCount,
            totalWojakCount,
            bestWojakScore: power.wojakCount > 0 ? null : null, // TODO: get from power calc
            pointsToNextRank,
            nextRank,
            meta: {
                mode: 'voting_only',
                plotPowerValue: PLOT_POWER_VALUE,
                playerTopN: PLAYER_TOP_N,
                collectionBonusCap: COLLECTION_BONUS_CAP,
            },
        });
```

**Step 5: Verify build passes**

Run: `cd /Users/abit_hex/wojak-ink && npm run build 2>&1 | tail -20`
Expected: Build successful

**Step 6: Commit**

```bash
git add functions/api/fight-club/my-score.ts
git commit -m "feat(api): add power breakdown to my-score endpoint

- Calculate plot power (Farmer's Plots × 20)
- Calculate Wojak power (top 10 vote scores)
- Calculate collection bonus (bought from other creators)
- Return full power breakdown in response
- Maintain backward compatibility with legacy fields"
```

---

## Task 5: Update vote-leaderboard API

**Files:**
- Modify: `functions/api/fight-club/vote-leaderboard.ts`

**Step 1: Read current implementation**

Review `functions/api/fight-club/vote-leaderboard.ts` to understand the players query.

**Step 2: Import power constants**

Add at top:

```typescript
import { PLOT_POWER_VALUE, COLLECTION_BONUS_CAP } from '../game/_shared';
```

**Step 3: Update handlePlayers function**

The player leaderboard query needs to include plot power and collection bonus. Update the `playersQuery` CTE (around line 179) to include plot count:

```typescript
  const playersQuery = `
    WITH eligible_wojaks AS (
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
    player_scores AS (
      SELECT
        gp.did_id,
        dp.display_name,
        COALESCE(pc.plot_count, 0) as plot_count,
        COALESCE(pc.plot_count, 0) * ${PLOT_POWER_VALUE} as plot_power,
        COALESCE(SUM(CASE WHEN ew.rn <= ${PLAYER_TOP_N} THEN ew.net_score ELSE 0 END), 0) AS wojak_power,
        COUNT(DISTINCT CASE WHEN ew.rn IS NOT NULL THEN ew.nft_id END) AS wojak_count,
        MAX(CASE WHEN ew.rn = 1 THEN ew.net_score END) AS best_wojak_score,
        (
          SELECT pm.ipfs_image_uri
          FROM eligible_wojaks ew2
          JOIN phase2_mints pm ON pm.mintgarden_launcher_id = ew2.nft_id AND pm.status = 'minted'
          WHERE ew2.did_id = gp.did_id AND ew2.rn = 1
          LIMIT 1
        ) AS best_wojak_image
      FROM game_players gp
      LEFT JOIN did_profiles dp ON dp.did_id = gp.did_id
      LEFT JOIN eligible_wojaks ew ON ew.did_id = gp.did_id AND ew.rn <= ${PLAYER_TOP_N}
      LEFT JOIN plot_counts pc ON pc.did_id = gp.did_id
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
      (ps.plot_power + ps.wojak_power) as total_power,
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
```

**Step 4: Update the player mapping to include new fields**

```typescript
  const players = (results.results || []).map((row: Record<string, unknown>, idx: number) => {
    const did = (row.did_id as string) || '';
    let displayName = row.display_name as string | null;
    if (!displayName) displayName = did ? `${did.slice(0, 12)}...` : 'Anon';

    return {
      rank: offset + idx + 1,
      did,
      displayName,
      // New power fields
      totalPower: (row.total_power as number) || 0,
      plotPower: (row.plot_power as number) || 0,
      plotCount: (row.plot_count as number) || 0,
      wojakPower: (row.wojak_power as number) || 0,
      wojakCount: (row.wojak_count as number) || 0,
      // Legacy field (now equals totalPower)
      playerScore: (row.total_power as number) || 0,
      bestWojakScore: (row.best_wojak_score as number) ?? null,
      bestWojakImage: resolveImageUri(row.best_wojak_image as string | null) || null,
    };
  });
```

**Step 5: Verify build passes**

Run: `cd /Users/abit_hex/wojak-ink && npm run build 2>&1 | tail -20`
Expected: Build successful

**Step 6: Commit**

```bash
git add functions/api/fight-club/vote-leaderboard.ts
git commit -m "feat(api): add power breakdown to player leaderboard

- Include plot count and plot power in rankings
- Calculate total_power = plot_power + wojak_power
- Sort by total power instead of just wojak scores
- Return power breakdown per player"
```

---

## Task 6: Update fetch-sales Worker for Phase 2

**Files:**
- Modify: `workers/fetch-sales/worker.ts`
- Modify: `workers/fetch-sales/wrangler.toml`

**Step 1: Add Phase 2 collection ID to wrangler.toml**

Add after COLLECTION_ID:

```toml
PHASE2_COLLECTION_ID = "col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx"
```

**Step 2: Update worker.ts interface**

Add to Env interface:

```typescript
interface Env {
  TRADE_VALUES_KV: KVNamespace;
  DB: D1Database;
  COLLECTION_ID?: string;
  PHASE2_COLLECTION_ID?: string;  // Add this
  ADMIN_PASSWORD?: string;
}
```

**Step 3: Add nft_id to Sale interface**

```typescript
interface Sale {
  edition: number;
  price_xch: number;
  timestamp: string;
  nftName: string;
  tradeId: string;
  currency: 'XCH' | 'CAT';
  originalAmount: number;
  tokenCode: string | null;
  tokenId: string | null;
  catXchRate: number | null;
  traitsJson: string | null;
  nftId: string | null;  // Add this - MintGarden launcher_id
  collection: 'phase1' | 'phase2';  // Add this
}
```

**Step 4: Update persistToD1 to include nft_id and collection**

In the INSERT statement, add the new columns:

```typescript
statements.push(
  db.prepare(
    `INSERT OR IGNORE INTO sales_history
      (trade_id, nft_edition, nft_name, currency, original_amount, token_code, token_id,
       xch_equivalent, cat_xch_rate, traits_json, completed_at, completed_at_unix, source,
       nft_id, collection)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dexie', ?, ?)`
  ).bind(
    trade.tradeId,
    trade.edition,
    trade.nftName,
    trade.currency,
    trade.originalAmount,
    trade.tokenCode,
    trade.tokenId,
    trade.price_xch,
    trade.catXchRate,
    trade.traitsJson,
    trade.timestamp,
    completedAtUnix,
    trade.nftId,
    trade.collection
  )
);
```

**Step 5: Add Phase 2 fetch in scheduled handler**

After the Phase 1 fetch, add Phase 2:

```typescript
// Step 7: Fetch Phase 2 (Your Wojak) trades
const phase2CollectionId = env.PHASE2_COLLECTION_ID;
if (phase2CollectionId) {
  console.warn('Fetching Phase 2 (Your Wojak) trades...');
  const phase2Trades = await fetchAllTrades(
    phase2CollectionId,
    tokenRates.byCode,
    new Map(), // No metadata map for Phase 2 yet
    tokenRates.byAssetId,
    env.DB,
    'phase2'  // Pass collection identifier
  );

  if (phase2Trades.length > 0) {
    const phase2Inserted = await persistToD1(env.DB, phase2Trades, 'phase2');
    console.warn(`D1 (Phase 2): ${phase2Inserted} new trades inserted`);
  }
}
```

**Step 6: Verify build passes**

Run: `cd /Users/abit_hex/wojak-ink/workers/fetch-sales && npx wrangler deploy --dry-run 2>&1 | tail -10`
Expected: Dry run successful

**Step 7: Commit**

```bash
git add workers/fetch-sales/worker.ts workers/fetch-sales/wrangler.toml
git commit -m "feat(worker): sync Phase 2 sales in fetch-sales worker

- Add PHASE2_COLLECTION_ID to config
- Track collection (phase1/phase2) per sale
- Store nft_id (launcher_id) for collection bonus joins
- Fetch both collections in scheduled run"
```

---

## Task 7: Update Rules Modal

**Files:**
- Modify: `src/components/combat/RankingRulesModal.tsx`

**Step 1: Update the rules content**

Replace the rules-modal-body content with the new power system explanation:

```tsx
<div className="rules-modal-body">
    <div className="rules-section">
        <h4 className="rules-section-title">Farmer's Plot Power</h4>
        <ul className="rules-list">
            <li>Each <strong>Wojak Farmer's Plot</strong> in your DID = <span className="text-cyan">+20</span> power</li>
            <li>Put all your Plots in your DID to maximize power</li>
        </ul>
    </div>

    <div className="rules-section">
        <h4 className="rules-section-title">Your Wojak Power</h4>
        <ul className="rules-list">
            <li><strong>Glaze</strong> = <span className="text-success">+1</span> vote score</li>
            <li><strong>Fade</strong> = <span className="text-error">-1</span> vote score</li>
            <li>Your <strong>top 10</strong> Wojak scores count toward power</li>
        </ul>
    </div>

    <div className="rules-section">
        <h4 className="rules-section-title">Collection Bonus</h4>
        <ul className="rules-list">
            <li>Buy Wojaks from <strong>other creators</strong> for bonus power</li>
            <li>3-5 unique creators: <span className="text-cyan">+3</span> per Wojak</li>
            <li>6-10 unique creators: <span className="text-cyan">+5</span> per Wojak</li>
            <li>11+ unique creators: <span className="text-cyan">+7</span> per Wojak</li>
            <li>Maximum <strong>25 collected Wojaks</strong> count</li>
        </ul>
    </div>

    <div className="rules-section rules-section-muted">
        <p>
            <strong>Only verified purchases count</strong> - gifts and transfers don't earn bonus.
        </p>
    </div>

    <div className="rules-trust">
        Power updates automatically as you collect NFTs.
    </div>
</div>
```

**Step 2: Verify no lint errors**

Run: `cd /Users/abit_hex/wojak-ink && npm run lint -- --fix src/components/combat/RankingRulesModal.tsx 2>&1 | tail -10`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/combat/RankingRulesModal.tsx
git commit -m "feat(ui): update rules modal with new power system

- Explain Farmer's Plot power (20 pts each)
- Explain Wojak vote power (top 10 scores)
- Explain collection bonus tiers (3-5, 6-10, 11+ creators)
- Note that only verified purchases count"
```

---

## Task 8: Run Migration on Production

**Step 1: Apply migration**

Run: `cd /Users/abit_hex/wojak-ink && npx wrangler d1 execute wojak-users --remote --file=functions/migrations/077_collection_bonus.sql`
Expected: Migration applied successfully

**Step 2: Verify columns exist**

Run: `cd /Users/abit_hex/wojak-ink && npx wrangler d1 execute wojak-users --remote --command="PRAGMA table_info(sales_history)" | grep -E "collection|nft_id"`
Expected: Both columns listed

**Step 3: Trigger initial Phase 2 sales sync**

Run: `curl -X POST https://wojak-fetch-sales.workers.dev/trigger-fetch`
Expected: {"message":"Fetch triggered",...}

---

## Task 9: Deploy and Verify

**Step 1: Build frontend**

Run: `cd /Users/abit_hex/wojak-ink && npm run build`
Expected: Build successful

**Step 2: Deploy to Cloudflare Pages**

Run: `cd /Users/abit_hex/wojak-ink && npx wrangler pages deploy dist --project-name=wojak-ink`
Expected: Deployment successful

**Step 3: Deploy fetch-sales worker**

Run: `cd /Users/abit_hex/wojak-ink/workers/fetch-sales && npx wrangler deploy`
Expected: Worker deployed

**Step 4: Verify API returns power breakdown**

Run: `curl "https://wojak.ink/api/fight-club/my-score?did=<test-did>" | jq '.power'`
Expected: Power breakdown with plotPower, wojakPower, collectionBonus

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: deployment verification complete"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Database migration | `functions/migrations/077_collection_bonus.sql` |
| 2 | Power constants | `functions/api/game/_shared.ts` |
| 3 | Power calculation helpers | `functions/api/fight-club/_power.ts` |
| 4 | Update my-score API | `functions/api/fight-club/my-score.ts` |
| 5 | Update vote-leaderboard API | `functions/api/fight-club/vote-leaderboard.ts` |
| 6 | Update fetch-sales worker | `workers/fetch-sales/worker.ts`, `wrangler.toml` |
| 7 | Update rules modal | `src/components/combat/RankingRulesModal.tsx` |
| 8 | Run migration | Remote D1 command |
| 9 | Deploy and verify | Cloudflare Pages + Worker |

**Estimated tasks:** 9 major tasks, ~25 commits total
