import { describe, it, expect } from 'vitest';
import { createSelectionResolver, createSelectionResolverFromUnified } from './selectionResolver';
import type { PathToTraitIdMap } from './selectionResolver';
import type { SelectedLayers } from '@/lib/wojakRules';
import type { G2Selections, SelectionsSnapshot } from '@/types/generator';

// ---------------------------------------------------------------------------
// createSelectionResolver
// ---------------------------------------------------------------------------

describe('createSelectionResolver — getTraitId', () => {
  it('returns null when layer has no selection and no maps provided', () => {
    const resolver = createSelectionResolver({});
    expect(resolver.getTraitId('Clothes')).toBeNull();
  });

  it('returns traitId from g2Selections when present', () => {
    const g2: G2Selections = {
      Clothes: { traitId: 'Clothes_Bathrobe', g2Category: 'Clothes', colors: {}, options: {} },
    };
    const resolver = createSelectionResolver({}, g2);
    expect(resolver.getTraitId('Clothes')).toBe('Clothes_Bathrobe');
  });

  it('prefers g2 traitId over pathToTraitIdMap entry for the same layer', () => {
    const selectedLayers: SelectedLayers = { Clothes: 'layers/Clothes/Bathrobe.png' };
    const pathMap: PathToTraitIdMap = new Map([['layers/Clothes/Bathrobe.png', 'g1_Bathrobe']]);
    const g2: G2Selections = {
      Clothes: { traitId: 'Clothes_Bathrobe', g2Category: 'Clothes', colors: {}, options: {} },
    };
    const resolver = createSelectionResolver(selectedLayers, g2, pathMap);
    expect(resolver.getTraitId('Clothes')).toBe('Clothes_Bathrobe');
  });

  it('falls back to pathToTraitIdMap when no g2 entry for layer', () => {
    const selectedLayers: SelectedLayers = { Head: 'layers/Head/CapForward.png' };
    const pathMap: PathToTraitIdMap = new Map([['layers/Head/CapForward.png', 'g1_CapForward']]);
    const resolver = createSelectionResolver(selectedLayers, null, pathMap);
    expect(resolver.getTraitId('Head')).toBe('g1_CapForward');
  });

  it('returns null when path exists but is not in pathToTraitIdMap', () => {
    const selectedLayers: SelectedLayers = { Head: 'layers/Head/Unknown.png' };
    const pathMap: PathToTraitIdMap = new Map([['layers/Head/CapForward.png', 'g1_CapForward']]);
    const resolver = createSelectionResolver(selectedLayers, null, pathMap);
    expect(resolver.getTraitId('Head')).toBeNull();
  });

  it('works without optional parameters (undefined g2 and pathMap)', () => {
    const selectedLayers: SelectedLayers = { Eyes: 'layers/Eyes/Sunglasses.png' };
    const resolver = createSelectionResolver(selectedLayers);
    expect(resolver.getTraitId('Eyes')).toBeNull();
  });
});

describe('createSelectionResolver — getPath', () => {
  it('returns the path for a layer that has a non-empty selection', () => {
    const selectedLayers: SelectedLayers = { Clothes: 'layers/Clothes/Bathrobe.png' };
    const resolver = createSelectionResolver(selectedLayers);
    expect(resolver.getPath('Clothes')).toBe('layers/Clothes/Bathrobe.png');
  });

  it('returns undefined for a layer with no selection', () => {
    const resolver = createSelectionResolver({});
    expect(resolver.getPath('Clothes')).toBeUndefined();
  });

  it('returns undefined when path is empty string (treated as empty)', () => {
    const selectedLayers: SelectedLayers = { Clothes: '' };
    const resolver = createSelectionResolver(selectedLayers);
    expect(resolver.getPath('Clothes')).toBeUndefined();
  });

  it('returns undefined when path is "None" (sentinel empty value)', () => {
    const selectedLayers: SelectedLayers = { Clothes: 'None' };
    const resolver = createSelectionResolver(selectedLayers);
    expect(resolver.getPath('Clothes')).toBeUndefined();
  });

  it('returns real path for a different layer while another is empty', () => {
    const selectedLayers: SelectedLayers = {
      Clothes: 'None',
      Head: 'layers/Head/Cap.png',
    };
    const resolver = createSelectionResolver(selectedLayers);
    expect(resolver.getPath('Clothes')).toBeUndefined();
    expect(resolver.getPath('Head')).toBe('layers/Head/Cap.png');
  });
});

// ---------------------------------------------------------------------------
// createSelectionResolverFromUnified
// ---------------------------------------------------------------------------

describe('createSelectionResolverFromUnified — getTraitId', () => {
  it('returns traitId from unified snapshot when present', () => {
    const snapshot: SelectionsSnapshot = {
      Clothes: { path: 'layers/Clothes/Bathrobe.png', traitId: 'Clothes_Bathrobe' },
    };
    const resolver = createSelectionResolverFromUnified(snapshot);
    expect(resolver.getTraitId('Clothes')).toBe('Clothes_Bathrobe');
  });

  it('returns null when traitId is null in snapshot', () => {
    const snapshot: SelectionsSnapshot = {
      Clothes: { path: 'layers/Clothes/Bathrobe.png', traitId: null },
    };
    const resolver = createSelectionResolverFromUnified(snapshot);
    expect(resolver.getTraitId('Clothes')).toBeNull();
  });

  it('returns null when layer is absent from snapshot', () => {
    const resolver = createSelectionResolverFromUnified({});
    expect(resolver.getTraitId('Head')).toBeNull();
  });
});

describe('createSelectionResolverFromUnified — getPath', () => {
  it('returns path for a layer with a real path', () => {
    const snapshot: SelectionsSnapshot = {
      Head: { path: 'layers/Head/Cap.png', traitId: 'g1_Cap' },
    };
    const resolver = createSelectionResolverFromUnified(snapshot);
    expect(resolver.getPath('Head')).toBe('layers/Head/Cap.png');
  });

  it('returns undefined for a layer with path "None"', () => {
    const snapshot: SelectionsSnapshot = {
      Head: { path: 'None', traitId: null },
    };
    const resolver = createSelectionResolverFromUnified(snapshot);
    expect(resolver.getPath('Head')).toBeUndefined();
  });

  it('returns undefined for a layer with an empty path', () => {
    const snapshot: SelectionsSnapshot = {
      Head: { path: '', traitId: null },
    };
    const resolver = createSelectionResolverFromUnified(snapshot);
    expect(resolver.getPath('Head')).toBeUndefined();
  });

  it('returns undefined for a layer absent from the snapshot', () => {
    const resolver = createSelectionResolverFromUnified({});
    expect(resolver.getPath('Eyes')).toBeUndefined();
  });
});
