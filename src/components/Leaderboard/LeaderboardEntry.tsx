/**
 * Leaderboard Entry Component
 *
 * Displays a single leaderboard entry with rank, avatar, username, and score.
 * Features premium styling for top 3 and staggered entry animations.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Avatar } from '../Avatar/Avatar';
import type { LeaderboardEntry as LeaderboardEntryType } from '../../types/leaderboard';
import './Leaderboard.css';

interface LeaderboardEntryProps {
  entry: LeaderboardEntryType;
  isPodium?: boolean;
  podiumPosition?: 1 | 2 | 3;
  isHighlighted?: boolean;
  index?: number;
  isFriend?: boolean;
}

export const LeaderboardEntry: React.FC<LeaderboardEntryProps> = ({
  entry,
  isPodium = false,
  podiumPosition,
  isHighlighted = false,
  index = 0,
  isFriend = false,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/profile/${entry.userId}`);
  };

  const getRankDisplay = () => {
    if (podiumPosition === 1) return '🥇';
    if (podiumPosition === 2) return '🥈';
    if (podiumPosition === 3) return '🥉';
    return `#${entry.rank}`;
  };

  const formatScore = (score: number): string => {
    if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
    if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
    return score.toLocaleString();
  };

  const getTimeAgo = (dateStr: string): string => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (isPodium) {
    // Scale and position for podium cards
    const baseScale = podiumPosition === 1 ? 1.12 : 1;
    const baseY = podiumPosition === 1 ? -6 : 0;
    
    return (
      <motion.div
        className={`podium-card position-${podiumPosition} ${entry.isCurrentUser ? 'is-current-user' : ''}`}
        initial={{ scale: baseScale, y: baseY }}
        animate={{ scale: baseScale, y: baseY }}
        whileHover={prefersReducedMotion ? {} : {
          scale: podiumPosition === 1 ? 1.15 : 1.03,
          y: podiumPosition === 1 ? -12 : -6
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={`View profile of ${entry.displayName}, rank ${entry.rank}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
        style={{ cursor: 'pointer' }}
      >
        {/* Crown for 1st place */}
        {podiumPosition === 1 && (
          <motion.div
            className="podium-crown"
            animate={prefersReducedMotion ? {} : { y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            👑
          </motion.div>
        )}
        <div className="podium-rank">{getRankDisplay()}</div>
        <Avatar
          avatar={entry.avatar}
          size={podiumPosition === 1 ? 'xlarge' : 'large'}
          isNftHolder={entry.avatar.type === 'nft'}
        />
        <div className="podium-info">
          <span className={`podium-username ${entry.equipped?.nameEffect?.css_class || ''}`}>
            {entry.displayName}
          </span>
          <span className="podium-score">{formatScore(entry.score)}</span>
        </div>
      </motion.div>
    );
  }

  // Get rank-specific class for top 3 styling in list view
  const rankClass = entry.rank <= 3 ? `rank-${entry.rank}` : '';

  return (
    <motion.div
      className={`leaderboard-row ${rankClass} ${entry.isCurrentUser ? 'is-current-user' : ''} ${isHighlighted ? 'highlighted' : ''} ${isFriend ? 'is-friend' : ''}`}
      initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`View profile of ${entry.displayName}, rank ${entry.rank}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
    >
      <div className={`row-rank ${rankClass}`}>
        {entry.rank <= 3 ? (
          <div className="rank-badge">{getRankDisplay()}</div>
        ) : (
          <span className="rank-number">{getRankDisplay()}</span>
        )}
      </div>

      <Avatar
        avatar={entry.avatar}
        size="small"
        isNftHolder={entry.avatar.type === 'nft'}
      />

      <div className="row-info">
        <span className={`row-username ${entry.equipped?.nameEffect?.css_class || ''}`}>
          {entry.displayName}
          {isFriend && <span className="friend-indicator">👤</span>}
        </span>
        <span className="row-time">{getTimeAgo(entry.createdAt)}</span>
      </div>

      <div className="row-score">
        {formatScore(entry.score)}
      </div>
    </motion.div>
  );
};

export default LeaderboardEntry;
