# Wojak Ink — Project Intelligence

---

## How We Work — Three-Party Workflow

This project runs a structured loop between three parties:

| Party | Role |
|-------|------|
| **User** | Product owner — decisions, priorities, final approval |
| **Claude (MacOS app)** | Advisor — research, spec writing, reviewing Claude CLI's output |
| **Claude CLI** | Implementer — reads specs, codes, commits, deploys |

**Claude CLI: this is how you receive and return work.**

### Where to find your work
All specs are in **`docs/plans/`**.

- Specs follow this naming: `YYYY-MM-DD-[topic]-spec.md`
- Design docs (decisions + rationale): `YYYY-MM-DD-[topic]-design.md`
- Full protocol reference: `docs/plans/WORKFLOW.md`

**When you start a session**, check `docs/plans/` for the most recent spec file. That is your task.

### Spec format (what Claude CLI receives)
Every spec contains:
- **Context files to read first** — read all of them before touching code
- **Goal** — exactly what to build or change
- **Constraints** — CSS rules, anti-patterns, what NOT to touch
- **Out of scope** — explicit list of things to leave alone
- **Success criteria** — self-check these before reporting done

### What Claude CLI reports when done
```
DONE: [task title]
Files changed: [list]
Build: PASS / FAIL
Self-checks: [each criterion — pass/fail]
Notes: [anything unexpected]
```

### The loop
1. User + Claude (MacOS) write a spec → saved to `docs/plans/`
2. Claude CLI reads the spec, implements, self-checks, commits, reports
3. User + Claude review the output against the spec
4. Approved → next spec released. Failed → correction spec written.
5. While Claude CLI codes, User + Claude write the next spec (always ahead)

**Claude CLI never expands scope beyond the spec. If you find something that needs fixing outside the spec, note it in your report. Do not fix it.**

---

## Before Starting Any Task

1. **Read this file** (`CLAUDE.md`) — project conventions, CSS rules, routes
2. **Read `.claude/instructions/PROMPT-PRINCIPLES.md`** — constraints, anti-patterns, self-review checklist
3. **Identify the task type** and use the matching prompt template from `prompts/templates/`
4. **Read the context files** listed in the routing table below for your domain

## Context Routing Table

| Domain | Read These First |
|--------|-----------------|
| **Minting** | `functions/api/mint/*.ts`, `docs/LAUNCH-READINESS.md`, `docs/AUDIT-REPORT.md` |
| **Frontend** | This file (CSS rules below), `src/styles/theme.css`, similar components |
| **Database** | `functions/migrations/` (all), `functions/api/mint/_shared.ts` |
| **Wallet** | `src/sage-wallet/`, `src/contexts/MintContext.tsx` |
| **Games** | `src/pages/` game pages, `src/components/games/` |
| **Deployment** | `wrangler.toml`, `vite.config.ts`, `package.json` scripts |
| **Security** | `docs/AUDIT-REPORT.md`, `docs/LAUNCH-READINESS.md` |
| **Brand/Copy** | `docs/BRAND-VOICE.md` |
| **Generator** | `docs/GENERATOR-CODE-HEALTH.md`, `src/contexts/GeneratorContext.tsx`, `src/lib/wojakRules.ts` |
| **Credits** | `functions/api/credits/`, `workers/credit-tracker/`, `functions/migrations/030_credit_system.sql` |

## Prompt Templates

| Task Type | Template |
|-----------|----------|
| Security audit | `prompts/templates/AUDIT.template.md` |
| New feature | `prompts/templates/FEATURE.template.md` |
| Bug fix | `prompts/templates/BUGFIX.template.md` |
| Refactoring | `prompts/templates/REFACTOR.template.md` |
| DB migration | `prompts/templates/MIGRATION.template.md` |
| Frontend work | `prompts/templates/FRONTEND.template.md` |
| Research | `prompts/templates/RESEARCH.template.md` |

## Critical Anti-Patterns (Never Do These)

- **Never `SELECT MAX` for sequential IDs** — use `UPDATE...RETURNING` on `mint_counter`
- **Never single IPFS URIs** — use `string[]` with gateway redundancy
- **Never self-fetch own API endpoints** — the `prepare->upload` self-fetch is tech debt, don't add more
- **Never `startsWith('xch1')` for wallet validation** — use `isValidChiaAddress()` (bech32m regex)
- **Never hardcode XCH prices** — use constants or env vars
- **Never change schema without a migration file** — `functions/migrations/NNN_description.sql`
- **Never `!important` in CSS** — ever
- **Never add deps without documenting why** — explain in commit message

---

# CLAUDE.md - Wojak.ink

## Generator and layer work

When making changes to the **wojak generator**, **layer rules**, **layer order**, **color picking**, **trait/layer config**, or when the user gives a **command or recommendation** about how to do something in the generator:

1. **Read `docs/GENERATOR-CODE-HEALTH.md`** before editing and follow its guidance (what to do, what not to do, file roles).
2. After changes, re-check that doc for any optional/next steps (e.g. tests, `isSelectionPathEmpty` usage).

---

## ACTIVE TASK: CSS Cleanup

**Read these files before any CSS work:**
- `.claude/instructions/CSS-CLEANUP.md` (quick reference)
- `CSS-CLEANUP-AUDIT.md` (full audit)
- `CSS-CLEANUP-EXECUTION.md` (step-by-step plan)

