import { describe, it, expect } from 'vitest';
import {
  getWeightedRandomTrait,
  hasWeightedFrequencies,
  getTraitNames,
  getTraitWeight,
  normalizeName,
  findMatchingTrait,
  frequencies,
} from './weightedRandomizer';

describe('hasWeightedFrequencies', () => {
  it('returns true for a known category', () => {
    expect(hasWeightedFrequencies('Base')).toBe(true);
  });

  it('returns true for other known categories', () => {
    expect(hasWeightedFrequencies('Eyes')).toBe(true);
    expect(hasWeightedFrequencies('Background')).toBe(true);
    expect(hasWeightedFrequencies('MouthBase')).toBe(true);
  });

  it('returns false for unknown category', () => {
    expect(hasWeightedFrequencies('NonExistentCategory')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasWeightedFrequencies('')).toBe(false);
  });
});

describe('getWeightedRandomTrait', () => {
  it('returns a string for a known category', () => {
    const trait = getWeightedRandomTrait('Base');
    expect(typeof trait).toBe('string');
    expect(trait).not.toBeNull();
  });

  it('returns null for unknown category', () => {
    expect(getWeightedRandomTrait('UnknownCategory')).toBeNull();
  });

  it('returns a valid trait name from the category', () => {
    const knownTraits = ['Classic', 'Rekt', 'Rugged', 'Bleeding', 'Terminator'];
    for (let i = 0; i < 20; i++) {
      const trait = getWeightedRandomTrait('Base');
      expect(knownTraits).toContain(trait);
    }
  });

  it('returns traits from the Eyes category', () => {
    const trait = getWeightedRandomTrait('Eyes');
    expect(trait).not.toBeNull();
    const eyeNames = getTraitNames('Eyes');
    expect(eyeNames).toContain(trait);
  });

  it('returns different traits across multiple calls (probabilistic)', () => {
    const results = new Set<string | null>();
    for (let i = 0; i < 50; i++) {
      results.add(getWeightedRandomTrait('Background'));
    }
    // With 36 backgrounds, 50 calls should produce at least 5 unique values
    expect(results.size).toBeGreaterThan(4);
  });
});

describe('getTraitNames', () => {
  it('returns an array of strings', () => {
    const names = getTraitNames('Base');
    expect(Array.isArray(names)).toBe(true);
    expect(names.length).toBeGreaterThan(0);
  });

  it('includes known Base traits', () => {
    const names = getTraitNames('Base');
    expect(names).toContain('Classic');
    expect(names).toContain('Rekt');
    expect(names).toContain('Rugged');
    expect(names).toContain('Terminator');
  });

  it('returns empty array for unknown category', () => {
    expect(getTraitNames('NoSuchCategory')).toEqual([]);
  });

  it('returns all traits for MouthBase', () => {
    const names = getTraitNames('MouthBase');
    expect(names).toContain('Numb');
    expect(names).toContain('Smile');
    expect(names).toContain('Screaming');
  });
});

describe('getTraitWeight', () => {
  it('returns correct weight for high-frequency trait', () => {
    expect(getTraitWeight('Base', 'Classic')).toBe(2080);
  });

  it('returns correct weight for low-frequency trait', () => {
    expect(getTraitWeight('Base', 'Bleeding')).toBe(1);
  });

  it('returns 1 for unknown trait in known category', () => {
    expect(getTraitWeight('Base', 'NonExistentTrait')).toBe(1);
  });

  it('returns 1 for unknown category', () => {
    expect(getTraitWeight('NoCategory', 'SomeTrait')).toBe(1);
  });
});

describe('normalizeName', () => {
  it('converts to lowercase', () => {
    expect(normalizeName('CLASSIC')).toBe('classic');
  });

  it('replaces underscores with spaces', () => {
    expect(normalizeName('tank_top_blue')).toBe('tank top blue');
  });

  it('replaces hyphens with spaces', () => {
    expect(normalizeName('tank-top-blue')).toBe('tank top blue');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeName('  Classic  ')).toBe('classic');
  });

  it('collapses multiple spaces into one', () => {
    expect(normalizeName('Tank   Top   Blue')).toBe('tank top blue');
  });

  it('handles empty string', () => {
    expect(normalizeName('')).toBe('');
  });

  it('handles string with only spaces', () => {
    expect(normalizeName('   ')).toBe('');
  });

  it('handles mixed separators', () => {
    expect(normalizeName('TANK_TOP-BLUE')).toBe('tank top blue');
  });
});

describe('findMatchingTrait', () => {
  it('finds exact match by name', () => {
    expect(findMatchingTrait('Base', 'Classic')).toBe('Classic');
  });

  it('finds match case-insensitively', () => {
    expect(findMatchingTrait('Base', 'classic')).toBe('Classic');
  });

  it('returns null for unknown category', () => {
    expect(findMatchingTrait('NoCategory', 'Classic')).toBeNull();
  });

  it('returns null when no match found', () => {
    expect(findMatchingTrait('Base', 'nonexistent trait xyz')).toBeNull();
  });

  it('finds match with underscores', () => {
    // 'MOG Glasses' in Eyes - try matching with underscore variant
    expect(findMatchingTrait('Eyes', 'mog_glasses')).toBe('MOG Glasses');
  });

  it('finds partial match where input contains trait', () => {
    // 'Leather Jacket' should match when searching for 'Leather Jacket something'
    expect(findMatchingTrait('Clothes', 'Leather Jacket Extra')).toBe('Leather Jacket');
  });

  it('finds partial match where trait contains input', () => {
    // 'Leather Jacket' contains 'Leather'
    expect(findMatchingTrait('Clothes', 'Leather')).toBe('Leather Jacket');
  });

  it('returns a valid Background trait', () => {
    const result = findMatchingTrait('Background', '$CHIA');
    expect(result).toBe('$CHIA');
  });
});

describe('frequencies export', () => {
  it('has Base category', () => {
    expect(frequencies).toHaveProperty('Base');
  });

  it('Base.Classic has weight 2080', () => {
    expect(frequencies['Base']['Classic']).toBe(2080);
  });

  it('has at least 9 categories', () => {
    expect(Object.keys(frequencies).length).toBeGreaterThanOrEqual(9);
  });

  it('all frequency values are positive numbers', () => {
    for (const [, traits] of Object.entries(frequencies)) {
      for (const [, count] of Object.entries(traits)) {
        expect(count).toBeGreaterThan(0);
      }
    }
  });
});
