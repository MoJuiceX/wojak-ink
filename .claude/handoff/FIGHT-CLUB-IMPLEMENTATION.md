# Fight Club — Implementation Spec for CLI Builder

**Design doc:** `docs/plans/2026-02-19-fight-club-design.md` — READ THIS FIRST for full context.
**Deadline:** Friday 2026-02-21 (launch day)
**Priority:** Build in order. Each phase must pass `npm run build` before moving on.

---

## CRITICAL RULES
- Run `npm run build` after every significant change
- Commit and `git push origin main` after each completed task
- NEVER use `!important` in CSS
- All visual styles go in `src/styles/theme.css` — Tailwind for layout only
- Use existing theme classes: `.card`, `.btn`, `.input`, `.badge`
- Test on desktop AND mobile layouts mentally (responsive)

---

## Phase 1: Navigation Restructure

### Task 1.1: Update routes.ts
**File:** `src/config/routes.ts`

Remove from PRIMARY_NAV_ITEMS:
- Wojak Swipe entry
- Arena entry
- Leaderboard entry (standalone)

Add to PRIMARY_NAV_ITEMS (after Generator, before Games):
```typescript
{
  label: 'Fight Club',
  path: '/fight-club',
  icon: Swords,
  badge: 'dot',
  children: [
    { label: 'Battle', path: '/fight-club/battle' },
    { label: 'Vote', path: '/fight-club/vote' },
    { label: 'Rankings', path: '/fight-club/rankings' },
  ],
}
```

### Task 1.2: Update MoreMenu.tsx (Mobile)
**File:** `src/components/navigation/MoreMenu.tsx`

