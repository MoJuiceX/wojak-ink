/**
 * ProfileGuard Component
 *
 * Shows onboarding modal for authenticated users who haven't completed their profile.
 * Uses UserProfileContext for state management.
 */

import { useEffect, useState } from 'react';
import { useUserProfileOptional } from '@/contexts/UserProfileContext';
import OnboardingModal from '@/components/auth/OnboardingModal';

// Check if Clerk is configured
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Storage key for skipped onboarding
const ONBOARDING_SKIPPED_KEY = 'wojak_onboarding_skipped';

interface ProfileGuardProps {
  children?: React.ReactNode;
}

export function ProfileGuard({ children }: ProfileGuardProps) {
  const userProfile = useUserProfileOptional();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Skip if Clerk not configured or context not available
    if (!CLERK_ENABLED || !userProfile) return;

    // Skip if not signed in or still loading
    if (!userProfile.isSignedIn || !userProfile.isLoaded) return;

    // Check if user previously skipped onboarding
    const wasSkipped = localStorage.getItem(ONBOARDING_SKIPPED_KEY) === 'true';

    // Show onboarding modal if profile is incomplete and not skipped
    queueMicrotask(() => {
      if (userProfile.needsOnboarding && !wasSkipped) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    });
  }, [userProfile]);

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_SKIPPED_KEY, 'true');
    setShowOnboarding(false);
  };

  const handleComplete = () => {
    // Clear skipped flag on successful completion
    localStorage.removeItem(ONBOARDING_SKIPPED_KEY);
    setShowOnboarding(false);
  };

  return (
    <>
      {children}
      {showOnboarding && (
        <OnboardingModal onSkip={handleSkip} onComplete={handleComplete} />
      )}
    </>
  );
}

export default ProfileGuard;
