/**
 * Skeleton Vote Card Component
 *
 * Loading placeholder for vote cards in FightClub/voting interfaces.
 */

import React from 'react';
import { motion } from 'framer-motion';
import './skeletons.css';

interface SkeletonVoteCardProps {
  /** Animation delay for staggered loading */
  delay?: number;
  /** Show as compact variant (no description) */
  compact?: boolean;
}

export const SkeletonVoteCard: React.FC<SkeletonVoteCardProps> = ({
  delay = 0,
  compact = false,
}) => {
  const variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { delay, staggerChildren: 0.08, delayChildren: delay },
    },
  };

  const childVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      className="skeleton-vote-card"
      variants={variants}
      initial="hidden"
      animate="visible"
    >
      {/* Image/Avatar Section */}
      <motion.div className="skeleton-vote-image" variants={childVariants}>
        <div className="skeleton skeleton-shimmer skeleton-image" />
      </motion.div>

      {/* Header Info */}
      <motion.div className="skeleton-vote-header" variants={childVariants}>
        <div className="skeleton skeleton-shimmer skeleton-title" />
        <div className="skeleton skeleton-shimmer skeleton-subtitle" />
      </motion.div>

      {/* Description (if not compact) */}
      {!compact && (
        <motion.div className="skeleton-vote-description" variants={childVariants}>
          <div className="skeleton skeleton-shimmer skeleton-text" />
          <div className="skeleton skeleton-shimmer skeleton-text skeleton-text-short" />
        </motion.div>
      )}

      {/* Stats Row */}
      <motion.div className="skeleton-vote-stats" variants={childVariants}>
        <div className="skeleton skeleton-shimmer skeleton-stat-badge" />
        <div className="skeleton skeleton-shimmer skeleton-stat-badge" />
        <div className="skeleton skeleton-shimmer skeleton-stat-badge" />
      </motion.div>

      {/* Action Button */}
      <motion.div className="skeleton-vote-action" variants={childVariants}>
        <div className="skeleton skeleton-shimmer skeleton-button" />
      </motion.div>
    </motion.div>
  );
};

export default SkeletonVoteCard;
