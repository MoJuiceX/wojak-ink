// src/config/games.test.ts
import { describe, it, expect } from 'vitest';
import {
  MINI_GAMES,
  ACCESSIBILITY_ICONS,
  DIFFICULTY_COLORS,
  getGameById,
  getAvailableGames,
  getComingSoonGames,
  getRankColor,
  getRankEffects,
} from './games';

describe('games config', () => {
  describe('MINI_GAMES', () => {
    it('contains multiple games', () => {
      expect(MINI_GAMES.length).toBeGreaterThan(5);
    });

    it('each game has a unique id', () => {
      const ids = MINI_GAMES.map(g => g.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('each game has required fields', () => {
      for (const game of MINI_GAMES) {
        expect(game.id).toBeTruthy();
        expect(game.name).toBeTruthy();
        expect(game.route).toBeTruthy();
        expect(game.status).toBeTruthy();
      }
    });

    it('all games have status "available" or "coming-soon"', () => {
      for (const game of MINI_GAMES) {
        expect(['available', 'coming-soon']).toContain(game.status);
      }
    });

    it('contains memory-match game', () => {
      expect(MINI_GAMES.some(g => g.id === 'memory-match')).toBe(true);
    });

    it('contains merge-2048 game', () => {
      expect(MINI_GAMES.some(g => g.id === 'merge-2048')).toBe(true);
    });
  });

  describe('ACCESSIBILITY_ICONS', () => {
    it('has keyboardPlayable entry', () => {
      expect(ACCESSIBILITY_ICONS.keyboardPlayable).toBeDefined();
      expect(ACCESSIBILITY_ICONS.keyboardPlayable.icon).toBeTruthy();
      expect(ACCESSIBILITY_ICONS.keyboardPlayable.label).toBeTruthy();
    });

    it('has all 6 accessibility feature keys', () => {
      const expected = [
        'keyboardPlayable',
        'screenReaderSupport',
        'colorBlindMode',
        'reducedMotionSupport',
        'audioDescriptions',
        'pauseAnytime',
      ];
      for (const key of expected) {
        expect(ACCESSIBILITY_ICONS).toHaveProperty(key);
      }
    });
  });

  describe('DIFFICULTY_COLORS', () => {
    it('defines easy, medium, hard colors', () => {
      expect(DIFFICULTY_COLORS.easy).toBeTruthy();
      expect(DIFFICULTY_COLORS.medium).toBeTruthy();
      expect(DIFFICULTY_COLORS.hard).toBeTruthy();
    });

    it('all difficulty colors are valid hex strings', () => {
      for (const color of Object.values(DIFFICULTY_COLORS)) {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe('getGameById', () => {
    it('returns the correct game by id', () => {
      const game = getGameById('memory-match');
      expect(game).toBeDefined();
      expect(game?.id).toBe('memory-match');
    });

    it('returns undefined for unknown id', () => {
      expect(getGameById('nonexistent-game')).toBeUndefined();
    });

    it('returns merge-2048 game', () => {
      const game = getGameById('merge-2048');
      expect(game?.name).toBeTruthy();
    });
  });

  describe('getAvailableGames', () => {
    it('returns only games with status "available"', () => {
      const games = getAvailableGames();
      for (const g of games) {
        expect(g.status).toBe('available');
      }
    });

    it('returns at least one game', () => {
      expect(getAvailableGames().length).toBeGreaterThan(0);
    });
  });

  describe('getComingSoonGames', () => {
    it('returns only games with status "coming-soon"', () => {
      const games = getComingSoonGames();
      for (const g of games) {
        expect(g.status).toBe('coming-soon');
      }
    });

    it('returns an array (may be empty)', () => {
      expect(Array.isArray(getComingSoonGames())).toBe(true);
    });
  });

  describe('getRankColor', () => {
    it('returns a string color', () => {
      expect(typeof getRankColor(0, 10)).toBe('string');
    });

    it('returns green-ish color for first position', () => {
      // index 0 should be green (#22c55e)
      const color = getRankColor(0, 10);
      expect(color).toBe('#22c55e');
    });

    it('returns red-ish color for last position', () => {
      const color = getRankColor(9, 10);
      // Should be in the red range
      expect(color).toMatch(/^#/);
    });

    it('handles total of 1', () => {
      const color = getRankColor(0, 1);
      expect(color).toBe('#22c55e');
    });

    it('returns different colors for first and last positions', () => {
      const first = getRankColor(0, 10);
      const last = getRankColor(9, 10);
      expect(first).not.toBe(last);
    });
  });

  describe('getRankEffects', () => {
    it('returns valid effects object', () => {
      const effects = getRankEffects(0, 10);
      expect(effects).toHaveProperty('color');
      expect(effects).toHaveProperty('glowRadius');
      expect(effects).toHaveProperty('glowOpacity');
      expect(effects).toHaveProperty('hoverScale');
      expect(effects).toHaveProperty('borderWidth');
      expect(effects).toHaveProperty('backgroundTint');
      expect(effects).toHaveProperty('badge');
    });

    it('first position (index 0) gets gold badge', () => {
      const effects = getRankEffects(0, 10);
      expect(effects.badge).not.toBeNull();
      expect(effects.badge?.emoji).toBe('🥇');
    });

    it('second position gets silver badge', () => {
      const effects = getRankEffects(1, 10);
      expect(effects.badge?.emoji).toBe('🥈');
    });

    it('third position gets bronze badge', () => {
      const effects = getRankEffects(2, 10);
      expect(effects.badge?.emoji).toBe('🥉');
    });

    it('positions beyond 3rd have null badge', () => {
      const effects = getRankEffects(5, 10);
      expect(effects.badge).toBeNull();
    });

    it('first position has maximum glow radius', () => {
      const first = getRankEffects(0, 10);
      const last = getRankEffects(9, 10);
      expect(first.glowRadius).toBeGreaterThan(last.glowRadius);
    });

    it('hoverScale >= 1.0 for all positions', () => {
      for (let i = 0; i < 5; i++) {
        const effects = getRankEffects(i, 5);
        expect(effects.hoverScale).toBeGreaterThanOrEqual(1.0);
      }
    });

    it('handles total of 1', () => {
      const effects = getRankEffects(0, 1);
      expect(effects.badge?.emoji).toBe('🥇');
    });
  });
});
