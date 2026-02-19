import { describe, it, expect } from 'vitest';
import { toExternal, fromExternal } from './selectionAdapter';
import type { SelectionsSnapshot, SelectedLayers, G2Selections, G2Selection } from '@/types/generator';

// ============ Helpers ============

function makeG2(traitId: string): G2Selection {
  return {
    traitId,
    g2Category: 'Clothes',
    colors: {},
  };
}

// ============ toExternal ============

describe('toExternal', () => {
  it('returns empty selectedLayers and g2Selections for empty snapshot', () => {
    const result = toExternal({});
    expect(result.selectedLayers).toEqual({});
    expect(result.g2Selections).toEqual({});
  });

  it('extracts a path into selectedLayers', () => {
    const snapshot: SelectionsSnapshot = {
      Base: { path: '/assets/BASE/Base_classic.png', traitId: null },
    };
    const result = toExternal(snapshot);
    expect(result.selectedLayers.Base).toBe('/assets/BASE/Base_classic.png');
  });

  it('does not include a layer in selectedLayers when path is empty string', () => {
    const snapshot: SelectionsSnapshot = {
      Background: { path: '', traitId: null },
    };
    const result = toExternal(snapshot);
    expect(result.selectedLayers.Background).toBeUndefined();
  });

  it('does not include a layer in selectedLayers when path is "None"', () => {
    const snapshot: SelectionsSnapshot = {
      Clothes: { path: 'None', traitId: null },
    };
    const result = toExternal(snapshot);
    expect(result.selectedLayers.Clothes).toBeUndefined();
  });

  it('extracts g2 data into g2Selections', () => {
    const g2 = makeG2('Clothes_Bathrobe');
    const snapshot: SelectionsSnapshot = {
      Clothes: { path: '/g2/bathrobe.png', traitId: 'Clothes_Bathrobe', g2 },
    };
    const result = toExternal(snapshot);
    expect(result.g2Selections.Clothes).toEqual(g2);
  });

  it('handles a layer with a valid path but no g2 — only goes into selectedLayers', () => {
    const snapshot: SelectionsSnapshot = {
      Eyes: { path: '/assets/Eyes/Sunglasses.png', traitId: null },
    };
    const result = toExternal(snapshot);
    expect(result.selectedLayers.Eyes).toBe('/assets/Eyes/Sunglasses.png');
    expect(result.g2Selections.Eyes).toBeUndefined();
  });

  it('handles a layer with g2 only (no valid path) — only goes into g2Selections', () => {
    const g2 = makeG2('Head_Crown');
    const snapshot: SelectionsSnapshot = {
      Head: { path: '', traitId: 'Head_Crown', g2 },
    };
    const result = toExternal(snapshot);
    expect(result.selectedLayers.Head).toBeUndefined();
    expect(result.g2Selections.Head).toEqual(g2);
  });

  it('skips null/undefined entries in the snapshot', () => {
    const snapshot: SelectionsSnapshot = {
      MouthBase: undefined,
    };
    const result = toExternal(snapshot);
    expect(result.selectedLayers.MouthBase).toBeUndefined();
    expect(result.g2Selections.MouthBase).toBeUndefined();
  });

  it('processes multiple layers independently', () => {
    const g2 = makeG2('Clothes_Hoodie');
    const snapshot: SelectionsSnapshot = {
      Base: { path: '/BASE/classic.png', traitId: null },
      Clothes: { path: '/g2/hoodie.png', traitId: 'Clothes_Hoodie', g2 },
      Background: { path: '', traitId: null },
    };
    const result = toExternal(snapshot);
    expect(result.selectedLayers.Base).toBe('/BASE/classic.png');
    expect(result.selectedLayers.Clothes).toBe('/g2/hoodie.png');
    expect(result.selectedLayers.Background).toBeUndefined();
    expect(result.g2Selections.Clothes).toEqual(g2);
  });
});

// ============ fromExternal ============

