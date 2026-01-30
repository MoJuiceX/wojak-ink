/**
 * Wojak Runner - Game Configuration
 */

import type { GameConfig } from '@/systems/game-ui/types';

export const LANE_WIDTH = 80;
export const PLAYER_SIZE = 50;
export const OBSTACLE_SIZE = 45;
export const COLLECTIBLE_SIZE = 35;

export const SAD_IMAGES = Array.from(
  { length: 19 },
  (_, i) => `/assets/Games/games_media/sad_runner_${i + 1}.webp`
);

export const WOJAK_RUNNER_CONFIG: GameConfig = {
  id: 'wojak-runner',
  name: 'Wojak Runner',
  description: 'Run and dodge obstacles! Collect oranges and survive as long as you can.',
  emoji: '🏃',
  primaryColor: '#32cd32',
  secondaryColor: '#ff6b00',

  rewards: {
    baseOranges: 5,
    bonusThresholds: [
      { score: 500, oranges: 10 },
      { score: 1000, oranges: 20 },
      { score: 2500, oranges: 50 },
    ],
    streakMultiplier: 0.1,
  },

  leaderboardId: 'wojak-runner',

  settings: {
    hasComboSystem: true,
    hasLives: false,
  },
};

export default WOJAK_RUNNER_CONFIG;
