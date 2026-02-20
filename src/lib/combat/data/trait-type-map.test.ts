import { describe, it, expect } from 'vitest';
import { TRAIT_COMBAT_MAP, getTraitCombat } from './trait-type-map';

describe('trait-type-map', () => {
  it('has 142 trait entries', () => {
    expect(Object.keys(TRAIT_COMBAT_MAP).length).toBe(142);
  });

  it('Firefighter Uniform gives FIRE 5pts primary', () => {
    const entry = getTraitCombat('Clothes_fire-figther');
    expect(entry).toBeDefined();
    expect(entry!.typePoints.primary).toBe('FIRE');
    expect(entry!.typePoints.primaryPts).toBe(5);
  });

  it('Wizard Drip gives PSYCHE 5pts, MYSTIC 2pts', () => {
    const entry = getTraitCombat('Clothes_Wizard-drip');
    expect(entry).toBeDefined();
    expect(entry!.typePoints.primary).toBe('PSYCHE');
    expect(entry!.typePoints.primaryPts).toBe(5);
    expect(entry!.typePoints.secondary).toBe('MYSTIC');
    expect(entry!.typePoints.secondaryPts).toBe(2);
  });

  it('returns undefined for unknown trait', () => {
    expect(getTraitCombat('nonexistent')).toBeUndefined();
  });
});
