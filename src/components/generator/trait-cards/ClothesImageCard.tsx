/**
 * ClothesImageCard — trait card for Clothes layer showing base + clothes + mouth composite.
 */

import { memo } from 'react';
import { TraitCardShell } from '../TraitCardShell';
import { handleTraitImgError } from '@/utils/traitImgError';
import { DEFAULT_BASE_PATH, DEFAULT_MOUTHBASE_PATH } from '@/lib/layerRegistry';
import type { LayerImage } from '@/services/generatorService';

// Default layer paths for preview composites
const DEFAULT_MOUTH_PATH = DEFAULT_MOUTHBASE_PATH;

export interface ClothesImageCardProps {
  image: LayerImage;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

export const ClothesImageCard = memo(function ClothesImageCard({ image, isSelected, isDisabled, disabledReason, onClick }: ClothesImageCardProps) {
  return (
    <TraitCardShell
      isSelected={isSelected}
      isDisabled={isDisabled}
      disabledReason={disabledReason}
      onClick={onClick}
      title={isDisabled && disabledReason ? disabledReason : undefined}
      className="trait-card-hover"
    >
      <div
        className="relative w-full h-full overflow-hidden trait-card-image-bg"
      >
        {/* Base layer (Classic) */}
        <img
          src={DEFAULT_BASE_PATH}
          alt="Base layer preview"
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
        {/* Clothes layer (variable) */}
        <img
          src={image.path}
          alt={image.displayName}
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
        {/* Mouth layer (Numb) */}
        <img
          src={DEFAULT_MOUTH_PATH}
          alt="Mouth layer preview"
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
        <div className="trait-label-overlay">
          <span className="trait-label-text">{image.displayName}</span>
        </div>
      </div>
    </TraitCardShell>
  );
});
