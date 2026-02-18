import { describe, it, expect } from 'vitest';
import { DETAIL_COMBAT_MAP, getDetailBonus } from './detail-combat-map';

describe('detail-combat-map', () => {
  it('has correct total detail entries', () => {
    let count = 0;
    for (const entries of Object.values(DETAIL_COMBAT_MAP)) {
      count += Object.keys(entries).length;
    }
    expect(count).toBe(38);
  });

  it('Comrade Hat + Star gives FIRE +2, Attack +1', () => {
    const bonus = getDetailBonus('Head_Comrad-Hat', 'Star');
    expect(bonus).toBeDefined();
    expect(bonus!.typeBonus).toEqual({ type: 'FIRE', pts: 2 });
    expect(bonus!.natureBonus).toEqual({ stat: 'attack', pts: 1 });
  });

  it('Beer Hat + Red-bull gives AIR +1, Speed +1', () => {
    const bonus = getDetailBonus('Head_Beer-Hat', 'Red-bull');
    expect(bonus).toBeDefined();
    expect(bonus!.typeBonus).toEqual({ type: 'AIR', pts: 1 });
    expect(bonus!.natureBonus).toEqual({ stat: 'speed', pts: 1 });
  });

  it('returns undefined for unknown detail', () => {
    expect(getDetailBonus('Head_Beer-Hat', 'nonexistent')).toBeUndefined();
  });

  it('returns undefined for unknown trait', () => {
    expect(getDetailBonus('Head_Nonexistent', 'Star')).toBeUndefined();
  });

  it('MOG Glasses Default (Rainbow) gives MYSTIC +1, no nature bonus', () => {
    const bonus = getDetailBonus('Face-wear_MOG-Glasses', 'Default (Rainbow)');
    expect(bonus).toBeDefined();
    expect(bonus!.typeBonus).toEqual({ type: 'MYSTIC', pts: 1 });
    expect(bonus!.natureBonus).toBeNull();
  });

  it('Wizard Drip Logo Patch gives MYSTIC +1, Sp.Def +1', () => {
    const bonus = getDetailBonus('Clothes_Wizard-drip', 'Logo Patch');
    expect(bonus).toBeDefined();
    expect(bonus!.typeBonus).toEqual({ type: 'MYSTIC', pts: 1 });
    expect(bonus!.natureBonus).toEqual({ stat: 'sp_def', pts: 1 });
  });

  it('Suit Tie gives NEUTRAL +1, Sp.Atk +1', () => {
    const bonus = getDetailBonus('Clothes_Suit', 'Tie');
    expect(bonus).toBeDefined();
    expect(bonus!.typeBonus).toEqual({ type: 'NEUTRAL', pts: 1 });
    expect(bonus!.natureBonus).toEqual({ stat: 'sp_atk', pts: 1 });
  });

  it('Cap Army variant gives MARTIAL +2, Attack +1', () => {
    const bonus = getDetailBonus('Head_Cap', 'Army');
    expect(bonus).toBeDefined();
    expect(bonus!.typeBonus).toEqual({ type: 'MARTIAL', pts: 2 });
    expect(bonus!.natureBonus).toEqual({ stat: 'attack', pts: 1 });
  });

  it('every entry has parentTrait matching its outer key', () => {
    for (const [traitId, entries] of Object.entries(DETAIL_COMBAT_MAP)) {
      for (const [optName, entry] of Object.entries(entries)) {
        expect(entry.parentTrait).toBe(traitId);
        expect(entry.detailOption).toBe(optName);
      }
    }
  });

  it('typeBonus pts are always 1 or 2', () => {
    for (const entries of Object.values(DETAIL_COMBAT_MAP)) {
      for (const entry of Object.values(entries)) {
        if (entry.typeBonus) {
          expect(entry.typeBonus.pts).toBeGreaterThanOrEqual(1);
          expect(entry.typeBonus.pts).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('natureBonus pts are always 1 when present', () => {
    for (const entries of Object.values(DETAIL_COMBAT_MAP)) {
      for (const entry of Object.values(entries)) {
        if (entry.natureBonus) {
          expect(entry.natureBonus.pts).toBe(1);
        }
      }
    }
  });
});
