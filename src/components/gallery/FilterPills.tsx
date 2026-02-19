/**
 * FilterPills Component
 *
 * Filter selection pills for All/Listed NFTs.
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { FilterMode } from '@/types/nft';
import { useHaptic } from '@/hooks/useHaptic';
import { buttonVariants } from '@/config/hoverEffects';

interface FilterPillsProps {
  activeFilter: FilterMode;
  onFilterChange: (filter: FilterMode) => void;
  listedCount?: number;
}

export function FilterPills({
  activeFilter,
  onFilterChange,
  listedCount,
}: FilterPillsProps) {
  const prefersReducedMotion = useReducedMotion();
  const haptic = useHaptic();

  const filters: { id: FilterMode; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'listed', label: listedCount !== undefined ? `Listed (${listedCount})` : 'Listed' },
  ];

  const handleFilterClick = (filterId: FilterMode) => {
    haptic.selection();
    onFilterChange(filterId);
  };

  return (
    <div className="flex gap-3">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;

        return (
          <motion.button
            key={filter.id}
            className="h-9 px-5 rounded-full text-sm font-medium transition-colors"
            style={{
              background: isActive
                ? 'var(--color-primary)'
                : 'var(--color-surface)',
              border: `1px solid ${
                isActive ? 'var(--color-primary)' : 'var(--color-border)'
              }`,
              color: isActive ? 'white' : 'var(--color-text-secondary)',
              boxShadow: isActive ? 'var(--glow-subtle)' : 'none',
            }}
            onClick={() => handleFilterClick(filter.id)}
            variants={prefersReducedMotion ? undefined : buttonVariants}
            whileHover={prefersReducedMotion ? undefined : 'hover'}
            whileTap={prefersReducedMotion ? undefined : 'tap'}
          >
            {filter.label}
          </motion.button>
        );
      })}
    </div>
  );
}

export default FilterPills;
