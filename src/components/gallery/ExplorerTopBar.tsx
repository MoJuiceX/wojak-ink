/**
 * ExplorerTopBar Component
 *
 * Top navigation bar in the NFT explorer modal.
 */

import { motion } from 'framer-motion';
import { X, Hash, Crown, Shuffle, Expand, DollarSign, ChevronUp, ChevronDown } from 'lucide-react';
import type { SortMode, FilterMode } from '@/types/nft';
import { Tooltip } from '@/components/ui/Tooltip';

interface ExplorerTopBarProps {
  sortMode: SortMode;
  filterMode: FilterMode;
  onSortModeChange: (mode: SortMode) => void;
  onShuffle: () => void;
  onExpand: () => void;
  onClose: () => void;
  showClose?: boolean;
}

type SortBase = 'id' | 'rarity' | 'price';

const sortModes: { base: SortBase; icon: typeof Hash; label: string; tooltip: string }[] = [
  { base: 'id', icon: Hash, label: 'Sort by ID', tooltip: 'Sort by ID' },
  { base: 'rarity', icon: Crown, label: 'Sort by rarity', tooltip: 'Sort by rank' },
];

// Helper to get base sort type from mode
function getSortBase(mode: SortMode): SortBase {
  if (mode.startsWith('id')) return 'id';
  if (mode.startsWith('rarity')) return 'rarity';
  return 'price';
}

// Helper to get sort direction from mode
function getSortDirection(mode: SortMode): 'asc' | 'desc' {
  return mode.endsWith('-desc') ? 'desc' : 'asc';
}

// Helper to toggle sort mode
function toggleSortMode(currentMode: SortMode, base: SortBase): SortMode {
  const currentBase = getSortBase(currentMode);
  const isDesc = currentMode.endsWith('-desc');

  if (currentBase === base) {
    // Same base - toggle direction
    return `${base}-${isDesc ? 'asc' : 'desc'}` as SortMode;
  }
  // Different base - start with ascending
  return `${base}-asc` as SortMode;
}

export function ExplorerTopBar({
  sortMode,
  filterMode: _filterMode,
  onSortModeChange,
  onShuffle,
  onExpand,
  onClose,
  showClose = true,
}: ExplorerTopBarProps) {
  // filterMode is passed for potential future use but currently unused
  void _filterMode;
  // Check if price sort is active
  const isPriceSortActive = sortMode === 'price-asc' || sortMode === 'price-desc';

  // Toggle price sort between ascending and descending
  const handlePriceSort = () => {
    if (sortMode === 'price-asc') {
      onSortModeChange('price-desc');
    } else {
      onSortModeChange('price-asc');
    }
  };
  return (
    <div
      className="flex items-center justify-between h-14 px-4"
      style={{
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Close button (optional for desktop panel which has its own) */}
      {showClose ? (
        <motion.button
          type="button"
          className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors text-secondary"
          onClick={onClose}
          whileHover={{ background: 'var(--color-surface-hover)' }}
          whileTap={{ scale: 0.95 }}
          aria-label="Close explorer"
        >
          <X size={24} />
        </motion.button>
      ) : (
        <div className="w-10" />
      )}


      {/* Action buttons: Expand + Shuffle + Sort modes */}
      <div className="flex gap-1">
        {/* Expand button */}
        <Tooltip text="Expand">
          <motion.button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors text-muted"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            onClick={onExpand}
            whileHover={{ background: 'var(--color-surface-hover)' }}
            whileTap={{ scale: 0.9 }}
            aria-label="Expand image"
          >
            <Expand size={18} />
          </motion.button>
        </Tooltip>

        {/* Shuffle button */}
        <Tooltip text="Shuffle">
          <motion.button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors text-muted"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            onClick={onShuffle}
            whileHover={{ background: 'var(--color-surface-hover)' }}
            whileTap={{ scale: 0.9 }}
            aria-label="Shuffle to random NFT"
          >
            <Shuffle size={18} />
          </motion.button>
        </Tooltip>

        {/* Sort mode buttons */}
        {sortModes.map((mode) => {
          const Icon = mode.icon;
          const currentBase = getSortBase(sortMode);
          const isActive = currentBase === mode.base;
          const direction = isActive ? getSortDirection(sortMode) : 'asc';
          const DirectionIcon = direction === 'asc' ? ChevronUp : ChevronDown;

          return (
            <Tooltip key={mode.base} text={mode.tooltip}>
              <motion.button
                type="button"
                className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                style={{
                  color: isActive
                    ? 'var(--color-primary)'
                    : 'var(--color-text-muted)',
                  background: 'var(--color-surface)',
                  border: isActive
                    ? '1px solid var(--color-primary)'
                    : '1px solid var(--color-border)',
                }}
                onClick={() => onSortModeChange(toggleSortMode(sortMode, mode.base))}
                whileHover={{ background: 'var(--color-surface-hover)' }}
                whileTap={{ scale: 0.9 }}
                aria-label={mode.label}
                aria-pressed={isActive}
              >
                <div className="relative">
                  <Icon size={18} />
                  {isActive && (
                    <DirectionIcon
                      size={10}
                      className="absolute -bottom-1 -right-1 text-accent"
                      style={{
                        strokeWidth: 3,
                      }}
                    />
                  )}
                </div>
              </motion.button>
            </Tooltip>
          );
        })}

        {/* Price sort button */}
        <Tooltip text="Sort by value">
          <motion.button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            style={{
              color: isPriceSortActive
                ? 'var(--color-primary)'
                : 'var(--color-text-muted)',
              background: 'var(--color-surface)',
              border: isPriceSortActive
                ? '1px solid var(--color-primary)'
                : '1px solid var(--color-border)',
            }}
            onClick={handlePriceSort}
            whileHover={{ background: 'var(--color-surface-hover)' }}
            whileTap={{ scale: 0.9 }}
            aria-label={sortMode === 'price-asc' ? 'Sort by price (low to high)' : 'Sort by price (high to low)'}
            aria-pressed={isPriceSortActive}
          >
            <div className="relative">
              <DollarSign size={18} />
              {isPriceSortActive && (
                sortMode === 'price-asc' ? (
                  <ChevronUp
                    size={10}
                    className="absolute -bottom-1 -right-1 text-accent"
                    style={{
                      strokeWidth: 3,
                    }}
                  />
                ) : (
                  <ChevronDown
                    size={10}
                    className="absolute -bottom-1 -right-1 text-accent"
                    style={{
                      strokeWidth: 3,
                    }}
                  />
                )
              )}
            </div>
          </motion.button>
        </Tooltip>
      </div>
    </div>
  );
}

export default ExplorerTopBar;
