/**
 * Debounce utility for performance optimization
 * 
 * Prevents rapid function calls (e.g., vote submissions, API requests)
 * from overwhelming the system.
 */

/**
 * Debounce a function to prevent rapid calls
 * @param fn Function to debounce
 * @param delayMs Minimum delay between calls in milliseconds
 * @returns Debounced function that accepts same parameters as original
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Throttle a function to limit call frequency
 * @param fn Function to throttle
 * @param intervalMs Minimum time between calls in milliseconds
 * @returns Throttled function that accepts same parameters as original
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  intervalMs: number
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;
  let timeoutId: number | null = null;

  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= intervalMs) {
      lastCallTime = now;
      fn(...args);

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    } else {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        lastCallTime = Date.now();
        fn(...args);
        timeoutId = null;
      }, intervalMs - timeSinceLastCall);
    }
  };
}

/**
 * React hook for debounced callbacks
 * Prevents rapid API calls on state changes
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delayMs: number
) {
  const timeoutRef = require('react').useRef<number | null>(null);

  return require('react').useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        callback(...args);
        timeoutRef.current = null;
      }, delayMs);
    },
    [callback, delayMs]
  ) as (...args: Parameters<T>) => void;
}

/**
 * React hook for throttled callbacks
 * Prevents excessive re-renders from rapid state changes
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  intervalMs: number
) {
  const lastCallRef = require('react').useRef(0);
  const timeoutRef = require('react').useRef<number | null>(null);

  return require('react').useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= intervalMs) {
        lastCallRef.current = now;
        callback(...args);

        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } else {
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = window.setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
          timeoutRef.current = null;
        }, intervalMs - timeSinceLastCall);
      }
    },
    [callback, intervalMs]
  ) as (...args: Parameters<T>) => void;
}
