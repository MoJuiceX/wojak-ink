import { describe, it, expect } from 'vitest';
import {
  RENDER_ORDER,
  UI_ORDER,
  LAYER_META,
  REQUIRED_LAYERS_FOR_EXPORT,
  DEFAULT_SELECTIONS,
  DEFAULT_CLOTHES_PATH,
  DEFAULT_BASE_PATH,
  DEFAULT_MOUTHBASE_PATH,
  BASE_CLOTHES_MAP,
  SCENE_BACKGROUNDS,
  getLayerMeta,
  isLayerRequired,
  type UILayerName,
} from './layerRegistry';

// ============ RENDER_ORDER ============

describe('RENDER_ORDER', () => {
  it('contains all 9 UILayerName values', () => {
    expect(RENDER_ORDER).toHaveLength(9);
  });

  it('starts with Background (bottom-most layer)', () => {
    expect(RENDER_ORDER[0]).toBe('Background');
  });

  it('ends with Head (top-most layer)', () => {
    expect(RENDER_ORDER[RENDER_ORDER.length - 1]).toBe('Head');
  });

  it('has Base before Clothes (face below clothes)', () => {
    const baseIdx = RENDER_ORDER.indexOf('Base');
    const clothesIdx = RENDER_ORDER.indexOf('Clothes');
    expect(baseIdx).toBeLessThan(clothesIdx);
  });

  it('has MouthBase before MouthItem (base renders before item)', () => {
    const baseIdx = RENDER_ORDER.indexOf('MouthBase');
    const itemIdx = RENDER_ORDER.indexOf('MouthItem');
    expect(baseIdx).toBeLessThan(itemIdx);
  });

  it('has Mask before Eyes (mask under eyes accessories)', () => {
    const maskIdx = RENDER_ORDER.indexOf('Mask');
    const eyesIdx = RENDER_ORDER.indexOf('Eyes');
    expect(maskIdx).toBeLessThan(eyesIdx);
  });

  it('contains no duplicate entries', () => {
    const unique = new Set(RENDER_ORDER);
    expect(unique.size).toBe(RENDER_ORDER.length);
  });
});

// ============ UI_ORDER ============

describe('UI_ORDER', () => {
  it('contains all 9 UILayerName values', () => {
    expect(UI_ORDER).toHaveLength(9);
  });

  it('starts with Base (first tab users see)', () => {
    expect(UI_ORDER[0]).toBe('Base');
  });

  it('ends with Background (last tab)', () => {
    expect(UI_ORDER[UI_ORDER.length - 1]).toBe('Background');
  });

  it('contains no duplicate entries', () => {
    const unique = new Set(UI_ORDER);
    expect(unique.size).toBe(UI_ORDER.length);
  });

  it('covers exactly the same set of layers as RENDER_ORDER', () => {
    expect([...UI_ORDER].sort()).toEqual([...RENDER_ORDER].sort());
  });
});

// ============ LAYER_META ============

describe('LAYER_META', () => {
  it('has an entry for every UILayerName in RENDER_ORDER', () => {
    for (const name of RENDER_ORDER) {
      expect(LAYER_META).toHaveProperty(name);
    }
  });

  it('marks only Base as required', () => {
    const requiredLayers = Object.entries(LAYER_META)
      .filter(([, meta]) => meta.required)
      .map(([name]) => name);
    expect(requiredLayers).toEqual(['Base']);
  });

  it('Background is not required', () => {
    expect(LAYER_META.Background.required).toBe(false);
  });

  it('Base has label "Face"', () => {
    expect(LAYER_META.Base.label).toBe('Face');
  });

  it('every layer has a non-empty label, icon, and description', () => {
    for (const name of RENDER_ORDER) {
      const meta = LAYER_META[name as UILayerName];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.icon.length).toBeGreaterThan(0);
      expect(meta.description).toBeDefined();
      expect((meta.description ?? '').length).toBeGreaterThan(0);
    }
  });
});

// ============ getLayerMeta ============

describe('getLayerMeta', () => {
  it('returns the correct metadata for Base', () => {
    const meta = getLayerMeta('Base');
    expect(meta).toEqual(LAYER_META.Base);
  });

  it('returns the correct metadata for Background', () => {
    const meta = getLayerMeta('Background');
    expect(meta).toEqual(LAYER_META.Background);
  });

  it('returns the correct metadata for Head', () => {
    const meta = getLayerMeta('Head');
    expect(meta.label).toBe('Head');
  });

  it('returns a reference-equal value to LAYER_META (no copy)', () => {
    // Regression: getLayerMeta is a direct lookup, not a clone
    expect(getLayerMeta('Eyes')).toBe(LAYER_META.Eyes);
  });
});

