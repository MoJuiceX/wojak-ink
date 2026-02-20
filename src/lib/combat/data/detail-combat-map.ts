import type { CombatType, StatName, DetailCombatEntry } from '../types';

/**
 * Detail-option combat mapping.
 *
 * Outer key  = parent-trait manifest ID (e.g. "Head_Beer-Hat")
 * Inner key  = detail-option name exactly as it appears in manifest.json
 * Value      = the bonus that detail option contributes to type/nature scoring
 *
 * Source: docs/DETAIL-OPTIONS-COMBAT-MAPPING.csv
 */

function d(
  parentTrait: string,
  detailOption: string,
  type: CombatType | null,
  typePts: number,
  stat: StatName | null,
  statPts: number,
): DetailCombatEntry {
  return {
    parentTrait,
    detailOption,
    typeBonus: type ? { type, pts: typePts } : null,
    natureBonus: stat ? { stat, pts: statPts } : null,
  };
}

export const DETAIL_COMBAT_MAP: Record<string, Record<string, DetailCombatEntry>> = {
  // ── Clothes_Astronaut ──────────────────────────────────────────────
  'Clothes_Astronaut': {
    'Detail 1': d('Clothes_Astronaut', 'Detail 1', 'INSECT', 1, null, 0),
    'Detail 2': d('Clothes_Astronaut', 'Detail 2', 'MARTIAL', 1, null, 0),
  },

  // ── Clothes_SWAT ───────────────────────────────────────────────────
  'Clothes_SWAT': {
    'Detail 1': d('Clothes_SWAT', 'Detail 1', 'MARTIAL', 1, 'defense', 1),
    'Detail 2': d('Clothes_SWAT', 'Detail 2', 'VENOM', 1, null, 0),
  },

  // ── Clothes_Sports-jacket ──────────────────────────────────────────
  'Clothes_Sports-jacket': {
    'Detail 1': d('Clothes_Sports-jacket', 'Detail 1', 'MARTIAL', 1, 'speed', 1),
    'Detail 2': d('Clothes_Sports-jacket', 'Detail 2', 'NEUTRAL', 1, null, 0),
  },

  // ── Clothes_Wizard-drip ────────────────────────────────────────────
  'Clothes_Wizard-drip': {
    'Detail 1':   d('Clothes_Wizard-drip', 'Detail 1', 'PSYCHE', 1, 'sp_atk', 1),
    'Detail 2':   d('Clothes_Wizard-drip', 'Detail 2', 'MYSTIC', 1, null, 0),
    'Logo Patch': d('Clothes_Wizard-drip', 'Logo Patch', 'MYSTIC', 1, 'sp_def', 1),
  },

  // ── Clothes_Suit ───────────────────────────────────────────────────
  'Clothes_Suit': {
    'Tie': d('Clothes_Suit', 'Tie', 'NEUTRAL', 1, 'sp_atk', 1),
    'Bow': d('Clothes_Suit', 'Bow', 'MYSTIC', 1, 'sp_def', 1),
  },

  // ── Head_Comrad-Hat (no 'e' — matches manifest) ───────────────────
  'Head_Comrad-Hat': {
    'Star':       d('Head_Comrad-Hat', 'Star', 'FIRE', 2, 'attack', 1),
    'Logo Patch': d('Head_Comrad-Hat', 'Logo Patch', 'MARTIAL', 1, null, 0),
  },

  // ── Head_Construction-Helmet ───────────────────────────────────────
  'Head_Construction-Helmet': {
    'Chia-logo':  d('Head_Construction-Helmet', 'Chia-logo', 'GRASS', 2, null, 0),
    'Cig-pack':   d('Head_Construction-Helmet', 'Cig-pack', 'VENOM', 1, 'speed', 1),
    'Cig-pack-2': d('Head_Construction-Helmet', 'Cig-pack-2', 'VENOM', 1, 'speed', 1),
  },

  // ── Head_Cap ───────────────────────────────────────────────────────
  'Head_Cap': {
    'Mcd':   d('Head_Cap', 'Mcd', 'NEUTRAL', 1, null, 0),
    'Chia':  d('Head_Cap', 'Chia', 'GRASS', 2, null, 0),
    'Army':  d('Head_Cap', 'Army', 'MARTIAL', 2, 'attack', 1),
  },

  // ── Head_Beer-Hat ──────────────────────────────────────────────────
  'Head_Beer-Hat': {
    '7up':            d('Head_Beer-Hat', '7up', 'AIR', 1, 'speed', 1),
    'Aw':             d('Head_Beer-Hat', 'Aw', 'NEUTRAL', 1, 'sp_def', 1),
    'Budweiser':      d('Head_Beer-Hat', 'Budweiser', 'FIRE', 1, null, 0),
    'Captain Morgan': d('Head_Beer-Hat', 'Captain Morgan', 'VENOM', 1, 'attack', 1),
    'Citrus':         d('Head_Beer-Hat', 'Citrus', 'GRASS', 1, null, 0),
    'Coffee':         d('Head_Beer-Hat', 'Coffee', 'PSYCHE', 1, 'speed', 1),
    'Coke':           d('Head_Beer-Hat', 'Coke', 'NEUTRAL', 1, null, 0),
    'Corona':         d('Head_Beer-Hat', 'Corona', 'GRASS', 1, null, 0),
    'Dr Pepper':      d('Head_Beer-Hat', 'Dr Pepper', 'VENOM', 1, null, 0),
    'Heineken':       d('Head_Beer-Hat', 'Heineken', 'GRASS', 1, 'sp_def', 1),
    'LaCroix':        d('Head_Beer-Hat', 'LaCroix', 'AIR', 1, null, 0),
    'Modelo':         d('Head_Beer-Hat', 'Modelo', 'NEUTRAL', 1, 'defense', 1),
    'Monster':        d('Head_Beer-Hat', 'Monster', 'VENOM', 1, 'attack', 1),
    'Monster Orange': d('Head_Beer-Hat', 'Monster Orange', 'DRAGON', 1, 'attack', 1),
    'Mtn Dew':        d('Head_Beer-Hat', 'Mtn Dew', 'ELECTRIC', 1, 'speed', 1),
    'Red Bull':       d('Head_Beer-Hat', 'Red Bull', 'AIR', 1, 'speed', 1),
    'Sunny D':        d('Head_Beer-Hat', 'Sunny D', 'FIRE', 1, 'speed', 1),
    'Tang':           d('Head_Beer-Hat', 'Tang', 'FIRE', 1, null, 0),
  },

  // ── Face-wear_MOG-Glasses ──────────────────────────────────────────
  'Face-wear_MOG-Glasses': {
    'Radioactive-forest': d('Face-wear_MOG-Glasses', 'Radioactive-forest', 'INSECT', 1, null, 0),
    'Black':              d('Face-wear_MOG-Glasses', 'Black', 'SHADOW', 1, null, 0),
    'Blue':               d('Face-wear_MOG-Glasses', 'Blue', 'WATER', 1, null, 0),
    'Blue2':              d('Face-wear_MOG-Glasses', 'Blue2', 'ICE', 1, null, 0),
    'Green':              d('Face-wear_MOG-Glasses', 'Green', 'GRASS', 1, null, 0),
    'Orange':             d('Face-wear_MOG-Glasses', 'Orange', 'FIRE', 1, null, 0),
    'Purple':             d('Face-wear_MOG-Glasses', 'Purple', 'VENOM', 1, null, 0),
    'Red':                d('Face-wear_MOG-Glasses', 'Red', 'FIRE', 1, null, 0),
    'Default (Rainbow)':  d('Face-wear_MOG-Glasses', 'Default (Rainbow)', 'MYSTIC', 1, null, 0),
  },
};

