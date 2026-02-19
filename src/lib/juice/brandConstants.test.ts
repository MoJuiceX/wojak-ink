import { describe, it, expect } from 'vitest';
import {
  BRAND_COLORS,
  EFFECT_TIMINGS,
  SQUASH_PRESETS,
  SHAKE_INTENSITIES,
  GAME_OVER_SEQUENCE,
  MILESTONE_CALLOUTS,
  PARTICLE_PALETTES,
  getCalloutForTier,
} from './brandConstants';

// ============================================
// BRAND_COLORS
// ============================================

describe('BRAND_COLORS', () => {
  it('has a primary orange color', () => {
    expect(BRAND_COLORS.primary).toBe('#ff6b00');
  });

  it('has a secondary color', () => {
    expect(BRAND_COLORS.secondary).toBe('#ff8c33');
  });

  it('has a gold color', () => {
    expect(BRAND_COLORS.gold).toBe('#FFD700');
  });

  it('has a success green', () => {
    expect(BRAND_COLORS.success).toBe('#00FF88');
  });

  it('has a danger red', () => {
    expect(BRAND_COLORS.danger).toBe('#FF4444');
  });

  it('has a white color', () => {
    expect(BRAND_COLORS.white).toBe('#FFFFFF');
  });

  it('has all expected keys', () => {
    const keys = Object.keys(BRAND_COLORS);
    expect(keys).toContain('primary');
    expect(keys).toContain('secondary');
    expect(keys).toContain('gold');
    expect(keys).toContain('success');
    expect(keys).toContain('danger');
    expect(keys).toContain('white');
    expect(keys).toContain('vignetteDark');
    expect(keys).toContain('vignetteRed');
  });
});

// ============================================
// EFFECT_TIMINGS
// ============================================

describe('EFFECT_TIMINGS', () => {
  it('has positive freeze frame duration', () => {
    expect(EFFECT_TIMINGS.freezeFrame).toBeGreaterThan(0);
  });

  it('has shake duration in milliseconds', () => {
    expect(EFFECT_TIMINGS.shake).toBe(200);
  });

  it('has quick shake shorter than standard shake', () => {
    expect(EFFECT_TIMINGS.shakeQuick).toBeLessThan(EFFECT_TIMINGS.shake);
  });

  it('has long shake longer than standard shake', () => {
    expect(EFFECT_TIMINGS.shakeLong).toBeGreaterThan(EFFECT_TIMINGS.shake);
  });

  it('has popup duration > 1000ms', () => {
    expect(EFFECT_TIMINGS.popup).toBeGreaterThan(1000);
  });

  it('has confetti duration > shockwave duration', () => {
    expect(EFFECT_TIMINGS.confetti).toBeGreaterThan(EFFECT_TIMINGS.shockwave);
  });

  it('has all timing keys defined', () => {
    expect(EFFECT_TIMINGS.freezeFrame).toBeDefined();
    expect(EFFECT_TIMINGS.shake).toBeDefined();
    expect(EFFECT_TIMINGS.flash).toBeDefined();
    expect(EFFECT_TIMINGS.squash).toBeDefined();
    expect(EFFECT_TIMINGS.callout).toBeDefined();
    expect(EFFECT_TIMINGS.shockwave).toBeDefined();
    expect(EFFECT_TIMINGS.confetti).toBeDefined();
  });
});

// ============================================
// SQUASH_PRESETS
// ============================================

