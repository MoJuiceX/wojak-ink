/**
 * Mouth Layer Selector Component
 *
 * Combined selector for MouthBase and MouthItem with multi-select support.
 * Users can select a base mouth (numb, smile, etc.) AND a mouth item (cig, joint, cohiba).
 */

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useGenerator } from '@/contexts/GeneratorContext';
import { useMint, type TraitPricingEntry } from '@/contexts/MintContext';
import { TraitUsageBadge } from '@/components/generator/TraitSelector';
import { traitGridVariants, traitCardStaggerVariants } from '@/config/generatorAnimations';
import type { LayerImage } from '@/services/generatorService';
import type { UnifiedTrait } from '@/services/generatorService';

const G2_BASE_PATH = '/assets/wojak-layers/YourWojak-layers';

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
  pricing?: TraitPricingEntry | null;
}

function ImageCard({ image, isSelected, isDisabled, disabledReason, onClick, badge, pricing }: ImageCardProps) {
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
        <TraitUsageBadge pricing={pricing ?? null} />
      </div>
      {/* Disabled info badge */}
      {isDisabled && disabledReason && (
        <div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-20"
          style={{ background: 'rgba(0, 0, 0, 0.7)', border: '1px solid var(--color-border)' }}
          title={disabledReason}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-text-secondary)">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        </div>
      )}
      {/* Check mark with pop animation */}
      {isSelected && !isDisabled && (
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

interface G2MouthCardProps {
  trait: UnifiedTrait;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string;
  onClick: () => void;
  pricing?: TraitPricingEntry | null;
}

function G2MouthCard({ trait, isSelected, isDisabled, disabledReason, onClick, pricing }: G2MouthCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const thumbnailSrc = trait.outlineFile
    ? `${G2_BASE_PATH}/${trait.outlineFile}`
    : trait.layer0File
      ? `${G2_BASE_PATH}/${trait.layer0File}`
      : '';

  return (
    <motion.button
      className="w-full aspect-square relative rounded-xl overflow-hidden p-1"
      style={{
        background: 'var(--generator-trait-card-bg)',
        border: isSelected
          ? '2px solid var(--color-cyan, #00d4ff)'
          : '1px solid var(--generator-trait-card-border)',
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        boxShadow: isSelected
          ? '0 0 20px rgba(0, 212, 255, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s ease',
      }}
      whileHover={prefersReducedMotion || isDisabled ? undefined : { scale: 1.03 }}
      whileTap={prefersReducedMotion || isDisabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      disabled={isDisabled}
      title={disabledReason || trait.name}
    >
      <div className="relative w-full h-full rounded-lg overflow-hidden trait-card-image-bg">
        {thumbnailSrc && (
          <img
            src={thumbnailSrc}
            alt={trait.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <TraitUsageBadge pricing={pricing ?? null} />
      </div>
      {isSelected && !isDisabled && (
        <motion.div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-20"
          style={{ background: 'var(--color-cyan, #00d4ff)' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
          </svg>
        </motion.div>
      )}
      {isDisabled && disabledReason && (
        <div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-20"
          style={{ background: 'rgba(0, 0, 0, 0.7)', border: '1px solid var(--color-border)' }}
          title={disabledReason}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-text-secondary)">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        </div>
      )}
    </motion.button>
  );
}

export function MouthLayerSelector({ className = '' }: MouthLayerSelectorProps) {
  const {
    selectedLayers,
    g2Selections,
    getLayerImages,
    getUnifiedTraitsForLayer,
    selectLayer,
    selectG2Layer,
    clearLayer,
    isLayerDisabled,
    isOptionDisabled,
    isInitialized,
  } = useGenerator();
  const { getTraitPricing } = useMint();
  const prefersReducedMotion = useReducedMotion();

  // All mouth layers map to "Mouth" trait_type — no surcharge category
  const lookupPricing = (traitName: string): TraitPricingEntry | null => {
    const p = getTraitPricing('Mouth', traitName);
    if (p) return { usageCount: p.usageCount, surchargeXch: 0 };
    return p;
  };

  const [mouthBaseUnified, setMouthBaseUnified] = useState<UnifiedTrait[]>([]);
  const [mouthItemImages, setMouthItemImages] = useState<LayerImage[]>([]);
  const [facialHairImages, setFacialHairImages] = useState<LayerImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const selectedMouthBase = selectedLayers.MouthBase;
  const selectedMouthItem = selectedLayers.MouthItem;
  const selectedFacialHair = selectedLayers.FacialHair;
  const isBlocked = isLayerDisabled('MouthBase') && isLayerDisabled('MouthItem') && isLayerDisabled('FacialHair');

  // Load unified traits for MouthBase (G1 + G2 so BubbleGum, Pipe appear) and G1 images for MouthItem + FacialHair
  useEffect(() => {
    if (!isInitialized) return;

    queueMicrotask(() => setIsLoading(true));
    Promise.all([
      getUnifiedTraitsForLayer('MouthBase'),
      getLayerImages('MouthItem'),
      getLayerImages('FacialHair'),
    ])
      .then(([baseUnified, itemImages, facialImages]) => {
        setMouthBaseUnified(baseUnified);
        setMouthItemImages(itemImages);
        setFacialHairImages(facialImages);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load mouth options:', err);
        setMouthBaseUnified([]);
        setMouthItemImages([]);
        setFacialHairImages([]);
        setIsLoading(false);
      });
  }, [isInitialized, getUnifiedTraitsForLayer, getLayerImages]);

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

  const hasAnyOptions =
    mouthBaseUnified.length > 0 || mouthItemImages.length > 0 || facialHairImages.length > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Blocked overlay */}
      {isBlocked && (
        <div
          className="p-4 rounded-xl text-center"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p style={{ color: 'var(--color-text-muted)' }}>
            Mouth layers are blocked by another trait selection
          </p>
        </div>
      )}

      {/* Combined mouth trait grid */}
      {!isBlocked && hasAnyOptions && (
          <motion.div
            key="mouth-grid"
            className="generator-options-grid"
            variants={prefersReducedMotion ? undefined : traitGridVariants}
            initial="initial"
            animate="animate"
          >
            {/* MouthBase items (G1 + G2 unified: includes BubbleGum, Pipe from YourWojak) */}
            {mouthBaseUnified.map((trait) => {
              const isG2 = trait.source === 'g2' || trait.source === 'both';
              const isSelected =
                isG2
                  ? g2Selections.MouthBase?.traitId === trait.id
                  : selectedMouthBase === trait.g1Path;
              const displayName = trait.name;
              const isDisabled =
                isLayerDisabled('MouthBase') || isOptionDisabled('MouthBase', displayName);

              if (trait.source === 'g2') {
                return (
                  <motion.div
                    key={trait.id}
                    variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                  >
                    <G2MouthCard
                      trait={trait}
                      isSelected={!!isSelected}
                      isDisabled={isDisabled}
                      disabledReason={isDisabled ? getDisabledReasonForOption('MouthBase', displayName) : undefined}
                      onClick={() => selectG2Layer('MouthBase', trait)}
                      pricing={lookupPricing(trait.name)}
                    />
                  </motion.div>
                );
              }

              const g1Path = trait.g1Path!;
              const image: LayerImage = { path: g1Path, name: trait.name, displayName: trait.name };
              return (
                <motion.div
                  key={trait.id}
                  variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                >
                  <ImageCard
                    image={image}
                    isSelected={!!isSelected}
                    isDisabled={isDisabled}
                    disabledReason={isDisabled ? getDisabledReasonForOption('MouthBase', displayName) : undefined}
                    onClick={() =>
                      trait.source === 'g1'
                        ? selectLayer('MouthBase', g1Path)
                        : selectG2Layer('MouthBase', trait)
                    }
                    pricing={lookupPricing(trait.name)}
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
                    pricing={lookupPricing(image.displayName)}
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
                    pricing={lookupPricing(image.displayName)}
                  />
                </motion.div>
              );
            })}
          </motion.div>
      )}

      {/* Empty state */}
      {!isBlocked && !hasAnyOptions && (
        <div
          className="p-8 rounded-xl text-center"
          style={{
            background: 'var(--color-surface)',
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
