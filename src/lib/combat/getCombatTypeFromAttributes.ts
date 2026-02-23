/**
 * Derive primary combat type from MintGarden-style NFT attributes.
 * Used by Your Wojak section to filter by type (Fire, Water, etc.).
 */

import type { CombatType } from './types';
import { COMBAT_TYPES } from './types';
import { getTraitCombat } from './data/trait-type-map';

export interface MintGardenAttribute {
  trait_type: string;
  value: string;
}

/** Map API trait_type to trait-type-map layer names */
const LAYER_MAP: Record<string, string> = {
  background: 'Background',
  face: 'Base',
  base: 'Base',
  facewear: 'Face-wear',
  'face wear': 'Face-wear',
  eyes: 'Eyes',
  headwear: 'Head',
  head: 'Head',
  mouth: 'Mouth',
  clothing: 'Clothes',
  clothes: 'Clothes',
  mask: 'Mask',
  'facial hair': 'Facial-Hair',
  mouthitem: 'MouthItem',
  'mouth item': 'MouthItem',
  'face-laser': 'Face-laser',
};

function toTraitIdKey(traitType: string, value: string): string {
  const layer = LAYER_MAP[traitType.toLowerCase().trim()] ?? traitType.trim().replace(/\s+/g, '-');
  const valueNorm = value.trim().replace(/\s+/g, '-');
  return `${layer}_${valueNorm}`;
}

/**
 * Returns the primary combat type for an NFT given its attributes.
 * Aggregates type points from all traits in the combat map; highest score wins.
 * NFTs with no matching traits return NEUTRAL.
 */
export function getCombatTypeFromAttributes(
  attributes: MintGardenAttribute[]
): CombatType {
  const typeScores: Record<CombatType, number> = {} as Record<CombatType, number>;
  for (const t of COMBAT_TYPES) typeScores[t] = 0;

  for (const attr of attributes) {
    const traitId = toTraitIdKey(attr.trait_type, attr.value);
    let entry = getTraitCombat(traitId);
    if (!entry) {
      const fallbackId = traitId.replace(/^([^_]+)_/, (_, layer) => `${layer}_${attr.value.trim().replace(/\s+/g, '-').toLowerCase()}`);
      entry = getTraitCombat(fallbackId);
    }
    if (!entry) continue;
    typeScores[entry.typePoints.primary] += entry.typePoints.primaryPts;
    if (entry.typePoints.secondary && entry.typePoints.secondaryPts) {
      typeScores[entry.typePoints.secondary] += entry.typePoints.secondaryPts;
    }
  }

  let type: CombatType = 'NEUTRAL';
  let maxScore = -1;
  for (const t of COMBAT_TYPES) {
    if (typeScores[t] > maxScore) {
      maxScore = typeScores[t];
      type = t;
    }
  }
  return type;
}
