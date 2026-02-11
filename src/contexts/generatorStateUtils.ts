/**
 * Generator state utilities: rules application, history, export validation, guards.
 * Used by generatorReducer and GeneratorContext. See docs/GENERATOR-ARCHITECTURE.md.
 */

import type { UILayerName } from '@/lib/layerRegistry';
import { UI_ORDER } from '@/lib/layerRegistry';
import { getDisabledLayers, type DisabledLayersResult } from '@/lib/wojakRules';
import { createSelectionResolverFromUnified } from '@/lib/selectionResolver';
import { isSelectionPathEmpty, type SelectionsSnapshot } from '@/types/generator';
import {
  REQUIRED_LAYERS_FOR_EXPORT,
  BASE_CLOTHES_MAP,
  DEFAULT_CLOTHES_PATH,
  getLayerConfig,
} from '@/config/layers';
import type { SelectedLayers } from '@/lib/wojakRules';

const UI_LAYER_SET = new Set<string>(UI_ORDER);

/** Type guard: true if value is a valid UILayerName. */
export function isUILayerName(layer: string): layer is UILayerName {
  return UI_LAYER_SET.has(layer);
}

/**
 * Apply rules to unified selections; returns updated selections and disabled result.
 * pathMap is used to fill traitId when applying forceSelections (G1 paths).
 */
export function applyRulesUnified(
  selections: SelectionsSnapshot,
  pathMap: Map<string, string>
): { newSelections: SelectionsSnapshot; result: DisabledLayersResult } {
  const resolver = createSelectionResolverFromUnified(selections);
  const result = getDisabledLayers(resolver);
  let newSelections: SelectionsSnapshot = { ...selections };

  if (result.forceSelections) {
    for (const [layer, path] of Object.entries(result.forceSelections)) {
      const L = layer as UILayerName;
      if (isSelectionPathEmpty(path)) {
        delete newSelections[L];
      } else {
        newSelections[L] = {
          path,
          traitId: pathMap.get(path) ?? null,
        };
      }
    }
  }
  if (result.clearSelections) {
    for (const layer of result.clearSelections) {
      delete newSelections[layer];
    }
  }

  return { newSelections, result };
}

/** State slice required for pushHistoryUnified (avoids importing full GeneratorState). */
export interface HistoryState {
  history: SelectionsSnapshot[];
  historyIndex: number;
}

/** Push new selections onto history (max 50 entries). */
export function pushHistoryUnified<T extends HistoryState>(
  state: T,
  newSelections: SelectionsSnapshot
): T {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push({ ...newSelections });

  const maxHistory = 50;
  if (newHistory.length > maxHistory) {
    newHistory.shift();
  }

  return {
    ...state,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

/** Get the matching clothes path for a given base path (from BASE_CLOTHES_MAP). */
export function getClothesForBase(basePath: string): string {
  const lowerPath = basePath.toLowerCase();
  for (const [key, clothesPath] of Object.entries(BASE_CLOTHES_MAP)) {
    if (lowerPath.includes(key)) {
      return clothesPath;
    }
  }
  return DEFAULT_CLOTHES_PATH;
}

/** True if selectedLayers has all required layers for export/save. */
export function canExportOrSave(selectedLayers: SelectedLayers): boolean {
  return REQUIRED_LAYERS_FOR_EXPORT.every((layer) => {
    const path = selectedLayers[layer];
    return path && !isSelectionPathEmpty(path);
  });
}

/** Labels of required layers that are missing from selectedLayers. */
export function getMissingRequiredLayers(selectedLayers: SelectedLayers): string[] {
  const missing: string[] = [];
  for (const layer of REQUIRED_LAYERS_FOR_EXPORT) {
    const path = selectedLayers[layer];
    if (isSelectionPathEmpty(path)) {
      missing.push(getLayerConfig(layer).label);
    }
  }
  return missing;
}
