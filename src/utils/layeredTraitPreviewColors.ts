/**
 * Default preview colors for layered colorable traits (Ninja Turtle, Viking helmet, etc).
 * Used in TraitSelector grid so preview matches the main canvas.
 */

import { getG2DefaultColor } from '@/config/g2DefaultColors';
import { getDerivedColor } from '@/services/canvasRenderer';
import { G2_FILL_TREATMENTS } from '@/lib/g2FillTreatments';
import type { TraitManifestColors } from '@/config/g2DefaultColors';
import type { UnifiedTrait } from '@/services/generatorService';

/** Layer key -> fill slot mapping per trait. Matches manifest layer keys. */
const LAYER_KEY_TO_SLOT: Record<string, Record<string, string>> = {
  'Clothes_Ninja-turtle-fit': { mfill0: 'fill0', mfill1: 'fill1', mfill2: 'fill2' },
  'Head_viking-helmet': { fill1: 'fill1', fill2: 'fill2' },
  'Face-laser_Laser-Eyes': { mfill0: 'fill0', mfill1: 'fill1', mfill2: 'fill2' },
  'Clothes_Military-jacket': { mfill0: 'fill0', mfill1: 'fill1', mfill2: 'fill2', mfill3: 'fill3', mfill4: 'fill4' },
  'Face-wear_3d-glases': { fill1: 'fill1', fill2: 'fill2' },
};

/**
 * Get the default preview color for a fill layer in a layered colorable trait.
 * Resolves user slots from manifest/defaults and derived slots from treatments.
 */
export function getPreviewColorForLayeredFill(
  trait: UnifiedTrait | TraitManifestColors,
  layerKey: string
): string {
  const traitId = 'id' in trait ? trait.id : '';
  const mapping = LAYER_KEY_TO_SLOT[traitId];
  const slot = mapping?.[layerKey];
  if (!slot) return (trait as TraitManifestColors).defaultColors?.[0] ?? '#A0522D';

  const treatments = G2_FILL_TREATMENTS[traitId];
  const config = treatments?.[slot as keyof typeof treatments];
  const manifest = trait as TraitManifestColors;

  if (config?.type === 'fixed' && 'fixedColor' in config) return config.fixedColor;
  if (!config || config.type === 'user') {
    return getG2DefaultColor(traitId, slot, manifest, '#A0522D');
  }

  if (config.type === 'derived' && config.source) {
    const sourceColor = getPreviewColorForLayeredFill(trait, getLayerKeyFromSlot(traitId, config.source));
    return getDerivedColor(sourceColor, config.treatment, config.amount ?? 30);
  }

  return getG2DefaultColor(traitId, slot, manifest, '#A0522D');
}

/** Reverse lookup: fill slot -> layer key for derived color resolution. */
function getLayerKeyFromSlot(traitId: string, slot: string): string {
  const mapping = LAYER_KEY_TO_SLOT[traitId];
  if (!mapping) return slot;
  const entry = Object.entries(mapping).find(([, s]) => s === slot);
  return entry ? entry[0] : slot;
}

/** Check if a layer is a fill (needs tint in preview). */
export function isLayerFill(layer: { type?: string }): boolean {
  return layer.type === 'fill';
}
