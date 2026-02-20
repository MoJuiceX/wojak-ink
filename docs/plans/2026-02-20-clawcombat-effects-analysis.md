# ClawCombat vs Wojak-Ink Effects — Analysis

## How ClawCombat Does It

### 1. Canvas setup (`battle-particles.js`)

- **Canvas element:** `id="effectCanvas"` in HTML, created up front
- **Init:** `initCanvas()` on DOMContentLoaded gets canvas by ID, gets 2D context, calls `resizeCanvas()`
- **Sizing:** `canvas.width = arena.clientWidth` and `canvas.height = arena.clientHeight` — **no devicePixelRatio**
- **Position:** `#effectCanvas` in CSS: `position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 20`
- **Lobsters:** `z-index: 10` → canvas is above fighters

### 2. Coordinates — critical difference

ClawCombat uses **real DOM positions**, not fixed fractions:

```javascript
function getElementCenter(elementId) {
  var el = document.getElementById(elementId);
  var arenaEl = document.getElementById('arena');
  var arenaRect = arenaEl.getBoundingClientRect();
  var elRect = el.getBoundingClientRect();
  return {
    x: elRect.left - arenaRect.left + elRect.width / 2,
    y: elRect.top - arenaRect.top + elRect.height / 2
  };
}
```

Before each effect, it gets `attackerPos` and `defenderPos` from `getElementCenter('playerLobster')` and `getElementCenter('opponentLobster')`. Those are **pixel coordinates relative to the arena**, so they match the canvas exactly.

### 3. Play flow

1. `playAttackAnimation(moveType, isPlayer, options)` is called
2. Gets `attackerPos` and `defenderPos` from DOM
3. Passes pixel coords straight into `spawnBeam`, `spawnProjectile`, etc.
4. `animateParticles()` runs on-demand when particles exist

---

## Wojak-Ink Current Approach

- **Coordinates:** Fixed normalized `POS_A = {x: 0.25, y: 0.55}` and `POS_B = {x: 0.75, y: 0.55}` regardless of layout
- **Conversion:** `playAttack` multiplies by canvas w/h to get pixels
- **Canvas:** React component, ResizeObserver, uses `devicePixelRatio`
- **Z-index:** Canvas 25, fighters 15 → canvas should be on top

---

## Likely Root Causes

### A. Coordinate mismatch

Fixed 0.25/0.75 may not match where the fighter cards actually are. Wojak fighter cards use `left: 30px`, `right: 30px` and different widths than ClawCombat’s 300px lobsters. The true centers can differ from 25% and 75% of the arena width. Effects may render in empty space or be offset enough that they look wrong or are clipped.

### B. DPR and scaling

Wojak uses `canvas.width = w * dpr` and `ctx.scale(dpr, dpr)`. Particle positions are in CSS pixels, so with scaling they should be fine. If there’s a bug in when or how we apply DPR, particles could be drawn off-canvas or scaled wrong.

### C. Canvas not ready on first effect

On first load, layout can lag. If the first `playAttack` runs before the canvas has non-zero size, we use a 400×300 fallback, but `ResizeObserver` might later resize and change the coordinate system. ClawCombat avoids this by sizing the canvas directly from the arena and not using DPR.

---

## Recommended Fixes (in order)

### 1. Match ClawCombat: use DOM positions

Compute start/target positions from the fighter card elements, then convert to normalized or pixel coords for the particle system.

In `BattleView`, before calling `playTurns`, derive positions:

```javascript
function getFighterPositions(arena: HTMLDivElement | null): { posA: FighterPosition; posB: FighterPosition } | null {
  if (!arena) return null;
  const player = arena.querySelector('.fighter-card.player');
  const opponent = arena.querySelector('.fighter-card.opponent');
  if (!player || !opponent) return null;
  const arenaRect = arena.getBoundingClientRect();
  const playerRect = (player as HTMLElement).getBoundingClientRect();
  const opponentRect = (opponent as HTMLElement).getBoundingClientRect();
  const w = arenaRect.width;
  const h = arenaRect.height;
  if (w <= 0 || h <= 0) return null;
  return {
    posA: {
      x: (playerRect.left - arenaRect.left + playerRect.width / 2) / w,
      y: (playerRect.top - arenaRect.top + playerRect.height / 2) / h,
    },
    posB: {
      x: (opponentRect.left - arenaRect.left + opponentRect.width / 2) / w,
      y: (opponentRect.top - arenaRect.top + opponentRect.height / 2) / h,
    },
  };
}
```

Use these positions for `playTurns`, or pass them to `playAttack` instead of fixed `POS_A`/`POS_B`. Fall back to `POS_A`/`POS_B` if `getFighterPositions` returns null.

### 2. Optional: drop DPR for the effects canvas

To mirror ClawCombat and reduce scaling bugs, use `canvas.width = arena.clientWidth` and `canvas.height = arena.clientHeight` without DPR. This can make effects a bit soft on high-DPI screens but should behave more predictably.

### 3. Ensure playback waits for layout

Before starting demo playback, wait until the arena has size and fighter cards are present, e.g.:

- Call `getFighterPositions(arenaRef.current)` and only run `playTurns` when it returns non-null.
- Or use `requestAnimationFrame` (or a short `setTimeout`) to let layout complete before the first `playAttack`.

---

## Summary

| Aspect              | ClawCombat              | Wojak-Ink                 |
|---------------------|-------------------------|---------------------------|
| Positions           | DOM via `getElementCenter` | Fixed (0.25, 0.75)        |
| Canvas sizing       | `arena.clientWidth`     | ResizeObserver + DPR      |
| Canvas z-index      | 20 (above lobsters 10)   | 25 (above fighters 15)    |
| Init                | Explicit on load        | React ref + ResizeObserver |

The most likely issue is the fixed coordinates, which can misalign effects with the actual fighter positions. Switching to DOM-based positions, as in ClawCombat, should fix the behavior.
