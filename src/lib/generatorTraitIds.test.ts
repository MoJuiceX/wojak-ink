import { describe, it, expect } from 'vitest';
import {
  KNOWN_TRAIT_IDS,
  CLOTHES_NO_VR_HEADSET,
  CLOTHES_NO_HEAD_SUITS,
  BEER_HAT_COMPATIBLE_HEADS,
} from './generatorTraitIds';

// ---------------------------------------------------------------------------
// KNOWN_TRAIT_IDS — regression tests for every constant value
// ---------------------------------------------------------------------------
describe('KNOWN_TRAIT_IDS — regression values', () => {
  it('Clothes_Astronaut has correct trait ID', () => {
    expect(KNOWN_TRAIT_IDS.Clothes_Astronaut).toBe('Clothes_Astronaut');
  });

  it('Clothes_ChiaFarmer has correct trait ID', () => {
    expect(KNOWN_TRAIT_IDS.Clothes_ChiaFarmer).toBe('Clothes_Chia-farmer');
  });

  it('Clothes_Topless has correct trait ID', () => {
    expect(KNOWN_TRAIT_IDS.Clothes_Topless).toBe('Clothes_Topless');
  });

  it('Mask_Hannibal has correct trait ID', () => {
    expect(KNOWN_TRAIT_IDS.Mask_Hannibal).toBe('Mask_Hannibal-Mask');
  });

  it('MouthBase_Pipe has correct trait ID', () => {
    expect(KNOWN_TRAIT_IDS.MouthBase_Pipe).toBe('Mouth_Pipe');
  });

  it('MouthBase_Pizza has correct trait ID (g1_ prefix)', () => {
    expect(KNOWN_TRAIT_IDS.MouthBase_Pizza).toBe('g1_Pizza');
  });

  it('MouthItem_Cig has correct trait ID', () => {
    expect(KNOWN_TRAIT_IDS.MouthItem_Cig).toBe('g1_EXTRA_MOUTH_Cig');
  });

  it('MouthItem_Joint has correct trait ID', () => {
    expect(KNOWN_TRAIT_IDS.MouthItem_Joint).toBe('g1_EXTRA_MOUTH_Joint');
  });

  it('MouthItem_Cohiba has correct trait ID', () => {
    expect(KNOWN_TRAIT_IDS.MouthItem_Cohiba).toBe('g1_EXTRA_MOUTH_Cohiba');
  });

  it('Eyes_Tyson has correct trait ID', () => {
    expect(KNOWN_TRAIT_IDS.Eyes_Tyson).toBe('Face-wear_Tyson-Tattoo');
  });

  it('Eyes_NinjaTurtle has correct trait ID', () => {
    expect(KNOWN_TRAIT_IDS.Eyes_NinjaTurtle).toBe('Face-wear_Ninja-Turtle-Mask');
  });

  it('Eyes_LaserEyes has correct trait ID', () => {
    expect(KNOWN_TRAIT_IDS.Eyes_LaserEyes).toBe('Face-laser_Laser-Eyes');
  });

  it('Head_FirefighterHelmet has correct (intentional) trait ID', () => {
    // Note the intentional "Firefigther" typo in the source data
    expect(KNOWN_TRAIT_IDS.Head_FirefighterHelmet).toBe('Head_Firefigther-Helmet');
  });

  it('Head_Ronin has correct trait ID', () => {
    expect(KNOWN_TRAIT_IDS.Head_Ronin).toBe('Head_Ronin-helmet');
  });

  it('Head_TrumpWave has correct trait ID', () => {
    expect(KNOWN_TRAIT_IDS.Head_TrumpWave).toBe('Head_Trump-wave');
  });

  it('FullFaceMasks contains all six expected mask IDs', () => {
    expect(KNOWN_TRAIT_IDS.FullFaceMasks).toEqual([
      'skull_mask',
      'skull-mask',
      'hand_mask',
      'hand-mask',
      'medievalbepe',
      'tanginium',
    ]);
  });
});

