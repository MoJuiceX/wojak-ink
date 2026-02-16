/**
 * Preview Canvas Component
 *
 * Displays the composited Wojak avatar with loading states.
 * Features ambient pulsing glow behind the avatar.
 * Shows brief glow flash when character updates (Phase 2).
 *
 * IMPORTANT: The main preview must always show the full avatar centered
 * (object-contain). Do NOT add zoom, crop, or position changes for Beer Hat
 * or any other trait — that causes the avatar to shift and leaves empty space
 * below. Keep this behavior stable.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useGenerator } from '@/contexts/GeneratorContext';
import { isSelectionPathEmpty } from '@/types/generator';
import { skeletonPulseVariants } from '@/config/generatorAnimations';

interface PreviewCanvasProps {
  size?: number;
  showPlaceholder?: boolean;
  className?: string;
  /** When true, no background/checkerboard - parent provides it (for PreviewWithControls) */
  embedded?: boolean;
}

export function PreviewCanvas({
  size,
  showPlaceholder = true,
  className = '',
  embedded = false,
}: PreviewCanvasProps) {
  const { previewImage, isRendering, selectedLayers } = useGenerator();
  const prefersReducedMotion = useReducedMotion();
  const [showUpdateGlow, setShowUpdateGlow] = useState(false);
  const prevImageRef = useRef<string | null>(null);
  const [fadingOutImage, setFadingOutImage] = useState<string | null>(null);

  const basePath = selectedLayers.Base;
  const hasSelection = !isSelectionPathEmpty(basePath);

  // Show brief glow + crossfade when preview image changes
  useEffect(() => {
    if (previewImage && previewImage !== prevImageRef.current && !prefersReducedMotion) {
      // Set the old image to fade out behind the new one
      if (prevImageRef.current) {
        setFadingOutImage(prevImageRef.current);
      }
      queueMicrotask(() => setShowUpdateGlow(true));
      const timer = setTimeout(() => {
        setShowUpdateGlow(false);
        setFadingOutImage(null);
      }, 400);
      prevImageRef.current = previewImage;
      return () => clearTimeout(timer);
    }
    prevImageRef.current = previewImage;
  }, [previewImage, prefersReducedMotion]);

  // If size is provided, use fixed dimensions; otherwise rely on className for sizing
  const sizeStyles = size
    ? { width: size, height: size }
    : {};

  return (
    <div
      className={`relative overflow-hidden ${embedded ? '' : 'rounded-2xl'} ${className} ${showUpdateGlow ? 'generator-preview-canvas updated' : 'generator-preview-canvas'}`}
      style={{
        ...sizeStyles,
        aspectRatio: '1 / 1',
        background: embedded ? 'transparent' : 'var(--color-glass-bg)',
        border: 'none',
      }}
    >
      {/* Pulsing ambient glow behind avatar */}
      {hasSelection && !prefersReducedMotion && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(249, 115, 22, 0.4) 0%, rgba(249, 115, 22, 0.1) 40%, transparent 70%)',
            filter: 'blur(40px)',
            animation: 'pulseGlow 3s ease-in-out infinite',
            zIndex: 0,
          }}
        />
      )}

      {/* Preview image — full avatar, centered. Do not zoom/crop by trait (e.g. Beer Hat). */}
      {/* Fading-out previous image for crossfade */}
      {fadingOutImage && (
        <img
          src={fadingOutImage}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          style={{ zIndex: 1, opacity: 0, transition: 'opacity 150ms ease-out' }}
        />
      )}
      {previewImage && (
        <img
          key={previewImage}
          src={previewImage}
          alt="Wojak preview"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ zIndex: 2, opacity: fadingOutImage ? 1 : 1, transition: 'opacity 150ms ease-in' }}
        />
      )}

      {/* Placeholder when no selection */}
      {!hasSelection && showPlaceholder && !isRendering && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
          <div
            className="text-6xl mb-4 opacity-50"
            style={{ filter: 'grayscale(1)' }}
          >
            😐
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Select a base to start
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            or click Randomize for a surprise
          </p>
        </div>
      )}

      {/* Loading state */}
      {isRendering && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'var(--color-glass-bg)' }}
          variants={prefersReducedMotion ? undefined : skeletonPulseVariants}
          initial="initial"
          animate="animate"
        >
          <Loader2
            className="animate-spin"
            size={32}
            style={{ color: 'var(--color-brand-primary)' }}
          />
        </motion.div>
      )}

    </div>
  );
}

export default PreviewCanvas;
