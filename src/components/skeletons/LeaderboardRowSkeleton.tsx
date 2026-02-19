/**
 * Leaderboard Row Skeleton
 *
 * Loading placeholder for leaderboard rows.
 */

import React from 'react';
import { motion } from 'framer-motion';
import './skeletons.css';

interface LeaderboardRowSkeletonProps {
  delay?: number;
}

export const LeaderboardRowSkeleton: React.FC<LeaderboardRowSkeletonProps> = ({
  delay = 0,
}) => (
  <motion.div
    className="leaderboard-row-skeleton"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay }}
  >
    <div className="skeleton skeleton-shimmer skeleton-rank" />
    <div className="skeleton skeleton-shimmer skeleton-player-avatar" />
    <div className="skeleton skeleton-shimmer skeleton-player-name" />
    <div className="skeleton skeleton-shimmer skeleton-score" />
  </motion.div>
);

interface LeaderboardSkeletonProps {
  rows?: number;
}

export const LeaderboardSkeleton: React.FC<LeaderboardSkeletonProps> = ({
  rows = 10,
}) => (
  <div className="leaderboard-skeleton" role="status" aria-label="Loading leaderboard">
    {Array.from({ length: rows }).map((_, i) => (
      <LeaderboardRowSkeleton key={i} delay={i * 0.05} />
    ))}
  </div>
);

export default LeaderboardRowSkeleton;
