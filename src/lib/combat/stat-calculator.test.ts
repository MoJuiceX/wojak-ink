// src/lib/combat/stat-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateHP, calculateStat, calculateAllStats } from './stat-calculator';

describe('stat-calculator', () => {
  describe('calculateHP', () => {
    // NEUTRAL baseHP = 85
    it('calculates HP at level 1 for NEUTRAL (baseHP=85) → 13', () => {
      expect(calculateHP(85, 1)).toBe(13);
    });

    it('calculates HP at level 50 for NEUTRAL → 160', () => {
      expect(calculateHP(85, 50)).toBe(160);
    });

    it('calculates HP at level 100 for NEUTRAL → 311', () => {
      expect(calculateHP(85, 100)).toBe(311);
    });

    it('calculates HP at level 1 for ELECTRIC (baseHP=65) → 12', () => {
      // floor((2*65+31)*1/100) + 1 + 10 = floor(1.61) + 11 = 1 + 11 = 12
      expect(calculateHP(65, 1)).toBe(12);
    });

    it('calculates HP at level 50 for EARTH (baseHP=90) → 165', () => {
      // floor((2*90+31)*50/100) + 50 + 10 = floor(105.5) + 60 = 105 + 60 = 165
      expect(calculateHP(90, 50)).toBe(165);
    });
  });

  describe('calculateStat', () => {
    it('calculates a stat with neutral nature (mult=1.0)', () => {
      // NEUTRAL attack=80, level 50
      // floor(((2*80+31)*50/100)+5) * 1.0 = floor((191*50/100)+5) = floor(95.5+5) = floor(100.5) = 100
      expect(calculateStat(80, 50, 1.0)).toBe(100);
    });

    it('+10% nature multiplier increases stat', () => {
      // Same base, level 50, boosted
      // floor(((2*80+31)*50/100)+5) * 1.1 = 100 * 1.1 = 110 → floor = 110
      expect(calculateStat(80, 50, 1.1)).toBe(110);
    });

    it('-10% nature multiplier decreases stat', () => {
      // 100 * 0.9 = 90
      expect(calculateStat(80, 50, 0.9)).toBe(90);
    });

    it('calculates stat at level 1', () => {
      // base=80, level=1: floor(((2*80+31)*1/100)+5)*1.0 = floor((191*0.01)+5) = floor(1.91+5) = floor(6.91) = 6
      expect(calculateStat(80, 1, 1.0)).toBe(6);
    });

    it('calculates stat at level 100', () => {
      // base=80, level=100: floor(((2*80+31)*100/100)+5)*1.0 = floor(191+5) = 196
      expect(calculateStat(80, 100, 1.0)).toBe(196);
    });

    it('high base stat at level 100 with boost', () => {
      // ELECTRIC sp_atk=105, level 100, boosted
      // floor(((2*105+31)*100/100)+5)*1.1 = floor((241+5)*1.1) = floor(246*1.1) = floor(270.6) = 270
      expect(calculateStat(105, 100, 1.1)).toBe(270);
    });
  });

  describe('calculateAllStats', () => {
    it('returns all 6 stats for NEUTRAL at level 50 with Balanced nature', () => {
      const stats = calculateAllStats('NEUTRAL', 50, 'Balanced');
      expect(stats).toHaveProperty('hp');
      expect(stats).toHaveProperty('attack');
      expect(stats).toHaveProperty('defense');
      expect(stats).toHaveProperty('sp_atk');
      expect(stats).toHaveProperty('sp_def');
      expect(stats).toHaveProperty('speed');
      // NEUTRAL: all base stats are 80, HP is 85
      expect(stats.hp).toBe(160); // calculateHP(85, 50)
      // All other stats equal since Balanced nature (mult 1.0)
      expect(stats.attack).toBe(100);
      expect(stats.defense).toBe(100);
      expect(stats.sp_atk).toBe(100);
      expect(stats.sp_def).toBe(100);
      expect(stats.speed).toBe(100);
    });

    it('applies nature boost/reduce correctly', () => {
      // Focused: boost sp_atk, reduce defense
      const stats = calculateAllStats('NEUTRAL', 50, 'Focused');
      expect(stats.sp_atk).toBe(110); // 100 * 1.1
      expect(stats.defense).toBe(90); // 100 * 0.9
      expect(stats.attack).toBe(100); // unaffected
    });

    it('calculates stats for FIRE at level 100 with Savage nature', () => {
      // FIRE: hp=75, atk=90, def=65, spa=100, spd=70, spe=85
      // Savage: boost attack, reduce sp_def
      const stats = calculateAllStats('FIRE', 100, 'Savage');
      // HP = floor((2*75+31)*100/100) + 100 + 10 = 181 + 110 = 291
      expect(stats.hp).toBe(291);
      // attack: floor(((2*90+31)*100/100)+5)*1.1 = floor((211+5)*1.1) = floor(216*1.1) = floor(237.6) = 237
      expect(stats.attack).toBe(237);
      // sp_def: floor(((2*70+31)*100/100)+5)*0.9 = floor((171+5)*0.9) = floor(176*0.9) = floor(158.4) = 158
      expect(stats.sp_def).toBe(158);
    });

    it('handles neutral natures (Sturdy, Quiet, Eccentric, Grim)', () => {
      // All neutral natures should give same result
      const s1 = calculateAllStats('NEUTRAL', 50, 'Sturdy');
      const s2 = calculateAllStats('NEUTRAL', 50, 'Quiet');
      const s3 = calculateAllStats('NEUTRAL', 50, 'Eccentric');
      const s4 = calculateAllStats('NEUTRAL', 50, 'Grim');
      expect(s1).toEqual(s2);
      expect(s2).toEqual(s3);
      expect(s3).toEqual(s4);
    });
  });
});
