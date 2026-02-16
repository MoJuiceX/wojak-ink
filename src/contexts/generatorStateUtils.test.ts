/**
 * Unit tests for generator state utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  isUILayerName,
  applyRulesUnified,
  pushHistoryUnified,
  getClothesForBase,
  canExportOrSave,
  getMissingRequiredLayers,
  type HistoryState,
} from '@/contexts/generatorStateUtils';
import type { SelectionsSnapshot } from '@/types/generator';
import {
  DEFAULT_BASE_PATH,
  DEFAULT_MOUTHBASE_PATH,
  DEFAULT_CLOTHES_PATH,
} from '@/lib/layerRegistry';

describe('generatorStateUtils', () => {
  describe('isUILayerName', () => {
    it('returns true for valid UI layer names', () => {
      expect(isUILayerName('Base')).toBe(true);
      expect(isUILayerName('Clothes')).toBe(true);
      expect(isUILayerName('MouthBase')).toBe(true);
      expect(isUILayerName('Head')).toBe(true);
      expect(isUILayerName('Background')).toBe(true);
    });

    it('returns false for invalid layer names', () => {
      expect(isUILayerName('')).toBe(false);
      expect(isUILayerName('base')).toBe(false);
      expect(isUILayerName('Invalid')).toBe(false);
      expect(isUILayerName('ClothesAddon')).toBe(false);
    });
  });

  describe('applyRulesUnified', () => {
    it('forces MouthBase to default when empty (pathMap used for traitId)', () => {
      const pathMap = new Map<string, string>([
        [DEFAULT_MOUTHBASE_PATH, 'Mouth_numb'],
      ]);
      const selections: SelectionsSnapshot = {
        Base: { path: DEFAULT_BASE_PATH, traitId: null },
        Clothes: { path: DEFAULT_CLOTHES_PATH, traitId: null },
      };
      const { newSelections, result } = applyRulesUnified(selections, pathMap);
      expect(newSelections.MouthBase?.path).toBe(DEFAULT_MOUTHBASE_PATH);
      expect(newSelections.MouthBase?.traitId).toBe('Mouth_numb');
      expect(result.forceSelections?.MouthBase).toBe(DEFAULT_MOUTHBASE_PATH);
    });

    it('returns unchanged selections when required layers are set', () => {
      const pathMap = new Map<string, string>();
      const selections: SelectionsSnapshot = {
        Base: { path: DEFAULT_BASE_PATH, traitId: null },
        Clothes: { path: DEFAULT_CLOTHES_PATH, traitId: null },
        MouthBase: { path: DEFAULT_MOUTHBASE_PATH, traitId: null },
      };
      const { newSelections } = applyRulesUnified(selections, pathMap);
      expect(newSelections.Base?.path).toBe(DEFAULT_BASE_PATH);
      expect(newSelections.Clothes?.path).toBe(DEFAULT_CLOTHES_PATH);
      expect(newSelections.MouthBase?.path).toBe(DEFAULT_MOUTHBASE_PATH);
    });
  });

  describe('pushHistoryUnified', () => {
    it('appends new selections and updates historyIndex', () => {
      const state: HistoryState = {
        history: [{ Base: { path: '/a.png', traitId: null } }],
        historyIndex: 0,
      };
      const newSelections: SelectionsSnapshot = {
        Base: { path: '/b.png', traitId: null },
      };
      const next = pushHistoryUnified(state, newSelections);
      expect(next.history).toHaveLength(2);
      expect(next.historyIndex).toBe(1);
      expect(next.history[1]?.Base?.path).toBe('/b.png');
    });

    it('caps history at 50 entries', () => {
      const history: SelectionsSnapshot[] = Array.from({ length: 50 }, (_, i) => ({
        Base: { path: `/path-${i}.png`, traitId: null },
      }));
      const state: HistoryState = { history, historyIndex: 49 };
      const newSelections: SelectionsSnapshot = {
        Base: { path: '/path-51.png', traitId: null },
      };
      const next = pushHistoryUnified(state, newSelections);
      expect(next.history).toHaveLength(50);
      expect(next.historyIndex).toBe(49);
      expect(next.history[0]?.Base?.path).toBe('/path-1.png');
      expect(next.history[49]?.Base?.path).toBe('/path-51.png');
    });
  });

  describe('getClothesForBase', () => {
    it('returns default clothes for classic base', () => {
      const path = getClothesForBase('/assets/wojak-layers/BASE/BASE_Base-Wojak_classic.png');
      expect(path).toBe(DEFAULT_CLOTHES_PATH);
    });

    it('returns default clothes for rekt base', () => {
      const path = getClothesForBase('/some/BASE_Base-Wojak_rekt.png');
      expect(path).toBe(DEFAULT_CLOTHES_PATH);
    });

    it('returns default clothes for unknown base', () => {
      const path = getClothesForBase('/some/unknown.png');
      expect(path).toBe(DEFAULT_CLOTHES_PATH);
    });
  });

  describe('canExportOrSave', () => {
    it('returns true when all required layers have a path', () => {
      expect(
        canExportOrSave({
          Base: DEFAULT_BASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
        })
      ).toBe(true);
    });

    it('returns false when Base is missing', () => {
      expect(
        canExportOrSave({
          Clothes: DEFAULT_CLOTHES_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
        })
      ).toBe(false);
    });

    it('returns false when path is empty or None', () => {
      expect(
        canExportOrSave({
          Base: '',
          Clothes: DEFAULT_CLOTHES_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
        })
      ).toBe(false);
      expect(
        canExportOrSave({
          Base: DEFAULT_BASE_PATH,
          Clothes: 'None',
          MouthBase: DEFAULT_MOUTHBASE_PATH,
        })
      ).toBe(false);
    });
  });

  describe('getMissingRequiredLayers', () => {
    it('returns labels for missing required layers', () => {
      const missing = getMissingRequiredLayers({});
      expect(missing).toContain('Face');
      expect(missing).toContain('Clothes');
      expect(missing).toContain('Mouth');
      expect(missing.length).toBe(3);
    });

    it('returns empty array when all required layers present', () => {
      const missing = getMissingRequiredLayers({
        Base: DEFAULT_BASE_PATH,
        Clothes: DEFAULT_CLOTHES_PATH,
        MouthBase: DEFAULT_MOUTHBASE_PATH,
      });
      expect(missing).toHaveLength(0);
    });
  });
});
