#!/bin/bash
# =============================================================
# Wojak Autonomous Builder
# Runs specs, then loops forever: audit → fix → improve → repeat
#
# Usage: Open a NEW terminal, then paste:
#   cd /Users/abit_hex/wojak-ink && bash .claude/run-queue.sh 2>&1 | tee .claude/queue-log.txt
# =============================================================

cd /Users/abit_hex/wojak-ink

echo "========================================="
echo "$(date): WOJAK AUTONOMOUS BUILDER STARTED"
echo "========================================="

# ─────────────────────────────────────────────
# PHASE 1: Execute all remaining specs
# ─────────────────────────────────────────────

echo ""
echo "=== PHASE 1: SPEC QUEUE ==="

echo ""
echo "--- SPEC #8: HOW-IT-WORKS ---"
echo "$(date): Starting..."
claude --dangerously-skip-permissions -p "Read .claude/handoff/HOW-IT-WORKS-SPEC.md and execute all 9 tasks in order. This creates an in-app combat guide page at /fight-club/guide with collapsible sections explaining the 18 combat types, type matchup chart, natures, abilities, battle mechanics, and power scoring. Import real data from src/lib/combat/data/ for the type chart and natures — don't hardcode. Add the route and a Guide link next to the RefreshButton in Fight Club. Run npm run build and commit + git push origin main after each task."
echo "$(date): Spec #8 done (exit code: $?)"

echo ""
echo "--- SPEC #9: FIGHT-CLUB-HERO ---"
echo "$(date): Starting..."
claude --dangerously-skip-permissions -p "Read .claude/handoff/FIGHT-CLUB-HERO-SPEC.md and execute all 4 tasks in order. This adds a fighting-game-energy hero section above the Fight Club tabs. Shows Create. Battle. Climb. Profit. loop with icons, a bold FIGHT CLUB title, and a Create Your Fighter CTA for non-holders. Add styles to theme.css. Show the hero in the gate screen and connect wallet screen too. Run npm run build and commit + git push origin main after each task."
echo "$(date): Spec #9 done (exit code: $?)"

echo ""
echo "--- SPEC #10: GALLERY-YOUR-WOJAK ---"
echo "$(date): Starting..."
claude --dangerously-skip-permissions -p "Read .claude/handoff/GALLERY-YOUR-WOJAK-SPEC.md and execute all 6 tasks in order. This adds a Your Wojak Fighters section to the Gallery page below the Farmers Plot section. Create the /api/gallery/your-wojaks endpoint, YourWojakSection component with type filters and sorting, and WojakFighterCard with combat data overlays. Run npm run build and commit + git push origin main after each task."
echo "$(date): Spec #10 done (exit code: $?)"

echo ""
echo "--- SPEC #11: NFT-COMBAT-DATA ---"
echo "$(date): Starting..."
claude --dangerously-skip-permissions -p "Read .claude/handoff/NFT-COMBAT-DATA-SPEC.md and execute all 5 tasks in order. This adds full combat identity display to the Gallery NFT explorer. Create /api/combat/fighter-detail endpoint, FighterStatsPanel component showing type/nature/ability/moves/power/battle record, add a Combat tab to the NFT explorer, and integrate with the Your Wojak fighter cards. Run npm run build and commit + git push origin main after each task."
echo "$(date): Spec #11 done (exit code: $?)"

echo ""
echo "========================================="
echo "$(date): ALL SPECS COMPLETE"
echo "========================================="

# ─────────────────────────────────────────────
# PHASE 2: Continuous improvement loop
# ─────────────────────────────────────────────

echo ""
echo "=== PHASE 2: AUTONOMOUS IMPROVEMENT LOOP ==="
echo "Cycling: Build Audit → Bug Fix → UX Polish → Repeat"
echo ""

LOOP_COUNT=0

while true; do
  LOOP_COUNT=$((LOOP_COUNT + 1))
  echo ""
  echo "========================================="
  echo "$(date): IMPROVEMENT CYCLE #${LOOP_COUNT}"
  echo "========================================="

  # ── Step A: Full Build Audit ──
  echo ""
  echo "--- CYCLE ${LOOP_COUNT} / STEP A: BUILD AUDIT ---"
  echo "$(date): Starting..."
  claude --dangerously-skip-permissions -p "You are an autonomous build auditor for the Wojak.ink project.

CONTEXT: This is a React + Vite + Cloudflare Workers project. Read CLAUDE.md for project conventions.

YOUR JOB:
1. Run 'npm run build' and check for ANY errors or warnings
2. If there are TypeScript errors, fix ALL of them
3. If there are unused imports or variables, clean them up
4. If there are missing imports, add them
5. After fixing, run 'npm run build' again to verify zero errors
6. If build is clean with zero errors, just say 'Build clean' and stop

