/**
 * EmptyStateContent Component
 *
 * Shows engaging content when no NFT is selected:
 * - Quick market stats
 * - Trending/recent NFTs carousel
 * - Call to action to search
 */

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TrendingUp, BarChart2, Coins, Sparkles, ArrowRight } from 'lucide-react';
import type { MarketStats } from '@/types/bigpulp';

interface EmptyStateContentProps {
  stats: MarketStats | null;
  topSales?: Array<{
    id: string;
    name: string;
    imageUrl: string;
    priceXch: number;
    rank?: number;
  }>;
  onNFTClick?: (id: string) => void;
  isLoading?: boolean;
}

// Quick Stats Row
function QuickStats({
  stats,
  isLoading,
}: {
  stats: MarketStats | null;
  isLoading?: boolean;
}) {
  const statsItems = useMemo(() => {
    if (!stats) return [];
    return [
      {
        icon: BarChart2,
        label: 'Listed',
        value: stats.listedCount.toString(),
        color: 'var(--color-primary)',
      },
      {
        icon: TrendingUp,
        label: 'Trades',
        value: stats.totalTrades.toLocaleString(),
        color: 'rgba(34, 197, 94, 0.9)',
      },
      {
        icon: Coins,
        label: 'XCH Vol',
        value: Math.floor(stats.totalVolume).toLocaleString(),
        color: 'rgba(251, 191, 36, 0.9)',
      },
    ];
  }, [stats]);

  if (isLoading || !stats) {
    return (
      <div
        className="grid grid-cols-3 gap-2 sm:gap-3"
        style={{ marginBottom: '16px' }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-3 rounded-xl animate-pulse"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              className="h-8 w-12 rounded mx-auto mb-2"
              style={{ background: 'var(--color-border)' }}
            />
            <div
              className="h-3 w-10 rounded mx-auto"
              style={{ background: 'var(--color-border)' }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-3 gap-1.5 sm:gap-2"
      style={{ marginBottom: '12px' }}
    >
      {statsItems.map((item) => (
        <motion.div
          key={item.label}
          className="py-2 px-2 rounded-xl text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          whileHover={{
            scale: 1.02,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}
        >
          <item.icon
            size={14}
            style={{ color: item.color, margin: '0 auto 4px', opacity: 0.8 }}
          />
          <p
            className="text-lg font-bold"
            style={{ color: item.color }}
          >
            {item.value}
          </p>
          <p
            className="text-xs text-muted"
          >
            {item.label}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

// Trending NFTs Carousel
function TrendingNFTs({
  nfts,
  onNFTClick,
  isLoading,
}: {
  nfts?: EmptyStateContentProps['topSales'];
  onNFTClick?: (id: string) => void;
  isLoading?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div
            className="h-4 w-24 rounded animate-pulse"
            style={{ background: 'var(--color-border)' }}
          />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-28 rounded-xl animate-pulse"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                className="aspect-square rounded-t-xl"
                style={{ background: 'var(--color-border)' }}
              />
              <div className="p-2 space-y-1">
                <div
                  className="h-3 w-16 rounded"
                  style={{ background: 'var(--color-border)' }}
                />
                <div
                  className="h-3 w-12 rounded"
                  style={{ background: 'var(--color-border)' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!nfts || nfts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <span
            className="text-primary"
            style={{
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Recent Top Sales
          </span>
        </div>
        <span
          className="text-muted"
          style={{
            fontSize: '12px',
          }}
        >
          Tap to analyze
        </span>
      </div>

      {/* Horizontal scroll carousel */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {nfts.slice(0, 8).map((nft, index) => (
          <motion.button
            key={nft.id}
            type="button"
            onClick={() => {
              // Extract numeric ID from name like "Wojak #1234"
              const match = nft.name.match(/#(\d+)/);
              if (match) {
                onNFTClick?.(match[1]);
              }
            }}
            className="flex-shrink-0 rounded-xl overflow-hidden text-left"
            style={{
              width: '112px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              scrollSnapAlign: 'start',
            }}
            initial={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{
              scale: 1.05,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Image */}
            <div className="aspect-square overflow-hidden">
              <img
                src={nft.imageUrl}
                alt={nft.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Info */}
            <div className="p-2">
              <p
                className="text-xs font-medium truncate text-primary"
              >
                {nft.name}
              </p>
              <p
                className="text-xs font-bold text-accent"
              >
                {nft.priceXch.toFixed(2)} XCH
              </p>
            </div>
          </motion.button>
        ))}

        {/* View more indicator */}
        <div
          className="flex-shrink-0 w-16 flex items-center justify-center rounded-xl"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            scrollSnapAlign: 'start',
          }}
        >
          <ArrowRight size={20} className="text-muted" />
        </div>
      </div>
    </div>
  );
}

// Main Component
export function EmptyStateContent({
  stats,
  topSales,
  onNFTClick,
  isLoading,
}: EmptyStateContentProps) {
  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <QuickStats stats={stats} isLoading={isLoading} />

      {/* Trending NFTs */}
      <TrendingNFTs
        nfts={topSales}
        onNFTClick={onNFTClick}
        isLoading={isLoading}
      />
    </div>
  );
}

// Also export QuickStats for use in MarketTab
export { QuickStats };

export default EmptyStateContent;
