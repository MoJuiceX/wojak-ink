/**
 * Wojak Generator Rules Engine
 *
 * Enforces valid layer combinations and auto-corrects invalid states.
 * Uses SelectionResolver (getTraitId / getPath) only — no pathContains for trait identity.
 * Ported from wojak-ink-mobile/src/utils/wojakRules.js
 */

import type { GeneratorLayerName } from './memeLayers';
import type { UILayerName } from '@/lib/layerRegistry';
import { DEFAULT_BASE_PATH, DEFAULT_MOUTHBASE_PATH, DEFAULT_CLOTHES_PATH } from '@/lib/layerRegistry';
import { UI_ORDER } from '@/lib/layerRegistry';
import type { SelectionResolver } from '@/lib/selectionResolver';
import { KNOWN_TRAIT_IDS, CLOTHES_NO_HEAD_SUITS } from '@/lib/generatorTraitIds';
import { pathContains } from '@/lib/pathHelpers';
import { isSelectionPathEmpty } from '@/types/generator';

export type SelectedLayers = Partial<Record<GeneratorLayerName, string>>;

// Re-export for consumers
export type { UILayerName } from '@/lib/layerRegistry';

export interface RuleResult {
  disabledLayers: UILayerName[];
  reason?: string;
  clearSelections?: UILayerName[];
  forceSelections?: Partial<Record<UILayerName, string>>;
  disabledOptions?: Partial<Record<UILayerName, string[]>>;
  /** Reasons for specific disabled options: { LayerName: { OptionName: "reason" } } */
  disabledOptionReasons?: Partial<Record<UILayerName, Record<string, string>>>;
}

export interface DisabledLayersResult {
  disabledLayers: UILayerName[];
  reasons: Record<string, string>;
  clearSelections: UILayerName[];
  forceSelections: Partial<Record<UILayerName, string>>;
  disabledOptions: Partial<Record<UILayerName, Set<string>>>;
  /** Reasons for specific disabled options: { LayerName: { OptionName: "reason" } } */
  disabledOptionReasons: Partial<Record<UILayerName, Record<string, string>>>;
}

/** Build a disabled-reasons map from an array of option names and a single reason string. */
function buildDisabledReasons(options: string[], reason: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const opt of options) result[opt] = reason;
  return result;
}

// ============ Rules (all use resolver only for trait identity) ============

/**
 * Base must never be None - auto-default to Classic
 */
function ruleBaseNeverNone(resolver: SelectionResolver): RuleResult {
  const basePath = resolver.getPath('Base');
  const isBaseEmpty = isSelectionPathEmpty(basePath);

  let hasAnyOtherTrait = false;
  for (const layer of UI_ORDER) {
    if (layer === 'Base') continue;
    if (resolver.getPath(layer)) {
      hasAnyOtherTrait = true;
      break;
    }
  }

  if (isBaseEmpty && hasAnyOtherTrait) {
    return {
      disabledLayers: [],
      forceSelections: {
        Base: DEFAULT_BASE_PATH,
      },
    };
  }

  return { disabledLayers: [] };
}

/**
 * MouthBase must never be None - auto-default to Numb
 */
function ruleMouthBaseNeverNone(resolver: SelectionResolver): RuleResult {
  const mouthBasePath = resolver.getPath('MouthBase');
  const isMouthBaseEmpty = isSelectionPathEmpty(mouthBasePath);

  if (isMouthBaseEmpty) {
    return {
      disabledLayers: [],
      forceSelections: {
        MouthBase: DEFAULT_MOUTHBASE_PATH,
      },
    };
  }

  return { disabledLayers: [] };
}

/**
 * Clothes must never be None - auto-default to Tee blue
 */
function ruleClothesNeverNone(resolver: SelectionResolver): RuleResult {
  const clothesPath = resolver.getPath('Clothes');
  const isClothesEmpty = isSelectionPathEmpty(clothesPath);

  if (isClothesEmpty) {
    return {
      disabledLayers: [],
      forceSelections: {
        Clothes: DEFAULT_CLOTHES_PATH,
      },
    };
  }

  return { disabledLayers: [] };
}

/**
 * Full-body suits (Astronaut, Bepe suit, Pepe suit, Goose suit, Pickle suit,
 * Proof of Prayer, Sonic suit, Gopher suit) include a helmet/hood — Head layer disabled.
 */
