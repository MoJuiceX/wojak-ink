# Credit System Update — New Economics

**Context:** Read `docs/plans/2026-02-19-fight-club-design.md` Sections 7 and 11 for design.

---

## Overview

Updating the credit system for the new 0.1 XCH base mint price and adding participation credits.

---

## Task 1: Update Base Mint Price

**File:** `functions/api/mint/_shared.ts`

Change: `BASE_PRICE_XCH = 0.2` → `BASE_PRICE_XCH = 0.1`

This affects:
- Paid mint cost calculation (base + surcharge)
- Free mint credit cost calculation (scales with price)

Verify: The surcharge formula still works correctly with the new base. The surcharge is additive, so a 0.1 base + 0.5 surcharge = 0.6 XCH total. Check that free mint credit cost for surcharged items calculates correctly:
`freeMintCreditCost = ceil(FREE_MINT_CREDITS * (0.1 + maxSurcharge) / 0.1)`

---

## Task 2: Update Credits Per XCH

**File:** `workers/credit-tracker/worker.ts`

Change: `CREDITS_PER_XCH = 50` → `CREDITS_PER_XCH = 100`

This keeps the system revenue-neutral:
- Floor buy (2 XCH) × 100 credits/XCH = 200 credits = 2 free mints
- 2 free mints × 0.1 XCH = 0.2 XCH value = 10% royalty on 2 XCH ✓

---

## Task 3: Update Burn Credit Rewards

**File:** `workers/credit-tracker/worker.ts`

Find the burn event processing section (search for `type=3` or `burn` events).

Update credit amounts (STORED UNITS = display × 100):

| Dislike Ratio | Old Stored Units | New Stored Units | Display Credits |
|--------------|-----------------|-----------------|----------------|
| >70% dislikes | 2000 | **8000** | 80 |
| >50% dislikes | 1200 | **5000** | 50 |
| >30% dislikes | 500 | **2500** | 25 |
| Otherwise | 200 | **1000** | 10 |

---

## Task 4: Add Minter Check to Burn Rewards

**File:** `workers/credit-tracker/worker.ts`

In the burn processing path, BEFORE awarding credits:

1. Look up the NFT's original minter DID from `phase2_mints` or `mint_jobs` table
2. Look up the burner's DID (the wallet that burned it)
3. If `burner_did === minter_did` → award 0 credits, skip this burn
4. If `burner_did !== minter_did` → award credits per dislike ratio as above

The minter can be found via:
```sql
SELECT wallet_address FROM phase2_mints WHERE mintgarden_launcher_id = ?
-- or
SELECT wallet_address FROM mint_jobs WHERE nft_launcher_id = ?
```

The burner is the wallet that triggered the burn event (from MintGarden API).

If we can't determine the minter (older NFTs, edge cases), default to awarding credits (benefit of the doubt).

---

## Task 5: Add Participation Credits — Voting

**File:** Create new migration + update vote handler

### Migration: `functions/migrations/067_participation_credits.sql`

```sql
CREATE TABLE IF NOT EXISTS vote_credit_tracking (
  wallet_address TEXT PRIMARY KEY,
  total_votes INTEGER DEFAULT 0,
  credits_awarded_at INTEGER DEFAULT 0,
  current_streak_days INTEGER DEFAULT 0,
  last_vote_date TEXT,
  last_streak_credit_date TEXT
);
```

### Vote Handler Update
**File:** `functions/api/game/vote.ts` (or wherever swipe votes are processed)

After recording a vote:
1. Increment `vote_credit_tracking.total_votes` for this wallet
2. Check if `total_votes - credits_awarded_at >= 20`
3. If yes: INSERT into `credit_events` with 100 stored units (1 display credit), update `credits_awarded_at`
4. Check streak: if `last_vote_date` was yesterday, increment `current_streak_days`. If 7+ → award 1000 stored units (10 credits), reset streak counter.

Credits awarded: 1 display credit per 20 votes, 10 display credits per 7-day streak.

---

## Task 6: Add Participation Credits — Battles

**File:** `functions/api/combat/resolve-turn.ts` (where battle outcomes are determined)

After recording a battle result:
- Winner: INSERT into `credit_events` with 500 stored units (5 display credits)
- Loser: INSERT into `credit_events` with 100 stored units (1 display credit)
- Draw: INSERT into `credit_events` with 200 stored units (2 display credits)

Use `source = 'participation'` and `event_type = 'battle_reward'` to distinguish from Farmers Plot trade credits.

Dedup key: `battle_{battle_id}_{fighter_nft_id}` to prevent double-awarding.

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main` after each task
- Be very careful with credit_events inserts — use dedup keys to prevent duplicates
- All credit amounts are in STORED UNITS (display × 100)
- Test: 100 display credits (10000 stored) = 1 free base mint
