/**
 * Demo Battle Data
 *
 * Multiple hardcoded battles showcasing the combat system.
 * Uses real move IDs so particles and audio trigger correctly.
 * Demo cycles through DEMO_BATTLES so users see different types, natures, and matchups.
 */

import type { CombatType } from './types';
import type { TurnResult } from './battle-state';
import type { BattleData, FighterDisplay } from '@/components/combat/BattleView';
import { getNftImageUrl } from '@/services/constants';

// ─── Helper: build a fighter ─────────────────────────────────────────────────
function demoFighter(
  id: string,
  edition: number,
  type: CombatType,
  nature: string,
  ability: string,
  level: number,
  elo: number,
  moves: { id: string; name: string; power: number; accuracy: number; category: string }[],
): FighterDisplay {
  return {
    nft_id: id,
    edition,
    type,
    nature,
    ability,
    level,
    elo,
    moves,
    imageUrl: getNftImageUrl(edition),
  };
}

// ─── Helper: one turn ────────────────────────────────────────────────────────
function turn(
  t: number,
  order: 'a_first' | 'b_first',
  a: { move: string; damage: number; crit: boolean; eff: TurnResult['fighter_a']['effectiveness']; hpBefore: number; hpAfter: number; status?: string | null; heal?: number },
  b: { move: string; damage: number; crit: boolean; eff: TurnResult['fighter_a']['effectiveness']; hpBefore: number; hpAfter: number; status?: string | null; heal?: number },
  endA: number,
  endB: number,
  statStagesA: Record<string, number> = {},
  statStagesB: Record<string, number> = {},
): TurnResult {
  return {
    turn: t,
    order,
    fighter_a: {
      move: a.move,
      damage_dealt: a.damage,
      critical: a.crit,
      effectiveness: a.eff,
      status_applied: a.status ?? null,
      hp_before: a.hpBefore,
      hp_after: a.hpAfter,
      heal_amount: a.heal,
    },
    fighter_b: {
      move: b.move,
      damage_dealt: b.damage,
      critical: b.crit,
      effectiveness: b.eff,
      status_applied: b.status ?? null,
      hp_before: b.hpBefore,
      hp_after: b.hpAfter,
      heal_amount: b.heal,
    },
    end_of_turn: {
      fighter_a_hp: endA,
      fighter_b_hp: endB,
      fighter_a_status: null,
      fighter_b_status: null,
      fighter_a_stat_stages: statStagesA,
      fighter_b_stat_stages: statStagesB,
      ability_triggered: null,
    },
  };
}

