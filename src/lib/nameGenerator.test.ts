import { describe, it, expect } from 'vitest';
import { generateRandomName, validateName, formatFullName, getPlaceholderHint, MAX_NAME_LENGTH, TRAIT_NAME_OVERRIDES } from './nameGenerator';

describe('MAX_NAME_LENGTH', () => {
  it('is 15', () => {
    expect(MAX_NAME_LENGTH).toBe(15);
  });
});

describe('generateRandomName', () => {
  it('returns a non-empty string', () => {
    const name = generateRandomName();
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('never exceeds MAX_NAME_LENGTH characters', () => {
    for (let i = 0; i < 50; i++) {
      const name = generateRandomName();
      expect(name.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
    }
  });

  it('returns different values across calls (probabilistic)', () => {
    const names = new Set(Array.from({ length: 30 }, () => generateRandomName()));
    // With 28 full names + many prefix/suffix combos, 30 draws should yield > 3 unique names
    expect(names.size).toBeGreaterThan(3);
  });
});

describe('validateName', () => {
  it('returns valid for an empty string', () => {
    expect(validateName('')).toEqual({ valid: true });
  });

  it('returns valid for a normal name', () => {
    expect(validateName('Moon Boy')).toEqual({ valid: true });
  });

  it('returns valid for a name exactly at MAX_NAME_LENGTH', () => {
    const name = 'A'.repeat(MAX_NAME_LENGTH);
    expect(validateName(name)).toEqual({ valid: true });
  });

  it('returns invalid when name exceeds MAX_NAME_LENGTH', () => {
    const name = 'A'.repeat(MAX_NAME_LENGTH + 1);
    const result = validateName(name);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_NAME_LENGTH}`);
  });

  it('returns valid for allowed punctuation characters', () => {
    expect(validateName("Don't")).toEqual({ valid: true });
    expect(validateName('Moon.Bro')).toEqual({ valid: true });
    expect(validateName('WAGMI!')).toEqual({ valid: true });
  });

  it('returns invalid for disallowed characters like @', () => {
    const result = validateName('Moon@Boy');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid for names with leading spaces', () => {
    const result = validateName(' MoonBoy');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('spaces');
  });

  it('returns invalid for names with trailing spaces', () => {
    const result = validateName('MoonBoy ');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('spaces');
  });

  it('returns valid for names with internal spaces', () => {
    expect(validateName('Moon Boy')).toEqual({ valid: true });
  });

  it('returns invalid for emoji or unicode characters', () => {
    const result = validateName('Moon\u{1F600}');
    expect(result.valid).toBe(false);
  });
});

describe('formatFullName', () => {
  it('formats with edition number only when no custom name provided', () => {
    expect(formatFullName(42)).toBe('Your Wojak #42');
  });

  it('formats with edition number and custom name', () => {
    expect(formatFullName(7, 'Moon Boy')).toBe('Your Wojak #7: Moon Boy');
  });

  it('ignores an empty string custom name', () => {
    expect(formatFullName(1, '')).toBe('Your Wojak #1');
  });

  it('ignores a whitespace-only custom name', () => {
    expect(formatFullName(1, '   ')).toBe('Your Wojak #1');
  });

  it('trims whitespace from custom name before formatting', () => {
    expect(formatFullName(3, '  Degen King  ')).toBe('Your Wojak #3: Degen King');
  });

  it('handles edition number 0', () => {
    expect(formatFullName(0)).toBe('Your Wojak #0');
  });

  it('handles large edition numbers', () => {
    expect(formatFullName(9999, 'Chia Chad')).toBe('Your Wojak #9999: Chia Chad');
  });
});

describe('generateRandomName with traits', () => {
  it('accepts TraitInput[] and returns a name', () => {
    const traits = [
      { trait_type: 'Clothes', value: 'SWAT Gear' },
      { trait_type: 'Head', value: 'Beer Hat' },
    ];
    const name = generateRandomName(traits);
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
    expect(name.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
  });

  it('still works with no arguments (backward compat)', () => {
    const name = generateRandomName();
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('still works with a string argument (backward compat)', () => {
    const name = generateRandomName('Suit');
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
    expect(name.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
  });

  it('generates varied names across 30 calls', () => {
    const traits = [
      { trait_type: 'Clothes', value: 'Suit' },
    ];
    const names = new Set(Array.from({ length: 30 }, () => generateRandomName(traits)));
    expect(names.size).toBeGreaterThan(3);
  });

  it('never exceeds MAX_NAME_LENGTH with traits', () => {
    const traits = [
      { trait_type: 'Clothes', value: 'Wizard Drip' },
      { trait_type: 'Head', value: 'Wizard Hat' },
      { trait_type: 'Face Wear', value: 'Wizard Glasses' },
      { trait_type: 'Background', value: 'Wizard Tower' },
    ];
    for (let i = 0; i < 50; i++) {
      const name = generateRandomName(traits);
      expect(name.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
    }
  });
});

describe('TRAIT_NAME_OVERRIDES', () => {
  it('has all names within MAX_NAME_LENGTH', () => {
    for (const [trait, names] of Object.entries(TRAIT_NAME_OVERRIDES)) {
      for (const name of names) {
        expect(name.length, `"${name}" in ${trait} override exceeds ${MAX_NAME_LENGTH} chars`).toBeLessThanOrEqual(MAX_NAME_LENGTH);
      }
    }
  });

  it('maps known iconic traits', () => {
    expect(TRAIT_NAME_OVERRIDES['Astronaut']).toBeDefined();
    expect(TRAIT_NAME_OVERRIDES['Chia Farmer']).toBeDefined();
    expect(TRAIT_NAME_OVERRIDES['Laser Eyes']).toBeDefined();
    expect(TRAIT_NAME_OVERRIDES['Handgun']).toBeDefined();
  });

  it('includes trait overrides that can appear in generated names', () => {
    // With 30% override chance and Astronaut at tier 3, over many runs some
    // names should come from the Astronaut override pool.
    const traits = [{ trait_type: 'Clothes', value: 'Astronaut' }];
    const names = new Set(Array.from({ length: 200 }, () => generateRandomName(traits)));
    const overridePool = new Set(TRAIT_NAME_OVERRIDES['Astronaut']);
    const hasOverride = [...names].some((n) => overridePool.has(n));
    expect(hasOverride).toBe(true);
  });

  it('never exceeds MAX_NAME_LENGTH when override fires', () => {
    const traits = [
      { trait_type: 'Clothes', value: 'Goose Suit' },
      { trait_type: 'Extras', value: 'Diamond' },
    ];
    for (let i = 0; i < 100; i++) {
      const name = generateRandomName(traits);
      expect(name.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
    }
  });
});

describe('getPlaceholderHint with traits', () => {
  it('returns a mood-appropriate hint when given traits', () => {
    const traits = [
      { trait_type: 'Clothes', value: 'SWAT Gear' },
    ];
    const hint = getPlaceholderHint(traits);
    expect(hint.length).toBeGreaterThan(0);
  });

  it('still works with no arguments', () => {
    const hint = getPlaceholderHint();
    expect(hint.length).toBeGreaterThan(0);
  });

  it('still works with a string argument (backward compat)', () => {
    const hint = getPlaceholderHint('Suit');
    expect(hint.length).toBeGreaterThan(0);
  });
});
