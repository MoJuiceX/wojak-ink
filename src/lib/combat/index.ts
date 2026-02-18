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
