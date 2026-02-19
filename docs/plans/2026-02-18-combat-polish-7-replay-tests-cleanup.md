# Combat Polish Phase 7: Animated Replay, E2E Tests & Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the basic BattleReplay from a static prev/next stepper into a fully animated replay using the existing `useBattlePlayback` hook + `BattleCanvas`; expand the Playwright E2E test suite from smoke-only to meaningful coverage; fix remaining small issues (ability descriptions referencing Pokemon type names, `poke_` move ID prefixes in test fixtures, XP progress display).

**Architecture:** Rewrite `BattleReplay` to reuse the same animated playback stack that `BattleView` uses (`useBattlePlayback`, `BattleCanvas`, `DamageNumber`, `StatusIcon`, `EffectivenessCallout`, audio). Add a "watch mode" that auto-plays all turns, alongside manual step-through. Expand Playwright tests to cover battle detail page, replay, leaderboard, and history. Fix miscellaneous data inconsistencies.

**Tech Stack:** React, TypeScript, Vitest, Playwright, Web Audio API, Canvas 2D

**Reference Files:**
- Existing replay: `src/components/combat/BattleReplay.tsx` (basic step-through, hardcoded maxHP)
- Animated battle: `src/components/combat/BattleView.tsx` (full animation reference)
- Playback hook: `src/hooks/useBattlePlayback.ts` (timeline builder + event executor)
- Canvas system: `src/components/combat/BattleCanvas.tsx`
- Audio: `src/lib/combat/audio.ts` (BattleAudio singleton)
- Overlays: `src/components/combat/DamageNumber.tsx`, `StatusIcon.tsx`, `EffectivenessCallout.tsx`
- HP calc: `src/lib/combat/stat-calculator.ts` (calculateHP, calculateAllStats)
- Base stats: `src/lib/combat/data/base-stats.ts` (per-type HP values)
- Abilities data: `src/lib/combat/data/abilities.ts`
- Moves data: `src/lib/combat/data/moves.ts`
- E2E tests: `tests/combat.spec.ts` (currently 4 smoke tests)
- Battle API: `functions/api/combat/battle.ts`
- History API: `functions/api/combat/history.ts`

**Test Commands:**
- TypeScript: `npx tsc --noEmit`
- Unit: `npx vitest run src/lib/combat/`
- E2E: `npx playwright test tests/combat.spec.ts`

**IMPORTANT:** This spec depends on Spec 6 being completed first (battle route + auth wiring). Read Spec 6 output before starting.

---

## IMPORTANT: Read Before Starting

1. Read `src/components/combat/BattleView.tsx` — this is the REFERENCE for how animated playback works
2. Read `src/hooks/useBattlePlayback.ts` — understand the timeline/event system
3. Read `src/components/combat/BattleReplay.tsx` — this is what you're replacing
4. Read `src/lib/combat/stat-calculator.ts` — for proper HP calculation
5. Read `tests/combat.spec.ts` — understand current E2E coverage
6. Commit after each task

---

### Task 1: Rewrite BattleReplay with animated playback

**Files:**
- Modify: `src/components/combat/BattleReplay.tsx`

**Step 1: Read the current BattleReplay.tsx**

Read it in full. Note:
- It uses basic `useState` + prev/next buttons
- `maxHP_A = 100` and `maxHP_B = 100` are hardcoded placeholders
- No particles, no audio, no damage numbers, no status icons
- No auto-play mode

**Step 2: Read BattleView.tsx to understand the animation pattern**

Note how BattleView:
- Uses `useBattlePlayback(callbacks)` to get `{ isPlaying, canvasRef, arenaRef, playTurns, speed, setSpeed }`
- Manages HP with ghost tracking: `useState<{ current: number; ghost: number }>`
- Shows DamageNumber, StatusIcon, EffectivenessCallout overlays
- Has screen shake and flash classes
- Preloads audio via `getBattleAudio().preload()`
- Uses `BattleCanvas` with ref for particle overlay

**Step 3: Rewrite BattleReplay.tsx**

Replace the entire file with:

