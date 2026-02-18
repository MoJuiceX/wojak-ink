# Unified Swipe + Arena System — Design Document

## Vision

Two complementary systems share the same Wojak NFTs and feed into **one XP-based leaderboard**:

- **Swipe** (`/swipe`) — Community curation. Like/dislike Wojaks. Social proof of what looks good. Passive XP trickle for popular NFTs.
- **Arena** (`/arena`) — Turn-based RPG combat. Daily grind. Active XP from battling. This is where leaderboard position is won.

**One leaderboard. One score: Total XP.** Combat dominates, popularity gives an edge.

---

## Route Structure

### Swipe Routes (social curation)

| Route | Page | Status |
|-------|------|--------|
| `/swipe` | Voting feed — swipe/like/dislike NFTs | ✅ Built |
| `/swipe/dashboard` | Player HQ — Power Level, collection, onboarding | ✅ Built |
| `/swipe/battles` | Community-voted 1v1 (community picks winner) | ✅ Built (needs battle-cron fix) |
| `/swipe/leaderboard` | "Most Loved Wojaks" — ranked by net votes | ✅ Built |
| `/swipe/activity` | Activity feed | ✅ Built |

### Arena Routes (combat)

| Route | Page | Status |
|-------|------|--------|
| `/arena` | Combat Arena — queue, fighters, active battle | 🔄 Move from `/games/combat` |
| `/arena/battle/:id` | Individual battle view with animations | 🔄 Move from `/games/combat/battle/:id` |
| `/arena/leaderboard` | "Strongest Fighters" — ranked by total XP | 🆕 New page |
| `/arena/replay/:id` | Battle replay (auto-play + step-through) | 🆕 New route |

### Unified Leaderboard

| Route | Page | Status |
|-------|------|--------|
| `/leaderboard` | Existing page — add "Fighters" tab alongside arcade game scores | 🔄 Modify |

### Redirects

| Old Route | New Route |
|-----------|-----------|
| `/games/combat` | → `/arena` |
| `/games/combat/battle/:id` | → `/arena/battle/:id` |

---

## XP System — Unified Score

### Sources of XP

| Source | XP Amount | Frequency | Character |
|--------|-----------|-----------|-----------|
| **Combat win** | ~50-75 XP (scaled by opponent level/ELO) | Per battle | Active daily grind |
| **Combat loss** | 15 XP | Per battle | Rewarded for showing up |
| **Combat draw** | 25 XP | Per battle | Middle ground |
| **Swipe upvote received** | 1-3 XP per net like | Passive, ongoing | Long-term social proof |
| **Swipe battle win** | 5-10 XP | When community picks your Wojak | Occasional bonus |

### Balance Target

- Active battler (10 fights/day): **~500+ XP/day** from combat
- Popular Wojak (20 net upvotes/day): **~40-60 XP/day** passively from votes
- Combat is ~10:1 dominant over voting XP
- Popular + active Wojak has a consistent edge over equally active but ugly one

### XP Formula (existing, unchanged for combat)

```
Winner XP = 50 * (1 + oppLevel/ownLevel * 0.5) * (1 + abs(eloDiff)/400 * 0.25)
Loser XP  = 15
Draw XP   = 25
```

### New: Vote XP (added to fighter's XP pool)

```
Vote XP per batch = max(0, net_likes_since_last_calc) * XP_PER_NET_LIKE
```

Where `XP_PER_NET_LIKE = 2`. Calculated periodically (e.g., when DID indexer runs, or on API call).

Downvotes reduce the net count (can go to 0 XP for that period), but never subtract from existing XP.

### Swipe Battle Win XP

When a community-voted battle resolves and your Wojak wins:
```
Swipe Battle Win XP = 8
Swipe Battle Loss XP = 0
```

Small but meaningful over time.

### Leaderboard

**One leaderboard ranked by total XP** (which determines level via `floor(L^2.5 * 10)` curve).

The existing combat leaderboard API (`/api/combat/leaderboard?sortBy=level`) already sorts by level/XP. The Arena leaderboard page will use this endpoint.

The Swipe leaderboard (`/swipe/leaderboard`) stays separate — ranked by net votes (most loved), not XP.

---

## ELO — Matchmaking Only

ELO exists purely for fair matchmaking. It does NOT affect leaderboard rank.

- Starting ELO: 1000
- K-factor: 32
- Matchmaking range: ±100 ELO
- Displayed on fighter card as a skill indicator
- Not part of the unified score

