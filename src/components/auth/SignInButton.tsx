/**
 * Sign In Button Component
 *
 * Shows sign in button when logged out, or user avatar/menu when logged in.
 * Handles the auth flow including Google sign-in and username picker.
 */

import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Pencil, Wallet } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../Avatar/Avatar';
import { AvatarPickerModal } from '../AvatarPicker';
import { UsernamePicker } from '../UsernamePicker';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import './SignInButton.css';

interface SignInButtonProps {
  variant?: 'compact' | 'full';
}

export const SignInButton: React.FC<SignInButtonProps> = ({
  variant = 'compact'
}) => {
  const {
    user,
    isLoading,
    isAuthenticated,
    isNewUser,
    signInWithGoogle,
    signOut,
    connectWallet,
    disconnectWallet
  } = useAuth();

  const [showMenu, setShowMenu] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [_showUsernamePicker, _setShowUsernamePicker] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Google login hook
  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${response.access_token}` },
        });
        const userData = await userInfo.json();
        await signInWithGoogle(JSON.stringify(userData));
      } catch (error) {
        console.error('Sign in failed:', error);
      } finally {
        setIsSigningIn(false);
      }
    },
    onError: () => {
      console.error('Google login failed');
      setIsSigningIn(false);
    },
  });

  const handleSignIn = () => {
    setIsSigningIn(true);
    googleLogin();
  };

  const handleSignOut = async () => {
    setShowMenu(false);
    await signOut();
  };

  const handleWalletAction = async () => {
    setShowMenu(false);
    if (user?.walletAddress) {
      await disconnectWallet();
    } else {
      await connectWallet();
    }
  };

  const handleAvatarClick = () => {
    setShowMenu(false);
    setShowAvatarPicker(true);
  };

  const handleUsernameComplete = () => {
    _setShowUsernamePicker(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="sign-in-button-loading">
        <LoadingSpinner size={20} />
      </div>
    );
  }

  // Not authenticated - show sign in button
  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className={`btn btn-primary sign-in-button ${variant}`}
        >
          {isSigningIn ? (
            <LoadingSpinner size={18} />
          ) : (
            <>
              <User size={18} />
              {variant === 'full' ? 'Sign In with Google' : 'Sign In'}
            </>
          )}
        </button>

        <UsernamePicker
          isOpen={isNewUser}
          onComplete={handleUsernameComplete}
        />
      </>
    );
  }

  // Authenticated - show user avatar with menu
  return (
    <>
      <button
        ref={triggerRef}
        className="user-avatar-button"
        onClick={() => setShowMenu(!showMenu)}
        aria-label="User menu"
        aria-expanded={showMenu}
        aria-haspopup="true"
      >
        <Avatar
          type={user?.avatar.type || 'emoji'}
          value={user?.avatar.value || '🍊'}
          size="small"
          isNftHolder={!!user?.walletAddress && user?.avatar.type === 'nft'}
        />
        {variant === 'full' && (
          <span className="username-label">{user?.username || 'User'}</span>
        )}
      </button>

      {showMenu && (
        <div ref={menuRef} className="user-menu-popover">
          <div className="user-menu-header">
            <Avatar
              type={user?.avatar.type || 'emoji'}
              value={user?.avatar.value || '🍊'}
              size="medium"
              isNftHolder={!!user?.walletAddress && user?.avatar.type === 'nft'}
            />
            <div className="user-info">
              <span className="user-name">{user?.username || 'User'}</span>
              {user?.walletAddress && (
                <span className="wallet-badge">Wallet Connected</span>
              )}
            </div>
          </div>

          <div className="user-menu-items">
            <button className="user-menu-item" onClick={handleAvatarClick}>
              <Pencil size={18} />
              Change Avatar
            </button>

            <button className="user-menu-item" onClick={handleWalletAction}>
              <Wallet size={18} />
              {user?.walletAddress ? 'Disconnect Wallet' : 'Connect Wallet'}
            </button>

            <button className="user-menu-item sign-out-item" onClick={handleSignOut}>
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      )}

      <AvatarPickerModal
        isOpen={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
      />

      <UsernamePicker
        isOpen={isNewUser && !user?.username}
        onComplete={handleUsernameComplete}
      />
    </>
  );
};

export default SignInButton;
