/**
 * ClerkAuthContext
 *
 * Provides Clerk auth state (useAuth / useUser) when Clerk is configured,
 * and a safe fallback when VITE_CLERK_PUBLISHABLE_KEY is not set (e.g. local dev).
 * This allows components to use auth without throwing outside ClerkProvider.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export interface ClerkAuthValue {
  userId: string | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  getToken: (() => Promise<string | null>) | undefined;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
  } | null;
}

const fallbackAuth: ClerkAuthValue = {
  userId: null,
  isSignedIn: false,
  isLoaded: true,
  getToken: undefined,
  user: null,
};

const ClerkAuthContext = createContext<ClerkAuthValue>(fallbackAuth);

/** Only call Clerk hooks when this component is under ClerkProvider (CLERK_ENABLED). */
function ClerkAuthProviderWithClerk({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { user } = useUser();
  const value = useMemo<ClerkAuthValue>(
    () => ({
      userId: auth.userId ?? null,
      isSignedIn: !!auth.isSignedIn,
      isLoaded: auth.isLoaded ?? false,
      getToken: auth.getToken,
      user: user
        ? {
            firstName: user.firstName ?? null,
            lastName: user.lastName ?? null,
            email: user.primaryEmailAddress?.emailAddress ?? null,
            imageUrl: user.imageUrl ?? null,
          }
        : null,
    }),
    [auth.userId, auth.isSignedIn, auth.isLoaded, auth.getToken, user]
  );
  return (
    <ClerkAuthContext.Provider value={value}>{children}</ClerkAuthContext.Provider>
  );
}

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  if (CLERK_ENABLED) {
    return <ClerkAuthProviderWithClerk>{children}</ClerkAuthProviderWithClerk>;
  }
  return (
    <ClerkAuthContext.Provider value={fallbackAuth}>
      {children}
    </ClerkAuthContext.Provider>
  );
}

export function useClerkAuth(): ClerkAuthValue {
  return useContext(ClerkAuthContext);
}
