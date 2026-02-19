/**
 * Move Auto-Assignment — Deterministic Attacks from Traits
 *
 * Assigns 4 moves (3 damage + 1 status) based on the fighter's combat identity.
 * The algorithm is purely deterministic — same identity always produces same moves.
 */

import { getMovePoolForType, getMoveById } from './data/moves';
import type { CombatIdentity, CombatMove, StatName } from './types';

export interface MoveAssignment {
  moves: string[]; // 4 move IDs: [damage, damage, damage, status]
  valid: boolean;
}

/**
 * Assigns 4 moves based on the fighter's combat identity.
 * Constraint: exactly 3 damaging moves + 1 status move.
 */
export function assignMoves(identity: CombatIdentity): MoveAssignment {
  const pool = getMovePoolForType(identity.type);

  // Split pool into damaging moves (power > 0) and status moves (power === 0)
  const damageMoves = pool.filter(m => m.power > 0);
  const statusMoves = pool.filter(m => m.power === 0);

  // Score each damaging move based on stat alignment
  const scoredDamage = damageMoves.map(move => ({
    move,
    score: scoreDamageMove(move, identity),
  })).sort((a, b) => b.score - a.score);

  // Score each status move based on stat alignment and utility
  const scoredStatus = statusMoves.map(move => ({
    move,
    score: scoreStatusMove(move, identity),
  })).sort((a, b) => b.score - a.score);

  // Build the 4-move selection enforcing the 3 damage + 1 status constraint
  let selectedMoves: string[] = [];

  if (scoredDamage.length >= 3 && scoredStatus.length >= 1) {
    // Ideal case: 3 damage + 1 status
    selectedMoves = [
      scoredDamage[0].move.id,
      scoredDamage[1].move.id,
      scoredDamage[2].move.id,
      scoredStatus[0].move.id,
    ];
  } else if (scoredDamage.length >= 3 && scoredStatus.length === 0) {
    // No status moves: use 4 damage moves
    selectedMoves = scoredDamage.slice(0, 4).map(s => s.move.id);
  } else if (scoredDamage.length < 3) {
    // Fewer than 3 damage moves: use all damage, fill with status
    const allDamage = scoredDamage.map(s => s.move.id);
    const neededStatus = 4 - allDamage.length;
    const statusFill = scoredStatus.slice(0, neededStatus).map(s => s.move.id);
    selectedMoves = [...allDamage, ...statusFill];
  }

  // Validate constraint: ensure we have exactly 3 damage + 1 status if possible
  selectedMoves = enforceConstraint(selectedMoves, scoredDamage, scoredStatus);

  return {
    moves: selectedMoves,
    valid: selectedMoves.length === 4,
  };
}

/**
 * Enforces the 3 damage + 1 status constraint by rebalancing if needed.
 */
function enforceConstraint(
  moves: string[],
  scoredDamage: { move: CombatMove; score: number }[],
  scoredStatus: { move: CombatMove; score: number }[]
): string[] {
  if (moves.length !== 4) return moves;

  const moveObjects = moves.map(id => getMoveById(id)).filter(Boolean) as CombatMove[];
  const damageCount = moveObjects.filter(m => m.power > 0).length;
  const statusCount = moveObjects.filter(m => m.power === 0).length;

  // Already correct
  if (damageCount === 3 && statusCount === 1) return moves;

  // Too many damage moves: swap lowest-scored damage for best status
  if (damageCount > 3 && scoredStatus.length > 0) {
    const damageInSelection = moves.filter(id => {
      const m = getMoveById(id);
      return m && m.power > 0;
    });
    // Find the lowest-scored damage move in selection
    const lowestDamage = damageInSelection
      .map(id => ({ id, score: scoredDamage.find(s => s.move.id === id)?.score ?? 0 }))
      .sort((a, b) => a.score - b.score)[0];

    if (lowestDamage) {
      const bestStatus = scoredStatus.find(s => !moves.includes(s.move.id));
      if (bestStatus) {
        return moves.map(id => id === lowestDamage.id ? bestStatus.move.id : id);
      }
    }
  }

  // Too many status moves: swap lowest-scored status for best damage
  if (statusCount > 1 && scoredDamage.length > 0) {
    const statusInSelection = moves.filter(id => {
      const m = getMoveById(id);
      return m && m.power === 0;
    });
    // Find the lowest-scored status move in selection
    const lowestStatus = statusInSelection
      .map(id => ({ id, score: scoredStatus.find(s => s.move.id === id)?.score ?? 0 }))
      .sort((a, b) => a.score - b.score)[0];

    if (lowestStatus) {
      const bestDamage = scoredDamage.find(s => !moves.includes(s.move.id));
      if (bestDamage) {
        return moves.map(id => id === lowestStatus.id ? bestDamage.move.id : id);
      }
    }
  }

  return moves;
}

