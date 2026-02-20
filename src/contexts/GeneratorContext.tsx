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
  useState,
  type ReactNode,
} from 'react';
import type { FavoriteWojak, ExportOptions, G2Selection, G2Selections } from '@/types/generator';
import { isFavoriteV2, isSelectionPathEmpty } from '@/types/generator';
import { getDisabledLayers, type SelectedLayers, type UILayerName } from '@/lib/wojakRules';
import { DEFAULT_SELECTIONS } from '@/config/layers';
import { SCENE_BACKGROUNDS } from '@/lib/layerRegistry';
import { G2_DEFAULT_COLORS, getG2DefaultColor } from '@/config/g2DefaultColors';
import { generatorService, type LayerImage, type UnifiedTrait, getUnifiedTraits, getPathToTraitIdMap, ensurePathToTraitIdMapReady } from '@/services/generatorService';
import { createSelectionResolver } from '@/lib/selectionResolver';
import { toExternal, fromExternal } from '@/lib/selectionAdapter';
import { isUserPickableFill, getAllUserPickableFillSlots } from '@/lib/g2FillTreatments';
import { GENERATOR_PALETTE_HEX } from '@/components/generator/ColorPicker';
import { renderPreview, renderThumbnail, downloadImage } from '@/services/canvasRenderer';
import { createInitialState, generatorReducer, type GeneratorState } from '@/contexts/generatorReducer';
import { canExportOrSave, getMissingRequiredLayers, isUILayerName } from '@/contexts/generatorStateUtils';
import {
  getWeightedRandomTrait,
  hasWeightedFrequencies,
  normalizeName,
  addTrait as addWeightedTrait,
  findMatchingTrait as findInFrequencies,
} from '@/lib/weightedRandomizer';

// ============ Randomizer Helpers ============

/** Pick a random color from the generator palette */
function pickRandomColor(): string {
  return GENERATOR_PALETTE_HEX[Math.floor(Math.random() * GENERATOR_PALETTE_HEX.length)];
}

/** Build random colors for all user-pickable fill slots on a G2 trait */
function buildRandomColors(trait: UnifiedTrait): Record<string, string> {
  const slots = getAllUserPickableFillSlots(trait.id, trait);
  const colors: Record<string, string> = {};
  for (const slot of slots) {
    colors[slot] = pickRandomColor();
  }
  return colors;
}

/**
 * Pure function to build a G2Selection for a trait WITHOUT dispatching.
 * Mirrors the logic in selectG2Layer so randomize() can build complete
 * snapshots (including G2 data) before dispatching RANDOMIZE.
 */
