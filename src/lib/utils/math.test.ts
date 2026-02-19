import { describe, it, expect } from 'vitest';
import {
  clamp,
  randomInRange,
  randomInt,
  randomItem,
  shuffle,
  distance,
  distanceSquared,
  angle,
  degToRad,
  radToDeg,
  normalizeAngle,
  angleDifference,
  createVector,
  addVectors,
  subtractVectors,
  scaleVector,
  normalizeVector,
  vectorLength,
  vectorLengthSquared,
  dotProduct,
  vectorFromAngle,
  pointInRect,
  pointInCircle,
  rectOverlap,
  circleOverlap,
  circleRectOverlap,
  map,
  wrap,
  roundTo,
  percentage,
  formatNumber,
  formatTime,
  formatTimeMs,
} from './math';

// ============================================
// BASIC OPERATIONS
// ============================================

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

  it('returns min when value equals min', () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it('returns max when value equals max', () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('handles negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(0, -10, -1)).toBe(-1);
    expect(clamp(-20, -10, -1)).toBe(-10);
  });
});

describe('randomInRange', () => {
  it('returns values within the range', () => {
    for (let i = 0; i < 100; i++) {
      const val = randomInRange(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThan(10);
    }
  });

  it('returns a number', () => {
    expect(typeof randomInRange(0, 1)).toBe('number');
  });
});

describe('randomInt', () => {
  it('returns integers within range (inclusive)', () => {
    for (let i = 0; i < 100; i++) {
      const val = randomInt(1, 6);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(6);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('returns the only possible value when min equals max', () => {
    expect(randomInt(5, 5)).toBe(5);
  });
});

describe('randomItem', () => {
  it('returns an element from the array', () => {
    const arr = [1, 2, 3, 4, 5];
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(randomItem(arr));
    }
  });

  it('returns the only item for single-element array', () => {
    expect(randomItem(['only'])).toBe('only');
  });
});

describe('shuffle', () => {
  it('returns array of same length', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr)).toHaveLength(arr.length);
  });

  it('contains same elements as original', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    shuffle(arr);
    expect(arr).toEqual(original);
  });

  it('returns empty array for empty input', () => {
    expect(shuffle([])).toEqual([]);
  });
});

// ============================================
// GEOMETRY
// ============================================

describe('distance', () => {
  it('returns 0 for same point', () => {
    expect(distance(5, 5, 5, 5)).toBe(0);
  });

  it('returns correct distance for simple horizontal', () => {
    expect(distance(0, 0, 3, 0)).toBe(3);
  });

  it('returns correct distance for simple vertical', () => {
    expect(distance(0, 0, 0, 4)).toBe(4);
  });

  it('returns correct distance for 3-4-5 triangle', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });
});

describe('distanceSquared', () => {
  it('returns 0 for same point', () => {
    expect(distanceSquared(5, 5, 5, 5)).toBe(0);
  });

  it('returns squared distance', () => {
    expect(distanceSquared(0, 0, 3, 4)).toBe(25);
  });
});

describe('angle', () => {
  it('returns 0 for rightward direction', () => {
    expect(angle(0, 0, 1, 0)).toBe(0);
  });

  it('returns PI/2 for downward direction', () => {
    expect(angle(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2);
  });

  it('returns PI for leftward direction', () => {
    expect(Math.abs(angle(0, 0, -1, 0))).toBeCloseTo(Math.PI);
  });
});

describe('degToRad', () => {
  it('converts 0 degrees to 0 radians', () => {
    expect(degToRad(0)).toBe(0);
  });

  it('converts 180 degrees to PI', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI);
  });

  it('converts 360 degrees to 2*PI', () => {
    expect(degToRad(360)).toBeCloseTo(Math.PI * 2);
  });

  it('converts 90 degrees to PI/2', () => {
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
  });
});

describe('radToDeg', () => {
  it('converts 0 radians to 0 degrees', () => {
    expect(radToDeg(0)).toBe(0);
  });

  it('converts PI to 180 degrees', () => {
    expect(radToDeg(Math.PI)).toBeCloseTo(180);
  });

  it('round-trips with degToRad', () => {
    expect(radToDeg(degToRad(45))).toBeCloseTo(45);
  });
});

describe('normalizeAngle', () => {
  it('leaves angle in 0 to 2PI unchanged', () => {
    expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI);
  });

  it('normalizes negative angle', () => {
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2);
  });

  it('normalizes angle greater than 2PI', () => {
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
  });
});

