/**
 * Trait Mapping — G1 to G2
 *
 * Hardcoded mapping for traits where G1 and G2 use different names.
 * Traits that match by simple normalization (e.g. "Bathrobe" = "Bathrobe")
 * don't need an entry here — the merge logic handles those automatically.
 *
 * Key: G1 base name (stripped of color suffix, e.g. "CLOTHES_Bathrobe_blue.png" → "Bathrobe")
 * Value: G2 trait id from YourWojak manifest
 */

// ============ Clothes ============

export const CLOTHES_G1_TO_G2: Record<string, string> = {
  // Name differences
  'Straitjacket': 'Clothes_Straigth-jacket',
  'Firefigther-Uniform': 'Clothes_fire-figther',
  'SWAT-Gear-': 'Clothes_SWAT',
  'god-rope': 'Clothes_gods-robe',
  // G1 has separate Suit_black/Suit_orange; G2 has unified Suit
  'Suit': 'Clothes_Suit',
  'Military-Jacket': 'Clothes_Military-jacket',
};

// ============ Head ============

export const HEAD_G1_TO_G2: Record<string, string> = {
  'Anarchy-Spikes': 'Head_Spikes',
  'Vikings-Hat': 'Head_viking-helmet',
  'Wizard-Hat': 'Head_Wiz-Hat',
  'Wizard-Hat_man': 'Head_Wiz-Hat', // G1 manifest uses Wizard-Hat_man.png; merge into colorable G2
  'Super-Mario': 'Head_Super-wojak', // G1 Super Mario cap → merge into colorable Super Wojak Hat
  // Same name, just case difference
  'Firefigther-Helmet': 'Head_Firefigther-Helmet',
  'Devil-Horns': 'Head_Devil-horns',
  'Hard-Hat': 'Head_Hard-hat',
  'Pirate-Hat': 'Head_Pirate-hat',
  'Ronin-Helmet': 'Head_Ronin-helmet',
  'SWAT-Helmet': 'Head_SWAT-helmet',
  'Military-Beret': 'Head_military-beret',
};

// ============ Eyes (G1 EYE → G2 Face-wear / Face-laser) ============

export const EYE_G1_TO_G2: Record<string, string> = {
  '3D-Glasses': 'Face-wear_3d-glases',
  'Ninja-Turtle-mask': 'Face-wear_Ninja-Turtle-Mask',
  'Laser-Eyes': 'Face-laser_Laser-Eyes',
  'Alpha-Shades': 'Face-wear_alpha-shades',
  'Cyber-Shades': 'Face-wear_cyber-shades',
  'Matrix-Lenses': 'Face-wear_Matrix-Lenses',
  'Shades': 'Face-wear_shades',
  'Aviators': 'Face-wear_aviators',
  'MOG-Glasses': 'Face-wear_MOG-Glasses',
};

// ============ Mouth ============

export const MOUTH_G1_TO_G2: Record<string, string> = {
  'Bubble-Gum': 'Mouth_BubbleGum',
  'Pipe': 'Mouth_Pipe',
};

// ============ Unified lookup ============

/**
 * All G1-to-G2 mappings combined.
 * Used by the merge logic: given a G1 base name, returns the G2 trait id.
 */
export const G1_TO_G2_MAP: Record<string, string> = {
  ...CLOTHES_G1_TO_G2,
  ...HEAD_G1_TO_G2,
  ...EYE_G1_TO_G2,
  ...MOUTH_G1_TO_G2,
};

/**
 * Reverse lookup: G2 trait id → G1 base name.
 * Used for finding the G1 default thumbnail for a G2 trait.
 */
export const G2_TO_G1_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(G1_TO_G2_MAP).map(([g1, g2]) => [g2, g1])
);

/**
 * Normalize a trait name for fuzzy matching (lowercase, remove hyphens/underscores/spaces).
 * Used as fallback when no hardcoded mapping exists.
 */
export function normalizeTraitName(name: string): string {
  return name.toLowerCase().replace(/[-_\s]/g, '');
}
