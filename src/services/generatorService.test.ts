import { describe, it, expect, beforeEach } from 'vitest';
import {
  getG2BasePath,
  getCompositeLayerFiles,
  getCompositeLayerEntries,
  isGeneratorReady,
  getPathToTraitIdMap,
  clearUnifiedTraitsCache,
  getAllLayerImages,
  getLayerImageByPath,
  type UnifiedTrait,

} from './generatorService';
import type { UILayerName } from '@/lib/memeLayers';

// ============================================
// getG2BasePath
// ============================================

describe('getG2BasePath', () => {
  it('returns a non-empty string', () => {
    const path = getG2BasePath();
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });

  it('uses either local assets or an absolute layer host', () => {
    const path = getG2BasePath();
    expect(path.startsWith('/assets') || /^https?:\/\//.test(path)).toBe(true);
  });

  it('returns the same value on repeated calls', () => {
    expect(getG2BasePath()).toBe(getG2BasePath());
  });
});

// ============================================
// getCompositeLayerEntries — layers array path
// ============================================

describe('getCompositeLayerEntries — with layers array', () => {
  const basePath = '/assets/test';

  it('returns entries for each visible layer', () => {
    const trait = {
      layers: [
        { pos: 1, key: 'a', type: 'fill', label: 'A', file: 'a.png', visible: true },
        { pos: 0, key: 'b', type: 'fill', label: 'B', file: 'b.png', visible: true },
      ],
    } as unknown as UnifiedTrait;

    const entries = getCompositeLayerEntries(trait, basePath);
    expect(entries).toHaveLength(2);
  });

  it('orders by pos ascending', () => {
    const trait = {
      layers: [
        { pos: 5, key: 'x', type: 'fill', label: 'X', file: 'x.png', visible: true },
        { pos: 1, key: 'y', type: 'fill', label: 'Y', file: 'y.png', visible: true },
        { pos: 3, key: 'z', type: 'fill', label: 'Z', file: 'z.png', visible: true },
      ],
    } as unknown as UnifiedTrait;

    const entries = getCompositeLayerEntries(trait, basePath);
    const paths = entries.map(e => e.path);
    expect(paths[0]).toContain('y.png');
    expect(paths[1]).toContain('z.png');
    expect(paths[2]).toContain('x.png');
  });

  it('filters out invisible layers', () => {
    const trait = {
      layers: [
        { pos: 0, key: 'a', type: 'fill', label: 'A', file: 'visible.png', visible: true },
        { pos: 1, key: 'b', type: 'fill', label: 'B', file: 'hidden.png', visible: false },
      ],
    } as unknown as UnifiedTrait;

    const entries = getCompositeLayerEntries(trait, basePath);
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toContain('visible.png');
  });

  it('sets underBase from layer flag', () => {
    const trait = {
      layers: [
        { pos: 0, key: 'a', type: 'fill', label: 'A', file: 'a.png', visible: true, underBase: true },
        { pos: 1, key: 'b', type: 'fill', label: 'B', file: 'b.png', visible: true, underBase: false },
      ],
    } as unknown as UnifiedTrait;

    const entries = getCompositeLayerEntries(trait, basePath);
    expect(entries[0].underBase).toBe(true);
    expect(entries[1].underBase).toBe(false);
  });

  it('prefixes each path with basePath', () => {
    const trait = {
      layers: [
        { pos: 0, key: 'a', type: 'fill', label: 'A', file: 'layer.png', visible: true },
      ],
    } as unknown as UnifiedTrait;

    const entries = getCompositeLayerEntries(trait, basePath);
    expect(entries[0].path).toBe(`${basePath}/layer.png`);
  });

  it('returns empty array for empty layers array', () => {
    const trait = { layers: [] } as unknown as UnifiedTrait;
    expect(getCompositeLayerEntries(trait, basePath)).toHaveLength(0);
  });
});

// ============================================
// getCompositeLayerEntries — layer0File/layer1File fallback
// ============================================

describe('getCompositeLayerEntries — with layer0File/layer1File', () => {
  const basePath = '/assets/base';

  it('returns entry for layer0File alone', () => {
    const trait = { layer0File: 'body.png' } as unknown as UnifiedTrait;
    const entries = getCompositeLayerEntries(trait, basePath);
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe(`${basePath}/body.png`);
    expect(entries[0].underBase).toBe(false);
  });

  it('returns entries for both layer0File and layer1File', () => {
    const trait = { layer0File: 'body.png', layer1File: 'head.png' } as unknown as UnifiedTrait;
    const entries = getCompositeLayerEntries(trait, basePath);
    expect(entries).toHaveLength(2);
    expect(entries[0].path).toBe(`${basePath}/body.png`);
    expect(entries[1].path).toBe(`${basePath}/head.png`);
  });

  it('returns empty array when neither layers nor layer0File/layer1File present', () => {
    const trait = {} as unknown as UnifiedTrait;
    expect(getCompositeLayerEntries(trait, basePath)).toHaveLength(0);
  });

  it('underBase is false for layer0File/layer1File entries', () => {
    const trait = { layer0File: 'a.png', layer1File: 'b.png' } as unknown as UnifiedTrait;
    const entries = getCompositeLayerEntries(trait, basePath);
    for (const e of entries) {
      expect(e.underBase).toBe(false);
    }
  });
});

// ============================================
// getCompositeLayerFiles
// ============================================

describe('getCompositeLayerFiles', () => {
  const basePath = '/assets/files';

  it('returns paths array (same content as entries map)', () => {
    const trait = {
      layers: [
        { pos: 0, key: 'a', type: 'fill', label: 'A', file: 'a.png', visible: true },
        { pos: 1, key: 'b', type: 'fill', label: 'B', file: 'b.png', visible: true },
      ],
    } as unknown as UnifiedTrait;

    const files = getCompositeLayerFiles(trait, basePath);
    const entries = getCompositeLayerEntries(trait, basePath);
    expect(files).toEqual(entries.map(e => e.path));
  });

  it('returns strings only', () => {
    const trait = {
      layer0File: 'x.png',
      layer1File: 'y.png',
    } as unknown as UnifiedTrait;

    const files = getCompositeLayerFiles(trait, basePath);
    for (const f of files) {
      expect(typeof f).toBe('string');
    }
  });

  it('returns empty array for trait with no composite data', () => {
    const trait = {} as unknown as UnifiedTrait;
    expect(getCompositeLayerFiles(trait, basePath)).toHaveLength(0);
  });
});

// ============================================
// isGeneratorReady / getPathToTraitIdMap / clearUnifiedTraitsCache
// ============================================

describe('isGeneratorReady', () => {
  it('returns a boolean', () => {
    expect(typeof isGeneratorReady()).toBe('boolean');
  });

  it('returns false when cache has been cleared', () => {
    clearUnifiedTraitsCache();
    expect(isGeneratorReady()).toBe(false);
  });
});

describe('getPathToTraitIdMap', () => {
  beforeEach(() => {
    clearUnifiedTraitsCache();
  });

  it('returns a Map instance', () => {
    const map = getPathToTraitIdMap();
    expect(map instanceof Map).toBe(true);
  });

  it('returns an empty map when cache has been cleared', () => {
    clearUnifiedTraitsCache();
    expect(getPathToTraitIdMap().size).toBe(0);
  });
});

describe('clearUnifiedTraitsCache', () => {
  it('does not throw', () => {
    expect(() => clearUnifiedTraitsCache()).not.toThrow();
  });

  it('makes isGeneratorReady return false', () => {
    clearUnifiedTraitsCache();
    expect(isGeneratorReady()).toBe(false);
  });

  it('makes getPathToTraitIdMap return empty map', () => {
    clearUnifiedTraitsCache();
    expect(getPathToTraitIdMap().size).toBe(0);
  });

  it('can be called multiple times without throwing', () => {
    expect(() => {
      clearUnifiedTraitsCache();
      clearUnifiedTraitsCache();
    }).not.toThrow();
  });
});

// ============================================
// getAllLayerImages / getLayerImageByPath
// ============================================

describe('getAllLayerImages', () => {
  it('returns an array for a valid layer name', () => {
    const images = getAllLayerImages('Base' as UILayerName);
    expect(Array.isArray(images)).toBe(true);
  });

  it('returns an array (possibly empty) for any UILayerName', () => {
    const layers: UILayerName[] = ['Background', 'Head', 'Eyes', 'MouthBase', 'Clothes'];
    for (const layer of layers) {
      const images = getAllLayerImages(layer);
      expect(Array.isArray(images)).toBe(true);
    }
  });

  it('returns empty array for unknown layer name', () => {
    const images = getAllLayerImages('NonExistentLayer' as UILayerName);
    expect(images).toHaveLength(0);
  });
});

describe('getLayerImageByPath', () => {
  it('returns undefined for a path that does not exist', () => {
    const result = getLayerImageByPath('Base' as UILayerName, '/non-existent/path.png');
    expect(result).toBeUndefined();
  });

  it('returns undefined for unknown layer', () => {
    const result = getLayerImageByPath('UnknownLayer' as UILayerName, '/any/path.png');
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty path', () => {
    const result = getLayerImageByPath('Head' as UILayerName, '');
    expect(result).toBeUndefined();
  });
});
