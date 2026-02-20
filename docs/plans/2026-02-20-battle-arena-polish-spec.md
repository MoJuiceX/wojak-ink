# Battle Arena Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three visual bugs in the battle arena demo: left fighter incorrect low opacity, right fighter not mirrored, and replace the vertical turn log with a horizontal sliding chip ticker like ClawCombat.

**Architecture:** Three independent changes — (1) BattleView.tsx: guard loser/winner CSS classes behind a playback-complete state in autoPlay mode, (2) battle-arena.css: add `scaleX(-1)` to opponent idle base + counter-flip HP container text, (3) TurnLog.tsx + battle-arena.css: redesign from vertical list to horizontal scrolling ticker.

**Tech Stack:** React, TypeScript, CSS (battle-arena.css), no new dependencies.

---

## Context Files — Read These First

1. `src/components/combat/BattleView.tsx` — lines 348–355 (winner/loser class logic), lines 436–635 (fighter-card JSX)
2. `src/styles/battle-arena.css` — lines 260–284 (fighter-card base), lines 661–726 (attacking/hit/faint/loser states), lines 387–406 (hp-container)
3. `src/components/combat/TurnLog.tsx` — full file (72–103, the render)
4. `src/lib/combat/demo-battle.ts` — note `status: 'completed'` — this is the root cause of Issue 1
5. `docs/plans/2026-02-20-battle-demo-design.md` — approved design reference

**Reference:** `/Users/abit_hex/ClawCombat/apps/backend/src/public/css/arena.css` — ClawCombat's `.opponent-lobster` base and `.battle-history-panel` for visual targets

---

## Issue 1 Root Cause — Read This First

`DEMO_BATTLE.status = 'completed'` means `isComplete = true` from the moment `BattleView` mounts. `BattleView` lines 349–355 immediately set `playerImgClass = 'loser-fade'` on Fighter A. The `.loser-fade` animation uses `forwards` fill — it plays once (0.8s) and Fighter A stays at `opacity: 0.4, grayscale` for the entire demo.

Fix: in `autoPlay` mode, only apply winner/loser CSS classes after playback animation has finished.

---

## Task 1: Fix Loser-Fade on Mount — BattleView.tsx

**File:** `src/components/combat/BattleView.tsx`

**Step 1:** Read lines 165–215 (where callbacks and hooks are set up) and lines 345–360 (where `isComplete`, `playerImgClass`, `opponentImgClass` are defined). Understand the existing callback wiring.

**Step 2:** Add a `playbackDone` state. Find the line where other `useState` calls are at the top of the component:

```tsx
const [playbackDone, setPlaybackDone] = useState(false);
```

**Step 3:** Find where `callbacks` object is built (the object passed to `useBattlePlayback`). It will have an `onComplete` handler. Wrap it to also set `playbackDone`:

```tsx
// Find the existing callbacks object (may be defined with useMemo or inline)
// Add setPlaybackDone to the onComplete handler:
const callbacks: PlaybackCallbacks = useMemo(() => ({
  // ... keep all existing handlers unchanged ...
  onComplete: () => {
    setPlaybackDone(true);
    // call any existing onComplete logic that was already there
    onDemoComplete?.();
  },
}), [...existing deps..., onDemoComplete]);
```

> ⚠️ Do NOT change any existing handlers. Only extend `onComplete` to also call `setPlaybackDone(true)`. If `onDemoComplete` is already called elsewhere, keep it there too — just add the `setPlaybackDone`.

**Step 4:** Find lines 349–355 (the winner/loser class computation). Change `isComplete` to use an effective value that respects autoPlay mode:

```tsx
// Before:
const isPlayerWinner = isComplete && battle.winner === playerNftId;
const isOpponentWinner = isComplete && battle.winner != null && battle.winner !== playerNftId;

// After:
// In autoPlay mode, don't show winner/loser state until animation finishes
const isEffectivelyComplete = autoPlay ? playbackDone : isComplete;
const isPlayerWinner = isEffectivelyComplete && battle.winner === playerNftId;
const isOpponentWinner = isEffectivelyComplete && battle.winner != null && battle.winner !== playerNftId;
```

> `autoPlay` is a prop on BattleView. Check its type definition and usage in the file to confirm the exact prop name.

**Step 5:** Build check:
```bash
npx tsc --noEmit
```
Expected: no new errors.

