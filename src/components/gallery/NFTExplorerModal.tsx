/**
 * NFTExplorerModal Component
 *
 * Full-screen modal for exploring NFTs with swipe navigation.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2 } from 'lucide-react';
import { useGallery } from '@/hooks/useGallery';
import { GALLERY_ANIMATIONS } from '@/config/galleryAnimations';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { ExplorerTopBar } from './ExplorerTopBar';
import { FilterPills } from './FilterPills';
import { SwipeableNFTImage } from './SwipeableNFTImage';
import { NFTInfoCard } from './NFTInfoCard';

interface NFTExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NFTExplorerModal({ isOpen, onClose }: NFTExplorerModalProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  const {
    filteredNfts,
    currentNftIndex,
    currentNft,
    sortMode,
    filterMode,
    listedCount,
    activeInfoTab,
    hasSeenSwipeHint,
    navigateToNft,
    setSortMode,
    setFilterMode,
    setActiveInfoTab,
    shuffleToRandom,
    dismissSwipeHint,
  } = useGallery();

  const modalAnimations = prefersReducedMotion
    ? GALLERY_ANIMATIONS.reducedMotion.modal
    : GALLERY_ANIMATIONS.modal;

  const overlayAnimation = 'overlay' in modalAnimations
    ? modalAnimations.overlay
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  const contentAnimation = modalAnimations.content;

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Escape':
          if (isImageExpanded) {
            setIsImageExpanded(false);
          } else {
            onClose();
          }
          break;
        case 'ArrowLeft':
          if (currentNftIndex > 0) {
            navigateToNft(currentNftIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (currentNftIndex < filteredNfts.length - 1) {
            navigateToNft(currentNftIndex + 1);
          }
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isImageExpanded, currentNftIndex, filteredNfts.length, navigateToNft, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOpenExternal = useCallback(() => {
    if (currentNft?.listing?.listingUrl) {
      window.open(currentNft.listing.listingUrl, '_blank', 'noopener,noreferrer');
    }
  }, [currentNft]);

  if (!currentNft) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col"
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
          {...overlayAnimation}
        >
          {/* Top bar */}
          <ExplorerTopBar
            sortMode={sortMode}
            filterMode={filterMode}
            onSortModeChange={setSortMode}
            onShuffle={shuffleToRandom}
            onExpand={() => setIsImageExpanded(true)}
            onClose={onClose}
          />

          {/* Main content area - consistent 12px gaps */}
          <motion.div
            className="flex-1 flex flex-col gap-3 overflow-hidden pt-3"
            {...contentAnimation}
          >
            {/* Fixed top section: Image + Filter pills */}
            <div className="flex-shrink-0 flex flex-col gap-3">
              {/* Swipeable image */}
              <div className="flex items-center justify-center px-4">
                <SwipeableNFTImage
                  nfts={filteredNfts}
                  currentIndex={currentNftIndex}
                  onIndexChange={navigateToNft}
                  showSwipeHint={!hasSeenSwipeHint}
                  onDismissHint={dismissSwipeHint}
                />
              </div>

              {/* Filter pills */}
              <div className="px-4 flex justify-center">
                <FilterPills
                  activeFilter={filterMode}
                  onFilterChange={setFilterMode}
                  listedCount={listedCount}
                />
              </div>
            </div>

            {/* Info card - expands downward */}
            <div
              className="flex-1 px-4 overflow-y-auto"
              style={{
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
              }}
            >
              <NFTInfoCard
                nft={currentNft}
                activeTab={activeInfoTab}
                onTabChange={setActiveInfoTab}
                onOpenExternal={handleOpenExternal}
              />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Fullscreen image overlay */}
      {isImageExpanded && currentNft && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-[200]"
          style={{
            background: 'rgba(0, 0, 0, 0.95)',
            cursor: 'zoom-out',
          }}
          onClick={() => setIsImageExpanded(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Close button */}
          <motion.button
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-xl transition-colors"
            style={{
              background: 'var(--color-glass-bg)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setIsImageExpanded(false);
            }}
            whileHover={{ background: 'var(--color-glass-hover)', scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Close fullscreen"
          >
            <Minimize2 size={24} />
          </motion.button>

          {/* NFT name */}
          <div
            className="absolute top-6 left-6 px-4 py-2 rounded-xl"
            style={{
              background: 'var(--color-glass-bg)',
              border: '1px solid var(--color-border)',
            }}
          >
            <span
              className="font-bold text-lg"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {currentNft.name}
            </span>
          </div>

          {/* Fullscreen image */}
          <motion.img
            src={currentNft.imageUrl}
            alt={currentNft.name}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-2xl"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Hint text at bottom */}
          <motion.p
            className="absolute bottom-8 left-0 right-0 text-center text-sm"
            style={{
              color: 'var(--color-text-muted)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            Tap and hold to save to photos
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NFTExplorerModal;
