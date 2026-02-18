// src/lib/combat/identity-calculator.ts
// Given traits + colors + details → CombatIdentity

import type { CombatType, CombatIdentity, StatName } from './types';
import { COMBAT_TYPES, STAT_NAMES } from './types';
import { getTraitCombat } from './data/trait-type-map';
import { getTypePointsForColor } from './data/color-type-map';
import { getNaturePointsForColor } from './data/color-nature-map';
import { getDetailBonus } from './data/detail-combat-map';
import { getNatureByStats } from './data/natures';
import { getAbilitiesForType } from './data/abilities';

interface TraitInput {
  traitId: string;
  layer: string;
}

interface IdentityInput {
  traits: TraitInput[];
  colors: Record<string, string>;   // traitId → hex color
  details: Record<string, string>;  // traitId → detail option name
}

export function calculateCombatIdentity(input: IdentityInput): CombatIdentity {
  // Initialize score accumulators
  const typeScores: Record<CombatType, number> = {} as Record<CombatType, number>;
  for (const t of COMBAT_TYPES) typeScores[t] = 0;
  const statScores: Record<StatName, number> = {} as Record<StatName, number>;
  for (const s of STAT_NAMES) statScores[s] = 0;

  // Source 1: Trait points
  for (const { traitId } of input.traits) {
    const entry = getTraitCombat(traitId);
    if (!entry) continue;
    typeScores[entry.typePoints.primary] += entry.typePoints.primaryPts;
    if (entry.typePoints.secondary && entry.typePoints.secondaryPts) {
      typeScores[entry.typePoints.secondary] += entry.typePoints.secondaryPts;
    }
    if (entry.natureStat && entry.natureStatPts) {
      statScores[entry.natureStat] += entry.natureStatPts;
    }
  }

  // Source 2: Color points
  for (const hex of Object.values(input.colors)) {
    const typePts = getTypePointsForColor(hex);
    typeScores[typePts.primary] += typePts.primaryPts;
    if (typePts.secondary && typePts.secondaryPts) {
      typeScores[typePts.secondary] += typePts.secondaryPts;
    }
    const naturePts = getNaturePointsForColor(hex);
    statScores[naturePts.primary] += naturePts.primaryPts;
    if (naturePts.secondary && naturePts.secondaryPts) {
      statScores[naturePts.secondary] += naturePts.secondaryPts;
    }
  }

  // Source 3: Detail points
  for (const [traitId, detailOption] of Object.entries(input.details)) {
    const bonus = getDetailBonus(traitId, detailOption);
    if (!bonus) continue;
    if (bonus.typeBonus) {
      typeScores[bonus.typeBonus.type] += bonus.typeBonus.pts;
    }
    if (bonus.natureBonus) {
      statScores[bonus.natureBonus.stat] += bonus.natureBonus.pts;
    }
  }

  // Resolve type: highest score wins
  let type: CombatType = 'NEUTRAL';
  let maxTypeScore = -1;
  for (const t of COMBAT_TYPES) {
    if (typeScores[t] > maxTypeScore) {
      maxTypeScore = typeScores[t];
      type = t;
    }
  }

  // Resolve nature: highest stat → boost, lowest (excluding highest) → reduce
  let highestStat: StatName | null = null;
  let lowestStat: StatName | null = null;
  let maxStatVal = -1;
  let minStatVal = Infinity;
  for (const s of STAT_NAMES) {
    if (statScores[s] > maxStatVal) { maxStatVal = statScores[s]; highestStat = s; }
  }
  for (const s of STAT_NAMES) {
    if (s !== highestStat && statScores[s] < minStatVal) {
      minStatVal = statScores[s]; lowestStat = s;
    }
  }
  // If all stats within 1 point of each other → Balanced
  const allClose = maxStatVal - minStatVal <= 1;
  const nature = allClose
    ? getNatureByStats(null, null)
    : getNatureByStats(highestStat, lowestStat);

  // Resolve ability: offensive sum vs defensive sum
  const offensiveSum = statScores.attack + statScores.sp_atk + statScores.speed;
  const defensiveSum = statScores.defense + statScores.sp_def;
  const [abilityA, abilityB] = getAbilitiesForType(type);
  const ability = offensiveSum > defensiveSum ? abilityA : abilityB;

  return {
    type,
    nature: nature.name,
    ability: ability.name,
    typeScores,
    statScores,
  };
}
