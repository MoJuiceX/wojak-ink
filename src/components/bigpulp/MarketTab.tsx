/**
 * MarketTab Component
 *
 * Market analysis tab with heat map and price distribution.
 * Shows insight cards on mobile, heatmap on desktop.
 */

import { useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type {
  MarketStats,
  HeatMapCell,
  HeatMapViewMode,
} from '@/types/bigpulp';
import { HeatMap } from './HeatMap';
import { tabContentVariants } from '@/config/bigpulpAnimations';
import type { CacheMetadata } from '@/services/heatmapCache';
import type { BadgeOption } from './HeatMap';

interface MarketTabProps {
  stats: MarketStats | null;
  heatMapData: HeatMapCell[][] | null;
  viewMode: HeatMapViewMode;
  onViewModeChange: (mode: HeatMapViewMode) => void;
  isLoading?: boolean;
  // Cache state for heatmap
  heatmapCacheMetadata?: CacheMetadata | null;
  isHeatmapRefetching?: boolean;
  onHeatmapRefresh?: () => void;
  // Badge filtering
  badges?: BadgeOption[];
  selectedBadge?: string | null;
  onBadgeChange?: (badge: string | null) => void;
}

function HeatMapSkeleton() {
  return (
    <div
      className="p-4 rounded-xl animate-pulse"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, row) => (
          <div key={row} className="flex gap-2">
            <div
              className="w-14 h-8 rounded"
              style={{ background: 'var(--color-border)' }}
            />
            {Array.from({ length: 6 }).map((_, col) => (
              <div
                key={col}
                className="flex-1 h-8 rounded"
                style={{ background: 'var(--color-border)' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketTab({
  stats,
  heatMapData,
  viewMode,
  onViewModeChange,
  isLoading = false,
  heatmapCacheMetadata,
  isHeatmapRefetching,
  onHeatmapRefresh,
  badges,
  selectedBadge,
  onBadgeChange,
}: MarketTabProps) {
  const prefersReducedMotion = useReducedMotion();

  const handleCellClick = useCallback((cell: HeatMapCell) => {
    void cell; // TODO: Open cell detail modal
  }, []);

  // Loading skeleton
  if (isLoading || !stats) {
    return (
      <div className="space-y-4">
        {/* Heatmap skeleton */}
        <HeatMapSkeleton />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-2 px-4 pt-2 pb-4"
      variants={prefersReducedMotion ? undefined : tabContentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Heat Map - always shown, no toggle needed */}
      {heatMapData && (
        <HeatMap
          data={heatMapData}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          onCellClick={handleCellClick}
          cacheMetadata={heatmapCacheMetadata}
          isRefetching={isHeatmapRefetching}
          onRefresh={onHeatmapRefresh}
          badges={badges}
          selectedBadge={selectedBadge}
          onBadgeChange={onBadgeChange}
        />
      )}
    </motion.div>
  );
}

export default MarketTab;
