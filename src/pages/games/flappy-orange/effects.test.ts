/**
 * Tests for flappy-orange/effects.ts
 * Validates pure visual effect functions: screen shake, flap deformation,
 * death slow-motion, impact flash, and pass pulse.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createScreenShake,
  calculateShakeOffset,
  applyFlapDeformation,
  resetBirdDeformation,
  getFlapDeformationValues,
  calculateDeathSlowMo,
  getDeathKnockback,
  applyDeathKnockback,
  getImpactFlashAlpha,
  getPassPulseBrightness,
  EFFECT_DURATIONS,
  EFFECT_INTENSITIES,
} from './effects';
import { JUICE_CONFIG } from './config';
import type { Bird, ShakeState } from './types';

// ============================================
// HELPERS
// ============================================

function makeBird(overrides: Partial<Bird> = {}): Bird {
  return {
    y: 200,
    velocity: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    velocityX: 0,
    rotationVelocity: 0,
    ...overrides,
  };
}

// ============================================
// createScreenShake
// ============================================

describe('createScreenShake', () => {
  it('creates a shake state with correct intensity', () => {
    const shake = createScreenShake(10, 200);
    expect(shake.intensity).toBe(10);
  });

  it('creates a shake state with correct duration', () => {
    const shake = createScreenShake(5, 300);
    expect(shake.duration).toBe(300);
  });

  it('records startTime close to Date.now()', () => {
    const before = Date.now();
    const shake = createScreenShake(6, 200);
    const after = Date.now();
    expect(shake.startTime).toBeGreaterThanOrEqual(before);
    expect(shake.startTime).toBeLessThanOrEqual(after);
  });
});

// ============================================
// calculateShakeOffset
// ============================================

describe('calculateShakeOffset', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns zeros and isComplete=true for null shake', () => {
    const result = calculateShakeOffset(null);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.isComplete).toBe(true);
  });

  it('returns isComplete=false for a fresh shake', () => {
    const shake: ShakeState = { intensity: 10, startTime: Date.now(), duration: 1000 };
    const result = calculateShakeOffset(shake);
    expect(result.isComplete).toBe(false);
  });

  it('returns isComplete=true after duration has passed', () => {
    const startTime = Date.now();
    vi.setSystemTime(startTime);
    const shake: ShakeState = { intensity: 10, startTime, duration: 200 };
    vi.advanceTimersByTime(201);
    const result = calculateShakeOffset(shake);
    expect(result.isComplete).toBe(true);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('returns non-zero offsets for an active shake', () => {
    const shake: ShakeState = { intensity: 10, startTime: Date.now(), duration: 1000 };
    // Run several samples to confirm non-deterministic offsets are sometimes non-zero
    const results = Array.from({ length: 20 }, () => calculateShakeOffset(shake));
    const anyNonZero = results.some(r => r.x !== 0 || r.y !== 0);
    expect(anyNonZero).toBe(true);
  });
});

// ============================================
// applyFlapDeformation
// ============================================

describe('applyFlapDeformation', () => {
  it('sets scaleX to FLAP_SCALE_X from config', () => {
    const bird = makeBird();
    const result = applyFlapDeformation(bird);
    expect(result.scaleX).toBe(JUICE_CONFIG.FLAP_SCALE_X);
  });

  it('sets scaleY to FLAP_SCALE_Y from config', () => {
    const bird = makeBird();
    const result = applyFlapDeformation(bird);
    expect(result.scaleY).toBe(JUICE_CONFIG.FLAP_SCALE_Y);
  });

  it('does not mutate the original bird', () => {
    const bird = makeBird({ scaleX: 1, scaleY: 1 });
    applyFlapDeformation(bird);
    expect(bird.scaleX).toBe(1);
  });

  it('preserves other bird properties', () => {
    const bird = makeBird({ y: 150, velocity: -6 });
    const result = applyFlapDeformation(bird);
    expect(result.y).toBe(150);
    expect(result.velocity).toBe(-6);
  });
});

// ============================================
// resetBirdDeformation
// ============================================

describe('resetBirdDeformation', () => {
  it('resets scaleX to 1', () => {
    const bird = makeBird({ scaleX: 0.85 });
    const result = resetBirdDeformation(bird);
    expect(result.scaleX).toBe(1);
  });

  it('resets scaleY to 1', () => {
    const bird = makeBird({ scaleY: 1.3 });
    const result = resetBirdDeformation(bird);
    expect(result.scaleY).toBe(1);
  });

  it('does not mutate the original bird', () => {
    const bird = makeBird({ scaleX: 0.8, scaleY: 1.2 });
    resetBirdDeformation(bird);
    expect(bird.scaleX).toBe(0.8);
  });
});

// ============================================
// getFlapDeformationValues
// ============================================

describe('getFlapDeformationValues', () => {
  it('returns squash values during FLAP_DURATION', () => {
    const result = getFlapDeformationValues(JUICE_CONFIG.FLAP_DURATION - 1);
    expect(result.scaleX).toBe(JUICE_CONFIG.FLAP_SCALE_X);
    expect(result.scaleY).toBe(JUICE_CONFIG.FLAP_SCALE_Y);
  });

  it('returns scale 1 after FLAP_DURATION + FLAP_RETURN_DURATION', () => {
    const elapsed = JUICE_CONFIG.FLAP_DURATION + JUICE_CONFIG.FLAP_RETURN_DURATION;
    const result = getFlapDeformationValues(elapsed);
    expect(result.scaleX).toBe(1);
    expect(result.scaleY).toBe(1);
  });

  it('returns values between squash and 1 during return phase', () => {
    const midReturn = JUICE_CONFIG.FLAP_DURATION + JUICE_CONFIG.FLAP_RETURN_DURATION / 2;
    const result = getFlapDeformationValues(midReturn);
    expect(result.scaleX).toBeGreaterThan(JUICE_CONFIG.FLAP_SCALE_X);
    expect(result.scaleX).toBeLessThanOrEqual(1);
    expect(result.scaleY).toBeLessThan(JUICE_CONFIG.FLAP_SCALE_Y);
    expect(result.scaleY).toBeGreaterThanOrEqual(1);
  });
});

// ============================================
// calculateDeathSlowMo
// ============================================

describe('calculateDeathSlowMo', () => {
  it('returns SLOW_MO_SCALE during active slow-mo', () => {
    const result = calculateDeathSlowMo(JUICE_CONFIG.SLOW_MO_DURATION - 1);
    expect(result.timeScale).toBe(JUICE_CONFIG.SLOW_MO_SCALE);
    expect(result.isComplete).toBe(false);
  });

  it('returns timeScale 1 and isComplete after duration', () => {
    const result = calculateDeathSlowMo(JUICE_CONFIG.SLOW_MO_DURATION);
    expect(result.timeScale).toBe(1);
    expect(result.isComplete).toBe(true);
  });

  it('returns timeScale 1 and isComplete well past duration', () => {
    const result = calculateDeathSlowMo(9999);
    expect(result.timeScale).toBe(1);
    expect(result.isComplete).toBe(true);
  });
});

// ============================================
// getDeathKnockback
// ============================================

describe('getDeathKnockback', () => {
  it('returns negative velocityX (leftward knockback)', () => {
    const knockback = getDeathKnockback();
    expect(knockback.velocityX).toBeLessThan(0);
  });

  it('returns velocityY matching configured DEATH_KNOCKBACK_Y', () => {
    const knockback = getDeathKnockback();
    expect(knockback.velocityY).toBe(JUICE_CONFIG.DEATH_KNOCKBACK_Y);
  });

  it('returns rotationVelocity matching TUMBLE_ROTATION_SPEED', () => {
    const knockback = getDeathKnockback();
    expect(knockback.rotationVelocity).toBe(JUICE_CONFIG.TUMBLE_ROTATION_SPEED);
  });
});

// ============================================
// applyDeathKnockback
// ============================================

describe('applyDeathKnockback', () => {
  it('applies negative velocityX to bird', () => {
    const bird = makeBird({ velocityX: 0 });
    const result = applyDeathKnockback(bird);
    expect(result.velocityX).toBeLessThan(0);
  });

  it('applies DEATH_KNOCKBACK_Y to bird velocity', () => {
    const bird = makeBird({ velocity: 0 });
    const result = applyDeathKnockback(bird);
    expect(result.velocity).toBe(JUICE_CONFIG.DEATH_KNOCKBACK_Y);
  });

  it('applies rotationVelocity to bird', () => {
    const bird = makeBird({ rotationVelocity: 0 });
    const result = applyDeathKnockback(bird);
    expect(result.rotationVelocity).toBe(JUICE_CONFIG.TUMBLE_ROTATION_SPEED);
  });

  it('does not mutate the original bird', () => {
    const bird = makeBird({ velocityX: 0 });
    applyDeathKnockback(bird);
    expect(bird.velocityX).toBe(0);
  });
});

// ============================================
// getImpactFlashAlpha
// ============================================

describe('getImpactFlashAlpha', () => {
  it('returns maximum alpha at elapsed=0', () => {
    const alpha = getImpactFlashAlpha(0);
    expect(alpha).toBe(JUICE_CONFIG.IMPACT_FLASH_ALPHA);
  });

  it('returns 0 at or after IMPACT_FLASH_DURATION', () => {
    expect(getImpactFlashAlpha(JUICE_CONFIG.IMPACT_FLASH_DURATION)).toBe(0);
  });

  it('returns a value between 0 and max at midpoint', () => {
    const mid = JUICE_CONFIG.IMPACT_FLASH_DURATION / 2;
    const alpha = getImpactFlashAlpha(mid);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(JUICE_CONFIG.IMPACT_FLASH_ALPHA);
  });

  it('returns 0 well past duration', () => {
    expect(getImpactFlashAlpha(9999)).toBe(0);
  });
});

// ============================================
// getPassPulseBrightness
// ============================================

describe('getPassPulseBrightness', () => {
  it('returns brightness > 1 at elapsed=0', () => {
    const brightness = getPassPulseBrightness(0, 100);
    expect(brightness).toBeGreaterThan(1);
  });

  it('returns exactly 1 at or after duration', () => {
    expect(getPassPulseBrightness(100, 100)).toBe(1);
  });

  it('returns 1 well after duration', () => {
    expect(getPassPulseBrightness(500, 100)).toBe(1);
  });

  it('returns value between 1 and max at midpoint', () => {
    const mid = getPassPulseBrightness(50, 100);
    expect(mid).toBeGreaterThan(1);
  });
});

// ============================================
// EFFECT_DURATIONS constant
// ============================================

describe('EFFECT_DURATIONS', () => {
  it('exports FREEZE duration matching config', () => {
    expect(EFFECT_DURATIONS.FREEZE).toBe(JUICE_CONFIG.FREEZE_DURATION);
  });

  it('exports SLOW_MO duration matching config', () => {
    expect(EFFECT_DURATIONS.SLOW_MO).toBe(JUICE_CONFIG.SLOW_MO_DURATION);
  });

  it('exports IMPACT_FLASH duration matching config', () => {
    expect(EFFECT_DURATIONS.IMPACT_FLASH).toBe(JUICE_CONFIG.IMPACT_FLASH_DURATION);
  });

  it('exports FLAP duration matching config', () => {
    expect(EFFECT_DURATIONS.FLAP).toBe(JUICE_CONFIG.FLAP_DURATION);
  });
});

// ============================================
// EFFECT_INTENSITIES constant
// ============================================

describe('EFFECT_INTENSITIES', () => {
  it('exports SCREEN_SHAKE intensity matching config', () => {
    expect(EFFECT_INTENSITIES.SCREEN_SHAKE).toBe(JUICE_CONFIG.SCREEN_SHAKE_INTENSITY);
  });

  it('exports IMPACT_FLASH intensity matching config', () => {
    expect(EFFECT_INTENSITIES.IMPACT_FLASH).toBe(JUICE_CONFIG.IMPACT_FLASH_ALPHA);
  });

  it('exports SCREEN_PULSE intensity matching config', () => {
    expect(EFFECT_INTENSITIES.SCREEN_PULSE).toBe(JUICE_CONFIG.SCREEN_PULSE_INTENSITY);
  });
});
