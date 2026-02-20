# Battle effects and battle log — audit plan

## Goals

1. **Effects:** Particle/attack effects must be visible (like clawcombat.com): beams, projectiles, slashes traveling from attacker to defender.
2. **Battle log:** Show the correct attacks as they execute; new entries appear on the right and flow left.

---

## Part A: Effects audit checklist

### 1. Canvas ref and timing

- **Risk:** `playTurns()` is called from a `useEffect` that runs after mount; if `canvasRef.current` is still null when the first `attack_anim` timer fires (~1s later), `processEvent` will skip `canvas.playAttack()`.
- **Check:** `useBattlePlayback` exposes a ref that is attached to `BattleCanvas`; the ref is set in `useImperativeHandle` when the component mounts. When `playTurns` runs (same effect that calls `playIntroFog` + `playTurns`), the canvas is already in the tree, so the ref should be set by the next frame (`requestAnimationFrame`).
- **Mitigation:** Move the particle canvas **after** the fighter cards in the DOM so it’s the last sibling in the arena and, with a higher z-index, unambiguously on top. Ensure no code path calls `playTurns` before the arena (and canvas) has mounted.

### 2. Canvas size and coordinate system

- **Risk:** Parent has 0×0 size at first paint; `playAttack` uses a 400×300 fallback and sets `canvas.width/height`. Later `ResizeObserver` resizes the canvas to the real arena size; if the animation loop uses a different scale or clear region, particles could be off-screen or cleared incorrectly.
- **Check:** In `playAttack`, pixel config is `startX: config.startX * w` (normalized 0–1 × width). In the tick loop, `drawW = canvas.width / dpr`; we `clearRect(0, 0, drawW, drawH)` and particles use the same pixel space. After a resize, width/height change but particle positions are in absolute pixels—so they stay correct for the current buffer. If the buffer grows (e.g. from 400 to 800), old particles might be in the left half only; new ones use the new size. Acceptable.
- **Mitigation:** Keep the 400×300 fallback when parent rect is 0. Ensure `ResizeObserver` runs so that after layout the canvas matches the arena.

### 3. Stacking order (z-index and DOM order)

- **Risk:** Another layer (fighter cards, scanlines, HUD) sits on top of the canvas and hides particles.
- **Check:** `.battle-canvas` z-index was set to 20; `.fighter-card` is 15. So canvas should be above the cards. If the arena uses multiple stacking contexts or a parent creates a new context, order can differ.
- **Mitigation:** (1) Place `<BattleCanvas />` **after** the two fighter card divs in the JSX so that in the same stacking context it paints last. (2) Set `.battle-canvas` z-index to 25 so it is clearly above all arena overlays (fighter cards 15, HUD 6, scanlines 4).

### 4. Particle spawn and lifecycle

- **Risk:** `spawnAttack()` returns an empty array; or particles die in one frame (e.g. `life` or `step` wrong).
- **Check:** `resolveAttackPattern` always returns a pattern ('beam', 'projectile', 'slash', etc.); `PATTERN_SPAWNERS[pattern]` exists for all. Spawners push particles with positive `life` and, for projectiles, `travelSpeed`. Beam uses `life -= 0.012 * step` so it lasts many frames.
- **Mitigation:** Optional dev-only log in `playAttack`: `console.log('playAttack', pattern, newParticles.length)` to confirm calls and non-zero count. No change to production logic required if audit confirms.

### 5. Animation loop and context

- **Risk:** RequestAnimationFrame loop not running, or 2D context lost.
- **Check:** `useEffect` starts `requestAnimationFrame(tick)`; `tick` clears the canvas, updates and draws particles, then schedules the next frame. Context is from `canvas.getContext('2d')` each frame—no need to re-get unless the canvas is recreated.
- **Mitigation:** None if the above holds. If effects still don’t show, add a one-frame test: in `tick`, draw a large semi-transparent rect to verify the canvas is visible and on top.

---

## Part B: Battle log audit checklist

### 1. Data shape

- **Risk:** `buildTurnLogEntries(battle.turns)` expects `TurnResult[]` with `fighter_a`, `fighter_b`, `order`, `end_of_turn`. If the API or `staticBattleData` uses different keys (e.g. snake_case), events could be empty.
- **Check:** Demo uses `DEMO_TURNS` with `fighter_a`, `fighter_b`; API spreads `JSON.parse(turn_result)` into the turn object, which is written by resolve-turn with the same shape. So the shape is correct.
- **Mitigation:** None if data is correct. If events are missing, add a guard in `buildTurnLogEntries` and a fallback message per turn.

### 2. Showing “attacks as they happen” and right-to-left flow

- **Risk:** The log shows all turns at once; the user wants events to appear as playback progresses, with newest on the right moving left.
- **Check:** Currently `TurnLog` receives `turnLogEntries` built from **all** `battle.turns`. So before playback ends, the user already sees Turn 1–7 and all events. No progressive disclosure.
- **Mitigation:** Drive the log by playback state:
  - From `useBattlePlayback` expose `currentTurn` (index of the turn currently being played).
  - In `BattleView`, when `isPlaying`, pass `turnLogEntries.slice(0, currentTurn + 1)` to `TurnLog` so only turns that have started are shown; when not playing, pass full `turnLogEntries`.
  - TurnLog already lays out groups left-to-right (Turn 1 [chips], Turn 2 [chips], …) and auto-scrolls to `scrollWidth` so the rightmost (newest) is in view. So “new on the right, flow left” is satisfied by showing progressively more turns and scrolling right.

### 3. Event chips visibility

- **Risk:** Chips are present but hidden (overflow, zero height, or contrast).
- **Check:** `.battle-log-tape` is flex row, `overflow-x: auto`; `.battle-log-group` and `.battle-log-chip` have `flex-shrink: 0`. Chips get inline styles from `getChipStyle(event)` (background, border, color). So chips should be visible.
- **Mitigation:** Ensure no parent clips the tape (e.g. `overflow: hidden` without a height). Ensure “Turn N” and chips have a minimum height/line-height so they aren’t collapsed.

---

## Implementation summary

| Item | Action |
|------|--------|
| **Effects** | Move `<BattleCanvas />` to render **after** both fighter cards in the arena JSX. Set `.battle-canvas` z-index to 25. |
| **Battle log** | Use `currentTurn` from `useBattlePlayback`. Pass `turnLogEntries.slice(0, currentTurn + 1)` to `TurnLog` while `isPlaying`; otherwise pass full `turnLogEntries`. Keep TurnLog’s auto-scroll to right on new turns. |
| **Optional** | Add a short comment in BattleView that the canvas must be the last child of the arena so it paints on top. |

---

## Success criteria

- During demo playback, particle effects (beam, projectile, slash, etc.) are clearly visible from attacker toward defender.
- Battle log shows Turn 1, then Turn 2, … as playback advances; each turn’s move/damage chips are visible; newest turn is on the right and view scrolls so the latest is in view.
- After playback completes, the full log remains visible (all turns and events).
