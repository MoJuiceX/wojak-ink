/**
 * Generator reducer and initial state.
 * Pure state transitions; rules/history helpers live in generatorStateUtils.
 */

import type { FavoriteWojak, G2Selection, SelectionsSnapshot, LayerSelection } from '@/types/generator';
import type { UILayerName } from '@/lib/layerRegistry';

/** Suspended selection: a trait that was temporarily removed due to a conflict */
interface SuspendedSelection {
  layer: UILayerName;
  selection: LayerSelection;
  conflictLayer: UILayerName;
  conflictCheck: (path: string | undefined | null) => boolean;
}
import {
  DEFAULT_SELECTIONS,
  DEFAULT_CLOTHES_PATH,
  BASE_CLOTHES_MAP,
} from '@/config/layers';
import { DEFAULT_MOUTHBASE_PATH } from '@/lib/layerRegistry';
import { getPathToTraitIdMap } from '@/services/generatorService';
import { fromExternal } from '@/lib/selectionAdapter';
import { applyRulesUnified, pushHistoryUnified, getClothesForBase } from '@/contexts/generatorStateUtils';

// ============ Types ============

export interface GeneratorState {
  selections: SelectionsSnapshot;
  selectedColors: Partial<Record<UILayerName, string>>;
  activeLayer: UILayerName;
  isRendering: boolean;
  isInitialized: boolean;
  previewImage: string | null;
  isPreviewStale: boolean;
  disabledLayers: UILayerName[];
  disabledOptions: Partial<Record<UILayerName, string[]>>;
  disabledReasons: Record<string, string>;
  disabledOptionReasons: Partial<Record<UILayerName, Record<string, string>>>;
  history: SelectionsSnapshot[];
  historyIndex: number;
  favorites: FavoriteWojak[];
  isFavoritesOpen: boolean;
  isExportOpen: boolean;
  showStickyPreview: boolean;
  scrollPosition: number;
  /** User-facing error from init, export, or save (cleared on next action or clearError). */
  generatorError: string | null;
  /** Traits suspended due to conflicts — restored when conflict is resolved */
  suspendedSelections: SuspendedSelection[];
}

