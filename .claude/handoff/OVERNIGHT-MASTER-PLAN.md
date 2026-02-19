# Overnight Master Plan — 8-Hour Autonomous Loop Session

> **For Claude:** This is an 8-hour autonomous work plan that NEVER STOPS. It has 6 priority phases followed by an INFINITE IMPROVEMENT LOOP. You must keep working continuously. When you finish the priority phases, enter the loop and cycle through improvements until interrupted.
>
> **Model:** Sonnet
> **Duration:** 8 hours (overnight, unattended)
> **Branch:** Continue on `claude/bold-satoshi`
> **Commit strategy:** Commit after each task. Descriptive messages.
> **CRITICAL:** Do NOT stop after finishing a phase. Always move to the next phase. After Phase 6, enter the Infinite Loop. NEVER declare "I'm done" — there is ALWAYS more work.

---

## Architecture: Phased Work + Infinite Loop

```
Phase 1 (launch-critical) → Phase 2 (hardening) → Phase 3 (unification) →
Phase 4 (polish) → Phase 5 (SEO) → Phase 6 (swipe UX) →
┌─────────────────────────────────────────────────┐
│                INFINITE LOOP                     │
│                                                  │
│  Loop A: Inline styles → theme.css (221 files)   │
│  Loop B: Console.log cleanup (354 instances)     │
│  Loop C: RGBA → CSS variables (127 files)        │
│  Loop D: Promise error handling (6 chains)        │
│  Loop E: Type safety — remove `: any` (5 files)  │
│  Loop F: Design doc implementation (25 docs)     │
│  Loop G: Unit test coverage expansion            │
│  Loop H: Accessibility audit & fixes             │
│  Loop I: Code review own commits from tonight    │
│  → Back to Loop A (re-scan for new issues)       │
└─────────────────────────────────────────────────┘
```

**After each loop cycle:** Run `npm run build` to verify. If build fails, fix it before continuing.
**After every 10 commits:** Append progress to `.claude/handoff/OVERNIGHT-RESULTS.md`.

---

## Global Rules (Apply to EVERYTHING)

1. **Auth:** ALWAYS `useSageWallet` + `getDIDs()` — NEVER `useAuthenticatedFetch`, NEVER Clerk
2. **CSS:** All visuals in `src/styles/theme.css`, Tailwind for layout only, NEVER `!important`
3. **Migrations:** Check existing with `ls functions/migrations/` before creating. Next available: 063+.
4. **Commits:** After each task with descriptive message
5. **Build checks:** `npx tsc --noEmit` every 3 tasks. `npm run build` at end of each phase.
6. **Blockers:** If stuck >15 min, log the issue and move on
7. **No new deps** without justification in commit message
8. **Brand voice:** See `docs/BRAND-VOICE.md`. Clear beats clever.
9. **Anti-patterns:** See CLAUDE.md. Never `SELECT MAX`, never single IPFS URIs, never `startsWith('xch1')`, never hardcode XCH prices, never `!important`.
10. **Error messages:** [What happened]. [Why]. [What to do].

---

## PHASE 1: Launch-Critical UX Polish (1-1.5 hours)

**Spec:** `.claude/handoff/LAUNCH-DAY-UX-POLISH.md`
**Tasks:** 10 tasks, 5 packages
**Exit condition:** Build passes. Arena visible in sidebar + mobile More Menu. Games page shows only arcade games.

### Context:
- Swipe and Arena are NOT games — separate them from GamesHub
- If `Swords` icon unavailable in lucide-react, use `Sword`
- QueuePanel is inside Router — use `<Link>` not `<a>`

Execute all 10 tasks from the spec.

---

## PHASE 2: API Hardening (1.5-2 hours)

**No spec file — full instructions here.**
**Exit condition:** ALL API endpoints have try-catch. Build passes.

The project has **zero try-catch blocks** in Cloudflare Functions. Unhandled exceptions kill requests silently.

### Task 2.1-2.6: Add try-catch to ALL API endpoints

For each directory under `functions/api/`, wrap every exported handler in try-catch:

**Directories to process (in order):**
1. `functions/api/mint/` — all files
2. `functions/api/combat/` — all files
3. `functions/api/game/` — all files
4. `functions/api/chat/` — all files
5. `functions/api/credits/` — all files
6. Everything else in `functions/api/` — gallery, leaderboard, shop, indexer, etc.

