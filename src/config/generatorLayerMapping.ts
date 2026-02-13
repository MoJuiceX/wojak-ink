/**
 * Generator layer mapping: G2 category and G1 manifest folder → UI layer.
 * Single place so adding a new G2 category or G1 folder is one entry.
 * See docs/GENERATOR-ARCHITECTURE.md.
 */

import type { UILayerName } from '@/lib/layerRegistry';

/** G2 manifest category name → UILayerName (used when merging G2 traits into unified traits). */
export const G2_CATEGORY_TO_UI: Record<string, UILayerName> = {
  'Clothes': 'Clothes',
  'Face-wear': 'Eyes',
  'Face-laser': 'Eyes',
  'Head': 'Head',
  'Mask': 'Mask',
  'Mouth': 'MouthBase',
};

/**
 * G1 manifest folder name → UILayerName for 1:1 folders.
 * MOUTH is not listed: it maps to MouthBase, MouthItem, Mask, FacialHair via classifyMouthItem in generatorService.
 */
export const G1_FOLDER_TO_UI: Record<string, UILayerName> = {
  'BACKGROUND': 'Background',
  'BASE': 'Base',
  'CLOTHES': 'Clothes',
  'EYE': 'Eyes',
  'HEAD': 'Head',
  'MASK': 'Mask',
};
