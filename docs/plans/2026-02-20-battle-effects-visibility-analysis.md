# Battle effects visibility — analysis and plan

## Goal

Particle effects (beams, projectiles, slashes, etc.) should be visible during battle playback, similar to clawcombat.com: effects clearly travel from attacker to defender. Currently they are not visible.

---

## Root cause (primary): stacking order

**The particle canvas is drawn behind the fighter cards.**

- **`.battle-canvas`** (particle overlay): `z-index: 10` (theme.css)
- **`.fighter-card`** (left/right fighter frames): `z-index: 15` (battle-arena.css)

Both are `position: absolute` inside `.battle-arena`. The canvas has `inset: 0` and covers the full arena. The two fighter cards sit on the left and right and, with the higher z-index, sit **on top** of the canvas. So:

- Particles are correctly spawned and drawn on the canvas (coordinates, lifecycle, and animation loop are fine).
- The center strip where particles fly (from 0.25 to 0.75 in normalized X) is covered by the two cards and/or the visual “center” is dominated by the cards.
- Result: the user hears sounds and sees damage numbers (which live on/in the cards) but never sees the particle layer, because it is underneath.

**Fix:** Raise the particle layer above the fighter cards so effects render on top. For example: set `.battle-canvas` to `z-index: 20` (or any value > 15). Keep `pointer-events: none` so clicks still hit the cards.

---

## Other factors checked (no change needed for visibility)

1. **Event flow**
   - `playTurns()` is called with `POS_A` / `POS_B` (0.25/0.55 and 0.75/0.55).
   - `attack_anim` events are emitted with `pattern` from `resolveAttackPattern(moveName, category, power, effects)`.
   - `processEvent('attack_anim')` calls `canvas.playAttack(config)` with normalized start/target; only runs when `canvas && event.pattern` (pattern is always set for damaging moves).

2. **Coordinates**
   - Config uses normalized 0–1; `BattleCanvas.playAttack()` multiplies by canvas (or fallback) width/height. Particles use pixel positions; beam length and travel directions are correct.

3. **Canvas size**
   - ResizeObserver sets canvas size from parent; minimum 1×1 to avoid zero buffer.
   - If parent has no size at first attack, `playAttack` applies a 400×300 fallback and sets the canvas buffer to that so drawing isn’t clipped.

4. **Particle logic**
   - `spawnAttack()` delegates to pattern-specific spawners (beam, projectile, slash, etc.); they set `travelSpeed`, `life`, `targetX`/`targetY` where needed; the tick loop updates and draws; beam uses `beamTargetLength` and extends over time. No bug found that would make all effects invisible.

5. **Battle log**
   - Already fixed in a previous step: log entries are built from `TurnResult[]` and passed to `TurnLog`, so move names and damage messages show.

---

## Plan summary

| Item | Action |
|------|--------|
| **Stacking** | Increase `.battle-canvas` z-index above `.fighter-card` (e.g. `z-index: 20`) so the particle layer is on top. |
| **Comment** | Add a short comment in CSS that the canvas must stay above fighter cards for effects to be visible. |
| **Optional** | If any overlay (e.g. effectiveness callout or flash) ever covers effects, ensure it has a higher z-index than the canvas and is only visible when needed. |

No change to playback timing, coordinates, or particle logic is required for basic visibility; the fix is stacking order only.

---

## Success criteria

- During demo battle playback, particle effects (beam, projectile, slash, etc.) are clearly visible traveling from the attacking fighter toward the defender.
- Fighter cards remain clickable; canvas remains non-interactive (`pointer-events: none`).
- Battle log continues to show per-turn move and damage text.
