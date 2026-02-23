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
    queueMicrotask(() => {
      setHpA({ current: maxHpA, ghost: maxHpA });
      setHpB({ current: maxHpB, ghost: maxHpB });
    });
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

  // ── Keyboard shortcuts for step mode ────────────────────────────────
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

        </>
      )}

      {/* Step Mode (manual turn-by-turn) */}
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
              type="button"
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
              type="button"
              className="btn btn-secondary"
              onClick={goNext}
              disabled={stepIndex >= turns.length - 1}
              aria-label="Next turn"
            >
              Next
            </button>
          </div>

          {/* Keyboard hint (desktop only) */}
          <p className="text-xs text-muted text-center hidden md:block">
            Arrow keys or H/L to navigate turns
          </p>
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
