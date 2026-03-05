import { describe, expect, it } from 'vitest';
import { getCombatTypeFromAttributes } from './getCombatTypeFromAttributes';

describe('getCombatTypeFromAttributes', () => {
  it('uses explicit Combat Type when present', () => {
    const type = getCombatTypeFromAttributes([
      { trait_type: 'Background', value: 'Orange Grove' },
      { trait_type: 'Combat Type', value: 'MYSTIC' },
    ]);

    expect(type).toBe('MYSTIC');
  });

  it('falls back to trait-based classification for legacy metadata without Combat Type', () => {
    const type = getCombatTypeFromAttributes([
      { trait_type: 'Background', value: '$CASTER' },
      { trait_type: 'Base', value: 'Wojak' },
      { trait_type: 'Clothes', value: "God's Robe" },
      { trait_type: 'Face Wear', value: 'MOG Glasses' },
      { trait_type: 'Head', value: 'Clown' },
      { trait_type: 'Mouth', value: 'Smile' },
    ]);

    expect(type).toBe('MYSTIC');
  });

  it('handles legacy consolidated Mouth traits such as Joint', () => {
    const type = getCombatTypeFromAttributes([
      { trait_type: 'Mouth', value: 'Joint' },
    ]);

    expect(type).toBe('GRASS');
  });

  it('returns NEUTRAL for unknown trait sets', () => {
    const type = getCombatTypeFromAttributes([
      { trait_type: 'Unknown', value: 'Mystery' },
    ]);

    expect(type).toBe('NEUTRAL');
  });
});

