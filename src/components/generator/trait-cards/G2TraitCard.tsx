/**
 * G2TraitCard — trait card for G2 (generation 2) traits with preview composite.
 */

import { memo } from 'react';
import { TraitCardShell } from '../TraitCardShell';
import { G2TraitCardPreview } from '../G2TraitCardPreview';
import type { UnifiedTrait } from '@/services/generatorService';

export interface G2TraitCardProps {
  trait: UnifiedTrait;
  isSelected: boolean;
  isDisabled?: boolean;
  disabledReason?: string | null;
  onClick: () => void;
  /** When true, render blue Tee between Base and Mouth (Head, Mask, Eyes) */
  needsClothesUnderlay?: boolean;
  /** When true, show badge that this is the under layer for Beer Hat */
  isBeerHatUnderlayer?: boolean;
  /** When set, show this image as the card preview (e.g. live preview so grid matches big preview) */
  livePreviewUrl?: string | null;
  /** When true, hide the checkmark badge (border selection is sufficient) */
  hideCheckBadge?: boolean;
}

/** Cyan glow for G2 trait cards when selected */
export const G2_SELECTED_BOX_SHADOW = '0 0 20px rgba(0, 212, 255, 0.4), 0 4px 12px var(--color-black-30)';

export const G2TraitCard = memo(function G2TraitCard({ trait, isSelected, isDisabled, disabledReason, onClick, needsClothesUnderlay, isBeerHatUnderlayer, livePreviewUrl, hideCheckBadge }: G2TraitCardProps) {
  return (
    <TraitCardShell
      isSelected={isSelected}
      isDisabled={!!isDisabled}
      disabledReason={disabledReason}
      onClick={onClick}
      title={isDisabled && disabledReason ? disabledReason : undefined}
      className="trait-card-hover"
      selectedBoxShadow={G2_SELECTED_BOX_SHADOW}
      hideCheckBadge={hideCheckBadge}
    >
      <div className="relative w-full h-full overflow-hidden trait-card-image-bg">
        <G2TraitCardPreview trait={trait} needsClothesUnderlay={needsClothesUnderlay} livePreviewUrl={livePreviewUrl} />
        <div className="trait-label-overlay">
          <span className="trait-label-text">{trait.name}</span>
        </div>
      </div>
      {/* Beer Hat under layer badge */}
      {isBeerHatUnderlayer && (
        <span
          className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{ background: 'var(--color-cyan)', color: 'var(--color-bg)' }}
        >
          Under
        </span>
      )}
    </TraitCardShell>
  );
});
