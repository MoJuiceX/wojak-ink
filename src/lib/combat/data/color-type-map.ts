// src/lib/combat/data/color-type-map.ts
// Maps hex colors to combat type points using HSL analysis.
// See docs/COLOR-HUE-TYPE-MAPPING.csv for the full mapping table.

import type { CombatType, TypePoints } from '../types';

/** Convert a hex color string to HSL (h: 0-360, s: 0-100, l: 0-100) */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    // Achromatic
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6;
  } else {
    h = ((r - g) / d + 4) / 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Get combat type points for a hex color.
 *
 * Algorithm:
 * 1. Convert hex to HSL
 * 2. Check achromatic (S < 10%)
 * 3. Check warm neutrals (brown, gold)
 * 4. Map by hue range
 * 5. Apply neon bonus (S > 90% adds +1 to primaryPts)
 */
export function getTypePointsForColor(hex: string): TypePoints {
  const { h, s, l } = hexToHSL(hex);

  // Near-white (L > 90%) or near-black (L < 5%) are effectively achromatic
  // regardless of computed S (HSL math produces high S at extreme lightness).
  // Also treat very dark near-black colors (#171717 = L≈9%) as achromatic.
  const effectivelyAchromatic = s < 10 || l > 90 || l < 5;

  // Neon bonus: S > 90% AND L >= 50% (bright, vivid colors only — dark saturated
  // colors like #CC2200 read as "deep" not "neon")
  const isNeon = s > 90 && l >= 50 && !effectivelyAchromatic;

  // --- Achromatic ---
  // 6-band ramp (light → dark): ICE → AIR → METAL → NEUTRAL → STONE → SHADOW
  // Each band is ~18% lightness wide. Covers all 6 achromatic types fairly.
  if (effectivelyAchromatic) {
    if (l > 88) return { primary: 'ICE',     primaryPts: 3, secondary: 'AIR',     secondaryPts: 1 };
    if (l > 70) return { primary: 'AIR',     primaryPts: 3, secondary: 'ICE',     secondaryPts: 1 };
    if (l > 55) return { primary: 'METAL',   primaryPts: 3, secondary: 'NEUTRAL', secondaryPts: 1 };
    if (l > 38) return { primary: 'NEUTRAL', primaryPts: 3, secondary: 'STONE',   secondaryPts: 1 };
    if (l > 20) return { primary: 'STONE',   primaryPts: 3, secondary: 'GHOST',   secondaryPts: 1 };
               return { primary: 'SHADOW',  primaryPts: 3, secondary: 'GHOST',   secondaryPts: 1 };
  }

  // --- Warm neutrals ---
  // Brown: S 10-50%, H 15-45, L 20-50%
  if (s >= 10 && s <= 50 && h >= 15 && h <= 45 && l >= 20 && l <= 50) {
    return { primary: 'EARTH', primaryPts: 3, secondary: 'NEUTRAL', secondaryPts: 1 };
  }

  // Gold: S > 50%, H 40-55, L 45-65%
  if (s > 50 && h >= 40 && h <= 55 && l >= 45 && l <= 65) {
    return { primary: 'DRAGON', primaryPts: 3, secondary: 'METAL', secondaryPts: 1 };
  }

  // Dark saturated crimson → MARTIAL
  // Deep blood reds (H 0-15° and 348-360°, L < 30%, S > 55%) read as martial/combat rather than fire.
  // Covers Row 14 (Crimsons): #7B1111 through #1A0000.
  if ((h <= 15 || h > 348) && l < 30 && s > 55) {
    return { primary: 'MARTIAL', primaryPts: 3, secondary: 'FIRE', secondaryPts: 1 };
  }

  // Dark saturated violet/indigo → GHOST
  // Deep indigo / blackcurrant colors (H 260-285°, L < 40%, S > 55%) read as ghost/spirit/void.
  // Covers Row 10 (Indigos): #4B0082 through #0D001A.
  if (h >= 260 && h <= 285 && l < 40 && s > 55) {
    return { primary: 'GHOST', primaryPts: 3, secondary: 'SHADOW', secondaryPts: 1 };
  }

  // --- Hue-based mapping ---
  let primary: CombatType;
  let secondary: CombatType;

  if (h < 20 || h >= 340) {
    primary = 'FIRE';
    secondary = 'SHADOW';
  } else if (h < 45) {
    primary = 'DRAGON';
    secondary = 'FIRE';
  } else if (h < 65) {
    primary = 'ELECTRIC';
    secondary = 'EARTH';
  } else if (h < 90) {
    primary = 'INSECT';
    secondary = 'GRASS';
  } else if (h < 150) {
    primary = 'GRASS';
    secondary = 'EARTH';
  } else if (h < 195) {
    primary = 'WATER';
    secondary = 'ICE';
  } else if (h < 230 && l > 60) {
    // Sky blues (H 195-230°, L > 60%): light, airy blues → AIR
    // Covers Row 7 (Sky Blues): #E0F7FF through #38BDF8
    primary = 'AIR';
    secondary = 'WATER';
  } else if (h < 250) {
    primary = 'WATER';
    secondary = 'PSYCHE';
  } else if (h < 280) {
    primary = 'PSYCHE';
    secondary = 'GHOST';
  } else if (h < 320) {
    primary = 'VENOM';
    secondary = 'MYSTIC';
  } else {
    primary = 'MYSTIC';
    secondary = 'FIRE';
  }

  const primaryPts = 3 + (isNeon ? 1 : 0);

  return { primary, primaryPts, secondary, secondaryPts: 1 };
}
