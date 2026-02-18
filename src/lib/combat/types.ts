// src/lib/combat/types.ts

/** The 18 combat types */
export const COMBAT_TYPES = [
  'NEUTRAL', 'FIRE', 'WATER', 'ELECTRIC', 'GRASS', 'ICE',
  'MARTIAL', 'VENOM', 'EARTH', 'AIR', 'PSYCHE', 'INSECT',
  'STONE', 'GHOST', 'DRAGON', 'SHADOW', 'METAL', 'MYSTIC',
] as const;
export type CombatType = typeof COMBAT_TYPES[number];

/** The 5 stat dimensions */
export const STAT_NAMES = ['attack', 'defense', 'sp_atk', 'sp_def', 'speed'] as const;
export type StatName = typeof STAT_NAMES[number];

/** Base stat spread for a type */
export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  sp_atk: number;
  sp_def: number;
  speed: number;
}

/** A nature modifies one stat +10%, one stat -10% */
export interface Nature {
  name: string;
  boost: StatName | null;
  reduce: StatName | null;
}

/** Move category */
export type MoveCategory = 'physical' | 'special' | 'status';

/** A combat move */
export interface CombatMove {
  id: string;
  name: string;
  type: CombatType;
  power: number;
  accuracy: number;
  pp: number;
  category: MoveCategory;
  description: string;
  effects?: MoveEffect[];
}

/** Move effect (status, stat change, heal, etc.) */
export interface MoveEffect {
  type: string;
  chance?: number;
  status?: string;
  stat?: string;
  stages?: number;
  target?: 'self' | 'opponent';
  percent?: number;
}

/** An ability (2 per type: offensive A, defensive B) */
export interface Ability {
  name: string;
  type: CombatType;
  variant: 'A' | 'B';
  description: string;
  trigger: string;
}

/** Point contribution from a single source (trait, color, or detail) */
export interface TypePoints {
  primary: CombatType;
  primaryPts: number;
  secondary?: CombatType;
  secondaryPts?: number;
}

export interface NatureStatPoints {
  primary: StatName;
  primaryPts: number;
  secondary?: StatName;
  secondaryPts?: number;
}

/** Trait combat mapping entry */
export interface TraitCombatEntry {
  traitId: string;        // manifest ID e.g. "Clothes_fire-figther"
  layer: string;          // e.g. "Clothes"
  name: string;           // display name e.g. "Firefighter Uniform"
  colorable: boolean;
  typePoints: TypePoints;
  natureStat: StatName | null;
  natureStatPts: number;
}

/** Detail option combat mapping entry */
export interface DetailCombatEntry {
  parentTrait: string;
  detailOption: string;
  typeBonus: { type: CombatType; pts: number } | null;
  natureBonus: { stat: StatName; pts: number } | null;
}

/** Color-to-type mapping entry (HSL range) */
export interface ColorTypeRule {
  name: string;
  hueMin?: number;
  hueMax?: number;
  satMin?: number;
  satMax?: number;
  lightMin?: number;
  lightMax?: number;
  primary: CombatType;
  primaryPts: number;
  secondary?: CombatType;
  secondaryPts?: number;
  isAchromatic?: boolean;
  isWarmNeutral?: boolean;
  isNeon?: boolean;
}

/** Color-to-nature-stat mapping entry */
export interface ColorNatureRule {
  name: string;
  hueMin?: number;
  hueMax?: number;
  satMin?: number;
  satMax?: number;
  lightMin?: number;
  lightMax?: number;
  primary: StatName;
  primaryPts: number;
  secondary?: StatName;
  secondaryPts?: number;
  isAchromatic?: boolean;
  isWarmNeutral?: boolean;
  isNeon?: boolean;
}

/** Full combat identity (baked into NFT metadata) */
export interface CombatIdentity {
  type: CombatType;
  nature: string;         // nature name e.g. "Focused"
  ability: string;        // ability name e.g. "Magic Guard"
  typeScores: Record<CombatType, number>;
  statScores: Record<StatName, number>;
}

/** Fighter record (DB row) */
export interface CombatFighter {
  nft_id: string;
  edition_number: number;
  owner_did: string;
  combat_type: CombatType;
  nature: string;
  ability: string;
  move_1: string;
  move_2: string;
  move_3: string;
  move_4: string;
  level: number;
  xp: number;
  elo_rating: number;
  total_combat_wins: number;
  total_combat_losses: number;
  total_combat_draws: number;
}
