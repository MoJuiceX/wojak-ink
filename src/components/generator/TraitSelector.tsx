/**
 * Trait Selector Component
 *
 * Grid of trait cards for the active layer.
 * Renders MouthLayerSelector for mouth-related layers.
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Ban } from 'lucide-react';
import { useLayout } from '@/hooks/useLayout';
import { useGenerator } from '@/contexts/GeneratorContext';
import { useMint, type TraitPricingEntry } from '@/contexts/MintContext';
import { traitGridVariants, traitCardStaggerVariants } from '@/config/generatorAnimations';
import { MouthLayerSelector } from './MouthLayerSelector';
import { G2TraitCardPreview } from './G2TraitCardPreview';
import { TraitCardShell } from './TraitCardShell';
import type { LayerImage } from '@/services/generatorService';
import type { UnifiedTrait } from '@/services/generatorService';
import { BASE_CLOTHES_MAP, DEFAULT_CLOTHES_PATH } from '@/config/layers';
import { isSelectionPathEmpty } from '@/types/generator';

/** Maps generator layer names to Phase 1 trait_types for pricing lookup */
const LAYER_TO_TRAIT_TYPE: Record<string, string> = {
  Base: 'Face',
  Eyes: 'Face Wear',
  Mask: 'Face Wear',
  MouthBase: 'Mouth',
  MouthItem: 'Mouth',
  FacialHair: 'Mouth',
  Head: 'Head',
  Clothes: 'Clothes',
  Background: 'Background',
};

/** Surcharge categories — only these show "+X.XX XCH" badges */
const SURCHARGE_CATEGORIES = new Set(['Head', 'Clothes', 'Face Wear']);

/** Default color for solid color backgrounds - sky blue */
const SOLID_BG_DEFAULT_COLOR = '#38BDF8';

/**
 * Clothes layer sort order - items appear in this order at the top.
 * Keywords are matched case-insensitively against trait name or ID.
 */
const CLOTHES_TOP_ORDER = [
  'Tee',
  'Chia-farmer',
  'Tank-top',
  'Bathrobe',
  'Sports-jacket',
  'Topless',
  'Suit',          // matches Clothes_Suit
  'gods-robe',     // God's Robe
  'Super-Saiyan',
  'Drac-suit',
  'Bepe-army',
  'Military-jacket', // El Presidente
  'fire-figther',    // Firefighter
];

/** Check if a trait path is an extra item (hand items or wings) — uses multi-select toggle behavior */
function isExtraItem(path: string | undefined): boolean {
  if (!path) return false;
  const lower = path.toLowerCase();
  return lower.includes('extra_hand') || lower.includes('extra_wings');
}

/**
 * Character suits - these appear at the very end, alphabetically sorted among themselves.
 * Keywords matched case-insensitively against trait ID.
 */
const CLOTHES_BOTTOM_IDS = [
  'Clothes_Bepe-suit',
  'Clothes_Goose-suit',
  'Clothes_gopher-suit',
  'Clothes_Pickle-suit',
  'Clothes_Proof-of-prayer',
  'Clothes_Sonic-suit',
];

/**
 * Sort clothes traits: top order first, then alphabetical, then character suits last.
 */
function sortClothesTraits(traits: UnifiedTrait[]): UnifiedTrait[] {
  return [...traits].sort((a, b) => {
    const aId = a.id.toLowerCase();
    const bId = b.id.toLowerCase();
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    // Check if either is in the bottom (character suits) group
    const aIsBottom = CLOTHES_BOTTOM_IDS.some(id => aId === id.toLowerCase());
    const bIsBottom = CLOTHES_BOTTOM_IDS.some(id => bId === id.toLowerCase());

    // If both are bottom items, sort alphabetically by display name
    if (aIsBottom && bIsBottom) {
      return a.name.localeCompare(b.name);
    }
    // Bottom items go last
    if (aIsBottom) return 1;
    if (bIsBottom) return -1;

    // Check top order
    const aTopIndex = CLOTHES_TOP_ORDER.findIndex(keyword =>
      aId.toLowerCase().includes(keyword.toLowerCase()) ||
      aName.includes(keyword.toLowerCase())
    );
    const bTopIndex = CLOTHES_TOP_ORDER.findIndex(keyword =>
      bId.toLowerCase().includes(keyword.toLowerCase()) ||
      bName.includes(keyword.toLowerCase())
    );

    // If both in top order, use that order
    if (aTopIndex !== -1 && bTopIndex !== -1) return aTopIndex - bTopIndex;
    // Top items come first
    if (aTopIndex !== -1) return -1;
    if (bTopIndex !== -1) return 1;

    // Everything else alphabetical by display name
    return a.name.localeCompare(b.name);
  });
}

