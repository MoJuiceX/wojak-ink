/**
 * BaseImageCard — trait card for Base layer showing base + clothes + mouth composite.
 */

import { memo } from 'react';
import { TraitCardShell } from '../TraitCardShell';
import { handleTraitImgError } from '@/utils/traitImgError';
import { DEFAULT_MOUTHBASE_PATH } from '@/lib/layerRegistry';
import { BASE_CLOTHES_MAP, DEFAULT_CLOTHES_PATH } from '@/config/layers';
import type { LayerImage } from '@/services/generatorService';

// Default layer paths for preview composites (imported from layerRegistry)
const DEFAULT_MOUTH_PATH = DEFAULT_MOUTHBASE_PATH;

function getClothesForBase(basePath: string): string {
  const lowerPath = basePath.toLowerCase();
  for (const [key, clothesPath] of Object.entries(BASE_CLOTHES_MAP)) {
    if (lowerPath.includes(key)) {
      return clothesPath;
    }
  }
  return DEFAULT_CLOTHES_PATH;
}

export interface BaseImageCardProps {
  image: LayerImage;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

export const BaseImageCard = memo(function BaseImageCard({ image, isSelected, isDisabled, disabledReason, onClick }: BaseImageCardProps) {
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
        {/* Base layer */}
        <img
          src={image.path}
          alt={image.displayName}
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
        {/* Clothes layer (varies by base) */}
        <img
          src={getClothesForBase(image.path)}
          alt="Clothes layer preview"
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
