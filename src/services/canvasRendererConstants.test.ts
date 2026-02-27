import { describe, it, expect } from 'vitest';
import {
  CLIP,
  MOUTH_OVER_CENTURION,
  MOUTH_OVER_BEER_HAT,
  NINJA_COVERING_MASKS,
  FULL_FACE_MASKS,
  HEADS_NEEDING_EYES_OVERLAY,
  SUITS_NEEDING_EYES_UNDER,
  LAYER_Z_INDEX,
} from './canvasRendererConstants';

// ============ CLIP ============

describe('CLIP', () => {
  it('HALF is exactly 0.5', () => {
    expect(CLIP.HALF).toBe(0.5);
  });

  it('SUIT_EYES_LEFT is 0.37', () => {
    expect(CLIP.SUIT_EYES_LEFT).toBe(0.37);
  });

  it('SUIT_EYES_RIGHT is 0.63', () => {
    expect(CLIP.SUIT_EYES_RIGHT).toBe(0.63);
  });

  it('SUIT_EYES_LEFT and SUIT_EYES_RIGHT sum to 1.0', () => {
    expect(CLIP.SUIT_EYES_LEFT + CLIP.SUIT_EYES_RIGHT).toBeCloseTo(1.0);
  });

  it('COPIUM_SUIT is between 0 and 1', () => {
    expect(CLIP.COPIUM_SUIT).toBeGreaterThan(0);
    expect(CLIP.COPIUM_SUIT).toBeLessThan(1);
  });

  it('NINJA_DEFAULT is 0.25', () => {
    expect(CLIP.NINJA_DEFAULT).toBe(0.25);
  });

  it('all clip values are numbers between 0 and 1 exclusive', () => {
    for (const value of Object.values(CLIP)) {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

// ============ MOUTH_OVER_CENTURION ============

describe('MOUTH_OVER_CENTURION', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(MOUTH_OVER_CENTURION)).toBe(true);
    expect(MOUTH_OVER_CENTURION.length).toBeGreaterThan(0);
  });

  it('contains Pizza', () => {
    expect(MOUTH_OVER_CENTURION).toContain('Pizza');
  });

  it('contains Bubble-Gum', () => {
    expect(MOUTH_OVER_CENTURION).toContain('Bubble-Gum');
  });

  it('contains Pipe', () => {
    expect(MOUTH_OVER_CENTURION).toContain('Pipe');
  });

  it('contains Joint', () => {
    expect(MOUTH_OVER_CENTURION).toContain('Joint');
  });

  it('contains Sick', () => {
    expect(MOUTH_OVER_CENTURION).toContain('Sick');
  });

  it('all entries are strings', () => {
    for (const entry of MOUTH_OVER_CENTURION) {
      expect(typeof entry).toBe('string');
    }
  });
});

// ============ MOUTH_OVER_BEER_HAT ============

describe('MOUTH_OVER_BEER_HAT', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(MOUTH_OVER_BEER_HAT)).toBe(true);
    expect(MOUTH_OVER_BEER_HAT.length).toBeGreaterThan(0);
  });

  it('contains Cig', () => {
    expect(MOUTH_OVER_BEER_HAT).toContain('Cig');
  });

  it('contains Joint', () => {
    expect(MOUTH_OVER_BEER_HAT).toContain('Joint');
  });

  it('contains Cohiba', () => {
    expect(MOUTH_OVER_BEER_HAT).toContain('Cohiba');
  });

  it('is a subset of MOUTH_OVER_CENTURION (beer hat subset)', () => {
    for (const trait of MOUTH_OVER_BEER_HAT) {
      expect(MOUTH_OVER_CENTURION).toContain(trait);
    }
  });

  it('is smaller than MOUTH_OVER_CENTURION', () => {
    expect(MOUTH_OVER_BEER_HAT.length).toBeLessThan(MOUTH_OVER_CENTURION.length);
  });
});

// ============ NINJA_COVERING_MASKS ============

describe('NINJA_COVERING_MASKS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(NINJA_COVERING_MASKS)).toBe(true);
    expect(NINJA_COVERING_MASKS.length).toBeGreaterThan(0);
  });

  it('contains copium', () => {
    expect(NINJA_COVERING_MASKS).toContain('copium');
  });

  it('contains hannibal', () => {
    expect(NINJA_COVERING_MASKS).toContain('hannibal');
  });

  it('contains bandana', () => {
    expect(NINJA_COVERING_MASKS).toContain('bandana');
  });

  it('all entries are lowercase strings', () => {
    for (const entry of NINJA_COVERING_MASKS) {
      expect(entry).toBe(entry.toLowerCase());
    }
  });
});

// ============ FULL_FACE_MASKS ============

describe('FULL_FACE_MASKS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(FULL_FACE_MASKS)).toBe(true);
    expect(FULL_FACE_MASKS.length).toBeGreaterThan(0);
  });

  it('contains skull_mask', () => {
    expect(FULL_FACE_MASKS).toContain('skull_mask');
  });

  it('contains skull-mask (hyphen variant)', () => {
    expect(FULL_FACE_MASKS).toContain('skull-mask');
  });

  it('contains medievalbepe', () => {
    expect(FULL_FACE_MASKS).toContain('medievalbepe');
  });

  it('contains tanginium', () => {
    expect(FULL_FACE_MASKS).toContain('tanginium');
  });

  it('all entries are strings', () => {
    for (const entry of FULL_FACE_MASKS) {
      expect(typeof entry).toBe('string');
    }
  });
});

