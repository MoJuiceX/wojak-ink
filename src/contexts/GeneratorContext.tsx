/* eslint-disable react-refresh/only-export-components */
/**
 * Generator Context
 *
 * State management for the Wojak avatar generator.
 * Uses the layer system from memeLayers.ts and rules engine from wojakRules.ts.
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import type { FavoriteWojak, ExportOptions, SelectedLayers as SelectedLayersType } from '@/types/generator';
import { getDisabledLayers, type SelectedLayers, type DisabledLayersResult, type UILayerName } from '@/lib/wojakRules';
import { generatorService, type LayerImage } from '@/services/generatorService';
import { renderPreview, renderThumbnail, downloadImage } from '@/services/canvasRenderer';

// ============ Types ============

interface GeneratorState {
  // Selections - map of layer name to image path
  selectedLayers: SelectedLayers;

  // UI State
  activeLayer: UILayerName;
  isRendering: boolean;
  isInitialized: boolean;

  // Preview
  previewImage: string | null;
  isPreviewStale: boolean;

  // Disabled state from rules engine
  disabledLayers: UILayerName[];
  disabledOptions: Partial<Record<UILayerName, string[]>>;
  disabledReasons: Record<string, string>;
  disabledOptionReasons: Partial<Record<UILayerName, Record<string, string>>>;

  // History (undo/redo)
  history: SelectedLayers[];
  historyIndex: number;

  // Favorites
  favorites: FavoriteWojak[];
  isFavoritesOpen: boolean;

  // Export
  isExportOpen: boolean;

  // Mobile
  showStickyPreview: boolean;
  scrollPosition: number;
}

type GeneratorAction =
  | { type: 'SET_LAYER'; layer: UILayerName; path: string }
  | { type: 'CLEAR_LAYER'; layer: UILayerName }
  | { type: 'SET_ACTIVE_LAYER'; layer: UILayerName }
  | { type: 'RANDOMIZE'; selections: SelectedLayers }
  | { type: 'CLEAR_ALL' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_PREVIEW'; image: string }
  | { type: 'SET_RENDERING'; isRendering: boolean }
  | { type: 'TOGGLE_FAVORITES'; isOpen: boolean }
  | { type: 'ADD_FAVORITE'; favorite: FavoriteWojak }
  | { type: 'REMOVE_FAVORITE'; id: string }
  | { type: 'RENAME_FAVORITE'; id: string; name: string }
  | { type: 'LOAD_FAVORITE'; selections: SelectedLayers }
  | { type: 'TOGGLE_EXPORT'; isOpen: boolean }
  | { type: 'SET_SCROLL_POSITION'; position: number }
  | { type: 'SET_STICKY_PREVIEW'; show: boolean }
  | { type: 'LOAD_FAVORITES'; favorites: FavoriteWojak[] }
  | { type: 'APPLY_RULES'; result: DisabledLayersResult }
  | { type: 'INITIALIZE' };

interface GeneratorContextValue extends GeneratorState {
  // Layer images
  getLayerImages: (layer: UILayerName) => Promise<LayerImage[]>;

  // Actions
  selectLayer: (layer: UILayerName, path: string) => void;
  clearLayer: (layer: UILayerName) => void;
  setActiveLayer: (layer: UILayerName) => void;
  randomize: () => void;
  clearAll: () => void;
  undo: () => void;
  redo: () => void;

  // Blocking checks
  isLayerDisabled: (layer: UILayerName) => boolean;
  isOptionDisabled: (layer: UILayerName, optionName: string) => boolean;
  getDisabledReason: (layer: UILayerName) => string | null;
  getOptionDisabledReason: (layer: UILayerName, optionName: string) => string | null;

  // History
  canUndo: boolean;
  canRedo: boolean;

  // Favorites
  toggleFavorites: (isOpen: boolean) => void;
  saveFavorite: (name: string) => Promise<void>;
  removeFavorite: (id: string) => void;
  renameFavorite: (id: string, name: string) => void;
  loadFavorite: (favorite: FavoriteWojak) => void;

  // Export
  toggleExport: (isOpen: boolean) => void;
  exportWojak: (options: ExportOptions, filename?: string) => Promise<void>;

  // Validation
  canExport: boolean;
  missingLayers: string[];

  // Mobile
  setScrollPosition: (position: number) => void;
  setStickyPreview: (show: boolean) => void;
}

// ============ Initial State ============

function createInitialState(): GeneratorState {
  return {
    selectedLayers: {},
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
  };
}

// ============ Rules Application ============

function applyRules(selectedLayers: SelectedLayers): {
  newLayers: SelectedLayers;
  result: DisabledLayersResult;
} {
  const result = getDisabledLayers(selectedLayers);
  let newLayers = { ...selectedLayers };

  // Apply forced selections
  if (result.forceSelections) {
    newLayers = { ...newLayers, ...result.forceSelections };
  }

  // Clear selections for disabled layers
  if (result.clearSelections) {
    for (const layer of result.clearSelections) {
      newLayers[layer] = '';
    }
  }

  return { newLayers, result };
}

// ============ History Helpers ============

function pushHistory(state: GeneratorState, newLayers: SelectedLayers): GeneratorState {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push({ ...newLayers });

  // Limit history size
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

// ============ Base-to-Clothes Mapping ============

/**
 * Maps base variants to their matching clothes for preview consistency
 */
