/**
 * BattleView — full battle arena with animated playback, canvas particles, and audio.
 *
 * Replaces the original card-grid layout with:
 * - Battle arena wrapper with scanlines + canvas particle overlay
 * - useBattlePlayback hook for timed turn animation
 * - Ghost-damage HP bars
 * - Status condition icons with animated CSS
 * - Fighter intro / faint / winner / loser animations
 * - Audio integration (preload on mount, effects during playback)
 *
 * Keeps the existing API polling pattern (GET /api/combat/battle every 3s)
 * and move submission (POST /api/combat/submit-move).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { HPBar } from './HPBar';
import { TurnLog } from './TurnLog';
import { MoveButtons } from './MoveButtons';
import { BattleCanvas } from './BattleCanvas';
import { DamageNumber } from './DamageNumber';
import { StatusIcon } from './StatusIcon';
import { EffectivenessCallout } from './EffectivenessCallout';
import { useBattlePlayback } from '@/hooks/useBattlePlayback';
import { getBattleAudio } from '@/lib/combat/audio';
import type { CombatType } from '@/lib/combat/types';
import type { TurnResult } from '@/lib/combat/battle-state';
import { getBaseStats } from '@/lib/combat/data/base-stats';
import { calculateHP } from '@/lib/combat/stat-calculator';

// ── Interfaces ──────────────────────────────────────────────────────────────

interface FighterDisplay {
  nft_id: string;
  edition?: number;
  type: CombatType;
  nature: string;
  ability: string;
  level: number;
  elo: number;
  moves: { id: string; name: string; power: number; accuracy: number; category: string }[];
  imageUrl?: string;
}

interface BattleData {
  id: number;
  status: string;
  currentTurn: number;
  maxTurns: number;
  winner: string | null;
  fighterA: FighterDisplay | null;
  fighterB: FighterDisplay | null;
  turns: TurnResult[];
  eloChangeA?: number;
  eloChangeB?: number;
  xpAwardedA?: number;
  xpAwardedB?: number;
}

interface BattleViewProps {
  battleId: number;
  playerNftId?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Compute max HP from type and level using the real base stats. */
function computeMaxHP(type: CombatType, level: number): number {
  const base = getBaseStats(type);
  return calculateHP(base.hp, level);
}

// ── Fighter Position Constants (for canvas particle targeting) ──────────────

const POS_A = { x: 0.25, y: 0.55 };
const POS_B = { x: 0.75, y: 0.55 };

// ── BattleView Component ────────────────────────────────────────────────────

