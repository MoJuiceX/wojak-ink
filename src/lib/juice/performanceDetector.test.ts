import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TIER_CONFIGS,
  FPSMonitor,
  scaleParticleCount,
  shouldEnableEffect,
} from './performanceDetector';
import type { PerformanceTier, PerformanceConfig } from './performanceDetector';

// ============================================
// TIER_CONFIGS
// ============================================

describe('TIER_CONFIGS', () => {
  it('has high and low tiers defined', () => {
    expect(TIER_CONFIGS.high).toBeDefined();
    expect(TIER_CONFIGS.low).toBeDefined();
  });

  it('high tier has particleMultiplier of 1 (full)', () => {
    expect(TIER_CONFIGS.high.particleMultiplier).toBe(1);
  });

  it('low tier has particleMultiplier less than 1', () => {
    expect(TIER_CONFIGS.low.particleMultiplier).toBeLessThan(1);
    expect(TIER_CONFIGS.low.particleMultiplier).toBeGreaterThan(0);
  });

  it('high tier has more maxParticles than low tier', () => {
    expect(TIER_CONFIGS.high.maxParticles).toBeGreaterThan(TIER_CONFIGS.low.maxParticles);
  });

  it('high tier enables blur, low tier does not', () => {
    expect(TIER_CONFIGS.high.enableBlur).toBe(true);
    expect(TIER_CONFIGS.low.enableBlur).toBe(false);
  });

  it('high tier enables shaders, low tier does not', () => {
    expect(TIER_CONFIGS.high.enableShaders).toBe(true);
    expect(TIER_CONFIGS.low.enableShaders).toBe(false);
  });

  it('both tiers enable shake (low-cost, high-impact effect)', () => {
    expect(TIER_CONFIGS.high.enableShake).toBe(true);
    expect(TIER_CONFIGS.low.enableShake).toBe(true);
  });

  it('high tier has full shadow quality (1), low tier has none (0)', () => {
    expect(TIER_CONFIGS.high.shadowQuality).toBe(1);
    expect(TIER_CONFIGS.low.shadowQuality).toBe(0);
  });

  it('all config values are valid types', () => {
    for (const config of Object.values(TIER_CONFIGS)) {
      expect(config.particleMultiplier).toBeTypeOf('number');
      expect(config.enableShake).toBeTypeOf('boolean');
      expect(config.enableShaders).toBeTypeOf('boolean');
      expect(config.maxParticles).toBeTypeOf('number');
      expect(config.enableBlur).toBeTypeOf('boolean');
      expect(config.shadowQuality).toBeTypeOf('number');
    }
  });
});

// ============================================
// scaleParticleCount
// ============================================

describe('scaleParticleCount', () => {
  it('returns full count for high tier (multiplier = 1)', () => {
    const config = TIER_CONFIGS.high;
    expect(scaleParticleCount(20, config)).toBe(20);
  });

  it('halves particle count for low tier (multiplier = 0.5)', () => {
    const config = TIER_CONFIGS.low;
    expect(scaleParticleCount(20, config)).toBe(10);
  });

  it('rounds up (Math.ceil) — no fractional particles', () => {
    const config: PerformanceConfig = {
      ...TIER_CONFIGS.low,
      particleMultiplier: 0.3,
    };
    // 10 * 0.3 = 3.0 → ceil = 3
    expect(scaleParticleCount(10, config)).toBe(3);
  });

  it('returns at least 1 particle for any positive count with low multiplier', () => {
    const config: PerformanceConfig = {
      ...TIER_CONFIGS.low,
      particleMultiplier: 0.1,
    };
    // 1 * 0.1 = 0.1 → ceil = 1
    expect(scaleParticleCount(1, config)).toBe(1);
  });

  it('scales 100 particles to 50 with 0.5 multiplier', () => {
    const config: PerformanceConfig = {
      ...TIER_CONFIGS.low,
      particleMultiplier: 0.5,
    };
    expect(scaleParticleCount(100, config)).toBe(50);
  });

  it('returns 0 for 0 base count regardless of multiplier', () => {
    expect(scaleParticleCount(0, TIER_CONFIGS.high)).toBe(0);
    expect(scaleParticleCount(0, TIER_CONFIGS.low)).toBe(0);
  });
});

// ============================================
// shouldEnableEffect
// ============================================

describe('shouldEnableEffect', () => {
  it('returns true for shake in high tier', () => {
    expect(shouldEnableEffect('shake', TIER_CONFIGS.high)).toBe(true);
  });

  it('returns true for shake in low tier (kept for feel)', () => {
    expect(shouldEnableEffect('shake', TIER_CONFIGS.low)).toBe(true);
  });

  it('returns true for shaders in high tier', () => {
    expect(shouldEnableEffect('shaders', TIER_CONFIGS.high)).toBe(true);
  });

  it('returns false for shaders in low tier', () => {
    expect(shouldEnableEffect('shaders', TIER_CONFIGS.low)).toBe(false);
  });

  it('returns true for blur in high tier', () => {
    expect(shouldEnableEffect('blur', TIER_CONFIGS.high)).toBe(true);
  });

  it('returns false for blur in low tier', () => {
    expect(shouldEnableEffect('blur', TIER_CONFIGS.low)).toBe(false);
  });
});

