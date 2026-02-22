# SPEC: Fight Club Voting-Only Leaderboards (Wojaks + Players)

> **Purpose:** Make Fight Club rankings simple, trustworthy, and easy to understand while **Battle is demo-only**.
>
> **Audience:** Implementation agent (Anti-Gravity / Claude Code / Codex), working in `/Users/abit_hex/wojak-ink`.
>
> **Outcome:** Users understand exactly how voting works, how Wojaks rank, and how DID-based Player rankings are calculated from those Wojaks.

---

## 1. Executive Summary

Fight Club currently shows users **two different “power” systems**:

- `Rankings` tab uses `/api/combat/power-leaderboard` (NFT-level `combat_fighters.power_score`, with fallback to `wojak_scores.net_score`)
- `Vote` screen “Your Game” panel shows `game_players.power_level` from `/api/game/power-level`, which includes extra factors (value, breadth, creator spread, burn bonuses)

This causes confusing and inconsistent numbers (example seen in screenshots: a player can show `⚡9` in Rankings and `2 Casual` in the Vote panel at the same time).

### Decision for this phase

**Battle does not affect rankings yet.**

For this iteration, Fight Club rankings should be **voting-only** and use a **single, consistent scoring model** across:

- `Rankings > Wojaks`
- `Rankings > Players`
- `Vote` screen “Your Game” panel

### Core user-facing rule (simple)

- `Glaze = +1`
- `Fade = -1`
- `Wojak Vote Score = Glazes - Fades`

### Player leaderboard rule (simple + anti-whale)

- `Player Score = sum of top 10 eligible Wojak Vote Scores in the player’s DID`
- A Wojak is **eligible** only after **5 total votes** (provisional threshold)

This makes the system easy to explain and avoids noisy or manipulated early rankings.

---

## 2. Scope (This Spec)

### In Scope

- Fight Club voting-only leaderboard behavior (Wojaks + Players)
- UI copy and labels for clarity
- Backend API(s) for voting leaderboards and “Your Game” score
- Remove/hide battle scoring from ranking UI (while keeping Battle tab demo available)
- Provisional handling (minimum votes before score counts toward Player Score)
- QA/test plan for correctness and consistency

### Out of Scope (Do NOT do in this spec)

- Activating real battles
- ELO/battle XP integration into rankings
- Burn power integration into rankings
- Full anti-sybil redesign of guest voting (note as future work)
- Replacing current combat schema / endpoints globally

---

## 3. Current State (Confirmed in Repo)

### 3.1 Rankings UI uses combat leaderboard endpoint

**Read first:**
- `/Users/abit_hex/wojak-ink/src/components/combat/FightClubRankings.tsx`
- `/Users/abit_hex/wojak-ink/functions/api/combat/power-leaderboard.ts`

The `FightClubRankings` component currently fetches `/api/combat/power-leaderboard` for both:
- Players tab
- Wojaks tab

Key references:
- `FightClubRankings` fetch (players): `src/components/combat/FightClubRankings.tsx`
- `FightClubRankings` fetch (wojaks): `src/components/combat/FightClubRankings.tsx`
- Players total power sums `cf.power_score` fallback `ws.net_score`: `functions/api/combat/power-leaderboard.ts`
- Wojak row fields return `power_score`, `vote_power`, `battle_power`: `functions/api/combat/power-leaderboard.ts`

### 3.2 Vote screen “Your Game” uses a different power system

**Read first:**
- `/Users/abit_hex/wojak-ink/src/components/game/VotingStatsPanel.tsx`
- `/Users/abit_hex/wojak-ink/src/contexts/GameContext.tsx`
- `/Users/abit_hex/wojak-ink/functions/api/game/_powerLevel.ts`
- `/Users/abit_hex/wojak-ink/functions/api/game/power-level.ts`

`VotingStatsPanel` shows `player.powerLevel`, which comes from `game_players.power_level` and `/api/game/power-level`, not from the rankings leaderboard.

