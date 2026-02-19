// src/lib/combat/battle-state.ts
// Battle state initialization — ported from ClawCombat battle-engine.js buildAgentBattleState()

import type { CombatType } from './types';
import { calculateAllStats } from './stat-calculator';

export interface FighterState {
  nftId: string;
  type: CombatType;
  nature: string;
  ability: string;
  moves: string[];        // 4 move IDs
  level: number;
  maxHP: number;
  currentHP: number;
  status: string | null;  // 'burn' | 'paralysis' | 'poison' | 'freeze' | 'sleep' | 'confusion' | null
  statusTurns: number;
  statStages: { atk: number; def: number; spa: number; spd: number; spe: number };
  effectiveStats: { hp: number; attack: number; defense: number; sp_atk: number; sp_def: number; speed: number };
  // Internal tracking flags
  sturdyUsed: boolean;
  flinched: boolean;
  leechSeeded: boolean;
  cursed: boolean;
}

export interface TurnResult {
  turn: number;
  fighter_a: {
    move: string;
    damage_dealt: number;
    critical: boolean;
    effectiveness: 'super_effective' | 'not_very_effective' | 'neutral' | 'immune';
    status_applied: string | null;
    hp_before: number;
    hp_after: number;
    heal_amount?: number;
  };
  fighter_b: {
    move: string;
    damage_dealt: number;
    critical: boolean;
    effectiveness: 'super_effective' | 'not_very_effective' | 'neutral' | 'immune';
    status_applied: string | null;
    hp_before: number;
    hp_after: number;
    heal_amount?: number;
  };
  order: 'a_first' | 'b_first';
  end_of_turn: {
    fighter_a_hp: number;
    fighter_b_hp: number;
    fighter_a_status: string | null;
    fighter_b_status: string | null;
    fighter_a_stat_stages: Record<string, number>;
    fighter_b_stat_stages: Record<string, number>;
    ability_triggered: string | null;
  };
}

export interface BattleState {
  id?: number;
  fighterA: FighterState;
  fighterB: FighterState;
  turnNumber: number;
  status: 'active' | 'finished';
  winnerId: string | null;
  turns: TurnResult[];
  maxTurns: number; // 50
}

export interface FighterData {
  nftId: string;
  type: CombatType;
  nature: string;
  ability: string;
  moves: string[];
  level: number;
}

/**
 * Initialize a FighterState from raw fighter data.
 * Calculates stats using stat-calculator, sets HP to max, zeroes all stat stages.
 */
export function initFighterState(data: FighterData): FighterState {
  const stats = calculateAllStats(data.type, data.level, data.nature);

  return {
    nftId: data.nftId,
    type: data.type,
    nature: data.nature,
    ability: data.ability,
    moves: [...data.moves],
    level: data.level,
    maxHP: stats.hp,
    currentHP: stats.hp,
    status: null,
    statusTurns: 0,
    statStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    effectiveStats: { ...stats },
    sturdyUsed: false,
    flinched: false,
    leechSeeded: false,
    cursed: false,
  };
}

/**
 * Initialize a BattleState from two fighter states.
 */
export function initBattleState(fighterA: FighterState, fighterB: FighterState): BattleState {
  return {
    fighterA,
    fighterB,
    turnNumber: 0,
    status: 'active',
    winnerId: null,
    turns: [],
    maxTurns: 50,
  };
}