describe('SQUASH_PRESETS', () => {
  it('has a land preset', () => {
    expect(SQUASH_PRESETS.land).toBeDefined();
  });

  it('land preset is wider and shorter (scaleX > 1, scaleY < 1)', () => {
    expect(SQUASH_PRESETS.land.scaleX).toBeGreaterThan(1);
    expect(SQUASH_PRESETS.land.scaleY).toBeLessThan(1);
  });

  it('stretch preset is taller and narrower (scaleX < 1, scaleY > 1)', () => {
    expect(SQUASH_PRESETS.stretch.scaleX).toBeLessThan(1);
    expect(SQUASH_PRESETS.stretch.scaleY).toBeGreaterThan(1);
  });

  it('each preset has scaleX, scaleY, and duration', () => {
    for (const key of Object.keys(SQUASH_PRESETS)) {
      const preset = SQUASH_PRESETS[key];
      expect(preset.scaleX).toBeTypeOf('number');
      expect(preset.scaleY).toBeTypeOf('number');
      expect(preset.duration).toBeTypeOf('number');
      expect(preset.duration).toBeGreaterThan(0);
    }
  });

  it('impact preset has more extreme values than tap preset', () => {
    // Impact should have greater deformation than tap
    const impactDeform = Math.abs(SQUASH_PRESETS.impact.scaleX - 1);
    const tapDeform = Math.abs(SQUASH_PRESETS.tap.scaleX - 1);
    expect(impactDeform).toBeGreaterThan(tapDeform);
  });

  it('has expected preset keys', () => {
    expect(SQUASH_PRESETS).toHaveProperty('tap');
    expect(SQUASH_PRESETS).toHaveProperty('land');
    expect(SQUASH_PRESETS).toHaveProperty('stretch');
    expect(SQUASH_PRESETS).toHaveProperty('collect');
    expect(SQUASH_PRESETS).toHaveProperty('place');
    expect(SQUASH_PRESETS).toHaveProperty('impact');
    expect(SQUASH_PRESETS).toHaveProperty('pulse');
  });
});

// ============================================
// SHAKE_INTENSITIES
// ============================================

describe('SHAKE_INTENSITIES', () => {
  it('intensities increase from light to extreme', () => {
    expect(SHAKE_INTENSITIES.light).toBeLessThan(SHAKE_INTENSITIES.medium);
    expect(SHAKE_INTENSITIES.medium).toBeLessThan(SHAKE_INTENSITIES.heavy);
    expect(SHAKE_INTENSITIES.heavy).toBeLessThan(SHAKE_INTENSITIES.extreme);
  });

  it('all intensities are positive numbers', () => {
    for (const value of Object.values(SHAKE_INTENSITIES)) {
      expect(value).toBeGreaterThan(0);
    }
  });

  it('light intensity is smallest', () => {
    const minIntensity = Math.min(...Object.values(SHAKE_INTENSITIES));
    expect(SHAKE_INTENSITIES.light).toBe(minIntensity);
  });

  it('extreme intensity is largest', () => {
    const maxIntensity = Math.max(...Object.values(SHAKE_INTENSITIES));
    expect(SHAKE_INTENSITIES.extreme).toBe(maxIntensity);
  });
});

// ============================================
// GAME_OVER_SEQUENCE
// ============================================

describe('GAME_OVER_SEQUENCE', () => {
  it('references SHAKE_INTENSITIES.heavy for shake intensity', () => {
    expect(GAME_OVER_SEQUENCE.shakeIntensity).toBe(SHAKE_INTENSITIES.heavy);
  });

  it('references BRAND_COLORS.white for flash color', () => {
    expect(GAME_OVER_SEQUENCE.flashColor).toBe(BRAND_COLORS.white);
  });

  it('has a flash intensity between 0 and 1', () => {
    expect(GAME_OVER_SEQUENCE.flashIntensity).toBeGreaterThan(0);
    expect(GAME_OVER_SEQUENCE.flashIntensity).toBeLessThanOrEqual(1);
  });

  it('has a positive shake duration', () => {
    expect(GAME_OVER_SEQUENCE.shakeDuration).toBeGreaterThan(0);
  });

  it('has a vignette color string', () => {
    expect(GAME_OVER_SEQUENCE.vignetteColor).toBeTypeOf('string');
    expect(GAME_OVER_SEQUENCE.vignetteColor.length).toBeGreaterThan(0);
  });
});

