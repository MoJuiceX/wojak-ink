/**
 * useMediaQuery Hook
 *
 * Subscribe to media query changes for responsive behavior.
 */

import { useState, useEffect } from 'react';

/**
 * Hook to subscribe to a media query
 *
 * @param query - CSS media query string
 * @returns boolean indicating if the query matches
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isMobile = useMediaQuery('(max-width: 767px)');
 *   const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 *
 *   return <div>{isMobile ? 'Mobile' : 'Desktop'}</div>;
 * }
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Set initial value
    queueMicrotask(() => setMatches(mediaQuery.matches));

    // Handler for changes
    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches);
    }

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * Predefined media query hooks
 */

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

export default useMediaQuery;
