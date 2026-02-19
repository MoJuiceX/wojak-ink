import { describe, it, expect } from 'vitest';
import {
  LAYER_ORDER,
  LAYER_NAMES,
  UI_LAYER_NAMES,
  type LayerDefinition,
} from './memeLayers';

// ============ LAYER_ORDER ============

describe('LAYER_ORDER', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(LAYER_ORDER)).toBe(true);
    expect(LAYER_ORDER.length).toBeGreaterThan(0);
  });

  it('has required fields on every entry (name, folder, zIndex)', () => {
    for (const layer of LAYER_ORDER) {
      expect(typeof layer.name).toBe('string');
      expect(typeof layer.folder).toBe('string');
      expect(typeof layer.zIndex).toBe('number');
    }
  });

  it('all names are non-empty strings', () => {
    for (const layer of LAYER_ORDER) {
      expect(layer.name.length).toBeGreaterThan(0);
    }
  });

  it('all folders are non-empty strings', () => {
    for (const layer of LAYER_ORDER) {
      expect(layer.folder.length).toBeGreaterThan(0);
    }
  });

  it('contains Background with zIndex 0', () => {
    const bg = LAYER_ORDER.find(l => l.name === 'Background');
    expect(bg).toBeDefined();
    expect(bg!.zIndex).toBe(0);
  });

  it('contains Head with zIndex 12', () => {
    const head = LAYER_ORDER.find(l => l.name === 'Head');
    expect(head).toBeDefined();
    expect(head!.zIndex).toBe(12);
  });

  it('Eyes renders after Mask (Eyes zIndex > Mask zIndex)', () => {
    const eyes = LAYER_ORDER.find(l => l.name === 'Eyes');
    const mask = LAYER_ORDER.find(l => l.name === 'Mask');
    expect(eyes).toBeDefined();
    expect(mask).toBeDefined();
    expect(eyes!.zIndex).toBeGreaterThan(mask!.zIndex);
  });

  it('FacialHair renders before MouthBase', () => {
    const facialHair = LAYER_ORDER.find(l => l.name === 'FacialHair');
    const mouthBase = LAYER_ORDER.find(l => l.name === 'MouthBase');
    expect(facialHair!.zIndex).toBeLessThan(mouthBase!.zIndex);
  });

  it('MouthItem renders after MouthBase', () => {
    const mouthBase = LAYER_ORDER.find(l => l.name === 'MouthBase');
    const mouthItem = LAYER_ORDER.find(l => l.name === 'MouthItem');
    expect(mouthItem!.zIndex).toBeGreaterThan(mouthBase!.zIndex);
  });

  it('Astronaut renders after Eyes', () => {
    const astronaut = LAYER_ORDER.find(l => l.name === 'Astronaut');
    const eyes = LAYER_ORDER.find(l => l.name === 'Eyes');
    expect(astronaut).toBeDefined();
    expect(astronaut!.zIndex).toBeGreaterThan(eyes!.zIndex);
  });

  it('HannibalMask renders after MouthItem', () => {
    const hannibal = LAYER_ORDER.find(l => l.name === 'HannibalMask');
    const mouthItem = LAYER_ORDER.find(l => l.name === 'MouthItem');
    expect(hannibal!.zIndex).toBeGreaterThan(mouthItem!.zIndex);
  });

  it('TysonTattoo is between MouthItem and Mask', () => {
    const tyson = LAYER_ORDER.find(l => l.name === 'TysonTattoo');
    const mouthItem = LAYER_ORDER.find(l => l.name === 'MouthItem');
    const mask = LAYER_ORDER.find(l => l.name === 'Mask');
    expect(tyson!.zIndex).toBeGreaterThan(mouthItem!.zIndex);
    expect(tyson!.zIndex).toBeLessThan(mask!.zIndex);
  });

  it('BubbleGumOverEyes has the highest zIndex in the stack', () => {
    const bubbleGum = LAYER_ORDER.find(l => l.name === 'BubbleGumOverEyes');
    const allZIndices = LAYER_ORDER.map(l => l.zIndex);
    const maxZIndex = Math.max(...allZIndices);
    expect(bubbleGum!.zIndex).toBe(maxZIndex);
  });

  it('contains exactly one Background layer', () => {
    const backgrounds = LAYER_ORDER.filter(l => l.name === 'Background');
    expect(backgrounds).toHaveLength(1);
  });

  it('Base renders before Clothes (zIndex is lower)', () => {
    const base = LAYER_ORDER.find(l => l.name === 'Base');
    const clothes = LAYER_ORDER.find(l => l.name === 'Clothes');
    expect(base!.zIndex).toBeLessThan(clothes!.zIndex);
  });

  it('Head renders before BandanaMaskOverRonin', () => {
    const head = LAYER_ORDER.find(l => l.name === 'Head');
    const bandana = LAYER_ORDER.find(l => l.name === 'BandanaMaskOverRonin');
    expect(head!.zIndex).toBeLessThan(bandana!.zIndex);
  });

  it('Astronaut folder is ASTRONAUT', () => {
    const astronaut = LAYER_ORDER.find(l => l.name === 'Astronaut');
    expect(astronaut!.folder).toBe('ASTRONAUT');
  });

  it('ClothesAddon folder is CLOTHESADDON', () => {
    const clothesAddon = LAYER_ORDER.find(l => l.name === 'ClothesAddon');
    expect(clothesAddon!.folder).toBe('CLOTHESADDON');
    expect(clothesAddon!.zIndex).toBe(3);
  });

  it('HannibalMask folder is HANNIBALMASK', () => {
    const hannibal = LAYER_ORDER.find(l => l.name === 'HannibalMask');
    expect(hannibal!.folder).toBe('HANNIBALMASK');
  });

  it('NinjaTurtleUnderMask is defined in the stack', () => {
    const ninja = LAYER_ORDER.find(l => l.name === 'NinjaTurtleUnderMask');
    expect(ninja).toBeDefined();
    expect(ninja!.zIndex).toBe(6.6);
  });

  it('all zIndex values are finite numbers', () => {
    for (const layer of LAYER_ORDER) {
      expect(isFinite(layer.zIndex)).toBe(true);
    }
  });

  it('type check: LayerDefinition shape is correct', () => {
    const layer: LayerDefinition = LAYER_ORDER[0];
    expect(typeof layer.name).toBe('string');
    expect(typeof layer.folder).toBe('string');
    expect(typeof layer.zIndex).toBe('number');
  });

  it('BubbleGumRekt folder is MOUTH', () => {
    const bubbleGumRekt = LAYER_ORDER.find(l => l.name === 'BubbleGumRekt');
    expect(bubbleGumRekt).toBeDefined();
    expect(bubbleGumRekt!.folder).toBe('MOUTH');
  });

  it('MouthBase renders before Mask', () => {
    const mouthBase = LAYER_ORDER.find(l => l.name === 'MouthBase');
    const mask = LAYER_ORDER.find(l => l.name === 'Mask');
    expect(mouthBase!.zIndex).toBeLessThan(mask!.zIndex);
  });

  it('EyesOverHead renders after Head', () => {
    const eyesOverHead = LAYER_ORDER.find(l => l.name === 'EyesOverHead');
    const head = LAYER_ORDER.find(l => l.name === 'Head');
    expect(eyesOverHead!.zIndex).toBeGreaterThan(head!.zIndex);
  });
});

