/**
 * Combat type display constants — shared between generator sort bar and any other UI.
 */

import type { CombatType } from './types';

/**
 * Type emoji mapping - each type gets a distinctive emoji
 */
export const TYPE_EMOJI: Record<CombatType, string> = {
  NEUTRAL: '⚪',
  FIRE: '🔥',
  WATER: '💧',
  ELECTRIC: '⚡',
  GRASS: '🌿',
  ICE: '❄️',
  MARTIAL: '🥊',
  VENOM: '☠️',
  EARTH: '🏔️',
  AIR: '🌪️',
  PSYCHE: '🔮',
  INSECT: '🐛',
  STONE: '🪨',
  GHOST: '👻',
  DRAGON: '🐉',
  SHADOW: '🌑',
  METAL: '⚙️',
  MYSTIC: '✨',
};

/**
 * Type display names - title case for UI
 */
export const TYPE_NAME: Record<CombatType, string> = {
  NEUTRAL: 'Neutral',
  FIRE: 'Fire',
  WATER: 'Water',
  ELECTRIC: 'Electric',
  GRASS: 'Grass',
  ICE: 'Ice',
  MARTIAL: 'Martial',
  VENOM: 'Venom',
  EARTH: 'Earth',
  AIR: 'Air',
  PSYCHE: 'Psyche',
  INSECT: 'Insect',
  STONE: 'Stone',
  GHOST: 'Ghost',
  DRAGON: 'Dragon',
  SHADOW: 'Shadow',
  METAL: 'Metal',
  MYSTIC: 'Mystic',
};
