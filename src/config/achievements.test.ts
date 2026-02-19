// src/config/achievements.test.ts
import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENTS,
  getAchievementById,
  getAchievementsByCategory,
} from './achievements';

describe('achievements config', () => {
  // ============================================
  // ACHIEVEMENTS array structure
  // ============================================
  describe('ACHIEVEMENTS array', () => {
    it('is an array', () => {
      expect(Array.isArray(ACHIEVEMENTS)).toBe(true);
    });

    it('has at least 15 achievements', () => {
      expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
    });

    it('each achievement has a unique id', () => {
      const ids = ACHIEVEMENTS.map((a) => a.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('each achievement has a non-empty name', () => {
      ACHIEVEMENTS.forEach((a) => {
        expect(typeof a.name).toBe('string');
        expect(a.name.length).toBeGreaterThan(0);
      });
    });

    it('each achievement has a non-empty description', () => {
      ACHIEVEMENTS.forEach((a) => {
        expect(typeof a.description).toBe('string');
        expect(a.description.length).toBeGreaterThan(0);
      });
    });

    it('each achievement has a valid category', () => {
      const validCategories = ['gameplay', 'collection', 'social', 'milestone'];
      ACHIEVEMENTS.forEach((a) => {
        expect(validCategories).toContain(a.category);
      });
    });

    it('each achievement has a requirement with a positive target', () => {
      ACHIEVEMENTS.forEach((a) => {
        expect(a.requirement.target).toBeGreaterThan(0);
      });
    });

    it('each achievement has a reward with non-negative oranges', () => {
      ACHIEVEMENTS.forEach((a) => {
        expect(a.reward.oranges).toBeGreaterThanOrEqual(0);
      });
    });

    it('each achievement has a reward with non-negative gems', () => {
      ACHIEVEMENTS.forEach((a) => {
        expect(a.reward.gems).toBeGreaterThanOrEqual(0);
      });
    });

    it('includes a "first-game" achievement', () => {
      const found = ACHIEVEMENTS.find((a) => a.id === 'first-game');
      expect(found).toBeDefined();
    });

    it('includes a "streak-7" achievement', () => {
      const found = ACHIEVEMENTS.find((a) => a.id === 'streak-7');
      expect(found).toBeDefined();
    });
  });

  // ============================================
  // Gameplay category
  // ============================================
  describe('gameplay achievements', () => {
    it('has at least 5 gameplay achievements', () => {
      const gameplay = ACHIEVEMENTS.filter((a) => a.category === 'gameplay');
      expect(gameplay.length).toBeGreaterThanOrEqual(5);
    });

    it('has increasing score targets for score-based achievements', () => {
      const scoreBased = ACHIEVEMENTS.filter(
        (a) => a.requirement.type === 'high_score'
      ).sort((a, b) => a.requirement.target - b.requirement.target);
      for (let i = 1; i < scoreBased.length; i++) {
        expect(scoreBased[i].requirement.target).toBeGreaterThan(
          scoreBased[i - 1].requirement.target
        );
      }
    });

    it('first-game requires 1 game played', () => {
      const a = ACHIEVEMENTS.find((a) => a.id === 'first-game');
      expect(a?.requirement.type).toBe('games_played');
      expect(a?.requirement.target).toBe(1);
    });

    it('games-10 requires 10 games played', () => {
      const a = ACHIEVEMENTS.find((a) => a.id === 'games-10');
      expect(a?.requirement.target).toBe(10);
    });

    it('games-100 requires 100 games played', () => {
      const a = ACHIEVEMENTS.find((a) => a.id === 'games-100');
      expect(a?.requirement.target).toBe(100);
    });

    it('games-100 rewards more oranges than games-10', () => {
      const g10 = ACHIEVEMENTS.find((a) => a.id === 'games-10');
      const g100 = ACHIEVEMENTS.find((a) => a.id === 'games-100');
      expect(g100!.reward.oranges).toBeGreaterThan(g10!.reward.oranges);
    });
  });

  // ============================================
  // Collection category
  // ============================================
  describe('collection achievements', () => {
    it('has at least 3 collection achievements', () => {
      const collection = ACHIEVEMENTS.filter((a) => a.category === 'collection');
      expect(collection.length).toBeGreaterThanOrEqual(3);
    });

    it('includes a first-purchase achievement', () => {
      const a = ACHIEVEMENTS.find((a) => a.id === 'first-purchase');
      expect(a).toBeDefined();
      expect(a?.category).toBe('collection');
    });
  });

  // ============================================
  // Social category
  // ============================================
  describe('social achievements', () => {
    it('has at least 2 social achievements', () => {
      const social = ACHIEVEMENTS.filter((a) => a.category === 'social');
      expect(social.length).toBeGreaterThanOrEqual(2);
    });

    it('first-friend requires friends_count type', () => {
      const a = ACHIEVEMENTS.find((a) => a.id === 'first-friend');
      expect(a?.requirement.type).toBe('friends_count');
    });
  });

  // ============================================
  // Milestone category
  // ============================================
  describe('milestone achievements', () => {
    it('has at least 3 milestone achievements', () => {
      const milestones = ACHIEVEMENTS.filter((a) => a.category === 'milestone');
      expect(milestones.length).toBeGreaterThanOrEqual(3);
    });

    it('streak-30 rewards more than streak-7', () => {
      const s7 = ACHIEVEMENTS.find((a) => a.id === 'streak-7');
      const s30 = ACHIEVEMENTS.find((a) => a.id === 'streak-30');
      expect(s30!.reward.oranges).toBeGreaterThan(s7!.reward.oranges);
    });

    it('earn-100k rewards more than earn-10k', () => {
      const e10 = ACHIEVEMENTS.find((a) => a.id === 'earn-10k');
      const e100 = ACHIEVEMENTS.find((a) => a.id === 'earn-100k');
      expect(e100!.reward.oranges).toBeGreaterThan(e10!.reward.oranges);
    });
  });

  // ============================================
  // getAchievementById
  // ============================================
  describe('getAchievementById', () => {
    it('returns the correct achievement for a known id', () => {
      const result = getAchievementById('first-game');
      expect(result).toBeDefined();
      expect(result?.id).toBe('first-game');
    });

    it('returns undefined for an unknown id', () => {
      const result = getAchievementById('does-not-exist');
      expect(result).toBeUndefined();
    });

    it('returns the correct achievement for streak-7', () => {
      const result = getAchievementById('streak-7');
      expect(result?.name).toBeTruthy();
      expect(result?.category).toBe('milestone');
    });

    it('returns undefined for empty string', () => {
      const result = getAchievementById('');
      expect(result).toBeUndefined();
    });

    it('is case-sensitive (uppercase not found)', () => {
      const result = getAchievementById('FIRST-GAME');
      expect(result).toBeUndefined();
    });
  });

  // ============================================
  // getAchievementsByCategory
  // ============================================
  describe('getAchievementsByCategory', () => {
    it('returns only gameplay achievements', () => {
      const result = getAchievementsByCategory('gameplay');
      result.forEach((a) => expect(a.category).toBe('gameplay'));
    });

    it('returns only collection achievements', () => {
      const result = getAchievementsByCategory('collection');
      result.forEach((a) => expect(a.category).toBe('collection'));
    });

    it('returns only social achievements', () => {
      const result = getAchievementsByCategory('social');
      result.forEach((a) => expect(a.category).toBe('social'));
    });

    it('returns only milestone achievements', () => {
      const result = getAchievementsByCategory('milestone');
      result.forEach((a) => expect(a.category).toBe('milestone'));
    });

    it('gameplay + collection + social + milestone covers all achievements', () => {
      const gameplay = getAchievementsByCategory('gameplay');
      const collection = getAchievementsByCategory('collection');
      const social = getAchievementsByCategory('social');
      const milestone = getAchievementsByCategory('milestone');
      const total = gameplay.length + collection.length + social.length + milestone.length;
      expect(total).toBe(ACHIEVEMENTS.length);
    });

    it('returns a non-empty array for gameplay', () => {
      expect(getAchievementsByCategory('gameplay').length).toBeGreaterThan(0);
    });
  });
});
