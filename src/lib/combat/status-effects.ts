// src/lib/combat/status-effects.ts
// Status effect handlers — ported from ClawCombat battle-engine.js
// Balance constants: burn=1/16, poison=1/8, paralysis=15%, freeze=1 turn,
// sleep=2 turns, confusion=3 turns 25% self-hit

/** Per-turn status damage. Returns damage amount (0 if none). */
export function applyStatusDamage(status: string | null, maxHP: number): number {
  if (status === 'burn') return Math.max(1, Math.floor(maxHP / 16));
  if (status === 'poison') return Math.max(1, Math.floor(maxHP / 8));
  return 0;
}

/**
 * Check if status prevents action this turn.
 * @param rng - deterministic random [0,1) for testing
 * @returns true if the fighter cannot act
 */
export function checkStatusSkip(status: string | null, rng: number): boolean {
  if (status === 'paralysis') return rng < 0.15;
  if (status === 'freeze') return true;
  if (status === 'sleep') return true;
  if (status === 'confusion') return rng < 0.25;
  return false;
}

/**
 * Advance status duration, return whether it's cured.
 * @param turnsActive - how many turns the status has been active (0-indexed)
 */
export function tickStatus(status: string | null, turnsActive: number): { cured: boolean } {
  if (status === 'freeze') return { cured: turnsActive >= 1 };
  if (status === 'sleep') return { cured: turnsActive >= 2 };
  if (status === 'confusion') return { cured: turnsActive >= 3 };
  // burn, paralysis, poison — never auto-cure
  return { cured: false };
}
