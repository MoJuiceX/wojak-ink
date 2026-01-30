/**
 * Arcade Light Pattern Library
 *
 * Defines 20 reusable visual patterns for arcade button lights.
 * All games share these patterns through the event mapping system.
 *
 * @see src/config/arcade-light-mappings.ts for event→pattern mappings
 * @see src/components/ArcadeButtonLights.css for CSS implementations
 */

// Pattern categories for organization
export type PatternCategory =
  | 'ambient'      // Continuous background states
  | 'flash'        // Quick one-shot feedback
  | 'wave'         // Directional movement
  | 'radial'       // Center-based burst/implode
  | 'chase'        // Looping perimeter patterns
  | 'warning'      // Negative feedback
  | 'celebration'; // Maximum impact celebrations

// Pattern definition
export interface PatternDefinition {
  /** Duration in milliseconds (for one cycle if looping) */
  duration: number;
  /** Whether the pattern loops continuously */
  loop: boolean;
  /** Category for organization */
  category: PatternCategory;
  /** Human-readable description */
  description: string;
  /** Which buttons are involved */
  buttons: 'all' | 'bottom' | 'right' | 'center' | 'edges' | 'perimeter' | 'custom';
}

/**
 * All 20 named patterns in the library
 *
 * Naming philosophy: Names describe the VISUAL EFFECT, not the game event.
 * This allows any game to use any pattern for whatever event makes sense.
 */
