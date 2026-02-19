import { describe, it, expect } from 'vitest';
import {
  G2_FILL_TREATMENTS,
  getFillSlotBehavior,
  isUserPickableFill,
  getAllUserPickableFillSlots,
  type DerivedFillSlotConfig,
  type FixedFillSlotConfig,
} from './g2FillTreatments';

// ---------------------------------------------------------------------------
// getFillSlotBehavior — pure function, no side effects
// ---------------------------------------------------------------------------
describe('getFillSlotBehavior', () => {
  it('returns { type: "user" } for an unknown trait', () => {
    expect(getFillSlotBehavior('Trait_DoesNotExist', 'fill1')).toEqual({ type: 'user' });
  });

  it('returns { type: "user" } for a known trait but unknown fill slot', () => {
    expect(getFillSlotBehavior('Clothes_Bathrobe', 'fill99')).toEqual({ type: 'user' });
  });

  it('returns user config for Clothes_Bathrobe fill1', () => {
    const result = getFillSlotBehavior('Clothes_Bathrobe', 'fill1');
    expect(result.type).toBe('user');
  });

  it('returns derived config for Clothes_Bathrobe fill2', () => {
    const result = getFillSlotBehavior('Clothes_Bathrobe', 'fill2') as DerivedFillSlotConfig;
    expect(result.type).toBe('derived');
    expect(result.source).toBe('fill1');
    expect(result.treatment).toBe('darker_shade');
    expect(result.amount).toBe(25);
  });

  it('returns derived config with lighter_shade for Face-laser_Laser-Eyes fill1', () => {
    const result = getFillSlotBehavior('Face-laser_Laser-Eyes', 'fill1') as DerivedFillSlotConfig;
    expect(result.type).toBe('derived');
    expect(result.source).toBe('fill0');
    expect(result.treatment).toBe('lighter_shade');
    expect(result.amount).toBe(10);
  });

  it('returns derived config with lighter_shade amount 40 for Face-laser_Laser-Eyes fill2', () => {
    const result = getFillSlotBehavior('Face-laser_Laser-Eyes', 'fill2') as DerivedFillSlotConfig;
    expect(result.amount).toBe(40);
  });

  it('returns fixed config for Clothes_Military-jacket fill2', () => {
    const result = getFillSlotBehavior('Clothes_Military-jacket', 'fill2') as FixedFillSlotConfig;
    expect(result.type).toBe('fixed');
    expect(result.fixedColor).toBe('#FF0000');
  });

  it('returns fixed config for Clothes_Military-jacket fill4', () => {
    const result = getFillSlotBehavior('Clothes_Military-jacket', 'fill4') as FixedFillSlotConfig;
    expect(result.type).toBe('fixed');
    expect(result.fixedColor).toBe('#FDE047');
  });

  it('returns split_complementary treatment for Face-wear_3d-glases fill2', () => {
    const result = getFillSlotBehavior('Face-wear_3d-glases', 'fill2') as DerivedFillSlotConfig;
    expect(result.treatment).toBe('split_complementary');
  });
});

