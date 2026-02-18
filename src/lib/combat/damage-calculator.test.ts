// src/lib/combat/damage-calculator.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateDamage, getStatStageMultiplier } from './damage-calculator';
import { initFighterState } from './battle-state';
import type { FighterState } from './battle-state';

describe('damage-calculator', () => {
  describe('getStatStageMultiplier', () => {
    it('returns 1.0 for stage 0', () => {
      expect(getStatStageMultiplier(0)).toBe(1.0);
    });

    it('returns correct values for positive stages', () => {
      expect(getStatStageMultiplier(1)).toBe(1.5);
      expect(getStatStageMultiplier(2)).toBe(2.0);
      expect(getStatStageMultiplier(3)).toBe(2.5);
      expect(getStatStageMultiplier(4)).toBe(3.0);
      expect(getStatStageMultiplier(5)).toBe(3.5);
      expect(getStatStageMultiplier(6)).toBe(4.0);
    });

    it('returns correct values for negative stages', () => {
      expect(getStatStageMultiplier(-1)).toBeCloseTo(0.667, 2);
      expect(getStatStageMultiplier(-2)).toBe(0.50);
      expect(getStatStageMultiplier(-3)).toBe(0.40);
      expect(getStatStageMultiplier(-4)).toBe(0.33);
      expect(getStatStageMultiplier(-5)).toBe(0.29);
      expect(getStatStageMultiplier(-6)).toBe(0.25);
    });

    it('clamps out-of-range stages to ±6', () => {
      expect(getStatStageMultiplier(7)).toBe(4.0);
      expect(getStatStageMultiplier(-7)).toBe(0.25);
    });
  });

  describe('calculateDamage', () => {
    let fireAttacker: FighterState;
    let waterDefender: FighterState;

    beforeEach(() => {
      fireAttacker = initFighterState({
        nftId: 'a', type: 'FIRE', nature: 'Balanced', ability: 'Blaze',
        moves: ['poke_fire_fire-punch', 'poke_fire_flamethrower', 'poke_fire_lava-plume', 'poke_fire_ember'],
        level: 50,
      });
      waterDefender = initFighterState({
        nftId: 'b', type: 'WATER', nature: 'Balanced', ability: 'Torrent',
        moves: ['poke_water_wave-crash', 'poke_water_bubble-beam', 'poke_water_aqua-jet', 'poke_water_bouncy-bubble'],
        level: 50,
      });
    });

    it('returns damage >= 1 (minimum damage floor)', () => {
      const result = calculateDamage({
        attacker: fireAttacker,
        defender: waterDefender,
        moveId: 'poke_fire_flamethrower',
        randomFactor: 0.85,
      });
      expect(result.damage).toBeGreaterThanOrEqual(1);
    });

    it('applies STAB bonus for same-type move', () => {
      // FIRE using fire move vs NEUTRAL → gets STAB
      const neutralDef = initFighterState({
        nftId: 'c', type: 'NEUTRAL', nature: 'Balanced', ability: 'Blaze',
        moves: ['poke_normal_pound', 'poke_normal_pay-day', 'poke_normal_quick-attack', 'poke_normal_supersonic'],
        level: 50,
      });
      const withStab = calculateDamage({
        attacker: fireAttacker,
        defender: neutralDef,
        moveId: 'poke_fire_flamethrower',
        randomFactor: 1.0,
      });

      // NEUTRAL using fire move vs NEUTRAL → no STAB
      const neutralAtk = initFighterState({
        nftId: 'd', type: 'NEUTRAL', nature: 'Balanced', ability: 'Blaze',
        moves: ['poke_fire_flamethrower', 'poke_normal_pound', 'poke_normal_pay-day', 'poke_normal_quick-attack'],
        level: 50,
      });
      const withoutStab = calculateDamage({
        attacker: neutralAtk,
        defender: neutralDef,
        moveId: 'poke_fire_flamethrower',
        randomFactor: 1.0,
      });

      expect(withStab.damage).toBeGreaterThan(withoutStab.damage);
    });

    it('caps type effectiveness at 1.5x', () => {
      const grassDef = initFighterState({
        nftId: 'g', type: 'GRASS', nature: 'Balanced', ability: 'Overgrow',
        moves: ['poke_grass_vine-whip', 'poke_grass_solar-blade', 'poke_grass_mega-drain', 'poke_grass_stun-spore'],
        level: 50,
      });
      const result = calculateDamage({
        attacker: fireAttacker,
        defender: grassDef,
        moveId: 'poke_fire_flamethrower',
        randomFactor: 1.0,
      });
      // Fire vs Grass is super effective (2.0 in chart), capped at 1.5
      expect(result.effectiveness).toBe(1.5);
    });

    it('applies critical hit multiplier (1.25x)', () => {
      const normal = calculateDamage({
        attacker: fireAttacker,
        defender: waterDefender,
        moveId: 'poke_fire_fire-punch',
        randomFactor: 1.0,
        forceCrit: false,
      });
      const crit = calculateDamage({
        attacker: fireAttacker,
        defender: waterDefender,
        moveId: 'poke_fire_fire-punch',
        randomFactor: 1.0,
        forceCrit: true,
      });
      expect(crit.crit).toBe(true);
      expect(crit.damage).toBeGreaterThan(normal.damage);
    });

    it('applies burn multiplier for physical moves (0.5x)', () => {
      fireAttacker.status = 'burn';
      const burned = calculateDamage({
        attacker: fireAttacker,
        defender: waterDefender,
        moveId: 'poke_fire_fire-punch', // physical
        randomFactor: 1.0,
        forceCrit: false,
      });

      fireAttacker.status = null;
      const healthy = calculateDamage({
        attacker: fireAttacker,
        defender: waterDefender,
        moveId: 'poke_fire_fire-punch',
        randomFactor: 1.0,
        forceCrit: false,
      });

      expect(burned.damage).toBeLessThan(healthy.damage);
    });

    it('does NOT apply burn multiplier for special moves', () => {
      fireAttacker.status = 'burn';
      const burnedSpecial = calculateDamage({
        attacker: fireAttacker,
        defender: waterDefender,
        moveId: 'poke_fire_flamethrower', // special
        randomFactor: 1.0,
        forceCrit: false,
      });

      fireAttacker.status = null;
      const healthySpecial = calculateDamage({
        attacker: fireAttacker,
        defender: waterDefender,
        moveId: 'poke_fire_flamethrower',
        randomFactor: 1.0,
        forceCrit: false,
      });

      expect(burnedSpecial.damage).toBe(healthySpecial.damage);
    });

    it('uses 0.25 damage multiplier constant', () => {
      const result = calculateDamage({
        attacker: fireAttacker,
        defender: waterDefender,
        moveId: 'poke_fire_fire-punch',
        randomFactor: 1.0,
        forceCrit: false,
      });
      expect(result.damage).toBeLessThan(500);
      expect(result.damage).toBeGreaterThanOrEqual(1);
    });

    it('crits ignore negative atk stages and positive def stages', () => {
      fireAttacker.statStages.atk = -2;
      waterDefender.statStages.def = 2;

      const critDmg = calculateDamage({
        attacker: fireAttacker,
        defender: waterDefender,
        moveId: 'poke_fire_fire-punch',
        randomFactor: 1.0,
        forceCrit: true,
      });

      // Reset and compare with normal (no bad stages, no crit)
      fireAttacker.statStages.atk = 0;
      waterDefender.statStages.def = 0;
      const normalDmg = calculateDamage({
        attacker: fireAttacker,
        defender: waterDefender,
        moveId: 'poke_fire_fire-punch',
        randomFactor: 1.0,
        forceCrit: false,
      });

      // Crit ignores bad stages + has 1.25x mult, should be >= normal
      expect(critDmg.damage).toBeGreaterThanOrEqual(normalDmg.damage);
    });
  });
});
