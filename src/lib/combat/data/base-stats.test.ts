import { describe, it, expect } from 'vitest';
import { BASE_STATS, getBaseStats } from './base-stats';
import { COMBAT_TYPES } from '../types';

describe('base-stats', () => {
  it('has stats for all 18 types', () => {
    for (const type of COMBAT_TYPES) {
      expect(BASE_STATS[type]).toBeDefined();
    }
  });

  it('every type has BST of 485', () => {
    for (const type of COMBAT_TYPES) {
      const s = BASE_STATS[type];
      const bst = s.hp + s.attack + s.defense + s.sp_atk + s.sp_def + s.speed;
      expect(bst).toBe(485);
    }
  });

  it('MARTIAL has 110 attack (physical sweeper)', () => {
    expect(BASE_STATS['MARTIAL'].attack).toBe(110);
  });

  it('ELECTRIC has 120 speed (speed demon)', () => {
    expect(BASE_STATS['ELECTRIC'].speed).toBe(120);
  });

  it('getBaseStats returns correct stats', () => {
    const stats = getBaseStats('NEUTRAL');
    expect(stats.hp).toBe(85);
    expect(stats.attack).toBe(80);
  });
});
