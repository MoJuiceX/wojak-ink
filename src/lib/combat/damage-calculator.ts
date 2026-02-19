// src/lib/combat/damage-calculator.ts
// Core damage formula — ported from ClawCombat battle-engine.js calculateDamage()

import type { FighterState } from './battle-state';
import { getMoveById } from './data/moves';
import { getEffectiveness } from './data/type-chart';

/** Stat stage multiplier table — ported exactly from ClawCombat */
const STAT_STAGE_TABLE: Record<number, number> = {
  [-6]: 0.25, [-5]: 0.29, [-4]: 0.33, [-3]: 0.40, [-2]: 0.50, [-1]: 0.667,
  0: 1.0,
  1: 1.5, 2: 2.0, 3: 2.5, 4: 3.0, 5: 3.5, 6: 4.0,
};

/** Get stat stage multiplier, clamping to ±6 range */
export function getStatStageMultiplier(stage: number): number {
  const clamped = Math.max(-6, Math.min(6, stage));
  return STAT_STAGE_TABLE[clamped];
}

export interface DamageInput {
  attacker: FighterState;
  defender: FighterState;
  moveId: string;
  randomFactor?: number;   // 0.85-1.0, for deterministic testing
  forceCrit?: boolean;      // force crit on/off for testing
}

export interface DamageResult {
  damage: number;
  crit: boolean;
  effectiveness: number;  // capped at 1.5
}

/** Balance constants — DO NOT CHANGE */
const DAMAGE_MULTIPLIER = 0.25;
const TYPE_EFF_CAP = 1.5;
const CRIT_MULTIPLIER = 1.25;

/**
 * Core damage formula:
 * baseDamage = (effectiveAtk / max(effectiveDef, 1)) × movePower × 0.25
 * finalDamage = floor(baseDamage × STAB × min(typeEff, 1.5) × critMult × random × burnMult)
 * return max(finalDamage, 1)
 */
export function calculateDamage(input: DamageInput): DamageResult {
  const { attacker, defender, moveId, randomFactor, forceCrit } = input;

  const move = getMoveById(moveId);
  if (!move || move.power === 0) {
    return { damage: 0, crit: false, effectiveness: 1.0 };
  }

  const isPhysical = move.category === 'physical';

  // Determine attack/defense stats based on move category
  const baseAtk = isPhysical ? attacker.effectiveStats.attack : attacker.effectiveStats.sp_atk;
  const baseDef = isPhysical ? defender.effectiveStats.defense : defender.effectiveStats.sp_def;
  const atkStage = isPhysical ? attacker.statStages.atk : attacker.statStages.spa;
  const defStage = isPhysical ? defender.statStages.def : defender.statStages.spd;

  // Critical hit determination
  const crit = forceCrit !== undefined ? forceCrit : Math.random() < 0.0625;

  // Crits: ignore negative atk stages and positive def stages
  const effectiveAtkStage = crit ? Math.max(0, atkStage) : atkStage;
  const effectiveDefStage = crit ? Math.min(0, defStage) : defStage;

  const effectiveAtk = baseAtk * getStatStageMultiplier(effectiveAtkStage);
  const effectiveDef = baseDef * getStatStageMultiplier(effectiveDefStage);

  // Base damage formula
  const baseDamage = (effectiveAtk / Math.max(effectiveDef, 1)) * move.power * DAMAGE_MULTIPLIER;

  // STAB — 1.5x if move type matches fighter type (2.0x with Adaptability)
  const stabMultiplier = move.type === attacker.type
    ? (attacker.ability === 'Adaptability' ? 2.0 : 1.5)
    : 1.0;

  // Type effectiveness (capped at 1.5x)
  const rawTypeEff = getEffectiveness(move.type, defender.type);
  const typeEff = Math.min(rawTypeEff, TYPE_EFF_CAP);

  // Crit multiplier
  const critMult = crit ? CRIT_MULTIPLIER : 1.0;

  // Random factor 0.85-1.0
  const random = randomFactor !== undefined ? randomFactor : (0.85 + Math.random() * 0.15);

  // Burn mod — 0.5x for physical moves when burned
  const burnMod = (attacker.status === 'burn' && isPhysical && attacker.ability !== 'Guts') ? 0.5 : 1.0;

  const finalDamage = Math.max(1, Math.floor(baseDamage * stabMultiplier * typeEff * critMult * random * burnMod));

  return {
    damage: finalDamage,
    crit,
    effectiveness: typeEff,
  };
}
