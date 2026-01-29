/**
 * Arcade Light Event Mappings
 *
 * Maps semantic game events to visual patterns.
 * Games call triggerEvent('event:name') and the system resolves to the right pattern.
 *
 * @see src/config/arcade-light-patterns.ts for pattern definitions
 */

import type { PatternName } from './arcade-light-patterns';

// ============================================
// GAME EVENT TYPES
// ============================================

/**
 * All available game events that can trigger light patterns.
 * Events are namespaced: 'category:specific'
 */
export type GameEvent =
  // Lifecycle events
  | 'game:start'
  | 'game:over'
  | 'game:win'
  | 'game:highScore'
  | 'game:pause'
  | 'game:resume'

  // Gameplay state changes
  | 'play:idle'
  | 'play:active'
  | 'play:intense'

  // Scoring events (sized)
  | 'score:tiny'
  | 'score:small'
  | 'score:medium'
  | 'score:large'
  | 'score:huge'

  // Progress/movement events
  | 'progress:forward'
  | 'progress:backward'
  | 'progress:up'
  | 'progress:down'
  | 'progress:complete'

  // Collection events
  | 'collect:item'
  | 'collect:coin'
  | 'collect:powerup'
  | 'collect:bonus'

  // Combo/streak events (tiered)
  | 'combo:start'
  | 'combo:low'      // 2-4
  | 'combo:mid'      // 5-7
  | 'combo:high'     // 8-9
  | 'combo:max'      // 10+
  | 'combo:break'

  // Negative events
  | 'damage:light'
  | 'damage:heavy'
  | 'miss:light'
  | 'miss:heavy'

  // Special events
  | 'perfect:hit'
  | 'critical:hit'
  | 'level:up'
  | 'timer:warning'
  | 'timer:critical';

// ============================================
// DEFAULT EVENT MAPPINGS
// ============================================

/**
 * Default mappings that all games inherit.
 * Games can override specific mappings via GAME_EVENT_OVERRIDES.
 */
export const DEFAULT_EVENT_MAPPINGS: Record<GameEvent, PatternName> = {
  // Lifecycle
  'game:start': 'explode',
  'game:over': 'alarm',
  'game:win': 'fireworks',
  'game:highScore': 'fireworks',
  'game:pause': 'simmer',
  'game:resume': 'glow',

  // Gameplay states
  'play:idle': 'simmer',
  'play:active': 'glow',
  'play:intense': 'throb',

  // Scoring (progressive intensity)
  'score:tiny': 'flick',
  'score:small': 'flick',
  'score:medium': 'spark',
  'score:large': 'flash',
  'score:huge': 'blaze',

  // Progress/movement
  'progress:forward': 'waveRight',
  'progress:backward': 'waveLeft',
  'progress:up': 'rise',
  'progress:down': 'fall',
  'progress:complete': 'blaze',

  // Collections
  'collect:item': 'spark',
  'collect:coin': 'implode',
  'collect:powerup': 'blaze',
  'collect:bonus': 'flash',

  // Combos (escalating)
  'combo:start': 'glow',
  'combo:low': 'glow',        // 2-4: gentle acknowledgment
  'combo:mid': 'orbit',       // 5-7: chase pattern
  'combo:high': 'spin',       // 8-9: fast chase
  'combo:max': 'strobe',      // 10+: maximum intensity
  'combo:break': 'warn',

  // Negative
  'damage:light': 'warn',
  'damage:heavy': 'alarm',
  'miss:light': 'flick',
  'miss:heavy': 'warn',

  // Special
  'perfect:hit': 'blaze',
  'critical:hit': 'explode',
  'level:up': 'fireworks',
  'timer:warning': 'throb',
  'timer:critical': 'strobe',
};

// ============================================
// GAME-SPECIFIC OVERRIDES
// ============================================

/**
 * Per-game overrides for event mappings.
 * Only specify events that differ from defaults.
 * 
 * CUSTOMIZED: 2026-01-25 - Individual light profiles per game
 */
