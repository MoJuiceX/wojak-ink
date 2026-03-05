/* eslint-disable react-refresh/only-export-components */
/**
 * CurrencyContext - Server-Backed Implementation
 *
 * All currency operations go through the API.
 * Local state is just a cache of server state.
 *
 * @see src/config/economy.ts for economy constants
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/clerkSafe';
import { STARTING_BALANCE, SHOP_PRICES } from '../config/economy';

/** Auth shape used by currency logic (Clerk or fallback when Clerk not configured) */
interface CurrencyAuth {
  userId: string | null;
  isSignedIn: boolean;
  getToken: (() => Promise<string | null>) | undefined;
}
import type {
  UserCurrency,
  CurrencyTransaction,
  TransactionSource,
  Achievement,
  EarnResult,
  DailyRewardResult,
  DailyRewardStatus,
  PurchaseResult,
} from '../types/currency';
import { DAILY_REWARDS } from '../types/currency';

// Check if Clerk is configured
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Default currency values for new users
const DEFAULT_CURRENCY: UserCurrency = {
  oranges: STARTING_BALANCE.oranges,
  gems: STARTING_BALANCE.gems,
  lifetimeOranges: STARTING_BALANCE.oranges,
  lifetimeGems: STARTING_BALANCE.gems,
  giftedOranges: 0,
  gemsConvertedThisMonth: 0,
};

interface CurrencyContextType {
  // Currency state
  currency: UserCurrency;
  isLoading: boolean;
  isInitialized: boolean;

  // Game session management
  startGameSession: (gameId: string) => Promise<{ success: boolean; sessionId?: string; error?: string }>;
  sendHeartbeat: (sessionId: string) => Promise<void>;

  // Earning (new SPEC 11 method)
  completeGame: (params: {
    sessionId: string;
    gameId: string;
    score: number;
    durationSeconds: number;
    isHighScore: boolean;
    isTop10: boolean;
  }) => Promise<{ success: boolean; reward?: { oranges: number; gems?: number }; newBalance?: { oranges: number; gems: number } }>;

  // Legacy methods (compatibility)
  earnFromGame: (
    gameId: string,
    score: number,
    isHighScore: boolean,
    leaderboardRank?: number
  ) => Promise<EarnResult>;
  claimDailyReward: () => Promise<DailyRewardResult>;
  claimAchievement: (achievementId: string) => Promise<Achievement | null>;
  earnCurrency: (
    oranges: number,
    gems: number,
    source: TransactionSource,
    metadata?: Record<string, unknown>
  ) => void;

  // Spending
  purchaseItem: (itemId: string, orangesCost?: number, gemsCost?: number) => Promise<PurchaseResult>;
  useContinue: (gameId: string) => Promise<boolean>;
  spendCurrency: (oranges: number, gems: number, source: TransactionSource) => boolean;

  // Info
  getDailyRewardStatus: () => DailyRewardStatus;
  canAfford: (oranges?: number, gems?: number) => boolean;

  // Transactions
  recentTransactions: CurrencyTransaction[];
  fetchTransactionHistory: () => void;

  // Refresh balance from server
  refreshBalance: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

function CurrencyProviderInner({
  children,
  auth,
}: {
  children: ReactNode;
  auth: CurrencyAuth;
}) {
  const { userId, isSignedIn, getToken } = auth;

  const [currency, setCurrency] = useState<UserCurrency>(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<CurrencyTransaction[]>([]);
  const [dailyStatus, setDailyStatus] = useState<{
    lastClaimDate: string | null;
    currentStreak: number;
    canClaim: boolean;
  }>({ lastClaimDate: null, currentStreak: 0, canClaim: false });

  // Ref to track if we've fetched initial data
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

      return fetch(endpoint, {
        ...options,
        headers,
      });
    },
    [getToken]
  );

  /**
   * Initialize/refresh balance from server
   */
  const refreshBalance = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      // First try to get balance
      let response = await apiCall('/api/currency');

      // Check if API responded successfully
      if (!response.ok) {
        console.warn('[Currency] API not available, using defaults');
        setCurrency(DEFAULT_CURRENCY);
        setIsInitialized(true);
        return;
      }

      let data = await response.json();

