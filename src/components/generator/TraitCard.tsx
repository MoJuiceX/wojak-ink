/**
 * Trait Card Component
 *
 * Individual selectable trait card with thumbnail.
 */

import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import type { Trait } from '@/types/generator';
import { traitCardVariants } from '@/config/generatorAnimations';
import { useHaptic } from '@/hooks/useHaptic';

interface TraitCardProps {
  trait: Trait;
  isSelected: boolean;
  isBlocked: boolean;
  onClick: () => void;
}

export const TraitCard = memo(function TraitCard({
  trait,
  isSelected,
  isBlocked,
  onClick,
}: TraitCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const haptic = useHaptic();

  const handleClick = () => {
    if (!isBlocked) {
      haptic.selection();
      onClick();
    }
  };

  return (
    <motion.button
      className="relative aspect-square rounded-xl overflow-hidden transition-colors"
      style={{
        background: 'var(--color-surface)',
        border: isSelected
          ? '2px solid var(--color-primary)'
          : '1px solid var(--color-border)',
        opacity: isBlocked ? 0.4 : 1,
        filter: isBlocked ? 'grayscale(1)' : 'none',
      }}
      variants={prefersReducedMotion ? undefined : traitCardVariants}
      initial="initial"
      animate="animate"
      whileHover={isBlocked ? undefined : 'hover'}
      whileTap={isBlocked ? undefined : 'tap'}
      onClick={handleClick}
      disabled={isBlocked}
      aria-pressed={isSelected}
      aria-disabled={isBlocked}
      title={isBlocked ? `${trait.name} is blocked` : trait.name}
    >
      {/* Thumbnail image */}
      <img
        src={trait.thumbnailPath}
        alt={trait.name}
        className="absolute inset-0 w-full h-full object-contain p-1"
        loading="lazy"
        onError={(e) => {
          // Fallback to placeholder on error
          (e.target as HTMLImageElement).src = '/assets/placeholder.png';
        }}
      />

      {/* Name label */}
      <div
        className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs font-medium truncate"
        style={{
          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          color: 'white',
        }}
      >
        {trait.name}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div
          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-primary)' }}
        >
          <Check size={12} color="white" strokeWidth={3} />
        </div>
      )}

      {/* Blocked indicator */}
      {isBlocked && (
        <div
          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-bg-secondary)' }}
        >
          <Lock size={12} style={{ color: 'var(--color-text-muted)' }} />
        </div>
      )}

      {/* Rarity indicator (optional) */}
      {trait.rarity && trait.rarity <= 0.1 && (
        <div
          className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
          style={{
            background:
              trait.rarity <= 0.05
                ? 'var(--color-legendary)'
                : 'var(--color-epic)',
            color: 'white',
          }}
        >
          {trait.rarity <= 0.05 ? 'RARE' : 'EPIC'}
        </div>
      )}
    </motion.button>
  );
});

export default TraitCard;