// ============================================
// FPSMonitor
// ============================================

describe('FPSMonitor', () => {
  // Use explicit typing to satisfy the TS compiler for vi.fn
  let onTierChange: (tier: PerformanceTier) => void;
  let mockFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFn = vi.fn();
    onTierChange = mockFn as unknown as (tier: PerformanceTier) => void;
  });

  it('initializes with the provided tier', () => {
    const monitor = new FPSMonitor(onTierChange, 'high');
    expect(monitor.getTier()).toBe('high');
  });

  it('initializes with low tier when specified', () => {
    const monitor = new FPSMonitor(onTierChange, 'low');
    expect(monitor.getTier()).toBe('low');
  });

  it('getConfig returns the config for the current tier', () => {
    const monitor = new FPSMonitor(onTierChange, 'high');
    expect(monitor.getConfig()).toEqual(TIER_CONFIGS.high);
  });

  it('getConfig returns low config when in low tier', () => {
    const monitor = new FPSMonitor(onTierChange, 'low');
    expect(monitor.getConfig()).toEqual(TIER_CONFIGS.low);
  });

  it('getFPS returns initial FPS of 60', () => {
    const monitor = new FPSMonitor(onTierChange, 'high');
    expect(monitor.getFPS()).toBe(60);
  });

  it('setTier changes tier and calls onTierChange', () => {
    const monitor = new FPSMonitor(onTierChange, 'high');
    monitor.setTier('low');
    expect(monitor.getTier()).toBe('low');
    expect(mockFn).toHaveBeenCalledWith('low');
  });

  it('setTier does not call onTierChange when tier is already the same', () => {
    const monitor = new FPSMonitor(onTierChange, 'high');
    monitor.setTier('high');
    expect(mockFn).not.toHaveBeenCalled();
  });

  it('reset does not throw', () => {
    const monitor = new FPSMonitor(onTierChange, 'high');
    expect(() => monitor.reset()).not.toThrow();
  });

  it('tick returns a number', () => {
    const monitor = new FPSMonitor(onTierChange, 'high');
    const fps = monitor.tick();
    expect(fps).toBeTypeOf('number');
  });

  it('tier changes to low after sufficient low-FPS samples', () => {
    // Mock performance.now BEFORE creating the monitor so lastTime initialises correctly
    let mockTime = 0;
    const originalNow = performance.now;
    performance.now = () => mockTime;

    try {
      const monitor = new FPSMonitor(onTierChange, 'high');

      // The sample interval is 30 frames, consecutive required = 3.
      // Each batch of 30 frames spans 1000ms → ~30 FPS (below 45 threshold).
      for (let batch = 0; batch < 3; batch++) {
        const startTime = mockTime;
        for (let frame = 0; frame < 30; frame++) {
          mockTime = startTime + ((frame + 1) / 30) * 1000;
          monitor.tick();
        }
      }

      // After 3 consecutive low FPS samples, tier should change to low
      expect(mockFn).toHaveBeenCalledWith('low');
      expect(monitor.getTier()).toBe('low');
    } finally {
      performance.now = originalNow;
    }
  });

  it('maintains high tier when FPS stays above threshold', () => {
    let mockTime = 0;
    const originalNow = performance.now;
    performance.now = () => mockTime;

    try {
      const monitor = new FPSMonitor(onTierChange, 'high');

      // Each batch of 30 frames spans 500ms → 60 FPS (above 55 threshold)
      for (let batch = 0; batch < 5; batch++) {
        const startTime = mockTime;
        for (let frame = 0; frame < 30; frame++) {
          mockTime = startTime + ((frame + 1) / 30) * 500;
          monitor.tick();
        }
      }

      // Tier should remain high
      expect(monitor.getTier()).toBe('high');
      expect(mockFn).not.toHaveBeenCalled();
    } finally {
      performance.now = originalNow;
    }
  });

  it('setTier then getConfig returns the new tier config', () => {
    const monitor = new FPSMonitor(onTierChange, 'high');
    monitor.setTier('low');
    expect(monitor.getConfig()).toEqual(TIER_CONFIGS.low);
  });
});

// ============================================
// Type correctness
// ============================================

describe('PerformanceTier type values', () => {
  it('only valid tier values are "high" and "low"', () => {
    const validTiers: PerformanceTier[] = ['high', 'low'];
    expect(validTiers).toHaveLength(2);
    for (const tier of validTiers) {
      expect(TIER_CONFIGS[tier]).toBeDefined();
    }
  });
});
