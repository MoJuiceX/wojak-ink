import { describe, it, expect } from 'vitest';
import {
  CLOTHES_G1_TO_G2,
  HEAD_G1_TO_G2,
  EYE_G1_TO_G2,
  MOUTH_G1_TO_G2,
  G1_TO_G2_MAP,
  G2_TO_G1_MAP,
  normalizeTraitName,
} from './traitMapping';

describe('normalizeTraitName', () => {
  it('lowercases the input', () => {
    expect(normalizeTraitName('BATHROBE')).toBe('bathrobe');
  });

  it('removes hyphens', () => {
    expect(normalizeTraitName('Wizard-Hat')).toBe('wizardhat');
  });

  it('removes underscores', () => {
    expect(normalizeTraitName('Bubble_Gum')).toBe('bubblegum');
  });

  it('removes spaces', () => {
    expect(normalizeTraitName('Pirate Hat')).toBe('piratehat');
  });

  it('removes hyphens, underscores and spaces together', () => {
    expect(normalizeTraitName('Face-wear_3d glases')).toBe('facewear3dglases');
  });

  it('handles an empty string', () => {
    expect(normalizeTraitName('')).toBe('');
  });

  it('handles a string with only special separators', () => {
    expect(normalizeTraitName('---___   ')).toBe('');
  });

  it('preserves digits', () => {
    expect(normalizeTraitName('3D-Glasses')).toBe('3dglasses');
  });

  it('handles mixed case with multiple separators', () => {
    expect(normalizeTraitName('Military-Jacket')).toBe('militaryjacket');
  });
});

describe('CLOTHES_G1_TO_G2', () => {
  it('maps Straitjacket to Clothes_Straigth-jacket', () => {
    expect(CLOTHES_G1_TO_G2['Straitjacket']).toBe('Clothes_Straigth-jacket');
  });

  it('maps Suit to Clothes_Suit', () => {
    expect(CLOTHES_G1_TO_G2['Suit']).toBe('Clothes_Suit');
  });

  it('maps Military-Jacket to Clothes_Military-jacket', () => {
    expect(CLOTHES_G1_TO_G2['Military-Jacket']).toBe('Clothes_Military-jacket');
  });
});

describe('HEAD_G1_TO_G2', () => {
  it('maps Anarchy-Spikes to Head_Spikes', () => {
    expect(HEAD_G1_TO_G2['Anarchy-Spikes']).toBe('Head_Spikes');
  });

  it('maps Vikings-Hat to Head_viking-helmet', () => {
    expect(HEAD_G1_TO_G2['Vikings-Hat']).toBe('Head_viking-helmet');
  });

  it('maps Super-Mario to Head_Super-wojak', () => {
    expect(HEAD_G1_TO_G2['Super-Mario']).toBe('Head_Super-wojak');
  });

  it('maps Wizard-Hat and Wizard-Hat_man to the same G2 trait', () => {
    expect(HEAD_G1_TO_G2['Wizard-Hat']).toBe('Head_Wiz-Hat');
    expect(HEAD_G1_TO_G2['Wizard-Hat_man']).toBe('Head_Wiz-Hat');
  });
});

describe('EYE_G1_TO_G2', () => {
  it('maps 3D-Glasses to Face-wear_3d-glases', () => {
    expect(EYE_G1_TO_G2['3D-Glasses']).toBe('Face-wear_3d-glases');
  });

  it('maps Laser-Eyes to Face-laser_Laser-Eyes', () => {
    expect(EYE_G1_TO_G2['Laser-Eyes']).toBe('Face-laser_Laser-Eyes');
  });
});

describe('MOUTH_G1_TO_G2', () => {
  it('maps Bubble-Gum to Mouth_BubbleGum', () => {
    expect(MOUTH_G1_TO_G2['Bubble-Gum']).toBe('Mouth_BubbleGum');
  });

  it('maps Pipe to Mouth_Pipe', () => {
    expect(MOUTH_G1_TO_G2['Pipe']).toBe('Mouth_Pipe');
  });
});

describe('G1_TO_G2_MAP (unified)', () => {
  it('contains all entries from CLOTHES_G1_TO_G2', () => {
    for (const [key, value] of Object.entries(CLOTHES_G1_TO_G2)) {
      expect(G1_TO_G2_MAP[key]).toBe(value);
    }
  });

  it('contains all entries from HEAD_G1_TO_G2', () => {
    for (const [key, value] of Object.entries(HEAD_G1_TO_G2)) {
      expect(G1_TO_G2_MAP[key]).toBe(value);
    }
  });

  it('contains all entries from EYE_G1_TO_G2', () => {
    for (const [key, value] of Object.entries(EYE_G1_TO_G2)) {
      expect(G1_TO_G2_MAP[key]).toBe(value);
    }
  });

  it('contains all entries from MOUTH_G1_TO_G2', () => {
    for (const [key, value] of Object.entries(MOUTH_G1_TO_G2)) {
      expect(G1_TO_G2_MAP[key]).toBe(value);
    }
  });

  it('returns undefined for a G1 name not in the map', () => {
    expect(G1_TO_G2_MAP['NonExistentTrait']).toBeUndefined();
  });
});

describe('G2_TO_G1_MAP (reverse lookup)', () => {
  it('maps Clothes_Suit back to Suit', () => {
    expect(G2_TO_G1_MAP['Clothes_Suit']).toBe('Suit');
  });

  it('maps Head_Spikes back to Anarchy-Spikes', () => {
    expect(G2_TO_G1_MAP['Head_Spikes']).toBe('Anarchy-Spikes');
  });

  it('maps Face-wear_3d-glases back to 3D-Glasses', () => {
    expect(G2_TO_G1_MAP['Face-wear_3d-glases']).toBe('3D-Glasses');
  });

  it('maps Mouth_Pipe back to Pipe', () => {
    expect(G2_TO_G1_MAP['Mouth_Pipe']).toBe('Pipe');
  });

  it('every G2 value in G1_TO_G2_MAP has a reverse entry', () => {
    // Note: where two G1 keys map to same G2 value (Wizard-Hat and Wizard-Hat_man),
    // only the last one wins in the reverse map — just verify the reverse map has the key
    const allG2Values = new Set(Object.values(G1_TO_G2_MAP));
    for (const g2 of allG2Values) {
      expect(G2_TO_G1_MAP[g2]).toBeDefined();
    }
  });

  it('returns undefined for a G2 name not in the map', () => {
    expect(G2_TO_G1_MAP['NonExistent_G2_Trait']).toBeUndefined();
  });
});
