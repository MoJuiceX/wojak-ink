/**
 * Selection adapter: unified state ↔ external/persistence shape.
 * toExternal(selections) → { selectedLayers, g2Selections } for mint API and legacy favorite format.
 * fromExternal(selectedLayers, g2Selections, pathToTraitIdMap?) → unified selections (with traitId when map provided).
 */

import type { UILayerName } from '@/lib/layerRegistry';
import {
  isSelectionPathEmpty,
  type SelectedLayers,
  type G2Selections,
  type SelectionsSnapshot,
} from '@/types/generator';
import type { PathToTraitIdMap } from '@/lib/selectionResolver';

/**
 * Convert unified selections to the dual shape expected by mint API, renderer, and v1 favorites.
 */
export function toExternal(selections: SelectionsSnapshot): {
  selectedLayers: SelectedLayers;
  g2Selections: G2Selections;
} {
  const selectedLayers: SelectedLayers = {};
  const g2Selections: G2Selections = {};

  for (const layer of Object.keys(selections) as UILayerName[]) {
    const sel = selections[layer];
    if (!sel) continue;
    if (sel.path && !isSelectionPathEmpty(sel.path)) {
      selectedLayers[layer] = sel.path;
    }
    if (sel.g2) {
      g2Selections[layer] = sel.g2;
    }
  }

  return {
    selectedLayers,
    g2Selections,
  };
}

/**
 * Convert dual shape (e.g. from v1 favorite or API) to unified selections.
 * When pathToTraitIdMap is provided, fills traitId for G1-only layers.
 */
export function fromExternal(
  selectedLayers: SelectedLayers,
  g2Selections: G2Selections = {},
  pathToTraitIdMap?: PathToTraitIdMap | null
): SelectionsSnapshot {
  const pathMap = pathToTraitIdMap ?? new Map<string, string>();
  const result: SelectionsSnapshot = {};

  const layers = new Set<UILayerName>([
    ...(Object.keys(selectedLayers) as UILayerName[]),
    ...(Object.keys(g2Selections) as UILayerName[]),
  ]);

  for (const layer of layers) {
    const path = selectedLayers[layer];
    const g2 = g2Selections[layer];

    const pathStr = path && !isSelectionPathEmpty(path) ? path : '';
    const traitId = g2?.traitId ?? (pathStr ? pathMap.get(pathStr) ?? null : null);

    if (pathStr || g2) {
      result[layer] = {
        path: pathStr,
        traitId: traitId ?? null,
        ...(g2 && { g2 }),
      };
    }
  }

  return result;
}
