/**
 * Wojak Generator Layer System
 *
 * Defines the canonical layer order and render stack for the generator.
 * Based on the original implementation from wojak-ink-mobile.
 */

export interface LayerDefinition {
  name: string;
  folder: string;
  zIndex: number;
  isVirtual?: boolean;
  description?: string;
}

/**
 * CANONICAL RENDER ORDER (bottom → top):
 *
 * ABSOLUTE RULES:
 * - Head MUST ALWAYS render OVER Mask and Eyes
 * - Eyes MUST ALWAYS render OVER ALL Mask traits
 * - Mask MUST ALWAYS render AFTER MouthBase and MouthItem
 * - MouthItem MUST ALWAYS render AFTER MouthBase
 * - FacialHair MUST ALWAYS render UNDER MouthBase, MouthItem, and Astronaut
 * - Astronaut MUST ALWAYS render OVER Eyes, FacialHair, and all mouth traits
 * - Hannibal Mask MUST ALWAYS render OVER MouthBase and MouthItem
 * - Tyson Tattoo ONLY renders UNDER mask when a mask exists
 */
export const LAYER_ORDER: LayerDefinition[] = [
  { name: 'Background', folder: 'BACKGROUND', zIndex: 0 },
  { name: 'Base', folder: 'BASE', zIndex: 1 },
  { name: 'Clothes', folder: 'CLOTHES', zIndex: 2 },
  { name: 'ClothesAddon', folder: 'CLOTHESADDON', zIndex: 3, isVirtual: true, description: 'Chia Farmer overlay' },
  { name: 'FacialHair', folder: 'FACIALHAIR', zIndex: 4 },
  { name: 'MouthBase', folder: 'MOUTHBASE', zIndex: 5 },
  { name: 'BubbleGumRekt', folder: 'MOUTH', zIndex: 5.1, isVirtual: true, description: 'Bubble Gum rekt variant' },
  { name: 'MouthItem', folder: 'MOUTHITEM', zIndex: 6 },
  { name: 'TysonTattoo', folder: 'TYSONTATTOO', zIndex: 6.5, isVirtual: true, description: 'Tyson under mask' },
  { name: 'NinjaTurtleUnderMask', folder: 'VIRTUAL', zIndex: 6.6, isVirtual: true, description: 'Ninja Turtle under mask' },
  { name: 'Mask', folder: 'MASK', zIndex: 7 },
  { name: 'HannibalMask', folder: 'HANNIBALMASK', zIndex: 9, isVirtual: true, description: 'Hannibal Mask extracted' },
  { name: 'Eyes', folder: 'EYE', zIndex: 10 },
  { name: 'Astronaut', folder: 'ASTRONAUT', zIndex: 11, isVirtual: true, description: 'Astronaut extracted from Clothes' },
  { name: 'Head', folder: 'HEAD', zIndex: 12 },
  { name: 'BandanaMaskOverRonin', folder: 'MASK', zIndex: 13, isVirtual: true, description: 'Bandana right half over Ronin' },
  { name: 'NeckbeardOverRonin', folder: 'FACIALHAIR', zIndex: 13.5, isVirtual: true, description: 'Neckbeard right half over Ronin' },
  { name: 'EyesOverHead', folder: 'EYES', zIndex: 14, isVirtual: true, description: 'Eyes right half over specific heads' },
  { name: 'BubbleGumOverEyes', folder: 'MOUTH', zIndex: 60, isVirtual: true, description: 'Bubble Gum on top of everything' },
];

export const LAYER_NAMES = LAYER_ORDER.map((layer) => layer.name);

/**
 * Layer name type for type-safety (includes virtual layers)
 */
export type GeneratorLayerName =
  | 'Background'
  | 'Base'
  | 'Clothes'
  | 'ClothesAddon'
  | 'FacialHair'
  | 'MouthBase'
  | 'BubbleGumRekt'
  | 'MouthItem'
  | 'TysonTattoo'
  | 'NinjaTurtleUnderMask'
  | 'Mask'
  | 'HannibalMask'
  | 'Eyes'
  | 'Astronaut'
  | 'Head'
  | 'BandanaMaskOverRonin'
  | 'NeckbeardOverRonin'
  | 'EyesOverHead'
  | 'BubbleGumOverEyes';

// Re-export from single source of truth (layerRegistry)
import type { UILayerName } from '@/lib/layerRegistry';
import { RENDER_ORDER } from '@/lib/layerRegistry';
export type { UILayerName } from '@/lib/layerRegistry';
export { RENDER_ORDER, UI_ORDER } from '@/lib/layerRegistry';

/** UI layer names array (for generatorService and others) */
export const UI_LAYER_NAMES: UILayerName[] = [...RENDER_ORDER];

/**
 * Get layer definition by name
 */
export function getLayerByName(name: string): LayerDefinition | undefined {
  return LAYER_ORDER.find((layer) => layer.name === name);
}

/**
 * Get layers sorted by z-index for rendering
 */
export function getLayersSortedByZIndex(): LayerDefinition[] {
  return [...LAYER_ORDER].sort((a, b) => a.zIndex - b.zIndex);
}

/**
 * Check if a layer is virtual (not user-selectable)
 */
export function isVirtualLayer(name: string): boolean {
  const layer = getLayerByName(name);
  return layer?.isVirtual ?? false;
}