function buildG2Selection(
  trait: UnifiedTrait,
  initialColors?: Record<string, string>
): { virtualPath: string; g2: G2Selection } {
  const virtualPath = `/g2/${trait.category}/${trait.name.replace(/\s+/g, '-')}`;

  // Build default colors only for user-pickable fill slots
  const colors: Record<string, string> = {};
  if (trait.fillFile && trait.defaultColor && isUserPickableFill(trait.id, 'fill')) {
    colors['fill'] = trait.defaultColor;
  }
  if (trait.fill1File && trait.defaultColor && isUserPickableFill(trait.id, 'fill1')) {
    colors['fill1'] = trait.defaultColor;
  }
  if (trait.fill2File && isUserPickableFill(trait.id, 'fill2')) {
    colors['fill2'] = trait.defaultColor2 || trait.defaultColor || '#FFFFFF';
  }
  if (trait.fillFiles && trait.defaultColors) {
    trait.fillFiles.forEach((_, i) => {
      const key = `fill${i}`;
      if (isUserPickableFill(trait.id, key)) {
        colors[key] = trait.defaultColors![i] || '#FFFFFF';
      }
    });
  }
  // Layered colorable
  if (trait.layers && trait.colorable && trait.defaultColors) {
    const layerKeyToFill: Record<string, string> = {
      mfill0: 'fill0', mfill1: 'fill1', mfill2: 'fill2', mfill3: 'fill3', mfill4: 'fill4',
      fill1: 'fill1', fill2: 'fill2',
    };
    for (const layer of trait.layers) {
      if (layer.type === 'fill' && layerKeyToFill[layer.key]) {
        const slot = layerKeyToFill[layer.key];
        if (isUserPickableFill(trait.id, slot)) {
          const twoFills = trait.defaultColors.length === 2 && (slot === 'fill1' || slot === 'fill2');
          const idx = twoFills
            ? (slot === 'fill1' ? 0 : 1)
            : (slot === 'fill0' ? 0 : slot === 'fill1' ? 1 : slot === 'fill2' ? 2 : slot === 'fill3' ? 3 : 4);
          colors[slot] = trait.defaultColors[idx] ?? trait.defaultColor ?? '#A0522D';
        }
      }
    }
  }
  // Special cases
  if (trait.id === 'Head_viking-helmet') {
    colors.fill1 = colors.fill1 ?? trait.defaultColors?.[0] ?? '#FF6B00';
  }
  if (trait.id === 'Face-wear_3d-glases') {
    colors.fill1 = colors.fill1 ?? trait.defaultColors?.[0] ?? getG2DefaultColor('Face-wear_3d-glases', 'fill1', trait, '#2563EB');
  }

  const g2: G2Selection = {
    traitId: trait.id,
    g2Category: trait.id.split('_')[0],
    colors: initialColors ? { ...colors, ...initialColors } : colors,
    detailOption: trait.detailOptions?.[0]?.file,
    ...(trait.id === 'Head_Cap' && {
      detailOption: undefined,
    }),
    ...(trait.id === 'Head_Construction-Helmet' && {
      detailOption: undefined,
      constructionHelmetChiaLogo: true,
      constructionHelmetCigPack: trait.detailOptions?.find(d => d.file.endsWith('cig-pack.png'))?.file ?? 'Head_Construction-Helmet_detail_cig-pack.png',
    }),
    ...(trait.id === 'Clothes_Suit' && {
      detailOption: trait.detailOptions?.[0]?.file,
      activeColorSlot: 'fill0' as const,
    }),
    ...(trait.id === 'Clothes_Astronaut' && {
      logoOption: 'CAT',
      flagOption: 'us',
    }),
    ...(trait.id === 'Clothes_Bepe-army' && {
      name1: '',
      name2: '',
    }),
    ...(trait.id === 'Clothes_Bepe-suit' && {
      suitVariant: 'bepe' as const,
    }),
    ...(trait.id === 'Clothes_Chia-farmer' && {
      chiaFarmerUnderlayer: 'tee' as const,
      activeColorSlot: 'fill0' as const,
    }),
    ...(trait.id === 'Clothes_Wizard-drip' && {
      detailOption: trait.detailOptions?.[0]?.file,
    }),
    ...(trait.id === 'Head_Beer-Hat' && {
      detailOption: trait.detailOptions?.find(d => d.name === 'Citrus')?.file ?? trait.detailOptions?.[0]?.file,
      beerHatEditFocus: 'beer' as const,
      beerHatUnderlayer: 'Head_Cap',
      beerHatUnderlayerG2: {
        traitId: 'Head_Cap',
        g2Category: 'Head',
        colors: { fill: G2_DEFAULT_COLORS['Head_Cap']?.fill ?? '#228B22' },
      },
    }),
    ...(trait.id === 'Face-wear_MOG-Glasses' && {
      detailOption: trait.detailOptions?.find(d => d.name === 'Default (Rainbow)')?.file ?? trait.detailOptions?.[0]?.file,
    }),
    ...(() => {
      const slots = getAllUserPickableFillSlots(trait.id, trait);
      return slots.length > 1 && trait.id !== 'Clothes_Suit' && trait.id !== 'Clothes_Chia-farmer'
        ? { activeColorSlot: slots[0] }
        : {};
    })(),
  };

  // Apply centralized defaults from g2DefaultColors
  const defaults = G2_DEFAULT_COLORS[trait.id];
  if (defaults) {
    for (const [slot, hex] of Object.entries(defaults)) {
      if (initialColors?.[slot] !== undefined) continue;
      g2.colors = { ...g2.colors, [slot]: hex };
    }
    if (trait.id === 'Clothes_Chia-farmer') delete g2.colors.fill;
  }
  // Fallback: use getG2DefaultColor for any user-pickable slot without initialColors
  if (trait.fillFile && g2.colors.fill === undefined && initialColors?.fill === undefined) {
    g2.colors.fill = getG2DefaultColor(trait.id, 'fill', trait, '#FFFFFF');
  }
  if (trait.fill1File && g2.colors.fill1 === undefined && initialColors?.fill1 === undefined) {
    g2.colors.fill1 = getG2DefaultColor(trait.id, 'fill1', trait, '#FFFFFF');
  }
  if (trait.fill2File && g2.colors.fill2 === undefined && initialColors?.fill2 === undefined) {
    g2.colors.fill2 = getG2DefaultColor(trait.id, 'fill2', trait, '#FFFFFF');
  }

  return { virtualPath, g2 };
}

// ============ Types ============

/** Full Beer Hat g2 for card thumbnail when Head is not Beer Hat (so grid card shows correct cans + underlayer) */
const BEER_HAT_CARD_G2: G2Selection = {
  traitId: 'Head_Beer-Hat',
  g2Category: 'Head',
  colors: {},
  detailOption: 'Head_Beer-Hat_detail_Tang.png',
  beerHatEditFocus: 'beer',
  beerHatUnderlayer: 'Head_Cap',
  beerHatUnderlayerG2: {
    traitId: 'Head_Cap',
    g2Category: 'Head',
    colors: { fill: G2_DEFAULT_COLORS['Head_Cap']?.fill ?? '#228B22' },
  },
};