describe('angleDifference', () => {
  it('returns 0 for same angles', () => {
    expect(angleDifference(Math.PI, Math.PI)).toBeCloseTo(0);
  });

  it('returns positive difference for forward rotation', () => {
    expect(angleDifference(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
  });

  it('handles wrap-around correctly', () => {
    // From near 2PI to near 0: shortest path is positive small angle
    const diff = angleDifference(6, 0.1);
    expect(Math.abs(diff)).toBeLessThan(Math.PI);
  });
});

// ============================================
// VECTORS
// ============================================

describe('createVector', () => {
  it('creates zero vector by default', () => {
    expect(createVector()).toEqual({ x: 0, y: 0 });
  });

  it('creates vector with given coordinates', () => {
    expect(createVector(3, 4)).toEqual({ x: 3, y: 4 });
  });
});

describe('addVectors', () => {
  it('adds two vectors', () => {
    expect(addVectors({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
  });

  it('adding zero vector leaves vector unchanged', () => {
    expect(addVectors({ x: 5, y: -3 }, { x: 0, y: 0 })).toEqual({ x: 5, y: -3 });
  });
});

describe('subtractVectors', () => {
  it('subtracts two vectors', () => {
    expect(subtractVectors({ x: 5, y: 7 }, { x: 2, y: 3 })).toEqual({ x: 3, y: 4 });
  });

  it('subtracting from itself gives zero vector', () => {
    expect(subtractVectors({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 0, y: 0 });
  });
});

describe('scaleVector', () => {
  it('scales vector by factor', () => {
    expect(scaleVector({ x: 2, y: 3 }, 4)).toEqual({ x: 8, y: 12 });
  });

  it('scaling by 0 gives zero vector', () => {
    expect(scaleVector({ x: 5, y: 5 }, 0)).toEqual({ x: 0, y: 0 });
  });

  it('scaling by -1 negates vector', () => {
    expect(scaleVector({ x: 3, y: -4 }, -1)).toEqual({ x: -3, y: 4 });
  });
});

describe('normalizeVector', () => {
  it('returns zero vector for zero input', () => {
    expect(normalizeVector({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('returns unit vector with length ~1', () => {
    const v = normalizeVector({ x: 3, y: 4 });
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    expect(len).toBeCloseTo(1);
  });
});

describe('vectorLength', () => {
  it('returns 0 for zero vector', () => {
    expect(vectorLength({ x: 0, y: 0 })).toBe(0);
  });

  it('returns correct length', () => {
    expect(vectorLength({ x: 3, y: 4 })).toBe(5);
  });
});

describe('vectorLengthSquared', () => {
  it('returns squared length', () => {
    expect(vectorLengthSquared({ x: 3, y: 4 })).toBe(25);
  });
});

describe('dotProduct', () => {
  it('returns 0 for perpendicular vectors', () => {
    expect(dotProduct({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0);
  });

  it('returns positive for parallel vectors', () => {
    expect(dotProduct({ x: 1, y: 0 }, { x: 1, y: 0 })).toBe(1);
  });

  it('computes correctly', () => {
    expect(dotProduct({ x: 2, y: 3 }, { x: 4, y: 5 })).toBe(23);
  });
});

describe('vectorFromAngle', () => {
  it('returns rightward unit vector for angle 0', () => {
    const v = vectorFromAngle(0);
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(0);
  });

  it('scales by given length', () => {
    const v = vectorFromAngle(0, 5);
    expect(v.x).toBeCloseTo(5);
    expect(v.y).toBeCloseTo(0);
  });
});

// ============================================
// COLLISION DETECTION
// ============================================

describe('pointInRect', () => {
  it('returns true for point inside rect', () => {
    expect(pointInRect(5, 5, 0, 0, 10, 10)).toBe(true);
  });

  it('returns false for point outside rect', () => {
    expect(pointInRect(15, 5, 0, 0, 10, 10)).toBe(false);
  });

  it('returns true for point on rect edge', () => {
    expect(pointInRect(0, 0, 0, 0, 10, 10)).toBe(true);
    expect(pointInRect(10, 10, 0, 0, 10, 10)).toBe(true);
  });
});

describe('pointInCircle', () => {
  it('returns true for point at center', () => {
    expect(pointInCircle(5, 5, 5, 5, 10)).toBe(true);
  });

  it('returns false for point outside circle', () => {
    expect(pointInCircle(20, 20, 5, 5, 5)).toBe(false);
  });

  it('returns true for point on circle edge', () => {
    // Point at (5, 0) on circle at (0, 0) with radius 5
    expect(pointInCircle(5, 0, 0, 0, 5)).toBe(true);
  });
});

describe('rectOverlap', () => {
  it('returns true for overlapping rects', () => {
    expect(rectOverlap(0, 0, 10, 10, 5, 5, 10, 10)).toBe(true);
  });

  it('returns false for non-overlapping rects', () => {
    expect(rectOverlap(0, 0, 10, 10, 20, 20, 10, 10)).toBe(false);
  });

  it('returns false for adjacent rects (touching but not overlapping)', () => {
    expect(rectOverlap(0, 0, 10, 10, 10, 0, 10, 10)).toBe(false);
  });
});

describe('circleOverlap', () => {
  it('returns true for overlapping circles', () => {
    expect(circleOverlap(0, 0, 5, 3, 0, 5)).toBe(true);
  });

  it('returns false for non-overlapping circles', () => {
    expect(circleOverlap(0, 0, 2, 10, 0, 2)).toBe(false);
  });
});

describe('circleRectOverlap', () => {
  it('returns true for circle overlapping rect', () => {
    expect(circleRectOverlap(5, 5, 5, 0, 0, 10, 10)).toBe(true);
  });

  it('returns false when circle is far from rect', () => {
    expect(circleRectOverlap(50, 50, 3, 0, 0, 10, 10)).toBe(false);
  });
});

// ============================================
// INTERPOLATION
// ============================================

describe('map', () => {
  it('maps value from one range to another', () => {
    expect(map(5, 0, 10, 0, 100)).toBe(50);
  });

  it('maps minimum value', () => {
    expect(map(0, 0, 10, 0, 100)).toBe(0);
  });

  it('maps maximum value', () => {
    expect(map(10, 0, 10, 0, 100)).toBe(100);
  });

  it('maps to different range', () => {
    expect(map(1, 0, 4, 0, 1)).toBeCloseTo(0.25);
  });
});

describe('wrap', () => {
  it('wraps value within range', () => {
    expect(wrap(0, 0, 10)).toBe(0);
    expect(wrap(10, 0, 10)).toBe(0);
  });

  it('wraps value above range', () => {
    expect(wrap(12, 0, 10)).toBe(2);
  });

  it('wraps value below range', () => {
    expect(wrap(-2, 0, 10)).toBe(8);
  });
});

describe('roundTo', () => {
  it('rounds to 0 decimal places', () => {
    expect(roundTo(3.6, 0)).toBe(4);
  });

  it('rounds to 2 decimal places', () => {
    expect(roundTo(3.14159, 2)).toBe(3.14);
  });

  it('rounds to 1 decimal place', () => {
    expect(roundTo(1.55, 1)).toBe(1.6);
  });
});

// ============================================
// GAME-SPECIFIC
// ============================================

describe('percentage', () => {
  it('returns correct percentage', () => {
    expect(percentage(25, 100)).toBe(25);
  });

  it('returns 0 when total is 0 (safe division)', () => {
    expect(percentage(10, 0)).toBe(0);
  });

  it('returns 100 when value equals total', () => {
    expect(percentage(50, 50)).toBe(100);
  });
});

describe('formatNumber', () => {
  it('formats number without commas for small numbers', () => {
    expect(formatNumber(999)).toBe('999');
  });

  it('formats number with comma for thousands', () => {
    expect(formatNumber(1000)).toBe('1,000');
  });

  it('formats large numbers with multiple commas', () => {
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('handles 0', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatTime', () => {
  it('formats 0 seconds as 0:00', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats 65 seconds as 1:05', () => {
    expect(formatTime(65)).toBe('1:05');
  });

  it('formats 3600 seconds as 60:00', () => {
    expect(formatTime(3600)).toBe('60:00');
  });

  it('pads single-digit seconds', () => {
    expect(formatTime(9)).toBe('0:09');
  });
});

describe('formatTimeMs', () => {
  it('formats 0 seconds as 0:00.00', () => {
    expect(formatTimeMs(0)).toBe('0:00.00');
  });

  it('includes milliseconds', () => {
    expect(formatTimeMs(1.5)).toBe('0:01.50');
  });

  it('formats correctly with minutes', () => {
    expect(formatTimeMs(61.25)).toBe('1:01.25');
  });
});