That formula includes:
- vote net score
- base value per NFT
- surcharge log value
- breadth bonus
- creator spread/quality bonus
- burn power bonus

This is too complex and semantically different for a **voting-only** phase.

### 3.3 Voting loop is active, battle is not

**Read first:**
- `/Users/abit_hex/wojak-ink/src/pages/FightClub.tsx`
- `/Users/abit_hex/wojak-ink/src/pages/GameVoting.tsx`
- `/Users/abit_hex/wojak-ink/src/components/game/VotingFeed.tsx`
- `/Users/abit_hex/wojak-ink/functions/api/game/feed.ts`
- `/Users/abit_hex/wojak-ink/functions/api/game/vote.ts`

Current behavior:
- Voting is live (`Glaze`/`Fade`)
- Battle tab is demo/preview (not intended to affect rankings yet)
- Users can vote in an ongoing feed
- Feed intentionally allows seeing NFTs again (re-votes allowed)
- Vote endpoint updates vote aggregates and may update combat fighter score if a combat record exists

### 3.4 Important current inconsistency (must fix)

The current combat leaderboard can **sort** by fallback vote score (`COALESCE(cf.power_score, ws.net_score, 0)`) while the UI **displays** `powerScore` as `COALESCE(cf.power_score, 0)`. This creates rows where:
- `Vote: +3`
- `Battle: 0`
- but displayed total `⚡ 0`

This is exactly the kind of confusion shown in your screenshots.

---

## 4. Product Intent (Voting-Only Phase)

## What users should understand in 10 seconds

### Wojaks Tab
- “These are the individual Your Wojak NFTs people are voting on.”
- “Glaze adds 1. Fade subtracts 1.”
- “Wojaks need at least 5 votes before they count for Player rankings.”

### Players Tab
- “A Player is a DID with at least one Farmers Plot NFT and Your Wojaks in that DID.”
- “Your Player Score is the sum of your top 10 eligible Wojak scores.”

### Vote Screen
- “Your Game” number should be the same scoring system as the Player Rankings.
- No battle terms in the score display while battles are demo-only.

---

## 5. Final Scoring Model (Voting-Only)

## 5.1 Wojak Vote Score (authoritative, simple)

**Raw vote scoring (keep this unchanged):**
- `Glaze = +1`
- `Fade = -1`

**Definition:**
- `wojak_vote_score = likes - dislikes`
- Stored source: `wojak_scores.net_score`

### Why this is the right choice now
- Intuitive and transparent
- Matches current user expectation and existing data
- Easy to debug and verify
- No hidden multipliers while system is still earning trust

## 5.2 Provisional threshold (anti-noise)

A Wojak is **Provisional** until it reaches:
- `total_votes >= 5`

Before that:
- It can appear in the Wojaks leaderboard UI
- It does **not** count toward Player Score
- It should be visually labeled `Provisional`

### Why
This prevents ranking instability from a handful of early votes and makes the Player leaderboard feel more legitimate.

## 5.3 Player Score (DID leaderboard)

A **Player** is ranked by their DID using the Wojaks in that DID.

### Eligibility to appear in Players leaderboard
A player must:
- have a DID (`game_players.did_id`)
- be Farmers Plot verified (`game_players.phase1_verified = 1`)
- have at least 1 Your Wojak in that DID (`did_holdings` for Phase 2 collection)

### Score formula (voting-only)

**Player Score = sum of top 10 eligible Wojak Vote Scores in the DID**

Where:
- “eligible Wojaks” = `total_votes >= 5`
- “top 10” sorted by `wojak_vote_score DESC`

#### Notes
- If a player has fewer than 10 eligible Wojaks, sum all eligible Wojaks.
- Negative scores are allowed (if a player has only negative eligible Wojaks).
- For display, if you want cleaner UX, treat `<= 0` as “Unranked” in Players tab (recommended).

### Why this model
- Very easy to explain to users
- Rewards quality, not just quantity
- Still rewards players who curate several strong Wojaks
- Avoids hidden weighting during the voting-only phase

---

## 6. Leaderboard Definitions and Rules

