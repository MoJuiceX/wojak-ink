/**
 * AccountSettings Component
 *
 * User account management: profile info, wallet connection, messages, sign out.
 */

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useClerk, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import {
  User,
  AtSign,
  Wallet,
  LogOut,
  Edit3,
  Check,
  X,
  Loader2,
  ChevronRight,
  Bell,
} from 'lucide-react';
import { settingsSectionVariants } from '@/config/settingsAnimations';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { MessagesModal } from './MessagesModal';

// Check if Clerk is configured
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

interface EditableFieldProps {
  label: string;
  value: string | null;
  icon: React.ReactNode;
  placeholder: string;
  onSave: (value: string) => Promise<boolean>;
  validation?: (value: string) => string | null;
}

function EditableField({ label, value, icon, placeholder, onSave, validation }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => setEditValue(value || ''));
  }, [value]);

  const handleSave = async () => {
    // Validate
    if (validation) {
      const validationError = validation(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    const success = await onSave(editValue);

    setIsSaving(false);
    if (success) {
      setIsEditing(false);
    } else {
      setError('Failed to save');
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="space-y-1">
      <label
        className="text-xs font-medium text-tertiary"
      >
        {label}
      </label>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
            >
              {icon}
            </span>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-3 py-2 rounded-lg text-sm text-primary"
              style={{
                background: 'var(--color-bg)',
                border: error ? '1px solid #ef4444' : '1px solid var(--color-border)',
              }}
              autoFocus
            />
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-2 rounded-lg"
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
            }}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          </button>
          <button
            onClick={handleCancel}
            className="p-2 rounded-lg text-secondary"
            style={{
              background: 'var(--color-elevated)',
            }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
          style={{
            background: 'var(--color-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span className="text-tertiary">{icon}</span>
          <span
            className="flex-1 text-sm"
            style={{ color: value ? 'var(--color-text)' : 'var(--color-text-muted)' }}
          >
            {value || placeholder}
          </span>
          <Edit3 size={14} className="text-tertiary" />
        </button>
      )}
      {error && (
        <p className="text-xs text-error">{error}</p>
      )}
    </div>
  );
}

export function AccountSettings() {
  const prefersReducedMotion = useReducedMotion();
  // Always call the hook unconditionally
  const clerkResult = useClerk();
  const { signOut } = CLERK_ENABLED ? clerkResult : { signOut: () => {} };
  const {
    profile,
    clerkUser,
    isLoading,
    updateProfile,
    unreadMessages,
  } = useUserProfile();
  const walletConnect = useWalletConnect();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);

  const handleSignOut = async () => {
    if (CLERK_ENABLED) {
      await signOut();
    }
  };

  const handleConnectWallet = () => {
    setShowWalletModal(true);
    walletConnect.connect();
  };

  // Close modal when connected
  useEffect(() => {
    if (walletConnect.isConnected && showWalletModal) {
      queueMicrotask(() => setShowWalletModal(false));
    }
  }, [walletConnect.isConnected, showWalletModal]);

  return (
    <motion.section
      variants={prefersReducedMotion ? undefined : settingsSectionVariants}
      initial="initial"
      animate="animate"
      className="space-y-4"
      aria-labelledby="account-section-heading"
    >
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <User size={20} className="text-accent" />
        <h2
          id="account-section-heading"
          className="text-lg font-bold text-primary"
        >
          Account
        </h2>
      </div>

      {/* Account Card */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <SignedOut>
          {/* Not signed in */}
          <div className="p-6 text-center">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-elevated)' }}
            >
              <User size={32} className="text-muted" />
            </div>
            <p
              className="text-sm mb-4 text-secondary"
            >
              Sign in to save your profile and compete on leaderboards
            </p>
            <SignInButton mode="modal">
              <motion.button
                className="px-6 py-3 rounded-lg font-medium text-white"
                style={{ background: 'var(--color-primary)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Sign In with Google
              </motion.button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          {isLoading ? (
            <div className="p-6 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-accent" />
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {/* User Info Header */}
              <div className="p-4 flex items-center gap-3">
                {clerkUser?.imageUrl ? (
                  <img
                    src={clerkUser.imageUrl}
                    alt="Profile"
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--gradient-accent)' }}
                  >
                    <User size={24} style={{ color: '#fff' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium truncate text-primary"
                  >
                    {profile?.displayName || clerkUser?.firstName || 'User'}
                  </p>
                  <p
                    className="text-sm truncate text-secondary"
                  >
                    {clerkUser?.email}
                  </p>
                </div>
              </div>

              {/* Profile Fields */}
              <div className="p-4 space-y-4">
                <EditableField
                  label="Display Name"
                  value={profile?.displayName || null}
                  icon={<User size={16} />}
                  placeholder="Enter display name"
                  onSave={async (value) => updateProfile({ displayName: value })}
                  validation={(value) => {
                    if (!value.trim()) return 'Display name is required';
                    if (value.length < 3 || value.length > 20) return 'Must be 3-20 characters';
                    return null;
                  }}
                />

                <EditableField
                  label="X Handle"
                  value={profile?.xHandle ? `@${profile.xHandle}` : null}
                  icon={<AtSign size={16} />}
                  placeholder="@yourhandle"
                  onSave={async (value) => {
                    const clean = value.replace(/^@/, '');
                    return updateProfile({ xHandle: clean || null });
                  }}
                  validation={(value) => {
                    const clean = value.replace(/^@/, '');
                    if (clean && !/^[a-zA-Z0-9_]{1,15}$/.test(clean)) {
                      return 'Must be 1-15 alphanumeric characters';
                    }
                    return null;
                  }}
                />
              </div>

              {/* Wallet Connection */}
              <div className="p-4">
                <label
                  className="text-xs font-medium mb-2 block text-tertiary"
                >
                  Wallet
                </label>
                {walletConnect.isConnected ? (
                  <div className="space-y-2">
                    <div
                      className="flex items-center gap-3 px-3 py-2 rounded-lg"
                      style={{
                        background: 'var(--color-elevated)',
                        border: '1px solid #22c55e',
                      }}
                    >
                      <Wallet size={18} className="text-success" />
                      <span
                        className="flex-1 text-sm text-primary"
                      >
                        Sage Wallet Connected
                      </span>
                      <Check size={16} className="text-success" />
                    </div>
                    <button
                      onClick={() => walletConnect.disconnect()}
                      className="w-full px-3 py-2 rounded-lg text-sm text-error"
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--color-error-30)',
                      }}
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectWallet}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-secondary"
                    style={{
                      background: 'var(--color-elevated)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <Wallet size={16} />
                    Connect Sage Wallet
                  </button>
                )}
              </div>

              {/* Messages */}
              <button
                onClick={() => setShowMessagesModal(true)}
                className="w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-black/5"
              >
                <div className="relative">
                  <Bell size={18} className="text-secondary" />
                  {unreadMessages > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center font-medium"
                      style={{ background: 'var(--color-error)', color: '#fff' }}
                    >
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </div>
                <span
                  className="flex-1 text-sm text-primary"
                >
                  Messages
                </span>
                <ChevronRight size={16} className="text-tertiary" />
              </button>

              {/* Sign Out */}
              <div className="p-4">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-error"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-error-30)',
                  }}
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </SignedIn>
      </div>

      {/* Messages Modal */}
      <MessagesModal
        isOpen={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
      />
    </motion.section>
  );
}

export default AccountSettings;
