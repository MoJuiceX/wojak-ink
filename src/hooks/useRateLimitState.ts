/**
 * useRateLimitState Hook
 *
 * Manages rate limit state with automatic reset tracking.
 * Parses X-RateLimit-Reset header from server responses and provides countdown.
 *
 * Usage:
 *   const { isRateLimited, secondsRemaining, handleRateLimitResponse } = useRateLimitState();
 *
 *   // In your fetch handler:
 *   const response = await fetch('/api/endpoint');
 *   if (handleRateLimitResponse(response)) {
 *     return; // Don't proceed - we're rate limited
 *   }
 */

import { useState, useEffect, useCallback } from 'react';

interface UseRateLimitStateReturn {
  /** Whether we're currently rate limited */
  isRateLimited: boolean;
  /** Seconds remaining until rate limit expires */
  secondsRemaining: number;
  /** Unix timestamp (ms) when rate limit expires, or null if not limited */
  rateLimitedUntil: number | null;
  /**
   * Check a response for rate limiting (429 status).
   * If rate limited, parses X-RateLimit-Reset header and updates state.
   * @returns true if rate limited, false otherwise
   */
  handleRateLimitResponse: (response: Response) => boolean;
  /** Manually clear rate limit state */
  clearRateLimit: () => void;
}

export function useRateLimitState(): UseRateLimitStateReturn {
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // Calculate if currently rate limited (derived from countdown to avoid impure Date.now in render)
  const isRateLimited = secondsRemaining > 0;

  // Update countdown timer
  useEffect(() => {
    if (!rateLimitedUntil) {
      setSecondsRemaining(0); // eslint-disable-line react-hooks/set-state-in-effect -- resetting derived state when dependency clears
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      // Clear rate limit when expired
      if (remaining <= 0) {
        setRateLimitedUntil(null);
      }
    };

    // Initial update
    updateRemaining();

    // Update every second while rate limited
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [rateLimitedUntil]);

  // Handle a response that might be rate limited
  const handleRateLimitResponse = useCallback((response: Response): boolean => {
    if (response.status === 429) {
      // Try to parse the X-RateLimit-Reset header (Unix timestamp in seconds)
      const resetHeader = response.headers.get('X-RateLimit-Reset');

      let resetTime: number;
      if (resetHeader) {
        // Server sends Unix timestamp in seconds, convert to ms
        resetTime = parseInt(resetHeader, 10) * 1000;
      } else {
        // Fallback: 60 seconds from now
        resetTime = Date.now() + 60000;
      }

      setRateLimitedUntil(resetTime);
      return true;
    }
    return false;
  }, []);

  // Manually clear rate limit
  const clearRateLimit = useCallback(() => {
    setRateLimitedUntil(null);
    setSecondsRemaining(0);
  }, []);

  return {
    isRateLimited,
    secondsRemaining,
    rateLimitedUntil,
    handleRateLimitResponse,
    clearRateLimit,
  };
}

export default useRateLimitState;
