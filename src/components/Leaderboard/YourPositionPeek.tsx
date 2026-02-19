/**
 * Your Position Peek Component (Mobile)
 * 
 * Collapsible bar showing user's rank and rival.
 * Tap to expand for full details.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar/Avatar';
import { getDeterministicRivalMessage, getPeekBarText } from '@/lib/leaderboard/rivalMessages';
import './YourPositionPeek.css';

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

interface YourPositionPeekProps {
  userPosition: UserPosition;
}

export const YourPositionPeek: React.FC<YourPositionPeekProps> = ({
  userPosition,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { rank, score, nextRival } = userPosition;

  // Get messages
  const peekText = useMemo(() => {
    if (!nextRival) return '👑 You\'re #1!';
    return getPeekBarText({
      rivalName: nextRival.displayName,
      pointsAhead: nextRival.pointsAhead,
    });
  }, [nextRival]);

  const fullMessage = useMemo(() => {
    if (!nextRival) return null;
    return getDeterministicRivalMessage({
      rivalName: nextRival.displayName,
      pointsAhead: nextRival.pointsAhead,
    });
  }, [nextRival]);

  const handleRivalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nextRival) {
      navigate(`/profile/${nextRival.userId}`);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      className={`your-position-peek ${isExpanded ? 'expanded' : ''}`}
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Collapsed Bar (Always Visible) */}
      <div className="peek-collapsed" onClick={toggleExpand} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && toggleExpand()}>
        <div className="peek-left">
          <span className="peek-rank">#{rank}</span>
          <span className="peek-divider">·</span>
          <span className="peek-text">{isExpanded ? 'Tap to collapse' : peekText}</span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronUp size={18} className="peek-chevron" />
        </motion.div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="peek-expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="peek-details">
              {/* Score */}
              <div className="peek-score-row">
                <span className="peek-label">Your Score</span>
                <span className="peek-value">{score.toLocaleString()}</span>
              </div>

              {/* Rival Section */}
              {nextRival ? (
                <div className="peek-rival-section">
                  <div className="peek-rival-header" onClick={handleRivalClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleRivalClick(e as unknown as React.MouseEvent); }}>
                    <Avatar avatar={{ ...nextRival.avatar, source: 'default' }} size="small" />
                    <div className="peek-rival-info">
                      <span className="peek-rival-name">{nextRival.displayName}</span>
                      <span className="peek-rival-score">{nextRival.score.toLocaleString()} pts</span>
                    </div>
                  </div>
                  <div className="peek-rival-message">
                    {fullMessage}
                  </div>
                </div>
              ) : (
                <div className="peek-champion-section">
                  <span className="peek-champion-text">
                    👑 You're the champion! Defend your throne!
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default YourPositionPeek;
