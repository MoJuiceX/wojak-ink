/**
 * Unit tests for canvas renderer layer builder.
 * Tests buildRenderLayers(selectedLayers) with fixed selections; asserts layerName and zIndex order/length.
 */

import { describe, it, expect } from 'vitest';
import type { SelectedLayers } from '@/lib/wojakRules';
import { buildRenderLayers } from '@/services/canvasRendererLayerBuilder';
import { LAYER_Z_INDEX } from '@/services/canvasRendererConstants';
import { DEFAULT_BASE_PATH, DEFAULT_MOUTHBASE_PATH, DEFAULT_CLOTHES_PATH } from '@/lib/layerRegistry';

describe('canvasRendererLayerBuilder', () => {
  describe('buildRenderLayers', () => {
    it('returns layers in ascending zIndex order', () => {
      const selectedLayers: SelectedLayers = {
        Base: DEFAULT_BASE_PATH,
        Clothes: DEFAULT_CLOTHES_PATH,
        MouthBase: DEFAULT_MOUTHBASE_PATH,
      };
      const layers = buildRenderLayers(selectedLayers);
      for (let i = 1; i < layers.length; i++) {
        expect(layers[i].zIndex).toBeGreaterThanOrEqual(layers[i - 1].zIndex);
      }
    });

    it('default only (Classic base, Tee clothes, Numb mouth) produces expected layer names and approximate length', () => {
      const selectedLayers: SelectedLayers = {
        Base: DEFAULT_BASE_PATH,
        Clothes: DEFAULT_CLOTHES_PATH,
        MouthBase: DEFAULT_MOUTHBASE_PATH,
      };
      const layers = buildRenderLayers(selectedLayers);
      const names = layers.map((l) => l.layerName);
      expect(names).toContain('Base');
      expect(names).toContain('Clothes');
      expect(names).toContain('MouthBase');
      expect(layers.length).toBeGreaterThanOrEqual(3);
      expect(layers.length).toBeLessThanOrEqual(15);
    });

    it('default selections produce Base, Clothes, MouthBase in order', () => {
      const selectedLayers: SelectedLayers = {
        Base: DEFAULT_BASE_PATH,
        Clothes: DEFAULT_CLOTHES_PATH,
        MouthBase: DEFAULT_MOUTHBASE_PATH,
      };
      const layers = buildRenderLayers(selectedLayers);
      const baseIdx = layers.findIndex((l) => l.layerName === 'Base');
      const clothesIdx = layers.findIndex((l) => l.layerName === 'Clothes');
      const mouthIdx = layers.findIndex((l) => l.layerName === 'MouthBase');
      expect(baseIdx).toBeGreaterThanOrEqual(0);
      expect(clothesIdx).toBeGreaterThanOrEqual(0);
      expect(mouthIdx).toBeGreaterThanOrEqual(0);
      expect(layers[baseIdx].zIndex).toBe(LAYER_Z_INDEX.Base);
      expect(layers[clothesIdx].zIndex).toBe(LAYER_Z_INDEX.Clothes);
      expect(layers[mouthIdx].zIndex).toBe(LAYER_Z_INDEX.MouthBase);
    });

    it('Astronaut + Bandana: skips Head and Clothes in main pass, adds Astronaut and MaskUnderAstronaut virtual layers', () => {
      const selectedLayers: SelectedLayers = {
        Base: DEFAULT_BASE_PATH,
        Clothes: '/assets/wojak-layers/YourWojak-layers/Clothes_Astronaut_default.png',
        MouthBase: DEFAULT_MOUTHBASE_PATH,
        Head: '/assets/wojak-layers/Head_bandana.png',
        Mask: '/assets/wojak-layers/Mask_bandana.png',
      };
      const layers = buildRenderLayers(selectedLayers);
      const names = layers.map((l) => l.layerName);
      expect(names).not.toContain('Head');
      expect(names).not.toContain('Clothes');
      expect(names).toContain('Astronaut');
      expect(names).toContain('MaskUnderAstronaut');
      expect(layers.some((l) => l.layerName === 'Astronaut' && l.zIndex === LAYER_Z_INDEX.Astronaut)).toBe(true);
      expect(layers.some((l) => l.layerName === 'MaskUnderAstronaut')).toBe(true);
    });

    it('Rekt + BubbleGum adds BubbleGumRekt virtual layer', () => {
      const selectedLayers: SelectedLayers = {
        Base: '/assets/wojak-layers/BASE/BASE_Base-Wojak_rekt.png',
        Clothes: DEFAULT_CLOTHES_PATH,
        MouthBase: '/assets/wojak-layers/MOUTH/MOUTH_Bubble-Gum.png',
      };
      const layers = buildRenderLayers(selectedLayers);
      const names = layers.map((l) => l.layerName);
      expect(names).toContain('BubbleGumRekt');
      const bubbleRekt = layers.find((l) => l.layerName === 'BubbleGumRekt');
      expect(bubbleRekt?.zIndex).toBe(LAYER_Z_INDEX.BubbleGumRekt);
    });

    it('Chia Farmer adds ClothesAddon virtual layer', () => {
      const selectedLayers: SelectedLayers = {
        Base: DEFAULT_BASE_PATH,
        Clothes: '/assets/wojak-layers/YourWojak-layers/Clothes_Chia-farmer_fill.png',
        MouthBase: DEFAULT_MOUTHBASE_PATH,
      };
      const layers = buildRenderLayers(selectedLayers);
      const names = layers.map((l) => l.layerName);
      expect(names).toContain('ClothesAddon');
      const addon = layers.find((l) => l.layerName === 'ClothesAddon');
      expect(addon?.zIndex).toBe(LAYER_Z_INDEX.ClothesAddon);
    });

    it('empty selections produce empty or minimal layers', () => {
      const selectedLayers: SelectedLayers = {};
      const layers = buildRenderLayers(selectedLayers);
      expect(layers).toEqual([]);
    });

    it('only Base produces single Base layer', () => {
      const selectedLayers: SelectedLayers = {
        Base: DEFAULT_BASE_PATH,
      };
      const layers = buildRenderLayers(selectedLayers);
      expect(layers.length).toBe(1);
      expect(layers[0].layerName).toBe('Base');
      expect(layers[0].zIndex).toBe(LAYER_Z_INDEX.Base);
    });
  });
});
