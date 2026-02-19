/**
 * DesktopNFTImage Component
 *
 * Large NFT image display for desktop explorer panel.
 * - Crossfade transitions between images
 * - Optional directional hints
 * - Loading states with blur placeholder
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageOff, RefreshCw } from 'lucide-react';
import type { NFT } from '@/types/nft';
import { DESKTOP_ANIMATIONS } from '@/config/desktopAnimations';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

interface DesktopNFTImageProps {
  nft: NFT;
  direction?: 'forward' | 'backward' | null;
  onError?: () => void;
  onRetry?: () => void;
}

export function DesktopNFTImage({
  nft,
  direction = null,
  onError,
  onRetry,
}: DesktopNFTImageProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { imageCrossfade, imageDirectional, reducedMotion } = DESKTOP_ANIMATIONS;

  // Reset states when NFT changes
  useEffect(() => {
    queueMicrotask(() => {
      setImageLoaded(false);
      setHasError(false);
    });
  }, [nft.id]);

  const handleLoad = () => {
    setImageLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setImageLoaded(true);
    onError?.();
  };

  const handleRetry = () => {
    setHasError(false);
    setImageLoaded(false);
    onRetry?.();
  };

  // Determine animation variants based on direction and reduced motion
  const getVariants = () => {
    if (prefersReducedMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: reducedMotion.imageCrossfade.transition,
      };
    }

    if (direction && imageDirectional[direction]) {
      return {
        ...imageDirectional[direction],
        transition: imageDirectional.transition,
      };
    }

    return {
      ...imageCrossfade,
      transition: imageCrossfade.transition,
    };
  };

  const variants = getVariants();

  return (
    <div
      className="relative w-full flex items-center justify-center"
      style={{
        minHeight: 300,
        maxHeight: '50vh',
        padding: 16,
      }}
    >
      <div
        className="relative w-full h-full flex items-center justify-center rounded-xl overflow-hidden"
        style={{
          aspectRatio: '1 / 1',
          maxHeight: '100%',
          background: 'var(--color-elevated)',
        }}
      >
        <AnimatePresence mode="wait">
          {/* Loading blur placeholder */}
          {!imageLoaded && !hasError && (
            <motion.div
              key={`loading-${nft.id}`}
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {nft.blurDataUrl ? (
                <img
                  src={nft.blurDataUrl}
                  alt="Loading placeholder"
                  className="w-full h-full object-cover"
                  style={{ filter: 'blur(20px)' }}
                />
              ) : (
                <div
                  className="w-full h-full animate-pulse"
                  style={{ background: 'var(--color-surface)' }}
                />
              )}
            </motion.div>
          )}

          {/* Error state */}
          {hasError && (
            <motion.div
              key={`error-${nft.id}`}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ImageOff
                size={48}
                style={{ color: 'var(--color-text-muted)' }}
              />
              <p
                className="text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Failed to load image
              </p>
              {onRetry && (
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                  onClick={handleRetry}
                >
                  <RefreshCw size={16} />
                  Retry
                </button>
              )}
            </motion.div>
          )}

          {/* Main image */}
          {!hasError && (
            <motion.img
              key={nft.id}
              src={nft.imageUrl}
              alt={nft.name}
              className="w-full h-full object-contain"
              style={{
                opacity: imageLoaded ? 1 : 0,
              }}
              initial={variants.initial}
              animate={imageLoaded ? variants.animate : variants.initial}
              exit={variants.exit}
              transition={variants.transition}
              onLoad={handleLoad}
              onError={handleError}
              draggable={false}
            />
          )}
        </AnimatePresence>

        {/* Hover brightness effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        />
      </div>
    </div>
  );
}

export default DesktopNFTImage;
