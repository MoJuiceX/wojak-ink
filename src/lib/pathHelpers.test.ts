import { describe, it, expect } from 'vitest';
import { pathContains } from './pathHelpers';

describe('pathContains', () => {
  it('returns true when path contains the identifier (exact case)', () => {
    expect(pathContains('layers/Clothes/Bathrobe.png', 'Bathrobe')).toBe(true);
  });

  it('returns true when path contains the identifier (case-insensitive, lower identifier)', () => {
    expect(pathContains('layers/Clothes/Bathrobe.png', 'bathrobe')).toBe(true);
  });

  it('returns true when path contains the identifier (case-insensitive, upper identifier)', () => {
    expect(pathContains('layers/Clothes/bathrobe.png', 'BATHROBE')).toBe(true);
  });

  it('returns true when identifier matches a path segment', () => {
    expect(pathContains('assets/Head/CapForward.png', 'Head')).toBe(true);
  });

  it('returns true when identifier is a substring within a filename', () => {
    expect(pathContains('layers/Eyes/Sunglasses_Dark.png', 'sunglasses')).toBe(true);
  });

  it('returns false when identifier is not present in path', () => {
    expect(pathContains('layers/Clothes/Bathrobe.png', 'Hoodie')).toBe(false);
  });

  it('returns false when path is undefined', () => {
    expect(pathContains(undefined, 'Bathrobe')).toBe(false);
  });

  it('returns false when path is an empty string', () => {
    expect(pathContains('', 'Bathrobe')).toBe(false);
  });

  it('returns true when identifier is an empty string (substring of everything)', () => {
    // Every string contains the empty string — matches JS String.prototype.includes behavior
    expect(pathContains('layers/Clothes/Bathrobe.png', '')).toBe(true);
  });

  it('handles paths with mixed separators', () => {
    expect(pathContains('layers/MouthItem/Cig.png', 'mouthitem')).toBe(true);
  });

  it('handles identifier longer than path — returns false', () => {
    expect(pathContains('abc', 'abcdefgh')).toBe(false);
  });

  it('matches partial filename prefix', () => {
    expect(pathContains('assets/Eyes/NerdGlasses.png', 'nerd')).toBe(true);
  });
});
