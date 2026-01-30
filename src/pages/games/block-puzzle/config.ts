/**
 * BlockPuzzle Game Configuration
 *
 * All game constants, shapes, and configuration extracted
 * from the main component for maintainability.
 */

// ============================================
// BLOCK SHAPES
// ============================================
export const BLOCK_SHAPES: Record<string, number[][]> = {
  // Singles and lines
  single: [[1]],
  line2h: [[1, 1]],
  line3h: [[1, 1, 1]],
  line4h: [[1, 1, 1, 1]],
  line5h: [[1, 1, 1, 1, 1]],
  line2v: [[1], [1]],
  line3v: [[1], [1], [1]],
  line4v: [[1], [1], [1], [1]],

  // Squares
  square2: [[1, 1], [1, 1]],
  square3: [[1, 1, 1], [1, 1, 1], [1, 1, 1]],

  // L shapes
  lShape1: [[1, 0], [1, 0], [1, 1]],
  lShape2: [[0, 1], [0, 1], [1, 1]],
  lShape3: [[1, 1], [1, 0], [1, 0]],
  lShape4: [[1, 1], [0, 1], [0, 1]],

  // T shape
  tShape: [[1, 1, 1], [0, 1, 0]],

  // Corner
  corner: [[1, 1], [1, 0]],
} as const;

export const SHAPE_KEYS = Object.keys(BLOCK_SHAPES);

// ============================================
// BLOCK COLORS - Distinct and vibrant palette
// ============================================
export const BLOCK_COLORS = [
  'linear-gradient(135deg, #ff7b00, #e65c00)',  // Orange (brand)
  'linear-gradient(135deg, #00d68f, #00b377)',  // Bright green/teal
  'linear-gradient(135deg, #a855f7, #7c3aed)',  // Purple
  'linear-gradient(135deg, #3b82f6, #2563eb)',  // Blue
  'linear-gradient(135deg, #f43f5e, #e11d48)',  // Pink/rose
  'linear-gradient(135deg, #fbbf24, #f59e0b)',  // Yellow/gold
] as const;

// ============================================
// GRID CONSTANTS
// ============================================
export const GRID_SIZE = 8;

// ============================================
// EXPLOSIVE LINE CLEARS CONFIG
// ============================================

// Freeze frame durations by line count
export const FREEZE_DURATIONS: Record<number, number> = {
  1: 0,      // No freeze for single line
  2: 50,     // Brief pause for double
  3: 80,     // Longer for triple
  4: 120,    // Maximum for quad+
};

// Enhanced shake config by line count
export const SHAKE_CONFIG: Record<number, { intensity: number; duration: number; rotation: number }> = {
  1: { intensity: 3, duration: 150, rotation: 0 },
  2: { intensity: 6, duration: 250, rotation: 1 },
  3: { intensity: 10, duration: 350, rotation: 2 },
  4: { intensity: 15, duration: 450, rotation: 3 },
};

// Clear callout messages
export const CLEAR_CALLOUTS: Record<number, string> = {
  2: 'DOUBLE!',
  3: 'TRIPLE!',
  4: 'QUAD CLEAR!',
  5: 'MEGA CLEAR!',
};

// ============================================
// SOUND FOUNDATION CONFIG
// ============================================

// Musical scale frequencies for combo escalation (C Major)
export const COMBO_SCALE_FREQUENCIES = [
  261.63, // C4 - Do (combo 1)
  293.66, // D4 - Re (combo 2)
  329.63, // E4 - Mi (combo 3)
  349.23, // F4 - Fa (combo 4)
  392.00, // G4 - Sol (combo 5+)
] as const;

export const COMBO_SOUND_CONFIG: Record<number, { note: number; volume: number; layers: number }> = {
  1: { note: 0, volume: 0.4, layers: 1 },
  2: { note: 1, volume: 0.45, layers: 1 },
  3: { note: 2, volume: 0.5, layers: 2 },  // Add sparkle
  4: { note: 3, volume: 0.55, layers: 2 },
  5: { note: 4, volume: 0.6, layers: 3 },  // Add bass
};