/**
 * Scores a damaging move based on alignment with fighter's stats.
 */
function scoreDamageMove(move: CombatMove, identity: CombatIdentity): number {
  let score = 0;
  const stats = identity.statScores;

  // Category alignment: physical moves score higher for high-attack fighters
  if (move.category === 'physical') {
    score += (stats.attack || 0) * 2;
  } else if (move.category === 'special') {
    score += (stats.sp_atk || 0) * 2;
  }

  // Power bonus: stronger moves score higher (but not overwhelmingly)
  score += move.power * 0.5;

  // Accuracy bonus: reliable moves score slightly higher
  score += move.accuracy * 0.1;

  // Priority moves get a bonus for fast fighters
  if (move.effects?.some(e => e.type === 'priority')) {
    score += (stats.speed || 0) * 1.5;
  }

  // Drain/heal moves get a bonus for defensive fighters
  if (move.effects?.some(e => e.type === 'drain')) {
    score += (stats.defense || 0) + (stats.sp_def || 0);
  }

  // Recoil moves get a penalty for fragile fighters, bonus for tanky ones
  if (move.effects?.some(e => e.type === 'recoil')) {
    const tankiness = (stats.defense || 0) + (stats.sp_def || 0);
    score += tankiness > 6 ? 10 : -10;
  }

  return score;
}

/**
 * Scores a status move based on utility and stat alignment.
 */
function scoreStatusMove(move: CombatMove, identity: CombatIdentity): number {
  let score = 0;
  const stats = identity.statScores;

  // Healing moves score higher for defensive fighters
  if (move.effects?.some(e => e.type === 'heal')) {
    score += (stats.defense || 0) + (stats.sp_def || 0);
    score += 15; // Healing is always useful
  }

  // Stat boost moves: match the boost stat to fighter's strength
  const boostEffect = move.effects?.find(e => e.type === 'stat_boost');
  if (boostEffect && boostEffect.stat) {
    const boostStat = boostEffect.stat as StatName;
    score += (stats[boostStat] || 0) * 2;
    // Multi-stage boosts are more valuable
    if (boostEffect.stages && boostEffect.stages >= 2) {
      score += 10;
    }
  }

  // Stat drop moves: useful for all fighters
  const dropEffect = move.effects?.find(e => e.type === 'stat_drop');
  if (dropEffect && dropEffect.target === 'opponent') {
    score += 10;
  }

  // Status condition moves (sleep, burn, poison, paralysis)
  const statusEffect = move.effects?.find(e => e.type === 'status');
  if (statusEffect && statusEffect.status) {
    const statusType = statusEffect.status;
    // Sleep is the best status
    if (statusType === 'sleep') score += 20;
    // Paralysis great for slow fighters
    else if (statusType === 'paralysis') score += 15 + ((stats.speed || 0) < 3 ? 10 : 0);
    // Burn great against physical attackers
    else if (statusType === 'burn') score += 12;
    // Poison is steady damage
    else if (statusType === 'poison') score += 10;
    // Confusion is decent
    else if (statusType === 'confusion') score += 8;

    // Accuracy matters more for status moves
    score += (move.accuracy - 50) * 0.3;
  }

  // Priority status moves get a bonus
  if (move.effects?.some(e => e.type === 'priority')) {
    score += 8;
  }

  return score;
}
