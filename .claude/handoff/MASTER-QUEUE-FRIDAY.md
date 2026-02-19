# Master Execution Queue — Friday Launch

Execute these specs IN ORDER. Each spec is a complete document with tasks. Build and push after each task within each spec.

## Execution Order

### 1. FIGHT-CLUB-IMPLEMENTATION.md (if not already done)
Nav restructure, Fight Club page, Power scoring backend, credit updates, access gate, polish.
**Check:** Does `/fight-club` route exist? Are the 3 tabs working? If yes, skip to #2.

### 2. ONBOARDING-FLOW-SPEC.md
Gate screen for no Farmers Plot, banner for no Wojaks, wallet connect state, internal link updates.

### 3. DID-NAMES-SPEC.md
Display names table, random name generator, name API, Settings page editor, use names everywhere.

### 4. CREDIT-SYSTEM-UPDATE-SPEC.md
Base price 0.1 XCH, credits per XCH doubled, burn rewards increased, minter check, participation credits.

### 5. GAMES-LEADERBOARD-SPEC.md
Scores tab in GamesHub, remove standalone leaderboard route, filter combat from arcade leaderboard.

### 6. INFINITE CLEANUP LOOP
After completing specs 1-5, loop through these forever:
- Search for remaining `rgba(` → replace with CSS variables
- Search for remaining `console.log(` → remove (keep console.error/warn)
- Search for remaining `style={{` with colors → migrate to theme.css
- Search for remaining `: any` → replace with proper types
- Run `npm run build` after every batch of changes
- Commit and push after every batch

## Rules
- NEVER touch files being modified by another terminal/process
- Always `npm run build` before committing
- Always `git push origin main` after committing
- If build fails, fix the error before moving on
- If a git push is rejected (someone else pushed), do `git pull --rebase origin main` then push again
- No `!important` in CSS ever
- Visual styles in theme.css, Tailwind for layout only
