# REVIEW CHECKLIST: Voting-Only Fight Club Leaderboards (Spec v2 Compliance)

> Use this checklist **after** the implementation agent finishes the Fight Club voting-only leaderboard work.
>
> Spec to validate against:
> `/Users/abit_hex/wojak-ink/claude-specs/VOTING-ONLY-FIGHT-CLUB-LEADERBOARD-SPEC-v2.md`

---

## 1. Intake (What to request from the implementation agent)

Before review, collect:

- Changed file list
- Summary of changes
- Test results (passed / failed / not run)
- Any schema assumptions discovered (especially `did_holdings` columns)
- Any feature flags added (env vars / runtime toggles)

If they do not provide this, ask for it before reviewing.

---

## 2. Scope Guard (Did they stay in bounds?)

## Must be true
- Work is focused on Fight Club voting/rankings clarity
- Battle is still demo-only
- No unrelated changes in mint/chat/economy unless explicitly required
- Legacy endpoints remain intact:
  - `/api/combat/power-leaderboard`
  - `/api/game/power-level`

## Red flags
- They removed or repurposed combat endpoints used elsewhere
- They rewired `GameContext.player.powerLevel` globally
- They mixed battle scoring into the new voting-only rankings

---

## 3. Backend: New Voting-Only Endpoints

## 3.1 `functions/api/fight-club/vote-leaderboard.ts`

### Exists and reachable
- [ ] File exists
- [ ] Endpoint returns JSON for `type=wojaks`
- [ ] Endpoint returns JSON for `type=players`

### Contract shape (Wojaks)
- [ ] Returns `wojaks` array
- [ ] Returns `total`
- [ ] Returns `sort`
- [ ] Returns `meta.mode = "voting_only"`
- [ ] Returns `meta.provisionalMinVotes = 5`

### Contract shape (Players)
- [ ] Returns `players` array
- [ ] Returns `yourRank` (nullable)
- [ ] Returns `meta.mode = "voting_only"`
- [ ] Returns `meta.provisionalMinVotes = 5`
- [ ] Returns `meta.playerTopN = 10`

### Logic checks (Wojaks)
- [ ] `Vote Score = likes - dislikes`
- [ ] Provisional threshold implemented (`total_votes < 5`)
- [ ] Provisional rows clearly marked in response (`isProvisional`, etc.)
- [ ] Default sort matches voting-only semantics (not battle)
- [ ] No dependence on `battle_power` for ranking order

### Logic checks (Players)
- [ ] Eligibility requires verified Farmers Plot player (`phase1_verified = 1`)
- [ ] Score is sum of **top 10 eligible Wojak Vote Scores in DID**
- [ ] Only Wojaks with `total_votes >= 5` count toward Player Score
- [ ] Tie-breakers are deterministic
- [ ] `yourRank` matches the same scoring logic

## 3.2 `functions/api/fight-club/my-score.ts`

### Exists and reachable
- [ ] File exists
- [ ] Endpoint returns JSON for a valid DID / auth-linked player
- [ ] Handles unregistered/no-DID case gracefully (no crash, no confusing 500)

### Contract / semantics
- [ ] Returns `playerScore`
- [ ] Returns `rank` and `ranked` semantics (or equivalent clear fields)
- [ ] Returns tier using voting-only thresholds
- [ ] Returns counts (`eligibleWojakCount`, `totalWojakCount`)
- [ ] Returns metadata (`mode`, `provisionalMinVotes`, `playerTopN`)

### Consistency check (critical)
- [ ] `my-score.playerScore` equals the score implied by Players leaderboard for same DID

---

## 4. Frontend: Rankings UI (`FightClubRankings.tsx`)

## Data source
- [ ] Uses new voting-only endpoint (`/api/fight-club/vote-leaderboard`)
- [ ] No longer depends on `/api/combat/power-leaderboard` for Fight Club rankings UI in voting-only mode

## Labels and clarity
- [ ] `Wojaks` tab uses `Vote Score` terminology (not ambiguous `Power`)
- [ ] `Players` tab uses `Player Score`
- [ ] No `Battle Power` label shown in ranking rows/cards
- [ ] No `Battle: 0` breakdown shown in Wojaks rankings

## Provisional UX
- [ ] Provisional Wojaks are visibly labeled
- [ ] Shows “Needs X more votes” (or equivalent clear messaging)
- [ ] Provisional rows do not look like official ranked winners

## Sorting (voting-only)
- [ ] Sorting options are voting-only (Score / Glazed / Ratio / Newest)
- [ ] Battle sort is hidden/removed in voting-only mode

