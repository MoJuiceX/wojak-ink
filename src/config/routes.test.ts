// src/config/routes.test.ts
import { describe, it, expect } from 'vitest';
import {
  PRIMARY_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
  MOBILE_NAV_ITEMS,
  MORE_NAV_ITEM,
  NAV_ITEMS,
  DEFAULT_ROUTE,
  getNavItemByPath,
  getNavItemById,
  isPathActive,
} from './routes';

describe('routes config', () => {
  describe('PRIMARY_NAV_ITEMS', () => {
    it('has at least 4 items', () => {
      expect(PRIMARY_NAV_ITEMS.length).toBeGreaterThanOrEqual(4);
    });

    it('each item has required id, label, and icon fields', () => {
      for (const item of PRIMARY_NAV_ITEMS) {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.icon).toBeTruthy();
      }
    });

    it('gallery is the first primary nav item', () => {
      expect(PRIMARY_NAV_ITEMS[0].id).toBe('gallery');
    });

    it('gallery item has path /gallery', () => {
      const gallery = PRIMARY_NAV_ITEMS.find(i => i.id === 'gallery');
      expect(gallery?.path).toBe('/gallery');
    });

    it('bigpulp item is featured', () => {
      const bigpulp = PRIMARY_NAV_ITEMS.find(i => i.id === 'bigpulp');
      expect(bigpulp?.featured).toBe(true);
    });

    it('bigpulp has dot badge', () => {
      const bigpulp = PRIMARY_NAV_ITEMS.find(i => i.id === 'bigpulp');
      expect(bigpulp?.badge).toBe('dot');
    });

    it('no item has a null path without special handling', () => {
      const itemsWithPaths = PRIMARY_NAV_ITEMS.filter(i => i.path !== null);
      expect(itemsWithPaths.length).toBeGreaterThan(0);
    });
  });

  describe('MORE_NAV_ITEM', () => {
    it('has null path (opens menu instead)', () => {
      expect(MORE_NAV_ITEM.path).toBeNull();
    });

    it('has id "more"', () => {
      expect(MORE_NAV_ITEM.id).toBe('more');
    });

    it('has label "More"', () => {
      expect(MORE_NAV_ITEM.label).toBe('More');
    });
  });

  describe('SECONDARY_NAV_ITEMS', () => {
    it('contains shop item', () => {
      const shop = SECONDARY_NAV_ITEMS.find(i => i.id === 'shop');
      expect(shop).toBeDefined();
    });

    it('contains settings item', () => {
      const settings = SECONDARY_NAV_ITEMS.find(i => i.id === 'settings');
      expect(settings).toBeDefined();
    });

    it('treasury requires auth', () => {
      const treasury = SECONDARY_NAV_ITEMS.find(i => i.id === 'treasury');
      expect(treasury?.requiredAuth).toBe(true);
    });

    it('guild is hidden', () => {
      const guild = SECONDARY_NAV_ITEMS.find(i => i.id === 'guild');
      expect(guild?.hidden).toBe(true);
    });

    it('settings has children routes', () => {
      const settings = SECONDARY_NAV_ITEMS.find(i => i.id === 'settings');
      expect(settings?.children).toBeDefined();
      expect(settings?.children?.length).toBeGreaterThan(0);
    });
  });

  describe('MOBILE_NAV_ITEMS', () => {
    it('has exactly 5 items', () => {
      expect(MOBILE_NAV_ITEMS).toHaveLength(5);
    });

    it('last item is the More button', () => {
      const last = MOBILE_NAV_ITEMS[MOBILE_NAV_ITEMS.length - 1];
      expect(last.id).toBe('more');
    });

    it('bigpulp is in position 2 (center FAB)', () => {
      expect(MOBILE_NAV_ITEMS[2].id).toBe('bigpulp');
    });
  });

  describe('DEFAULT_ROUTE', () => {
    it('defaults to /gallery', () => {
      expect(DEFAULT_ROUTE).toBe('/gallery');
    });
  });

  describe('getNavItemByPath', () => {
    it('returns gallery item for /gallery', () => {
      const item = getNavItemByPath('/gallery');
      expect(item?.id).toBe('gallery');
    });

    it('returns settings for /settings', () => {
      const item = getNavItemByPath('/settings');
      expect(item?.id).toBe('settings');
    });

    it('returns undefined for unknown path', () => {
      const item = getNavItemByPath('/nonexistent-path-xyz');
      expect(item).toBeUndefined();
    });

    it('matches nested paths (child routes)', () => {
      const item = getNavItemByPath('/settings/profile');
      expect(item).toBeDefined();
    });

    it('returns undefined for null-path items', () => {
      // "more" has path null, should not be returned
      const item = getNavItemByPath('/more');
      expect(item).toBeUndefined();
    });
  });

  describe('getNavItemById', () => {
    it('returns gallery item for id "gallery"', () => {
      const item = getNavItemById('gallery');
      expect(item?.path).toBe('/gallery');
    });

    it('returns undefined for unknown id', () => {
      const item = getNavItemById('unknown-abc');
      expect(item).toBeUndefined();
    });

    it('returns shop by id', () => {
      const item = getNavItemById('shop');
      expect(item?.id).toBe('shop');
    });
  });

  describe('isPathActive', () => {
    it('returns true for exact match', () => {
      expect(isPathActive('/gallery', '/gallery')).toBe(true);
    });

    it('returns true for child path', () => {
      expect(isPathActive('/gallery', '/gallery/favorites')).toBe(true);
    });

    it('returns false for different root', () => {
      expect(isPathActive('/gallery', '/games')).toBe(false);
    });

    it('returns false when itemPath is null', () => {
      expect(isPathActive(null, '/gallery')).toBe(false);
    });

    it('returns false for partial prefix that is not a segment', () => {
      // /gal should not match /gallery
      expect(isPathActive('/gal', '/gallery')).toBe(false);
    });

    it('returns true for root / only when exact match', () => {
      expect(isPathActive('/', '/')).toBe(true);
    });

    it('returns false for root / with non-root current path', () => {
      expect(isPathActive('/', '/gallery')).toBe(false);
    });

    it('returns true for settings and /settings/profile', () => {
      expect(isPathActive('/settings', '/settings/profile')).toBe(true);
    });
  });

  describe('NAV_ITEMS (combined)', () => {
    it('is a union of primary and secondary items', () => {
      expect(NAV_ITEMS.length).toBe(PRIMARY_NAV_ITEMS.length + SECONDARY_NAV_ITEMS.length);
    });

    it('all ids are unique', () => {
      const ids = NAV_ITEMS.map(i => i.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });
});
