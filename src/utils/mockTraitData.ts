/**
 * Mock Trait Data
 *
 * Placeholder file - real data is loaded from generatorService.
 * This file is kept for compatibility but not used.
 */

import type { Trait, MouthSelection } from '@/types/generator';
import type { UILayerName } from '@/lib/wojakRules';

// Empty trait getter - not used, data comes from generatorService
export function getTraitById(id: string): Trait | null {
  void id;
  return null;
}

// Empty trait getter - not used
export function getRandomTrait(layer: UILayerName): Trait | null {
  void layer;
  return null;
}

// Empty mouth selection - not used
export function getRandomMouthSelection(): MouthSelection {
  return {
    underlay: null,
    base: null,
    overlay: null,
    exclusive: null,
  };
}