export const PATTERNS = {
  // ============================================
  // AMBIENT PATTERNS (4)
  // Continuous background states during gameplay
  // ============================================

  /** Slow synchronized breathing - all buttons fade in/out together */
  breathe: {
    duration: 2500,
    loop: true,
    category: 'ambient',
    description: 'Slow synchronized breathing, all buttons',
    buttons: 'all',
  },

  /** Barely perceptible pulse - "zen mode" for focused gameplay */
  simmer: {
    duration: 5000,
    loop: true,
    category: 'ambient',
    description: 'Very subtle pulse, barely there',
    buttons: 'all',
  },

  /** Moderate ambient pulse - noticeable but calm */
  glow: {
    duration: 4000,
    loop: true,
    category: 'ambient',
    description: 'Moderate ambient pulse, calm energy',
    buttons: 'all',
  },

  /** Active pulsing with energy - "something's happening" */
  throb: {
    duration: 3000,
    loop: true,
    category: 'ambient',
    description: 'Active pulsing, noticeable energy',
    buttons: 'all',
  },

  // ============================================
  // FLASH PATTERNS (4)
  // Quick one-shot feedback for events
  // ============================================

  /** Single button instant flash - minimal acknowledgment */
  flick: {
    duration: 150,
    loop: false,
    category: 'flash',
    description: 'Single center button instant flash',
    buttons: 'center',
  },

  /** Quick 2-3 button flash - small feedback */
  spark: {
    duration: 200,
    loop: false,
    category: 'flash',
    description: 'Quick center cluster flash',
    buttons: 'center',
  },

  /** Medium flash across center-weighted bottom - notable feedback */
  flash: {
    duration: 250,
    loop: false,
    category: 'flash',
    description: 'Medium center-weighted flash',
    buttons: 'bottom',
  },

  /** Intense full bottom row + corners - big impact */
  blaze: {
    duration: 300,
    loop: false,
    category: 'flash',
    description: 'Intense full bottom row with brightness boost',
    buttons: 'bottom',
  },

  // ============================================
  // WAVE PATTERNS (4)
  // Directional movement for progress/motion
  // ============================================

  /** Sweep left-to-right across bottom row */
  waveRight: {
    duration: 350,
    loop: false,
    category: 'wave',
    description: 'Sweep left to right across bottom',
    buttons: 'bottom',
  },

  /** Sweep right-to-left across bottom row */
  waveLeft: {
    duration: 350,
    loop: false,
    category: 'wave',
    description: 'Sweep right to left across bottom',
    buttons: 'bottom',
  },

  /** Bottom to top - through right column */
  rise: {
    duration: 500,
    loop: false,
    category: 'wave',
    description: 'Bottom to top cascade',
    buttons: 'right',
  },

  /** Top to bottom cascade */
  fall: {
    duration: 500,
    loop: false,
    category: 'wave',
    description: 'Top to bottom cascade',
    buttons: 'right',
  },

  // ============================================
  // RADIAL PATTERNS (2)
  // Center-based burst/implode effects
  // ============================================

  /** Center → edges burst - explosion feeling */
  explode: {
    duration: 300,
    loop: false,
    category: 'radial',
    description: 'Center outward burst',
    buttons: 'all',
  },

  /** Edges → center collect - implosion/collection feeling */
  implode: {
    duration: 300,
    loop: false,
    category: 'radial',
    description: 'Edges inward collection',
    buttons: 'all',
  },

  // ============================================
  // CHASE PATTERNS (3)
  // Looping perimeter patterns for sustained states
  // ============================================

  /** Slow perimeter chase - building momentum */
  orbit: {
    duration: 1500,
    loop: true,
    category: 'chase',
    description: 'Slow continuous perimeter chase',
    buttons: 'perimeter',
  },

  /** Fast perimeter chase - high energy */
  spin: {
    duration: 800,
    loop: true,
    category: 'chase',
    description: 'Fast perimeter chase',
    buttons: 'perimeter',
  },

  /** Smooth perimeter flow - clockwise wave around frame (left→top→right→bottom) */
  perimeterFlow: {
    duration: 3000,
    loop: true,
    category: 'chase',
    description: 'Smooth clockwise perimeter flow wave',
    buttons: 'perimeter',
  },

  /** Alternating flash - maximum intensity strobe */
  strobe: {
    duration: 300,
    loop: true,
    category: 'chase',
    description: 'Alternating odd/even strobe',
    buttons: 'all',
  },

  // ============================================
  // WARNING PATTERNS (2)
  // Negative feedback for damage/errors
  // ============================================

  /** Single red flash - light warning */
  warn: {
    duration: 400,
    loop: false,
    category: 'warning',
    description: 'Single red flash warning',
    buttons: 'all',
  },

  /** Double red flash then fade - serious warning/game over */
  alarm: {
    duration: 1200,
    loop: false,
    category: 'warning',
    description: 'Double red flash then fade out',
    buttons: 'all',
  },

  // ============================================
  // SURGE PATTERNS (5)
  // Continuous bidirectional waves at escalating speeds.
  // Bottom row sweeps L→R→L, right column sweeps up→down→up.
  // Designed for streak/momentum systems — any game can use them.
  // ============================================

  /** Slowest surge — gentle bidirectional wave (streak 1-2) */
  surge1: {
    duration: 2400,
    loop: true,
    category: 'chase',
    description: 'Slow bidirectional wave: bottom L↔R, right up↔down',
    buttons: 'perimeter',
  },

  /** Medium-slow surge (streak 3-4) */
  surge2: {
    duration: 1800,
    loop: true,
    category: 'chase',
    description: 'Medium bidirectional wave: bottom L↔R, right up↔down',
    buttons: 'perimeter',
  },

  /** Medium surge (streak 5-6) */
  surge3: {
    duration: 1200,
    loop: true,
    category: 'chase',
    description: 'Fast bidirectional wave: bottom L↔R, right up↔down',
    buttons: 'perimeter',
  },

  /** Fast surge (streak 7-8) */
  surge4: {
    duration: 800,
    loop: true,
    category: 'chase',
    description: 'Very fast bidirectional wave: bottom L↔R, right up↔down',
    buttons: 'perimeter',
  },

  /** Maximum surge — frenetic energy (streak 9-10) */
  surge5: {
    duration: 500,
    loop: true,
    category: 'chase',
    description: 'Frenetic bidirectional wave: bottom L↔R, right up↔down',
    buttons: 'perimeter',
  },

  // ============================================
  // CELEBRATION PATTERNS (1)
  // Maximum impact for wins/achievements
  // ============================================

  /** Multi-phase celebration: rainbow → strobe → pulse → fade */
  fireworks: {
    duration: 4000,
    loop: false,
    category: 'celebration',
    description: 'Full celebration: rainbow chase, strobe, victory pulse, elegant fade',
    buttons: 'all',
  },
} as const;

// Type for pattern names
export type PatternName = keyof typeof PATTERNS;

// Export pattern names as array for validation
export const PATTERN_NAMES = Object.keys(PATTERNS) as PatternName[];

/**
 * Get pattern definition by name
 */
export function getPattern(name: PatternName): PatternDefinition {
  return PATTERNS[name];
}

/**
 * Get all patterns in a category
 */
export function getPatternsByCategory(category: PatternCategory): PatternName[] {
  return PATTERN_NAMES.filter(name => PATTERNS[name].category === category);
}

/**
 * Check if a pattern is looping (continuous)
 */
export function isLoopingPattern(name: PatternName): boolean {
  return PATTERNS[name].loop;
}

/**
 * Get pattern duration in milliseconds
 */
export function getPatternDuration(name: PatternName): number {
  return PATTERNS[name].duration;
}
