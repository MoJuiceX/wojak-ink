/**
 * SwipeableNFTImage Component
 *
 * Swipeable image carousel for NFT exploration.
 * Supports drag gestures and edge tap navigation.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { NFT } from '@/types/nft';
import { GALLERY_ANIMATIONS, swipeEnterVariants } from '@/config/galleryAnimations';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

interface SwipeableNFTImageProps {
  nfts: NFT[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onTapCenter?: () => void;
  showSwipeHint?: boolean;
  onDismissHint?: () => void;
}

export function SwipeableNFTImage({
  nfts,
  currentIndex,
  onIndexChange,
  onTapCenter,
  showSwipeHint = false,
  onDismissHint,
}: SwipeableNFTImageProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [direction, setDirection] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  const currentNft = nfts[currentIndex];
  const canGoNext = currentIndex < nfts.length - 1;
  const canGoPrev = currentIndex > 0;

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;
      const threshold = GALLERY_ANIMATIONS.swipe.threshold;

      // Dismiss swipe hint on first swipe
      if (showSwipeHint && onDismissHint) {
        onDismissHint();
      }

      // Check if swipe meets threshold
      const swipedRight =
        offset.x > window.innerWidth * threshold.distance ||
        velocity.x > threshold.velocity;
      const swipedLeft =
        offset.x < -window.innerWidth * threshold.distance ||
        velocity.x < -threshold.velocity;

      if (swipedLeft && canGoNext) {
        setDirection(1);
        setImageLoaded(false);
        onIndexChange(currentIndex + 1);
      } else if (swipedRight && canGoPrev) {
        setDirection(-1);
        setImageLoaded(false);
        onIndexChange(currentIndex - 1);
      }
    },
    [currentIndex, canGoNext, canGoPrev, onIndexChange, showSwipeHint, onDismissHint]
  );

  const handleEdgeTap = useCallback(
    (side: 'left' | 'right') => {
      if (showSwipeHint && onDismissHint) {
        onDismissHint();
      }

      if (side === 'left' && canGoPrev) {
        setDirection(-1);
        setImageLoaded(false);
        onIndexChange(currentIndex - 1);
      } else if (side === 'right' && canGoNext) {
        setDirection(1);
        setImageLoaded(false);
        onIndexChange(currentIndex + 1);
      }
    },
    [currentIndex, canGoNext, canGoPrev, onIndexChange, showSwipeHint, onDismissHint]
  );

  if (!currentNft) return null;

  return (
    <div className="relative w-full aspect-square max-w-[80vw] mx-auto">
      {/* Image container with drag */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentNft.id}
          className="absolute inset-0 rounded-xl overflow-hidden"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
          custom={direction}
          variants={prefersReducedMotion ? undefined : swipeEnterVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          drag={prefersReducedMotion ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          {/* Blur placeholder */}
          {!imageLoaded && (
            <div
              className="absolute inset-0 animate-pulse"
              style={{
                background: 'var(--color-surface)',
                backgroundImage: currentNft.blurDataUrl
                  ? `url(${currentNft.blurDataUrl})`
                  : undefined,
                backgroundSize: 'cover',
                filter: 'blur(20px)',
              }}
            />
          )}

          {/* Main image */}
          <img
            src={currentNft.imageUrl}
            alt={currentNft.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>

      {/* Edge tap zones */}
      <button
        className="absolute left-0 top-0 bottom-0 w-[15%] z-10 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-start pl-2"
        onClick={() => handleEdgeTap('left')}
        disabled={!canGoPrev}
        aria-label="Previous NFT"
      >
        {canGoPrev && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-secondary"
            style={{
              background: 'var(--color-surface)',
            }}
          >
            <ChevronLeft size={20} />
          </div>
        )}
      </button>

      <button
        className="absolute right-0 top-0 bottom-0 w-[15%] z-10 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-end pr-2"
        onClick={() => handleEdgeTap('right')}
        disabled={!canGoNext}
        aria-label="Next NFT"
      >
        {canGoNext && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-secondary"
            style={{
              background: 'var(--color-surface)',
            }}
          >
            <ChevronRight size={20} />
          </div>
        )}
      </button>

      {/* Center tap zone */}
      {onTapCenter && (
        <button
          className="absolute left-[15%] right-[15%] top-0 bottom-0 z-10"
          onClick={onTapCenter}
          aria-label="Toggle info"
        />
      )}

      {/* Swipe hint overlay */}
      <AnimatePresence>
        {showSwipeHint && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-between px-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex items-center gap-2 text-secondary"
              animate={{
                x: [0, -10, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <ChevronLeft size={32} />
            </motion.div>

            <div
              className="px-4 py-2 rounded-full text-sm text-secondary"
              style={{
                background: 'var(--color-surface)',
              }}
            >
              Swipe to explore
            </div>

            <motion.div
              className="flex items-center gap-2 text-secondary"
              animate={{
                x: [0, 10, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <ChevronRight size={32} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SwipeableNFTImage;
