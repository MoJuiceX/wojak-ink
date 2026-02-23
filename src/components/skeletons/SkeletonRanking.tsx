/**
 * Skeleton Ranking Component
 *
 * Loading placeholder for ranking list items with progressive reveal.
 */

import React from 'react';
import { motion } from 'framer-motion';
import './skeletons.css';

interface SkeletonRankingProps {
  /** Animation delay for staggered loading */
  delay?: number;
  /** Show as mini (compact) variant */
  mini?: boolean;
}

export const SkeletonRanking: React.FC<SkeletonRankingProps> = ({
  delay = 0,
  mini = false,
}) => {
  const variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { delay, staggerChildren: 0.05, delayChildren: delay },
    },
  };

  const childVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  if (mini) {
    return (
      <motion.div
        className="skeleton-ranking-mini"
        variants={variants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="skeleton skeleton-shimmer" variants={childVariants} />
        <motion.div className="skeleton skeleton-shimmer" variants={childVariants} />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="skeleton-ranking"
      variants={variants}
      initial="hidden"
      animate="visible"
    >
      {/* Rank Badge */}
      <motion.div className="skeleton-rank" variants={childVariants}>
        <div className="skeleton skeleton-shimmer skeleton-badge" />
      </motion.div>

      {/* Avatar */}
      <motion.div className="skeleton-avatar" variants={childVariants}>
        <div className="skeleton skeleton-shimmer skeleton-circle" />
      </motion.div>

      {/* Content */}
      <motion.div className="skeleton-ranking-content" variants={childVariants}>
        <div className="skeleton skeleton-shimmer skeleton-title" />
        <div className="skeleton skeleton-shimmer skeleton-subtitle" />
      </motion.div>

      {/* Stats (right side) */}
      <motion.div className="skeleton-stats" variants={childVariants}>
        <div className="skeleton skeleton-shimmer skeleton-stat-value" />
        <div className="skeleton skeleton-shimmer skeleton-stat-label" />
      </motion.div>
    </motion.div>
  );
};

export default SkeletonRanking;
