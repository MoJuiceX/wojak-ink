/* eslint-disable react-refresh/only-export-components */
/**
 * Leaderboard Context
 *
 * Manages leaderboard state, score submission, and personal stats.
 * Only Google-authenticated users can submit scores to leaderboards.
 * Non-logged-in users can VIEW leaderboards but cannot submit scores.
 * NFT avatars get premium visual treatment (gold glow, verified badge).
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type {
  LeaderboardEntry,
  LeaderboardFilter,
  LeaderboardState,
  PersonalStats,
  SubmitScoreResult,
  GameId,
} from '../types/leaderboard';

// Stored score record shape (from localStorage)
interface StoredScore {
  id?: string;
  userId: string;
  googleId: string;
  gameId: string;
  score: number;
  level?: number;
  achievedAt: string;
}

// User record shape (from localStorage)
interface StoredUser {
  id?: string;
  username?: string;
  displayName?: string;
  avatar?: { type?: string; value?: string; source?: string };
}

// Storage keys
const SCORES_KEY = 'wojak_scores';
// const STATS_KEY = 'wojak_personal_stats'; // Reserved for future use

interface LeaderboardContextType {
  leaderboard: LeaderboardState;
  personalStats: Map<GameId, PersonalStats>;
  fetchLeaderboard: (filter: LeaderboardFilter) => Promise<void>;
  fetchPersonalStats: (gameId: GameId) => Promise<PersonalStats | null>;
  submitScore: (gameId: GameId, score: number) => Promise<SubmitScoreResult>;
  canUserCompete: () => boolean;
  getUserRankForGame: (gameId: GameId) => number | null;
}

const LeaderboardContext = createContext<LeaderboardContextType | undefined>(undefined);

export const LeaderboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardState>({
    entries: [],
    userRank: null,
    userEntry: null,
    isLoading: false,
    error: null,
    canCompete: false,
  });
  const [personalStats, setPersonalStats] = useState<Map<GameId, PersonalStats>>(new Map());

  // Check if user can compete (requires Google sign-in only, NFT not required)
  const canUserCompete = useCallback((): boolean => {
    return !!user;
  }, [user]);

  // Get all scores from localStorage
  const getAllScores = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    } catch {
      return [];
    }
  }, []);

  // Get all users from localStorage
  const getAllUsers = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem('wojak_users') || '{}');
    } catch {
      return {};
    }
  }, []);

  // Filter scores by timeframe
  const filterByTimeframe = useCallback((
    scores: StoredScore[],
    timeframe: 'all-time' | 'weekly' | 'daily'
  ) => {
    const now = new Date();

    if (timeframe === 'daily') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return scores.filter(s => new Date(s.achievedAt) >= startOfDay);
    }

    if (timeframe === 'weekly') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return scores.filter(s => new Date(s.achievedAt) >= startOfWeek);
    }

    return scores; // all-time
  }, []);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async (filter: LeaderboardFilter) => {
    setLeaderboard(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      const allScores = getAllScores();
      const allUsers = getAllUsers();

      // Filter by game and timeframe
      const gameScores = allScores.filter((s: StoredScore) => s.gameId === filter.gameId);
      const filteredScores = filterByTimeframe(gameScores, filter.timeframe);

      // Get best score per signed-in user
      const userBestScores = new Map<string, StoredScore & { username?: string; displayName?: string; avatar?: StoredUser['avatar'] }>();

      filteredScores.forEach((score: StoredScore) => {
        const userData = allUsers[score.googleId] as StoredUser | undefined;
        if (!userData) return;

        // Include all signed-in users on leaderboard (NFT not required)
        const existing = userBestScores.get(score.userId);
        if (!existing || score.score > existing.score) {
          userBestScores.set(score.userId, {
            ...score,
            username: userData.username || userData.displayName,
            displayName: userData.displayName,
            avatar: userData.avatar,
          });
        }
      });

      // Sort by score and assign ranks
      const sortedEntries = Array.from(userBestScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, filter.limit || 100)
        .map((entry, index): LeaderboardEntry => ({
          rank: index + 1,
          userId: entry.userId,
          displayName: entry.displayName || '',
          avatar: {
            type: (entry.avatar?.type as 'emoji' | 'nft') || 'emoji',
            value: entry.avatar?.value || '🎮',
            source: (entry.avatar?.source as 'default' | 'user' | 'wallet') || 'default',
          },
          score: entry.score,
          level: entry.level,
          createdAt: entry.achievedAt || new Date().toISOString(),
          isCurrentUser: user?.id === entry.userId,
        }));

      // Find current user's rank if they're an NFT holder
      let userRank: number | null = null;
      let userEntry: LeaderboardEntry | null = null;

      if (user && canUserCompete()) {
        const userEntryIndex = sortedEntries.findIndex(e => e.userId === user.id);
        if (userEntryIndex !== -1) {
          userRank = userEntryIndex + 1;
          userEntry = sortedEntries[userEntryIndex];
        }
      }

      setLeaderboard({
        entries: sortedEntries,
        userRank,
        userEntry,
        isLoading: false,
        error: null,
        canCompete: canUserCompete(),
      });
    } catch (error) {
      setLeaderboard(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch leaderboard',
      }));
    }
  }, [user, getAllScores, getAllUsers, filterByTimeframe, canUserCompete]);

  // Fetch personal stats for a game
  const fetchPersonalStats = useCallback(async (gameId: GameId): Promise<PersonalStats | null> => {
    if (!user) return null;

    try {
      const allScores = getAllScores();
      const userScores = allScores.filter(
        (s: StoredScore) => s.userId === user.id && s.gameId === gameId
      );

      if (userScores.length === 0) return null;

      const scores = userScores.map((s: StoredScore) => s.score);
      const stats: PersonalStats = {
        gameId,
        highScore: Math.max(...scores),
        totalGamesPlayed: userScores.length,
        totalScore: scores.reduce((a: number, b: number) => a + b, 0),
        averageScore: Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length),
        lastPlayedAt: new Date(Math.max(...userScores.map((s: StoredScore) => new Date(s.achievedAt).getTime()))),
      };

      // Calculate best rank for signed-in users
      if (canUserCompete()) {
        const allUsers = getAllUsers();
        const allGameScores = allScores.filter((s: StoredScore) => s.gameId === gameId);

        // Get best scores per signed-in user
        const bestScores: number[] = [];
        const userBest = new Map<string, number>();

        allGameScores.forEach((score: StoredScore) => {
          const userData = allUsers[score.googleId] as StoredUser | undefined;
          if (!userData) return;

          const existing = userBest.get(score.userId);
          if (!existing || score.score > existing) {
            userBest.set(score.userId, score.score);
          }
        });

        bestScores.push(...Array.from(userBest.values()));
        bestScores.sort((a, b) => b - a);

        const userBestScore = userBest.get(user.id);
        if (userBestScore) {
          stats.bestRank = bestScores.indexOf(userBestScore) + 1;
        }
      }

      setPersonalStats(prev => {
        const updated = new Map(prev);
        updated.set(gameId, stats);
        return updated;
      });

      return stats;
    } catch (error) {
      console.error('Failed to fetch personal stats:', error);
      return null;
    }
  }, [user, getAllScores, getAllUsers, canUserCompete]);

  // Submit a new score
  const submitScore = useCallback(async (
    gameId: GameId,
    score: number
  ): Promise<SubmitScoreResult> => {
    if (!user) {
      return {
        success: false,
        isNewHighScore: false,
        addedToLeaderboard: false,
        orangesEarned: 0,
      };
    }

    try {
      const allScores = getAllScores();

      // Check if this is a new high score
      const userGameScores = allScores.filter(
        (s: StoredScore) => s.userId === user.id && s.gameId === gameId
      );
      const previousHighScore = userGameScores.length > 0
        ? Math.max(...userGameScores.map((s: StoredScore) => s.score))
        : 0;
      const isNewHighScore = score > previousHighScore;

      // Create new score entry
      const newScore = {
        id: crypto.randomUUID(),
        userId: user.id,
        googleId: user.googleId,
        gameId,
        score,
        achievedAt: new Date().toISOString(),
      };

      // Save score
      allScores.push(newScore);
      localStorage.setItem(SCORES_KEY, JSON.stringify(allScores));

      // Calculate new rank if NFT holder
      let newRank: number | undefined;
      let previousRank: number | undefined;
      const addedToLeaderboard = canUserCompete();

      if (addedToLeaderboard) {
        const allUsers = getAllUsers();
        const allGameScores = allScores.filter((s: StoredScore) => s.gameId === gameId);

        // Get best scores per signed-in user
        const userBest = new Map<string, number>();
        allGameScores.forEach((s: StoredScore) => {
          const userData = allUsers[s.googleId] as StoredUser | undefined;
          if (!userData) return;

          const existing = userBest.get(s.userId);
          if (!existing || s.score > existing) {
            userBest.set(s.userId, s.score);
          }
        });

        const sortedScores = Array.from(userBest.entries())
          .sort((a, b) => b[1] - a[1]);

        newRank = sortedScores.findIndex(([id]) => id === user.id) + 1;

        // Calculate previous rank (before this score)
        if (previousHighScore > 0) {
          userBest.set(user.id, previousHighScore);
          const prevSorted = Array.from(userBest.entries())
            .sort((a, b) => b[1] - a[1]);
          previousRank = prevSorted.findIndex(([id]) => id === user.id) + 1;
        }
      }

      // Calculate oranges earned (base amount + bonus for high scores)
      let orangesEarned = Math.floor(score / 10); // Base: 1 orange per 10 points
      if (isNewHighScore) {
        orangesEarned += 50; // Bonus for new high score
      }
      if (newRank && newRank <= 10) {
        orangesEarned += (11 - newRank) * 10; // Bonus for top 10
      }

      // Update personal stats
      fetchPersonalStats(gameId);

      return {
        success: true,
        isNewHighScore,
        newRank,
        previousRank,
        addedToLeaderboard,
        orangesEarned,
      };
    } catch (error) {
      console.error('Score submission failed:', error);
      return {
        success: false,
        isNewHighScore: false,
        addedToLeaderboard: false,
        orangesEarned: 0,
      };
    }
  }, [user, getAllScores, getAllUsers, canUserCompete, fetchPersonalStats]);

  // Get user's rank for a specific game
  const getUserRankForGame = useCallback((gameId: GameId): number | null => {
    const stats = personalStats.get(gameId);
    return stats?.bestRank || null;
  }, [personalStats]);

  return (
    <LeaderboardContext.Provider
      value={{
        leaderboard,
        personalStats,
        fetchLeaderboard,
        fetchPersonalStats,
        submitScore,
        canUserCompete,
        getUserRankForGame,
      }}
    >
      {children}
    </LeaderboardContext.Provider>
  );
};

export const useLeaderboard = () => {
  const context = useContext(LeaderboardContext);
  if (!context) {
    throw new Error('useLeaderboard must be used within LeaderboardProvider');
  }
  return context;
};
