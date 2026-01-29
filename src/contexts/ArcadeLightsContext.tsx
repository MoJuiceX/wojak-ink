/* eslint-disable react-refresh/only-export-components */
/**
 * Arcade Lights Context
 *
 * Provides reactive arcade button light control for games.
 * Games can trigger light patterns via:
 * 1. NEW: triggerEvent('event:name') - semantic events mapped to patterns
 * 2. LEGACY: setSequence('sequenceName') - direct sequence control
 *
 * @see src/config/arcade-light-patterns.ts for pattern definitions
 * @see src/config/arcade-light-mappings.ts for event→pattern mappings
 */

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  type PatternName,
  PATTERNS,
} from '@/config/arcade-light-patterns';
import {
  type GameEvent,
  getPatternForEvent,
  getComboTier,
} from '@/config/arcade-light-mappings';

// ============================================
// LEGACY TYPES (for backward compatibility)
// ============================================

export type LightSequence =
  | 'off'
  | 'idle'
  | 'startup'
  | 'gameStart'
  | 'playing'
  | 'score'
  | 'pipePass'
  | 'coinCollect'
  | 'combo'
  | 'win'
  | 'highScore'
  | 'gameOver';

export type PlayingIntensity = 'very-low' | 'low' | 'medium' | 'high';
export type ScoreSize = 'small' | 'medium' | 'large';
export type PipePassTier = 'early' | 'warming' | 'heated' | 'intense';

export interface LightOptions {
  intensity?: PlayingIntensity;
  comboLevel?: number;
  scoreSize?: ScoreSize;
  pipePassTier?: PipePassTier;
  pipePassVariant?: number;
}

// ============================================
// NEW PATTERN-BASED TYPES
// ============================================

export interface EventOptions {
  /** Override the default return-to pattern after transient patterns */
  returnTo?: PatternName;
  /** Custom duration override (for transient patterns) */
  duration?: number;
}

// ============================================
// CONTEXT TYPE
// ============================================

interface ArcadeLightsContextType {
  // Current state
  sequence: LightSequence;
  options: LightOptions;
  pattern: PatternName | null;
  gameId: string | null;

  // NEW: Event-based API (preferred)
  triggerEvent: (event: GameEvent, opts?: EventOptions) => void;
  setPattern: (pattern: PatternName, opts?: EventOptions) => void;
  setGameId: (gameId: string) => void;

  // LEGACY: Direct sequence control (for backward compatibility)
  setSequence: (seq: LightSequence, opts?: LightOptions) => void;
  triggerScore: (size?: ScoreSize) => void;
  triggerPipePass: (score: number) => void;
  triggerCoinCollect: () => void;
  setCombo: (level: number) => void;
  clearCombo: () => void;
}

const ArcadeLightsContext = createContext<ArcadeLightsContextType | null>(null);

// Game-specific light intensity defaults (legacy)
export const GAME_LIGHT_INTENSITY: Record<string, PlayingIntensity> = {
  'flappy-orange': 'low',
  'color-reaction': 'medium',
  'wojak-runner': 'low',
  'block-puzzle': 'very-low',
  'memory-match': 'low',
  'merge-2048': 'low',
  'brick-by-brick': 'medium',
  'orange-stack': 'medium',
  'orange-pong': 'medium',
  'orange-juggle': 'medium',
  'knife-game': 'low',
  'citrus-drop': 'medium',
  'orange-snake': 'low',
  'brick-breaker': 'medium',
  'wojak-whack': 'medium',
  'orange-wordle': 'very-low',
};

// Map legacy sequences to patterns for dual-mode support
const SEQUENCE_TO_PATTERN: Partial<Record<LightSequence, PatternName>> = {
  'idle': 'breathe',
  'startup': 'explode',
  'gameStart': 'explode',
  'win': 'orbit',
  'highScore': 'fireworks',
  'gameOver': 'alarm',
  'coinCollect': 'implode',
};

