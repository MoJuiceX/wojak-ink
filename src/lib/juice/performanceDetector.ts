/**
 * Performance Tier Detection System
 *
 * Detects device capabilities and monitors FPS to dynamically
 * adjust juice intensity for optimal performance.
 *
 * @example
 * import { detectInitialTier, FPSMonitor, TIER_CONFIGS } from '@/lib/juice/performanceDetector';
 *
 * // On game init
 * const tier = detectInitialTier();
 * const config = TIER_CONFIGS[tier];
 *
 * // During gameplay
 * const fpsMonitor = new FPSMonitor((newTier) => {
 *   // Adjust particle counts, effect intensity, etc.
 *   currentConfig = TIER_CONFIGS[newTier];
 * });
 *
 * // In game loop
 * fpsMonitor.tick();
 */

// ============================================
// TYPES
// ============================================

export type PerformanceTier = 'high' | 'low';

export interface PerformanceConfig {
  /** Multiplier for particle counts (1 = full, 0.5 = half) */
  particleMultiplier: number;
  /** Enable screen shake */
  enableShake: boolean;
  /** Enable complex shader effects */
  enableShaders: boolean;
  /** Max active particles */
  maxParticles: number;
  /** Enable blur effects */
  enableBlur: boolean;
  /** Shadow complexity (0 = none, 1 = full) */
  shadowQuality: number;
}

// ============================================
// TIER CONFIGURATIONS
// ============================================

/**
 * Configuration for each performance tier.
 * Low tier reduces particle counts while maintaining core effects.
 */
export const TIER_CONFIGS: Record<PerformanceTier, PerformanceConfig> = {
  high: {
    particleMultiplier: 1,
    enableShake: true,
    enableShaders: true,
    maxParticles: 200,
    enableBlur: true,
    shadowQuality: 1,
  },
  low: {
    particleMultiplier: 0.5,
    enableShake: true, // Keep shake - low cost, high impact
    enableShaders: false,
    maxParticles: 50,
    enableBlur: false,
    shadowQuality: 0,
  },
} as const;

// ============================================
// INITIAL DETECTION
// ============================================

/**
 * Detect initial performance tier based on device capabilities.
 * Uses navigator hints when available, falls back to conservative estimates.
 */
export function detectInitialTier(): PerformanceTier {
  // Default to high - most devices can handle it
  let tier: PerformanceTier = 'high';

  try {
    // Check hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency;
    if (cores && cores <= 2) {
      tier = 'low';
    }

    // Check device memory (Chrome only)
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (memory && memory < 4) {
      tier = 'low';
    }

    // Check if mobile (conservative approach)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // Older iPhones/low-end Android
    if (isMobile) {
      // Check for older iOS devices
      const iosMatch = navigator.userAgent.match(/iPhone OS (\d+)/);
      if (iosMatch && parseInt(iosMatch[1], 10) < 14) {
        tier = 'low';
      }

      // Low-end Android detection (rough heuristic)
      if (cores && cores <= 4 && memory && memory < 3) {
        tier = 'low';
      }
    }

    // Check WebGL capabilities as proxy for GPU power
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      tier = 'low';
    }
  } catch {
    // If detection fails, default to high and let FPS monitor adjust
    console.warn('[PerformanceDetector] Detection failed, defaulting to high tier');
  }

  return tier;
}

// ============================================
// FPS MONITORING
// ============================================

/**
 * FPS Monitor for dynamic tier adjustment during gameplay.
 * Monitors frame rate and triggers tier change when performance drops.
 */
export class FPSMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private currentTier: PerformanceTier;
  private onTierChange: (tier: PerformanceTier) => void;

  // Configuration
  private readonly sampleInterval = 30; // Check every 30 frames
  private readonly lowFpsThreshold = 45; // Drop tier if below 45 FPS
  private readonly highFpsThreshold = 55; // Restore tier if above 55 FPS
  private readonly consecutiveRequired = 3; // Require 3 consecutive samples

  // State
  private lowFpsCount = 0;
  private highFpsCount = 0;

  constructor(
    onTierChange: (tier: PerformanceTier) => void,
    initialTier?: PerformanceTier
  ) {
    this.currentTier = initialTier ?? detectInitialTier();
    this.onTierChange = onTierChange;
  }

  /**
   * Call this in your game loop (once per frame).
   * Returns current FPS for debugging.
   */
  tick(): number {
    this.frameCount++;

    if (this.frameCount >= this.sampleInterval) {
      const now = performance.now();
      const elapsed = now - this.lastTime;
      this.fps = Math.round((this.frameCount * 1000) / elapsed);

      this.frameCount = 0;
      this.lastTime = now;

      this.evaluateTier();
    }

    return this.fps;
  }

  private evaluateTier(): void {
    if (this.fps < this.lowFpsThreshold) {
      this.lowFpsCount++;
      this.highFpsCount = 0;

      if (this.lowFpsCount >= this.consecutiveRequired && this.currentTier === 'high') {
        this.currentTier = 'low';
        this.lowFpsCount = 0;
        this.onTierChange(this.currentTier);
      }
    } else if (this.fps > this.highFpsThreshold) {
      this.highFpsCount++;
      this.lowFpsCount = 0;

      if (this.highFpsCount >= this.consecutiveRequired && this.currentTier === 'low') {
        this.currentTier = 'high';
        this.highFpsCount = 0;
        this.onTierChange(this.currentTier);
      }
    } else {
      // In the middle zone - reset counters
      this.lowFpsCount = 0;
      this.highFpsCount = 0;
    }
  }

  /**
   * Get current performance tier.
   */
  getTier(): PerformanceTier {
    return this.currentTier;
  }

  /**
   * Get current FPS.
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * Get configuration for current tier.
   */
  getConfig(): PerformanceConfig {
    return TIER_CONFIGS[this.currentTier];
  }

  /**
   * Force set a tier (for testing or user preference).
   */
  setTier(tier: PerformanceTier): void {
    if (tier !== this.currentTier) {
      this.currentTier = tier;
      this.onTierChange(tier);
    }
  }

  /**
   * Reset monitor state (call when game restarts).
   */
  reset(): void {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.lowFpsCount = 0;
    this.highFpsCount = 0;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Scale a particle count based on performance config.
 *
 * @example
 * const baseParticles = 20;
 * const actualParticles = scaleParticleCount(baseParticles, config);
 */
export function scaleParticleCount(
  baseCount: number,
  config: PerformanceConfig
): number {
  return Math.ceil(baseCount * config.particleMultiplier);
}

/**
 * Check if an effect should be enabled based on config.
 *
 * @example
 * if (shouldEnableEffect('blur', config)) {
 *   ctx.filter = 'blur(2px)';
 * }
 */
export function shouldEnableEffect(
  effect: 'shake' | 'shaders' | 'blur',
  config: PerformanceConfig
): boolean {
  switch (effect) {
    case 'shake':
      return config.enableShake;
    case 'shaders':
      return config.enableShaders;
    case 'blur':
      return config.enableBlur;
    default:
      return true;
  }
}
