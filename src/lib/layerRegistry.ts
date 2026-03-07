/**
 * Layer Registry — Single source of truth for generator layers.
 *
 * All layer names, order, metadata, and generator defaults live here.
 * When adding a new UI layer, add it here first (UILayerName, RENDER_ORDER, UI_ORDER, LAYER_META).
 * See docs/GENERATOR-ARCHITECTURE.md and docs/GENERATOR-CHECKLIST.md.
 */

import { LAYER_BASE } from '@/config/layerAssetBase';

// ============ UI Layer Name Type ============

export type UILayerName =
  | 'Background'
  | 'Base'
  | 'Clothes'
  | 'FacialHair'
  | 'MouthBase'
  | 'MouthItem'
  | 'Mask'
  | 'Eyes'
  | 'Head';

// ============ Render Order (compositing: bottom → top) ============

export const RENDER_ORDER: UILayerName[] = [
  'Background',
  'Base',
  'Clothes',
  'FacialHair',
  'MouthBase',
  'MouthItem',
  'Mask',
  'Eyes',
  'Head',
];

// ============ UI Order (tabs / picker order) ============

export const UI_ORDER: UILayerName[] = [
  'Base',
  'MouthBase',
  'MouthItem',
  'FacialHair',
  'Mask',
  'Head',
  'Eyes',
  'Clothes',
  'Background',
];

// ============ Layer Metadata ============

export interface LayerMeta {
  label: string;
  required: boolean;
  icon: string;
  description?: string;
}

export const LAYER_META: Record<UILayerName, LayerMeta> = {
  Background: {
    label: 'Background',
    required: false,
    icon: 'Image',
    description: 'Choose a background scene',
  },
  Base: {
    label: 'Face',
    required: true,
    icon: 'User',
    description: 'Wojak face type (required)',
  },
  Clothes: {
    label: 'Clothes',
    required: false,
    icon: 'Shirt',
    description: 'Outfits – some support custom colors',
  },
  FacialHair: {
    label: 'Facial Hair',
    required: false,
    icon: 'Smile',
    description: 'Neckbeard and Stache - renders under mouth',
  },
  MouthBase: {
    label: 'Mouth',
    required: false,
    icon: 'Smile',
    description: 'Base mouth expressions - Numb, Smile, Teeth, etc.',
  },
  MouthItem: {
    label: 'Mouth Item',
    required: false,
    icon: 'Cigarette',
    description: 'Cigarettes, Joint, Cohiba - renders on top of mouth',
  },
  Mask: {
    label: 'Extras',
    required: false,
    icon: 'Sparkles',
    description: 'Masks, hand items, wings, and extra accessories',
  },
  Eyes: {
    label: 'Eyes',
    required: false,
    icon: 'Eye',
    description: 'Eye styles and accessories',
  },
  Head: {
    label: 'Head',
    required: false,
    icon: 'Crown',
    description: 'Hats and headwear – some support custom colors',
  },
};

// ============ Generator Defaults ============

/** Minimum required layers for export/save */
export const REQUIRED_LAYERS_FOR_EXPORT: UILayerName[] = ['Base', 'Clothes', 'MouthBase'];

/** Default selections when user first visits or clears all (path per layer) */
export const DEFAULT_SELECTIONS: Partial<Record<UILayerName, string>> = {
  MouthBase: `${LAYER_BASE}/MOUTH/MOUTH_numb.png`,
  Clothes: `${LAYER_BASE}/CLOTHES/CLOTHES_Tee_blue.png`,
};

/** Base variant key → clothes path for preview consistency */
export const BASE_CLOTHES_MAP: Record<string, string> = {
  classic: `${LAYER_BASE}/CLOTHES/CLOTHES_Tee_blue.png`,
  rekt: `${LAYER_BASE}/CLOTHES/CLOTHES_Tee_blue.png`,
  rugged: `${LAYER_BASE}/CLOTHES/CLOTHES_Tee_blue.png`,
  bleeding: `${LAYER_BASE}/CLOTHES/CLOTHES_Tee_blue.png`,
  terminator: `${LAYER_BASE}/CLOTHES/CLOTHES_Tee_blue.png`,
};

export const DEFAULT_CLOTHES_PATH = `${LAYER_BASE}/CLOTHES/CLOTHES_Tee_blue.png`;

/** Default path for Base when rules force it */
export const DEFAULT_BASE_PATH = `${LAYER_BASE}/BASE/BASE_Base-Wojak_classic.png`;

/** Default path for MouthBase when rules force it */
export const DEFAULT_MOUTHBASE_PATH = `${LAYER_BASE}/MOUTH/MOUTH_numb.png`;

// ============ Scene Backgrounds (for random default) ============

export const SCENE_BACKGROUNDS: string[] = [
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Bepe Barracks.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Chia Farm.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Colosseum.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Crystal.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Dark Alley.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Deep Ocean.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Dragons Lair.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Everythings-Fine.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Frozen Tundra.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Graveyard.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_gym.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Heaven.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Hell.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Jungle.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Matrix.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Moms Basement.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Moon.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Morning-Routine.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Nesting Grounds.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_NYSE Dump.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_NYSE Pump.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_One Market.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Orange Grove.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Pirate-ship.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Rainforest.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Rome.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Ronin Dojo.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Route 66.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Silicon.net Data Center.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Sky Fortress.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Spell Room.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Steel Forge.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Stone Temple.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Thunderstorm.png`,
  `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_White House.png`,
];

// ============ Helpers ============

export function getLayerMeta(name: UILayerName): LayerMeta {
  return LAYER_META[name];
}

export function isLayerRequired(name: UILayerName): boolean {
  return LAYER_META[name].required;
}
