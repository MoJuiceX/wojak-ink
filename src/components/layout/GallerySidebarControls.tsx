/**
 * GallerySidebarControls Component
 *
 * Filter and sort controls that appear in the sidebar when viewing NFT gallery.
 * Shows All/Listed filter and ID/Rank/Price sort options.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Hash, Crown, DollarSign, Grid3X3, Tag, ChevronUp, ChevronDown } from 'lucide-react';
import { useGalleryOptional } from '@/hooks/useGallery';
import type { SortMode, FilterMode } from '@/types/nft';

// Sort option base types (without direction)
type SortBase = 'id' | 'rarity' | 'price';

interface GallerySidebarControlsProps {
  showLabels: boolean;
}

const filterOptions: { id: FilterMode; icon: typeof Grid3X3; label: string }[] = [
  { id: 'all', icon: Grid3X3, label: 'All' },
  { id: 'listed', icon: Tag, label: 'Listed' },
];

const sortOptions: { base: SortBase; icon: typeof Hash; label: string }[] = [
  { base: 'id', icon: Hash, label: 'ID' },
  { base: 'rarity', icon: Crown, label: 'Rank' },
  { base: 'price', icon: DollarSign, label: 'Price' },
];

// Helper to get sort direction from mode
function getSortDirection(mode: SortMode): 'asc' | 'desc' {
  return mode.endsWith('-desc') ? 'desc' : 'asc';
}

// Helper to get base sort type from mode
function getSortBase(mode: SortMode): SortBase {
  if (mode.startsWith('id')) return 'id';
  if (mode.startsWith('rarity')) return 'rarity';
  return 'price';
}

// Helper to toggle sort direction
function toggleSortMode(currentMode: SortMode, base: SortBase): SortMode {
  const currentBase = getSortBase(currentMode);
  const currentDir = getSortDirection(currentMode);

  if (currentBase === base) {
    // Same base - toggle direction
    return `${base}-${currentDir === 'asc' ? 'desc' : 'asc'}` as SortMode;
  }
  // Different base - start with ascending
  return `${base}-asc` as SortMode;
}

export function GallerySidebarControls({ showLabels }: GallerySidebarControlsProps) {
  const gallery = useGalleryOptional();

  // Don't render if not in gallery context or no character selected
  if (!gallery || !gallery.selectedCharacter) {
    return null;
  }

  const {
    sortMode,
    filterMode,
    setSortMode,
    setFilterMode,
    listedCount
  } = gallery;

  return (
    <div className="flex flex-col gap-2">
      {/* Filter section */}
      <div className="flex flex-col gap-1">
          {filterOptions.map((option) => {
            const Icon = option.icon;
            const isActive = filterMode === option.id;
            const count = option.id === 'listed' ? listedCount : null;

            return (
              <motion.button
                key={option.id}
                className="flex items-center rounded-lg overflow-hidden"
                style={{
                  background: 'var(--color-glass-bg)',
                  color: isActive ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                  border: isActive
                    ? '1px solid var(--color-brand-primary)'
                    : '1px solid var(--color-border)',
                  height: 48,
                  paddingLeft: 14,
                  paddingRight: 14,
                }}
                onClick={() => setFilterMode(option.id)}
                whileHover={{ background: 'var(--color-glass-hover)' }}
                whileTap={{ scale: 0.95 }}
                title={option.label}
              >
                <div className="flex-shrink-0" style={{ width: 18, height: 18 }}>
                  <Icon size={18} />
                </div>
                <AnimatePresence>
                  {showLabels && (
                    <motion.span
                      className="text-sm font-medium whitespace-nowrap ml-3"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    >
                      {option.label}
                      {count !== null && ` (${count})`}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
      </div>

      {/* Sort section */}
      <div className="flex flex-col gap-1">
          {sortOptions.map((option) => {
            const Icon = option.icon;
            const currentBase = getSortBase(sortMode);
            const isActive = currentBase === option.base;
            const direction = isActive ? getSortDirection(sortMode) : 'asc';
            const DirectionIcon = direction === 'asc' ? ChevronUp : ChevronDown;

            return (
              <motion.button
                key={option.base}
                className="flex items-center rounded-lg overflow-hidden"
                style={{
                  background: 'var(--color-glass-bg)',
                  color: isActive ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                  border: isActive
                    ? '1px solid var(--color-brand-primary)'
                    : '1px solid var(--color-border)',
                  height: 48,
                  paddingLeft: 14,
                  paddingRight: 14,
                }}
                onClick={() => setSortMode(toggleSortMode(sortMode, option.base))}
                whileHover={{ background: 'var(--color-glass-hover)' }}
                whileTap={{ scale: 0.95 }}
                title={`${option.label} (${direction === 'asc' ? 'ascending' : 'descending'})`}
              >
                {/* Icon with direction indicator */}
                <div className="relative flex-shrink-0" style={{ width: 18, height: 18 }}>
                  <Icon size={18} />
                  {isActive && (
                    <DirectionIcon
                      size={10}
                      className="absolute -bottom-1 -right-1"
                      style={{
                        color: 'var(--color-brand-primary)',
                        strokeWidth: 3,
                      }}
                    />
                  )}
                </div>
                <AnimatePresence>
                  {showLabels && (
                    <motion.span
                      className="text-sm font-medium whitespace-nowrap ml-3"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    >
                      {option.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
      </div>
    </div>
  );
}

export default GallerySidebarControls;
