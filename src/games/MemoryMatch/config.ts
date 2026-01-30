/**
 * Memory Match - Game Configuration
 *
 * Match pairs of NFT cards before time runs out!
 * Progressive rounds with increasing difficulty.
 */

import type { GameConfig } from '@/systems/game-ui/types';

// Round configuration - pairs and optional base filter
export const ROUND_CONFIG: { pairs: number; baseFilter?: string }[] = [
  { pairs: 6 },       // Round 1: 12 cards (4x3)
  { pairs: 8 },       // Round 2: 16 cards (4x4)
  { pairs: 9 },       // Round 3: 18 cards (6x3)
  { pairs: 10 },      // Round 4: 20 cards (5x4)
  { pairs: 12 },      // Round 5: 24 cards (6x4)
  { pairs: 15 },      // Round 6: 30 cards (6x5)
  { pairs: 18 },      // Round 7: 36 cards (6x6)
  { pairs: 21 },      // Round 8: 42 cards (6x7)
  { pairs: 24 },      // Round 9: 48 cards (6x8)
  { pairs: 27 },      // Round 10: 54 cards (6x9) - MAX size
  // Similar-looking NFT filters for extra difficulty
  { pairs: 27, baseFilter: 'Alien Baddie' },
  { pairs: 27, baseFilter: 'Alien Waifu' },
  { pairs: 27, baseFilter: 'Bepe Baddie' },
  { pairs: 27, baseFilter: 'Bepe Waifu' },
  { pairs: 27, baseFilter: 'Wojak' },
];

// Base time for round 1, increases 20% each round
export const BASE_TIME = 35;
export const TIME_INCREASE_PER_ROUND = 1.20;

// Sad images for game over screen
export const SAD_IMAGES = Array.from(
  { length: 19 },
  (_, i) => `/assets/Games/games_media/sad_runner_${i + 1}.webp`
);

// Grid layout map for card counts
export const GRID_MAP: Record<number, { cols: number; rows: number }> = {
  12: { cols: 4, rows: 3 },
  16: { cols: 4, rows: 4 },
  18: { cols: 6, rows: 3 },
  20: { cols: 5, rows: 4 },
  24: { cols: 6, rows: 4 },
  30: { cols: 6, rows: 5 },
  36: { cols: 6, rows: 6 },
  42: { cols: 7, rows: 6 },
  48: { cols: 8, rows: 6 },
  54: { cols: 9, rows: 6 },
};

// Helper to get round config
export const getRoundConfig = (round: number): { pairs: number; time: number; baseFilter?: string } => {
  const index = Math.min(round - 1, ROUND_CONFIG.length - 1);
  const config = ROUND_CONFIG[index];
  const time = Math.floor(BASE_TIME * Math.pow(TIME_INCREASE_PER_ROUND, round - 1));
  return { ...config, time };
};

// Game identity configuration
export const MEMORY_MATCH_CONFIG: GameConfig = {
  id: 'memory-match',
  name: 'Memory Match',
  description: 'Match pairs of NFT cards before time runs out! How many rounds can you complete?',
  emoji: '🧠',
  primaryColor: '#8b5cf6',
  secondaryColor: '#a855f7',
  backgroundImage: '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Orange Grove.png',

  rewards: {
    baseOranges: 10,
    bonusThresholds: [
      { score: 500, oranges: 5 },
      { score: 1000, oranges: 10 },
      { score: 2000, oranges: 20 },
      { score: 5000, oranges: 50 },
    ],
    streakMultiplier: 0.15,
  },

  leaderboardId: 'memory-match',

  sounds: {
    cardFlip: '/assets/sounds/card_flip.mp3',
    match: '/assets/sounds/match.mp3',
    gameOver: '/assets/sounds/game_over.mp3',
    levelComplete: '/assets/sounds/level_complete.mp3',
  },

  settings: {
    hasLevels: true,
    maxLevels: 15,
    hasComboSystem: true,
    hasTimer: true,
  },
};

export default MEMORY_MATCH_CONFIG;
