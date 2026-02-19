/**
 * Gallery Grid Skeleton
 *
 * Loading placeholder for the full gallery grid.
 * Uses staggered animation for a premium loading experience.
 */

import React from 'react';
import { NFTCardSkeleton } from './NFTCardSkeleton';
import './skeletons.css';

interface GalleryGridSkeletonProps {
  /** Number of skeleton cards to show */
  count?: number;
  /** Number of columns in the grid */
  columns?: 2 | 3 | 4;
}

export const GalleryGridSkeleton: React.FC<GalleryGridSkeletonProps> = ({
  count = 12,
  columns = 3,
}) => (
  <div className={`gallery-grid-skeleton columns-${columns}`} role="status" aria-label="Loading gallery">
    {Array.from({ length: count }).map((_, i) => (
      <NFTCardSkeleton key={i} delay={i * 0.05} />
    ))}
  </div>
);

export default GalleryGridSkeleton;
