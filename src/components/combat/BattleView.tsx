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
import { Bot, Swords } from 'lucide-react';
import { TurnLog, type FlatLogEntry } from './TurnLog';
import { MoveButtons } from './MoveButtons';
import { TurnTimer } from './TurnTimer';
import { BattleCanvas } from './BattleCanvas';
import { DamageNumber } from './DamageNumber';
import { StatusIcon } from './StatusIcon';
import { EffectivenessCallout } from './EffectivenessCallout';
import { useBattlePlayback } from '@/hooks/useBattlePlayback';
import { getBattleAudio } from '@/lib/combat/audio';
import type { CombatType } from '@/lib/combat/types';
import type { AttackPattern } from '@/lib/combat/particles';
import type { TurnResult } from '@/lib/combat/battle-state';
import { getBaseStats } from '@/lib/combat/data/base-stats';
import { calculateHP } from '@/lib/combat/stat-calculator';
import { getMoveById } from '@/lib/combat/data/moves';
import { TYPE_EFFECTS } from '@/lib/combat/particles';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface FighterDisplay {
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

export interface BattleData {
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
  /** Static data for demo mode — skips API polling */
  staticBattleData?: BattleData;
  /** Auto-play mode — no move buttons, plays both sides automatically */
  autoPlay?: boolean;
  /** Callback when demo battle finishes */
  onDemoComplete?: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Compute max HP from type and level using the real base stats. */
function computeMaxHP(type: CombatType, level: number): number {
  const base = getBaseStats(type);
  return calculateHP(base.hp, level);
}

/** Resolve when all URLs have loaded (or failed). Never rejects. */
function preloadImages(urls: (string | undefined)[]): Promise<void> {
  const valid = urls.filter((u): u is string => Boolean(u));
  if (valid.length === 0) return Promise.resolve();
  return Promise.all(
    valid.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        }),
    ),
  ).then(() => {});
}

/** Build flat battle-log entries from TurnResult[] for per-event scroll. */
function buildFlatLogEntries(turns: TurnResult[]): FlatLogEntry[] {
  const flat: FlatLogEntry[] = [];
  const damageMsg = (d: number, crit: boolean, eff: TurnResult['fighter_a']['effectiveness']) => {
    const base = crit ? `Critical! ${d} damage` : `${d} damage`;
    if (eff === 'super_effective') return `${base} — Super effective!`;
    if (eff === 'not_very_effective') return `${base} — It's not very effective.`;
    if (eff === 'immune') return `No effect (immune).`;
    return base;
  };
  for (const t of turns) {
    flat.push({ kind: 'turn_sep', turn: t.turn });
    const nameA = getMoveById(t.fighter_a.move)?.name ?? t.fighter_a.move;
    const nameB = getMoveById(t.fighter_b.move)?.name ?? t.fighter_b.move;
    if (t.order === 'a_first') {
      flat.push({ kind: 'chip', type: 'move_a', message: `Used ${nameA}!` });
      if (t.fighter_a.damage_dealt > 0) {
        flat.push({
          kind: 'chip',
          type: 'damage_b',
          message: damageMsg(t.fighter_a.damage_dealt, t.fighter_a.critical, t.fighter_a.effectiveness),
          damage: t.fighter_a.damage_dealt,
          effectiveness: t.fighter_a.effectiveness,
          isCrit: t.fighter_a.critical,
        });
      }
      flat.push({ kind: 'chip', type: 'move_b', message: `Used ${nameB}!` });
      if (t.fighter_b.damage_dealt > 0) {
        flat.push({
          kind: 'chip',
          type: 'damage_a',
          message: damageMsg(t.fighter_b.damage_dealt, t.fighter_b.critical, t.fighter_b.effectiveness),
          damage: t.fighter_b.damage_dealt,
          effectiveness: t.fighter_b.effectiveness,
          isCrit: t.fighter_b.critical,
        });
      }
    } else {
      flat.push({ kind: 'chip', type: 'move_b', message: `Used ${nameB}!` });
      if (t.fighter_b.damage_dealt > 0) {
        flat.push({
          kind: 'chip',
          type: 'damage_a',
          message: damageMsg(t.fighter_b.damage_dealt, t.fighter_b.critical, t.fighter_b.effectiveness),
          damage: t.fighter_b.damage_dealt,
          effectiveness: t.fighter_b.effectiveness,
          isCrit: t.fighter_b.critical,
        });
      }
      flat.push({ kind: 'chip', type: 'move_a', message: `Used ${nameA}!` });
      if (t.fighter_a.damage_dealt > 0) {
        flat.push({
          kind: 'chip',
          type: 'damage_b',
          message: damageMsg(t.fighter_a.damage_dealt, t.fighter_a.critical, t.fighter_a.effectiveness),
          damage: t.fighter_a.damage_dealt,
          effectiveness: t.fighter_a.effectiveness,
          isCrit: t.fighter_a.critical,
        });
      }
    }
  }
  return flat;
}

