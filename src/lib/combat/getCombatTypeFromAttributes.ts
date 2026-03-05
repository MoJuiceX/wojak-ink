/**
 * Derive primary combat type from MintGarden-style NFT attributes.
 * Used by Your Wojak section to filter by type (Fire, Water, etc.).
 */

import type { CombatType } from './types';
import { COMBAT_TYPES } from './types';
import { getTraitCombat, TRAIT_COMBAT_MAP } from './data/trait-type-map';
import { lookupTraitName } from '../traitNameMap';

export interface MintGardenAttribute {
  trait_type: string;
  value: string;
}

/** Normalize strings for fuzzy trait matching. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Map API trait_type to candidate combat-map layers.
 * Includes legacy consolidation paths, e.g. "Mouth" may contain mouth item / facial hair.
 */
const LAYER_CANDIDATES: Record<string, string[]> = {
  background: ['background'],
  face: ['base'],
  base: ['base'],
  facewear: ['eyes', 'mask'],
  eyes: ['eyes'],
  headwear: ['head'],
  head: ['head'],
  mouth: ['mouth', 'mouthitem', 'facialhair', 'mask'],
  clothing: ['clothes'],
  clothes: ['clothes'],
  mask: ['mask'],
  facialhair: ['facialhair'],
  mouthitem: ['mouthitem'],
  facelaser: ['eyes'],
  extra: ['extra'],
};

const FALLBACK_LAYER_NAMES: Record<string, string> = {
  background: 'Background',
  base: 'Base',
  eyes: 'Eyes',
  head: 'Head',
  mouth: 'Mouth',
  clothes: 'Clothes',
  mask: 'Mask',
  facialhair: 'Facial-Hair',
  mouthitem: 'MouthItem',
  extra: 'Extra',
};

/**
 * Value aliases for legacy naming deltas between metadata and combat map names.
 */
const VALUE_ALIASES: Record<string, string[]> = {
  swatgear: ['SWAT'],
  silicondatacenter: ['Silicon.net Data Center'],
};

type EntryIndex = Map<string, Array<ReturnType<typeof getTraitCombat>>>;

const traitEntryIndex: EntryIndex = (() => {
  const index = new Map<string, Array<ReturnType<typeof getTraitCombat>>>();
  const add = (layer: string, value: string, entry: ReturnType<typeof getTraitCombat>) => {
    if (!entry) return;
    const key = `${layer}:${value}`;
    const list = index.get(key) || [];
    list.push(entry);
    index.set(key, list);
  };

  Object.values(TRAIT_COMBAT_MAP).forEach(entry => {
    const layerNorm = normalize(entry.layer);
    const nameNorm = normalize(entry.name);
    const suffixNorm = normalize(entry.traitId.split('_').slice(1).join(' '));
    add(layerNorm, nameNorm, entry);
    add(layerNorm, suffixNorm, entry);
  });

  return index;
})();

function findIndexedEntry(layerNorm: string, valueNorm: string) {
  const matches = traitEntryIndex.get(`${layerNorm}:${valueNorm}`);
  if (!matches || matches.length === 0) return undefined;
  return matches[0];
}

function getLayerCandidates(traitType: string): string[] {
  const traitNorm = normalize(traitType);
  return LAYER_CANDIDATES[traitNorm] || [traitNorm];
}

function getValueCandidates(rawValue: string): string[] {
  const candidates = new Set<string>();
  const raw = rawValue.trim();
  const canonical = lookupTraitName(raw) ?? raw;

  candidates.add(raw);
  candidates.add(canonical);

  const canonicalNorm = normalize(canonical);
  const aliases = VALUE_ALIASES[canonicalNorm] || [];
  aliases.forEach(alias => candidates.add(alias));

  return Array.from(candidates);
}

function findTraitCombatEntry(attr: MintGardenAttribute) {
  const layerCandidates = getLayerCandidates(attr.trait_type);
  const valueCandidates = getValueCandidates(attr.value).map(normalize);

  for (const layer of layerCandidates) {
    for (const value of valueCandidates) {
      const indexed = findIndexedEntry(layer, value);
      if (indexed) return indexed;
    }
  }

  return undefined;
}

function toTraitIdKey(traitType: string, value: string): string {
  const layerCandidates = getLayerCandidates(traitType);
  const layer = FALLBACK_LAYER_NAMES[layerCandidates[0]] ?? traitType.trim().replace(/\s+/g, '-');
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
  const explicitTypeAttr = attributes.find(
    attr => attr.trait_type.toLowerCase().trim() === 'combat type'
  );
  if (explicitTypeAttr) {
    const normalized = explicitTypeAttr.value.toUpperCase().trim() as CombatType;
    if (COMBAT_TYPES.includes(normalized)) {
      return normalized;
    }
  }

  const typeScores: Record<CombatType, number> = {} as Record<CombatType, number>;
  for (const t of COMBAT_TYPES) typeScores[t] = 0;

  for (const attr of attributes) {
    let entry = findTraitCombatEntry(attr);
    if (!entry) {
      const traitId = toTraitIdKey(attr.trait_type, attr.value);
      entry = getTraitCombat(traitId);
    }
    if (!entry) {
      const traitId = toTraitIdKey(attr.trait_type, attr.value);
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
