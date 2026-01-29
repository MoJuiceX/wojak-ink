/**
 * HeatMap Component
 *
 * Accessible heat map visualization for market analysis.
 * Includes cache staleness indicator for transparency.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, RefreshCw, Clock, Check, ChevronDown, Award, Info } from 'lucide-react';
import type { HeatMapCell, HeatMapViewMode } from '@/types/bigpulp';
import {
  getColorForIntensity,
  getHighDensityPattern,
  getNextCellPosition,
  VIEW_MODES,
} from '@/config/heatMapConfig';
import type { CacheMetadata } from '@/services/heatmapCache';
import { formatCacheAge } from '@/services/heatmapCache';

// Badge info for dropdown
export interface BadgeOption {
  name: string;
  count: number;
  listedCount?: number; // How many NFTs with this badge are currently listed
}

// Special value for "All Badges" filter (show NFTs with any badge)
export const ALL_BADGES_FILTER = '__ALL_BADGES__';

interface HeatMapProps {
  data: HeatMapCell[][];
  viewMode: HeatMapViewMode;
  onViewModeChange: (mode: HeatMapViewMode) => void;
  onCellClick: (cell: HeatMapCell) => void;
  cacheMetadata?: CacheMetadata | null;
  isRefetching?: boolean;
  onRefresh?: () => void;
  // Badge filtering
  badges?: BadgeOption[];
  selectedBadge?: string | null;
  onBadgeChange?: (badge: string | null) => void;
}

// Cooldown period in seconds to prevent API spam
const REFRESH_COOLDOWN_SECONDS = 30;

// Cooldown tooltip message
const COOLDOWN_MESSAGE = "Chill brother, you are already up to date. Give the APIs a break. We don't want to hit rate limits.";

// Compact refresh button with time indicator
function CompactRefreshButton({
  metadata,
  onRefresh,
}: {
  metadata?: CacheMetadata | null;
  onRefresh: () => void;
}) {
  const [refreshState, setRefreshState] = useState<'idle' | 'spinning' | 'success'>('idle');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const isOnCooldown = cooldownSeconds > 0;
  const ageText = metadata ? formatCacheAge(metadata.ageMinutes) : '';

  const handleRefresh = () => {
    if (refreshState !== 'idle' || isOnCooldown) return;
    onRefresh();
    setCooldownSeconds(30);
    setRefreshState('spinning');
    setTimeout(() => {
      setRefreshState('success');
      setTimeout(() => setRefreshState('idle'), 1200);
    }, 600);
  };

  return (
    <motion.button
      type="button"
      onClick={handleRefresh}
      disabled={isOnCooldown}
      className={`bigpulp-btn flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${refreshState === 'success' ? 'bigpulp-btn-active' : ''}`}
      style={{
        border: refreshState === 'success'
          ? '1px solid rgba(34,197,94,0.5)'
          : '1px solid var(--color-border)',
        color: refreshState === 'success'
          ? 'rgb(34,197,94)'
          : 'var(--color-text-muted)',
        boxShadow: refreshState === 'success' ? '0 0 8px rgba(34,197,94,0.2)' : 'none',
        cursor: isOnCooldown ? 'not-allowed' : 'pointer',
        opacity: isOnCooldown ? 0.5 : 1,
      }}
      whileHover={isOnCooldown ? {} : {
        scale: 1.05,
        borderColor: 'rgba(255,255,255,0.2)',
      }}
      whileTap={isOnCooldown ? {} : { scale: 0.95 }}
    >
      {refreshState === 'spinning' ? (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <RefreshCw size={12} />
        </motion.div>
      ) : refreshState === 'success' ? (
        <Check size={12} />
      ) : (
        <RefreshCw size={12} />
      )}
      <span>
        {refreshState === 'spinning' ? 'Updating' : refreshState === 'success' ? 'Done' : isOnCooldown ? `${cooldownSeconds}s` : ageText || 'Refresh'}
      </span>
    </motion.button>
  );
}

export function LegacyCacheStatusIndicator({
  metadata,
  onRefresh,
}: {
  metadata?: CacheMetadata | null;
  isRefetching?: boolean; // Not used - we use optimistic timing instead
  onRefresh?: () => void;
}) {
  // Track refresh states for visual feedback (optimistic UI)
  const [refreshState, setRefreshState] = useState<'idle' | 'spinning' | 'success'>('idle');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const isOnCooldown = cooldownSeconds > 0;

  // Always show if we have a refresh function (allows manual refresh anytime)
  const showIndicator = metadata || onRefresh;
  if (!showIndicator) return null;

  const isStale = metadata?.isStale ?? false;
  const ageText = metadata ? formatCacheAge(metadata.ageMinutes) : '';

  const handleRefresh = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (refreshState !== 'idle' || isOnCooldown) return;

    // Start the actual refresh in background
    onRefresh?.();

    // Start cooldown
    setCooldownSeconds(REFRESH_COOLDOWN_SECONDS);

    // Optimistic UI: Show spinning briefly, then success
    setRefreshState('spinning');

    // After short spin (600ms), show success regardless of actual fetch state
    setTimeout(() => {
      setRefreshState('success');
      // Return to idle after success animation
      setTimeout(() => setRefreshState('idle'), 1200);
    }, 600);
  };

  return (
    <motion.div
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs"
      style={{
        background: refreshState === 'success'
          ? 'rgba(34, 197, 94, 0.15)'
          : 'var(--color-glass-bg)',
        border: `1px solid ${refreshState === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'var(--color-border)'}`,
        minWidth: '140px',
        height: '28px',
      }}
      animate={{
        scale: refreshState === 'success' ? [1, 1.02, 1] : 1,
      }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        {refreshState === 'spinning' ? (
          <motion.div
            key="spinning"
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw size={12} style={{ color: 'var(--color-brand-primary)' }} />
            </motion.div>
            <span style={{ color: 'var(--color-brand-primary)' }}>Updating...</span>
          </motion.div>
        ) : refreshState === 'success' ? (
          <motion.div
            key="success"
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.3 }}
            >
              <Check size={12} style={{ color: 'rgb(34, 197, 94)' }} strokeWidth={3} />
            </motion.div>
            <span style={{ color: 'rgb(34, 197, 94)' }}>Updated!</span>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {metadata && (
              <>
                <Clock size={12} style={{ color: isStale ? 'var(--color-warning)' : 'var(--color-text-muted)' }} />
                <span style={{ color: isStale ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
                  {ageText}
                </span>
              </>
            )}
            {onRefresh && (
              <motion.button
                type="button"
                onClick={handleRefresh}
                disabled={isOnCooldown}
                className="flex items-center justify-center rounded transition-colors relative group"
                style={{
                  marginLeft: metadata ? '4px' : '0',
                  background: isOnCooldown ? 'transparent' : 'var(--color-glass-bg)',
                  opacity: isOnCooldown ? 0.5 : 1,
                  cursor: isOnCooldown ? 'not-allowed' : 'pointer',
                  padding: isOnCooldown ? '0 6px' : '0',
                  width: isOnCooldown ? 'auto' : '24px',
                  height: '24px',
                }}
                title={isOnCooldown ? undefined : 'Refresh data'}
                aria-label={isOnCooldown ? `Cooldown: ${cooldownSeconds}s remaining` : 'Refresh heatmap data'}
                whileHover={isOnCooldown ? {} : { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={isOnCooldown ? {} : { scale: 0.95 }}
              >
                {isOnCooldown ? (
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>
                    {cooldownSeconds}s
                  </span>
                ) : (
                  <RefreshCw size={14} style={{ color: 'var(--color-text-secondary)' }} />
                )}
                {/* Custom tooltip on hover when on cooldown */}
                {isOnCooldown && (
                  <div
                    className="absolute bottom-full right-0 mb-2 px-3 py-2 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                    style={{
                      background: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      width: '220px',
                      lineHeight: '1.4',
                    }}
                  >
                    {COOLDOWN_MESSAGE}
                  </div>
                )}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Compact filter chip with icon
