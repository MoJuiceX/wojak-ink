/**
 * Mouth Layer Selector Component
 *
 * Combined selector for MouthBase and MouthItem with multi-select support.
 * Users can select a base mouth (numb, smile, etc.) AND a mouth item (cig, joint, cohiba).
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useGenerator } from '@/contexts/GeneratorContext';
import { useMint } from '@/contexts/MintContext';
import { traitGridVariants, traitCardStaggerVariants } from '@/config/generatorAnimations';
import type { LayerImage } from '@/services/generatorService';
import type { UnifiedTrait } from '@/services/generatorService';
import { getG1MouthTransform, getG2MouthTransform } from './mouthPreviewPositions';
import { DEFAULT_BASE_PATH, DEFAULT_CLOTHES_PATH, DEFAULT_MOUTHBASE_PATH } from '@/lib/layerRegistry';
import { G2_LAYER_BASE } from '@/config/layerAssetBase';
import { SortControls, type TraitSortMode } from '@/components/generator/TraitSelector';

const G2_BASE_PATH = G2_LAYER_BASE;

// Default layer paths for preview composites (same as TraitSelector)
const DEFAULT_MOUTH_PATH = DEFAULT_MOUTHBASE_PATH;

interface MouthLayerSelectorProps {
  className?: string;
  sortMode?: TraitSortMode;
  onSortChange?: (mode: TraitSortMode) => void;
  combatType?: string;
  combatTypeEmoji?: string;
  combatNature?: string;
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
  /** If true, show numb mouth under the trait (for add-on items like cig, joint, neckbeard) */
  showMouthUnderlay?: boolean;
}

