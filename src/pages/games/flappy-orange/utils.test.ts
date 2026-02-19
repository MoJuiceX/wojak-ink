import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  lerpColor,
  clamp,
  lerp,
  easeInOut,
  getCycleInfo,
  getInterpolatedColors,
  randomInRange,
  randomInt,
  randomPick,
  distance,
  normalizeAngle,
} from './utils';

describe('hexToRgb', () => {
  it('converts pure red', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('converts pure green', () => {
    expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('converts pure blue', () => {
    expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('converts white', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('converts black', () => {
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('converts brand orange', () => {
    const result = hexToRgb('#ff6b00');
    expect(result.r).toBe(255);
    expect(result.g).toBe(107);
    expect(result.b).toBe(0);
  });

  it('returns zeros for invalid hex', () => {
    expect(hexToRgb('invalid')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('handles uppercase hex', () => {
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
  });
});

describe('rgbToHex', () => {
  it('converts pure red', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
  });

  it('converts pure green', () => {
    expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
  });

  it('converts white', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
  });

  it('converts black', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
  });

  it('clamps values below 0', () => {
    expect(rgbToHex(-10, 0, 0)).toBe('#000000');
  });

  it('clamps values above 255', () => {
    expect(rgbToHex(300, 0, 0)).toBe('#ff0000');
  });

  it('rounds fractional values', () => {
    const result = rgbToHex(100.7, 200.3, 50.5);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('lerpColor', () => {
  it('returns the first color when t=0', () => {
    const result = lerpColor('#ff0000', '#0000ff', 0);
    expect(result).toBe('rgb(255, 0, 0)');
  });

  it('returns the second color when t=1', () => {
    const result = lerpColor('#ff0000', '#0000ff', 1);
    expect(result).toBe('rgb(0, 0, 255)');
  });

  it('returns midpoint color when t=0.5', () => {
    const result = lerpColor('#000000', '#ffffff', 0.5);
    expect(result).toBe('rgb(128, 128, 128)');
  });

  it('falls back for rgba colors at t < 0.5', () => {
    const result = lerpColor('rgba(255,0,0,0.5)', '#0000ff', 0.3);
    expect(result).toBe('rgba(255,0,0,0.5)');
  });

  it('falls back for rgba colors at t >= 0.5', () => {
    const result = lerpColor('rgba(255,0,0,0.5)', '#0000ff', 0.7);
    expect(result).toBe('#0000ff');
  });
});

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('returns min when value is below min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('returns max when value is above max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('returns exact min boundary', () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it('returns exact max boundary', () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('lerp', () => {
  it('returns a when t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns b when t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint when t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });

  it('works with negative values', () => {
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });
});

describe('easeInOut', () => {
  it('returns 0 when t=0', () => {
    expect(easeInOut(0)).toBe(0);
  });

  it('returns 1 when t=1', () => {
    expect(easeInOut(1)).toBe(1);
  });

  it('returns 0.5 when t=0.5', () => {
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 5);
  });

  it('output increases as t increases (monotonic)', () => {
    const values = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    for (let i = 1; i < values.length; i++) {
      expect(easeInOut(values[i])).toBeGreaterThanOrEqual(easeInOut(values[i - 1]));
    }
  });

  it('has ease-in behavior (slow start)', () => {
    // At t=0.1 output should be less than linear
    expect(easeInOut(0.1)).toBeLessThan(0.1);
  });

  it('has ease-out behavior (slow end)', () => {
    // At t=0.9 output should be greater than linear
    expect(easeInOut(0.9)).toBeGreaterThan(0.9);
  });
});

describe('getCycleInfo', () => {
  it('progress 0 is dawn phase', () => {
    const info = getCycleInfo(0);
    expect(info.currentPhase).toBe('dawn');
    expect(info.progress).toBe(0);
  });

  it('isDay is true in the first half of cycle', () => {
    const info = getCycleInfo(30000); // 30s into 120s cycle = 25% progress
    expect(info.isDay).toBe(true);
  });

  it('isDay is false in the second half of cycle', () => {
    const info = getCycleInfo(90000); // 90s into 120s cycle = 75% progress
    expect(info.isDay).toBe(false);
  });

  it('progress wraps around with modulo', () => {
    const info1 = getCycleInfo(0);
    const info2 = getCycleInfo(120000); // One full cycle
    expect(info1.progress).toBeCloseTo(info2.progress, 5);
  });

  it('progress is between 0 and 1', () => {
    [0, 30000, 60000, 90000, 119999].forEach(t => {
      const info = getCycleInfo(t);
      expect(info.progress).toBeGreaterThanOrEqual(0);
      expect(info.progress).toBeLessThan(1);
    });
  });

  it('celestialProgress is between 0 and 1', () => {
    [0, 30000, 60000, 90000, 119999].forEach(t => {
      const info = getCycleInfo(t);
      expect(info.celestialProgress).toBeGreaterThanOrEqual(0);
      expect(info.celestialProgress).toBeLessThanOrEqual(1);
    });
  });

  it('returns night phase near the end of cycle', () => {
    // 85% progress = 102000ms - should be night (>= 0.583)
    const info = getCycleInfo(102000);
    expect(info.currentPhase).toBe('night');
  });
});

describe('getInterpolatedColors', () => {
  it('returns an object with all expected color keys', () => {
    const info = getCycleInfo(0);
    const colors = getInterpolatedColors(info);
    expect(colors).toHaveProperty('skyTop');
    expect(colors).toHaveProperty('skyBottom');
    expect(colors).toHaveProperty('treeFoliage');
    expect(colors).toHaveProperty('ground');
    expect(colors).toHaveProperty('grass');
    expect(colors).toHaveProperty('orangeFruit');
  });

  it('returns rgb or hex strings for all color values', () => {
    const info = getCycleInfo(0);
    const colors = getInterpolatedColors(info);
    Object.values(colors).forEach(color => {
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    });
  });
});

describe('randomInRange', () => {
  it('returns values within the specified range', () => {
    for (let i = 0; i < 100; i++) {
      const value = randomInRange(5, 10);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThan(10);
    }
  });
});

describe('randomInt', () => {
  it('returns integers within the inclusive range', () => {
    const values = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const value = randomInt(1, 5);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(5);
      values.add(value);
    }
    // Should eventually hit all values in [1, 5]
    expect(values.size).toBe(5);
  });
});

describe('randomPick', () => {
  it('returns an element from the array', () => {
    const arr = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(randomPick(arr));
    }
  });

  it('can return any element', () => {
    const arr = [1, 2, 3, 4, 5];
    const picked = new Set<number>();
    for (let i = 0; i < 200; i++) {
      picked.add(randomPick(arr));
    }
    expect(picked.size).toBe(arr.length);
  });
});

describe('distance', () => {
  it('returns 0 for same point', () => {
    expect(distance(3, 4, 3, 4)).toBe(0);
  });

  it('calculates 3-4-5 right triangle', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });

  it('is symmetric', () => {
    expect(distance(1, 2, 5, 6)).toBeCloseTo(distance(5, 6, 1, 2), 10);
  });

  it('returns positive value for any two different points', () => {
    expect(distance(0, 0, 1, 0)).toBeGreaterThan(0);
    expect(distance(0, 0, 0, 1)).toBeGreaterThan(0);
  });
});

describe('normalizeAngle', () => {
  it('returns 0 for 0', () => {
    expect(normalizeAngle(0)).toBeCloseTo(0, 10);
  });

  it('normalizes negative angle', () => {
    const result = normalizeAngle(-Math.PI);
    expect(result).toBeCloseTo(Math.PI, 5);
  });

  it('normalizes angle larger than 2PI', () => {
    const result = normalizeAngle(Math.PI * 3);
    expect(result).toBeCloseTo(Math.PI, 5);
  });

  it('result is always in [0, 2PI)', () => {
    const angles = [-10, -Math.PI, 0, Math.PI, 2 * Math.PI, 5 * Math.PI, -0.001];
    angles.forEach(angle => {
      const result = normalizeAngle(angle);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(Math.PI * 2);
    });
  });

  it('preserves angles already in range', () => {
    expect(normalizeAngle(1)).toBeCloseTo(1, 10);
    expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI, 10);
  });
});
