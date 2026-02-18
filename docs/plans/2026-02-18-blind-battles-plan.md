# Blind Battles Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace explicit Vote A/B battle system with blind battles resolved by normal swipe votes.

**Architecture:** Battle NFTs get boosted in the swipe feed during their 24h window. Resolution compares net score deltas (snapshots at battle start vs current). The battles page becomes a spectator view with hidden scores until resolved.

**Tech Stack:** Cloudflare D1 (SQLite), Cloudflare Pages Functions (TypeScript), React + Vite frontend

---

### Task 1: Database Migration — Score Snapshots

**Files:**
- Create: `functions/migrations/054_blind_battles.sql`

**Step 1: Write migration**

```sql
-- Add net_score snapshots at battle creation time.
-- Resolution uses delta (current - snapshot) instead of battle_votes.
ALTER TABLE battles ADD COLUMN nft_a_score_start INTEGER NOT NULL DEFAULT 0;
ALTER TABLE battles ADD COLUMN nft_b_score_start INTEGER NOT NULL DEFAULT 0;
```

**Step 2: Apply migration to production D1**

Run:
```bash
npx wrangler d1 execute wojak-users --remote --file=functions/migrations/054_blind_battles.sql
```

Expected: Migration applies successfully, both columns added.

**Step 3: Commit**

```bash
git add functions/migrations/054_blind_battles.sql
git commit -m "feat: add score snapshot columns for blind battles"
```

---

### Task 2: Snapshot Scores at Battle Creation

**Files:**
- Modify: `functions/api/game/battle-queue.ts` (lines 88-114, the matchmaking section)

**Step 1: Add score snapshot lookup before battle INSERT**

After `if (opponent) {` (line 88), before the `context.env.DB.batch([ ... ])`, add a lookup for both NFTs' current net scores:

```typescript
    if (opponent) {
      // Snapshot current net_scores for blind battle resolution
      const scoreA = await context.env.DB.prepare(
        'SELECT net_score FROM wojak_scores WHERE nft_id = ?'
      ).bind(nftId).first<{ net_score: number }>();
      const scoreB = await context.env.DB.prepare(
        'SELECT net_score FROM wojak_scores WHERE nft_id = ?'
      ).bind(opponent.nft_id).first<{ net_score: number }>();
      const snapshotA = scoreA?.net_score ?? 0;
      const snapshotB = scoreB?.net_score ?? 0;

      const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
```

**Step 2: Update the INSERT statement to include snapshots**

Change the battle INSERT from:

```typescript
        context.env.DB.prepare(`
          INSERT INTO battles (nft_a_id, nft_a_edition, nft_a_owner_did, nft_b_id, nft_b_edition, nft_b_owner_did, ends_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          nftId, editionNumber, did,
          opponent.nft_id, opponent.edition_number, opponent.owner_did,
          endsAt
        ),
