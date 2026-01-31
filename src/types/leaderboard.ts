/**
 * Leaderboard Types
 *
 * Type definitions for the NFT-gated leaderboard system.
 */

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatar: {
    type: 'emoji' | 'nft';
    value: string;
    source: 'default' | 'user' | 'wallet';
  };
  score: number;
  level?: number;
  createdAt: string;
  isCurrentUser?: boolean; // Added client-side
  equipped?: {
    nameEffect?: {
      id: string;
      css_class: string;
    };
    frame?: {
      id: string;
      css_class: string;
    };
    title?: {
      id: string;
      name: string;
    };
  };
}

export interface LeaderboardResponse {
  gameId: string;
  entries: LeaderboardEntry[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface PersonalStats {
  gameId: string;
  highScore: number;
  totalGamesPlayed: number;
  totalScore: number;
  averageScore: number;
  bestRank?: number;
  lastPlayedAt: Date;
}

export interface LeaderboardFilter {
  gameId: string;
  timeframe: 'all-time' | 'weekly' | 'daily';
  limit?: number;
}

export interface LeaderboardState {
  entries: LeaderboardEntry[];
  userRank: number | null;
  userEntry: LeaderboardEntry | null;
  isLoading: boolean;
  error: string | null;
  canCompete: boolean;
}

export interface SubmitScoreResult {
  success: boolean;
  isNewHighScore: boolean;
  newRank?: number;
  previousRank?: number;
  addedToLeaderboard: boolean;
  orangesEarned: number;
}

export type GameId =
  | 'orange-stack'
  | 'memory-match'
  | 'orange-pong'
  | 'wojak-runner'
  | 'orange-juggle'
  | 'knife-game'
  | 'color-reaction'
  | 'merge-2048'
  | 'block-puzzle'
  | 'flappy-orange'
  | 'citrus-drop'
  | 'orange-snake'
  | 'brick-breaker'
  | 'wojak-whack';

export const GAME_NAMES: Record<GameId, string> = {
  'orange-stack': 'Brick by Brick',
  'memory-match': 'Memory Match',
  'orange-pong': 'Orange Pong',
  'wojak-runner': 'Wojak Runner',
  'orange-juggle': 'Orange Juggle',
  'knife-game': 'The Knife Game',
  'color-reaction': 'Color Reaction',
  'merge-2048': 'Wojak Merge',
  'block-puzzle': 'Block Puzzle',
  'flappy-orange': 'Flappy Orange',
  'citrus-drop': 'Citrus Drop',
  'orange-snake': 'Orange Snake',
  'brick-breaker': 'Brick Breaker',
  'wojak-whack': 'Wojak Whack',
};

// Active games (not disabled) - shown prominently
export const ACTIVE_GAME_IDS: GameId[] = [
  'orange-stack',
  'memory-match',
  'flappy-orange',
  'wojak-runner',
  'color-reaction',
  'block-puzzle',
  'merge-2048',
];

// Disabled games (coming soon) - greyed out
export const DISABLED_GAME_IDS: GameId[] = [
  'orange-pong',
  'orange-juggle',
  'knife-game',
  'citrus-drop',
  'orange-snake',
  'brick-breaker',
  'wojak-whack',
];

export const GAME_IDS = Object.keys(GAME_NAMES) as GameId[];
