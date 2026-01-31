/**
 * Centralized Scoring Configuration
 * 
 * Shared constants for game scoring rules across all games.
 */

// Minimum actions required for leaderboard eligibility
export const MINIMUM_ACTIONS = {
  'memory-match': 3,      // 3 matches
  'flappy-orange': 3,     // 3 pipes
  'wojak-runner': 3,      // 3 oranges
  'color-reaction': 3,    // 3 correct taps
  'merge-2048': 3,        // 3 merges
  'block-puzzle': 3,      // 3 pieces
  'orange-stack': 3,      // 3 blocks (Brick by Brick)
} as const;

export type GameId = keyof typeof MINIMUM_ACTIONS;

// Default message when player doesn't meet minimum actions
export const LEADERBOARD_THRESHOLD_MESSAGE = 'Earn more points to be on the leaderboard';

// Get minimum actions for a specific game
export function getMinimumActions(gameId: GameId): number {
  return MINIMUM_ACTIONS[gameId] || 3;
}
