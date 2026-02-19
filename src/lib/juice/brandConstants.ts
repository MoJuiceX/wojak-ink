/**
 * Brand Constants for Juice Effects
 *
 * Centralized values for brand-consistent visual feedback across all games.
 * Use these values to ensure cohesive feel across the game suite.
 *
 * @example
 * import { BRAND_COLORS, EFFECT_TIMINGS, SQUASH_PRESETS } from '@/lib/juice/brandConstants';
 *
 * // Use brand orange for effects
 * triggerShockwave(BRAND_COLORS.primary);
 *
 * // Use consistent timing for freeze frame
 * const freeze = createFreezeFrame(EFFECT_TIMINGS.freezeFrame);
 *
 * // Apply canvas squash on landing
 * ctx.scale(SQUASH_PRESETS.land.scaleX, SQUASH_PRESETS.land.scaleY);
 */

// ============================================
// BRAND COLORS
// ============================================

/**
 * Brand color palette for visual effects.
 * Primary orange is the signature color for Wojak.ink
 */
export const BRAND_COLORS = {
  /** Primary brand orange - use for most effects */
  primary: '#ff6b00',
  /** Secondary orange - slightly lighter for accents */
  secondary: '#ff8c33',
  /** Gold for achievements and high scores */
  gold: '#FFD700',
  /** Success green for positive feedback */
  success: '#00FF88',
  /** Warning/danger red for negative feedback */
  danger: '#FF4444',
  /** Pure white for impact flashes */
  white: '#FFFFFF',
  /** Dark vignette for game over */
  vignetteDark: 'var(--color-black-70)',
  /** Red vignette for damage/loss */
  vignetteRed: 'rgba(255, 0, 0, 0.4)',
} as const;

// ============================================
// EFFECT TIMINGS (ms)
// ============================================

/**
 * Standardized durations for visual effects.
 * Ensures consistent pacing across all games.
 */
export const EFFECT_TIMINGS = {
  /** Freeze frame on significant impact (game over, milestone) */
  freezeFrame: 80,
  /** Screen shake duration */
  shake: 200,
  /** Quick shake for minor impacts */
  shakeQuick: 100,
  /** Long shake for major impacts */
  shakeLong: 400,
  /** Flash overlay fade duration */
  flash: 150,
  /** Squash/stretch animation duration */
  squash: 100,
  /** Score popup display duration */
  popup: 1200,
  /** Vignette fade duration */
  vignette: 400,
  /** Epic callout display duration */
  callout: 1500,
  /** Shockwave animation duration */
  shockwave: 600,
  /** Confetti celebration duration */
  confetti: 3000,
} as const;

// ============================================
// SQUASH/STRETCH PRESETS (Canvas-based)
// ============================================

/**
 * Canvas-based squash/stretch presets.
 * Apply using ctx.scale(preset.scaleX, preset.scaleY)
 *
 * @example
 * // On block landing in canvas
 * ctx.save();
 * ctx.translate(blockCenterX, blockCenterY);
 * ctx.scale(SQUASH_PRESETS.land.scaleX, SQUASH_PRESETS.land.scaleY);
 * ctx.translate(-blockCenterX, -blockCenterY);
 * // ... draw block ...
 * ctx.restore();
 */
export interface SquashPreset {
  scaleX: number;
  scaleY: number;
  duration: number;
}

export const SQUASH_PRESETS: Record<string, SquashPreset> = {
  /** Light tap/click feedback */
  tap: {
    scaleX: 0.95,
    scaleY: 1.05,
    duration: 80,
  },
  /** Landing impact (wider, shorter) */
  land: {
    scaleX: 1.15,
    scaleY: 0.85,
    duration: 100,
  },
  /** Jump anticipation (taller, narrower) */
  stretch: {
    scaleX: 0.9,
    scaleY: 1.15,
    duration: 100,
  },
  /** Collection/absorption */
  collect: {
    scaleX: 1.1,
    scaleY: 0.9,
    duration: 80,
  },
  /** Block/piece placement */
  place: {
    scaleX: 1.1,
    scaleY: 0.9,
    duration: 100,
  },
  /** Strong impact (exaggerated) */
  impact: {
    scaleX: 1.25,
    scaleY: 0.75,
    duration: 120,
  },
  /** Subtle pulse */
  pulse: {
    scaleX: 1.05,
    scaleY: 0.95,
    duration: 60,
  },
} as const;

