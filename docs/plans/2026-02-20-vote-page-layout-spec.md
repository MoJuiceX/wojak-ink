# Vote Page Layout — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the Vote tab — Wojak image is too small and the name/edition label is clipped. Shrink side panels from 220px to 160px, raise the container max-width to 1100px, remove the 480px card cap, and replace the 56px circle icon buttons with full-width pill buttons.

**Architecture:** Two files touched — `src/styles/theme.css` (CSS-only, three targeted edits) and `src/components/game/VoteButtons.tsx` (replace circle icon buttons with pill buttons, add two CSS classes to theme.css). No new files, no new deps, no behavior changes.

**Tech Stack:** React, TypeScript, CSS (theme.css), framer-motion (already imported).

---

## Context Files — Read These First

1. `src/styles/theme.css` — lines 2564–2572 (`.voting-page` grid) and lines 2626–2638 (`.vote-card`)
2. `src/components/game/VoteButtons.tsx` — full file (104 lines)
3. `src/components/game/VotingFeed.tsx` — understand how VoteButtons is rendered (what parent container wraps it)
4. `docs/plans/2026-02-20-vote-page-layout-design.md` — approved design reference

---

## Task 1: Grid + Card CSS — theme.css

**File:** `src/styles/theme.css`

Three targeted edits. Read the file first to confirm line numbers match before editing.

---

**Step 1:** Find `.voting-page` (around line 2564). Change `grid-template-columns` and `max-width`:

```css
/* BEFORE */
.voting-page {
  display: grid;
  grid-template-columns: 220px 1fr 220px;
  gap: 20px;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
  padding: 0 16px;
}

/* AFTER */
.voting-page {
  display: grid;
  grid-template-columns: 160px 1fr 160px;
  gap: 20px;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
  padding: 0 16px;
}
```

---

**Step 2:** Find `.vote-card` (around line 2626). Remove the `max-width: 480px` line:

```css
/* BEFORE */
.vote-card {
  position: relative;
  width: 100%;
  max-width: 480px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  box-shadow: var(--shadow-card);
}

/* AFTER */
.vote-card {
  position: relative;
  width: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  box-shadow: var(--shadow-card);
}
```

---

**Step 3:** Add the two new pill-button classes. Find the end of the `.vote-card` block area (after the `.vote-card` rules). Add these new rules after the existing vote-card group:

```css
/* Vote pill button row */
.vote-buttons-row {
  display: flex;
  gap: 12px;
  width: 100%;
}

.vote-btn-pill {
  flex: 1;
  height: 52px;
  border-radius: 50px;
  font-size: 0.9375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
```

---

**Step 4:** Build check:
```bash
npx tsc --noEmit
```
Expected: no errors (CSS-only change so far, no TS errors).

---

**Step 5:** Commit:
```bash
git add src/styles/theme.css
git commit -m "fix(vote): shrink panels 220→160px, raise container 1000→1100px, uncap card

Side panels reduced from 220px to 160px each.
Container max-width raised from 1000px to 1100px.
Removed max-width: 480px cap from .vote-card.
Added .vote-buttons-row and .vote-btn-pill classes for Task 2."
```

---

## Task 2: Redesign Vote Buttons — VoteButtons.tsx

**File:** `src/components/game/VoteButtons.tsx`

Replace the two 56px circle icon buttons with full-width pill buttons. Keep all keyboard shortcut logic, motion import, and the `disabled` prop behaviour exactly as-is.

---

**Step 1:** Read `src/components/game/VotingFeed.tsx`. Find where `<VoteButtons>` is rendered and what class or layout wraps it. Confirm the parent container allows `width: 100%` to reach the card width. Note it — you may need to remove `items-center` from the parent if it constrains the button row width.

---

**Step 2:** Replace the render in `VoteButtons.tsx`. The SVG icon components (`HeartIcon`, `XIcon`) are no longer needed — remove them. Keep everything above line 77 (imports, interface, keyboard hooks, `tapAnimation`) unchanged.