/** Overlay badge — disabled; pricing info moved to dedicated Prices lightbox */
export function TraitUsageBadge(_props: {
  pricing: TraitPricingEntry | null;
  isTop3?: boolean;
}) {
  return null;
}

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
          ? '0 0 20px var(--generator-selected-glow, var(--color-primary-50)), 0 4px 12px var(--color-black-30)'
          : '0 2px 8px var(--color-black-20)',
        transition: 'all 0.3s ease',
      }}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
    >
      <div
        className="relative w-full h-full rounded-lg overflow-hidden flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, rgba(40,40,48,0.6) 0%, rgba(24,24,30,0.8) 100%)',
          border: '1px dashed var(--color-border)',
        }}
      >
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
  pricing?: TraitPricingEntry | null;
  isTop3?: boolean;
}

const ImageCard = memo(function ImageCard({ image, isSelected, isDisabled, disabledReason, onClick, pricing, isTop3 }: ImageCardProps) {
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
        className="relative w-full h-full rounded-lg overflow-hidden trait-card-image-bg"
      >
        <img
          src={image.path}
          alt={image.displayName}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <TraitUsageBadge pricing={pricing ?? null} isTop3={isTop3} />
        <div className="trait-label-overlay">
          <span className="trait-label-text">{image.displayName}</span>
        </div>
      </div>
    </TraitCardShell>
  );
});

// Default layer paths for preview composites
const DEFAULT_BASE_PATH = '/assets/wojak-layers/BASE/BASE_Base-Wojak_classic.png';
const DEFAULT_MOUTH_PATH = '/assets/wojak-layers/MOUTH/MOUTH_numb.png';

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
  pricing?: TraitPricingEntry | null;
  isTop3?: boolean;
}

const BaseImageCard = memo(function BaseImageCard({ image, isSelected, isDisabled, disabledReason, onClick, pricing, isTop3 }: BaseImageCardProps) {
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
        <TraitUsageBadge pricing={pricing ?? null} isTop3={isTop3} />
        <div className="trait-label-overlay">
          <span className="trait-label-text">{image.displayName}</span>
        </div>
      </div>
    </TraitCardShell>
  );
});

interface ClothesImageCardProps {
  image: LayerImage;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
  pricing?: TraitPricingEntry | null;
  isTop3?: boolean;
}

