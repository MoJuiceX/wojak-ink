/**
 * Mouth Layer Selector Component
 *
 * Combined selector for MouthBase and MouthItem with multi-select support.
 * Users can select a base mouth (numb, smile, etc.) AND a mouth item (cig, joint, cohiba).
 */

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useGenerator } from '@/contexts/GeneratorContext';
import { traitGridVariants, traitCardStaggerVariants } from '@/config/generatorAnimations';
import type { LayerImage } from '@/services/generatorService';

interface MouthLayerSelectorProps {
  className?: string;
}

function TraitCardSkeleton() {
  return (
    <div
      className="aspect-square rounded-xl overflow-hidden animate-pulse"
      style={{
        background: 'var(--color-border)',
        border: '1px solid var(--color-border)',
      }}
    />
  );
}

interface ImageCardProps {
  image: LayerImage;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string;
  onClick: () => void;
  badge?: string;
}

function ImageCard({ image, isSelected, isDisabled, disabledReason, onClick, badge }: ImageCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      className="w-full aspect-square relative rounded-xl overflow-hidden p-1"
      style={{
        background: 'var(--generator-trait-card-bg)',
        border: isSelected
          ? '2px solid var(--generator-selected-color, #F97316)'
          : '1px solid var(--generator-trait-card-border)',
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        boxShadow: isSelected
          ? '0 0 20px var(--generator-selected-glow, rgba(249, 115, 22, 0.5)), 0 4px 12px rgba(0, 0, 0, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s ease',
      }}
      whileHover={prefersReducedMotion || isDisabled ? undefined : { scale: 1.03 }}
      whileTap={prefersReducedMotion || isDisabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      disabled={isDisabled}
      title={isDisabled && disabledReason ? disabledReason : image.displayName}
    >
      {badge && !isDisabled && !isSelected && (
        <div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-10 text-xs font-bold"
          style={{
            background: 'var(--generator-badge-color, #F97316)',
            color: 'white',
          }}
        >
          {badge}
        </div>
      )}
      <div
        className="relative w-full h-full rounded-lg overflow-hidden trait-card-image-bg"
      >
        <img
          src={image.path}
          alt={image.displayName}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      {/* Check mark with pop animation */}
      {isSelected && (
        <motion.div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-20"
          style={{ background: 'var(--generator-badge-color, #F97316)' }}
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
}

export function MouthLayerSelector({ className = '' }: MouthLayerSelectorProps) {
  const {
    selectedLayers,
    getLayerImages,
    selectLayer,
    clearLayer,
    isLayerDisabled,
    isOptionDisabled,
    isInitialized,
  } = useGenerator();
  const prefersReducedMotion = useReducedMotion();

  const [mouthBaseImages, setMouthBaseImages] = useState<LayerImage[]>([]);
  const [mouthItemImages, setMouthItemImages] = useState<LayerImage[]>([]);
  const [facialHairImages, setFacialHairImages] = useState<LayerImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const selectedMouthBase = selectedLayers.MouthBase;
  const selectedMouthItem = selectedLayers.MouthItem;
  const selectedFacialHair = selectedLayers.FacialHair;
  const isBlocked = isLayerDisabled('MouthBase') && isLayerDisabled('MouthItem') && isLayerDisabled('FacialHair');

  // Load images for all mouth-related layers
  useEffect(() => {
    if (!isInitialized) return;

    queueMicrotask(() => setIsLoading(true));
    Promise.all([
      getLayerImages('MouthBase'),
      getLayerImages('MouthItem'),
      getLayerImages('FacialHair'),
    ])
      .then(([baseImages, itemImages, facialImages]) => {
        setMouthBaseImages(baseImages);
        setMouthItemImages(itemImages);
        setFacialHairImages(facialImages);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load mouth images:', err);
        setMouthBaseImages([]);
        setMouthItemImages([]);
        setFacialHairImages([]);
        setIsLoading(false);
      });
  }, [isInitialized, getLayerImages]);

  // Loading skeleton
  if (isLoading || !isInitialized) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="generator-options-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <TraitCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const handleMouthBaseClick = (image: LayerImage) => {
    if (isLayerDisabled('MouthBase') || isOptionDisabled('MouthBase', image.displayName)) return;

    // MouthBase cannot be deselected - only switched to another option
    // Clicking the same item does nothing
    if (selectedMouthBase === image.path) {
      return; // Do nothing - can't deselect MouthBase
    }
    selectLayer('MouthBase', image.path);
  };

  const handleMouthItemClick = (image: LayerImage) => {
    if (isLayerDisabled('MouthItem') || isOptionDisabled('MouthItem', image.displayName)) return;

    // Toggle selection
    if (selectedMouthItem === image.path) {
      clearLayer('MouthItem');
    } else {
      selectLayer('MouthItem', image.path);
    }
  };

  // Helper to determine why an option is disabled
  const getDisabledReasonForOption = (layer: 'MouthBase' | 'MouthItem' | 'FacialHair', optionName: string): string | undefined => {
    const clothesPath = selectedLayers.Clothes || '';
    const maskPath = selectedLayers.Mask || '';
    const mouthBasePath = selectedLayers.MouthBase || '';

    const hasAstronaut = clothesPath.toLowerCase().includes('astronaut');
    const hasMask = maskPath && maskPath !== '';
    const hasPipe = mouthBasePath.toLowerCase().includes('pipe');
    const hasPizza = mouthBasePath.toLowerCase().includes('pizza');
    const hasBubbleGum = mouthBasePath.toLowerCase().includes('bubble-gum');

    if (layer === 'MouthItem') {
      if (hasAstronaut) return 'Remove Astronaut';
      if (hasMask) return 'Remove Mask';
      if (hasPipe) return 'Remove Pipe';
      if (hasPizza) return 'Remove Pizza';
      if (hasBubbleGum) return 'Remove Bubble Gum';
    }

    if (layer === 'MouthBase') {
      const lowerName = optionName.toLowerCase();
      if (hasAstronaut && (lowerName.includes('pipe') || lowerName.includes('pizza') || lowerName.includes('bubble'))) {
        return 'Remove Astronaut';
      }
      if (maskPath.toLowerCase().includes('copium') && (lowerName.includes('pizza') || lowerName.includes('bubble'))) {
        return 'Remove Copium Mask';
      }
    }

    if (layer === 'FacialHair') {
      if (hasMask) return 'Remove Mask';
    }

    return undefined;
  };

  const handleFacialHairClick = (image: LayerImage) => {
    if (isLayerDisabled('FacialHair') || isOptionDisabled('FacialHair', image.displayName)) return;

    // Toggle selection
    if (selectedFacialHair === image.path) {
      clearLayer('FacialHair');
    } else {
      selectLayer('FacialHair', image.path);
    }
  };

  // Combine images with category info
  const allImages = [
    ...mouthBaseImages.map((img) => ({ ...img, category: 'base' as const })),
    ...mouthItemImages.map((img) => ({ ...img, category: 'item' as const })),
    ...facialHairImages.map((img) => ({ ...img, category: 'facial' as const })),
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Blocked overlay */}
      {isBlocked && (
        <div
          className="p-4 rounded-xl text-center"
          style={{
            background: 'var(--color-glass-bg)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p style={{ color: 'var(--color-text-muted)' }}>
            Mouth layers are blocked by another trait selection
          </p>
        </div>
      )}

      {/* Combined mouth trait grid */}
      {!isBlocked && (mouthBaseImages.length > 0 || mouthItemImages.length > 0 || facialHairImages.length > 0) && (
          <motion.div
            key="mouth-grid"
            className="generator-options-grid"
            variants={prefersReducedMotion ? undefined : traitGridVariants}
            initial="initial"
            animate="animate"
          >
            {/* MouthBase items */}
            {mouthBaseImages.map((image) => {
              const isDisabled = isLayerDisabled('MouthBase') || isOptionDisabled('MouthBase', image.displayName);
              return (
                <motion.div
                  key={image.path}
                  variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                >
                  <ImageCard
                    image={image}
                    isSelected={selectedMouthBase === image.path}
                    isDisabled={isDisabled}
                    disabledReason={isDisabled ? getDisabledReasonForOption('MouthBase', image.displayName) : undefined}
                    onClick={() => handleMouthBaseClick(image)}
                  />
                </motion.div>
              );
            })}
            {/* MouthItem items (Cig, Cohiba, Joint) */}
            {mouthItemImages.map((image) => {
              const isDisabled = isLayerDisabled('MouthItem') || isOptionDisabled('MouthItem', image.displayName);
              return (
                <motion.div
                  key={image.path}
                  variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                >
                  <ImageCard
                    image={image}
                    isSelected={selectedMouthItem === image.path}
                    isDisabled={isDisabled}
                    disabledReason={isDisabled ? getDisabledReasonForOption('MouthItem', image.displayName) : undefined}
                    onClick={() => handleMouthItemClick(image)}
                    badge="+"
                  />
                </motion.div>
              );
            })}
            {/* FacialHair items (Neckbeard, Stache) */}
            {facialHairImages.map((image) => {
              const isDisabled = isLayerDisabled('FacialHair') || isOptionDisabled('FacialHair', image.displayName);
              return (
                <motion.div
                  key={image.path}
                  variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                >
                  <ImageCard
                    image={image}
                    isSelected={selectedFacialHair === image.path}
                    isDisabled={isDisabled}
                    disabledReason={isDisabled ? getDisabledReasonForOption('FacialHair', image.displayName) : undefined}
                    onClick={() => handleFacialHairClick(image)}
                    badge="+"
                  />
                </motion.div>
              );
            })}
          </motion.div>
      )}

      {/* Empty state */}
      {!isBlocked && allImages.length === 0 && (
        <div
          className="p-8 rounded-xl text-center"
          style={{
            background: 'var(--color-glass-bg)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p style={{ color: 'var(--color-text-muted)' }}>
            No mouth traits available
          </p>
        </div>
      )}
    </div>
  );
}

export default MouthLayerSelector;
