/**
 * Orange Pong - Game Configuration
 */

import type { GameConfig } from '@/systems/game-ui/types';

export const PADDLE_HEIGHT = 80;
export const PADDLE_WIDTH = 12;
export const BALL_SIZE = 30;
export const WIN_SCORE = 5;
export const AI_SPEED = 3.0;
export const AI_REACTION_ZONE = 20;

export const SAD_IMAGES = Array.from(
  { length: 19 },
  (_, i) => `/assets/Games/games_media/sad_runner_${i + 1}.webp`
);

export const ORANGE_PONG_CONFIG: GameConfig = {
  id: 'orange-pong',
  name: 'Orange Pong',
  description: 'Classic Pong with an orange twist! First to 5 points wins.',
  emoji: '🏓',
  primaryColor: '#ff6b00',
  secondaryColor: '#ffa500',

  rewards: {
    baseOranges: 5,
    bonusThresholds: [
      { score: 100, oranges: 5 },
      { score: 250, oranges: 10 },
      { score: 500, oranges: 20 },
    ],
  },

  leaderboardId: 'orange-pong',

  settings: {
    hasLives: false,
    hasTimer: false,
    hasComboSystem: true,
  },
};

export default ORANGE_PONG_CONFIG;
