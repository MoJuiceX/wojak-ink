/**
 * Shared trait resolution logic for mint endpoints.
 * Used by both prepare.ts (metadata build) and confirm.ts (trait usage increment).
 *
 * Maps generator layer paths to canonical Phase 1 trait_type + display name,
 * consolidates duplicates (rarer trait wins), and applies layer-aware overrides.
 */

import { lookupTraitName, lookupBackgroundColorName } from '../../lib/traitNameMap';

/**
 * Maps each generator layer to its Phase 1 trait_type.
 * Base → "Face" because the base files (classic, rekt, etc.) are the face expression.
 * A fixed "Base: Wojak" entry should always be injected separately.
 */
export const LAYER_TO_TRAIT_TYPE: Record<string, string> = {
  Base: 'Face',
  Eyes: 'Face Wear',
  Mask: 'Face Wear',
  MouthBase: 'Mouth',
  MouthItem: 'Mouth',
  FacialHair: 'Mouth',
  Head: 'Head',
  Clothes: 'Clothes',
  Background: 'Background',
};

/**
 * Layer-specific overrides — applied AFTER the TRAIT_NAME_MAP lookup.
 * The key is the mapped display name; the value is the corrected name for that layer.
 */
export const LAYER_OVERRIDES: Record<string, Record<string, string>> = {
  Clothes: {
    'Super Saiyan': 'Super Saiyan Uniform',
  },
  Head: {
    'SWAT Gear': 'SWAT Helmet',
  },
};

/**
 * Phase 1 rarity counts (out of 4200 NFTs).
 * Used for consolidation: when multiple layers map to the same trait_type,
 * the rarer trait (lower count) wins. Traits not in Phase 1 default to 0 (rarest).
 */
export const PHASE1_RARITY: Record<string, number> = {
  // Mouth
  'Numb': 490, 'Cig': 414, 'Screaming': 348, 'Joint': 303, 'Cohiba': 302,
  'Gold Teeth': 275, 'Teeth': 248, 'Pizza': 220, 'Bubble Gum': 187,
  'Neckbeard': 184, 'Pipe': 183, 'Smile': 179, 'Glossed Lips': 147,
  'Vampire Teeth': 146, 'Stache': 138, 'Bandana Mask': 106, 'Copium Mask': 105,
  'Stunned': 90, 'Hannibal Mask': 76, 'Sexy Lip Bite': 59,
  // Face Wear
  'No Face Wear': 9999, 'MOG Glasses': 302, 'Shades': 267, 'Alpha Shades': 222,
  'Aviators': 194, 'Matrix Lenses': 180, 'Clown Nose': 180, '3D Glasses': 164,
  'Cool Glasses': 161, 'Cyber Shades': 157, 'Laser Eyes': 149, 'Wizard Glasses': 145,
  'Ninja Turtle Mask': 143, 'Eye Patch': 122, 'Night Vision': 121, 'Tyson Tattoo': 97,
  'VR Headset': 67, 'Fake It Mask': 39,
  // Skulls (G2-only, rare)
  'Skull Mask': 0, 'MedievalBepe Cowboy': 0, 'MedievalBepe Emo': 0,
  'MedievalBepe Wizard': 0, 'Tanginium King': 0, 'Tanginium Sad': 0,
};

/**
 * Resolve a generator layer path to its canonical Phase 1 trait name.
 * Uses the definitive TRAIT_NAME_MAP — same source as MetadataPreview.
 *
 * Fallback: if the map doesn't contain the identifier, use the cleaned
 * filename title-cased (for new traits not yet in Phase 1).
 */
export function resolveTraitName(filepath: string, layerKey: string, bgColorHex?: string): string {
  // Price overlay backgrounds: always show "Price Up" or "Price Down"
  if (layerKey === 'Background' && filepath.includes('__price_up__')) {
    return 'Price Up';
  }
  if (layerKey === 'Background' && filepath.includes('__price_down__')) {
    return 'Price Down';
  }
  // Solid color backgrounds: use hex color → named color lookup
  if (layerKey === 'Background' && filepath.includes('__solid__')) {
    if (bgColorHex) {
      const colorName = lookupBackgroundColorName(bgColorHex);
      if (colorName) return colorName;
      return bgColorHex.toUpperCase(); // Fallback to raw hex
    }
    return 'Solid Color';
  }

  const normalized = extractNormalized(filepath);

  const mapped = lookupTraitName(normalized);
  if (mapped) {
    return LAYER_OVERRIDES[layerKey]?.[mapped] || mapped;
  }

  // Fallback: title-case (for traits not in Phase 1)
  return normalized.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Normalize a filepath to a lowercase lookup key for TRAIT_NAME_MAP.
 */
function extractNormalized(filepath: string): string {
  if (filepath.startsWith('/g2/')) {
    return (filepath.split('/').pop() || '').replace(/[-_]/g, ' ').trim().toLowerCase();
  }

  const filename = filepath.split('/').pop()?.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '') || '';
  let stripped = filename.replace(/^[A-Z]+_/, '');
  stripped = stripped.replace(/^MOUTH_/i, '');
  stripped = stripped.replace(/^Base-Wojak[_\s]*/i, '');
  return stripped.replace(/[-_]/g, ' ').trim().toLowerCase();
}

export interface ConsolidatedTrait {
  traitType: string;
  displayName: string;
}

/**
 * Resolve and consolidate generator layers into Phase 1 traits.
 * When multiple layers map to the same trait_type, the rarer trait (lower count) wins.
 * Always injects "Base: Wojak" as a fixed attribute.
 */
export function consolidateTraits(
  layers: Record<string, string>,
  colors?: Record<string, string>
): Map<string, ConsolidatedTrait> {
  const consolidated = new Map<string, ConsolidatedTrait>();

  for (const [layer, filepath] of Object.entries(layers)) {
    if (!filepath) continue;
    const traitType = LAYER_TO_TRAIT_TYPE[layer];
    if (!traitType) continue;

    const bgColorHex = layer === 'Background' ? colors?.Background : undefined;
    const displayName = resolveTraitName(filepath, layer, bgColorHex);

    const existing = consolidated.get(traitType);
    if (!existing) {
      consolidated.set(traitType, { traitType, displayName });
    } else {
      const existingRarity = PHASE1_RARITY[existing.displayName] ?? 0;
      const newRarity = PHASE1_RARITY[displayName] ?? 0;
      if (newRarity < existingRarity) {
        consolidated.set(traitType, { traitType, displayName });
      }
    }
  }

  // Fixed "Base: Wojak"
  consolidated.set('Base', { traitType: 'Base', displayName: 'Wojak' });

  return consolidated;
}
