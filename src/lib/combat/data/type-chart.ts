// src/lib/combat/data/type-chart.ts
// Full 18x18 type effectiveness matrix ported from ClawCombat pokeapi-type-chart.json

import { COMBAT_TYPES, type CombatType } from '../types';

export { COMBAT_TYPES };

/**
 * TYPE_CHART[attacker][defender] = effectiveness multiplier
 *
 * 2    = super effective
 * 1    = neutral
 * 0.5  = not very effective
 * 0.25 = doubly resisted
 * 0    = immune (no effect)
 */
export const TYPE_CHART: Record<CombatType, Record<CombatType, number>> = {
  NEUTRAL: {
    NEUTRAL: 1, FIRE: 1, WATER: 1, ELECTRIC: 1, GRASS: 1, ICE: 1,
    MARTIAL: 1, VENOM: 1, EARTH: 1, AIR: 1, PSYCHE: 1, INSECT: 1,
    STONE: 0.5, GHOST: 0, DRAGON: 1, SHADOW: 1, METAL: 0.5, MYSTIC: 1,
  },
  FIRE: {
    NEUTRAL: 1, FIRE: 0.5, WATER: 0.5, ELECTRIC: 1, GRASS: 2, ICE: 2,
    MARTIAL: 1, VENOM: 1, EARTH: 1, AIR: 1, PSYCHE: 1, INSECT: 2,
    STONE: 0.5, GHOST: 1, DRAGON: 0.5, SHADOW: 1, METAL: 2, MYSTIC: 1,
  },
  WATER: {
    NEUTRAL: 1, FIRE: 2, WATER: 0.5, ELECTRIC: 1, GRASS: 0.5, ICE: 1,
    MARTIAL: 1, VENOM: 1, EARTH: 2, AIR: 1, PSYCHE: 1, INSECT: 1,
    STONE: 2, GHOST: 1, DRAGON: 0.5, SHADOW: 1, METAL: 1, MYSTIC: 1,
  },
  ELECTRIC: {
    NEUTRAL: 1, FIRE: 1, WATER: 2, ELECTRIC: 0.5, GRASS: 0.5, ICE: 1,
    MARTIAL: 1, VENOM: 1, EARTH: 0.25, AIR: 2, PSYCHE: 1, INSECT: 1,
    STONE: 1, GHOST: 1, DRAGON: 0.5, SHADOW: 1, METAL: 1, MYSTIC: 1,
  },
  GRASS: {
    NEUTRAL: 1, FIRE: 0.5, WATER: 2, ELECTRIC: 1, GRASS: 0.5, ICE: 1,
    MARTIAL: 1, VENOM: 0.5, EARTH: 2, AIR: 0.5, PSYCHE: 1, INSECT: 0.5,
    STONE: 2, GHOST: 1, DRAGON: 0.5, SHADOW: 1, METAL: 0.5, MYSTIC: 1,
  },
  ICE: {
    NEUTRAL: 1, FIRE: 0.5, WATER: 0.5, ELECTRIC: 1, GRASS: 2, ICE: 0.5,
    MARTIAL: 1, VENOM: 1, EARTH: 2, AIR: 2, PSYCHE: 1, INSECT: 1,
    STONE: 1, GHOST: 1, DRAGON: 2, SHADOW: 1, METAL: 1, MYSTIC: 1,
  },
  MARTIAL: {
    NEUTRAL: 2, FIRE: 1, WATER: 1, ELECTRIC: 1, GRASS: 1, ICE: 2,
    MARTIAL: 1, VENOM: 0.5, EARTH: 1, AIR: 0.5, PSYCHE: 0.5, INSECT: 0.5,
    STONE: 2, GHOST: 0.25, DRAGON: 1, SHADOW: 2, METAL: 2, MYSTIC: 0.5,
  },
  VENOM: {
    NEUTRAL: 1, FIRE: 1, WATER: 2, ELECTRIC: 1, GRASS: 2, ICE: 1,
    MARTIAL: 1, VENOM: 0.5, EARTH: 0.5, AIR: 1, PSYCHE: 1, INSECT: 1,
    STONE: 0.5, GHOST: 0.5, DRAGON: 1, SHADOW: 1, METAL: 0.25, MYSTIC: 2,
  },
  EARTH: {
    NEUTRAL: 1, FIRE: 2, WATER: 1, ELECTRIC: 2, GRASS: 0.5, ICE: 1,
    MARTIAL: 1, VENOM: 2, EARTH: 1, AIR: 0.25, PSYCHE: 1, INSECT: 0.5,
    STONE: 2, GHOST: 1, DRAGON: 1, SHADOW: 1, METAL: 2, MYSTIC: 1,
  },
  AIR: {
    NEUTRAL: 1, FIRE: 1, WATER: 1, ELECTRIC: 0.5, GRASS: 2, ICE: 1,
    MARTIAL: 2, VENOM: 1, EARTH: 1, AIR: 1, PSYCHE: 1, INSECT: 2,
    STONE: 0.5, GHOST: 1, DRAGON: 1, SHADOW: 1, METAL: 0.5, MYSTIC: 1,
  },
  PSYCHE: {
    NEUTRAL: 1, FIRE: 1, WATER: 1, ELECTRIC: 1, GRASS: 1, ICE: 1,
    MARTIAL: 2, VENOM: 2, EARTH: 1, AIR: 1, PSYCHE: 0.5, INSECT: 1,
    STONE: 1, GHOST: 1, DRAGON: 1, SHADOW: 0.25, METAL: 0.5, MYSTIC: 1,
  },
  INSECT: {
    NEUTRAL: 1, FIRE: 0.5, WATER: 1, ELECTRIC: 1, GRASS: 2, ICE: 1,
    MARTIAL: 0.5, VENOM: 0.5, EARTH: 1, AIR: 0.5, PSYCHE: 2, INSECT: 1,
    STONE: 1, GHOST: 0.5, DRAGON: 1, SHADOW: 2, METAL: 1, MYSTIC: 2,
  },
  STONE: {
    NEUTRAL: 1, FIRE: 2, WATER: 1, ELECTRIC: 1, GRASS: 1, ICE: 2,
    MARTIAL: 0.5, VENOM: 1, EARTH: 0.5, AIR: 2, PSYCHE: 1, INSECT: 2,
    STONE: 1, GHOST: 1, DRAGON: 1, SHADOW: 1, METAL: 0.5, MYSTIC: 1,
  },
  GHOST: {
    NEUTRAL: 0, FIRE: 1, WATER: 1, ELECTRIC: 1, GRASS: 1, ICE: 1,
    MARTIAL: 1, VENOM: 1, EARTH: 1, AIR: 1, PSYCHE: 2, INSECT: 1,
    STONE: 1, GHOST: 2, DRAGON: 1, SHADOW: 0.5, METAL: 1, MYSTIC: 1,
  },
  DRAGON: {
    NEUTRAL: 1, FIRE: 1, WATER: 1, ELECTRIC: 1, GRASS: 1, ICE: 1,
    MARTIAL: 1, VENOM: 1, EARTH: 1, AIR: 1, PSYCHE: 1, INSECT: 1,
    STONE: 1, GHOST: 1, DRAGON: 2, SHADOW: 1, METAL: 1, MYSTIC: 0.5,
  },
  SHADOW: {
    NEUTRAL: 1, FIRE: 1, WATER: 1, ELECTRIC: 1, GRASS: 1, ICE: 1,
    MARTIAL: 0.5, VENOM: 1, EARTH: 1, AIR: 1, PSYCHE: 2, INSECT: 1,
    STONE: 1, GHOST: 2, DRAGON: 1, SHADOW: 0.5, METAL: 1, MYSTIC: 0.5,
  },
  METAL: {
    NEUTRAL: 1, FIRE: 0.5, WATER: 0.5, ELECTRIC: 0.5, GRASS: 1, ICE: 2,
    MARTIAL: 1, VENOM: 1, EARTH: 1, AIR: 1, PSYCHE: 1, INSECT: 1,
    STONE: 2, GHOST: 1, DRAGON: 1, SHADOW: 1, METAL: 0.5, MYSTIC: 2,
  },
  MYSTIC: {
    NEUTRAL: 1, FIRE: 0.5, WATER: 1, ELECTRIC: 1, GRASS: 1, ICE: 1,
    MARTIAL: 2, VENOM: 0.5, EARTH: 1, AIR: 1, PSYCHE: 1, INSECT: 1,
    STONE: 1, GHOST: 1, DRAGON: 2, SHADOW: 2, METAL: 0.5, MYSTIC: 1,
  },
};

/** Look up type effectiveness. Falls back to 1 (neutral) for unknown types. */
export function getEffectiveness(attacker: CombatType, defender: CombatType): number {
  return TYPE_CHART[attacker]?.[defender] ?? 1;
}
