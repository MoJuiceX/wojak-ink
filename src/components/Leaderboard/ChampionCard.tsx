/**
 * Champion Card Component
 * 
 * Mobile-optimized display for the #1 ranked player.
 * Shows full username and score without truncation.
 * Part of the scrollable content flow (not a fixed hero).
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../Avatar/Avatar';
import './ChampionCard.css';

interface ChampionCardEntry {
  userId: string;
  displayName: string;
  avatar: {
    type: 'emoji' | 'nft';
    value: string;
    source?: 'default' | 'user' | 'wallet';
  };
  score: number;
  equipped?: {
    nameEffect?: {
      id: string;
      css_class: string;
    };
  };
}

interface ChampionCardProps {
  entry: ChampionCardEntry;
  timeframe: 'daily' | 'weekly' | 'all-time';
}

export const ChampionCard: React.FC<ChampionCardProps> = ({ entry, timeframe }) => {
  const navigate = useNavigate();
  
  const timeframeLabel = {
    'daily': "Today's",
    'weekly': "This Week's",
    'all-time': "All-Time"
  }[timeframe];

  const handleClick = () => {
    navigate(`/profile/${entry.userId}`);
  };

  return (
    <motion.div
      className="champion-card glass hover-lift glow-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`View profile of ${entry.displayName}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
    >
      <span className="champion-label">{timeframeLabel} Champion</span>
      
      <div className="champion-crown">👑</div>
      
      <div className="champion-avatar">
        <Avatar 
          avatar={{ ...entry.avatar, source: entry.avatar.source || 'default' }} 
          size="xlarge" 
          isNftHolder={entry.avatar.type === 'nft'}
        />
      </div>
      
      <span className={`champion-name ${entry.equipped?.nameEffect?.css_class || ''}`}>
        {entry.displayName}
      </span>
      
      <span className="champion-score">
        {entry.score.toLocaleString()}
      </span>
      
      <span className="champion-rank-badge">🥇 #1</span>
    </motion.div>
  );
};

export default ChampionCard;