export const GAME_EVENT_OVERRIDES: Record<string, Partial<Record<GameEvent, PatternName>>> = {
  // ============================================
  // ACTIVE GAMES (8 total) - CUSTOMIZED PROFILES
  // ============================================

  'flappy-orange': {
    // PROFILE: Rhythmic breathing, wave sweeps for pipes
    // Ambient: breathe (rhythmic, syncs with flapping)
    'play:active': 'breathe',
    // Pipe pass - satisfying wave sweep
    'progress:forward': 'waveRight',
    // Coin collect - burst of joy outward
    'collect:coin': 'explode',
    // Near miss - quick gold flash (triggered from game code)
    'score:medium': 'flash',
    // Leaderboard beat - victory lap (waveRight + rise triggered from game)
    'progress:complete': 'waveRight',
    // Death - dramatic: freeze lights then alarm (handled in game code)
    'game:over': 'alarm',
    // High score - maximum celebration
    'game:highScore': 'fireworks',
  },

  'color-reaction': {
    // PROFILE: Alert breathing, wave sweeps for correct taps
    // Ambient: breathe (alert, keeps player engaged)
    'play:active': 'breathe',
    // All correct taps - wave sweep (same visual, speed varies)
    'score:small': 'waveRight',
    'score:medium': 'waveRight',
    'score:large': 'waveRight',
    // Perfect reaction (<300ms) - explode + lingering glow
    'perfect:hit': 'explode',
    // Wrong tap - dramatic red alarm pulse
    'damage:light': 'alarm',
    // Miss (didn't tap in time) - warning flash
    'miss:light': 'warn',
    // Streaks - escalating chase patterns
    'combo:low': 'glow',
    'combo:mid': 'orbit',
    'combo:high': 'spin',
    // Fever mode (15+ streak) - fast spin instead of strobe
    'combo:max': 'spin',
    // Game over/high score - standard
    'game:over': 'alarm',
    'game:highScore': 'fireworks',
  },

  'orange-stack': {
    // PROFILE: Smooth perimeter flow, punchy drops, wave sweeps
    // Ambient: clockwise circular wave around the frame
    'play:active': 'perimeterFlow',
    // Normal drop - punchy flash
    'score:small': 'flash',
    // Near-perfect drop - bigger flash
    'score:large': 'flash',
    // Perfect drop - satisfying wave sweep
    'perfect:hit': 'waveRight',
    // Danger zone - red throb heartbeat (triggered separately in game)
    'damage:light': 'throb',
    // Wall bounce - wave in bounce direction (triggered in game code)
    'progress:forward': 'waveRight',
    'progress:backward': 'waveLeft',
    // Power-up collected - implode (absorbing power)
    'collect:powerup': 'implode',
    // Combo milestones - escalating chase
    'combo:mid': 'orbit',
    'combo:high': 'spin',
    'combo:max': 'strobe',
    // Level complete - escalating by level (handled in game code)
    'level:up': 'flash',        // Level 1-3
    'progress:complete': 'blaze', // Level 4-7
    'game:win': 'fireworks',    // Level 8-10
    // Game over - dramatic alarm
    'game:over': 'alarm',
    'game:highScore': 'fireworks',
  },

  'memory-match': {
    // PROFILE: Calming breathe, satisfying matches, countdown pulse
    // Ambient: breathe (calming for concentration)
    'play:active': 'breathe',
    // Card flip - subtle (pulse handled in game code)
    'score:tiny': 'flick',
    // Match found - satisfying flash
    'score:medium': 'flash',
    // Fast match bonus - explode sparkle burst
    'score:large': 'explode',
    // Mismatch - subtle flick
    'miss:light': 'flick',
    // Streak milestones - escalating chase
    'combo:low': 'glow',
    'combo:mid': 'orbit',
    'combo:high': 'spin',
    // Timer urgency - countdown pulse (faster as time decreases)
    'timer:warning': 'throb',
    'timer:critical': 'strobe',
    // Round complete - escalating by round (handled in game code)
    'game:win': 'flash',        // Early rounds
    'progress:complete': 'explode', // Mid rounds
    'level:up': 'fireworks',    // Late rounds
    // Game over
    'game:over': 'alarm',
    'game:highScore': 'fireworks',
  },

  'wojak-runner': {
    // PROFILE: Rhythmic breathing, wave streaks, rise milestones
    // Ambient: breathe (rhythmic with running pace)
    'play:active': 'breathe',
    // Orange collected - implode (absorbing)
    'collect:coin': 'implode',
    // Streak milestones - wave sweep at each (5x, 10x, 15x)
    'combo:mid': 'waveRight',
    'combo:high': 'waveRight',
    'combo:max': 'waveRight',
    // Streak break - subtle flick
    'combo:break': 'flick',
    // Distance milestones - rise pattern (upward progress)
    'progress:forward': 'rise',
    'progress:complete': 'rise',
    // Game over - fade out (handled in game code, fallback to warn)
    'game:over': 'warn',
    'game:highScore': 'fireworks',
  },

  'merge-2048': {
    // PROFILE: Building ambient, no merge lights, escalating milestones
    // Ambient: glow (intensifies with highest tile - handled in game)
    'play:active': 'glow',
    // Merges - SKIP lights (too frequent, handled in game by not triggering)
    // Milestone tiles - escalating celebration
    'score:small': 'spark',     // 128 tile
    'score:medium': 'flash',    // 256 tile
    'score:large': 'blaze',     // 512 tile
    'progress:complete': 'explode', // 1024 tile
    // Fever mode - fast spin
    'combo:mid': 'orbit',
    'combo:high': 'spin',
    'combo:max': 'spin',
    // Danger state - faster pulse (handled in game code)
    'damage:light': 'throb',
    // 2048 reached - maximum celebration
    'game:win': 'fireworks',
    // Game over - fade out (handled in game code, fallback to simmer)
    'game:over': 'simmer',
    'game:highScore': 'fireworks',
  },

  'block-puzzle': {
    // PROFILE: Thoughtful glow, wave line clears, intensity combos
    // Ambient: glow (thoughtful, slightly more present than simmer)
    'play:active': 'glow',
    // Block placed - pulse (brightness increase handled in game)
    'score:tiny': 'flick',
    // Line clears - wave sweep for all (speed varies with count)
    'score:small': 'waveRight',
    'score:medium': 'waveRight',
    'score:large': 'waveRight',
    'score:huge': 'waveRight',
    // Combo - same pattern, intensity increases (handled in game)
    'combo:low': 'glow',
    'combo:mid': 'orbit',
    'combo:high': 'spin',
    'combo:max': 'strobe',
    // Combo break - subtle flick
    'combo:break': 'flick',
    // Danger state - faster pulse (handled in game code)
    'damage:light': 'throb',
    // Perfect clear - fireworks celebration
    'perfect:hit': 'fireworks',
    // Game over - fade out (peaceful ending, handled in game)
    'game:over': 'simmer',
    'game:highScore': 'fireworks',
  },

  // ============================================
  // DISABLED GAMES (for future reference)
  // ============================================

  'brick-breaker': {
    'play:active': 'glow',
    'progress:forward': 'flick',
    'score:small': 'spark',
    'score:medium': 'flash',
    'collect:powerup': 'blaze',
  },

  'orange-snake': {
    'play:active': 'simmer',
    'collect:item': 'spark',
    'progress:complete': 'flash',
  },

  'wojak-whack': {
    'play:active': 'throb',
    'score:small': 'spark',
    'score:medium': 'flash',
    'score:large': 'blaze',
    'perfect:hit': 'explode',
  },

  'orange-pong': {
    'play:active': 'glow',
    'progress:forward': 'flick',
    'score:medium': 'flash',
    'combo:mid': 'orbit',
  },

  'citrus-drop': {
    'play:active': 'glow',
    'score:small': 'spark',
    'score:medium': 'flash',
    'combo:mid': 'orbit',
    'combo:high': 'spin',
  },

  'knife-game': {
    'play:active': 'simmer',
    'score:small': 'flick',
    'score:medium': 'spark',
    'progress:complete': 'blaze',
  },

  'orange-juggle': {
    'play:active': 'glow',
    'score:small': 'flick',
    'combo:mid': 'orbit',
    'combo:high': 'spin',
  },

  'orange-wordle': {
    'play:active': 'simmer',
    'score:small': 'flick',
    'game:win': 'fireworks',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the pattern for a game event, with game-specific overrides applied.
 */
export function getPatternForEvent(event: GameEvent, gameId?: string): PatternName {
  // Check game-specific override first
  if (gameId && GAME_EVENT_OVERRIDES[gameId]?.[event]) {
    return GAME_EVENT_OVERRIDES[gameId][event]!;
  }
  // Fall back to default
  return DEFAULT_EVENT_MAPPINGS[event];
}

/**
 * Get all events that map to a specific pattern.
 */
export function getEventsForPattern(pattern: PatternName): GameEvent[] {
  return (Object.entries(DEFAULT_EVENT_MAPPINGS) as [GameEvent, PatternName][])
    .filter(([, p]) => p === pattern)
    .map(([event]) => event);
}

/**
 * Helper to determine combo tier from count.
 * Default thresholds: 2-4=low, 5-7=mid, 8-9=high, 10+=max
 */
export function getComboTier(count: number): 'start' | 'low' | 'mid' | 'high' | 'max' {
  if (count < 2) return 'start';
  if (count <= 4) return 'low';
  if (count <= 7) return 'mid';
  if (count <= 9) return 'high';
  return 'max';
}

/**
 * Game-specific combo tier helpers.
 * Each game has different native combo thresholds.
 */
export const GAME_COMBO_TIERS = {
  /**
   * BrickByBrick: Combo based on consecutive good drops
   * Milestones at 5x, 10x, 15x, 20x
   */
  'orange-stack': (combo: number): 'start' | 'low' | 'mid' | 'high' | 'max' => {
    if (combo < 3) return 'start';
    if (combo < 5) return 'low';
    if (combo < 10) return 'mid';
    if (combo < 15) return 'high';
    return 'max';
  },

  /**
   * MemoryMatch: Streak based on consecutive matches
   * Thresholds: 2, 3, 4, 5+
   */
  'memory-match': (streak: number): 'start' | 'low' | 'mid' | 'high' | 'max' => {
    if (streak < 2) return 'start';
    if (streak < 3) return 'low';
    if (streak < 5) return 'mid';
    return 'high'; // 5+ is max for this game
  },

  /**
   * WojakRunner: Streak based on consecutive orange collections
   * Milestones at 5x, 10x, 15x
   */
  'wojak-runner': (streak: number): 'start' | 'low' | 'mid' | 'high' | 'max' => {
    if (streak < 3) return 'start';
    if (streak < 5) return 'low';
    if (streak < 10) return 'mid';
    if (streak < 15) return 'high';
    return 'max';
  },

  /**
   * Merge2048: Combo based on consecutive merges (for fever mode)
   * Fever activates at 5 consecutive merges
   */
  'merge-2048': (consecutiveMerges: number): 'start' | 'low' | 'mid' | 'high' | 'max' => {
    if (consecutiveMerges < 2) return 'start';
    if (consecutiveMerges < 3) return 'low';
    if (consecutiveMerges < 4) return 'mid';
    if (consecutiveMerges < 5) return 'high';
    return 'max'; // Fever mode!
  },

  /**
   * BlockPuzzle: Combo based on consecutive line clears (with 3s timeout)
   * Max is 5x combo
   */
  'block-puzzle': (combo: number): 'start' | 'low' | 'mid' | 'high' | 'max' => {
    if (combo < 2) return 'start';
    if (combo < 3) return 'low';
    if (combo < 4) return 'mid';
    if (combo < 5) return 'high';
    return 'max';
  },
} as const;

/**
 * Get combo tier for a specific game.
 * Falls back to default if game doesn't have custom thresholds.
 */
export function getGameComboTier(
  gameId: string,
  count: number
): 'start' | 'low' | 'mid' | 'high' | 'max' {
  const gameTierFn = GAME_COMBO_TIERS[gameId as keyof typeof GAME_COMBO_TIERS];
  if (gameTierFn) {
    return gameTierFn(count);
  }
  return getComboTier(count);
}

/**
 * Helper to determine score size from points.
 * Games can customize thresholds.
 */
export function getScoreSize(
  points: number,
  thresholds = { tiny: 1, small: 5, medium: 20, large: 50, huge: 100 }
): 'tiny' | 'small' | 'medium' | 'large' | 'huge' {
  if (points >= thresholds.huge) return 'huge';
  if (points >= thresholds.large) return 'large';
  if (points >= thresholds.medium) return 'medium';
  if (points >= thresholds.small) return 'small';
  return 'tiny';
}

/**
 * Merge2048: Get score tier based on merged tile value.
 */
export function getMergeTier(
  tileValue: number
): 'tiny' | 'small' | 'medium' | 'large' | 'huge' {
  if (tileValue >= 512) return 'huge';
  if (tileValue >= 256) return 'large';
  if (tileValue >= 64) return 'medium';
  if (tileValue >= 16) return 'small';
  return 'tiny';
}

/**
 * BlockPuzzle: Get score tier based on lines cleared.
 */
export function getLineClearTier(
  linesCleared: number
): 'tiny' | 'small' | 'medium' | 'large' | 'huge' {
  if (linesCleared >= 4) return 'huge';
  if (linesCleared >= 3) return 'large';
  if (linesCleared >= 2) return 'medium';
  if (linesCleared >= 1) return 'small';
  return 'tiny';
}