## Explainer
- [ ] Rankings UI includes “How Ranking Works” helper (tooltip/modal/inline info)
- [ ] Explainer matches actual implemented logic:
  - Glaze/Fade ±1
  - 5-vote provisional threshold
  - top 10 eligible Wojak scores for Player Score

---

## 5. Frontend: Vote Screen Score Consistency

## 5.1 `VotingStatsPanel.tsx`
- [ ] No longer displays mixed `game_players.power_level` as the Fight Club score
- [ ] Uses new `my-score` endpoint (or equivalent voting-only source)
- [ ] Displays `Player Score`
- [ ] Uses voting-only tier thresholds (not old 1000/3000/5000/etc. thresholds)
- [ ] Helper text clarifies what the score means (top 10 eligible Wojaks)

## 5.2 `MobileStatsBar.tsx`
- [ ] Does not show misleading `votes left` if voting is effectively unlimited
- [ ] Shows `Player Score` plus `Rank` or `Eligible Wojaks`
- [ ] Labels are clear and consistent with desktop

## 5.3 Consistency (critical)
- [ ] Vote screen score matches Players leaderboard score for same DID
- [ ] No visible contradictory numbers like old screenshots (`Rankings 9` vs `Vote panel 2`) for same score concept

---

## 6. Battle Messaging (Demo-Only)

- [ ] Battle tab or teaser explicitly says battle is a demo preview
- [ ] Messaging clearly says battles do **not** affect rankings yet
- [ ] No hidden battle references remain in ranking surfaces

---

## 7. Schema / Query Safety Review

## `did_holdings` schema assumption check (important)
- [ ] Agent confirmed actual column(s) used for Phase 2 filtering (`collection`, `collection_id`, or both)
- [ ] Queries match real schema in this repo / DB
- [ ] No silent empty leaderboards caused by wrong column name

## Query correctness / performance sanity
- [ ] Player score query uses deterministic ordering for top-10 selection
- [ ] No obvious N+1 loops in endpoint code for leaderboard rows (or justified if small)
- [ ] Optional indexes added safely (if agent chose to add them)

---

## 8. Tests and Verification

## Automated tests
- [ ] Tests added/updated for vote leaderboard scoring
- [ ] Tests cover provisional threshold
- [ ] Tests cover top-10 Player Score aggregation
- [ ] Tests cover `my-score` consistency with Players leaderboard

## If tests were not added
- [ ] Agent explicitly explains why
- [ ] Manual verification evidence provided instead

---

## 9. Manual QA (UI + Behavior)

Run these checks in browser (local):

### Vote screen
- [ ] “Your Game” shows `Player Score` semantics
- [ ] Score/tier feel plausible
- [ ] No battle references in score panel

### Rankings > Wojaks
- [ ] Main metric is Vote Score
- [ ] Provisional rows are clearly marked
- [ ] No battle breakdown shown
- [ ] Sort options are voting-only

### Rankings > Players
- [ ] Player Score label shown
- [ ] Ranking order appears plausible vs known Wojak vote scores
- [ ] Your rank/score aligns with Vote screen

### Battle tab
- [ ] Demo-only message visible
- [ ] No claim that battle affects rankings

---

## 10. Rollout Safety / Cloudflare Deploy Readiness

## Feature flag / mode switch
- [ ] Voting-only mode can be enabled/disabled safely (if flag implemented)
- [ ] Rollback path is known (what to revert if UI breaks)

## Deploy readiness
- [ ] No hard dependency on battle endpoints for rankings page
- [ ] New endpoints return stable JSON shapes even on empty datasets
- [ ] Error handling returns friendly UI states (not blank screens)

## Rollback triggers (use these)
Rollback or hotfix before public rollout if any are true:
- [ ] Vote screen score and Players leaderboard do not match
- [ ] Provisional rows count toward Player Score before 5 votes
- [ ] Rankings UI still shows battle score labels/breakdowns
- [ ] Players leaderboard returns obviously wrong/empty results due to schema mismatch
- [ ] Frontend crashes on missing owner/image/profile fields

---

## 11. Post-Deploy Sanity Checks (First 24 Hours)

- [ ] Top 10 Wojaks leaderboard looks plausible (no zeros with positive vote scores unless explicitly provisional and displayed as such)
- [ ] Top Players leaderboard aligns with visible top Wojaks in known DIDs
- [ ] No spike in frontend errors on Fight Club pages
- [ ] User feedback confusion about “Power” terminology decreases (qualitative)

---

## 12. Review Outcome Template (Use This)

When reviewing the implementation, summarize using this format:

### Result
- `PASS` / `PASS WITH FIXES` / `BLOCK`

### What matches spec
- ...

### Deviations from spec (acceptable / unacceptable)
- ...

### Bugs or risks found
- ...

### Required fixes before deploy
- ...

### Optional improvements (later)
- ...

