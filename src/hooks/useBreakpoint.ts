/**
 * useBreakpoint Hook
 *
 * Detects current breakpoint using matchMedia.
 * More efficient than resize listeners.
 */

import { useState, useEffect, useMemo } from 'react';
import { MEDIA_QUERIES, type Breakpoint } from '@/config/breakpoints';

type BreakpointKey = keyof typeof MEDIA_QUERIES;

/**
 * Check if a specific breakpoint matches
 */
export function useBreakpoint(breakpoint: BreakpointKey): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(MEDIA_QUERIES[breakpoint]);
    queueMicrotask(() => setMatches(query.matches));

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    query.addEventListener('change', handler);

    return () => query.removeEventListener('change', handler);
  }, [breakpoint]);

  return matches;
}

/**
 * Get the current breakpoint name
 */
export function useCurrentBreakpoint(): Breakpoint {
  const isSm = useBreakpoint('sm');
  const isMd = useBreakpoint('md');
  const isLg = useBreakpoint('lg');
  const isXl = useBreakpoint('xl');
  const is2xl = useBreakpoint('2xl');

  return useMemo(() => {
    if (is2xl) return '2xl';
    if (isXl) return 'xl';
    if (isLg) return 'lg';
    if (isMd) return 'md';
    if (isSm) return 'sm';
    return 'base';
  }, [isSm, isMd, isLg, isXl, is2xl]);
}

/**
 * Check if viewport is mobile (below md)
 */
export function useIsMobile(): boolean {
  return !useBreakpoint('md');
}

/**
 * Check if viewport is tablet (md to lg)
 */
export function useIsTablet(): boolean {
  const isMd = useBreakpoint('md');
  const isLg = useBreakpoint('lg');
  return isMd && !isLg;
}

/**
 * Check if viewport is desktop (lg and above)
 */
export function useIsDesktop(): boolean {
  return useBreakpoint('lg');
}

export default useBreakpoint;
