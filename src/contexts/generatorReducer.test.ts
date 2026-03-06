/**
 * Unit tests for generator reducer.
 * Uses real getPathToTraitIdMap() (empty map when not initialized).
 */

import { describe, it, expect } from 'vitest';
import { createInitialState, generatorReducer } from '@/contexts/generatorReducer';
import { DEFAULT_BASE_PATH, DEFAULT_MOUTHBASE_PATH, DEFAULT_CLOTHES_PATH } from '@/lib/layerRegistry';

describe('generatorReducer', () => {
  describe('createInitialState', () => {
    it('returns state with isInitialized false and empty selections', () => {
      const state = createInitialState();
      expect(state.isInitialized).toBe(false);
      expect(state.selections).toEqual({});
      expect(state.history).toEqual([]);
      expect(state.historyIndex).toBe(-1);
      expect(state.generatorError).toBeNull();
    });
  });

  describe('SET_LAYER', () => {
    it('updates selections and applies rules (MouthBase forced when empty)', () => {
      const state = createInitialState();
      const next = generatorReducer(state, {
        type: 'SET_LAYER',
        layer: 'Base',
        path: DEFAULT_BASE_PATH,
      });
      expect(next.selections.Base?.path).toBe(DEFAULT_BASE_PATH);
      expect(next.selections.MouthBase?.path).toBe(DEFAULT_MOUTHBASE_PATH);
      expect(next.selections.Clothes?.path).toBe(DEFAULT_CLOTHES_PATH);
      expect(next.history).toHaveLength(1);
      expect(next.historyIndex).toBe(0);
      expect(next.isPreviewStale).toBe(true);
      expect(next.generatorError).toBeNull();
    });
  });

  describe('SET_ERROR', () => {
    it('sets generatorError', () => {
      const state = createInitialState();
      const next = generatorReducer(state, {
        type: 'SET_ERROR',
        error: 'Something failed',
      });
      expect(next.generatorError).toBe('Something failed');
    });

    it('clears generatorError when error is null', () => {
      const state = createInitialState();
      const withError = generatorReducer(state, { type: 'SET_ERROR', error: 'Fail' });
      const cleared = generatorReducer(withError, { type: 'SET_ERROR', error: null });
      expect(cleared.generatorError).toBeNull();
    });
  });

  describe('UNDO', () => {
    it('does nothing when historyIndex <= 0', () => {
      const state = createInitialState();
      const next = generatorReducer(state, { type: 'UNDO' });
      expect(next).toBe(state);
    });

    it('restores previous selections when historyIndex > 0', () => {
      const state = createInitialState();
      const afterFirst = generatorReducer(state, {
        type: 'SET_LAYER',
        layer: 'Base',
        path: DEFAULT_BASE_PATH,
      });
      const afterSecond = generatorReducer(afterFirst, {
        type: 'SET_LAYER',
        layer: 'Clothes',
        path: DEFAULT_CLOTHES_PATH,
      });
      expect(afterSecond.historyIndex).toBe(1);
      const afterUndo = generatorReducer(afterSecond, { type: 'UNDO' });
      expect(afterUndo.historyIndex).toBe(0);
      expect(afterUndo.selections).toEqual(afterFirst.selections);
    });
  });

  describe('INITIALIZE', () => {
    it('sets isInitialized to true', () => {
      const state = createInitialState();
      const next = generatorReducer(state, { type: 'INITIALIZE' });
      expect(next.isInitialized).toBe(true);
    });
  });

  describe('TOGGLE_EXTRA', () => {
    it('clears malformed wings stored in Mask when toggled', () => {
      const state = {
        ...createInitialState(),
        selections: {
          Base: { path: DEFAULT_BASE_PATH, traitId: null },
          Clothes: { path: DEFAULT_CLOTHES_PATH, traitId: null },
          MouthBase: { path: DEFAULT_MOUTHBASE_PATH, traitId: null },
          Mask: {
            path: '/assets/wojak-layers/EXTRA/EXTRA_EXTRA_wings.png',
            traitId: null,
          },
        },
      };

      const next = generatorReducer(state, {
        type: 'TOGGLE_EXTRA',
        path: '/assets/wojak-layers/EXTRA/EXTRA_EXTRA_wings.png',
      });

      expect(next.selections.Mask).toBeUndefined();
      expect(next.selections.Extra1).toBeUndefined();
      expect(next.isPreviewStale).toBe(true);
    });
  });
});