export type GeneratorAction =
  | { type: 'SET_LAYER'; layer: UILayerName; path: string }
  | { type: 'SET_G2_LAYER'; layer: UILayerName; path: string; g2: G2Selection; skipHistory?: boolean }
  | { type: 'SET_G2_COLOR'; layer: UILayerName; slot: string; color: string }
  | { type: 'SET_G2_DETAIL'; layer: UILayerName; detailOption?: string; frameOption?: string; logoOption?: string; flagOption?: string; name1?: string; name2?: string; activeColorSlot?: string; suitVariant?: 'bepe' | 'pepe'; chiaFarmerUnderlayer?: 'tee' | 'tanktop'; constructionHelmetChiaLogo?: boolean; constructionHelmetCigPack?: string; beerHatUnderlayer?: string; beerHatUnderlayerG2?: G2Selection; beerHatEditFocus?: 'beer' | 'underlayer'; variant?: string }
  | { type: 'CLEAR_LAYER'; layer: UILayerName }
  | { type: 'SET_ACTIVE_LAYER'; layer: UILayerName }
  | { type: 'RANDOMIZE'; selections: SelectionsSnapshot }
  | { type: 'CLEAR_ALL' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_PREVIEW'; image: string }
  | { type: 'SET_RENDERING'; isRendering: boolean }
  | { type: 'TOGGLE_FAVORITES'; isOpen: boolean }
  | { type: 'ADD_FAVORITE'; favorite: FavoriteWojak }
  | { type: 'REMOVE_FAVORITE'; id: string }
  | { type: 'RENAME_FAVORITE'; id: string; name: string }
  | { type: 'LOAD_FAVORITE_UNIFIED'; unifiedSelections: SelectionsSnapshot }
  | { type: 'TOGGLE_EXPORT'; isOpen: boolean }
  | { type: 'SET_SCROLL_POSITION'; position: number }
  | { type: 'SET_STICKY_PREVIEW'; show: boolean }
  | { type: 'LOAD_FAVORITES'; favorites: FavoriteWojak[] }
  | { type: 'INITIALIZE' }
  | { type: 'SET_COLOR'; layer: UILayerName; color: string }
  | { type: 'SET_ERROR'; error: string | null };

// ============ Initial State ============

export function createInitialState(): GeneratorState {
  return {
    selections: {},
    selectedColors: {},
    activeLayer: 'Base',
    isRendering: false,
    isInitialized: false,
    previewImage: null,
    isPreviewStale: true,
    disabledLayers: [],
    disabledOptions: {},
    disabledReasons: {},
    disabledOptionReasons: {},
    history: [],
    historyIndex: -1,
    favorites: [],
    isFavoritesOpen: false,
    isExportOpen: false,
    showStickyPreview: false,
    scrollPosition: 0,
    generatorError: null,
    suspendedSelections: [],
  };
}

// ============ Reducer ============

function pathMapForReducer(): Map<string, string> {
  return getPathToTraitIdMap();
}

// ============ Trait Conflict Helpers ============

/** Check if a path represents Clown Hair */
function isClownHair(path: string | undefined | null): boolean {
  if (!path) return false;
  return path.toLowerCase().includes('clown');
}

/** Check if a path represents Night Vision */
function isNightVision(path: string | undefined | null): boolean {
  if (!path) return false;
  const lower = path.toLowerCase();
  return lower.includes('night-vision') || lower.includes('nightvision') || lower.includes('night_vision');
}

/** Check if a path represents Firefighter Helmet */
function isFirefighterHelmet(path: string | undefined | null): boolean {
  if (!path) return false;
  const lower = path.toLowerCase();
  return lower.includes('firefight') || lower.includes('fire-fight');
}

/** Check if a path represents VR Headset */
function isVRHeadset(path: string | undefined | null): boolean {
  if (!path) return false;
  const lower = path.toLowerCase();
  return lower.includes('vr') && lower.includes('headset');
}

/** Check if a path represents Astronaut suit */
function isAstronaut(path: string | undefined | null): boolean {
  if (!path) return false;
  return path.toLowerCase().includes('astronaut');
}

/** Check if a path represents Copium Mask */
function isCopiumMask(path: string | undefined | null): boolean {
  if (!path) return false;
  return path.toLowerCase().includes('copium');
}

/** Check if a path represents Laser Eyes */
function isLaserEyes(path: string | undefined | null): boolean {
  if (!path) return false;
  return path.toLowerCase().includes('laser');
}

/** Check if a path represents Fake Mask */
function isFakeMask(path: string | undefined | null): boolean {
  if (!path) return false;
  const lower = path.toLowerCase();
  return lower.includes('fake') && (lower.includes('mask') || lower.includes('hand'));
}

/**
 * Conflict definition: when traitA is selected, traitB gets suspended (and vice versa).
 */
interface ConflictDefinition {
  layerA: UILayerName;
  checkA: (path: string | undefined | null) => boolean;
  layerB: UILayerName;
  checkB: (path: string | undefined | null) => boolean;
}

/**
 * List of mutual exclusion conflicts where selecting one suspends the other.
 * These conflicts are bidirectional - if A conflicts with B, selecting either will suspend the other.
 */
const MUTUAL_EXCLUSION_CONFLICTS: ConflictDefinition[] = [
  // Head + Eyes conflicts (only for heads that truly can't coexist with certain eyewear)
  { layerA: 'Head', checkA: isClownHair, layerB: 'Eyes', checkB: isNightVision },
  { layerA: 'Head', checkA: isFirefighterHelmet, layerB: 'Eyes', checkB: isNightVision },
  { layerA: 'Head', checkA: isFirefighterHelmet, layerB: 'Eyes', checkB: isVRHeadset },
  // Note: Tin Foil + Night Vision/VR now coexist via crop rules in layer builder
  // Clothes + Eyes conflicts
  { layerA: 'Clothes', checkA: isAstronaut, layerB: 'Eyes', checkB: isNightVision },
  // Clothes + Mask conflicts
  { layerA: 'Clothes', checkA: isAstronaut, layerB: 'Mask', checkB: isCopiumMask },
  // Eyes + Mask conflicts
  { layerA: 'Eyes', checkA: isLaserEyes, layerB: 'Mask', checkB: isFakeMask },
];

/**
 * Process all mutual exclusion conflicts for a layer change.
 * Returns updated selections and suspended selections.
 */
function processConflicts(
  selections: SelectionsSnapshot,
  suspended: SuspendedSelection[],
  changedLayer: UILayerName,
  newPath: string,
): { selections: SelectionsSnapshot; suspended: SuspendedSelection[] } {
  const newSelections = { ...selections };
  let newSuspended = [...suspended];

  for (const conflict of MUTUAL_EXCLUSION_CONFLICTS) {
    // Check if we're setting layerA and it conflicts with layerB
    if (changedLayer === conflict.layerA && conflict.checkA(newPath)) {
      const otherSel = newSelections[conflict.layerB];
      if (otherSel && conflict.checkB(otherSel.path)) {
        // Suspend layerB
        newSuspended = suspendSelection(newSuspended, conflict.layerB, otherSel, conflict.layerA, conflict.checkA);
        delete newSelections[conflict.layerB];
      }
    }
    // Check if we're setting layerB and it conflicts with layerA
    if (changedLayer === conflict.layerB && conflict.checkB(newPath)) {
      const otherSel = newSelections[conflict.layerA];
      if (otherSel && conflict.checkA(otherSel.path)) {
        // Suspend layerA
        newSuspended = suspendSelection(newSuspended, conflict.layerA, otherSel, conflict.layerB, conflict.checkB);
        delete newSelections[conflict.layerA];
      }
    }
  }

  return { selections: newSelections, suspended: newSuspended };
}

/**
 * Suspend a selection due to a conflict.
 * Returns updated suspendedSelections array.
 */
function suspendSelection(
  current: SuspendedSelection[],
  layer: UILayerName,
  selection: LayerSelection,
  conflictLayer: UILayerName,
  conflictCheck: (path: string | undefined | null) => boolean,
): SuspendedSelection[] {
  // Remove any existing suspension for this layer (replace with new one)
  const filtered = current.filter(s => s.layer !== layer);
  return [...filtered, { layer, selection, conflictLayer, conflictCheck }];
}

/**
 * Check if any suspended selections can be restored given the current selections.
 * Returns { restorable, remaining } where restorable can be added back to selections.
 */
function checkRestorableSuspensions(
  suspended: SuspendedSelection[],
  selections: SelectionsSnapshot,
  changedLayer: UILayerName,
): { restorable: SuspendedSelection[]; remaining: SuspendedSelection[] } {
  const restorable: SuspendedSelection[] = [];
  const remaining: SuspendedSelection[] = [];

  for (const s of suspended) {
    // Only check suspensions that were caused by the layer that just changed
    if (s.conflictLayer === changedLayer) {
      const conflictPath = selections[s.conflictLayer]?.path;
      // If the conflict no longer exists, this selection can be restored
      if (!s.conflictCheck(conflictPath)) {
        restorable.push(s);
      } else {
        remaining.push(s);
      }
    } else {
      remaining.push(s);
    }
  }

  return { restorable, remaining };
}

/**
 * Clear suspension for a layer when the user manually selects something for that layer.
 */
function clearSuspensionForLayer(suspended: SuspendedSelection[], layer: UILayerName): SuspendedSelection[] {
  return suspended.filter(s => s.layer !== layer);
}

export function generatorReducer(state: GeneratorState, action: GeneratorAction): GeneratorState {
  switch (action.type) {
    case 'SET_LAYER': {
      const pathMap = pathMapForReducer();
      const updated: SelectionsSnapshot = { ...state.selections };
      updated[action.layer] = { path: action.path, traitId: pathMap.get(action.path) ?? null };

      // Clear any suspension for the layer being manually set
      let newSuspended = clearSuspensionForLayer(state.suspendedSelections, action.layer);

      // Process all mutual exclusion conflicts
      const conflictResult = processConflicts(updated, newSuspended, action.layer, action.path);
      Object.assign(updated, conflictResult.selections);
      newSuspended = conflictResult.suspended;

      // Check if any suspended selections can be restored
      const { restorable, remaining } = checkRestorableSuspensions(newSuspended, updated, action.layer);
      newSuspended = remaining;
      for (const r of restorable) {
        updated[r.layer] = r.selection;
      }

      if (action.layer === 'Base' && action.path) {
        const matchingClothes = getClothesForBase(action.path);
        const currentPath = state.selections.Clothes?.path || '';
        const isDefaultClothes =
          Object.values(BASE_CLOTHES_MAP).includes(currentPath) ||
          currentPath === DEFAULT_CLOTHES_PATH ||
          currentPath === '';
        if (isDefaultClothes) {
          updated.Clothes = { path: matchingClothes, traitId: pathMap.get(matchingClothes) ?? null };
        }
      }

      const { newSelections, result } = applyRulesUnified(updated, pathMap);
      const newState = pushHistoryUnified(state, newSelections);

      return {
        ...newState,
        selections: newSelections,
        suspendedSelections: newSuspended,
        disabledLayers: result.disabledLayers,
        disabledOptions: result.disabledOptions,
        disabledReasons: result.reasons,
        disabledOptionReasons: result.disabledOptionReasons,
        isPreviewStale: true,
        generatorError: null,
      };
    }

    case 'SET_G2_LAYER': {
      const pathMap = pathMapForReducer();
      const updatedG2Sel: SelectionsSnapshot = { ...state.selections };
      updatedG2Sel[action.layer] = { path: action.path, traitId: action.g2.traitId, g2: action.g2 };

      // Clear any suspension for the layer being manually set
      let newSuspended = clearSuspensionForLayer(state.suspendedSelections, action.layer);

      // Process all mutual exclusion conflicts
      const conflictResult = processConflicts(updatedG2Sel, newSuspended, action.layer, action.path);
      Object.assign(updatedG2Sel, conflictResult.selections);
      newSuspended = conflictResult.suspended;

      // Check if any suspended selections can be restored
      const { restorable, remaining } = checkRestorableSuspensions(newSuspended, updatedG2Sel, action.layer);
      newSuspended = remaining;
      for (const r of restorable) {
        updatedG2Sel[r.layer] = r.selection;
      }

      const { newSelections, result } = applyRulesUnified(updatedG2Sel, pathMap);
      // skipHistory: when called as part of RANDOMIZE, the history entry was already created
      const newState = action.skipHistory ? state : pushHistoryUnified(state, newSelections);

      return {
        ...newState,
        selections: newSelections,
        suspendedSelections: newSuspended,
        disabledLayers: result.disabledLayers,
        disabledOptions: result.disabledOptions,
        disabledReasons: result.reasons,
        disabledOptionReasons: result.disabledOptionReasons,
        isPreviewStale: true,
        generatorError: null,
      };
    }

    case 'SET_G2_COLOR': {
      const existing = state.selections[action.layer]?.g2;
      if (!existing) return state;

      const updated: SelectionsSnapshot = { ...state.selections };
      const isBeerHatUnderlayer =
        existing.traitId === 'Head_Beer-Hat' && existing.beerHatEditFocus === 'underlayer' && existing.beerHatUnderlayerG2;
      const targetG2 = isBeerHatUnderlayer ? existing.beerHatUnderlayerG2! : existing;
      const newColors = { ...(targetG2.colors || {}), [action.slot]: action.color };
      const g2 = isBeerHatUnderlayer
        ? { ...existing, beerHatUnderlayerG2: { ...targetG2, colors: newColors } }
        : { ...existing, colors: newColors };

      updated[action.layer] = { ...state.selections[action.layer]!, g2 };

      return { ...state, selections: updated, isPreviewStale: true };
    }

    case 'SET_G2_DETAIL': {
      const existing = state.selections[action.layer]?.g2;
      if (!existing) return state;

      // When the action explicitly provides beerHatEditFocus, use it for routing
      // (allows callers to force-route to main selection or underlayer regardless of current focus)
      const effectiveFocus = action.beerHatEditFocus ?? existing.beerHatEditFocus;
      const isBeerHatUnderlayer =
        existing.traitId === 'Head_Beer-Hat' && effectiveFocus === 'underlayer' && existing.beerHatUnderlayerG2;
      const targetG2 = isBeerHatUnderlayer && existing.beerHatUnderlayerG2 ? existing.beerHatUnderlayerG2 : existing;
      const g2: G2Selection = { ...existing };

      if (action.beerHatUnderlayer !== undefined) g2.beerHatUnderlayer = action.beerHatUnderlayer;
      if (action.beerHatUnderlayerG2 !== undefined) g2.beerHatUnderlayerG2 = action.beerHatUnderlayerG2;
      if (action.beerHatEditFocus !== undefined) g2.beerHatEditFocus = action.beerHatEditFocus;

      if (isBeerHatUnderlayer && targetG2 && action.beerHatUnderlayerG2 === undefined) {
        // Only merge into the existing underlayer when we're NOT replacing it wholesale
        const updatedUnder: G2Selection = { ...targetG2 };
        if (action.detailOption !== undefined) updatedUnder.detailOption = action.detailOption;
        if (action.frameOption !== undefined) updatedUnder.frameOption = action.frameOption;
        if (action.activeColorSlot !== undefined) updatedUnder.activeColorSlot = action.activeColorSlot;
        if (action.constructionHelmetChiaLogo !== undefined) updatedUnder.constructionHelmetChiaLogo = action.constructionHelmetChiaLogo;
        if (action.constructionHelmetCigPack !== undefined) updatedUnder.constructionHelmetCigPack = action.constructionHelmetCigPack;
        if (action.variant !== undefined) updatedUnder.variant = action.variant;
        g2.beerHatUnderlayerG2 = updatedUnder;
      } else {
        if (action.detailOption !== undefined) g2.detailOption = action.detailOption;
        if (action.frameOption !== undefined) g2.frameOption = action.frameOption;
        if (action.logoOption !== undefined) g2.logoOption = action.logoOption;
        if (action.flagOption !== undefined) g2.flagOption = action.flagOption;
        if (action.name1 !== undefined) g2.name1 = action.name1;
        if (action.name2 !== undefined) g2.name2 = action.name2;
        if (action.activeColorSlot !== undefined) g2.activeColorSlot = action.activeColorSlot;
        if (action.suitVariant !== undefined) g2.suitVariant = action.suitVariant;
        if (action.chiaFarmerUnderlayer !== undefined) g2.chiaFarmerUnderlayer = action.chiaFarmerUnderlayer;
        if (action.constructionHelmetChiaLogo !== undefined) g2.constructionHelmetChiaLogo = action.constructionHelmetChiaLogo;
        if (action.constructionHelmetCigPack !== undefined) g2.constructionHelmetCigPack = action.constructionHelmetCigPack;
        if (action.variant !== undefined) g2.variant = action.variant;
      }

      const updated: SelectionsSnapshot = { ...state.selections };
      updated[action.layer] = { ...state.selections[action.layer]!, g2 };

      return { ...state, selections: updated, isPreviewStale: true };
    }

    case 'SET_COLOR': {
      const selectedColors = { ...state.selectedColors, [action.layer]: action.color };
      return { ...state, selectedColors, isPreviewStale: true };
    }

    case 'CLEAR_LAYER': {
      const updated: SelectionsSnapshot = { ...state.selections };
      delete updated[action.layer];
      const updatedColors = { ...state.selectedColors };
      delete updatedColors[action.layer];

      // Clear suspension for this layer, and check if clearing this layer allows restoring others
      let newSuspended = clearSuspensionForLayer(state.suspendedSelections, action.layer);
      const { restorable, remaining } = checkRestorableSuspensions(newSuspended, updated, action.layer);
      newSuspended = remaining;
      for (const r of restorable) {
        updated[r.layer] = r.selection;
      }

      const pathMap = pathMapForReducer();
      if (action.layer === 'MouthBase') {
        const path = DEFAULT_SELECTIONS.MouthBase ?? DEFAULT_MOUTHBASE_PATH;
        updated.MouthBase = { path, traitId: pathMap.get(path) ?? null };
      }
      if (action.layer === 'Clothes') {
        const path = DEFAULT_SELECTIONS.Clothes ?? DEFAULT_CLOTHES_PATH;
        updated.Clothes = { path, traitId: pathMap.get(path) ?? null };
      }

      const { newSelections, result } = applyRulesUnified(updated, pathMap);
      const newState = pushHistoryUnified(state, newSelections);

      return {
        ...newState,
        selections: newSelections,
        selectedColors: updatedColors,
        suspendedSelections: newSuspended,
        disabledLayers: result.disabledLayers,
        disabledOptions: result.disabledOptions,
        disabledReasons: result.reasons,
        disabledOptionReasons: result.disabledOptionReasons,
        isPreviewStale: true,
        generatorError: null,
      };
    }

    case 'SET_ACTIVE_LAYER':
      return { ...state, activeLayer: action.layer };

    case 'RANDOMIZE': {
      const pathMap = pathMapForReducer();
      const { newSelections, result } = applyRulesUnified(action.selections, pathMap);
      const newState = pushHistoryUnified(state, newSelections);

      return {
        ...newState,
        selections: newSelections,
        suspendedSelections: [], // Clear all suspensions on randomize
        disabledLayers: result.disabledLayers,
        disabledOptions: result.disabledOptions,
        disabledReasons: result.reasons,
        disabledOptionReasons: result.disabledOptionReasons,
        isPreviewStale: true,
        generatorError: null,
      };
    }

    case 'CLEAR_ALL': {
      const pathMap = pathMapForReducer();
      const defaultUnified = fromExternal(DEFAULT_SELECTIONS, {}, pathMap);
      const { newSelections, result } = applyRulesUnified(defaultUnified, pathMap);
      const newState = pushHistoryUnified(state, newSelections);

      return {
        ...newState,
        selections: newSelections,
        suspendedSelections: [], // Clear all suspensions on clear all
        disabledLayers: result.disabledLayers,
        disabledOptions: result.disabledOptions,
        disabledReasons: result.reasons,
        disabledOptionReasons: result.disabledOptionReasons,
        isPreviewStale: true,
        generatorError: null,
      };
    }

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const snap = state.history[newIndex];
      if (!snap) return state;

      const pathMap = pathMapForReducer();
      const { result } = applyRulesUnified(snap, pathMap);

      return {
        ...state,
        selections: snap,
        historyIndex: newIndex,
        disabledLayers: result.disabledLayers,
        disabledOptions: result.disabledOptions,
        disabledReasons: result.reasons,
        disabledOptionReasons: result.disabledOptionReasons,
        isPreviewStale: true,
      };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const snap = state.history[newIndex];
      if (!snap) return state;

      const pathMap = pathMapForReducer();
      const { result } = applyRulesUnified(snap, pathMap);

      return {
        ...state,
        selections: snap,
        historyIndex: newIndex,
        disabledLayers: result.disabledLayers,
        disabledOptions: result.disabledOptions,
        disabledReasons: result.reasons,
        disabledOptionReasons: result.disabledOptionReasons,
        isPreviewStale: true,
      };
    }

    case 'SET_PREVIEW':
      return {
        ...state,
        previewImage: action.image,
        isPreviewStale: false,
        isRendering: false,
      };

    case 'SET_RENDERING':
      return { ...state, isRendering: action.isRendering };

    case 'TOGGLE_FAVORITES':
      return { ...state, isFavoritesOpen: action.isOpen };

    case 'ADD_FAVORITE':
      return { ...state, favorites: [...state.favorites, action.favorite] };

    case 'REMOVE_FAVORITE':
      return {
        ...state,
        favorites: state.favorites.filter((f) => f.id !== action.id),
      };

    case 'RENAME_FAVORITE':
      return {
        ...state,
        favorites: state.favorites.map((f) =>
          f.id === action.id ? { ...f, name: action.name, updatedAt: new Date() } : f
        ),
      };

    case 'LOAD_FAVORITE_UNIFIED': {
      const pathMap = pathMapForReducer();
      const { newSelections, result } = applyRulesUnified(action.unifiedSelections, pathMap);
      const newState = pushHistoryUnified(state, newSelections);

      return {
        ...newState,
        selections: newSelections,
        suspendedSelections: [], // Clear all suspensions when loading a favorite
        disabledLayers: result.disabledLayers,
        disabledOptions: result.disabledOptions,
        disabledReasons: result.reasons,
        disabledOptionReasons: result.disabledOptionReasons,
        isPreviewStale: true,
        isFavoritesOpen: false,
        generatorError: null,
      };
    }

    case 'TOGGLE_EXPORT':
      return { ...state, isExportOpen: action.isOpen };

    case 'SET_SCROLL_POSITION':
      return { ...state, scrollPosition: action.position };

    case 'SET_STICKY_PREVIEW':
      return { ...state, showStickyPreview: action.show };

    case 'LOAD_FAVORITES':
      return { ...state, favorites: action.favorites };

    case 'INITIALIZE':
      return { ...state, isInitialized: true };

    case 'SET_ERROR':
      return { ...state, generatorError: action.error };

    default:
      return state;
  }
}