---

## Infrastructure Fixes Required

### 1. DID Indexer Worker

**Current state:** `workers/did-indexer/worker.ts` runs every 30 minutes, indexes NFT holdings from MintGarden API, and also resolves expired Swipe battles (lines 99-117).

**Issues to verify:**
- Collection IDs may be swapped (Phase 1 / Phase 2 — verify against MintGarden)
- `ADMIN_SECRET` binding must be set for battle resolution to work
- Worker must be deployed with correct D1 binding

**Action:** Audit the collection IDs, verify Cloudflare Worker deployment, ensure `ADMIN_SECRET` is bound.

### 2. Battle-Cron Worker

**Current state:** `workers/battle-cron/worker.ts` is a standalone worker that calls `/api/game/battle-resolve`. But the DID indexer ALSO calls battle-resolve at the end of each run.

**Action:** The standalone battle-cron may be redundant since DID indexer handles it. Verify which is deployed. If DID indexer is running, battle-cron can be removed.

### 3. Vote XP Pipeline

**New infrastructure needed:**
- Periodic job (in DID indexer or separate) that converts net votes into fighter XP
- Requires linking `wojak_scores` (vote data) to `combat_fighters` (XP data) via NFT ID
- Must track "last XP award timestamp" to avoid double-counting

---

## Data Model Changes

### New column on `combat_fighters`

```sql
ALTER TABLE combat_fighters ADD COLUMN vote_xp_last_updated TEXT DEFAULT NULL;
```

Tracks when vote XP was last calculated for this fighter.

### No new tables needed

The existing `wojak_scores` table already tracks net votes per NFT. The existing `combat_fighters` table already has an `xp` column. We just need a periodic process that bridges the two.

---

## Navigation Design

### Cross-links

Both `/swipe` and `/arena` sections should show awareness of each other:

- **Swipe nav** (existing `SwipeNav.tsx`): Add an "Arena" link that navigates to `/arena`
- **Arena page**: Add a "Swipe" link back to `/swipe`
- Both share the same wallet/DID auth flow (SageWalletProvider)

### Shared Auth

Both systems use the same DID:
- Swipe: `GameContext.tsx` → registers with DID + wallet
- Combat: `useSageWallet()` → `getDIDs()` → ownerDid

The same DID that owns NFTs for voting also owns combat fighters. No additional auth wiring needed.

---

## What Stays the Same

- **Swipe voting UI** — fully built, no changes needed
- **Swipe battles (community-voted)** — fully built, just needs infra fix
- **Combat engine** — 18 types, 174 moves, 36 abilities, all battle logic
- **Combat animations** — canvas particles, audio, damage numbers, playback
- **Power Level calculation** — stays for Swipe leaderboard (holdings + creation quality)
- **Fighter identity** — deterministic from NFT visual traits at mint time

## What Changes

- **Route `/games/combat` → `/arena`** with redirects
- **New Arena leaderboard page** at `/arena/leaderboard` (sorted by XP)
- **New Arena nav bar** (similar to SwipeNav but for Arena routes)
- **Vote XP pipeline** — periodic job awarding XP to fighters from net upvotes
- **Swipe battle XP** — award 8 XP to winners of community-voted battles
- **Cross-navigation** — links between Swipe and Arena
- **Existing `/leaderboard`** — add a "Fighters" tab showing top fighters by XP

---

## Summary of Work Packages

### Package A: Route Migration + Arena Nav (frontend)
Move CombatArena from `/games/combat` to `/arena`. Create ArenaNav component. Add redirects. Add Arena leaderboard page.

### Package B: Vote XP Pipeline (backend)
New API endpoint or periodic job that calculates vote XP. Links `wojak_scores` to `combat_fighters`. Migration for tracking column.

### Package C: Swipe Battle XP (backend)
Modify `/api/game/battle-resolve` to award 8 XP to the winning fighter's `combat_fighters.xp` when a community-voted battle resolves.

### Package D: Infrastructure Audit (devops)
Verify DID indexer deployment, collection IDs, ADMIN_SECRET binding. Verify battle resolution runs. Remove redundant battle-cron if DID indexer handles it.

### Package E: Cross-Navigation + Leaderboard Tab (frontend)
Add Arena link to SwipeNav. Add Swipe link to ArenaNav. Add "Fighters" tab to the existing `/leaderboard` page.

### Package F: Polish + Testing
E2E tests for new routes. Verify XP flow end-to-end. Test redirects.
