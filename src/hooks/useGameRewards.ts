/**
 * useGameRewards Hook
 *
 * Hook to handle game-end rewards and currency earning.
 */

import { useCallback, useState } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAchievements } from '../contexts/AchievementsContext';
import type { EarnResult } from '../types/currency';

interface UseGameRewardsOptions {
  gameId: string;
}

interface GameRewardState {
  oranges: number;
  gems: number;
  breakdown: {
    base: number;
    scoreBonus: number;
    highScoreBonus: number;
    leaderboardBonus: number;
  };
}

export const useGameRewards = ({ gameId }: UseGameRewardsOptions) => {
  const { earnFromGame, useContinue, canAfford } = useCurrency();
  const { recordGamePlayed, recordLeaderboardRank, checkAchievements } = useAchievements();
  const [lastReward, setLastReward] = useState<GameRewardState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Process rewards when a game ends
   */
  const processGameEnd = useCallback(
    async (
      score: number,
      isHighScore: boolean,
      leaderboardRank?: number
    ): Promise<EarnResult> => {
      setIsProcessing(true);

      try {
        const result = await earnFromGame(gameId, score, isHighScore, leaderboardRank);

        if (result.success) {
          setLastReward({
            oranges: result.orangesEarned,
            gems: result.gemsEarned,
            breakdown: result.breakdown,
          });
        }

        // Record game for achievements
        recordGamePlayed(gameId, score);
        if (leaderboardRank) {
          recordLeaderboardRank(leaderboardRank);
        }
        // Check if any achievements were unlocked
        checkAchievements();

        return result;
      } finally {
        setIsProcessing(false);
      }
    },
    [gameId, earnFromGame]
  );

  /**
   * Use a continue to keep playing
   */
  const handleContinue = useCallback(async (): Promise<boolean> => {
    // useContinue is a function from useCurrency(), not a hook - name is misleading
    // eslint-disable-next-line react-hooks/rules-of-hooks -- useContinue is a currency method, not a React hook
    return useContinue(gameId);
  }, [gameId, useContinue]);

  /**
   * Check if user can afford a continue (50 oranges)
   */
  const canContinue = useCallback((): boolean => {
    return canAfford(50);
  }, [canAfford]);

  /**
   * Clear the last reward (call after showing popup)
   */
  const clearLastReward = useCallback(() => {
    setLastReward(null);
  }, []);

  return {
    processGameEnd,
    handleContinue,
    canContinue,
    lastReward,
    clearLastReward,
    isProcessing,
  };
};

export default useGameRewards;