**Pattern for each file:**

```typescript
export async function onRequestPost(context: EventContext<Env, string, unknown>): Promise<Response> {
  try {
    // ... existing code stays exactly the same ...
  } catch (error) {
    console.error(`[api/${path}] Unhandled error:`, error);
    return Response.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
```

**Rules:**
- Don't change the existing logic inside — ONLY wrap with try-catch
- If a function already has its own try-catch, skip it
- Use the actual file path in the console.error message for debuggability
- Commit after each directory (6 commits)

### Task 2.7: Build verification

```bash
npx tsc --noEmit && npm run build
```

---

## PHASE 3: Unified Swipe + Arena (1.5-2 hours)

**Spec:** `.claude/handoff/UNIFIED-SWIPE-ARENA.md`
**Tasks:** 20 tasks
**Exit condition:** Build passes. `/arena` route works. Vote XP pipeline wired. Leaderboard unified.

### Context:
- `/arena` route, ArenaNav, and nav items may already exist from Phase 1 — skip overlapping tasks
- Migration 062 is taken. Check `ls functions/migrations/` before creating new ones.
- Auth: `useSageWallet` + `getDIDs()` throughout

Execute all 20 tasks. Skip duplicates from Phase 1.

---

## PHASE 4: Generator Premium Polish (1-1.5 hours)

**Design doc:** `docs/plans/2026-02-16-generator-premium-polish-design.md`
**Plan doc:** `docs/plans/2026-02-16-generator-premium-polish-plan.md`
**Exit condition:** Build passes. Generator feels premium.

Read both docs. Follow the plan doc's step-by-step tasks. If only design doc exists for an item, implement it. All visuals in theme.css.

---

## PHASE 5: SEO Deployment (30-45 minutes)

**Exit condition:** Build passes. All major pages have `<title>`, `<meta description>`, OG tags.

`PageSEO` component exists at `src/components/seo/PageSEO.tsx` but **ZERO pages use it**.

Add `<PageSEO>` to these pages:

| Page | Title | Description |
|------|-------|-------------|
| Gallery | Gallery | Browse 4,200 unique Wojak NFTs on the Chia blockchain |
| Generator | Generator | Create your own custom Wojak NFT with layered traits and combat moves |
| GamesHub | Games | Play arcade mini-games with your Wojak collection |
| CombatArena | Arena | Turn-based Wojak battles with 18 types, 174 moves, and ELO ranking |
| GameVoting (Swipe) | Wojak Swipe | Rate and discover Wojak NFTs — swipe to vote and earn XP |
| BigPulp | BigPulp | AI-powered analytics for the Wojak NFT collection |
| Leaderboard | Leaderboard | Top-ranked Wojak NFTs by ELO, battles, and community votes |
| Shop | Shop | Spend credits on voting power, items, and upgrades |
| Account | Account | Your profile, collection, credits, and battle history |

Check import path: likely `import { PageSEO } from '@/components/seo'` or `'@/components/seo/PageSEO'`.

Commit: `feat: add PageSEO meta tags to all major pages`

---

## PHASE 6: Swipe UX Overhaul (1-1.5 hours)

**Design doc:** `docs/plans/2026-02-18-swipe-ux-overhaul-design.md`
**Plan doc:** `docs/plans/2026-02-18-swipe-ux-overhaul-plan.md`
**Exit condition:** Build passes.

Read both docs. Priority order:
1. Better empty states with CTAs
2. Clickable NFTs everywhere (Link wrappers)
3. Remove DIDs from UI (display changes)
4. NFT Profile page (if time)

---

# INFINITE IMPROVEMENT LOOP

**You have reached the loop. This is where you stay for the rest of the night.**

After finishing Phases 1-6, cycle through these loops. Each loop is a complete unit of work. After completing one, move to the next. After Loop I, go back to Loop A and re-scan.

**Between each loop:** Run `npm run build`. Append progress to `OVERNIGHT-RESULTS.md`.

---

## Loop A: Migrate Inline Styles to theme.css

**221 files** have `style={{` patterns. These violate the CSS architecture.

**Process (repeat for each file):**

