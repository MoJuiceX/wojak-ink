/**
 * Layer Configuration
 *
 * Re-exports from layerRegistry and adds CANVAS_CONFIG, BASE_TYPES, RANDOMIZATION_CONFIG.
 * Layer definitions and order live in @/lib/layerRegistry.
 */

import type { UILayerName } from '@/lib/layerRegistry';
import {
  RENDER_ORDER,
  UI_ORDER,
  LAYER_META,
  getLayerMeta,
  isLayerRequired,
  REQUIRED_LAYERS_FOR_EXPORT,
  DEFAULT_SELECTIONS,
  BASE_CLOTHES_MAP,
  DEFAULT_CLOTHES_PATH,
  DEFAULT_BASE_PATH,
  DEFAULT_MOUTHBASE_PATH,
} from '@/lib/layerRegistry';
import type { LayerConfig, RandomizationConfig } from '@/types/generator';

// Re-export for consumers that need registry data
export type { UILayerName } from '@/lib/layerRegistry';
export { UI_ORDER, RENDER_ORDER, REQUIRED_LAYERS_FOR_EXPORT, DEFAULT_SELECTIONS, BASE_CLOTHES_MAP, DEFAULT_CLOTHES_PATH, DEFAULT_BASE_PATH, DEFAULT_MOUTHBASE_PATH };

// ============ Layer Config (LayerConfig shape for existing consumers) ============
// order = index in RENDER_ORDER (Background 0, Base 1, ... Head 8)
export const LAYER_CONFIG: Record<UILayerName, LayerConfig> = Object.fromEntries(
  RENDER_ORDER.map((name, index) => {
    const meta = LAYER_META[name];
    return [
      name,
      {
        order: index,
        required: meta.required,
        label: meta.label,
        icon: meta.icon,
        description: meta.description ?? '',
      },
    ];
  })
) as Record<UILayerName, LayerConfig>;

export const LAYER_ORDER: UILayerName[] = [...UI_ORDER];

// ============ Base Types ============

export const BASE_TYPES = [
  { id: 'classic', name: 'Classic', rarity: 0.4 },
  { id: 'rekt', name: 'Rekt', rarity: 0.25 },
  { id: 'rugged', name: 'Rugged', rarity: 0.2 },
  { id: 'bleeding', name: 'Bleeding', rarity: 0.1 },
  { id: 'terminator', name: 'Terminator', rarity: 0.05 },
] as const;

// ============ Canvas Dimensions ============

export const CANVAS_CONFIG = {
  renderSize: 1000,
  displaySize: 512,
  thumbnailSize: 256,
  exportSizes: {
    '512': { width: 512, height: 512 },
    '1024': { width: 1024, height: 1024 },
    '2048': { width: 2048, height: 2048 },
  },
} as const;

// ============ Randomization Config ============

export const RANDOMIZATION_CONFIG: RandomizationConfig = {
  optionalLayerChance: 0.6,
  mouthExclusiveChance: 0.3,
  underlayChance: 0.3,
  baseChance: 0.7,
  overlayChance: 0.3,
} as const;

// ============ Helper Functions ============

export function getLayerConfig(name: UILayerName): LayerConfig {
  return LAYER_CONFIG[name];
}

export { getLayerMeta, isLayerRequired };
