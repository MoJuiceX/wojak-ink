/**
 * TraitCardShell — shared wrapper for all trait card variants.
 *
 * Encapsulates the motion.button shell, border/shadow/disabled logic,
 * selection checkmark animation, and disabled-info badge that are
 * identical across ImageCard, BaseImageCard, ClothesImageCard,
 * SolidColorBackgroundCard, PriceOverlayCard, LayerWithBaseMouthCard,
 * and G2TraitCard.
 */

import { memo, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface TraitCardShellProps {
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
  title?: string;
  children: ReactNode;
  /** Extra classes appended to the motion.button (e.g. "trait-card-hover") */
  className?: string;
  /** Override the selected-state boxShadow (G2TraitCard uses a cyan glow) */
  selectedBoxShadow?: string;
  /** When true, hide the checkmark badge on selected cards (border is sufficient) */
  hideCheckBadge?: boolean;
}

const DEFAULT_SELECTED_BOX_SHADOW =
  '0 0 20px var(--generator-selected-glow, var(--color-primary-50)), 0 4px 12px var(--color-black-30)';

export const TraitCardShell = memo(function TraitCardShell({
  isSelected,
  isDisabled,
  disabledReason,
  onClick,
  title,
  children,
  className,
  selectedBoxShadow = DEFAULT_SELECTED_BOX_SHADOW,
  hideCheckBadge = false,
}: TraitCardShellProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      className={`generator-trait-card w-full aspect-square relative rounded-xl overflow-hidden${isSelected ? ' generator-trait-card--selected' : ''}${isDisabled ? ' generator-trait-card--disabled' : ''}${className ? ` ${className}` : ''}`}
      style={isSelected ? { boxShadow: selectedBoxShadow } : undefined}
      whileHover={prefersReducedMotion || isDisabled ? undefined : { scale: 1.03 }}
      whileTap={prefersReducedMotion || isDisabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      disabled={isDisabled}
      title={title}
    >
      {children}
      {/* Disabled info badge */}
      {isDisabled && disabledReason && (
        <div
          className="generator-trait-card__disabled-badge absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
          title={disabledReason}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-text-secondary)">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        </div>
      )}
      {/* Check mark with pop animation */}
      {isSelected && !isDisabled && !hideCheckBadge && (
        <motion.div
          className="generator-trait-card__check-badge absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
});
