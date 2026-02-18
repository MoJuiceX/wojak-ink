import { describe, it, expect } from 'vitest';
import { calculateCombatIdentity } from './identity-calculator';

// A full-wizard Wojak should be PSYCHE type
const wizardTraits = {
  traits: [
    { traitId: 'Background_Spell-Room', layer: 'Background' },
    { traitId: 'Base_Classic', layer: 'Base' },
    { traitId: 'Clothes_Wizard-drip', layer: 'Clothes' },
    { traitId: 'Eyes_Wizard-Glasses', layer: 'Eyes' },
    { traitId: 'Head_Wiz-Hat', layer: 'Head' },
    { traitId: 'MouthBase_Pipe', layer: 'MouthBase' },
  ],
  colors: {
    'Clothes_Wizard-drip': '#4B0082', // indigo — PSYCHE color
    'Head_Wiz-Hat': '#9400D3',        // purple
    'MouthBase_Pipe': '#4B0082',      // indigo
  },
  details: {
    'Clothes_Wizard-drip': 'Detail 1', // PSYCHE +1, Sp.Atk +1
  },
};

const martialTraits = {
  traits: [
    { traitId: 'Background_Bepe-Barracks', layer: 'Background' },
    { traitId: 'Base_Rugged', layer: 'Base' },
    { traitId: 'Clothes_SWAT', layer: 'Clothes' },
    { traitId: 'Eyes_Tyson-Tattoo', layer: 'Eyes' },
    { traitId: 'Head_SWAT-helmet', layer: 'Head' },
    { traitId: 'Mouth_Teeth', layer: 'Mouth' },
  ],
  colors: {
    'Clothes_SWAT': '#1A1A1A', // black
    'Head_SWAT-helmet': '#1A1A1A',
  },
  details: {},
};

describe('identity-calculator', () => {
  it('wizard build produces PSYCHE type', () => {
    const identity = calculateCombatIdentity(wizardTraits);
    expect(identity.type).toBe('PSYCHE');
  });

  it('wizard build produces Sp.Atk-heavy nature', () => {
    const identity = calculateCombatIdentity(wizardTraits);
    // Sp.Atk should be highest stat score
    expect(identity.statScores.sp_atk).toBeGreaterThan(identity.statScores.attack);
  });

  it('martial build produces MARTIAL type', () => {
    const identity = calculateCombatIdentity(martialTraits);
    expect(identity.type).toBe('MARTIAL');
  });

  it('returns all 18 type scores', () => {
    const identity = calculateCombatIdentity(wizardTraits);
    expect(Object.keys(identity.typeScores)).toHaveLength(18);
  });

  it('returns all 5 stat scores', () => {
    const identity = calculateCombatIdentity(wizardTraits);
    expect(Object.keys(identity.statScores)).toHaveLength(5);
  });

  it('ability is one of the two for the determined type', () => {
    const identity = calculateCombatIdentity(wizardTraits);
    // PSYCHE abilities: Magic Guard (A) or Telepathy (B)
    expect(['Magic Guard', 'Telepathy']).toContain(identity.ability);
  });

  it('neutral build with no strong signals defaults to NEUTRAL', () => {
    const neutralTraits = {
      traits: [
        { traitId: 'Base_Classic', layer: 'Base' },
        { traitId: 'Clothes_Tee', layer: 'Clothes' },
      ],
      colors: {},
      details: {},
    };
    const identity = calculateCombatIdentity(neutralTraits);
    expect(identity.type).toBe('NEUTRAL');
  });
});
