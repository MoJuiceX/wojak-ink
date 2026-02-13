/**
 * Canvas renderer constants: z-index and layer-condition arrays.
 * Single place for draw order and path-based condition lists used by the layer builder.
 */

/** Mouth traits that render ON TOP of Centurion head */
export const MOUTH_OVER_CENTURION = ['stach', 'Pizza', 'Bubble-Gum', 'Pipe', 'Joint', 'Cohiba', 'Cig', 'Sick'];

/** Mouth traits that render ON TOP of Beer Hat (cans/straw) */
export const MOUTH_OVER_BEER_HAT = ['Cig', 'Joint', 'Cohiba'];

/** Masks that cover Ninja Turtle (require NinjaTurtleUnderMask virtual layer) */
export const NINJA_COVERING_MASKS = ['copium', 'hannibal', 'bandana'];

/** Full-face masks that render on top of everything (skull masks, fake it mask) */
export const FULL_FACE_MASKS = ['skull_mask', 'skull-mask', 'hand_mask', 'hand-mask', 'medievalbepe', 'tanginium'];

/** Heads that need EyesOverHead virtual layer (right half of eyes rendered above head) */
export const HEADS_NEEDING_EYES_OVERLAY = ['clown', 'pirate', 'ronin', 'supa', 'saiyan'];

/** Full-body suits that render on top of eyewear (path substrings for layer builder). */
export const SUITS_NEEDING_EYES_UNDER = [
  'gopher-suit',
  'sonic-suit',
  'proof-of-prayer',
  'pickle-suit',
  'goose-suit',
  'bepe-suit',
  'pepe-suit',
];

/** Base z-index values for each layer (including virtual layers).
 * Composite clothes (suits, Proof-of-prayer, etc.) draw under MouthBase and MouthItem so Pizza/Pipe show on top.
 * Sonic suit is regular Clothes (z 2), not composite. */
export const LAYER_Z_INDEX: Record<string, number> = {
  Background: 0,
  ClothesCompositeUnderBase: 0.9,
  Base: 1,
  Clothes: 2,
  ClothesComposite0: 2.1,  // composite layer0 (over base) — under MouthBase and MouthItem
  ClothesComposite1: 2.2,  // composite layer1 on top of layer0
  MaskUnderSuit: 1.4,      // bandana under EyesUnderSuit when suit is active
  EyesUnderSuit: 1.5,      // left 63% of eyes under suit (Gopher, Sonic, Proof of Prayer, etc.)
  FacialHairUnderSuit: 1.6, // left portion of neckbeard under suit (PoP, Gopher, Goose)
  ClothesAddon: 3,
  FacialHair: 4,
  MouthBase: 5,
  BubbleGumRekt: 5.1,
  MouthItem: 6,
  TysonTattoo: 6.5,
  NinjaTurtleUnderMask: 6.6,
  Mask: 7,
  EyePatchUnderHannibal: 8,
  HannibalMask: 9,
  Eyes: 10,
  EyesOverHannibal: 10.5,
  MaskUnderAstronaut: 10.8,
  Astronaut: 11,
  MaskOverAstronaut: 11.3,
  LaserEyesOverAstronaut: 11.5,
  BeerHatRightBehind: 0.5,   // right can/tube behind base and cap (draw before Base)
  BeerHatUnder: 11.9,  // head under Beer Hat (Cap, Viking, etc.)
  Head: 12,
  MouthOverBeerHat: 12.5,  // Cig, Joint, Cohiba drawn on top of Beer Hat
  BandanaMaskOverRonin: 13,
  EyesOverHead: 14,
  EyesOverStandardCut: 15,
  MaskOverStandardCut: 16,
  BubbleGumOverEyes: 60,
  FullFaceMask: 100,
};
