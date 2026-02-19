# Voting Carousel — 24-Hour Cooldown

---

## Overview

Users can vote on every Wojak. After voting on a Wojak, it won't appear again for 24 hours. After the cooldown, it re-enters the carousel. The carousel never runs dry.

---

## Task 1: Update Vote Feed Query

**File:** `functions/api/game/feed.ts`

Current behavior: Wojaks you've already voted on are excluded forever (`NOT EXISTS (voter already voted)`).

New behavior: Wojaks you've voted on are excluded only for 24 hours.

Change the exclusion query from:
```sql
AND NOT EXISTS (
  SELECT 1 FROM swipe_votes sv
  WHERE sv.nft_id = pm.mintgarden_launcher_id
  AND sv.voter_wallet = ?
)
```

To:
```sql
AND NOT EXISTS (
  SELECT 1 FROM swipe_votes sv
  WHERE sv.nft_id = pm.mintgarden_launcher_id
  AND sv.voter_wallet = ?
  AND sv.voted_at > datetime('now', '-24 hours')
)
```

This means: only exclude Wojaks voted on in the last 24 hours. Older votes allow the Wojak to reappear.

---

## Task 2: Handle Re-votes

**File:** `functions/api/game/vote.ts`

When a user votes on a Wojak they've already voted on before:

1. Check if a previous vote exists for this wallet + nft_id
2. If yes:
   - If previous vote was SAME direction (like→like or dislike→dislike): no Power change, just update timestamp
   - If previous vote was DIFFERENT direction (like→dislike or dislike→like): apply the delta
     - like→dislike: -2 Power on the Wojak (undo +1, apply -1)
     - dislike→like: +2 Power on the Wojak (undo -1, apply +1)
   - Update the existing vote record's timestamp and direction
3. If no previous vote: normal +1 or -1 Power

This ensures Power stays accurate even with re-votes.

---

## Task 3: Add Cooldown Index

**File:** `functions/migrations/070_vote_cooldown.sql` (NEW)

```sql
-- Index for efficient 24-hour lookback
CREATE INDEX IF NOT EXISTS idx_swipe_votes_cooldown
ON swipe_votes(voter_wallet, nft_id, voted_at DESC);

-- Ensure voted_at column exists and is populated
-- If voted_at doesn't exist, add it:
-- ALTER TABLE swipe_votes ADD COLUMN voted_at TEXT DEFAULT (datetime('now'));
```

Check the existing swipe_votes schema first. If `voted_at` already exists, just add the index.

---

## Task 4: Empty State (All on Cooldown)

If somehow ALL Wojaks are on 24-hour cooldown for a user:
- Show: "All caught up! New Wojaks will appear as cooldowns expire."
- Show a countdown to the nearest cooldown expiry
- Maybe show recent vote stats: "You've voted on X Wojaks today"

This should be rare — with 4,200 total supply and 24-hour cooldown, a user would need to vote on thousands in a day to exhaust the pool.

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main`
- Be careful with the re-vote logic — Power must stay consistent
- The 24-hour window uses `datetime('now', '-24 hours')` in SQLite
