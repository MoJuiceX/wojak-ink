import { describe, it, expect } from 'vitest';
import { generateRandomName, validateName, formatFullName, MAX_NAME_LENGTH } from './nameGenerator';

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
