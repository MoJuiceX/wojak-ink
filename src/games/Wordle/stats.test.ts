// src/games/Wordle/stats.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import type { WordleStats } from './stats';
import {
  getDefaultStats,
  loadStats,
  saveStats,
  updateStatsAfterGame,
  getWinPercentage,
  getMaxDistribution,
} from './stats';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Wordle stats', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getDefaultStats', () => {
    it('returns gamesPlayed of 0', () => {
      expect(getDefaultStats().gamesPlayed).toBe(0);
    });

    it('returns gamesWon of 0', () => {
      expect(getDefaultStats().gamesWon).toBe(0);
    });

    it('returns currentStreak of 0', () => {
      expect(getDefaultStats().currentStreak).toBe(0);
    });

    it('returns maxStreak of 0', () => {
      expect(getDefaultStats().maxStreak).toBe(0);
    });

    it('returns guessDistribution as array of 6 zeros', () => {
      const dist = getDefaultStats().guessDistribution;
      expect(dist).toHaveLength(6);
      expect(dist.every(v => v === 0)).toBe(true);
    });

    it('returns lastPlayedDate as null', () => {
      expect(getDefaultStats().lastPlayedDate).toBeNull();
    });

    it('returns lastCompletedDate as null', () => {
      expect(getDefaultStats().lastCompletedDate).toBeNull();
    });
  });

  describe('loadStats', () => {
    it('returns defaults when localStorage is empty', () => {
      const stats = loadStats();
      expect(stats).toEqual(getDefaultStats());
    });

    it('returns saved stats when present', () => {
      const saved: WordleStats = {
        gamesPlayed: 5,
        gamesWon: 3,
        currentStreak: 2,
        maxStreak: 4,
        guessDistribution: [0, 1, 1, 1, 0, 0],
        lastPlayedDate: '2026-01-01',
        lastCompletedDate: '2026-01-01',
      };
      localStorageMock.setItem('wojak-wordle-stats', JSON.stringify(saved));
      const loaded = loadStats();
      expect(loaded.gamesPlayed).toBe(5);
      expect(loaded.gamesWon).toBe(3);
    });

    it('returns defaults when stored JSON is invalid', () => {
      localStorageMock.setItem('wojak-wordle-stats', 'not-json!!!');
      const stats = loadStats();
      expect(stats).toEqual(getDefaultStats());
    });

    it('returns defaults when stored stats has wrong structure', () => {
      localStorageMock.setItem('wojak-wordle-stats', JSON.stringify({ foo: 'bar' }));
      const stats = loadStats();
      expect(stats).toEqual(getDefaultStats());
    });

    it('fixes guessDistribution if length is not 6', () => {
      const bad = { gamesPlayed: 1, gamesWon: 1, guessDistribution: [1, 0, 0] };
      localStorageMock.setItem('wojak-wordle-stats', JSON.stringify(bad));
      const stats = loadStats();
      expect(stats.guessDistribution).toHaveLength(6);
    });
  });

  describe('saveStats and loadStats roundtrip', () => {
    it('saves and loads stats correctly', () => {
      const stats: WordleStats = {
        gamesPlayed: 10,
        gamesWon: 7,
        currentStreak: 3,
        maxStreak: 5,
        guessDistribution: [1, 2, 2, 1, 1, 0],
        lastPlayedDate: '2026-02-19',
        lastCompletedDate: '2026-02-19',
      };
      saveStats(stats);
      const loaded = loadStats();
      expect(loaded).toEqual(stats);
    });
  });

  describe('getWinPercentage', () => {
    it('returns 0 when no games played', () => {
      expect(getWinPercentage(getDefaultStats())).toBe(0);
    });

    it('returns 100 when all games won', () => {
      const stats = { ...getDefaultStats(), gamesPlayed: 5, gamesWon: 5 };
      expect(getWinPercentage(stats)).toBe(100);
    });

    it('returns 50 for half wins', () => {
      const stats = { ...getDefaultStats(), gamesPlayed: 4, gamesWon: 2 };
      expect(getWinPercentage(stats)).toBe(50);
    });

    it('rounds to nearest integer', () => {
      const stats = { ...getDefaultStats(), gamesPlayed: 3, gamesWon: 2 };
      // 2/3 = 0.666 -> rounds to 67
      expect(getWinPercentage(stats)).toBe(67);
    });

    it('returns 0 for zero wins', () => {
      const stats = { ...getDefaultStats(), gamesPlayed: 5, gamesWon: 0 };
      expect(getWinPercentage(stats)).toBe(0);
    });
  });

  describe('getMaxDistribution', () => {
    it('returns 1 when all zeros (min 1)', () => {
      expect(getMaxDistribution(getDefaultStats())).toBe(1);
    });

    it('returns max value in distribution', () => {
      const stats = { ...getDefaultStats(), guessDistribution: [0, 2, 5, 3, 1, 0] };
      expect(getMaxDistribution(stats)).toBe(5);
    });

    it('returns 1 when distribution max is less than 1', () => {
      const stats = { ...getDefaultStats(), guessDistribution: [0, 0, 0, 0, 0, 0] };
      expect(getMaxDistribution(stats)).toBe(1);
    });

    it('handles single large value', () => {
      const stats = { ...getDefaultStats(), guessDistribution: [100, 0, 0, 0, 0, 0] };
      expect(getMaxDistribution(stats)).toBe(100);
    });
  });

  describe('updateStatsAfterGame', () => {
    it('increments gamesPlayed on win', () => {
      const stats = updateStatsAfterGame(true, 3);
      expect(stats.gamesPlayed).toBe(1);
    });

    it('increments gamesPlayed on loss', () => {
      const stats = updateStatsAfterGame(false, 6);
      expect(stats.gamesPlayed).toBe(1);
    });

    it('increments gamesWon on win', () => {
      const stats = updateStatsAfterGame(true, 3);
      expect(stats.gamesWon).toBe(1);
    });

    it('does not increment gamesWon on loss', () => {
      const stats = updateStatsAfterGame(false, 6);
      expect(stats.gamesWon).toBe(0);
    });

    it('resets currentStreak on loss', () => {
      const saved: WordleStats = {
        ...getDefaultStats(),
        currentStreak: 3,
        maxStreak: 3,
      };
      saveStats(saved);
      const stats = updateStatsAfterGame(false, 6);
      expect(stats.currentStreak).toBe(0);
    });

    it('updates guess distribution on win with 3 guesses (index 2)', () => {
      const stats = updateStatsAfterGame(true, 3);
      expect(stats.guessDistribution[2]).toBe(1);
    });

    it('updates guess distribution on win with 1 guess (index 0)', () => {
      const stats = updateStatsAfterGame(true, 1);
      expect(stats.guessDistribution[0]).toBe(1);
    });

    it('updates guess distribution on win with 6 guesses (index 5)', () => {
      const stats = updateStatsAfterGame(true, 6);
      expect(stats.guessDistribution[5]).toBe(1);
    });

    it('clamps guess index to 5 for out-of-range numGuesses', () => {
      const stats = updateStatsAfterGame(true, 99);
      expect(stats.guessDistribution[5]).toBe(1);
    });

    it('clamps guess index to 0 for numGuesses of 0', () => {
      const stats = updateStatsAfterGame(true, 0);
      expect(stats.guessDistribution[0]).toBe(1);
    });

    it('maxStreak is not decremented on loss', () => {
      const saved: WordleStats = {
        ...getDefaultStats(),
        currentStreak: 5,
        maxStreak: 5,
      };
      saveStats(saved);
      const stats = updateStatsAfterGame(false, 6);
      expect(stats.maxStreak).toBe(5);
    });

    it('sets lastPlayedDate to today', () => {
      const today = new Date().toISOString().split('T')[0];
      const stats = updateStatsAfterGame(true, 3);
      expect(stats.lastPlayedDate).toBe(today);
    });

    it('starts currentStreak at 1 when no prior completion', () => {
      const stats = updateStatsAfterGame(true, 3);
      expect(stats.currentStreak).toBe(1);
    });

    it('persists stats to localStorage', () => {
      updateStatsAfterGame(true, 3);
      const loaded = loadStats();
      expect(loaded.gamesPlayed).toBe(1);
    });
  });
});
