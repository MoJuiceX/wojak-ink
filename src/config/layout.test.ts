// src/config/layout.test.ts
import { describe, it, expect } from 'vitest';
import { LAYOUT, mediaQueries } from './layout';

describe('layout config', () => {
  describe('LAYOUT.breakpoints', () => {
    it('sm is 640', () => {
      expect(LAYOUT.breakpoints.sm).toBe(640);
    });

    it('md is 768', () => {
      expect(LAYOUT.breakpoints.md).toBe(768);
    });

    it('lg is 1024', () => {
      expect(LAYOUT.breakpoints.lg).toBe(1024);
    });

    it('xl is 1280', () => {
      expect(LAYOUT.breakpoints.xl).toBe(1280);
    });

    it('2xl is 1536', () => {
      expect(LAYOUT.breakpoints['2xl']).toBe(1536);
    });

    it('breakpoints are in ascending order', () => {
      const { sm, md, lg, xl } = LAYOUT.breakpoints;
      expect(md).toBeGreaterThan(sm);
      expect(lg).toBeGreaterThan(md);
      expect(xl).toBeGreaterThan(lg);
    });
  });

  describe('LAYOUT.mobileNav', () => {
    it('has positive height', () => {
      expect(LAYOUT.mobileNav.height).toBeGreaterThan(0);
    });

    it('heightWithLabel is >= height', () => {
      expect(LAYOUT.mobileNav.heightWithLabel).toBeGreaterThanOrEqual(LAYOUT.mobileNav.height);
    });

    it('includes safe area inset for iPhone', () => {
      expect(LAYOUT.mobileNav.safeAreaBottom).toContain('safe-area-inset-bottom');
    });

    it('iconSize is 24', () => {
      expect(LAYOUT.mobileNav.iconSize).toBe(24);
    });
  });

  describe('LAYOUT.sidebar', () => {
    it('widthExpanded > widthCollapsed', () => {
      expect(LAYOUT.sidebar.widthExpanded).toBeGreaterThan(LAYOUT.sidebar.widthCollapsed);
    });

    it('widthCollapsed is compact (< 100px)', () => {
      expect(LAYOUT.sidebar.widthCollapsed).toBeLessThan(100);
    });

    it('transitionDuration is positive', () => {
      expect(LAYOUT.sidebar.transitionDuration).toBeGreaterThan(0);
    });

    it('itemHeight is reasonable for touch targets', () => {
      expect(LAYOUT.sidebar.itemHeight).toBeGreaterThanOrEqual(44);
    });
  });

  describe('LAYOUT.header', () => {
    it('height is defined and positive', () => {
      expect(LAYOUT.header.height).toBeGreaterThan(0);
    });

    it('mobile height is <= desktop height', () => {
      expect(LAYOUT.header.heightMobile).toBeLessThanOrEqual(LAYOUT.header.height);
    });
  });

  describe('LAYOUT.content', () => {
    it('maxWidth is defined and large', () => {
      expect(LAYOUT.content.maxWidth).toBeGreaterThan(1000);
    });

    it('paddingDesktop > paddingMobile', () => {
      expect(LAYOUT.content.paddingDesktop).toBeGreaterThan(LAYOUT.content.paddingMobile);
    });
  });

  describe('LAYOUT.zIndex', () => {
    it('header is above content', () => {
      expect(LAYOUT.zIndex.header).toBeGreaterThan(LAYOUT.zIndex.content);
    });

    it('modal is above header and sidebar', () => {
      expect(LAYOUT.zIndex.modal).toBeGreaterThan(LAYOUT.zIndex.header);
      expect(LAYOUT.zIndex.modal).toBeGreaterThan(LAYOUT.zIndex.sidebar);
    });

    it('toast is above modal', () => {
      expect(LAYOUT.zIndex.toast).toBeGreaterThan(LAYOUT.zIndex.modal);
    });

    it('tooltip is highest UI layer', () => {
      expect(LAYOUT.zIndex.tooltip).toBeGreaterThanOrEqual(LAYOUT.zIndex.toast);
    });
  });

  describe('mediaQueries', () => {
    it('sm query uses min-width 640px', () => {
      expect(mediaQueries.sm).toContain('640px');
    });

    it('md query uses min-width 768px', () => {
      expect(mediaQueries.md).toContain('768px');
    });

    it('mobile query uses max-width', () => {
      expect(mediaQueries.mobile).toContain('max-width');
    });

    it('desktop query uses min-width', () => {
      expect(mediaQueries.desktop).toContain('min-width');
    });

    it('reducedMotion query is defined', () => {
      expect(mediaQueries.reducedMotion).toContain('prefers-reduced-motion');
    });

    it('all min-width queries start with (min-width:', () => {
      const keys = ['sm', 'md', 'lg', 'xl', '2xl', 'desktop'] as const;
      for (const key of keys) {
        expect(mediaQueries[key]).toMatch(/^\(min-width:/);
      }
    });

    it('mobile breakpoint is one below md', () => {
      const expected = String(LAYOUT.breakpoints.md - 1) + 'px';
      expect(mediaQueries.mobile).toContain(expected);
    });
  });
});
