/**
 * UserAccountButton Component
 *
 * Shows sign-in button when signed out, navigates to Account page when signed in.
 * Uses Clerk for authentication (Google sign-in).
 */

import { SignedIn, SignedOut, SignInButton, useAuth, useUser } from '@clerk/clerk-react';
import { User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserProfile } from '@/contexts/UserProfileContext';

// Check if Clerk is configured
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

interface UserAccountButtonProps {
  showLabel?: boolean;
}

// Inner component that uses Clerk hooks (only rendered when Clerk is available)
function ClerkUserButton({ showLabel }: { showLabel: boolean }) {
  const auth = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadMessages } = useUserProfile();
  const isClerkLoaded = auth.isLoaded;
  const isActive = location.pathname === '/account';

  // If Clerk isn't loaded yet, show loading state
  if (!isClerkLoaded) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-50 text-muted"
      >
        <User size={20} />
        {showLabel && <span className="text-sm">Loading...</span>}
      </div>
    );
  }

  return (
    <>
      {/* Signed Out: Show sign-in button */}
      <SignedOut>
        <SignInButton mode="modal">
          <motion.button
            className="flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-colors text-secondary"
            whileHover={{
              background: 'var(--color-surface-hover)',
              color: 'var(--color-text)',
            }}
            whileTap={{ scale: 0.98 }}
            title="Sign in with Google"
          >
            <User size={20} />
            {showLabel && <span className="text-sm font-medium">Sign In</span>}
          </motion.button>
        </SignInButton>
      </SignedOut>

      {/* Signed In: Navigate to Account page */}
      <SignedIn>
        <motion.button
          onClick={() => navigate('/account')}
          className="flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-colors"
          style={{
            color: isActive ? 'var(--color-text)' : 'var(--color-text-secondary)',
            background: isActive ? 'var(--color-surface-hover)' : 'transparent',
          }}
          whileHover={{
            background: 'var(--color-surface-hover)',
            color: 'var(--color-text)',
          }}
          whileTap={{ scale: 0.98 }}
          title="Account"
        >
          <div className="relative">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt="Profile"
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <User size={20} />
            )}
            {/* Unread messages badge */}
            {unreadMessages > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 rounded-full text-[10px] flex items-center justify-center font-bold"
                style={{ background: 'var(--color-error)', color: 'white' }}
                role="status"
                aria-label={`${unreadMessages > 9 ? 'More than 9' : unreadMessages} unread message${unreadMessages === 1 ? '' : 's'}`}
              >
                {unreadMessages > 9 ? '!' : unreadMessages}
              </span>
            )}
          </div>
          {showLabel && (
            <span className="text-sm font-medium">
              Account
            </span>
          )}
        </motion.button>
      </SignedIn>
    </>
  );
}

export function UserAccountButton({ showLabel = false }: UserAccountButtonProps) {
  // If Clerk isn't configured, show disabled placeholder
  if (!CLERK_ENABLED) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-50 cursor-not-allowed text-muted"
        title="Auth not configured"
      >
        <User size={20} />
        {showLabel && <span className="text-sm">Sign In</span>}
      </div>
    );
  }

  return <ClerkUserButton showLabel={showLabel} />;
}

export default UserAccountButton;
