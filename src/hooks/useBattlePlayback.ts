// src/hooks/useBattlePlayback.ts
// Battle Playback Engine — orchestrates timed animations, audio, particles, and DOM effects
// Takes TurnResult[] and plays them back with calculated delays from ANIM_TIMING.

import { useRef, useCallback, useState, useEffect } from 'react';
import type { TurnResult } from '@/lib/combat/battle-state';
import type { CombatType } from '@/lib/combat/types';
import type { AttackPattern } from '@/lib/combat/particles';
import { ANIM_TIMING, resolveAttackPattern } from '@/lib/combat/particles';
import { getMoveById } from '@/lib/combat/data/moves';
import { getBattleAudio } from '@/lib/combat/audio';
import type { BattleCanvasRef } from '@/components/combat/BattleCanvas';

// ── Timeline Event Types ────────────────────────────────────────────────────

export type TimelineEventType =
  | 'turn_start'
  | 'move_announce'
  | 'attack_anim'
  | 'damage'
  | 'crit'
  | 'effectiveness'
  | 'hp_update'
  | 'status'
  | 'heal'
  | 'shake'
  | 'faint';

export type Side = 'a' | 'b';

export interface TimelineEvent {
  type: TimelineEventType;
  delay: number;         // ms from turn start
  side: Side;            // which fighter this event applies to
  /** Move name for announce, damage amount for damage/heal, etc. */
  value?: string;
  amount?: number;
  amplitude?: 'light' | 'heavy';
  pattern?: AttackPattern;
  moveType?: CombatType;
  movePower?: number;
  isCrit?: boolean;
  effectiveness?: 'super_effective' | 'not_very_effective' | 'neutral' | 'immune';
  hp?: number;
  maxHp?: number;
}

// ── Callbacks ───────────────────────────────────────────────────────────────

export interface PlaybackCallbacks {
  onHpUpdate?: (side: Side, hp: number, maxHp: number) => void;
  onStatusChange?: (side: Side, status: string | null) => void;
  onComplete?: () => void;
}

// ── Position type for fighter placement ──────────────────────────────────────

export interface FighterPosition {
  x: number;
  y: number;
}

// ── buildTurnTimeline (pure function, exported for testing) ─────────────────

/**
 * Converts a single TurnResult into a flat array of TimelineEvent objects
 * with delay timings. Events are ordered by first mover then second mover.
 */
export function buildTurnTimeline(
  turn: TurnResult,
  typeA: CombatType,
  typeB: CombatType,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  let delay = 0;

  // Turn start marker
  events.push({ type: 'turn_start', delay: 0, side: 'a' });

  // Determine move order
  const firstSide: Side = turn.order === 'a_first' ? 'a' : 'b';
  const secondSide: Side = turn.order === 'a_first' ? 'b' : 'a';

  const firstData = turn.order === 'a_first' ? turn.fighter_a : turn.fighter_b;
  const secondData = turn.order === 'a_first' ? turn.fighter_b : turn.fighter_a;

  const firstType = turn.order === 'a_first' ? typeA : typeB;
  const secondType = turn.order === 'a_first' ? typeB : typeA;

  // The "target" of first mover's attack is the second side
  const firstTargetSide = secondSide;
  const secondTargetSide = firstSide;

  // ── First mover's action ──────────────────────────────────────────

  delay = emitMoveEvents(
    events, delay, firstSide, firstTargetSide,
    firstData, firstType,
  );

  // ── Second mover's action ─────────────────────────────────────────
  // Only if second mover is still alive after first attack
  delay = emitMoveEvents(
    events, delay, secondSide, secondTargetSide,
    secondData, secondType,
  );

  // ── End-of-turn: faint checks ─────────────────────────────────────

  if (turn.end_of_turn.fighter_a_hp <= 0) {
    delay += ANIM_TIMING.knockoutPause;
    events.push({ type: 'faint', delay, side: 'a' });
  }
  if (turn.end_of_turn.fighter_b_hp <= 0) {
    delay += ANIM_TIMING.knockoutPause;
    events.push({ type: 'faint', delay, side: 'b' });
  }

  return events;
}

