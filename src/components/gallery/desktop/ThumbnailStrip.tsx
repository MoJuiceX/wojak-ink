/**
 * ThumbnailStrip Component
 *
 * Vertical thumbnail navigation strip for desktop explorer panel.
 * - Shows 5 visible thumbnails centered on current
 * - Spring animation for scrolling
 * - Orange glow highlight on current thumbnail
 * - Keyboard accessible with arrow navigation
 */

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NFT } from '@/types/nft';
import { DESKTOP_LAYOUT } from '@/config/desktopLayout';
import { DESKTOP_ANIMATIONS } from '@/config/desktopAnimations';

interface ThumbnailStripProps {
  nfts: NFT[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  visibleCount?: number;
}

export function ThumbnailStrip({
  nfts,
  currentIndex,
  onIndexChange,
  visibleCount = 5,
}: ThumbnailStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { panel } = DESKTOP_LAYOUT;
  const { thumbnailStrip } = DESKTOP_ANIMATIONS;

  // Calculate which thumbnails to show
  const visibleRange = useMemo(() => {
    const halfVisible = Math.floor(visibleCount / 2);
    let start = currentIndex - halfVisible;
    let end = currentIndex + halfVisible;

    // Adjust for edges
    if (start < 0) {
      start = 0;
      end = Math.min(visibleCount - 1, nfts.length - 1);
    }
    if (end >= nfts.length) {
      end = nfts.length - 1;
      start = Math.max(0, end - visibleCount + 1);
    }

    return { start, end };
  }, [currentIndex, visibleCount, nfts.length]);

  // Get visible thumbnails with their distances from current
  const visibleThumbnails = useMemo(() => {
    const items = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      items.push({
        nft: nfts[i],
        index: i,
        distance: Math.abs(i - currentIndex),
      });
    }
    return items;
  }, [nfts, visibleRange, currentIndex]);

  // Handle thumbnail click
  const handleThumbnailClick = useCallback(
    (index: number) => {
      if (index !== currentIndex) {
        onIndexChange(index);
      }
    },
    [currentIndex, onIndexChange]
  );

  // Keyboard navigation within strip
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowUp' && currentIndex > 0) {
        e.preventDefault();
        onIndexChange(currentIndex - 1);
      } else if (e.key === 'ArrowDown' && currentIndex < nfts.length - 1) {
        e.preventDefault();
        onIndexChange(currentIndex + 1);
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, nfts.length, onIndexChange]);

  // Calculate strip height for animation
  const stripHeight = visibleCount * (panel.thumbnailSize + panel.thumbnailGap) - panel.thumbnailGap;

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center"
      style={{
        width: panel.thumbnailStripWidth,
        padding: `${panel.thumbnailGap}px`,
      }}
      role="listbox"
      aria-label="NFT thumbnail navigation"
      aria-activedescendant={`thumbnail-${currentIndex}`}
      tabIndex={0}
    >
      <div
        className="relative"
        style={{ height: stripHeight }}
      >
        <AnimatePresence mode="popLayout">
          {visibleThumbnails.map(({ nft, index, distance }) => {
            const isCurrent = index === currentIndex;
            const isAdjacent = distance === 1;
            const isFar = distance >= 2;

            // Calculate opacity based on distance
            const opacity = isCurrent ? 1 : isAdjacent ? 0.85 : 0.5;

            // Calculate vertical position
            const positionInList = index - visibleRange.start;
            const yPosition = positionInList * (panel.thumbnailSize + panel.thumbnailGap);

            return (
              <motion.button
                type="button"
                key={nft.id}
                id={`thumbnail-${index}`}
                className="absolute left-0 right-0 rounded-lg overflow-hidden focus:outline-none focus-visible:ring-2"
                style={{
                  width: panel.thumbnailSize,
                  height: panel.thumbnailSize,
                  border: isCurrent
                    ? '2px solid var(--color-primary)'
                    : '1px solid var(--color-border)',
                  boxShadow: isCurrent
                    ? '0 0 12px rgba(255, 107, 0, 0.4)'
                    : 'none',
                  outlineColor: 'var(--color-primary)',
                }}
                role="option"
                aria-selected={isCurrent}
                initial={{ opacity: 0, y: yPosition }}
                animate={{
                  opacity,
                  y: yPosition,
                  scale: 1,
                }}
                exit={{ opacity: 0 }}
                transition={thumbnailStrip.scroll}
                whileHover={{
                  opacity: isFar ? 0.8 : 1,
                  borderColor: isCurrent
                    ? 'var(--color-primary)'
                    : 'rgba(255, 107, 0, 0.5)',
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleThumbnailClick(index)}
              >
                <img
                  src={nft.thumbnailUrl}
                  alt={nft.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

    </div>
  );
}

export default ThumbnailStrip;
