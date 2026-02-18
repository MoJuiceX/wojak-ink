// src/lib/combat/battle-state.test.ts
import { describe, it, expect } from 'vitest';
import { initFighterState, initBattleState } from './battle-state';

const FIGHTER_A_DATA = {
  nftId: 'nft-001',
  type: 'FIRE' as const,
  nature: 'Savage',
  ability: 'Blaze',
  moves: ['fire_blast', 'flamethrower', 'fire_punch', 'eruption'],
  level: 50,
};

const FIGHTER_B_DATA = {
  nftId: 'nft-002',
  type: 'WATER' as const,
  nature: 'Balanced',
  ability: 'Torrent',
  moves: ['hydro_pump', 'surf', 'aqua_ring', 'ice_beam_w'],
  level: 50,
};

describe('battle-state', () => {
  describe('initFighterState', () => {
    it('creates a fighter state with calculated stats', () => {
      const state = initFighterState(FIGHTER_A_DATA);
      expect(state.nftId).toBe('nft-001');
      expect(state.type).toBe('FIRE');
      expect(state.nature).toBe('Savage');
      expect(state.ability).toBe('Blaze');
      expect(state.moves).toEqual(['fire_blast', 'flamethrower', 'fire_punch', 'eruption']);
      expect(state.level).toBe(50);
    });

    it('calculates HP correctly and sets currentHP = maxHP', () => {
      const state = initFighterState(FIGHTER_A_DATA);
      // FIRE baseHP=75, level 50: floor((2*75+31)*50/100)+50+10 = floor(90.5)+60 = 90+60 = 150
      expect(state.maxHP).toBe(150);
      expect(state.currentHP).toBe(150);
    });

    it('calculates effective stats with nature applied', () => {
      // Savage: +attack, -sp_def
      const state = initFighterState(FIGHTER_A_DATA);
      expect(state.effectiveStats.hp).toBe(state.maxHP);
      // FIRE attack=90 at level 50 with 1.1 boost
      // floor(((2*90+31)*50/100)+5)*1.1 = floor((105.5+5)*1.1) = floor(110.5*1.1) = floor(121.55) = 121
      expect(state.effectiveStats.attack).toBe(121);
    });

    it('initializes all stat stages to 0', () => {
      const state = initFighterState(FIGHTER_A_DATA);
      expect(state.statStages).toEqual({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
    });

    it('initializes status to null and tracking flags to false', () => {
      const state = initFighterState(FIGHTER_A_DATA);
      expect(state.status).toBeNull();
      expect(state.statusTurns).toBe(0);
      expect(state.sturdyUsed).toBe(false);
      expect(state.flinched).toBe(false);
      expect(state.leechSeeded).toBe(false);
      expect(state.cursed).toBe(false);
    });
  });

  describe('initBattleState', () => {
    it('creates a battle with two fighters', () => {
      const a = initFighterState(FIGHTER_A_DATA);
      const b = initFighterState(FIGHTER_B_DATA);
      const battle = initBattleState(a, b);

      expect(battle.fighterA.nftId).toBe('nft-001');
      expect(battle.fighterB.nftId).toBe('nft-002');
    });

    it('initializes turn number to 0 and status to active', () => {
      const a = initFighterState(FIGHTER_A_DATA);
      const b = initFighterState(FIGHTER_B_DATA);
      const battle = initBattleState(a, b);

      expect(battle.turnNumber).toBe(0);
      expect(battle.status).toBe('active');
      expect(battle.winnerId).toBeNull();
      expect(battle.maxTurns).toBe(50);
    });

    it('starts with empty turns array', () => {
      const a = initFighterState(FIGHTER_A_DATA);
      const b = initFighterState(FIGHTER_B_DATA);
      const battle = initBattleState(a, b);

      expect(battle.turns).toEqual([]);
    });
  });
});