/**
 * Emit timeline events for one side's move (announce, attack, damage, crit, effectiveness, status, heal, hp_update).
 * Returns updated delay.
 */
function emitMoveEvents(
  events: TimelineEvent[],
  delay: number,
  attackerSide: Side,
  targetSide: Side,
  data: TurnResult['fighter_a'],
  attackerType: CombatType,
): number {
  // Look up the move
  const move = getMoveById(data.move);
  const moveName = move?.name ?? data.move;
  const moveType = (move?.type ?? attackerType) as CombatType;
  const category = move?.category ?? 'physical';
  const power = move?.power ?? 60;
  const effects = move?.effects;

  // Resolve attack pattern
  const pattern = resolveAttackPattern(moveName, category, power, effects);

  // Move announce: "X used Y!"
  delay += ANIM_TIMING.useMoveTelegraph;
  events.push({
    type: 'move_announce',
    delay,
    side: attackerSide,
    value: moveName,
    moveType,
  });

  // Attack animation (particles + attacker movement)
  const travelTime = ANIM_TIMING.travelTime[pattern] ?? ANIM_TIMING.travelTime.default;
  delay += travelTime;
  events.push({
    type: 'attack_anim',
    delay,
    side: attackerSide,
    pattern,
    moveType,
    movePower: power,
  });

  // Critical hit
  if (data.critical) {
    delay += ANIM_TIMING.critFreeze;
    events.push({
      type: 'crit',
      delay,
      side: targetSide,
    });
    events.push({
      type: 'shake',
      delay,
      side: targetSide,
      amplitude: 'heavy',
    });
  }

  // Damage number
  if (data.damage_dealt > 0) {
    delay += ANIM_TIMING.damageDisplay;
    events.push({
      type: 'damage',
      delay,
      side: targetSide,
      amount: data.damage_dealt,
      isCrit: data.critical,
      effectiveness: data.effectiveness,
    });
  }

  // Effectiveness callout (only for non-neutral)
  if (data.effectiveness !== 'neutral') {
    delay += 400; // effectiveness display
    events.push({
      type: 'effectiveness',
      delay,
      side: targetSide,
      value: data.effectiveness,
    });
  }

  // HP update on the target
  delay += ANIM_TIMING.postDamage;
  events.push({
    type: 'hp_update',
    delay,
    side: targetSide,
    hp: targetSide === 'a' ? data.hp_before - data.damage_dealt : undefined,
    amount: data.damage_dealt,
  });

  // HP update on attacker (for recoil etc — show current hp)
  events.push({
    type: 'hp_update',
    delay,
    side: attackerSide,
    hp: data.hp_after,
  });

  // Status applied to target
  if (data.status_applied) {
    delay += ANIM_TIMING.statusInflict;
    events.push({
      type: 'status',
      delay,
      side: targetSide,
      value: data.status_applied,
    });
  }

  // Heal on attacker (e.g. drain moves)
  if (data.heal_amount && data.heal_amount > 0) {
    delay += ANIM_TIMING.healEffect;
    events.push({
      type: 'heal',
      delay,
      side: attackerSide,
      amount: data.heal_amount,
    });
  }

  return delay;
}

// ── DOM Effect Helpers (private) ────────────────────────────────────────────

