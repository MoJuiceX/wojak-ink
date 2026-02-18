// src/lib/combat/xp-elo-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateXPAward, calculateELOChange, calculateLevelFromXP } from './xp-elo-calculator';

describe('xp-elo-calculator', () => {
  describe('calculateXPAward', () => {
    it('winner gets base_xp scaled by level/elo', () => {
      // Same level, same elo → base * (1 + 1*0.5) * (1 + 0*0.25) = 50 * 1.5 * 1 = 75
      const xp = calculateXPAward('win', 50, 50, 1000, 1000);
      expect(xp).toBe(75);
    });

    it('winner gets more XP for beating higher-level opponent', () => {
      // opp level 100, own level 50 → ratio 2.0
      // 50 * (1 + 100/50 * 0.5) * (1 + 0) = 50 * 2.0 = 100
      const xp = calculateXPAward('win', 50, 100, 1000, 1000);
      expect(xp).toBe(100);
    });

    it('winner gets ELO bonus for beating higher-ELO opponent', () => {
      // ELO diff = 200
      // 50 * (1 + 1*0.5) * (1 + 200/400 * 0.25) = 50 * 1.5 * 1.125 = 84.375 → 84
      const xp = calculateXPAward('win', 50, 50, 1000, 1200);
      expect(xp).toBe(84);
    });

    it('loser gets base_xp * 0.3', () => {
      const xp = calculateXPAward('loss', 50, 50, 1000, 1000);
      // 50 * 0.3 = 15
      expect(xp).toBe(15);
    });

    it('draw gets base_xp * 0.5', () => {
      const xp = calculateXPAward('draw', 50, 50, 1000, 1000);
      // 50 * 0.5 = 25
      expect(xp).toBe(25);
    });
  });

  describe('calculateELOChange', () => {
    it('equal ELO, winner gains ~16', () => {
      // expected = 1/(1+10^0) = 0.5
      // change = round(32 * (1.0 - 0.5)) = 16
      const change = calculateELOChange(1000, 1000, 1.0);
      expect(change).toBe(16);
    });

    it('equal ELO, loser loses ~16', () => {
      const change = calculateELOChange(1000, 1000, 0.0);
      expect(change).toBe(-16);
    });

    it('equal ELO, draw = 0 change', () => {
      const change = calculateELOChange(1000, 1000, 0.5);
      expect(change).toBe(0);
    });

    it('underdog win gives large gain', () => {
      // own 800, opp 1200: expected = 1/(1+10^(400/400)) = 1/(1+10) = 0.0909
      // change = round(32 * (1.0 - 0.0909)) = round(29.09) = 29
      const change = calculateELOChange(800, 1200, 1.0);
      expect(change).toBe(29);
    });

    it('favorite win gives small gain', () => {
      // own 1200, opp 800: expected = 1/(1+10^(-400/400)) = 1/(1+0.1) = 0.909
      // change = round(32 * (1.0 - 0.909)) = round(2.91) = 3
      const change = calculateELOChange(1200, 800, 1.0);
      expect(change).toBe(3);
    });

    it('K-factor is 32', () => {
      // Max gain is ~32 (when expected is near 0)
      const change = calculateELOChange(500, 2000, 1.0);
      expect(change).toBeLessThanOrEqual(32);
      expect(change).toBeGreaterThanOrEqual(30);
    });
  });

  describe('calculateLevelFromXP', () => {
    it('0 XP = level 1', () => {
      expect(calculateLevelFromXP(0)).toBe(1);
    });

    it('matches level threshold table at key points', () => {
      // Level 2 requires 57 XP → floor(2^2.5 * 10) = floor(56.57) = 56
      expect(calculateLevelFromXP(56)).toBe(2);
      expect(calculateLevelFromXP(55)).toBe(1);
    });

    it('level 5 requires floor(5^2.5 * 10) = 559', () => {
      expect(calculateLevelFromXP(559)).toBe(5);
      expect(calculateLevelFromXP(558)).toBe(4);
    });

    it('level 10 requires floor(10^2.5 * 10) = 3162', () => {
      expect(calculateLevelFromXP(3162)).toBe(10);
      expect(calculateLevelFromXP(3161)).toBe(9);
    });

    it('level 100 requires floor(100^2.5 * 10) = 1000000', () => {
      expect(calculateLevelFromXP(1000000)).toBe(100);
      expect(calculateLevelFromXP(999999)).toBe(99);
    });

    it('caps at level 100', () => {
      expect(calculateLevelFromXP(9999999)).toBe(100);
    });

    it('never returns below 1', () => {
      expect(calculateLevelFromXP(-100)).toBe(1);
    });
  });
});