function ruleFullBodySuitNoHead(resolver: SelectionResolver): RuleResult {
  const clothesTraitId = resolver.getTraitId('Clothes');
  const hasNoHeadSuit = clothesTraitId !== null && CLOTHES_NO_HEAD_SUITS.includes(clothesTraitId);
  const headPath = resolver.getPath('Head');
  const hasHead = !isSelectionPathEmpty(headPath);

  if (hasNoHeadSuit) {
    return {
      disabledLayers: ['Head'],
      reason: 'Suit includes helmet',
      clearSelections: hasHead ? ['Head'] : [],
      forceSelections: hasHead ? { Head: '' } : {},
    };
  }

  return { disabledLayers: [] };
}

/**
 * Astronaut disables MouthItem traits (Cig, Joint, Cohiba) and some MouthBase options
 * Allowed MouthBase: Gold teeth, teeth, Numb, screaming, smiling
 * Disabled MouthBase: Pipe, Pizza, Bubble-Gum
 */
function ruleAstronautDisablesMouthOptions(resolver: SelectionResolver): RuleResult {
  const hasAstronaut = resolver.getTraitId('Clothes') === KNOWN_TRAIT_IDS.Clothes_Astronaut;
  if (!hasAstronaut) return { disabledLayers: [] };

  const mouthBaseTraitId = resolver.getTraitId('MouthBase');
  const disabledMouthTraitIds = [
    KNOWN_TRAIT_IDS.MouthBase_Pipe,
    KNOWN_TRAIT_IDS.MouthBase_Pizza,
    KNOWN_TRAIT_IDS.MouthBase_BubbleGum,
  ];
  const hasDisabledMouth = mouthBaseTraitId !== null && disabledMouthTraitIds.includes(mouthBaseTraitId as typeof disabledMouthTraitIds[number]);
  const disabledMouthOptions = ['Pipe', 'Pizza', 'Bubble-Gum', 'Bubble Gum'];

  const result: RuleResult = {
    disabledLayers: ['MouthItem'],
    reason: 'Deselect Astronaut',
    forceSelections: { MouthItem: '' },
    clearSelections: ['MouthItem'],
    disabledOptions: {
      MouthBase: disabledMouthOptions,
    },
  };

  if (hasDisabledMouth) {
    result.forceSelections = {
      ...result.forceSelections,
      MouthBase: DEFAULT_MOUTHBASE_PATH,
    };
  }

  return result;
}


/**
 * FacialHair requires compatible MouthBase (path check for allowed mouths; no trait IDs for all variants).
 * Vampire (drac) is allowed with Stache but not with Neckbeard (handled by ruleVampireDisablesNeckbeard).
 */
function ruleFacialHairRequiresMouthBase(resolver: SelectionResolver): RuleResult {
  const mouthBasePath = resolver.getPath('MouthBase');
  const facialHairPath = resolver.getPath('FacialHair');

  const allowedMouthBases = ['numb', 'teeth', 'gold', 'smile', 'screeming', 'screaming', 'pizza', 'pipe', 'drac'];

  if (mouthBasePath && mouthBasePath !== '') {
    const isAllowed = allowedMouthBases.some((allowed) => pathContains(mouthBasePath, allowed));
    if (!isAllowed && facialHairPath) {
      return {
        disabledLayers: ['FacialHair'],
        reason: 'Select compatible mouth',
        clearSelections: ['FacialHair'],
      };
    }
  }

  if (facialHairPath) {
    const hasAllowedMouthBase =
      mouthBasePath &&
      mouthBasePath !== '' &&
      allowedMouthBases.some((allowed) => pathContains(mouthBasePath, allowed));

    if (!hasAllowedMouthBase) {
      return {
        disabledLayers: [],
        reason: 'Select mouth first',
        forceSelections: {
          MouthBase: DEFAULT_MOUTHBASE_PATH,
        },
      };
    }
  }

  return { disabledLayers: [] };
}

/**
 * Mask blocks MouthItem and FacialHair (except Copium: Copium can combine with Neckbeard/Stache; mask draws on top).
 */
function ruleMaskBlocksOtherLayers(resolver: SelectionResolver): RuleResult {
  const maskPath = resolver.getPath('Mask');

  if (!isSelectionPathEmpty(maskPath)) {
    const path = maskPath ?? '';
    const isCopium = path.toLowerCase().includes('copium');
    return {
      disabledLayers: isCopium ? ['MouthItem'] : ['MouthItem', 'FacialHair'],
      reason: 'Deselect Mask',
    };
  }

  return { disabledLayers: [] };
}