function showDamageNumber(
  arena: HTMLDivElement,
  side: Side,
  amount: number,
  isCrit: boolean,
  effectiveness: string,
): void {
  const el = document.createElement('div');
  el.className = 'damage-number';
  el.textContent = `-${amount}`;

  if (isCrit) el.classList.add('damage-crit');
  if (effectiveness === 'super_effective') el.classList.add('damage-super');
  if (effectiveness === 'not_very_effective') el.classList.add('damage-weak');
  if (effectiveness === 'immune') el.classList.add('damage-immune');

  el.style.position = 'absolute';
  el.style.left = side === 'a' ? '25%' : '75%';
  el.style.top = '40%';
  el.style.transform = 'translate(-50%, -50%)';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '20';

  arena.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function showCritText(arena: HTMLDivElement, side: Side): void {
  const el = document.createElement('div');
  el.className = 'crit-text';
  el.textContent = 'CRITICAL!';

  el.style.position = 'absolute';
  el.style.left = side === 'a' ? '25%' : '75%';
  el.style.top = '30%';
  el.style.transform = 'translate(-50%, -50%)';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '20';

  arena.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function triggerShake(arena: HTMLDivElement, amplitude: 'light' | 'heavy'): void {
  const cls = amplitude === 'heavy' ? 'screen-shake-heavy' : 'screen-shake';
  const duration = amplitude === 'heavy' ? 500 : 300;
  arena.classList.add(cls);
  setTimeout(() => arena.classList.remove(cls), duration);
}

function showEffectivenessCallout(arena: HTMLDivElement, effectiveness: string): void {
  const labels: Record<string, string> = {
    super_effective: "It's super effective!",
    not_very_effective: "It's not very effective...",
    immune: "It had no effect.",
  };
  const text = labels[effectiveness];
  if (!text) return;

  const el = document.createElement('div');
  el.className = `effectiveness-callout effectiveness-${effectiveness}`;
  el.textContent = text;

  el.style.position = 'absolute';
  el.style.left = '50%';
  el.style.top = '50%';
  el.style.transform = 'translate(-50%, -50%)';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '20';

  arena.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ── useBattlePlayback Hook ──────────────────────────────────────────────────

export interface UseBattlePlaybackReturn {
  /** Whether playback is currently running */
  isPlaying: boolean;
  /** Current turn being played (0-indexed from the turns array) */
  currentTurn: number;
  /** Playback speed multiplier */
  speed: number;
  /** Ref to attach to BattleCanvas */
  canvasRef: React.RefObject<BattleCanvasRef | null>;
  /** Ref to attach to the arena container div */
  arenaRef: React.RefObject<HTMLDivElement | null>;
  /** Play all turns with timed animations */
  playTurns: (
    turns: TurnResult[],
    typeA: CombatType,
    typeB: CombatType,
    posA: FighterPosition,
    posB: FighterPosition,
  ) => void;
  /** Stop all playback, clearing pending timers */
  stop: () => void;
  /** Set playback speed multiplier (0.5, 1, 2, 4) */
  setSpeed: (n: number) => void;
}

export function useBattlePlayback(
  callbacks?: PlaybackCallbacks,
): UseBattlePlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [speed, setSpeedState] = useState(1);

  const canvasRef = useRef<BattleCanvasRef | null>(null);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const speedRef = useRef(1);

  // Keep speedRef in sync
  const setSpeed = useCallback((n: number) => {
    speedRef.current = n;
    setSpeedState(n);
  }, []);

  // Clean up all timers when component unmounts
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current) {
        clearTimeout(timer);
      }
      timersRef.current = [];
    };
  }, []);

  const stop = useCallback(() => {
    for (const timer of timersRef.current) {
      clearTimeout(timer);
    }
    timersRef.current = [];
    setIsPlaying(false);
  }, []);

  const playTurns = useCallback((
    turns: TurnResult[],
    typeA: CombatType,
    typeB: CombatType,
    posA: FighterPosition,
    posB: FighterPosition,
  ) => {
    // Clear any existing playback
    stop();

    if (turns.length === 0) {
      callbacks?.onComplete?.();
      return;
    }

    setIsPlaying(true);
    setCurrentTurn(0);

    const audio = getBattleAudio();
    const allTimers: ReturnType<typeof setTimeout>[] = [];

    let turnBaseDelay = 0;

    for (let turnIdx = 0; turnIdx < turns.length; turnIdx++) {
      const turn = turns[turnIdx];
      const timeline = buildTurnTimeline(turn, typeA, typeB);

      for (const event of timeline) {
        const eventDelay = (turnBaseDelay + event.delay) / speedRef.current;

        const timer = setTimeout(() => {
          setCurrentTurn(turnIdx);
          processEvent(event, turn, typeA, typeB, posA, posB, audio, canvasRef.current, arenaRef.current, callbacks);
        }, eventDelay);

        allTimers.push(timer);
      }

      // Calculate how long this turn takes (max delay from its timeline)
      const maxDelay = timeline.length > 0
        ? Math.max(...timeline.map(e => e.delay))
        : 0;
      turnBaseDelay += maxDelay + ANIM_TIMING.turnGap;
    }

    // On-complete callback after all events
    const completeTimer = setTimeout(() => {
      setIsPlaying(false);
      callbacks?.onComplete?.();
    }, turnBaseDelay / speedRef.current);
    allTimers.push(completeTimer);

    timersRef.current = allTimers;
  }, [stop, callbacks]);

  return {
    isPlaying,
    currentTurn,
    speed,
    canvasRef,
    arenaRef,
    playTurns,
    stop,
    setSpeed,
  };
}

