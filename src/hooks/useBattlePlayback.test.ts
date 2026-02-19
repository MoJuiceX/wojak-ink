// src/hooks/useBattlePlayback.test.ts
import { describe, it, expect } from 'vitest';
import { buildTurnTimeline } from './useBattlePlayback';
import type { TurnResult } from '@/lib/combat/battle-state';
import type { CombatType } from '@/lib/combat/types';

// ── Test Data ───────────────────────────────────────────────────────────────

function makeTurnResult(overrides?: Partial<{
  turn: number;
  order: 'a_first' | 'b_first';
  a_move: string;
  a_damage: number;
  a_critical: boolean;
  a_effectiveness: 'super_effective' | 'not_very_effective' | 'neutral' | 'immune';
  a_status: string | null;
  a_hp_before: number;
  a_hp_after: number;
  a_heal: number | undefined;
  b_move: string;
  b_damage: number;
  b_critical: boolean;
  b_effectiveness: 'super_effective' | 'not_very_effective' | 'neutral' | 'immune';
  b_status: string | null;
  b_hp_before: number;
  b_hp_after: number;
  b_heal: number | undefined;
  end_a_hp: number;
  end_b_hp: number;
  end_a_status: string | null;
  end_b_status: string | null;
  ability_triggered: string | null;
}>): TurnResult {
  const o = overrides ?? {};
  return {
    turn: o.turn ?? 1,
    fighter_a: {
      move: o.a_move ?? 'poke_fire_flamethrower',
      damage_dealt: o.a_damage ?? 45,
      critical: o.a_critical ?? false,
      effectiveness: o.a_effectiveness ?? 'neutral',
      status_applied: o.a_status ?? null,
      hp_before: o.a_hp_before ?? 100,
      hp_after: o.a_hp_after ?? 100,
      heal_amount: o.a_heal,
    },
    fighter_b: {
      move: o.b_move ?? 'poke_water_water-gun',
      damage_dealt: o.b_damage ?? 30,
      critical: o.b_critical ?? false,
      effectiveness: o.b_effectiveness ?? 'neutral',
      status_applied: o.b_status ?? null,
      hp_before: o.b_hp_before ?? 100,
      hp_after: o.b_hp_after ?? 55,
      heal_amount: o.b_heal,
    },
    order: o.order ?? 'a_first',
    end_of_turn: {
      fighter_a_hp: o.end_a_hp ?? 70,
      fighter_b_hp: o.end_b_hp ?? 55,
      fighter_a_status: o.end_a_status ?? null,
      fighter_b_status: o.end_b_status ?? null,
      fighter_a_stat_stages: {},
      fighter_b_stat_stages: {},
      ability_triggered: o.ability_triggered ?? null,
    },
  };
}