/**
 * Hannibal Mask auto-removes Neckbeard and Stache (they render on top of the mask)
 */
function ruleHannibalMaskRemovesFacialHair(resolver: SelectionResolver): RuleResult {
  const maskPath = resolver.getPath('Mask');
  const hasHannibal = !!maskPath && maskPath.toLowerCase().includes('hannibal');
  const facialHairPath = resolver.getPath('FacialHair');
  const hasNeckbeard = pathContains(facialHairPath, 'neckbeard');
  const hasStache = pathContains(facialHairPath, 'stach');

  if (hasHannibal && (hasNeckbeard || hasStache)) {
    return {
      disabledLayers: ['FacialHair'],
      reason: 'Deselect Hannibal Mask',
      clearSelections: ['FacialHair'],
      forceSelections: { FacialHair: '' },
    };
  }

  if (hasHannibal) {
    return {
      disabledLayers: ['FacialHair'],
      reason: 'Deselect Hannibal Mask',
      disabledOptions: {
        FacialHair: ['Neckbeard', 'neckbeard', 'Stache', 'stach'],
      },
    };
  }

  return { disabledLayers: [] };
}

/**
 * Bandana Mask auto-removes Neckbeard (neckbeard renders incorrectly over bandana)
 */
function ruleBandanaMaskRemovesNeckbeard(resolver: SelectionResolver): RuleResult {
  const maskPath = resolver.getPath('Mask');
  const hasBandana = !!maskPath && maskPath.toLowerCase().includes('bandana');
  const facialHairPath = resolver.getPath('FacialHair');
  const hasNeckbeard = pathContains(facialHairPath, 'neckbeard');

  if (hasBandana && hasNeckbeard) {
    return {
      disabledLayers: [],
      reason: 'Deselect Bandana Mask',
      clearSelections: ['FacialHair'],
      forceSelections: { FacialHair: '' },
      disabledOptions: { FacialHair: ['Neckbeard', 'neckbeard'] },
      disabledOptionReasons: { FacialHair: { Neckbeard: 'Remove Bandana Mask', neckbeard: 'Remove Bandana Mask' } },
    };
  }

  if (hasBandana) {
    return {
      disabledLayers: [],
      disabledOptions: { FacialHair: ['Neckbeard', 'neckbeard'] },
      disabledOptionReasons: { FacialHair: { Neckbeard: 'Remove Bandana Mask', neckbeard: 'Remove Bandana Mask' } },
    };
  }

  return { disabledLayers: [] };
}

/**
 * Copium Mask forces valid MouthBase and disables MouthItem
 * - Blocks: Pizza, Bubble Gum, Pipe (MouthBase)
 * - Blocks: All MouthItem (Cigarette, Cohiba, Joint)
 */
function ruleCopiumMaskForcesValidMouthBase(resolver: SelectionResolver): RuleResult {
  const copiumPath = resolver.getPath('Mask');
  if (!copiumPath || !copiumPath.toLowerCase().includes('copium')) return { disabledLayers: [] };

  const mouthBasePath = resolver.getPath('MouthBase');
  const mouthItemPath = resolver.getPath('MouthItem');

  const mouthBaseTraitId = resolver.getTraitId('MouthBase');
  const isPizza = mouthBaseTraitId === KNOWN_TRAIT_IDS.MouthBase_Pizza;
  const isBubbleGum = mouthBaseTraitId === KNOWN_TRAIT_IDS.MouthBase_BubbleGum;
  const isPipe = mouthBaseTraitId === KNOWN_TRAIT_IDS.MouthBase_Pipe;
  const isEmpty = isSelectionPathEmpty(mouthBasePath);
  const hasMouthItem = !isSelectionPathEmpty(mouthItemPath);

  const blockedMouthBase = ['Pizza', 'Bubble-Gum', 'Bubble Gum', 'Pipe'];
  const disabledOptionReasonsMouthBase = {
    Pizza: 'Remove Copium Mask',
    'Bubble-Gum': 'Remove Copium Mask',
    'Bubble Gum': 'Remove Copium Mask',
    Pipe: 'Remove Copium Mask',
  };

  if (isPizza || isBubbleGum || isPipe || isEmpty) {
    return {
      disabledLayers: ['MouthItem'],
      reason: 'Remove Copium Mask',
      forceSelections: {
        MouthBase: DEFAULT_MOUTHBASE_PATH,
        MouthItem: '',
      },
      clearSelections: ['MouthItem'],
      disabledOptions: { MouthBase: blockedMouthBase },
      disabledOptionReasons: { MouthBase: disabledOptionReasonsMouthBase },
    };
  }

  if (hasMouthItem) {
    return {
      disabledLayers: ['MouthItem'],
      reason: 'Remove Copium Mask',
      forceSelections: { MouthItem: '' },
      clearSelections: ['MouthItem'],
      disabledOptions: { MouthBase: blockedMouthBase },
      disabledOptionReasons: { MouthBase: disabledOptionReasonsMouthBase },
    };
  }

  return {
    disabledLayers: ['MouthItem'],
    disabledOptions: { MouthBase: blockedMouthBase },
    disabledOptionReasons: { MouthBase: disabledOptionReasonsMouthBase },
  };
}

