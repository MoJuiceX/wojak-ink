/**
 * Selection Resolver — single view over selectedLayers + g2Selections.
 *
 * Exposes getTraitId(layer) and getPath(layer) so rules and layer builder
 * use trait identity instead of path substrings. Trait IDs for rules live in
 * generatorTraitIds; see docs/GENERATOR-ARCHITECTURE.md and docs/GENERATOR-CHECKLIST.md.
 */

import type { UILayerName } from '@/lib/layerRegistry';
import type { SelectedLayers } from '@/lib/wojakRules';
import { isSelectionPathEmpty, type G2Selections, type SelectionsSnapshot } from '@/types/generator';

export interface SelectionResolver {
  getTraitId(layer: UILayerName): string | null;
  /** Path for a UI layer; for virtual layers (e.g. ClothesAddon) pass the key as string. */
  getPath(layer: UILayerName | string): string | undefined;
}

/**
 * Path → traitId map for G1 traits (built when unified traits are loaded).
 * Key: asset path or virtual path; Value: trait id (e.g. "g1_Bathrobe" or "Clothes_Bathrobe").
 */
export type PathToTraitIdMap = Map<string, string>;

/**
 * Create a resolver that provides trait identity (G1 + G2) and path per layer.
 * - G2: getTraitId from g2Selections[layer].traitId
 * - G1: getTraitId from pathToTraitIdMap.get(selectedLayers[layer])
 * - getPath: selectedLayers[layer]
 */
export function createSelectionResolver(
  selectedLayers: SelectedLayers,
  g2Selections?: G2Selections | null,
  pathToTraitIdMap?: PathToTraitIdMap | null
): SelectionResolver {
  const pathMap = pathToTraitIdMap ?? new Map<string, string>();

  return {
    getTraitId(layer: UILayerName): string | null {
      const g2 = g2Selections?.[layer];
      if (g2?.traitId) return g2.traitId;
      const path = selectedLayers[layer as keyof SelectedLayers];
      if (path) {
        const tid = pathMap.get(path);
        if (tid) return tid;
      }
      return null;
    },

    getPath(layer: UILayerName | string): string | undefined {
      const path = selectedLayers[layer as keyof SelectedLayers];
      return path && !isSelectionPathEmpty(path) ? path : undefined;
    },
  };
}

/**
 * Create a resolver from unified selections (Phase 5).
 * Use when state is already unified; no pathToTraitIdMap needed for reading.
 */
export function createSelectionResolverFromUnified(selections: SelectionsSnapshot): SelectionResolver {
  return {
    getTraitId(layer: UILayerName): string | null {
      const sel = selections[layer];
      return sel?.traitId ?? null;
    },

    getPath(layer: UILayerName | string): string | undefined {
      const sel = selections[layer as UILayerName];
      const path = sel?.path;
      return path && !isSelectionPathEmpty(path) ? path : undefined;
    },
  };
}
