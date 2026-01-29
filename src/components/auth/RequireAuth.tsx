/**
 * RequireAuth Component
 *
 * Wrapper for routes that require authentication.
 * Redirects to home if not signed in.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

// Check if Clerk is configured
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

interface RequireAuthProps {
  children: React.ReactNode;
}

function ClerkRequireAuth({ children }: RequireAuthProps) {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/gallery', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  // Wait for Clerk to load
  if (!isLoaded) {
    return null;
  }

  // If not signed in, don't render (redirect will happen in useEffect)
  if (!isSignedIn) {
    return null;
  }

  return <>{children}</>;
}

function NoAuthRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/gallery', { replace: true });
  }, [navigate]);
  return null;
}

export function RequireAuth({ children }: RequireAuthProps) {
  // If Clerk is not configured, redirect to gallery
  if (!CLERK_ENABLED) {
    return <NoAuthRedirect />;
  }

  return <ClerkRequireAuth>{children}</ClerkRequireAuth>;
}

export default RequireAuth;