Replace from line 77 (`return (`) to end of file:

```tsx
  return (
    <div className="vote-buttons-row">
      <motion.button
        className="btn btn-secondary vote-btn-pill"
        onClick={onDislike}
        disabled={disabled}
        aria-label="Pass on this Wojak"
        whileTap={tapAnimation}
      >
        👎 Pass
      </motion.button>

      <motion.button
        className="btn btn-primary vote-btn-pill"
        onClick={onLike}
        disabled={disabled}
        aria-label="Like this Wojak"
        whileTap={tapAnimation}
      >
        ❤️ Like
      </motion.button>
    </div>
  );
}
```

> The outer `flex flex-col items-center gap-2` wrapper is replaced by `.vote-buttons-row` (defined in theme.css). No Tailwind layout on the wrapper — the CSS class handles it.

---

**Step 3:** If Step 1 revealed that `VotingFeed` wraps `<VoteButtons>` in a container with `items-center` (which would constrain `width: 100%`), remove that from the VotingFeed wrapper around VoteButtons only. Do NOT change anything else in VotingFeed.

---

**Step 4:** Build check:
```bash
npx tsc --noEmit
```
Expected: no errors.

---

**Step 5:** Visual verification — open `localhost:5173/fight-club` and click the Vote tab:
- [ ] Side panels are narrower (160px each, noticeably slimmer)
- [ ] Wojak card image is significantly wider (~720px on a 1080px screen)
- [ ] Name + edition label below the card is NOT clipped
- [ ] Two full-width pill buttons visible below the card: "👎 Pass" and "❤️ Like"
- [ ] Pass button uses secondary style (grey/muted), Like button uses primary style (orange)
- [ ] Keyboard shortcuts still work: ← = Pass, → = Like (test on desktop)
- [ ] Swipe/drag on the card still works
- [ ] Mobile (resize to <768px): MobileStatsBar still appears, panels are gone, card is full-width, pill buttons are full-width

---

**Step 6:** Commit:
```bash
git add src/components/game/VoteButtons.tsx
git commit -m "feat(vote): replace circle icon buttons with full-width pill buttons

56px circle icons replaced with pill-shaped btn btn-primary/secondary
buttons spanning the card width. Labels: '👎 Pass' and '❤️ Like'.
Keyboard shortcuts and disabled state unchanged."
```

---

## Success Criteria

- [ ] `tsc --noEmit` passes
- [ ] Side panels are 160px (down from 220px)
- [ ] Container max-width is 1100px (up from 1000px)
- [ ] `.vote-card` has no `max-width` cap
- [ ] Card image is visibly wider on desktop
- [ ] Name/edition label is not clipped
- [ ] Pill buttons span the card width
- [ ] Pass = secondary style, Like = primary style (orange)
- [ ] Keyboard shortcuts work (← Pass, → Like)
- [ ] Swipe gestures on card unchanged
- [ ] Mobile layout unchanged (MobileStatsBar still renders)
- [ ] No `!important` added
- [ ] No inline color values

## Out of Scope

- Do NOT change MiniLeaderboard or VotingStatsPanel content
- Do NOT change SwipeCard drag/swipe logic
- Do NOT change MobileStatsBar
- Do NOT change any other FightClub tab
- Do NOT change the card stack depth effect (3-card scale/opacity)
- Do NOT change VotingFeed beyond removing `items-center` from the VoteButtons wrapper (if needed)

## Report Format

```
DONE: Vote Page Layout
Files changed: [list]
Build: PASS / FAIL
Self-checks:
  - Card wider on desktop (no 480px cap): pass/fail
  - Name/edition not clipped: pass/fail
  - Pill buttons full-width: pass/fail
  - Keyboard shortcuts work: pass/fail
  - Mobile layout unchanged: pass/fail
  - tsc --noEmit: pass/fail
Notes: [anything unexpected — especially if VotingFeed items-center change was needed]
```
