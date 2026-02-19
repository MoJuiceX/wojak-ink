# Seed Rankings Data — Make Rankings Tab Look Alive

---

## Overview

The Rankings tab shows "No rankings yet" with a muted trophy icon. This looks dead. We need seed data so visitors see a working leaderboard immediately.

Two approaches combined:
1. **Real data from existing votes** — There are already votes in the system from Swipe. Aggregate them into power scores.
2. **Backfill migration** — One-time SQL migration to populate `power_scores` from existing `wojak_scores` (vote data).

---

## Task 1: Backfill Migration — Populate Power From Existing Votes

**File:** `functions/migrations/071_backfill_power_from_votes.sql` (NEW)

Create a migration that populates combat_fighters power_score from existing wojak_scores data:

```sql
-- Backfill vote_power and power_score from existing wojak_scores
-- net_score = likes - dislikes, which is exactly vote_power

-- Step 1: Update existing combat_fighters with vote power from wojak_scores
UPDATE combat_fighters
SET
  vote_power = COALESCE((
    SELECT ws.net_score
    FROM wojak_scores ws
    WHERE ws.nft_id = combat_fighters.nft_id
  ), 0),
  power_score = COALESCE((
    SELECT ws.net_score
    FROM wojak_scores ws
    WHERE ws.nft_id = combat_fighters.nft_id
  ), 0) + COALESCE(combat_fighters.battle_power, 0)
WHERE EXISTS (
  SELECT 1 FROM wojak_scores ws WHERE ws.nft_id = combat_fighters.nft_id
);

-- Step 2: For any scored NFTs not in combat_fighters, insert them
-- This happens when NFTs have been voted on but never entered combat
-- We need to know their owner_did, so only insert where we can resolve it
INSERT OR IGNORE INTO combat_fighters (nft_id, edition, owner_did, vote_power, power_score, battle_power, elo, level, wins, losses, draws, created_at)
SELECT
  ws.nft_id,
  ws.edition_number,
  COALESCE(dh.did, ''),
  ws.net_score,
  ws.net_score,
  0,
  1000,
  1,
  0, 0, 0,
  datetime('now')
FROM wojak_scores ws
LEFT JOIN did_holdings dh ON dh.nft_id = ws.nft_id
WHERE ws.nft_id NOT IN (SELECT nft_id FROM combat_fighters)
AND ws.total_votes > 0;
```

---

## Task 2: Power Leaderboard API — Handle Empty State Better

**File:** `functions/api/combat/power-leaderboard.ts`

Check how this endpoint works. If it returns empty arrays when no data exists, the migration in Task 1 should fix that by populating data.

If the endpoint filters only fighters with `power_score > 0`, make sure it also returns fighters with negative power (they voted poorly — that's still data).

Change the query to include all fighters with any votes:
```sql
-- Players leaderboard: aggregate by owner_did
SELECT
  cf.owner_did as did,
  COALESCE(dn.display_name, 'Anon') as displayName,
  COUNT(*) as wojakCount,
  SUM(cf.power_score) as totalPower,
  MAX(cf.power_score) as bestWojakPower
FROM combat_fighters cf
LEFT JOIN did_display_names dn ON dn.did = cf.owner_did
WHERE cf.owner_did != ''
GROUP BY cf.owner_did
HAVING SUM(ABS(cf.power_score)) > 0 OR COUNT(*) > 0
ORDER BY totalPower DESC
LIMIT ?
```

```sql
-- Wojaks leaderboard: individual NFT rankings
SELECT
  cf.nft_id as nftId,
  cf.edition as edition,
  '' as imageUrl,  -- TODO: resolve from did_holdings or nft cache
  cf.type as combatType,
  cf.power_score as powerScore,
  cf.vote_power as votePower,
  cf.battle_power as battlePower,
  cf.wins, cf.losses, cf.draws,
  COALESCE(dn.display_name, 'Anon') as ownerName
FROM combat_fighters cf
LEFT JOIN did_display_names dn ON dn.did = cf.owner_did
WHERE cf.power_score != 0 OR cf.vote_power != 0 OR (cf.wins + cf.losses + cf.draws) > 0
ORDER BY cf.power_score DESC
LIMIT ?
```

---

## Task 3: Ensure Rankings Show NFT Images

**File:** `functions/api/combat/power-leaderboard.ts`

The Wojaks ranking currently returns `imageUrl` but it may be empty. Try to resolve it:

Check if `did_holdings` or another table stores image URLs for NFTs. If so, join on it:

```sql
LEFT JOIN did_holdings dh ON dh.nft_id = cf.nft_id
```

And use `dh.image_uri` or `dh.thumbnail_uri` if available.

If image URLs aren't stored in the database, construct them from the edition number using the known IPFS pattern for the collection. Check how the gallery resolves images — it likely has a helper function or API.

If there's no clean way to get images, that's fine — the placeholder icon works for now.

---

## Task 4: Rankings "Your Position" Highlight

**File:** `src/components/combat/FightClubRankings.tsx`

The `yourRank` indicator only shows if rank > 3. Make it more prominent:

If the user's rank exists anywhere in the list, highlight their row:
```tsx
<div
  key={player.did}
  className={`rankings-row ${player.did === currentUserDid ? 'rankings-row-you' : ''}`}
>
```

Add a CSS class in theme.css:
```css
.rankings-row-you {
  border-color: var(--color-primary);
  background: var(--color-primary-5);
}
```

Pass the current user's DID down to the component. It can come from the wallet context or be passed as a prop from FightClub.tsx.

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main` after each task
- The migration (Task 1) must be applied manually to production D1 after deploy
- Check existing vote data: `SELECT COUNT(*) FROM wojak_scores WHERE total_votes > 0`
- If no vote data exists, the rankings will still be empty — that's OK, free voting (other spec) will populate it
