/* eslint-disable react-refresh/only-export-components */
/**
 * UserProfileContext
 *
 * Manages authenticated user profile state across the app.
 * Fetches profile on sign-in, provides update methods, tracks messages.
 * Uses localStorage fallback when API is unavailable (local dev).
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { createDefaultAvatar, type UserAvatar } from '@/types/avatar';

// localStorage key for profile fallback
const PROFILE_STORAGE_KEY = 'wojak_user_profile';

export interface UserProfile {
  displayName: string | null;
  xHandle: string | null;
  walletAddress: string | null;
  createdAt: string | null; // Account creation date (from users table)
  updatedAt: string | null;
  // Streak tracking
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string | null;
  // Avatar fields
  avatar: UserAvatar;
  ownedNftIds: string[]; // List of NFT edition numbers user owns
  // NFT verification for chat access
  nftCount: number | null; // null = never verified, 0+ = verified count
  nftVerifiedAt: string | null; // ISO timestamp of last verification
}

export interface UserMessage {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  createdAt: string;
}

interface UserProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  isLoaded: boolean;
  needsOnboarding: boolean;
  unreadMessages: number;
  error: string | null;
  isAdmin: boolean; // Admin status for chat bypass (from CHAT_ADMIN_USER_IDS env var)
}

interface UserProfileContextValue extends UserProfileState {
  // Profile methods
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;

  // Avatar methods
  updateAvatar: (avatar: UserAvatar) => Promise<boolean>;
  refreshOwnedNfts: () => Promise<void>;

  // Computed display name (NEVER returns "Anonymous")
  effectiveDisplayName: string;

  // Clerk user info
  clerkUser: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
  } | null;

  // Auth state
  isSignedIn: boolean;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const clerkAuth = useClerkAuth();

  const isSignedIn = clerkAuth.isSignedIn ?? false;
  const authLoaded = clerkAuth.isLoaded ?? true;
  const user = clerkAuth.user;

  // Inline authenticated fetch using ClerkAuthContext only (no useAuthenticatedFetch to avoid Clerk useAuth in this tree)
  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const token = clerkAuth.getToken ? await clerkAuth.getToken() : null;
      const headers = new Headers(options.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      headers.set('Content-Type', 'application/json');
      return fetch(url, { ...options, headers });
    },
    [clerkAuth.getToken]
  );

  const [state, setState] = useState<UserProfileState>({
    profile: null,
    isLoading: false,
    isLoaded: false,
    needsOnboarding: false,
    unreadMessages: 0,
    error: null,
    isAdmin: false,
  });

  const fetchedRef = useRef(false);
  const previousSignedIn = useRef<boolean | null>(null);

  // Load profile from localStorage (fallback)
  const loadProfileFromStorage = useCallback((): UserProfile | null => {
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[UserProfile] Error loading from localStorage:', e);
    }
    return null;
  }, []);

  // Save profile to localStorage (fallback)
  const saveProfileToStorage = useCallback((profile: UserProfile) => {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('[UserProfile] Error saving to localStorage:', e);
    }
  }, []);

  // Fetch profile from API with timeout, fallback to localStorage
  const fetchProfile = useCallback(async () => {
    if (!isSignedIn) return;

    setState(s => ({ ...s, isLoading: true, error: null }));

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

      const response = await authenticatedFetch('/api/profile', {
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (response.ok) {
        const data = await response.json();
        // Map API response to UserProfile, ensuring defaults
        const apiProfile = data.profile;
        const profile: UserProfile | null = apiProfile ? {
          displayName: apiProfile.displayName,
          xHandle: apiProfile.xHandle,
          walletAddress: apiProfile.walletAddress,
          createdAt: apiProfile.createdAt || null,
          updatedAt: apiProfile.updatedAt,
          currentStreak: apiProfile.currentStreak || 0,
          longestStreak: apiProfile.longestStreak || 0,
          lastPlayedDate: apiProfile.lastPlayedDate || null,
          // Avatar fields - create default if not set
          avatar: apiProfile.avatar || createDefaultAvatar(),
          ownedNftIds: apiProfile.ownedNftIds || [],
          // NFT verification for chat access
          nftCount: apiProfile.nftCount ?? null,
          nftVerifiedAt: apiProfile.nftVerifiedAt || null,
        } : null;

        // Save to localStorage as backup
        if (profile) {
          saveProfileToStorage(profile);
        }

        const needsOnboarding = !profile?.displayName;

        setState(s => ({
          ...s,
          profile,
          isLoading: false,
          isLoaded: true,
          needsOnboarding,
          error: null,
          isAdmin: data.isAdmin ?? false,
        }));
        return;
      }
    } catch (error) {
      // Ignore AbortError - these are expected when component unmounts or request times out
      if (error instanceof Error && error.name === 'AbortError') {
        // intentionally empty
      } else {
        console.error('[UserProfile] API error, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    let storedProfile = loadProfileFromStorage();

    // Auto-assign random emoji if no avatar exists
    if (!storedProfile?.avatar?.value) {
      const randomAvatar = createDefaultAvatar();

      storedProfile = {
        displayName: storedProfile?.displayName || null,
        xHandle: storedProfile?.xHandle || null,
        walletAddress: storedProfile?.walletAddress || null,
        createdAt: storedProfile?.createdAt || null,
        updatedAt: storedProfile?.updatedAt || null,
        currentStreak: storedProfile?.currentStreak || 0,
        longestStreak: storedProfile?.longestStreak || 0,
        lastPlayedDate: storedProfile?.lastPlayedDate || null,
        avatar: randomAvatar,
        ownedNftIds: storedProfile?.ownedNftIds || [],
        nftCount: storedProfile?.nftCount ?? null,
        nftVerifiedAt: storedProfile?.nftVerifiedAt || null,
      };

      // Save the profile with the random avatar
      saveProfileToStorage(storedProfile);
    }

    const needsOnboarding = !storedProfile?.displayName;

    setState(s => ({
      ...s,
      profile: storedProfile,
      isLoading: false,
      isLoaded: true,
      needsOnboarding,
      error: null,
    }));
  }, [isSignedIn, authenticatedFetch, loadProfileFromStorage, saveProfileToStorage]);

  // Fetch unread messages count
  const fetchUnreadCount = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      const response = await authenticatedFetch('/api/messages/unread-count');

      if (response.ok) {
        const data = await response.json();
        setState(s => ({ ...s, unreadMessages: data.count || 0 }));
      }
    } catch (error) {
      console.error('[UserProfile] Error fetching unread count:', error);
    }
  }, [isSignedIn, authenticatedFetch]);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    await fetchProfile();
    await fetchUnreadCount();
  }, [fetchProfile, fetchUnreadCount]);

  // Update profile (API with localStorage fallback)
  const updateProfile = useCallback(async (data: Partial<UserProfile>): Promise<boolean> => {
    if (!isSignedIn) {
      return false;
    }


    try {
      // Try API first with timeout (increased to 10s for reliability)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await authenticatedFetch('/api/profile', {
        method: 'POST',
        body: JSON.stringify(data),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (response.ok) {
        const result = await response.json();
        // Also save to localStorage
        if (result.profile) {
          saveProfileToStorage(result.profile);
        }
        setState(s => ({
          ...s,
          profile: result.profile,
          needsOnboarding: !result.profile?.displayName,
        }));
        return true;
      } else {
        // API returned an error response
        const errorData = await response.json().catch(() => ({}));
        console.error('[UserProfile] API returned error:', response.status, errorData);
        // Don't fall through to localStorage - return false to indicate failure
        // This ensures the user sees an error message
        return false;
      }
    } catch (error) {
      console.error('[UserProfile] API update failed with exception:', error);
    }

    // Fallback: update localStorage directly (only for network/timeout errors)
    const currentProfile = state.profile || {
      displayName: null,
      xHandle: null,
      walletAddress: null,
      createdAt: null,
      updatedAt: null,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedDate: null,
      avatar: createDefaultAvatar(),
      ownedNftIds: [],
      nftCount: null,
      nftVerifiedAt: null,
    };

    const updatedProfile: UserProfile = {
      ...currentProfile,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    saveProfileToStorage(updatedProfile);

    setState(s => ({
      ...s,
      profile: updatedProfile,
      needsOnboarding: !updatedProfile.displayName,
    }));

    return true;
  }, [isSignedIn, authenticatedFetch, state.profile, saveProfileToStorage]);

  // Update avatar
  const updateAvatar = useCallback(async (avatar: UserAvatar): Promise<boolean> => {
    return updateProfile({ avatar });
  }, [updateProfile]);

  // Refresh owned NFTs from wallet - stub for now, NFTPicker handles this directly
  const refreshOwnedNfts = useCallback(async () => {
    // NFT refresh is handled by the NFTPicker component which has access to useSageWallet
  }, []);

  // Computed effective display name (NEVER returns "Anonymous")
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const effectiveDisplayName = useMemo(() => {
    // Priority: custom display name > Google first name > email prefix > "Player"
    if (state.profile?.displayName) return state.profile.displayName;
    if (user?.firstName) return user.firstName;
    if (user?.email) return user.email.split('@')[0];
    return 'Player';
  }, [state.profile?.displayName, user?.firstName, user?.email]);

  // Store refreshProfile in a ref to avoid dependency issues
  const refreshProfileRef = useRef(refreshProfile);
  useEffect(() => { refreshProfileRef.current = refreshProfile; }, [refreshProfile]);

  // Fetch profile when user signs in
  useEffect(() => {
    if (!authLoaded) return;

    // Detect sign-in state change
    const signedInChanged = previousSignedIn.current !== null && previousSignedIn.current !== isSignedIn;
    previousSignedIn.current = isSignedIn ?? null;

    // Reset state on sign-out
    if (!isSignedIn) {
      fetchedRef.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on sign-out
      setState({
        profile: null,
        isLoading: false,
        isLoaded: true,
        needsOnboarding: false,
        unreadMessages: 0,
        error: null,
        isAdmin: false,
      });
      return;
    }

    // Fetch profile on sign-in (or if we just signed in)
    if (isSignedIn && (!fetchedRef.current || signedInChanged)) {
      fetchedRef.current = true;
      refreshProfileRef.current();
    }
  }, [authLoaded, isSignedIn]);

  // Clerk user info (from ClerkAuthContext)
  const clerkUserInfo = user ? {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    imageUrl: user.imageUrl,
  } : null;

  const value: UserProfileContextValue = {
    ...state,
    refreshProfile,
    updateProfile,
    updateAvatar,
    refreshOwnedNfts,
    effectiveDisplayName,
    clerkUser: clerkUserInfo,
    isSignedIn: isSignedIn ?? false,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}

// Optional hook that returns null if not in provider (for optional use)
export function useUserProfileOptional() {
  return useContext(UserProfileContext);
}

export default UserProfileContext;
