// src/lib/combat/xp-elo-calculator.ts
// XP award, ELO change, and level calculation formulas

const BASE_XP = 50;
const K_FACTOR = 32;
const MAX_LEVEL = 100;

/**
 * Calculate XP awarded for a battle.
 *
 * Winner: base_xp × (1 + opponent_level / own_level × 0.5) × (1 + abs(elo_diff) / 400 × 0.25)
 * Loser:  base_xp × 0.3
 * Draw:   base_xp × 0.5
 */
export function calculateXPAward(
  result: 'win' | 'loss' | 'draw',
  ownLevel: number,
  oppLevel: number,
  ownElo: number,
  oppElo: number,
): number {
  if (result === 'loss') return Math.floor(BASE_XP * 0.3);
  if (result === 'draw') return Math.floor(BASE_XP * 0.5);

  // Winner formula
  const levelFactor = 1 + (oppLevel / ownLevel) * 0.5;
  const eloFactor = 1 + (Math.abs(oppElo - ownElo) / 400) * 0.25;
  return Math.floor(BASE_XP * levelFactor * eloFactor);
}

/**
 * Calculate ELO rating change using standard formula with K=32.
 *
 * expected = 1 / (1 + 10^((opponent_elo - own_elo) / 400))
 * change = round(32 × (result - expected))
 *
 * @param result - 1.0 = win, 0.5 = draw, 0.0 = loss
 */
export function calculateELOChange(
  ownElo: number,
  oppElo: number,
  result: number,
): number {
  const expected = 1 / (1 + Math.pow(10, (oppElo - ownElo) / 400));
  return Math.round(K_FACTOR * (result - expected));
}

/**
 * Calculate level from total XP.
 * Formula: xp_required(L) = floor(L^2.5 × 10)
 * Find highest L where xp_required(L) ≤ totalXP.
 * Caps at level 100.
 */
export function calculateLevelFromXP(totalXP: number): number {
  if (totalXP <= 0) return 1;

  let level = 1;
  for (let L = 2; L <= MAX_LEVEL; L++) {
    const required = Math.floor(Math.pow(L, 2.5) * 10);
    if (required > totalXP) break;
    level = L;
  }
  return level;
}