describe('fromExternal', () => {
  it('returns an empty snapshot for empty inputs', () => {
    const result = fromExternal({}, {});
    expect(result).toEqual({});
  });

  it('converts a selectedLayers path into a unified LayerSelection', () => {
    const selectedLayers: SelectedLayers = { Base: '/BASE/classic.png' };
    const result = fromExternal(selectedLayers);
    expect(result.Base).toEqual({
      path: '/BASE/classic.png',
      traitId: null,
    });
  });

  it('skips paths that are "None"', () => {
    const selectedLayers: SelectedLayers = { Background: 'None' };
    const result = fromExternal(selectedLayers);
    // No valid path and no g2 — entry should be absent
    expect(result.Background).toBeUndefined();
  });

  it('skips paths that are empty string', () => {
    const selectedLayers: SelectedLayers = { Clothes: '' };
    const result = fromExternal(selectedLayers);
    expect(result.Clothes).toBeUndefined();
  });

  it('resolves traitId from pathToTraitIdMap for G1 paths', () => {
    const selectedLayers: SelectedLayers = { Clothes: '/CLOTHES/Bathrobe.png' };
    const pathMap = new Map<string, string>([
      ['/CLOTHES/Bathrobe.png', 'g1_Bathrobe'],
    ]);
    const result = fromExternal(selectedLayers, {}, pathMap);
    expect(result.Clothes?.traitId).toBe('g1_Bathrobe');
  });

  it('traitId is null when path is not in pathMap', () => {
    const selectedLayers: SelectedLayers = { Eyes: '/EYES/Sunglasses.png' };
    const pathMap = new Map<string, string>();
    const result = fromExternal(selectedLayers, {}, pathMap);
    expect(result.Eyes?.traitId).toBeNull();
  });

  it('attaches g2 data and prefers g2.traitId over pathMap', () => {
    const g2 = makeG2('Clothes_Bathrobe');
    const selectedLayers: SelectedLayers = { Clothes: '/g2/bathrobe.png' };
    const g2Selections: G2Selections = { Clothes: g2 };
    const pathMap = new Map<string, string>([
      ['/g2/bathrobe.png', 'should_not_be_used'],
    ]);
    const result = fromExternal(selectedLayers, g2Selections, pathMap);
    expect(result.Clothes?.traitId).toBe('Clothes_Bathrobe');
    expect(result.Clothes?.g2).toEqual(g2);
  });

  it('includes a layer that has g2 but no selectedLayers path', () => {
    const g2 = makeG2('Head_Crown');
    const g2Selections: G2Selections = { Head: g2 };
    const result = fromExternal({}, g2Selections);
    expect(result.Head).toBeDefined();
    expect(result.Head?.g2).toEqual(g2);
    expect(result.Head?.traitId).toBe('Head_Crown');
  });

  it('roundtrips through toExternal → fromExternal preserving paths', () => {
    const original: SelectionsSnapshot = {
      Base: { path: '/BASE/classic.png', traitId: null },
      MouthBase: { path: '/MOUTH/numb.png', traitId: null },
    };
    const external = toExternal(original);
    const roundtripped = fromExternal(external.selectedLayers, external.g2Selections);
    expect(roundtripped.Base?.path).toBe('/BASE/classic.png');
    expect(roundtripped.MouthBase?.path).toBe('/MOUTH/numb.png');
  });

  it('roundtrips through toExternal → fromExternal preserving g2 data', () => {
    const g2 = makeG2('Clothes_Hoodie');
    const original: SelectionsSnapshot = {
      Clothes: { path: '/g2/hoodie.png', traitId: 'Clothes_Hoodie', g2 },
    };
    const external = toExternal(original);
    const roundtripped = fromExternal(external.selectedLayers, external.g2Selections);
    expect(roundtripped.Clothes?.g2).toEqual(g2);
    expect(roundtripped.Clothes?.traitId).toBe('Clothes_Hoodie');
  });

  it('works with null pathToTraitIdMap (no crash)', () => {
    const selectedLayers: SelectedLayers = { Base: '/BASE/classic.png' };
    const result = fromExternal(selectedLayers, {}, null);
    expect(result.Base?.path).toBe('/BASE/classic.png');
    expect(result.Base?.traitId).toBeNull();
  });
});