interface FilterChipConfig {
  id: HeatMapViewMode;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
}

const FILTER_CHIPS: FilterChipConfig[] = [
  { id: 'all', label: 'All', shortLabel: 'All', color: 'rgba(255,255,255,0.9)', bgColor: 'rgba(255,255,255,0.1)' },
  { id: 'sleepy-deals', label: 'Sleepy Deals', shortLabel: 'Sleepy', color: 'rgb(34,197,94)', bgColor: 'rgba(34,197,94,0.15)' },
  { id: 'floor-snipes', label: 'Floor', shortLabel: 'Floor', color: 'rgb(59,130,246)', bgColor: 'rgba(59,130,246,0.15)' },
  { id: 'whale-territory', label: 'Premium', shortLabel: 'Moon', color: 'rgb(251,191,36)', bgColor: 'rgba(251,191,36,0.15)' },
  { id: 'delusion-zones', label: 'DYOR', shortLabel: 'DYOR', color: 'rgb(239,68,68)', bgColor: 'rgba(239,68,68,0.15)' },
];

function ViewModeButtons({
  viewMode,
  onViewModeChange,
  onHover,
  onHoverEnd,
}: {
  viewMode: HeatMapViewMode;
  onViewModeChange: (mode: HeatMapViewMode) => void;
  onHover: (mode: HeatMapViewMode) => void;
  onHoverEnd: () => void;
}) {
  const handleClick = (modeId: HeatMapViewMode) => {
    // Toggle: if clicking the same mode (and not "all"), go back to "all"
    if (viewMode === modeId && modeId !== 'all') {
      onViewModeChange('all');
    } else {
      onViewModeChange(modeId);
    }
  };

  return (
    <div className="flex gap-1.5 flex-wrap">
      {FILTER_CHIPS.map((chip) => {
        const isActive = viewMode === chip.id;
        return (
          <motion.button
            key={chip.id}
            className={`bigpulp-btn px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${isActive ? 'bigpulp-btn-active' : ''}`}
            style={{
              color: isActive ? chip.color : 'var(--color-text-muted)',
              border: isActive ? `1px solid ${chip.color}` : '1px solid var(--color-border)',
              boxShadow: isActive ? `0 0 8px ${chip.color}40` : 'none',
            }}
            onClick={() => handleClick(chip.id)}
            onMouseEnter={() => onHover(chip.id)}
            onMouseLeave={onHoverEnd}
            whileHover={{
              scale: 1.05,
              borderColor: 'rgba(255,255,255,0.2)',
            }}
            whileTap={{ scale: 0.95 }}
          >
            {chip.shortLabel}
          </motion.button>
        );
      })}
    </div>
  );
}

