// src/lib/combat/ai-strategist.ts
// AI move selection — ported from ClawCombat ai-strategist.js
// Scoring system (0-100 scale) for move evaluation

import type { FighterState } from './battle-state';
import { calculateDamage } from './damage-calculator';
import { getMoveById } from './data/moves';
import { getEffectiveness } from './data/type-chart';

/** AI scoring constants — ported exactly from ClawCombat */
const BASE_SCORE = 50;
const SUPER_EFFECTIVE = 30;
const NOT_VERY_EFFECTIVE = -20;
const IMMUNE = -40;
const KILL_SHOT = 25;
const SIGNIFICANT_DAMAGE = 10;
const LOW_HP_AGGRESSION = 10;
const STATUS_VALUE = 15;
const HEALING_VALUE = 20;
const ACCURACY_PENALTY_DIVISOR = 5;

interface ScoredMove {
  moveId: string;
  name: string;
  score: number;
}

/**
 * Estimate damage for a move without randomness.
 */
function estimateDamage(attacker: FighterState, defender: FighterState, moveId: string): number {
  const result = calculateDamage({
    attacker, defender, moveId,
    randomFactor: 0.925, // midpoint of 0.85-1.0
    forceCrit: false,
  });
  return result.damage;
}

/**
 * Score a single move based on the battle context.
 */
function evaluateMove(attacker: FighterState, defender: FighterState, moveId: string): number {
  const move = getMoveById(moveId);
  if (!move) return 0;

  let score = BASE_SCORE;

  // Type effectiveness
  const typeEff = getEffectiveness(move.type, defender.type);
  if (typeEff >= 2.0) score += SUPER_EFFECTIVE;
  else if (typeEff > 0 && typeEff < 1.0) score += NOT_VERY_EFFECTIVE;
  else if (typeEff === 0) score += IMMUNE;

  if (move.power > 0) {
    // Estimate damage
    const dmg = estimateDamage(attacker, defender, moveId);

    // Kill shot bonus
    if (dmg >= defender.currentHP) score += KILL_SHOT;
    // Significant damage bonus (≥ 50% maxHP)
    else if (dmg >= defender.maxHP * 0.5) score += SIGNIFICANT_DAMAGE;

    // Low HP aggression — pick aggressive moves when low
    if (attacker.currentHP < attacker.maxHP * 0.25) score += LOW_HP_AGGRESSION;
  } else {
    // Status/utility moves
    if (move.effects) {
      const statusEffect = move.effects.find(e => e.type === 'status');
      if (statusEffect && !defender.status) {
        score += STATUS_VALUE;
      } else if (statusEffect && defender.status) {
        // Already statused — status move is much less valuable
        score -= 30;
      }

      const healEffect = move.effects.find(e => e.type === 'heal');
      if (healEffect && attacker.currentHP < attacker.maxHP * 0.4) {
        score += HEALING_VALUE;
      }

      const boostEffect = move.effects.find(e => e.type === 'stat_boost');
      if (boostEffect) score += 10;
    }
  }

  // Accuracy penalty
  if (move.accuracy < 100) {
    score -= (100 - move.accuracy) / ACCURACY_PENALTY_DIVISOR;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Rank all available moves by score (descending).
 */
export function rankMoves(attacker: FighterState, defender: FighterState): ScoredMove[] {
  return attacker.moves
    .map(moveId => {
      const move = getMoveById(moveId);
      return {
        moveId,
        name: move?.name ?? moveId,
        score: evaluateMove(attacker, defender, moveId),
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Choose a move using AI scoring.
 * Normal difficulty: 80% best move, 20% second-best for unpredictability.
 */
export function chooseMove(
  attacker: FighterState,
  defender: FighterState,
  rng?: () => number,
): string {
  const randomFn = rng ?? Math.random;
  const ranked = rankMoves(attacker, defender);

  if (ranked.length === 0) return attacker.moves[0]; // fallback

  // 20% chance to pick second best
  if (ranked.length >= 2 && randomFn() < 0.2) {
    return ranked[1].moveId;
  }

  return ranked[0].moveId;
}
