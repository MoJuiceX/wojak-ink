/**
 * Trait Selector Component
 *
 * Grid of trait cards for the active layer.
 * Renders MouthLayerSelector for mouth-related layers.
 */

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Ban } from 'lucide-react';
import { useGenerator } from '@/contexts/GeneratorContext';
import { traitGridVariants, traitCardStaggerVariants } from '@/config/generatorAnimations';
import { MouthLayerSelector } from './MouthLayerSelector';
import type { LayerImage } from '@/services/generatorService';

interface TraitSelectorProps {
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

interface NoneCardProps {
  isSelected: boolean;
  onClick: () => void;
}

function NoneCard({ isSelected, onClick }: NoneCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      className="w-full aspect-square relative rounded-xl overflow-hidden p-1"
      style={{
        background: 'var(--generator-trait-card-bg)',
        border: isSelected
          ? '2px solid var(--generator-selected-color, #F97316)'
          : '1px solid var(--generator-trait-card-border)',
        boxShadow: isSelected
          ? '0 0 20px var(--generator-selected-glow, rgba(249, 115, 22, 0.5)), 0 4px 12px rgba(0, 0, 0, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s ease',
      }}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
    >
      <div className="relative w-full h-full rounded-lg overflow-hidden flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
        <Ban
          size={40}
          style={{ color: isSelected ? 'var(--generator-selected-color, #F97316)' : 'var(--color-text-muted)' }}
        />
      </div>
      {isSelected && (
        <motion.div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
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

interface ImageCardProps {
  image: LayerImage;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

function ImageCard({ image, isSelected, isDisabled, disabledReason, onClick }: ImageCardProps) {
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
      title={isDisabled && disabledReason ? disabledReason : undefined}
    >
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
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
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

// Default layer paths for preview composites
const DEFAULT_BASE_PATH = '/assets/wojak-layers/BASE/BASE_Base-Wojak_classic.png';
const DEFAULT_CLOTHES_PATH = '/assets/wojak-layers/CLOTHES/CLOTHES_Tee_blue.png';
const DEFAULT_MOUTH_PATH = '/assets/wojak-layers/MOUTH/MOUTH_numb.png';

// Clothes paths for each base variant preview
const BASE_CLOTHES_MAP: Record<string, string> = {
  classic: '/assets/wojak-layers/CLOTHES/CLOTHES_Tank-Top_orange.png',
  rekt: '/assets/wojak-layers/CLOTHES/CLOTHES_Tank-Top_red.png',
  rugged: '/assets/wojak-layers/CLOTHES/CLOTHES_Tee_blue.png',
  bleeding: '/assets/wojak-layers/CLOTHES/CLOTHES_Tee_orange.png',
  terminator: '/assets/wojak-layers/CLOTHES/CLOTHES_Tee_red.png',
};

function getClothesForBase(basePath: string): string {
  const lowerPath = basePath.toLowerCase();
  for (const [key, clothesPath] of Object.entries(BASE_CLOTHES_MAP)) {
    if (lowerPath.includes(key)) {
      return clothesPath;
    }
  }
  return DEFAULT_CLOTHES_PATH;
}

interface BaseImageCardProps {
  image: LayerImage;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

function BaseImageCard({ image, isSelected, isDisabled, disabledReason, onClick }: BaseImageCardProps) {
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
      title={isDisabled && disabledReason ? disabledReason : undefined}
    >
      <div
        className="relative w-full h-full rounded-lg overflow-hidden trait-card-image-bg"
      >
        {/* Base layer */}
        <img
          src={image.path}
          alt={image.displayName}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        {/* Clothes layer (varies by base) */}
        <img
          src={getClothesForBase(image.path)}
          alt="Clothes layer preview"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        {/* Mouth layer (Numb) */}
        <img
          src={DEFAULT_MOUTH_PATH}
          alt="Mouth layer preview"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      {/* Check mark with pop animation */}
      {isSelected && (
        <motion.div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
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

interface ClothesImageCardProps {
  image: LayerImage;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

function ClothesImageCard({ image, isSelected, isDisabled, disabledReason, onClick }: ClothesImageCardProps) {
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
      title={isDisabled && disabledReason ? disabledReason : undefined}
    >
      <div
        className="relative w-full h-full rounded-lg overflow-hidden trait-card-image-bg"
      >
        {/* Base layer (Classic) */}
        <img
          src={DEFAULT_BASE_PATH}
          alt="Base layer preview"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        {/* Clothes layer (variable) */}
        <img
          src={image.path}
          alt={image.displayName}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        {/* Mouth layer (Numb) */}
        <img
          src={DEFAULT_MOUTH_PATH}
          alt="Mouth layer preview"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      {/* Check mark with pop animation */}
      {isSelected && (
        <motion.div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
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

export function TraitSelector({ className = '' }: TraitSelectorProps) {
  const {
    activeLayer,
    selectedLayers,
    getLayerImages,
    selectLayer,
    clearLayer,
    isLayerDisabled,
    isOptionDisabled,
    getOptionDisabledReason,
    isInitialized,
  } = useGenerator();
  const prefersReducedMotion = useReducedMotion();

  const [images, setImages] = useState<LayerImage[]>([]);
  const [imagesForLayer, setImagesForLayer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if this is a mouth layer (must be before any conditional returns but after hooks)
  const isMouthLayer = activeLayer === 'MouthBase' || activeLayer === 'MouthItem' || activeLayer === 'FacialHair';

  const selectedPath = selectedLayers[activeLayer];
  const isBlocked = isLayerDisabled(activeLayer);

  // Check if images are stale (loaded for a different layer)
  const imagesAreStale = imagesForLayer !== activeLayer;

  // Load images when layer changes (only for non-mouth layers)
  useEffect(() => {
    if (!isInitialized || isMouthLayer) return;

    queueMicrotask(() => setIsLoading(true));
    getLayerImages(activeLayer)
      .then((imgs) => {
        setImages(imgs);
        setImagesForLayer(activeLayer);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load layer images:', err);
        setImages([]);
        setImagesForLayer(activeLayer);
        setIsLoading(false);
      });
  }, [activeLayer, isInitialized, getLayerImages, isMouthLayer]);

  // Use MouthLayerSelector for mouth-related layers (combines MouthBase + MouthItem)
  if (isMouthLayer) {
    return <MouthLayerSelector className={className} />;
  }

  // Loading skeleton - also show when images are stale (from a different layer)
  if (isLoading || !isInitialized || imagesAreStale) {
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

  // Layers that cannot be deselected (only switched to another option)
  const nonDeselectableLayers = ['Base', 'Clothes', 'MouthBase'];
  const canDeselect = !nonDeselectableLayers.includes(activeLayer);

  const handleImageClick = (image: LayerImage) => {
    if (isBlocked || isOptionDisabled(activeLayer, image.displayName)) return;

    // For non-deselectable layers, clicking same item does nothing
    if (selectedPath === image.path) {
      if (!canDeselect) {
        return; // Can't deselect - do nothing
      }
      clearLayer(activeLayer);
    } else {
      selectLayer(activeLayer, image.path);
    }
  };

  const handleClearSelection = () => {
    clearLayer(activeLayer);
  };

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
            This layer is blocked by another trait selection
          </p>
        </div>
      )}

      {/* Trait grid with staggered animation */}
      {!isBlocked && images.length > 0 && (
          <motion.div
            key={activeLayer}
            className="generator-options-grid"
            variants={prefersReducedMotion ? undefined : traitGridVariants}
            initial="initial"
            animate="animate"
          >
            {/* None option for layers that can be deselected */}
            {canDeselect && (
              <motion.div
                variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
              >
                <NoneCard
                  isSelected={!selectedPath || selectedPath === '' || selectedPath === 'None'}
                  onClick={handleClearSelection}
                />
              </motion.div>
            )}
            {images.map((image) => {
              const disabled = isOptionDisabled(activeLayer, image.displayName);
              const reason = disabled ? getOptionDisabledReason(activeLayer, image.displayName) : null;

              if (activeLayer === 'Base') {
                return (
                  <motion.div
                    key={image.path}
                    variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                  >
                    <BaseImageCard
                      image={image}
                      isSelected={selectedPath === image.path}
                      isDisabled={disabled}
                      disabledReason={reason}
                      onClick={() => handleImageClick(image)}
                    />
                  </motion.div>
                );
              }
              if (activeLayer === 'Clothes') {
                return (
                  <motion.div
                    key={image.path}
                    variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                  >
                    <ClothesImageCard
                      image={image}
                      isSelected={selectedPath === image.path}
                      isDisabled={disabled}
                      disabledReason={reason}
                      onClick={() => handleImageClick(image)}
                    />
                  </motion.div>
                );
              }
              return (
                <motion.div
                  key={image.path}
                  variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                >
                  <ImageCard
                    image={image}
                    isSelected={selectedPath === image.path}
                    isDisabled={disabled}
                    disabledReason={reason}
                    onClick={() => handleImageClick(image)}
                  />
                </motion.div>
              );
            })}
          </motion.div>
      )}

      {/* Empty state */}
      {!isBlocked && !isLoading && images.length === 0 && (
        <div
          className="p-8 rounded-xl text-center"
          style={{
            background: 'var(--color-glass-bg)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p style={{ color: 'var(--color-text-muted)' }}>
            No traits available for this layer
          </p>
        </div>
      )}
    </div>
  );
}

export default TraitSelector;
