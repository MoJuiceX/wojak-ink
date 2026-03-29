import type { G2Selections } from '@/types/generator';
import type { AICategory } from '@/types/aiEnhance';
import { KNOWN_TRAIT_IDS } from '@/lib/generatorTraitIds';

interface AIEnhanceRestriction {
  blockedCategories: AICategory[];
  reason: string;
}

const CLOTHES_TRAIT_AI_RESTRICTIONS: Record<string, AIEnhanceRestriction> = {
  [KNOWN_TRAIT_IDS.Clothes_BepeSuit]: {
    blockedCategories: ['clothes', 'head'],
    reason: 'This suit currently supports background AI only.',
  },
  'Clothes_Pepe-suit': {
    blockedCategories: ['clothes', 'head'],
    reason: 'This suit currently supports background AI only.',
  },
  'Clothes_Goose-suit': {
    blockedCategories: ['clothes', 'head'],
    reason: 'This suit currently supports background AI only.',
  },
  'Clothes_Drac-suit': {
    blockedCategories: ['clothes', 'head'],
    reason: 'This suit currently supports background AI only.',
  },
  'Clothes_Pickle-suit': {
    blockedCategories: ['clothes', 'head'],
    reason: 'This suit currently supports background AI only.',
  },
  'Clothes_Proof-of-prayer': {
    blockedCategories: ['clothes', 'head'],
    reason: 'This suit currently supports background AI only.',
  },
  'Clothes_gopher-suit': {
    blockedCategories: ['clothes', 'head'],
    reason: 'This suit currently supports background AI only.',
  },
};

export function getAIEnhanceRestriction(
  g2Selections?: G2Selections | null,
): AIEnhanceRestriction | null {
  const clothesTraitId = g2Selections?.Clothes?.traitId;
  if (!clothesTraitId) return null;
  return CLOTHES_TRAIT_AI_RESTRICTIONS[clothesTraitId] ?? null;
}
