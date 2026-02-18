// src/lib/combat/data/type-colors.ts
// Type color map — ported from ClawCombat type-colors.js
// Canonical hex colors for 18 combat types

import type { CombatType } from '../types';

export const TYPE_COLORS: Record<CombatType, string> = {
  NEUTRAL:  '#A8A878',
  FIRE:     '#F08030',
  WATER:    '#6890F0',
  ELECTRIC: '#F8D030',
  GRASS:    '#78C850',
  ICE:      '#98D8D8',
  MARTIAL:  '#C03028',
  VENOM:    '#A040A0',
  EARTH:    '#E0C068',
  AIR:      '#A890F0',
  PSYCHE:   '#F85888',
  INSECT:   '#A8B820',
  STONE:    '#B8A038',
  GHOST:    '#705898',
  DRAGON:   '#7038F8',
  SHADOW:   '#705848',
  METAL:    '#B8B8D0',
  MYSTIC:   '#EE99AC',
};

/** Types whose badge backgrounds are light enough to need dark text */
export const DARK_TEXT_TYPES: CombatType[] = [
  'NEUTRAL', 'ELECTRIC', 'ICE', 'EARTH', 'INSECT', 'STONE', 'METAL', 'MYSTIC',
];

/** Safe color lookup, case-insensitive, falls back to #666666 */
export function getTypeColor(typeName: string): string {
  const key = typeName.toUpperCase() as CombatType;
  return TYPE_COLORS[key] ?? '#666666';
}

/** Flash overlay colors for screen effects (brighter versions) */
export const TYPE_FLASH_COLORS: Record<CombatType, string> = {
  NEUTRAL:  '#D4D4A0',
  FIRE:     '#FF9040',
  WATER:    '#88B0FF',
  ELECTRIC: '#FFEE60',
  GRASS:    '#A0E870',
  ICE:      '#C0F0F0',
  MARTIAL:  '#E04038',
  VENOM:    '#C060C0',
  EARTH:    '#F0D888',
  AIR:      '#C8B0FF',
  PSYCHE:   '#FF78A8',
  INSECT:   '#C8D830',
  STONE:    '#D8C058',
  GHOST:    '#9078B8',
  DRAGON:   '#9058FF',
  SHADOW:   '#907868',
  METAL:    '#D8D8F0',
  MYSTIC:   '#FFB9CC',
};