/**
 * Mask forces MouthBase to Numb (except Copium which has its own rule).
 * - Hannibal Mask: only Numb is allowed; all other mouths forced to Numb.
 * - Bandana Mask: Numb, Gold Teeth, Teeth, Smile, Screaming are allowed.
 */
function ruleMaskForcesNumbMouth(resolver: SelectionResolver): RuleResult {
  const maskPath = resolver.getPath('Mask');
  const hasMask = !isSelectionPathEmpty(maskPath);
  if (!hasMask || !maskPath || maskPath.toLowerCase().includes('copium')) return { disabledLayers: [] };

  const maskLower = maskPath.toLowerCase();
  const isHannibalMask = maskLower.includes('hannibal');

  const mouthBasePath = resolver.getPath('MouthBase');
  const isNumb = !!mouthBasePath && mouthBasePath.toLowerCase().includes('numb');

  const blockedMouthBase = ['Pizza', 'Bubble-Gum', 'Bubble Gum', 'Pipe', 'BubbleGum'];
  const blockedReasons = buildDisabledReasons(blockedMouthBase, 'Remove Mask');

  // Hannibal: only Numb allowed — force to Numb and block everything else
  if (isHannibalMask) {
    const allBlockedMouth = [...blockedMouthBase, 'Gold Teeth', 'Gold-Teeth', 'Teeth', 'Smile', 'Screaming', 'Screeming'];
    const allBlockedReasons = buildDisabledReasons(allBlockedMouth, 'Remove Hannibal Mask');

    if (!isNumb) {
      return {
        disabledLayers: [],
        reason: 'Deselect Hannibal Mask',
        forceSelections: { MouthBase: DEFAULT_MOUTHBASE_PATH, MouthItem: '' },
        disabledOptions: { MouthBase: allBlockedMouth },
        disabledOptionReasons: { MouthBase: allBlockedReasons },
      };
    }
    return {
      disabledLayers: [],
      forceSelections: { MouthItem: '' },
      disabledOptions: { MouthBase: allBlockedMouth },
      disabledOptionReasons: { MouthBase: allBlockedReasons },
    };
  }

  // Bandana / other masks: allow Numb, Gold Teeth, Teeth, Smile, Screaming
  const allowedWithMask = ['numb', 'gold-teeth', 'teeth', 'smile', 'screeming'];
  const hasAllowedMouth = !!mouthBasePath && allowedWithMask.some((m) => mouthBasePath.toLowerCase().includes(m));

  if (!hasAllowedMouth) {
    return {
      disabledLayers: [],
      reason: 'Deselect Mask',
      forceSelections: { MouthBase: DEFAULT_MOUTHBASE_PATH, MouthItem: '' },
      disabledOptions: { MouthBase: blockedMouthBase },
      disabledOptionReasons: { MouthBase: blockedReasons },
    };
  }

  return {
    disabledLayers: [],
    forceSelections: { MouthItem: '' },
    disabledOptions: { MouthBase: blockedMouthBase },
    disabledOptionReasons: { MouthBase: blockedReasons },
  };
}

/**
 * Pipe disables MouthItem
 */
