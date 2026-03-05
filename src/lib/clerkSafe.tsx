/* eslint-disable react-refresh/only-export-components */
import type { ComponentProps, PropsWithChildren } from 'react';
import {
  SignInButton as ClerkSignInButton,
  SignedIn as ClerkSignedIn,
  SignedOut as ClerkSignedOut,
  useAuth as useUnsafeAuth,
  useClerk as useUnsafeClerk,
  useUser as useUnsafeUser,
} from '@clerk/clerk-react';
import { HAS_VALID_CLERK_PUBLISHABLE_KEY } from '@/lib/clerkConfig';

const noop = () => undefined;
const noopAsync = async () => undefined;

const authFallback = {
  isLoaded: true,
  isSignedIn: false,
  sessionId: null,
  userId: null,
  actor: null,
  orgId: null,
  orgRole: null,
  orgSlug: null,
  has: () => false,
  signOut: noopAsync,
  getToken: async () => null,
} as unknown as ReturnType<typeof useUnsafeAuth>;

const clerkFallback = {
  loaded: false,
  client: undefined,
  session: null,
  user: null,
  openSignIn: noop,
  openSignUp: noop,
  openUserProfile: noop,
  signOut: noopAsync,
  addListener: noop,
} as unknown as ReturnType<typeof useUnsafeClerk>;

const userFallback = {
  isLoaded: true,
  isSignedIn: false,
  user: null,
} as unknown as ReturnType<typeof useUnsafeUser>;

export function useAuth() {
  try {
    return useUnsafeAuth();
  } catch (error) {
    if (HAS_VALID_CLERK_PUBLISHABLE_KEY) {
      console.warn('[Clerk] useAuth fallback activated:', error);
    }
    return authFallback;
  }
}

export function useClerk() {
  try {
    return useUnsafeClerk();
  } catch (error) {
    if (HAS_VALID_CLERK_PUBLISHABLE_KEY) {
      console.warn('[Clerk] useClerk fallback activated:', error);
    }
    return clerkFallback;
  }
}

export function useUser() {
  try {
    return useUnsafeUser();
  } catch (error) {
    if (HAS_VALID_CLERK_PUBLISHABLE_KEY) {
      console.warn('[Clerk] useUser fallback activated:', error);
    }
    return userFallback;
  }
}

export function SignedIn({ children, ...props }: PropsWithChildren<Record<string, unknown>>) {
  if (!HAS_VALID_CLERK_PUBLISHABLE_KEY) {
    return null;
  }

  return <ClerkSignedIn {...props}>{children}</ClerkSignedIn>;
}

export function SignedOut({ children, ...props }: PropsWithChildren<Record<string, unknown>>) {
  if (!HAS_VALID_CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }

  return <ClerkSignedOut {...props}>{children}</ClerkSignedOut>;
}

export function SignInButton(props: ComponentProps<typeof ClerkSignInButton>) {
  if (!HAS_VALID_CLERK_PUBLISHABLE_KEY) {
    return <>{props.children ?? null}</>;
  }

  return <ClerkSignInButton {...props} />;
}
