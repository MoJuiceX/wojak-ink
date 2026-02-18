// src/lib/combat/ability-effects.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getAbilityEffect } from './ability-effects';
import type { AbilityContext, AbilityEffect } from './ability-effects';
import { initFighterState } from './battle-state';
import type { FighterState } from './battle-state';

function makeContext(overrides?: Partial<AbilityContext>): AbilityContext {
  const attacker = initFighterState({
    nftId: 'a', type: 'FIRE', nature: 'Balanced', ability: 'Blaze',
    moves: ['poke_fire_fire-punch', 'poke_fire_flamethrower', 'poke_fire_lava-plume', 'poke_fire_ember'],
    level: 50,
  });
  const defender = initFighterState({
    nftId: 'b', type: 'WATER', nature: 'Balanced', ability: 'Torrent',
    moves: ['poke_water_wave-crash', 'poke_water_bubble-beam', 'poke_water_aqua-jet', 'poke_water_bouncy-bubble'],
    level: 50,
  });
  return {
    self: attacker,
    opponent: defender,
    moveType: 'FIRE',
    moveCategory: 'special',
    movePower: 90,
    ...overrides,
  };
}

describe('ability-effects', () => {
  describe('battle_start abilities', () => {
    it('Sand Force boosts atk and def by 15%', () => {
      const ctx = makeContext();
      const effect = getAbilityEffect('Sand Force', 'battle_start', ctx);
      expect(effect).not.toBeNull();
      expect(effect?.selfStatMultipliers).toBeDefined();
      expect(effect?.selfStatMultipliers?.attack).toBe(1.15);
      expect(effect?.selfStatMultipliers?.defense).toBe(1.15);
    });

    it('Aerilate boosts speed by 20%', () => {
      const ctx = makeContext();
      const effect = getAbilityEffect('Aerilate', 'battle_start', ctx);
      expect(effect?.selfStatMultipliers?.speed).toBe(1.2);
    });

    it('Dragon Force boosts atk and sp_atk by 10%', () => {
      const ctx = makeContext();
      const effect = getAbilityEffect('Dragon Force', 'battle_start', ctx);
      expect(effect?.selfStatMultipliers?.attack).toBe(1.1);
      expect(effect?.selfStatMultipliers?.sp_atk).toBe(1.1);
    });

    it('Intimidate reduces opponent atk by 15%', () => {
      const ctx = makeContext();
      const effect = getAbilityEffect('Intimidate', 'battle_start', ctx);
      expect(effect?.opponentStatMultipliers?.attack).toBe(0.85);
    });

    it('Charm reduces opponent atk by 15%', () => {
      const ctx = makeContext();
      const effect = getAbilityEffect('Charm', 'battle_start', ctx);
      expect(effect?.opponentStatMultipliers?.attack).toBe(0.85);
    });

    it('Heavy Metal boosts def 20%, reduces speed 10%', () => {
      const ctx = makeContext();
      const effect = getAbilityEffect('Heavy Metal', 'battle_start', ctx);
      expect(effect?.selfStatMultipliers?.defense).toBe(1.2);
      expect(effect?.selfStatMultipliers?.speed).toBe(0.9);
    });
  });

  describe('damage_calc abilities', () => {
    it('Blaze +30% when HP < 33% and fire move', () => {
      const ctx = makeContext({ moveType: 'FIRE' });
      ctx.self.currentHP = Math.floor(ctx.self.maxHP * 0.3); // < 33%
      const effect = getAbilityEffect('Blaze', 'damage_calc', ctx);
      expect(effect?.damageMultiplier).toBe(1.3);
    });

    it('Blaze no bonus when HP >= 33%', () => {
      const ctx = makeContext({ moveType: 'FIRE' });
      ctx.self.currentHP = ctx.self.maxHP; // 100%
      const effect = getAbilityEffect('Blaze', 'damage_calc', ctx);
      expect(effect).toBeNull();
    });

    it('Torrent +30% when HP < 33% and water move', () => {
      const ctx = makeContext({ moveType: 'WATER' });
      ctx.self.currentHP = Math.floor(ctx.self.maxHP * 0.3);
      const effect = getAbilityEffect('Torrent', 'damage_calc', ctx);
      expect(effect?.damageMultiplier).toBe(1.3);
    });

    it('Guts +30% when statused', () => {
      const ctx = makeContext();
      ctx.self.status = 'burn';
      const effect = getAbilityEffect('Guts', 'damage_calc', ctx);
      expect(effect?.damageMultiplier).toBe(1.3);
    });

    it('Iron Fist +10% for physical moves', () => {
      const ctx = makeContext({ moveCategory: 'physical' });
      const effect = getAbilityEffect('Iron Fist', 'damage_calc', ctx);
      expect(effect?.damageMultiplier).toBe(1.1);
    });

    it('Dark Aura +15% vs PSYCHE/GHOST/MYSTIC', () => {
      const ctx = makeContext();
      ctx.opponent.type = 'PSYCHE';
      const effect = getAbilityEffect('Dark Aura', 'damage_calc', ctx);
      expect(effect?.damageMultiplier).toBe(1.15);
    });

    it('Pixilate +15% vs DRAGON/SHADOW/MARTIAL', () => {
      const ctx = makeContext();
      ctx.opponent.type = 'DRAGON';
      const effect = getAbilityEffect('Pixilate', 'damage_calc', ctx);
      expect(effect?.damageMultiplier).toBe(1.15);
    });

    it('Corrosion ignores 15% defense', () => {
      const ctx = makeContext();
      const effect = getAbilityEffect('Corrosion', 'damage_calc', ctx);
      expect(effect?.defenseIgnorePercent).toBe(0.15);
    });
  });

  describe('damage_taken abilities', () => {
    it('Resilience reduces super-effective hits by 25%', () => {
      const ctx = makeContext();
      const effect = getAbilityEffect('Resilience', 'damage_taken', ctx);
      expect(effect?.damageMultiplier).toBe(0.75);
    });

    it('Multiscale reduces damage 25% when HP full', () => {
      const ctx = makeContext();
      ctx.self.currentHP = ctx.self.maxHP;
      const effect = getAbilityEffect('Multiscale', 'damage_taken', ctx);
      expect(effect?.damageMultiplier).toBe(0.75);
    });

    it('Multiscale no effect when HP not full', () => {
      const ctx = makeContext();
      ctx.self.currentHP = ctx.self.maxHP - 1;
      const effect = getAbilityEffect('Multiscale', 'damage_taken', ctx);
      expect(effect).toBeNull();
    });
  });

  describe('before_hit abilities', () => {
    it('Volt Absorb returns immune + heal for ELECTRIC moves', () => {
      const ctx = makeContext({ moveType: 'ELECTRIC' });
      const effect = getAbilityEffect('Volt Absorb', 'before_hit', ctx);
      expect(effect?.immuneTo).toBe('ELECTRIC');
      expect(effect?.healPercent).toBe(0.25);
    });

    it('Levitate returns immune for EARTH moves', () => {
      const ctx = makeContext({ moveType: 'EARTH' });
      const effect = getAbilityEffect('Levitate', 'before_hit', ctx);
      expect(effect?.immuneTo).toBe('EARTH');
    });

    it('Telepathy returns dodge chance', () => {
      const ctx = makeContext();
      const effect = getAbilityEffect('Telepathy', 'before_hit', ctx);
      expect(effect?.dodgeChance).toBe(0.1);
    });

    it('Sand Veil returns dodge chance', () => {
      const ctx = makeContext();
      const effect = getAbilityEffect('Sand Veil', 'before_hit', ctx);
      expect(effect?.dodgeChance).toBe(0.1);
    });
  });

  describe('after_hit abilities', () => {
    it('Inferno 15% burn chance', () => {
      const effect = getAbilityEffect('Inferno', 'after_hit', makeContext());
      expect(effect?.statusToApply).toBe('burn');
      expect(effect?.statusChance).toBe(0.15);
    });

    it('Permafrost 10% freeze chance', () => {
      const effect = getAbilityEffect('Permafrost', 'after_hit', makeContext());
      expect(effect?.statusToApply).toBe('freeze');
      expect(effect?.statusChance).toBe(0.1);
    });

    it('Static 20% paralyze on physical contact', () => {
      const ctx = makeContext({ moveCategory: 'physical' });
      const effect = getAbilityEffect('Static', 'after_hit_received', ctx);
      expect(effect?.statusToApply).toBe('paralysis');
      expect(effect?.statusChance).toBe(0.2);
    });

    it('Poison Touch 15% poison chance', () => {
      const effect = getAbilityEffect('Poison Touch', 'after_hit', makeContext());
      expect(effect?.statusToApply).toBe('poison');
      expect(effect?.statusChance).toBe(0.15);
    });
  });

  describe('other triggers', () => {
    it('Sturdy survives with 1 HP (before_faint)', () => {
      const ctx = makeContext();
      ctx.self.sturdyUsed = false;
      const effect = getAbilityEffect('Sturdy', 'before_faint', ctx);
      expect(effect?.surviveWith1HP).toBe(true);
    });

    it('Sturdy no effect if already used', () => {
      const ctx = makeContext();
      ctx.self.sturdyUsed = true;
      const effect = getAbilityEffect('Sturdy', 'before_faint', ctx);
      expect(effect).toBeNull();
    });

    it('Magic Guard immune to status damage', () => {
      const effect = getAbilityEffect('Magic Guard', 'status_damage', makeContext());
      expect(effect?.immuneTo).toBe('status_damage');
    });

    it('Compound Eyes +30% accuracy', () => {
      const effect = getAbilityEffect('Compound Eyes', 'accuracy_calc', makeContext());
      expect(effect?.accuracyMultiplier).toBe(1.3);
    });

    it('Gale Wings first when HP full (speed_calc)', () => {
      const ctx = makeContext();
      ctx.self.currentHP = ctx.self.maxHP;
      const effect = getAbilityEffect('Gale Wings', 'speed_calc', ctx);
      expect(effect?.priorityBoost).toBe(1);
    });

    it('end_turn healing abilities heal 6.25%', () => {
      for (const name of ['Hydration', 'Photosynthesis', 'Ice Body']) {
        const effect = getAbilityEffect(name, 'end_turn', makeContext());
        expect(effect?.healPercent).toBe(0.0625);
      }
    });

    it('Cursed Body 20% reduce best stat', () => {
      const ctx = makeContext({ moveCategory: 'physical' });
      const effect = getAbilityEffect('Cursed Body', 'after_hit_received', ctx);
      expect(effect?.opponentStatDrop).toBe(true);
      expect(effect?.statusChance).toBe(0.2);
    });
  });

  describe('unknown ability', () => {
    it('returns null for unknown ability', () => {
      const effect = getAbilityEffect('Nonexistent', 'battle_start', makeContext());
      expect(effect).toBeNull();
    });

    it('returns null for wrong trigger', () => {
      const effect = getAbilityEffect('Blaze', 'battle_start', makeContext());
      expect(effect).toBeNull();
    });
  });
});
