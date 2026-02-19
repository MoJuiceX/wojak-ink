/**
 * Media Card Skeleton
 *
 * Loading placeholder for media/video cards.
 */

import React from 'react';
import { motion } from 'framer-motion';
import './skeletons.css';

interface MediaCardSkeletonProps {
  delay?: number;
}

export const MediaCardSkeleton: React.FC<MediaCardSkeletonProps> = ({
  delay = 0,
}) => (
  <motion.div
    className="media-card-skeleton"
    role="status"
    aria-label="Loading media"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay }}
  >
    <div className="skeleton skeleton-shimmer skeleton-thumbnail">
      <div className="skeleton-play-icon">▶</div>
    </div>
    <div className="skeleton-info">
      <div className="skeleton skeleton-shimmer skeleton-media-title" />
      <div className="skeleton skeleton-shimmer skeleton-media-meta" />
    </div>
  </motion.div>
);

export default MediaCardSkeleton;
