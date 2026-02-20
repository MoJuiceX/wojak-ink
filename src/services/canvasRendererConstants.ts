/**
 * Canvas renderer constants: z-index, layer-condition arrays, and clip-region presets.
 * Single place for draw order and path-based condition lists used by the layer builder.
 *
 * ## Clip System Overview
 *
 * When a suit (Gopher, Sonic, Proof of Prayer, etc.) overlaps eyes/masks, we split
 * the affected layer into two virtual layers:
 *   - `*UnderSuit` — the portion clipped to render BEHIND the suit
 *   - The original (or `*OverSuit`) — the portion that renders ON TOP
 *
 * clipLeftPercent / clipRightPercent define a vertical slice:
 *   - `clipLeftPercent: 0.37` hides the left 37%, showing only the right 63%
 *   - `clipRightPercent: 0.37` hides the right 37%, showing only the left 63%
 *
 * clipPolygon defines an arbitrary polygon mask (array of [x,y] normalized pairs).
 *
 * Per-combination values are inlined in canvasRendererLayerBuilder.ts with comments.
 */

/**
 * Common clip regions reused across multiple trait combinations.
 * Combination-specific values remain inline in canvasRendererLayerBuilder.ts.
 */
export const CLIP = {
  /** 50/50 split used by Hannibal mask + suit, Eye Patch + Hannibal, Pirate + Ninja Turtle */
  HALF: 0.5,
  /** Default suit split for eyes — left 37% under suit, right 63% over */
  SUIT_EYES_LEFT: 0.37,
  /** Default suit split complement (1 - 0.37) */
  SUIT_EYES_RIGHT: 0.63,
  /** Copium mask suit split */
  COPIUM_SUIT: 0.431,
  /** Ninja Turtle default clip under helmets */
  NINJA_DEFAULT: 0.25,
} as const;

/** Mouth traits that render ON TOP of Centurion head */
export const MOUTH_OVER_CENTURION = ['stach', 'Pizza', 'Bubble-Gum', 'Pipe', 'Joint', 'Cohiba', 'Cig', 'Sick'];

/** Mouth traits that render ON TOP of Beer Hat (cans/straw) */
export const MOUTH_OVER_BEER_HAT = ['Cig', 'Joint', 'Cohiba'];

/** Mouth traits that render ON TOP of Pirate Hat */
export const MOUTH_OVER_PIRATE = ['Cig', 'Joint', 'Cohiba'];

/** Masks that cover Ninja Turtle (require NinjaTurtleUnderMask virtual layer) */
export const NINJA_COVERING_MASKS = ['copium', 'hannibal', 'bandana'];

/** Full-face masks that render on top of everything (skull masks, fake it mask) */
export const FULL_FACE_MASKS = ['skull_mask', 'skull-mask', 'mask-skull', 'hand_mask', 'hand-mask', 'medievalbepe', 'tanginium'];

/** Heads that need EyesOverHead virtual layer (right half of eyes rendered above head) */
export const HEADS_NEEDING_EYES_OVERLAY = ['clown', 'pirate', 'ronin', 'supa', 'saiyan', 'tin-foil', 'beanie'];

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
  RektMouthOverlay: 1.1,     // Rekt base mouth detail overlay (Pipe-when-rekt, Bubble-Gum_rekt)
  Clothes: 2,
  ClothesComposite0: 2.1,  // composite layer0 (over base) — under MouthBase and MouthItem
  ClothesComposite1: 2.2,  // composite layer1 on top of layer0
  MaskUnderSuit: 1.4,      // bandana under EyesUnderSuit when suit is active
  EyesUnderSuit: 1.5,      // left 63% of eyes under suit (Gopher, Sonic, Proof of Prayer, etc.)
  FacialHairUnderSuit: 1.6, // left portion of neckbeard under suit (PoP, Gopher, Goose)
  CenturionUnder: 3.5,    // Centurion bottom-right quadrant under facial hair, mouth, mask, eyes
  ClothesAddon: 3,
  FacialHair: 4,
  MouthBaseOverNeckbeardGeneral: 4.3, // Mouth drawn above neckbeard in general cases
  MouthItemOverNeckbeardGeneral: 4.4, // MouthItem drawn above neckbeard in general cases
  MouthBase: 5,
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
  EyesUnderBeanie: 11.8,  // portion of eyes under Beanie (Night Vision, etc.)
  EyesUnderStandardCut: 11.85, // portion of eyes under Standard Cut heads (Trump Wave + Night Vision)
  Head: 12,
  BeerHatUnderDetailOver: 12.05, // Underlayer detail/logo drawn ON TOP of Beer Hat cans/outline
  BubbleGumOverHead: 12.1, // Bubble Gum re-drawn on top of Head traits
  MouthOverBeerHat: 12.5,  // Cig, Joint, Cohiba drawn on top of Beer Hat
  MouthOverPirateHead: 12.6,  // Cig, Joint, Cohiba drawn on top of Pirate Hat
  MouthBaseOverRonin: 12.7,  // MouthBase drawn on top of Ronin Helmet
  MouthItemOverRonin: 12.8,  // MouthItem drawn on top of Ronin Helmet
  BandanaMaskOverRonin: 13,
  HannibalMaskOverRonin: 13.1, // right 50% of Hannibal mask over Ronin Helmet
  CopiumMaskOverRonin: 13.2, // right 50% of Copium mask over Ronin Helmet
  NeckbeardOverRonin: 13.5, // right 50% of neckbeard over Ronin Helmet
  MouthBaseOverNeckbeard: 13.6, // MouthBase re-drawn on top of NeckbeardOverRonin
  MouthItemOverNeckbeard: 13.7, // MouthItem re-drawn on top of NeckbeardOverRonin
  CopiumMaskOverMouthAndNeckbeard: 13.8, // Copium mask on top of mouth + neckbeard (Ronin combo)
  EyesOverHead: 14,
  EyesOverStandardCut: 15,
  MaskOverStandardCut: 16,
  MogGlassesOverCopium: 17,      // MOG Glasses always above Copium Mask
  TrumpHairOverAll: 18,          // Trump Hair on top when combined with MOG + Copium
  BubbleGumOverEyes: 60,
  LaserEyesOverBubbleGum: 61, // Laser Eyes re-drawn on top of BubbleGum
  FullFaceMask: 100,
};
