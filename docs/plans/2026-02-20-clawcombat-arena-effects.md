# ClawCombat → Wojak.ink Battle Arena Effects

## What Was Wrong

1. **Particles were invisible**  
   Playback passes **normalized coordinates (0–1)** (e.g. `0.25`, `0.55`) to `BattleCanvas.playAttack()`. The particle system in `particles.ts` treats those as **pixels**, so particles were spawned in a tiny 1×1 area and never visible.

2. **Shake class mismatch**  
   The playback hook used `screen-shake` / `screen-shake-heavy`; the battle arena is styled with `battle-shake` / `battle-shake-heavy`. The hook now uses the battle-shake classes so the same keyframes apply.

3. **Missing `.damage-weak`**  
   The hook added `damage-weak` for “not very effective”; theme only had `damage-resist`. `.damage-weak` was added (same style as `damage-resist`).

## Fixes Applied

- **BattleCanvas**  
  In `playAttack()`, convert normalized (0–1) `startX/Y` and `targetX/Y` to pixels using the canvas (or parent) size, then call `spawnAttack()` with the pixel config. Particles now spawn and move correctly between the two fighters.

- **useBattlePlayback**  
  - `triggerShake()` now adds `battle-shake` / `battle-shake-heavy` instead of `screen-shake` / `screen-shake-heavy`.  
  - No other logic changes; damage numbers and effectiveness callouts were already using valid classes.

- **theme.css**  
  - `.damage-weak` added with the same styles as `.damage-resist`.

## ClawCombat Reference (Your Copy)

- **Path:** `/Users/abit_hex/ClawCombat`
- **Main files:**  
  - `apps/backend/src/public/css/arena.css` – arena, frames, HP, history, overlays  
  - `apps/backend/src/public/js/battle-ui.js` – timing, HP, damage numbers, shake, flash, callouts  
  - `apps/backend/src/public/js/battle-particles.js` – canvas particle system (patterns, type effects, move overrides)  
  - `apps/backend/src/public/replay.html` – replay layout and playback  
  - `docs/BATTLE-ARENA-HANDOFF.md` – full design and behavior spec

## What Wojak.ink Already Has (Aligned With ClawCombat)

- Arena: gradients, scanlines, circuits, data streams, HUD brackets  
- VS emblem: hexagon, pulse/glow  
- Fighter frames: octagonal clip-path, frame glow, border, inner pulse, corner nodes, frame accents  
- HP: ghost bar, shimmer, low/critical, warning flash, green glow  
- Battle log: panel with header, horizontal tape, turn separators, chip styling  
- Particles: type colors, patterns (beam, projectile, arc, slash, charge, wave, swarm, drain, self_aura, status_drift, burst), power scaling, pattern resolution from move name/category  
- Playback: timeline from turn results, attack_anim → `canvas.playAttack()`, damage numbers, crit text, effectiveness callout, shake, HP updates, audio  
- Screen flash, critical text, effectiveness callouts (theme + battle-arena)

## Optional Next Steps (To Match ClawCombat Even Closer)

1. **Beam pattern**  
   ClawCombat’s beam is a line that **extends** over time (stretch from attacker to defender). Ours is a trail of particles along the path. You could add a “stretching line” particle type in `particles.ts` and use it for the beam pattern.

2. **Move-specific overrides**  
   ClawCombat’s `MOVE_OVERRIDES` map specific move names to patterns (e.g. “Flamethrower” → swarm flames, “Lullaby” → wave with music notes). We have keyword-based `resolveAttackPattern()` but no per-move overrides. Adding a `MOVE_OVERRIDES` in `particles.ts` and using it in `resolveAttackPattern()` would mirror ClawCombat.

3. **Attacker movement (charge / strike)**  
   ClawCombat adds `.charging` / `.striking` to the attacker and syncs CSS animations with travel time. We have the same CSS (charge/strike) and timing; the playback hook could add/remove those classes on the fighter cards when `attack_anim` runs (would require the hook or parent to know the arena’s fighter DOM nodes or to pass a small “attacker movement” callback).

4. **Intro fog**  
   ClawCombat’s `spawnIntroFog()` runs subtle rising mist at battle start. We could add an intro-only spawn in `particles.ts` and call it when playback starts (e.g. from `playTurns` or BattleView when `autoPlay` and first turn begin).

5. **Victory confetti**  
   ClawCombat’s `playVictoryEffect()` adds winner glow, loser fade, and confetti from the winner. We have winner/loser CSS; adding a small confetti burst from the winner position on battle end would match that bit.

## How to Copy “Everything” From ClawCombat

- **Visuals:** Already largely ported (arena.css → battle-arena.css, frame structure, HP, log).  
- **Particles:** Logic ported in `particles.ts`; the only functional bug was the coordinate conversion, now fixed in BattleCanvas.  
- **Behavior:** Replay flow and timing are in `useBattlePlayback` and BattleView; they drive particles, damage numbers, shake, and sound.  
- **To go further:** Implement the optional items above (beam stretch, move overrides, attacker class toggles, intro fog, victory confetti) using ClawCombat’s handoff doc and JS/CSS as reference.