// ── Event Processing ────────────────────────────────────────────────────────

function processEvent(
  event: TimelineEvent,
  turn: TurnResult,
  typeA: CombatType,
  typeB: CombatType,
  posA: FighterPosition,
  posB: FighterPosition,
  audio: ReturnType<typeof getBattleAudio>,
  canvas: BattleCanvasRef | null,
  arena: HTMLDivElement | null,
  callbacks?: PlaybackCallbacks,
): void {
  const resolveType = (side: Side): CombatType => side === 'a' ? typeA : typeB;
  const resolvePos = (side: Side): FighterPosition => side === 'a' ? posA : posB;
  const resolveTargetPos = (side: Side): FighterPosition => side === 'a' ? posB : posA;

  switch (event.type) {
    case 'turn_start': {
      audio.turnStart();
      break;
    }

    case 'move_announce': {
      // Move telegraph — no visual effect beyond UI state update
      // Parent can listen via state changes
      break;
    }

    case 'attack_anim': {
      // Spawn particles
      if (canvas && event.pattern) {
        const startPos = resolvePos(event.side);
        const targetPos = resolveTargetPos(event.side);
        canvas.playAttack({
          startX: startPos.x,
          startY: startPos.y,
          targetX: targetPos.x,
          targetY: targetPos.y,
          type: event.moveType ?? resolveType(event.side),
          power: event.movePower ?? 60,
          pattern: event.pattern,
        });
      }
      // Hit sound
      if (event.moveType) {
        audio.hit(event.moveType);
      }
      break;
    }

    case 'crit': {
      audio.hitCrit();
      if (arena) {
        showCritText(arena, event.side);
      }
      break;
    }

    case 'damage': {
      if (arena && event.amount !== undefined) {
        showDamageNumber(
          arena,
          event.side,
          event.amount,
          event.isCrit ?? false,
          event.effectiveness ?? 'neutral',
        );
      }
      // Super effective sound
      if (event.effectiveness === 'super_effective') {
        audio.hitSuper(event.moveType);
      }
      break;
    }

    case 'effectiveness': {
      if (arena && event.value) {
        showEffectivenessCallout(arena, event.value);
      }
      break;
    }

    case 'hp_update': {
      // Determine which fighter's data to use
      const side = event.side;
      const fighterData = side === 'a' ? turn.fighter_a : turn.fighter_b;
      const endHp = side === 'a'
        ? turn.end_of_turn.fighter_a_hp
        : turn.end_of_turn.fighter_b_hp;
      // For maxHp, use hp_before as proxy (the actual maxHp is held by parent)
      const maxHpEstimate = Math.max(fighterData.hp_before, fighterData.hp_after, endHp);
      callbacks?.onHpUpdate?.(side, endHp, maxHpEstimate);
      break;
    }

    case 'status': {
      audio.statusInflict();
      const side = event.side;
      callbacks?.onStatusChange?.(side, event.value ?? null);
      break;
    }

    case 'heal': {
      audio.heal();
      break;
    }

    case 'shake': {
      if (arena) {
        triggerShake(arena, event.amplitude ?? 'light');
      }
      break;
    }

    case 'faint': {
      audio.faint();
      const side = event.side;
      callbacks?.onHpUpdate?.(side, 0, 0);
      break;
    }
  }
}
