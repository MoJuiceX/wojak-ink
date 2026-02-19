/**
 * Demo Battle Data
 *
 * A hardcoded battle showcasing the combat system.
 * Uses real move IDs so particles and audio trigger correctly.
 *
 * Demonstrates: normal hits, crits, super effective, not very effective,
 * status effects, healing, and knockout.
 */

import type { CombatType } from './types';
import type { TurnResult } from './battle-state';
import type { BattleData, FighterDisplay } from '@/components/combat/BattleView';

// Fighter A: FIRE type
const DEMO_FIGHTER_A: FighterDisplay = {
  nft_id: 'demo_fighter_a',
  edition: 42,
  type: 'FIRE' as CombatType,
  nature: 'Brave',
  ability: 'Blaze',
  level: 15,
  elo: 1200,
  moves: [
    { id: 'poke_fire_ember', name: 'FUD Spark', power: 40, accuracy: 100, category: 'special' },
    { id: 'poke_fire_flamethrower', name: 'Flamethrower', power: 90, accuracy: 100, category: 'special' },
    { id: 'poke_fire_will-o-wisp', name: 'Spite Flame', power: 0, accuracy: 85, category: 'status' },
    { id: 'poke_fire_flame-charge', name: 'FOMO Rush', power: 50, accuracy: 100, category: 'physical' },
  ],
  // Placeholder - Task 7 will add real image
  imageUrl: '/api/nft/image?edition=42',
};

// Fighter B: WATER type
const DEMO_FIGHTER_B: FighterDisplay = {
  nft_id: 'demo_fighter_b',
  edition: 88,
  type: 'WATER' as CombatType,
  nature: 'Calm',
  ability: 'Torrent',
  level: 14,
  elo: 1180,
  moves: [
    { id: 'poke_water_water-gun', name: 'Tears of Joy', power: 40, accuracy: 100, category: 'special' },
    { id: 'poke_water_bubble-beam', name: 'Bubble Pop', power: 65, accuracy: 100, category: 'special' },
    { id: 'poke_water_bouncy-bubble', name: 'Liquidity Drain', power: 60, accuracy: 100, category: 'special' },
    { id: 'poke_water_withdraw', name: 'HODL', power: 0, accuracy: 100, category: 'status' },
  ],
  // Placeholder - Task 7 will add real image
  imageUrl: '/api/nft/image?edition=88',
};

// Max HP values (approximated from stat calculator at these levels)
const MAX_HP_A = 68; // Fire Lv15
const MAX_HP_B = 65; // Water Lv14

/**
 * 7 turns of scripted battle:
 * Turn 1: Both use basic moves. Normal damage.
 * Turn 2: Fighter A lands a critical hit. Screen shake + orange flash.
 * Turn 3: Fighter B uses super-effective Water on Fire. Green callout.
 * Turn 4: Fighter A applies burn status.
 * Turn 5: Fighter B heals with drain move.
 * Turn 6: Fighter A uses big move. Not very effective callout.
 * Turn 7: Fighter B lands finishing blow. Knockout.
 */