/**
 * Look up the combat bonus for a specific trait + detail-option pair.
 *
 * @param traitId      manifest trait ID  e.g. "Head_Beer-Hat"
 * @param detailOption detail option name  e.g. "Red-bull"
 * @returns the DetailCombatEntry or undefined if no mapping exists
 */
export function getDetailBonus(
  traitId: string,
  detailOption: string,
): DetailCombatEntry | undefined {
  return DETAIL_COMBAT_MAP[traitId]?.[detailOption];
}

/**
 * Logo combat entry — simpler structure since logos are shared across traits.
 */
export interface LogoCombatEntry {
  type: CombatType;
  typePoints: number;
  nature: StatName | null;
  naturePoints: number;
}

/**
 * Shared logo combat bonuses — applies to any trait with a logoOption.
 * Keys match ASTRONAUT_LOGOS values exactly (case-sensitive).
 * Type reasoning: color/culture/meme association.
 */
export const LOGO_COMBAT_MAP: Record<string, LogoCombatEntry> = {
  'BEPE':        { type: 'VENOM',    typePoints: 1, nature: 'attack',  naturePoints: 1 },
  'CASTER':      { type: 'PSYCHE',   typePoints: 1, nature: 'speed',   naturePoints: 1 },
  'CAT':         { type: 'AIR',      typePoints: 1, nature: 'speed',   naturePoints: 1 },
  'CHAD':        { type: 'FIRE',     typePoints: 1, nature: 'attack',  naturePoints: 1 },
  'XCH':         { type: 'GRASS',    typePoints: 1, nature: null,      naturePoints: 0 },
  'CNI':         { type: 'NEUTRAL',  typePoints: 1, nature: 'defense', naturePoints: 1 },
  'COOKIES':     { type: 'NEUTRAL',  typePoints: 1, nature: null,      naturePoints: 0 },
  'Dexi Bucks':  { type: 'ELECTRIC', typePoints: 1, nature: 'speed',   naturePoints: 1 },
  'DIG':         { type: 'GRASS',    typePoints: 1, nature: 'defense', naturePoints: 1 },
  'DWB':         { type: 'NEUTRAL',  typePoints: 1, nature: null,      naturePoints: 0 },
  'G4M':         { type: 'ELECTRIC', typePoints: 1, nature: 'attack',  naturePoints: 1 },
  'GYATT':       { type: 'AIR',      typePoints: 1, nature: null,      naturePoints: 0 },
  'HOA':         { type: 'NEUTRAL',  typePoints: 1, nature: 'sp_def',  naturePoints: 1 },
  'HONK':        { type: 'AIR',      typePoints: 1, nature: 'sp_def',  naturePoints: 1 },
  'JOCK':        { type: 'FIRE',     typePoints: 1, nature: 'defense', naturePoints: 1 },
  'LOVE':        { type: 'PSYCHE',   typePoints: 1, nature: 'sp_def',  naturePoints: 1 },
  'MAX':         { type: 'ELECTRIC', typePoints: 1, nature: 'sp_atk',  naturePoints: 1 },
  'MIRROR':      { type: 'PSYCHE',   typePoints: 1, nature: null,      naturePoints: 0 },
  'MMM':         { type: 'VENOM',    typePoints: 1, nature: null,      naturePoints: 0 },
  'MOG':         { type: 'DRAGON',   typePoints: 1, nature: 'attack',  naturePoints: 1 },
  'MonkeyZoo':   { type: 'GRASS',    typePoints: 1, nature: 'attack',  naturePoints: 1 },
  'MRMT':        { type: 'NEUTRAL',  typePoints: 1, nature: null,      naturePoints: 0 },
  'NeckCoin':    { type: 'NEUTRAL',  typePoints: 1, nature: 'sp_def',  naturePoints: 1 },
  'NWO':         { type: 'VENOM',    typePoints: 1, nature: 'attack',  naturePoints: 1 },
  'PEPEcoin':    { type: 'VENOM',    typePoints: 1, nature: null,      naturePoints: 0 },
  'PIZZA':       { type: 'FIRE',     typePoints: 1, nature: null,      naturePoints: 0 },
  'PP':          { type: 'AIR',      typePoints: 1, nature: null,      naturePoints: 0 },
  'Spacebucks':  { type: 'ELECTRIC', typePoints: 1, nature: null,      naturePoints: 0 },
  'SPELLPOWER':  { type: 'PSYCHE',   typePoints: 1, nature: 'sp_atk',  naturePoints: 1 },
  'SPROUT':      { type: 'GRASS',    typePoints: 1, nature: null,      naturePoints: 0 },
  'STONKS':      { type: 'NEUTRAL',  typePoints: 1, nature: 'speed',   naturePoints: 1 },
  'TANG':        { type: 'FIRE',     typePoints: 1, nature: null,      naturePoints: 0 },
  'TVL':         { type: 'NEUTRAL',  typePoints: 1, nature: 'defense', naturePoints: 1 },
  'WITCHER':     { type: 'VENOM',    typePoints: 1, nature: 'sp_def',  naturePoints: 1 },
  'WOJAK':       { type: 'NEUTRAL',  typePoints: 1, nature: null,      naturePoints: 0 },
};

/**
 * Look up the combat bonus for a logo option.
 *
 * @param logoOption logo name exactly as it appears in ASTRONAUT_LOGOS
 * @returns the LogoCombatEntry or undefined if no mapping exists
 */
export function getLogoBonus(logoOption: string): LogoCombatEntry | undefined {
  return LOGO_COMBAT_MAP[logoOption];
}
