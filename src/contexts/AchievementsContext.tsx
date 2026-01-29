/* eslint-disable react-refresh/only-export-components */
/**
 * AchievementsContext
 *
 * Tracks achievement progress and handles unlocking/claiming.
 * Uses server-side API for persistence to prevent "delete cache = claim again" issue.
 *
 * @see claude-specs/05-ACHIEVEMENT-SYSTEM-SPEC.md
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useUserProfile } from './UserProfileContext';
import { useCurrency } from './CurrencyContext';
import { useFriends } from './FriendsContext';
import { ACHIEVEMENTS, getAchievementById } from '@/config/achievements';
import { MINI_GAMES } from '@/config/games';
import type {
  Achievement,
  UserAchievementProgress,
  AchievementStats,
} from '@/types/achievement';

// Check if Clerk is configured
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// LocalStorage keys (kept for stats only, not progress)
const STATS_STORAGE_KEY = 'wojak_achievement_stats';
const OWNED_ITEMS_KEY = 'wojak_owned_items';

interface AchievementsContextType {
  achievements: Achievement[];
  progress: UserAchievementProgress[];
  stats: AchievementStats;

  // Methods
  checkAchievements: () => void;
  claimAchievement: (achievementId: string) => Promise<boolean>;
  getProgress: (achievementId: string) => UserAchievementProgress | null;

  // Computed
  unclaimedCount: number;
  completedCount: number;

  // For recording stats
  recordGamePlayed: (gameId: string, score: number) => void;
  recordLeaderboardRank: (rank: number) => void;
}

const AchievementsContext = createContext<AchievementsContextType | null>(null);

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  // Always call hooks unconditionally (rules of hooks)
  const clerkAuth = useAuth();
  const authResult = CLERK_ENABLED ? clerkAuth : { userId: null, isSignedIn: false, getToken: async () => null };
  const getToken = authResult.getToken;
  const { profile, isSignedIn } = useUserProfile();
  const { currency, refreshBalance } = useCurrency();
  const { friends } = useFriends();

  const [progress, setProgress] = useState<UserAchievementProgress[]>([]);
  const progressRef = useRef<UserAchievementProgress[]>([]);
  const hasFetchedRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const [stats, setStats] = useState<AchievementStats>({
    totalGamesPlayed: 0,
    highestScore: 0,
    gamesPlayedByType: {},
    activeGameCount: 0,
    bestLeaderboardRank: null,
    itemsOwned: 0,
    hasNftAvatar: false,
    friendsCount: 0,
    hasCustomName: false,
    hasCustomAvatar: false,
    currentStreak: 0,
    longestStreak: 0,
    lifetimeOranges: 0,
  });

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
   * Fetch progress from server
   */
  const fetchProgress = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      const response = await apiCall('/achievements');
      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress);
      }
    } catch (error) {
      console.error('[Achievements] Failed to fetch progress:', error);
    }
  }, [isSignedIn, apiCall]);

  // Load owned items from localStorage
  const loadOwnedItemsCount = useCallback((): number => {
    try {
      const stored = localStorage.getItem(OWNED_ITEMS_KEY);
      if (stored) {
        const items = JSON.parse(stored);
        return Array.isArray(items) ? items.length : 0;
      }
    } catch (e) {
      console.error('[Achievements] Failed to load owned items:', e);
    }
    return 0;
  }, []);

  // Load progress from server on mount
  useEffect(() => {
    if (!isSignedIn) {
      setProgress([]); // eslint-disable-line react-hooks/set-state-in-effect -- reset state when user signs out
      hasFetchedRef.current = false;
      return;
    }

    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchProgress();
    }

    // Load stats from localStorage (stats are local-only)
    const storedStats = localStorage.getItem(STATS_STORAGE_KEY);
    if (storedStats) {
      try {
        setStats(prev => ({ ...prev, ...JSON.parse(storedStats) }));
      } catch (e) {
        console.error('[Achievements] Failed to load stats:', e);
      }
    }
  }, [isSignedIn, fetchProgress]);

  // Save progress to server (and update local state)
  const saveProgress = useCallback(async (newProgress: UserAchievementProgress[]) => {
    setProgress(newProgress);

    // Save each changed achievement to server
    for (const p of newProgress) {
      const achievement = getAchievementById(p.achievementId);
      if (!achievement) continue;

      try {
        await apiCall('/achievements', {
          method: 'POST',
          body: JSON.stringify({
            action: 'update_progress',
            achievementId: p.achievementId,
            progress: p.progress,
            target: p.target,
            rewardOranges: achievement.reward.oranges,
            rewardGems: achievement.reward.gems,
          }),
        });
      } catch (error) {
        console.error('[Achievements] Failed to save progress:', error);
      }
    }
  }, [apiCall]);

  // Save stats to localStorage
  const saveStats = useCallback((newStats: AchievementStats) => {
    setStats(newStats);
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(newStats));
  }, []);

  // Update stats from external sources
  useEffect(() => {
    const activeGames = MINI_GAMES.filter(g => g.status === 'available' && !g.disabled);
    const itemsOwned = loadOwnedItemsCount();

    setStats(prev => ({ // eslint-disable-line react-hooks/set-state-in-effect -- syncing derived state from external sources
      ...prev,
      activeGameCount: activeGames.length,
      itemsOwned,
      hasNftAvatar: profile?.avatar?.type === 'nft',
      friendsCount: friends.length,
      hasCustomName: !!profile?.displayName,
      hasCustomAvatar: profile?.avatar?.source === 'user' || profile?.avatar?.source === 'wallet',
      currentStreak: profile?.currentStreak || 0,
      longestStreak: profile?.longestStreak || 0,
      lifetimeOranges: currency.lifetimeOranges,
    }));
  }, [profile, friends, currency.lifetimeOranges, loadOwnedItemsCount]);

  // Record game played
  const recordGamePlayed = useCallback((gameId: string, score: number) => {
    setStats(prev => {
      const newStats = {
        ...prev,
        totalGamesPlayed: prev.totalGamesPlayed + 1,
        highestScore: Math.max(prev.highestScore, score),
        gamesPlayedByType: {
          ...prev.gamesPlayedByType,
          [gameId]: (prev.gamesPlayedByType[gameId] || 0) + 1,
        },
      };
      saveStats(newStats);
      return newStats;
    });
  }, [saveStats]);

  // Record leaderboard rank
  const recordLeaderboardRank = useCallback((rank: number) => {
    setStats(prev => {
      if (prev.bestLeaderboardRank === null || rank < prev.bestLeaderboardRank) {
        const newStats = { ...prev, bestLeaderboardRank: rank };
        saveStats(newStats);
        return newStats;
      }
      return prev;
    });
  }, [saveStats]);

  // Check if requirement is met
  const checkRequirement = useCallback((achievement: Achievement): { met: boolean; progress: number } => {
    const { requirement } = achievement;

    switch (requirement.type) {
      case 'games_played':
        return {
          met: stats.totalGamesPlayed >= requirement.target,
          progress: stats.totalGamesPlayed,
        };

      case 'high_score':
        return {
          met: stats.highestScore >= requirement.target,
          progress: stats.highestScore,
        };

      case 'all_games_played': {
        const uniqueGamesPlayed = Object.keys(stats.gamesPlayedByType).length;
        return {
          met: uniqueGamesPlayed >= stats.activeGameCount && stats.activeGameCount > 0,
          progress: uniqueGamesPlayed,
        };
      }

      case 'leaderboard_rank':
        return {
          met: stats.bestLeaderboardRank !== null && stats.bestLeaderboardRank <= requirement.target,
          progress: stats.bestLeaderboardRank || 0,
        };

      case 'items_owned':
        return {
          met: stats.itemsOwned >= requirement.target,
          progress: stats.itemsOwned,
        };

      case 'nft_avatar':
        return {
          met: stats.hasNftAvatar,
          progress: stats.hasNftAvatar ? 1 : 0,
        };

      case 'friends_count':
        return {
          met: stats.friendsCount >= requirement.target,
          progress: stats.friendsCount,
        };

      case 'profile_complete': {
        const profileComplete = stats.hasCustomName && stats.hasCustomAvatar;
        return {
          met: profileComplete,
          progress: profileComplete ? 1 : 0,
        };
      }

      case 'streak': {
        const bestStreak = Math.max(stats.currentStreak, stats.longestStreak);
        return {
          met: bestStreak >= requirement.target,
          progress: bestStreak,
        };
      }

      case 'lifetime_oranges':
        return {
          met: stats.lifetimeOranges >= requirement.target,
          progress: stats.lifetimeOranges,
        };

      default:
        return { met: false, progress: 0 };
    }
  }, [stats]);

  // Check all achievements
  const checkAchievements = useCallback(() => {
    // Use ref to avoid infinite loop (progress in deps would cause checkAchievements
    // to be recreated on every progress update, triggering useEffects that call it again)
    const currentProgress = progressRef.current;
    const newProgress: UserAchievementProgress[] = [...currentProgress];
    const newlyUnlocked: string[] = [];

    for (const achievement of ACHIEVEMENTS) {
      const existing = newProgress.find(p => p.achievementId === achievement.id);
      const { met, progress: achievementProgress } = checkRequirement(achievement);

      if (existing) {
        // Update progress
        existing.progress = achievementProgress;
        existing.target = achievement.requirement.target;

        // Check if newly completed
        if (!existing.completed && met) {
          existing.completed = true;
          existing.completedAt = new Date().toISOString();
          newlyUnlocked.push(achievement.id);
        }
      } else {
        // Create new progress entry
        newProgress.push({
          achievementId: achievement.id,
          progress: achievementProgress,
          target: achievement.requirement.target,
          completed: met,
          completedAt: met ? new Date().toISOString() : undefined,
          claimed: false,
        });

        if (met) {
          newlyUnlocked.push(achievement.id);
        }
      }
    }

    saveProgress(newProgress);

    if (newlyUnlocked.length > 0) {
      // intentionally empty
    }
  }, [checkRequirement, saveProgress]);

  // Claim achievement reward (server-side)
  const claimAchievement = useCallback(async (achievementId: string): Promise<boolean> => {
    const achievement = getAchievementById(achievementId);
    if (!achievement) return false;

    const progressEntry = progress.find(p => p.achievementId === achievementId);
    if (!progressEntry?.completed || progressEntry.claimed) return false;

    try {
      // First, ensure achievement is synced to server with completion status
      // Send progress = target to guarantee server sees it as completed
      // (handles inverse achievements like leaderboard rank where lower is better)
      await apiCall('/achievements', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_progress',
          achievementId,
          progress: progressEntry.target, // Always send target to mark as complete
          target: progressEntry.target,
          rewardOranges: achievement.reward.oranges,
          rewardGems: achievement.reward.gems,
        }),
      });

      // Now claim the reward
      const response = await apiCall('/achievements', {
        method: 'POST',
        body: JSON.stringify({
          action: 'claim',
          achievementId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[Achievements] Claim failed:', error.error);
        return false;
      }

      // Update local progress
      const newProgress = progress.map(p =>
        p.achievementId === achievementId
          ? { ...p, claimed: true, claimedAt: new Date().toISOString() }
          : p
      );
      setProgress(newProgress);

      // Refresh currency balance from server
      await refreshBalance();

      return true;
    } catch (error) {
      console.error('[Achievements] Failed to claim:', error);
      return false;
    }
  }, [progress, apiCall, refreshBalance]);

  // Get progress for specific achievement
  const getProgress = useCallback((achievementId: string): UserAchievementProgress | null => {
    return progress.find(p => p.achievementId === achievementId) || null;
  }, [progress]);

  // Computed values
  const unclaimedCount = useMemo(() =>
    progress.filter(p => p.completed && !p.claimed).length
  , [progress]);

  const completedCount = useMemo(() =>
    progress.filter(p => p.completed).length
  , [progress]);

  return (
    <AchievementsContext.Provider
      value={{
        achievements: ACHIEVEMENTS,
        progress,
        stats,
        checkAchievements,
        claimAchievement,
        getProgress,
        unclaimedCount,
        completedCount,
        recordGamePlayed,
        recordLeaderboardRank,
      }}
    >
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievements() {
  const context = useContext(AchievementsContext);
  if (!context) {
    throw new Error('useAchievements must be used within AchievementsProvider');
  }
  return context;
}
