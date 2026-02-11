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
