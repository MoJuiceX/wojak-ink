// src/lib/combat/data/color-nature-map.ts
// Maps hex colors to nature stat points using HSL analysis.
// See docs/COLOR-NATURE-STAT-MAPPING.csv for the full mapping table.

import type { StatName, NatureStatPoints } from '../types';
import { hexToHSL } from './color-type-map';

/**
 * Get nature stat points for a hex color.
 *
 * Algorithm:
 * 1. Convert hex to HSL
 * 2. Check achromatic (S < 10%)
 * 3. Check warm neutrals (brown, gold)
 * 4. Map by hue range
 * 5. Apply neon override (S > 90%: primary becomes speed +2,
 *    hue's normal primary stat becomes secondary +1)
 */
export function getNaturePointsForColor(hex: string): NatureStatPoints {
  const { h, s, l } = hexToHSL(hex);

  // Near-white (L > 90%) or near-black (L < 5%) are effectively achromatic
  const effectivelyAchromatic = s < 10 || l > 90 || l < 5;

  // Neon: S > 90% AND L >= 50% (bright vivid only, not dark saturated)
  const isNeon = s > 90 && l >= 50 && !effectivelyAchromatic;

  // --- Achromatic ---
  if (effectivelyAchromatic) {
    if (l > 85) {
      return { primary: 'sp_def', primaryPts: 2, secondary: 'sp_atk', secondaryPts: 1 };
    }
    if (l >= 60) {
      return { primary: 'defense', primaryPts: 2, secondary: 'sp_def', secondaryPts: 1 };
    }
    if (l >= 25) {
      return { primary: 'defense', primaryPts: 2, secondary: 'attack', secondaryPts: 1 };
    }
    // Black (L < 25%)
    return { primary: 'attack', primaryPts: 2, secondary: 'speed', secondaryPts: 1 };
  }

  // --- Warm neutrals ---
  // Brown: S 10-50%, H 15-45, L 20-50%
  if (s >= 10 && s <= 50 && h >= 15 && h <= 45 && l >= 20 && l <= 50) {
    return { primary: 'defense', primaryPts: 2, secondary: 'attack', secondaryPts: 1 };
  }

  // Gold: S > 50%, H 40-55, L 45-65%
  if (s > 50 && h >= 40 && h <= 55 && l >= 45 && l <= 65) {
    return { primary: 'sp_atk', primaryPts: 2, secondary: 'attack', secondaryPts: 1 };
  }

  // --- Determine hue-based primary stat ---
  let huePrimary: StatName;
  let hueSecondary: StatName | undefined;

  if (h < 20 || h >= 340) {
    // Red: attack only, no secondary
    huePrimary = 'attack';
    hueSecondary = undefined;
  } else if (h < 45) {
    huePrimary = 'attack';
    hueSecondary = 'speed';
  } else if (h < 65) {
    huePrimary = 'speed';
    hueSecondary = 'sp_atk';
  } else if (h < 90) {
    huePrimary = 'speed';
    hueSecondary = 'attack';
  } else if (h < 150) {
    huePrimary = 'sp_def';
    hueSecondary = 'defense';
  } else if (h < 195) {
    huePrimary = 'sp_def';
    hueSecondary = 'speed';
  } else if (h < 250) {
    huePrimary = 'sp_def';
    hueSecondary = 'sp_atk';
  } else if (h < 280) {
    huePrimary = 'sp_atk';
    hueSecondary = 'sp_def';
  } else if (h < 320) {
    huePrimary = 'sp_atk';
    hueSecondary = 'attack';
  } else {
    huePrimary = 'sp_atk';
    hueSecondary = 'sp_def';
  }

  // --- Neon override (S > 90%): speed becomes primary, hue primary becomes secondary ---
  if (isNeon) {
    return {
      primary: 'speed',
      primaryPts: 2,
      secondary: huePrimary,
      secondaryPts: 1,
    };
  }

  // --- Normal hue mapping ---
  const result: NatureStatPoints = {
    primary: huePrimary,
    primaryPts: 2,
  };

  if (hueSecondary !== undefined) {
    result.secondary = hueSecondary;
    result.secondaryPts = 1;
  }

  return result;
}
