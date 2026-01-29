/**
 * MarketTab Component
 *
 * Market analysis tab with heat map and price distribution.
 * Shows insight cards on mobile, heatmap on desktop.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Flame, BarChart3 } from 'lucide-react';
import type {
  MarketStats,
  HeatMapCell,
  PriceDistribution,
  HeatMapViewMode,
} from '@/types/bigpulp';
import { HeatMap } from './HeatMap';
import { PremiumToggleGroup } from './PremiumButton';
import { tabContentVariants } from '@/config/bigpulpAnimations';
import type { CacheMetadata } from '@/services/heatmapCache';
import type { BadgeOption } from './HeatMap';

interface MarketTabProps {
  stats: MarketStats | null;
  heatMapData: HeatMapCell[][] | null;
  priceDistribution: PriceDistribution | null;
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

type VisualizationType = 'insights' | 'heatmap' | 'distribution';

function PriceDistributionChart({
  data,
}: {
  data: PriceDistribution;
}) {
  // Filter out empty bins
  const nonEmptyBins = data.bins.filter((b) => b.count > 0);
  const maxCount = Math.max(...nonEmptyBins.map((b) => b.count), 1);
  const chartHeight = 160;

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: 'var(--color-glass-bg)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Chart - bars aligned at bottom */}
      <div className="mb-4">
        {/* Bar area - fixed height, all bars align to bottom */}
        <div 
          className="flex gap-1 items-end"
          style={{ height: `${chartHeight}px` }}
        >
          {nonEmptyBins.map((bin, index) => {
            const heightPx = maxCount > 0 ? (bin.count / maxCount) * chartHeight : 0;

            return (
              <motion.div
                key={index}
                className="flex-1 rounded-t-md relative group"
                style={{
                  background:
                    'linear-gradient(to top, var(--color-brand-primary), var(--color-brand-glow))',
                  height: `${heightPx}px`,
                  minHeight: bin.count > 0 ? 8 : 0,
                  transformOrigin: 'bottom',
                }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                {/* Tooltip on hover */}
                <div
                  className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                  style={{
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {bin.count} ({bin.percentage}%)
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Labels - separate row, all same height */}
        <div className="flex gap-1 mt-2">
          {nonEmptyBins.map((bin, index) => (
            <p
              key={index}
              className="flex-1 text-xs text-center truncate"
              style={{ color: 'var(--color-text-muted)' }}
              title={bin.range}
            >
              {bin.range.replace(' XCH', '')}
            </p>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {data.totalListed} NFTs listed
      </div>

      {/* Hidden accessible table */}
      <table className="sr-only">
        <caption>Price distribution of listed NFTs</caption>
        <thead>
          <tr>
            <th>Price Range</th>
            <th>Count</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          {data.bins.map((bin, index) => (
            <tr key={index}>
              <td>{bin.range}</td>
              <td>{bin.count}</td>
              <td>{bin.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HeatMapSkeleton() {
  return (
    <div
      className="p-4 rounded-xl animate-pulse"
      style={{
        background: 'var(--color-glass-bg)',
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
  priceDistribution,
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
  
  // Default to heatmap
  const [visualizationType, setVisualizationType] =
    useState<VisualizationType>('heatmap');

  const handleCellClick = useCallback((_cell: HeatMapCell) => {
    // TODO: Open cell detail modal
  }, []);

  // Toggle options - same for mobile and desktop now
  const toggleOptions = [
    { id: 'heatmap' as const, label: 'Heat Map', icon: Flame },
    { id: 'distribution' as const, label: 'Chart', icon: BarChart3 },
  ];

  // Loading skeleton
  if (isLoading || !stats) {
    return (
      <div className="space-y-4">
        {/* Stats skeleton */}
        <div
          className="h-16 rounded-xl animate-pulse"
          style={{ background: 'var(--color-border)' }}
        />
        {/* Toggle skeleton */}
        <div className="flex gap-2">
          <div
            className="flex-1 h-10 rounded-lg animate-pulse"
            style={{ background: 'var(--color-border)' }}
          />
          <div
            className="flex-1 h-10 rounded-lg animate-pulse"
            style={{ background: 'var(--color-border)' }}
          />
        </div>
        {/* Heatmap skeleton */}
        <HeatMapSkeleton />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 p-4"
      variants={prefersReducedMotion ? undefined : tabContentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Visualization Toggle - Premium styled */}
      <PremiumToggleGroup
        options={toggleOptions}
        value={visualizationType === 'insights' ? 'heatmap' : visualizationType}
        onChange={setVisualizationType}
        size="md"
        fullWidth
      />

      {/* Visualization */}
      <AnimatePresence mode="wait">
        {/* Heat Map */}
        {(visualizationType === 'heatmap' || visualizationType === 'insights') && heatMapData && (
          <motion.div
            key="heatmap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
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
          </motion.div>
        )}

        {/* Both: Distribution Chart */}
        {visualizationType === 'distribution' && priceDistribution && (
          <motion.div
            key="distribution"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <PriceDistributionChart data={priceDistribution} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default MarketTab;
