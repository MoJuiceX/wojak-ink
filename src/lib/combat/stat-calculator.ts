// src/lib/combat/stat-calculator.ts
// Stat calculation formulas — ported from ClawCombat config/stat-scaling.js
// Uses Pokémon-style formulas with fixed IV=31

import type { CombatType, BaseStats } from './types';
import { getBaseStats } from './data/base-stats';
import { getNature } from './data/natures';

/**
 * HP = floor((2 * baseHP + 31) * level / 100) + level + 10
 */
export function calculateHP(baseHP: number, level: number): number {
  return Math.floor((2 * baseHP + 31) * level / 100) + level + 10;
}

/**
 * Stat = floor(((2 * baseStat + 31) * level / 100) + 5) * natureMultiplier
 * Where natureMultiplier = 1.1 (boosted), 0.9 (reduced), or 1.0 (neutral)
 */
export function calculateStat(baseStat: number, level: number, natureMult: number): number {
  return Math.floor(
    (Math.floor((2 * baseStat + 31) * level / 100) + 5) * natureMult
  );
}

/**
 * Calculate all 6 stats for a given type, level, and nature.
 */
export function calculateAllStats(
  type: CombatType,
  level: number,
  natureName: string,
): BaseStats {
  const base = getBaseStats(type);
  const nature = getNature(natureName);

  const getNatureMult = (stat: string): number => {
    if (!nature || !nature.boost) return 1.0;
    if (nature.boost === stat) return 1.1;
    if (nature.reduce === stat) return 0.9;
    return 1.0;
  };

  return {
    hp: calculateHP(base.hp, level),
    attack: calculateStat(base.attack, level, getNatureMult('attack')),
    defense: calculateStat(base.defense, level, getNatureMult('defense')),
    sp_atk: calculateStat(base.sp_atk, level, getNatureMult('sp_atk')),
    sp_def: calculateStat(base.sp_def, level, getNatureMult('sp_def')),
    speed: calculateStat(base.speed, level, getNatureMult('speed')),
  };
}