1. Pick a file with `style={{` — start with the most-used components:
   - `src/components/combat/` (all files)
   - `src/components/game/` (all files)
   - `src/components/gallery/` (all files)
   - `src/pages/` (all files)
   - `src/components/ui/` (all files)
   - Remaining `src/components/` directories

2. For each inline style, decide:
   - **If it's a color/shadow/border/font**: Create a class in `src/styles/theme.css` and use it
   - **If it's layout (width/height/gap/padding/margin)**: Convert to Tailwind utility class
   - **If it's dynamic (based on state/props)**: Keep as inline style — this is acceptable
   - **If it's a one-off animation transform**: Keep as inline style — acceptable for framer-motion

3. Example conversion:
   ```tsx
   // BEFORE
   <div style={{ background: 'rgba(255, 107, 0, 0.12)', borderRadius: 'var(--radius-md)' }}>

   // AFTER — add to theme.css:
   // .icon-badge-orange { background: rgba(255, 107, 0, 0.12); border-radius: var(--radius-md); }
   <div className="icon-badge-orange">
   ```

4. Commit every 3-5 files: `refactor: migrate inline styles to theme.css in [component area]`

**Stop condition for this loop:** When you've processed 20+ files, move to Loop B. You'll come back to this.

---

## Loop B: Console.log Cleanup

**354 console.log statements** across the codebase.

**Process:**

1. Grep for `console.log` in `src/` (exclude test files and node_modules)
2. For each file:
   - **Remove** `console.log` statements that are debug/development only
   - **Keep** `console.error` and `console.warn` — these are legitimate
   - **Keep** `console.log` in files named `*Debug*` or in development-only code paths
   - **Convert** important diagnostic logs to `console.warn` or `console.error` if they indicate problems
3. Commit every 5-10 files: `chore: remove console.log debug statements from [area]`

**Stop condition:** When you've cleaned 50+ statements, move to Loop C.

---

## Loop C: RGBA Patterns → CSS Variables

**127 files** use `rgba()` inline in TSX. Many should be CSS variables.

**Process:**

1. For commonly repeated rgba patterns, create CSS variables in theme.css:
   ```css
   --color-primary-12: rgba(255, 107, 0, 0.12);
   --color-primary-20: rgba(255, 107, 0, 0.20);
   --color-error-15: rgba(239, 68, 68, 0.15);
   --color-white-5: rgba(255, 255, 255, 0.05);
   --color-white-8: rgba(255, 255, 255, 0.08);
   --color-black-50: rgba(0, 0, 0, 0.5);
   --color-black-70: rgba(0, 0, 0, 0.7);
   ```

2. Find-and-replace these patterns in components:
   ```tsx
   // BEFORE
   style={{ background: 'rgba(255, 107, 0, 0.12)' }}
   // AFTER
   style={{ background: 'var(--color-primary-12)' }}
   // OR BETTER — move to theme.css class
   ```

3. Don't touch rgba in framer-motion animate/transition props or dynamic calculations.

4. Commit every 5-10 files: `refactor: replace inline rgba with CSS variables in [area]`

**Stop condition:** When you've processed 15+ files, move to Loop D.

---

## Loop D: Promise Error Handling

**6 unprotected promise chains** found in the codebase.

**Files to fix:**
1. `src/services/treasuryFallback.ts` — 1 `.then()` chain
2. `src/services/traitRankings.ts` — 2 `.then()` chains
3. `src/lib/combat/audio.ts` — 3 `.then()` chains
4. `src/hooks/useTraitRankings.ts` — `.then()` without catch

**Pattern:**
```typescript
// BEFORE
somePromise.then(result => doSomething(result))

// AFTER
somePromise
  .then(result => doSomething(result))
  .catch(err => console.error('[module] Failed:', err))
```

For audio: catch should silently fail (audio is optional).
For rankings: catch should set error state or return empty array.

Commit: `fix: add error handling to unprotected promise chains`

**Stop condition:** All 6 chains fixed. Move to Loop E.

---

## Loop E: Type Safety — Remove `: any`

**5 instances** of `: any` in the codebase.

**Files:**
1. `src/components/Guild/GuildSearch.tsx` — debounce utility function
2. `src/pages/Drawer.tsx` — map callback parameter
3. `src/pages/Account.tsx` — 2 array initializations
4. `src/components/UsernamePicker/UsernamePicker.tsx` — debounce

