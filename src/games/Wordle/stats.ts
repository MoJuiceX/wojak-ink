/**
 * Wordle Statistics Utility
 *
 * Handles localStorage persistence for game statistics including:
 * - Games played/won
 * - Current streak & max streak
 * - Guess distribution (1-6 guesses)
 */

import { safeStorage } from '@/utils/safeStorage';

export interface WordleStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[]; // Index 0 = wins in 1 guess, index 5 = wins in 6 guesses
  lastPlayedDate: string | null; // ISO date string (YYYY-MM-DD)
  lastCompletedDate: string | null; // For streak calculation
}

const STORAGE_KEY = 'wojak-wordle-stats';

/**
 * Get default stats object
 */
export function getDefaultStats(): WordleStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: [0, 0, 0, 0, 0, 0], // 6 slots for guesses 1-6
    lastPlayedDate: null,
    lastCompletedDate: null,
  };
}

/**
 * Load stats from localStorage
 * Returns defaults if missing or invalid
 */
export function loadStats(): WordleStats {
  const stored = safeStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return getDefaultStats();
  }

  try {
    const parsed = JSON.parse(stored);

    // Validate structure
    if (
      typeof parsed.gamesPlayed !== 'number' ||
      typeof parsed.gamesWon !== 'number' ||
      !Array.isArray(parsed.guessDistribution)
    ) {
      console.warn('[Wordle Stats] Invalid stored stats, returning defaults');
      return getDefaultStats();
    }

    // Ensure guessDistribution has 6 slots
    if (parsed.guessDistribution.length !== 6) {
      parsed.guessDistribution = [0, 0, 0, 0, 0, 0];
    }

    return {
      gamesPlayed: parsed.gamesPlayed || 0,
      gamesWon: parsed.gamesWon || 0,
      currentStreak: parsed.currentStreak || 0,
      maxStreak: parsed.maxStreak || 0,
      guessDistribution: parsed.guessDistribution,
      lastPlayedDate: parsed.lastPlayedDate || null,
      lastCompletedDate: parsed.lastCompletedDate || null,
    };
  } catch (error) {
    console.error('[Wordle Stats] Failed to load stats:', error);
    return getDefaultStats();
  }
}

/**
 * Save stats to localStorage
 */
export function saveStats(stats: WordleStats): void {
  safeStorage.setJSON(STORAGE_KEY, stats);
}

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a date string is yesterday
 */
function isYesterday(dateString: string | null): boolean {
  if (!dateString) return false;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString().split('T')[0];

  return dateString === yesterdayString;
}

/**
 * Check if a date string is today
 */
function isToday(dateString: string | null): boolean {
  if (!dateString) return false;
  return dateString === getTodayString();
}

/**
 * Update stats after a game completes
 * @param won - Whether the player won
 * @param numGuesses - Number of guesses used (1-6)
 * @returns Updated stats
 */
export function updateStatsAfterGame(won: boolean, numGuesses: number): WordleStats {
  const stats = loadStats();
  const today = getTodayString();

  // Increment games played
  stats.gamesPlayed += 1;
  stats.lastPlayedDate = today;

  if (won) {
    // Increment wins
    stats.gamesWon += 1;

    // Update guess distribution (numGuesses is 1-6, array index is 0-5)
    const guessIndex = Math.min(Math.max(numGuesses - 1, 0), 5);
    stats.guessDistribution[guessIndex] += 1;

    // Handle streak
    if (isToday(stats.lastCompletedDate)) {
      // Already won today, keep current streak
    } else if (isYesterday(stats.lastCompletedDate)) {
      // Won yesterday, increment streak
      stats.currentStreak += 1;
    } else {
      // Gap in wins, start new streak
      stats.currentStreak = 1;
    }

    // Update max streak
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.lastCompletedDate = today;
  } else {
    // Lost - reset current streak
    stats.currentStreak = 0;
  }

  // Save and return
  saveStats(stats);
  return stats;
}

/**
 * Calculate win percentage
 */
export function getWinPercentage(stats: WordleStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
}

/**
 * Get the maximum value in guess distribution (for bar chart scaling)
 */
export function getMaxDistribution(stats: WordleStats): number {
  return Math.max(...stats.guessDistribution, 1); // Min 1 to avoid division by zero
}