// ============ HEADS_NEEDING_EYES_OVERLAY ============

describe('HEADS_NEEDING_EYES_OVERLAY', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(HEADS_NEEDING_EYES_OVERLAY)).toBe(true);
    expect(HEADS_NEEDING_EYES_OVERLAY.length).toBeGreaterThan(0);
  });

  it('contains clown', () => {
    expect(HEADS_NEEDING_EYES_OVERLAY).toContain('clown');
  });

  it('contains pirate', () => {
    expect(HEADS_NEEDING_EYES_OVERLAY).toContain('pirate');
  });

  it('contains ronin', () => {
    expect(HEADS_NEEDING_EYES_OVERLAY).toContain('ronin');
  });

  it('contains saiyan', () => {
    expect(HEADS_NEEDING_EYES_OVERLAY).toContain('saiyan');
  });

  it('all entries are lowercase strings', () => {
    for (const entry of HEADS_NEEDING_EYES_OVERLAY) {
      expect(entry).toBe(entry.toLowerCase());
    }
  });
});

// ============ SUITS_NEEDING_EYES_UNDER ============

describe('SUITS_NEEDING_EYES_UNDER', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(SUITS_NEEDING_EYES_UNDER)).toBe(true);
    expect(SUITS_NEEDING_EYES_UNDER.length).toBeGreaterThan(0);
  });

  it('contains gopher-suit', () => {
    expect(SUITS_NEEDING_EYES_UNDER).toContain('gopher-suit');
  });

  it('contains sonic-suit', () => {
    expect(SUITS_NEEDING_EYES_UNDER).toContain('sonic-suit');
  });

  it('contains proof-of-prayer', () => {
    expect(SUITS_NEEDING_EYES_UNDER).toContain('proof-of-prayer');
  });

  it('contains pickle-suit', () => {
    expect(SUITS_NEEDING_EYES_UNDER).toContain('pickle-suit');
  });

  it('all entries are lowercase strings', () => {
    for (const entry of SUITS_NEEDING_EYES_UNDER) {
      expect(typeof entry).toBe('string');
      expect(entry).toBe(entry.toLowerCase());
    }
  });
});

// ============ LAYER_Z_INDEX ============

describe('LAYER_Z_INDEX', () => {
  it('is a non-empty object', () => {
    expect(typeof LAYER_Z_INDEX).toBe('object');
    expect(Object.keys(LAYER_Z_INDEX).length).toBeGreaterThan(0);
  });

  it('Background has zIndex 0', () => {
    expect(LAYER_Z_INDEX.Background).toBe(0);
  });

  it('Head is at zIndex 12', () => {
    expect(LAYER_Z_INDEX.Head).toBe(12);
  });

  it('Eyes renders after Mask', () => {
    expect(LAYER_Z_INDEX.Eyes).toBeGreaterThan(LAYER_Z_INDEX.Mask);
  });

  it('FacialHair renders before MouthBase', () => {
    expect(LAYER_Z_INDEX.FacialHair).toBeLessThan(LAYER_Z_INDEX.MouthBase);
  });

  it('MouthItem renders after MouthBase', () => {
    expect(LAYER_Z_INDEX.MouthItem).toBeGreaterThan(LAYER_Z_INDEX.MouthBase);
  });

  it('FullFaceMask has zIndex 100', () => {
    expect(LAYER_Z_INDEX.FullFaceMask).toBe(100);
  });

  it('ExtraHands has the highest zIndex (101)', () => {
    expect(LAYER_Z_INDEX.ExtraHands).toBe(101);
    const maxVal = Math.max(...Object.values(LAYER_Z_INDEX));
    expect(LAYER_Z_INDEX.ExtraHands).toBe(maxVal);
  });

  it('BubbleGumOverEyes has a high zIndex (60)', () => {
    expect(LAYER_Z_INDEX.BubbleGumOverEyes).toBe(60);
  });

  it('Astronaut renders after Eyes', () => {
    expect(LAYER_Z_INDEX.Astronaut).toBeGreaterThan(LAYER_Z_INDEX.Eyes);
  });

  it('HannibalMask renders after Mask', () => {
    expect(LAYER_Z_INDEX.HannibalMask).toBeGreaterThan(LAYER_Z_INDEX.Mask);
  });

  it('TysonTattoo is between MouthItem and Mask', () => {
    expect(LAYER_Z_INDEX.TysonTattoo).toBeGreaterThan(LAYER_Z_INDEX.MouthItem);
    expect(LAYER_Z_INDEX.TysonTattoo).toBeLessThan(LAYER_Z_INDEX.Mask);
  });

  it('all values are finite numbers', () => {
    for (const value of Object.values(LAYER_Z_INDEX)) {
      expect(typeof value).toBe('number');
      expect(isFinite(value)).toBe(true);
    }
  });

  it('EyesUnderSuit renders before Clothes', () => {
    expect(LAYER_Z_INDEX.EyesUnderSuit).toBeLessThan(LAYER_Z_INDEX.Clothes);
  });

  it('Clothes renders after Base', () => {
    expect(LAYER_Z_INDEX.Clothes).toBeGreaterThan(LAYER_Z_INDEX.Base);
  });
});