const DEMO_TURNS: TurnResult[] = [
  // Turn 1: Both use basic moves
  {
    turn: 1,
    fighter_a: {
      move: 'poke_fire_ember',
      damage_dealt: 8,
      critical: false,
      effectiveness: 'not_very_effective',
      status_applied: null,
      hp_before: MAX_HP_A,
      hp_after: MAX_HP_A - 12,
    },
    fighter_b: {
      move: 'poke_water_water-gun',
      damage_dealt: 12,
      critical: false,
      effectiveness: 'super_effective',
      status_applied: null,
      hp_before: MAX_HP_B,
      hp_after: MAX_HP_B - 4,
    },
    order: 'a_first',
    end_of_turn: {
      fighter_a_hp: 56,
      fighter_b_hp: 61,
      fighter_a_status: null,
      fighter_b_status: null,
      fighter_a_stat_stages: {},
      fighter_b_stat_stages: {},
      ability_triggered: null,
    },
  },
  // Turn 2: Fighter A lands crit
  {
    turn: 2,
    fighter_a: {
      move: 'poke_fire_flame-charge',
      damage_dealt: 14,
      critical: true,
      effectiveness: 'not_very_effective',
      status_applied: null,
      hp_before: 56,
      hp_after: 56 - 14,
    },
    fighter_b: {
      move: 'poke_water_bubble-beam',
      damage_dealt: 14,
      critical: false,
      effectiveness: 'super_effective',
      status_applied: null,
      hp_before: 61,
      hp_after: 61 - 7,
    },
    order: 'a_first',
    end_of_turn: {
      fighter_a_hp: 42,
      fighter_b_hp: 54,
      fighter_a_status: null,
      fighter_b_status: null,
      fighter_a_stat_stages: { spe: 1 },
      fighter_b_stat_stages: {},
      ability_triggered: null,
    },
  },
  // Turn 3: Super effective showcase
  {
    turn: 3,
    fighter_a: {
      move: 'poke_fire_ember',
      damage_dealt: 6,
      critical: false,
      effectiveness: 'not_very_effective',
      status_applied: null,
      hp_before: 42,
      hp_after: 42 - 16,
    },
    fighter_b: {
      move: 'poke_water_bubble-beam',
      damage_dealt: 16,
      critical: false,
      effectiveness: 'super_effective',
      status_applied: null,
      hp_before: 54,
      hp_after: 54 - 3,
    },
    order: 'b_first',
    end_of_turn: {
      fighter_a_hp: 26,
      fighter_b_hp: 51,
      fighter_a_status: null,
      fighter_b_status: null,
      fighter_a_stat_stages: { spe: 1 },
      fighter_b_stat_stages: {},
      ability_triggered: null,
    },
  },
  // Turn 4: Burn applied
  {
    turn: 4,
    fighter_a: {
      move: 'poke_fire_will-o-wisp',
      damage_dealt: 0,
      critical: false,
      effectiveness: 'neutral',
      status_applied: 'burn',
      hp_before: 26,
      hp_after: 26 - 10,
    },
    fighter_b: {
      move: 'poke_water_water-gun',
      damage_dealt: 10,
      critical: false,
      effectiveness: 'super_effective',
      status_applied: null,
      hp_before: 51,
      hp_after: 51 - 4,
    },
    order: 'a_first',
    end_of_turn: {
      fighter_a_hp: 16,
      fighter_b_hp: 47,
      fighter_a_status: null,
      fighter_b_status: 'burn',
      fighter_a_stat_stages: { spe: 1 },
      fighter_b_stat_stages: {},
      ability_triggered: null,
    },
  },
  // Turn 5: Heal showcase
  {
    turn: 5,
    fighter_a: {
      move: 'poke_fire_flamethrower',
      damage_dealt: 12,
      critical: false,
      effectiveness: 'not_very_effective',
      status_applied: null,
      hp_before: 16,
      hp_after: 16 - 8,
    },
    fighter_b: {
      move: 'poke_water_bouncy-bubble',
      damage_dealt: 8,
      critical: false,
      effectiveness: 'super_effective',
      status_applied: null,
      hp_before: 47,
      hp_after: 47 - 6 + 8 - 3, // Damage from flamethrower, heal from drain, burn tick
      heal_amount: 8,
    },
    order: 'b_first',
    end_of_turn: {
      fighter_a_hp: 8,
      fighter_b_hp: 43,
      fighter_a_status: null,
      fighter_b_status: 'burn',
      fighter_a_stat_stages: { spe: 1 },
      fighter_b_stat_stages: {},
      ability_triggered: null,
    },
  },
  // Turn 6: Not very effective showcase
  {
    turn: 6,
    fighter_a: {
      move: 'poke_fire_flamethrower',
      damage_dealt: 10,
      critical: false,
      effectiveness: 'not_very_effective',
      status_applied: null,
      hp_before: 8,
      hp_after: 8 - 6,
    },
    fighter_b: {
      move: 'poke_water_withdraw',
      damage_dealt: 0,
      critical: false,
      effectiveness: 'neutral',
      status_applied: null,
      hp_before: 43,
      hp_after: 43 - 5 - 3, // Damage and burn tick
    },
    order: 'a_first',
    end_of_turn: {
      fighter_a_hp: 2,
      fighter_b_hp: 32,
      fighter_a_status: null,
      fighter_b_status: 'burn',
      fighter_a_stat_stages: { spe: 1 },
      fighter_b_stat_stages: { def: 1 },
      ability_triggered: null,
    },
  },
  // Turn 7: Knockout
  {
    turn: 7,
    fighter_a: {
      move: 'poke_fire_ember',
      damage_dealt: 4,
      critical: false,
      effectiveness: 'not_very_effective',
      status_applied: null,
      hp_before: 2,
      hp_after: 0,
    },
    fighter_b: {
      move: 'poke_water_bubble-beam',
      damage_dealt: 12,
      critical: false,
      effectiveness: 'super_effective',
      status_applied: null,
      hp_before: 32,
      hp_after: 32 - 2 - 3,
    },
    order: 'b_first', // Water faster, lands KO
    end_of_turn: {
      fighter_a_hp: 0, // KO!
      fighter_b_hp: 27,
      fighter_a_status: null,
      fighter_b_status: 'burn',
      fighter_a_stat_stages: { spe: 1 },
      fighter_b_stat_stages: { def: 1 },
      ability_triggered: null,
    },
  },
];

/**
 * Complete demo battle data ready for BattleView
 */
export const DEMO_BATTLE: BattleData = {
  id: 0,
  status: 'completed',
  currentTurn: 7,
  maxTurns: 50,
  winner: DEMO_FIGHTER_B.nft_id,
  fighterA: DEMO_FIGHTER_A,
  fighterB: DEMO_FIGHTER_B,
  turns: DEMO_TURNS,
  eloChangeA: -12,
  eloChangeB: 15,
  xpAwardedA: 45,
  xpAwardedB: 80,
};
