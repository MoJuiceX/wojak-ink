/* eslint-disable react-refresh/only-export-components */
/**
 * Daily Challenges Context
 *
 * Manages daily challenge progress, completion tracking, and rewards.
 * Uses server-side API for bulletproof persistence.
 * Resets at midnight UTC.
 *
 * @see src/config/economy.ts for challenge rewards
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useCurrency } from './CurrencyContext';

// Check if Clerk is configured
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Challenge types
export type ChallengeType = 'games_played' | 'personal_best' | 'play_time_seconds';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export interface DailyChallenge {
  id: string;
  type: ChallengeType;
  name: string;
  description: string;
  icon: string;
  difficulty: ChallengeDifficulty;
  target: number;
  reward: number;
  progress: number;
  isCompleted: boolean;
  completedAt?: string;
  isClaimed: boolean;
  claimedAt?: string;
}

interface DailyChallengesState {
  date: string;
  challenges: DailyChallenge[];
  allCompleted: boolean;
  allClaimed: boolean;
  totalEarnedToday: number;
  timeUntilReset: number;
}

interface DailyChallengesContextType {
  // State
  state: DailyChallengesState | null;
  isLoading: boolean;

  // Progress tracking
  recordGamePlayed: (gameId: string) => Promise<void>;
  recordPersonalBest: (gameId: string, score: number) => Promise<void>;
  recordPlayTime: (seconds: number) => Promise<void>;

  // Rewards
  claimChallengeReward: (challengeId: string) => Promise<boolean>;

  // Info
  getChallengeById: (challengeId: string) => DailyChallenge | undefined;
  getProgressDisplay: (challengeId: string) => string;

  // Play time tracking
  startPlayTimeTracking: () => void;
  stopPlayTimeTracking: () => void;
  isTrackingPlayTime: boolean;

  // Refresh
  refresh: () => Promise<void>;
}

const DailyChallengesContext = createContext<DailyChallengesContextType | undefined>(undefined);

// Format seconds as M:SS
function formatPlayTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const DailyChallengesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Always call hooks unconditionally (rules of hooks)
  const clerkAuth = useAuth();
  const authResult = CLERK_ENABLED ? clerkAuth : { userId: null, isSignedIn: false, getToken: async () => null };
  const userId = authResult.userId;
  const isSignedIn = authResult.isSignedIn;
  const getToken = authResult.getToken;
  const { refreshBalance } = useCurrency();

  const [state, setState] = useState<DailyChallengesState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrackingPlayTime, setIsTrackingPlayTime] = useState(false);

  const playTimeIntervalRef = useRef<number | null>(null);
  const hasFetchedRef = useRef(false);

  /**
   * Make authenticated API call
   */
  const apiCall = useCallback(
    async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
      const token = await getToken?.();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return fetch(`/api/currency${endpoint}`, {
        ...options,
        headers,
      });
    },
    [getToken]
  );

  /**
   * Fetch challenges from server
   */
  const fetchChallenges = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      const response = await apiCall('/daily-challenges');
      if (response.ok) {
        const data = await response.json();
        setState({
          date: data.date,
          challenges: data.challenges,
          allCompleted: data.allCompleted,
          allClaimed: data.allClaimed,
          totalEarnedToday: data.totalEarnedToday,
          timeUntilReset: data.timeUntilReset,
        });
      }
    } catch (error) {
      console.error('[DailyChallenges] Failed to fetch:', error);
    }
  }, [isSignedIn, apiCall]);

  /**
   * Refresh challenges
   */
  const refresh = useCallback(async () => {
    await fetchChallenges();
  }, [fetchChallenges]);

  // Load data on mount and when user changes
  useEffect(() => {
    if (userId && isSignedIn) {
      if (!hasFetchedRef.current) {
        hasFetchedRef.current = true;
        setIsLoading(true); // eslint-disable-line react-hooks/set-state-in-effect -- loading state before async fetch
        fetchChallenges().finally(() => {
          setIsLoading(false);
        });
      }
    } else {
      setState(null);
      hasFetchedRef.current = false;
      setIsLoading(false);
    }
  }, [userId, isSignedIn, fetchChallenges]);

  // Check for day rollover periodically
  useEffect(() => {
    const checkDayRollover = () => {
      if (state) {
        const today = new Date().toISOString().split('T')[0];
        if (state.date !== today) {
          // New day - refresh challenges
          fetchChallenges();
        }
      }
    };

    const interval = setInterval(checkDayRollover, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [state, fetchChallenges]);

  /**
   * Record a game played
   */
  const recordGamePlayed = useCallback(
    async (gameId: string) => {
      if (!isSignedIn) return;

      try {
        const response = await apiCall('/daily-challenges', {
          method: 'POST',
          body: JSON.stringify({ action: 'record_game', gameId }),
        });

        if (response.ok) {
          const data = await response.json();

          // Update local state optimistically
          setState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              challenges: prev.challenges.map((c) =>
                c.id === 'games-played-5'
                  ? { ...c, progress: data.progress, isCompleted: data.isCompleted }
                  : c
              ),
              allCompleted: prev.challenges.every((c) =>
                c.id === 'games-played-5' ? data.isCompleted : c.isCompleted
              ),
            };
          });
        }
      } catch (error) {
        console.error('[DailyChallenges] Failed to record game:', error);
      }
    },
    [isSignedIn, apiCall]
  );

  /**
   * Record a personal best
   */
  const recordPersonalBest = useCallback(
    async (gameId: string, _score: number) => {
      if (!isSignedIn) return;

      try {
        const response = await apiCall('/daily-challenges', {
          method: 'POST',
          body: JSON.stringify({ action: 'record_personal_best', gameId }),
        });

        if (response.ok) {
          const data = await response.json();

          setState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              challenges: prev.challenges.map((c) =>
                c.id === 'personal-best-1'
                  ? { ...c, progress: data.progress, isCompleted: data.isCompleted }
                  : c
              ),
              allCompleted: prev.challenges.every((c) =>
                c.id === 'personal-best-1' ? data.isCompleted : c.isCompleted
              ),
            };
          });
        }
      } catch (error) {
        console.error('[DailyChallenges] Failed to record personal best:', error);
      }
    },
    [isSignedIn, apiCall]
  );

  /**
   * Record play time (in seconds)
   */
  const recordPlayTime = useCallback(
    async (seconds: number) => {
      if (!isSignedIn) return;

      try {
        const response = await apiCall('/daily-challenges', {
          method: 'POST',
          body: JSON.stringify({ action: 'record_play_time', seconds }),
        });

        if (response.ok) {
          const data = await response.json();

          setState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              challenges: prev.challenges.map((c) =>
                c.id === 'play-time-600'
                  ? { ...c, progress: data.progress, isCompleted: data.isCompleted }
                  : c
              ),
              allCompleted: prev.challenges.every((c) =>
                c.id === 'play-time-600' ? data.isCompleted : c.isCompleted
              ),
            };
          });
        }
      } catch (error) {
        console.error('[DailyChallenges] Failed to record play time:', error);
      }
    },
    [isSignedIn, apiCall]
  );

  /**
   * Start tracking play time
   */
  const startPlayTimeTracking = useCallback(() => {
    if (isTrackingPlayTime) return;

    setIsTrackingPlayTime(true);

    // Record 1 second every second
    playTimeIntervalRef.current = window.setInterval(() => {
      recordPlayTime(1);
    }, 1000);
  }, [isTrackingPlayTime, recordPlayTime]);

  /**
   * Stop tracking play time
   */
  const stopPlayTimeTracking = useCallback(() => {
    if (playTimeIntervalRef.current !== null) {
      clearInterval(playTimeIntervalRef.current);
      playTimeIntervalRef.current = null;
    }
    setIsTrackingPlayTime(false);
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (playTimeIntervalRef.current !== null) {
        clearInterval(playTimeIntervalRef.current);
      }
    };
  }, []);

  /**
   * Claim challenge reward
   */
  const claimChallengeReward = useCallback(
    async (challengeId: string): Promise<boolean> => {
      if (!isSignedIn) return false;

      try {
        const response = await apiCall('/daily-challenges', {
          method: 'POST',
          body: JSON.stringify({ action: 'claim', challengeId }),
        });

        if (response.ok) {
          await response.json(); // Consume response body

          // Update local state
          setState((prev) => {
            if (!prev) return prev;
            const challenge = prev.challenges.find((c) => c.id === challengeId);
            return {
              ...prev,
              challenges: prev.challenges.map((c) =>
                c.id === challengeId
                  ? { ...c, isClaimed: true, claimedAt: new Date().toISOString() }
                  : c
              ),
              allClaimed: prev.challenges.every((c) =>
                c.id === challengeId ? true : c.isClaimed
              ),
              totalEarnedToday: prev.totalEarnedToday + (challenge?.reward || 0),
            };
          });

          // Refresh currency balance
          await refreshBalance();

          return true;
        } else {
          const error = await response.json();
          console.error('[DailyChallenges] Claim failed:', error.error);
          return false;
        }
      } catch (error) {
        console.error('[DailyChallenges] Failed to claim reward:', error);
        return false;
      }
    },
    [isSignedIn, apiCall, refreshBalance]
  );

  /**
   * Get challenge by ID
   */
  const getChallengeById = useCallback(
    (challengeId: string): DailyChallenge | undefined => {
      return state?.challenges.find((c) => c.id === challengeId);
    },
    [state]
  );

  /**
   * Get progress display string
   */
  const getProgressDisplay = useCallback(
    (challengeId: string): string => {
      const challenge = getChallengeById(challengeId);
      if (!challenge) return '';

      if (challenge.type === 'play_time_seconds') {
        return `${formatPlayTime(challenge.progress)} / ${formatPlayTime(challenge.target)}`;
      }

      return `${challenge.progress} / ${challenge.target}`;
    },
    [getChallengeById]
  );

  return (
    <DailyChallengesContext.Provider
      value={{
        state,
        isLoading,
        recordGamePlayed,
        recordPersonalBest,
        recordPlayTime,
        claimChallengeReward,
        getChallengeById,
        getProgressDisplay,
        startPlayTimeTracking,
        stopPlayTimeTracking,
        isTrackingPlayTime,
        refresh,
      }}
    >
      {children}
    </DailyChallengesContext.Provider>
  );
};

export const useDailyChallenges = () => {
  const context = useContext(DailyChallengesContext);
  if (!context) {
    throw new Error('useDailyChallenges must be used within DailyChallengesProvider');
  }
  return context;
};

// Safe version that returns null instead of throwing
export const useDailyChallengesSafe = () => {
  return useContext(DailyChallengesContext);
};

export { DailyChallengesContext };
