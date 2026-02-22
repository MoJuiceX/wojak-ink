/**
 * Gallery Page
 *
 * Browse the Wojak Farmers Plot NFT collection by character type.
 * Responsive layout: mobile grid vs desktop grid with premium hover effects.
 * Features glassmorphism, animated backgrounds, and glowing effects.
 */

import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Gallery.css';
import { ChevronDown, Swords, Palette } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageTransition } from '@/components/layout/PageTransition';
import { useLayout } from '@/hooks/useLayout';
import { useIsDesktop } from '@/hooks/useDesktopBreakpoint';
import { useGallery } from '@/hooks/useGallery';
import { useGridPreload } from '@/hooks/useImagePreloader';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { imagePreloader } from '@/services/imagePreloader';
import { galleryService } from '@/services/galleryService';
import { preloadCoordinator } from '@/services/preloadCoordinator';
import { CHARACTER_TYPES } from '@/config/characters';
import { nftGridStaggerVariants } from '@/config/galleryAnimations';
import {
  CharacterGrid,
  ResponsiveExplorer,
  DesktopCharacterGrid,
} from '@/components/gallery';
import { YourWojakSection } from '@/components/gallery/YourWojakSection';
import { NFTGridItem } from '@/components/gallery/NFTGridItem';
import type { CharacterType } from '@/types/nft';
import { PageSEO } from '@/components/seo';

const ITEMS_PER_PAGE = 100;