---

## CSS Architecture (UPDATED)

**ONE theme file** + **Tailwind for layout only**

### Visual Styling → `src/styles/theme.css`
All colors, shadows, borders, typography, component styles.

### Layout → Tailwind
Only: flex, grid, gap, padding, margin, width, height, responsive.

---

## Rules

### DO:
- Use `.card`, `.btn`, `.input`, `.badge` classes from theme.css
- Use Tailwind for layout: `flex`, `p-4`, `gap-4`, `grid-cols-3`
- Use CSS variables: `var(--color-primary)`
- Keep component CSS minimal (complex animations only)

### DO NOT:
- Create new CSS variable files
- Add `!important` rules (EVER)
- Use inline styles for colors
- Define colors in Tailwind config
- Create theme switching code
- Add Ionic CSS imports

---

## Component Patterns

```tsx
// Card with hover effect
<div className="card p-4 flex flex-col gap-3">

// Static card (no hover)
<div className="card-static p-4">

// Primary button
<button className="btn btn-primary">

// Secondary button
<button className="btn btn-secondary">

// Ghost button
<button className="btn btn-ghost">

// Input field
<input className="input" />

// Text colors
<span className="text-secondary">  // Muted
<span className="text-accent">     // Orange accent
<span className="text-muted">      // Very muted

// Badge
<span className="badge">Default</span>
<span className="badge badge-success">Success</span>
<span className="badge badge-cyan">Info</span>

// Layout (Tailwind only)
<div className="flex gap-4 p-6">
<div className="grid grid-cols-3 gap-4">
```

---

## File Structure

```
src/
├── index.css           ← Imports theme.css + Tailwind only
├── styles/
│   ├── theme.css       ← ALL visual styles (single source)
│   ├── animations.css  ← Keyframe animations
│   └── [feature].css   ← Feature-specific (shop, profile)
├── components/
│   └── *.tsx           ← Use theme classes + Tailwind layout
└── pages/
    └── *.tsx           ← Use theme classes + Tailwind layout
```

---

## CSS Variables Quick Reference

### Colors
```css
var(--color-primary)         /* #ff6b00 - orange */
var(--color-primary-hover)   /* Lighter orange */
var(--color-bg)              /* #0a0a0f - dark bg */
var(--color-surface)         /* #12121a - cards */
var(--color-text)            /* #ffffff */
var(--color-text-secondary)  /* #a0a0b0 */
var(--color-text-muted)      /* #606070 */
var(--color-border)          /* rgba white 8% */
var(--color-success)         /* #22c55e */
var(--color-error)           /* #ef4444 */
var(--color-cyan)            /* #00d4ff */
```

### Shadows & Glows
```css
var(--shadow-card)           /* Card shadow */
var(--glow-primary)          /* Orange glow */
var(--glow-cyan)             /* Cyan glow */
```

### Radius
```css
var(--radius-md)   /* 10px - buttons, inputs */
var(--radius-lg)   /* 14px - cards */
var(--radius-xl)   /* 20px - modals */
```

---

## Tech Stack

- React + Vite (localhost:5173)
- TypeScript
- Tailwind CSS (layout only)
- theme.css (all visuals)
- React Router
- Dark mode only (no theme switching)

---

## Routes (Do Not Rename)

/gallery, /bigpulp, /generator, /games, /leaderboard,
/shop, /guild, /treasury, /settings, /account

---

## Before Any CSS Changes

1. Check if style exists in theme.css
2. If yes → use the class
3. If no → add to theme.css (not a new file)
4. Use Tailwind only for layout

---

## Phase 5: Code Quality (Nightshift Automation)

### What Was Done

Phase 5 is the code quality pass executed via nightshift automation. Three tasks:

1. **CSS Consolidation**
   - Audited 1,899 inline style instances
   - Consolidated visual styles to theme.css
   - Removed non-accessibility !important rules
   - Validated CSS variable usage consistency
   - Ensured Tailwind is layout-only

2. **TypeScript Strictness**
   - Verified tsconfig.json strict mode compliance
   - Validated no type regressions
   - Confirmed build + tests pass
   - Fixed unused import warnings

3. **Documentation Updates**
   - Updated CLAUDE.md with Phase 5 notes
   - Updated PROJECT_DOCUMENTATION.md with nightshift section
   - Created docs/NIGHTSHIFT-GUIDE.md explaining automation process
   - Documented all changes with clear git commits

### Why Nightshift?

Code quality work is:
- Repetitive (ideal for automation)
- Low-risk when properly validated
- High-value for long-term maintainability
- Perfect for off-hours execution

See `docs/NIGHTSHIFT-GUIDE.md` for full automation documentation.

### Key Findings

- **CSS Variables:** 100% coverage - no new variables needed
- **TypeScript:** Already strict - zero type errors after cleanup
- **Inline Styles:** Successfully consolidated where feasible
- **!important Rules:** Only 2 non-accessibility instances (removed)
- **Build:** ✅ Passing
- **Tests:** ✅ Passing

### For Future Work

If more CSS consolidation needed:
1. Focus on high-impact files (DesktopExplorerPanel, WojakProfile, etc.)
2. Use data-* attributes for dynamic style variations
3. Add to theme.css, not component .css files
4. Always validate against build + tests
