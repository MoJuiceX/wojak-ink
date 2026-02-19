# CLI Safe Work — While Brainstorming Continues

## Context
The research session (Claude Code) is actively brainstorming a major navigation restructure and unified Power scoring system with the user. DO NOT touch navigation, sidebar, routes, leaderboard pages, or scoring/Power logic. That design is still in progress.

## What You CAN Build (safe, non-conflicting)

### Task 1: Fix Duplicate Arena in MoreMenu
**File:** `src/components/navigation/MoreMenu.tsx`
**Problem:** There are two identical Arena entries in the menuItems array (lines ~44-61). The second one (with `rgba(239, 68, 68, 0.15)`) is a duplicate from a bad merge.
**Fix:** Remove the second Arena entry. Keep only the first one (the one with `var(--color-error-15)`).
**Verify:** Build passes, only one Arena in the mobile More Menu.

### Task 2: CSS Cleanup — Remaining rgba() to CSS Variables
Continue the overnight work of replacing hardcoded `rgba()` values with CSS variables from `src/styles/theme.css`. The overnight session got through ~60 files but there are more.
- Search for `rgba(` across all `.tsx` and `.css` files
- Replace with the matching CSS variable (check theme.css for the token)
- Do NOT create new CSS variables — only use existing ones from theme.css
- Do NOT use `!important` ever
- Build after every ~10 files to catch breakage

### Task 3: Console.log Cleanup
Remove remaining `console.log` statements from production code:
- Search all `.ts` and `.tsx` files for `console.log(`
- Remove debug logging (keep `console.error` and `console.warn` — those are intentional)
- Do NOT remove console.log from test files (`*.test.ts`)
- Build after each batch

### Task 4: Inline Style Migration
Continue migrating inline `style={{` props that define colors/borders/shadows to theme.css classes:
- Search for `style={{` across components
- If it sets color, backgroundColor, borderColor, boxShadow — move to theme.css
- Use existing theme classes where possible (`.card`, `.btn`, `.badge`, etc.)
- Layout styles (padding, margin, flex, width, height) can stay inline OR use Tailwind
- Build after each batch

### Task 5: TypeScript Strict — Remove `:any`
Find remaining `: any` type annotations and replace with proper types:
- Search for `: any` across `.ts` and `.tsx` files
- Replace with the correct type (read the surrounding code to determine it)
- Do NOT change function signatures that are part of public APIs without understanding the callers
- Build after each batch

## Rules
- Commit after each completed task with a clear message
- Push to main after each commit: `git push origin main`
- Run `npm run build` before every commit — never push broken code
- Do NOT touch: navigation, sidebar, routes, leaderboard, scoring, Power, Fight Club, or any file in `src/config/routes.ts`
- If in doubt about a file, skip it
- Work in this order: Task 1 first (quick fix), then cycle through 2-5 repeatedly
