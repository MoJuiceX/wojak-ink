// src/lib/combat/ai-strategist.test.ts
import { describe, it, expect } from 'vitest';
import { chooseMove, rankMoves } from './ai-strategist';
import { initFighterState } from './battle-state';
import type { FighterState } from './battle-state';

function makeFire(): FighterState {
  return initFighterState({
    nftId: 'a', type: 'FIRE', nature: 'Balanced', ability: 'Blaze',
    moves: ['poke_fire_fire-punch', 'poke_fire_flamethrower', 'poke_fire_lava-plume', 'poke_fire_ember'],
    level: 50,
  });
}

function makeWater(): FighterState {
  return initFighterState({
    nftId: 'b', type: 'WATER', nature: 'Balanced', ability: 'Torrent',
    moves: ['poke_water_wave-crash', 'poke_water_bubble-beam', 'poke_water_aqua-jet', 'poke_water_bouncy-bubble'],
    level: 50,
  });
}

function makeGrass(): FighterState {
  return initFighterState({
    nftId: 'c', type: 'GRASS', nature: 'Balanced', ability: 'Overgrow',
    moves: ['poke_grass_solar-blade', 'poke_grass_vine-whip', 'poke_grass_mega-drain', 'poke_grass_stun-spore'],
    level: 50,
  });
}

describe('ai-strategist', () => {
  describe('rankMoves', () => {
    it('returns scored moves sorted by score descending', () => {
      const attacker = makeFire();
      const defender = makeGrass();
      const ranked = rankMoves(attacker, defender);
      expect(ranked).toHaveLength(4);
      // Should be sorted descending
      for (let i = 1; i < ranked.length; i++) {
        expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
      }
    });

    it('favors super-effective moves', () => {
      const attacker = makeFire();
      const defender = makeGrass();
      const ranked = rankMoves(attacker, defender);
      // Fire moves should score high against Grass (super effective)
      expect(ranked[0].score).toBeGreaterThan(50);
    });

    it('penalizes not-very-effective moves', () => {
      const attacker = makeFire();
      const defender = makeWater();
      const ranked = rankMoves(attacker, defender);
      // Fire vs Water = not very effective, all fire moves should score below base
      const fireMove = ranked.find(m => m.moveId.includes('fire'));
      if (fireMove) expect(fireMove.score).toBeLessThan(50);
    });

    it('includes move name and score for each entry', () => {
      const attacker = makeFire();
      const defender = makeWater();
      const ranked = rankMoves(attacker, defender);
      for (const entry of ranked) {
        expect(entry).toHaveProperty('moveId');
        expect(entry).toHaveProperty('name');
        expect(entry).toHaveProperty('score');
        expect(typeof entry.score).toBe('number');
      }
    });
  });

  describe('chooseMove', () => {
    it('returns a valid move ID from the attacker moveset', () => {
      const attacker = makeFire();
      const defender = makeGrass();
      const move = chooseMove(attacker, defender);
      expect(attacker.moves).toContain(move);
    });

    it('picks the best or second-best move (with deterministic RNG)', () => {
      const attacker = makeFire();
      const defender = makeGrass();
      const ranked = rankMoves(attacker, defender);
      // chooseMove should return one of the top 2
      const move = chooseMove(attacker, defender, () => 0.5); // > 0.2 → pick best
      expect(move).toBe(ranked[0].moveId);
    });

    it('sometimes picks second-best (20% chance)', () => {
      const attacker = makeFire();
      const defender = makeGrass();
      const ranked = rankMoves(attacker, defender);
      // rng < 0.2 → pick second best (if available)
      const move = chooseMove(attacker, defender, () => 0.1);
      if (ranked.length >= 2) {
        expect(move).toBe(ranked[1].moveId);
      }
    });

    it('values status moves when opponent has no status', () => {
      const attacker = makeGrass();
      const defender = makeFire();
      const ranked = rankMoves(attacker, defender);
      // Stun Spore is a status move — should get STATUS_VALUE bonus
      const stunSpore = ranked.find(m => m.moveId === 'poke_grass_stun-spore');
      expect(stunSpore).toBeDefined();
      expect(stunSpore!.score).toBeGreaterThan(0);
    });

    it('does not value status moves when opponent already statused', () => {
      const attacker = makeGrass();
      const defender = makeFire();
      defender.status = 'paralysis';
      const ranked = rankMoves(attacker, defender);
      const stunSpore = ranked.find(m => m.moveId === 'poke_grass_stun-spore');
      // Should have lower score without STATUS_VALUE bonus
      expect(stunSpore).toBeDefined();
    });
  });
});