```tsx
/**
 * BattleReplay — animated battle replay with canvas particles, audio, and auto-play.
 *
 * Reuses the same playback engine as BattleView (useBattlePlayback + BattleCanvas).
 * Supports two modes:
 * - Auto-play: watches all turns with full animation
 * - Step-through: manual prev/next (no animation, instant state jumps)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { HPBar } from './HPBar';
import { TurnLog } from './TurnLog';
import { BattleCanvas } from './BattleCanvas';
import { DamageNumber } from './DamageNumber';
import { StatusIcon } from './StatusIcon';
import { EffectivenessCallout } from './EffectivenessCallout';
import { useBattlePlayback } from '@/hooks/useBattlePlayback';
import { getBattleAudio } from '@/lib/combat/audio';
import { getBaseStats } from '@/lib/combat/data/base-stats';
import { calculateHP } from '@/lib/combat/stat-calculator';
import type { CombatType } from '@/lib/combat/types';
import type { TurnResult } from '@/lib/combat/battle-state';

// ── Interfaces ──────────────────────────────────────────────────────────────

interface FighterInfo {
  nft_id: string;
  type: CombatType;
  nature: string;
  ability: string;
  level: number;
  elo: number;
  imageUrl?: string;
}

interface BattleData {
  id: number;
  status: string;
  currentTurn: number;
  maxTurns: number;
  winner: string | null;
  fighterA: FighterInfo | null;
  fighterB: FighterInfo | null;
  turns: TurnResult[];
  eloChangeA?: number;
  eloChangeB?: number;
  xpAwardedA?: number;
  xpAwardedB?: number;
  startedAt?: string;
  endedAt?: string;
}

interface BattleReplayProps {
  battleId: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeMaxHP(type: CombatType, level: number): number {
  const base = getBaseStats(type);
  return calculateHP(base.hp, level);
}

const POS_A = { x: 0.25, y: 0.55 };
const POS_B = { x: 0.75, y: 0.55 };

// ── Component ───────────────────────────────────────────────────────────────

export function BattleReplay({ battleId }: BattleReplayProps) {
  // ── Core state ──────────────────────────────────────────────────────────
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'auto' | 'step'>('auto');
  const [stepIndex, setStepIndex] = useState(0);

  // ── HP state with ghost tracking (for auto mode) ──────────────────────
  const [hpA, setHpA] = useState<{ current: number; ghost: number }>({ current: 0, ghost: 0 });
  const [hpB, setHpB] = useState<{ current: number; ghost: number }>({ current: 0, ghost: 0 });

  // ── Status state ──────────────────────────────────────────────────────
  const [statusA, setStatusA] = useState<string | null>(null);
  const [statusB, setStatusB] = useState<string | null>(null);

  // ── Visual overlay state ──────────────────────────────────────────────
  type DamageEntry = { id: string; value: number | string; type: 'normal' | 'crit' | 'heal' | 'super-effective' | 'immune'; side: 'a' | 'b' };
  type CalloutEntry = { id: string; type: 'super_effective' | 'not_very_effective' | 'immune' };
  const [damageNumbers, setDamageNumbers] = useState<DamageEntry[]>([]);
  const [callouts, setCallouts] = useState<CalloutEntry[]>([]);
  const [shakeClass, setShakeClass] = useState('');
  const [flashClass, setFlashClass] = useState('');

  const removeDamageNumber = useCallback((id: string) => {
    setDamageNumbers(prev => prev.filter(d => d.id !== id));
  }, []);

  const removeCallout = useCallback((id: string) => {
    setCallouts(prev => prev.filter(c => c.id !== id));
  }, []);

  // ── Playback callbacks ────────────────────────────────────────────────
  const autoPlayComplete = useRef(false);

  const callbacks = useMemo(() => ({
    onHpUpdate: (side: 'a' | 'b', hp: number, _maxHp: number) => {
      if (side === 'a') {
        setHpA(prev => ({ current: Math.max(0, hp), ghost: prev.current }));
      } else {
        setHpB(prev => ({ current: Math.max(0, hp), ghost: prev.current }));
      }
    },
    onStatusChange: (side: 'a' | 'b', status: string | null) => {
      if (side === 'a') setStatusA(status);
      else setStatusB(status);
    },
    onDamage: (side: 'a' | 'b', amount: number, isCrit: boolean, effectiveness: string) => {
      const dmgType = isCrit ? 'crit' as const
        : effectiveness === 'super_effective' ? 'super-effective' as const
        : effectiveness === 'immune' ? 'immune' as const
        : 'normal' as const;
      setDamageNumbers(prev => [...prev, {
        id: `dmg-${Date.now()}-${Math.random()}`,
        value: amount,
        type: dmgType,
        side,
      }]);

      const intensity = isCrit ? 'battle-shake-heavy' : amount > 30 ? 'battle-shake' : 'battle-shake-light';
      setShakeClass(intensity);
      setTimeout(() => setShakeClass(''), 500);

      if (isCrit) {
        setFlashClass('battle-flash-overlay battle-flash-crit');
        setTimeout(() => setFlashClass(''), 400);
      } else if (effectiveness === 'super_effective') {
        setFlashClass('battle-flash-overlay battle-flash-super-effective');
        setTimeout(() => setFlashClass(''), 400);
      }

      if (effectiveness && effectiveness !== 'neutral') {
        setCallouts(prev => [...prev, {
          id: `eff-${Date.now()}-${Math.random()}`,
          type: effectiveness as CalloutEntry['type'],
        }]);
      }
    },
    onComplete: () => {
      autoPlayComplete.current = true;
    },
  }), []);

  const {
    isPlaying,
    canvasRef,
    arenaRef,
    playTurns,
    speed,
    setSpeed,
  } = useBattlePlayback(callbacks);

  // ── Audio preload ─────────────────────────────────────────────────────
  const audioPreloaded = useRef(false);
  useEffect(() => {
    if (!audioPreloaded.current) {
      audioPreloaded.current = true;
      getBattleAudio().preload();
    }
  }, []);

  // ── Fetch battle data ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/combat/battle?id=${battleId}`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
        setBattle(data);
      } catch {
        setError('Failed to load battle');
      }
    })();
  }, [battleId]);

  // ── Computed maxHP ────────────────────────────────────────────────────
  const maxHpA = battle?.fighterA
    ? computeMaxHP(battle.fighterA.type, battle.fighterA.level)
    : 100;
  const maxHpB = battle?.fighterB
    ? computeMaxHP(battle.fighterB.type, battle.fighterB.level)
    : 100;

  // ── Initialize HP when battle loads ───────────────────────────────────
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!battle || initializedRef.current) return;
    initializedRef.current = true;
    setHpA({ current: maxHpA, ghost: maxHpA });
    setHpB({ current: maxHpB, ghost: maxHpB });
  }, [battle, maxHpA, maxHpB]);

  // ── Auto-play: start animated playback once battle + fighters loaded ──
  const autoPlayStarted = useRef(false);
  useEffect(() => {
    if (mode !== 'auto') return;
    if (!battle || autoPlayStarted.current) return;
    if (!battle.fighterA || !battle.fighterB) return;
    if (battle.turns.length === 0) return;

    autoPlayStarted.current = true;
    playTurns(battle.turns, battle.fighterA.type, battle.fighterB.type, POS_A, POS_B);
  }, [mode, battle, playTurns]);

  // ── Step mode: compute snapshot state for current step ────────────────
  const stepTurn = battle?.turns[stepIndex] ?? null;
  const stepHpA = mode === 'step' && stepTurn
    ? stepTurn.end_of_turn.fighter_a_hp
    : hpA.current;
  const stepHpB = mode === 'step' && stepTurn
    ? stepTurn.end_of_turn.fighter_b_hp
    : hpB.current;
  const stepStatusA = mode === 'step' && stepTurn
    ? stepTurn.end_of_turn.fighter_a_status
    : statusA;
  const stepStatusB = mode === 'step' && stepTurn
    ? stepTurn.end_of_turn.fighter_b_status
    : statusB;

  const goNext = useCallback(() => {
    if (battle && stepIndex < battle.turns.length - 1) {
      setStepIndex(s => s + 1);
    }
  }, [battle, stepIndex]);

  const goPrev = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex(s => s - 1);
    }
  }, [stepIndex]);

  // ── Switch mode handler ───────────────────────────────────────────────
  const switchToStep = useCallback(() => {
    setMode('step');
    setStepIndex(0);
  }, []);

  const switchToAuto = useCallback(() => {
    setMode('auto');
    autoPlayStarted.current = false;
    autoPlayComplete.current = false;
    initializedRef.current = false;
    setHpA({ current: maxHpA, ghost: maxHpA });
    setHpB({ current: maxHpB, ghost: maxHpB });
    setStatusA(null);
    setStatusB(null);
    setDamageNumbers([]);
    setCallouts([]);
  }, [maxHpA, maxHpB]);

  // ── Error state ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="card-static p-4 text-center text-error text-sm">{error}</div>
    );
  }

  if (!battle) {
    return <div className="text-muted text-sm text-center py-4">Loading replay...</div>;
  }

  const turns = battle.turns ?? [];

  // ── Resolve display HP/status based on mode ───────────────────────────
  const displayHpA = mode === 'step' ? stepHpA : hpA.current;
  const displayHpB = mode === 'step' ? stepHpB : hpB.current;
  const displayGhostA = mode === 'step' ? stepHpA : hpA.ghost;
  const displayGhostB = mode === 'step' ? stepHpB : hpB.ghost;
  const displayStatusA = mode === 'step' ? stepStatusA : statusA;
  const displayStatusB = mode === 'step' ? stepStatusB : statusB;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          Battle #{battleId} Replay
        </h3>
        <div className="flex items-center gap-2">
          <button
            className={`btn btn-ghost text-xs ${mode === 'auto' ? 'text-accent' : ''}`}
            onClick={switchToAuto}
            disabled={isPlaying}
          >
            Watch
          </button>
          <button
            className={`btn btn-ghost text-xs ${mode === 'step' ? 'text-accent' : ''}`}
            onClick={switchToStep}
            disabled={isPlaying}
          >
            Step
          </button>
        </div>
      </div>

      {/* ── Battle Arena (auto mode with animations) ─────────────────── */}
      {mode === 'auto' && (
        <>
          <div
            ref={arenaRef}
            className={`battle-arena battle-scanlines ${shakeClass}`}
          >
            <BattleCanvas ref={canvasRef} />

            {flashClass && <div className={flashClass} />}

            {callouts.map(c => (
              <EffectivenessCallout
                key={c.id}
                id={c.id}
                type={c.type}
                onComplete={() => removeCallout(c.id)}
              />
            ))}

            <div className="grid grid-cols-2 gap-4 p-4" style={{ position: 'relative', zIndex: 2 }}>
              {/* Fighter A */}
              <div className="flex flex-col gap-2" style={{ position: 'relative' }}>
                {battle.fighterA?.imageUrl && (
                  <div className="battle-nft-image battle-slide-left">
                    <img
                      src={battle.fighterA.imageUrl}
                      alt="Fighter A"
                      className="w-full h-full object-cover"
                      style={{ borderRadius: 'var(--radius-md)' }}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`badge badge-${battle.fighterA?.type.toLowerCase()}`}>
                      {battle.fighterA?.type}
                    </span>
                    <StatusIcon status={displayStatusA} />
                  </div>
                  <span className="text-xs text-muted">Lv.{battle.fighterA?.level}</span>
                </div>
                <HPBar current={displayHpA} max={maxHpA} ghost={displayGhostA} label="HP" />
                {damageNumbers
                  .filter(d => d.side === 'a')
                  .map(d => (
                    <DamageNumber
                      key={d.id}
                      id={d.id}
                      value={d.value}
                      type={d.type}
                      onComplete={() => removeDamageNumber(d.id)}
                    />
                  ))}
              </div>

              {/* Fighter B */}
              <div className="flex flex-col gap-2" style={{ position: 'relative' }}>
                {battle.fighterB?.imageUrl && (
                  <div className="battle-nft-image battle-slide-right">
                    <img
                      src={battle.fighterB.imageUrl}
                      alt="Fighter B"
                      className="w-full h-full object-cover"
                      style={{ borderRadius: 'var(--radius-md)' }}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`badge badge-${battle.fighterB?.type.toLowerCase()}`}>
                      {battle.fighterB?.type}
                    </span>
                    <StatusIcon status={displayStatusB} />
                  </div>
                  <span className="text-xs text-muted">Lv.{battle.fighterB?.level}</span>
                </div>
                <HPBar current={displayHpB} max={maxHpB} ghost={displayGhostB} label="HP" />
                {damageNumbers
                  .filter(d => d.side === 'b')
                  .map(d => (
                    <DamageNumber
                      key={d.id}
                      id={d.id}
                      value={d.value}
                      type={d.type}
                      onComplete={() => removeDamageNumber(d.id)}
                    />
                  ))}
              </div>
            </div>
          </div>

          {/* Speed control */}
          {isPlaying && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-muted">Speed:</span>
              {[0.5, 1, 2, 4].map((s) => (
                <button
                  key={s}
                  className={`btn btn-ghost text-xs ${speed === s ? 'text-accent' : ''}`}
                  onClick={() => setSpeed(s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Step Mode (manual turn-by-turn) ──────────────────────────── */}
      {mode === 'step' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className={`badge badge-${battle.fighterA?.type.toLowerCase()}`}>
                  {battle.fighterA?.type}
                </span>
                <StatusIcon status={displayStatusA} />
                <span className="text-xs text-muted">Lv.{battle.fighterA?.level}</span>
              </div>
              <HPBar current={displayHpA} max={maxHpA} label="HP" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className={`badge badge-${battle.fighterB?.type.toLowerCase()}`}>
                  {battle.fighterB?.type}
                </span>
                <StatusIcon status={displayStatusB} />
                <span className="text-xs text-muted">Lv.{battle.fighterB?.level}</span>
              </div>
              <HPBar current={displayHpB} max={maxHpB} label="HP" />
            </div>
          </div>

          {/* Turn events for current step */}
          {stepTurn && (
            <div className="card-static p-3 flex flex-col gap-1 text-sm">
              <div className="text-xs text-muted mb-1">Turn {stepIndex + 1}</div>
              <div className={stepTurn.fighter_a.critical ? 'turn-entry turn-crit' : stepTurn.fighter_a.effectiveness === 'super_effective' ? 'turn-entry turn-super-effective' : 'turn-entry'}>
                A used {stepTurn.fighter_a.move}: {stepTurn.fighter_a.damage_dealt} dmg
                {stepTurn.fighter_a.critical && ' (CRIT!)'}
              </div>
              <div className={stepTurn.fighter_b.critical ? 'turn-entry turn-crit' : stepTurn.fighter_b.effectiveness === 'super_effective' ? 'turn-entry turn-super-effective' : 'turn-entry'}>
                B used {stepTurn.fighter_b.move}: {stepTurn.fighter_b.damage_dealt} dmg
                {stepTurn.fighter_b.critical && ' (CRIT!)'}
              </div>
            </div>
          )}

          {/* Step navigation */}
          <div className="flex items-center gap-3 justify-center">
            <button
              className="btn btn-secondary"
              onClick={goPrev}
              disabled={stepIndex === 0}
              aria-label="Previous turn"
            >
              Prev
            </button>
            <span className="text-sm text-muted tabular-nums">
              {stepIndex + 1} / {turns.length}
            </span>
            <button
              className="btn btn-secondary"
              onClick={goNext}
              disabled={stepIndex >= turns.length - 1}
              aria-label="Next turn"
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Turn log (always visible) */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Battle Log</h3>
        <TurnLog turns={turns} />
      </div>

      {/* Battle result */}
      {battle.winner && (
        <div className="card p-4 text-center">
          <p className="text-lg font-bold">
            Winner: {battle.winner === battle.fighterA?.nft_id ? 'Fighter A' : 'Fighter B'}
          </p>
          {(battle.eloChangeA != null || battle.eloChangeB != null) && (
            <div className="flex items-center justify-center gap-4 mt-2 text-sm text-secondary">
              <span>A: {(battle.eloChangeA ?? 0) > 0 ? '+' : ''}{battle.eloChangeA ?? 0} ELO</span>
              <span>B: {(battle.eloChangeB ?? 0) > 0 ? '+' : ''}{battle.eloChangeB ?? 0} ELO</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Verify the imports resolve**

Check that all imported modules exist on the current branch:

```bash
grep -rn "export function calculateHP\|export { calculateHP" src/lib/combat/stat-calculator.ts
grep -rn "export function getBaseStats\|export { getBaseStats" src/lib/combat/data/base-stats.ts
```

If `calculateHP` or `getBaseStats` are not exported, add the exports. If they exist under different names, adjust the imports.

**Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/components/combat/BattleReplay.tsx
git commit -m "feat(combat): rewrite BattleReplay with animated auto-play, canvas particles, and step-through modes"
```

---

### Task 2: Add keyboard navigation to BattleReplay step mode

**Files:**
- Modify: `src/components/combat/BattleReplay.tsx`

**Step 1: Read the file you just committed**

**Step 2: Add keyboard event handler for step mode**

Inside the component, add a `useEffect` for keyboard navigation:

```tsx
// Keyboard shortcuts for step mode: Left/Right arrows, Space to toggle mode
useEffect(() => {
  if (mode !== 'step') return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key === 'ArrowRight' || e.key === 'l') {
      e.preventDefault();
      goNext();
    } else if (e.key === 'ArrowLeft' || e.key === 'h') {
      e.preventDefault();
      goPrev();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [mode, goNext, goPrev]);
```

**Step 3: Add a keyboard hint in the step mode UI**

After the step navigation buttons, add:

```tsx
<p className="text-xs text-muted text-center hidden md:block">
  Arrow keys or H/L to navigate turns
</p>
```

**Step 4: Verify & Commit**

```bash
npx tsc --noEmit
git add src/components/combat/BattleReplay.tsx
git commit -m "feat(combat): add keyboard navigation (arrows, H/L) to BattleReplay step mode"
```

---

### Task 3: Write unit test for computeMaxHP helper

**Files:**
- Create: `src/components/combat/BattleReplay.test.ts`

**Step 1: Write the test**

```typescript
// src/components/combat/BattleReplay.test.ts
import { describe, it, expect } from 'vitest';
import { getBaseStats } from '@/lib/combat/data/base-stats';
import { calculateHP } from '@/lib/combat/stat-calculator';
import type { CombatType } from '@/lib/combat/types';

/**
 * Test the maxHP computation used in BattleReplay (and BattleView).
 * Ensures type-specific base stats produce different HP values.
 */
describe('computeMaxHP via stat-calculator', () => {
  function computeMaxHP(type: CombatType, level: number): number {
    const base = getBaseStats(type);
    return calculateHP(base.hp, level);
  }

  it('returns correct HP for FIRE type at level 50', () => {
    // FIRE base HP = 75
    // HP = floor((2 * 75 + 31) * 50 / 100) + 50 + 10 = floor(181 * 0.5) + 60 = 90 + 60 = 150
    const hp = computeMaxHP('FIRE', 50);
    expect(hp).toBe(150);
  });

  it('returns correct HP for EARTH type at level 50', () => {
    // EARTH base HP = 90
    // HP = floor((2 * 90 + 31) * 50 / 100) + 50 + 10 = floor(211 * 0.5) + 60 = 105 + 60 = 165
    const hp = computeMaxHP('EARTH', 50);
    expect(hp).toBe(165);
  });

  it('EARTH has more HP than ELECTRIC at same level', () => {
    // EARTH base HP = 90, ELECTRIC base HP = 65
    const earthHP = computeMaxHP('EARTH', 50);
    const electricHP = computeMaxHP('ELECTRIC', 50);
    expect(earthHP).toBeGreaterThan(electricHP);
  });

  it('higher level = more HP for same type', () => {
    const hp30 = computeMaxHP('NEUTRAL', 30);
    const hp50 = computeMaxHP('NEUTRAL', 50);
    const hp80 = computeMaxHP('NEUTRAL', 80);
    expect(hp30).toBeLessThan(hp50);
    expect(hp50).toBeLessThan(hp80);
  });

  it('all 18 types produce valid HP values at level 1', () => {
    const types: CombatType[] = [
      'NEUTRAL', 'FIRE', 'WATER', 'ELECTRIC', 'GRASS', 'ICE',
      'MARTIAL', 'VENOM', 'EARTH', 'AIR', 'PSYCHE', 'INSECT',
      'STONE', 'GHOST', 'DRAGON', 'SHADOW', 'METAL', 'MYSTIC',
    ];
    for (const type of types) {
      const hp = computeMaxHP(type, 1);
      expect(hp).toBeGreaterThan(0);
      expect(hp).toBeLessThan(500);
    }
  });
});
```

**Step 2: Run the test**

```bash
npx vitest run src/components/combat/BattleReplay.test.ts
```

Expected: All 5 tests pass.

**Step 3: If any test fails, double-check the math**

The HP formula is: `floor((2 * baseHP + 31) * level / 100) + level + 10`

Verify the base HP values match `src/lib/combat/data/base-stats.ts` and adjust expected values if needed.

**Step 4: Commit**

```bash
git add src/components/combat/BattleReplay.test.ts
git commit -m "test(combat): add unit tests for type-specific maxHP calculation"
```

---

### Task 4: Expand E2E tests — battle detail page

**Files:**
- Modify: `tests/combat.spec.ts`

**Step 1: Read the current file**

**Step 2: Add new test for the battle detail route**

After the existing tests, add:

```typescript
test.describe('Battle Detail Page', () => {
  test('battle detail page renders for valid ID', async ({ page }) => {
    // Navigate to the battle detail page with a test ID
    // This should show the BattleView component even if no real battle exists
    await page.goto('/games/combat/battle/1');

    // Should show either the battle view or an error message (not a 404 blank page)
    const content = await page.textContent('body');
    const hasBattleContent = content?.includes('Battle #1') ||
      content?.includes('Battle not found') ||
      content?.includes('Failed to load battle');
    expect(hasBattleContent).toBeTruthy();
  });

  test('battle detail page handles invalid ID gracefully', async ({ page }) => {
    await page.goto('/games/combat/battle/abc');
    const content = await page.textContent('body');
    // Should show an error, not a crash
    expect(
      content?.includes('Invalid battle ID') ||
      content?.includes('not found') ||
      content?.includes('Error')
    ).toBeTruthy();
  });

  test('battle detail page is navigable from combat arena', async ({ page }) => {
    // Verify the route exists in the app's router
    await page.goto('/games/combat/battle/999');
    // Should not show a generic 404 page
    const title = await page.title();
    expect(title).not.toContain('404');
  });
});
```

**Step 3: Run the E2E tests**

```bash
npx playwright test tests/combat.spec.ts
```

Note: These tests may fail if no dev server is running. Check the Playwright config for `webServer` settings.

**Step 4: Fix any failing tests**

If tests fail because the route hasn't been added yet (Spec 6 not done), skip those tests with `test.skip` and add a comment:

```typescript
// Requires Spec 6 (battle detail route) to be implemented
test.skip('battle detail page renders for valid ID', ...);
```

**Step 5: Commit**

```bash
git add tests/combat.spec.ts
git commit -m "test(combat): expand E2E tests — battle detail page, invalid ID handling"
```

---

### Task 5: Expand E2E tests — leaderboard and history

**Files:**
- Modify: `tests/combat.spec.ts`

**Step 1: Read the file again to see current state**

**Step 2: Add leaderboard and history tests**

```typescript
test.describe('Combat Leaderboard', () => {
  test('leaderboard component loads on combat page', async ({ page }) => {
    await page.goto('/games/combat');
    // Leaderboard may or may not have entries yet
    const content = await page.textContent('body');
    const hasLeaderboard = content?.includes('Leaderboard') ||
      content?.includes('No ranked fighters') ||
      content?.includes('Top Fighters');
    expect(hasLeaderboard).toBeTruthy();
  });
});

test.describe('Battle History', () => {
  test('history section loads on combat page', async ({ page }) => {
    await page.goto('/games/combat');
    // Should show "Recent Battles" heading or empty state
    const content = await page.textContent('body');
    const hasHistory = content?.includes('Recent Battles') ||
      content?.includes('No battles yet') ||
      content?.includes('No battle history');
    expect(hasHistory).toBeTruthy();
  });
});
```

**Step 3: Run E2E tests**

```bash
npx playwright test tests/combat.spec.ts
```

**Step 4: Commit**

```bash
git add tests/combat.spec.ts
git commit -m "test(combat): add E2E tests for leaderboard and battle history sections"
```

---

### Task 6: Fix ability descriptions — replace Pokemon type names with Wojak type names

**Files:**
- Modify: `src/lib/combat/data/abilities.ts`

**Step 1: Read the current abilities file**

```bash
cat src/lib/combat/data/abilities.ts
```

**Step 2: Search for any remaining Pokemon-era type names**

Look for references like "Fire", "Water", "Electric", "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy" in ability descriptions. Note: The Wojak equivalents are:

| Pokemon Name | Wojak Name |
|-------------|------------|
| Fire        | FIRE       |
| Water       | WATER      |
| Electric    | ELECTRIC   |
| Grass       | GRASS      |
| Ice         | ICE        |
| Fighting    | MARTIAL    |
| Poison      | VENOM      |
| Ground      | EARTH      |
| Flying      | AIR        |
| Psychic     | PSYCHE     |
| Bug         | INSECT     |
| Rock        | STONE      |
| Ghost       | GHOST      |
| Dragon      | DRAGON     |
| Dark        | SHADOW     |
| Steel       | METAL      |
| Fairy       | MYSTIC     |
| Normal      | NEUTRAL    |

**Step 3: Replace any ability descriptions that use Pokemon type names**

For each ability, update descriptions to use the Wojak type name. For example:
- "Boosts Fire moves" → "Boosts FIRE moves"
- "Fighting-type attacks" → "MARTIAL-type attacks"
- "Fairy resistance" → "MYSTIC resistance"

Do NOT change the ability names themselves (those were already renamed in Phase 3). Only change the description text.

**Step 4: Run the abilities unit test**

```bash
npx vitest run src/lib/combat/data/abilities.test.ts
```

**Step 5: If any test checks description text, update expected values**

**Step 6: Verify & Commit**

```bash
npx tsc --noEmit
npx vitest run src/lib/combat/data/abilities.test.ts
git add src/lib/combat/data/abilities.ts
git commit -m "fix(combat): replace Pokemon type names with Wojak type names in ability descriptions"
```

---

### Task 7: Add XP progress display to BattleResult

**Files:**
- Modify: `src/components/combat/BattleView.tsx`

**Step 1: Read the BattleResult sub-component at the bottom of BattleView.tsx**

Find the `BattleResult` function (around line 476+).

**Step 2: Add a simple XP progress bar**

After the ELO/XP text, add a visual XP bar:

```tsx
{xpAwarded != null && xpAwarded > 0 && (
  <div className="mt-3 flex flex-col gap-1">
    <div className="text-xs text-muted text-center">XP Gained</div>
    <div className="w-full max-w-48 mx-auto h-2 rounded-full overflow-hidden"
         style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(100, xpAwarded)}%`,
          background: 'var(--color-cyan)',
          transition: 'width 1s ease-out',
        }}
      />
    </div>
    <div className="text-xs text-center text-cyan">+{xpAwarded} XP</div>
  </div>
)}
```

Note: This is a simple visualization. The actual XP-to-level progress would need the fighter's current XP total, which isn't in the battle response yet. This shows the XP gained from this battle as a visual bar.

**Step 3: Add an XP bar animation CSS class to theme.css**

Open `src/styles/theme.css` and add in the combat section:

```css
/* XP gained bar — animates width on mount */
.xp-gained-bar {
  height: 8px;
  border-radius: 4px;
  background: var(--color-cyan);
  transition: width 1s ease-out;
  box-shadow: 0 0 6px rgba(0, 212, 255, 0.3);
}
```

**Step 4: Replace the inline style with the CSS class**

```tsx
<div
  className="xp-gained-bar"
  style={{ width: `${Math.min(100, xpAwarded)}%` }}
/>
```

**Step 5: Verify & Commit**

```bash
npx tsc --noEmit
git add src/components/combat/BattleView.tsx src/styles/theme.css
git commit -m "feat(combat): add XP progress bar to BattleResult with animated fill"
```

---

### Task 8: Add a replay button to BattleHistory entries

**Files:**
- Modify: `src/components/combat/BattleHistory.tsx`

**Step 1: Read the current BattleHistory.tsx**

**Step 2: Enhance entries with a replay link**

The `onSelectBattle` callback already exists. Make sure it navigates to the battle detail page. Also add visual polish — relative timestamps instead of raw dates.

Update the date display:

```tsx
// Add this helper function before the component
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
```

Then replace `{new Date(b.endedAt).toLocaleDateString()}` with `{relativeTime(b.endedAt)}`.

**Step 3: Add a small replay icon/text to each entry**

After the ELO/XP column, add:

```tsx
<span className="text-xs text-accent" aria-label="Watch replay">
  &#9654;
</span>
```

This adds a small play triangle (▶) to indicate the entry is clickable for replay.

**Step 4: Verify & Commit**

```bash
npx tsc --noEmit
git add src/components/combat/BattleHistory.tsx
git commit -m "feat(combat): add relative timestamps and replay indicator to battle history entries"
```

---

### Task 9: Write unit test for relativeTime helper

**Files:**
- Create: `src/components/combat/BattleHistory.test.ts`

**Step 1: Extract relativeTime to a testable location**

If the helper is defined inside BattleHistory.tsx, it's already testable by importing. If it's a local function, consider exporting it:

```typescript
export function relativeTime(dateStr: string): string { ... }
```

**Step 2: Write the test**

```typescript
// src/components/combat/BattleHistory.test.ts
import { describe, it, expect, vi } from 'vitest';
import { relativeTime } from './BattleHistory';

describe('relativeTime', () => {
  it('returns "just now" for times less than 1 minute ago', () => {
    const now = new Date().toISOString();
    expect(relativeTime(now)).toBe('just now');
  });

  it('returns minutes for recent times', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(relativeTime(fiveMinAgo)).toBe('5m ago');
  });

  it('returns hours for times within a day', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(relativeTime(threeHoursAgo)).toBe('3h ago');
  });

  it('returns days for times within a week', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(relativeTime(twoDaysAgo)).toBe('2d ago');
  });

  it('returns formatted date for times older than a week', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const result = relativeTime(twoWeeksAgo);
    // Should be a date string, not a relative time
    expect(result).not.toContain('ago');
    expect(result.length).toBeGreaterThan(0);
  });
});
```

**Step 3: Run the test**

```bash
npx vitest run src/components/combat/BattleHistory.test.ts
```

**Step 4: Commit**

```bash
git add src/components/combat/BattleHistory.test.ts
git commit -m "test(combat): add unit tests for relativeTime helper in BattleHistory"
```

---

### Task 10: Update test fixtures — replace poke_ move ID prefixes if renamed

**Files:**
- Modify: `src/lib/combat/battle-runner.test.ts`

**Step 1: Read moves.ts to check current move ID format**

```bash
head -30 src/lib/combat/data/moves.ts
```

Check whether move IDs still use `poke_` prefix (e.g., `poke_fire_fire-punch`) or have been renamed by Spec 5.

**Step 2: If move IDs have been updated by Spec 5, update test fixtures**

Read the test file and replace all `poke_*` move IDs with the new IDs from moves.ts.

For example, if `poke_fire_fire-punch` is now `fire_flame-strike` (or whatever the renamed ID is), update:

```typescript
moves: ['fire_flame-strike', 'fire_inferno', 'fire_lava-flow', 'fire_spark']
```

Search moves.ts for moves of each type to find the correct new IDs.

**Step 3: If move IDs have NOT been renamed yet (Spec 5 not done), skip this task**

In that case, just verify tests still pass:

```bash
npx vitest run src/lib/combat/battle-runner.test.ts
```

**Step 4: Run all combat tests**

```bash
npx vitest run src/lib/combat/
```

**Step 5: Commit if changes were made**

```bash
git add src/lib/combat/battle-runner.test.ts
git commit -m "fix(combat): update test fixtures to match renamed move IDs"
```

---

### Task 11: Final verification pass

**Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 2: Run all combat unit tests**

```bash
npx vitest run src/lib/combat/
```

**Step 3: Run the component tests**

```bash
npx vitest run src/components/combat/
```

**Step 4: Run E2E tests**

```bash
npx playwright test tests/combat.spec.ts
```

**Step 5: Check for any remaining hardcoded maxHP = 100**

```bash
grep -rn "maxHP.*=.*100\|max_hp.*=.*100\|maxHp.*=.*100" src/components/combat/ src/hooks/
```

Should return zero results (all fixed by Spec 6 Task 4 and Spec 7 Task 1).

**Step 6: Verify no Pokemon type names remain in ability descriptions**

```bash
grep -in "fighting\|poison\|ground\|flying\|psychic\b\|bug\b\|rock\b\|dark\b\|steel\b\|fairy\b" src/lib/combat/data/abilities.ts
```

Should return zero results (all replaced in Task 6).

**Step 7: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix(combat): final verification pass for Spec 7 — replay, tests, cleanup"
```

---

## Summary

### New Files
- `src/components/combat/BattleReplay.test.ts` — Unit tests for maxHP calculation
- `src/components/combat/BattleHistory.test.ts` — Unit tests for relativeTime helper

### Modified Files
- `src/components/combat/BattleReplay.tsx` — Full rewrite: animated auto-play + step-through modes with canvas, audio, damage numbers, keyboard nav
- `src/components/combat/BattleView.tsx` — XP progress bar in BattleResult
- `src/components/combat/BattleHistory.tsx` — Relative timestamps, replay indicator, exported helper
- `src/lib/combat/data/abilities.ts` — Replace Pokemon type names in descriptions
- `src/lib/combat/battle-runner.test.ts` — Update move ID fixtures (conditional on Spec 5)
- `src/styles/theme.css` — XP gained bar CSS
- `tests/combat.spec.ts` — Expanded E2E tests for battle detail, leaderboard, history

### What This Fixes
- **BattleReplay is a basic stepper** → Full animated replay with particles, audio, speed control
- **No keyboard nav in replay** → Arrow keys + H/L for step navigation
- **E2E tests are smoke-only** → Meaningful coverage for battle detail, leaderboard, history
- **Ability descriptions use Pokemon names** → All updated to Wojak type names
- **No XP visualization after battle** → Animated XP progress bar
- **Battle history shows raw dates** → Relative timestamps ("5m ago", "2d ago")
- **Test fixtures may use stale move IDs** → Updated to match renamed moves