```

To:

```typescript
        context.env.DB.prepare(`
          INSERT INTO battles (nft_a_id, nft_a_edition, nft_a_owner_did, nft_b_id, nft_b_edition, nft_b_owner_did, ends_at, nft_a_score_start, nft_b_score_start)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          nftId, editionNumber, did,
          opponent.nft_id, opponent.edition_number, opponent.owner_did,
          endsAt, snapshotA, snapshotB
        ),
```

**Step 3: Verify build passes**

Run: `npx tsc -b --noEmit`

**Step 4: Commit**

```bash
git add functions/api/game/battle-queue.ts
git commit -m "feat: snapshot net_score at battle creation for blind resolution"
```

---

### Task 3: Rewrite Battle Resolution

**Files:**
- Modify: `functions/api/game/battle-resolve.ts` (full rewrite of resolution logic)

**Step 1: Replace the resolution logic**

Replace the entire file with:

```typescript
// POST /api/game/battle-resolve
// Resolves all battles past their ends_at time.
// Called by cron or manually by admin.
//
// Blind battle rules:
// - Each NFT's net_score delta = current net_score - snapshot at battle start
// - Higher delta wins
// - If both NFTs got fewer than 5 total swipe votes during window: draw
// - If deltas are equal: draw
// - Winner gets organic score boost, loser gets organic penalty

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const MIN_VOTES_DURING_BATTLE = 5;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const authHeader = context.request.headers.get('Authorization');
  if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const expired = await context.env.DB.prepare(`
      SELECT * FROM battles
      WHERE status = 'active' AND ends_at <= datetime('now')
    `).all();

    const battles = expired.results || [];
    if (battles.length === 0) {
      return Response.json({ success: true, resolved: 0, message: 'No battles to resolve.' });
    }

    let resolved = 0;
    let draws = 0;

    for (const battle of battles) {
      const battleId = battle.id as number;
      const nftAId = battle.nft_a_id as string;
      const nftBId = battle.nft_b_id as string;
      const snapshotA = (battle.nft_a_score_start as number) ?? 0;
      const snapshotB = (battle.nft_b_score_start as number) ?? 0;
      const startedAt = battle.started_at as string;
      const endsAt = battle.ends_at as string;

      // Get current net_scores
      const currentA = await context.env.DB.prepare(
        'SELECT net_score, total_votes FROM wojak_scores WHERE nft_id = ?'
      ).bind(nftAId).first<{ net_score: number; total_votes: number }>();
      const currentB = await context.env.DB.prepare(
        'SELECT net_score, total_votes FROM wojak_scores WHERE nft_id = ?'
      ).bind(nftBId).first<{ net_score: number; total_votes: number }>();

      const currentScoreA = currentA?.net_score ?? 0;
      const currentScoreB = currentB?.net_score ?? 0;
      const deltaA = currentScoreA - snapshotA;
      const deltaB = currentScoreB - snapshotB;

      // Count swipe votes during window for minimum threshold
      const votesInWindowA = await context.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM wojak_votes
         WHERE nft_id = ? AND voted_at >= ? AND voted_at <= ?`
      ).bind(nftAId, startedAt, endsAt).first<{ cnt: number }>();
      const votesInWindowB = await context.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM wojak_votes
         WHERE nft_id = ? AND voted_at >= ? AND voted_at <= ?`
      ).bind(nftBId, startedAt, endsAt).first<{ cnt: number }>();

      const totalWindowVotes = (votesInWindowA?.cnt ?? 0) + (votesInWindowB?.cnt ?? 0);

      // Draw conditions: insufficient votes or tied deltas
      if (totalWindowVotes < MIN_VOTES_DURING_BATTLE || deltaA === deltaB) {
        const reason = totalWindowVotes < MIN_VOTES_DURING_BATTLE ? 'insufficient_votes' : 'tied';
        const drawResult = await context.env.DB.prepare(`
          UPDATE battles SET status = 'draw', resolved_at = datetime('now')
          WHERE id = ? AND status = 'active'
        `).bind(battleId).run();

        if (drawResult.meta.changes === 0) continue;

        await context.env.DB.batch([
          context.env.DB.prepare(`
            INSERT INTO game_activity (did_id, event_type, event_data)
            VALUES (?, 'battle_draw', ?)
          `).bind(battle.nft_a_owner_did as string, JSON.stringify({
            battleId, reason, deltaA, deltaB, totalWindowVotes,
          })),
          context.env.DB.prepare(`
            INSERT INTO game_activity (did_id, event_type, event_data)
            VALUES (?, 'battle_draw', ?)
          `).bind(battle.nft_b_owner_did as string, JSON.stringify({
            battleId, reason, deltaA, deltaB, totalWindowVotes,
          })),
        ]);

        draws++;
        continue;
      }

      // Determine winner by higher delta
      const aWins = deltaA > deltaB;
      const winnerNftId = aWins ? nftAId : nftBId;
      const winnerEdition = aWins ? battle.nft_a_edition as number : battle.nft_b_edition as number;
      const loserNftId = aWins ? nftBId : nftAId;
      const loserEdition = aWins ? battle.nft_b_edition as number : battle.nft_a_edition as number;
      const winnerDid = aWins ? battle.nft_a_owner_did as string : battle.nft_b_owner_did as string;
      const loserDid = aWins ? battle.nft_b_owner_did as string : battle.nft_a_owner_did as string;
      const winnerDelta = aWins ? deltaA : deltaB;
      const loserDelta = aWins ? deltaB : deltaA;

      // Organic bonus: proportional to margin (clamped 1-10)
      const margin = Math.abs(winnerDelta - loserDelta);
      const bonus = Math.min(Math.max(Math.ceil(margin / 2), 1), 10);

      const updateResult = await context.env.DB.prepare(`
        UPDATE battles SET status = 'completed', winner_nft_id = ?, resolved_at = datetime('now')
        WHERE id = ? AND status = 'active'
      `).bind(winnerNftId, battleId).run();

      if (updateResult.meta.changes === 0) continue;

      await context.env.DB.batch([
        // Organic bonus likes to winner
        context.env.DB.prepare(`
          INSERT INTO wojak_scores (nft_id, edition_number, creator_wallet, likes, dislikes, net_score, total_votes, first_voted_at, last_voted_at)
          VALUES (?, ?, COALESCE((SELECT wallet_address FROM phase2_mints WHERE mint_number = ?), 'unknown'), ?, 0, ?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(nft_id) DO UPDATE SET
            likes = likes + ?,
            net_score = net_score + ?,
            total_votes = total_votes + ?,
            last_voted_at = datetime('now')
        `).bind(
          winnerNftId, winnerEdition, winnerEdition,
          bonus, bonus, bonus,
          bonus, bonus, bonus
        ),
        // Organic penalty dislikes to loser
        context.env.DB.prepare(`
          INSERT INTO wojak_scores (nft_id, edition_number, creator_wallet, likes, dislikes, net_score, total_votes, first_voted_at, last_voted_at)
          VALUES (?, ?, COALESCE((SELECT wallet_address FROM phase2_mints WHERE mint_number = ?), 'unknown'), 0, ?, ?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(nft_id) DO UPDATE SET
            dislikes = dislikes + ?,
            net_score = net_score - ?,
            total_votes = total_votes + ?,
            last_voted_at = datetime('now')
        `).bind(
          loserNftId, loserEdition, loserEdition,
          bonus, -bonus, bonus,
          bonus, bonus, bonus
        ),
        // Activity logs with deltas
        context.env.DB.prepare(`
          INSERT INTO game_activity (did_id, event_type, event_data)
          VALUES (?, 'battle_won', ?)
        `).bind(winnerDid, JSON.stringify({
          battleId, delta: winnerDelta, opponentDelta: loserDelta, bonus,
        })),
        context.env.DB.prepare(`
          INSERT INTO game_activity (did_id, event_type, event_data)
          VALUES (?, 'battle_lost', ?)
        `).bind(loserDid, JSON.stringify({
          battleId, delta: loserDelta, opponentDelta: winnerDelta, bonus,
        })),
      ]);

      resolved++;
    }

    return Response.json({ success: true, resolved, draws, total: battles.length });
  } catch (err) {
    console.error('Battle resolve error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
```

**Step 2: Check `wojak_votes` has a `voted_at` column**

Run: `grep -i voted_at functions/migrations/*.sql | head -20`

If the column is named differently (e.g., `created_at`), adjust the timestamp column name in the `COUNT(*)` queries above.

**Step 3: Verify build**

Run: `npx tsc -b --noEmit`

**Step 4: Commit**

```bash
git add functions/api/game/battle-resolve.ts
git commit -m "feat: resolve battles by swipe vote net score delta"
```

---

### Task 4: Boost Battle NFTs in Swipe Feed

**Files:**
- Modify: `functions/api/game/feed.ts`

**Step 1: Add active battle NFT lookup and feed boost**

After the player lookup (line 37-41) and before the feed query (line 51), add:

```typescript
    // Get NFT IDs currently in active battles (for feed boost)
    const activeBattleNfts = await context.env.DB.prepare(`
      SELECT nft_a_id, nft_b_id FROM battles WHERE status = 'active'
    `).all();
    const battleNftIds = new Set<string>();
    for (const row of activeBattleNfts.results || []) {
      battleNftIds.add(row.nft_a_id as string);
      battleNftIds.add(row.nft_b_id as string);
    }
```

**Step 2: Modify the ORDER BY to boost battle NFTs**

Replace the ORDER BY clause in the feed query:

From:
```sql
      ORDER BY
        -- Weighted random: newer + fewer votes = higher chance
        -- ABS(RANDOM()) gives random ordering, divided by weight for bias
        ABS(RANDOM()) / (
          (1.0 / (1.0 + COALESCE(ws.total_votes, 0))) *
          (1.0 / (1.0 + JULIANDAY('now') - JULIANDAY(pm.created_at)))
        )
```

To:
```sql
      ORDER BY
        -- Weighted random: newer + fewer votes = higher chance
        -- Battle NFTs get 5x boost (lower score = appears sooner)
        ABS(RANDOM()) / (
          (1.0 / (1.0 + COALESCE(ws.total_votes, 0))) *
          (1.0 / (1.0 + JULIANDAY('now') - JULIANDAY(pm.created_at))) *
          CASE WHEN pm.mintgarden_launcher_id IN (${[...battleNftIds].map(() => '?').join(',') || "'__none__'"}) THEN 5.0 ELSE 1.0 END
        )
```

And add the battle NFT IDs as additional bind parameters after the existing 4 params (did, wallet_address, did, limit). The bind call becomes:

```typescript
    `).bind(did, player.wallet_address, did, ...[...battleNftIds], limit).all();
```

**Important:** If `battleNftIds` is empty, the CASE WHEN clause uses the `'__none__'` fallback so the SQL is always valid.

**Step 3: Verify build**

Run: `npx tsc -b --noEmit`

**Step 4: Commit**

```bash
git add functions/api/game/feed.ts
git commit -m "feat: boost active battle NFTs 5x in swipe feed"
```

---

### Task 5: Update Battle List API — Remove Vote Data for Active Battles

**Files:**
- Modify: `functions/api/game/battle-list.ts`

**Step 1: Remove the `battle_votes` hasVoted lookup**

Delete lines 61-69 (the entire `votedBattleIds` block):

```typescript
    // DELETE THIS BLOCK:
    let votedBattleIds = new Set<number>();
    if (voterDid && results.results.length > 0) {
      const battleIds = results.results.map(b => b.id as number);
      const placeholders = battleIds.map(() => '?').join(',');
      const votes = await context.env.DB.prepare(
        `SELECT battle_id FROM battle_votes WHERE voter_did = ? AND battle_id IN (${placeholders})`
      ).bind(voterDid, ...battleIds).all<{ battle_id: number }>();
      votedBattleIds = new Set((votes.results || []).map(v => v.battle_id));
    }
```

**Step 2: Update battle response mapping**

For active battles, hide vote counts. For resolved battles, include score deltas. Change the mapping (lines 71-93) to:

```typescript
    const battles = (results.results || []).map((b) => {
      const isResolved = b.status === 'completed' || b.status === 'draw';
      return {
        id: b.id,
        nftA: {
          id: b.nft_a_id,
          edition: b.nft_a_edition,
          ownerDid: b.nft_a_owner_did,
          name: b.name_a || `Your Wojak #${b.nft_a_edition}`,
          // Only expose score delta for resolved battles
          scoreDelta: isResolved
            ? ((b.nft_a_score_start != null)
              ? null  // Will be computed below
              : null)
            : undefined,
        },
        nftB: {
          id: b.nft_b_id,
          edition: b.nft_b_edition,
          ownerDid: b.nft_b_owner_did,
          name: b.name_b || `Your Wojak #${b.nft_b_edition}`,
          scoreDelta: isResolved ? null : undefined,
        },
        status: b.status,
        winner: b.winner_nft_id,
        startedAt: b.started_at,
        endsAt: b.ends_at,
        resolvedAt: b.resolved_at,
      };
    });
```

Actually, simpler approach -- for resolved battles we need the deltas. Add `nft_a_score_start` and `nft_b_score_start` to the SELECT, then compute deltas by reading current `wojak_scores`. But that's N+1 queries. Better: store final deltas in the activity log already (from Task 3). For the list endpoint, just return the snapshot data and let the frontend handle it.

Simplest: for resolved battles, read the current `wojak_scores.net_score` and compute `delta = current - snapshot`. Do this in a single batch query for all resolved battles in the result set:

```typescript
    // For resolved battles, compute score deltas
    const resolvedBattles = (results.results || []).filter(b => b.status === 'completed' || b.status === 'draw');
    const deltaMap = new Map<number, { deltaA: number; deltaB: number }>();

    if (resolvedBattles.length > 0) {
      const allNftIds = new Set<string>();
      for (const b of resolvedBattles) {
        allNftIds.add(b.nft_a_id as string);
        allNftIds.add(b.nft_b_id as string);
      }
      const placeholders = [...allNftIds].map(() => '?').join(',');
      const scores = await context.env.DB.prepare(
        `SELECT nft_id, net_score FROM wojak_scores WHERE nft_id IN (${placeholders})`
      ).bind(...allNftIds).all<{ nft_id: string; net_score: number }>();

      const scoreMap = new Map<string, number>();
      for (const s of scores.results || []) {
        scoreMap.set(s.nft_id, s.net_score);
      }

      for (const b of resolvedBattles) {
        const currentA = scoreMap.get(b.nft_a_id as string) ?? 0;
        const currentB = scoreMap.get(b.nft_b_id as string) ?? 0;
        const snapshotA = (b.nft_a_score_start as number) ?? 0;
        const snapshotB = (b.nft_b_score_start as number) ?? 0;
        deltaMap.set(b.id as number, {
          deltaA: currentA - snapshotA,
          deltaB: currentB - snapshotB,
        });
      }
    }

    const battles = (results.results || []).map((b) => {
      const isResolved = b.status === 'completed' || b.status === 'draw';
      const deltas = deltaMap.get(b.id as number);
      return {
        id: b.id,
        nftA: {
          id: b.nft_a_id,
          edition: b.nft_a_edition,
          ownerDid: b.nft_a_owner_did,
          name: b.name_a || `Your Wojak #${b.nft_a_edition}`,
          ...(isResolved && deltas ? { scoreDelta: deltas.deltaA } : {}),
        },
        nftB: {
          id: b.nft_b_id,
          edition: b.nft_b_edition,
          ownerDid: b.nft_b_owner_did,
          name: b.name_b || `Your Wojak #${b.nft_b_edition}`,
          ...(isResolved && deltas ? { scoreDelta: deltas.deltaB } : {}),
        },
        status: b.status,
        winner: b.winner_nft_id,
        startedAt: b.started_at,
        endsAt: b.ends_at,
        resolvedAt: b.resolved_at,
      };
    });
```

**Step 3: Update `formatBattle` helper for NFT-specific history view**

Replace the `votes` fields with `scoreDelta` in the `formatBattle` function too.

**Step 4: Verify build**

Run: `npx tsc -b --noEmit`

**Step 5: Commit**

```bash
git add functions/api/game/battle-list.ts
git commit -m "feat: return score deltas for resolved battles, hide scores for active"
```

---

### Task 6: Delete Battle Vote Endpoint

**Files:**
- Delete: `functions/api/game/battle-vote.ts`

**Step 1: Delete the file**

```bash
rm functions/api/game/battle-vote.ts
```

**Step 2: Commit**

```bash
git add -u functions/api/game/battle-vote.ts
git commit -m "feat: remove battle-vote endpoint (blind battles use swipe votes)"
```

---

### Task 7: Rewrite BattleCard as Spectator View

**Files:**
- Modify: `src/components/game/BattleCard.tsx`

**Step 1: Replace the entire file**

```tsx
import { useState, useEffect } from 'react';

interface BattleNft {
  id: string;
  edition: number;
  ownerDid: string;
  name: string;
  scoreDelta?: number;
}

interface BattleCardProps {
  battleId: number;
  nftA: BattleNft;
  nftB: BattleNft;
  endsAt: string;
  status: string;
  winner?: string | null;
  resolvedAt?: string | null;
}

function useCountdown(endsAt: string) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Ended');
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${hours}h ${mins}m`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return remaining;
}

function formatDelta(delta: number | undefined): string {
  if (delta == null) return '?';
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

export function BattleCard({
  battleId, nftA, nftB, endsAt, status, winner, resolvedAt,
}: BattleCardProps) {
  const countdown = useCountdown(endsAt);
  const isActive = status === 'active';
  const isCompleted = status === 'completed';
  const isDraw = status === 'draw';
  const isResolved = isCompleted || isDraw;

  const aWon = winner === nftA.id;
  const bWon = winner === nftB.id;

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      {/* Timer / Result */}
      <div className="flex items-center justify-between">
        {isResolved ? (
          <span className={`badge ${isCompleted ? 'badge-success' : 'badge-cyan'}`}>
            {isDraw ? 'Draw' : 'Completed'}
          </span>
        ) : (
          <span className="badge badge-cyan">{countdown}</span>
        )}
        <span className="text-xs text-muted">
          {isResolved && resolvedAt
            ? new Date(resolvedAt).toLocaleDateString()
            : `#${battleId}`}
        </span>
      </div>

      {/* Side-by-side NFTs */}
      <div className="flex gap-4">
        {/* NFT A */}
        <div className={`flex-1 flex flex-col items-center gap-2 ${isCompleted && !aWon ? 'opacity-40' : ''}`}>
          <div
            className="battle-nft-image"
            style={aWon ? { borderColor: 'var(--color-success)', boxShadow: '0 0 12px rgba(34, 197, 94, 0.3)' } : undefined}
          >
            <img
              src={`https://assets.mintgarden.io/thumbnails/medium/${nftA.id}.png`}
              alt={nftA.name}
              className="w-full rounded-lg"
              loading="lazy"
            />
          </div>
          <p className="text-sm font-semibold text-center">{nftA.name}</p>
          <span className="text-xs text-secondary">#{nftA.edition}</span>
          {isResolved && (
            <span className={`text-sm font-bold ${(nftA.scoreDelta ?? 0) > 0 ? 'text-accent' : (nftA.scoreDelta ?? 0) < 0 ? '' : 'text-muted'}`}
              style={(nftA.scoreDelta ?? 0) < 0 ? { color: 'var(--color-error)' } : undefined}
            >
              {formatDelta(nftA.scoreDelta)}
            </span>
          )}
          {aWon && <span className="badge badge-success">Winner</span>}
        </div>

        {/* VS divider */}
        <div className="flex items-center">
          <span className="text-xl font-bold text-muted">VS</span>
        </div>

        {/* NFT B */}
        <div className={`flex-1 flex flex-col items-center gap-2 ${isCompleted && !bWon ? 'opacity-40' : ''}`}>
          <div
            className="battle-nft-image"
            style={bWon ? { borderColor: 'var(--color-success)', boxShadow: '0 0 12px rgba(34, 197, 94, 0.3)' } : undefined}
          >
            <img
              src={`https://assets.mintgarden.io/thumbnails/medium/${nftB.id}.png`}
              alt={nftB.name}
              className="w-full rounded-lg"
              loading="lazy"
            />
          </div>
          <p className="text-sm font-semibold text-center">{nftB.name}</p>
          <span className="text-xs text-secondary">#{nftB.edition}</span>
          {isResolved && (
            <span className={`text-sm font-bold ${(nftB.scoreDelta ?? 0) > 0 ? 'text-accent' : (nftB.scoreDelta ?? 0) < 0 ? '' : 'text-muted'}`}
              style={(nftB.scoreDelta ?? 0) < 0 ? { color: 'var(--color-error)' } : undefined}
            >
              {formatDelta(nftB.scoreDelta)}
            </span>
          )}
          {bWon && <span className="badge badge-success">Winner</span>}
        </div>
      </div>

      {/* Active battle hint */}
      {isActive && (
        <p className="text-xs text-secondary text-center">
          Scores are hidden until the battle ends. Vote in Swipe to influence the outcome!
        </p>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx tsc -b --noEmit`

**Step 3: Commit**

```bash
git add src/components/game/BattleCard.tsx
git commit -m "feat: BattleCard spectator view — no vote buttons, score deltas on resolve"
```

---

### Task 8: Update BattleView — Remove Vote Handler

**Files:**
- Modify: `src/components/game/BattleView.tsx`

**Step 1: Update types**

Replace the `BattleNft` interface:

```typescript
interface BattleNft {
  id: string;
  edition: number;
  ownerDid: string;
  name: string;
  scoreDelta?: number;
}
```

Remove `hasVoted` from the `Battle` interface.

**Step 2: Remove handleVote**

Delete the entire `handleVote` function (lines 93-113).

**Step 3: Remove getAuthHeaders from useGame destructuring (only if handleVote was the only user)**

Change: `const { player, isVerified, getAuthHeaders } = useGame();`
To: `const { player, isVerified, getAuthHeaders } = useGame();` (keep — still needed by handleCancelQueue)

**Step 4: Update BattleCard usage — remove hasVoted and onVote props**

Change active battle rendering from:
```tsx
              <BattleCard
                key={battle.id}
                battleId={battle.id}
                nftA={battle.nftA}
                nftB={battle.nftB}
                endsAt={battle.endsAt}
                status={battle.status}
                winner={battle.winner}
                hasVoted={battle.hasVoted}
                onVote={handleVote}
              />
```

To:
```tsx
              <BattleCard
                key={battle.id}
                battleId={battle.id}
                nftA={battle.nftA}
                nftB={battle.nftB}
                endsAt={battle.endsAt}
                status={battle.status}
                winner={battle.winner}
              />
```

Change history battle rendering from:
```tsx
                <BattleCard
                  key={battle.id}
                  battleId={battle.id}
                  nftA={battle.nftA}
                  nftB={battle.nftB}
                  endsAt={battle.endsAt}
                  status={battle.status}
                  winner={battle.winner}
                  hasVoted={true}
                  resolvedAt={battle.resolvedAt}
                />
```

To:
```tsx
                <BattleCard
                  key={battle.id}
                  battleId={battle.id}
                  nftA={battle.nftA}
                  nftB={battle.nftB}
                  endsAt={battle.endsAt}
                  status={battle.status}
                  winner={battle.winner}
                  resolvedAt={battle.resolvedAt}
                />
```

**Step 5: Remove voterDid from loadBattles**

In `loadBattles`, remove the `voterDid` param since we no longer track hasVoted:
```typescript
  const loadBattles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: 'active', limit: '20' });
      if (player?.did) params.set('voterDid', player.did);  // still needed for queuedNfts
```

Actually keep voterDid — it's still used by the API to return `queuedNfts` for the current player.

**Step 6: Verify build**

Run: `npx tsc -b --noEmit`

**Step 7: Commit**

```bash
git add src/components/game/BattleView.tsx
git commit -m "feat: BattleView spectator mode — remove vote handler and hasVoted"
```

---

### Task 9: Build, Deploy, Verify

**Step 1: Full build**

Run: `npm run build`

**Step 2: Deploy**

Run: `npx wrangler pages deploy dist --project-name=wojak-ink`

**Step 3: Verify on https://wojak.ink**

Check:
- `/swipe` — battle NFTs should appear more frequently in feed (if any battles active)
- `/swipe/battles` — Active tab shows battles with countdown, no Vote A/B buttons, "Scores hidden" message
- `/swipe/battles` — History tab shows resolved battles with score deltas and Winner/Draw badges
- NFT images load correctly (MintGarden thumbnails)

**Step 4: Final commit (if any tweaks needed)**

```bash
git add -A
git commit -m "feat: blind battles — complete implementation"
```