function rulePipeDisablesMouthItem(resolver: SelectionResolver): RuleResult {
  if (resolver.getTraitId('MouthBase') !== KNOWN_TRAIT_IDS.MouthBase_Pipe) return { disabledLayers: [] };

  return {
    disabledLayers: ['MouthItem'],
    reason: 'Deselect Pipe',
    clearSelections: ['MouthItem'],
  };
}

/**
 * Vampire (Drac) mouth cannot appear with Cig, Cohiba, or Joint.
 * When Vampire is selected, MouthItem is disabled and any cig/joint/cohiba selection is cleared.
 */
function ruleVampireDisablesCigJointCohiba(resolver: SelectionResolver): RuleResult {
  if (resolver.getTraitId('MouthBase') !== KNOWN_TRAIT_IDS.MouthBase_Vampire) return { disabledLayers: [] };

  const mouthItemTraitId = resolver.getTraitId('MouthItem');
  const hasSmokeItem =
    mouthItemTraitId === KNOWN_TRAIT_IDS.MouthItem_Cig ||
    mouthItemTraitId === KNOWN_TRAIT_IDS.MouthItem_Joint ||
    mouthItemTraitId === KNOWN_TRAIT_IDS.MouthItem_Cohiba;

  return {
    disabledLayers: ['MouthItem'],
    reason: 'Vampire cannot have cig, cohiba, or joint',
    clearSelections: hasSmokeItem ? ['MouthItem'] : [],
    forceSelections: hasSmokeItem ? { MouthItem: '' } : {},
    disabledOptions: {
      MouthItem: ['Cig', 'Cohiba', 'Joint'],
    },
    disabledOptionReasons: {
      MouthItem: {
        Cig: 'Not available with Vampire Teeth',
        Cohiba: 'Not available with Vampire Teeth',
        Joint: 'Not available with Vampire Teeth',
      },
    },
  };
}

/**
 * Vampire (Drac) mouth cannot appear with Neckbeard; Stache is allowed.
 * When Vampire is selected, only Neckbeard is disabled (greyed out immediately).
 */
function ruleVampireDisablesNeckbeard(resolver: SelectionResolver): RuleResult {
  if (resolver.getTraitId('MouthBase') !== KNOWN_TRAIT_IDS.MouthBase_Vampire) return { disabledLayers: [] };

  const facialHairPath = resolver.getPath('FacialHair');
  const hasNeckbeard = pathContains(facialHairPath, 'neckbeard');

  const disabledNeckbeardOptions = ['Neckbeard', 'neckbeard'];
  const reason = 'Not available with Vampire Teeth';

  if (hasNeckbeard) {
    return {
      disabledLayers: [],
      clearSelections: ['FacialHair'],
      forceSelections: { FacialHair: '' },
      disabledOptions: { FacialHair: disabledNeckbeardOptions },
      disabledOptionReasons: {
        FacialHair: { Neckbeard: reason, neckbeard: reason },
      },
    };
  }

  return {
    disabledLayers: [],
    disabledOptions: { FacialHair: disabledNeckbeardOptions },
    disabledOptionReasons: {
      FacialHair: { Neckbeard: reason, neckbeard: reason },
    },
  };
}

/**
 * Cig/Joint/Cohiba requires MouthBase
 */
function ruleCigJointCohibaRequiresMouthBase(resolver: SelectionResolver): RuleResult {
  const mouthItemTraitId = resolver.getTraitId('MouthItem');
  const needsMouthBase =
    mouthItemTraitId === KNOWN_TRAIT_IDS.MouthItem_Cig ||
    mouthItemTraitId === KNOWN_TRAIT_IDS.MouthItem_Joint ||
    mouthItemTraitId === KNOWN_TRAIT_IDS.MouthItem_Cohiba;

  if (!needsMouthBase) return { disabledLayers: [] };

  const mouthBasePath = resolver.getPath('MouthBase');
  const isMouthBaseNone = isSelectionPathEmpty(mouthBasePath);

  if (isMouthBaseNone) {
    return {
      disabledLayers: [],
      reason: 'Select mouth first',
      forceSelections: {
        MouthBase: DEFAULT_MOUTHBASE_PATH,
      },
    };
  }

  return { disabledLayers: [] };
}

/**
 * Pizza disables MouthItem
 */