// ============================================
// SHAKE INTENSITIES
// ============================================

/**
 * Screen shake intensity levels (pixels).
 * Higher = more dramatic.
 */
export const SHAKE_INTENSITIES = {
  /** Subtle feedback for minor events */
  light: 2,
  /** Standard feedback */
  medium: 5,
  /** Strong feedback for significant events */
  heavy: 8,
  /** Maximum intensity for game over / major impacts */
  extreme: 12,
} as const;

// ============================================
// GAME OVER SEQUENCE
// ============================================

/**
 * Unified game over effect parameters.
 * Apply these consistently across all games for cohesive feel.
 *
 * @example
 * // In game over handler
 * triggerScreenShake(GAME_OVER_SEQUENCE.shakeDuration);
 * triggerVignette(GAME_OVER_SEQUENCE.vignetteColor);
 * playGameOver();
 */
export const GAME_OVER_SEQUENCE = {
  /** Freeze frame duration before effects */
  freezeFrame: 80,
  /** Shake intensity */
  shakeIntensity: SHAKE_INTENSITIES.heavy,
  /** Shake duration */
  shakeDuration: 300,
  /** Vignette color (dark with red tint) */
  vignetteColor: 'rgba(139, 0, 0, 0.5)',
  /** Vignette duration */
  vignetteDuration: 400,
  /** Flash color */
  flashColor: BRAND_COLORS.white,
  /** Flash intensity (alpha) */
  flashIntensity: 0.4,
} as const;

// ============================================
// MILESTONE CALLOUTS
// ============================================

/**
 * Unified callout messages for milestones.
 * Use these for consistent messaging across games.
 * Games keep their own numeric thresholds but use these messages.
 */
export const MILESTONE_CALLOUTS = {
  /** First milestone reached */
  tier1: 'NICE!',
  /** Second milestone */
  tier2: 'GREAT!',
  /** Third milestone */
  tier3: 'AMAZING!',
  /** Fourth milestone */
  tier4: 'INCREDIBLE!',
  /** Maximum tier */
  tier5: 'LEGENDARY!',
  /** Perfect execution */
  perfect: 'PERFECT!',
  /** High score achieved */
  highScore: 'NEW HIGH SCORE!',
  /** Game completion */
  victory: 'VICTORY!',
} as const;

/**
 * Get callout message for a given tier (1-5)
 */
export function getCalloutForTier(tier: number): string {
  const messages = [
    MILESTONE_CALLOUTS.tier1,
    MILESTONE_CALLOUTS.tier2,
    MILESTONE_CALLOUTS.tier3,
    MILESTONE_CALLOUTS.tier4,
    MILESTONE_CALLOUTS.tier5,
  ];
  return messages[Math.min(tier - 1, messages.length - 1)] || MILESTONE_CALLOUTS.tier1;
}

// ============================================
// PARTICLE COLORS
// ============================================

/**
 * Particle color palettes for different effect types.
 */
export const PARTICLE_PALETTES = {
  /** Default orange burst */
  primary: [BRAND_COLORS.primary, BRAND_COLORS.secondary, BRAND_COLORS.gold],
  /** Victory/celebration */
  celebration: [BRAND_COLORS.gold, '#FF69B4', '#00CED1', BRAND_COLORS.primary],
  /** Fire/heat effects */
  fire: ['#FF4500', BRAND_COLORS.primary, '#FFD700', '#FF6347'],
  /** Damage/warning */
  danger: ['#FF0000', '#FF4444', '#8B0000'],
} as const;