## 6.1 Wojaks leaderboard (voting-only)

### Default rank order (`Top` / `Score`)
Rank Wojaks by:
1. `is_provisional ASC` (ranked first, provisional later)
2. `wojak_vote_score DESC`
3. `total_votes DESC`
4. `edition_number ASC`

### Display rules
For each row/card show:
- `#edition`
- image
- owner display name (if available)
- `Glazes` and `Fades` counts
- `Vote Score` (net)
- `Provisional` badge if `< 5 total votes`

### Hide for now
- `Battle Power`
- `battle record` (W/L/D) in ranking rows
- combined “Power” label if it implies battle affects current ranking

### Recommended sort options (simplified)
Replace current sort chips with clearer voting-only options:
- `Score` (default) -> net score
- `Most Glazed` -> likes desc
- `Ratio` -> like ratio (only meaningful when total_votes >= 5; otherwise badge provisional)
- `Newest` -> edition desc

Optional later:
- `Most Votes`
- `Trending` (once you define a clear formula)

Remove for now:
- `Battle Record`
- `Hot` (unless you define it clearly)

## 6.2 Players leaderboard (DID-based)

### Rank order
Rank Players by:
1. `player_score DESC`
2. `eligible_wojak_count DESC`
3. `best_wojak_score DESC`
4. `did ASC`

### Display fields (simple)
For each player row/card show:
- rank
- display name (fallback DID short form)
- avatar/best Wojak image (if available)
- `Player Score`
- `Eligible Wojaks` count
- `Total Wojaks` count (optional but useful)

### Tooltip / helper copy
- “Player Score = sum of your top 10 Wojak Vote Scores (Wojaks need 5 votes to count).”

---

## 7. UX / Copy Changes (Clarity First)

## 7.1 Rename score labels (critical)

### Rankings > Wojaks tab
Current confusing labels:
- `Power`
- `Battle`
- `Vote / Battle` breakdown

Replace with:
- `Vote Score` (main numeric)
- `Glazes` / `Fades`
- `Provisional` badge when applicable

### Rankings > Players tab
Replace `Power` with:
- `Player Score`

### Vote screen “Your Game” card
Current:
- shows `player.powerLevel` (different system)

Replace with:
- `Your Player Score`
- tier label based on Player Score (voting-only thresholds below)
- optional subtext: `Based on top 10 eligible Wojaks in your DID`

## 7.2 Tier labels (voting-only)

Replace battle-era thresholds with voting-only thresholds for the Vote screen and any Player Score tier badges.

### Voting-only Player Score tiers (recommended)
- `Casual`: `0–9`
- `Active`: `10–24`
- `Serious`: `25–59`
- `Strong`: `60–119`
- `Elite`: `120–249`
- `Legend`: `250+`

Notes:
- These thresholds assume Player Score is top-10 sum of net votes.
- They can be tuned after observing real distributions.

## 7.3 “How Ranking Works” explainer (must add)

Add a small info tooltip/modal on the Rankings screen with this exact logic:

- `Glaze = +1` vote
- `Fade = -1` vote
- `Wojak Vote Score = Glazes - Fades`
- `Wojaks need 5 votes before they count toward Player Score`
- `Player Score = sum of top 10 eligible Wojak scores in your DID`
- `Only verified Players (Farmers Plot + DID) appear on the Players leaderboard`

## 7.4 Battle messaging during voting-only phase

Battle tab should clearly say:
- `Battle is currently a demo preview`
- `Battles do not affect rankings yet`

Do not mention `Battle Power` in the rankings UI while this phase is active.

---

## 8. Implementation Strategy (Recommended)

## Key recommendation: Create a dedicated voting leaderboard API

Do **not** overload `/api/combat/power-leaderboard` for this phase.

Create a new endpoint that is explicitly voting-only and easier to reason about:

- `GET /api/fight-club/vote-leaderboard?type=wojaks|players&limit=...&offset=...&sort=...`
- `GET /api/fight-club/my-score?did=...` (or infer via auth/player lookup)

