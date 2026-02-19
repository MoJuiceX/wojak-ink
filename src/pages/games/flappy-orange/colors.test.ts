/**
 * Tests for FlappyOrange Day/Night Cycle & Color Interpolation
 */
import { describe, it, expect } from 'vitest';
import {
  getCycleInfo,
  getCelestialPosition,
  getInterpolatedColors,
  generateStars,
} from './colors';
import { CYCLE_DURATION_MS, DAY_DURATION_MS } from './config';

describe('getCycleInfo', () => {
  it('returns normalizedCycle of 0 at the start of a cycle', () => {
    const info = getCycleInfo(0);
    expect(info.normalizedCycle).toBe(0);
  });

  it('returns isDay true at the start of the cycle', () => {
    const info = getCycleInfo(0);
    expect(info.isDay).toBe(true);
  });

  it('returns isDay false during the night phase', () => {
    const info = getCycleInfo(DAY_DURATION_MS + 1);
    expect(info.isDay).toBe(false);
  });

  it('wraps cycleTime when greater than CYCLE_DURATION_MS', () => {
    const info = getCycleInfo(CYCLE_DURATION_MS + 100);
    expect(info.cycleTime).toBe(100);
  });

  it('phaseTime is 0 at start of day', () => {
    const info = getCycleInfo(0);
    expect(info.phaseTime).toBe(0);
  });

  it('phaseTime is approximately 1 at end of day', () => {
    const info = getCycleInfo(DAY_DURATION_MS - 1);
    expect(info.phaseTime).toBeCloseTo(1, 1);
  });

  it('phaseTime is 0 at start of night', () => {
    const info = getCycleInfo(DAY_DURATION_MS);
    expect(info.phaseTime).toBe(0);
  });

  it('phaseTime is approximately 1 at end of night', () => {
    const info = getCycleInfo(CYCLE_DURATION_MS - 1);
    expect(info.phaseTime).toBeCloseTo(1, 1);
  });

  it('normalizedCycle is 0.5 at the midpoint', () => {
    const info = getCycleInfo(CYCLE_DURATION_MS / 2);
    expect(info.normalizedCycle).toBeCloseTo(0.5, 5);
  });

  it('normalizedCycle stays within 0-1 range for large inputs', () => {
    const info = getCycleInfo(CYCLE_DURATION_MS * 5 + 1000);
    expect(info.normalizedCycle).toBeGreaterThanOrEqual(0);
    expect(info.normalizedCycle).toBeLessThan(1);
  });
});

describe('getCelestialPosition', () => {
  it('returns an object with x and y properties', () => {
    const pos = getCelestialPosition(0.5, 800, 600);
    expect(pos).toHaveProperty('x');
    expect(pos).toHaveProperty('y');
  });

  it('at phaseTime 0.5 (zenith), x is approximately center of canvas', () => {
    const canvasWidth = 800;
    const pos = getCelestialPosition(0.5, canvasWidth, 600);
    expect(pos.x).toBeCloseTo(canvasWidth / 2, 1);
  });

  it('at phaseTime 0 (rising), x is on the left side', () => {
    const canvasWidth = 800;
    const pos = getCelestialPosition(0, canvasWidth, 600);
    expect(pos.x).toBeLessThan(canvasWidth / 2);
  });

  it('at phaseTime 1 (setting), x is on the right side', () => {
    const canvasWidth = 800;
    const pos = getCelestialPosition(1, canvasWidth, 600);
    expect(pos.x).toBeGreaterThan(canvasWidth / 2);
  });

  it('at phaseTime 0.5 (zenith), y is above canvas center', () => {
    const canvasHeight = 600;
    const pos = getCelestialPosition(0.5, 800, canvasHeight);
    expect(pos.y).toBeLessThan(canvasHeight / 2);
  });

  it('returns valid numbers for any canvas size', () => {
    const pos = getCelestialPosition(0.25, 400, 300);
    expect(Number.isFinite(pos.x)).toBe(true);
    expect(Number.isFinite(pos.y)).toBe(true);
  });
});