function rulePizzaDisablesMouthItem(resolver: SelectionResolver): RuleResult {
  if (resolver.getTraitId('MouthBase') !== KNOWN_TRAIT_IDS.MouthBase_Pizza) return { disabledLayers: [] };

  return {
    disabledLayers: ['MouthItem'],
    reason: 'Deselect Pizza',
    clearSelections: ['MouthItem'],
  };
}

/**
 * Bubble Gum disables MouthItem
 */
function ruleBubbleGumDisablesMouthItem(resolver: SelectionResolver): RuleResult {
  if (resolver.getTraitId('MouthBase') !== KNOWN_TRAIT_IDS.MouthBase_BubbleGum) return { disabledLayers: [] };

  return {
    disabledLayers: ['MouthItem'],
    reason: 'Deselect Bubble Gum',
    clearSelections: ['MouthItem'],
  };
}

/**
 * Bubble Gum disables FacialHair (Neckbeard, Stache)
 */
function ruleBubbleGumDisablesFacialHair(resolver: SelectionResolver): RuleResult {
  if (resolver.getTraitId('MouthBase') !== KNOWN_TRAIT_IDS.MouthBase_BubbleGum) return { disabledLayers: [] };

  return {
    disabledLayers: ['FacialHair'],
    reason: 'Deselect Bubble Gum',
    clearSelections: ['FacialHair'],
  };
}


/**
 * Sonic suit, Pickle suit, and Goose suit: Bandana mask cannot be selected.
 */
const CLOTHES_NO_BANDANA = ['Clothes_Sonic-suit', 'Clothes_Pickle-suit', 'Clothes_Goose-suit'];

function ruleSuitDisablesBandana(resolver: SelectionResolver): RuleResult {
  const clothesId = resolver.getTraitId('Clothes');
  const hasSuit = clothesId !== null && CLOTHES_NO_BANDANA.includes(clothesId);
  const bandanaPath = resolver.getPath('Mask');
  const hasBandana = !!bandanaPath && bandanaPath.toLowerCase().includes('bandana');

  if (hasSuit && hasBandana) {
    return {
      disabledLayers: [],
      forceSelections: { Mask: '' },
      clearSelections: ['Mask'],
    };
  }
  if (hasSuit) {
    const disabledMaskOptions = ['Bandana-mask', 'Bandana mask', 'Bandana'];
    const disabledMaskReasons = buildDisabledReasons(disabledMaskOptions, 'Not available with this suit');
    return {
      disabledLayers: [],
      disabledOptions: { Mask: disabledMaskOptions },
      disabledOptionReasons: { Mask: disabledMaskReasons },
    };
  }

  return { disabledLayers: [] };
}

/**
 * Sonic suit, Pickle suit, and Goose suit are mutually exclusive with Hannibal mask.
 */
const CLOTHES_NO_HANNIBAL = ['Clothes_Sonic-suit', 'Clothes_Pickle-suit', 'Clothes_Goose-suit'];

function ruleSuitDisablesHannibal(resolver: SelectionResolver): RuleResult {
  const clothesId = resolver.getTraitId('Clothes');
  const maskPath = resolver.getPath('Mask');
  const hasSuit = clothesId !== null && CLOTHES_NO_HANNIBAL.includes(clothesId);
  const isHannibal = !!maskPath && maskPath.toLowerCase().includes('hannibal');

  if (hasSuit && isHannibal) {
    return {
      disabledLayers: [],
      forceSelections: { Mask: '' },
      clearSelections: ['Mask'],
    };
  }
  if (hasSuit) {
    const disabledMaskOptions = ['Hannibal-Mask', 'Hannibal mask', 'Hannibal'];
    const disabledMaskReasons = buildDisabledReasons(disabledMaskOptions, 'Not available with this suit');
    return {
      disabledLayers: [],
      disabledOptions: { Mask: disabledMaskOptions },
      disabledOptionReasons: { Mask: disabledMaskReasons },
    };
  }
  if (isHannibal) {
    const disabledClothesOptions = ['Sonic-suit', 'Sonic suit', 'Sonic', 'Pickle-suit', 'Pickle suit', 'Pickle', 'Goose-suit', 'Goose suit', 'Goose'];
    const disabledClothesReasons = buildDisabledReasons(disabledClothesOptions, 'Not available with Hannibal mask');
    return {
      disabledLayers: [],
      disabledOptions: { Clothes: disabledClothesOptions },
      disabledOptionReasons: { Clothes: disabledClothesReasons },
    };
  }

  return { disabledLayers: [] };
}


