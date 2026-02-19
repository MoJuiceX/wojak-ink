// src/config/economy.test.ts
import { describe, it, expect } from 'vitest';
import {
  getRewardForRank,
  getTodayUTC,
  getCurrentPeriodKey,
  getPreviousPeriodKey,
  getTimeUntilMidnightUTC,
  GAME_TIERS,
  GAME_TIER_MAP,
  GAME_MIN_SCORES,
  DAILY_LOGIN_REWARDS,
  CRYPTO_CONVERSION,
  STARTING_BALANCE,
  GAME_IDS,
} from './economy';

describe('economy config', () => {
  describe('STARTING_BALANCE', () => {
    it('has oranges set to 100', () => {
      expect(STARTING_BALANCE.oranges).toBe(100);
    });

    it('has gems set to 0', () => {
      expect(STARTING_BALANCE.gems).toBe(0);
    });
  });

  describe('CRYPTO_CONVERSION', () => {
    it('withdrawals are disabled', () => {
      expect(CRYPTO_CONVERSION.WITHDRAWALS_ENABLED).toBe(false);
    });

    it('oranges per HOA is 10000', () => {
      expect(CRYPTO_CONVERSION.ORANGES_PER_HOA).toBe(10_000);
    });

    it('gems per CHIA is 1000', () => {
      expect(CRYPTO_CONVERSION.GEMS_PER_CHIA).toBe(1_000);
    });
  });

  describe('GAME_TIERS', () => {
    it('easy tier has base reward of 5', () => {
      expect(GAME_TIERS.easy.baseReward).toBe(5);
    });

    it('medium tier has base reward of 10', () => {
      expect(GAME_TIERS.medium.baseReward).toBe(10);
    });

    it('hard tier has base reward of 15', () => {
      expect(GAME_TIERS.hard.baseReward).toBe(15);
    });

    it('easy tier has highScoreBonus of 10', () => {
      expect(GAME_TIERS.easy.highScoreBonus).toBe(10);
    });

    it('hard tier has top10Bonus of 40', () => {
      expect(GAME_TIERS.hard.top10Bonus).toBe(40);
    });
  });

  describe('GAME_TIER_MAP', () => {
    it('flappy-orange is in hard tier', () => {
      expect(GAME_TIER_MAP['flappy-orange']).toBe('hard');
    });

    it('memory-match is in easy tier', () => {
      expect(GAME_TIER_MAP['memory-match']).toBe('easy');
    });

    it('block-puzzle is in medium tier', () => {
      expect(GAME_TIER_MAP['block-puzzle']).toBe('medium');
    });

    it('orange-juggle is in hard tier', () => {
      expect(GAME_TIER_MAP['orange-juggle']).toBe('hard');
    });
  });

  describe('GAME_MIN_SCORES', () => {
    it('flappy-orange minimum score is 5', () => {
      expect(GAME_MIN_SCORES['flappy-orange']).toBe(5);
    });

    it('merge-2048 minimum score is 256', () => {
      expect(GAME_MIN_SCORES['merge-2048']).toBe(256);
    });

    it('memory-match minimum is 4 pairs', () => {
      expect(GAME_MIN_SCORES['memory-match']).toBe(4);
    });
  });

  describe('DAILY_LOGIN_REWARDS', () => {
    it('has 7 entries', () => {
      expect(DAILY_LOGIN_REWARDS).toHaveLength(7);
    });

    it('day 1 gives 15 oranges', () => {
      expect(DAILY_LOGIN_REWARDS[0].oranges).toBe(15);
    });

    it('day 7 gives 3 gems', () => {
      const day7 = DAILY_LOGIN_REWARDS.find(r => r.day === 7);
      expect(day7?.gems).toBe(3);
    });

    it('days 1-6 give 0 gems', () => {
      DAILY_LOGIN_REWARDS.slice(0, 6).forEach(r => {
        expect(r.gems).toBe(0);
      });
    });

    it('rewards increase each day', () => {
      for (let i = 1; i < DAILY_LOGIN_REWARDS.length - 1; i++) {
        expect(DAILY_LOGIN_REWARDS[i].oranges).toBeGreaterThan(DAILY_LOGIN_REWARDS[i - 1].oranges);
      }
    });
  });

  describe('GAME_IDS', () => {
    it('contains flappy-orange', () => {
      expect(GAME_IDS).toContain('flappy-orange');
    });

    it('contains merge-2048', () => {
      expect(GAME_IDS).toContain('merge-2048');
    });

    it('has 15 games', () => {
      expect(GAME_IDS.length).toBe(15);
    });
  });

  describe('getRewardForRank', () => {
    it('daily rank 1 returns 20', () => {
      expect(getRewardForRank('daily', 1)).toBe(20);
    });

    it('daily rank 2 returns 15', () => {
      expect(getRewardForRank('daily', 2)).toBe(15);
    });

    it('daily rank 3 returns 10', () => {
      expect(getRewardForRank('daily', 3)).toBe(10);
    });

    it('daily rank 5 returns 5', () => {
      expect(getRewardForRank('daily', 5)).toBe(5);
    });

    it('daily rank 15 returns 2', () => {
      expect(getRewardForRank('daily', 15)).toBe(2);
    });

    it('daily rank 30 returns 1', () => {
      expect(getRewardForRank('daily', 30)).toBe(1);
    });

    it('daily rank 100 returns 0 (not in any tier)', () => {
      expect(getRewardForRank('daily', 100)).toBe(0);
    });

    it('weekly rank 1 returns 350', () => {
      expect(getRewardForRank('weekly', 1)).toBe(350);
    });

    it('weekly rank 2 returns 210', () => {
      expect(getRewardForRank('weekly', 2)).toBe(210);
    });

    it('weekly rank 3 returns 105', () => {
      expect(getRewardForRank('weekly', 3)).toBe(105);
    });

    it('weekly rank 4 returns 0', () => {
      expect(getRewardForRank('weekly', 4)).toBe(0);
    });

    it('monthly rank 1 returns 1400', () => {
      expect(getRewardForRank('monthly', 1)).toBe(1400);
    });

    it('monthly rank 2 returns 700', () => {
      expect(getRewardForRank('monthly', 2)).toBe(700);
    });

    it('monthly rank 3 returns 350', () => {
      expect(getRewardForRank('monthly', 3)).toBe(350);
    });

    it('monthly rank 10 returns 0', () => {
      expect(getRewardForRank('monthly', 10)).toBe(0);
    });
  });

  describe('getTodayUTC', () => {
    it('returns a string in YYYY-MM-DD format', () => {
      const today = getTodayUTC();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('matches current UTC date', () => {
      const expected = new Date().toISOString().split('T')[0];
      expect(getTodayUTC()).toBe(expected);
    });
  });

  describe('getCurrentPeriodKey', () => {
    it('daily returns YYYY-MM-DD format', () => {
      const key = getCurrentPeriodKey('daily');
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('weekly returns YYYY-WNN format', () => {
      const key = getCurrentPeriodKey('weekly');
      expect(key).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('monthly returns YYYY-MM format', () => {
      const key = getCurrentPeriodKey('monthly');
      expect(key).toMatch(/^\d{4}-\d{2}$/);
    });

    it('throws for unknown period type', () => {
      // @ts-expect-error testing invalid input
      expect(() => getCurrentPeriodKey('yearly')).toThrow();
    });

    it('daily key matches getTodayUTC', () => {
      expect(getCurrentPeriodKey('daily')).toBe(getTodayUTC());
    });
  });

  describe('getPreviousPeriodKey', () => {
    it('daily previous is yesterday', () => {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const expected = yesterday.toISOString().split('T')[0];
      expect(getPreviousPeriodKey('daily')).toBe(expected);
    });

    it('previous daily differs from current daily', () => {
      expect(getPreviousPeriodKey('daily')).not.toBe(getCurrentPeriodKey('daily'));
    });

    it('weekly returns YYYY-WNN format', () => {
      const key = getPreviousPeriodKey('weekly');
      expect(key).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('monthly returns YYYY-MM format', () => {
      const key = getPreviousPeriodKey('monthly');
      expect(key).toMatch(/^\d{4}-\d{2}$/);
    });

    it('throws for unknown period type', () => {
      // @ts-expect-error testing invalid input
      expect(() => getPreviousPeriodKey('yearly')).toThrow();
    });

    it('previous weekly differs from current weekly', () => {
      expect(getPreviousPeriodKey('weekly')).not.toBe(getCurrentPeriodKey('weekly'));
    });
  });

  describe('getTimeUntilMidnightUTC', () => {
    it('returns a positive number', () => {
      expect(getTimeUntilMidnightUTC()).toBeGreaterThan(0);
    });

    it('returns a value less than or equal to 24 hours in ms', () => {
      expect(getTimeUntilMidnightUTC()).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    });

    it('returns a number', () => {
      expect(typeof getTimeUntilMidnightUTC()).toBe('number');
    });
  });
});
