# Burn Tab — Fight Club 4th Tab

**Context:** Read `docs/plans/2026-02-19-fight-club-design.md` for full design.

---

## Overview

Fight Club now has 4 tabs: **Battle | Vote | Rankings | Burn**

The Burn tab lets users:
1. See which Wojaks are eligible for burn rewards (bottom 25% by Power)
2. Burn their own eligible Wojaks (they get credits ONLY if they didn't mint it)
3. Browse cheap Wojaks from other players to buy and burn

---

## Task 1: Update Fight Club Tabs

**File:** `src/pages/FightClub.tsx`

Add 4th tab: "Burn" with route `/fight-club/burn`

Tab bar: **Battle | Vote | Rankings | Burn**

Update `src/App.tsx` to include `/fight-club/burn` route.

---

## Task 2: Create Burn Eligibility API

**File:** `functions/api/combat/burn-eligible.ts` (NEW)

**GET /api/combat/burn-eligible**

Returns all Wojaks in the bottom 25% by power_score.

Query:
```sql
-- Get the 25th percentile power score threshold
WITH ranked AS (
  SELECT power_score,
    NTILE(4) OVER (ORDER BY power_score ASC) as quartile
  FROM combat_fighters
)
SELECT MIN(power_score) as threshold FROM ranked WHERE quartile = 2;

-- Then get all fighters at or below that threshold
SELECT
  cf.nft_id, cf.owner_did, cf.power_score, cf.vote_power, cf.battle_power,
  cf.combat_type, cf.total_combat_wins, cf.total_combat_losses,
  dp.display_name as owner_name,
  pm.wallet_address as minter_wallet
FROM combat_fighters cf
LEFT JOIN did_profiles dp ON cf.owner_did = dp.did_id
LEFT JOIN phase2_mints pm ON cf.nft_id = pm.mintgarden_launcher_id
WHERE cf.power_score <= ?  -- threshold from above
ORDER BY cf.power_score ASC
LIMIT 100
```

Query params:
- `ownerDid=xxx` — filter to only this DID's burnable Wojaks
- `limit=100`, `offset=0`

Response includes `minter_did` so frontend can determine if burn reward applies.

---

## Task 3: Create Burn Execute API

**File:** `functions/api/combat/burn.ts` (NEW)

**POST /api/combat/burn**

Body: `{ nftId: string, burnerDid: string }`

This endpoint:
1. Verifies the NFT exists in combat_fighters
2. Verifies it's in the bottom 25% (eligible)
3. Verifies the burner's DID currently owns it (via did_holdings or combat_fighters.owner_did)
4. Determines if burn reward applies: look up minter from phase2_mints. If `minter_did !== burner_did` → award 100 credits (10000 stored units)
5. Marks the fighter as burned in the database (add a `burned_at` column or `status = 'burned'`)
6. Triggers the actual on-chain burn via Sage wallet RPC (or records intent for user to burn via wallet)

NOTE: The actual on-chain burn may need to happen client-side via Sage wallet. The API should:
- Validate eligibility
- Award credits if applicable
- Mark as burned in DB
- The frontend handles the wallet transaction

---

## Task 4: Create Burn Tab Component

**File:** `src/components/combat/BurnTab.tsx` (NEW)

Two sections:

**Section A: "Your Burnable Wojaks"**
- Fetch `/api/combat/burn-eligible?ownerDid=xxx`
- Show cards for each eligible Wojak with:
  - Wojak image
  - Power score (negative, shown in red)
  - Vote breakdown (likes/dislikes)
  - Battle record
  - "Burn" button
  - Label: "Earn 100 credits" if you didn't mint it, "No reward (you minted this)" if you did
- Clicking Burn → confirmation modal → triggers wallet burn transaction → calls burn API

**Section B: "Burn Marketplace" (below)**
- Show ALL bottom 25% Wojaks from ANY owner
- Sorted by Power (worst first)
- Each card shows: Wojak image, Power, owner name, price to buy (link to MintGarden listing)
- Text: "Buy cheap, burn for 100 credits"
- These are external purchase links — user buys on MintGarden, then comes back to burn

---

## Task 5: Migration for Burn Tracking

**File:** `functions/migrations/068_burn_tracking.sql` (NEW)

```sql
ALTER TABLE combat_fighters ADD COLUMN burned_at TEXT DEFAULT NULL;
ALTER TABLE combat_fighters ADD COLUMN burned_by_did TEXT DEFAULT NULL;

-- Index for finding eligible Wojaks quickly
CREATE INDEX IF NOT EXISTS idx_fighters_power_asc ON combat_fighters(power_score ASC)
WHERE burned_at IS NULL;
```

---

## Task 6: Update Credit Tracker for Simplified Burns

**File:** `workers/credit-tracker/worker.ts`

Replace the existing tiered burn credits (70%/50%/30% dislikes) with:

Simple rule:
- Is the Wojak in the bottom 25% by power_score? → Eligible
- Did the burner mint it? → No reward
- Did someone else mint it? → 10000 stored units (100 display credits)

That's it. One tier. One amount. Simple.

---

## Burn Reward Constant
100 display credits = 10000 stored units = 1 free base mint (0.1 XCH)

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main` after each task
- No `!important`, theme.css for visuals, Tailwind for layout
- The on-chain burn happens via Sage wallet client-side, not server-side