// ============ LAYER_NAMES ============

describe('LAYER_NAMES', () => {
  it('has the same length as LAYER_ORDER', () => {
    expect(LAYER_NAMES.length).toBe(LAYER_ORDER.length);
  });

  it('contains the name of every layer in LAYER_ORDER', () => {
    for (const layer of LAYER_ORDER) {
      expect(LAYER_NAMES).toContain(layer.name);
    }
  });

  it('contains Background', () => {
    expect(LAYER_NAMES).toContain('Background');
  });

  it('contains Head', () => {
    expect(LAYER_NAMES).toContain('Head');
  });

  it('contains Eyes', () => {
    expect(LAYER_NAMES).toContain('Eyes');
  });

  it('contains Mask', () => {
    expect(LAYER_NAMES).toContain('Mask');
  });

  it('contains FacialHair', () => {
    expect(LAYER_NAMES).toContain('FacialHair');
  });

  it('is an array of strings only', () => {
    for (const name of LAYER_NAMES) {
      expect(typeof name).toBe('string');
    }
  });

  it('has no empty strings', () => {
    for (const name of LAYER_NAMES) {
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate names', () => {
    const unique = new Set(LAYER_NAMES);
    expect(unique.size).toBe(LAYER_NAMES.length);
  });
});

// ============ UI_LAYER_NAMES ============

describe('UI_LAYER_NAMES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(UI_LAYER_NAMES)).toBe(true);
    expect(UI_LAYER_NAMES.length).toBeGreaterThan(0);
  });

  it('contains Background', () => {
    expect(UI_LAYER_NAMES).toContain('Background');
  });

  it('contains Clothes', () => {
    expect(UI_LAYER_NAMES).toContain('Clothes');
  });

  it('contains Eyes', () => {
    expect(UI_LAYER_NAMES).toContain('Eyes');
  });

  it('contains Head', () => {
    expect(UI_LAYER_NAMES).toContain('Head');
  });

  it('all entries are strings', () => {
    for (const name of UI_LAYER_NAMES) {
      expect(typeof name).toBe('string');
    }
  });

  it('has fewer entries than LAYER_ORDER (UI layers only, no virtual)', () => {
    expect(UI_LAYER_NAMES.length).toBeLessThan(LAYER_ORDER.length);
  });
});
