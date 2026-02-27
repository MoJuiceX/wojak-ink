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
  type G2Selection,
  type SelectionsSnapshot,
  type SelectionKey,
} from '@/types/generator';
import type { PathToTraitIdMap } from '@/lib/selectionResolver';

/**
 * Migrate a G2Selection from the old flat-field format to the current options-bag format.
 *
 * Before the refactor, trait-specific fields (detailOption, suitVariant, etc.) lived as
 * top-level properties on G2Selection. They were moved into an `options` record. Favorites
 * saved in localStorage under the old format will crash when code accesses `g2.options.detail`
 * because `options` is undefined. This function detects the old shape and migrates it.
 *
 * Safe to call on already-migrated data — returns it unchanged (except for recursive
 * normalization of nested beerHatUnderlayerG2).
 */
export function normalizeG2Selection(g2: Record<string, unknown>): G2Selection {
  if (!g2 || typeof g2 !== 'object') {
    // Defensive: return a minimal valid G2Selection
    return { traitId: '', g2Category: '', colors: {}, options: {} };
  }

  // Already new format — options exists and is an object
  if (g2.options && typeof g2.options === 'object') {
    const opts = g2.options as Record<string, unknown>;
    // Recursively normalize nested beerHatUnderlayerG2 if present
    if (opts.beerHatUnderlayerG2 && typeof opts.beerHatUnderlayerG2 === 'object') {
      return {
        ...(g2 as unknown as G2Selection),
        options: {
          ...(opts as G2Selection['options']),
          beerHatUnderlayerG2: normalizeG2Selection(opts.beerHatUnderlayerG2 as Record<string, unknown>),
        },
      };
    }
    return g2 as unknown as G2Selection;
  }

  // Old format: flat fields → options bag
  const options: Record<string, string | boolean | G2Selection | undefined> = {};

  // Map old field names → new options keys
  if (g2.detailOption !== undefined) options.detail = g2.detailOption as string;
  if (g2.frameOption !== undefined) options.frame = g2.frameOption as string;
  if (g2.variant !== undefined) options.variant = g2.variant as string;
  if (g2.logoOption !== undefined) options.logo = g2.logoOption as string;
  if (g2.flagOption !== undefined) options.flag = g2.flagOption as string;
  if (g2.name1 !== undefined) options.name1 = g2.name1 as string;
  if (g2.name2 !== undefined) options.name2 = g2.name2 as string;
  if (g2.suitVariant !== undefined) options.suitVariant = g2.suitVariant as string;
  if (g2.chiaFarmerUnderlayer !== undefined) options.chiaFarmerUnderlayer = g2.chiaFarmerUnderlayer as string;
  if (g2.constructionHelmetChiaLogo !== undefined) options.constructionHelmetChiaLogo = g2.constructionHelmetChiaLogo as boolean;
  if (g2.constructionHelmetCigPack !== undefined) options.constructionHelmetCigPack = g2.constructionHelmetCigPack as string;
  if (g2.beerHatUnderlayer !== undefined) options.beerHatUnderlayer = g2.beerHatUnderlayer as string;
  if (g2.beerHatUnderlayerG2 !== undefined) {
    options.beerHatUnderlayerG2 = normalizeG2Selection(g2.beerHatUnderlayerG2 as Record<string, unknown>);
  }
  if (g2.beerHatEditFocus !== undefined) options.beerHatEditFocus = g2.beerHatEditFocus as string;

  return {
    traitId: (g2.traitId as string) ?? '',
    g2Category: (g2.g2Category as string) ?? '',
    colors: (g2.colors as Record<string, string>) ?? {},
    ...((g2.activeColorSlot as string | undefined) && { activeColorSlot: g2.activeColorSlot as string }),
    options,
  };
}

/** Extra slot keys (not UI layers, used for multi-select extras) */
const EXTRA_KEYS: ReadonlySet<string> = new Set(['Extra1', 'Extra2', 'Extra3']);

/**
 * Convert unified selections to the dual shape expected by mint API, renderer, and v1 favorites.
 */
export function toExternal(selections: SelectionsSnapshot): {
  selectedLayers: SelectedLayers;
  g2Selections: G2Selections;
} {
  const selectedLayers: SelectedLayers = {};
  const g2Selections: G2Selections = {};

  for (const layer of Object.keys(selections) as SelectionKey[]) {
    const sel = selections[layer];
    if (!sel) continue;
    if (sel.path && !isSelectionPathEmpty(sel.path)) {
      selectedLayers[layer] = sel.path;
    }
    // Only UILayerName keys can have G2 data (extras are G1 only)
    if (sel.g2 && !EXTRA_KEYS.has(layer)) {
      g2Selections[layer as UILayerName] = sel.g2;
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
    const rawG2 = g2Selections[layer];
    // Normalize old flat-field G2 format to options-bag format
    const g2 = rawG2 ? normalizeG2Selection(rawG2 as unknown as Record<string, unknown>) : undefined;

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