// Line clear sound configuration
export const LINE_CLEAR_SOUNDS: Record<number, { pitch: number; volume: number; duration: number }> = {
  1: { pitch: 1.0, volume: 0.4, duration: 200 },
  2: { pitch: 1.15, volume: 0.5, duration: 250 },
  3: { pitch: 1.3, volume: 0.6, duration: 300 },
  4: { pitch: 1.45, volume: 0.7, duration: 400 },
};

// ============================================
// PREMIUM HAPTICS CONFIG
// ============================================

// Haptic vibration patterns (duration in ms)
// Note: Not using 'as const' since navigator.vibrate() expects mutable number[]
export const HAPTIC_PATTERNS: Record<string, number[]> = {
  dragStart: [5],                              // Ultra-light tick
  snapLock: [15, 30, 15],                      // Double-tap confirmation
  lineClear1: [20],                            // Single line - short pulse
  lineClear2: [20, 20, 25],                    // Double line - rhythmic
  lineClear3: [25, 20, 30, 20, 35],            // Triple line - building
  lineClear4: [30, 20, 35, 20, 40, 20, 50],    // Quad+ EXPLOSION
  invalidPlacement: [10, 50, 10],              // Error double-tap
  comboHit: [15, 15, 20],                      // Combo confirmation
  perfectClear: [20, 30, 25, 30, 30, 30, 40, 30, 50], // Celebration crescendo
  dangerPulse: [8],                            // Subtle warning heartbeat
  streakFire: [15, 20, 25, 30],                // Ignition pattern
};

// ============================================
// DANGER STATE CONFIG
// ============================================

// Danger thresholds based on percentage of filled cells
export const DANGER_THRESHOLDS = {
  safe: 0.55,      // < 55% filled
  warning: 0.65,   // 65% filled
  critical: 0.78,  // 78% filled
  imminent: 0.88,  // 88% filled
} as const;

export type DangerLevel = 'safe' | 'warning' | 'critical' | 'imminent';

// Danger haptic intervals (ms)
export const DANGER_HAPTIC_INTERVALS: Record<DangerLevel, number> = {
  safe: 0,
  warning: 2500,
  critical: 1500,
  imminent: 800,
};

// ============================================
// STREAK FIRE MODE CONFIG
// ============================================

export const STREAK_CONFIG = {
  fireThreshold: 3,  // Visual fire effects start at streak 3
  // Index 0 = no streak (unused), 1 = streak 1, ..., 5+ = cap at 3x
  multipliers: [1, 1.25, 1.5, 2, 2.5, 3] as readonly number[],
} as const;

// Perfect clear bonus
export const PERFECT_CLEAR_BONUS = 5000;

// ============================================
// BACKGROUND MUSIC PLAYLIST
// ============================================
export const MUSIC_PLAYLIST = [
  { src: '/audio/music/block-puzzle/tetris-theme-final.mp3', name: 'Tetris Theme' },
  { src: '/audio/music/block-puzzle/mt-dedede-final.mp3', name: 'Mt. Dedede' },
  { src: '/audio/music/block-puzzle/smb-underwater-final.mp3', name: 'SMB Underwater' },
  { src: '/audio/music/block-puzzle/street-fighter-balrog-final.mp3', name: 'Balrog Stage' },
] as const;

// ============================================
// GAME ASSETS
// ============================================
export const SAD_IMAGES = Array.from(
  { length: 19 },
  (_, i) => `/assets/Games/games_media/sad_runner_${i + 1}.png`
);

// ============================================
// GAME METADATA
// ============================================
export const BLOCK_PUZZLE_CONFIG = {
  id: 'block-puzzle',
  name: 'Block Puzzle',
  description: 'Classic block puzzle with explosive line clears, combos, and streak fire mode.',
  leaderboardId: 'block-puzzle',
  colors: {
    primary: '#ff7b00',
    secondary: '#a855f7',
    accent: '#fbbf24',
  },
} as const;
