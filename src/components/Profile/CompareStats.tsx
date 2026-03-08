/**
 * Compare Stats Component
 * 
 * Modal to compare your stats with a friend's stats.
 * Shows side-by-side comparison with winner indicators.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Trophy, Gamepad2, Crown } from 'lucide-react';
import { Avatar } from '@/components/Avatar/Avatar';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import './CompareStats.css';

interface PerGameStats {
  gameId: string;
  gameName: string;
  gamesPlayed: number;
  bestRank: number | null;
  bestScore: number;
}

interface BestRankInfo {
  rank: number;
  gameId: string;
  gameName: string;
  achievedAt: string;
}

interface FavoriteGameInfo {
  gameId: string;
  gameName: string;
  gamesPlayed: number;
}

interface UserStats {
  currentStreak: number;
  longestStreak: number;
  bestRankEver: BestRankInfo | null;
  totalGamesPlayed: number;
  totalOrangesEarned: number;
  favoriteGame: FavoriteGameInfo | null;
  perGameStats: PerGameStats[];
}

interface ComparisonResult {
  theirStats: UserStats;
  theirDisplayName: string;
  theirAvatar: {
    type: 'emoji' | 'nft';
    value: string;
  };
  wins: {
    you: number;
    them: number;
  };
}

interface CompareStatsProps {
  isOpen: boolean;
  onClose: () => void;
  friendId: string;
  friendName: string;
  friendAvatar: {
    type: 'emoji' | 'nft';
    value: string;
  };
}

export const CompareStats: React.FC<CompareStatsProps> = ({
  isOpen,
  onClose,
  friendId,
  friendName,
  friendAvatar,
}) => {
  const { authenticatedFetch } = useAuthenticatedFetch();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myStats, setMyStats] = useState<UserStats | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchComparison = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authenticatedFetch(`/api/user/stats?compare_with=${friendId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch comparison');
        }
        const data = await response.json();
        setMyStats(data.stats);
        setComparison(data.comparison);
      } catch (err) {
        console.error('[CompareStats] Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load comparison');
      } finally {
        setIsLoading(false);
      }
    };

    fetchComparison();
  }, [isOpen, friendId, authenticatedFetch]);

  if (!isOpen) return null;

  const renderStatRow = (
    label: string,
    icon: React.ReactNode,
    myValue: string | number,
    theirValue: string | number,
    lowerIsBetter: boolean = false
  ) => {
    const myNum = typeof myValue === 'number' ? myValue : parseFloat(myValue) || 0;
    const theirNum = typeof theirValue === 'number' ? theirValue : parseFloat(theirValue) || 0;
    
    let iWin = false;
    let theyWin = false;

    if (myNum !== theirNum) {
      if (lowerIsBetter) {
        iWin = myNum < theirNum && myNum > 0;
        theyWin = theirNum < myNum && theirNum > 0;
      } else {
        iWin = myNum > theirNum;
        theyWin = theirNum > myNum;
      }
    }

    return (
      <div className="compare-row">
        <div className={`compare-cell my-cell ${iWin ? 'winner' : ''}`}>
          <span className="compare-value">{myValue}</span>
          {iWin && <Crown size={14} className="winner-crown" />}
        </div>
        <div className="compare-label">
          {icon}
          <span>{label}</span>
        </div>
        <div className={`compare-cell their-cell ${theyWin ? 'winner' : ''}`}>
          {theyWin && <Crown size={14} className="winner-crown" />}
          <span className="compare-value">{theirValue}</span>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        className="compare-stats-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="compare-stats-modal"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="compare-header">
            <h2>VS Comparison</h2>
            <button className="close-button" onClick={onClose} aria-label="Close comparison">
              <X size={20} />
            </button>
          </div>

          {/* Avatars */}
          <div className="compare-avatars">
            <div className="compare-player">
              <div className="compare-avatar-wrapper you">
                <span className="compare-avatar-label">You</span>
              </div>
            </div>
            <span className="vs-text">VS</span>
            <div className="compare-player">
              <Avatar avatar={{ ...friendAvatar, source: 'default' }} size="large" />
              <span className="compare-player-name">{friendName}</span>
            </div>
          </div>

          {/* Content */}
          {isLoading && (
            <div className="compare-loading">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Gamepad2 size={32} />
              </motion.div>
              <p>Loading comparison...</p>
            </div>
          )}

          {error && (
            <div className="compare-error">
              <p>Unable to load comparison</p>
            </div>
          )}

          {!isLoading && !error && myStats && comparison && (
            <>
              {/* Stats Comparison */}
              <div className="compare-stats-grid">
                {renderStatRow(
                  'Streak',
                  <Flame size={16} />,
                  `${myStats.currentStreak} days`,
                  `${comparison.theirStats.currentStreak} days`
                )}
                {renderStatRow(
                  'Best Rank',
                  <Trophy size={16} />,
                  myStats.bestRankEver ? `#${myStats.bestRankEver.rank}` : '—',
                  comparison.theirStats.bestRankEver ? `#${comparison.theirStats.bestRankEver.rank}` : '—',
                  true // Lower rank is better
                )}
                {renderStatRow(
                  'Games Played',
                  <Gamepad2 size={16} />,
                  myStats.totalGamesPlayed,
                  comparison.theirStats.totalGamesPlayed
                )}
                {renderStatRow(
                  'Oranges',
                  <span className="orange-emoji">🍊</span>,
                  myStats.totalOrangesEarned.toLocaleString(),
                  comparison.theirStats.totalOrangesEarned.toLocaleString()
                )}
              </div>

              {/* Score Summary */}
              <div className="compare-summary">
                <div className={`summary-score ${comparison.wins.you > comparison.wins.them ? 'winner' : ''}`}>
                  <span className="score-number">{comparison.wins.you}</span>
                </div>
                <div className="summary-divider">
                  {comparison.wins.you === comparison.wins.them ? (
                    <span className="tie-text">TIE!</span>
                  ) : comparison.wins.you > comparison.wins.them ? (
                    <span className="win-text">You lead!</span>
                  ) : (
                    <span className="lose-text">They lead!</span>
                  )}
                </div>
                <div className={`summary-score ${comparison.wins.them > comparison.wins.you ? 'winner' : ''}`}>
                  <span className="score-number">{comparison.wins.them}</span>
                </div>
              </div>

              {/* Motivational message */}
              <div className="compare-message">
                {comparison.wins.you > comparison.wins.them ? (
                  <p>🎉 You're winning! Keep it up!</p>
                ) : comparison.wins.you < comparison.wins.them ? (
                  <p>😤 Time to grind and take the lead!</p>
                ) : (
                  <p>⚡ It's a tie! Time to break it!</p>
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CompareStats;