/** Mouth trait card with base face + clothes underlay */
function ImageCard({ image, isSelected, isDisabled, disabledReason, onClick, badge, showMouthUnderlay }: ImageCardProps) {
  const prefersReducedMotion = useReducedMotion();

  // Get zoom transform from centralized positions file
  const zoomTransform = getG1MouthTransform(image.displayName);

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
          ? '0 0 20px var(--generator-selected-glow, var(--color-primary-50)), 0 4px 12px var(--color-black-30)'
          : '0 2px 8px var(--color-black-20)',
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
        {/* Zoomed container to focus on mouth area */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            transform: zoomTransform,
            transformOrigin: 'center center',
          }}
        >
          {/* Base face layer */}
          <img
            src={DEFAULT_BASE_PATH}
            alt="Base layer"
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
            loading="lazy"
          />
          {/* Clothes layer (blue tee) */}
          <img
            src={DEFAULT_CLOTHES_PATH}
            alt="Clothes layer"
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
            loading="lazy"
          />
          {/* Numb mouth layer (for add-on items) */}
          {showMouthUnderlay && (
            <img
              src={DEFAULT_MOUTH_PATH}
              alt="Mouth layer"
              className="absolute inset-0 w-full h-full object-cover"
              crossOrigin="anonymous"
              loading="lazy"
            />
          )}
          {/* Mouth trait on top */}
          <img
            src={image.path}
            alt={image.displayName}
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
            loading="lazy"
          />
        </div>
        <div className="trait-label-overlay">
          <span className="trait-label-text">{image.displayName}</span>
        </div>
      </div>
      {/* Disabled info badge */}
      {isDisabled && disabledReason && (
        <div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-20"
          style={{ background: 'var(--color-black-70)', border: '1px solid var(--color-border)' }}
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
}

/** Default color for Bubble Gum fill */
const BUBBLE_GUM_DEFAULT_COLOR = '#FF1493';

// Custom sort order for MouthBase traits (exact display names or path keywords)
const MOUTH_BASE_ORDER = [
  'numb',
  'smile',
  'screem',    // Screaming (file is "screeming")
  'teeth',     // Regular teeth (must come before gold-teeth)
  'gold-teeth', // Gold Teeth
  'drac',      // Vampire Teeth
  'pipe',
  'pizza',
  'bubble',    // Bubble Gum
  'hannibal',  // Hannibal Mask
];

function sortMouthBaseTraits(traits: UnifiedTrait[]): UnifiedTrait[] {
  return [...traits].sort((a, b) => {
    // Use g1Path if available, otherwise use name
    const aKey = (a.g1Path || a.name).toLowerCase();
    const bKey = (b.g1Path || b.name).toLowerCase();

    const getOrderIndex = (key: string): number => {
      for (let i = 0; i < MOUTH_BASE_ORDER.length; i++) {
        const keyword = MOUTH_BASE_ORDER[i];
        // For "teeth", make sure it doesn't match "gold-teeth"
        if (keyword === 'teeth') {
          if (key.includes('teeth') && !key.includes('gold')) return i;
        } else if (key.includes(keyword)) {
          return i;
        }
      }
      return -1;
    };

    const aIndex = getOrderIndex(aKey);
    const bIndex = getOrderIndex(bKey);

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return aKey.localeCompare(bKey);
  });
}

/** G2 mouth trait card with base face + clothes underlay */
function G2MouthCard({ trait, isSelected, isDisabled, disabledReason, onClick }: G2MouthCardProps) {
  const prefersReducedMotion = useReducedMotion();

  // Get fill and outline paths
  const fillSrc = trait.fillFile ? `${G2_BASE_PATH}/${trait.fillFile}` : null;
  const outlineSrc = trait.outlineFile
    ? `${G2_BASE_PATH}/${trait.outlineFile}`
    : trait.layer0File
      ? `${G2_BASE_PATH}/${trait.layer0File}`
      : '';

  // Default color for colorable traits (like Bubble Gum)
  const defaultColor = trait.defaultColor || BUBBLE_GUM_DEFAULT_COLOR;

  // Get zoom transform from centralized positions file
  const zoomTransform = getG2MouthTransform(trait.name);

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
          ? '0 0 20px var(--generator-selected-glow, var(--color-primary-50)), 0 4px 12px var(--color-black-30)'
          : '0 2px 8px var(--color-black-20)',
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
        {/* Zoomed container to focus on mouth area */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            transform: zoomTransform,
            transformOrigin: 'center center',
          }}
        >
          {/* Base face layer */}
          <img
            src={DEFAULT_BASE_PATH}
            alt="Base layer"
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
            loading="lazy"
          />
          {/* Clothes layer (blue tee) */}
          <img
            src={DEFAULT_CLOTHES_PATH}
            alt="Clothes layer"
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
            loading="lazy"
          />
          {/* Fill layer with default color (for colorable traits like Bubble Gum) */}
          {fillSrc && (
            <div
              className="absolute inset-0 w-full h-full"
              style={{
                backgroundColor: defaultColor,
                maskImage: `url(${fillSrc})`,
                WebkitMaskImage: `url(${fillSrc})`,
                maskSize: 'cover',
                WebkitMaskSize: 'cover',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
              }}
            />
          )}
          {/* Outline layer on top */}
          {outlineSrc && (
            <img
              src={outlineSrc}
              alt={trait.name}
              className="absolute inset-0 w-full h-full object-cover"
              crossOrigin="anonymous"
              loading="lazy"
            />
          )}
        </div>
        <div className="trait-label-overlay">
          <span className="trait-label-text">{trait.name}</span>
        </div>
      </div>
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
      {isDisabled && disabledReason && (
        <div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-20"
          style={{ background: 'var(--color-black-70)', border: '1px solid var(--color-border)' }}
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

export function MouthLayerSelector({ className = '', sortMode = 'hot', onSortChange, combatType, combatTypeEmoji, combatNature }: MouthLayerSelectorProps) {
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
    getOptionDisabledReason,
    isInitialized,
  } = useGenerator();
  const { getTraitPricing } = useMint();
  const prefersReducedMotion = useReducedMotion();

  const [rawMouthBase, setRawMouthBase] = useState<UnifiedTrait[]>([]);
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
        setRawMouthBase(sortMouthBaseTraits(baseUnified));
        setMouthItemImages(itemImages);
        setFacialHairImages(facialImages);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load mouth options:', err);
        setRawMouthBase([]);
        setMouthItemImages([]);
        setFacialHairImages([]);
        setIsLoading(false);
      });
  }, [isInitialized, getUnifiedTraitsForLayer, getLayerImages]);

  // Derive sorted mouthBaseUnified from rawMouthBase + sortMode (no extra effect needed)
  const mouthBaseUnified = useMemo(() => {
    if (rawMouthBase.length === 0) return [];

    const lookupUsage = (traitName: string): number => {
      const p = getTraitPricing('Mouth', traitName);
      return p?.usageCount ?? 0;
    };

    if (sortMode === 'az') {
      return [...rawMouthBase].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortMode === 'za') {
      return [...rawMouthBase].sort((a, b) => b.name.localeCompare(a.name));
    }

    return [...rawMouthBase].sort((a, b) => {
      const aUsage = lookupUsage(a.name);
      const bUsage = lookupUsage(b.name);
      if (aUsage !== bUsage) {
        return sortMode === 'hot' ? bUsage - aUsage : aUsage - bUsage;
      }
      return 0; // tiebreaker: preserve MOUTH_BASE_ORDER
    });
  }, [rawMouthBase, sortMode, getTraitPricing]);

  // Loading skeleton
  if (isLoading || !isInitialized) {
    return (
      <div className={`space-y-4 ${className}`} role="status" aria-label="Loading">
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

  // Helper to determine why an option is disabled (prefer rule-based reason from context)
  const getDisabledReasonForOption = (layer: 'MouthBase' | 'MouthItem' | 'FacialHair', optionName: string): string | undefined => {
    const ruleReason = getOptionDisabledReason(layer, optionName);
    if (ruleReason) return ruleReason;

    const clothesPath = selectedLayers.Clothes || '';
    const maskPath = selectedLayers.Mask || '';
    const mouthBasePath = selectedLayers.MouthBase || '';

    const hasAstronaut = clothesPath.toLowerCase().includes('astronaut');
    const hasMask = maskPath && maskPath !== '';
    const hasPipe = mouthBasePath.toLowerCase().includes('pipe');
    const hasPizza = mouthBasePath.toLowerCase().includes('pizza');
    // Check both G1 path and G2 selection for Bubble Gum
    const hasBubbleGum = mouthBasePath.toLowerCase().includes('bubble-gum') ||
      g2Selections.MouthBase?.traitId?.toLowerCase().includes('bubblegum') ||
      g2Selections.MouthBase?.traitId?.toLowerCase().includes('bubble-gum');

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
      if (hasBubbleGum) return 'Remove Bubble Gum';
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
          <p className="text-muted">
            Mouth layers are blocked by another trait selection
          </p>
        </div>
      )}

      {/* Sort controls — above grid, only when traits are loaded */}
      {!isBlocked && hasAnyOptions && onSortChange && (
        <SortControls
          sortMode={sortMode}
          onSortChange={onSortChange}
          combatType={combatType}
          combatTypeEmoji={combatTypeEmoji}
          combatNature={combatNature}
        />
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
                  />
                </motion.div>
              );
            })}
            {/* MouthItem items (Cig, Cohiba, Joint) — show numb mouth underneath */}
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
                    showMouthUnderlay
                  />
                </motion.div>
              );
            })}
            {/* FacialHair items (Neckbeard, Stache) — show numb mouth underneath */}
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
                    showMouthUnderlay
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
          <p className="text-muted">
            No mouth traits available
          </p>
        </div>
      )}
    </div>
  );
}

export default MouthLayerSelector;