// ---------------------------------------------------------------------------
// isUserPickableFill — pure boolean predicate
// ---------------------------------------------------------------------------
describe('isUserPickableFill', () => {
  it('returns true for an unknown trait (default = user)', () => {
    expect(isUserPickableFill('Trait_Unknown', 'fill1')).toBe(true);
  });

  it('returns true for Clothes_Bathrobe fill1 (user)', () => {
    expect(isUserPickableFill('Clothes_Bathrobe', 'fill1')).toBe(true);
  });

  it('returns false for Clothes_Bathrobe fill2 (derived)', () => {
    expect(isUserPickableFill('Clothes_Bathrobe', 'fill2')).toBe(false);
  });

  it('returns false for Face-laser_Laser-Eyes fill1 (derived)', () => {
    expect(isUserPickableFill('Face-laser_Laser-Eyes', 'fill1')).toBe(false);
  });

  it('returns true for Face-laser_Laser-Eyes fill0 (user)', () => {
    expect(isUserPickableFill('Face-laser_Laser-Eyes', 'fill0')).toBe(true);
  });

  it('returns false for a fixed slot (Clothes_Military-jacket fill2)', () => {
    expect(isUserPickableFill('Clothes_Military-jacket', 'fill2')).toBe(false);
  });

  it('returns true for Clothes_Military-jacket fill0 (user)', () => {
    expect(isUserPickableFill('Clothes_Military-jacket', 'fill0')).toBe(true);
  });

  it('returns true for Head_Comrad-Hat fill3 (independent user slot)', () => {
    expect(isUserPickableFill('Head_Comrad-Hat', 'fill3')).toBe(true);
  });

  it('returns false for Head_Comrad-Hat fill2 (derived)', () => {
    expect(isUserPickableFill('Head_Comrad-Hat', 'fill2')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getAllUserPickableFillSlots — pure function operating on trait shape
// ---------------------------------------------------------------------------
describe('getAllUserPickableFillSlots', () => {
  it('returns empty array when trait is null', () => {
    expect(getAllUserPickableFillSlots('Clothes_Bathrobe', null)).toEqual([]);
  });

  it('returns ["fill1"] for Clothes_Bathrobe with fill1File + fill2File (fill2 is derived)', () => {
    const trait = { fill1File: 'f1.svg', fill2File: 'f2.svg' };
    const result = getAllUserPickableFillSlots('Clothes_Bathrobe', trait);
    expect(result).toEqual(['fill1']);
  });

  it('returns ["fill0"] for Face-laser_Laser-Eyes with fillFiles of length 3', () => {
    const trait = { fillFiles: ['f0.svg', 'f1.svg', 'f2.svg'] };
    const result = getAllUserPickableFillSlots('Face-laser_Laser-Eyes', trait);
    expect(result).toEqual(['fill0']);
  });

  it('returns ["fill"] for an unknown trait with only a fillFile (no treatments override)', () => {
    const trait = { fillFile: 'base.svg' };
    const result = getAllUserPickableFillSlots('Trait_NotInTreatments', trait);
    expect(result).toEqual(['fill']);
  });

  it('returns ["fill0", "fill1", "fill2"] for Clothes_Ronin with fillFiles of length 3 (all user)', () => {
    const trait = { fillFiles: ['f0.svg', 'f1.svg', 'f2.svg'] };
    const result = getAllUserPickableFillSlots('Clothes_Ronin', trait);
    expect(result).toEqual(['fill0', 'fill1', 'fill2']);
  });

  it('returns ["fill1"] for Clothes_SWAT with fill1File + fill2File (fill2 derived)', () => {
    const trait = { fill1File: 'f1.svg', fill2File: 'f2.svg' };
    const result = getAllUserPickableFillSlots('Clothes_SWAT', trait);
    expect(result).toEqual(['fill1']);
  });

  it('returns ["fill1", "fill3"] for Head_Comrad-Hat when fill1File + fill2File present', () => {
    // fill2 is derived (excluded); fill3 is an extra user slot added via treatments
    const trait = { fill1File: 'f1.svg', fill2File: 'f2.svg' };
    const result = getAllUserPickableFillSlots('Head_Comrad-Hat', trait);
    expect(result).toEqual(['fill1', 'fill3']);
  });

  it('uses layers when available, mapping mfill keys to canonical fill keys', () => {
    const trait = {
      layers: [
        { type: 'fill', key: 'mfill0', pos: 0 },
        { type: 'fill', key: 'mfill1', pos: 1 },
      ],
    };
    // Unknown trait — both slots default to user
    const result = getAllUserPickableFillSlots('Trait_NotInTreatments', trait);
    expect(result).toEqual(['fill0', 'fill1']);
  });

  it('excludes derived fill slots when trait has named fill layers', () => {
    // Clothes_Bathrobe: fill1=user, fill2=derived — layers-based path
    const trait = {
      layers: [
        { type: 'fill', key: 'fill1', pos: 0 },
        { type: 'fill', key: 'fill2', pos: 1 },
      ],
    };
    const result = getAllUserPickableFillSlots('Clothes_Bathrobe', trait);
    expect(result).toEqual(['fill1']);
  });
});

// ---------------------------------------------------------------------------
// G2_FILL_TREATMENTS — regression tests for specific config shapes
// ---------------------------------------------------------------------------
describe('G2_FILL_TREATMENTS — regression configs', () => {
  it('Clothes_Ninja-turtle-fit fill1 derives desaturated 15 from fill0', () => {
    const slot = G2_FILL_TREATMENTS['Clothes_Ninja-turtle-fit']['fill1'] as DerivedFillSlotConfig;
    expect(slot.treatment).toBe('desaturated');
    expect(slot.amount).toBe(15);
  });

  it('Clothes_Ninja-turtle-fit fill2 derives desaturated 30 from fill0', () => {
    const slot = G2_FILL_TREATMENTS['Clothes_Ninja-turtle-fit']['fill2'] as DerivedFillSlotConfig;
    expect(slot.amount).toBe(30);
  });

  it('Head_viking-helmet fill2 derives darker_shade 5 from fill1', () => {
    const slot = G2_FILL_TREATMENTS['Head_viking-helmet']['fill2'] as DerivedFillSlotConfig;
    expect(slot.source).toBe('fill1');
    expect(slot.treatment).toBe('darker_shade');
    expect(slot.amount).toBe(5);
  });

  it('Head_Super-Saiyan fill2 derives darker_shade 12 from fill1', () => {
    const slot = G2_FILL_TREATMENTS['Head_Super-Saiyan']['fill2'] as DerivedFillSlotConfig;
    expect(slot.treatment).toBe('darker_shade');
    expect(slot.amount).toBe(12);
  });

  it('Clothes_Military-jacket fill1 is complementary of fill0', () => {
    const slot = G2_FILL_TREATMENTS['Clothes_Military-jacket']['fill1'] as DerivedFillSlotConfig;
    expect(slot.treatment).toBe('complementary');
    expect(slot.source).toBe('fill0');
  });

  it('Face-wear_VR-headset defines four fill slots', () => {
    const slots = G2_FILL_TREATMENTS['Face-wear_VR-headset'];
    expect(Object.keys(slots)).toHaveLength(4);
  });

  it('Face-wear_VR-headset fill1/fill2/fill3 all derive darker_shade 5 from fill0', () => {
    const slots = G2_FILL_TREATMENTS['Face-wear_VR-headset'];
    for (const key of ['fill1', 'fill2', 'fill3']) {
      const slot = slots[key] as DerivedFillSlotConfig;
      expect(slot.type).toBe('derived');
      expect(slot.source).toBe('fill0');
      expect(slot.treatment).toBe('darker_shade');
      expect(slot.amount).toBe(5);
    }
  });
});
