/**
 * MarketInsightCards Component
 *
 * Mobile-friendly alternative to the heatmap that shows scannable insight cards.
 * Each card represents a market opportunity zone with actionable data.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { TrendingUp, Target, Crown, Sparkles, AlertTriangle, ChevronRight, X } from 'lucide-react';
import type { HeatMapCell, HeatMapViewMode } from '@/types/bigpulp';
import { VIEW_MODES } from '@/config/heatMapConfig';
import type { LucideIcon } from 'lucide-react';

interface MarketInsightCardsProps {
  data: HeatMapCell[][];
  onViewModeChange?: (mode: HeatMapViewMode) => void;
}

// Insight card configuration
interface InsightConfig {
  id: HeatMapViewMode;
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  glowColor: string;
  borderColor: string;
}

const INSIGHT_CONFIGS: InsightConfig[] = [
  {
    id: 'sleepy-deals',
    title: 'Sleepy Deals',
    description: 'Good rarity, priced below market',
    icon: TrendingUp,
    gradient: 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.05) 100%)',
    glowColor: 'rgba(34,197,94,0.3)',
    borderColor: 'rgba(34,197,94,0.4)',
  },
  {
    id: 'floor-snipes',
    title: 'Floor Snipes',
    description: 'Listed under 0.5 XCH',
    icon: Target,
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0.05) 100%)',
    glowColor: 'rgba(59,130,246,0.3)',
    borderColor: 'rgba(59,130,246,0.4)',
  },
  {
    id: 'whale-territory',
    title: 'Premium Listings',
    description: 'High-value offerings (6+ XCH)',
    icon: Crown,
    gradient: 'linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(251,191,36,0.05) 100%)',
    glowColor: 'rgba(251,191,36,0.3)',
    borderColor: 'rgba(251,191,36,0.4)',
  },
  {
    id: 'delusion-zones',
    title: 'Diamond Hands Only',
    description: 'Ambitious asks - DYOR',
    icon: AlertTriangle,
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.03) 100%)',
    glowColor: 'rgba(239,68,68,0.2)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
];

// Calculate NFTs matching each insight category
function calculateInsightCounts(
  data: HeatMapCell[][],
  viewModeId: HeatMapViewMode
): { count: number; nfts: HeatMapCell['nfts'] } {
  const viewMode = VIEW_MODES.find((m) => m.id === viewModeId);
  if (!viewMode) return { count: 0, nfts: [] };

  const matchingNfts: HeatMapCell['nfts'] = [];
  let totalCount = 0;

  data.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (viewMode.filter(rowIndex, colIndex) && cell.count > 0) {
        totalCount += cell.count;
        matchingNfts.push(...cell.nfts);
      }
    });
  });

  return { count: totalCount, nfts: matchingNfts };
}

// Individual insight card
function InsightCard({
  config,
  count,
  nfts,
  onExpand,
}: {
  config: InsightConfig;
  count: number;
  nfts: HeatMapCell['nfts'];
  onExpand: () => void;
}) {
  void nfts; // Reserved for future use
  const prefersReducedMotion = useReducedMotion();
  const Icon = config.icon;
  const hasNfts = count > 0;

  return (
    <motion.button
      type="button"
      onClick={hasNfts ? onExpand : undefined}
      disabled={!hasNfts}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        width: '100%',
        padding: '16px',
        borderRadius: '16px',
        background: config.gradient,
        border: `1px solid ${config.borderColor}`,
        cursor: hasNfts ? 'pointer' : 'default',
        opacity: hasNfts ? 1 : 0.5,
        textAlign: 'left',
      }}
      whileHover={
        hasNfts && !prefersReducedMotion
          ? {
              scale: 1.02,
              boxShadow: `0 8px 32px ${config.glowColor}`,
            }
          : undefined
      }
      whileTap={hasNfts && !prefersReducedMotion ? { scale: 0.98 } : undefined}
    >
      {/* Icon */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: `${config.gradient}`,
          border: `1px solid ${config.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={24} style={{ color: config.borderColor.replace('0.4', '1').replace('0.3', '1') }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: '2px',
          }}
        >
          {config.title}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: 'var(--color-text-muted)',
          }}
        >
          {config.description}
        </div>
      </div>

      {/* Count badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div
          style={{
            padding: '6px 12px',
            borderRadius: '20px',
            background: hasNfts ? config.borderColor : 'rgba(255,255,255,0.1)',
            fontSize: '14px',
            fontWeight: 700,
            color: hasNfts ? 'white' : 'var(--color-text-muted)',
          }}
        >
          {count}
        </div>
        {hasNfts && (
          <ChevronRight size={20} style={{ color: 'var(--color-text-muted)' }} />
        )}
      </div>
    </motion.button>
  );
}

// NFT detail modal
function NFTListModal({
  config,
  nfts,
  onClose,
}: {
  config: InsightConfig;
  nfts: HeatMapCell['nfts'];
  onClose: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={prefersReducedMotion ? {} : { opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full sm:w-[90vw] sm:max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? {} : { opacity: 0, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4"
          style={{
            background: config.gradient,
            borderBottom: `1px solid ${config.borderColor}`,
          }}
        >
          <div className="flex items-center gap-3">
            <config.icon size={24} style={{ color: config.borderColor.replace('0.4', '1').replace('0.3', '1') }} />
            <div>
              <h3
                className="font-bold"
                style={{ color: 'var(--color-text)', fontSize: '16px' }}
              >
                {config.title}
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
                {nfts.length} NFT{nfts.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          <button
            className="p-2 rounded-lg transition-colors"
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'var(--color-text-secondary)',
            }}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* NFT Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {nfts.length === 0 ? (
            <p
              className="text-center py-8"
              style={{ color: 'var(--color-text-muted)' }}
            >
              No NFTs in this category
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {nfts.map((nft) => (
                <motion.div
                  key={nft.id}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <img
                    src={nft.thumbnailUrl}
                    alt={nft.name}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  <div className="p-3">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {nft.name}
                    </p>
                    {nft.priceXch !== undefined && (
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span
                          className="text-sm font-bold"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {nft.priceXch.toFixed(2)} XCH
                        </span>
                        {nft.priceUsd !== undefined && (
                          <span
                            className="text-xs"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            ${nft.priceUsd.toFixed(0)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function MarketInsightCards({ data, onViewModeChange }: MarketInsightCardsProps) {
  const [expandedInsight, setExpandedInsight] = useState<InsightConfig | null>(null);
  const [expandedNfts, setExpandedNfts] = useState<HeatMapCell['nfts']>([]);

  // Calculate counts for each insight
  const insightData = useMemo(() => {
    return INSIGHT_CONFIGS.map((config) => {
      const { count, nfts } = calculateInsightCounts(data, config.id);
      return { config, count, nfts };
    });
  }, [data]);

  // Total listed
  const totalListed = useMemo(() => {
    return data.reduce((sum, row) => 
      row.reduce((rowSum, cell) => rowSum + cell.count, sum), 0
    );
  }, [data]);

  const handleExpand = (config: InsightConfig, nfts: HeatMapCell['nfts']) => {
    setExpandedInsight(config);
    setExpandedNfts(nfts);
    onViewModeChange?.(config.id);
  };

  const handleClose = () => {
    setExpandedInsight(null);
    setExpandedNfts([]);
    onViewModeChange?.('all');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text)',
            }}
          >
            Market Opportunities
          </span>
        </div>
        <span
          style={{
            fontSize: '13px',
            color: 'var(--color-text-muted)',
          }}
        >
          {totalListed} listed
        </span>
      </div>

      {/* Insight Cards */}
      <div className="space-y-3">
        {insightData.map(({ config, count, nfts }) => (
          <InsightCard
            key={config.id}
            config={config}
            count={count}
            nfts={nfts}
            onExpand={() => handleExpand(config, nfts)}
          />
        ))}
      </div>

      {/* Expanded Modal */}
      <AnimatePresence>
        {expandedInsight && (
          <NFTListModal
            config={expandedInsight}
            nfts={expandedNfts}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default MarketInsightCards;