interface SolidColorBackgroundCardProps {
  color: string;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

const SolidColorBackgroundCard = memo(function SolidColorBackgroundCard({ color, isSelected, isDisabled, disabledReason, onClick }: SolidColorBackgroundCardProps) {
  return (
    <TraitCardShell
      isSelected={isSelected}
      isDisabled={isDisabled}
      disabledReason={disabledReason}
      onClick={onClick}
      title={isDisabled && disabledReason ? disabledReason : 'Solid color — pick with color picker'}
    >
      <div
        className="relative w-full h-full rounded-lg overflow-hidden"
        style={{ backgroundColor: color }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs font-medium truncate text-primary"
        style={{
          background: 'linear-gradient(transparent, var(--color-black-70))',
        }}
      >
        Solid color
      </div>
    </TraitCardShell>
  );
});

interface PriceOverlayCardProps {
  overlayType: 'up' | 'down';
  bgColor: string;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

/** Card for Price up/down overlays that work on top of solid color backgrounds */
const PriceOverlayCard = memo(function PriceOverlayCard({ overlayType, bgColor, isSelected, isDisabled, disabledReason, onClick }: PriceOverlayCardProps) {
  const overlayPath = `/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Price-${overlayType}.png`;
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
          loading="lazy"
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

interface LayerWithBaseMouthCardProps {
  image: LayerImage;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
  pricing?: TraitPricingEntry | null;
  isTop3?: boolean;
  /** When true, render the trait image behind the base (e.g. wings) */
  renderBehindBase?: boolean;
}

/** Card for Head, Mask, Eyes, Background: base + mouth rendered under the trait. */
const LayerWithBaseMouthCard = memo(function LayerWithBaseMouthCard({ image, isSelected, isDisabled, disabledReason, onClick, pricing, isTop3, renderBehindBase }: LayerWithBaseMouthCardProps) {
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
        className="relative w-full h-full rounded-lg overflow-hidden trait-card-image-bg"
      >
        {/* Trait rendered behind base (e.g. wings) */}
        {renderBehindBase && (
          <img
            src={image.path}
            alt={image.displayName}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {/* Base layer */}
        <img
          src={DEFAULT_BASE_PATH}
          alt="Base layer preview"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        {/* Clothes layer (blue Tee) — same as Base preview */}
        <img
          src={DEFAULT_CLOTHES_PATH}
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
        {/* Trait layer (Head, Mask, Eyes, Background) on top */}
        {!renderBehindBase && (
          <img
            src={image.path}
            alt={image.displayName}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <TraitUsageBadge pricing={pricing ?? null} isTop3={isTop3} />
        <div className="trait-label-overlay">
          <span className="trait-label-text">{image.displayName}</span>
        </div>
      </div>
    </TraitCardShell>
  );
});

const ClothesImageCard = memo(function ClothesImageCard({ image, isSelected, isDisabled, disabledReason, onClick, pricing, isTop3 }: ClothesImageCardProps) {
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
        <TraitUsageBadge pricing={pricing ?? null} isTop3={isTop3} />
        <div className="trait-label-overlay">
          <span className="trait-label-text">{image.displayName}</span>
        </div>
      </div>
    </TraitCardShell>
  );
});

// ============ G2 Trait Card ============

interface G2TraitCardProps {
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
  pricing?: TraitPricingEntry | null;
  isTop3?: boolean;
}

/** Cyan glow for G2 trait cards when selected */
const G2_SELECTED_BOX_SHADOW = '0 0 20px rgba(0, 212, 255, 0.4), 0 4px 12px var(--color-black-30)';

export const G2TraitCard = memo(function G2TraitCard({ trait, isSelected, isDisabled, disabledReason, onClick, needsClothesUnderlay, isBeerHatUnderlayer, livePreviewUrl, pricing, isTop3 }: G2TraitCardProps) {
  return (
    <TraitCardShell
      isSelected={isSelected}
      isDisabled={!!isDisabled}
      disabledReason={disabledReason}
      onClick={onClick}
      title={isDisabled && disabledReason ? disabledReason : undefined}
      className="trait-card-hover"
      selectedBoxShadow={G2_SELECTED_BOX_SHADOW}
    >
      <div className="relative w-full h-full rounded-lg overflow-hidden trait-card-image-bg">
        <G2TraitCardPreview trait={trait} needsClothesUnderlay={needsClothesUnderlay} livePreviewUrl={livePreviewUrl} />
        <TraitUsageBadge pricing={pricing ?? null} isTop3={isTop3} />
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

export function TraitSelector({ className = '' }: TraitSelectorProps) {
  const {
    activeLayer,
    selectedLayers,
    selectedColors,
    setColor: _setColor,
    setG2Color: _setG2Color,
    setBeerHatEditFocus,
    g2Selections,
    beerHatCardThumbnailUrl,
    getLayerImages,
    getUnifiedTraitsForLayer,
    selectLayer,
    selectG2Layer,
    clearLayer,
    toggleExtra,
    clearExtras,
    isLayerDisabled,
    isOptionDisabled,
    getOptionDisabledReason,
    isInitialized,
  } = useGenerator();
  const { getTraitPricing, isTop3Trait } = useMint();
  const { isDesktop: _isDesktop } = useLayout();
  const prefersReducedMotion = useReducedMotion();

  const [unifiedTraits, setUnifiedTraits] = useState<UnifiedTrait[]>([]);
  const [imagesForLayer, setImagesForLayer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Glow animation state for trait selection micro-interaction
  const [glowingTraitId, setGlowingTraitId] = useState<string | null>(null);
  const glowTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const triggerSelectionGlow = useCallback((traitId: string) => {
    if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    setGlowingTraitId(traitId);
    navigator.vibrate?.(10);
    glowTimerRef.current = setTimeout(() => setGlowingTraitId(null), 300);
  }, []);

  // Cleanup glow timer on unmount
  useEffect(() => {
    return () => {
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    };
  }, []);

  // Check if this is a mouth layer (must be before any conditional returns but after hooks)
  const isMouthLayer = activeLayer === 'MouthBase' || activeLayer === 'MouthItem' || activeLayer === 'FacialHair';

  const selectedPath = selectedLayers[activeLayer];
  const g2Sel = g2Selections[activeLayer];
  const isBlocked = isLayerDisabled(activeLayer);

  // Layers that cannot be deselected (only switched to another option)
  const canDeselect = !['Base', 'Clothes', 'MouthBase'].includes(activeLayer);

  const handleTraitClick = useCallback((trait: UnifiedTrait) => {
    if (isBlocked || isOptionDisabled(activeLayer, trait.name)) return;

    // Extra items (hand items, wings) use multi-select toggle instead of single-select
    if (trait.g1Path && isExtraItem(trait.g1Path)) {
      const isAlreadySelected =
        selectedLayers['Extra1'] === trait.g1Path || selectedLayers['Extra2'] === trait.g1Path || selectedLayers['Extra3'] === trait.g1Path;
      if (!isAlreadySelected) {
        triggerSelectionGlow(trait.id);
      }
      toggleExtra(trait.g1Path);
      return;
    }

    const isG2Selected = g2Sel?.traitId === trait.id;
    const isG1Selected = trait.g1Path && (selectedPath === trait.g1Path || (selectedPath != null && trait.g1Variants?.includes(selectedPath)));

    // Trigger selection glow if this is a new selection (not already selected)
    if (!isG2Selected && !isG1Selected) {
      triggerSelectionGlow(trait.id);
    }

    // Beer Hat: clicking on Beer Hat itself toggles edit focus to beer
    if (activeLayer === 'Head' && g2Sel?.traitId === 'Head_Beer-Hat' && trait.id === 'Head_Beer-Hat') {
      setBeerHatEditFocus('beer');
      return;
    }
    // Clicking any other head (compatible or not) while Beer Hat is selected replaces Beer Hat

    // If selected via G1 path but trait has color/details, upgrade to G2 so color picker works (e.g. Viking helmet)
    const needsG2Panel = trait.colorable || (trait.detailOptions && trait.detailOptions.length > 0);
    if (isG1Selected && !isG2Selected && needsG2Panel && (trait.source === 'both' || trait.source === 'g2')) {
      selectG2Layer(activeLayer, trait);
      return;
    }

    // For non-deselectable layers, clicking same item does nothing
    if ((isG2Selected || isG1Selected) && !canDeselect) return;
    if (isG2Selected || isG1Selected) {
      if (canDeselect) clearLayer(activeLayer);
      return;
    }

    // Military Beret: default to G1; user can switch to G2 by picking a color
    if (trait.id === 'Head_military-beret' && trait.g1Path) {
      selectLayer(activeLayer, trait.g1Path);
      return;
    }
    // Use G2 when trait has customization (colorable or detail options like Astronaut logo/flag)
    if ((trait.source === 'both' || trait.source === 'g2') && needsG2Panel) {
      selectG2Layer(activeLayer, trait);
    } else if (trait.g1Path) {
      selectLayer(activeLayer, trait.g1Path);
    } else {
      selectG2Layer(activeLayer, trait);
    }
  }, [isBlocked, isOptionDisabled, activeLayer, selectedLayers, triggerSelectionGlow, toggleExtra, g2Sel, selectedPath, setBeerHatEditFocus, selectG2Layer, canDeselect, clearLayer, selectLayer]);

  // Check if images are stale (loaded for a different layer)
  const imagesAreStale = imagesForLayer !== activeLayer;

  // Load images and unified traits when layer changes (only for non-mouth layers)
  useEffect(() => {
    if (!isInitialized || isMouthLayer) return;

    queueMicrotask(() => setIsLoading(true));

    Promise.all([
      getLayerImages(activeLayer),
      getUnifiedTraitsForLayer(activeLayer),
    ])
      .then(([_imgs, traits]) => {
        // Apply custom sort order for Clothes layer
        const sortedTraits = activeLayer === 'Clothes' ? sortClothesTraits(traits) : traits;
        setUnifiedTraits(sortedTraits);
        setImagesForLayer(activeLayer);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load layer images:', err);
        setUnifiedTraits([]);
        setImagesForLayer(activeLayer);
        setIsLoading(false);
      });
  }, [activeLayer, isInitialized, getLayerImages, getUnifiedTraitsForLayer, isMouthLayer]);

  // All traits in one grid (no separate Customizable section)

  // Use MouthLayerSelector for mouth-related layers (combines MouthBase + MouthItem)
  if (isMouthLayer) {
    return <MouthLayerSelector className={className} />;
  }

  // Loading skeleton - also show when data is stale (from a different layer)
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

  const traitType = LAYER_TO_TRAIT_TYPE[activeLayer] || '';
  const lookupPricing = (traitName: string): TraitPricingEntry | null => {
    const p = getTraitPricing(traitType, traitName);
    // Only include surcharge for surcharge categories
    if (p && !SURCHARGE_CATEGORIES.has(traitType)) {
      return { usageCount: p.usageCount, surchargeXch: 0 };
    }
    return p;
  };

  const handleClearSelection = () => {
    clearLayer(activeLayer);
    // Also clear extras when clearing the Extras tab
    if (activeLayer === 'Mask') {
      clearExtras();
    }
  };

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
            This layer is blocked by another trait selection
          </p>
        </div>
      )}

      {/* Empty state when no traits for layer */}
      {!isBlocked && unifiedTraits.length === 0 && (
        <div
          className="p-6 rounded-xl text-center"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p className="text-sm font-medium text-secondary">
            No options for this layer
          </p>
          <p className="text-xs mt-1 text-muted">
            Select a different layer or try Randomize
          </p>
        </div>
      )}

      {/* Single unified trait grid */}
      {!isBlocked && unifiedTraits.length > 0 && (
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
                  isSelected={
                    isSelectionPathEmpty(selectedPath) &&
                    (activeLayer !== 'Mask' || (!selectedLayers['Extra1'] && !selectedLayers['Extra2'] && !selectedLayers['Extra3']))
                  }
                  onClick={handleClearSelection}
                />
              </motion.div>
            )}
            {unifiedTraits.map((trait) => {
              const disabled = isOptionDisabled(activeLayer, trait.name);
              const reason = disabled ? getOptionDisabledReason(activeLayer, trait.name) : null;
              // Extra items check Extra1/Extra2/Extra3 slots; traditional items check the layer's selectedPath
              const isSelected = (trait.g1Path && isExtraItem(trait.g1Path))
                ? (selectedLayers['Extra1'] === trait.g1Path || selectedLayers['Extra2'] === trait.g1Path || selectedLayers['Extra3'] === trait.g1Path)
                : (g2Sel?.traitId === trait.id ||
                   (!!trait.g1Path && (selectedPath === trait.g1Path || (selectedPath != null && trait.g1Variants?.includes(selectedPath)))));

              const traitIsTop3 = isTop3Trait(traitType, trait.name);
              const isGlowing = glowingTraitId === trait.id;

              if (trait.source === 'g2') {
                // Beer Hat card always uses the fixed thumbnail (base + blue tee + mouth) so it matches other grid previews
                const beerHatCardPreviewUrl =
                  trait.id === 'Head_Beer-Hat'
                    ? beerHatCardThumbnailUrl ?? undefined
                    : undefined;
                return (
                  <motion.div
                    key={trait.id}
                    variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                    className={isGlowing ? 'trait-select-glow rounded-xl' : undefined}
                  >
                    <G2TraitCard
                      trait={trait}
                      isSelected={!!isSelected}
                      isDisabled={!!disabled}
                      disabledReason={reason}
                      onClick={() => handleTraitClick(trait)}
                      needsClothesUnderlay={['Head', 'Mask', 'Eyes'].includes(activeLayer)}
                      isBeerHatUnderlayer={activeLayer === 'Head' && g2Sel?.traitId === 'Head_Beer-Hat' && g2Sel.beerHatUnderlayer === trait.id}
                      livePreviewUrl={beerHatCardPreviewUrl}
                      pricing={lookupPricing(trait.name)}
                      isTop3={traitIsTop3}
                    />
                  </motion.div>
                );
              }

              const image: LayerImage = {
                path: trait.g1Path!,
                name: trait.name,
                displayName: trait.name,
              };

              if (activeLayer === 'Base') {
                return (
                  <motion.div
                    key={trait.id}
                    variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                    className={isGlowing ? 'trait-select-glow rounded-xl' : undefined}
                  >
                    <BaseImageCard
                      image={image}
                      isSelected={!!isSelected}
                      isDisabled={!!disabled}
                      disabledReason={reason}
                      onClick={() => handleTraitClick(trait)}
                      pricing={lookupPricing(trait.name)}
                      isTop3={traitIsTop3}
                    />
                  </motion.div>
                );
              }
              if (activeLayer === 'Clothes') {
                return (
                  <motion.div
                    key={trait.id}
                    variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                    className={`relative${isGlowing ? ' trait-select-glow rounded-xl' : ''}`}
                  >
                    <ClothesImageCard
                      image={image}
                      isSelected={!!isSelected}
                      isDisabled={!!disabled}
                      disabledReason={reason}
                      onClick={() => handleTraitClick(trait)}
                      pricing={lookupPricing(trait.name)}
                      isTop3={traitIsTop3}
                    />
                  </motion.div>
                );
              }
              // Background Solid color: show color swatch, not image
              const isSolidBg = image.path === '__solid__' || image.path?.includes('__solid__');
              if (activeLayer === 'Background' && isSolidBg) {
                const swatchColor = selectedColors?.Background ?? SOLID_BG_DEFAULT_COLOR;
                return (
                  <motion.div
                    key={trait.id}
                    variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                    className={isGlowing ? 'trait-select-glow rounded-xl' : undefined}
                  >
                    <SolidColorBackgroundCard
                      color={swatchColor}
                      isSelected={!!isSelected}
                      isDisabled={!!disabled}
                      disabledReason={reason}
                      onClick={() => handleTraitClick(trait)}
                    />
                  </motion.div>
                );
              }
              // Price overlays: only enabled when solid color is selected
              const isPriceUp = image.path === '__price_up__';
              const isPriceDown = image.path === '__price_down__';
              if (activeLayer === 'Background' && (isPriceUp || isPriceDown)) {
                const hasSolidColorSelected = selectedPath === '__solid__' || selectedPath?.includes('__solid__');
                const overlayDisabled = !hasSolidColorSelected;
                const overlayReason = overlayDisabled ? 'Select solid color first' : reason;
                const swatchColor = selectedColors?.Background ?? SOLID_BG_DEFAULT_COLOR;
                // Check if this overlay is currently selected (encoded in path like __solid__+__price_up__)
                const overlayKey = isPriceUp ? '__price_up__' : '__price_down__';
                const overlaySelected = selectedPath?.includes(overlayKey) ?? false;
                return (
                  <motion.div
                    key={trait.id}
                    variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                    className={isGlowing ? 'trait-select-glow rounded-xl' : undefined}
                  >
                    <PriceOverlayCard
                      overlayType={isPriceUp ? 'up' : 'down'}
                      bgColor={swatchColor}
                      isSelected={overlaySelected}
                      isDisabled={overlayDisabled || !!disabled}
                      disabledReason={overlayReason}
                      onClick={() => {
                        if (overlayDisabled) return;
                        // Toggle overlay on/off
                        if (overlaySelected) {
                          // Remove overlay, keep solid color
                          selectLayer('Background', '__solid__');
                        } else {
                          // Add overlay to solid color
                          selectLayer('Background', `__solid__+${overlayKey}`);
                        }
                      }}
                    />
                  </motion.div>
                );
              }
              // Head, Mask, Eyes, Background (scene): show base + mouth under the trait
              const faceOverlayLayers: Array<typeof activeLayer> = ['Head', 'Mask', 'Eyes', 'Background'];
              const useBaseMouthCard = faceOverlayLayers.includes(activeLayer);

              return (
                <motion.div
                  key={trait.id}
                  variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                  className={`relative${isGlowing ? ' trait-select-glow rounded-xl' : ''}`}
                >
                  {useBaseMouthCard ? (
                    <LayerWithBaseMouthCard
                      image={image}
                      isSelected={!!isSelected}
                      isDisabled={!!disabled}
                      disabledReason={reason}
                      onClick={() => handleTraitClick(trait)}
                      pricing={lookupPricing(trait.name)}
                      isTop3={traitIsTop3}
                      renderBehindBase={image.path.toLowerCase().includes('extra_wings')}
                    />
                  ) : (
                    <ImageCard
                      image={image}
                      isSelected={!!isSelected}
                      isDisabled={!!disabled}
                      disabledReason={reason}
                      onClick={() => handleTraitClick(trait)}
                      pricing={lookupPricing(trait.name)}
                      isTop3={traitIsTop3}
                    />
                  )}
                </motion.div>
              );
            })}
          </motion.div>
      )}

      {/* Color picker and G2 panel on mobile are rendered in GeneratorMobileColorPanel (below the grid) */}

      {/* Empty state */}
      {!isBlocked && !isLoading && unifiedTraits.length === 0 && (
        <div
          className="p-8 rounded-xl text-center"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p className="text-muted">
            No traits available for this layer
          </p>
        </div>
      )}
    </div>
  );
}

export default TraitSelector;
