/**
 * Knife Game - Game Configuration (Coming Soon)
 */

import type { GameConfig } from '@/systems/game-ui/types';

export const AUDIO_URL = '/assets/Games/games_media/The New Knife Game Song - Rusty Cage.mp3';
export const IMAGE_URL = '/assets/Games/games_media/Knife_Game.webp';

export const KNIFE_GAME_CONFIG: GameConfig = {
  id: 'knife-game',
  name: 'Knife Game',
  description: 'The classic knife game - stab between your fingers!',
  emoji: '🔪',
  primaryColor: '#dc2626',
  secondaryColor: '#991b1b',

  rewards: {
    baseOranges: 0,
    bonusThresholds: [],
  },

  settings: {
    // Coming soon - no gameplay yet
  },
};

export default KNIFE_GAME_CONFIG;
