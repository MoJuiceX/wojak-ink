// src/systems/haptics/patterns.test.ts
import { describe, it, expect } from 'vitest';
import {
  HAPTIC_PATTERNS,
  getComboHaptic,
  getDynamicComboPattern,
  scalePattern,
  createCelebrationPattern,
  type HapticPattern,
} from './patterns';

describe('haptic patterns', () => {
  describe('HAPTIC_PATTERNS', () => {
    it('defines "light" as a single short number', () => {
      expect(typeof HAPTIC_PATTERNS['light']).toBe('number');
      expect(HAPTIC_PATTERNS['light']).toBeLessThan(50);
    });

    it('defines "heavy" as longer than light', () => {
      const light = HAPTIC_PATTERNS['light'] as number;
      const heavy = HAPTIC_PATTERNS['heavy'] as number;
      expect(heavy).toBeGreaterThan(light);
    });

    it('defines "score" as a number pattern', () => {
      expect(typeof HAPTIC_PATTERNS['score']).toBe('number');
    });

    it('defines "combo-max" as an array (multi-pulse)', () => {
      expect(Array.isArray(HAPTIC_PATTERNS['combo-max'])).toBe(true);
      const arr = HAPTIC_PATTERNS['combo-max'] as number[];
      expect(arr.length).toBeGreaterThan(1);
    });

    it('all pattern values are positive numbers', () => {
      for (const [key, pattern] of Object.entries(HAPTIC_PATTERNS)) {
        if (typeof pattern === 'number') {
          expect(pattern, `${key} should be positive`).toBeGreaterThan(0);
        } else {
          for (const v of pattern) {
            expect(v, `${key} array element should be positive`).toBeGreaterThan(0);
          }
        }
      }
    });

    it('has "game-over" pattern defined', () => {
      expect(HAPTIC_PATTERNS['game-over']).toBeDefined();
    });

    it('has "achievement" pattern defined', () => {
      expect(HAPTIC_PATTERNS['achievement']).toBeDefined();
    });

    it('has brick breaker patterns', () => {
      expect(HAPTIC_PATTERNS['bb-paddle-hit']).toBeDefined();
      expect(HAPTIC_PATTERNS['bb-brick-normal']).toBeDefined();
      expect(HAPTIC_PATTERNS['bb-ball-lost']).toBeDefined();
    });

    it('has orange juggle patterns', () => {
      expect(HAPTIC_PATTERNS['oj-orange-hit']).toBeDefined();
      expect(HAPTIC_PATTERNS['oj-golden-hit']).toBeDefined();
      expect(HAPTIC_PATTERNS['oj-orange-drop']).toBeDefined();
    });

    it('has color reaction patterns', () => {
      expect(HAPTIC_PATTERNS['cr-perfect']).toBeDefined();
      expect(HAPTIC_PATTERNS['cr-wrong']).toBeDefined();
      expect(HAPTIC_PATTERNS['cr-miss']).toBeDefined();
    });

    it('level-up pattern is an array', () => {
      expect(Array.isArray(HAPTIC_PATTERNS['level-up'])).toBe(true);
    });
  });

  describe('getComboHaptic', () => {
    it('returns "score" for combo level 1', () => {
      expect(getComboHaptic(1)).toBe('score');
    });

    it('returns "combo-1" for level 2', () => {
      expect(getComboHaptic(2)).toBe('combo-1');
    });

    it('returns "combo-1" for level 3', () => {
      expect(getComboHaptic(3)).toBe('combo-1');
    });

    it('returns "combo-2" for level 4', () => {
      expect(getComboHaptic(4)).toBe('combo-2');
    });

    it('returns "combo-2" for level 5 and 6', () => {
      expect(getComboHaptic(5)).toBe('combo-2');
      expect(getComboHaptic(6)).toBe('combo-2');
    });

    it('returns "combo-3" for level 7', () => {
      expect(getComboHaptic(7)).toBe('combo-3');
    });

    it('returns "combo-max" for level 10+', () => {
      expect(getComboHaptic(10)).toBe('combo-max');
      expect(getComboHaptic(15)).toBe('combo-max');
      expect(getComboHaptic(100)).toBe('combo-max');
    });

    it('returns a valid HapticPattern string', () => {
      const validPatterns = Object.keys(HAPTIC_PATTERNS) as HapticPattern[];
      for (const level of [1, 2, 4, 7, 10]) {
        expect(validPatterns).toContain(getComboHaptic(level));
      }
    });
  });

  describe('getDynamicComboPattern', () => {
    it('returns a number or number array', () => {
      const result = getDynamicComboPattern(3);
      expect(typeof result === 'number' || Array.isArray(result)).toBe(true);
    });

    it('returns single number for combo level 1', () => {
      const result = getDynamicComboPattern(1);
      expect(typeof result).toBe('number');
    });

    it('returns array for combo level 3+', () => {
      const result = getDynamicComboPattern(3);
      expect(Array.isArray(result)).toBe(true);
    });

    it('pattern is longer for higher combo levels', () => {
      const low = getDynamicComboPattern(2);
      const high = getDynamicComboPattern(10);
      const lowLen = Array.isArray(low) ? low.length : 1;
      const highLen = Array.isArray(high) ? high.length : 1;
      expect(highLen).toBeGreaterThanOrEqual(lowLen);
    });

    it('clamps combo level to minimum of 1', () => {
      expect(() => getDynamicComboPattern(0)).not.toThrow();
      expect(() => getDynamicComboPattern(-5)).not.toThrow();
    });

    it('handles very high combo levels without error', () => {
      expect(() => getDynamicComboPattern(100)).not.toThrow();
    });

    it('all values in returned array are positive', () => {
      const result = getDynamicComboPattern(8);
      if (Array.isArray(result)) {
        for (const v of result) {
          expect(v).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('scalePattern', () => {
    it('scales a single number by the given factor', () => {
      expect(scalePattern(10, 2)).toBe(20);
    });

    it('scales an array of numbers', () => {
      expect(scalePattern([10, 20, 30], 2)).toEqual([20, 40, 60]);
    });

    it('rounds results to integers', () => {
      const result = scalePattern(10, 1.5);
      expect(Number.isInteger(result)).toBe(true);
    });

    it('scales array values and rounds them', () => {
      const result = scalePattern([10, 15], 1.5) as number[];
      for (const v of result) {
        expect(Number.isInteger(v)).toBe(true);
      }
    });

    it('scale of 1.0 returns identical values', () => {
      expect(scalePattern(20, 1)).toBe(20);
      expect(scalePattern([10, 20], 1)).toEqual([10, 20]);
    });

    it('scale of 0.5 halves values', () => {
      expect(scalePattern(20, 0.5)).toBe(10);
    });
  });

  describe('createCelebrationPattern', () => {
    it('returns an array', () => {
      expect(Array.isArray(createCelebrationPattern())).toBe(true);
    });

    it('has multiple elements (fanfare pattern)', () => {
      expect(createCelebrationPattern().length).toBeGreaterThan(3);
    });

    it('all elements are positive numbers', () => {
      const pattern = createCelebrationPattern();
      for (const v of pattern) {
        expect(v).toBeGreaterThan(0);
      }
    });

    it('returns consistent pattern on multiple calls', () => {
      expect(createCelebrationPattern()).toEqual(createCelebrationPattern());
    });

    it('ends with a large "TAAAP" value', () => {
      const pattern = createCelebrationPattern();
      const last = pattern[pattern.length - 1];
      expect(last).toBeGreaterThanOrEqual(50);
    });
  });
});