      // If not initialized, initialize
      if (!data.initialized) {
        response = await apiCall('/api/currency/init', { method: 'POST' });
        if (!response.ok) {
          console.warn('[Currency] Init API failed, using defaults');
          setCurrency(DEFAULT_CURRENCY);
          setIsInitialized(true);
          return;
        }
        data = await response.json();
      }

      // Defensive check for valid data
      if (typeof data.oranges !== 'number' || typeof data.gems !== 'number') {
        console.warn('[Currency] Invalid API response, using defaults');
        setCurrency(DEFAULT_CURRENCY);
        setIsInitialized(true);
        return;
      }

      setCurrency({
        oranges: data.oranges,
        gems: data.gems,
        lifetimeOranges: data.lifetimeOranges ?? data.oranges,
        lifetimeGems: data.lifetimeGems ?? data.gems,
        giftedOranges: data.giftedOranges || 0,
        gemsConvertedThisMonth: 0, // Not tracked in new system
      });
      setIsInitialized(true);
    } catch (error) {
      console.error('[Currency] Failed to refresh balance:', error);
      // Fallback to defaults on error
      setCurrency(DEFAULT_CURRENCY);
      setIsInitialized(true);
    }
  }, [isSignedIn, apiCall]);

  /**
   * Fetch login streak status from server
   */
  const fetchLoginStreakStatus = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      const response = await apiCall('/api/currency/login-streak');
      if (response.ok) {
        const data = await response.json();
        setDailyStatus({
          lastClaimDate: data.lastClaimDate,
          currentStreak: data.currentStreak,
          canClaim: data.canClaim,
        });
      } else {
        // API not available (e.g., localhost), use defaults
        console.warn('[Currency] Login streak API not available');
        setDailyStatus({ lastClaimDate: null, currentStreak: 0, canClaim: false });
      }
    } catch (error) {
      console.error('[Currency] Failed to fetch login streak:', error);
      setDailyStatus({ lastClaimDate: null, currentStreak: 0, canClaim: false });
    }
  }, [isSignedIn, apiCall]);

  // Load data on mount and when user changes
  useEffect(() => {
    if (userId && isSignedIn) {
      if (!hasFetchedRef.current) {
        hasFetchedRef.current = true;
        setIsLoading(true);
        Promise.all([refreshBalance(), fetchLoginStreakStatus()]).finally(() => {
          setIsLoading(false);
        });
      }
    } else {
      setCurrency(DEFAULT_CURRENCY);
      setDailyStatus({ lastClaimDate: null, currentStreak: 0, canClaim: false });
      setRecentTransactions([]);
      setIsInitialized(false);
      hasFetchedRef.current = false;
      setIsLoading(false);
    }
  }, [userId, isSignedIn, refreshBalance, fetchLoginStreakStatus]);

  /**
   * Start a game session (single-session enforcement)
   */
  const startGameSession = useCallback(
    async (gameId: string): Promise<{ success: boolean; sessionId?: string; error?: string }> => {
      if (!isSignedIn) {
        return { success: false, error: 'Not signed in' };
      }

      try {
        const response = await apiCall('/api/game/start', {
          method: 'POST',
          body: JSON.stringify({ gameId }),
        });

        const data = await response.json();

        if (response.status === 409) {
          return {
            success: false,
            error: data.message || 'Already playing a game',
          };
        }

        if (response.ok && data.sessionId) {
          return { success: true, sessionId: data.sessionId };
        }

        return { success: false, error: data.error || 'Failed to start game' };
      } catch (error) {
        console.error('[Currency] Failed to start game session:', error);
        return { success: false, error: 'Network error' };
      }
    },
    [isSignedIn, apiCall]
  );

  /**
   * Send heartbeat for active game session
   */
  const sendHeartbeat = useCallback(
    async (sessionId: string): Promise<void> => {
      if (!isSignedIn || !sessionId) return;

      try {
        await apiCall('/api/game/heartbeat', {
          method: 'POST',
          body: JSON.stringify({ sessionId }),
        });
      } catch (error) {
        console.error('[Currency] Failed to send heartbeat:', error);
      }
    },
    [isSignedIn, apiCall]
  );

  /**
   * Complete game and earn rewards (new SPEC 11 method)
   */
  const completeGame = useCallback(
    async (params: {
      sessionId: string;
      gameId: string;
      score: number;
      durationSeconds: number;
      isHighScore: boolean;
      isTop10: boolean;
    }) => {
      if (!isSignedIn) {
        return { success: false };
      }

      try {
        const response = await apiCall('/api/gameplay/complete', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        const data = await response.json();

        if (data.success && data.newBalance) {
          setCurrency((prev) => ({
            ...prev,
            oranges: data.newBalance.oranges,
            gems: data.newBalance.gems ?? prev.gems,
          }));
        }

        return data;
      } catch (error) {
        console.error('[Currency] Failed to complete game:', error);
        return { success: false };
      }
    },
    [isSignedIn, apiCall]
  );

  /**
   * Legacy: Earn currency from playing a game
   * Uses old API for backwards compatibility
   */
  const earnFromGame = useCallback(
    async (
      gameId: string,
      score: number,
      isHighScore: boolean,
      leaderboardRank?: number
    ): Promise<EarnResult> => {
      if (!isSignedIn || !userId) {
        return {
          success: false,
          orangesEarned: 0,
          gemsEarned: 0,
          breakdown: { base: 0, scoreBonus: 0, highScoreBonus: 0, leaderboardBonus: 0 },
        };
      }

      // Create a session and complete it
      const sessionId = crypto.randomUUID();
      const result = await completeGame({
        sessionId,
        gameId,
        score,
        durationSeconds: 60, // Estimate
        isHighScore,
        isTop10: leaderboardRank ? leaderboardRank <= 10 : false,
      });

      if (result.success && result.reward) {
        return {
          success: true,
          orangesEarned: result.reward.oranges,
          gemsEarned: result.reward.gems || 0,
          breakdown: {
            base: result.reward.oranges,
            scoreBonus: 0,
            highScoreBonus: 0,
            leaderboardBonus: 0,
          },
        };
      }

      return {
        success: false,
        orangesEarned: 0,
        gemsEarned: 0,
        breakdown: { base: 0, scoreBonus: 0, highScoreBonus: 0, leaderboardBonus: 0 },
      };
    },
    [isSignedIn, userId, completeGame]
  );

  /**
   * Claim daily login reward
   */
  const claimDailyReward = useCallback(async (): Promise<DailyRewardResult> => {
    if (!isSignedIn || !userId) {
      throw new Error('Must be logged in to claim daily reward');
    }

    try {
      const response = await apiCall('/api/daily-login/claim', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim daily reward');
      }

      // Update local state
      if (data.newBalance) {
        setCurrency((prev) => ({
          ...prev,
          oranges: data.newBalance.oranges,
          gems: data.newBalance.gems,
          lifetimeOranges: prev.lifetimeOranges + (data.reward?.oranges || 0),
          lifetimeGems: prev.lifetimeGems + (data.reward?.gems || 0),
        }));
      }

      setDailyStatus({
        lastClaimDate: new Date().toISOString().split('T')[0],
        currentStreak: data.streakDay || 1,
        canClaim: false,
      });

      // Calculate time until midnight UTC
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCHours(24, 0, 0, 0);
      const hoursUntilReset = Math.floor((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));

      return {
        success: true,
        reward: {
          oranges: data.reward?.oranges || 0,
          gems: data.reward?.gems || 0,
        },
        currentStreak: data.streakDay || 1,
        nextRewardIn: hoursUntilReset,
      };
    } catch (error) {
      console.error('[Currency] Failed to claim daily reward:', error);
      throw error;
    }
  }, [isSignedIn, userId, apiCall]);

  /**
   * Get daily reward status
   */
  const getDailyRewardStatus = useCallback((): DailyRewardStatus => {
    // Calculate next reward based on streak
    const nextDay = dailyStatus.canClaim
      ? Math.max(1, (dailyStatus.currentStreak % 7) + 1)
      : Math.max(1, ((dailyStatus.currentStreak % 7) + 1) % 7 + 1);

    const nextReward = DAILY_REWARDS[nextDay - 1] || DAILY_REWARDS[0];

    // Calculate time until reset (midnight UTC)
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    const timeUntilReset = midnight.getTime() - now.getTime();

    return {
      canClaim: dailyStatus.canClaim,
      currentStreak: dailyStatus.currentStreak,
      nextReward,
      timeUntilReset,
    };
  }, [dailyStatus]);

  /**
   * Claim achievement reward - delegates to AchievementsContext
   */
  const claimAchievement = useCallback(
    async (achievementId: string): Promise<Achievement | null> => {
      // Use the new achievements/claim endpoint
      try {
        const response = await apiCall('/api/achievements/claim', {
          method: 'POST',
          body: JSON.stringify({ achievementId }),
        });

        const data = await response.json();

        if (data.success && data.newBalance) {
          setCurrency((prev) => ({
            ...prev,
            oranges: data.newBalance.oranges,
            gems: data.newBalance.gems,
          }));
        }

        return data.success ? data : null;
      } catch (error) {
        console.error('[Currency] Failed to claim achievement:', error);
        return null;
      }
    },
    [apiCall]
  );

  /**
   * Generic earn currency (for non-game sources)
   */
  const earnCurrency = useCallback(
    async (
      _oranges: number,
      _gems: number,
      _source: TransactionSource,
      _metadata?: Record<string, unknown>
    ) => {
      if (!isSignedIn || !userId) return;

      // Legacy - refresh balance after external earning
      await refreshBalance();
    },
    [isSignedIn, userId, refreshBalance]
  );

  /**
   * Purchase item from shop
   */
  const purchaseItem = useCallback(
    async (itemId: string, orangesCost?: number, gemsCost?: number): Promise<PurchaseResult> => {
      if (!isSignedIn || !userId) {
        return { success: false, error: 'Must be logged in' };
      }

      const costOranges = orangesCost || 0;
      const costGems = gemsCost || 0;

      if ((costOranges > 0 && currency.oranges < costOranges) || (costGems > 0 && currency.gems < costGems)) {
        return { success: false, error: 'Insufficient funds' };
      }

      try {
        // Use new spend endpoint for oranges
        if (costOranges > 0) {
          const response = await apiCall('/api/currency/spend', {
            method: 'POST',
            body: JSON.stringify({
              currency: 'oranges',
              amount: costOranges,
              itemId,
              itemType: 'shop_purchase',
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.error || 'Purchase failed' };
          }

          const data = await response.json();
          setCurrency((prev) => ({
            ...prev,
            oranges: data.newBalance?.oranges ?? prev.oranges - costOranges,
          }));
        }

        // Use new spend endpoint for gems
        if (costGems > 0) {
          const response = await apiCall('/api/currency/spend', {
            method: 'POST',
            body: JSON.stringify({
              currency: 'gems',
              amount: costGems,
              itemId,
              itemType: 'shop_purchase',
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.error || 'Purchase failed' };
          }

          const data = await response.json();
          setCurrency((prev) => ({
            ...prev,
            gems: data.newBalance?.gems ?? prev.gems - costGems,
          }));
        }

        return { success: true, newBalance: currency };
      } catch (error) {
        console.error('[Currency] Failed to purchase item:', error);
        return { success: false, error: 'Purchase failed' };
      }
    },
    [isSignedIn, userId, currency, apiCall]
  );

  /**
   * Use a continue token
   */
  const useContinue = useCallback(
    async (gameId: string): Promise<boolean> => {
      if (!isSignedIn || !userId || currency.oranges < SHOP_PRICES.continueGame) {
        return false;
      }

      try {
        const response = await apiCall('/api/currency/spend', {
          method: 'POST',
          body: JSON.stringify({
            currency: 'oranges',
            amount: SHOP_PRICES.continueGame,
            itemId: `continue_${gameId}`,
            itemType: 'continue',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setCurrency((prev) => ({
            ...prev,
            oranges: data.newBalance?.oranges ?? prev.oranges - SHOP_PRICES.continueGame,
          }));
          return true;
        }
      } catch (error) {
        console.error('[Currency] Failed to use continue:', error);
      }

      return false;
    },
    [isSignedIn, userId, currency.oranges, apiCall]
  );

  /**
   * Generic spend currency
   */
  const spendCurrency = useCallback(
    (oranges: number, gems: number, source: TransactionSource): boolean => {
      if (
        !isSignedIn ||
        !userId ||
        (oranges > 0 && currency.oranges < oranges) ||
        (gems > 0 && currency.gems < gems)
      ) {
        return false;
      }

      // Optimistically update local state
      setCurrency((prev) => ({
        ...prev,
        oranges: prev.oranges - oranges,
        gems: prev.gems - gems,
      }));

      // Make API call in background for oranges
      if (oranges > 0) {
        apiCall('/api/currency/spend', {
          method: 'POST',
          body: JSON.stringify({
            currency: 'oranges',
            amount: oranges,
            itemId: `${source}_${Date.now()}`,
            itemType: source,
          }),
        }).catch((error) => {
          console.error('[Currency] Failed to spend oranges:', error);
          // Revert on failure
          setCurrency((prev) => ({
            ...prev,
            oranges: prev.oranges + oranges,
          }));
        });
      }

      // Make API call in background for gems
      if (gems > 0) {
        apiCall('/api/currency/spend', {
          method: 'POST',
          body: JSON.stringify({
            currency: 'gems',
            amount: gems,
            itemId: `${source}_${Date.now()}`,
            itemType: source,
          }),
        }).catch((error) => {
          console.error('[Currency] Failed to spend gems:', error);
          // Revert on failure
          setCurrency((prev) => ({
            ...prev,
            gems: prev.gems + gems,
          }));
        });
      }

      return true;
    },
    [isSignedIn, userId, currency, apiCall]
  );

  /**
   * Check if user can afford something
   */
  const canAfford = useCallback(
    (oranges?: number, gems?: number): boolean => {
      if (oranges && currency.oranges < oranges) return false;
      if (gems && currency.gems < gems) return false;
      return true;
    },
    [currency]
  );

  /**
   * Fetch transaction history
   */
  const fetchTransactionHistory = useCallback(async () => {
    if (!isSignedIn || !userId) return;

    try {
      const response = await apiCall('/api/currency/transactions?limit=50');
      if (response.ok) {
        const data = await response.json();
        setRecentTransactions(
          data.transactions.map((t: { id: string | number; amount: number; currencyType: string; source: string; sourceDetails?: unknown; createdAt: string }) => ({
            id: String(t.id),
            userId,
            type: t.amount > 0 ? 'earn' : 'spend',
            currency: t.currencyType,
            amount: Math.abs(t.amount),
            source: t.source,
            metadata: t.sourceDetails,
            createdAt: new Date(t.createdAt),
          }))
        );
      }
    } catch (error) {
      console.error('[Currency] Failed to fetch transactions:', error);
    }
  }, [isSignedIn, userId, apiCall]);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        isLoading,
        isInitialized,
        startGameSession,
        sendHeartbeat,
        completeGame,
        earnFromGame,
        claimDailyReward,
        claimAchievement,
        earnCurrency,
        purchaseItem,
        useContinue,
        spendCurrency,
        getDailyRewardStatus,
        canAfford,
        recentTransactions,
        fetchTransactionHistory,
        refreshBalance,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

/** Uses Clerk useAuth – only render when ClerkProvider is present (CLERK_ENABLED). */
function CurrencyProviderWithClerk({ children }: { children: ReactNode }) {
  const clerkAuth = useAuth();
  return (
    <CurrencyProviderInner
      auth={{
        userId: clerkAuth.userId ?? null,
        isSignedIn: !!clerkAuth.isSignedIn,
        getToken: clerkAuth.getToken,
      }}
    >
      {children}
    </CurrencyProviderInner>
  );
}

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  if (CLERK_ENABLED) {
    return <CurrencyProviderWithClerk>{children}</CurrencyProviderWithClerk>;
  }
  return (
    <CurrencyProviderInner
      auth={{ userId: null, isSignedIn: false, getToken: undefined }}
    >
      {children}
    </CurrencyProviderInner>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};

// Safe version that returns null instead of throwing
export const useCurrencySafe = () => {
  return useContext(CurrencyContext);
};

// Export the context for direct access
export { CurrencyContext };

// Hook to format currency for display
export const useFormatCurrency = () => {
  return useCallback((num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  }, []);
};