// ─── Demo fighter pool (12 fighters, varied types and natures) ───────────────
const F = {
  fire: demoFighter('demo_42', 42, 'FIRE', 'Brave', 'Blaze', 15, 1200,
    [
      { id: 'poke_fire_ember', name: 'FUD Spark', power: 40, accuracy: 100, category: 'special' },
      { id: 'poke_fire_flamethrower', name: 'Flamethrower', power: 90, accuracy: 100, category: 'special' },
      { id: 'poke_fire_will-o-wisp', name: 'Spite Flame', power: 0, accuracy: 85, category: 'status' },
      { id: 'poke_fire_flame-charge', name: 'FOMO Rush', power: 50, accuracy: 100, category: 'physical' },
    ]),
  water: demoFighter('demo_88', 88, 'WATER', 'Calm', 'Torrent', 14, 1180,
    [
      { id: 'poke_water_water-gun', name: 'Tears of Joy', power: 40, accuracy: 100, category: 'special' },
      { id: 'poke_water_bubble-beam', name: 'Bubble Pop', power: 65, accuracy: 100, category: 'special' },
      { id: 'poke_water_bouncy-bubble', name: 'Liquidity Drain', power: 60, accuracy: 100, category: 'special' },
      { id: 'poke_water_withdraw', name: 'HODL', power: 0, accuracy: 100, category: 'status' },
    ]),
  electric: demoFighter('demo_7', 7, 'ELECTRIC', 'Jolly', 'Static', 12, 1150,
    [
      { id: 'poke_electric_thunder-shock', name: 'Zap', power: 40, accuracy: 100, category: 'special' },
      { id: 'poke_electric_thunder-punch', name: 'Static Shock', power: 75, accuracy: 100, category: 'physical' },
      { id: 'poke_electric_thunder-wave', name: 'Thunder FUD', power: 0, accuracy: 90, category: 'status' },
      { id: 'poke_electric_volt-tackle', name: 'YOLO Charge', power: 120, accuracy: 100, category: 'physical' },
    ]),
  grass: demoFighter('demo_1', 1, 'GRASS', 'Adamant', 'Overgrow', 16, 1220,
    [
      { id: 'poke_grass_vine-whip', name: 'Touch Grass', power: 45, accuracy: 100, category: 'physical' },
      { id: 'poke_grass_solar-blade', name: 'Solar Cope', power: 110, accuracy: 100, category: 'physical' },
      { id: 'poke_grass_mega-drain', name: 'Siphon Green', power: 40, accuracy: 100, category: 'special' },
      { id: 'poke_grass_sleep-powder', name: 'Touch Grass Nap', power: 0, accuracy: 75, category: 'status' },
    ]),
  ice: demoFighter('demo_5', 5, 'ICE', 'Modest', 'Snow Cloak', 13, 1170,
    [
      { id: 'poke_ice_ice-punch', name: 'Cold Punch', power: 75, accuracy: 100, category: 'physical' },
      { id: 'poke_ice_aurora-beam', name: 'Aurora Cope', power: 65, accuracy: 100, category: 'special' },
      { id: 'poke_ice_blizzard', name: 'Blizzard', power: 110, accuracy: 70, category: 'special' },
      { id: 'poke_ice_icicle-crash', name: 'Avalanche Drop', power: 85, accuracy: 90, category: 'physical' },
    ]),
  martial: demoFighter('demo_333', 333, 'MARTIAL', 'Hardy', 'Guts', 14, 1190,
    [
      { id: 'poke_fighting_karate-chop', name: 'Karate Chop', power: 50, accuracy: 100, category: 'physical' },
      { id: 'poke_fighting_drain-punch', name: 'Gym Bro Punch', power: 75, accuracy: 100, category: 'physical' },
      { id: 'poke_fighting_bulk-up', name: 'Bulk Up', power: 0, accuracy: 100, category: 'status' },
      { id: 'poke_fighting_focus-blast', name: 'Spirit Bomb', power: 120, accuracy: 70, category: 'special' },
    ]),
  venom: demoFighter('demo_69', 69, 'VENOM', 'Timid', 'Poison Point', 11, 1120,
    [
      { id: 'poke_poison_acid', name: 'Acid Take', power: 40, accuracy: 100, category: 'special' },
      { id: 'poke_poison_sludge', name: 'Sewer Water', power: 65, accuracy: 100, category: 'special' },
      { id: 'poke_poison_poison-powder', name: 'Bad Vibes', power: 0, accuracy: 75, category: 'status' },
      { id: 'poke_poison_purify', name: 'Touch Grass Cure', power: 0, accuracy: 100, category: 'status' },
    ]),
  earth: demoFighter('demo_404', 404, 'EARTH', 'Bold', 'Sand Veil', 15, 1210,
    [
      { id: 'poke_ground_bone-club', name: 'Bonk', power: 65, accuracy: 85, category: 'physical' },
      { id: 'poke_ground_scorching-sands', name: 'Hot Sand', power: 70, accuracy: 100, category: 'special' },
      { id: 'poke_ground_shore-up', name: 'Grounded', power: 0, accuracy: 100, category: 'status' },
      { id: 'poke_ground_headlong-rush', name: 'Face Plant', power: 110, accuracy: 100, category: 'physical' },
    ]),
  air: demoFighter('demo_777', 777, 'AIR', 'Naive', 'Pressure', 17, 1230,
    [
      { id: 'poke_flying_gust', name: 'Hot Air', power: 40, accuracy: 100, category: 'special' },
      { id: 'poke_flying_air-slash', name: 'Air Cutter', power: 75, accuracy: 95, category: 'special' },
      { id: 'poke_flying_brave-bird', name: 'Dive Bomb', power: 120, accuracy: 100, category: 'physical' },
      { id: 'poke_flying_roost', name: 'Grass Landing', power: 0, accuracy: 100, category: 'status' },
    ]),
  psyche: demoFighter('demo_123', 123, 'PSYCHE', 'Quiet', 'Inner Focus', 12, 1160,
    [
      { id: 'poke_psychic_confusion', name: 'Confusion Posting', power: 50, accuracy: 100, category: 'special' },
      { id: 'poke_psychic_psybeam', name: 'Brain Beam', power: 65, accuracy: 100, category: 'special' },
      { id: 'poke_psychic_dream-eater', name: 'Nightmare Farm', power: 100, accuracy: 100, category: 'special' },
      { id: 'poke_psychic_hypnosis', name: 'Doom Scroll', power: 0, accuracy: 60, category: 'status' },
    ]),
  dragon: demoFighter('demo_555', 555, 'DRAGON', 'Adamant', 'Intimidate', 14, 1200,
    [
      { id: 'poke_dragon_dragon-breath', name: 'Dragon Breath', power: 60, accuracy: 100, category: 'special' },
      { id: 'poke_dragon_dragon-claw', name: 'Dragon Claw', power: 80, accuracy: 100, category: 'physical' },
      { id: 'poke_dragon_dragon-dance', name: 'Dragon Dance', power: 0, accuracy: 100, category: 'status' },
      { id: 'poke_dragon_draco-meteor', name: 'Draco Meteor', power: 110, accuracy: 90, category: 'special' },
    ]),
  shadow: demoFighter('demo_199', 199, 'SHADOW', 'Sassy', 'Moxie', 13, 1180,
    [
      { id: 'poke_dark_bite', name: 'Dark Bite', power: 60, accuracy: 100, category: 'physical' },
      { id: 'poke_dark_dark-pulse', name: 'Dark Pulse', power: 80, accuracy: 100, category: 'special' },
      { id: 'poke_dark_nasty-plot', name: 'Evil Plan', power: 0, accuracy: 100, category: 'status' },
      { id: 'poke_dark_foul-play', name: 'Dirty Play', power: 95, accuracy: 100, category: 'physical' },
    ]),
  metal: demoFighter('demo_666', 666, 'METAL', 'Careful', 'Sturdy', 15, 1210,
    [
      { id: 'poke_steel_bullet-punch', name: 'Bullet Punch', power: 40, accuracy: 100, category: 'physical' },
      { id: 'poke_steel_flash-cannon', name: 'Flash Cannon', power: 80, accuracy: 100, category: 'special' },
      { id: 'poke_steel_iron-defense', name: 'Titanium Hide', power: 0, accuracy: 100, category: 'status' },
      { id: 'poke_steel_iron-head', name: 'Headbutt', power: 80, accuracy: 100, category: 'physical' },
    ]),
  mystic: demoFighter('demo_21', 21, 'MYSTIC', 'Gentle', 'Cute Charm', 10, 1100,
    [
      { id: 'poke_fairy_disarming-voice', name: 'Soft Uwu', power: 40, accuracy: 100, category: 'special' },
      { id: 'poke_fairy_draining-kiss', name: 'Healing Kiss', power: 50, accuracy: 100, category: 'special' },
      { id: 'poke_fairy_moonlight', name: 'Moonlight Heal', power: 0, accuracy: 100, category: 'status' },
      { id: 'poke_fairy_charm', name: 'Charm Offensive', power: 0, accuracy: 100, category: 'status' },
    ]),
  insect: demoFighter('demo_100', 100, 'INSECT', 'Hasty', 'Swarm', 14, 1190,
    [
      { id: 'poke_bug_signal-beam', name: 'Signal Boost', power: 75, accuracy: 100, category: 'special' },
      { id: 'poke_bug_leech-life', name: 'Leech', power: 80, accuracy: 100, category: 'physical' },
      { id: 'poke_bug_string-shot', name: 'Sticky Thread', power: 0, accuracy: 95, category: 'status' },
      { id: 'poke_bug_megahorn', name: 'Hive Mind Lance', power: 120, accuracy: 85, category: 'physical' },
    ]),
  stone: demoFighter('demo_300', 300, 'STONE', 'Impish', 'Sturdy', 13, 1170,
    [
      { id: 'poke_rock_smack-down', name: 'Throw Rock', power: 50, accuracy: 100, category: 'physical' },
      { id: 'poke_rock_rock-slide', name: 'Rockslide', power: 75, accuracy: 90, category: 'physical' },
      { id: 'poke_rock_rock-polish', name: 'Polish Grind', power: 0, accuracy: 100, category: 'status' },
      { id: 'poke_rock_stone-edge', name: 'Stone Edge', power: 100, accuracy: 80, category: 'physical' },
    ]),
  ghost: demoFighter('demo_999', 999, 'GHOST', 'Lonely', 'Cursed Body', 11, 1130,
    [
      { id: 'poke_ghost_shadow-sneak', name: 'Spooky Quick', power: 40, accuracy: 100, category: 'physical' },
      { id: 'poke_ghost_shadow-ball', name: 'Shadow Ball', power: 80, accuracy: 100, category: 'special' },
      { id: 'poke_ghost_confuse-ray', name: 'Doomer Spiral', power: 0, accuracy: 100, category: 'status' },
      { id: 'poke_ghost_hex', name: 'Bad Omen', power: 65, accuracy: 100, category: 'special' },
    ]),
};