Why this is better:
- Keeps combat endpoints intact for future battle rollout
- Avoids mixing battle-era schema fields in a voting-only UI
- Makes code and product semantics clearer

### If you want minimum changes (fallback option)
You *can* patch `/api/combat/power-leaderboard`, but this spec recommends a new endpoint for long-term clarity.

---

## 9. Backend Implementation Details

## 9.1 New endpoint: `GET /api/fight-club/vote-leaderboard`

### File to create
- `/Users/abit_hex/wojak-ink/functions/api/fight-club/vote-leaderboard.ts`

### Query params
- `type`: `wojaks` | `players` (required; default `players` optional)
- `limit`: default `50`, max `100`
- `offset`: default `0`
- `sort` (wojaks only): `score` | `glazed` | `ratio` | `newest`

### Common constants
- `PROVISIONAL_MIN_VOTES = 5`
- `PLAYER_TOP_N = 10`

### Response shape (wojaks)

```json
{
  "wojaks": [
    {
      "rank": 1,
      "countsTowardPlayer": true,
      "isProvisional": false,
      "provisionalVotesNeeded": 0,
      "nftId": "nft1...",
      "edition": 326,
      "imageUrl": "https://...",
      "ownerDid": "did:chia:...",
      "ownerName": "MojuiceX",
      "likes": 12,
      "dislikes": 3,
      "totalVotes": 15,
      "voteScore": 9,
      "likeRatio": 0.8
    }
  ],
  "total": 420,
  "sort": "score",
  "meta": {
    "mode": "voting_only",
    "provisionalMinVotes": 5
  }
}
```

### Response shape (players)

```json
{
  "players": [
    {
      "rank": 1,
      "did": "did:chia:...",
      "displayName": "MojuiceX",
      "playerScore": 42,
      "eligibleWojakCount": 6,
      "totalWojakCount": 10,
      "bestWojakScore": 12,
      "bestWojakImage": "https://..."
    }
  ],
  "yourRank": 8,
  "meta": {
    "mode": "voting_only",
    "playerTopN": 10,
    "provisionalMinVotes": 5
  }
}
```

## 9.2 SQL logic: Wojaks leaderboard

**Source of truth:** `wojak_scores`

Join against:
- `phase2_mints` for image and edition (if available)
- `did_holdings` for owner DID
- `did_profiles` for owner display name

### Derived fields
- `vote_score = COALESCE(ws.net_score, 0)`
- `total_votes = COALESCE(ws.total_votes, 0)`
- `is_provisional = CASE WHEN total_votes < 5 THEN 1 ELSE 0 END`
- `counts_toward_player = total_votes >= 5`
- `like_ratio = likes / total_votes` when `total_votes > 0`

### Ranking behavior
- Numeric `rank` should apply only to **non-provisional** rows
- Provisional rows can either:
  - have `rank: null` (recommended), or
  - continue numeric rank but display “P” badge instead

Recommended: `rank: null` for provisional rows to avoid implying they are in the official standings.

## 9.3 SQL logic: Players leaderboard

**Source of truth:**
- `game_players` (eligibility + DID)
- `did_holdings` (which Your Wojaks are in DID)
- `wojak_scores` (vote score + vote counts)
- `did_profiles` (display name)

### Eligibility filter
- `game_players.phase1_verified = 1`
- DID exists and non-empty
- at least one Phase 2 NFT in `did_holdings`

### Scoring algorithm
For each DID:
1. Find all Phase 2 Wojaks held in the DID
2. Join `wojak_scores`
3. Keep only Wojaks with `total_votes >= 5`
4. Sort by `net_score DESC, total_votes DESC, edition_number ASC`
5. Sum top 10 `net_score`

### Recommended SQL shape (window function)
Use a CTE + `ROW_NUMBER() OVER (PARTITION BY did_id ORDER BY ...)` and sum rows where `row_num <= 10`.

### Important edge case handling
- Missing `wojak_scores` row = treat as `0 votes`, `provisional`
- A DID with 0 eligible Wojaks:
  - can be hidden from ranked Players list (recommended)
  - still returned in a separate “your status” endpoint as `unranked`

