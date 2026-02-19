import { describe, it, expect } from 'vitest';
import {
  TRAIT_NAME_MAP,
  BACKGROUND_COLOR_NAMES,
  lookupTraitName,
  lookupBackgroundColorName,
} from './traitNameMap';

// ============================================================
// TRAIT_NAME_MAP constant
// ============================================================

describe('TRAIT_NAME_MAP', () => {
  it('is a non-empty object', () => {
    expect(typeof TRAIT_NAME_MAP).toBe('object');
    expect(Object.keys(TRAIT_NAME_MAP).length).toBeGreaterThan(0);
  });

  it('all keys are lowercase strings', () => {
    for (const key of Object.keys(TRAIT_NAME_MAP)) {
      expect(key).toBe(key.toLowerCase());
    }
  });

  it('all values are non-empty strings', () => {
    for (const [, value] of Object.entries(TRAIT_NAME_MAP)) {
      expect(typeof value).toBe('string');
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });

  it('has face base entries', () => {
    expect(TRAIT_NAME_MAP['classic']).toBe('Classic');
    expect(TRAIT_NAME_MAP['rekt']).toBe('Rekt');
    expect(TRAIT_NAME_MAP['rugged']).toBe('Rugged');
    expect(TRAIT_NAME_MAP['npc']).toBe('NPC');
  });

  it('color variants map to base Phase 1 name', () => {
    expect(TRAIT_NAME_MAP['alpha shades blue']).toBe('Alpha Shades');
    expect(TRAIT_NAME_MAP['alpha shades pink']).toBe('Alpha Shades');
    expect(TRAIT_NAME_MAP['alpha shades red']).toBe('Alpha Shades');
    expect(TRAIT_NAME_MAP['alpha shades']).toBe('Alpha Shades');
  });

  it('shades color variants all map to Shades', () => {
    expect(TRAIT_NAME_MAP['shades']).toBe('Shades');
    expect(TRAIT_NAME_MAP['shades blue']).toBe('Shades');
    expect(TRAIT_NAME_MAP['shades neon green']).toBe('Shades');
    expect(TRAIT_NAME_MAP['shades red']).toBe('Shades');
  });

  it('handles G1 typos correctly', () => {
    expect(TRAIT_NAME_MAP['screeming']).toBe('Screaming');
    expect(TRAIT_NAME_MAP['stach']).toBe('Stache');
    expect(TRAIT_NAME_MAP['firefigther helmet']).toBe('Firefighter Helmet');
    expect(TRAIT_NAME_MAP['firefigther uniform']).toBe('Firefighter Uniform');
  });

  it('handles G2 typos correctly', () => {
    expect(TRAIT_NAME_MAP['3d glases']).toBe('3D Glasses');
    expect(TRAIT_NAME_MAP['comrad hat']).toBe('Comrade Hat');
    expect(TRAIT_NAME_MAP['straigth jacket']).toBe('Straitjacket');
    expect(TRAIT_NAME_MAP['bubblegum']).toBe('Bubble Gum');
  });

  it('super mario variants map to Super Wojak Hat', () => {
    expect(TRAIT_NAME_MAP['super mario']).toBe('Super Wojak Hat');
    expect(TRAIT_NAME_MAP['super mario green']).toBe('Super Wojak Hat');
    expect(TRAIT_NAME_MAP['super mario purple']).toBe('Super Wojak Hat');
    expect(TRAIT_NAME_MAP['super wojak']).toBe('Super Wojak Hat');
    expect(TRAIT_NAME_MAP['super wojak hat']).toBe('Super Wojak Hat');
  });

  it('super saiyan maps to Super Saiyan (head value)', () => {
    expect(TRAIT_NAME_MAP['super saiyan']).toBe('Super Saiyan');
  });

  it('super saiyan uniform maps to Super Saiyan Uniform (clothes value)', () => {
    expect(TRAIT_NAME_MAP['super saiyan uniform']).toBe('Super Saiyan Uniform');
  });

  it('suit color variants map to Suit', () => {
    expect(TRAIT_NAME_MAP['suit']).toBe('Suit');
    expect(TRAIT_NAME_MAP['suit black blue tie']).toBe('Suit');
    expect(TRAIT_NAME_MAP['suit orange red bow']).toBe('Suit');
  });

  it('WojakFakemask entries map to Fake It Mask', () => {
    expect(TRAIT_NAME_MAP['wojakfakemask1']).toBe('Fake It Mask');
    expect(TRAIT_NAME_MAP['wojakfakemask5']).toBe('Fake It Mask');
    expect(TRAIT_NAME_MAP['skull mask love']).toBe('Fake It Mask');
  });

  it('$cashtag entries map to uppercase display names', () => {
    expect(TRAIT_NAME_MAP['$chia']).toBe('$CHIA');
    expect(TRAIT_NAME_MAP['$bepe']).toBe('$BEPE');
    expect(TRAIT_NAME_MAP['$pizza']).toBe('$PIZZA');
  });

  it('background scenes are mapped', () => {
    expect(TRAIT_NAME_MAP['moms basement']).toBe('Moms Basement');
    expect(TRAIT_NAME_MAP["mom's basement"]).toBe('Moms Basement');
    expect(TRAIT_NAME_MAP['matrix']).toBe('Matrix');
    expect(TRAIT_NAME_MAP['hell']).toBe('Hell');
    expect(TRAIT_NAME_MAP['moon']).toBe('Moon');
  });

  it('wizard hat variants all map to Wizard Hat', () => {
    expect(TRAIT_NAME_MAP['wizard hat']).toBe('Wizard Hat');
    expect(TRAIT_NAME_MAP['wiz hat']).toBe('Wizard Hat');
    expect(TRAIT_NAME_MAP['wizard hat man']).toBe('Wizard Hat');
    expect(TRAIT_NAME_MAP['wizard hat man blue']).toBe('Wizard Hat');
  });

  it('fedora variants all map to Fedora', () => {
    expect(TRAIT_NAME_MAP['fedora']).toBe('Fedora');
    expect(TRAIT_NAME_MAP['fedora brown']).toBe('Fedora');
    expect(TRAIT_NAME_MAP['fedora orange']).toBe('Fedora');
    expect(TRAIT_NAME_MAP['fedora purple']).toBe('Fedora');
  });

  it('has SWAT gear entries', () => {
    expect(TRAIT_NAME_MAP['swat']).toBe('SWAT Gear');
    expect(TRAIT_NAME_MAP['swat gear']).toBe('SWAT Gear');
    expect(TRAIT_NAME_MAP['swat helmet']).toBe('SWAT Helmet');
  });

  it('has anarchy spikes → Spikes mapping', () => {
    expect(TRAIT_NAME_MAP['anarchy spikes']).toBe('Spikes');
    expect(TRAIT_NAME_MAP['anarchy spikes pink']).toBe('Spikes');
    expect(TRAIT_NAME_MAP['spikes']).toBe('Spikes');
  });

  it('NYS pump/dump/rug are mapped', () => {
    expect(TRAIT_NAME_MAP['nyse pump']).toBe('NYSE Pump');
    expect(TRAIT_NAME_MAP['nyse dump']).toBe('NYSE Dump');
    expect(TRAIT_NAME_MAP['nyse rug']).toBe('NYSE Rug');
  });
});

// ============================================================
// BACKGROUND_COLOR_NAMES constant
// ============================================================

describe('BACKGROUND_COLOR_NAMES', () => {
  it('is a non-empty object', () => {
    expect(typeof BACKGROUND_COLOR_NAMES).toBe('object');
    expect(Object.keys(BACKGROUND_COLOR_NAMES).length).toBeGreaterThan(0);
  });

  it('all keys are uppercase hex codes starting with #', () => {
    for (const key of Object.keys(BACKGROUND_COLOR_NAMES)) {
      expect(key).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('all values are non-empty strings', () => {
    for (const [, value] of Object.entries(BACKGROUND_COLOR_NAMES)) {
      expect(typeof value).toBe('string');
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });

  it('contains the default midnight void color', () => {
    expect(BACKGROUND_COLOR_NAMES['#1A1A2E']).toBe('Midnight Void');
  });

  it('contains Wojak Orange', () => {
    expect(BACKGROUND_COLOR_NAMES['#FF6B00']).toBe('Wojak Orange');
  });

  it('contains white and near-black', () => {
    expect(BACKGROUND_COLOR_NAMES['#FFFFFF']).toBe('White');
    expect(BACKGROUND_COLOR_NAMES['#262626']).toBe('Near Black');
  });
});

// ============================================================
// lookupTraitName
// ============================================================

describe('lookupTraitName', () => {
  it('returns the correct display name for an exact match', () => {
    expect(lookupTraitName('classic')).toBe('Classic');
  });

  it('is case-insensitive (uppercase input)', () => {
    expect(lookupTraitName('CLASSIC')).toBe('Classic');
  });

  it('is case-insensitive (mixed case input)', () => {
    expect(lookupTraitName('Alpha Shades')).toBe('Alpha Shades');
  });

  it('trims whitespace', () => {
    expect(lookupTraitName('  classic  ')).toBe('Classic');
  });

  it('returns null for unknown identifier', () => {
    expect(lookupTraitName('completely-unknown-trait-xyz')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(lookupTraitName('')).toBeNull();
  });

  it('resolves color variants to base name', () => {
    expect(lookupTraitName('Shades Blue')).toBe('Shades');
    expect(lookupTraitName('SHADES BLUE')).toBe('Shades');
  });

  it('resolves G1 typo identifiers', () => {
    expect(lookupTraitName('Screeming')).toBe('Screaming');
  });

  it('resolves G2 typo identifiers', () => {
    expect(lookupTraitName('Comrad Hat')).toBe('Comrade Hat');
  });

  it('resolves WojakFakemask identifiers', () => {
    expect(lookupTraitName('wojakfakemask3')).toBe('Fake It Mask');
    expect(lookupTraitName('WOJAKFAKEMASK3')).toBe('Fake It Mask');
  });

  it('returns display name for $cashtag (lowercase input)', () => {
    expect(lookupTraitName('$chia')).toBe('$CHIA');
  });

  it('resolves Chia Farmer extra overlay keys', () => {
    expect(lookupTraitName('extra on tee,tank top clothes chia farmer blue')).toBe('Chia Farmer');
  });

  it('resolves background scenes', () => {
    expect(lookupTraitName('Nesting Grounds')).toBe('Nesting Grounds');
    expect(lookupTraitName('HELL')).toBe('Hell');
  });
});

// ============================================================
// lookupBackgroundColorName
// ============================================================

describe('lookupBackgroundColorName', () => {
  it('returns the correct name for a known hex (uppercase)', () => {
    expect(lookupBackgroundColorName('#FF6B00')).toBe('Wojak Orange');
  });

  it('is case-insensitive (lowercase hex)', () => {
    expect(lookupBackgroundColorName('#ff6b00')).toBe('Wojak Orange');
  });

  it('is case-insensitive (mixed case hex)', () => {
    expect(lookupBackgroundColorName('#fF6B00')).toBe('Wojak Orange');
  });

  it('trims whitespace', () => {
    expect(lookupBackgroundColorName('  #FF6B00  ')).toBe('Wojak Orange');
  });

  it('returns null for unknown hex', () => {
    expect(lookupBackgroundColorName('#123456')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(lookupBackgroundColorName('')).toBeNull();
  });

  it('returns Midnight Void for the default dark bg color', () => {
    expect(lookupBackgroundColorName('#1a1a2e')).toBe('Midnight Void');
  });

  it('returns White for #FFFFFF', () => {
    expect(lookupBackgroundColorName('#ffffff')).toBe('White');
  });

  it('returns Green Candle for success green', () => {
    expect(lookupBackgroundColorName('#22c55e')).toBe('Green Candle');
  });
});
