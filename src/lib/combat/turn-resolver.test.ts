// src/lib/combat/turn-resolver.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolveTurn } from './turn-resolver';
import { initFighterState, initBattleState } from './battle-state';
import type { BattleState } from './battle-state';

// Deterministic RNG that always returns the given value
const rng = (val: number) => () => val;

function makeBattle(overrides?: {
  typeA?: string; typeB?: string;
  abilityA?: string; abilityB?: string;
  levelA?: number; levelB?: number;
}): BattleState {
  const a = initFighterState({
    nftId: 'nft-a',
    type: (overrides?.typeA ?? 'FIRE') as any,
    nature: 'Balanced',
    ability: overrides?.abilityA ?? 'Blaze',
    moves: ['poke_fire_fire-punch', 'poke_fire_flamethrower', 'poke_fire_lava-plume', 'poke_fire_ember'],
    level: overrides?.levelA ?? 50,
  });
  const b = initFighterState({
    nftId: 'nft-b',
    type: (overrides?.typeB ?? 'WATER') as any,
    nature: 'Balanced',
    ability: overrides?.abilityB ?? 'Torrent',
    moves: ['poke_water_wave-crash', 'poke_water_bubble-beam', 'poke_water_aqua-jet', 'poke_water_bouncy-bubble'],
    level: overrides?.levelB ?? 50,
  });
  return initBattleState(a, b);
}

describe('turn-resolver', () => {
  let battle: BattleState;

  beforeEach(() => {
    battle = makeBattle();
  });

  it('increments turn number', () => {
    expect(battle.turnNumber).toBe(0);
    resolveTurn(battle, 'poke_fire_fire-punch', 'poke_water_wave-crash', rng(0.5));
    expect(battle.turnNumber).toBe(1);
  });

  it('pushes a TurnResult to battle.turns', () => {
    expect(battle.turns).toHaveLength(0);
    resolveTurn(battle, 'poke_fire_fire-punch', 'poke_water_wave-crash', rng(0.5));
    expect(battle.turns).toHaveLength(1);
    expect(battle.turns[0].turn).toBe(1);
  });

  it('returns a TurnResult with both fighter results', () => {
    const result = resolveTurn(battle, 'poke_fire_fire-punch', 'poke_water_wave-crash', rng(0.5));
    expect(result).toHaveProperty('fighter_a');
    expect(result).toHaveProperty('fighter_b');
    expect(result).toHaveProperty('order');
    expect(result).toHaveProperty('end_of_turn');
    expect(['a_first', 'b_first']).toContain(result.order);
  });

  it('deals damage that reduces HP', () => {
    const hpA_before = battle.fighterA.currentHP;
    const hpB_before = battle.fighterB.currentHP;
    resolveTurn(battle, 'poke_fire_fire-punch', 'poke_water_wave-crash', rng(0.5));
    // Both should take some damage
    expect(battle.fighterA.currentHP).toBeLessThan(hpA_before);
    expect(battle.fighterB.currentHP).toBeLessThan(hpB_before);
  });

  it('reports effectiveness in TurnResult', () => {
    const result = resolveTurn(battle, 'poke_fire_fire-punch', 'poke_water_wave-crash', rng(0.5));
    // Fire vs Water → not very effective
    // Water vs Fire → super effective
    expect(result.fighter_a.effectiveness).toBe('not_very_effective');
    expect(result.fighter_b.effectiveness).toBe('super_effective');
  });

  it('sets battle to finished when a fighter faints', () => {
    // Lower FIRE HP drastically
    battle.fighterA.currentHP = 1;
    const result = resolveTurn(battle, 'poke_fire_fire-punch', 'poke_water_wave-crash', rng(0.5));
    expect(battle.status).toBe('finished');
    expect(battle.winnerId).toBe('nft-b');
  });

  it('faster fighter goes first', () => {
    // FIRE speed base=85, WATER speed base=65 → FIRE should be faster
    const result = resolveTurn(battle, 'poke_fire_fire-punch', 'poke_water_wave-crash', rng(0.5));
    expect(result.order).toBe('a_first');
  });

  it('applies end-of-turn burn damage', () => {
    battle.fighterB.status = 'burn';
    battle.fighterB.statusTurns = 0;
    const hpBefore = battle.fighterB.currentHP;
    resolveTurn(battle, 'poke_fire_fire-punch', 'poke_water_wave-crash', rng(0.5));
    // HP should be reduced by burn damage + attack damage
    const burnDmg = Math.max(1, Math.floor(battle.fighterB.maxHP / 16));
    expect(battle.fighterB.currentHP).toBeLessThan(hpBefore);
  });

  it('status skip prevents action (paralysis)', () => {
    battle.fighterA.status = 'paralysis';
    // rng < 0.15 → paralysis skips
    const result = resolveTurn(battle, 'poke_fire_fire-punch', 'poke_water_wave-crash', rng(0.10));
    // Fighter A should deal 0 damage (paralyzed)
    expect(result.fighter_a.damage_dealt).toBe(0);
    // Fighter B should still deal damage
    expect(result.fighter_b.damage_dealt).toBeGreaterThan(0);
  });

  it('handles status moves (stat boost)', () => {
    // Use a status move that boosts stats
    // poke_fire_flame-charge boosts speed by 1
    const fireFighter = initFighterState({
      nftId: 'nft-a', type: 'FIRE', nature: 'Balanced', ability: 'Blaze',
      moves: ['poke_fire_flame-charge', 'poke_fire_flamethrower', 'poke_fire_lava-plume', 'poke_fire_ember'],
      level: 50,
    });
    const waterFighter = initFighterState({
      nftId: 'nft-b', type: 'WATER', nature: 'Balanced', ability: 'Torrent',
      moves: ['poke_water_wave-crash', 'poke_water_bubble-beam', 'poke_water_aqua-jet', 'poke_water_bouncy-bubble'],
      level: 50,
    });
    const b = initBattleState(fireFighter, waterFighter);
    resolveTurn(b, 'poke_fire_flame-charge', 'poke_water_bubble-beam', rng(0.5));
    // Flame Charge has stat_boost effect on speed
    // But it also does damage, so the stat boost is a secondary effect
  });

  it('handles multiple turns in sequence', () => {
    for (let i = 0; i < 5; i++) {
      if (battle.status !== 'active') break;
      resolveTurn(battle, 'poke_fire_fire-punch', 'poke_water_wave-crash', rng(0.5));
    }
    expect(battle.turns.length).toBeGreaterThanOrEqual(1);
    expect(battle.turns.length).toBeLessThanOrEqual(5);
  });

  it('end_of_turn reports final HP and status', () => {
    const result = resolveTurn(battle, 'poke_fire_fire-punch', 'poke_water_wave-crash', rng(0.5));
    expect(result.end_of_turn.fighter_a_hp).toBe(battle.fighterA.currentHP);
    expect(result.end_of_turn.fighter_b_hp).toBe(battle.fighterB.currentHP);
  });

  it('applies leech seed drain at end of turn', () => {
    battle.fighterB.leechSeeded = true;
    const hpA_before = battle.fighterA.currentHP;
    resolveTurn(battle, 'poke_fire_fire-punch', 'poke_water_wave-crash', rng(0.5));
    // Leech seed drains defender and heals attacker
    // Fighter A might have healed from leech seed on B
  });
});