interface GeneratorContextValue extends GeneratorState {
  /** Derived from selections for mint/renderer/legacy consumers */
  selectedLayers: SelectedLayers;
  g2Selections: G2Selections;
  /** Pre-rendered Beer Hat thumbnail for the Head grid card when Beer Hat is not selected (so card always shows full cans + underlayer) */
  beerHatCardThumbnailUrl: string | null;
  // Layer images
  getLayerImages: (layer: UILayerName) => Promise<LayerImage[]>;

  // Unified traits (G1 + G2 merged)
  getUnifiedTraitsForLayer: (layer: UILayerName) => Promise<UnifiedTrait[]>;

  // Actions
  selectLayer: (layer: UILayerName, path: string) => void;
  selectG2Layer: (layer: UILayerName, trait: UnifiedTrait, initialColors?: Record<string, string>) => void;
  setG2Color: (layer: UILayerName, slot: string, color: string) => void;
  setColor: (layer: UILayerName, color: string) => void;
  setG2Detail: (layer: UILayerName, detailOption?: string, frameOption?: string, logoOption?: string, flagOption?: string, name1?: string, name2?: string, activeColorSlot?: string, suitVariant?: 'bepe' | 'pepe', chiaFarmerUnderlayer?: 'tee' | 'tanktop', constructionHelmetChiaLogo?: boolean, constructionHelmetCigPack?: string, beerHatUnderlayer?: string, beerHatUnderlayerG2?: G2Selection, beerHatEditFocus?: 'beer' | 'underlayer', variant?: string) => void;
  setBeerHatEditFocus: (focus: 'beer' | 'underlayer') => void;
  clearLayer: (layer: UILayerName) => void;
  setActiveLayer: (layer: UILayerName) => void;
  randomize: () => void;
  randomizeLayer: (layer: UILayerName) => Promise<void>;
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

  // Error
  clearGeneratorError: () => void;
}

// ============ Context ============

const GeneratorContext = createContext<GeneratorContextValue | null>(null);

// ============ Provider ============

interface GeneratorProviderProps {
  children: ReactNode;
}

