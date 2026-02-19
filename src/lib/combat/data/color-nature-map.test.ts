// src/lib/combat/data/color-nature-map.test.ts
import { describe, it, expect } from 'vitest';
import { getNaturePointsForColor } from './color-nature-map';

describe('getNaturePointsForColor', () => {
  describe('achromatic colors', () => {
    it('white returns sp_def as primary with pts 2', () => {
      const result = getNaturePointsForColor('#ffffff');
      expect(result.primary).toBe('sp_def');
      expect(result.primaryPts).toBe(2);
    });

    it('near-white returns sp_def', () => {
      const result = getNaturePointsForColor('#f5f5f5');
      expect(result.primary).toBe('sp_def');
    });

    it('light gray (#c0c0c0) returns defense', () => {
      const result = getNaturePointsForColor('#c0c0c0');
      expect(result.primary).toBe('defense');
    });

    it('mid gray (#808080) returns defense', () => {
      const result = getNaturePointsForColor('#808080');
      expect(result.primary).toBe('defense');
    });

    it('dark gray (#494949) returns defense', () => {
      const result = getNaturePointsForColor('#494949');
      expect(result.primary).toBe('defense');
    });

    it('black returns attack as primary', () => {
      const result = getNaturePointsForColor('#000000');
      expect(result.primary).toBe('attack');
    });

    it('near-black returns attack', () => {
      const result = getNaturePointsForColor('#101010');
      expect(result.primary).toBe('attack');
    });

    it('white secondary is sp_atk', () => {
      const result = getNaturePointsForColor('#ffffff');
      expect(result.secondary).toBe('sp_atk');
      expect(result.secondaryPts).toBe(1);
    });
  });

  describe('warm neutral colors', () => {
    it('brown returns defense as primary', () => {
      const result = getNaturePointsForColor('#8B5E3C');
      expect(result.primary).toBe('defense');
      expect(result.secondary).toBe('attack');
    });

    it('gold returns sp_atk as primary', () => {
      const result = getNaturePointsForColor('#DAA520');
      expect(result.primary).toBe('sp_atk');
      expect(result.secondary).toBe('attack');
    });
  });

  describe('hue-based stat mapping', () => {
    it('dark red (#cc0000, not neon) returns attack', () => {
      // L=40, so not neon. h=0 -> attack, no secondary (h < 20 || h >= 340)
      const result = getNaturePointsForColor('#cc0000');
      expect(result.primary).toBe('attack');
    });

    it('pure red with no secondary (h < 20)', () => {
      const result = getNaturePointsForColor('#cc0000');
      expect(result.secondary).toBeUndefined();
    });

    it('medium green (#338833) returns sp_def', () => {
      // h~120, not neon
      const result = getNaturePointsForColor('#338833');
      expect(result.primary).toBe('sp_def');
    });

    it('teal (#007766) returns sp_def', () => {
      const result = getNaturePointsForColor('#007766');
      expect(result.primary).toBe('sp_def');
    });

    it('medium blue (#1155aa, h~213) returns sp_def', () => {
      // h=213 falls in 195-250 range -> sp_def
      const result = getNaturePointsForColor('#1155aa');
      expect(result.primary).toBe('sp_def');
    });

    it('medium purple (#882299, h~291) returns sp_atk', () => {
      // h~291 falls in 280-320 range -> sp_atk
      const result = getNaturePointsForColor('#882299');
      expect(result.primary).toBe('sp_atk');
    });

    it('dark pink (#dd00aa, h~314) returns sp_atk', () => {
      // h~314 falls in 280-320 range -> sp_atk
      const result = getNaturePointsForColor('#dd00aa');
      expect(result.primary).toBe('sp_atk');
    });

    it('orange-ish hue (#aadd00) returns speed', () => {
      const result = getNaturePointsForColor('#aadd00');
      expect(result.primary).toBe('speed');
    });
  });

  describe('neon override', () => {
    it('neon green (#00ff80, S=100, L=50) returns speed as primary', () => {
      const result = getNaturePointsForColor('#00ff80');
      expect(result.primary).toBe('speed');
      expect(result.primaryPts).toBe(2);
    });

    it('neon color secondary is the hue-based primary', () => {
      const result = getNaturePointsForColor('#00ff80');
      expect(result.secondary).toBeDefined();
      expect(result.secondaryPts).toBe(1);
    });

    it('pure red (#ff0000, S=100, L=50) is neon and returns speed', () => {
      // #ff0000 has L=50, S=100 -> isNeon=true -> primary=speed
      const result = getNaturePointsForColor('#ff0000');
      expect(result.primary).toBe('speed');
    });

    it('dark saturated red (#cc0000) is NOT neon (L<50)', () => {
      const result = getNaturePointsForColor('#cc0000');
      expect(result.primary).toBe('attack');
    });

    it('dark saturated color does NOT get neon override', () => {
      // #880000: L=26.7 -> not neon
      const result = getNaturePointsForColor('#880000');
      expect(result.primary).toBe('attack');
    });
  });

  describe('return shape', () => {
    it('always returns primary and primaryPts', () => {
      const colors = ['#cc0000', '#00cc00', '#0000cc', '#ffffff', '#000000', '#808080', '#DAA520'];
      for (const color of colors) {
        const result = getNaturePointsForColor(color);
        expect(result).toHaveProperty('primary');
        expect(result).toHaveProperty('primaryPts');
        expect(typeof result.primary).toBe('string');
        expect(result.primaryPts).toBe(2);
      }
    });

    it('primaryPts is always 2', () => {
      const colors = ['#cc0000', '#00ff80', '#ffffff', '#808080'];
      for (const color of colors) {
        const result = getNaturePointsForColor(color);
        expect(result.primaryPts).toBe(2);
      }
    });

    it('secondary is always sp_atk for near-white', () => {
      const result = getNaturePointsForColor('#ffffff');
      expect(result.secondary).toBe('sp_atk');
      expect(result.secondaryPts).toBe(1);
    });

    it('valid stat names are returned', () => {
      const validStats = ['attack', 'defense', 'sp_atk', 'sp_def', 'speed'];
      const testColors = ['#cc0000', '#338833', '#1155aa', '#ffffff', '#000000', '#808080'];
      for (const color of testColors) {
        const result = getNaturePointsForColor(color);
        expect(validStats).toContain(result.primary);
        if (result.secondary !== undefined) {
          expect(validStats).toContain(result.secondary);
        }
      }
    });

    it('secondaryPts is 1 when secondary is defined', () => {
      const result = getNaturePointsForColor('#338833');
      if (result.secondary !== undefined) {
        expect(result.secondaryPts).toBe(1);
      }
    });
  });
});
