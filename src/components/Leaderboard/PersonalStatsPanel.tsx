/**
 * Personal Stats Panel Component
 * 
 * Shows user's personal statistics.
 * Desktop: Right sidebar
 * Mobile: Below leaderboard
 * 
 * Features progressive disclosure (3 primary + expand for more)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Flame, Trophy, Gamepad2, TrendingUp, Award, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
const loadConfetti = () => import('canvas-confetti').then(m => m.default);
import './PersonalStatsPanel.css';

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

interface PersonalStatsPanelProps {
  className?: string;
}

// Store previous stats to detect new personal bests
let previousBestRank: number | null = null;
let previousLongestStreak: number | null = null;

export const PersonalStatsPanel: React.FC<PersonalStatsPanelProps> = ({ className = '' }) => {
  useAuth(); // Auth context needed for signed-in detection
  const { authenticatedFetch, isSignedIn } = useAuthenticatedFetch();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch user stats
  useEffect(() => {
    if (!isSignedIn) {
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authenticatedFetch('/api/user/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }
        const data = await response.json();
        
        // Check for new personal bests and trigger confetti
        if (data.stats) {
          const newStats = data.stats as UserStats;
          
          // Check for new best rank
          if (newStats.bestRankEver && previousBestRank !== null) {
            if (newStats.bestRankEver.rank < previousBestRank) {
              triggerConfetti();
            }
          }
          
          // Check for new longest streak
          if (newStats.longestStreak > (previousLongestStreak || 0) && previousLongestStreak !== null) {
            triggerConfetti();
          }
          
          // Update previous values
          previousBestRank = newStats.bestRankEver?.rank || null;
          previousLongestStreak = newStats.longestStreak;
          
          setStats(newStats);
        }
      } catch (err) {
        console.error('[PersonalStats] Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [isSignedIn, authenticatedFetch]);

  // Confetti effect for new personal best
  const triggerConfetti = async () => {
    const confetti = await loadConfetti();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F97316', '#FFD700', '#FB923C', '#FCD34D'],
    });
  };

  // Not signed in
  if (!isSignedIn) {
    return (
      <div className={`personal-stats-panel ${className}`}>
        <div className="stats-header">
          <Trophy size={18} />
          <span>Your Stats</span>
        </div>
        <div className="stats-login-prompt">
          <p>Sign in to track your progress</p>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className={`personal-stats-panel ${className}`}>
        <div className="stats-header">
          <Trophy size={18} />
          <span>Your Stats</span>
        </div>
        <div className="stats-loading">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Gamepad2 size={24} />
          </motion.div>
        </div>
      </div>
    );
  }

  // Error
  if (error || !stats) {
    return (
      <div className={`personal-stats-panel ${className}`}>
        <div className="stats-header">
          <Trophy size={18} />
          <span>Your Stats</span>
        </div>
        <div className="stats-error">
          <p>Unable to load stats</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`personal-stats-panel ${className}`}>
      <div className="stats-header">
        <Trophy size={18} />
        <span>Your Stats</span>
      </div>

      {/* Primary Stats (Always Visible) */}
      <div className="stats-primary">
        {/* Current Streak */}
        <motion.div
          className="stat-card stat-streak"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="stat-icon">
            <Flame size={20} className="flame-icon" />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.currentStreak}</span>
            <span className="stat-label">day streak</span>
          </div>
          {stats.currentStreak > 0 && (
            <span className="stat-encourage">Keep it going!</span>
          )}
        </motion.div>

        {/* Best Rank Ever */}
        <motion.div
          className="stat-card stat-rank"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="stat-icon">
            <Award size={20} />
          </div>
          <div className="stat-content">
            {stats.bestRankEver ? (
              <>
                <span className="stat-value">#{stats.bestRankEver.rank}</span>
                <span className="stat-label">in {stats.bestRankEver.gameName}</span>
              </>
            ) : (
              <>
                <span className="stat-value">—</span>
                <span className="stat-label">Best rank</span>
              </>
            )}
          </div>
        </motion.div>

        {/* Total Games */}
        <motion.div
          className="stat-card stat-games"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="stat-icon">
            <Gamepad2 size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalGamesPlayed}</span>
            <span className="stat-label">games played</span>
          </div>
        </motion.div>
      </div>

      {/* Expand/Collapse Toggle */}
      <button
        className="stats-expand-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>{isExpanded ? 'Show less' : 'Show more stats'}</span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Secondary Stats (Expandable) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="stats-secondary"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Longest Streak */}
            <div className="stat-row">
              <TrendingUp size={16} />
              <span className="stat-row-label">Longest streak</span>
              <span className="stat-row-value">{stats.longestStreak} days</span>
            </div>

            {/* Oranges Earned */}
            <div className="stat-row">
              <span className="stat-row-emoji">🍊</span>
              <span className="stat-row-label">Oranges earned</span>
              <span className="stat-row-value">{stats.totalOrangesEarned.toLocaleString()}</span>
            </div>

            {/* Favorite Game */}
            {stats.favoriteGame && (
              <div className="stat-row">
                <Heart size={16} className="heart-icon" />
                <span className="stat-row-label">Favorite</span>
                <span className="stat-row-value">{stats.favoriteGame.gameName}</span>
              </div>
            )}

            {/* Per-Game Breakdown */}
            {stats.perGameStats.length > 0 && (
              <div className="stats-breakdown">
                <h4 className="breakdown-title">Game Breakdown</h4>
                <div className="breakdown-list">
                  {stats.perGameStats.slice(0, 5).map((game) => (
                    <div key={game.gameId} className="breakdown-item">
                      <span className="breakdown-name">{game.gameName}</span>
                      <span className="breakdown-stats">
                        {game.gamesPlayed} plays
                        {game.bestRank && ` · Best #${game.bestRank}`}
                      </span>
                    </div>
                  ))}
                  {stats.perGameStats.length > 5 && (
                    <span className="breakdown-more">
                      +{stats.perGameStats.length - 5} more games
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PersonalStatsPanel;
