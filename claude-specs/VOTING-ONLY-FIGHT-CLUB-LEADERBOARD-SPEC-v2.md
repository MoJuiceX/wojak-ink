# SPEC v2: Fight Club Voting-Only Leaderboards (Wojaks + Players)

> **Status:** Implementation-ready (v2, hardened)
>
> **Audience:** Terminal implementation agent working in `/Users/abit_hex/wojak-ink`
>
> **Goal:** Ship a simple, trustworthy, voting-only leaderboard system for Fight Club while Battle remains demo-only.

---

## 0. Why v2 Exists (Spec Review + Improvements)

This v2 replaces/extends the earlier voting-only spec.

### Quality assessment of v1 (honest review)

**Overall rating:** `8.2 / 10`

### What was strong (senior-level quality)
- Correctly identified the core product problem: **two conflicting power systems shown to users**
- Chose a clear simplification strategy (voting-only semantics, unified score model)
- Good product framing and UX language recommendations
- Good implementation decomposition (backend first, then UI)
- Strong “files to read first” handoff for another agent

### Where v1 was weaker / not yet “high industry standard”
1. **Rollout safety was too light**
- Needed shadow mode / kill-switch guidance and backward compatibility strategy

2. **API contracts were not strict enough**
- Needed exact response shape guarantees, error codes, and null/edge-case semantics

3. **Edge cases were under-specified**
- Provisional rows rank semantics, negative scores, ties, unranked users, missing DID/profile/image data

4. **Data/query implementation details needed more rigor**
- D1 query patterns and indexing suggestions were not explicit enough for reliable execution

5. **Observability and validation were under-specified**
- Needed metrics/logging and post-deploy verification steps so you can trust the refactor in production

6. **Frontend state integration risk not called out enough**
- `GameContext.player.powerLevel` is used in multiple places; swapping score display needs careful compatibility handling

### What v2 adds
- Strict contracts and semantics
- Edge-case matrix
- Optional index migration guidance
- Rollout plan with feature flags + shadow compare
- Logging/metrics requirements
- Stronger acceptance criteria and test matrix
- Explicit implementation boundaries to reduce agent mistakes

---

## 1. Product Decision (Final for This Iteration)

## 1.1 Battle is non-scoring for now

Battle is demo-only and must **not affect any leaderboard** during this phase.

This means:
- No `battle_power` in Fight Club rankings UI
- No battle W/L/D used in default ranking order
- No battle-derived score shown in Vote screen “Your Game”

## 1.2 Two leaderboard tabs remain (correct model)

### `Wojaks` leaderboard
Ranks **individual Your Wojak NFTs** by voting performance.

### `Players` leaderboard
Ranks **DIDs** (players) by the combined score of the Your Wojaks held in that DID.

### Player eligibility (must be true)
A Player (DID) appears in the Players leaderboard only if:
- DID exists in `game_players`
- `phase1_verified = 1` (Farmers Plot verified)
- DID has at least one Phase 2 / Your Wojak in `did_holdings`

This matches your stated game design.

---

## 2. Canonical Vocabulary (Use This Everywhere)

**This section is mandatory.** All UI/API naming should align to avoid user confusion.

### User-facing terms
- `Glaze` = upvote (+1)
- `Fade` = downvote (-1)
- `Vote Score` = `Glazes - Fades` (Wojak-level)
- `Player Score` = DID score from top Wojaks (Player-level)
- `Provisional` = Wojak has too few votes to count toward Player Score

### Internal terms (backend)
- `wojak_vote_score` = `wojak_scores.net_score`
- `player_score` = computed sum of top N eligible Wojak vote scores in DID
- `provisional_min_votes` = `5`
- `player_top_n` = `10`

### Terms to avoid in this phase
- `Power` (ambiguous)
- `Battle Power`
- `Combat Power` (in Fight Club ranking UI)

---

## 3. Scoring Rules (Voting-Only, Final)

## 3.1 Wojak Vote Score (simple and transparent)

### Rule
- `Glaze = +1`
- `Fade = -1`

### Formula
- `Vote Score = likes - dislikes`
- Source of truth: `wojak_scores.net_score`

### Rationale
Do **not** multiply votes or add hidden weights in the voting-only phase. Trust and clarity are more important than sophistication right now.

## 3.2 Provisional threshold (required)