export function BattleView({ battleId, playerNftId }: BattleViewProps) {
  // ── Core state ──────────────────────────────────────────────────────────
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── HP state with ghost tracking ────────────────────────────────────────
  const [hpA, setHpA] = useState<{ current: number; ghost: number }>({ current: 0, ghost: 0 });
  const [hpB, setHpB] = useState<{ current: number; ghost: number }>({ current: 0, ghost: 0 });

  // ── Status state ────────────────────────────────────────────────────────
  const [statusA, setStatusA] = useState<string | null>(null);
  const [statusB, setStatusB] = useState<string | null>(null);

  // ── Visual overlay state ────────────────────────────────────────────────
  type DamageEntry = { id: string; value: number | string; type: 'normal' | 'crit' | 'heal' | 'super-effective' | 'immune'; side: 'a' | 'b' };
  type CalloutEntry = { id: string; type: 'super_effective' | 'not_very_effective' | 'immune' };
  const [damageNumbers, setDamageNumbers] = useState<DamageEntry[]>([]);
  const [callouts, setCallouts] = useState<CalloutEntry[]>([]);
  const [shakeClass, setShakeClass] = useState('');
  const [flashClass, setFlashClass] = useState('');

  // ── Played turn tracking ────────────────────────────────────────────────
  const [playedTurns, setPlayedTurns] = useState(0);

  // ── Overlay cleanup callbacks ─────────────────────────────────────────
  const removeDamageNumber = useCallback((id: string) => {
    setDamageNumbers(prev => prev.filter(d => d.id !== id));
  }, []);

  const removeCallout = useCallback((id: string) => {
    setCallouts(prev => prev.filter(c => c.id !== id));
  }, []);

  // ── Playback hook ───────────────────────────────────────────────────────
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

      // Screen shake
      const intensity = isCrit ? 'battle-shake-heavy' : amount > 30 ? 'battle-shake' : 'battle-shake-light';
      setShakeClass(intensity);
      setTimeout(() => setShakeClass(''), 500);

      // Screen flash for crits
      if (isCrit) {
        setFlashClass('battle-flash-overlay battle-flash-crit');
        setTimeout(() => setFlashClass(''), 400);
      } else if (effectiveness === 'super_effective') {
        setFlashClass('battle-flash-overlay battle-flash-super-effective');
        setTimeout(() => setFlashClass(''), 400);
      }

      // Effectiveness callout
      if (effectiveness && effectiveness !== 'neutral') {
        setCallouts(prev => [...prev, {
          id: `eff-${Date.now()}-${Math.random()}`,
          type: effectiveness as CalloutEntry['type'],
        }]);
      }
    },
    onComplete: () => {
      // Playback finished — nothing special needed, UI is already updated
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

  // ── Audio preload on mount ──────────────────────────────────────────────
  const audioPreloaded = useRef(false);
  useEffect(() => {
    if (!audioPreloaded.current) {
      audioPreloaded.current = true;
      getBattleAudio().preload();
    }
  }, []);

  // ── Computed values ─────────────────────────────────────────────────────
  const maxHpA = battle?.fighterA ? computeMaxHP(battle.fighterA.type, battle.fighterA.level) : 100;
  const maxHpB = battle?.fighterB ? computeMaxHP(battle.fighterB.type, battle.fighterB.level) : 100;

  // ── Fetch battle state ──────────────────────────────────────────────────
  const fetchBattle = useCallback(async () => {
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
  }, [battleId]);

  useEffect(() => {
    fetchBattle();
    const interval = setInterval(fetchBattle, 3000);
    return () => clearInterval(interval);
  }, [fetchBattle]);

  // ── Initialize HP when battle first loads ───────────────────────────────
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!battle || initializedRef.current) return;
    initializedRef.current = true;
    const initHpA = battle.turns.length === 0
      ? maxHpA
      : battle.turns[battle.turns.length - 1].end_of_turn.fighter_a_hp;
    const initHpB = battle.turns.length === 0
      ? maxHpB
      : battle.turns[battle.turns.length - 1].end_of_turn.fighter_b_hp;
    setHpA({ current: initHpA, ghost: initHpA });
    setHpB({ current: initHpB, ghost: initHpB });

    // Set status from last turn
    if (battle.turns.length > 0) {
      const lastTurn = battle.turns[battle.turns.length - 1];
      setStatusA(lastTurn.end_of_turn.fighter_a_status);
      setStatusB(lastTurn.end_of_turn.fighter_b_status);
    }

    // Mark all existing turns as played (we only animate new turns going forward)
    setPlayedTurns(battle.turns.length);
  }, [battle, maxHpA, maxHpB]);

  // ── Play new turns when they arrive ─────────────────────────────────────
  useEffect(() => {
    if (!battle || isPlaying) return;
    if (battle.turns.length <= playedTurns) return;
    if (!battle.fighterA || !battle.fighterB) return;

    const newTurns = battle.turns.slice(playedTurns);
    const typeA = battle.fighterA.type;
    const typeB = battle.fighterB.type;

    playTurns(newTurns, typeA, typeB, POS_A, POS_B);
    setPlayedTurns(battle.turns.length);
  }, [battle, playedTurns, isPlaying, playTurns]);

  // ── Submit move handler ─────────────────────────────────────────────────
  const handleSubmitMove = useCallback(async (moveId: string) => {
    if (!playerNftId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/combat/submit-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId, nftId: playerNftId, moveId }),
      });
      const data = await res.json();
      if (data.turnResult) {
        await fetchBattle();
      }
    } catch (err) {
      console.error('[BattleView] Submit move error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [battleId, playerNftId, fetchBattle]);

  // ── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="card-static p-6 text-center">
        <p className="text-error text-sm">{error}</p>
      </div>
    );
  }

  // ── Loading state ───────────────────────────────────────────────────────
  if (!battle) {
    return (
      <div className="card-static p-6 text-center">
        <p className="text-muted text-sm">Loading battle...</p>
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────
  const isComplete = battle.status === 'completed';
  const isPlayerA = playerNftId === battle.fighterA?.nft_id;
  const playerFighter = isPlayerA ? battle.fighterA : battle.fighterB;
  const opponentFighter = isPlayerA ? battle.fighterB : battle.fighterA;

  // Determine player/opponent HP and status based on side
  const playerHp = isPlayerA ? hpA : hpB;
  const opponentHp = isPlayerA ? hpB : hpA;
  const playerMaxHp = isPlayerA ? maxHpA : maxHpB;
  const opponentMaxHp = isPlayerA ? maxHpB : maxHpA;
  const playerStatus = isPlayerA ? statusA : statusB;
  const opponentStatus = isPlayerA ? statusB : statusA;

  // Winner/loser animation classes
  const isPlayerWinner = isComplete && battle.winner === playerNftId;
  const isOpponentWinner = isComplete && battle.winner != null && battle.winner !== playerNftId;
  const playerImgClass = isPlayerWinner
    ? 'fighter-winner'
    : (isOpponentWinner ? 'fighter-loser' : '');
  const opponentImgClass = isOpponentWinner
    ? 'fighter-winner'
    : (isPlayerWinner ? 'fighter-loser' : '');

  // Play victory/defeat audio on completion
  // (handled once via a ref to prevent re-triggering)

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Battle header */}
      <div className="flex items-center justify-between text-sm text-muted">
        <span>Battle #{battle.id}</span>
        <div className="flex items-center gap-3">
          <span>Turn {battle.currentTurn}/{battle.maxTurns}</span>
          {isPlaying && (
            <span className="text-xs text-accent">Playing...</span>
          )}
        </div>
      </div>

      {/* ── Battle Arena ─────────────────────────────────────────────── */}
      <div
        ref={arenaRef}
        className={`battle-arena battle-scanlines ${shakeClass}`}
      >
        {/* Canvas particle overlay */}
        <BattleCanvas ref={canvasRef} />

        {/* Flash overlay */}
        {flashClass && <div className={flashClass} />}

        {/* Effectiveness callouts */}
        {callouts.map(c => (
          <EffectivenessCallout
            key={c.id}
            id={c.id}
            type={c.type}
            onComplete={() => removeCallout(c.id)}
          />
        ))}

        {/* Fighter panels (grid inside arena) */}
        <div className="grid grid-cols-2 gap-4 p-4" style={{ position: 'relative', zIndex: 2 }}>
          {/* Player side (left) */}
          <div className="flex flex-col gap-2" style={{ position: 'relative' }}>
            {playerFighter?.imageUrl && (
              <div className={`battle-nft-image battle-slide-left ${playerImgClass}`}>
                <img
                  src={playerFighter.imageUrl}
                  alt="Your fighter"
                  className="w-full h-full object-cover"
                  style={{ borderRadius: 'var(--radius-md)' }}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`badge badge-${playerFighter?.type.toLowerCase()}`}>
                  {playerFighter?.type}
                </span>
                <StatusIcon status={playerStatus} />
              </div>
              <span className="text-xs text-muted">Lv.{playerFighter?.level}</span>
            </div>
            <HPBar
              current={playerHp.current}
              max={playerMaxHp}
              ghost={playerHp.ghost}
              label="HP"
            />
            {/* Damage numbers — player side */}
            {damageNumbers
              .filter(d => (isPlayerA ? d.side === 'a' : d.side === 'b'))
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

          {/* Opponent side (right) */}
          <div className="flex flex-col gap-2" style={{ position: 'relative' }}>
            {opponentFighter?.imageUrl && (
              <div className={`battle-nft-image battle-slide-right ${opponentImgClass}`}>
                <img
                  src={opponentFighter.imageUrl}
                  alt="Opponent"
                  className="w-full h-full object-cover"
                  style={{ borderRadius: 'var(--radius-md)' }}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`badge badge-${opponentFighter?.type.toLowerCase()}`}>
                  {opponentFighter?.type}
                </span>
                <StatusIcon status={opponentStatus} />
              </div>
              <span className="text-xs text-muted">Lv.{opponentFighter?.level}</span>
            </div>
            <HPBar
              current={opponentHp.current}
              max={opponentMaxHp}
              ghost={opponentHp.ghost}
              label="HP"
            />
            {/* Damage numbers — opponent side */}
            {damageNumbers
              .filter(d => (isPlayerA ? d.side === 'b' : d.side === 'a'))
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

      {/* Speed control (visible during playback) */}
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

      {/* Move buttons (manual mode only, when not complete and not playing) */}
      {!isComplete && !isPlaying && playerFighter?.moves && playerNftId && (
        <MoveButtons
          moves={playerFighter.moves}
          onSubmit={handleSubmitMove}
          disabled={isSubmitting}
        />
      )}

      {/* Turn log */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Battle Log</h3>
        <TurnLog turns={battle.turns} />
      </div>

      {/* Battle result */}
      {isComplete && (
        <BattleResult
          battle={battle}
          playerNftId={playerNftId}
          isPlayerA={isPlayerA}
        />
      )}
    </div>
  );
}

// ── BattleResult Sub-component ──────────────────────────────────────────────

function BattleResult({
  battle,
  playerNftId,
  isPlayerA,
}: {
  battle: BattleData;
  playerNftId?: string;
  isPlayerA: boolean;
}) {
  const audioPlayed = useRef(false);

  useEffect(() => {
    if (audioPlayed.current) return;
    audioPlayed.current = true;
    const audio = getBattleAudio();
    if (battle.winner === playerNftId) {
      audio.victory();
    } else if (battle.winner) {
      audio.defeat();
    }
  }, [battle.winner, playerNftId]);

  const eloChange = isPlayerA ? battle.eloChangeA : battle.eloChangeB;
  const xpAwarded = isPlayerA ? battle.xpAwardedA : battle.xpAwardedB;

  return (
    <div className="card p-4 text-center">
      <p className="text-lg font-bold">
        {battle.winner === playerNftId
          ? 'Victory!'
          : battle.winner
            ? 'Defeat'
            : 'Draw'}
      </p>
      {eloChange != null && (
        <div className="flex items-center justify-center gap-4 mt-2 text-sm text-secondary">
          <span>ELO: {eloChange > 0 ? '+' : ''}{eloChange}</span>
          <span>XP: +{xpAwarded}</span>
        </div>
      )}
      {xpAwarded != null && xpAwarded > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          <div className="text-xs text-muted text-center">XP Gained</div>
          <div className="w-full max-w-48 mx-auto h-2 rounded-full overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="xp-gained-bar"
              style={{ width: `${Math.min(100, xpAwarded)}%` }}
            />
          </div>
          <div className="text-xs text-center text-cyan">+{xpAwarded} XP</div>
        </div>
      )}
    </div>
  );
}