// ─── Battle 1: Fire vs Water (original, Water wins) ────────────────────────
const BATTLE_1: BattleData = {
  id: 1,
  status: 'completed',
  currentTurn: 5,
  maxTurns: 50,
  winner: F.water.nft_id,
  fighterA: F.fire,
  fighterB: F.water,
  turns: [
    turn(1, 'a_first', { move: 'poke_fire_ember', damage: 8, crit: false, eff: 'not_very_effective', hpBefore: 68, hpAfter: 56 }, { move: 'poke_water_water-gun', damage: 12, crit: false, eff: 'super_effective', hpBefore: 65, hpAfter: 61 }, 56, 61),
    turn(2, 'a_first', { move: 'poke_fire_flame-charge', damage: 14, crit: true, eff: 'not_very_effective', hpBefore: 56, hpAfter: 42 }, { move: 'poke_water_bubble-beam', damage: 14, crit: false, eff: 'super_effective', hpBefore: 61, hpAfter: 54 }, 42, 54),
    turn(3, 'b_first', { move: 'poke_fire_ember', damage: 6, crit: false, eff: 'not_very_effective', hpBefore: 42, hpAfter: 26 }, { move: 'poke_water_bubble-beam', damage: 16, crit: false, eff: 'super_effective', hpBefore: 54, hpAfter: 51 }, 26, 51),
    turn(4, 'a_first', { move: 'poke_fire_will-o-wisp', damage: 0, crit: false, eff: 'neutral', hpBefore: 26, hpAfter: 16, status: null }, { move: 'poke_water_water-gun', damage: 10, crit: false, eff: 'super_effective', hpBefore: 51, hpAfter: 47 }, 16, 47),
    turn(5, 'b_first', { move: 'poke_fire_flamethrower', damage: 10, crit: false, eff: 'not_very_effective', hpBefore: 16, hpAfter: 0 }, { move: 'poke_water_bubble-beam', damage: 12, crit: false, eff: 'super_effective', hpBefore: 47, hpAfter: 35 }, 0, 35),
  ],
  eloChangeA: -12,
  eloChangeB: 15,
  xpAwardedA: 45,
  xpAwardedB: 80,
};