const BASE_CLOTHES_MAP: Record<string, string> = {
  classic: '/assets/wojak-layers/CLOTHES/CLOTHES_Tank-Top_orange.png',
  rekt: '/assets/wojak-layers/CLOTHES/CLOTHES_Tank-Top_red.png',
  rugged: '/assets/wojak-layers/CLOTHES/CLOTHES_Tee_blue.png',
  bleeding: '/assets/wojak-layers/CLOTHES/CLOTHES_Tee_orange.png',
  terminator: '/assets/wojak-layers/CLOTHES/CLOTHES_Tee_red.png',
};

const DEFAULT_CLOTHES_PATH = '/assets/wojak-layers/CLOTHES/CLOTHES_Tee_blue.png';

/**
 * Get the matching clothes path for a given base path
 */
function getClothesForBase(basePath: string): string {
  const lowerPath = basePath.toLowerCase();
  for (const [key, clothesPath] of Object.entries(BASE_CLOTHES_MAP)) {
    if (lowerPath.includes(key)) {
      return clothesPath;
    }
  }
  return DEFAULT_CLOTHES_PATH;
}

// ============ Default Selections ============

/**
 * Default selections shown when user first visits or clears all
 */
const DEFAULT_SELECTIONS: SelectedLayers = {
  MouthBase: '/assets/wojak-layers/MOUTH/MOUTH_numb.png',
  Clothes: '/assets/wojak-layers/CLOTHES/CLOTHES_Tee_blue.png',
};

// ============ Export/Save Validation ============

/**
 * Minimum required layers for export/save
 */
const REQUIRED_LAYERS_FOR_EXPORT: UILayerName[] = ['Base', 'Clothes', 'MouthBase'];

/**
 * Check if selections meet minimum requirements for export/save
 */
function canExportOrSave(selectedLayers: SelectedLayers): boolean {
  return REQUIRED_LAYERS_FOR_EXPORT.every((layer) => {
    const path = selectedLayers[layer];
    return path && path !== '' && path !== 'None';
  });
}

/**
 * Get list of missing required layers
 */
function getMissingRequiredLayers(selectedLayers: SelectedLayers): string[] {
  const missing: string[] = [];
  const displayNames: Record<UILayerName, string> = {
    Base: 'Base',
    Clothes: 'Clothes',
    MouthBase: 'Mouth',
    Background: 'Background',
    FacialHair: 'Facial Hair',
    MouthItem: 'Mouth Item',
    Mask: 'Mask',
    Eyes: 'Eyes',
    Head: 'Head',
  };

  for (const layer of REQUIRED_LAYERS_FOR_EXPORT) {
    const path = selectedLayers[layer];
    if (!path || path === '' || path === 'None') {
      missing.push(displayNames[layer]);
    }
  }
  return missing;
}

// ============ Reducer ============

