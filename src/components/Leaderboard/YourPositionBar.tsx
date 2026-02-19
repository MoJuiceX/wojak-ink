/**
 * Your Position Bar Component (Desktop)
 * 
 * Sticky footer showing user's rank, tier, and rival.
 * Always visible on desktop when user has scores.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar/Avatar';
import { getDeterministicRivalMessage } from '@/lib/leaderboard/rivalMessages';
import './YourPositionBar.css';

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

interface YourPositionBarProps {
  userPosition: UserPosition;
  isInVisibleList: boolean;
}

export const YourPositionBar: React.FC<YourPositionBarProps> = ({
  userPosition,
  isInVisibleList,
}) => {
  const navigate = useNavigate();
  const { rank, nextRival } = userPosition;

  // Get aggressive rival message
  const rivalMessage = useMemo(() => {
    if (!nextRival) return null;
    return getDeterministicRivalMessage({
      rivalName: nextRival.displayName,
      pointsAhead: nextRival.pointsAhead,
    });
  }, [nextRival]);

  // Don't show if user is in the visible list (they can see themselves)
  // But still show if they want to see rival info
  // Actually, let's always show it for the rival challenge
  if (!nextRival && isInVisibleList) {
    return null;
  }

  const handleRivalClick = () => {
    if (nextRival) {
      navigate(`/profile/${nextRival.userId}`);
    }
  };

  return (
    <motion.div
      className="your-position-bar"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="position-bar-content">
        {/* Rank */}
        <div className="position-rank-section">
          <span className="position-rank">#{rank}</span>
        </div>

        {/* Divider */}
        <span className="position-divider">·</span>

        {/* Rival Challenge */}
        {nextRival ? (
          <div className="position-rival-section" onClick={handleRivalClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleRivalClick(); }}>
            <span className="rival-message">{rivalMessage}</span>
            <div className="rival-avatar-wrapper">
              <Avatar
                avatar={{ ...nextRival.avatar, source: 'default' }}
                size="small"
              />
            </div>
          </div>
        ) : (
          <span className="position-champion">👑 You're #1! Defend your throne!</span>
        )}
      </div>
    </motion.div>
  );
};

export default YourPositionBar;