// ─── Battle 2: Electric vs Grass (Electric wins) ─────────────────────────────
const BATTLE_2: BattleData = {
  id: 2,
  status: 'completed',
  currentTurn: 4,
  maxTurns: 50,
  winner: F.electric.nft_id,
  fighterA: F.electric,
  fighterB: F.grass,
  turns: [
    turn(1, 'a_first', { move: 'poke_electric_thunder-shock', damage: 11, crit: false, eff: 'neutral', hpBefore: 52, hpAfter: 52 }, { move: 'poke_grass_vine-whip', damage: 9, crit: false, eff: 'neutral', hpBefore: 62, hpAfter: 51 }, 52, 51),
    turn(2, 'a_first', { move: 'poke_electric_thunder-punch', damage: 18, crit: false, eff: 'neutral', hpBefore: 52, hpAfter: 43 }, { move: 'poke_grass_mega-drain', damage: 7, crit: false, eff: 'neutral', hpBefore: 51, hpAfter: 38 }, 43, 38),
    turn(3, 'b_first', { move: 'poke_electric_thunder-wave', damage: 0, crit: false, eff: 'neutral', hpBefore: 43, hpAfter: 43 }, { move: 'poke_grass_solar-blade', damage: 14, crit: false, eff: 'neutral', hpBefore: 38, hpAfter: 29 }, 43, 29),
    turn(4, 'a_first', { move: 'poke_electric_volt-tackle', damage: 28, crit: true, eff: 'neutral', hpBefore: 43, hpAfter: 32 }, { move: 'poke_grass_vine-whip', damage: 9, crit: false, eff: 'neutral', hpBefore: 29, hpAfter: 0 }, 32, 0),
  ],
  eloChangeA: 14,
  eloChangeB: -11,
  xpAwardedA: 72,
  xpAwardedB: 38,
};

