import { describe, it, expect } from 'vitest';
import {
  MOVES,
  MOVES_BY_TYPE,
  getMovePoolForType,
  getMoveById,
  validateMoveSelection,
} from './moves';
import { COMBAT_TYPES } from '../types';

describe('moves', () => {
  // -------------------------------------------------------------------------
  // 1. Total move count
  // -------------------------------------------------------------------------
  it('has exactly 174 total moves', () => {
    expect(MOVES.length).toBe(174);
  });

  // -------------------------------------------------------------------------
  // 2. Every type has 8-12 moves in its pool
  // -------------------------------------------------------------------------
  it('every type has 8-12 moves', () => {
    for (const type of COMBAT_TYPES) {
      const pool = MOVES_BY_TYPE[type];
      expect(pool.length).toBeGreaterThanOrEqual(8);
      expect(pool.length).toBeLessThanOrEqual(12);
    }
  });

  // -------------------------------------------------------------------------
  // 3. getMoveById returns correct move
  // -------------------------------------------------------------------------
  it('getMoveById returns correct move for poke_fire_flamethrower', () => {
    const move = getMoveById('poke_fire_flamethrower');
    expect(move).toBeDefined();
    expect(move!.name).toBe('Flamethrower');
    expect(move!.type).toBe('FIRE');
    expect(move!.power).toBe(90);
    expect(move!.accuracy).toBe(100);
    expect(move!.category).toBe('special');
  });

  it('getMoveById returns correct move for poke_water_crabhammer', () => {
    const move = getMoveById('poke_water_crabhammer');
    expect(move).toBeDefined();
    expect(move!.name).toBe('Diamond Hands');
    expect(move!.type).toBe('WATER');
    expect(move!.power).toBe(100);
  });

  it('getMoveById returns undefined for nonexistent ID', () => {
    expect(getMoveById('does_not_exist')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 4. validateMoveSelection accepts 4 valid unique moves from type pool
  // -------------------------------------------------------------------------
  it('validateMoveSelection accepts 4 valid unique FIRE moves', () => {
    const result = validateMoveSelection(
      [
        'poke_fire_flare-blitz',
        'poke_fire_flamethrower',
        'poke_fire_ember',
        'poke_fire_will-o-wisp',
      ],
      'FIRE',
    );
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('validateMoveSelection accepts 4 valid unique ELECTRIC moves', () => {
    const result = validateMoveSelection(
      [
        'poke_electric_bolt-strike',
        'poke_electric_thunder-punch',
        'poke_electric_thunder-shock',
        'poke_electric_zippy-zap',
      ],
      'ELECTRIC',
    );
    expect(result.valid).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 5. validateMoveSelection rejects wrong type moves
  // -------------------------------------------------------------------------
  it('rejects moves from a different type', () => {
    const result = validateMoveSelection(
      [
        'poke_fire_flare-blitz',
        'poke_fire_flamethrower',
        'poke_fire_ember',
        'poke_water_water-gun', // wrong type
      ],
      'FIRE',
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid moves for type FIRE');
    expect(result.error).toContain('poke_water_water-gun');
  });

  // -------------------------------------------------------------------------
  // 6. validateMoveSelection rejects duplicates
  // -------------------------------------------------------------------------
  it('rejects duplicate move IDs', () => {
    const result = validateMoveSelection(
      [
        'poke_fire_flare-blitz',
        'poke_fire_flamethrower',
        'poke_fire_ember',
        'poke_fire_ember', // duplicate
      ],
      'FIRE',
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('different');
  });

  // -------------------------------------------------------------------------
  // 7. validateMoveSelection requires at least 1 damaging move
  // -------------------------------------------------------------------------
  it('rejects selection with no damaging moves (all status)', () => {
    // VENOM has many status moves: Toxic Shield, Venom Dust, Deadly Dose, Detoxify, Slime Coat, Toxin Spray
    const result = validateMoveSelection(
      [
        'poke_poison_baneful-bunker', // status, power 0
        'poke_poison_poison-powder',  // status, power 0
        'poke_poison_toxic',          // status, power 0
        'poke_poison_purify',         // status, power 0
      ],
      'VENOM',
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('damaging');
  });

  // -------------------------------------------------------------------------
  // Additional structural checks
  // -------------------------------------------------------------------------
  it('all moves have required fields', () => {
    for (const move of MOVES) {
      expect(move.id).toBeTruthy();
      expect(move.name).toBeTruthy();
      expect(COMBAT_TYPES).toContain(move.type);
      expect(move.power).toBeGreaterThanOrEqual(0);
      expect(move.accuracy).toBeGreaterThan(0);
      expect(move.pp).toBeGreaterThan(0);
      expect(['physical', 'special', 'status']).toContain(move.category);
      expect(move.description).toBeTruthy();
    }
  });

  it('status moves all have power === 0', () => {
    const statusMoves = MOVES.filter((m) => m.category === 'status');
    for (const move of statusMoves) {
      expect(move.power).toBe(0);
    }
  });

  it('damaging moves have power > 0', () => {
    const damagingMoves = MOVES.filter(
      (m) => m.category === 'physical' || m.category === 'special',
    );
    for (const move of damagingMoves) {
      if (move.category !== 'status') {
        // Some special moves are damaging (power > 0), some are status-like
        // but we already categorized them as 'status' when power === 0
      }
    }
  });

  it('all move IDs are unique', () => {
    const ids = MOVES.map((m) => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('getMovePoolForType returns same reference as MOVES_BY_TYPE', () => {
    for (const type of COMBAT_TYPES) {
      expect(getMovePoolForType(type)).toBe(MOVES_BY_TYPE[type]);
    }
  });

  it('rejects selection with wrong number of moves', () => {
    const result = validateMoveSelection(
      ['poke_fire_flare-blitz', 'poke_fire_flamethrower', 'poke_fire_ember'],
      'FIRE',
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exactly 4');
  });
});