// ── Fighter positions for canvas particle targeting ─────────────────────────
// ClawCombat uses actual DOM element centers; we do the same so effects line up.

function getFighterPositions(arena: HTMLDivElement | null): { posA: { x: number; y: number }; posB: { x: number; y: number } } | null {
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

const POS_A_FALLBACK = { x: 0.25, y: 0.55 };
const POS_B_FALLBACK = { x: 0.75, y: 0.55 };

/** Convert hex to rgba with alpha for type-colored flash overlay. */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── BattleView Component ────────────────────────────────────────────────────

export function BattleView({ battleId, playerNftId, staticBattleData, autoPlay, onDemoComplete }: BattleViewProps) {
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
  const [flashStyle, setFlashStyle] = useState<React.CSSProperties | null>(null);

  // ── Played turn tracking ────────────────────────────────────────────────
  const [playedTurns, setPlayedTurns] = useState(0);
  const [playbackDone, setPlaybackDone] = useState(false);
  const introFogPlayedRef = useRef(false);
  const victoryPlayedRef = useRef(false);
  const [visibleLogEntryCount, setVisibleLogEntryCount] = useState(0);

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
    onDamage: (targetSide: 'a' | 'b', amount: number, isCrit: boolean, effectiveness: string, _attackerSide: 'a' | 'b', attackerType?: CombatType, power?: number) => {
      const dmgType = isCrit ? 'crit' as const
        : effectiveness === 'super_effective' ? 'super-effective' as const
        : effectiveness === 'immune' ? 'immune' as const
        : 'normal' as const;
      setDamageNumbers(prev => [...prev, {
        id: `dmg-${Date.now()}-${Math.random()}`,
        value: amount,
        type: dmgType,
        side: targetSide,
      }]);

      const p = power ?? 60;
      const intensity = isCrit ? 'battle-shake-heavy' : (p >= 80 || amount > 30) ? 'battle-shake' : 'battle-shake-light';
      setShakeClass(intensity);
      setTimeout(() => setShakeClass(''), 500);

      if (isCrit) {
        setFlashClass('battle-flash-overlay battle-flash-crit');
        setFlashStyle(null);
        setTimeout(() => setFlashClass(''), 400);
      } else if (effectiveness === 'super_effective') {
        setFlashClass('battle-flash-overlay battle-flash-super-effective');
        setFlashStyle(null);
        setTimeout(() => setFlashClass(''), 400);
      } else if (amount > 0 && p >= 100 && attackerType) {
        const fx = TYPE_EFFECTS[attackerType];
        if (fx?.flashColor) {
          setFlashClass('battle-flash-overlay');
          setFlashStyle({ background: hexToRgba(fx.flashColor, 0.2) });
          setTimeout(() => {
            setFlashClass('');
            setFlashStyle(null);
          }, 200);
        }
      }

      if (effectiveness && effectiveness !== 'neutral') {
        setCallouts(prev => [...prev, {
          id: `eff-${Date.now()}-${Math.random()}`,
          type: effectiveness as CalloutEntry['type'],
        }]);
      }
    },
    onMoveAnnounce: (side: 'a' | 'b', arena: HTMLDivElement | null) => {
      if (!arena) return;
      const card = arena.querySelector(side === 'a' ? '.fighter-card.player' : '.fighter-card.opponent') as HTMLElement | null;
      if (card) card.classList.add('attacking');
    },
    onAttackingEnd: (attackerSide: 'a' | 'b', arena: HTMLDivElement | null) => {
      if (!arena) return;
      const card = arena.querySelector(attackerSide === 'a' ? '.fighter-card.player' : '.fighter-card.opponent') as HTMLElement | null;
      if (card) card.classList.remove('attacking');
    },
    onAttackAnim: (side: 'a' | 'b', pattern: AttackPattern, durationMs: number, arena: HTMLDivElement | null) => {
      if (!arena) return;
      const card = arena.querySelector(side === 'a' ? '.fighter-card.player' : '.fighter-card.opponent') as HTMLElement | null;
      if (!card) return;
      const isCharge = pattern === 'charge';
      card.classList.add(isCharge ? 'charging' : 'striking');
      setTimeout(() => {
        card.classList.remove('charging', 'striking');
      }, durationMs);
    },
    onLogReveal: () => {
      setVisibleLogEntryCount((c) => c + 1);
    },
    onComplete: () => {
      // Playback finished — mark playback as done for winner/loser state
      setPlaybackDone(true);
      // Call onDemoComplete if in autoPlay mode
      if (autoPlay && onDemoComplete) {
        onDemoComplete();
      }
    },
  }), [autoPlay, onDemoComplete]);

  const {
    isPlaying,
    canvasRef,
    arenaRef,
    playTurns,
  } = useBattlePlayback(callbacks);

  // Reset visible log count when playback starts (per-event reveal)
  const prevPlayingRef = useRef(false);
  useEffect(() => {
    if (isPlaying && !prevPlayingRef.current) {
      setVisibleLogEntryCount(0);
    }
    prevPlayingRef.current = isPlaying;
  }, [isPlaying]);

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
      if (!res.ok) {
        setError(`Battle fetch failed (${res.status})`);
        return;
      }
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

  // If static data provided, use it directly instead of fetching
  useEffect(() => {
    if (staticBattleData) {
      setBattle(staticBattleData);
      return;
    }
    // Poll for updates — stop once battle is completed
    fetchBattle();
    if (battle?.status === 'completed') return;
    const interval = setInterval(fetchBattle, 3000);
    return () => clearInterval(interval);
  }, [fetchBattle, battle?.status, staticBattleData]);

  // ── Initialize HP when battle first loads ───────────────────────────────
  const initializedRef = useRef(false);
  // Reset initialization when battleId changes
  useEffect(() => { initializedRef.current = false; }, [battleId]);
  useEffect(() => {
    if (!battle || initializedRef.current) return;
    initializedRef.current = true;

    // For autoPlay mode (demo), start from full HP and play all turns
    if (autoPlay) {
      setHpA({ current: maxHpA, ghost: maxHpA });
      setHpB({ current: maxHpB, ghost: maxHpB });
      setStatusA(null);
      setStatusB(null);
      setPlayedTurns(0); // Play all turns from the beginning
      return;
    }

    // For normal mode, resume from current state
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
  }, [battle, maxHpA, maxHpB, autoPlay]);

  const victoryDefeatAudioPlayedRef = useRef(false);

  // Reset intro/victory effect refs when battle changes
  useEffect(() => {
    introFogPlayedRef.current = false;
    victoryPlayedRef.current = false;
    victoryDefeatAudioPlayedRef.current = false;
  }, [battle?.id]);

  // ── Play new turns when they arrive ─────────────────────────────────────
  useEffect(() => {
    if (!battle || isPlaying) return;
    if (battle.turns.length <= playedTurns) return;
    if (!battle.fighterA || !battle.fighterB) return;

    const newTurns = battle.turns.slice(playedTurns);
    const typeA = battle.fighterA.type;
    const typeB = battle.fighterB.type;

    // Demo: 2s delay, preload fighter images, then battle-intro, intro fog, then playback
    if (autoPlay && playedTurns === 0 && !introFogPlayedRef.current) {
      introFogPlayedRef.current = true;
      arenaRef.current?.classList.add('battle-intro');
      setTimeout(() => arenaRef.current?.classList.remove('battle-intro'), 1500);
      canvasRef.current?.clear?.();
      requestAnimationFrame(() => canvasRef.current?.playIntroFog?.());

      let cancelled = false;
      const delayMs = 2000;
      const urls = [battle.fighterA?.imageUrl, battle.fighterB?.imageUrl];

      const timeoutId = setTimeout(() => {
        preloadImages(urls).then(() => {
          if (cancelled) return;
          requestAnimationFrame(() => {
            if (cancelled) return;
            const positions = getFighterPositions(arenaRef.current);
            const posA = positions?.posA ?? POS_A_FALLBACK;
            const posB = positions?.posB ?? POS_B_FALLBACK;
            playTurns(newTurns, typeA, typeB, posA, posB);
            setPlayedTurns(battle.turns.length);
          });
        });
      }, delayMs);

      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    }

    // Use actual fighter positions when available (ClawCombat style)
    const positions = getFighterPositions(arenaRef.current);
    const posA = positions?.posA ?? POS_A_FALLBACK;
    const posB = positions?.posB ?? POS_B_FALLBACK;
    playTurns(newTurns, typeA, typeB, posA, posB);
    setPlayedTurns(battle.turns.length);
  }, [battle, playedTurns, isPlaying, playTurns, autoPlay, canvasRef, arenaRef]);

  // Victory confetti when demo playback completes (defer one frame so winner/loser state is painted)
  useEffect(() => {
    if (!playbackDone || !autoPlay || !battle?.winner || victoryPlayedRef.current) return;
    victoryPlayedRef.current = true;
    const side = battle.winner === battle.fighterA?.nft_id ? 'a' : 'b';
    const id = requestAnimationFrame(() => {
      canvasRef.current?.playVictory(side);
    });
    return () => cancelAnimationFrame(id);
  }, [playbackDone, autoPlay, battle?.winner, battle?.fighterA?.nft_id, canvasRef]);

  // Victory/defeat audio when battle completes (no UI box)
  useEffect(() => {
    if (!battle?.winner || victoryDefeatAudioPlayedRef.current) return;
    victoryDefeatAudioPlayedRef.current = true;
    const audio = getBattleAudio();
    if (battle.winner === playerNftId) {
      audio.victory();
    } else {
      audio.defeat();
    }
  }, [battle?.winner, playerNftId]);

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

  // ── Timeout handler — auto-submit random move when timer expires ────────
  const handleTimeout = useCallback(() => {
    if (!battle?.fighterA || !battle?.fighterB || !playerNftId) return;
    const isA = playerNftId === battle.fighterA.nft_id;
    const fighter = isA ? battle.fighterA : battle.fighterB;
    if (fighter?.moves?.length) {
      const randomMove = fighter.moves[Math.floor(Math.random() * fighter.moves.length)];
      handleSubmitMove(randomMove.id);
    }
  }, [battle, playerNftId, handleSubmitMove]);

  // Battle log: flat entries for per-event scroll (ClawCombat-style).
  // Sliding window so newest is always on the right; old entries drop off the left.
  const LOG_WINDOW_SIZE = 24;
  const flatLogEntries = useMemo(
    () => (battle?.turns ? buildFlatLogEntries(battle.turns) : []),
    [battle?.turns]
  );
  const visibleLogEntries = isPlaying
    ? flatLogEntries.slice(
        Math.max(0, visibleLogEntryCount - LOG_WINDOW_SIZE),
        visibleLogEntryCount
      )
    : flatLogEntries;

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
      <div className="card-static p-6 text-center" role="status" aria-label="Loading battle">
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
  // In autoPlay mode, don't show winner/loser state until animation finishes
  const isEffectivelyComplete = autoPlay ? playbackDone : isComplete;
  const isPlayerWinner = isEffectivelyComplete && battle.winner === playerNftId;
  const isOpponentWinner = isEffectivelyComplete && battle.winner != null && battle.winner !== playerNftId;
  const playerImgClass = isPlayerWinner
    ? 'winner-glow'
    : (isOpponentWinner ? 'loser-fade' : '');
  const opponentImgClass = isOpponentWinner
    ? 'winner-glow'
    : (isPlayerWinner ? 'loser-fade' : '');

  // AI Sparring detection
  const isSparring = opponentFighter?.nft_id === 'ai_sparring_partner';

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

      {/* AI Sparring banner */}
      {isSparring && (
        <div
          className="flex items-center gap-2 p-2 rounded-lg text-sm"
          style={{
            background: 'var(--color-cyan-15)',
            borderColor: 'var(--color-cyan)',
            borderWidth: 1,
            borderStyle: 'solid',
          }}
        >
          <Bot size={16} style={{ color: 'var(--color-cyan)' }} />
          <span style={{ color: 'var(--color-cyan)' }}>
            AI Sparring Match — reduced Power rewards
          </span>
        </div>
      )}

      {/* ── Battle Arena ─────────────────────────────────────────────── */}
      <div className="battle-arena-wrapper">
        <div
          ref={arenaRef}
          className={`battle-arena ${shakeClass}`}
        >
          {/* Arena overlays */}
          <div className="arena-scanlines" />
          <div className="arena-circuits" />
          <div className="arena-data-streams">
            <div className="data-stream" />
            <div className="data-stream" />
            <div className="data-stream" />
            <div className="data-stream" />
          </div>

          {/* HUD brackets */}
          <div className="hud-bracket tl" />
          <div className="hud-bracket tr" />
          <div className="hud-bracket bl" />
          <div className="hud-bracket br" />

          {/* VS emblem */}
          <div className="vs-emblem">VS</div>

          {/* Flash overlay */}
          {flashClass && <div className={flashClass} style={flashStyle ?? undefined} />}

          {/* Effectiveness callouts */}
          {callouts.map(c => (
            <EffectivenessCallout
              key={c.id}
              id={c.id}
              type={c.type}
              onComplete={() => removeCallout(c.id)}
            />
          ))}

          {/* Player fighter card (left) */}
          {playerFighter && (
            <div
              className={`fighter-card player ${playerImgClass}`}
              style={{ '--frame-color': `var(--type-${playerFighter.type.toLowerCase()})` } as React.CSSProperties}
            >
              {/* Fighter frame with type glow */}
              <div className="fighter-frame">
                <div className="frame-glow" />
                <div className="frame-border-outer" />
                <div className="frame-border-inner" />
                <div className="frame-node tl" />
                <div className="frame-node tr" />
                <div className="frame-node bl" />
                <div className="frame-node br" />
                <div className="frame-accent top" />
                <div className="frame-accent bottom" />
                <div className="frame-accent left" />
                <div className="frame-accent right" />
                {playerFighter.imageUrl ? (
                  <img
                    src={playerFighter.imageUrl}
                    alt="Your fighter"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      img.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div
                  className={playerFighter.imageUrl ? 'hidden' : ''}
                  style={{
                    display: playerFighter.imageUrl ? undefined : 'flex',
                    width: '100%',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 4,
                    background: 'rgba(30, 40, 55, 0.9)',
                    borderRadius: '4px',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <Swords size={32} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-xs text-muted">#{playerFighter.edition}</span>
                </div>
              </div>

              {/* HP container */}
              <div className={`hp-container ${playerHp.current / playerMaxHp < 0.2 ? 'warning' : ''}`}>
                <div className="hp-label">
                  <div className="flex items-center gap-1">
                    <span className="hp-name" style={{ color: `var(--type-${playerFighter.type.toLowerCase()})` }}>
                      #{playerFighter.edition}
                    </span>
                    <span className="hp-level">Lv.{playerFighter.level}</span>
                    <StatusIcon status={playerStatus} />
                  </div>
                  <span
                    className="hp-type"
                    style={{ background: `var(--type-${playerFighter.type.toLowerCase()})` }}
                  >
                    {playerFighter.type}
                  </span>
                </div>
                <div className="hp-bar-bg">
                  <div
                    className="hp-ghost"
                    style={{ width: `${(playerHp.ghost / playerMaxHp) * 100}%` }}
                  />
                  <div
                    className={`hp-bar ${
                      playerHp.current / playerMaxHp < 0.2 ? 'critical' :
                      playerHp.current / playerMaxHp < 0.5 ? 'low' : ''
                    }`}
                    style={{ width: `${(playerHp.current / playerMaxHp) * 100}%` }}
                  />
                </div>
                <span className="hp-text">{Math.ceil(playerHp.current)}/{playerMaxHp}</span>
              </div>

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
          )}

          {/* Opponent fighter card (right) */}
          {opponentFighter && (
            <div
              className={`fighter-card opponent ${opponentImgClass}`}
              style={{ '--frame-color': `var(--type-${opponentFighter.type.toLowerCase()})` } as React.CSSProperties}
            >
              {/* Fighter frame with type glow */}
              <div className="fighter-frame">
                <div className="frame-glow" />
                <div className="frame-border-outer" />
                <div className="frame-border-inner" />
                <div className="frame-node tl" />
                <div className="frame-node tr" />
                <div className="frame-node bl" />
                <div className="frame-node br" />
                <div className="frame-accent top" />
                <div className="frame-accent bottom" />
                <div className="frame-accent left" />
                <div className="frame-accent right" />
                {isSparring ? (
                  <div
                    style={{
                      display: 'flex',
                      width: '100%',
                      height: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0, 180, 216, 0.15)',
                      borderRadius: '4px',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <Bot size={48} style={{ color: 'var(--color-cyan)' }} />
                  </div>
                ) : opponentFighter.imageUrl ? (
                  <img
                    src={opponentFighter.imageUrl}
                    alt="Opponent"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      img.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      width: '100%',
                      height: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: 4,
                      background: 'rgba(30, 40, 55, 0.9)',
                      borderRadius: '4px',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <Swords size={32} style={{ color: 'var(--color-text-muted)' }} />
                    <span className="text-xs text-muted">#{opponentFighter.edition}</span>
                  </div>
                )}
              </div>

              {/* HP container */}
              <div className={`hp-container ${opponentHp.current / opponentMaxHp < 0.2 ? 'warning' : ''}`}>
                <div className="hp-label">
                  <div className="flex items-center gap-1">
                    {isSparring && <Bot size={12} style={{ color: 'var(--color-cyan)' }} />}
                    <span className="hp-name" style={{ color: `var(--type-${opponentFighter.type.toLowerCase()})` }}>
                      {isSparring ? 'AI Sparring' : `#${opponentFighter.edition}`}
                    </span>
                    <span className="hp-level">Lv.{opponentFighter.level}</span>
                    <StatusIcon status={opponentStatus} />
                  </div>
                  <span
                    className="hp-type"
                    style={{ background: `var(--type-${opponentFighter.type.toLowerCase()})` }}
                  >
                    {opponentFighter.type}
                  </span>
                </div>
                <div className="hp-bar-bg">
                  <div
                    className="hp-ghost"
                    style={{ width: `${(opponentHp.ghost / opponentMaxHp) * 100}%` }}
                  />
                  <div
                    className={`hp-bar ${
                      opponentHp.current / opponentMaxHp < 0.2 ? 'critical' :
                      opponentHp.current / opponentMaxHp < 0.5 ? 'low' : ''
                    }`}
                    style={{ width: `${(opponentHp.current / opponentMaxHp) * 100}%` }}
                  />
                </div>
                <span className="hp-text">{Math.ceil(opponentHp.current)}/{opponentMaxHp}</span>
              </div>

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
          )}

          {/* Particle overlay last so it paints on top of fighter cards (see audit plan) */}
          <BattleCanvas ref={canvasRef} />
        </div>
      </div>

      {/* Turn timer — 30s countdown when it's your turn (hide in autoPlay mode) */}
      {!autoPlay && !isComplete && !isPlaying && playerFighter?.moves && playerNftId && (
        <div className="flex items-center justify-center mb-3">
          <TurnTimer
            totalSeconds={30}
            onTimeout={handleTimeout}
            isPaused={isComplete || isPlaying}
          />
        </div>
      )}

      {/* Move buttons (manual mode only, when not complete and not playing, hide in autoPlay mode) */}
      {!autoPlay && !isComplete && !isPlaying && playerFighter?.moves && playerNftId && (
        <MoveButtons
          moves={playerFighter.moves}
          onSubmit={handleSubmitMove}
          disabled={isSubmitting}
        />
      )}

      {/* Turn log — progressive per-event during playback, full when idle */}
      <TurnLog entries={visibleLogEntries} />
    </div>
  );
}
