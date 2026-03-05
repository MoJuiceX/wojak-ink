import { describe, expect, it } from 'vitest';

import {
  TOPLESS_TATTOO_DETAIL_OPTIONS,
  TOPLESS_TATTOO_TRAIT_ID,
  augmentG2ManifestWithToplessTattoos,
  createToplessTattooTrait,
} from './toplessTattooDetails';

describe('toplessTattooDetails', () => {
  it('builds the synthetic Topless trait with all uploaded tattoo details', () => {
    const trait = createToplessTattooTrait();

    expect(trait.id).toBe(TOPLESS_TATTOO_TRAIT_ID);
    expect(trait.name).toBe('Topless');
    expect(trait.outlineFile).toBe('../CLOTHES/CLOTHES_Topless_.png');
    expect(trait.detailOptions).toHaveLength(35);
    expect(trait.detailOptions?.[0]).toEqual({
      file: '/assets/wojak-layers/tattoos/tattoos_1_Taco.png?v=20260305a',
      name: 'Taco',
    });
    expect(trait.detailOptions?.at(-1)).toEqual({
      file: '/assets/wojak-layers/tattoos/tattoos_4_sparrow.png?v=20260305a',
      name: 'Sparrow',
    });
  });

  it('formats special tattoo labels cleanly', () => {
    expect(TOPLESS_TATTOO_DETAIL_OPTIONS).toContainEqual({
      file: '/assets/wojak-layers/tattoos/tattoos_2_ak47.png?v=20260305a',
      name: 'AK47',
    });
    expect(TOPLESS_TATTOO_DETAIL_OPTIONS).toContainEqual({
      file: '/assets/wojak-layers/tattoos/tattoos_4_%24NECK.png?v=20260305a',
      name: '$NECK',
    });
    expect(TOPLESS_TATTOO_DETAIL_OPTIONS).toContainEqual({
      file: '/assets/wojak-layers/tattoos/tattoos_3_skull%202.png?v=20260305a',
      name: 'Skull 2',
    });
  });

  it('injects Topless into Clothes once and keeps the operation idempotent', () => {
    const baseManifest = {
      version: 1,
      collection: 'test',
      basePath: '/assets/test',
      categories: {
        Clothes: {
          layerName: 'Clothes',
          zIndex: 2,
          description: 'Clothes',
          traits: ['Clothes_Tank-top', 'Clothes_Tee'],
        },
      },
      traits: [
        { id: 'Clothes_Tank-top', name: 'Tank Top', category: 'Clothes', colorable: true },
        { id: 'Clothes_Tee', name: 'Tee', category: 'Clothes', colorable: true },
      ],
    };

    const first = augmentG2ManifestWithToplessTattoos(baseManifest);
    const second = augmentG2ManifestWithToplessTattoos(first);

    expect(first.categories.Clothes.traits).toEqual([
      'Clothes_Tank-top',
      TOPLESS_TATTOO_TRAIT_ID,
      'Clothes_Tee',
    ]);
    expect(first.traits.filter((trait) => trait.id === TOPLESS_TATTOO_TRAIT_ID)).toHaveLength(1);
    expect(second.categories.Clothes.traits.filter((traitId) => traitId === TOPLESS_TATTOO_TRAIT_ID)).toHaveLength(1);
    expect(second.traits.filter((trait) => trait.id === TOPLESS_TATTOO_TRAIT_ID)).toHaveLength(1);
  });
});
