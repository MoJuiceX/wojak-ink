/**
 * G2 Fill Treatments
 *
 * Per-trait, per-fill-slot config: which fills the user picks vs derived (e.g. fill2 = darker_shade of fill1).
 * Edit this file as we go through each trait with the audit.
 *
 * - user: user picks color (show ColorPicker)
 * - derived: color is computed from another fill (source) using treatment (no picker)
 */

export type FillTreatmentType =
  | 'darker_shade'
  | 'lighter_shade'
  | 'complementary'
  | 'split_complementary'
  | 'warm_shift'
  | 'cool_shift'
  | 'desaturated'
  | 'same_as';

export interface FillSlotConfig {
  type: 'user';
}

export interface DerivedFillSlotConfig {
  type: 'derived';
  /** Which fill key to derive from (e.g. 'fill1', 'fill') */
  source: string;
  treatment: FillTreatmentType;
  /** For darker_shade, lighter_shade, desaturated (default 30) */
  amount?: number;
}

export interface FixedFillSlotConfig {
  type: 'fixed';
  /** Exact color to use (no picker, no derivation) */
  fixedColor: string;
}

export type FillSlotBehavior = FillSlotConfig | DerivedFillSlotConfig | FixedFillSlotConfig;

/**
 * traitId -> fillKey -> behavior
 * Fill keys: 'fill' (single), 'fill1'/'fill2' (dual), 'fill0'/'fill1'/'fill2' (multi-fill array)
 * If a trait or slot is missing, default is user (show picker).
 * Add/edit entries as we go through each trait with the audit.
 */
export const G2_FILL_TREATMENTS: Record<string, Record<string, FillSlotBehavior>> = {
  // Bathrobe: user picks fill1 only; fill2 auto darker
  Clothes_Bathrobe: {
    fill1: { type: 'user' },
    fill2: { type: 'derived', source: 'fill1', treatment: 'darker_shade', amount: 25 },
  },
  // Ronin: user picks all three fills (defaults: #404040, #262626, #808080)
  Clothes_Ronin: {
    fill0: { type: 'user' },
    fill1: { type: 'user' },
    fill2: { type: 'user' },
  },
  // Ninja turtle fit: user picks fill0 only; fill1 desat 15, fill2 desat 30
  'Clothes_Ninja-turtle-fit': {
    fill0: { type: 'user' },
    fill1: { type: 'derived', source: 'fill0', treatment: 'desaturated', amount: 15 },
    fill2: { type: 'derived', source: 'fill0', treatment: 'desaturated', amount: 30 },
  },
  // Laser Eyes: user picks fill0 only; fill1 lighter 10%, fill2 lighter 40%
  'Face-laser_Laser-Eyes': {
    fill0: { type: 'user' },
    fill1: { type: 'derived', source: 'fill0', treatment: 'lighter_shade', amount: 10 },
    fill2: { type: 'derived', source: 'fill0', treatment: 'lighter_shade', amount: 40 },
  },
  // Viking helmet: user picks fill1; fill2 darker_shade from fill1 (amount 5)
  'Head_viking-helmet': {
    fill1: { type: 'user' },
    fill2: { type: 'derived', source: 'fill1', treatment: 'darker_shade', amount: 5 },
  },
  // Military jacket: user picks fill0 (blue default); fill1 complementary of fill0; fill2 fixed red; fill3 complementary of fill2; fill4 fixed yellow
  'Clothes_Military-jacket': {
    fill0: { type: 'user' },
    fill1: { type: 'derived', source: 'fill0', treatment: 'complementary' },
    fill2: { type: 'fixed', fixedColor: '#FF0000' },
    fill3: { type: 'derived', source: 'fill2', treatment: 'complementary' },
    fill4: { type: 'fixed', fixedColor: '#FDE047' },
  },
  // SWAT: user picks fill1; fill2 10% darker from fill1
  Clothes_SWAT: {
    fill1: { type: 'user' },
    fill2: { type: 'derived', source: 'fill1', treatment: 'darker_shade', amount: 10 },
  },
  // Viking Armor: user picks fill1; fill2 darker_shade from fill1 (amount 5)
  'Clothes_Viking-Armor': {
    fill1: { type: 'user' },
    fill2: { type: 'derived', source: 'fill1', treatment: 'darker_shade', amount: 5 },
  },
  // 3d glasses: user picks fill1 (blue default); fill2 split_complementary of fill1
  'Face-wear_3d-glases': {
    fill1: { type: 'user' },
    fill2: { type: 'derived', source: 'fill1', treatment: 'split_complementary' },
  },
  // Super Saiyan (head): user picks fill1 (yellow); fill2 darker_shade from fill1 (amount 12)
  'Head_Super-Saiyan': {
    fill1: { type: 'user' },
    fill2: { type: 'derived', source: 'fill1', treatment: 'darker_shade', amount: 12 },
  },
  // VR headset: user picks fill0 (yellow); fill1/fill2/fill3 darker_shade from fill0 (amount 5)
  'Face-wear_VR-headset': {
    fill0: { type: 'user' },
    fill1: { type: 'derived', source: 'fill0', treatment: 'darker_shade', amount: 5 },
    fill2: { type: 'derived', source: 'fill0', treatment: 'darker_shade', amount: 5 },
    fill3: { type: 'derived', source: 'fill0', treatment: 'darker_shade', amount: 5 },
  },
};

