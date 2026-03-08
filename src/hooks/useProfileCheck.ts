/**
 * useProfileCheck Hook
 *
 * Checks if the authenticated user has completed their profile.
 * Redirects to onboarding if profile is missing xHandle.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/clerkSafe';
import { useAuthenticatedFetch } from './useAuthenticatedFetch';
import { API_ENDPOINTS } from '@/services/constants';

// Check if Clerk is configured
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

interface ProfileData {
  displayName: string | null;
  xHandle: string | null;
  updatedAt: string;
}

interface UseProfileCheckResult {
  isLoading: boolean;
  profile: ProfileData | null;
  needsOnboarding: boolean;
  refetch: () => Promise<void>;
}

export function useProfileCheck(): UseProfileCheckResult {
  const navigate = useNavigate();
  const location = useLocation();
  // Always call hooks unconditionally (rules of hooks)
  const clerkAuth = useAuth();
  const { isSignedIn, isLoaded } = CLERK_ENABLED ? clerkAuth : { isSignedIn: false, isLoaded: true };
  const { authenticatedFetch } = useAuthenticatedFetch();

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const fetchProfile = useCallback(async (signal?: AbortSignal) => {
    if (!CLERK_ENABLED || !isSignedIn) {
      setIsLoading(false);
      setNeedsOnboarding(false);
      return;
    }

    try {
      const response = await authenticatedFetch(API_ENDPOINTS.profile, { signal });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);

        // Check if profile is missing xHandle
        const missingXHandle = !data.profile?.xHandle;
        setNeedsOnboarding(missingXHandle);

        // Redirect to onboarding if needed (and not already there)
        if (missingXHandle && location.pathname !== '/onboarding') {
          navigate('/onboarding', { replace: true });
        }
      }
    } catch (error) {
      // Ignore AbortError - expected when component unmounts during fetch
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('[ProfileCheck] Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, authenticatedFetch, location.pathname, navigate]);

  useEffect(() => {
    if (!isLoaded) return;

    const controller = new AbortController();

    if (isSignedIn) {
      fetchProfile(controller.signal);
    } else {
      setIsLoading(false);
      setProfile(null);
      setNeedsOnboarding(false);
    }

    return () => controller.abort();
  }, [isLoaded, isSignedIn, fetchProfile]);

  return {
    isLoading,
    profile,
    needsOnboarding,
    refetch: fetchProfile,
  };
}

export default useProfileCheck;
