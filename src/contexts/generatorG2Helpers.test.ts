import { describe, expect, it } from 'vitest';

import { assembleG2Selection } from './generatorG2Helpers';

describe('assembleG2Selection', () => {
  it('defaults Topless tattoo detail to none so tattoos stay optional', () => {
    const { g2 } = assembleG2Selection({
      id: 'Clothes_Topless',
      name: 'Topless',
      category: 'Clothes',
      source: 'g2',
      colorable: false,
      outlineFile: '../CLOTHES/CLOTHES_Topless_.png',
      detailOptions: [
        { file: '../tattoos/tattoos_1_anchor.png', name: 'Anchor' },
      ],
    });

    expect(g2.traitId).toBe('Clothes_Topless');
    expect(g2.options.detail).toBeUndefined();
  });
});