// Badge system explanation text
const BADGE_SYSTEM_INFO = `Badges = tribes. If your Wojak has the right trait combo, it belongs to one of 15 crews — Ronin, Neckbeard, Royal Club, you name it.

Only 34% of Wojaks earned a badge. The rest? Just regular farmers.

Check the "Ask Big Pulp" tab for the full Badge Gallery.`;

// Badge Filter Dropdown
function BadgeDropdown({
  badges,
  selectedBadge,
  onBadgeChange,
}: {
  badges: BadgeOption[];
  selectedBadge: string | null;
  onBadgeChange: (badge: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowInfo(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (badge: string | null) => {
    onBadgeChange(badge);
    setIsOpen(false);
  };

  // Calculate totals
  const totalCount = badges.reduce((sum, b) => sum + b.count, 0);
  const totalListed = badges.reduce((sum, b) => sum + (b.listedCount || 0), 0);

  // Check if badge filter is active
  const isFilterActive = selectedBadge !== null;
  const displayName = selectedBadge === ALL_BADGES_FILTER ? 'All Badges' : selectedBadge;

  return (
    <div ref={dropdownRef} className="relative flex items-center gap-1">
      {/* Info button */}
      <motion.button
        className={`bigpulp-btn p-1.5 rounded-lg transition-colors ${showInfo ? 'bigpulp-btn-active' : ''}`}
        style={{
          color: showInfo ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
          border: `1px solid ${showInfo ? 'rgba(255,149,0,0.5)' : 'var(--color-border)'}`,
          boxShadow: showInfo ? '0 0 8px rgba(255,149,0,0.2)' : 'none',
        }}
        onClick={() => setShowInfo(!showInfo)}
        title="What are badges?"
        whileHover={{
          borderColor: 'rgba(255,255,255,0.2)',
        }}
        whileTap={{ scale: 0.95 }}
      >
        <Info size={14} />
      </motion.button>

      {/* Main dropdown button */}
      <motion.button
        className={`bigpulp-btn flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isFilterActive ? 'bigpulp-btn-active' : ''}`}
        style={{
          color: isFilterActive ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
          border: `1px solid ${isFilterActive ? 'rgba(255,149,0,0.5)' : 'var(--color-border)'}`,
          boxShadow: isFilterActive ? '0 0 8px rgba(255,149,0,0.2)' : 'none',
        }}
        onClick={() => { setIsOpen(!isOpen); setShowInfo(false); }}
        whileHover={{
          borderColor: 'rgba(255,255,255,0.2)',
        }}
        whileTap={{ scale: 0.95 }}
      >
        <Award size={14} />
        <span>{displayName || 'Badges'}</span>
        <ChevronDown
          size={14}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </motion.button>

      {/* Info tooltip */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            className="absolute top-full left-0 mt-1 z-50 p-3 rounded-lg text-xs"
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              width: '280px',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5',
              whiteSpace: 'pre-line',
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Award size={16} style={{ color: 'var(--color-brand-primary)' }} />
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                What's a Badge?
              </span>
            </div>
            {BADGE_SYSTEM_INFO}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 mt-1 z-50 min-w-[280px] max-h-[350px] overflow-y-auto rounded-lg"
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header row */}
            <div
              className="px-3 py-1.5 text-xs flex items-center justify-between"
              style={{
                background: 'var(--color-glass-bg)',
                borderBottom: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            >
              <span>Badge</span>
              <div className="flex gap-4">
                <span className="w-12 text-right">Total</span>
                <span className="w-12 text-right">Listed</span>
              </div>
            </div>

            {/* No Filter option - clear badge filter */}
            <button
              className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between hover:bg-white/5"
              style={{
                background: selectedBadge === null ? 'var(--color-glass-bg)' : 'transparent',
                color: 'var(--color-text-muted)',
                borderBottom: '1px solid var(--color-border)',
              }}
              onClick={() => handleSelect(null)}
            >
              <span className="italic">No Filter</span>
              <span className="text-xs">Show all NFTs</span>
            </button>

            {/* All Badges option - show only NFTs with any badge */}
            <button
              className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between hover:bg-white/5"
              style={{
                background: selectedBadge === ALL_BADGES_FILTER ? 'var(--color-glass-bg)' : 'transparent',
                color: 'var(--color-text-primary)',
                borderBottom: '1px solid var(--color-border)',
              }}
              onClick={() => handleSelect(ALL_BADGES_FILTER)}
            >
              <span className="font-medium">All Badges</span>
              <div className="flex gap-4">
                <span className="w-12 text-right text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {totalCount}
                </span>
                <span
                  className="w-12 text-right text-xs font-medium"
                  style={{ color: 'var(--color-brand-primary)' }}
                >
                  {totalListed}
                </span>
              </div>
            </button>

            {/* Individual badges */}
            {badges.map((badge) => (
              <button
                key={badge.name}
                className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between hover:bg-white/5"
                style={{
                  background: selectedBadge === badge.name ? 'var(--color-glass-bg)' : 'transparent',
                  color: 'var(--color-text-primary)',
                }}
                onClick={() => handleSelect(badge.name)}
              >
                <span>{badge.name}</span>
                <div className="flex gap-4">
                  <span className="w-12 text-right text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {badge.count}
                  </span>
                  <span
                    className="w-12 text-right text-xs font-medium"
                    style={{
                      color: (badge.listedCount || 0) > 0 ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                    }}
                  >
                    {badge.listedCount || 0}
                  </span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Cell Detail Modal - shows NFTs in selected cell
function CellDetailModal({
  cell,
  onClose,
}: {
  cell: HeatMapCell;
  onClose: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={prefersReducedMotion ? {} : { opacity: 0 }}
      onClick={onClose}
    >
      {/* Modal */}
      <motion.div
        className="w-[90vw] max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
        initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h3
              className="font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {cell.rarityBin.label} • {cell.priceBin.label} XCH
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {cell.count} NFT{cell.count !== 1 ? 's' : ''} listed
            </p>
          </div>
          <button
            className="p-2 rounded-lg transition-colors"
            style={{
              background: 'var(--color-glass-bg)',
              color: 'var(--color-text-secondary)',
            }}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* NFT List */}
        <div className="flex-1 overflow-y-auto p-4">
          {cell.nfts.length === 0 ? (
            <p
              className="text-center py-8"
              style={{ color: 'var(--color-text-muted)' }}
            >
              No NFTs in this range
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {cell.nfts.map((nft) => (
                <div
                  key={nft.id}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: 'var(--color-glass-bg)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <img
                    src={nft.thumbnailUrl}
                    alt={nft.name}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  <div className="p-2">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {nft.name}
                    </p>
                    {nft.priceXch !== undefined && (
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: 'var(--color-brand-primary)' }}
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
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Compact cell for mobile - fits 10 columns without scrolling
function HeatMapCellCompact({
  cell,
  isHighlighted,
  onClick,
  themeId,
  showZoneBorder,
}: {
  cell: HeatMapCell;
  isHighlighted: boolean;
  onClick: () => void;
  themeId: string;
  showZoneBorder: boolean;
}) {
  const backgroundColor = getColorForIntensity(cell.intensity, themeId);
  const isEmpty = cell.count === 0;

  return (
    <motion.button
      type="button"
      className="flex-1 flex items-center justify-center font-bold"
      style={{
        background: isEmpty 
          ? 'rgba(255,255,255,0.02)' 
          : backgroundColor,
        borderRadius: '4px',
        height: '28px',
        minWidth: 0,
        fontSize: '10px',
        cursor: isEmpty ? 'default' : 'pointer',
        color: isEmpty 
          ? 'transparent'
          : cell.intensity > 0.3
            ? 'white'
            : 'var(--color-text-primary)',
        textShadow: cell.intensity > 0.3 ? '0 1px 1px rgba(0,0,0,0.5)' : 'none',
        border: showZoneBorder && !isEmpty
          ? '2px solid rgba(255,149,0,0.8)'
          : '1px solid rgba(255,255,255,0.03)',
        boxShadow: !isEmpty && cell.intensity > 0.3 
          ? `0 0 ${4 + cell.intensity * 8}px rgba(255,149,0,${cell.intensity * 0.3})`
          : 'none',
        opacity: isHighlighted ? 1 : 0.35,
      }}
      onClick={isEmpty ? undefined : onClick}
      whileTap={isEmpty ? undefined : { scale: 0.9 }}
    >
      {cell.count > 0 && cell.count}
    </motion.button>
  );
}

function HeatMapCell({
  cell,
  isHighlighted,
  isFocused,
  onClick,
  onFocus,
  themeId,
  showZoneBorder,
  rowIndex,
  colIndex,
}: {
  cell: HeatMapCell;
  isHighlighted: boolean;
  isFocused: boolean;
  onClick: () => void;
  onFocus: () => void;
  themeId: string;
  showZoneBorder: boolean;
  rowIndex: number;
  colIndex: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const backgroundColor = getColorForIntensity(cell.intensity, themeId);
  const pattern = getHighDensityPattern(cell.intensity);
  const isEmpty = cell.count === 0;

  // Staggered delay based on position for wave effect
  const staggerDelay = (rowIndex * 0.02) + (colIndex * 0.015);

  // Premium cell styling based on intensity
  const getCellBackground = () => {
    if (isEmpty) {
      return 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)';
    }
    // Overlay gradient on top of intensity color for premium look
    return `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.1) 100%), ${backgroundColor}`;
  };

  const getCellShadow = () => {
    if (isEmpty) return 'none';
    if (cell.intensity > 0.5) {
      return `inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3), 0 0 ${8 + cell.intensity * 12}px rgba(255,149,0,${0.1 + cell.intensity * 0.2})`;
    }
    return 'inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 2px rgba(0,0,0,0.2)';
  };

  return (
    <motion.button
      role="gridcell"
      aria-label={cell.label}
      tabIndex={isEmpty ? -1 : (isFocused ? 0 : -1)}
      className="relative flex-1 flex items-center justify-center text-xs font-bold"
      style={{
        background: getCellBackground(),
        backgroundImage: pattern,
        borderRadius: '8px',
        minWidth: '36px',
        minHeight: '36px',
        height: '36px',
        outline: 'none',
        cursor: isEmpty ? 'default' : 'pointer',
        color: isEmpty 
          ? 'var(--color-text-muted)'
          : cell.intensity > 0.4
            ? 'white'
            : 'var(--color-text-primary)',
        textShadow: cell.intensity > 0.4 ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
        boxShadow: getCellShadow(),
        // Zone border: premium glow effect
        border: showZoneBorder
          ? `2px solid ${isEmpty ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.8)'}`
          : '1px solid rgba(255,255,255,0.05)',
      }}
      initial={false}
      animate={{
        opacity: isHighlighted ? 1 : 0.3,
        filter: isHighlighted ? 'brightness(1)' : 'brightness(0.7) saturate(0.5)',
      }}
      transition={prefersReducedMotion ? { duration: 0 } : {
        duration: 0.3,
        delay: showZoneBorder ? staggerDelay : 0,
        ease: 'easeOut',
      }}
      whileHover={isEmpty ? undefined : {
        scale: 1.1,
        zIndex: 10,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(255,149,0,0.3)`,
      }}
      whileTap={isEmpty ? undefined : {
        scale: 0.95,
      }}
      onClick={isEmpty ? undefined : onClick}
      onFocus={isEmpty ? undefined : onFocus}
    >
      {/* Pulsing inner glow for zone cells with NFTs only */}
      {showZoneBorder && !isEmpty && !prefersReducedMotion && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          animate={{
            boxShadow: [
              'inset 0 0 6px rgba(255,149,0,0.3)',
              'inset 0 0 12px rgba(255,149,0,0.5)',
              'inset 0 0 6px rgba(255,149,0,0.3)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      {cell.count > 0 && <span style={{ position: 'relative', zIndex: 1 }}>{cell.count}</span>}
    </motion.button>
  );
}

export function HeatMap({
  data,
  viewMode,
  onViewModeChange,
  onCellClick,
  cacheMetadata,
  isRefetching,
  onRefresh,
  badges,
  selectedBadge,
  onBadgeChange,
}: HeatMapProps) {
  // Mark optional unused prop
  void isRefetching;
  const [focusedCell, setFocusedCell] = useState({ row: 0, col: 0 });
  const [selectedCell, setSelectedCell] = useState<HeatMapCell | null>(null);
  const [hoveredMode, setHoveredMode] = useState<HeatMapViewMode | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Theme is always dark
  const themeId = 'dark';

  // Get view mode filter - use hovered mode for preview, otherwise use selected mode
  const effectiveMode = hoveredMode || viewMode;
  const viewModeConfig = VIEW_MODES.find((m) => m.id === effectiveMode);
  const isHighlighted = useCallback(
    (rarityIndex: number, priceIndex: number) => {
      if (!viewModeConfig) return true;
      return viewModeConfig.filter(rarityIndex, priceIndex);
    },
    [viewModeConfig]
  );

  // Handle cell click - show modal
  const handleCellClick = useCallback((cell: HeatMapCell) => {
    setSelectedCell(cell);
    onCellClick(cell);
  }, [onCellClick]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const { row, col } = getNextCellPosition(
        focusedCell.row,
        focusedCell.col,
        e.key,
        e.ctrlKey
      );

      if (row !== focusedCell.row || col !== focusedCell.col) {
        e.preventDefault();
        setFocusedCell({ row, col });
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const cell = data[row]?.[col];
        if (cell) handleCellClick(cell);
      }
    },
    [focusedCell, data, handleCellClick]
  );

  // Get price bins from the data (now dynamically calculated)
  // Each row has the same price bins, so we can get them from the first row
  const dynamicPriceBins = useMemo(() => {
    if (!data || data.length === 0 || !data[0]) return [];
    return data[0].map(cell => cell.priceBin);
  }, [data]);

  // Flatten data for accessible table
  const tableData = useMemo(() => {
    return data.flatMap((row) => row);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div
        className="p-8 text-center rounded-xl"
        style={{
          background: 'var(--color-glass-bg)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p style={{ color: 'var(--color-text-muted)' }}>
          No heat map data available
        </p>
      </div>
    );
  }

  // Compact row labels for mobile
  const getRowLabel = (index: number): string => {
    const labels = ['10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%'];
    return labels[index] || '';
  };

  return (
    <div className="space-y-3">
      {/* Single row: Filters + Badge + Refresh all together */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* View mode filter chips */}
        <ViewModeButtons
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          onHover={setHoveredMode}
          onHoverEnd={() => setHoveredMode(null)}
        />

        {/* Badge filter dropdown */}
        {badges && badges.length > 0 && onBadgeChange && (
          <BadgeDropdown
            badges={badges}
            selectedBadge={selectedBadge ?? null}
            onBadgeChange={onBadgeChange}
          />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Cache refresh */}
        {onRefresh && (
          <CompactRefreshButton
            metadata={cacheMetadata}
            onRefresh={onRefresh}
          />
        )}
      </div>

      {/* Heat map grid - compact, no horizontal scroll */}
      <div
        className="p-2 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(25,25,25,0.95) 0%, rgba(15,15,15,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        {/* Column headers (price bins) - compact */}
        <div className="flex gap-0.5 mb-1 ml-7">
          {dynamicPriceBins.map((bin) => (
            <div
              key={bin.index}
              className="flex-1 text-center font-semibold"
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '8px',
              }}
            >
              {bin.label}
            </div>
          ))}
        </div>

        {/* Grid - compact cells that fit mobile */}
        <div
          ref={gridRef}
          role="grid"
          aria-label="Market heat map showing NFT distribution by rarity and price"
          className="flex flex-col gap-0.5"
          onKeyDown={handleKeyDown}
        >
          {data.map((row, rowIndex) => (
            <div key={rowIndex} role="row" className="flex gap-0.5 items-center">
              {/* Row header - compact */}
              <div
                className="w-7 text-right pr-0.5 flex-shrink-0 font-semibold"
                style={{ 
                  fontSize: '8px',
                  color: rowIndex <= 2 
                    ? 'rgba(251,191,36,0.9)' 
                    : rowIndex >= 7 
                      ? 'rgba(239,68,68,0.7)' 
                      : 'var(--color-text-muted)',
                }}
              >
                {getRowLabel(rowIndex)}
              </div>

              {/* Cells - compact sizing */}
              {row.map((cell, colIndex) => {
                const cellIsHighlighted = isHighlighted(rowIndex, colIndex);
                const showZoneBorder = cellIsHighlighted && effectiveMode !== 'all';
                return (
                  <HeatMapCellCompact
                    key={`${rowIndex}-${colIndex}`}
                    cell={cell}
                    isHighlighted={cellIsHighlighted}
                    onClick={() => handleCellClick(cell)}
                    themeId={themeId}
                    showZoneBorder={showZoneBorder}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Axis labels - positioned correctly */}
        <div className="flex justify-between mt-1.5 ml-7" style={{ fontSize: '8px' }}>
          <div className="flex flex-col leading-tight">
            <span style={{ color: 'rgba(251,191,36,0.8)' }}>Rare</span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '6px' }}>↓</span>
            <span style={{ color: 'rgba(239,68,68,0.7)' }}>Common</span>
          </div>
          <div className="flex items-center gap-0.5 mr-1" style={{ color: 'var(--color-text-muted)' }}>
            <span style={{ color: 'rgba(34,197,94,0.8)' }}>Cheap</span>
            <span style={{ fontSize: '6px' }}>→</span>
            <span style={{ color: 'rgba(251,191,36,0.8)' }}>Expensive</span>
          </div>
        </div>
      </div>


      {/* Hidden accessible data table */}
      <table className="sr-only">
        <caption>
          Heat map data: NFT distribution by rarity and price
        </caption>
        <thead>
          <tr>
            <th>Rarity</th>
            <th>Price Range</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((cell, index) => (
            <tr key={index}>
              <td>{cell.rarityBin.label}</td>
              <td>{cell.priceBin.label}</td>
              <td>{cell.count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Cell Detail Modal */}
      <AnimatePresence>
        {selectedCell && (
          <CellDetailModal
            cell={selectedCell}
            onClose={() => setSelectedCell(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default HeatMap;