## 9.4 New endpoint: `GET /api/fight-club/my-score`

### File to create
- `/Users/abit_hex/wojak-ink/functions/api/fight-club/my-score.ts`

### Purpose
Provide the `Vote` screen “Your Game” card with a number that matches the Players leaderboard logic.

### Input
Either:
- auth-derived DID (Clerk), or
- `?did=` query param for wallet-resolved DID use cases

### Output
- `playerScore`
- `tier`
- `eligibleWojakCount`
- `totalWojakCount`
- `bestWojakScore`
- `rank` (or `null` if unranked)
- `pointsToNextRank` (optional; nice to have)
- meta constants (`topN`, `provisionalMinVotes`)

### Why separate endpoint
- Avoids fetching full players leaderboard just to render one panel
- Keeps Vote screen fast and consistent

---

## 10. Frontend Implementation Details

## 10.1 Fight Club Rankings UI (`FightClubRankings.tsx`)

### File
- `/Users/abit_hex/wojak-ink/src/components/combat/FightClubRankings.tsx`

### Required changes

1. Switch data source
- Replace `/api/combat/power-leaderboard` calls with `/api/fight-club/vote-leaderboard`

2. Rename fields in UI
- `powerScore` -> `voteScore`
- `totalPower` -> `playerScore`

3. Remove/hide battle display
- Remove `Battle: ...` breakdown
- Remove W/L/D line from default voting leaderboard rows (or mark as hidden until battle launch)
- Remove `Battle Record` sort chip

4. Add provisional state display
- If `isProvisional`:
  - show badge `Provisional`
  - show text: `Needs X more votes`
  - do not style as ranked winner

5. Simplify sort chips
Recommended set:
- `Score`
- `Most Glazed`
- `Ratio`
- `Newest`

6. Add explainer trigger
- small `(i)` button or tooltip near Rankings tabs/subtabs

## 10.2 Vote screen stats panel (`VotingStatsPanel.tsx`)

### File
- `/Users/abit_hex/wojak-ink/src/components/game/VotingStatsPanel.tsx`

### Required changes

1. Stop showing `game_players.power_level` as Fight Club score
2. Fetch and display `playerScore` from new `/api/fight-club/my-score`
3. Replace title/value labeling:
- `Your Game` -> keep (brand/feel is good)
- number label should map to `Player Score`
- subtext: `Top 10 eligible Wojaks in your DID`

4. Use new voting-only tier thresholds
- Replace current 9000-scale thresholds with voting-only thresholds

## 10.3 Mobile stats bar (`MobileStatsBar.tsx`)

### File
- `/Users/abit_hex/wojak-ink/src/components/game/MobileStatsBar.tsx`

### Required changes

1. Replace `Power Level` label with `Player Score`
2. Use value from new voting-only score endpoint / shared GameContext value
3. Fix votes-left display if needed
- Currently frontend shows `votesRemaining/10` while voting is effectively unlimited in `GameContext`
- If voting is unlimited this phase, display:
  - `Unlimited` or hide this segment
  - or repurpose second segment to `Eligible Wojaks`

**Recommendation:**
- Segment 1: `Player Score`
- Segment 2: `Rank` (or `Eligible Wojaks`)

## 10.4 Fight Club page (`FightClub.tsx`)

### File
- `/Users/abit_hex/wojak-ink/src/pages/FightClub.tsx`

### Required changes

1. Battle tab copy
- Make it explicit that battle is demo preview and does not affect rankings

2. Rankings tab helper copy
- Add “How Ranking Works” modal/tooltip entrypoint

3. Optional label polish
- `Rankings` -> keep
- `Wojaks` / `Players` subtabs are already good and match your mental model

---

## 11. Data Model and Migration Plan

## 11.1 No schema migration required for Phase 1 (recommended)

This spec can be implemented using existing tables:
- `wojak_scores`
- `did_holdings`
- `game_players`
- `did_profiles`
- `phase2_mints`