// ============ isLayerRequired ============

describe('isLayerRequired', () => {
  it('returns true for Base', () => {
    expect(isLayerRequired('Base')).toBe(true);
  });

  it('returns false for Background', () => {
    expect(isLayerRequired('Background')).toBe(false);
  });

  it('returns false for Clothes', () => {
    expect(isLayerRequired('Clothes')).toBe(false);
  });

  it('returns false for Eyes', () => {
    expect(isLayerRequired('Eyes')).toBe(false);
  });

  it('returns false for Head', () => {
    expect(isLayerRequired('Head')).toBe(false);
  });

  it('returns false for MouthBase', () => {
    expect(isLayerRequired('MouthBase')).toBe(false);
  });
});

// ============ Defaults and Constants ============

describe('REQUIRED_LAYERS_FOR_EXPORT', () => {
  it('includes Base', () => {
    expect(REQUIRED_LAYERS_FOR_EXPORT).toContain('Base');
  });

  it('includes Clothes', () => {
    expect(REQUIRED_LAYERS_FOR_EXPORT).toContain('Clothes');
  });

  it('includes MouthBase', () => {
    expect(REQUIRED_LAYERS_FOR_EXPORT).toContain('MouthBase');
  });

  it('has exactly 3 entries', () => {
    expect(REQUIRED_LAYERS_FOR_EXPORT).toHaveLength(3);
  });
});

describe('DEFAULT_SELECTIONS', () => {
  it('sets a default path for MouthBase', () => {
    expect(DEFAULT_SELECTIONS.MouthBase).toBeDefined();
    expect(DEFAULT_SELECTIONS.MouthBase).toMatch(/MOUTH_numb\.png$/);
  });

  it('sets a default path for Clothes', () => {
    expect(DEFAULT_SELECTIONS.Clothes).toBeDefined();
    expect(DEFAULT_SELECTIONS.Clothes).toMatch(/CLOTHES_Tee_blue\.png$/);
  });
});

describe('DEFAULT_CLOTHES_PATH', () => {
  it('points to the blue tee', () => {
    expect(DEFAULT_CLOTHES_PATH).toMatch(/CLOTHES_Tee_blue\.png$/);
  });
});

describe('DEFAULT_BASE_PATH', () => {
  it('points to the classic base wojak', () => {
    expect(DEFAULT_BASE_PATH).toMatch(/BASE_Base-Wojak_classic\.png$/);
  });
});

describe('DEFAULT_MOUTHBASE_PATH', () => {
  it('points to the numb mouth', () => {
    expect(DEFAULT_MOUTHBASE_PATH).toMatch(/MOUTH_numb\.png$/);
  });
});

describe('BASE_CLOTHES_MAP', () => {
  it('has an entry for "classic"', () => {
    expect(BASE_CLOTHES_MAP.classic).toBeDefined();
  });

  it('has an entry for "rekt"', () => {
    expect(BASE_CLOTHES_MAP.rekt).toBeDefined();
  });

  it('all values point to the blue tee (regression)', () => {
    for (const [, path] of Object.entries(BASE_CLOTHES_MAP)) {
      expect(path).toMatch(/CLOTHES_Tee_blue\.png$/);
    }
  });
});

describe('SCENE_BACKGROUNDS', () => {
  it('has at least 10 scene backgrounds', () => {
    expect(SCENE_BACKGROUNDS.length).toBeGreaterThanOrEqual(10);
  });

  it('every entry is a non-empty string path', () => {
    for (const bg of SCENE_BACKGROUNDS) {
      expect(typeof bg).toBe('string');
      expect(bg.length).toBeGreaterThan(0);
    }
  });

  it('every entry is under the BACKGROUND/Scene/ directory', () => {
    for (const bg of SCENE_BACKGROUNDS) {
      expect(bg).toMatch(/BACKGROUND\/Scene\//);
    }
  });

  it('every entry ends with .png', () => {
    for (const bg of SCENE_BACKGROUNDS) {
      expect(bg).toMatch(/\.png$/);
    }
  });

  it('contains no duplicates', () => {
    const unique = new Set(SCENE_BACKGROUNDS);
    expect(unique.size).toBe(SCENE_BACKGROUNDS.length);
  });
});