export function GeneratorProvider({ children }: GeneratorProviderProps) {
  const [state, dispatch] = useReducer(generatorReducer, null, createInitialState);

  // Initialize generator service, build pathToTraitIdMap, then set default unified selections
  useEffect(() => {
    generatorService
      .prefetchLayers()
      .then(() => ensurePathToTraitIdMapReady())
      .then(() => {
        // Add a random scene background to defaults on each page load
        const randomScene = SCENE_BACKGROUNDS[Math.floor(Math.random() * SCENE_BACKGROUNDS.length)];
        const defaultsWithBackground = { ...DEFAULT_SELECTIONS, Background: randomScene };
        const defaultUnified = fromExternal(defaultsWithBackground, {}, getPathToTraitIdMap());
        dispatch({ type: 'RANDOMIZE', selections: defaultUnified });
        dispatch({ type: 'INITIALIZE' });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load generator';
        dispatch({ type: 'SET_ERROR', error: message });
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

  // Derived dual shape for mint/renderer/legacy consumers
  const derived = useMemo(() => toExternal(state.selections), [state.selections]);

  // Track render version to cancel stale renders
  const renderVersionRef = useRef(0);

  // Normalize Beer Hat g2 so preview/export always get complete can + underlayer (avoids empty cans on first paint)
  const g2SelectionsForRender = useMemo(() => {
    const head = derived.g2Selections?.Head;
    if (head?.traitId !== 'Head_Beer-Hat') return derived.g2Selections;
    const defaultCan = 'Head_Beer-Hat_detail_citrus.png';
    const defaultUnderlayerG2: G2Selection = {
      traitId: 'Head_Cap',
      g2Category: 'Head',
      colors: { fill: G2_DEFAULT_COLORS['Head_Cap']?.fill ?? '#228B22' },
    };
    const normalizedHead: G2Selection = {
      ...head,
      detailOption: head.detailOption && head.detailOption !== '' ? head.detailOption : defaultCan,
      beerHatUnderlayer: head.beerHatUnderlayer ?? 'Head_Cap',
      beerHatUnderlayerG2: head.beerHatUnderlayerG2 ?? defaultUnderlayerG2,
    };
    return { ...derived.g2Selections, Head: normalizedHead };
  }, [derived.g2Selections]);

  // Pre-render Beer Hat card thumbnail with fixed default layers (base + blue tee + mouth) so the grid card never changes with user selections
  const [beerHatCardThumbnailUrl, setBeerHatCardThumbnailUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const layersForBeerHat: SelectedLayers = {
      Base: '/assets/wojak-layers/BASE/BASE_Base-Wojak_classic.png',
      Clothes: '/assets/wojak-layers/CLOTHES/CLOTHES_Tee_blue.png',
      MouthBase: '/assets/wojak-layers/MOUTH/MOUTH_numb.png',
      Head: '/g2/Head/Beer-Hat',
    } as SelectedLayers;
    const g2ForBeerHat: G2Selections = { Head: BEER_HAT_CARD_G2 };
    renderThumbnail(layersForBeerHat, g2ForBeerHat, {})
      .then((dataUrl) => {
        if (!cancelled) setBeerHatCardThumbnailUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setBeerHatCardThumbnailUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Render preview when selections change
  useEffect(() => {
    if (!state.isPreviewStale) return;

    const basePath = derived.selectedLayers.Base;
    const hasSelection = !isSelectionPathEmpty(basePath);

    if (!hasSelection) {
      dispatch({ type: 'SET_PREVIEW', image: '' });
      return;
    }

    const currentVersion = ++renderVersionRef.current;
    dispatch({ type: 'SET_RENDERING', isRendering: true });

    renderPreview(derived.selectedLayers, g2SelectionsForRender, state.selectedColors)
      .then((dataUrl) => {
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
  }, [derived.selectedLayers, g2SelectionsForRender, state.selectedColors, state.isPreviewStale]);

  // Get layer images
  const getLayerImages = useCallback(async (layer: UILayerName) => {
    return generatorService.getLayerImages(layer);
  }, []);

  // Get unified traits (G1 + G2 merged)
  const getUnifiedTraitsForLayer = useCallback(async (layer: UILayerName) => {
    return getUnifiedTraits(layer);
  }, []);

  // Actions (path validation: guard invalid layer or empty path)
  const selectLayer = useCallback((layer: UILayerName, path: string) => {
    if (!isUILayerName(layer) || !path || path.trim() === '') return;
    dispatch({ type: 'SET_LAYER', layer, path });
  }, []);

  /**
   * Select a G2 (YourWojak) trait.
   * Stores a virtual path in selectedLayers for rules engine compatibility,
   * and the full G2 data in g2Selections for the renderer.
   */
  const selectG2Layer = useCallback((layer: UILayerName, trait: UnifiedTrait, initialColors?: Record<string, string>, skipHistory?: boolean) => {
    // Build a virtual path that includes the trait name (so rules pathContains works)
    const virtualPath = `/g2/${trait.category}/${trait.name.replace(/\s+/g, '-')}`;

    // Build default colors only for user-pickable fill slots (derived slots computed at render time)
    const colors: Record<string, string> = {};
    if (trait.fillFile && trait.defaultColor && isUserPickableFill(trait.id, 'fill')) {
      colors['fill'] = trait.defaultColor;
    }
    if (trait.fill1File && trait.defaultColor && isUserPickableFill(trait.id, 'fill1')) {
      colors['fill1'] = trait.defaultColor;
    }
    if (trait.fill2File && isUserPickableFill(trait.id, 'fill2')) {
      colors['fill2'] = trait.defaultColor2 || trait.defaultColor || '#FFFFFF';
    }
    if (trait.fillFiles && trait.defaultColors) {
      trait.fillFiles.forEach((_, i) => {
        const key = `fill${i}`;
        if (isUserPickableFill(trait.id, key)) {
          colors[key] = trait.defaultColors![i] || '#FFFFFF';
        }
      });
    }
    // Layered colorable (e.g. Ninja-turtle-fit, Viking helmet, Military jacket): layers with type fill
    if (trait.layers && trait.colorable && trait.defaultColors) {
      const layerKeyToFill: Record<string, string> = {
        mfill0: 'fill0', mfill1: 'fill1', mfill2: 'fill2', mfill3: 'fill3', mfill4: 'fill4',
        fill1: 'fill1', fill2: 'fill2',
      };
      for (const layer of trait.layers) {
        if (layer.type === 'fill' && layerKeyToFill[layer.key]) {
          const slot = layerKeyToFill[layer.key];
          if (isUserPickableFill(trait.id, slot)) {
            const twoFills = trait.defaultColors.length === 2 && (slot === 'fill1' || slot === 'fill2');
            const idx = twoFills
              ? (slot === 'fill1' ? 0 : 1)
              : (slot === 'fill0' ? 0 : slot === 'fill1' ? 1 : slot === 'fill2' ? 2 : slot === 'fill3' ? 3 : 4);
            colors[slot] = trait.defaultColors[idx] ?? trait.defaultColor ?? '#A0522D';
          }
        }
      }
    }
    // Viking helmet, 3D glasses: ensure fill1 is always set so color picker and renderer have a value
    if (trait.id === 'Head_viking-helmet') {
      colors.fill1 = colors.fill1 ?? trait.defaultColors?.[0] ?? '#FF6B00';
    }
    if (trait.id === 'Face-wear_3d-glases') {
      colors.fill1 = colors.fill1 ?? trait.defaultColors?.[0] ?? getG2DefaultColor('Face-wear_3d-glases', 'fill1', trait, '#2563EB');
    }

    const g2: G2Selection = {
      traitId: trait.id,
      g2Category: trait.id.split('_')[0],
      colors: initialColors ? { ...colors, ...initialColors } : colors,
      detailOption: trait.detailOptions?.[0]?.file,
      ...(trait.id === 'Head_Cap' && {
        detailOption: undefined,
      }),
      ...(trait.id === 'Head_Construction-Helmet' && {
        detailOption: undefined,
        constructionHelmetChiaLogo: true,
        constructionHelmetCigPack: trait.detailOptions?.find(d => d.file.endsWith('cig-pack.png'))?.file ?? 'Head_Construction-Helmet_detail_cig-pack.png',
      }),
      ...(trait.id === 'Clothes_Suit' && {
        detailOption: trait.detailOptions?.[0]?.file,
        activeColorSlot: 'fill0' as const,
      }),
      ...(trait.id === 'Clothes_Astronaut' && {
        logoOption: 'CAT',
        flagOption: 'us',
      }),
      ...(trait.id === 'Clothes_Bepe-army' && {
        name1: '',
        name2: '',
      }),
      ...(trait.id === 'Clothes_Bepe-suit' && {
        suitVariant: 'bepe' as const,
      }),
      ...(trait.id === 'Clothes_Chia-farmer' && {
        chiaFarmerUnderlayer: 'tee' as const,
        activeColorSlot: 'fill0' as const,
      }),
      ...(trait.id === 'Clothes_Wizard-drip' && {
        detailOption: trait.detailOptions?.[0]?.file,
      }),
      ...(trait.id === 'Head_Beer-Hat' && {
        detailOption: trait.detailOptions?.find(d => d.name === 'Citrus')?.file ?? trait.detailOptions?.[0]?.file,
        beerHatEditFocus: 'beer' as const,
        beerHatUnderlayer: 'Head_Cap',
        beerHatUnderlayerG2: {
          traitId: 'Head_Cap',
          g2Category: 'Head',
          colors: { fill: G2_DEFAULT_COLORS['Head_Cap']?.fill ?? '#228B22' },
        },
      }),
      ...(trait.id === 'Face-wear_MOG-Glasses' && {
        detailOption: trait.detailOptions?.find(d => d.name === 'Default (Rainbow)')?.file ?? trait.detailOptions?.[0]?.file,
      }),
      ...(() => {
        const slots = getAllUserPickableFillSlots(trait.id, trait);
        return slots.length > 1 && trait.id !== 'Clothes_Suit' && trait.id !== 'Clothes_Chia-farmer'
          ? { activeColorSlot: slots[0] }
          : {};
      })(),
    };

    // Apply centralized defaults from g2DefaultColors (preview = canvas)
    const defaults = G2_DEFAULT_COLORS[trait.id];
    if (defaults) {
      for (const [slot, hex] of Object.entries(defaults)) {
        if (initialColors?.[slot] !== undefined) continue;
        g2.colors = { ...g2.colors, [slot]: hex };
      }
      if (trait.id === 'Clothes_Chia-farmer') delete g2.colors.fill;
    }
    // Fallback: use getG2DefaultColor for any user-pickable slot without initialColors
    if (trait.fillFile && g2.colors.fill === undefined && initialColors?.fill === undefined) {
      g2.colors.fill = getG2DefaultColor(trait.id, 'fill', trait, '#FFFFFF');
    }
    if (trait.fill1File && g2.colors.fill1 === undefined && initialColors?.fill1 === undefined) {
      g2.colors.fill1 = getG2DefaultColor(trait.id, 'fill1', trait, '#FFFFFF');
    }
    if (trait.fill2File && g2.colors.fill2 === undefined && initialColors?.fill2 === undefined) {
      g2.colors.fill2 = getG2DefaultColor(trait.id, 'fill2', trait, '#FFFFFF');
    }

    dispatch({ type: 'SET_G2_LAYER', layer, path: virtualPath, g2, skipHistory });
  }, []);

  const setG2Color = useCallback((layer: UILayerName, slot: string, color: string) => {
    dispatch({ type: 'SET_G2_COLOR', layer, slot, color });
  }, []);

  const setColor = useCallback((layer: UILayerName, color: string) => {
    dispatch({ type: 'SET_COLOR', layer, color });
  }, []);

  const setG2Detail = useCallback((layer: UILayerName, detailOption?: string, frameOption?: string, logoOption?: string, flagOption?: string, name1?: string, name2?: string, activeColorSlot?: string, suitVariant?: 'bepe' | 'pepe', chiaFarmerUnderlayer?: 'tee' | 'tanktop', constructionHelmetChiaLogo?: boolean, constructionHelmetCigPack?: string, beerHatUnderlayer?: string, beerHatUnderlayerG2?: G2Selection, beerHatEditFocus?: 'beer' | 'underlayer', variant?: string) => {
    dispatch({ type: 'SET_G2_DETAIL', layer, detailOption, frameOption, logoOption, flagOption, name1, name2, activeColorSlot, suitVariant, chiaFarmerUnderlayer, constructionHelmetChiaLogo, constructionHelmetCigPack, beerHatUnderlayer, beerHatUnderlayerG2, beerHatEditFocus, variant });
  }, []);

  const setBeerHatEditFocus = useCallback((focus: 'beer' | 'underlayer') => {
    dispatch({ type: 'SET_G2_DETAIL', layer: 'Head', beerHatEditFocus: focus });
  }, []);

  const clearLayer = useCallback((layer: UILayerName) => {
    if (!isUILayerName(layer)) return;
    dispatch({ type: 'CLEAR_LAYER', layer });
  }, []);

  const setActiveLayer = useCallback((layer: UILayerName) => {
    dispatch({ type: 'SET_ACTIVE_LAYER', layer });
  }, []);

  const randomize = useCallback(async () => {
    const randomSelections: SelectedLayers = {};

    /**
     * Find a unified trait by weighted trait name
     * Matches trait names to frequency keys using normalization
     */
    const findUnifiedTraitByName = (
      traits: UnifiedTrait[],
      traitName: string
    ): UnifiedTrait | null => {
      const normalizedTrait = normalizeName(traitName);

      // Try exact match first
      for (const t of traits) {
        if (normalizeName(t.name) === normalizedTrait) return t;
      }

      // Try partial match (trait contains or is contained)
      for (const t of traits) {
        const normalizedName = normalizeName(t.name);
        if (normalizedName.includes(normalizedTrait) || normalizedTrait.includes(normalizedName)) {
          return t;
        }
      }

      return null;
    };

    /**
     * Select a random unified trait using weighted frequencies when available.
     * Returns both the path (for SelectedLayers) and the UnifiedTrait (for G2 hydration).
     * Falls back to uniform random if no weights defined or no match found.
     */
    const selectWeightedUnified = async (
      layerName: UILayerName
    ): Promise<{ path: string; trait: UnifiedTrait } | null> => {
      let traits = await getUnifiedTraits(layerName);
      if (traits.length === 0) return null;

      // For Background: filter out special virtual backgrounds (Solid color, Price overlays)
      // and ensure we only select traits that produce valid paths
      if (layerName === 'Background') {
        traits = traits.filter(t => {
          // Exclude virtual backgrounds that have __solid__ or __price_ in their path
          if (t.g1Path?.includes('__solid__') || t.g1Path?.includes('__price_')) {
            return false;
          }
          // Exclude traits with empty/invalid names that would produce empty paths
          if (!t.name || t.name.trim() === '' || t.name.toLowerCase() === 'none') {
            return false;
          }
          // Ensure the trait has either a valid g1Path or can produce a valid G2 virtual path
          if (!t.g1Path && (!t.category || !t.name)) {
            return false;
          }
          return true;
        });
        if (traits.length === 0) return null;
      }

      // Register G2-only traits in weighted randomizer so they get a fair (rare) chance
      for (const t of traits) {
        if ((t.source === 'g2') && !t.g1Path && !findInFrequencies(layerName, t.name)) {
          addWeightedTrait(layerName, t.name, 1);
        }
      }

      // Try weighted selection if frequencies exist for this layer
      if (hasWeightedFrequencies(layerName)) {
        const weightedTrait = getWeightedRandomTrait(layerName);
        if (weightedTrait) {
          const matchedTrait = findUnifiedTraitByName(traits, weightedTrait);
          if (matchedTrait) {
            const path = matchedTrait.g1Path || `/g2/${matchedTrait.category}/${matchedTrait.name.replace(/\s+/g, '-')}`;
            return { path, trait: matchedTrait };
          }
        }
      }

      // Fallback: uniform random from all unified traits
      const randomIndex = Math.floor(Math.random() * traits.length);
      const selected = traits[randomIndex];
      const path = selected.g1Path || `/g2/${selected.category}/${selected.name.replace(/\s+/g, '-')}`;
      return { path, trait: selected };
    };

    // Required layers that MUST always be selected (including Background for randomization)
    const requiredLayers: UILayerName[] = ['Base', 'Clothes', 'MouthBase', 'Background'];

    // Optional layers that have a chance to be selected
    const optionalLayers: UILayerName[] = ['FacialHair', 'MouthItem', 'Eyes', 'Head'];

    // Track G2 traits for color hydration after selection
    const g2Picks: { layer: UILayerName; trait: UnifiedTrait; colors: Record<string, string> }[] = [];

    /** Helper to record a selection and track G2 traits for hydration */
    const recordSelection = (layerName: UILayerName, result: { path: string; trait: UnifiedTrait }) => {
      randomSelections[layerName] = result.path;
      // ALL G2/both traits need selectG2Layer — without it the renderer can't resolve
      // virtual paths for G2-only traits, and colorable traits won't get random colors.
      if (result.trait.source === 'g2' || result.trait.source === 'both') {
        g2Picks.push({ layer: layerName, trait: result.trait, colors: buildRandomColors(result.trait) });
      }
    };

    // Always select required layers with weighted randomization
    for (const layerName of requiredLayers) {
      const result = await selectWeightedUnified(layerName);
      if (result) recordSelection(layerName, result);
    }

    // Randomly select optional layers (60% chance each) with weighted randomization
    for (const layerName of optionalLayers) {
      if (Math.random() < 0.6) {
        const result = await selectWeightedUnified(layerName);
        if (result) recordSelection(layerName, result);
      }
    }

    // Mask has a much lower chance (15%) - most Wojaks should be unmasked
    if (Math.random() < 0.15) {
      const result = await selectWeightedUnified('Mask');
      if (result) recordSelection('Mask', result);
    }

    // Apply rules to check for conflicts and fix invalid combinations (Phase 2: resolver)
    const resolver = createSelectionResolver(randomSelections, {}, getPathToTraitIdMap());
    const rulesResult = getDisabledLayers(resolver);

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

    // SAFEGUARD: Background must ALWAYS be selected in randomization
    // If somehow missing or empty, force select a random valid background
    const bgPath = randomSelections.Background;
    const bgIsEmpty = !bgPath || bgPath === '' || bgPath.toLowerCase() === 'none';
    if (bgIsEmpty) {
      const allBgTraits = await getUnifiedTraits('Background');
      const validBgTraits = allBgTraits.filter(t => {
        // Exclude virtual backgrounds
        if (t.g1Path?.includes('__solid__') || t.g1Path?.includes('__price_')) {
          return false;
        }
        // Exclude traits with empty/invalid names
        if (!t.name || t.name.trim() === '' || t.name.toLowerCase() === 'none') {
          return false;
        }
        // Ensure valid path can be constructed
        if (!t.g1Path && (!t.category || !t.name)) {
          return false;
        }
        return true;
      });
      if (validBgTraits.length > 0) {
        const randomBg = validBgTraits[Math.floor(Math.random() * validBgTraits.length)];
        const newBgPath = randomBg.g1Path || `/g2/Background/${randomBg.name.replace(/\s+/g, '-')}`;
        randomSelections.Background = newBgPath;
        if (randomBg.source === 'g2' || randomBg.source === 'both') {
          g2Picks.push({ layer: 'Background', trait: randomBg, colors: buildRandomColors(randomBg) });
        }
      }
    }

    // Build G2 selections map BEFORE dispatching so the history snapshot includes complete G2 data.
    // This ensures undo restores both paths AND G2 rendering data in a single atomic step.
    const g2Map: G2Selections = {};
    for (const { layer, trait, colors } of g2Picks) {
      if (!randomSelections[layer]) continue; // cleared by rules engine
      const { virtualPath, g2 } = buildG2Selection(trait, colors);
      // Update path to match the virtual path (in case g1Path was used initially)
      randomSelections[layer] = virtualPath;
      g2Map[layer] = g2;
    }

    const pathMap = getPathToTraitIdMap();
    const unified = fromExternal(randomSelections, g2Map, pathMap);
    dispatch({ type: 'RANDOMIZE', selections: unified });
  }, []);

  const randomizeLayer = useCallback(async (layer: UILayerName) => {
    const findUnifiedTraitByName = (
      traits: UnifiedTrait[],
      traitName: string
    ): UnifiedTrait | null => {
      const normalizedTrait = normalizeName(traitName);
      for (const t of traits) {
        if (normalizeName(t.name) === normalizedTrait) return t;
      }
      for (const t of traits) {
        const normalizedName = normalizeName(t.name);
        if (normalizedName.includes(normalizedTrait) || normalizedTrait.includes(normalizedName))
          return t;
      }
      return null;
    };

    const traits = await getUnifiedTraits(layer);
    if (traits.length === 0) return;

    // Register G2-only traits in weighted randomizer so they get a fair (rare) chance
    for (const t of traits) {
      if ((t.source === 'g2') && !t.g1Path && !findInFrequencies(layer, t.name)) {
        addWeightedTrait(layer, t.name, 1);
      }
    }

    // Select trait using weighted frequencies
    let selectedTrait: UnifiedTrait | null = null;
    if (hasWeightedFrequencies(layer)) {
      const weightedName = getWeightedRandomTrait(layer);
      if (weightedName) {
        selectedTrait = findUnifiedTraitByName(traits, weightedName);
      }
    }
    // Fallback: uniform random
    if (!selectedTrait) {
      selectedTrait = traits[Math.floor(Math.random() * traits.length)];
    }

    const path = selectedTrait.g1Path || `/g2/${selectedTrait.category}/${selectedTrait.name.replace(/\s+/g, '-')}`;

    const newSelectedLayers: SelectedLayers = { ...derived.selectedLayers, [layer]: path };
    const newG2: G2Selections = { ...derived.g2Selections };
    delete newG2[layer];
    const resolver = createSelectionResolver(newSelectedLayers, newG2, getPathToTraitIdMap());
    const rulesResult = getDisabledLayers(resolver);
    const finalSelectedLayers = { ...newSelectedLayers };
    if (rulesResult.forceSelections) {
      for (const [l, p] of Object.entries(rulesResult.forceSelections)) {
        if (p === '') delete finalSelectedLayers[l as UILayerName];
        else finalSelectedLayers[l as UILayerName] = p;
      }
    }
    if (rulesResult.clearSelections) {
      for (const l of rulesResult.clearSelections) {
        delete finalSelectedLayers[l];
      }
    }

    // Build G2 selection for the new trait BEFORE dispatching so the history
    // snapshot includes complete G2 rendering data (atomic undo).
    if (finalSelectedLayers[layer] && selectedTrait &&
        (selectedTrait.source === 'g2' || selectedTrait.source === 'both')) {
      const randomColors = buildRandomColors(selectedTrait);
      const { virtualPath, g2 } = buildG2Selection(selectedTrait, randomColors);
      finalSelectedLayers[layer] = virtualPath;
      newG2[layer] = g2;
    }

    const pathMap = getPathToTraitIdMap();
    const unified = fromExternal(finalSelectedLayers, newG2, pathMap);
    dispatch({ type: 'RANDOMIZE', selections: unified });
  }, [derived.selectedLayers, derived.g2Selections]);

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
      if (!canExportOrSave(derived.selectedLayers)) {
        const missing = getMissingRequiredLayers(derived.selectedLayers);
        const msg = `Please select: ${missing.join(', ')}`;
        dispatch({ type: 'SET_ERROR', error: msg });
        throw new Error(msg);
      }

      let thumbnailDataUrl = '';
      try {
        thumbnailDataUrl = await renderThumbnail(derived.selectedLayers, g2SelectionsForRender, state.selectedColors);
      } catch (error) {
        console.warn('Failed to generate thumbnail:', error);
      }

      const generateId = (): string => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          try {
            return crypto.randomUUID();
          } catch {
            // Fallback for non-secure contexts
          }
        }
        return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      };

      const favorite: FavoriteWojak = {
        id: generateId(),
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 2,
        unifiedSelections: state.selections,
        thumbnailDataUrl,
      };

      dispatch({ type: 'ADD_FAVORITE', favorite });
    },
    [state.selections, derived.selectedLayers, g2SelectionsForRender, state.selectedColors]
  );

  const removeFavorite = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_FAVORITE', id });
  }, []);

  const renameFavorite = useCallback((id: string, name: string) => {
    dispatch({ type: 'RENAME_FAVORITE', id, name });
  }, []);

  const loadFavorite = useCallback((favorite: FavoriteWojak) => {
    const unified = isFavoriteV2(favorite)
      ? favorite.unifiedSelections
      : fromExternal(favorite.selections, favorite.g2Selections, getPathToTraitIdMap());
    dispatch({ type: 'LOAD_FAVORITE_UNIFIED', unifiedSelections: unified });
  }, []);

  // Export
  const toggleExport = useCallback((isOpen: boolean) => {
    dispatch({ type: 'TOGGLE_EXPORT', isOpen });
  }, []);

  const exportWojak = useCallback(
    async (options: ExportOptions, filename?: string) => {
      if (!canExportOrSave(derived.selectedLayers)) {
        const missing = getMissingRequiredLayers(derived.selectedLayers);
        const msg = `Please select: ${missing.join(', ')}`;
        dispatch({ type: 'SET_ERROR', error: msg });
        throw new Error(msg);
      }

      try {
        await downloadImage(derived.selectedLayers, options, filename || 'my-wojak', g2SelectionsForRender, state.selectedColors);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Export failed';
        dispatch({ type: 'SET_ERROR', error: message });
        throw error;
      }
    },
    [derived.selectedLayers, g2SelectionsForRender, state.selectedColors]
  );

  // Mobile
  const setScrollPosition = useCallback((position: number) => {
    dispatch({ type: 'SET_SCROLL_POSITION', position });
  }, []);

  const setStickyPreview = useCallback((show: boolean) => {
    dispatch({ type: 'SET_STICKY_PREVIEW', show });
  }, []);

  const clearGeneratorError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', error: null });
  }, []);

  const canExport = canExportOrSave(derived.selectedLayers);
  const missingLayers = getMissingRequiredLayers(derived.selectedLayers);

  const value = useMemo<GeneratorContextValue>(
    () => ({
      ...state,
      selectedLayers: derived.selectedLayers,
      g2Selections: derived.g2Selections,
      beerHatCardThumbnailUrl,
      getLayerImages,
      getUnifiedTraitsForLayer,
      selectLayer,
      selectG2Layer,
      setG2Color,
      setColor,
      setG2Detail,
      setBeerHatEditFocus,
      clearLayer,
      setActiveLayer,
      randomize,
      randomizeLayer,
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
      clearGeneratorError,
    }),
    [
      state,
      beerHatCardThumbnailUrl,
      getLayerImages,
      getUnifiedTraitsForLayer,
      selectLayer,
      selectG2Layer,
      setG2Color,
      setColor,
      setG2Detail,
      setBeerHatEditFocus,
      clearLayer,
      setActiveLayer,
      randomize,
      randomizeLayer,
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
      clearGeneratorError,
      derived.selectedLayers,
      derived.g2Selections,
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

/** Non-throwing variant — returns null when called outside GeneratorProvider.
 *  Use this in hooks/components that may run outside the generator route. */
export function useGeneratorOptional(): GeneratorContextValue | null {
  return useContext(GeneratorContext);
}