### Why avoid migration now
- Faster to ship
- Lower risk
- Easy to validate with current data
- Keeps focus on UX clarity and correct ranking semantics

## 11.2 Optional future optimization (not part of this spec)

If leaderboard queries become heavy:
- add a materialized/cached table for `fight_club_vote_scores`
- update via cron or event-driven increments

Not needed for this first pass.

---

## 12. Feature Flag / Mode Switch (Recommended)

To make rollout safe, add a simple config flag used by frontend UI:

- `VITE_FIGHT_CLUB_RANKINGS_MODE=voting_only`

Behavior under `voting_only`:
- Rankings UI uses voting-only endpoint
- Battle score columns hidden
- Vote screen uses voting-only Player Score endpoint
- Battle tab shows demo-only messaging

This makes it easy to reintroduce battle scoring later without rewriting the whole page.

---

## 13. Implementation Checklist (Agent Task List)

## Phase A — Backend (must complete first)

1. Create `functions/api/fight-club/vote-leaderboard.ts`
- support `type=wojaks|players`
- implement provisional threshold logic (`>=5` votes)
- implement Player Score = sum top 10 eligible Wojak scores in DID
- return clean voting-only response fields

2. Create `functions/api/fight-club/my-score.ts`
- compute same Player Score logic for current DID
- return rank + tier + counts + metadata

3. Add tests for scoring correctness (see test section)

## Phase B — Frontend Rankings (Wojaks + Players)

4. Update `src/components/combat/FightClubRankings.tsx`
- switch to new endpoint
- rename labels to `Vote Score` / `Player Score`
- remove battle columns/sorts from voting-only view
- add provisional UI
- add ranking explainer modal/tooltip

## Phase C — Vote screen consistency

5. Update `src/components/game/VotingStatsPanel.tsx`
- use `my-score` endpoint
- show Player Score + new tier thresholds
- remove dependence on `game_players.power_level` for Fight Club display

6. Update `src/components/game/MobileStatsBar.tsx`
- show Player Score and Rank/Eligible Wojaks
- stop showing misleading votes-left number if unlimited

## Phase D — Copy and demo messaging

7. Update `src/pages/FightClub.tsx` and/or battle teaser components
- explicit demo-only battle copy
- rankings unaffected by battle

## Phase E — QA and cleanup

8. Manual QA pass (desktop + mobile)
9. Verify screenshot consistency issues are resolved
10. Keep old `/api/combat/power-leaderboard` untouched for future battle work (unless unused and safely isolated)

---

## 14. Test Plan (Required)

## 14.1 Backend unit/integration tests

### Wojaks leaderboard scoring
- `likes=3`, `dislikes=0` => `voteScore=3`, `totalVotes=3`, `isProvisional=true`
- `likes=5`, `dislikes=1` => `voteScore=4`, `totalVotes=6`, `isProvisional=false`
- sort order uses ranked first, provisional later

### Players leaderboard scoring
- DID with 12 eligible Wojaks only sums top 10 scores
- DID with fewer than 10 eligible Wojaks sums all eligible scores
- DID with only provisional Wojaks returns unranked / zero score behavior
- tie-breakers deterministic

### Consistency test (critical)
For a given DID, ensure:
- `/api/fight-club/my-score` `playerScore`
- equals the score implied by `/api/fight-club/vote-leaderboard?type=players`

## 14.2 Frontend tests (or manual if no test coverage)

### Rankings UI
- Wojaks tab shows `Vote Score`, not `Power`
- no `Battle: 0` displayed
- provisional badge appears correctly
- sort chip list excludes battle sorting in voting-only mode

### Vote screen
- “Your Game” score matches Players leaderboard score
- tier label changes with new thresholds
- mobile bar no longer shows misleading `votes left` if unlimited

---

## 15. Manual QA Script (Use This Exact Checklist)

1. Open `/fight-club/vote`
- Confirm “Your Game” shows `Player Score` semantics (not old power system)
- Confirm score label and tier look correct