**Step 6:** Manual verification — open `localhost:5178/fight-club/battle`:
- Fighter A (FIRE #42) should be **fully opaque and vibrant** throughout the demo
- Only after Turn 7's KO does Fighter A fade out
- After the battle ends (winner glow + loser fade), demo auto-restarts in 3s and both fighters are vibrant again

**Step 7:** Commit:
```bash
git add src/components/combat/BattleView.tsx
git commit -m "fix(battle): defer loser-fade to after playback in autoPlay mode

DEMO_BATTLE.status='completed' caused Fighter A to immediately
receive loser-fade on mount. Guard winner/loser classes behind
playbackDone state that only sets true when animation finishes."
```

---

## Task 2: Mirror Opponent Fighter — battle-arena.css

**File:** `src/styles/battle-arena.css`

The right fighter needs to face LEFT (toward center) in idle state.
All attack/charge/faint/hit animations already include `scaleX(-1)` — only the base idle transform is missing it.

**Step 1:** Find `.fighter-card.opponent` (lines 280–283). Change:

```css
/* BEFORE */
.fighter-card.opponent {
  top: 50%;
  right: 30px;
  transform: translateY(-50%);
}

/* AFTER */
.fighter-card.opponent {
  top: 50%;
  right: 30px;
  transform: translateY(-50%) scaleX(-1);
}
```

**Step 2:** Add HP container counter-flip so the text/badges inside are readable (not mirrored). Find `.hp-container` (lines 387–406). Add a new rule after it:

```css
/* Counter-flip opponent HP container so text reads correctly */
.fighter-card.opponent .hp-container {
  transform: scaleX(-1);
}
```

**Step 3:** Add the intro slide-in animation for opponent. Search for `slideInRight` keyframes or `.fighter-card.opponent` intro animation. If it exists, ensure it includes `scaleX(-1)` at every keyframe. If it does NOT exist, no change needed (the fighter appears without slide-in).

> Look for: `@keyframes slideInRight` and `.fighter-card.opponent` intro class. If found, add `scaleX(-1)` to each `from`/`to`/percentage transform that doesn't already have it.

**Step 4:** Build check:
```bash
npx tsc --noEmit
```
Expected: no errors (CSS-only change, no TS errors).

**Step 5:** Visual verification — open `localhost:5178/fight-club/battle`:
- Right fighter (#88 WATER) should face **left** (toward center), mirrored horizontally
- HP bar, type badge, and edition number text should still read **left-to-right** (not mirrored)
- Attack animations should still work — fighter charges toward center and returns
- Faint animation should work correctly (falls down, not flipped unexpectedly)

**Step 6:** Commit:
```bash
git add src/styles/battle-arena.css
git commit -m "fix(battle): mirror opponent fighter to face center

Add scaleX(-1) to .fighter-card.opponent base idle transform.
Counter-flip HP container so text/badges remain readable.
All attack/charge/faint animations already included scaleX(-1)."
```

---

## Task 3: Horizontal Sliding Battle Log

Replace the vertical turn list with a horizontal scrolling chip ticker. New events slide in from the right and push older events left — like ClawCombat's `.battle-history-panel`.

### 3A: Redesign TurnLog Component

**File:** `src/components/combat/TurnLog.tsx`

**Step 1:** Read the full current file to understand TurnEntry and TurnEvent types. Keep the same interface — do NOT change the data structures, only change the rendering.

**Step 2:** Replace the render function with a horizontal layout. Replace the file content:

```tsx
/**
 * TurnLog — horizontal scrolling battle chip ticker.
 * New events slide in from the right, older events pushed left.
 * Modelled after ClawCombat's battle history panel.
 */

import { useRef, useState, useEffect } from 'react';

interface TurnEvent {
  type: string;
  message?: string;
  damage?: number;
  effectiveness?: string;
  isCrit?: boolean;
}

interface TurnEntry {
  turn: number;
  events?: TurnEvent[];
  end_of_turn?: {
    fighter_a_hp: number;
    fighter_b_hp: number;
  };
}

interface TurnLogProps {
  turns: TurnEntry[];
  maxHeight?: string; // kept for API compatibility, unused in horizontal layout
}

/**
 * Determine chip style based on event type.
 * type containing 'a' or 'player' = player side (blue tint).
 * type containing 'b' or 'opponent' = opponent side (orange/red tint).
 */
function getChipStyle(event: TurnEvent): React.CSSProperties {
  const t = event.type?.toLowerCase() ?? '';
  const isOpponent = t.includes('_b') || t.includes('opponent');
  const isCrit = event.isCrit;
  const isSuperEffective = event.effectiveness === 'super_effective';

  if (isCrit) {
    return {
      background: 'rgba(251, 191, 36, 0.15)',
      borderLeft: '2px solid rgba(251, 191, 36, 0.7)',
      color: 'rgba(255, 255, 255, 0.9)',
    };
  }
  if (isSuperEffective) {
    return {
      background: 'rgba(34, 197, 94, 0.15)',
      borderLeft: '2px solid rgba(34, 197, 94, 0.6)',
      color: 'rgba(255, 255, 255, 0.85)',
    };
  }
  if (isOpponent) {
    return {
      background: 'rgba(239, 68, 68, 0.1)',
      borderLeft: '2px solid rgba(239, 68, 68, 0.4)',
      color: 'rgba(255, 255, 255, 0.8)',
    };
  }
  // Player side (default)
  return {
    background: 'rgba(59, 130, 246, 0.1)',
    borderLeft: '2px solid rgba(59, 130, 246, 0.4)',
    color: 'rgba(255, 255, 255, 0.8)',
  };
}

export function TurnLog({ turns }: TurnLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [prevTurnCount, setPrevTurnCount] = useState(0);

  // Auto-scroll to rightmost (newest) entry on new turns
  useEffect(() => {
    if (turns.length > prevTurnCount) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
      });
      setPrevTurnCount(turns.length);
    }
  }, [turns, prevTurnCount]);

  if (turns.length === 0) {
    return (
      <div
        style={{
          minHeight: '52px',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '12px',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Battle starting...
        </span>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="battle-log-tape"
    >
      {turns.map((turn, turnIdx) => (
        <div key={turn.turn} className="battle-log-group">
          {/* Turn separator chip */}
          <div className="battle-log-turn-sep">
            Turn {turn.turn}
          </div>

          {/* Event chips */}
          {turn.events?.map((event, i) => {
            const isNewest = turnIdx === turns.length - 1;
            return (
              <div
                key={i}
                className={`battle-log-chip${isNewest ? ' battle-log-chip-new' : ''}`}
                style={getChipStyle(event)}
              >
                {event.message ?? `${event.type}: ${event.damage ?? 0} dmg`}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

### 3B: Add Horizontal Log CSS

**File:** `src/styles/battle-arena.css`

Find the `.battle-log` section (search for `.battle-log {`). After the existing `.battle-log-content` rules, add these new rules:

```css
/* ─── Horizontal battle log tape ─────────────────────────────── */

.battle-log-tape {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 10px 14px;
  min-height: 52px;
  scroll-behavior: smooth;
  /* Hide scrollbar on all browsers */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.battle-log-tape::-webkit-scrollbar {
  display: none;
}

/* Group = turn separator + its event chips */
.battle-log-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* "Turn N" pill separator */
.battle-log-turn-sep {
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;
}

/* Individual event chip */
.battle-log-chip {
  flex-shrink: 0;
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 6px;
  white-space: nowrap;
  line-height: 1.4;
  /* Default colours overridden by inline style from getChipStyle() */
  background: rgba(255, 255, 255, 0.05);
  border-left: 2px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.75);
}

/* Slide in from right for newest turn's chips */
.battle-log-chip-new {
  animation: chipSlideIn 0.3s ease-out;
}

@keyframes chipSlideIn {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

**Step 3:** Build check:
```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 4:** Visual verification — open `localhost:5178/fight-club/battle`:
- Below the arena: a horizontal strip showing turn events as chips
- "Turn 1" separator pill → blue/orange event chips → "Turn 2" separator → chips...
- As battle progresses, new chips appear from the right and the tape scrolls right
- No vertical scrollbar visible
- No overflow outside the container
- On mobile (narrow viewport): tape scrolls horizontally, no wrapping

**Step 5:** Commit:
```bash
git add src/components/combat/TurnLog.tsx src/styles/battle-arena.css
git commit -m "feat(battle): horizontal sliding battle log chip ticker

Replace vertical turn list with horizontal scrolling tape.
New events slide in from right, auto-scroll to newest.
Blue tint for player moves, red for opponent, gold for crits,
green for super-effective. Matches ClawCombat pattern."
```

---

## Success Criteria

- [ ] `tsc --noEmit` passes
- [ ] Fighter A (FIRE, left) is fully opaque and vibrant throughout the entire demo battle
- [ ] Fighter A only fades out at Turn 7 KO, then demo restarts and both are vibrant again
- [ ] Fighter B (WATER, right) faces LEFT (mirrored) in idle state
- [ ] Fighter B HP bar text, edition number, and type badge read left-to-right (not mirrored)
- [ ] Attack animations still work for both fighters (charge toward center, return)
- [ ] Battle log is horizontal: event chips visible below the arena
- [ ] New chips slide in from the right
- [ ] Turn separator pills visible between each turn's events
- [ ] Horizontal tape scrolls — no vertical list visible
- [ ] Mobile: no horizontal overflow breaking layout
- [ ] No `!important` added

## Out of Scope

- Do NOT change fight images, demo data turn structure, or move names
- Do NOT change BattleCanvas, DamageNumber, or audio
- Do NOT modify BattleTeaser or DemoBattle (those were done in the previous spec)
- Do NOT change the speed buttons (0.5x / 1x / 2x / 4x)
- Do NOT touch any non-battle components

## Report Format

```
DONE: Battle Arena Polish
Files changed: [list]
Build: PASS / FAIL
Self-checks:
  - Fighter A fully opaque during demo: pass/fail
  - Fighter B mirrored facing left: pass/fail
  - HP container text readable (not mirrored): pass/fail
  - Horizontal battle log renders: pass/fail
  - New chips slide in from right: pass/fail
  - tsc --noEmit: pass/fail
Notes: [anything unexpected — especially if damage numbers appeared mirrored after scaleX fix]
```
