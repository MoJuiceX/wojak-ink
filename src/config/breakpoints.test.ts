// src/config/breakpoints.test.ts
import { describe, it, expect } from 'vitest';
import {
  BREAKPOINTS,
  MEDIA_QUERIES,
  POINTER_QUERIES,
  ORIENTATION_QUERIES,
  DESKTOP_BREAKPOINTS,
  getDesktopBreakpoint,
} from './breakpoints';

describe('breakpoints config', () => {
  describe('BREAKPOINTS', () => {
    it('sm is 640', () => {
      expect(BREAKPOINTS.sm).toBe(640);
    });

    it('md is 768', () => {
      expect(BREAKPOINTS.md).toBe(768);
    });

    it('lg is 1024', () => {
      expect(BREAKPOINTS.lg).toBe(1024);
    });

    it('xl is 1280', () => {
      expect(BREAKPOINTS.xl).toBe(1280);
    });

    it('2xl is 1536', () => {
      expect(BREAKPOINTS['2xl']).toBe(1536);
    });

    it('breakpoints are in ascending order', () => {
      const values = [BREAKPOINTS.sm, BREAKPOINTS.md, BREAKPOINTS.lg, BREAKPOINTS.xl, BREAKPOINTS['2xl']];
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });

    it('has exactly 5 breakpoints', () => {
      expect(Object.keys(BREAKPOINTS)).toHaveLength(5);
    });
  });

  describe('MEDIA_QUERIES', () => {
    it('sm query uses min-width: 640px', () => {
      expect(MEDIA_QUERIES.sm).toBe('(min-width: 640px)');
    });

    it('md query uses min-width: 768px', () => {
      expect(MEDIA_QUERIES.md).toBe('(min-width: 768px)');
    });

    it('lg query uses min-width: 1024px', () => {
      expect(MEDIA_QUERIES.lg).toBe('(min-width: 1024px)');
    });

    it('all queries start with (min-width:', () => {
      for (const query of Object.values(MEDIA_QUERIES)) {
        expect(query).toMatch(/^\(min-width:/);
      }
    });

    it('has exactly 5 media queries', () => {
      expect(Object.keys(MEDIA_QUERIES)).toHaveLength(5);
    });
  });

  describe('POINTER_QUERIES', () => {
    it('touch query uses pointer: coarse', () => {
      expect(POINTER_QUERIES.touch).toBe('(pointer: coarse)');
    });

    it('mouse query uses pointer: fine', () => {
      expect(POINTER_QUERIES.mouse).toBe('(pointer: fine)');
    });

    it('has touch, mouse, and any keys', () => {
      expect(POINTER_QUERIES).toHaveProperty('touch');
      expect(POINTER_QUERIES).toHaveProperty('mouse');
      expect(POINTER_QUERIES).toHaveProperty('any');
    });
  });

  describe('ORIENTATION_QUERIES', () => {
    it('portrait query is defined', () => {
      expect(ORIENTATION_QUERIES.portrait).toBe('(orientation: portrait)');
    });

    it('landscape query is defined', () => {
      expect(ORIENTATION_QUERIES.landscape).toBe('(orientation: landscape)');
    });

    it('mobileLandscape includes max-height constraint', () => {
      expect(ORIENTATION_QUERIES.mobileLandscape).toContain('max-height');
    });
  });

  describe('DESKTOP_BREAKPOINTS', () => {
    it('desktop starts at 1024px', () => {
      expect(DESKTOP_BREAKPOINTS.desktop.minWidth).toBe(1024);
    });

    it('desktopLarge starts at 1280px', () => {
      expect(DESKTOP_BREAKPOINTS.desktopLarge.minWidth).toBe(1280);
    });

    it('desktopXL starts at 1536px', () => {
      expect(DESKTOP_BREAKPOINTS.desktopXL.minWidth).toBe(1536);
    });

    it('desktopUltra starts at 1920px', () => {
      expect(DESKTOP_BREAKPOINTS.desktopUltra.minWidth).toBe(1920);
    });

    it('each breakpoint has columns defined', () => {
      for (const config of Object.values(DESKTOP_BREAKPOINTS)) {
        expect(config.columns).toBeGreaterThan(0);
      }
    });

    it('columns increase with screen size', () => {
      expect(DESKTOP_BREAKPOINTS.desktopLarge.columns).toBeGreaterThan(DESKTOP_BREAKPOINTS.desktop.columns);
      expect(DESKTOP_BREAKPOINTS.desktopXL.columns).toBeGreaterThan(DESKTOP_BREAKPOINTS.desktopLarge.columns);
      expect(DESKTOP_BREAKPOINTS.desktopUltra.columns).toBeGreaterThan(DESKTOP_BREAKPOINTS.desktopXL.columns);
    });

    it('cardMaxWidth increases with screen size', () => {
      expect(DESKTOP_BREAKPOINTS.desktopLarge.cardMaxWidth).toBeGreaterThanOrEqual(DESKTOP_BREAKPOINTS.desktop.cardMaxWidth);
      expect(DESKTOP_BREAKPOINTS.desktopUltra.cardMaxWidth).toBeGreaterThanOrEqual(DESKTOP_BREAKPOINTS.desktopXL.cardMaxWidth);
    });
  });

  describe('getDesktopBreakpoint', () => {
    it('returns null for mobile widths (< 1024)', () => {
      expect(getDesktopBreakpoint(320)).toBeNull();
      expect(getDesktopBreakpoint(768)).toBeNull();
      expect(getDesktopBreakpoint(1023)).toBeNull();
    });

    it('returns "desktop" for 1024px', () => {
      expect(getDesktopBreakpoint(1024)).toBe('desktop');
    });

    it('returns "desktop" for widths 1024-1279', () => {
      expect(getDesktopBreakpoint(1100)).toBe('desktop');
      expect(getDesktopBreakpoint(1279)).toBe('desktop');
    });

    it('returns "desktopLarge" for 1280px', () => {
      expect(getDesktopBreakpoint(1280)).toBe('desktopLarge');
    });

    it('returns "desktopXL" for 1536px', () => {
      expect(getDesktopBreakpoint(1536)).toBe('desktopXL');
    });

    it('returns "desktopUltra" for 1920px and above', () => {
      expect(getDesktopBreakpoint(1920)).toBe('desktopUltra');
      expect(getDesktopBreakpoint(2560)).toBe('desktopUltra');
    });

    it('returns "desktopXL" for widths 1536-1919', () => {
      expect(getDesktopBreakpoint(1700)).toBe('desktopXL');
    });
  });
});