export function getFillSlotBehavior(traitId: string, fillKey: string): FillSlotBehavior {
  const trait = G2_FILL_TREATMENTS[traitId];
  if (!trait) return { type: 'user' };
  const slot = trait[fillKey];
  if (!slot) return { type: 'user' };
  return slot;
}

export function isUserPickableFill(traitId: string, fillKey: string): boolean {
  return getFillSlotBehavior(traitId, fillKey).type === 'user';
}

/** Layer keys (mfill0, etc.) map to canonical fill keys used by colors storage and renderer */
const LAYER_KEY_TO_FILL: Record<string, string> = {
  mfill0: 'fill0', mfill1: 'fill1', mfill2: 'fill2', mfill3: 'fill3', mfill4: 'fill4',
  fill1: 'fill1', fill2: 'fill2',
};

/**
 * Return ordered fill slot keys that are user-pickable for this trait.
 * Uses canonical keys (fill0, fill1, etc.) so color picker matches storage/renderer.
 */
export function getAllUserPickableFillSlots(
  traitId: string,
  trait: {
    fillFile?: string;
    fill1File?: string;
    fill2File?: string;
    fillFiles?: string[];
    layers?: { type: string; key: string }[];
  } | null
): string[] {
  if (!trait) return [];
  const keys: string[] = [];
  // Prefer layers when trait has fill layers with named keys (fill1, fill2, mfill0, etc.)
  // so slots match treatments/canvas (e.g. Face-wear_3d-glases uses fill1/fill2, not fill0/fill1)
  if (trait.layers?.length) {
    const fillLayers = trait.layers.filter((l): l is { pos: number; key: string; type: string } => l.type === 'fill' && !!l.key);
    if (fillLayers.length > 0) {
      for (const l of fillLayers.sort((a, b) => a.pos - b.pos)) {
        const canonical = LAYER_KEY_TO_FILL[l.key] ?? l.key;
        keys.push(canonical);
      }
      return keys.filter((k) => isUserPickableFill(traitId, k));
    }
  }
  if (trait.fillFiles?.length) {
    for (let i = 0; i < trait.fillFiles.length; i++) keys.push(`fill${i}`);
  } else if (trait.fill1File && trait.fill2File) {
    keys.push('fill1', 'fill2');
  } else if (trait.fillFile) {
    keys.push('fill');
  } else if (trait.layers?.length) {
    for (const l of trait.layers) {
      if (l.type === 'fill' && l.key) {
        const canonical = LAYER_KEY_TO_FILL[l.key] ?? l.key;
        keys.push(canonical);
      }
    }
  }
  return keys.filter((k) => isUserPickableFill(traitId, k));
}
