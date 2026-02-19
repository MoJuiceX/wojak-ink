/**
 * BigPulp Analysis Skeleton
 *
 * Loading placeholder for BigPulp NFT analysis results.
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import './skeletons.css';

export const BigPulpSkeleton: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="bigpulp-skeleton" role="status" aria-label="Loading BigPulp analysis">
      {/* Header with avatar and title */}
      <div className="analysis-header">
        <div className="skeleton skeleton-shimmer skeleton-avatar" />
        <div className="skeleton-text-group">
          <div className="skeleton skeleton-shimmer skeleton-line" />
          <div className="skeleton skeleton-shimmer skeleton-line short" />
        </div>
      </div>

      {/* Stats row */}
      <div className="analysis-stats">
        {[1, 2, 3].map((i) => (
          <div key={i} className="stat-skeleton">
            <div className="skeleton skeleton-shimmer skeleton-stat-value" />
            <div className="skeleton skeleton-shimmer skeleton-stat-label" />
          </div>
        ))}
      </div>

      {/* Attributes grid */}
      <div className="analysis-attributes">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="skeleton skeleton-shimmer skeleton-attribute"
          />
        ))}
      </div>

      {/* BigPulp thinking indicator */}
      <div className="bigpulp-thinking">
        <motion.span
          className="thinking-icon"
          animate={
            !prefersReducedMotion
              ? {
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }
              : {}
          }
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          🍊
        </motion.span>
        <motion.span
          className="thinking-text"
          animate={!prefersReducedMotion ? { opacity: [0.5, 1, 0.5] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          BigPulp is analyzing...
        </motion.span>
      </div>
    </div>
  );
};

export default BigPulpSkeleton;