A Wojak is **Provisional** until:
- `total_votes >= 5`

Before reaching 5 votes:
- It can appear in the Wojaks leaderboard
- It does **not** count toward Player Score
- It must be visibly labeled `Provisional`

## 3.3 Player Score (DID leaderboard)

### Formula (final)
`Player Score = sum of top 10 eligible Wojak Vote Scores in the DID`

Where:
- “eligible Wojaks” are `total_votes >= 5`
- sort by `Vote Score DESC`, tie-break by `total_votes DESC`, then `edition ASC`

### Edge semantics
- Fewer than 10 eligible Wojaks: sum all eligible Wojaks
- No eligible Wojaks: `player_score = 0` and user is **unranked** (recommended behavior)
- Negative eligible scores are allowed; they count if in top 10

### Why this is correct for now
- Easy to explain to users
- Anti-whale (quality over quantity)
- Stable enough for a public leaderboard without battle system active

---

## 4. UX Rules (Clarity and Trust)

## 4.1 Rankings page labels

### Wojaks tab
Use:
- `Vote Score` (main number)
- `Glazes` and `Fades`
- `Provisional` badge if needed

Do not show:
- `Battle Power`
- `Battle: 0`
- `W/L/D` in default voting-only layout

### Players tab
Use:
- `Player Score`
- `Eligible Wojaks`
- `Total Wojaks` (optional)

## 4.2 Vote screen “Your Game” panel

Must show **Player Score**, not the old mixed `game_players.power_level` formula.

Recommended layout:
- `Your Game`
- big number: `Player Score`
- tier label (voting-only thresholds)
- helper text: `Top 10 eligible Wojaks in your DID`

## 4.3 Mobile stats bar

Current `votes left` is misleading because frontend currently treats voting as unlimited.

### Replace mobile bar segments with:
- Segment A: `Player Score`
- Segment B: `Rank` (preferred) or `Eligible Wojaks`

## 4.4 Battle messaging

Battle tab and any teaser must explicitly state:
- `Battle is a demo preview`
- `Battles do not affect rankings yet`

---

## 5. Voting-Only Tier Thresholds (for Player Score)

Use these thresholds for `VotingStatsPanel` and any Player Score badge:

- `Casual`: `0–9`
- `Active`: `10–24`
- `Serious`: `25–59`
- `Strong`: `60–119`
- `Elite`: `120–249`
- `Legend`: `250+`

### Notes
- These are tuned for voting-only top-10 sum scoring
- They should be reviewed after real usage data accumulates (see telemetry section)

---

## 6. Architecture Decision (for This Refactor)

## 6.1 Do not repurpose combat leaderboard endpoint for voting UI

### Decision
Create new voting-only endpoints under `/api/fight-club/*` and switch Fight Club UI to them.

### Why
- Avoids mixed semantics (`combat_fighters.power_score` vs `wojak_scores.net_score`)
- Keeps future battle work isolated
- Makes code easier to reason about and test
- Reduces risk of UI showing inconsistent fields like in current screenshots

## 6.2 Legacy endpoints remain intact

Do not remove or rewrite these in this spec:
- `/api/combat/power-leaderboard`
- `/api/game/power-level`

They may still be used by other surfaces or future battle rollout.

---

## 7. Backend API Contracts (Strict)

## 7.1 `GET /api/fight-club/vote-leaderboard`

### File to add
- `/Users/abit_hex/wojak-ink/functions/api/fight-club/vote-leaderboard.ts`

### Query params
- `type`: `wojaks | players` (default `players` allowed)
- `limit`: integer, default `50`, min `1`, max `100`
- `offset`: integer, default `0`, min `0`
- `sort` (wojaks only): `score | glazed | ratio | newest` (default `score`)

### Response rules (all responses)
- Always return JSON
- Include `meta.mode = "voting_only"`
- Include `meta.provisionalMinVotes = 5`
- Include `meta.playerTopN = 10` for players responses

### Error responses (required)
Use consistent shape:

```json
{ "error": "Invalid sort", "code": "INVALID_SORT" }
```

Recommended error codes:
- `INVALID_TYPE`
- `INVALID_SORT`
- `INVALID_LIMIT`
- `INTERNAL_ERROR`

### 7.1A Wojaks response contract

