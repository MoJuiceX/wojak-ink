import { describe, it, expect } from 'vitest';
import { ABILITIES, getAbilitiesForType, getAbility } from './abilities';
import { COMBAT_TYPES } from '../types';

describe('abilities', () => {
  it('has exactly 36 abilities (2 per 18 types)', () => {
    expect(ABILITIES).toHaveLength(36);
  });

  it('every type has exactly 2 abilities (A and B)', () => {
    for (const type of COMBAT_TYPES) {
      const pair = getAbilitiesForType(type);
      expect(pair).toHaveLength(2);
      expect(pair[0].variant).toBe('A');
      expect(pair[1].variant).toBe('B');
    }
  });

  it('FIRE ability A is Blaze', () => {
    const [a] = getAbilitiesForType('FIRE');
    expect(a.name).toBe('Blaze');
  });

  it('getAbility looks up by name', () => {
    const ability = getAbility('Magic Guard');
    expect(ability).toBeDefined();
    expect(ability!.type).toBe('PSYCHE');
    expect(ability!.variant).toBe('A');
  });
});
