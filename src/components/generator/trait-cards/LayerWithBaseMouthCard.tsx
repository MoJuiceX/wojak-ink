/**
 * LayerWithBaseMouthCard — trait card for Head, Mask, Eyes, Background layers.
 * Shows base + clothes + mouth rendered under the trait.
 */

import { memo } from 'react';
import { TraitCardShell } from '../TraitCardShell';
import { handleTraitImgError } from '@/utils/traitImgError';
import { DEFAULT_BASE_PATH, DEFAULT_MOUTHBASE_PATH } from '@/lib/layerRegistry';
import { DEFAULT_CLOTHES_PATH } from '@/config/layers';
import type { LayerImage } from '@/services/generatorService';

// Default layer paths for preview composites
const DEFAULT_MOUTH_PATH = DEFAULT_MOUTHBASE_PATH;

export interface LayerWithBaseMouthCardProps {
  image: LayerImage;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
  /** When true, render the trait image behind the base (e.g. wings) */
  renderBehindBase?: boolean;
}

/** Card for Head, Mask, Eyes, Background: base + mouth rendered under the trait. */
export const LayerWithBaseMouthCard = memo(function LayerWithBaseMouthCard({ image, isSelected, isDisabled, disabledReason, onClick, renderBehindBase }: LayerWithBaseMouthCardProps) {
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
        {/* Trait rendered behind base (e.g. wings) */}
        {renderBehindBase && (
          <img
            src={image.path}
            alt={image.displayName}
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
            loading="lazy"
            onError={handleTraitImgError}
          />
        )}
        {/* Base layer */}
        <img
          src={DEFAULT_BASE_PATH}
          alt="Base layer preview"
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
        {/* Clothes layer (blue Tee) — same as Base preview */}
        <img
          src={DEFAULT_CLOTHES_PATH}
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
        {/* Trait layer (Head, Mask, Eyes, Background) on top */}
        {!renderBehindBase && (
          <img
            src={image.path}
            alt={image.displayName}
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
            loading="lazy"
            onError={handleTraitImgError}
          />
        )}
        <div className="trait-label-overlay">
          <span className="trait-label-text">{image.displayName}</span>
        </div>
      </div>
    </TraitCardShell>
  );
});
