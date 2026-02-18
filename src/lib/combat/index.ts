// src/lib/combat/index.ts — barrel export

export * from './types';
export { calculateCombatIdentity } from './identity-calculator';
export { getEffectiveness, TYPE_CHART } from './data/type-chart';
export { NATURES, getNature, getNatureByStats } from './data/natures';
export { BASE_STATS, getBaseStats } from './data/base-stats';
export { ABILITIES, getAbilitiesForType, getAbility } from './data/abilities';
export { MOVES, getMovePoolForType, getMoveById, validateMoveSelection } from './data/moves';
export { getTraitCombat } from './data/trait-type-map';
export { getTypePointsForColor } from './data/color-type-map';
export { getNaturePointsForColor } from './data/color-nature-map';
export { getDetailBonus } from './data/detail-combat-map';

// Phase 3: Battle Engine
export { calculateHP, calculateStat, calculateAllStats } from './stat-calculator';
export { initFighterState, initBattleState } from './battle-state';
export type { FighterState, BattleState, TurnResult, FighterData } from './battle-state';
export { calculateDamage, getStatStageMultiplier } from './damage-calculator';
export { applyStatusDamage, checkStatusSkip, tickStatus } from './status-effects';
export { getAbilityEffect } from './ability-effects';
export type { AbilityContext, AbilityEffect } from './ability-effects';
export { resolveTurn } from './turn-resolver';
export { runAutoBattle } from './battle-runner';
export type { BattleResult } from './battle-runner';
export { chooseMove, rankMoves } from './ai-strategist';
export { calculateXPAward, calculateELOChange, calculateLevelFromXP } from './xp-elo-calculator';