function generatorReducer(state: GeneratorState, action: GeneratorAction): GeneratorState {
  switch (action.type) {
    case 'SET_LAYER': {
      const updatedLayers = { ...state.selectedLayers, [action.layer]: action.path };

      // When Base is selected, auto-set matching clothes if user hasn't manually selected clothes
      // or if clothes is still on a default/matching value
      if (action.layer === 'Base' && action.path) {
        const matchingClothes = getClothesForBase(action.path);
        const currentClothes = state.selectedLayers.Clothes || '';

        // Check if current clothes is a "default" matching clothes (from BASE_CLOTHES_MAP or DEFAULT_CLOTHES_PATH)
        const isDefaultClothes = Object.values(BASE_CLOTHES_MAP).includes(currentClothes) ||
                                 currentClothes === DEFAULT_CLOTHES_PATH ||
                                 currentClothes === '';

        if (isDefaultClothes) {
          updatedLayers.Clothes = matchingClothes;
        }
      }

      const { newLayers, result } = applyRules(updatedLayers);

      const newState = pushHistory(state, newLayers);

      return {
        ...newState,
        selectedLayers: newLayers,
        disabledLayers: result.disabledLayers,
        disabledOptions: result.disabledOptions,
        disabledReasons: result.reasons,
        disabledOptionReasons: result.disabledOptionReasons,
        isPreviewStale: true,
      };
    }

    case 'CLEAR_LAYER': {
      const updatedLayers = { ...state.selectedLayers, [action.layer]: '' };

      // Required layers reset to defaults instead of being cleared
      if (action.layer === 'MouthBase') {
        updatedLayers.MouthBase = DEFAULT_SELECTIONS.MouthBase;
      }
      if (action.layer === 'Clothes') {
        updatedLayers.Clothes = DEFAULT_SELECTIONS.Clothes;
      }

      const { newLayers, result } = applyRules(updatedLayers);

      const newState = pushHistory(state, newLayers);

      return {
        ...newState,
        selectedLayers: newLayers,
        disabledLayers: result.disabledLayers,
        disabledOptions: result.disabledOptions,
        disabledReasons: result.reasons,
        disabledOptionReasons: result.disabledOptionReasons,
        isPreviewStale: true,
      };
    }

    case 'SET_ACTIVE_LAYER':
      return { ...state, activeLayer: action.layer };

    case 'RANDOMIZE': {
      const { newLayers, result } = applyRules(action.selections);
      const newState = pushHistory(state, newLayers);

      return {
        ...newState,
        selectedLayers: newLayers,
        disabledLayers: result.disabledLayers,
        disabledOptions: result.disabledOptions,
        disabledReasons: result.reasons,
        disabledOptionReasons: result.disabledOptionReasons,
        isPreviewStale: true,
      };
    }

    case 'CLEAR_ALL': {
      // Reset to default selections instead of empty
      const { newLayers, result } = applyRules(DEFAULT_SELECTIONS);
      const newState = pushHistory(state, newLayers);

      return {
        ...newState,
        selectedLayers: newLayers,
        disabledLayers: result.disabledLayers,
        disabledOptions: result.disabledOptions,
        disabledReasons: result.reasons,
        disabledOptionReasons: result.disabledOptionReasons,
        isPreviewStale: true,
      };
    }

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const layers = state.history[newIndex];
      if (!layers) return state;

      const { result } = applyRules(layers);

      return {
        ...state,
        selectedLayers: layers,
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
      const layers = state.history[newIndex];
      if (!layers) return state;

      const { result } = applyRules(layers);

      return {
        ...state,
        selectedLayers: layers,
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

    case 'LOAD_FAVORITE': {
      const { newLayers, result } = applyRules(action.selections);
      const newState = pushHistory(state, newLayers);

      return {
        ...newState,
        selectedLayers: newLayers,
        disabledLayers: result.disabledLayers,
        disabledOptions: result.disabledOptions,
        disabledReasons: result.reasons,
        disabledOptionReasons: result.disabledOptionReasons,
        isPreviewStale: true,
        isFavoritesOpen: false,
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

    case 'APPLY_RULES':
      return {
        ...state,
        disabledLayers: action.result.disabledLayers,
        disabledOptions: action.result.disabledOptions,
        disabledReasons: action.result.reasons,
        disabledOptionReasons: action.result.disabledOptionReasons,
      };

    case 'INITIALIZE':
      return { ...state, isInitialized: true };

    default:
      return state;
  }
}

// ============ Context ============

const GeneratorContext = createContext<GeneratorContextValue | null>(null);

// ============ Provider ============

interface GeneratorProviderProps {
  children: ReactNode;
}

export function GeneratorProvider({ children }: GeneratorProviderProps) {
  const [state, dispatch] = useReducer(generatorReducer, null, createInitialState);

  // Initialize generator service and set defaults
  useEffect(() => {
    generatorService.prefetchLayers().then(() => {
      // Set default selections on first load
      dispatch({ type: 'RANDOMIZE', selections: DEFAULT_SELECTIONS });
      dispatch({ type: 'INITIALIZE' });
    });
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('wojak-favorites');
      if (stored) {
        const favorites = JSON.parse(stored) as FavoriteWojak[];
        dispatch({ type: 'LOAD_FAVORITES', favorites });
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('wojak-favorites', JSON.stringify(state.favorites));
    } catch {
      // Ignore storage errors
    }
  }, [state.favorites]);

  // Track render version to cancel stale renders
  const renderVersionRef = useRef(0);

  // Render preview when selections change
  useEffect(() => {
    if (!state.isPreviewStale) return;

    // Check if there's a base selection
    const basePath = state.selectedLayers.Base;
    const hasSelection = !!basePath && basePath !== '' && basePath !== 'None';

    if (!hasSelection) {
      // Clear preview if no base selected
      dispatch({ type: 'SET_PREVIEW', image: '' });
      return;
    }

    // Increment version to cancel any in-flight renders
    const currentVersion = ++renderVersionRef.current;

    dispatch({ type: 'SET_RENDERING', isRendering: true });

    renderPreview(state.selectedLayers)
      .then((dataUrl) => {
        // Only update if this is still the latest render
        if (renderVersionRef.current === currentVersion) {
          dispatch({ type: 'SET_PREVIEW', image: dataUrl });
        }
      })
      .catch((error) => {
        console.error('Failed to render preview:', error);
        if (renderVersionRef.current === currentVersion) {
          dispatch({ type: 'SET_RENDERING', isRendering: false });
        }
      });
  }, [state.selectedLayers, state.isPreviewStale]);

  // Get layer images
  const getLayerImages = useCallback(async (layer: UILayerName) => {
    return generatorService.getLayerImages(layer);
  }, []);

  // Actions
  const selectLayer = useCallback((layer: UILayerName, path: string) => {
    dispatch({ type: 'SET_LAYER', layer, path });
  }, []);

  const clearLayer = useCallback((layer: UILayerName) => {
    dispatch({ type: 'CLEAR_LAYER', layer });
  }, []);

  const setActiveLayer = useCallback((layer: UILayerName) => {
    dispatch({ type: 'SET_ACTIVE_LAYER', layer });
  }, []);

  const randomize = useCallback(async () => {
    const randomSelections: SelectedLayers = {};

    // Import weighted randomizer utilities
    const {
      getWeightedRandomTrait,
      hasWeightedFrequencies,
      normalizeName,
    } = await import('@/lib/weightedRandomizer');

    /**
     * Find image by weighted trait name
     * Matches display names to frequency keys using normalization
     */
    const findImageByTrait = (
      images: Array<{ path: string; displayName: string }>,
      traitName: string
    ): { path: string; displayName: string } | null => {
      const normalizedTrait = normalizeName(traitName);

      // Try exact match first
      for (const img of images) {
        if (normalizeName(img.displayName) === normalizedTrait) {
          return img;
        }
      }

      // Try partial match (trait contains or is contained)
      for (const img of images) {
        const normalizedDisplay = normalizeName(img.displayName);
        if (
          normalizedDisplay.includes(normalizedTrait) ||
          normalizedTrait.includes(normalizedDisplay)
        ) {
          return img;
        }
      }

      return null;
    };

    /**
     * Select a random image using weighted frequencies when available
     * Falls back to uniform random if no weights defined or no match found
     */
    const selectWeightedRandom = async (
      layerName: UILayerName
    ): Promise<string | null> => {
      const images = await generatorService.getLayerImages(layerName);
      if (images.length === 0) return null;

      // Try weighted selection if frequencies exist for this layer
      if (hasWeightedFrequencies(layerName)) {
        const weightedTrait = getWeightedRandomTrait(layerName);
        if (weightedTrait) {
          const matchedImage = findImageByTrait(images, weightedTrait);
          if (matchedImage) {
            return matchedImage.path;
          }
        }
      }

      // Fallback: uniform random selection
      const randomIndex = Math.floor(Math.random() * images.length);
      return images[randomIndex].path;
    };

    // Required layers that MUST always be selected (including Background for randomization)
    const requiredLayers: UILayerName[] = ['Base', 'Clothes', 'MouthBase', 'Background'];

    // Optional layers that have a chance to be selected
    const optionalLayers: UILayerName[] = ['FacialHair', 'MouthItem', 'Eyes', 'Head'];

    // Always select required layers with weighted randomization
    for (const layerName of requiredLayers) {
      const path = await selectWeightedRandom(layerName);
      if (path) {
        randomSelections[layerName] = path;
      }
    }

    // Randomly select optional layers (60% chance each) with weighted randomization
    for (const layerName of optionalLayers) {
      const shouldSelect = Math.random() < 0.6;
      if (shouldSelect) {
        const path = await selectWeightedRandom(layerName);
        if (path) {
          randomSelections[layerName] = path;
        }
      }
    }

    // Mask has a much lower chance (15%) - most Wojaks should be unmasked
    if (Math.random() < 0.15) {
      const maskPath = await selectWeightedRandom('Mask');
      if (maskPath) {
        randomSelections.Mask = maskPath;
      }
    }

    // Apply rules to check for conflicts and fix invalid combinations
    const rulesResult = getDisabledLayers(randomSelections);

    // Apply forced selections from rules (e.g., force MouthBase to Numb)
    if (rulesResult.forceSelections) {
      for (const [layer, path] of Object.entries(rulesResult.forceSelections)) {
        if (path === '') {
          delete randomSelections[layer as UILayerName];
        } else {
          randomSelections[layer as UILayerName] = path;
        }
      }
    }

    // Clear any selections that conflict with rules
    if (rulesResult.clearSelections) {
      for (const layer of rulesResult.clearSelections) {
        delete randomSelections[layer];
      }
    }

    dispatch({ type: 'RANDOMIZE', selections: randomSelections });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  // Blocking checks
  const isLayerDisabled = useCallback(
    (layer: UILayerName) => {
      return state.disabledLayers.includes(layer);
    },
    [state.disabledLayers]
  );

  const isOptionDisabled = useCallback(
    (layer: UILayerName, optionName: string) => {
      const options = state.disabledOptions[layer];
      if (!options) return false;
      return options.some((opt) => optionName.toLowerCase().includes(opt.toLowerCase()));
    },
    [state.disabledOptions]
  );

  const getDisabledReason = useCallback(
    (layer: UILayerName) => {
      return state.disabledReasons[layer] || null;
    },
    [state.disabledReasons]
  );

  const getOptionDisabledReason = useCallback(
    (layer: UILayerName, optionName: string) => {
      const layerReasons = state.disabledOptionReasons[layer];
      if (!layerReasons) return null;

      // Direct match
      if (layerReasons[optionName]) return layerReasons[optionName];

      // Case-insensitive match
      const lowerOptionName = optionName.toLowerCase();
      for (const [key, reason] of Object.entries(layerReasons)) {
        if (key.toLowerCase() === lowerOptionName || lowerOptionName.includes(key.toLowerCase())) {
          return reason;
        }
      }
      return null;
    },
    [state.disabledOptionReasons]
  );

  // History
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  // Favorites
  const toggleFavorites = useCallback((isOpen: boolean) => {
    dispatch({ type: 'TOGGLE_FAVORITES', isOpen });
  }, []);

  const saveFavorite = useCallback(
    async (name: string) => {
      // Check minimum requirements
      if (!canExportOrSave(state.selectedLayers)) {
        const missing = getMissingRequiredLayers(state.selectedLayers);
        throw new Error(`Please select: ${missing.join(', ')}`);
      }

      // Generate thumbnail
      let thumbnailDataUrl = '';
      try {
        thumbnailDataUrl = await renderThumbnail(state.selectedLayers);
      } catch (error) {
        console.warn('Failed to generate thumbnail:', error);
      }

      // Generate UUID with fallback for non-secure contexts (mobile HTTP)
      const generateId = (): string => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          try {
            return crypto.randomUUID();
          } catch {
            // Fallback for non-secure contexts
          }
        }
        // Fallback: generate a simple unique ID
        return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      };

      const favorite: FavoriteWojak = {
        id: generateId(),
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
        selections: state.selectedLayers as SelectedLayersType,
        thumbnailDataUrl,
      };

      dispatch({ type: 'ADD_FAVORITE', favorite });
    },
    [state.selectedLayers]
  );

  const removeFavorite = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_FAVORITE', id });
  }, []);

  const renameFavorite = useCallback((id: string, name: string) => {
    dispatch({ type: 'RENAME_FAVORITE', id, name });
  }, []);

  const loadFavorite = useCallback((favorite: FavoriteWojak) => {
    dispatch({ type: 'LOAD_FAVORITE', selections: favorite.selections as SelectedLayers });
  }, []);

  // Export
  const toggleExport = useCallback((isOpen: boolean) => {
    dispatch({ type: 'TOGGLE_EXPORT', isOpen });
  }, []);

  const exportWojak = useCallback(
    async (options: ExportOptions, filename?: string) => {
      // Check minimum requirements
      if (!canExportOrSave(state.selectedLayers)) {
        const missing = getMissingRequiredLayers(state.selectedLayers);
        throw new Error(`Please select: ${missing.join(', ')}`);
      }

      try {
        await downloadImage(state.selectedLayers, options, filename || 'my-wojak');
      } catch (error) {
        console.error('Export failed:', error);
        throw error;
      }
    },
    [state.selectedLayers]
  );

  // Mobile
  const setScrollPosition = useCallback((position: number) => {
    dispatch({ type: 'SET_SCROLL_POSITION', position });
  }, []);

  const setStickyPreview = useCallback((show: boolean) => {
    dispatch({ type: 'SET_STICKY_PREVIEW', show });
  }, []);

  // Validation state
  const canExport = canExportOrSave(state.selectedLayers);
  const missingLayers = getMissingRequiredLayers(state.selectedLayers);

  // Memoized context value
  const value = useMemo<GeneratorContextValue>(
    () => ({
      ...state,
      getLayerImages,
      selectLayer,
      clearLayer,
      setActiveLayer,
      randomize,
      clearAll,
      undo,
      redo,
      isLayerDisabled,
      isOptionDisabled,
      getDisabledReason,
      getOptionDisabledReason,
      canUndo,
      canRedo,
      toggleFavorites,
      saveFavorite,
      removeFavorite,
      renameFavorite,
      loadFavorite,
      toggleExport,
      exportWojak,
      canExport,
      missingLayers,
      setScrollPosition,
      setStickyPreview,
    }),
    [
      state,
      getLayerImages,
      selectLayer,
      clearLayer,
      setActiveLayer,
      randomize,
      clearAll,
      undo,
      redo,
      isLayerDisabled,
      isOptionDisabled,
      getDisabledReason,
      getOptionDisabledReason,
      canUndo,
      canRedo,
      toggleFavorites,
      saveFavorite,
      removeFavorite,
      renameFavorite,
      loadFavorite,
      toggleExport,
      exportWojak,
      canExport,
      missingLayers,
      setScrollPosition,
      setStickyPreview,
    ]
  );

  return <GeneratorContext.Provider value={value}>{children}</GeneratorContext.Provider>;
}

// ============ Hook ============

export function useGenerator(): GeneratorContextValue {
  const context = useContext(GeneratorContext);
  if (!context) {
    throw new Error('useGenerator must be used within a GeneratorProvider');
  }
  return context;
}
