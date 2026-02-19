// src/config/scoring.test.ts
import { describe, it, expect } from 'vitest';
import {
  MINIMUM_ACTIONS,
  LEADERBOARD_THRESHOLD_MESSAGE,
  getMinimumActions,
} from './scoring';

describe('scoring config', () => {
  describe('MINIMUM_ACTIONS', () => {
    it('memory-match requires 3 actions', () => {
      expect(MINIMUM_ACTIONS['memory-match']).toBe(3);
    });

    it('flappy-orange requires 3 actions', () => {
      expect(MINIMUM_ACTIONS['flappy-orange']).toBe(3);
    });

    it('wojak-runner requires 3 actions', () => {
      expect(MINIMUM_ACTIONS['wojak-runner']).toBe(3);
    });

    it('color-reaction requires 3 actions', () => {
      expect(MINIMUM_ACTIONS['color-reaction']).toBe(3);
    });

    it('merge-2048 requires 3 actions', () => {
      expect(MINIMUM_ACTIONS['merge-2048']).toBe(3);
    });

    it('block-puzzle requires 3 actions', () => {
      expect(MINIMUM_ACTIONS['block-puzzle']).toBe(3);
    });

    it('orange-stack requires 3 actions', () => {
      expect(MINIMUM_ACTIONS['orange-stack']).toBe(3);
    });

    it('has exactly 7 game entries', () => {
      expect(Object.keys(MINIMUM_ACTIONS)).toHaveLength(7);
    });

    it('all values are positive numbers', () => {
      Object.values(MINIMUM_ACTIONS).forEach(v => {
        expect(v).toBeGreaterThan(0);
      });
    });
  });

  describe('LEADERBOARD_THRESHOLD_MESSAGE', () => {
    it('is a non-empty string', () => {
      expect(typeof LEADERBOARD_THRESHOLD_MESSAGE).toBe('string');
      expect(LEADERBOARD_THRESHOLD_MESSAGE.length).toBeGreaterThan(0);
    });

    it('contains leaderboard-related text', () => {
      expect(LEADERBOARD_THRESHOLD_MESSAGE.toLowerCase()).toContain('leaderboard');
    });
  });

  describe('getMinimumActions', () => {
    it('returns 3 for memory-match', () => {
      expect(getMinimumActions('memory-match')).toBe(3);
    });

    it('returns 3 for flappy-orange', () => {
      expect(getMinimumActions('flappy-orange')).toBe(3);
    });

    it('returns 3 for wojak-runner', () => {
      expect(getMinimumActions('wojak-runner')).toBe(3);
    });

    it('returns 3 for color-reaction', () => {
      expect(getMinimumActions('color-reaction')).toBe(3);
    });

    it('returns 3 for merge-2048', () => {
      expect(getMinimumActions('merge-2048')).toBe(3);
    });

    it('returns 3 for block-puzzle', () => {
      expect(getMinimumActions('block-puzzle')).toBe(3);
    });

    it('returns 3 for orange-stack', () => {
      expect(getMinimumActions('orange-stack')).toBe(3);
    });

    it('returns the value from MINIMUM_ACTIONS', () => {
      expect(getMinimumActions('memory-match')).toBe(MINIMUM_ACTIONS['memory-match']);
    });

    it('all game IDs return values matching MINIMUM_ACTIONS', () => {
      const gameIds = Object.keys(MINIMUM_ACTIONS) as Array<keyof typeof MINIMUM_ACTIONS>;
      gameIds.forEach(id => {
        expect(getMinimumActions(id)).toBe(MINIMUM_ACTIONS[id]);
      });
    });

    it('returns a number for every known game', () => {
      const gameIds = Object.keys(MINIMUM_ACTIONS) as Array<keyof typeof MINIMUM_ACTIONS>;
      gameIds.forEach(id => {
        expect(typeof getMinimumActions(id)).toBe('number');
      });
    });

    it('all returned values are positive', () => {
      const gameIds = Object.keys(MINIMUM_ACTIONS) as Array<keyof typeof MINIMUM_ACTIONS>;
      gameIds.forEach(id => {
        expect(getMinimumActions(id)).toBeGreaterThan(0);
      });
    });
  });
});
