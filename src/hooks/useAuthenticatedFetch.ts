/**
 * useAuthenticatedFetch Hook
 *
 * Provides a fetch function that automatically includes the Clerk auth token.
 * Use this for API calls that require authentication.
 * Uses ClerkAuthContext so it works when Clerk is not configured (e.g. local dev).
 */

import { useCallback } from 'react';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

export function useAuthenticatedFetch() {
  const auth = useClerkAuth();

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const token = auth.getToken ? await auth.getToken() : null;

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
    [auth.getToken]
  );

  return {
    authenticatedFetch,
    isSignedIn: auth.isSignedIn ?? false,
    isLoaded: auth.isLoaded ?? true,
  };
}

export default useAuthenticatedFetch;
