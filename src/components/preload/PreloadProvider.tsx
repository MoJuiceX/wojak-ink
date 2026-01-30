/**
 * Preload Provider Component
 *
 * Wraps the app to initialize the preload coordinator and handle
 * route-based preloading. This component:
 * 1. Detects the current page from the route
 * 2. Registers static image requirements for each page
 * 3. Triggers preloading when routes change
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { preloadCoordinator, type PageId } from '@/services/preloadCoordinator';
import { imagePreloader } from '@/services/imagePreloader';
import { PAGE_IMAGE_CONFIG, getAllStaticImages } from '@/config/pageImageConfig';

// Map routes to page IDs
function getPageIdFromPath(pathname: string): PageId {
  if (pathname.startsWith('/gallery')) return 'gallery';
  if (pathname.startsWith('/treasury')) return 'treasury';
  if (pathname.startsWith('/bigpulp')) return 'bigpulp';
  if (pathname.startsWith('/generator')) return 'generator';
  if (pathname.startsWith('/media')) return 'media';
  if (pathname.startsWith('/settings')) return 'settings';
  // Default to gallery
  return 'gallery';
}

interface PreloadProviderProps {
  children: React.ReactNode;
}

export function PreloadProvider({ children }: PreloadProviderProps) {
  const location = useLocation();

  // Initialize coordinator with static page requirements on mount
  useEffect(() => {
    // Register all page requirements
    for (const [pageId, config] of Object.entries(PAGE_IMAGE_CONFIG)) {
      preloadCoordinator.registerPageRequirements({
        pageId: pageId as PageId,
        critical: config.critical,
        actionImages: new Map(),
      });
    }

    // Preload all static images with low priority on app start
    const allStaticImages = getAllStaticImages();
    if (allStaticImages.length > 0) {
      imagePreloader.preloadBatch(allStaticImages, 'low');
    }

    // Preload game assets during idle time so games open instantly
    const idleTimeout = setTimeout(() => {
      const gameAssets = [
        // Memory Match card back
        '/assets/Games/games_media/Memory_card.webp',
        // Game backgrounds
        '/assets/Games/backgrounds/BACKGROUND_Orange Grove_brick.webp',
        // Game sprites
        '/assets/Games/games_media/juggle.webp',
        '/assets/Games/games_media/runner.webp',
        '/assets/Games/games_media/Knife_Game.webp',
        // BigPulp base (used across pages)
        '/assets/BigPulp/art/BigP_base.webp',
      ];
      imagePreloader.preloadBatch(gameAssets, 'low');
    }, 3000); // Wait 3s after boot to avoid competing with critical loads

    return () => clearTimeout(idleTimeout);
  }, []);

  // Update current page when route changes
  useEffect(() => {
    const pageId = getPageIdFromPath(location.pathname);
    preloadCoordinator.setCurrentPage(pageId);
  }, [location.pathname]);

  return <>{children}</>;
}

export default PreloadProvider;
