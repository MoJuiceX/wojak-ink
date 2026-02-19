// src/lib/combat/data/type-colors.test.ts
import { describe, it, expect } from 'vitest';
import { TYPE_COLORS, getTypeColor, DARK_TEXT_TYPES } from './type-colors';
import { COMBAT_TYPES } from '../types';

describe('TYPE_COLORS', () => {
  it('has a color for every combat type', () => {
    for (const type of COMBAT_TYPES) {
      expect(TYPE_COLORS[type]).toBeDefined();
      expect(TYPE_COLORS[type]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('getTypeColor returns color for valid type', () => {
    expect(getTypeColor('FIRE')).toBe('#F08030');
  });

  it('getTypeColor returns fallback for unknown type', () => {
    expect(getTypeColor('INVALID' as any)).toBe('#666666');
  });

  it('getTypeColor is case-insensitive', () => {
    expect(getTypeColor('fire' as any)).toBe('#F08030');
  });

  it('DARK_TEXT_TYPES contains light-background types', () => {
    expect(DARK_TEXT_TYPES).toContain('NEUTRAL');
    expect(DARK_TEXT_TYPES).toContain('ELECTRIC');
    expect(DARK_TEXT_TYPES).not.toContain('FIRE');
  });
});