**Fix:** Replace with proper TypeScript types. Extract debounce to a shared utility with generics.

Commit: `refactor: remove :any types with proper TypeScript generics`

**Stop condition:** All 5 fixed. Move to Loop F.

---

## Loop F: Design Doc Implementation

**25 design docs** in `docs/plans/`. Pick the most launch-relevant one that hasn't been implemented yet and build it.

**Priority order:**
1. `2026-02-17-dashboard-page-design.md` — Player dashboard
2. `2026-02-17-leaderboard-page-design.md` — Leaderboard overhaul
3. `2026-02-18-blind-battles-design.md` + plan — Blind battle mode
4. `2026-02-17-your-wojak-game-design.md` + plan — Your Wojak game
5. `2026-02-16-bulletproof-credits-design.md` — Credits system hardening

**Process:**
1. Read the design doc AND the plan doc (if exists)
2. If plan exists, follow it task-by-task
3. If only design exists, implement the first 3-5 features from it
4. Commit after each feature

**Stop condition:** When one design doc is fully implemented, move to Loop G.

---

## Loop G: Unit Test Coverage

**Current:** 28 test files (3.6% of codebase). Target: 50+ files.

**Process:**

Write unit tests for untested modules. Priority:

1. **Contexts without tests:**
   - `src/contexts/GameContext.tsx`
   - `src/contexts/GeneratorContext.tsx`
   - `src/contexts/AgentContext.tsx`
   - `src/contexts/BigPulpContext.tsx`

2. **Services without tests:**
   - `src/services/galleryService.ts`
   - `src/services/tradeValuesService.ts`
   - `src/services/imagePreloader.ts`

3. **Hooks without tests:**
   - `src/hooks/useGallery.ts`
   - `src/hooks/useFlickVoting.ts`

**Pattern:** Follow existing test patterns in `src/lib/combat/*.test.ts`. Use vitest.

Commit after each test file: `test: add unit tests for [module]`

**Stop condition:** When you've written 5+ new test files, move to Loop H.

---

## Loop H: Accessibility Improvements

Scan components for missing accessibility attributes.

**Process:**

1. Check interactive elements missing `aria-label`:
   - Buttons with only icons (no text)
   - Links with only images
   - Toggle/switch components

2. Check images missing `alt` text

3. Check focus management:
   - Modals should trap focus
   - Dropdown menus should handle keyboard navigation

4. Check color contrast:
   - `text-muted` on dark backgrounds may have low contrast

Commit after each batch: `a11y: improve accessibility in [component area]`

**Stop condition:** When you've audited 10+ components, move to Loop I.

---

## Loop I: Self-Review & Polish

Review your own commits from tonight.

**Process:**

1. Run `git log --oneline -30` to see tonight's commits
2. For each commit:
   - Does it follow the CSS architecture? (theme.css, not inline)
   - Does it use the right auth pattern? (useSageWallet, not Clerk)
   - Are there any regressions?
   - Could the code be cleaner?
3. Fix anything that slipped through
4. Run the full build one more time: `npm run build`

**Stop condition:** Review complete. Go back to **Loop A** and re-scan for new inline styles or issues introduced by tonight's work.

---

## Progress Tracking

Every 10 commits, append to `.claude/handoff/OVERNIGHT-RESULTS.md`:

```markdown
# Overnight Session Results — [DATE]

## Phase Completion
- [ ] Phase 1: Launch UX Polish
- [ ] Phase 2: API Hardening
- [ ] Phase 3: Unified Swipe+Arena
- [ ] Phase 4: Generator Polish
- [ ] Phase 5: SEO Deployment
- [ ] Phase 6: Swipe UX Overhaul

## Loop Progress
- Loop A: Inline styles migrated: X/221 files
- Loop B: Console.logs cleaned: X/354
- Loop C: RGBA patterns converted: X/127
- Loop D: Promise chains fixed: X/6
- Loop E: Any types removed: X/5
- Loop F: Design docs implemented: [which one]
- Loop G: Test files written: X new
- Loop H: Components audited for a11y: X
- Loop I: Self-review cycles: X

## Commits Made
[list of commit hashes and messages]

## Blockers / Issues Found
[anything that couldn't be resolved]

## Build Status
[current build result]
```

**Update this file every 10 commits. It's how the human tracks progress in the morning.**
