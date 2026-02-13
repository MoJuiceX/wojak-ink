/**
 * Trait Selector Component
 *
 * Grid of trait cards for the active layer.
 * Renders MouthLayerSelector for mouth-related layers.
 */

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Ban } from 'lucide-react';
import { useLayout } from '@/hooks/useLayout';
import { useGenerator } from '@/contexts/GeneratorContext';
import { traitGridVariants, traitCardStaggerVariants } from '@/config/generatorAnimations';
import { getG2DefaultColor } from '@/config/g2DefaultColors';
import { getPreviewColorForLayeredFill, isLayerFill } from '@/utils/layeredTraitPreviewColors';
import { getDerivedColor, getFlagSvgDataUrl } from '@/services/canvasRenderer';
import { MouthLayerSelector } from './MouthLayerSelector';
import { G2TraitPanel } from './G2TraitPanel';
import { ColorPicker } from './ColorPicker';
import type { LayerImage } from '@/services/generatorService';
import type { UnifiedTrait } from '@/services/generatorService';
import { BASE_CLOTHES_MAP, DEFAULT_CLOTHES_PATH } from '@/config/layers';
import { BEER_HAT_COMPATIBLE_HEADS } from '@/lib/generatorTraitIds';

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

interface SolidColorBackgroundCardProps {
  color: string;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

function SolidColorBackgroundCard({ color, isSelected, isDisabled, disabledReason, onClick }: SolidColorBackgroundCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
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
      title={isDisabled && disabledReason ? disabledReason : 'Solid color — pick with color picker'}
    >
      <div
        className="relative w-full h-full rounded-lg overflow-hidden"
        style={{ backgroundColor: color }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs font-medium truncate"
        style={{
          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          color: 'white',
        }}
      >
        Solid color
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

interface LayerWithBaseMouthCardProps {
  image: LayerImage;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

/** Card for Head, Mask, Eyes, Background: base + mouth rendered under the trait. */
function LayerWithBaseMouthCard({ image, isSelected, isDisabled, disabledReason, onClick }: LayerWithBaseMouthCardProps) {
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
        <img
          src={image.path}
          alt={image.displayName}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
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

// ============ G2 Trait Card ============

interface G2TraitCardProps {
  trait: UnifiedTrait;
  isSelected: boolean;
  onClick: () => void;
  /** When true, render blue Tee between Base and Mouth (Head, Mask, Eyes) */
  needsClothesUnderlay?: boolean;
  /** When true, show badge that this is the under layer for Beer Hat */
  isBeerHatUnderlayer?: boolean;
  /** When set, show this image as the card preview (e.g. live preview so grid matches big preview) */
  livePreviewUrl?: string | null;
}

export function G2TraitCard({ trait, isSelected, onClick, needsClothesUnderlay, isBeerHatUnderlayer, livePreviewUrl }: G2TraitCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const basePath = '/assets/wojak-layers/YourWojak-layers';
  // Layered colorable (e.g. Ninja-turtle-fit, Military jacket): base + layers in draw order
  const layeredColorableLayers = trait.colorable && trait.layers?.length && trait.layers.some((l: { type: string }) => l.type === 'fill')
    ? [...trait.layers].filter((l: { visible?: boolean }) => l.visible !== false).sort((a: { pos: number }, b: { pos: number }) => a.pos - b.pos)
    : null;
  // Ninja-turtle-fit: fill3, outline2 under base; fill1, fill2, outline1 over base (matches canvas renderer)
  const isNinjaTurtleFit = trait.id === 'Clothes_Ninja-turtle-fit';
  const ninjaUnderBase = isNinjaTurtleFit && layeredColorableLayers ? layeredColorableLayers.filter((l: { pos: number }) => l.pos <= 1) : [];
  const ninjaOverBase = isNinjaTurtleFit && layeredColorableLayers ? layeredColorableLayers.filter((l: { pos: number }) => l.pos >= 2) : [];
  // Composite with layers: show base + all layers stacked (underBase, base, overBase)
  const compositeLayers = trait.composite && trait.layers?.length
    ? [...trait.layers].filter(l => l.visible !== false).sort((a, b) => a.pos - b.pos)
    : null;
  const underBase = compositeLayers?.filter(l => l.underBase) ?? [];
  const overBase = compositeLayers?.filter(l => !l.underBase) ?? [];
  const singleThumbnail = !compositeLayers && !layeredColorableLayers
    ? (trait.outlineFile ? `${basePath}/${trait.outlineFile}` : trait.layer0File ? `${basePath}/${trait.layer0File}` : '')
    : null;
  // Colorable single-fill (e.g. Sonic suit): show fill with default color + outline so preview looks correct
  const colorableSingleFill =
    !compositeLayers &&
    !layeredColorableLayers &&
    trait.colorable &&
    trait.fillFile &&
    trait.outlineFile &&
    (trait.defaultColor ?? trait.defaultColors?.[0]);
  // Colorable dual-fill from fillFiles (e.g. Suit: fill0 suit, fill1 tie/bow)
  const colorableDualFill =
    !compositeLayers &&
    !layeredColorableLayers &&
    trait.colorable &&
    (trait.fillFiles?.length ?? 0) >= 2 &&
    (trait.outlineFile || trait.outlineFiles?.[0]) &&
    ((trait.defaultColors?.length ?? 0) >= 2 || trait.defaultColor);

  return (
    <motion.button
      className="w-full aspect-square relative rounded-xl overflow-hidden p-1"
      style={{
        background: 'var(--generator-trait-card-bg)',
        border: isSelected
          ? '2px solid var(--generator-selected-color, #F97316)'
          : '1px solid var(--generator-trait-card-border)',
        boxShadow: isSelected
          ? '0 0 20px rgba(0, 212, 255, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s ease',
      }}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
    >
      <div className="relative w-full h-full rounded-lg overflow-hidden trait-card-image-bg">
        {livePreviewUrl ? (
          <img src={livePreviewUrl} alt={trait.name} className="absolute inset-0 w-full h-full object-contain" loading="lazy" />
        ) : isNinjaTurtleFit && ninjaUnderBase.length > 0 ? (
          <>
            {ninjaUnderBase.map((l: { key: string; file: string; type?: string }) =>
              isLayerFill(l) ? (
                <div key={l.key} className="absolute inset-0 w-full h-full" style={{ isolation: 'isolate' }}>
                  <img src={`${basePath}/${l.file}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{
                      background: getPreviewColorForLayeredFill(trait, l.key),
                      mixBlendMode: 'multiply',
                      pointerEvents: 'none',
                      maskImage: `url(${basePath}/${l.file})`,
                      WebkitMaskImage: `url(${basePath}/${l.file})`,
                      maskSize: 'cover',
                      WebkitMaskSize: 'cover',
                      maskPosition: 'center',
                      WebkitMaskPosition: 'center',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                    }}
                  />
                </div>
              ) : (
                <img key={l.key} src={`${basePath}/${l.file}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              )
            )}
            <img src={DEFAULT_BASE_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {needsClothesUnderlay && (
              <img src={DEFAULT_CLOTHES_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )}
            <img src={DEFAULT_MOUTH_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {ninjaOverBase.map((l: { key: string; file: string; type?: string }) =>
              isLayerFill(l) ? (
                <div key={l.key} className="absolute inset-0 w-full h-full" style={{ isolation: 'isolate' }}>
                  <img src={`${basePath}/${l.file}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{
                      background: getPreviewColorForLayeredFill(trait, l.key),
                      mixBlendMode: 'multiply',
                      pointerEvents: 'none',
                      maskImage: `url(${basePath}/${l.file})`,
                      WebkitMaskImage: `url(${basePath}/${l.file})`,
                      maskSize: 'cover',
                      WebkitMaskSize: 'cover',
                      maskPosition: 'center',
                      WebkitMaskPosition: 'center',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                    }}
                  />
                </div>
              ) : (
                <img key={l.key} src={`${basePath}/${l.file}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              )
            )}
          </>
        ) : layeredColorableLayers ? (
          <>
            <img src={DEFAULT_BASE_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {needsClothesUnderlay && (
              <img src={DEFAULT_CLOTHES_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )}
            <img src={DEFAULT_MOUTH_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {layeredColorableLayers.map((l: { key: string; file: string; type?: string }) =>
              isLayerFill(l) ? (
                <div key={l.key} className="absolute inset-0 w-full h-full" style={{ isolation: 'isolate' }}>
                  <img src={`${basePath}/${l.file}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{
                      background: getPreviewColorForLayeredFill(trait, l.key),
                      mixBlendMode: 'multiply',
                      pointerEvents: 'none',
                      maskImage: `url(${basePath}/${l.file})`,
                      WebkitMaskImage: `url(${basePath}/${l.file})`,
                      maskSize: 'cover',
                      WebkitMaskSize: 'cover',
                      maskPosition: 'center',
                      WebkitMaskPosition: 'center',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                    }}
                  />
                </div>
              ) : (
                <img key={l.key} src={`${basePath}/${l.file}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              )
            )}
          </>
        ) : compositeLayers ? (
          <>
            {underBase.map((l) => (
              <img key={l.key} src={`${basePath}/${l.file}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            ))}
            <img src={DEFAULT_BASE_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {needsClothesUnderlay && (
              <img src={DEFAULT_CLOTHES_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )}
            {overBase.map((l) => (
              <img key={l.key} src={`${basePath}/${l.file}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            ))}
            <img src={DEFAULT_MOUTH_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          </>
        ) : trait.id === 'Face-wear_MOG-Glasses' && trait.outlineFile ? (
          <>
            <img src={DEFAULT_BASE_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {needsClothesUnderlay && (
              <img src={DEFAULT_CLOTHES_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )}
            <img src={DEFAULT_MOUTH_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {/* MOG: default layer (rainbow) under outline */}
            <img
              src={`${basePath}/${trait.detailOptions?.find(d => d.name === 'Default (Rainbow)')?.file ?? 'Face-wear_MOG-Glasses_detail_default.png'}`}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <img src={`${basePath}/${trait.outlineFile}`} alt={trait.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          </>
        ) : trait.id === 'Clothes_Chia-farmer' ? (
          <>
            <img src={DEFAULT_BASE_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <img src={DEFAULT_MOUTH_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {/* Tee under layer */}
            <div className="absolute inset-0 w-full h-full" style={{ isolation: 'isolate' }}>
              <img src={`${basePath}/Clothes_Tee_fill.png`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div
                className="absolute inset-0 w-full h-full"
                style={{
                  background: getG2DefaultColor(trait.id, 'fill1', trait, '#2563EB'),
                  mixBlendMode: 'multiply',
                  pointerEvents: 'none',
                  maskImage: `url(${basePath}/Clothes_Tee_fill.png)`,
                  WebkitMaskImage: `url(${basePath}/Clothes_Tee_fill.png)`,
                  maskSize: 'cover',
                  WebkitMaskSize: 'cover',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                }}
              />
            </div>
            <img src={`${basePath}/Clothes_Tee_outline.png`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {/* Chia Farmer outfit */}
            <div className="absolute inset-0 w-full h-full" style={{ isolation: 'isolate' }}>
              <img src={`${basePath}/${trait.fillFile}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div
                className="absolute inset-0 w-full h-full"
                style={{
                  background: getG2DefaultColor(trait.id, 'fill0', trait, '#22c55e'),
                  mixBlendMode: 'multiply',
                  pointerEvents: 'none',
                  maskImage: `url(${basePath}/${trait.fillFile})`,
                  WebkitMaskImage: `url(${basePath}/${trait.fillFile})`,
                  maskSize: 'cover',
                  WebkitMaskSize: 'cover',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                }}
              />
            </div>
            <img src={`${basePath}/${trait.outlineFile}`} alt={trait.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          </>
        ) : trait.colorable && trait.fill1File && trait.fill2File && trait.outlineFile ? (
          <>
            <img src={DEFAULT_BASE_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {needsClothesUnderlay && (
              <img src={DEFAULT_CLOTHES_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )}
            <img src={DEFAULT_MOUTH_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {/* Super Saiyan: fill1 + fill2 */}
            <div className="absolute inset-0 w-full h-full" style={{ isolation: 'isolate' }}>
              <img src={`${basePath}/${trait.fill1File}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div
                className="absolute inset-0 w-full h-full"
                style={{
                  background: getG2DefaultColor(trait.id, 'fill1', trait, '#2563EB'),
                  mixBlendMode: 'multiply',
                  pointerEvents: 'none',
                  maskImage: `url(${basePath}/${trait.fill1File})`,
                  WebkitMaskImage: `url(${basePath}/${trait.fill1File})`,
                  maskSize: 'cover',
                  WebkitMaskSize: 'cover',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                }}
              />
            </div>
            <div className="absolute inset-0 w-full h-full" style={{ isolation: 'isolate' }}>
              <img src={`${basePath}/${trait.fill2File}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div
                className="absolute inset-0 w-full h-full"
                style={{
                  background: trait.id === 'Clothes_SWAT'
                    ? getDerivedColor(getG2DefaultColor(trait.id, 'fill1', trait, '#A020F0'), 'darker_shade', 10)
                    : getG2DefaultColor(trait.id, 'fill2', trait, '#f97316'),
                  mixBlendMode: 'multiply',
                  pointerEvents: 'none',
                  maskImage: `url(${basePath}/${trait.fill2File})`,
                  WebkitMaskImage: `url(${basePath}/${trait.fill2File})`,
                  maskSize: 'cover',
                  WebkitMaskSize: 'cover',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                }}
              />
            </div>
            {/* SWAT: always show detail1 (cig pack) under outline */}
            {trait.id === 'Clothes_SWAT' && trait.detailOptions?.[0]?.file && (
              <img src={`${basePath}/${trait.detailOptions[0].file}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )}
            <img src={`${basePath}/${trait.outlineFile}`} alt={trait.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          </>
        ) : trait.id === 'Face-wear_VR-headset' && trait.fillFiles && trait.fillFiles.length >= 4 && trait.outlineFile ? (
          <>
            <img src={DEFAULT_BASE_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {needsClothesUnderlay && (
              <img src={DEFAULT_CLOTHES_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )}
            <img src={DEFAULT_MOUTH_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {/* VR headset: fill0 = user color, fill1-3 = darker shade of fill0 */}
            {trait.fillFiles.map((file, i) => {
              const baseColor = getG2DefaultColor(trait.id, 'fill0', trait, '#FFFF00');
              const color = i === 0 ? baseColor : getDerivedColor(baseColor, 'darker_shade', 5);
              return (
                <div key={file} className="absolute inset-0 w-full h-full" style={{ isolation: 'isolate' }}>
                  <img src={`${basePath}/${file}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{
                      background: color,
                      mixBlendMode: 'multiply',
                      pointerEvents: 'none',
                      maskImage: `url(${basePath}/${file})`,
                      WebkitMaskImage: `url(${basePath}/${file})`,
                      maskSize: 'cover',
                      WebkitMaskSize: 'cover',
                      maskPosition: 'center',
                      WebkitMaskPosition: 'center',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                    }}
                  />
                </div>
              );
            })}
            <img src={`${basePath}/${trait.outlineFile}`} alt={trait.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          </>
        ) : colorableDualFill ? (
          <>
            <img src={DEFAULT_BASE_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {needsClothesUnderlay && (
              <img src={DEFAULT_CLOTHES_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )}
            <img src={DEFAULT_MOUTH_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {/* Suit: fill0 (suit) + fill1 (tie/bow) from fillFiles */}
            <div className="absolute inset-0 w-full h-full" style={{ isolation: 'isolate' }}>
              <img src={`${basePath}/${trait.fillFiles![0]}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div
                className="absolute inset-0 w-full h-full"
                style={{
                  background: getG2DefaultColor(trait.id, 'fill0', trait, trait.defaultColors?.[0] ?? '#171717'),
                  mixBlendMode: 'multiply',
                  pointerEvents: 'none',
                  maskImage: `url(${basePath}/${trait.fillFiles![0]})`,
                  WebkitMaskImage: `url(${basePath}/${trait.fillFiles![0]})`,
                  maskSize: 'cover',
                  WebkitMaskSize: 'cover',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                }}
              />
            </div>
            <div className="absolute inset-0 w-full h-full" style={{ isolation: 'isolate' }}>
              <img src={`${basePath}/${trait.fillFiles![1]}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div
                className="absolute inset-0 w-full h-full"
                style={{
                  background: getG2DefaultColor(trait.id, 'fill1', trait, trait.defaultColors?.[1] ?? '#2563EB'),
                  mixBlendMode: 'multiply',
                  pointerEvents: 'none',
                  maskImage: `url(${basePath}/${trait.fillFiles![1]})`,
                  WebkitMaskImage: `url(${basePath}/${trait.fillFiles![1]})`,
                  maskSize: 'cover',
                  WebkitMaskSize: 'cover',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                }}
              />
            </div>
            <img
              src={`${basePath}/${trait.outlineFile ?? trait.outlineFiles![0]}`}
              alt={trait.name}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          </>
        ) : trait.id === 'Head_Construction-Helmet' && trait.fillFile && trait.outlineFile ? (
          <>
            <img src={DEFAULT_BASE_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {needsClothesUnderlay && (
              <img src={DEFAULT_CLOTHES_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )}
            <img src={DEFAULT_MOUTH_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {/* Fill with default color */}
            <div className="absolute inset-0 w-full h-full" style={{ isolation: 'isolate' }}>
              <img src={`${basePath}/${trait.fillFile}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div
                className="absolute inset-0 w-full h-full"
                style={{
                  background: getG2DefaultColor(trait.id, 'fill', trait, trait.defaultColor ?? '#FFFF00'),
                  mixBlendMode: 'multiply',
                  pointerEvents: 'none',
                  maskImage: `url(${basePath}/${trait.fillFile})`,
                  WebkitMaskImage: `url(${basePath}/${trait.fillFile})`,
                  maskSize: 'cover',
                  WebkitMaskSize: 'cover',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                }}
              />
            </div>
            <img src={`${basePath}/${trait.outlineFile}`} alt={trait.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {/* Default details: Chia logo ON + cigarette pack (cig-pack.png) */}
            {(() => {
              const chiaFile = trait.detailOptions?.find(d => d.file.includes('chia-logo'))?.file;
              const cigFile = trait.detailOptions?.find(d => d.file.endsWith('cig-pack.png'))?.file ?? 'Head_Construction-Helmet_detail_cig-pack.png';
              return (
                <>
                  {chiaFile && <img src={`${basePath}/${chiaFile}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />}
                  <img src={`${basePath}/${cigFile}`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                </>
              );
            })()}
          </>
        ) : trait.id === 'Clothes_Astronaut' && colorableSingleFill ? (
          <>
            <img src={DEFAULT_BASE_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <img src={DEFAULT_MOUTH_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {/* White suit (default) */}
            <img src={`${basePath}/Clothes_Astronaut_default.png`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {/* Coin logo (CAT) — circle at 35.5%,91.2% r=6.8% of 1000x1000 */}
            <div className="absolute" style={{ left: '28.7%', top: '84.4%', width: '13.6%', height: '13.6%', borderRadius: '50%', overflow: 'hidden' }}>
              <img src="/assets/wojak-layers/CHIA_coin_logos/CAT.webp" alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
            {/* Frame overlays (logo frame + flag frame) */}
            <img src={`${basePath}/Clothes_Astronaut_detail1.1.png`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {/* US flag — rect at 62.6%,86.1% w=13.4% h=9.2% */}
            <div className="absolute" style={{ left: '62.6%', top: '86.1%', width: '13.4%', height: '9.2%', overflow: 'hidden', borderRadius: '2px' }}>
              <img src={getFlagSvgDataUrl('us', 134, 92)} alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <img src={`${basePath}/Clothes_Astronaut_detail2.2.png`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <img src={`${basePath}/Clothes_Astronaut_outline.png`} alt={trait.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          </>
        ) : colorableSingleFill ? (
          <>
            <img src={DEFAULT_BASE_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {needsClothesUnderlay && (
              <img src={DEFAULT_CLOTHES_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )}
            <img src={DEFAULT_MOUTH_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {/* Fill with default color only; mask overlay to fill alpha so no background tint, base face shows through */}
            <div className="absolute inset-0 w-full h-full" style={{ isolation: 'isolate' }}>
              <img
                src={`${basePath}/${trait.fillFile}`}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div
                className="absolute inset-0 w-full h-full"
                style={{
                  background: getG2DefaultColor(trait.id, 'fill', trait, trait.defaultColor ?? trait.defaultColors?.[0] ?? '#2563EB'),
                  mixBlendMode: 'multiply',
                  pointerEvents: 'none',
                  maskImage: `url(${basePath}/${trait.fillFile})`,
                  WebkitMaskImage: `url(${basePath}/${trait.fillFile})`,
                  maskSize: 'cover',
                  WebkitMaskSize: 'cover',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                }}
              />
            </div>
            <img src={`${basePath}/${trait.outlineFile}`} alt={trait.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          </>
        ) : singleThumbnail ? (
          <>
            <img src={DEFAULT_BASE_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {needsClothesUnderlay && (
              <img src={DEFAULT_CLOTHES_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )}
            <img src={DEFAULT_MOUTH_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <img src={singleThumbnail} alt={trait.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          </>
        ) : (
          <>
            {/* Fallback: always show base + mouth + any trait image we can find */}
            <img src={DEFAULT_BASE_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {needsClothesUnderlay && (
              <img src={DEFAULT_CLOTHES_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )}
            <img src={DEFAULT_MOUTH_PATH} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {(() => {
              const fallbackSrc =
                trait.outlineFile ? `${basePath}/${trait.outlineFile}` :
                trait.layer0File ? `${basePath}/${trait.layer0File}` :
                trait.fillFile ? `${basePath}/${trait.fillFile}` :
                trait.layers?.[0]?.file ? `${basePath}/${trait.layers[0].file}` : null;
              return fallbackSrc ? <img src={fallbackSrc} alt={trait.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" /> : null;
            })()}
          </>
        )}
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
      {/* Selected check */}
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
    selectedColors,
    setColor,
    setG2Color,
    setG2Detail,
    setBeerHatEditFocus,
    g2Selections,
    beerHatCardThumbnailUrl,
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
  const { isDesktop } = useLayout();
  const prefersReducedMotion = useReducedMotion();

  const [, setImages] = useState<LayerImage[]>([]);
  const [unifiedTraits, setUnifiedTraits] = useState<UnifiedTrait[]>([]);
  const [imagesForLayer, setImagesForLayer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if this is a mouth layer (must be before any conditional returns but after hooks)
  const isMouthLayer = activeLayer === 'MouthBase' || activeLayer === 'MouthItem' || activeLayer === 'FacialHair';

  const selectedPath = selectedLayers[activeLayer];
  const g2Sel = g2Selections[activeLayer];
  const isBlocked = isLayerDisabled(activeLayer);

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
      .then(([imgs, traits]) => {
        setImages(imgs);
        setUnifiedTraits(traits);
        setImagesForLayer(activeLayer);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load layer images:', err);
        setImages([]);
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

  // Layers that cannot be deselected (only switched to another option)
  const nonDeselectableLayers = ['Base', 'Clothes', 'MouthBase'];
  const canDeselect = !nonDeselectableLayers.includes(activeLayer);

  const handleTraitClick = (trait: UnifiedTrait) => {
    if (isBlocked || isOptionDisabled(activeLayer, trait.name)) return;

    const isG2Selected = g2Sel?.traitId === trait.id;
    const isG1Selected = trait.g1Path && (selectedPath === trait.g1Path || (selectedPath != null && trait.g1Variants?.includes(selectedPath)));

    // Beer Hat special rules (Head layer)
    if (activeLayer === 'Head' && g2Sel?.traitId === 'Head_Beer-Hat') {
      if (trait.id === 'Head_Beer-Hat') {
        setBeerHatEditFocus('beer');
        return;
      }
      if (BEER_HAT_COMPATIBLE_HEADS.includes(trait.id)) {
        const isCurrentUnderlayer = g2Sel.beerHatUnderlayer === trait.id;
        if (isCurrentUnderlayer) {
          setBeerHatEditFocus('underlayer');
          return;
        }
        const defaultColors: Record<string, string> =
          trait.id === 'Head_viking-helmet'
            ? { fill1: getG2DefaultColor(trait.id, 'fill1', trait, '#404040') }
            : trait.id === 'Head_Cap'
              ? { fill: getG2DefaultColor(trait.id, 'fill', trait, '#228B22') }
              : {};
        setG2Detail(activeLayer, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, trait.id, { traitId: trait.id, g2Category: 'Head', colors: defaultColors }, 'underlayer');
        return;
      }
      // Incompatible head: replace Beer Hat with this head
      const needsG2Panel = trait.colorable || (trait.detailOptions && trait.detailOptions.length > 0);
      if ((trait.source === 'both' || trait.source === 'g2') && needsG2Panel) {
        selectG2Layer(activeLayer, trait);
      } else if (trait.g1Path) {
        selectLayer(activeLayer, trait.g1Path);
      } else {
        selectG2Layer(activeLayer, trait);
      }
      return;
    }

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

      {/* Empty state when no traits for layer */}
      {!isBlocked && unifiedTraits.length === 0 && (
        <div
          className="p-6 rounded-xl text-center"
          style={{
            background: 'var(--color-glass-bg)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            No options for this layer
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
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
                  isSelected={!selectedPath || selectedPath === '' || selectedPath === 'None'}
                  onClick={handleClearSelection}
                />
              </motion.div>
            )}
            {unifiedTraits.map((trait) => {
              const disabled = isOptionDisabled(activeLayer, trait.name);
              const reason = disabled ? getOptionDisabledReason(activeLayer, trait.name) : null;
              const isSelected =
                g2Sel?.traitId === trait.id ||
                (!!trait.g1Path && (selectedPath === trait.g1Path || (selectedPath != null && trait.g1Variants?.includes(selectedPath))));

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
                  >
                    <G2TraitCard
                      trait={trait}
                      isSelected={!!isSelected}
                      onClick={() => handleTraitClick(trait)}
                      needsClothesUnderlay={['Head', 'Mask', 'Eyes'].includes(activeLayer)}
                      isBeerHatUnderlayer={activeLayer === 'Head' && g2Sel?.traitId === 'Head_Beer-Hat' && g2Sel.beerHatUnderlayer === trait.id}
                      livePreviewUrl={beerHatCardPreviewUrl}
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
                  >
                    <BaseImageCard
                      image={image}
                      isSelected={!!isSelected}
                      isDisabled={!!disabled}
                      disabledReason={reason}
                      onClick={() => handleTraitClick(trait)}
                    />
                  </motion.div>
                );
              }
              if (activeLayer === 'Clothes') {
                return (
                  <motion.div
                    key={trait.id}
                    variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                    className="relative"
                  >
                    <ClothesImageCard
                      image={image}
                      isSelected={!!isSelected}
                      isDisabled={!!disabled}
                      disabledReason={reason}
                      onClick={() => handleTraitClick(trait)}
                    />
                  </motion.div>
                );
              }
              // Background Solid color: show color swatch, not image
              const isSolidBg = image.path === '__solid__' || image.path?.includes('__solid__');
              if (activeLayer === 'Background' && isSolidBg) {
                const swatchColor = selectedColors?.Background ?? '#1a1a2e';
                return (
                  <motion.div
                    key={trait.id}
                    variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
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
              // Head, Mask, Eyes, Background (scene): show base + mouth under the trait
              const faceOverlayLayers: Array<typeof activeLayer> = ['Head', 'Mask', 'Eyes', 'Background'];
              const useBaseMouthCard = faceOverlayLayers.includes(activeLayer);

              return (
                <motion.div
                  key={trait.id}
                  variants={prefersReducedMotion ? undefined : traitCardStaggerVariants}
                  className="relative"
                >
                  {useBaseMouthCard ? (
                    <LayerWithBaseMouthCard
                      image={image}
                      isSelected={!!isSelected}
                      isDisabled={!!disabled}
                      disabledReason={reason}
                      onClick={() => handleTraitClick(trait)}
                    />
                  ) : (
                    <ImageCard
                      image={image}
                      isSelected={!!isSelected}
                      isDisabled={!!disabled}
                      disabledReason={reason}
                      onClick={() => handleTraitClick(trait)}
                    />
                  )}
                </motion.div>
              );
            })}
          </motion.div>
      )}

      {/* Phase 2 color picker — below trait grid on mobile only; on desktop it lives in the right column */}
      {!isDesktop && !isBlocked && (selectedPath || g2Sel) && (() => {
        // For G2 traits: use setG2Color with the correct fill slot
        if (g2Sel) {
          const g2Trait = unifiedTraits.find(t => t.id === g2Sel.traitId);
          const slot = g2Trait?.id === 'Clothes_Suit'
            ? (g2Sel?.activeColorSlot ?? 'fill0')
            : (g2Trait?.fillFile ? 'fill' : g2Trait?.fill1File ? 'fill1' : g2Trait?.fillFiles ? 'fill0' : (g2Trait?.layers && g2Trait?.colorable ? 'fill0' : null));
          const isColorable = g2Trait?.colorable && slot;
          const defColor = g2Sel.traitId === 'Clothes_Suit' && g2Trait?.defaultColors
            ? (slot === 'fill0' ? g2Trait.defaultColors[0] : g2Trait.defaultColors[1])
            : (g2Trait?.defaultColor || (g2Sel.traitId === 'Clothes_Astronaut' ? '#FFFFFF' : undefined));
          return (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <ColorPicker
                selectedColor={g2Sel.colors?.[slot ?? 'fill'] || '#FFFFFF'}
                onColorChange={(color) => slot && setG2Color(activeLayer, slot, color)}
                disabled={!isColorable}
                defaultColor={isColorable ? defColor : undefined}
              />
            </div>
          );
        }
        // For G1 traits: use setColor (Background Solid color uses dark default)
        const isBgSolid = activeLayer === 'Background' && (selectedPath === '__solid__' || selectedPath?.includes('__solid__'));
        return (
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <ColorPicker
              selectedColor={selectedColors?.[activeLayer] || (isBgSolid ? '#1a1a2e' : '#FFFFFF')}
              onColorChange={(color) => setColor(activeLayer, color)}
            />
          </div>
        );
      })()}

      {/* G2 Customization Panel — on mobile only; on desktop it lives in the right column */}
      {!isDesktop && !isBlocked && g2Sel && (
        <G2TraitPanel />
      )}

      {/* Empty state */}
      {!isBlocked && !isLoading && unifiedTraits.length === 0 && (
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
