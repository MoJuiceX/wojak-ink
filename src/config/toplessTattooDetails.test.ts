import { describe, expect, it } from 'vitest';

import {
  TOPLESS_TATTOO_DETAIL_OPTIONS,
  TOPLESS_TATTOO_OPTIONS_BY_SLOT,
  TOPLESS_TATTOO_SLOT_KEYS,
  TOPLESS_TATTOO_TRAIT_ID,
  augmentG2ManifestWithToplessTattoos,
  buildToplessTattooOptionPatch,
  createToplessTattooTrait,
  getResolvedToplessTattooDetails,
  getToplessTattooSelectedOption,
  getToplessTattooSlotKey,
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

  it('groups tattoo options into four independent slot buckets', () => {
    expect(TOPLESS_TATTOO_SLOT_KEYS).toEqual(['tattoo1', 'tattoo2', 'tattoo3', 'tattoo4']);
    expect(TOPLESS_TATTOO_OPTIONS_BY_SLOT.tattoo1).toHaveLength(14);
    expect(TOPLESS_TATTOO_OPTIONS_BY_SLOT.tattoo2).toHaveLength(10);
    expect(TOPLESS_TATTOO_OPTIONS_BY_SLOT.tattoo3).toHaveLength(8);
    expect(TOPLESS_TATTOO_OPTIONS_BY_SLOT.tattoo4).toHaveLength(3);
    expect(getToplessTattooSlotKey('/assets/wojak-layers/tattoos/tattoos_3_skull%202.png?v=20260305a')).toBe('tattoo3');
  });

  it('keeps one active selection per tattoo slot while migrating legacy single-detail state', () => {
    const legacyAnchor = '/assets/wojak-layers/tattoos/tattoos_1_anchor.png?v=20260305a';
    const slotTwoCrown = '/assets/wojak-layers/tattoos/tattoos_2_crown.png?v=20260305a';
    const patch = buildToplessTattooOptionPatch(
      { detail: legacyAnchor, tattoo2: slotTwoCrown },
      'tattoo4',
      '/assets/wojak-layers/tattoos/tattoos_4_sparrow.png?v=20260305a',
    );

    expect(patch).toEqual({
      detail: '',
      tattoo1: legacyAnchor,
      tattoo4: '/assets/wojak-layers/tattoos/tattoos_4_sparrow.png?v=20260305a',
    });

    expect(getToplessTattooSelectedOption({ detail: legacyAnchor }, 'tattoo1')).toBe(legacyAnchor);
    expect(getToplessTattooSelectedOption({ detail: legacyAnchor }, 'tattoo2')).toBeUndefined();
  });

  it('resolves selected tattoo slots into ordered detail layers', () => {
    expect(
      getResolvedToplessTattooDetails(
        {
          tattoo1: '/assets/wojak-layers/tattoos/tattoos_1_anchor.png?v=20260305a',
          tattoo3: '/assets/wojak-layers/tattoos/tattoos_3_turtle.png?v=20260305a',
          tattoo4: '/assets/wojak-layers/tattoos/tattoos_4_sparrow.png?v=20260305a',
        },
        'https://layers.wojak.ink/YourWojak-layers',
      ),
    ).toEqual([
      '/assets/wojak-layers/tattoos/tattoos_1_anchor.png?v=20260305a',
      '/assets/wojak-layers/tattoos/tattoos_3_turtle.png?v=20260305a',
      '/assets/wojak-layers/tattoos/tattoos_4_sparrow.png?v=20260305a',
    ]);
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