```ts
interface VoteLeaderboardWojakRow {
  rank: number | null;                // null if provisional rows are not officially ranked
  nftId: string;
  edition: number;
  imageUrl: string;
  ownerDid: string | null;
  ownerName: string | null;
  likes: number;
  dislikes: number;
  totalVotes: number;
  voteScore: number;                  // net score
  likeRatio: number | null;           // null if totalVotes = 0
  isProvisional: boolean;
  provisionalVotesNeeded: number;     // max(0, 5 - totalVotes)
  countsTowardPlayer: boolean;        // totalVotes >= 5
}

interface VoteLeaderboardWojaksResponse {
  wojaks: VoteLeaderboardWojakRow[];
  total: number;
  sort: 'score' | 'glazed' | 'ratio' | 'newest';
  meta: {
    mode: 'voting_only';
    provisionalMinVotes: 5;
  };
}
```

### 7.1B Players response contract

```ts
interface VoteLeaderboardPlayerRow {
  rank: number;
  did: string;
  displayName: string;
  playerScore: number;
  eligibleWojakCount: number;
  totalWojakCount: number;
  bestWojakScore: number | null;
  bestWojakImage: string | null;
}

interface VoteLeaderboardPlayersResponse {
  players: VoteLeaderboardPlayerRow[];
  yourRank: number | null;
  meta: {
    mode: 'voting_only';
    provisionalMinVotes: 5;
    playerTopN: 10;
  };
}
```

## 7.2 `GET /api/fight-club/my-score`

### File to add
- `/Users/abit_hex/wojak-ink/functions/api/fight-club/my-score.ts`

### Purpose
This endpoint is the canonical source for the Vote screen “Your Game” card and mobile stats bar during voting-only mode.

### Identity resolution (required)
Support in this order:
1. Clerk-auth linked DID (if available)
2. `did` query param
3. return unregistered response

### Response contract

```ts
interface MyFightClubScoreResponse {
  success: true;
  registered: boolean;
  did: string | null;
  ranked: boolean;
  rank: number | null;
  playerScore: number;
  tier: 'Casual' | 'Active' | 'Serious' | 'Strong' | 'Elite' | 'Legend';
  eligibleWojakCount: number;
  totalWojakCount: number;
  bestWojakScore: number | null;
  pointsToNextRank: number | null;
  nextRank: number | null;
  meta: {
    mode: 'voting_only';
    provisionalMinVotes: 5;
    playerTopN: 10;
  };
}
```

### Unregistered / no DID behavior (required)
Return `200` with `registered: false`, not `404`, so UI can render a friendly state.

---

## 8. Backend Query Design (D1-Safe, Explicit)

## 8.1 Data sources (authoritative)

### Wojak leaderboard source of truth
- `wojak_scores` for voting metrics (`likes`, `dislikes`, `net_score`, `total_votes`)

### Player leaderboard source of truth
- `game_players` for DID eligibility (`phase1_verified`)
- `did_holdings` for which Your Wojaks are in a DID
- `wojak_scores` for Wojak Vote Scores
- `did_profiles` for display names
- `phase2_mints` for image (best Wojak image)

## 8.2 Important schema caution (agent must verify)

There appear to be mixed usages of `did_holdings.collection` vs `did_holdings.collection_id` in existing code.

**Before implementing queries**, inspect the actual schema used in your local DB/migrations and confirm the correct column(s) for identifying Phase 2 holdings.

Do not assume one field name. Build queries against the real schema.

## 8.3 Wojaks leaderboard query requirements

### Must handle all cases
- Wojaks with `wojak_scores` rows but missing `phase2_mints` image metadata
- Wojaks with `phase2_mints` rows but no votes yet
- missing DID owner / display name

### Rank semantics (recommended)
- Official rank applies only to non-provisional rows
- Provisional rows returned after ranked rows with `rank = null`

### Sort semantics
#### `score` (default)
1. `is_provisional ASC`
2. `vote_score DESC`
3. `total_votes DESC`
4. `edition ASC`

#### `glazed`
1. `is_provisional ASC`
2. `likes DESC`
3. `vote_score DESC`
4. `edition ASC`

#### `ratio`
1. ranked rows first (`total_votes >= 5`)
2. `like_ratio DESC`
3. `likes DESC`
4. `edition ASC`

#### `newest`
- `edition DESC`

## 8.4 Players leaderboard query requirements