describe('getInterpolatedColors', () => {
  it('returns all required color keys', () => {
    const colors = getInterpolatedColors({ isDay: true, phaseTime: 0.5 });
    expect(colors).toHaveProperty('skyTop');
    expect(colors).toHaveProperty('skyBottom');
    expect(colors).toHaveProperty('treeFoliage');
    expect(colors).toHaveProperty('treeFoliageFar');
    expect(colors).toHaveProperty('treeTrunk');
    expect(colors).toHaveProperty('orangeFruit');
    expect(colors).toHaveProperty('clouds');
    expect(colors).toHaveProperty('ground');
    expect(colors).toHaveProperty('grass');
    expect(colors).toHaveProperty('currentEnv');
  });

  it('returns day environment during mid-day', () => {
    const colors = getInterpolatedColors({ isDay: true, phaseTime: 0.5 });
    expect(colors.currentEnv).toBe('day');
  });

  it('returns night environment during mid-night', () => {
    const colors = getInterpolatedColors({ isDay: false, phaseTime: 0.5 });
    expect(colors.currentEnv).toBe('night');
  });

  it('returns dawn-related env at very start of day', () => {
    const colors = getInterpolatedColors({ isDay: true, phaseTime: 0.05 });
    expect(['dawn', 'day']).toContain(colors.currentEnv);
  });

  it('returns sunset/golden env at end of day', () => {
    const colors = getInterpolatedColors({ isDay: true, phaseTime: 0.95 });
    expect(['golden', 'sunset']).toContain(colors.currentEnv);
  });

  it('returns dusk env at start of night', () => {
    const colors = getInterpolatedColors({ isDay: false, phaseTime: 0.05 });
    expect(['sunset', 'dusk']).toContain(colors.currentEnv);
  });

  it('returns dawn env at end of night (pre-dawn)', () => {
    const colors = getInterpolatedColors({ isDay: false, phaseTime: 0.92 });
    expect(['night', 'dawn']).toContain(colors.currentEnv);
  });

  it('color values are non-empty strings', () => {
    const colors = getInterpolatedColors({ isDay: true, phaseTime: 0.3 });
    expect(typeof colors.skyTop).toBe('string');
    expect(colors.skyTop.length).toBeGreaterThan(0);
  });
});

describe('generateStars', () => {
  it('generates the requested number of stars', () => {
    const stars = generateStars(800, 600, 20);
    expect(stars).toHaveLength(20);
  });

  it('generates 25 stars by default', () => {
    const stars = generateStars(800, 600);
    expect(stars).toHaveLength(25);
  });

  it('all stars have x within canvas width', () => {
    const canvasWidth = 800;
    const stars = generateStars(canvasWidth, 600, 50);
    for (const star of stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThanOrEqual(canvasWidth);
    }
  });

  it('all stars are in the upper 60% of the canvas', () => {
    const canvasHeight = 600;
    const stars = generateStars(800, canvasHeight, 50);
    for (const star of stars) {
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThanOrEqual(canvasHeight * 0.6);
    }
  });

  it('all stars have alpha between 0.6 and 1.0', () => {
    const stars = generateStars(800, 600, 100);
    for (const star of stars) {
      expect(star.alpha).toBeGreaterThanOrEqual(0.6);
      expect(star.alpha).toBeLessThanOrEqual(1.0);
    }
  });

  it('all stars have a positive size', () => {
    const stars = generateStars(800, 600, 50);
    for (const star of stars) {
      expect(star.size).toBeGreaterThan(0);
    }
  });

  it('generates 0 stars when count is 0', () => {
    const stars = generateStars(800, 600, 0);
    expect(stars).toHaveLength(0);
  });

  it('each star has required properties', () => {
    const stars = generateStars(800, 600, 1);
    expect(stars[0]).toHaveProperty('x');
    expect(stars[0]).toHaveProperty('y');
    expect(stars[0]).toHaveProperty('size');
    expect(stars[0]).toHaveProperty('alpha');
  });
});
