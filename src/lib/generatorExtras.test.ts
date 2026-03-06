import { describe, expect, it } from 'vitest';
import { filterRandomizableTraitsForLayer, isExtraAccessoryPath, isWingsExtraPath } from '@/lib/generatorExtras';

describe('generatorExtras', () => {
  it('detects extra accessory paths from the EXTRA folder', () => {
    expect(isExtraAccessoryPath('/assets/wojak-layers/EXTRA/EXTRA_EXTRA_wings.png')).toBe(true);
    expect(isExtraAccessoryPath('/assets/wojak-layers/EXTRA/EXTRA_EXTRA_hand_orange.png')).toBe(true);
    expect(isExtraAccessoryPath('/assets/wojak-layers/MASK/Skull_mask_orange.png')).toBe(false);
  });

  it('detects wings specifically', () => {
    expect(isWingsExtraPath('/assets/wojak-layers/EXTRA/EXTRA_EXTRA_wings.png')).toBe(true);
    expect(isWingsExtraPath('/assets/wojak-layers/EXTRA/EXTRA_EXTRA_hand_orange.png')).toBe(false);
  });

  it('filters extra accessories out of mask randomization only', () => {
    const traits = [
      { g1Path: '/assets/wojak-layers/MASK/Skull_mask_orange.png', id: 'mask1' },
      { g1Path: '/assets/wojak-layers/EXTRA/EXTRA_EXTRA_wings.png', id: 'wings' },
      { g1Path: '/assets/wojak-layers/EXTRA/EXTRA_EXTRA_hand_orange.png', id: 'orange' },
    ];

    expect(filterRandomizableTraitsForLayer('Mask', traits).map((trait) => trait.id)).toEqual(['mask1']);
    expect(filterRandomizableTraitsForLayer('Eyes', traits).map((trait) => trait.id)).toEqual(['mask1', 'wings', 'orange']);
  });
});
