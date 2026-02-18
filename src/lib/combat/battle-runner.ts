// src/lib/combat/battle-runner.ts
// Full auto-battle orchestrator — init states → loop turns → tiebreak

import { initFighterState, initBattleState } from './battle-state';
import type { FighterData, BattleState, TurnResult } from './battle-state';
import { resolveTurn } from './turn-resolver';
import { chooseMove } from './ai-strategist';
import { getAbilityEffect } from './ability-effects';

export interface BattleResult {
  status: 'finished';
  winnerId: string | null;
  turns: TurnResult[];
  totalTurns: number;
}

/**
 * Apply battle_start ability effects (stat multipliers) to both fighters.
 */
function applyBattleStartAbilities(battle: BattleState): void {
  for (const [fighter, opponent] of [
    [battle.fighterA, battle.fighterB],
    [battle.fighterB, battle.fighterA],
  ] as const) {
    const effect = getAbilityEffect(fighter.ability, 'battle_start', {
      self: fighter, opponent,
    });
    if (effect?.selfStatMultipliers) {
      for (const [stat, mult] of Object.entries(effect.selfStatMultipliers)) {
        if (stat in fighter.effectiveStats) {
          (fighter.effectiveStats as any)[stat] = Math.floor((fighter.effectiveStats as any)[stat] * mult);
        }
      }
    }
    if (effect?.opponentStatMultipliers) {
      for (const [stat, mult] of Object.entries(effect.opponentStatMultipliers)) {
        if (stat in opponent.effectiveStats) {
          (opponent.effectiveStats as any)[stat] = Math.floor((opponent.effectiveStats as any)[stat] * mult);
        }
      }
    }
  }
}

/**
 * Run a full auto-battle between two fighters.
 * Both fighters use AI to select moves.
 * Max 50 turns — tiebreak by HP percentage.
 */
export function runAutoBattle(fighterAData: FighterData, fighterBData: FighterData): BattleResult {
  const a = initFighterState(fighterAData);
  const b = initFighterState(fighterBData);
  const battle = initBattleState(a, b);

  // Apply battle_start abilities
  applyBattleStartAbilities(battle);

  while (battle.status === 'active' && battle.turnNumber < battle.maxTurns) {
    const moveA = chooseMove(battle.fighterA, battle.fighterB);
    const moveB = chooseMove(battle.fighterB, battle.fighterA);
    resolveTurn(battle, moveA, moveB);
  }

  // Max turns tiebreak: lower HP% loses
  if (battle.status === 'active') {
    const pctA = battle.fighterA.currentHP / battle.fighterA.maxHP;
    const pctB = battle.fighterB.currentHP / battle.fighterB.maxHP;
    battle.winnerId = pctA > pctB ? a.nftId : pctB > pctA ? b.nftId : null;
    battle.status = 'finished';
  }

  return {
    status: 'finished',
    winnerId: battle.winnerId,
    turns: battle.turns,
    totalTurns: battle.turnNumber,
  };
}
