import { describe, expect, it } from 'vitest';
import { getBootDestination, shouldSkipBootSequence } from './bootNavigation';

describe('bootNavigation', () => {
  describe('getBootDestination', () => {
    it('routes the root path to gallery after boot', () => {
      expect(getBootDestination('/')).toBe('/gallery');
    });

    it('preserves deep-link routes after boot', () => {
      expect(getBootDestination('/games')).toBe('/games');
    });

    it('preserves query strings and hashes for deep links', () => {
      expect(getBootDestination('/gallery', '?type=wojak', '#edition-42')).toBe(
        '/gallery?type=wojak#edition-42'
      );
    });
  });

  describe('shouldSkipBootSequence', () => {
    it('skips boot for public routes', () => {
      expect(shouldSkipBootSequence({
        isDev: false,
        skipBootInDev: true,
        isLocalhost: false,
        hasSeenBoot: false,
        isPublicRoute: true,
        hasSkipBootSetting: false,
      })).toBe(true);
    });

    it('does not skip boot for a first production visit to a private route', () => {
      expect(shouldSkipBootSequence({
        isDev: false,
        skipBootInDev: true,
        isLocalhost: false,
        hasSeenBoot: false,
        isPublicRoute: false,
        hasSkipBootSetting: false,
      })).toBe(false);
    });
  });
});

