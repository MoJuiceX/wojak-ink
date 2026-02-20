// src/lib/combat/data/color-type-map.test.ts
import { describe, it, expect } from 'vitest';
import { hexToHSL, getTypePointsForColor } from './color-type-map';

describe('hexToHSL', () => {
  it('converts pure red to h=0, s=100, l=50', () => {
    const { h, s, l } = hexToHSL('#ff0000');
    expect(h).toBeCloseTo(0, 0);
    expect(s).toBeCloseTo(100, 0);
    expect(l).toBeCloseTo(50, 0);
  });

  it('converts pure green to h=120', () => {
    const { h } = hexToHSL('#00ff00');
    expect(h).toBeCloseTo(120, 0);
  });

  it('converts pure blue to h=240', () => {
    const { h } = hexToHSL('#0000ff');
    expect(h).toBeCloseTo(240, 0);
  });

  it('converts black to l=0', () => {
    const { l, s } = hexToHSL('#000000');
    expect(l).toBeCloseTo(0, 0);
    expect(s).toBe(0);
  });

  it('converts white to l=100', () => {
    const { l, s } = hexToHSL('#ffffff');
    expect(l).toBeCloseTo(100, 0);
    expect(s).toBe(0);
  });

  it('converts gray to s=0', () => {
    const { s } = hexToHSL('#808080');
    expect(s).toBeCloseTo(0, 0);
  });

  it('handles hex without # prefix', () => {
    const { h, s, l } = hexToHSL('ff0000');
    expect(h).toBeCloseTo(0, 0);
    expect(s).toBeCloseTo(100, 0);
    expect(l).toBeCloseTo(50, 0);
  });

  it('converts yellow (#ffff00) to h around 60', () => {
    const { h } = hexToHSL('#ffff00');
    expect(h).toBeCloseTo(60, 0);
  });

  it('converts cyan (#00ffff) to h around 180', () => {
    const { h } = hexToHSL('#00ffff');
    expect(h).toBeCloseTo(180, 0);
  });

  it('converts magenta (#ff00ff) to h around 300', () => {
    const { h } = hexToHSL('#ff00ff');
    expect(h).toBeCloseTo(300, 0);
  });

  it('returns values in expected ranges', () => {
    const colors = ['#ff6b00', '#1a237e', '#4caf50', '#9c27b0'];
    for (const color of colors) {
      const { h, s, l } = hexToHSL(color);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(360);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
      expect(l).toBeGreaterThanOrEqual(0);
      expect(l).toBeLessThanOrEqual(100);
    }
  });

  it('returns h=0 and s=0 for achromatic colors', () => {
    const { h, s } = hexToHSL('#808080');
    expect(h).toBe(0);
    expect(s).toBeCloseTo(0, 0);
  });
});