// ─── Battle 3: Ice vs Dragon (Dragon wins) ───────────────────────────────────
const BATTLE_3: BattleData = {
  id: 3,
  status: 'completed',
  currentTurn: 5,
  maxTurns: 50,
  winner: F.dragon.nft_id,
  fighterA: F.ice,
  fighterB: F.dragon,
  turns: [
    turn(1, 'b_first', { move: 'poke_ice_ice-punch', damage: 12, crit: false, eff: 'super_effective', hpBefore: 55, hpAfter: 43 }, { move: 'poke_dragon_dragon-breath', damage: 10, crit: false, eff: 'neutral', hpBefore: 58, hpAfter: 55 }, 43, 55),
    turn(2, 'a_first', { move: 'poke_ice_blizzard', damage: 16, crit: false, eff: 'neutral', hpBefore: 43, hpAfter: 39 }, { move: 'poke_dragon_dragon-claw', damage: 14, crit: false, eff: 'neutral', hpBefore: 55, hpAfter: 41 }, 39, 41),
    turn(3, 'a_first', { move: 'poke_ice_aurora-beam', damage: 10, crit: false, eff: 'neutral', hpBefore: 39, hpAfter: 25 }, { move: 'poke_dragon_dragon-dance', damage: 0, crit: false, eff: 'neutral', hpBefore: 41, hpAfter: 41 }, 25, 41),
    turn(4, 'b_first', { move: 'poke_ice_icicle-crash', damage: 11, crit: false, eff: 'neutral', hpBefore: 25, hpAfter: 14 }, { move: 'poke_dragon_draco-meteor', damage: 22, crit: false, eff: 'neutral', hpBefore: 41, hpAfter: 19 }, 14, 19),
    turn(5, 'a_first', { move: 'poke_ice_ice-punch', damage: 8, crit: false, eff: 'super_effective', hpBefore: 14, hpAfter: 0 }, { move: 'poke_dragon_dragon-claw', damage: 14, crit: false, eff: 'neutral', hpBefore: 19, hpAfter: 5 }, 0, 5),
  ],
  eloChangeA: -13,
  eloChangeB: 16,
  xpAwardedA: 42,
  xpAwardedB: 85,
};

// ─── Battle 4: Martial vs Venom (Martial wins) ───────────────────────────────
const BATTLE_4: BattleData = {
  id: 4,
  status: 'completed',
  currentTurn: 4,
  maxTurns: 50,
  winner: F.martial.nft_id,
  fighterA: F.martial,
  fighterB: F.venom,
  turns: [
    turn(1, 'a_first', { move: 'poke_fighting_karate-chop', damage: 14, crit: true, eff: 'neutral', hpBefore: 60, hpAfter: 46 }, { move: 'poke_poison_acid', damage: 6, crit: false, eff: 'neutral', hpBefore: 48, hpAfter: 54 }, 46, 54),
    turn(2, 'a_first', { move: 'poke_fighting_drain-punch', damage: 16, crit: false, eff: 'neutral', hpBefore: 46, hpAfter: 38 }, { move: 'poke_poison_sludge', damage: 10, crit: false, eff: 'neutral', hpBefore: 54, hpAfter: 38 }, 38, 38),
    turn(3, 'b_first', { move: 'poke_fighting_bulk-up', damage: 0, crit: false, eff: 'neutral', hpBefore: 38, hpAfter: 38 }, { move: 'poke_poison_poison-powder', damage: 0, crit: false, eff: 'neutral', hpBefore: 38, hpAfter: 38, status: 'poison' }, 38, 38),
    turn(4, 'a_first', { move: 'poke_fighting_focus-blast', damage: 36, crit: false, eff: 'neutral', hpBefore: 38, hpAfter: 12 }, { move: 'poke_poison_sludge', damage: 10, crit: false, eff: 'neutral', hpBefore: 38, hpAfter: 0 }, 12, 0),
  ],
  eloChangeA: 15,
  eloChangeB: -12,
  xpAwardedA: 78,
  xpAwardedB: 40,
};