const typeA: CombatType = 'FIRE';
const typeB: CombatType = 'WATER';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('buildTurnTimeline', () => {
  it('produces timeline events in order with increasing delays', () => {
    const turn = makeTurnResult();
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    expect(timeline.length).toBeGreaterThan(0);

    // Delays should be monotonically non-decreasing
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i].delay).toBeGreaterThanOrEqual(timeline[i - 1].delay);
    }
  });

  it('starts with a turn_start event', () => {
    const turn = makeTurnResult();
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    expect(timeline[0].type).toBe('turn_start');
    expect(timeline[0].delay).toBe(0);
  });

  it('includes damage events for both fighters', () => {
    const turn = makeTurnResult({ a_damage: 50, b_damage: 30 });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const damageEvents = timeline.filter(e => e.type === 'damage');
    expect(damageEvents.length).toBe(2);

    // One for side A's attack (damages B) and one for side B's attack (damages A)
    const sides = damageEvents.map(e => e.side);
    expect(sides).toContain('a');
    expect(sides).toContain('b');
  });

  it('includes hp_update events for both sides', () => {
    const turn = makeTurnResult();
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const hpEvents = timeline.filter(e => e.type === 'hp_update');
    expect(hpEvents.length).toBeGreaterThanOrEqual(2);
  });

  it('includes effectiveness callout for super_effective', () => {
    const turn = makeTurnResult({ a_effectiveness: 'super_effective' });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const effEvents = timeline.filter(e => e.type === 'effectiveness');
    expect(effEvents.length).toBeGreaterThanOrEqual(1);
    expect(effEvents[0].value).toBe('super_effective');
  });

  it('includes effectiveness callout for not_very_effective', () => {
    const turn = makeTurnResult({ b_effectiveness: 'not_very_effective' });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const effEvents = timeline.filter(e => e.type === 'effectiveness');
    expect(effEvents.length).toBeGreaterThanOrEqual(1);
    expect(effEvents[0].value).toBe('not_very_effective');
  });

  it('does not include effectiveness callout for neutral moves', () => {
    const turn = makeTurnResult({
      a_effectiveness: 'neutral',
      b_effectiveness: 'neutral',
    });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const effEvents = timeline.filter(e => e.type === 'effectiveness');
    expect(effEvents.length).toBe(0);
  });

  it('includes crit event when critical is true', () => {
    const turn = makeTurnResult({ a_critical: true });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const critEvents = timeline.filter(e => e.type === 'crit');
    expect(critEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('does not include crit event when no criticals', () => {
    const turn = makeTurnResult({ a_critical: false, b_critical: false });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const critEvents = timeline.filter(e => e.type === 'crit');
    expect(critEvents.length).toBe(0);
  });

  it('includes status event when status_applied is set', () => {
    const turn = makeTurnResult({ a_status: 'burn' });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const statusEvents = timeline.filter(e => e.type === 'status');
    expect(statusEvents.length).toBeGreaterThanOrEqual(1);
    expect(statusEvents[0].value).toBe('burn');
  });

  it('does not include status event when no status applied', () => {
    const turn = makeTurnResult({ a_status: null, b_status: null });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const statusEvents = timeline.filter(e => e.type === 'status');
    expect(statusEvents.length).toBe(0);
  });

  it('includes heal event when heal_amount is present', () => {
    const turn = makeTurnResult({ a_heal: 25 });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const healEvents = timeline.filter(e => e.type === 'heal');
    expect(healEvents.length).toBeGreaterThanOrEqual(1);
    expect(healEvents[0].amount).toBe(25);
  });

  it('includes move_announce events for both sides', () => {
    const turn = makeTurnResult();
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const announceEvents = timeline.filter(e => e.type === 'move_announce');
    expect(announceEvents.length).toBe(2);
  });

  it('includes attack_anim events for both sides', () => {
    const turn = makeTurnResult();
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const animEvents = timeline.filter(e => e.type === 'attack_anim');
    expect(animEvents.length).toBe(2);
  });

  it('includes shake event for critical hits', () => {
    const turn = makeTurnResult({ a_critical: true });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const shakeEvents = timeline.filter(e => e.type === 'shake');
    expect(shakeEvents.length).toBeGreaterThanOrEqual(1);
    // Crit shake should be heavy
    expect(shakeEvents[0].amplitude).toBe('heavy');
  });

  it('respects order a_first — A moves before B', () => {
    const turn = makeTurnResult({ order: 'a_first' });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const announceEvents = timeline.filter(e => e.type === 'move_announce');
    expect(announceEvents[0].side).toBe('a');
    expect(announceEvents[1].side).toBe('b');
  });

  it('respects order b_first — B moves before A', () => {
    const turn = makeTurnResult({ order: 'b_first' });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const announceEvents = timeline.filter(e => e.type === 'move_announce');
    expect(announceEvents[0].side).toBe('b');
    expect(announceEvents[1].side).toBe('a');
  });

  it('includes faint event when HP drops to zero', () => {
    const turn = makeTurnResult({
      end_b_hp: 0,
      b_hp_after: 0,
    });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const faintEvents = timeline.filter(e => e.type === 'faint');
    expect(faintEvents.length).toBe(1);
    expect(faintEvents[0].side).toBe('b');
  });

  it('does not include faint event when both fighters still standing', () => {
    const turn = makeTurnResult({ end_a_hp: 50, end_b_hp: 50 });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const faintEvents = timeline.filter(e => e.type === 'faint');
    expect(faintEvents.length).toBe(0);
  });

  it('includes immune effectiveness callout', () => {
    const turn = makeTurnResult({ a_effectiveness: 'immune', a_damage: 0 });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const effEvents = timeline.filter(e => e.type === 'effectiveness');
    expect(effEvents.length).toBeGreaterThanOrEqual(1);
    expect(effEvents[0].value).toBe('immune');
  });

  it('handles both fighters having crits and statuses', () => {
    const turn = makeTurnResult({
      a_critical: true,
      b_critical: true,
      a_status: 'burn',
      b_status: 'paralysis',
    });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    const critEvents = timeline.filter(e => e.type === 'crit');
    expect(critEvents.length).toBe(2);

    const statusEvents = timeline.filter(e => e.type === 'status');
    expect(statusEvents.length).toBe(2);
  });

  it('falls back gracefully when move ID is unknown', () => {
    const turn = makeTurnResult({ a_move: 'unknown_move_id' });
    const timeline = buildTurnTimeline(turn, typeA, typeB);

    // Should still produce a valid timeline without crashing
    expect(timeline.length).toBeGreaterThan(0);
    const animEvents = timeline.filter(e => e.type === 'attack_anim');
    expect(animEvents.length).toBeGreaterThanOrEqual(1);
  });
});
