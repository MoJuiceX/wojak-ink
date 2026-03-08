/**
 * usePrefersReducedMotion Hook
 *
 * Detects user's reduced motion preference and respects both
 * system preference and app-level setting.
 *
 * Note: For most cases, use Framer Motion's useReducedMotion() hook.
 * This hook is for non-Framer Motion animations and app-level control.
 */

import { useState, useEffect } from 'react';
import { safeStorage } from '@/utils/safeStorage';

/**
 * Hook for detecting reduced motion preference
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = usePrefersReducedMotion();
 *
 * // Use with CSS animations
 * <div className={prefersReducedMotion ? 'no-animate' : 'animate'}>
 *
 * // Use with vanilla JS animations
 * if (!prefersReducedMotion) {
 *   element.animate(...)
 * }
 * ```
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // Check app-level setting first
    const appSetting = document.documentElement.getAttribute('data-reduced-motion');
    if (appSetting === 'true') return true;

    // Fall back to system preference
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if app-level setting is not active
      const appSetting = document.documentElement.getAttribute('data-reduced-motion');
      if (appSetting !== 'true') {
        setPrefersReducedMotion(e.matches);
      }
    };

    // Listen for app-level setting changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-reduced-motion') {
          const appSetting = document.documentElement.getAttribute('data-reduced-motion');
          setPrefersReducedMotion(appSetting === 'true' || mediaQuery.matches);
        }
      });
    });

    mediaQuery.addEventListener('change', handleChange);
    observer.observe(document.documentElement, { attributes: true });

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      observer.disconnect();
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Set app-level reduced motion preference
 * This overrides the system preference when set to true
 */
export function setAppReducedMotion(enabled: boolean): void {
  if (enabled) {
    document.documentElement.setAttribute('data-reduced-motion', 'true');
  } else {
    document.documentElement.removeAttribute('data-reduced-motion');
  }

  // Persist to localStorage
  if (enabled) {
    safeStorage.setItem('reduced-motion', 'true');
  } else {
    safeStorage.removeItem('reduced-motion');
  }
}

/**
 * Initialize app-level reduced motion from localStorage
 * Call this once during app startup
 */
export function initReducedMotion(): void {
  const stored = safeStorage.getItem('reduced-motion');
  if (stored === 'true') {
    document.documentElement.setAttribute('data-reduced-motion', 'true');
  }
}

export default usePrefersReducedMotion;