export function ArcadeLightsProvider({ children }: { children: ReactNode }) {
  // Legacy state
  const [sequence, setSequenceState] = useState<LightSequence>('off');
  const [options, setOptions] = useState<LightOptions>({});

  // New pattern state
  const [pattern, setPatternState] = useState<PatternName | null>(null);
  const [gameId, setGameIdState] = useState<string | null>(null);

  // Refs for managing transient patterns
  const previousPatternRef = useRef<PatternName>('glow');
  const previousSequenceRef = useRef<LightSequence>('playing');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // NEW API: Event-based pattern triggering
  // ============================================

  const setGameId = useCallback((id: string) => {
    setGameIdState(id);
  }, []);

  const setPattern = useCallback((newPattern: PatternName, opts?: EventOptions) => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Track previous pattern for return-to behavior (exclude transient)
    const patternDef = PATTERNS[newPattern];
    if (patternDef.loop) {
      previousPatternRef.current = newPattern;
    }

    setPatternState(newPattern);

    // For non-looping patterns, return to previous state after duration
    if (!patternDef.loop) {
      const duration = opts?.duration ?? patternDef.duration;
      const returnTo = opts?.returnTo ?? previousPatternRef.current;

      timeoutRef.current = setTimeout(() => {
        setPatternState(returnTo);
      }, duration);
    }
  }, []);

  const triggerEvent = useCallback((event: GameEvent, opts?: EventOptions) => {
    const resolvedPattern = getPatternForEvent(event, gameId ?? undefined);
    setPattern(resolvedPattern, opts);
  }, [gameId, setPattern]);

  // ============================================
  // LEGACY API: Direct sequence control
  // ============================================

  const setSequence = useCallback((seq: LightSequence, opts?: LightOptions) => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Track previous sequence for recovery
    if (seq !== 'score' && seq !== 'gameOver' && seq !== 'highScore') {
      previousSequenceRef.current = seq;
    }

    setSequenceState(seq);
    setOptions(opts || {});

    // Also set the corresponding pattern for dual-mode rendering
    const mappedPattern = SEQUENCE_TO_PATTERN[seq];
    if (mappedPattern) {
      setPatternState(mappedPattern);
    } else if (seq === 'playing') {
      // Map playing intensities to ambient patterns
      const intensity = opts?.intensity ?? 'low';
      const ambientPattern: PatternName =
        intensity === 'very-low' ? 'simmer' :
        intensity === 'low' ? 'glow' :
        intensity === 'medium' ? 'glow' :
        'throb';
      setPatternState(ambientPattern);
      previousPatternRef.current = ambientPattern;
    } else if (seq === 'off') {
      setPatternState(null);
    }
  }, []);

  const triggerScore = useCallback((size: ScoreSize = 'medium') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setSequenceState('score');
    setOptions({ scoreSize: size });

    // Map to flash patterns
    const flashPattern: PatternName =
      size === 'small' ? 'spark' :
      size === 'medium' ? 'flash' :
      'blaze';
    setPatternState(flashPattern);

    // Return to previous state after flash
    const duration = size === 'small' ? 200 : size === 'medium' ? 250 : 300;
    timeoutRef.current = setTimeout(() => {
      setSequenceState(previousSequenceRef.current);
      setOptions({});
      setPatternState(previousPatternRef.current);
    }, duration);
  }, []);

  const triggerPipePass = useCallback((score: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Determine tier based on score
    let tier: PipePassTier;
    if (score <= 5) tier = 'early';
    else if (score <= 15) tier = 'warming';
    else if (score <= 30) tier = 'heated';
    else tier = 'intense';

    const variant = score % 4;

    setSequenceState('pipePass');
    setOptions({ pipePassTier: tier, pipePassVariant: variant });

    // Map to wave pattern
    setPatternState('waveRight');

    // Return to playing state after flash
    const duration = tier === 'early' ? 200 : tier === 'warming' ? 250 : tier === 'heated' ? 300 : 350;
    timeoutRef.current = setTimeout(() => {
      setSequenceState(previousSequenceRef.current);
      setOptions({});
      setPatternState(previousPatternRef.current);
    }, duration);
  }, []);

  const triggerCoinCollect = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setSequenceState('coinCollect');
    setOptions({});
    setPatternState('implode');

    timeoutRef.current = setTimeout(() => {
      setSequenceState(previousSequenceRef.current);
      setOptions({});
      setPatternState(previousPatternRef.current);
    }, 300);
  }, []);

  const setCombo = useCallback((level: number) => {
    if (level >= 2) {
      setSequenceState('combo');
      setOptions({ comboLevel: level });

      // Map to chase patterns based on level
      const tier = getComboTier(level);
      const chasePattern: PatternName =
        tier === 'start' || tier === 'low' ? 'glow' :
        tier === 'mid' ? 'orbit' :
        tier === 'high' ? 'spin' :
        'strobe';
      setPatternState(chasePattern);
    }
  }, []);

  const clearCombo = useCallback(() => {
    setSequenceState('playing');
    setOptions({});
    setPatternState(previousPatternRef.current);
  }, []);

  return (
    <ArcadeLightsContext.Provider value={{
      // State
      sequence,
      options,
      pattern,
      gameId,

      // New API
      triggerEvent,
      setPattern,
      setGameId,

      // Legacy API
      setSequence,
      triggerScore,
      triggerPipePass,
      triggerCoinCollect,
      setCombo,
      clearCombo,
    }}>
      {children}
    </ArcadeLightsContext.Provider>
  );
}

/**
 * Hook to control arcade button lights from games.
 * Returns no-op functions when used outside provider (e.g., mobile).
 */
export function useArcadeLights() {
  const context = useContext(ArcadeLightsContext);
  if (!context) {
    // Return no-op functions when outside provider (e.g., mobile)
    return {
      sequence: 'off' as LightSequence,
      options: {} as LightOptions,
      pattern: null as PatternName | null,
      gameId: null as string | null,

      // New API (no-ops)
      triggerEvent: () => {},
      setPattern: () => {},
      setGameId: () => {},

      // Legacy API (no-ops)
      setSequence: () => {},
      triggerScore: () => {},
      triggerPipePass: () => {},
      triggerCoinCollect: () => {},
      setCombo: () => {},
      clearCombo: () => {},
    };
  }
  return context;
}

// Re-export types for convenience
export type { PatternName, GameEvent };

export default ArcadeLightsContext;
