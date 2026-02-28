/**
 * Mask layer data — categories, variants, and helpers
 *
 * Shared between MaskVariantPicker (UI) and GeneratorRightPanel (guard logic).
 */

import { MASK_LAYER_BASE } from '@/config/layerAssetBase';

export const MASK_BASE_PATH = MASK_LAYER_BASE;

/** Mask categories with their variants */
export type MaskCategory = 'tanginium' | 'medievalBepe' | 'skull';

export interface MaskVariant {
  file: string;
  label: string;
  subfolder?: string;
}

export const MASK_CATEGORIES: Record<MaskCategory, { label: string; variants: MaskVariant[] }> = {
  tanginium: {
    label: 'Tanginium',
    variants: [
      { file: 'Tanginium_king.png', label: 'King' },
      { file: 'Tanginium_sad.png', label: 'Sad' },
    ],
  },
  medievalBepe: {
    label: 'Medieval Bepe',
    variants: [
      { file: 'MedievalBepe_cowboy.png', label: 'Cowboy' },
      { file: 'MedievalBepe_emo.png', label: 'Emo' },
      { file: 'MedievalBepe_wizard.png', label: 'Wizard' },
    ],
  },
  skull: {
    label: 'Skull',
    variants: [
      { file: 'Mask-skull-01_Hypno.png', label: 'Hypno', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-02_Mystic.png', label: 'Mystic', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-03_Frost.png', label: 'Frost', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-04_Mayor.png', label: 'Mayor', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-05_Verdant.png', label: 'Verdant', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-06_Sorting.png', label: 'Sorting', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-07_Rally.png', label: 'Rally', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-08_Void.png', label: 'Void', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-09_Love.png', label: 'Love', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-10_Bengal.png', label: 'Bengal', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-11_Pumpkinl.png', label: 'Pumpkin', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-12_Gilded.png', label: 'Gilded', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-13_Goblin.png', label: 'Goblin', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-14_Damask.png', label: 'Damask', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-15_Zebra.png', label: 'Zebra', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-16_Eldritch.png', label: 'Eldritch', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-17_Waldo.png', label: 'Waldo', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-18_Lumos.png', label: 'Lumos', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-19_Gator.png', label: 'Gator', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-20_Mesmerpng.png', label: 'Mesmer', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-21_Arachno.png', label: 'Arachno', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-22_THE.png', label: 'THE', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-23_Storm.png', label: 'Storm', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-24_Inferno.png', label: 'Inferno', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-25_Scream.png', label: 'Scream', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-26_Sandworm.png', label: 'Sandworm', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-27_Voorhees.png', label: 'Voorhees', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-28_Enchanter.png', label: 'Enchanter', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-29_313.png', label: '313', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-30_Magus.png', label: 'Magus', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-31_Astro.png', label: 'Astro', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-32_Nocturnis.png', label: 'Nocturnis', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-33_Ghost.png', label: 'Ghost', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-34_ET.png', label: 'ET', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-35_Cosmic.png', label: 'Cosmic', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-36_Hedera.png', label: 'Hedera', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-37_Martian.png', label: 'Martian', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-38_Magenta.png', label: 'Magenta', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-39_Speechless.png', label: 'Speechless', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-40_Aster.png', label: 'Aster', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-41_Static.png', label: 'Static', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-42_Rage.png', label: 'Rage', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-43_Gooey.png', label: 'Gooey', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-44_Tang.png', label: 'Tang', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-45_9mm.png', label: '9mm', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-46_Skelly.png', label: 'Skelly', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-47_Degen.png', label: 'Degen', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-48_Neck.png', label: 'Neck', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-49_Crown.png', label: 'Crown', subfolder: 'Mask-skull' },
      { file: 'Mask-skull-50_Bepe.png', label: 'Bepe', subfolder: 'Mask-skull' },
    ],
  },
};

/** Get full path for a mask variant */
export function getMaskPath(variant: MaskVariant): string {
  return variant.subfolder
    ? `${MASK_BASE_PATH}/${variant.subfolder}/${variant.file}`
    : `${MASK_BASE_PATH}/${variant.file}`;
}

/** All full-face mask path substrings (hand mask + all category variants) */
const FULL_FACE_MASK_SUBSTRINGS = [
  'Wojak_hand_mask',
  ...Object.values(MASK_CATEGORIES).flatMap((cat) =>
    cat.variants.map((v) => v.file.replace('.png', ''))
  ),
];

export function isFullFaceMaskSelected(maskPath: string | undefined): boolean {
  if (!maskPath) return false;
  return FULL_FACE_MASK_SUBSTRINGS.some((s) => maskPath.includes(s));
}

/** Find which category the selected mask belongs to */
export function getSelectedCategory(selectedPath: string | undefined): MaskCategory | null {
  if (!selectedPath) return null;
  for (const [key, cat] of Object.entries(MASK_CATEGORIES)) {
    if (cat.variants.some((v) => selectedPath.includes(v.file.replace('.png', '')))) {
      return key as MaskCategory;
    }
  }
  return null;
}