// ─── Battle 5: Earth vs Air (Earth wins) ──────────────────────────────────────
const BATTLE_5: BattleData = {
  id: 5,
  status: 'completed',
  currentTurn: 5,
  maxTurns: 50,
  winner: F.earth.nft_id,
  fighterA: F.earth,
  fighterB: F.air,
  turns: [
    turn(1, 'b_first', { move: 'poke_ground_bone-club', damage: 10, crit: false, eff: 'neutral', hpBefore: 68, hpAfter: 58 }, { move: 'poke_flying_gust', damage: 8, crit: false, eff: 'neutral', hpBefore: 70, hpAfter: 62 }, 58, 62),
    turn(2, 'a_first', { move: 'poke_ground_scorching-sands', damage: 14, crit: false, eff: 'super_effective', hpBefore: 58, hpAfter: 48 }, { move: 'poke_flying_air-slash', damage: 12, crit: false, eff: 'neutral', hpBefore: 62, hpAfter: 50 }, 48, 50),
    turn(3, 'a_first', { move: 'poke_ground_shore-up', damage: 0, crit: false, eff: 'neutral', hpBefore: 48, hpAfter: 68, heal: 20 }, { move: 'poke_flying_brave-bird', damage: 22, crit: false, eff: 'neutral', hpBefore: 50, hpAfter: 28 }, 68, 28),
    turn(4, 'b_first', { move: 'poke_ground_headlong-rush', damage: 20, crit: false, eff: 'neutral', hpBefore: 68, hpAfter: 48 }, { move: 'poke_flying_roost', damage: 0, crit: false, eff: 'neutral', hpBefore: 28, hpAfter: 48, heal: 20 }, 48, 48),
    turn(5, 'a_first', { move: 'poke_ground_headlong-rush', damage: 24, crit: true, eff: 'neutral', hpBefore: 48, hpAfter: 24 }, { move: 'poke_flying_gust', damage: 8, crit: false, eff: 'neutral', hpBefore: 48, hpAfter: 0 }, 24, 0),
  ],
  eloChangeA: 16,
  eloChangeB: -14,
  xpAwardedA: 82,
  xpAwardedB: 35,
};

// ─── Battle 6: Psyche vs Shadow (Psyche wins) ─────────────────────────────────
const BATTLE_6: BattleData = {
  id: 6,
  status: 'completed',
  currentTurn: 4,
  maxTurns: 50,
  winner: F.psyche.nft_id,
  fighterA: F.psyche,
  fighterB: F.shadow,
  turns: [
    turn(1, 'a_first', { move: 'poke_psychic_confusion', damage: 9, crit: false, eff: 'super_effective', hpBefore: 50, hpAfter: 50 }, { move: 'poke_dark_bite', damage: 10, crit: false, eff: 'neutral', hpBefore: 54, hpAfter: 44 }, 50, 44),
    turn(2, 'b_first', { move: 'poke_psychic_psybeam', damage: 12, crit: false, eff: 'super_effective', hpBefore: 50, hpAfter: 38 }, { move: 'poke_dark_nasty-plot', damage: 0, crit: false, eff: 'neutral', hpBefore: 44, hpAfter: 44 }, 38, 44),
    turn(3, 'a_first', { move: 'poke_psychic_dream-eater', damage: 18, crit: false, eff: 'super_effective', hpBefore: 38, hpAfter: 29, heal: 9 }, { move: 'poke_dark_dark-pulse', damage: 12, crit: false, eff: 'neutral', hpBefore: 44, hpAfter: 26 }, 29, 26),
    turn(4, 'a_first', { move: 'poke_psychic_psybeam', damage: 14, crit: true, eff: 'super_effective', hpBefore: 29, hpAfter: 15 }, { move: 'poke_dark_bite', damage: 10, crit: false, eff: 'neutral', hpBefore: 26, hpAfter: 0 }, 15, 0),
  ],
  eloChangeA: 13,
  eloChangeB: -11,
  xpAwardedA: 70,
  xpAwardedB: 42,
};