function GalleryContent() {
  const { setHeaderBreadcrumb } = useLayout();
  const isDesktop = useIsDesktop();
  const prefersReducedMotion = usePrefersReducedMotion();
  const {
    selectedCharacter,
    selectCharacter,
    explorerOpen,
    openExplorer,
    closeExplorer,
    filteredNfts,
    isLoading,
  } = useGallery();

  // Swipe banner state
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem('wojak_swipe_banner_dismissed') === 'true'
  );

  // Fight Club banner appears after 3 seconds
  const [showFightClubBanner, setShowFightClubBanner] = useState(false);

  useEffect(() => {
    if (bannerDismissed) return;
    const timer = setTimeout(() => setShowFightClubBanner(true), 3000);
    return () => clearTimeout(timer);
  }, [bannerDismissed]);

  // Pagination state
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Animation key to re-trigger cascade on character change
  const [animationKey, setAnimationKey] = useState(0);

  // Frozen grid state - captures the grid display when explorer opens
  // This prevents the background grid from re-sorting while user is in lightbox
  const [frozenGridNfts, setFrozenGridNfts] = useState<typeof filteredNfts | null>(null);

  // Grid ref for preloading
  const gridRef = useRef<HTMLDivElement>(null);

  // Get image URLs for preloading
  const imageUrls = useMemo(
    () => filteredNfts.slice(0, visibleCount).map((nft) => nft.thumbnailUrl),
    [filteredNfts, visibleCount]
  );

  // Smart preloading for grid
  useGridPreload(imageUrls, gridRef);

  // Get all NFTs for the character (unfiltered) to preload for all filter/sort options
  const { nfts: allCharacterNfts } = useGallery();

  // BACKGROUND PRELOAD: When Gallery page mounts, start preloading images for ALL character types
  // This ensures images are ready no matter which character the user selects first
  useEffect(() => {
    let cancelled = false;

    async function preloadAllCharacters() {
      try {
        // Phase 1: Load first 50 images per character with HIGH priority (immediate)
        const urlsByCharacter = await galleryService.getFirstNImageUrlsPerCharacter(50);

        if (cancelled) return;

        // Flatten all URLs and preload with HIGH priority for quick availability
        const firstBatch: string[] = [];
        for (const urls of urlsByCharacter.values()) {
          firstBatch.push(...urls);
        }
        imagePreloader.preloadBatch(firstBatch, 'high');

        // Phase 2: After a short delay, load more images (51-150) per character
        setTimeout(async () => {
          if (cancelled) return;
          try {
            const moreUrls = await galleryService.getFirstNImageUrlsPerCharacter(150);
            const secondBatch: string[] = [];
            for (const urls of moreUrls.values()) {
              // Skip the first 50 we already loaded
              secondBatch.push(...urls.slice(50));
            }
            if (secondBatch.length > 0) {
              imagePreloader.preloadBatch(secondBatch, 'medium');
            }
          } catch {
            // Silently fail - this is a background optimization
          }
        }, 1000);

        // Phase 3: After user has been on page for 3 seconds, load even more
        setTimeout(async () => {
          if (cancelled) return;
          try {
            const allUrls = await galleryService.getFirstNImageUrlsPerCharacter(300);
            const thirdBatch: string[] = [];
            for (const urls of allUrls.values()) {
              // Skip the first 150 we already loaded
              thirdBatch.push(...urls.slice(150));
            }
            if (thirdBatch.length > 0) {
              imagePreloader.preloadBatch(thirdBatch, 'low');
            }
          } catch {
            // Silently fail
          }
        }, 3000);

      } catch (error) {
        console.warn('Failed to preload character images:', error);
      }
    }

    preloadAllCharacters();

    return () => {
      cancelled = true;
    };
  }, []); // Only run once on mount

  // CRITICAL: Preload first 50 images immediately with highest priority
  // This ensures the user sees images as soon as possible
  useEffect(() => {
    if (filteredNfts.length === 0 || isLoading) return;

    // Get the first 50 images that will be displayed immediately
    const firstBatchUrls = filteredNfts.slice(0, 50).map((nft) => nft.thumbnailUrl);

    // Preload these with CRITICAL priority - they must load first
    imagePreloader.preloadBatch(firstBatchUrls, 'critical');
  }, [filteredNfts, isLoading]);

  // Preload images for ALL possible sort/filter combinations
  // This ensures instant display no matter which button the user clicks
  useEffect(() => {
    if (allCharacterNfts.length === 0 || isLoading || !selectedCharacter) return;

    // Helper to get top N URLs from a sorted array
    const getTopUrls = (nfts: typeof allCharacterNfts, count: number) =>
      nfts.slice(0, count).map((nft) => nft.thumbnailUrl);

    // All NFTs - sorted by ID (ascending and descending)
    const byIdAsc = [...allCharacterNfts].sort((a, b) => a.id.localeCompare(b.id));
    const byIdDesc = [...byIdAsc].reverse();

    // All NFTs - sorted by Rarity/Rank (ascending = rarest first, descending = common first)
    const byRarityAsc = [...allCharacterNfts].sort((a, b) => a.rarityRank - b.rarityRank);
    const byRarityDesc = [...byRarityAsc].reverse();

    // All NFTs - sorted by Price ascending (cheapest first)
    const byPriceAsc = [...allCharacterNfts].sort((a, b) => {
      const aHasPrice = a.listing?.priceXCH != null;
      const bHasPrice = b.listing?.priceXCH != null;
      if (aHasPrice && bHasPrice) return (a.listing?.priceXCH ?? 0) - (b.listing?.priceXCH ?? 0);
      if (aHasPrice) return -1;
      if (bHasPrice) return 1;
      return a.id.localeCompare(b.id);
    });

    // All NFTs - sorted by Price descending (most expensive first)
    const byPriceDesc = [...allCharacterNfts].sort((a, b) => {
      const aHasPrice = a.listing?.priceXCH != null;
      const bHasPrice = b.listing?.priceXCH != null;
      if (aHasPrice && bHasPrice) return (b.listing?.priceXCH ?? 0) - (a.listing?.priceXCH ?? 0);
      if (aHasPrice) return -1;
      if (bHasPrice) return 1;
      return a.id.localeCompare(b.id);
    });

    // Listed only NFTs - all sort combinations
    const listedOnly = allCharacterNfts.filter((nft) => nft.listing);
    const listedByIdAsc = [...listedOnly].sort((a, b) => a.id.localeCompare(b.id));
    const listedByIdDesc = [...listedByIdAsc].reverse();
    const listedByRarityAsc = [...listedOnly].sort((a, b) => a.rarityRank - b.rarityRank);
    const listedByRarityDesc = [...listedByRarityAsc].reverse();
    const listedByPriceAsc = [...listedOnly].sort((a, b) =>
      (a.listing?.priceXCH ?? 0) - (b.listing?.priceXCH ?? 0)
    );
    const listedByPriceDesc = [...listedByPriceAsc].reverse();

    // Register action images with the coordinator
    // This tells the coordinator what images each button would show
    preloadCoordinator.updateActionImages('gallery', 'filter-all-sort-id-asc', getTopUrls(byIdAsc, ITEMS_PER_PAGE));
    preloadCoordinator.updateActionImages('gallery', 'filter-all-sort-id-desc', getTopUrls(byIdDesc, ITEMS_PER_PAGE));
    preloadCoordinator.updateActionImages('gallery', 'filter-all-sort-rarity-asc', getTopUrls(byRarityAsc, ITEMS_PER_PAGE));
    preloadCoordinator.updateActionImages('gallery', 'filter-all-sort-rarity-desc', getTopUrls(byRarityDesc, ITEMS_PER_PAGE));
    preloadCoordinator.updateActionImages('gallery', 'filter-all-sort-price-asc', getTopUrls(byPriceAsc, ITEMS_PER_PAGE));
    preloadCoordinator.updateActionImages('gallery', 'filter-all-sort-price-desc', getTopUrls(byPriceDesc, ITEMS_PER_PAGE));
    preloadCoordinator.updateActionImages('gallery', 'filter-listed-sort-id-asc', getTopUrls(listedByIdAsc, ITEMS_PER_PAGE));
    preloadCoordinator.updateActionImages('gallery', 'filter-listed-sort-id-desc', getTopUrls(listedByIdDesc, ITEMS_PER_PAGE));
    preloadCoordinator.updateActionImages('gallery', 'filter-listed-sort-rarity-asc', getTopUrls(listedByRarityAsc, ITEMS_PER_PAGE));
    preloadCoordinator.updateActionImages('gallery', 'filter-listed-sort-rarity-desc', getTopUrls(listedByRarityDesc, ITEMS_PER_PAGE));
    preloadCoordinator.updateActionImages('gallery', 'filter-listed-sort-price-asc', getTopUrls(listedByPriceAsc, ITEMS_PER_PAGE));
    preloadCoordinator.updateActionImages('gallery', 'filter-listed-sort-price-desc', getTopUrls(listedByPriceDesc, ITEMS_PER_PAGE));

    // Collect all URLs from first 100 of each sort (use Set to dedupe)
    const highPriorityUrls = new Set<string>();

    // Add first 100 from each sort order (All filter)
    getTopUrls(byIdAsc, ITEMS_PER_PAGE).forEach((url) => highPriorityUrls.add(url));
    getTopUrls(byIdDesc, ITEMS_PER_PAGE).forEach((url) => highPriorityUrls.add(url));
    getTopUrls(byRarityAsc, ITEMS_PER_PAGE).forEach((url) => highPriorityUrls.add(url));
    getTopUrls(byRarityDesc, ITEMS_PER_PAGE).forEach((url) => highPriorityUrls.add(url));
    getTopUrls(byPriceAsc, ITEMS_PER_PAGE).forEach((url) => highPriorityUrls.add(url));
    getTopUrls(byPriceDesc, ITEMS_PER_PAGE).forEach((url) => highPriorityUrls.add(url));

    // Add first 100 from each sort order (Listed filter)
    getTopUrls(listedByIdAsc, ITEMS_PER_PAGE).forEach((url) => highPriorityUrls.add(url));
    getTopUrls(listedByIdDesc, ITEMS_PER_PAGE).forEach((url) => highPriorityUrls.add(url));
    getTopUrls(listedByRarityAsc, ITEMS_PER_PAGE).forEach((url) => highPriorityUrls.add(url));
    getTopUrls(listedByRarityDesc, ITEMS_PER_PAGE).forEach((url) => highPriorityUrls.add(url));
    getTopUrls(listedByPriceAsc, ITEMS_PER_PAGE).forEach((url) => highPriorityUrls.add(url));
    getTopUrls(listedByPriceDesc, ITEMS_PER_PAGE).forEach((url) => highPriorityUrls.add(url));

    // Preload all high priority URLs (for filter/sort switching)
    imagePreloader.preloadBatch(Array.from(highPriorityUrls), 'high');

    // Preload remaining NFTs with low priority in background
    const allUrls = new Set(allCharacterNfts.map((nft) => nft.thumbnailUrl));
    const remainingUrls = Array.from(allUrls).filter((url) => !highPriorityUrls.has(url));
    imagePreloader.preloadBatch(remainingUrls, 'low');

  }, [allCharacterNfts, isLoading, selectedCharacter]);

  // Preload next batch based on current filter/sort for "Load More"
  useEffect(() => {
    if (filteredNfts.length === 0 || isLoading) return;

    // Get the next batch URLs (next 100 after current visible)
    const nextBatchStart = visibleCount;
    const nextBatchEnd = Math.min(visibleCount + ITEMS_PER_PAGE, filteredNfts.length);

    if (nextBatchStart < filteredNfts.length) {
      const nextBatchUrls = filteredNfts
        .slice(nextBatchStart, nextBatchEnd)
        .map((nft) => nft.thumbnailUrl);

      // Preload with medium priority for the current filter view
      imagePreloader.preloadBatch(nextBatchUrls, 'medium');
    }
  }, [filteredNfts, visibleCount, isLoading]);

  // Reset pagination when character changes
   
  useEffect(() => {
    queueMicrotask(() => setVisibleCount(ITEMS_PER_PAGE));
  }, [selectedCharacter]);

  // Re-trigger animation when character changes
   
  useEffect(() => {
    if (selectedCharacter) {
      queueMicrotask(() => setAnimationKey((k) => k + 1));
    }
  }, [selectedCharacter]);

  // Freeze/unfreeze grid when explorer opens/closes
  // This prevents background grid from re-sorting while in lightbox
   
  useEffect(() => {
    queueMicrotask(() => {
      if (explorerOpen && !frozenGridNfts) {
        // Capture current grid state when explorer opens
        setFrozenGridNfts(filteredNfts.slice(0, visibleCount));
      } else if (!explorerOpen && frozenGridNfts) {
        // Clear frozen state when explorer closes
        setFrozenGridNfts(null);
      }
    });
  }, [explorerOpen, filteredNfts, visibleCount, frozenGridNfts]);

  // Update header breadcrumb when character is selected
  useEffect(() => {
    if (selectedCharacter) {
      const character = CHARACTER_TYPES.find((c) => c.id === selectedCharacter);
      setHeaderBreadcrumb({
        label: character?.name || selectedCharacter,
        onBack: () => selectCharacter(null),
      });
    } else {
      setHeaderBreadcrumb(null);
    }

    // Cleanup on unmount
    return () => setHeaderBreadcrumb(null);
  }, [selectedCharacter, selectCharacter, setHeaderBreadcrumb]);

  // Use frozen grid when explorer is open, otherwise use current filtered list
  const visibleNfts = frozenGridNfts || filteredNfts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredNfts.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  }, []);

  const handleSelectCharacter = useCallback(
    (character: CharacterType) => {
      selectCharacter(character);
    },
    [selectCharacter]
  );

  const handleOpenNft = useCallback(
    (nftId: string) => {
      openExplorer(nftId);
    },
    [openExplorer]
  );

  // Handle character hover - preload first 50 NFTs for that character
  const handleCharacterHover = useCallback(
    async (character: CharacterType) => {
      try {
        const nfts = await galleryService.fetchNFTsByCharacter(character);
        const urls = nfts.slice(0, 50).map((nft) => nft.imageUrl);
        imagePreloader.preloadBatch(urls, 'high');
      } catch {
        // Silently fail - preloading is a nice-to-have
      }
    },
    []
  );

  // Desktop uses different padding from config
  // Mobile uses viewport-based padding for equal gaps everywhere
  const pagePadding = isDesktop ? '0' : '3vw';

  return (
    <PageTransition>
      <PageSEO
        title="NFT Gallery - Browse 4,200 Wojak Farmers Plot NFTs"
        description="Explore the complete Wojak Farmers Plot NFT collection on Chia blockchain. Filter by 14 character types including Wojak, Soyjak, Waifu, Chad, and more. View rarity scores and sales history."
        path="/gallery"
      />
      {/* SEO H1 - visually hidden but accessible */}
      <h1 className="sr-only">Wojak Farmers Plot NFT Gallery - Browse 4,200 Unique NFTs</h1>

      {/* Collection Banner with Fight Club overlay */}
      <div className="gallery-banner" style={{ position: 'relative' }}>
        <img
          src="/images/gallery-banner.webp"
          alt="Wojak Farmers Plot Collection"
          loading="eager"
        />
        {/* Fight Club Banner - floating card on top right */}
        <AnimatePresence>
          {showFightClubBanner && !bannerDismissed && (
            <motion.div
              initial={{ y: -50, opacity: 0, scale: 0.9 }}
              animate={{
                y: 0,
                opacity: 1,
                scale: 1,
              }}
              exit={{ y: -50, opacity: 0, scale: 0.9 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
                bounce: 0.5,
              }}
              className="fight-club-float"
            >
              <div className="fight-club-float-inner fight-club-hover-anim">
                <button
                  type="button"
                  aria-label="Dismiss banner"
                  onClick={() => {
                    localStorage.setItem('wojak_swipe_banner_dismissed', 'true');
                    setBannerDismissed(true);
                  }}
                  className="fight-club-close"
                >
                  &times;
                </button>
                <Swords size={18} className="text-primary fight-club-icon" />
                <Link to="/fight-club" className="fight-club-float-link">
                  <div className="flex items-center gap-2">
                    <span className="fight-club-title">Fight Club is live!</span>
                    <span className="fight-club-badge">NEW</span>
                  </div>
                  <span className="fight-club-subtitle">Vote, battle, and climb the rankings</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Animated gradient background */}
      <div className="gallery-page-background" />

      <div className="min-h-full brand-premium-shell brand-premium-gallery" data-section="gallery" style={{ padding: pagePadding }}>
        <div className={isDesktop ? 'space-y-8' : ''}>
          {/* Content */}
          <AnimatePresence mode="wait">
            {!selectedCharacter ? (
              // Character type grid - responsive
              <motion.div
                key="character-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {isDesktop ? (
                  <DesktopCharacterGrid
                    characters={CHARACTER_TYPES}
                    onSelectCharacter={handleSelectCharacter}
                    onCharacterHover={handleCharacterHover}
                  />
                ) : (
                  <CharacterGrid
                    characters={CHARACTER_TYPES}
                    onSelectCharacter={handleSelectCharacter}
                    selectedCharacter={selectedCharacter}
                    onCharacterHover={handleCharacterHover}
                  />
                )}
              </motion.div>
            ) : (
              // NFT grid for selected character
              <motion.div
                key="nft-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={isDesktop ? { padding: '24px 24px 0' } : undefined}
              >
                {isLoading ? (
                  // Loading skeleton
                  <div
                    className={`grid gap-1.5 ${
                      isDesktop
                        ? 'grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12'
                        : 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-6'
                    }`}
                    style={isDesktop ? { maxWidth: 1600, margin: '0 auto' } : undefined}
                  >
                    {Array.from({ length: isDesktop ? 24 : 16 }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-lg overflow-hidden animate-pulse"
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                        }}
                      />
                    ))}
                  </div>
                ) : filteredNfts.length === 0 ? (
                  // Empty state when no NFTs for this character
                  <div className="card p-8 flex flex-col items-center gap-4 text-center" style={{ maxWidth: 400, margin: '40px auto' }}>
                    <Palette size={32} className="text-muted" />
                    <p className="text-secondary">
                      No Wojaks found for this character type yet.
                    </p>
                    <Link to="/generator" className="btn btn-primary">
                      Create One in Generator
                    </Link>
                  </div>
                ) : (
                  <>
                    <motion.div
                      key={`nft-grid-${animationKey}`}
                      ref={gridRef}
                      className={`grid gap-1.5 ${
                        isDesktop
                          ? 'grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12'
                          : 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-6'
                      }`}
                      style={isDesktop ? { maxWidth: 1600, margin: '0 auto' } : undefined}
                      variants={prefersReducedMotion ? undefined : nftGridStaggerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {visibleNfts.map((nft, index) => (
                        <NFTGridItem
                          key={nft.id}
                          nft={nft}
                          index={index}
                          onClick={handleOpenNft}
                          eagerLoad={index < 50}
                        />
                      ))}
                    </motion.div>
                    {/* Load more button */}
                    {hasMore && (
                      <div className="flex justify-center py-2">
                        <button
                          type="button"
                          onClick={handleLoadMore}
                          className="flex items-center gap-2 px-6 py-3 rounded-full transition-all hover:scale-105 text-primary"
                          style={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <span>Load More</span>
                          <ChevronDown size={18} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Your Wojak Collection */}
        <div className="mt-8">
          <div className="gallery-banner">
            <img
              src="/images/your-wojak-banner.webp"
              alt="Your Wojak Collection"
              loading="lazy"
            />
          </div>
          <YourWojakSection />
        </div>

        {/* Responsive NFT Explorer (Modal on mobile, Panel on desktop) */}
        <ResponsiveExplorer isOpen={explorerOpen} onClose={closeExplorer} />
      </div>
    </PageTransition>
  );
}

export default function Gallery() {
  return <GalleryContent />;
}
