/**
 * usePointerType Hook
 *
 * Detects input device type (touch vs mouse).
 * Uses pointer media queries for accurate detection.
 */

import { useState, useEffect } from 'react';
import { POINTER_QUERIES, ORIENTATION_QUERIES } from '@/config/breakpoints';

export type PointerType = 'touch' | 'mouse' | 'unknown';
export type Orientation = 'portrait' | 'landscape';

/**
 * Detect primary pointer type
 */
export function usePointerType(): PointerType {
  const [pointerType, setPointerType] = useState<PointerType>('unknown');

  useEffect(() => {
    const touchQuery = window.matchMedia(POINTER_QUERIES.touch);
    const mouseQuery = window.matchMedia(POINTER_QUERIES.mouse);

    const updatePointerType = () => {
      if (touchQuery.matches) {
        setPointerType('touch');
      } else if (mouseQuery.matches) {
        setPointerType('mouse');
      } else {
        setPointerType('unknown');
      }
    };

    updatePointerType();

    touchQuery.addEventListener('change', updatePointerType);
    mouseQuery.addEventListener('change', updatePointerType);

    return () => {
      touchQuery.removeEventListener('change', updatePointerType);
      mouseQuery.removeEventListener('change', updatePointerType);
    };
  }, []);

  return pointerType;
}

/**
 * Check if device supports touch
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(() => {
    // Initialize with actual value if available (SSR-safe)
    if (typeof window !== 'undefined') {
      return window.matchMedia(POINTER_QUERIES.touch).matches;
    }
    return false;
  });

  useEffect(() => {
    const query = window.matchMedia(POINTER_QUERIES.touch);
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    query.addEventListener('change', handler);

    return () => query.removeEventListener('change', handler);
  }, []);

  return isTouch;
}

/**
 * Detect current orientation
 */
export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>('portrait');

  useEffect(() => {
    const query = window.matchMedia(ORIENTATION_QUERIES.portrait);

    const updateOrientation = () => {
      setOrientation(query.matches ? 'portrait' : 'landscape');
    };

    updateOrientation();

    query.addEventListener('change', updateOrientation);
    return () => query.removeEventListener('change', updateOrientation);
  }, []);

  return orientation;
}

/**
 * Detect mobile landscape (phone turned sideways)
 */
export function useIsMobileLandscape(): boolean {
  const [isMobileLandscape, setIsMobileLandscape] = useState(() => {
    // Initialize with actual value if available (SSR-safe)
    if (typeof window !== 'undefined') {
      return window.matchMedia(ORIENTATION_QUERIES.mobileLandscape).matches;
    }
    return false;
  });

  useEffect(() => {
    const query = window.matchMedia(ORIENTATION_QUERIES.mobileLandscape);
    const handler = (e: MediaQueryListEvent) => setIsMobileLandscape(e.matches);
    query.addEventListener('change', handler);

    return () => query.removeEventListener('change', handler);
  }, []);

  return isMobileLandscape;
}

export default usePointerType;
