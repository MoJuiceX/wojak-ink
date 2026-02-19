# Games Page — Absorb Arcade Leaderboard

**Context:** The standalone `/leaderboard` page is being killed. Arcade game scores move into the Games page.

---

## Task 1: Add Scores Section to GamesHub

**File:** `src/pages/GamesHub.tsx`

The Games page already has a `LeaderboardPanel` sidebar on desktop showing top #1 per game. We need to add a way to see FULL arcade leaderboards within the Games page.

Options (pick the simpler one to implement):

**Option A: Tab in GamesHub**
Add a "Scores" tab alongside the games grid. When clicked, shows the full leaderboard component (reuse `src/components/Leaderboard/Leaderboard.tsx`) filtered to arcade games only (exclude combat/swipe).

**Option B: Inline expand**
Each game card in the grid has a "View Scores" button that expands to show that game's leaderboard inline.

Recommendation: **Option A** — it's simpler and reuses existing components.

Implementation:
- Add a tab bar or toggle at the top of GamesHub: "Play" | "Scores"
- "Play" shows the current games grid (default)
- "Scores" renders the existing Leaderboard component but with `showGameSelector` and ONLY arcade game IDs (no combat)
- Filter out `combat` from the game list in the leaderboard selector

---

## Task 2: Remove Standalone Leaderboard Route

**File:** `src/App.tsx`

- Remove the `/leaderboard` route that renders the standalone Leaderboard page
- Add redirect: `/leaderboard` → `/fight-club/rankings`
- The arcade leaderboard is now only accessible through Games > Scores tab

---

## Task 3: Update Leaderboard Component — Exclude Combat

**File:** `src/components/Leaderboard/Leaderboard.tsx`

Add a prop: `excludeGames?: string[]`

When rendered inside GamesHub, pass `excludeGames={['combat']}` to filter out the combat game from the game selector. Combat rankings now live in Fight Club > Rankings.

When rendered inside Fight Club Rankings, it only shows combat. Two separate worlds.

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main`
- Keep the LeaderboardPanel sidebar on desktop GamesHub (it already works well)
- Mobile: the Scores tab should be full-width leaderboard
