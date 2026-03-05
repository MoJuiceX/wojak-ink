/**
 * Leaderboard Data Hook
 *
 * Manages global leaderboard data for games.
 * - Fetches top scores (public)
 * - Auto-submits scores for logged-in users
 * - Falls back to local storage for guests
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useAuth } from '@/lib/clerkSafe';
import { leaderboardKeys } from '@/config/query/queryKeys';
import { DATA_CACHE_MAP } from '@/config/query/cacheConfig';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAchievements } from '@/contexts/AchievementsContext';

// Check if Clerk is configured
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

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
  /** Alias for createdAt for backward compatibility */
  date?: string;
  isCurrentUser?: boolean;
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

export interface SubmitResult {
  success: boolean;
  scoreId?: number;
  rank?: number;
  isNewHighScore?: boolean;
  previousHighScore?: number | null;
  currentStreak?: number;
  isNewDay?: boolean;
  error?: string;
}

interface UserPosition {
  rank: number;
  score: number;
  totalPlayers: number;
  nextRival?: {
    userId: string;
    displayName: string;
    avatar: {
      type: 'emoji' | 'nft';
      value: string;
    };
    score: number;
    pointsAhead: number;
  };
}

interface LeaderboardResponse {
  gameId: string;
  timeframe: 'weekly' | 'all-time';
  entries: LeaderboardEntry[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  userPosition?: UserPosition;
  resetTime?: string;
}

/**
 * Fetch leaderboard entries for a game
 */
async function fetchLeaderboard(
  gameId: string,
  limit: number = 10,
  offset: number = 0
): Promise<LeaderboardResponse> {
  const response = await fetch(
    `/api/leaderboard/${gameId}?limit=${limit}&offset=${offset}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }

  return response.json();
}

/**
 * Hook for managing game leaderboard
 */
export function useLeaderboard(gameId: string) {
  const queryClient = useQueryClient();
  const { authenticatedFetch, isSignedIn, isLoaded: isAuthLoaded } = useAuthenticatedFetch();
  const { profile } = useUserProfile();
  const { recordGamePlayed, recordLeaderboardRank, checkAchievements } = useAchievements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Always call hooks unconditionally (rules of hooks)
  const clerkAuth = useAuth();
  const authResult = CLERK_ENABLED ? clerkAuth : { userId: null };
  const currentUserId = authResult.userId;

  // Fetch top 10 leaderboard with current user marking
  const leaderboardQuery = useQuery({
    queryKey: leaderboardKeys.top10(gameId),
    queryFn: async () => {
      const data = await fetchLeaderboard(gameId, 10);

      // Mark current user's entry
      if (currentUserId) {
        data.entries = data.entries.map(entry => ({
          ...entry,
          isCurrentUser: entry.userId === currentUserId,
        }));
      }

      return data;
    },
    // Don't fetch if gameId is undefined/null
    enabled: !!gameId,
    ...DATA_CACHE_MAP.leaderboard,
  });

  // Submit score to leaderboard (authenticated users only)
  // Uses idempotency key to prevent duplicate submissions from retries
  const submitScore = useCallback(
    async (
      score: number,
      level?: number,
      metadata?: Record<string, unknown>
    ): Promise<SubmitResult> => {
      if (!isSignedIn) {
        return { success: false, error: 'Not signed in' };
      }

      setIsSubmitting(true);

      // Generate idempotency key to prevent duplicate submissions
      // This ensures network retries don't create duplicate scores
      const idempotencyKey = crypto.randomUUID();

      try {
        const response = await authenticatedFetch('/api/leaderboard/submit', {
          method: 'POST',
          body: JSON.stringify({ gameId, score, level, metadata, idempotencyKey }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || 'Failed to submit score',
          };
        }

        const result = await response.json();

        // Invalidate leaderboard cache to show updated rankings
        queryClient.invalidateQueries({ queryKey: leaderboardKeys.game(gameId) });

        // Record game for achievements (skip if duplicate submission)
        if (!result.duplicate) {
          recordGamePlayed(gameId, score);
          if (result.rank) {
            recordLeaderboardRank(result.rank);
          }
          // Check if any achievements were unlocked
          checkAchievements();
        }

        return {
          success: true,
          scoreId: result.scoreId,
          rank: result.rank,
          isNewHighScore: result.isNewHighScore,
          previousHighScore: result.previousHighScore,
          currentStreak: result.currentStreak,
          isNewDay: result.isNewDay,
        };
      } catch (error) {
        console.error('[Leaderboard] Submit error:', error);
        return { success: false, error: 'Network error' };
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSignedIn, authenticatedFetch, gameId, queryClient, recordGamePlayed, recordLeaderboardRank, checkAchievements]
  );

  // Fetch extended leaderboard (top 100)
  const fetchExtendedLeaderboard = useCallback(async (): Promise<
    LeaderboardEntry[]
  > => {
    try {
      const data = await fetchLeaderboard(gameId, 100);
      return data.entries;
    } catch (error) {
      console.error('[Leaderboard] Extended fetch error:', error);
      return [];
    }
  }, [gameId]);

  // Get user's display name for auto-submission
  const userDisplayName = profile?.displayName || null;

  return {
    // Leaderboard data
    leaderboard: leaderboardQuery.data?.entries || [],
    isLoading: leaderboardQuery.isLoading,
    isError: leaderboardQuery.isError,
    error: leaderboardQuery.error,

    // Actions
    submitScore,
    fetchExtendedLeaderboard,
    refetch: leaderboardQuery.refetch,

    // Auth state
    isSignedIn,
    isAuthLoaded, // Whether Clerk has finished initializing
    userDisplayName,
    isSubmitting,
  };
}

export default useLeaderboard;