Remove: Wojak Swipe entry, Arena entry (both of them — there's a duplicate Arena)
Add: Fight Club entry with Swords icon, route `/fight-club`

### Task 1.3: Update App.tsx Routes
**File:** `src/App.tsx`

Add routes:
- `/fight-club` → FightClub page (new)
- `/fight-club/battle` → FightClub with Battle tab active
- `/fight-club/vote` → FightClub with Vote tab active
- `/fight-club/rankings` → FightClub with Rankings tab active

Add redirects:
- `/swipe` → redirect to `/fight-club/vote`
- `/swipe/*` → redirect to `/fight-club/vote/*`
- `/arena` → redirect to `/fight-club/battle`
- `/arena/*` → redirect to `/fight-club/battle/*`
- `/leaderboard` → redirect to `/fight-club/rankings`

Keep old component imports working — FightClub wraps existing components.

### Task 1.4: Move Arcade Leaderboard into Games
**File:** `src/pages/GamesHub.tsx`

The Games page already has a LeaderboardPanel sidebar on desktop. For mobile and full rankings:
- Add a "Scores" tab or section within GamesHub
- Reuse the existing Leaderboard component but scoped to arcade games only (no combat)
- Remove the standalone `/leaderboard` page import from App.tsx (redirect handles it)

**Build and push after Phase 1.**

---

## Phase 2: Fight Club Page Component

### Task 2.1: Create FightClub Page
**File:** `src/pages/FightClub.tsx` (NEW)

Structure:
```tsx
// Tab bar at top: Battle | Vote | Rankings
// Uses URL to determine active tab
// Renders existing components inside each tab:
//   Battle → <CombatArena /> (from src/pages/CombatArena.tsx)
//   Vote → <GameVoting /> or swipe components (from existing swipe pages)
//   Rankings → <FightClubRankings /> (new component)

// Tab bar styling: use theme.css classes
// Layout: Tailwind flex/grid
// Active tab: var(--color-primary) underline
// Inactive tab: var(--color-text-muted)
```

The tab bar should be a sub-nav inside the page, NOT the sidebar. Three pill-style or underline tabs.

### Task 2.2: Create FightClubRankings Component
**File:** `src/components/combat/FightClubRankings.tsx` (NEW)

Two sub-tabs: **Players** | **Wojaks**

**Players tab:**
- Fetches DID rankings from `/api/combat/power-leaderboard` (new endpoint, Phase 3)
- Displays: rank, DID name, Wojak count, total Power, top fighter
- Podium for top 3
- Scrollable list for rest
- Your position indicator

**Wojaks tab:**
- Fetches individual NFT rankings from `/api/combat/power-leaderboard?type=wojaks` (new endpoint)
- Displays: rank, Wojak image/edition, type badge, Power score, vote breakdown, W/L/D record, owner

### Task 2.3: Onboarding States in FightClub Page

The FightClub page must handle 3 user states:

**State A: No Farmers Plot**
- Show a full-page gate screen
- Message: "Hold a Wojak Farmers Plot NFT to enter Fight Club"
- Show current floor price if available
- Button: "Buy on MintGarden" → external link to Farmers Plot marketplace
- Below: brief teaser of what Fight Club offers (vote, battle, climb rankings)

**State B: Has Farmers Plot, No Wojaks**
- Can access Vote and Rankings tabs normally
- Battle tab shows prominent banner at top:
  - "Mint your first fighter to enter the arena!"
  - Button → links to /generator
  - Below the banner: show battle replays or "spectate" other battles if possible
- Vote tab works fully (user can swipe/vote on other people's Wojaks)

**State C: Has Farmers Plot + Wojaks**
- Full access to all 3 tabs, no banners

Check state using:
1. DID indexer / wallet for Farmers Plot ownership
2. `combat_fighters` table or wallet NFT check for Wojak ownership

**Build and push after Phase 2.**

---

## Phase 2.5: Fix Fighter-DID Pipeline (CRITICAL)

### Task 2.5.1: Sync owner_did in DID Indexer
**File:** `workers/did-indexer/worker.ts`

**THE PROBLEM:** When a Wojak is minted, a `combat_fighters` row is created with `owner_did = ''`. When the user puts the NFT into their DID, the DID indexer updates `did_holdings` but NEVER updates `combat_fighters.owner_did`. This means fighters are invisible in Fight Club.

**THE FIX:** After the DID indexer syncs `did_holdings` for a player, add a step that:

```sql
-- For each NFT detected in the DID's holdings:
UPDATE combat_fighters
SET owner_did = ?  -- the DID that holds this NFT
WHERE nft_id = ?   -- the NFT's launcher ID
AND (owner_did = '' OR owner_did != ?)  -- only if unclaimed or ownership changed (trade/transfer)
```

This also handles NFT sales — when a Wojak moves to a new DID, the `owner_did` updates on the next indexer run. The old owner loses the fighter, the new owner gains it (with all stats/Power).

**Run every indexer cycle (30 min).** Loop through all `did_holdings` entries and sync to `combat_fighters`.

### Task 2.5.2: Backfill existing fighters
**File:** Create a one-time migration or script

Any existing `combat_fighters` with `owner_did = ''` need to be matched to their current holder via `did_holdings`. Run once after deploying the indexer fix.

```sql
UPDATE combat_fighters SET owner_did = (
  SELECT did_id FROM did_holdings WHERE nft_id = combat_fighters.nft_id LIMIT 1
)
WHERE owner_did = ''
AND nft_id IN (SELECT nft_id FROM did_holdings)
```

**Build and push after Phase 2.5.**

---

## Phase 3: Power Scoring Backend

### Task 3.1: Create Power Score Migration
**File:** `functions/migrations/065_power_scoring.sql` (NEW)

```sql
-- Power is stored per-Wojak, computed from votes + battle results
-- This adds a power_score column to combat_fighters
-- and creates a DID power view

ALTER TABLE combat_fighters ADD COLUMN power_score INTEGER DEFAULT 0;

-- Track vote power separately (likes - dislikes from swipe)
ALTER TABLE combat_fighters ADD COLUMN vote_power INTEGER DEFAULT 0;

-- Track battle power separately (wins*30 - losses*10 + draws*5)
ALTER TABLE combat_fighters ADD COLUMN battle_power INTEGER DEFAULT 0;

-- power_score = vote_power + battle_power (computed on update)

-- DID display names
CREATE TABLE IF NOT EXISTS did_profiles (
  did_id TEXT PRIMARY KEY,
  display_name TEXT,
  name_source TEXT DEFAULT 'chain', -- 'chain', 'custom', 'random'
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_fighters_power ON combat_fighters(power_score DESC);
CREATE INDEX IF NOT EXISTS idx_fighters_owner_power ON combat_fighters(owner_did, power_score DESC);
```

### Task 3.2: Update Vote Handler to Track Power
**File:** `functions/api/game/vote.ts` (or wherever swipe votes are handled)

When a vote is cast:
- Like: UPDATE combat_fighters SET vote_power = vote_power + 1, power_score = vote_power + 1 + battle_power WHERE nft_id = ?
- Dislike: UPDATE combat_fighters SET vote_power = vote_power - 1, power_score = vote_power - 1 + battle_power WHERE nft_id = ?

If the Wojak doesn't exist in combat_fighters yet, INSERT it first with default stats.

### Task 3.3: Update Battle Resolution to Track Power
**File:** `functions/api/combat/resolve-turn.ts`

When a battle ends (winner determined):
- Winner: UPDATE combat_fighters SET battle_power = battle_power + 30, power_score = vote_power + battle_power + 30 WHERE nft_id = ?
- Loser: UPDATE combat_fighters SET battle_power = battle_power - 10, power_score = vote_power + battle_power - 10 WHERE nft_id = ?
- Draw: UPDATE both SET battle_power = battle_power + 5, power_score = vote_power + battle_power + 5

### Task 3.4: Create Power Leaderboard API
**File:** `functions/api/combat/power-leaderboard.ts` (NEW)

**GET /api/combat/power-leaderboard**

Query params:
- `type=players` (default) — DID rankings
- `type=wojaks` — Individual NFT rankings
- `limit=50`
- `offset=0`

**Players query:**
```sql
SELECT
  owner_did,
  dp.display_name,
  COUNT(*) as wojak_count,
  SUM(power_score) as total_power,
  MAX(power_score) as best_wojak_power
FROM combat_fighters cf
LEFT JOIN did_profiles dp ON cf.owner_did = dp.did_id
GROUP BY owner_did
ORDER BY total_power DESC
LIMIT ? OFFSET ?
```

**Wojaks query:**
```sql
SELECT
  nft_id, owner_did, combat_type, power_score, vote_power, battle_power,
  total_combat_wins, total_combat_losses, total_combat_draws,
  dp.display_name as owner_name
FROM combat_fighters cf
LEFT JOIN did_profiles dp ON cf.owner_did = dp.did_id
ORDER BY power_score DESC
LIMIT ? OFFSET ?
```

### Task 3.5: DID Profile Name API
**File:** `functions/api/profile/display-name.ts` (NEW)

**GET /api/profile/display-name?did=xxx** — Get display name
**PUT /api/profile/display-name** — Set display name
Body: `{ did: string, name: string, source: 'custom' | 'random' }`

**GET /api/profile/random-name** — Generate a random fun name
Use a simple word combiner: adjective + noun + number (e.g., "BasedWojak42", "CryptoChad7")

**Build and push after Phase 3.**

---

## Phase 4: Updated Credit System

### Task 4.1: Update Base Price Constant
**File:** `functions/api/mint/_shared.ts`

Change: `BASE_PRICE_XCH = 0.2` → `BASE_PRICE_XCH = 0.1`

### Task 4.2: Update Credits Per XCH
**File:** `workers/credit-tracker/worker.ts`

Change: `CREDITS_PER_XCH = 50` → `CREDITS_PER_XCH = 100`

### Task 4.3: Update Burn Credit Rewards
**File:** `workers/credit-tracker/worker.ts`

Find the burn event processing section. Update credit amounts (stored units = display × 100):

- >70% dislikes: `8000` stored units (80 display credits)
- >50% dislikes: `5000` stored units (50 display credits)
- >30% dislikes: `2500` stored units (25 display credits)
- Otherwise: `1000` stored units (10 display credits)

### Task 4.4: Add Minter Check to Burn Rewards
**File:** `workers/credit-tracker/worker.ts`

In the burn processing path, before awarding credits:
- Look up the NFT's original minter DID
- If burner_did === minter_did → award 0 credits (skip)
- If burner_did !== minter_did → award credits per dislike ratio

The minter DID should be stored in the mint_jobs or phase2_mints table. Look up by NFT ID.

### Task 4.5: Add Participation Credits
**File:** `workers/credit-tracker/worker.ts` or create new endpoint

Add credit earning for participation:
- Voting: After every 20 votes by a wallet, award 100 stored units (1 display credit)
  - Track vote count in a `vote_credit_tracking` table: wallet, vote_count, last_credit_at
- Battle win: Award 500 stored units (5 display credits) per win
- Battle loss: Award 100 stored units (1 display credit) per loss
- 7-day voting streak: Award 1000 stored units (10 display credits)
  - Track streaks in `vote_streaks` table: wallet, current_streak, last_vote_date

**Build and push after Phase 4.**

---

## Phase 5: Farmers Plot Access Gate

### Task 5.1: Add Access Check to Fight Club
**File:** `src/pages/FightClub.tsx`

Before rendering Fight Club content:
- Check if connected DID holds at least 1 Farmers Plot NFT
- Use the existing DID indexer / wallet check
- If no Farmers Plot: show a gated view with:
  - Message: "Hold a Wojak Farmers Plot NFT to access Fight Club"
  - Link to buy on MintGarden marketplace
  - Show what Fight Club offers (teaser)

### Task 5.2: Backend Gate Check
**File:** `functions/api/combat/gate.ts` (NEW or add to existing)

**GET /api/combat/gate?did=xxx** → `{ hasAccess: boolean, farmersPlotCount: number }`

Check the DID's NFT holdings for Farmers Plot collection NFTs.
This may already exist in the DID indexer. Reuse if possible.

**Build and push after Phase 5.**

---

## Phase 6: Polish & Verify

### Task 6.1: Test All Redirects
Verify in browser:
- `/swipe` → `/fight-club/vote`
- `/arena` → `/fight-club/battle`
- `/leaderboard` → `/fight-club/rankings`

### Task 6.2: Update All Internal Links
Search entire codebase for:
- `href="/swipe"` or `to="/swipe"` → change to `/fight-club/vote`
- `href="/arena"` or `to="/arena"` → change to `/fight-club/battle`
- `href="/leaderboard"` or `to="/leaderboard"` → change to `/fight-club/rankings`

### Task 6.3: Mobile Responsive Check
Ensure Fight Club page with 3 tabs works on mobile:
- Tab bar should be full-width, scrollable if needed
- Each tab content fills viewport
- Rankings tables are mobile-friendly (horizontal scroll or stacked cards)

### Task 6.4: Final Build + Push
`npm run build && git push origin main`

---

## File Summary

### New Files
- `src/pages/FightClub.tsx`
- `src/components/combat/FightClubRankings.tsx`
- `functions/migrations/065_power_scoring.sql`
- `functions/api/combat/power-leaderboard.ts`
- `functions/api/profile/display-name.ts`
- `functions/api/combat/gate.ts` (if not existing)

### Modified Files
- `src/config/routes.ts` — nav items
- `src/components/navigation/MoreMenu.tsx` — mobile nav
- `src/App.tsx` — routes + redirects
- `src/pages/GamesHub.tsx` — absorb arcade leaderboard
- `functions/api/mint/_shared.ts` — base price 0.1 XCH
- `workers/credit-tracker/worker.ts` — credits per XCH, burn rewards, participation credits
- `functions/api/combat/resolve-turn.ts` — Power tracking on battle end
- `functions/api/game/vote.ts` — Power tracking on vote
- Various files with `/swipe`, `/arena`, `/leaderboard` links

### Deleted Files (or redirected)
- `src/pages/Leaderboard.tsx` — replaced by redirect to /fight-club/rankings