### Required algorithm (exact)
For each eligible DID:
1. collect Phase 2 Wojaks held in DID
2. join `wojak_scores`
3. compute `vote_score`, `total_votes`
4. filter eligible rows: `total_votes >= 5`
5. rank Wojaks per DID by score (`ROW_NUMBER()`)
6. sum `vote_score` where `row_number <= 10`

### Required tie-breakers (players)
1. `player_score DESC`
2. `eligible_wojak_count DESC`
3. `best_wojak_score DESC`
4. `did ASC`

### Unranked policy (recommended)
- Exclude players with `player_score <= 0` OR `eligible_wojak_count = 0` from leaderboard list
- `my-score` endpoint still returns their data with `ranked = false`

This avoids clutter and makes the leaderboard feel meaningful.

---

## 9. Optional DB Index Migration (Performance Hardening)

### Why optional
With ~4,200 NFTs, this may be okay without new indexes initially. But adding a couple of indexes will reduce D1 query cost and improve leaderboard responsiveness.

### Recommended migration (optional but preferred)
Create a new migration (next number) with indexes such as:
- `wojak_scores(total_votes, net_score)`
- `wojak_scores(nft_id)` (if not already indexed)
- `did_holdings(did_id, nft_id)`
- `did_holdings(did_id, collection_id)` or equivalent actual schema column
- `game_players(phase1_verified, did_id)`

**Important:** inspect existing indexes first to avoid duplicates.

---

## 10. Frontend Integration Plan (Low-Risk)

## 10.1 Do not break existing `GameContext.player.powerLevel`

The app may still use `player.powerLevel` elsewhere.

### Required approach
For Fight Club voting UI, introduce a separate data path/state for voting-only score:
- e.g. `fightClubScore` or local query in `VotingStatsPanel` / `MobileStatsBar`

Do not globally rename or repurpose `player.powerLevel` in `GameContext` during this spec.

## 10.2 `FightClubRankings.tsx` changes (required)

### Switch endpoint
Replace calls to `/api/combat/power-leaderboard` with `/api/fight-club/vote-leaderboard`.

### UI field rename mapping
- `powerScore` -> `voteScore`
- `totalPower` -> `playerScore`
- remove `battlePower` references in voting-only mode

### Add provisional rendering
If `isProvisional`:
- show `Provisional`
- show `Needs X more votes`
- rank badge should not imply official rank if `rank = null`

### Simplify sorting chips
Keep only:
- `Score`
- `Most Glazed`
- `Ratio`
- `Newest`

Remove for voting-only mode:
- `Battle Record`
- `Hot` (unless a clear formula is implemented and explained)

## 10.3 `VotingStatsPanel.tsx` changes (required)

### Replace displayed source
Stop using the mixed `game_players.power_level` for Fight Club score display.

### Use `/api/fight-club/my-score`
Display:
- `Player Score`
- tier (voting-only thresholds)
- `Rank` if ranked, otherwise `Unranked`
- optional helper line: `Top 10 eligible Wojaks`

## 10.4 `MobileStatsBar.tsx` changes (required)

Replace current `votes left` segment (misleading under unlimited voting) with one of:
- `Rank` (recommended)
- `Eligible Wojaks`

## 10.5 `FightClub.tsx` / battle teaser copy

Add explicit copy:
- `Battle is a demo preview`
- `Battles do not affect rankings yet`

---

## 11. Feature Flags, Rollout, and Kill Switch (High-Importance)

## 11.1 Frontend mode flag (required)

Add/use:
- `VITE_FIGHT_CLUB_RANKINGS_MODE=voting_only`

Behavior:
- When `voting_only`: use new voting endpoints and voting-only labels
- Fallback path (temporary): old UI/endpoint behavior remains available if needed

## 11.2 Backend safe rollout strategy (recommended)

### Stage 1: Ship endpoints only
- Add `/api/fight-club/vote-leaderboard`
- Add `/api/fight-club/my-score`
- Validate with manual curl/browser hits

### Stage 2: Shadow compare (optional but ideal)
- Temporarily log diff between:
  - old Players leaderboard totals (combat endpoint)
  - new voting-only player score output
- This is for operator understanding only; scores are expected to differ

### Stage 3: Switch frontend under feature flag
- Enable `voting_only` mode in local/staging first
- Validate UI consistency