/**
 * Legacy ClothesAddon (G1) required Tee or Tanktop. G2 Chia Farmer is selectable as Clothes
 * and chooses Tee or Tank top as under-layer in the panel — no force/disable.
 */
function ruleClothesAddonRequiresTeeOrTanktop(resolver: SelectionResolver): RuleResult {
  const clothesPath = resolver.getPath('Clothes');
  const clothesAddonPath = resolver.getPath('ClothesAddon');

  const hasChiaFarmerAddon =
    clothesAddonPath && (pathContains(clothesAddonPath, 'Chia-Farmer') || pathContains(clothesAddonPath, 'Chia Farmer'));

  const isTeeOrTanktop =
    clothesPath &&
    (pathContains(clothesPath, 'Tee') || pathContains(clothesPath, 'Tank-Top') || pathContains(clothesPath, 'tank-top')) &&
    !pathContains(clothesPath, 'Chia-Farmer');

  // Only force when legacy addon exists and no tee/tank — never when user selected G2 Chia Farmer
  if (hasChiaFarmerAddon && !isTeeOrTanktop) {
    return {
      disabledLayers: [],
      forceSelections: {
        Clothes: DEFAULT_CLOTHES_PATH,
      },
    };
  }

  return { disabledLayers: [] };
}

/**
 * Sonic suit and Pickle suit cannot have Neckbeard (mutual exclusion).
 */
const CLOTHES_NO_NECKBEARD = ['Clothes_Sonic-suit', 'Clothes_Pickle-suit'];
function ruleSuitDisablesNeckbeard(resolver: SelectionResolver): RuleResult {
  const clothesId = resolver.getTraitId('Clothes');
  const hasSuit = clothesId !== null && CLOTHES_NO_NECKBEARD.includes(clothesId);
  const facialHairPath = resolver.getPath('FacialHair');
  const hasNeckbeard = pathContains(facialHairPath, 'neckbeard');

  if (hasSuit && hasNeckbeard) {
    return {
      disabledLayers: [],
      forceSelections: { FacialHair: '' },
      clearSelections: ['FacialHair'],
      disabledOptions: { FacialHair: ['Neckbeard', 'neckbeard'] },
      disabledOptionReasons: { FacialHair: { Neckbeard: 'Not available with this suit', neckbeard: 'Not available with this suit' } },
    };
  }
  if (hasSuit) {
    return {
      disabledLayers: [],
      disabledOptions: { FacialHair: ['Neckbeard', 'neckbeard'] },
      disabledOptionReasons: { FacialHair: { Neckbeard: 'Not available with this suit', neckbeard: 'Not available with this suit' } },
    };
  }
  if (hasNeckbeard) {
    const disabledClothesOptions = ['Sonic-suit', 'Sonic suit', 'Sonic', 'Pickle-suit', 'Pickle suit', 'Pickle'];
    const disabledClothesReasons = buildDisabledReasons(disabledClothesOptions, 'Remove Neckbeard');
    return {
      disabledLayers: [],
      disabledOptions: { Clothes: disabledClothesOptions },
      disabledOptionReasons: { Clothes: disabledClothesReasons },
    };
  }

  return { disabledLayers: [] };
}


/**
 * Straitjacket disables all hand extras (hands are tied).
 * Wings remain selectable. Grays out hand items in Extras tab.
 * Also disables Hand Mask (full face mask) since it implies free hands.
 */
const STRAITJACKET_DISABLED_EXTRAS = [
  'Coffee', 'Diamond', 'GFY Left', 'GFY Right', 'Goose',
  'Handgun', 'Seedling', 'Orange', 'TangTalk',
  'Hand Mask',
];

function ruleStraightJacketDisablesHandExtras(resolver: SelectionResolver): RuleResult {
  const clothesId = resolver.getTraitId('Clothes');
  if (clothesId !== KNOWN_TRAIT_IDS.Clothes_StraightJacket) {
    return { disabledLayers: [] };
  }

  const reason = 'Deselect Straitjacket';
  const result: RuleResult = {
    disabledLayers: [],
    disabledOptions: { Mask: STRAITJACKET_DISABLED_EXTRAS },
    disabledOptionReasons: { Mask: buildDisabledReasons(STRAITJACKET_DISABLED_EXTRAS, reason) },
  };

  // If Hand Mask is currently selected, clear it (it's in the Mask slot, not Extra slots)
  const maskPath = resolver.getPath('Mask');
  if (maskPath && (pathContains(maskPath, 'hand_mask') || pathContains(maskPath, 'hand-mask'))) {
    result.clearSelections = ['Mask'];
    result.forceSelections = { Mask: '' };
  }

  return result;
}

