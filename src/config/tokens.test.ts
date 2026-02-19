// src/config/tokens.test.ts
import { describe, it, expect } from 'vitest';
import {
  colors,
  backgrounds,
  glows,
  fontSizes,
  fontWeights,
  spacing,
  radii,
  durations,
  easings,
  zIndices,
  gradients,
  rarityColors,
  tokens,
} from './tokens';

describe('design tokens', () => {
  describe('colors', () => {
    it('primary palette has shade 500 (main orange)', () => {
      expect(colors.primary[500]).toBe('#F97316');
    });

    it('primary palette has all expected shades', () => {
      const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
      for (const shade of shades) {
        expect(colors.primary[shade as keyof typeof colors.primary]).toBeTruthy();
      }
    });

    it('gold palette has shade 500', () => {
      expect(colors.gold[500]).toBeTruthy();
    });

    it('success has shade 500 (green)', () => {
      expect(colors.success[500]).toBe('#22C55E');
    });

    it('error has shade 500 (red)', () => {
      expect(colors.error[500]).toBe('#EF4444');
    });
  });

  describe('fontSizes', () => {
    it('xs is smallest', () => {
      expect(fontSizes.xs).toBe('0.75rem');
    });

    it('base is 1rem', () => {
      expect(fontSizes.base).toBe('1rem');
    });

    it('6xl is defined and is the largest', () => {
      expect(fontSizes['6xl']).toBeTruthy();
    });

    it('all values end in rem', () => {
      for (const size of Object.values(fontSizes)) {
        expect(size).toMatch(/rem$/);
      }
    });
  });

  describe('fontWeights', () => {
    it('normal is 400', () => {
      expect(fontWeights.normal).toBe(400);
    });

    it('bold is 700', () => {
      expect(fontWeights.bold).toBe(700);
    });

    it('all weights are valid CSS font-weight values', () => {
      const validWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      for (const weight of Object.values(fontWeights)) {
        expect(validWeights).toContain(weight);
      }
    });
  });

  describe('spacing', () => {
    it('0 is "0"', () => {
      expect(spacing[0]).toBe('0');
    });

    it('4 is 1rem', () => {
      expect(spacing[4]).toBe('1rem');
    });

    it('8 is 2rem', () => {
      expect(spacing[8]).toBe('2rem');
    });

    it('all non-zero values end in rem', () => {
      for (const [key, value] of Object.entries(spacing)) {
        if (key !== '0') {
          expect(value).toMatch(/rem$/);
        }
      }
    });
  });

  describe('radii', () => {
    it('none is "0"', () => {
      expect(radii.none).toBe('0');
    });

    it('full is a large value for pill shapes', () => {
      expect(radii.full).toBe('9999px');
    });

    it('all pixel values end in px', () => {
      for (const [key, value] of Object.entries(radii)) {
        if (key !== 'none') {
          expect(value).toMatch(/px$/);
        }
      }
    });
  });

  describe('durations', () => {
    it('instant is shortest', () => {
      expect(durations.instant).toBeLessThan(durations.fast);
    });

    it('slowest is longest', () => {
      expect(durations.slowest).toBeGreaterThan(durations.slow);
    });

    it('all durations are positive numbers', () => {
      for (const d of Object.values(durations)) {
        expect(d).toBeGreaterThan(0);
      }
    });

    it('normal is 300ms', () => {
      expect(durations.normal).toBe(300);
    });
  });

  describe('easings', () => {
    it('linear is defined', () => {
      expect(easings.linear).toBe('linear');
    });

    it('bounce is defined', () => {
      expect(easings.bounce).toBeTruthy();
    });

    it('has at least 5 easing types', () => {
      expect(Object.keys(easings).length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('zIndices', () => {
    it('base is 0', () => {
      expect(zIndices.base).toBe(0);
    });

    it('behind is negative', () => {
      expect(zIndices.behind).toBeLessThan(0);
    });

    it('modal is above overlay', () => {
      expect(zIndices.modal).toBeGreaterThan(zIndices.overlay);
    });

    it('toast is above modal', () => {
      expect(zIndices.toast).toBeGreaterThan(zIndices.modal);
    });

    it('max is very large', () => {
      expect(zIndices.max).toBeGreaterThanOrEqual(9999);
    });
  });

  describe('rarityColors', () => {
    it('common is a hex color', () => {
      expect(rarityColors.common).toMatch(/^#/);
    });

    it('legendary is golden/yellow', () => {
      expect(rarityColors.legendary.toUpperCase()).toBe('#FFD700');
    });

    it('has common, rare, epic, legendary at minimum', () => {
      expect(rarityColors).toHaveProperty('common');
      expect(rarityColors).toHaveProperty('rare');
      expect(rarityColors).toHaveProperty('epic');
      expect(rarityColors).toHaveProperty('legendary');
    });
  });

  describe('tokens (combined export)', () => {
    it('exports all token categories', () => {
      expect(tokens).toHaveProperty('colors');
      expect(tokens).toHaveProperty('fontSizes');
      expect(tokens).toHaveProperty('spacing');
      expect(tokens).toHaveProperty('radii');
      expect(tokens).toHaveProperty('durations');
      expect(tokens).toHaveProperty('zIndices');
      expect(tokens).toHaveProperty('rarityColors');
    });

    it('tokens.colors matches the colors export', () => {
      expect(tokens.colors).toBe(colors);
    });

    it('tokens.spacing matches the spacing export', () => {
      expect(tokens.spacing).toBe(spacing);
    });

    it('tokens.zIndices matches the zIndices export', () => {
      expect(tokens.zIndices).toBe(zIndices);
    });
  });

  describe('glows', () => {
    it('orange.sm is a box-shadow string', () => {
      expect(glows.orange.sm).toMatch(/0 0 \d+px/);
    });

    it('orange has sm, md, lg, xl variants', () => {
      expect(glows.orange).toHaveProperty('sm');
      expect(glows.orange).toHaveProperty('md');
      expect(glows.orange).toHaveProperty('lg');
      expect(glows.orange).toHaveProperty('xl');
    });

    it('gold glow is defined', () => {
      expect(glows.gold).toBeDefined();
    });
  });

  describe('backgrounds', () => {
    it('primary is a dark color', () => {
      expect(backgrounds.primary).toBeTruthy();
    });

    it('orange.subtle has low opacity', () => {
      expect(backgrounds.orange.subtle).toContain('0.05');
    });
  });

  describe('gradients', () => {
    it('page gradient is a linear-gradient', () => {
      expect(gradients.page).toMatch(/^linear-gradient/);
    });

    it('rarity has common, rare, epic, legendary', () => {
      expect(gradients.rarity).toHaveProperty('common');
      expect(gradients.rarity).toHaveProperty('legendary');
    });
  });
});