RULES:
- Fix every error you find, don't skip any
- Run npm run build after each fix to verify
- Commit fixes as 'fix: resolve build errors from cycle ${LOOP_COUNT}' and git push origin main
- No !important in CSS
- Follow existing code patterns"
  echo "$(date): Build audit done (exit code: $?)"

  # ── Step B: Bug Hunt ──
  echo ""
  echo "--- CYCLE ${LOOP_COUNT} / STEP B: BUG HUNT ---"
  echo "$(date): Starting..."
  claude --dangerously-skip-permissions -p "You are an autonomous bug hunter for the Wojak.ink project.

CONTEXT: This is a React + Vite + Cloudflare Workers project. Read CLAUDE.md for conventions. The app has: Gallery, Generator, Fight Club (Battle/Vote/Rankings/Burn tabs), Games Hub, BigPulp AI, Shop, Treasury.

YOUR JOB:
1. Read through recent git commits (git log --oneline -20) to understand what was just built
2. Look at the files that were recently changed (git diff HEAD~10 --name-only)
3. For each recently changed file, READ it carefully and look for:
   - Logic bugs (wrong conditions, missing null checks, off-by-one errors)
   - Missing error handling (uncaught promises, missing try/catch, missing loading states)
   - Broken imports (importing from files that dont exist or wrong paths)
   - API mismatches (frontend expects different shape than backend returns)
   - CSS issues (missing classes referenced in JSX, broken responsive layouts)
   - Dead code (unreachable code, unused functions, commented-out blocks)
   - Race conditions (state updates after unmount, missing cleanup in useEffect)
4. Fix every bug you find
5. Run npm run build after fixes to verify
6. If you find nothing, say 'No bugs found' and stop

RULES:
- Be thorough — read the actual code, dont just skim
- Fix bugs immediately, dont just report them
- Commit as 'fix: [description]' and git push origin main after each fix
- No !important in CSS
- If a bug requires understanding another file for context, read that file too"
  echo "$(date): Bug hunt done (exit code: $?)"

  # ── Step C: UX Polish & Gap Finder ──
  echo ""
  echo "--- CYCLE ${LOOP_COUNT} / STEP C: UX POLISH ---"
  echo "$(date): Starting..."
  claude --dangerously-skip-permissions -p "You are an autonomous UX polisher for the Wojak.ink project.

CONTEXT: Read CLAUDE.md for conventions. This is a dark-mode crypto NFT combat game. Users create Wojak fighters in the Generator, battle in Fight Club, vote, and climb rankings. The brand is: fighting game energy, bold, uppercase, dark with orange/neon accents.

YOUR JOB — pick ONE thing from this list and do it well:
1. Find a component with poor empty states (loading spinners instead of skeletons, blank screens, 'No data' with no CTA) and improve it
2. Find inline styles that should use CSS variables from theme.css and clean them up
3. Find a page or component missing proper loading/error states and add them
4. Find inconsistent spacing, typography, or color usage and standardize it
5. Find buttons or links that are too small on mobile (min 44px tap target) and fix them
6. Find text that could be more engaging/on-brand and improve the copy
7. Find accessibility issues (missing aria labels, poor contrast, missing focus states) and fix them
8. Improve responsive behavior on a component that looks broken on mobile vs desktop

RULES:
- Pick only ONE improvement per run — do it thoroughly
- Read the actual component before changing it
- Run npm run build after changes
- Commit as 'polish: [description]' and git push origin main
- No !important in CSS
- Visual styles in theme.css, layout with Tailwind
- If you genuinely find nothing to improve, say 'All clean' and stop
- Do NOT refactor working code just for style — only fix actual UX problems"
  echo "$(date): UX polish done (exit code: $?)"

  # ── Step D: Integration Check ──
  echo ""
  echo "--- CYCLE ${LOOP_COUNT} / STEP D: INTEGRATION CHECK ---"
  echo "$(date): Starting..."
  claude --dangerously-skip-permissions -p "You are an autonomous integration tester for the Wojak.ink project.

CONTEXT: Read CLAUDE.md. This project has frontend (src/) and backend (functions/api/). The backend runs on Cloudflare Workers with D1 SQLite.

YOUR JOB:
1. Check that all API endpoints referenced in frontend code actually exist as files in functions/api/
2. Check that all routes defined in src/App.tsx or src/config/routes.ts have corresponding page components
3. Check that all imports across the project resolve to real files (no broken imports)
4. Check that all database table references in API code match tables created by migrations in functions/migrations/
5. Check that TypeScript interfaces between frontend and backend are consistent (request/response shapes)
6. Fix any mismatches you find

RULES:
- This is a structural check — focus on wiring, not logic
- Fix broken connections immediately
- Run npm run build to verify
- Commit as 'fix: wire up [description]' and git push origin main
- If everything is wired correctly, say 'All integrations clean' and stop"
  echo "$(date): Integration check done (exit code: $?)"

  echo ""
  echo "$(date): Cycle #${LOOP_COUNT} complete. Sleeping 30 seconds before next cycle..."
  sleep 30
done