// ─── Battle 7: Metal vs Mystic (Metal wins) ───────────────────────────────────
const BATTLE_7: BattleData = {
  id: 7,
  status: 'completed',
  currentTurn: 4,
  maxTurns: 50,
  winner: F.metal.nft_id,
  fighterA: F.metal,
  fighterB: F.mystic,
  turns: [
    turn(1, 'a_first', { move: 'poke_steel_bullet-punch', damage: 8, crit: false, eff: 'neutral', hpBefore: 66, hpAfter: 58 }, { move: 'poke_fairy_disarming-voice', damage: 6, crit: false, eff: 'neutral', hpBefore: 45, hpAfter: 39 }, 58, 39),
    turn(2, 'a_first', { move: 'poke_steel_flash-cannon', damage: 16, crit: false, eff: 'neutral', hpBefore: 58, hpAfter: 50 }, { move: 'poke_fairy_draining-kiss', damage: 10, crit: false, eff: 'neutral', hpBefore: 39, hpAfter: 34, heal: 5 }, 50, 34),
    turn(3, 'b_first', { move: 'poke_steel_iron-defense', damage: 0, crit: false, eff: 'neutral', hpBefore: 50, hpAfter: 50 }, { move: 'poke_fairy_moonlight', damage: 0, crit: false, eff: 'neutral', hpBefore: 34, hpAfter: 45, heal: 11 }, 50, 45),
    turn(4, 'a_first', { move: 'poke_steel_iron-head', damage: 18, crit: false, eff: 'neutral', hpBefore: 50, hpAfter: 32 }, { move: 'poke_fairy_disarming-voice', damage: 6, crit: false, eff: 'neutral', hpBefore: 45, hpAfter: 0 }, 32, 0),
  ],
  eloChangeA: 12,
  eloChangeB: -10,
  xpAwardedA: 65,
  xpAwardedB: 28,
};

// ─── Battle 8: Insect vs Stone (Insect wins) ─────────────────────────────────
const BATTLE_8: BattleData = {
  id: 8,
  status: 'completed',
  currentTurn: 4,
  maxTurns: 50,
  winner: F.insect.nft_id,
  fighterA: F.insect,
  fighterB: F.stone,
  turns: [
    turn(1, 'a_first', { move: 'poke_bug_signal-beam', damage: 12, crit: false, eff: 'neutral', hpBefore: 58, hpAfter: 58 }, { move: 'poke_rock_smack-down', damage: 10, crit: false, eff: 'neutral', hpBefore: 58, hpAfter: 48 }, 58, 48),
    turn(2, 'b_first', { move: 'poke_bug_leech-life', damage: 14, crit: false, eff: 'neutral', hpBefore: 58, hpAfter: 51, heal: 7 }, { move: 'poke_rock_rock-slide', damage: 14, crit: false, eff: 'neutral', hpBefore: 48, hpAfter: 34 }, 51, 34),
    turn(3, 'a_first', { move: 'poke_bug_string-shot', damage: 0, crit: false, eff: 'neutral', hpBefore: 51, hpAfter: 51 }, { move: 'poke_rock_stone-edge', damage: 18, crit: true, eff: 'neutral', hpBefore: 34, hpAfter: 16 }, 51, 16),
    turn(4, 'a_first', { move: 'poke_bug_megahorn', damage: 24, crit: false, eff: 'neutral', hpBefore: 51, hpAfter: 33 }, { move: 'poke_rock_rock-slide', damage: 14, crit: false, eff: 'neutral', hpBefore: 16, hpAfter: 0 }, 33, 0),
  ],
  eloChangeA: 14,
  eloChangeB: -12,
  xpAwardedA: 75,
  xpAwardedB: 38,
};