### Stage 4: Production enable
- Monitor logs and page errors
- Keep old endpoint untouched for rollback

## 11.3 Kill switch (required)

If issues appear in production:
- revert frontend flag to old mode
- leave new endpoints deployed (safe)

This minimizes downtime and rollback risk.

---

## 12. Observability / Logging (Required for Trust)

## 12.1 Backend logs (minimum)

Add structured logs for new endpoints (safe, lightweight):
- endpoint name
- type/sort/limit/offset
- response counts
- timing (ms)
- error code on failures

Examples:
- `[fight-club.vote-leaderboard] type=players limit=50 offset=0 count=32 ms=18`
- `[fight-club.my-score] did=did:chia:... ranked=true score=42 rank=7 ms=12`

## 12.2 Post-launch telemetry (manual is fine)

Track daily for first week:
- top players score distribution (min/median/p95/max)
- count of provisional Wojaks vs ranked Wojaks
- number of Players with zero eligible Wojaks
- frontend error rate on rankings page

This informs future tier threshold tuning.

---

## 13. Implementation Agent Checklist (Exact Order)

## Phase A — Backend contracts + correctness

1. Read required files (see Section 18)
2. Inspect actual `did_holdings` schema columns in local DB/migrations
3. Implement `functions/api/fight-club/vote-leaderboard.ts`
4. Implement `functions/api/fight-club/my-score.ts`
5. Add tests for scoring + rank semantics
6. Manually test endpoint responses with representative cases

## Phase B — Frontend rankings clarity

7. Update `src/components/combat/FightClubRankings.tsx`
8. Add `How Ranking Works` helper/tooltip/modal
9. Remove battle-related ranking UI in voting-only mode
10. Implement provisional badges and messages

## Phase C — Vote screen score consistency

11. Update `src/components/game/VotingStatsPanel.tsx`
12. Update `src/components/game/MobileStatsBar.tsx`
13. Ensure both use `/api/fight-club/my-score` or shared query hook

## Phase D — Messaging and rollout safety

14. Add battle demo copy in Fight Club/Battle teaser
15. Add/use `VITE_FIGHT_CLUB_RANKINGS_MODE=voting_only`
16. Verify rollback path (flag off) still works

---

## 14. Edge-Case Matrix (Must Handle)

## 14.1 Wojaks rows

1. **No votes yet**
- `likes=0`, `dislikes=0`, `totalVotes=0`, `voteScore=0`
- `isProvisional=true`, `rank=null`

2. **Only dislikes**
- negative vote score must display correctly (e.g. `-3`)

3. **Missing image metadata**
- use fallback thumbnail URL if possible; never crash UI

4. **No owner DID/name**
- `ownerName = null` -> display `Anon`

## 14.2 Players rows

5. **Verified DID with no eligible Wojaks**
- excluded from leaderboard list (recommended)
- `my-score` returns `registered=true`, `ranked=false`, `playerScore=0`

6. **Tie scores**
- deterministic ordering using tie-breakers; no flickering order between requests

7. **Negative total score**
- if negative scores allowed in top-10 sum, treat as `ranked=false` if policy excludes `player_score <= 0`
- UI should not show weird negative tier labels without explanation

## 14.3 Identity resolution (`my-score`)

8. **No Clerk + no did param**
- return `registered=false`, not error

9. **Clerk user signed in but no linked DID**
- return `registered=false` with friendly UI path

---

## 15. Testing Requirements (Expanded)

## 15.1 Backend tests (required)

### Vote leaderboard (Wojaks)
- provisional threshold exactly at 5 votes
- `rank=null` for provisional rows (if implemented that way)
- each sort mode returns deterministic order
- ratio sort handles `0` votes safely (`likeRatio = null`)

### Vote leaderboard (Players)
- top 10 sum logic correct
- provisional Wojaks excluded from player score
- tie-breakers stable
- `yourRank` correct when caller is ranked and when unranked

### My score endpoint
- returns same `playerScore` as Players leaderboard calculation
- returns correct tier by threshold
- unregistered user response shape correct

## 15.2 Frontend/manual tests (required)

### Consistency tests
- Vote screen `Your Game` Player Score == Players leaderboard value for same DID
- Wojaks row no longer shows `Vote +X` with displayed total `0` unless total is explicitly vote score `0`