describe('getTypePointsForColor', () => {
  describe('achromatic colors', () => {
    it('white (#ffffff) returns ICE as primary', () => {
      const result = getTypePointsForColor('#ffffff');
      expect(result.primary).toBe('ICE');
      expect(result.primaryPts).toBe(3);
    });

    it('near-white (#f0f0f0) returns ICE as primary', () => {
      const result = getTypePointsForColor('#f0f0f0');
      expect(result.primary).toBe('ICE');
    });

    it('light gray (#c0c0c0) returns AIR as primary', () => {
      const result = getTypePointsForColor('#c0c0c0');
      expect(result.primary).toBe('AIR');
    });

    it('mid gray (#808080) returns NEUTRAL as primary', () => {
      const result = getTypePointsForColor('#808080');
      expect(result.primary).toBe('NEUTRAL');
    });

    it('black (#000000) returns SHADOW as primary', () => {
      const result = getTypePointsForColor('#000000');
      expect(result.primary).toBe('SHADOW');
    });

    it('dark gray (#1a1a1a) returns SHADOW as primary', () => {
      const result = getTypePointsForColor('#1a1a1a');
      expect(result.primary).toBe('SHADOW');
    });

    it('white returns ICE with AIR secondary', () => {
      const result = getTypePointsForColor('#ffffff');
      expect(result.secondary).toBe('AIR');
      expect(result.secondaryPts).toBe(1);
    });
  });

  describe('warm neutral colors', () => {
    it('brown returns EARTH as primary', () => {
      // Brown: S 10-50%, H 15-45, L 20-50%
      const result = getTypePointsForColor('#8B5E3C');
      expect(result.primary).toBe('EARTH');
    });

    it('gold returns DRAGON as primary', () => {
      // Gold: S > 50%, H 40-55, L 45-65%
      const result = getTypePointsForColor('#DAA520');
      expect(result.primary).toBe('DRAGON');
    });
  });

  describe('hue-based types', () => {
    it('dark red (#cc0000, not neon) returns FIRE', () => {
      // L=40 so not neon
      const result = getTypePointsForColor('#cc0000');
      expect(result.primary).toBe('FIRE');
    });

    it('FIRE type has SHADOW as secondary', () => {
      const result = getTypePointsForColor('#cc0000');
      expect(result.secondary).toBe('SHADOW');
    });

    it('medium green returns GRASS', () => {
      // #338833: h~120, S~44%, L~36% - not neon
      const result = getTypePointsForColor('#338833');
      expect(result.primary).toBe('GRASS');
    });

    it('medium blue (#1155aa) returns WATER', () => {
      // h~213, s~82, l~37 - not neon
      const result = getTypePointsForColor('#1155aa');
      expect(result.primary).toBe('WATER');
    });

    it('indigo-blue (#3300cc, h~255) returns PSYCHE', () => {
      // h=255, s=100, l=40 - not neon (L<50)
      const result = getTypePointsForColor('#3300cc');
      expect(result.primary).toBe('PSYCHE');
    });

    it('dark pink-magenta (#dd00aa, h~314) returns VENOM', () => {
      // h~313, s=100, l~43 - not neon (L < 50)
      const result = getTypePointsForColor('#dd00aa');
      expect(result.primary).toBe('VENOM');
    });

    it('orange-red (#cc4400, h=20) returns DRAGON', () => {
      // h=20 falls in 20-45 range -> DRAGON
      const result = getTypePointsForColor('#cc4400');
      expect(result.primary).toBe('DRAGON');
    });
  });

  describe('neon bonus', () => {
    it('neon color (S>90, L>=50) gets primaryPts of 4', () => {
      // Bright neon green: h~150, S~100, L~50
      const result = getTypePointsForColor('#00ff80');
      expect(result.primaryPts).toBe(4);
    });

    it('dark saturated color does not get neon bonus', () => {
      // Dark saturated red - not neon (L < 50)
      const result = getTypePointsForColor('#cc0000');
      expect(result.primaryPts).toBe(3);
    });

    it('neon green has WATER as primary (neon pushes hue result)', () => {
      // #00ff80: h~150 -> WATER hue, S=100, L=50 -> neon adds +1 to pts
      const result = getTypePointsForColor('#00ff80');
      expect(result.primary).toBe('WATER');
      expect(result.primaryPts).toBe(4);
    });
  });

  describe('return shape', () => {
    it('always returns an object with primary and primaryPts', () => {
      const colors = ['#cc0000', '#00cc00', '#0000cc', '#ffffff', '#000000', '#808080'];
      for (const color of colors) {
        const result = getTypePointsForColor(color);
        expect(result).toHaveProperty('primary');
        expect(result).toHaveProperty('primaryPts');
        expect(typeof result.primary).toBe('string');
        expect(typeof result.primaryPts).toBe('number');
      }
    });

    it('secondary and secondaryPts are present for hue-based colors', () => {
      const result = getTypePointsForColor('#cc0000');
      expect(result.secondary).toBeDefined();
      expect(result.secondaryPts).toBeDefined();
    });

    it('primaryPts is always at least 3', () => {
      const colors = ['#cc0000', '#00cc00', '#0000cc', '#888888', '#ffffff'];
      for (const color of colors) {
        const result = getTypePointsForColor(color);
        expect(result.primaryPts).toBeGreaterThanOrEqual(3);
      }
    });

    it('secondaryPts is always 1 when secondary is defined', () => {
      const result = getTypePointsForColor('#cc0000');
      if (result.secondary !== undefined) {
        expect(result.secondaryPts).toBe(1);
      }
    });
  });
});
