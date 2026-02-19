/**
 * Mobile Podium Component
 * 
 * Unified podium display for mobile showing top 3 players.
 * - Champion section: #1 with crown, large medal, full username
 * - Runners-up row: #2 and #3 as mini-cards
 * - Integrated countdown timer (hidden for all-time)
 * 
 * Replaces separate ChampionCard + styled list items approach.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../Avatar/Avatar';
import './MobilePodium.css';

interface PodiumEntry {
  userId: string;
  displayName: string;
  avatar: {
    type: 'emoji' | 'nft';
    value: string;
    source?: 'default' | 'user' | 'wallet';
  };
  score: number;
  rank: number;
  equipped?: {
    nameEffect?: {
      id: string;
      css_class: string;
    };
  };
}

interface MobilePodiumProps {
  entries: PodiumEntry[];
  timeframe: 'daily' | 'weekly' | 'all-time';
}

// Calculate reset time based on timeframe
function getResetTime(timeframe: 'daily' | 'weekly' | 'all-time'): string | null {
  if (timeframe === 'all-time') return null;
  
  const now = new Date();
  
  if (timeframe === 'daily') {
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  } else {
    // Weekly: Next Monday midnight UTC
    const currentDay = now.getUTCDay();
    const daysUntilMonday = currentDay === 0 ? 1 : (8 - currentDay);
    const nextMonday = new Date(now);
    nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(0, 0, 0, 0);
    return nextMonday.toISOString();
  }
}

// Format countdown string
function formatCountdown(resetTime: string): string {
  const now = new Date().getTime();
  const target = new Date(resetTime).getTime();
  const total = Math.max(0, target - now);

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);

  if (days > 0) {
    return `Resets in ${days}d ${hours}h`;
  } else if (hours > 0) {
    const minutes = Math.floor((total / 1000 / 60) % 60);
    return `Resets in ${hours}h ${minutes}m`;
  } else {
    const minutes = Math.floor((total / 1000 / 60) % 60);
    return `Resets in ${minutes}m`;
  }
}

// Format score for display
function formatScore(score: number): string {
  if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
  if (score >= 10000) return `${(score / 1000).toFixed(1)}K`;
  return score.toLocaleString();
}

export const MobilePodium: React.FC<MobilePodiumProps> = ({ entries, timeframe }) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState<string | null>(null);

  const timeframeLabel = {
    'daily': "Today's",
    'weekly': "This Week's",
    'all-time': "All-Time"
  }[timeframe];

  // Update countdown every minute
  useEffect(() => {
    const resetTime = getResetTime(timeframe);
    if (!resetTime) {
      queueMicrotask(() => setCountdown(null));
      return;
    }

    queueMicrotask(() => setCountdown(formatCountdown(resetTime)));
    const interval = setInterval(() => {
      setCountdown(formatCountdown(resetTime));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [timeframe]);

  const handleEntryClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  // Get entries by position
  const champion = entries[0];
  const second = entries[1];
  const third = entries[2];

  if (!champion) return null;

  return (
    <motion.div
      className="mobile-podium"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* === CHAMPION SECTION === */}
      <div className="podium-champion" onClick={() => handleEntryClick(champion.userId)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleEntryClick(champion.userId); }}>
        {/* Header with label and countdown */}
        <div className="champion-header">
          <span className="champion-label">{timeframeLabel} Champion</span>
          {countdown && (
            <span className="champion-countdown">{countdown}</span>
          )}
        </div>

        {/* Crown */}
        <div className="champion-crown">👑</div>

        {/* Avatar */}
        <div className="champion-avatar">
          <Avatar
            avatar={{ ...champion.avatar, source: champion.avatar.source || 'default' }}
            size="xlarge"
            isNftHolder={champion.avatar.type === 'nft'}
          />
        </div>

        {/* Name */}
        <span className={`champion-name ${champion.equipped?.nameEffect?.css_class || ''}`}>
          {champion.displayName}
        </span>

        {/* Score with medal */}
        <div className="champion-score-row">
          <span className="champion-medal">🥇</span>
          <span className="champion-score">
            {champion.score.toLocaleString()}
          </span>
        </div>
      </div>

      {/* === RUNNERS-UP ROW === */}
      {(second || third) && (
        <div className="podium-runners">
          {/* Second Place */}
          {second && (
            <motion.div
              className="runner-card silver"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              onClick={() => handleEntryClick(second.userId)}
            >
              <div className="runner-avatar">
                <Avatar
                  avatar={{ ...second.avatar, source: second.avatar.source || 'default' }}
                  size="medium"
                  isNftHolder={second.avatar.type === 'nft'}
                />
              </div>
              <span className={`runner-name ${second.equipped?.nameEffect?.css_class || ''}`}>
                {second.displayName}
              </span>
              <div className="runner-score-row">
                <span className="runner-medal">🥈</span>
                <span className="runner-score">{formatScore(second.score)}</span>
              </div>
            </motion.div>
          )}

          {/* Third Place */}
          {third && (
            <motion.div
              className="runner-card bronze"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              onClick={() => handleEntryClick(third.userId)}
            >
              <div className="runner-avatar">
                <Avatar
                  avatar={{ ...third.avatar, source: third.avatar.source || 'default' }}
                  size="medium"
                  isNftHolder={third.avatar.type === 'nft'}
                />
              </div>
              <span className={`runner-name ${third.equipped?.nameEffect?.css_class || ''}`}>
                {third.displayName}
              </span>
              <div className="runner-score-row">
                <span className="runner-medal">🥉</span>
                <span className="runner-score">{formatScore(third.score)}</span>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default MobilePodium;