2. Vote on a Wojak (Glaze/Fade)
- Confirm vote saves
- Confirm Wojak score updates on rankings after refresh

3. Open `/fight-club/rankings` > `Wojaks`
- Confirm rows show `Vote Score`
- Confirm no battle breakdown is shown
- Confirm provisional label for low-vote NFTs

4. Open `/fight-club/rankings` > `Players`
- Confirm Player Score feels consistent with top Wojak scores in DID
- Confirm your score matches Vote screen “Your Game” card

5. Open `Battle` tab
- Confirm it clearly says demo preview / not affecting rankings

6. Screenshot sanity check
- No row should show `Vote +3` and total `0` unless explicitly explained

---

## 16. Future Iteration Notes (Not in This Spec)

When battle becomes real:
- Introduce `Battle Score` as a separate field first
- Do **not** immediately merge into one total without an explainer
- Consider season-based scoring and weighted blends (e.g., 70% vote, 30% battle) only after users understand both systems independently

Potential future integrity improvements:
- Ranked score based on **verified holder votes only** (exclude/weight guest votes)
- Separate “Community Score” vs “Verified Score” if needed
- Anti-brigade heuristics / anomaly flags

---

## 17. Summary of Final User-Facing Rules (Ship This)

### Wojaks leaderboard
- `Glaze = +1`
- `Fade = -1`
- `Vote Score = Glazes - Fades`
- `Provisional until 5 votes`

### Players leaderboard
- A Player is a DID with a verified Farmers Plot NFT and Your Wojaks in that DID
- `Player Score = sum of top 10 eligible Wojak Vote Scores in that DID`
- Only Wojaks with at least `5` votes count

### Battle
- Battle is a demo preview for now
- Battles do not affect rankings yet

---

## 18. Files to Read Before Implementing (Required Reading Order)

### Current rankings + vote UI (frontend)
1. `/Users/abit_hex/wojak-ink/src/components/combat/FightClubRankings.tsx`
2. `/Users/abit_hex/wojak-ink/src/components/game/VotingStatsPanel.tsx`
3. `/Users/abit_hex/wojak-ink/src/components/game/MobileStatsBar.tsx`
4. `/Users/abit_hex/wojak-ink/src/pages/FightClub.tsx`
5. `/Users/abit_hex/wojak-ink/src/components/game/VotingFeed.tsx`

### Current ranking + vote logic (backend)
6. `/Users/abit_hex/wojak-ink/functions/api/combat/power-leaderboard.ts`
7. `/Users/abit_hex/wojak-ink/functions/api/game/vote.ts`
8. `/Users/abit_hex/wojak-ink/functions/api/game/feed.ts`
9. `/Users/abit_hex/wojak-ink/functions/api/game/player.ts`
10. `/Users/abit_hex/wojak-ink/functions/api/game/me.ts`
11. `/Users/abit_hex/wojak-ink/functions/api/combat/gate.ts`

### Legacy/mixed power system (for context only; do not use for voting score UI)
12. `/Users/abit_hex/wojak-ink/functions/api/game/_powerLevel.ts`
13. `/Users/abit_hex/wojak-ink/functions/api/game/power-level.ts`

### Relevant schema/migrations (context)
14. `/Users/abit_hex/wojak-ink/functions/migrations/060_combat_system.sql`
15. `/Users/abit_hex/wojak-ink/functions/migrations/065_power_scoring.sql`
16. `/Users/abit_hex/wojak-ink/functions/migrations/071_backfill_power_from_votes.sql`

---

## 19. Definition of Done

This spec is complete when all of the following are true:

- Fight Club `Vote` screen and `Players` leaderboard show the **same score model**
- Rankings are explicitly **voting-only**
- `Wojaks` rows do not show battle-derived labels/breakdowns
- Provisional threshold (`5 votes`) is implemented and visible
- Player leaderboard correctly sums **top 10 eligible Wojak scores** in DID
- Battle tab clearly states it is a demo and not part of rankings
- Users can understand the ranking rules from UI copy alone (with small helper tooltip)