// ---------------------------------------------------------------------------
// CLOTHES_NO_VR_HEADSET — regression tests
// ---------------------------------------------------------------------------
describe('CLOTHES_NO_VR_HEADSET', () => {
  it('contains exactly two entries', () => {
    expect(CLOTHES_NO_VR_HEADSET).toHaveLength(2);
  });

  it('contains Bepe-suit', () => {
    expect(CLOTHES_NO_VR_HEADSET).toContain('Clothes_Bepe-suit');
  });

  it('contains Pepe-suit', () => {
    expect(CLOTHES_NO_VR_HEADSET).toContain('Clothes_Pepe-suit');
  });
});

// ---------------------------------------------------------------------------
// CLOTHES_NO_HEAD_SUITS — regression tests
// ---------------------------------------------------------------------------
describe('CLOTHES_NO_HEAD_SUITS', () => {
  it('contains Astronaut suit (via KNOWN_TRAIT_IDS)', () => {
    expect(CLOTHES_NO_HEAD_SUITS).toContain(KNOWN_TRAIT_IDS.Clothes_Astronaut);
  });

  it('contains Bepe-suit', () => {
    expect(CLOTHES_NO_HEAD_SUITS).toContain('Clothes_Bepe-suit');
  });

  it('contains Pepe-suit', () => {
    expect(CLOTHES_NO_HEAD_SUITS).toContain('Clothes_Pepe-suit');
  });

  it('contains Goose-suit', () => {
    expect(CLOTHES_NO_HEAD_SUITS).toContain('Clothes_Goose-suit');
  });

  it('contains Pickle-suit', () => {
    expect(CLOTHES_NO_HEAD_SUITS).toContain('Clothes_Pickle-suit');
  });

  it('contains Sonic-suit', () => {
    expect(CLOTHES_NO_HEAD_SUITS).toContain('Clothes_Sonic-suit');
  });

  it('contains gopher-suit', () => {
    expect(CLOTHES_NO_HEAD_SUITS).toContain('Clothes_gopher-suit');
  });

  it('has 8 entries in total', () => {
    expect(CLOTHES_NO_HEAD_SUITS).toHaveLength(8);
  });

  it('does NOT include Chia Farmer (not a full-body suit)', () => {
    expect(CLOTHES_NO_HEAD_SUITS).not.toContain(KNOWN_TRAIT_IDS.Clothes_ChiaFarmer);
  });
});

// ---------------------------------------------------------------------------
// BEER_HAT_COMPATIBLE_HEADS — regression tests
// ---------------------------------------------------------------------------
describe('BEER_HAT_COMPATIBLE_HEADS', () => {
  it('contains Cap (default under-layer)', () => {
    expect(BEER_HAT_COMPATIBLE_HEADS).toContain(KNOWN_TRAIT_IDS.Head_Cap);
  });

  it('contains Centurion', () => {
    expect(BEER_HAT_COMPATIBLE_HEADS).toContain(KNOWN_TRAIT_IDS.Head_Centurion);
  });

  it('contains Construction Helmet', () => {
    expect(BEER_HAT_COMPATIBLE_HEADS).toContain(KNOWN_TRAIT_IDS.Head_ConstructionHelmet);
  });

  it('contains Propeller Hat', () => {
    expect(BEER_HAT_COMPATIBLE_HEADS).toContain(KNOWN_TRAIT_IDS.Head_PropellerHat);
  });

  it('contains SWAT Helmet', () => {
    expect(BEER_HAT_COMPATIBLE_HEADS).toContain(KNOWN_TRAIT_IDS.Head_SWATHelmet);
  });

  it('contains Viking Helmet', () => {
    expect(BEER_HAT_COMPATIBLE_HEADS).toContain(KNOWN_TRAIT_IDS.Head_VikingHelmet);
  });

  it('has exactly 6 entries', () => {
    expect(BEER_HAT_COMPATIBLE_HEADS).toHaveLength(6);
  });

  it('does NOT include Beer Hat itself', () => {
    expect(BEER_HAT_COMPATIBLE_HEADS).not.toContain(KNOWN_TRAIT_IDS.Head_BeerHat);
  });
});
