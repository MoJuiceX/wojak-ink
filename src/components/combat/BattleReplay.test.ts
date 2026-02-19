// src/components/combat/BattleReplay.test.ts
import { describe, it, expect } from 'vitest';
import { getBaseStats } from '@/lib/combat/data/base-stats';
import { calculateHP } from '@/lib/combat/stat-calculator';
import type { CombatType } from '@/lib/combat/types';

/**
 * Test the maxHP computation used in BattleReplay (and BattleView).
 * Ensures type-specific base stats produce different HP values.
 */
describe('computeMaxHP via stat-calculator', () => {
  function computeMaxHP(type: CombatType, level: number): number {
    const base = getBaseStats(type);
    return calculateHP(base.hp, level);
  }

  it('returns correct HP for FIRE type at level 50', () => {
    // FIRE base HP = 75
    // HP = floor((2 * 75 + 31) * 50 / 100) + 50 + 10 = floor(90.5) + 60 = 150
    const hp = computeMaxHP('FIRE', 50);
    expect(hp).toBe(150);
  });

  it('returns correct HP for EARTH type at level 50', () => {
    // EARTH base HP = 90
    // HP = floor((2 * 90 + 31) * 50 / 100) + 50 + 10 = floor(105.5) + 60 = 165
    const hp = computeMaxHP('EARTH', 50);
    expect(hp).toBe(165);
  });

  it('EARTH has more HP than ELECTRIC at same level', () => {
    // EARTH base HP = 90, ELECTRIC base HP = 65
    const earthHP = computeMaxHP('EARTH', 50);
    const electricHP = computeMaxHP('ELECTRIC', 50);
    expect(earthHP).toBeGreaterThan(electricHP);
  });

  it('higher level = more HP for same type', () => {
    const hp30 = computeMaxHP('NEUTRAL', 30);
    const hp50 = computeMaxHP('NEUTRAL', 50);
    const hp80 = computeMaxHP('NEUTRAL', 80);
    expect(hp30).toBeLessThan(hp50);
    expect(hp50).toBeLessThan(hp80);
  });

  it('all 18 types produce valid HP values at level 1', () => {
    const types: CombatType[] = [
      'NEUTRAL', 'FIRE', 'WATER', 'ELECTRIC', 'GRASS', 'ICE',
      'MARTIAL', 'VENOM', 'EARTH', 'AIR', 'PSYCHE', 'INSECT',
      'STONE', 'GHOST', 'DRAGON', 'SHADOW', 'METAL', 'MYSTIC',
    ];
    for (const type of types) {
      const hp = computeMaxHP(type, 1);
      expect(hp).toBeGreaterThan(0);
      expect(hp).toBeLessThan(500);
    }
  });
});
