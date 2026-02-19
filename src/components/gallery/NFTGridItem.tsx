/**
 * NFT Grid Item Component
 *
 * Individual NFT thumbnail in the gallery grid with:
 * - Staggered cascade reveal animation
 * - Hover preloading for full-size image
 * - Glowing border effect on hover
 * - 3D transform hover effect
 * - Optimized rendering with GPU acceleration
 */

import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useHoverPreload } from '@/hooks/useImagePreloader';
import { imagePreloader } from '@/services/imagePreloader';
import { nftGridItemVariants } from '@/config/galleryAnimations';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import type { NFT } from '@/types/nft';

interface NFTGridItemProps {
  nft: NFT;
  index: number;
  onClick: (nftId: string) => void;
  eagerLoad?: boolean;
}

export const NFTGridItem = memo(function NFTGridItem({
  nft,
  index,
  onClick,
  eagerLoad = false,
}: NFTGridItemProps) {
  const [imageLoaded, setImageLoaded] = useState(() => imagePreloader.isLoaded(nft.thumbnailUrl));
  const [imageError, setImageError] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Preload full image on hover (for when user opens explorer)
  const { onMouseEnter: preloadEnter, onMouseLeave: preloadLeave } = useHoverPreload(nft.imageUrl);

  const handleClick = useCallback(() => {
    onClick(nft.id);
  }, [onClick, nft.id]);

  const handleLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setImageError(true);
    setImageLoaded(true);
  }, []);

  // Snappy hover animation matching character cards
  const hoverAnimation = prefersReducedMotion
    ? {}
    : {
        y: -8,
        scale: 1.02,
        zIndex: 10,
        transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
      };

  // Tap animation for mobile touch feedback
  const tapAnimation = prefersReducedMotion
    ? {}
    : {
        scale: 0.95,
        boxShadow: '0 0 0 3px rgba(249, 115, 22, 0.5)',
      };

  return (
    <motion.button
      className={`nft-grid-item nft-card rarity-${nft.rarityTier || 'common'} group relative aspect-square overflow-hidden`}
      variants={prefersReducedMotion ? undefined : nftGridItemVariants}
      whileHover={hoverAnimation}
      whileTap={tapAnimation}
      onClick={handleClick}
      onMouseEnter={preloadEnter}
      onMouseLeave={preloadLeave}
      data-preload-index={index}
    >
      {/* Loading placeholder */}
      {!imageLoaded && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: 'rgba(255, 255, 255, 0.03)' }}
        />
      )}

      {/* Error state */}
      {imageError && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'var(--color-surface)' }}
        >
          <span
            className="text-xs text-muted"
          >
            Error
          </span>
        </div>
      )}

      {/* Image */}
      {!imageError && (
        <img
          src={nft.thumbnailUrl}
          alt={nft.name}
          className="w-full h-full object-cover"
          style={{ opacity: imageLoaded ? 1 : 0 }}
          loading={eagerLoad ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* Name overlay - appears on hover */}
      <div className="absolute bottom-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-75">
        {/* Blur background layer */}
        <div
          className="absolute inset-0 -m-1"
          style={{
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            borderRadius: 8,
            background:
              'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.15) 0%, transparent 70%)',
            mask: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
            WebkitMask:
              'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          }}
        />
        {/* Text layer */}
        <span
          className="relative text-xs font-medium truncate"
          style={{
            color: 'white',
            textShadow:
              '0 1px 4px rgba(0, 0, 0, 0.7), 0 0 8px rgba(0, 0, 0, 0.5)',
          }}
        >
          {nft.name}
        </span>
      </div>
    </motion.button>
  );
});

export default NFTGridItem;