### UI clarity tests
- No battle columns visible in voting-only mode
- Provisional badge visible and understandable
- Tooltip copy matches actual logic

---

## 16. Manual QA Script (Operator Checklist)

1. Open `/fight-club/vote`
- Confirm score label is `Player Score`
- Confirm battle is not referenced in the score panel

2. Open `/fight-club/rankings` -> `Wojaks`
- Confirm main metric is `Vote Score`
- Confirm no battle breakdown columns
- Confirm provisional rows are labeled and don’t look officially ranked

3. Open `/fight-club/rankings` -> `Players`
- Confirm `Player Score` label
- Confirm your score matches Vote screen

4. Vote on a Wojak below threshold
- Confirm row remains provisional until 5 votes
- Confirm it does not affect Player Score before threshold

5. Cross threshold to 5 votes
- Confirm row becomes eligible
- Confirm Player Score updates accordingly after refresh

6. Open Battle tab
- Confirm demo-only messaging says battles do not affect rankings

---

## 17. Explicit Non-Goals / Future Work (Do Not Sneak Into This PR)

- Weighted verified-voter scoring
- Battle score blending into rankings
- ELO integration in Fight Club rankings
- Burn bonuses in rankings
- Season resets / seasonal ladders
- Anti-brigade heuristics / anomaly detection

These are valid future iterations, but adding them now will reintroduce complexity and user confusion.

---

## 18. Required Reading Order (Implementation Agent)

### Frontend (current Fight Club UX)
1. `/Users/abit_hex/wojak-ink/src/components/combat/FightClubRankings.tsx`
2. `/Users/abit_hex/wojak-ink/src/components/game/VotingStatsPanel.tsx`
3. `/Users/abit_hex/wojak-ink/src/components/game/MobileStatsBar.tsx`
4. `/Users/abit_hex/wojak-ink/src/pages/FightClub.tsx`
5. `/Users/abit_hex/wojak-ink/src/components/game/VotingFeed.tsx`

### Backend (current vote + ranking logic)
6. `/Users/abit_hex/wojak-ink/functions/api/combat/power-leaderboard.ts`
7. `/Users/abit_hex/wojak-ink/functions/api/game/vote.ts`
8. `/Users/abit_hex/wojak-ink/functions/api/game/feed.ts`
9. `/Users/abit_hex/wojak-ink/functions/api/game/me.ts`
10. `/Users/abit_hex/wojak-ink/functions/api/game/player.ts`
11. `/Users/abit_hex/wojak-ink/functions/api/combat/gate.ts`

### Context only (legacy/mixed score system; do not use for voting-only UI score)
12. `/Users/abit_hex/wojak-ink/functions/api/game/_powerLevel.ts`
13. `/Users/abit_hex/wojak-ink/functions/api/game/power-level.ts`

### Schema / migrations
14. `/Users/abit_hex/wojak-ink/functions/migrations/060_combat_system.sql`
15. `/Users/abit_hex/wojak-ink/functions/migrations/065_power_scoring.sql`
16. `/Users/abit_hex/wojak-ink/functions/migrations/071_backfill_power_from_votes.sql`
17. Inspect actual indexes and `did_holdings` schema fields before writing queries

---

## 19. Definition of Done (Strict)

This spec is done when all are true:

1. `Vote` screen and `Players` leaderboard use the **same Player Score model**
2. `Wojaks` leaderboard is clearly **voting-only** (Vote Score, Glazes/Fades, Provisional)
3. No battle-derived scoring UI is shown in ranking surfaces while voting-only mode is active
4. Provisional threshold (`5` votes) is implemented and visibly explained
5. Players leaderboard correctly computes `sum(top 10 eligible Wojak Vote Scores in DID)`
6. Battle tab explicitly states demo-only / no ranking impact
7. Feature flag or rollback path exists to revert UI behavior safely
8. Backend and frontend tests/manual QA checks pass

---

## 20. Copy/Paste Summary for Stakeholders (Optional)

- **Wojaks leaderboard** ranks individual Your Wojaks by community voting (`Glaze +1`, `Fade -1`).
- **Players leaderboard** ranks DIDs by the sum of their top 10 Wojak Vote Scores.
- Wojaks need **5 votes** before they count toward Player rankings.
- **Battle is demo-only** and does not affect rankings yet.

