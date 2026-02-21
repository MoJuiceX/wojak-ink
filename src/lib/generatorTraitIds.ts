/**
 * Known trait IDs for rules and layer builder.
 * Keeps layerRegistry free of domain/trait identity; single place for trait ID constants.
 * See docs/GENERATOR-CHECKLIST.md.
 */

export const KNOWN_TRAIT_IDS = {
  Clothes_Astronaut: 'Clothes_Astronaut',
  Clothes_ChiaFarmer: 'Clothes_Chia-farmer',
  Mask_Hannibal: 'Mask_Hannibal-Mask',
  Mask_Copium: 'Mask_Copium-mask',
  Mask_Bandana: 'Mask_Bandana-mask',
  MouthBase_Pipe: 'Mouth_Pipe',
  MouthBase_Pizza: 'g1_Pizza',
  MouthBase_BubbleGum: 'Mouth_BubbleGum',
  MouthBase_Vampire: 'g1_Drac',
  MouthItem_Cig: 'g1_EXTRA_MOUTH_Cig',
  MouthItem_Joint: 'g1_EXTRA_MOUTH_Joint',
  MouthItem_Cohiba: 'g1_EXTRA_MOUTH_Cohiba',
  Eyes_Tyson: 'Face-wear_Tyson-Tattoo',
  Eyes_NinjaTurtle: 'Face-wear_Ninja-Turtle-Mask',
  Eyes_EyePatch: 'Face-wear_Eye-patch',
  Eyes_NightVision: 'Face-wear_night-vision',
  Eyes_VRHeadset: 'Face-wear_VR-headset',
  Eyes_LaserEyes: 'Face-laser_Laser-Eyes',
  Head_FirefighterHelmet: 'Head_Firefigther-Helmet',
  Head_Ronin: 'Head_Ronin-helmet',
  Head_BeerHat: 'Head_Beer-Hat',
  Head_Cap: 'Head_Cap',
  Head_Centurion: 'Head_Centurion',
  Head_ConstructionHelmet: 'Head_Construction-Helmet',
  Head_HardHat: 'Head_Hard-hat',
  Head_PropellerHat: 'Head_Propeller-Hat',
  Head_SWATHelmet: 'Head_SWAT-helmet',
  Head_Spikes: 'Head_Spikes',
  Head_VikingHelmet: 'Head_viking-helmet',
  Head_StandardCut: 'Head_Standard-Cut',
  Head_TrumpWave: 'Head_Trump-wave',
  FullFaceMasks: ['skull_mask', 'skull-mask', 'hand_mask', 'hand-mask', 'medievalbepe', 'tanginium'],
} as const;

/** Bepe suit and Pepe suit: VR Headset cannot be selected (mutually exclusive). */
export const CLOTHES_NO_VR_HEADSET: readonly string[] = ['Clothes_Bepe-suit', 'Clothes_Pepe-suit'];

/** Full-body suits that include a helmet/hood — Head layer disabled when any of these is selected. */
export const CLOTHES_NO_HEAD_SUITS: readonly string[] = [
  KNOWN_TRAIT_IDS.Clothes_Astronaut,
  'Clothes_Bepe-suit',
  'Clothes_Pepe-suit',
  'Clothes_Goose-suit',
  'Clothes_Pickle-suit',
  'Clothes_Proof-of-prayer',
  'Clothes_Sonic-suit',
  'Clothes_gopher-suit',
];

/** Heads that can appear under Beer Hat. Default under layer is Cap. */
export const BEER_HAT_COMPATIBLE_HEADS: readonly string[] = [
  KNOWN_TRAIT_IDS.Head_Cap,
  KNOWN_TRAIT_IDS.Head_Centurion,
  KNOWN_TRAIT_IDS.Head_ConstructionHelmet,
  KNOWN_TRAIT_IDS.Head_PropellerHat,
  KNOWN_TRAIT_IDS.Head_SWATHelmet,
  KNOWN_TRAIT_IDS.Head_VikingHelmet,
];
