/**
 * G2 Default Colors
 *
 * Single source of truth: colors shown in trait grid preview = default colors on big canvas.
 * Add entries here as you define defaults for each trait. When omitted, manifest defaultColor
 * (or defaultColor2/defaultColors) is used.
 *
 * Format: traitId -> { slot: hex }
 * Slots: 'fill' (single), 'fill0'/'fill1'/'fill2' (multi), etc.
 */

export const G2_DEFAULT_COLORS: Record<string, Record<string, string>> = {
  // Clothes
  'Clothes_Chia-farmer': { fill0: '#22c55e', fill1: '#2563EB' },
  'Clothes_Tee': { fill: '#2563EB' },
  'Clothes_Tank-top': { fill: '#2563EB' },
  'Clothes_Super-Saiyan': { fill1: '#FFA500', fill2: '#0000CD' },
  'Head_Super-Saiyan': { fill1: '#FFFF00' },
  'Clothes_SWAT': { fill1: '#2563EB', fill2: '#00D4FF' },
  'Clothes_Suit': { fill0: '#171717', fill1: '#2563EB' },
  'Clothes_Leather-jacket': { fill: '#262626' },
  'Clothes_Military-jacket': { fill0: '#2563EB' },
  'Clothes_Bathrobe': { fill1: '#3b82f6' },
  'Clothes_Born-to-ride': { fill: '#171717' },
  'Clothes_Roman-drip': { fill: '#8B0000' },
  'Clothes_Ronin': { fill0: '#404040', fill1: '#262626', fill2: '#808080' },
  'Clothes_Sports-jacket': { fill: '#228B22' },
  'Clothes_Sonic-suit': { fill: '#2563EB' },
  'Clothes_Viking-Armor': { fill1: '#262626' },
  'Clothes_fire-figther': { fill: '#FF0000' },
  // Head
  'Head_Pirate-hat': { fill: '#171717' },
  'Head_Ronin-helmet': { fill: '#262626' },
  'Head_SWAT-helmet': { fill: '#171717' },
  'Head_Spikes': { fill: '#FF0000' },
  'Head_Standard-Cut': { fill: '#8B4513' },
  'Head_Super-wojak': { fill: '#FF0000' },
  'Head_Wiz-Hat': { fill: '#FFA500' },
  'Head_viking-helmet': { fill1: '#404040' },
  'Head_military-beret': { fill: '#1E90FF' },
  'Face-wear_Matrix-Lenses': { fill: '#FF0000' },
  'Face-wear_Ninja-Turtle-Mask': { fill: '#FF0000' },
  'Face-wear_VR-headset': { fill0: '#FFFF00' },
  'Face-wear_alpha-shades': { fill: '#FF0000' },
  'Face-wear_aviators': { fill: '#171717' },
  'Face-wear_cyber-shades': { fill: '#FFA500' },
  'Face-wear_night-vision': { fill: '#262626' },
  'Face-wear_shades': { fill: '#FF0000' },
  'Head_2Pac-Bandana': { fill1: '#FF6B00', fill2: '#00D4FF' },
  'Head_Beanie': { fill: '#A0522D' },
  'Head_Centurion': { fill: '#8B0000' },
  'Head_Cap': { fill: '#228B22' },
  'Head_Clown': { fill: '#8B0000' },
  'Head_Construction-Helmet': { fill: '#FFFF00' },
  'Head_Cowboy-Hat': { fill: '#A0522D' },
  'Head_Crown': { fill: '#FFFF00' },
  'Head_Devil-horns': { fill: '#FF0000' },
  'Head_Fedora': { fill: '#FF8C00' },
  'Head_Firefigther-Helmet': { fill: '#FF0000' },
  'Head_Hard-hat': { fill1: '#262626', fill2: '#00d4ff' },
  // Face-wear
  'Face-laser_Laser-Eyes': { fill0: '#32CD32' },
  'Face-wear_3d-glases': { fill1: '#2563EB' },
  'Clothes_Ninja-turtle-fit': { fill0: '#32CD32' },
  'Clothes_Wizard-drip': { fill: '#FFA500' },
  'Clothes_gods-robe': { fill: '#F5F5DC' },
  'Clothes_Straigth-jacket': { fill: '#FFFFFF' },
  'Mouth_Pipe': { fill: '#FF0000' },
  'Mouth_BubbleGum': { fill: '#FF1493' },
  // Add more as defaults are defined:
  // 'Clothes_Sonic-suit': { fill: '#2563EB' },
  // 'Clothes_Bathrobe': { fill1: '#...', fill2: derived },
  // ...
};

export interface TraitManifestColors {
  defaultColor?: string;
  defaultColor2?: string;
  defaultColors?: string[];
}

/**
 * Get the default color for a G2 trait slot.
 * Uses G2_DEFAULT_COLORS when defined, else falls back to manifest values.
 */
export function getG2DefaultColor(
  traitId: string,
  slot: string,
  trait: TraitManifestColors | null,
  fallback = '#FFFFFF'
): string {
  const overrides = G2_DEFAULT_COLORS[traitId];
  if (overrides?.[slot]) return overrides[slot];
  if (!trait) return fallback;
  if (trait.defaultColors?.length) {
    const idx = slot === 'fill' ? 0 : parseInt(slot.replace('fill', ''), 10);
    if (!isNaN(idx)) return trait.defaultColors[idx] ?? trait.defaultColors[0] ?? fallback;
  }
  if (slot === 'fill1') return trait.defaultColor2 ?? trait.defaultColor ?? fallback;
  return trait.defaultColor ?? fallback;
}
