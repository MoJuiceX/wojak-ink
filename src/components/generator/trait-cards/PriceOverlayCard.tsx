/**
 * PriceOverlayCard — trait card for Price up/down overlays on solid color backgrounds.
 */

import { memo } from 'react';
import { TraitCardShell } from '../TraitCardShell';
import { handleTraitImgError } from '@/utils/traitImgError';
import { LAYER_BASE } from '@/config/layerAssetBase';

export interface PriceOverlayCardProps {
  overlayType: 'up' | 'down';
  bgColor: string;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

/** Card for Price up/down overlays that work on top of solid color backgrounds */
export const PriceOverlayCard = memo(function PriceOverlayCard({ overlayType, bgColor, isSelected, isDisabled, disabledReason, onClick }: PriceOverlayCardProps) {
  const overlayPath = `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Price-${overlayType}.png`;
  const label = overlayType === 'up' ? 'Price up' : 'Price down';

  return (
    <TraitCardShell
      isSelected={isSelected}
      isDisabled={isDisabled}
      disabledReason={disabledReason}
      onClick={onClick}
      title={isDisabled && disabledReason ? disabledReason : label}
    >
      <div
        className="relative w-full h-full rounded-lg overflow-hidden"
        style={{ backgroundColor: bgColor }}
      >
        <img
          src={overlayPath}
          alt={label}
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs font-medium truncate"
        style={{
          background: 'linear-gradient(transparent, var(--color-black-70))',
          color: overlayType === 'up' ? 'var(--color-success)' : 'var(--color-error)',
        }}
      >
        {label}
      </div>
    </TraitCardShell>
  );
});