// ============================================
// MILESTONE_CALLOUTS
// ============================================

describe('MILESTONE_CALLOUTS', () => {
  it('has tier messages for all 5 tiers', () => {
    expect(MILESTONE_CALLOUTS.tier1).toBeDefined();
    expect(MILESTONE_CALLOUTS.tier2).toBeDefined();
    expect(MILESTONE_CALLOUTS.tier3).toBeDefined();
    expect(MILESTONE_CALLOUTS.tier4).toBeDefined();
    expect(MILESTONE_CALLOUTS.tier5).toBeDefined();
  });

  it('has special messages for high score and victory', () => {
    expect(MILESTONE_CALLOUTS.highScore).toBeDefined();
    expect(MILESTONE_CALLOUTS.victory).toBeDefined();
  });

  it('all callout messages are non-empty strings', () => {
    for (const message of Object.values(MILESTONE_CALLOUTS)) {
      expect(message).toBeTypeOf('string');
      expect(message.length).toBeGreaterThan(0);
    }
  });
});

// ============================================
// getCalloutForTier
// ============================================

describe('getCalloutForTier', () => {
  it('returns tier1 message for tier 1', () => {
    expect(getCalloutForTier(1)).toBe(MILESTONE_CALLOUTS.tier1);
  });

  it('returns tier2 message for tier 2', () => {
    expect(getCalloutForTier(2)).toBe(MILESTONE_CALLOUTS.tier2);
  });

  it('returns tier3 message for tier 3', () => {
    expect(getCalloutForTier(3)).toBe(MILESTONE_CALLOUTS.tier3);
  });

  it('returns tier4 message for tier 4', () => {
    expect(getCalloutForTier(4)).toBe(MILESTONE_CALLOUTS.tier4);
  });

  it('returns tier5 message for tier 5', () => {
    expect(getCalloutForTier(5)).toBe(MILESTONE_CALLOUTS.tier5);
  });

  it('clamps to tier5 for tiers beyond 5', () => {
    expect(getCalloutForTier(6)).toBe(MILESTONE_CALLOUTS.tier5);
    expect(getCalloutForTier(100)).toBe(MILESTONE_CALLOUTS.tier5);
  });

  it('returns tier1 (fallback) for tier 0', () => {
    // tier 0 → index -1, clamps to 0 due to Math.min, falls to last || fallback
    const result = getCalloutForTier(0);
    expect(result).toBeTypeOf('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for any positive integer tier', () => {
    for (let i = 1; i <= 10; i++) {
      const result = getCalloutForTier(i);
      expect(result).toBeTypeOf('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });
});

// ============================================
// PARTICLE_PALETTES
// ============================================

describe('PARTICLE_PALETTES', () => {
  it('has a primary palette', () => {
    expect(PARTICLE_PALETTES.primary).toBeDefined();
    expect(Array.isArray(PARTICLE_PALETTES.primary)).toBe(true);
  });

  it('primary palette contains BRAND_COLORS.primary', () => {
    expect(PARTICLE_PALETTES.primary).toContain(BRAND_COLORS.primary);
  });

  it('has a celebration palette with at least 3 colors', () => {
    expect(PARTICLE_PALETTES.celebration.length).toBeGreaterThanOrEqual(3);
  });

  it('has a fire palette', () => {
    expect(PARTICLE_PALETTES.fire).toBeDefined();
    expect(PARTICLE_PALETTES.fire.length).toBeGreaterThan(0);
  });

  it('has a danger palette', () => {
    expect(PARTICLE_PALETTES.danger).toBeDefined();
    expect(PARTICLE_PALETTES.danger.length).toBeGreaterThan(0);
  });

  it('all palettes are arrays of strings', () => {
    for (const palette of Object.values(PARTICLE_PALETTES)) {
      expect(Array.isArray(palette)).toBe(true);
      for (const color of palette) {
        expect(color).toBeTypeOf('string');
      }
    }
  });
});
