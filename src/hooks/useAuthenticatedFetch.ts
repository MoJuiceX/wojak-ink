/**
 * useAuthenticatedFetch Hook
 *
 * Provides a fetch function that automatically includes the Clerk auth token.
 * Use this for API calls that require authentication.
 */

import { useAuth } from '@clerk/clerk-react';
import { useCallback, useMemo } from 'react';

// Check if Clerk is configured
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function useAuthenticatedFetch() {
  // Always call hooks unconditionally (rules of hooks)
  const clerkAuth = useAuth();

  // Use Clerk result only if enabled, otherwise use safe defaults
  const auth = useMemo(
    () => (CLERK_ENABLED
      ? clerkAuth
      : { getToken: () => Promise.resolve(null), isSignedIn: false as const, isLoaded: true as const }),
    [clerkAuth]
  );

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      // Get the token from Clerk
      const token = await auth.getToken();

      // Merge headers
      const headers = new Headers(options.headers);

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      headers.set('Content-Type', 'application/json');

      return fetch(url, {
        ...options,
        headers,
      });
    },
    [auth]
  );

  return {
    authenticatedFetch,
    isSignedIn: auth.isSignedIn ?? false, // Ensure boolean, not undefined
    isLoaded: auth.isLoaded ?? false, // Whether Clerk has finished initializing
  };
}

export default useAuthenticatedFetch;
