/* eslint-disable react-refresh/only-export-components */
/**
 * FriendsContext
 *
 * Manages friend relationships and user discovery.
 * Uses database as primary storage with localStorage as cache.
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/clerkSafe';
import { useUserProfile } from './UserProfileContext';

const FRIENDS_STORAGE_KEY = 'wojak_friends';

interface UserSummary {
  id: string;
  displayName: string;
  avatar: {
    type: 'emoji' | 'nft';
    value: string;
    source: 'default' | 'user' | 'wallet';
  };
}

interface FriendsContextType {
  friends: string[];                    // Array of friend user IDs
  friendProfiles: UserSummary[];        // Full friend data
  isLoading: boolean;
  profilesLoaded: boolean;              // Whether profile fetch has completed

  // Friend management
  addFriend: (userId: string) => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;
  isFriend: (userId: string) => boolean;

  // User discovery
  searchUsers: (query: string) => Promise<UserSummary[]>;
  getAllUsers: (limit?: number, offset?: number) => Promise<{
    users: UserSummary[];
    total: number;
    hasMore: boolean;
  }>;

  // Refresh
  refreshFriends: () => Promise<void>;
}

const FriendsContext = createContext<FriendsContextType | null>(null);

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useUserProfile();
  const { userId, getToken } = useAuth();

  const [friends, setFriends] = useState<string[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [profilesLoaded, setProfilesLoaded] = useState(false);

  // Store getToken in ref to avoid dependency issues
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  // Authenticated fetch helper
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getTokenRef.current();
    const headers = new Headers(options.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return fetch(url, { ...options, headers });
  }, []);

  // Save friends to localStorage (define before using in effects)
  const saveFriendsToStorage = useCallback((uid: string, friendIds: string[]) => {
    const stored = localStorage.getItem(FRIENDS_STORAGE_KEY);
    const allFriends = stored ? JSON.parse(stored) : {};
    allFriends[uid] = friendIds;
    localStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(allFriends));
  }, []);

  // Load friends from database on mount, with localStorage fallback
  useEffect(() => {
    if (!isSignedIn || !userId) {
      setFriends([]);
      setFriendProfiles([]);
      return;
    }

    const currentUserId = userId; // Capture for async closure

    async function loadFriends() {
      setIsLoading(true);
      try {
        // Try loading from database first (with auth)
        const response = await authFetch('/api/friends');
        if (response.ok) {
          const data = await response.json();
          const friendIds = data.friendIds || [];
          setFriends(friendIds);
          // Update localStorage cache
          saveFriendsToStorage(currentUserId, friendIds);
          setIsLoading(false);
          return;
        } else {
          // intentionally empty
        }
      } catch {
        // intentionally empty
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(FRIENDS_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const userFriends = parsed[currentUserId] || [];
          setFriends(userFriends);
        } catch (e) {
          console.error('[Friends] Failed to parse stored friends:', e);
        }
      }
      setIsLoading(false);
    }

    loadFriends();
  }, [isSignedIn, userId, saveFriendsToStorage, authFetch]);

  // Fetch friend profiles when friends list changes
  useEffect(() => {
    if (friends.length === 0) {
      setFriendProfiles([]);
      setProfilesLoaded(true);
      return;
    }

    // Reset profilesLoaded when friends change
    setProfilesLoaded(false);

    async function fetchProfiles() {
      setIsLoading(true);
      try {
        // Fetch profiles for all friends
        const profiles = await Promise.all(
          friends.map(async (friendId) => {
            try {
              const response = await fetch(`/api/profile/${friendId}`);
              if (!response.ok) {
                const errorText = await response.text();
                console.warn(`[Friends] Profile fetch failed for ${friendId}:`, response.status, errorText);
                return null;
              }
              const data = await response.json();
              return {
                id: data.userId,
                displayName: data.displayName,
                avatar: data.avatar,
              } as UserSummary;
            } catch (err) {
              console.warn(`[Friends] Profile fetch error for ${friendId}:`, err);
              return null;
            }
          })
        );
        const validProfiles = profiles.filter(Boolean) as UserSummary[];
        setFriendProfiles(validProfiles);
      } catch (error) {
        console.error('[Friends] Failed to fetch friend profiles:', error);
      } finally {
        setIsLoading(false);
        setProfilesLoaded(true);
      }
    }

    fetchProfiles();
  }, [friends]);

  // Add friend - saves to both backend (primary) and localStorage (cache)
  const addFriend = useCallback(async (friendId: string) => {
    if (!userId || friendId === userId) return;
    if (friends.includes(friendId)) return; // Already a friend

    const newFriends = [...friends, friendId];

    // Update local state and cache immediately for responsiveness
    setFriends(newFriends);
    saveFriendsToStorage(userId, newFriends);

    // Save to backend (primary storage) with auth
    try {
      const response = await authFetch('/api/friends', {
        method: 'POST',
        body: JSON.stringify({ friendId }),
      });
      if (response.ok) {
        // intentionally empty
      } else {
        console.warn('[Friends] Backend save failed:', response.status);
      }
    } catch (e) {
      console.warn('[Friends] Backend save error:', e);
    }
  }, [userId, friends, saveFriendsToStorage, authFetch]);

  // Remove friend - removes from both backend (primary) and localStorage (cache)
  const removeFriend = useCallback(async (friendId: string) => {
    if (!userId) return;

    const newFriends = friends.filter(id => id !== friendId);

    // Update local state and cache immediately for responsiveness
    setFriends(newFriends);
    saveFriendsToStorage(userId, newFriends);

    // Remove from backend (primary storage) with auth
    try {
      const response = await authFetch(`/api/friends/${friendId}`, { method: 'DELETE' });
      if (response.ok) {
        // intentionally empty
      } else {
        console.warn('[Friends] Backend delete failed:', response.status);
      }
    } catch (e) {
      console.warn('[Friends] Backend delete error:', e);
    }
  }, [userId, friends, saveFriendsToStorage, authFetch]);

  // Check if user is friend
  const isFriend = useCallback((userId: string) => {
    return friends.includes(userId);
  }, [friends]);

  // Search users by display name
  const searchUsers = useCallback(async (query: string): Promise<UserSummary[]> => {
    if (!query.trim()) return [];

    try {
      const response = await authFetch(
        `/api/users?search=${encodeURIComponent(query)}&limit=20`
      );
      if (!response.ok) return [];

      const data = await response.json();
      return data.users.filter((u: UserSummary) => u.id !== userId);
    } catch (error) {
      console.error('[Friends] Search failed:', error);
      return [];
    }
  }, [userId, authFetch]);

  // Get all users (paginated)
  const getAllUsers = useCallback(async (limit = 50, offset = 0) => {
    try {
      const response = await authFetch(`/api/users?limit=${limit}&offset=${offset}`);
      if (!response.ok) {
        return { users: [], total: 0, hasMore: false };
      }

      const data = await response.json();
      return {
        users: data.users.filter((u: UserSummary) => u.id !== userId),
        total: data.total,
        hasMore: data.hasMore,
      };
    } catch (error) {
      console.error('[Friends] Failed to fetch users:', error);
      return { users: [], total: 0, hasMore: false };
    }
  }, [userId, authFetch]);

  // Refresh friends list
  const refreshFriends = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Reload from backend if available (with auth)
      const response = await authFetch('/api/friends');
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friendIds);
        saveFriendsToStorage(userId, data.friendIds);
      }
    } catch {
      // Use localStorage as fallback
    } finally {
      setIsLoading(false);
    }
  }, [userId, saveFriendsToStorage, authFetch]);

  return (
    <FriendsContext.Provider
      value={{
        friends,
        friendProfiles,
        isLoading,
        profilesLoaded,
        addFriend,
        removeFriend,
        isFriend,
        searchUsers,
        getAllUsers,
        refreshFriends,
      }}
    >
      {children}
    </FriendsContext.Provider>
  );
}

export function useFriends() {
  const context = useContext(FriendsContext);
  if (!context) {
    throw new Error('useFriends must be used within FriendsProvider');
  }
  return context;
}
