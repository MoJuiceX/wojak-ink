import { describe, it, expect } from 'vitest';
import {
  COLOR_TOKENS,
  parseColorVariant,
  normalizeHeadLabel,
  formatDisplayLabel,
  parseSuitVariant,
  parseChiaFarmerVariant,
  cleanDisplayName,
} from './traitOptions';

// ============================================================
// COLOR_TOKENS constant
// ============================================================

describe('COLOR_TOKENS', () => {
  it('is a non-empty object', () => {
    expect(typeof COLOR_TOKENS).toBe('object');
    expect(Object.keys(COLOR_TOKENS).length).toBeGreaterThan(0);
  });

  it('all values are valid hex codes', () => {
    for (const hex of Object.values(COLOR_TOKENS)) {
      expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('contains standard color tokens', () => {
    expect(COLOR_TOKENS['blue']).toBe('#1e5bd7');
    expect(COLOR_TOKENS['red']).toBe('#d71818');
    expect(COLOR_TOKENS['green']).toBe('#2a9d3c');
    expect(COLOR_TOKENS['white']).toBe('#ffffff');
  });

  it('grey and gray map to the same value', () => {
    expect(COLOR_TOKENS['grey']).toBe(COLOR_TOKENS['gray']);
  });

  it('contains neon green as a two-word token', () => {
    expect(COLOR_TOKENS['neon green']).toBe('#39ff14');
  });
});

// ============================================================
// parseColorVariant
// ============================================================

describe('parseColorVariant', () => {
  it('returns null for undefined input', () => {
    expect(parseColorVariant(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseColorVariant('')).toBeNull();
  });

  it('returns null when no color token is found', () => {
    expect(parseColorVariant('Classic')).toBeNull();
    expect(parseColorVariant('Wizard Hat')).toBeNull();
  });

  it('parses "Name (color)" pattern', () => {
    const result = parseColorVariant('Shades (blue)');
    expect(result).not.toBeNull();
    expect(result?.base).toBe('Shades');
    expect(result?.color).toBe('blue');
    expect(result?.hex).toBe(COLOR_TOKENS['blue']);
  });

  it('parses "Name, color" pattern', () => {
    const result = parseColorVariant('Cap, green');
    expect(result).not.toBeNull();
    expect(result?.base).toBe('Cap');
    expect(result?.color).toBe('green');
  });

  it('parses "Name color" (last word) pattern', () => {
    const result = parseColorVariant('Alpha Shades Blue');
    expect(result).not.toBeNull();
    expect(result?.base).toBe('Alpha Shades');
    expect(result?.color).toBe('blue');
  });

  it('parses "Name neon green" (two-word color) pattern', () => {
    const result = parseColorVariant('Tank Top neon green');
    expect(result).not.toBeNull();
    expect(result?.base).toBe('Tank Top');
    expect(result?.color).toBe('neon green');
    expect(result?.hex).toBe('#39ff14');
  });

  it('color matching is case-insensitive', () => {
    const result = parseColorVariant('Fedora Orange');
    expect(result).not.toBeNull();
    expect(result?.color).toBe('orange');
  });

  it('returns the correct hex for each color', () => {
    const result = parseColorVariant('Hat Pink');
    expect(result?.hex).toBe(COLOR_TOKENS['pink']);
  });
});

// ============================================================
// normalizeHeadLabel
// ============================================================

describe('normalizeHeadLabel', () => {
  it('returns label unchanged when layerName is not Head', () => {
    expect(normalizeHeadLabel('some label', 'Clothes')).toBe('some label');
    expect(normalizeHeadLabel('wizard hat', 'Base')).toBe('wizard hat');
  });

  it('returns label unchanged for Head layer with no special pattern', () => {
    expect(normalizeHeadLabel('Beanie', 'Head')).toBe('Beanie');
  });

  it('replaces supa with Super in Super Saiyan', () => {
    const result = normalizeHeadLabel('Supa Saiyan', 'Head');
    expect(result).toContain('Super');
    expect(result).not.toContain('supa');
  });

  it('corrects Super Saiyan label to Super Saiyan Uniform', () => {
    const result = normalizeHeadLabel('Super Saiyan', 'Head');
    expect(result).toContain('Uniform');
  });

  it('normalizes 2pac to 2Pac', () => {
    const result = normalizeHeadLabel('2pac Bandana', 'Head');
    expect(result).toContain('2Pac');
  });

  it('normalizes SWAT to uppercase', () => {
    const result = normalizeHeadLabel('swat helmet', 'Head');
    expect(result.toUpperCase()).toContain('SWAT');
  });

  it('removes "man" suffix from wizard labels', () => {
    const result = normalizeHeadLabel('Wizard Hat man', 'Head');
    expect(result.toLowerCase()).not.toContain(' man');
  });

  it('handles empty string input', () => {
    expect(normalizeHeadLabel('', 'Head')).toBe('');
  });
});

// ============================================================
// formatDisplayLabel
// ============================================================

describe('formatDisplayLabel', () => {
  it('returns empty string for empty input', () => {
    expect(formatDisplayLabel('')).toBe('');
  });

  it('uppercases $cashtag labels', () => {
    expect(formatDisplayLabel('$chia')).toBe('$CHIA');
    expect(formatDisplayLabel('$bepe')).toBe('$BEPE');
  });

  it('returns Chia Farmer for chia farmer variants', () => {
    expect(formatDisplayLabel('Chia Farmer Blue')).toBe('Chia Farmer');
    expect(formatDisplayLabel('chia-farmer')).toBe('Chia Farmer');
  });

  it("returns Mom's Basement for moms basement variants", () => {
    expect(formatDisplayLabel("moms basement")).toBe("Mom's Basement");
    expect(formatDisplayLabel("Mom's Basement")).toBe("Mom's Basement");
  });

  it('formats NYSE labels correctly', () => {
    expect(formatDisplayLabel('nyse dump')).toBe('NYSE Dump');
    expect(formatDisplayLabel('nyse pump')).toBe('NYSE Pump');
  });

  it('formats 2Pac Bandana correctly', () => {
    expect(formatDisplayLabel('2pac bandana')).toBe('2Pac Bandana');
  });

  it('formats 2Pac Bandana with color', () => {
    const result = formatDisplayLabel('2pac bandana pink');
    expect(result).toBe('2Pac Bandana (Pink)');
  });

  it('formats Wizard Hat correctly', () => {
    expect(formatDisplayLabel('wizard hat')).toBe('Wizard Hat');
  });

  it('formats Wizard Hat with color', () => {
    const result = formatDisplayLabel('wizard hat man blue');
    expect(result).toBe('Wizard Hat (Blue)');
  });

  it('formats Tin Foil Hat correctly', () => {
    expect(formatDisplayLabel('tin foil')).toBe('Tin Foil Hat');
    expect(formatDisplayLabel('tin foil hat')).toBe('Tin Foil Hat');
  });

  it('formats anarchy spikes to Spikes', () => {
    expect(formatDisplayLabel('anarchy spikes')).toBe('Spikes');
  });

  it('formats anarchy spikes with color', () => {
    expect(formatDisplayLabel('anarchy spikes pink')).toBe('Spikes (Pink)');
  });

  it('returns 3D Glasses for 3d glasses variants', () => {
    expect(formatDisplayLabel('3d glasses')).toBe('3D Glasses');
    expect(formatDisplayLabel('3D Glasses')).toBe('3D Glasses');
  });

  it('returns MOG Glasses for mog glasses', () => {
    expect(formatDisplayLabel('mog glasses')).toBe('MOG Glasses');
  });

  it("returns God's Robe for god rope labels", () => {
    expect(formatDisplayLabel('god rope')).toBe("God's Robe");
  });

  it('returns El Presidente for military jacket', () => {
    expect(formatDisplayLabel('military jacket')).toBe('El Presidente');
  });

  it('corrects stach → Stache via overrides', () => {
    expect(formatDisplayLabel('stach')).toBe('Stache');
  });

  it('corrects screeming → Screaming via overrides', () => {
    expect(formatDisplayLabel('screeming')).toBe('Screaming');
  });

  it('returns Super Wojak Hat for super mario', () => {
    expect(formatDisplayLabel('super mario')).toBe('Super Wojak Hat');
  });

  it('returns Super Wojak Hat with color for super mario color', () => {
    expect(formatDisplayLabel('super mario green')).toBe('Super Wojak Hat (Green)');
  });

  it('title-cases unknown labels by default', () => {
    expect(formatDisplayLabel('cowboy hat')).toBe('Cowboy Hat');
    expect(formatDisplayLabel('pirate hat')).toBe('Pirate Hat');
  });

  it('returns Comrade Hat for comrade cap', () => {
    expect(formatDisplayLabel('comrade cap')).toBe('Comrade Hat');
  });

  it('returns Piccolo Turban for piccolo hat', () => {
    expect(formatDisplayLabel('piccolo hat')).toBe('Piccolo Turban');
  });

  it('returns Viking Helmet for vikings hat', () => {
    expect(formatDisplayLabel('vikings hat')).toBe('Viking Helmet');
  });
});

// ============================================================
// parseSuitVariant
// ============================================================

describe('parseSuitVariant', () => {
  it('returns null for undefined input', () => {
    expect(parseSuitVariant(undefined)).toBeNull();
  });

  it('returns null for non-suit labels', () => {
    expect(parseSuitVariant('Tee Blue')).toBeNull();
    expect(parseSuitVariant('Leather Jacket')).toBeNull();
  });

  it('parses "suit black blue tie" correctly', () => {
    const result = parseSuitVariant('suit black blue tie');
    expect(result).not.toBeNull();
    expect(result?.suitColor).toBe('black');
    expect(result?.accessoryColor).toBe('blue');
    expect(result?.accessoryType).toBe('tie');
  });

  it('parses "suit orange red bow" correctly', () => {
    const result = parseSuitVariant('suit orange red bow');
    expect(result).not.toBeNull();
    expect(result?.suitColor).toBe('orange');
    expect(result?.accessoryColor).toBe('red');
    expect(result?.accessoryType).toBe('bow');
  });

  it('returns null for invalid suit color (not black/orange)', () => {
    expect(parseSuitVariant('suit blue red tie')).toBeNull();
  });

  it('returns null for "suit" alone (no variant info)', () => {
    expect(parseSuitVariant('suit')).toBeNull();
  });
});

// ============================================================
// parseChiaFarmerVariant
// ============================================================

describe('parseChiaFarmerVariant', () => {
  it('returns null when both path and name are undefined', () => {
    expect(parseChiaFarmerVariant(undefined, undefined)).toBeNull();
  });

  it('returns null when path and name do not contain chia farmer', () => {
    expect(parseChiaFarmerVariant('tee-blue', 'Tee Blue')).toBeNull();
  });

  it('parses blue variant from path', () => {
    const result = parseChiaFarmerVariant('clothes/chia-farmer-blue', 'Chia Farmer');
    expect(result).not.toBeNull();
    expect(result?.color).toBe('blue');
  });

  it('parses brown variant from path', () => {
    const result = parseChiaFarmerVariant('clothes/chia-farmer-brown', 'Chia Farmer');
    expect(result?.color).toBe('brown');
  });

  it('parses orange variant from path', () => {
    const result = parseChiaFarmerVariant('clothes/chia-farmer-orange', 'Chia Farmer');
    expect(result?.color).toBe('orange');
  });

  it('parses red variant from path', () => {
    const result = parseChiaFarmerVariant('clothes/chia-farmer-red', 'Chia Farmer');
    expect(result?.color).toBe('red');
  });

  it('returns null for unknown color', () => {
    expect(parseChiaFarmerVariant('clothes/chia-farmer-purple', 'Chia Farmer')).toBeNull();
  });
});

// ============================================================
// cleanDisplayName
// ============================================================

describe('cleanDisplayName', () => {
  it('strips common image extensions', () => {
    expect(cleanDisplayName('traits/HEAD_Classic.png')).not.toContain('.png');
    expect(cleanDisplayName('traits/CLOTHES_Tee.jpg')).not.toContain('.jpg');
  });

  it('strips all-caps layer prefix', () => {
    const result = cleanDisplayName('HEAD_Classic.png');
    expect(result).not.toContain('HEAD_');
  });

  it('converts underscores and hyphens to spaces', () => {
    const result = cleanDisplayName('CLOTHES_leather-jacket.png');
    expect(result).not.toContain('_');
    expect(result).not.toContain('-');
  });

  it('trims whitespace from result', () => {
    const result = cleanDisplayName('BASE_Classic.png');
    expect(result).toBe(result.trim());
  });

  it('handles filepath with directory separators', () => {
    const result = cleanDisplayName('assets/layers/HEAD_Beanie.png');
    expect(result).toBe('Beanie');
  });

  it('removes Base-Wojak prefix', () => {
    const result = cleanDisplayName('Base-Wojak_Classic.png');
    expect(result.toLowerCase()).not.toContain('base-wojak');
    expect(result.toLowerCase()).not.toContain('base wojak');
  });
});
