import { describe, it, expect } from 'vitest';
import { getEffectiveness, TYPE_CHART, COMBAT_TYPES } from './type-chart';

describe('type-chart', () => {
  it('returns 2 for FIRE attacking GRASS (super effective)', () => {
    expect(getEffectiveness('FIRE', 'GRASS')).toBe(2);
  });

  it('returns 0.5 for FIRE attacking WATER (not very effective)', () => {
    expect(getEffectiveness('FIRE', 'WATER')).toBe(0.5);
  });

  it('returns 0 for NEUTRAL attacking GHOST (immune)', () => {
    expect(getEffectiveness('NEUTRAL', 'GHOST')).toBe(0);
  });

  it('returns 1 for NEUTRAL attacking NEUTRAL (neutral)', () => {
    expect(getEffectiveness('NEUTRAL', 'NEUTRAL')).toBe(1);
  });

  it('has entries for all 18 types as attacker', () => {
    expect(Object.keys(TYPE_CHART)).toHaveLength(18);
  });

  it('has entries for all 18 types as defender for each attacker', () => {
    for (const atk of COMBAT_TYPES) {
      expect(Object.keys(TYPE_CHART[atk])).toHaveLength(18);
    }
  });
});
