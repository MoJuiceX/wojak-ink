/* eslint-disable react-refresh/only-export-components */
/**
 * Authentication Context
 *
 * Provides Google OAuth authentication, user state management,
 * avatar/username updates, and wallet connection.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import type { AvatarData } from '../constants/avatars';
import { getRandomEmoji } from '../constants/avatars';
import { safeStorage } from '@/utils/safeStorage';

// Types
export interface User {
  id: string;
  email: string;
  googleId: string;
  username: string;
  displayName: string;
  avatar: AvatarData;
  walletAddress: string | null;
  createdAt: Date;
  lastLoginAt: Date;
}

interface GoogleTokenPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isNewUser: boolean;
  signInWithGoogle: (credential: string) => Promise<void>;
  signOut: () => void;
  updateUsername: (username: string) => Promise<boolean>;
  updateAvatar: (avatar: AvatarData) => Promise<void>;
  connectWallet: () => Promise<string | null>;
  disconnectWallet: () => void;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Google Client ID - store in environment variable
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Storage keys
const AUTH_TOKEN_KEY = 'wojak_auth_token';
const USER_DATA_KEY = 'wojak_user_data';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const token = safeStorage.getItem(AUTH_TOKEN_KEY);
      const savedUserData = safeStorage.getItem(USER_DATA_KEY);

      if (token && savedUserData) {
        // For now, use local storage as the source of truth
        // In production, validate token with backend
        const userData = JSON.parse(savedUserData) as User;

        // Check if token is expired (simple check - in production use backend validation)
        try {
          const decoded = jwtDecode<{ exp?: number }>(token);
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            // Token expired
            safeStorage.removeItem(AUTH_TOKEN_KEY);
            safeStorage.removeItem(USER_DATA_KEY);
            setIsLoading(false);
            return;
          }
        } catch {
          // If we can't decode (might be our own token format), still use the data
        }

        setUser(userData);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      safeStorage.removeItem(AUTH_TOKEN_KEY);
      safeStorage.removeItem(USER_DATA_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (credential: string) => {
    setIsLoading(true);
    try {
      // Decode the Google credential to get user info
      const decoded = jwtDecode<GoogleTokenPayload>(credential);

      // Check if user exists in local storage (simulating database)
      const existingUsers = safeStorage.getJSON<Record<string, User>>('wojak_users', {});
      const existingUser = existingUsers[decoded.sub];

      let userData: User;
      let newUser = false;

      if (existingUser) {
        // Returning user - update last login
        userData = {
          ...existingUser,
          lastLoginAt: new Date(),
        };
      } else {
        // New user - create profile
        newUser = true;
        userData = {
          id: crypto.randomUUID(),
          email: decoded.email,
          googleId: decoded.sub,
          username: '', // Will be set during onboarding
          displayName: decoded.name || decoded.email.split('@')[0],
          avatar: {
            type: 'emoji',
            value: getRandomEmoji(),
          },
          walletAddress: null,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        };
      }

      // Save to "database" (localStorage for now)
      existingUsers[decoded.sub] = userData;
      safeStorage.setJSON('wojak_users', existingUsers);

      // Save session
      safeStorage.setItem(AUTH_TOKEN_KEY, credential);
      safeStorage.setJSON(USER_DATA_KEY, userData);

      setUser(userData);
      setIsNewUser(newUser);
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = useCallback(() => {
    safeStorage.removeItem(AUTH_TOKEN_KEY);
    safeStorage.removeItem(USER_DATA_KEY);
    setUser(null);
    setIsNewUser(false);
  }, []);

  const updateUsername = async (username: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Check if username is taken (in local storage for now)
      const existingUsers = safeStorage.getJSON<Record<string, User>>('wojak_users', {});
      const usernameLower = username.toLowerCase();

      for (const [googleId, userData] of Object.entries(existingUsers)) {
        const u = userData as User;
        if (u.username?.toLowerCase() === usernameLower && googleId !== user.googleId) {
          return false; // Username taken
        }
      }

      // Update user
      const updatedUser = {
        ...user,
        username,
      };

      // Save to "database"
      existingUsers[user.googleId] = updatedUser;
      safeStorage.setJSON('wojak_users', existingUsers);
      safeStorage.setJSON(USER_DATA_KEY, updatedUser);

      setUser(updatedUser);
      return true;
    } catch (error) {
      console.error('Username update failed:', error);
      return false;
    }
  };

  const updateAvatar = async (avatar: AvatarData) => {
    if (!user) return;

    try {
      const updatedUser = {
        ...user,
        avatar,
      };

      // Save to "database"
      const existingUsers = safeStorage.getJSON<Record<string, User>>('wojak_users', {});
      existingUsers[user.googleId] = updatedUser;
      safeStorage.setJSON('wojak_users', existingUsers);
      safeStorage.setJSON(USER_DATA_KEY, updatedUser);

      setUser(updatedUser);
    } catch (error) {
      console.error('Avatar update failed:', error);
      throw error;
    }
  };

  const connectWallet = async (): Promise<string | null> => {
    // Placeholder for wallet connection
    // Will be implemented with Sage Wallet / WalletConnect SDK
    try {
      // See GitHub issue #1
      return null;
    } catch (error) {
      console.error('Wallet connection failed:', error);
      return null;
    }
  };

  const disconnectWallet = useCallback(() => {
    if (!user) return;

    const updatedUser = {
      ...user,
      walletAddress: null,
    };

    // Save to "database"
    const existingUsers = safeStorage.getJSON<Record<string, User>>('wojak_users', {});
    existingUsers[user.googleId] = updatedUser;
    safeStorage.setJSON('wojak_users', existingUsers);
    safeStorage.setJSON(USER_DATA_KEY, updatedUser);

    setUser(updatedUser);
  }, [user]);

  const completeOnboarding = useCallback(() => {
    setIsNewUser(false);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isNewUser,
    signInWithGoogle,
    signOut,
    updateUsername,
    updateAvatar,
    connectWallet,
    disconnectWallet,
    completeOnboarding,
  };

  // If no Google Client ID, render children without provider
  if (!GOOGLE_CLIENT_ID) {
    return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Hook to check if user can compete on leaderboards
export const useCanCompete = () => {
  const { user } = useAuth();
  return user?.walletAddress !== null && user?.username !== '';
};

// Hook to get display name (username or displayName or email prefix)
export const useDisplayName = () => {
  const { user } = useAuth();
  if (!user) return 'Guest';
  return user.username || user.displayName || user.email.split('@')[0];
};
