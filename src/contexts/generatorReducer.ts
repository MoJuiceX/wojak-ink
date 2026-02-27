/**
 * Generator reducer and initial state.
 * Pure state transitions; rules/history helpers live in generatorStateUtils.
 */

import type { FavoriteWojak, G2Selection, SelectionsSnapshot, LayerSelection, SelectionKey } from '@/types/generator';
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
import { KNOWN_TRAIT_IDS } from '@/lib/generatorTraitIds';

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
  disabledOptions: Partial<Record<UILayerName, Set<string>>>;
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
  /** Mask selection suspended because a hand extra was selected */
  suspendedMaskByExtra: LayerSelection | null;
  /** Extra selections suspended because hand mask was selected */
  suspendedExtrasByMask: Array<{ slot: SelectionKey; selection: LayerSelection }>;
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
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'TOGGLE_EXTRA'; path: string }
  | { type: 'CLEAR_EXTRAS' };

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
    suspendedMaskByExtra: null,
    suspendedExtrasByMask: [],
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

/** Check if a path represents Straitjacket */
function isStraightJacket(path: string | undefined | null): boolean {
  if (!path) return false;
  return path.toLowerCase().includes('straigth-jacket');
}

/** Check if an extra path is a hand item (not wings) */
function isHandExtra(path: string | undefined | null): boolean {
  if (!path) return false;
  const lower = path.toLowerCase();
  return lower.includes('extra_hand');
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

// ============ Hand Mask ↔ Hand Extra Conflict Helpers ============

/** Check if a path represents the Wojak hand mask */
function isHandMask(path: string | undefined | null): boolean {
  if (!path) return false;
  return path.toLowerCase().includes('hand_mask');
}

/**
 * Check if an extra path conflicts with the Wojak hand mask.
 * Conflicting: Diamond, GFY Left, Goose, Gun Left, Orange, TangTalk (all left-hand or both-hand items).
 * Non-conflicting: Coffee, GFY Right (right-hand items), Wings (no hands).
 */
function extraConflictsWithHandMask(path: string | undefined | null): boolean {
  if (!path) return false;
  const lower = path.toLowerCase();
  if (!lower.includes('extra_hand')) return false; // wings and non-hand items never conflict
  // Right-hand items don't conflict with the hand mask (left hand holds mask)
  if (lower.includes('coffee')) return false;
  if (lower.includes('gfy_right')) return false;
  return true;
}

// ============ Extra Item Conflict Helpers ============

/**
 * Determine which hand an extra uses.
 * Left hand: Diamond, GFY Left, Goose, Handgun, Orange, TangTalk Phone
 * Right hand: Coffee, GFY Right
 * None: Wings
 */
function getExtraHand(path: string | undefined | null): 'left' | 'right' | 'none' | null {
  if (!path) return null;
  const lower = path.toLowerCase();
  if (lower.includes('extra_wings')) return 'none';
  if (!lower.includes('extra_hand')) return null;
  // Right-hand items
  if (lower.includes('coffee') || lower.includes('gfy_right')) return 'right';
  // All other hand items are left-hand
  return 'left';
}

/** Extra slot keys for iteration */
const EXTRA_SLOTS: readonly SelectionKey[] = ['Extra1', 'Extra2', 'Extra3'] as const;

/**
 * Shared logic for SET_LAYER and SET_G2_LAYER.
 * Handles: suspension clearing, mutual-exclusion conflicts, suspension restoration,
 * Base→Clothes auto-match, hand-mask↔extra conflicts, straitjacket→extras clearing,
 * rule application, and history push.
 */
function processLayerUpdate(
  state: GeneratorState,
  layer: UILayerName,
  path: string,
  options?: {
    g2?: G2Selection;
    skipHistory?: boolean;
    skipBaseAutoMatch?: boolean;
  },
): GeneratorState {
  const pathMap = pathMapForReducer();
  const updated: SelectionsSnapshot = { ...state.selections };

  // Build the selection entry — G2 traits carry their own traitId and g2 data
  if (options?.g2) {
    updated[layer] = { path, traitId: options.g2.traitId, g2: options.g2 };
  } else {
    updated[layer] = { path, traitId: pathMap.get(path) ?? null };
  }

  // Clear any suspension for the layer being manually set
  let newSuspended = clearSuspensionForLayer(state.suspendedSelections, layer);

  // Process all mutual exclusion conflicts
  const conflictResult = processConflicts(updated, newSuspended, layer, path);
  Object.assign(updated, conflictResult.selections);
  newSuspended = conflictResult.suspended;

  // Check if any suspended selections can be restored
  const { restorable, remaining } = checkRestorableSuspensions(newSuspended, updated, layer);
  newSuspended = remaining;
  for (const r of restorable) {
    updated[r.layer] = r.selection;
  }

  // Base → Clothes auto-match (G1 only, when changing Base layer)
  if (!options?.skipBaseAutoMatch && layer === 'Base' && path) {
    const matchingClothes = getClothesForBase(path);
    const currentPath = state.selections.Clothes?.path || '';
    const isDefaultClothes =
      Object.values(BASE_CLOTHES_MAP).includes(currentPath) ||
      currentPath === DEFAULT_CLOTHES_PATH ||
      currentPath === '';
    if (isDefaultClothes) {
      updated.Clothes = { path: matchingClothes, traitId: pathMap.get(matchingClothes) ?? null };
    }
  }

  // Hand mask ↔ hand extras conflict (G1 only)
  let newSuspendedMaskByExtra = state.suspendedMaskByExtra;
  let newSuspendedExtrasByMask = state.suspendedExtrasByMask;
  if (!options?.skipBaseAutoMatch && layer === 'Mask') {
    if (isHandMask(path)) {
      // Selecting hand mask → suspend conflicting extras
      const toSuspend: typeof newSuspendedExtrasByMask = [];
      for (const slot of EXTRA_SLOTS) {
        if (updated[slot] && extraConflictsWithHandMask(updated[slot]?.path)) {
          toSuspend.push({ slot, selection: updated[slot]! });
          delete updated[slot];
        }
      }
      newSuspendedExtrasByMask = toSuspend.length > 0 ? toSuspend : [];
      // Clear any suspended mask (user is manually selecting mask)
      newSuspendedMaskByExtra = null;
    } else {
      // Selecting a non-hand-mask → restore any extras that were suspended by hand mask
      if (newSuspendedExtrasByMask.length > 0) {
        for (const { slot, selection } of newSuspendedExtrasByMask) {
          if (!updated[slot]) updated[slot] = selection;
        }
        newSuspendedExtrasByMask = [];
      }
      newSuspendedMaskByExtra = null;
    }
  }

  // Straitjacket → clear all hand extras (hands are tied) (G1 only)
  if (!options?.skipBaseAutoMatch && layer === 'Clothes' && isStraightJacket(path)) {
    for (const slot of EXTRA_SLOTS) {
      if (updated[slot] && isHandExtra(updated[slot]?.path)) {
        delete updated[slot];
      }
    }
  }

  const { newSelections, result } = applyRulesUnified(updated, pathMap);
  // skipHistory: when called as part of RANDOMIZE, the history entry was already created
  const newState = options?.skipHistory ? state : pushHistoryUnified(state, newSelections);

  return {
    ...newState,
    selections: newSelections,
    suspendedSelections: newSuspended,
    suspendedMaskByExtra: newSuspendedMaskByExtra,
    suspendedExtrasByMask: newSuspendedExtrasByMask,
    disabledLayers: result.disabledLayers,
    disabledOptions: result.disabledOptions,
    disabledReasons: result.reasons,
    disabledOptionReasons: result.disabledOptionReasons,
    isPreviewStale: true,
    generatorError: null,
  };
}

export function generatorReducer(state: GeneratorState, action: GeneratorAction): GeneratorState {
  switch (action.type) {
    case 'SET_LAYER':
      return processLayerUpdate(state, action.layer, action.path);

    case 'SET_G2_LAYER':
      return processLayerUpdate(state, action.layer, action.path, {
        g2: action.g2,
        skipHistory: action.skipHistory,
        skipBaseAutoMatch: true,
      });

    case 'SET_G2_COLOR': {
      const existing = state.selections[action.layer]?.g2;
      if (!existing) return state;

      const updated: SelectionsSnapshot = { ...state.selections };
      const isBeerHatUnderlayer =
        existing.traitId === KNOWN_TRAIT_IDS.Head_BeerHat && existing.beerHatEditFocus === 'underlayer' && existing.beerHatUnderlayerG2;
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
        existing.traitId === KNOWN_TRAIT_IDS.Head_BeerHat && effectiveFocus === 'underlayer' && existing.beerHatUnderlayerG2;
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

      // Clearing Mask → restore extras that were suspended by hand mask
      let newSuspendedExtrasByMaskClear = state.suspendedExtrasByMask;
      if (action.layer === 'Mask' && newSuspendedExtrasByMaskClear.length > 0) {
        for (const { slot, selection } of newSuspendedExtrasByMaskClear) {
          if (!updated[slot]) updated[slot] = selection;
        }
        newSuspendedExtrasByMaskClear = [];
      }

      const { newSelections, result } = applyRulesUnified(updated, pathMap);
      const newState = pushHistoryUnified(state, newSelections);

      return {
        ...newState,
        selections: newSelections,
        selectedColors: updatedColors,
        suspendedSelections: newSuspended,
        suspendedMaskByExtra: action.layer === 'Mask' ? null : state.suspendedMaskByExtra,
        suspendedExtrasByMask: newSuspendedExtrasByMaskClear,
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
        suspendedMaskByExtra: null,
        suspendedExtrasByMask: [],
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
        suspendedMaskByExtra: null,
        suspendedExtrasByMask: [],
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
        suspendedMaskByExtra: null,
        suspendedExtrasByMask: [],
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

    case 'TOGGLE_EXTRA': {
      const pathMap = pathMapForReducer();
      const updated: SelectionsSnapshot = { ...state.selections };
      const newPath = action.path;
      let suspendedMask = state.suspendedMaskByExtra;
      let suspendedExtras = state.suspendedExtrasByMask;

      // Straitjacket blocks hand extras (hands are tied) — allow deselect but reject new selection
      if (isStraightJacket(updated.Clothes?.path) && isHandExtra(newPath)) {
        // Allow deselecting an already-selected hand extra
        const isDeselect = EXTRA_SLOTS.some(slot => updated[slot]?.path === newPath);
        if (!isDeselect) return state;
      }

      // 1. If already selected in any Extra slot, deselect it
      for (const slot of EXTRA_SLOTS) {
        if (updated[slot]?.path === newPath) {
          delete updated[slot];

          // Check if mask should be restored (no remaining conflicting extras)
          if (suspendedMask) {
            const hasConflicting = EXTRA_SLOTS.some(s =>
              updated[s] && extraConflictsWithHandMask(updated[s]?.path)
            );
            if (!hasConflicting) {
              updated.Mask = suspendedMask;
              suspendedMask = null;
            }
          }

          const { newSelections, result } = applyRulesUnified(updated, pathMap);
          const newState = pushHistoryUnified(state, newSelections);
          return {
            ...newState,
            selections: newSelections,
            suspendedMaskByExtra: suspendedMask,
            suspendedExtrasByMask: suspendedExtras,
            disabledLayers: result.disabledLayers,
            disabledOptions: result.disabledOptions,
            disabledReasons: result.reasons,
            disabledOptionReasons: result.disabledOptionReasons,
            isPreviewStale: true,
            generatorError: null,
          };
        }
      }

      // 2. Place the new extra: find existing same-hand item to replace, or find an empty slot
      const newHand = getExtraHand(newPath);
      const newSel: LayerSelection = { path: newPath, traitId: pathMap.get(newPath) ?? null };

      // Check if there's an existing extra with the same hand category → replace it
      let placed = false;
      if (newHand && newHand !== 'none') {
        for (const slot of EXTRA_SLOTS) {
          if (updated[slot] && getExtraHand(updated[slot]?.path) === newHand) {
            updated[slot] = newSel;
            placed = true;
            break;
          }
        }
      }

      // If not placed by replacement, find first empty slot
      if (!placed) {
        for (const slot of EXTRA_SLOTS) {
          if (!updated[slot]?.path) {
            updated[slot] = newSel;
            placed = true;
            break;
          }
        }
      }

      // If still not placed (all 3 slots full, no same-hand conflict), replace the last slot
      if (!placed) {
        updated.Extra3 = newSel;
      }

      // 3. If the new extra conflicts with hand mask, suspend mask
      if (extraConflictsWithHandMask(newPath) && isHandMask(updated.Mask?.path)) {
        suspendedMask = updated.Mask!;
        delete updated.Mask;
      }

      // 4. Adding an extra clears any extras-suspended-by-mask (user chose extra over mask)
      if (suspendedExtras.length > 0) {
        suspendedExtras = [];
      }

      const { newSelections, result } = applyRulesUnified(updated, pathMap);
      const newState = pushHistoryUnified(state, newSelections);

      return {
        ...newState,
        selections: newSelections,
        suspendedMaskByExtra: suspendedMask,
        suspendedExtrasByMask: suspendedExtras,
        disabledLayers: result.disabledLayers,
        disabledOptions: result.disabledOptions,
        disabledReasons: result.reasons,
        disabledOptionReasons: result.disabledOptionReasons,
        isPreviewStale: true,
        generatorError: null,
      };
    }

    case 'CLEAR_EXTRAS': {
      const pathMap = pathMapForReducer();
      const updated: SelectionsSnapshot = { ...state.selections };
      delete updated.Extra1;
      delete updated.Extra2;
      delete updated.Extra3;

      // Restore mask if it was suspended by extras
      let suspendedMask = state.suspendedMaskByExtra;
      if (suspendedMask) {
        updated.Mask = suspendedMask;
        suspendedMask = null;
      }

      const { newSelections, result } = applyRulesUnified(updated, pathMap);
      const newState = pushHistoryUnified(state, newSelections);

      return {
        ...newState,
        selections: newSelections,
        suspendedMaskByExtra: suspendedMask,
        suspendedExtrasByMask: [],
        disabledLayers: result.disabledLayers,
        disabledOptions: result.disabledOptions,
        disabledReasons: result.reasons,
        disabledOptionReasons: result.disabledOptionReasons,
        isPreviewStale: true,
        generatorError: null,
      };
    }

    default:
      return state;
  }
}
