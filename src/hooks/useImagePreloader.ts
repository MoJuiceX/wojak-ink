/**
 * Image Preloader Hooks
 *
 * React hooks for smart image preloading in components.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { imagePreloader, type PreloadPriority } from '@/services/imagePreloader';

/**
 * Hook to preload a single image
 * Returns loading state and whether the image is ready
 */
export function usePreloadImage(url: string | null, priority: PreloadPriority = 'medium') {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      queueMicrotask(() => {
        setIsLoaded(false);
        setIsLoading(false);
      });
      return;
    }

    // Check if already loaded
    if (imagePreloader.isLoaded(url)) {
      queueMicrotask(() => {
        setIsLoaded(true);
        setIsLoading(false);
      });
      return;
    }

    queueMicrotask(() => setIsLoading(true));

    imagePreloader.preload(url, priority).then((result) => {
      setIsLoaded(result.success);
      setIsLoading(false);
    });
  }, [url, priority]);

  return { isLoaded, isLoading };
}

/**
 * Hook to preload images for explorer/detail view
 * Automatically preloads neighbors when current index changes
 */
export function useExplorerPreload(
  imageUrls: string[],
  currentIndex: number,
  direction: 'forward' | 'backward' | null = null
) {
  const prevIndexRef = useRef(currentIndex);

  useEffect(() => {
    if (imageUrls.length === 0) return;

    // Detect direction from index change if not provided
    let effectiveDirection = direction;
    if (!effectiveDirection && prevIndexRef.current !== currentIndex) {
      effectiveDirection = currentIndex > prevIndexRef.current ? 'forward' : 'backward';
    }
    prevIndexRef.current = currentIndex;

    imagePreloader.preloadForExplorer(imageUrls, currentIndex, effectiveDirection);
  }, [imageUrls, currentIndex, direction]);
}

/**
 * Hook for hover preloading
 * Returns handlers to attach to elements
 */
export function useHoverPreload(url: string | null) {
  const cancelRef = useRef<(() => void) | null>(null);

  const onMouseEnter = useCallback(() => {
    if (url && !imagePreloader.isLoaded(url)) {
      cancelRef.current = imagePreloader.preloadOnHover(url);
    }
  }, [url]);

  const onMouseLeave = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cancelRef.current) {
        cancelRef.current();
      }
    };
  }, []);

  return { onMouseEnter, onMouseLeave };
}

/**
 * Hook for grid preloading with intersection observer
 * Tracks visible items and preloads accordingly
 */
export function useGridPreload(
  imageUrls: string[],
  containerRef: React.RefObject<HTMLElement | null>,
  itemSelector: string = '[data-preload-index]'
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibleIndicesRef = useRef<Set<number>>(new Set());

  const updatePreloads = useCallback(() => {
    const indices = Array.from(visibleIndicesRef.current).sort((a, b) => a - b);
    if (indices.length === 0) return;

    const minVisible = indices[0];
    const maxVisible = indices[indices.length - 1];

    imagePreloader.preloadForGrid(imageUrls, minVisible, maxVisible);
  }, [imageUrls]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || imageUrls.length === 0) return;

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        let changed = false;

        for (const entry of entries) {
          const index = parseInt(
            (entry.target as HTMLElement).dataset.preloadIndex || '-1',
            10
          );
          if (index < 0) continue;

          if (entry.isIntersecting) {
            if (!visibleIndicesRef.current.has(index)) {
              visibleIndicesRef.current.add(index);
              changed = true;
            }
          } else {
            if (visibleIndicesRef.current.has(index)) {
              visibleIndicesRef.current.delete(index);
              changed = true;
            }
          }
        }

        if (changed) {
          updatePreloads();
        }
      },
      {
        root: null, // viewport
        rootMargin: '200px 0px', // Start loading 200px before visible
        threshold: 0,
      }
    );

    // Observe all items
    const items = container.querySelectorAll(itemSelector);
    items.forEach((item) => {
      observerRef.current?.observe(item);
    });

    // Initial preload for visible items
    setTimeout(updatePreloads, 100);
    const visibleIndices = visibleIndicesRef.current;

    return () => {
      observerRef.current?.disconnect();
      visibleIndices.clear();
    };
  }, [containerRef, imageUrls, itemSelector, updatePreloads]);

  // Re-observe when URLs change
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !observerRef.current) return;

    // Re-observe items in case DOM changed
    const items = container.querySelectorAll(itemSelector);
    items.forEach((item) => {
      observerRef.current?.observe(item);
    });
  }, [containerRef, imageUrls.length, itemSelector]);
}

/**
 * Hook to batch preload images on mount
 * Useful for preloading character type previews
 */
export function useBatchPreload(urls: string[], priority: PreloadPriority = 'low') {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current || urls.length === 0) return;
    loadedRef.current = true;

    imagePreloader.preloadBatch(urls, priority);
  }, [urls, priority]);
}

/**
 * Hook to get preloader stats (for debugging)
 */
export function usePreloaderStats() {
  const [stats, setStats] = useState(imagePreloader.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(imagePreloader.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}