// ─── Battle 9: Ghost vs Fire (Ghost wins) ────────────────────────────────────
const BATTLE_9: BattleData = {
  id: 9,
  status: 'completed',
  currentTurn: 5,
  maxTurns: 50,
  winner: F.ghost.nft_id,
  fighterA: F.ghost,
  fighterB: F.fire,
  turns: [
    turn(1, 'a_first', { move: 'poke_ghost_shadow-sneak', damage: 7, crit: false, eff: 'neutral', hpBefore: 46, hpAfter: 46 }, { move: 'poke_fire_ember', damage: 8, crit: false, eff: 'neutral', hpBefore: 68, hpAfter: 61 }, 46, 61),
    turn(2, 'b_first', { move: 'poke_ghost_shadow-ball', damage: 14, crit: false, eff: 'neutral', hpBefore: 46, hpAfter: 32 }, { move: 'poke_fire_flamethrower', damage: 16, crit: false, eff: 'neutral', hpBefore: 61, hpAfter: 45 }, 32, 45),
    turn(3, 'a_first', { move: 'poke_ghost_confuse-ray', damage: 0, crit: false, eff: 'neutral', hpBefore: 32, hpAfter: 32 }, { move: 'poke_fire_flame-charge', damage: 10, crit: false, eff: 'neutral', hpBefore: 45, hpAfter: 35 }, 32, 35),
    turn(4, 'b_first', { move: 'poke_ghost_hex', damage: 12, crit: false, eff: 'neutral', hpBefore: 32, hpAfter: 20 }, { move: 'poke_fire_ember', damage: 8, crit: false, eff: 'neutral', hpBefore: 35, hpAfter: 27 }, 20, 27),
    turn(5, 'a_first', { move: 'poke_ghost_shadow-ball', damage: 14, crit: true, eff: 'neutral', hpBefore: 20, hpAfter: 6 }, { move: 'poke_fire_flame-charge', damage: 10, crit: false, eff: 'neutral', hpBefore: 27, hpAfter: 0 }, 6, 0),
  ],
  eloChangeA: 15,
  eloChangeB: -13,
  xpAwardedA: 80,
  xpAwardedB: 40,
};

// ─── Battle 10: Grass vs Water (Grass wins) ───────────────────────────────────
const BATTLE_10: BattleData = {
  id: 10,
  status: 'completed',
  currentTurn: 4,
  maxTurns: 50,
  winner: F.grass.nft_id,
  fighterA: F.grass,
  fighterB: F.water,
  turns: [
    turn(1, 'a_first', { move: 'poke_grass_vine-whip', damage: 11, crit: false, eff: 'super_effective', hpBefore: 62, hpAfter: 62 }, { move: 'poke_water_water-gun', damage: 8, crit: false, eff: 'not_very_effective', hpBefore: 65, hpAfter: 54 }, 62, 54),
    turn(2, 'b_first', { move: 'poke_grass_mega-drain', damage: 12, crit: false, eff: 'super_effective', hpBefore: 62, hpAfter: 55, heal: 6 }, { move: 'poke_water_bubble-beam', damage: 10, crit: false, eff: 'not_very_effective', hpBefore: 54, hpAfter: 44 }, 55, 44),
    turn(3, 'a_first', { move: 'poke_grass_solar-blade', damage: 20, crit: false, eff: 'super_effective', hpBefore: 55, hpAfter: 45 }, { move: 'poke_water_withdraw', damage: 0, crit: false, eff: 'neutral', hpBefore: 44, hpAfter: 44 }, 45, 44),
    turn(4, 'a_first', { move: 'poke_grass_solar-blade', damage: 22, crit: true, eff: 'super_effective', hpBefore: 45, hpAfter: 35 }, { move: 'poke_water_bubble-beam', damage: 10, crit: false, eff: 'not_very_effective', hpBefore: 44, hpAfter: 0 }, 35, 0),
  ],
  eloChangeA: 14,
  eloChangeB: -11,
  xpAwardedA: 78,
  xpAwardedB: 35,
};

// ─── Export: all demos + legacy single ───────────────────────────────────────
export const DEMO_BATTLES: BattleData[] = [
  BATTLE_1,
  BATTLE_2,
  BATTLE_3,
  BATTLE_4,
  BATTLE_5,
  BATTLE_6,
  BATTLE_7,
  BATTLE_8,
  BATTLE_9,
  BATTLE_10,
];

/** First demo battle (backward compatibility). */
export const DEMO_BATTLE: BattleData = DEMO_BATTLES[0];