// ============ Rules Array ============

const RULES = [
  ruleBaseNeverNone,
  ruleMouthBaseNeverNone,
  ruleClothesNeverNone,
  ruleCopiumMaskForcesValidMouthBase,
  ruleMaskForcesNumbMouth,
  rulePipeDisablesMouthItem,
  ruleVampireDisablesCigJointCohiba,
  ruleVampireDisablesNeckbeard,
  ruleCigJointCohibaRequiresMouthBase,
  rulePizzaDisablesMouthItem,
  ruleBubbleGumDisablesMouthItem,
  ruleBubbleGumDisablesFacialHair,
  ruleAstronautDisablesMouthOptions,
  ruleSuitDisablesBandana,
  ruleSuitDisablesHannibal,
  ruleFullBodySuitNoHead,
  ruleFacialHairRequiresMouthBase,
  ruleMaskBlocksOtherLayers,
  ruleHannibalMaskRemovesFacialHair,
  ruleBandanaMaskRemovesNeckbeard,
  ruleClothesAddonRequiresTeeOrTanktop,
  ruleSuitDisablesNeckbeard,
  ruleStraightJacketDisablesHandExtras,
];

// ============ Public API ============

/**
 * Get all disabled layers based on current selections.
 * Uses SelectionResolver so rules rely on trait IDs and paths from a single source.
 */
export function getDisabledLayers(resolver: SelectionResolver): DisabledLayersResult {
  const disabledSet = new Set<UILayerName>();
  const reasons: Record<string, string> = {};
  const clearSet = new Set<UILayerName>();
  const forceSelections: Partial<Record<UILayerName, string>> = {};
  const disabledOptions: Partial<Record<UILayerName, Set<string>>> = {};
  const disabledOptionReasons: Partial<Record<UILayerName, Record<string, string>>> = {};

  for (const rule of RULES) {
    const result = rule(resolver);

    if (result.disabledLayers && result.disabledLayers.length > 0) {
      result.disabledLayers.forEach((layerName) => {
        disabledSet.add(layerName);
        if (result.reason) {
          reasons[layerName] = result.reason;
        }
      });
    }

    if (result.clearSelections && result.clearSelections.length > 0) {
      result.clearSelections.forEach((layerName) => clearSet.add(layerName));
    }

    if (result.forceSelections) {
      Object.assign(forceSelections, result.forceSelections);
    }

    if (result.disabledOptions) {
      Object.keys(result.disabledOptions).forEach((layerName) => {
        const key = layerName as UILayerName;
        if (!disabledOptions[key]) {
          disabledOptions[key] = new Set();
        }
        const newOptions = result.disabledOptions![key];
        if (Array.isArray(newOptions)) {
          newOptions.forEach((option) => {
            disabledOptions[key]!.add(option.toLowerCase());
          });
        }
      });
    }

    // Merge disabled option reasons
    if (result.disabledOptionReasons) {
      Object.keys(result.disabledOptionReasons).forEach((layerName) => {
        const key = layerName as UILayerName;
        if (!disabledOptionReasons[key]) {
          disabledOptionReasons[key] = {};
        }
        const optionReasons = result.disabledOptionReasons![key];
        if (optionReasons) {
          Object.assign(disabledOptionReasons[key]!, optionReasons);
        }
      });
    }
  }

  return {
    disabledLayers: Array.from(disabledSet),
    reasons,
    clearSelections: Array.from(clearSet),
    forceSelections,
    disabledOptions,
    disabledOptionReasons,
  };
}

/**
 * Check if a specific layer is disabled
 */
export function isLayerDisabled(layerName: UILayerName, resolver: SelectionResolver): boolean {
  const { disabledLayers } = getDisabledLayers(resolver);
  return disabledLayers.includes(layerName);
}

/**
 * Get the reason why a layer is disabled
 */
export function getDisabledReason(layerName: UILayerName, resolver: SelectionResolver): string | null {
  const { reasons } = getDisabledLayers(resolver);
  return reasons[layerName] || null;
}
