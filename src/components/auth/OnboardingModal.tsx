/**
 * OnboardingModal Component
 *
 * Modal overlay for first-time user profile setup.
 * Appears on top of the current page content.
 */

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Loader2, X } from 'lucide-react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useSageWallet } from '@/sage-wallet';

// Wojak Farmers Plot collection ID
const WOJAK_COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

interface FormErrors {
  displayName?: string;
  xHandle?: string;
}

interface OnboardingModalProps {
  onSkip: () => void;
  onComplete: () => void;
}

export default function OnboardingModal({ onSkip, onComplete }: OnboardingModalProps) {
  const { user } = useUser();
  const { updateProfile, refreshProfile } = useUserProfile();

  // Use the Sage Wallet hook
  const {
    status: walletStatus,
    address: walletAddress,
    isInitialized: walletInitialized,
    connect: connectWallet,
    getNFTs,
  } = useSageWallet();

  const [displayName, setDisplayName] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nftCount, setNftCount] = useState<number | null>(null);
  const [isLoadingNfts, setIsLoadingNfts] = useState(false);

  const isWalletConnected = walletStatus === 'connected' && !!walletAddress;
  const isWalletConnecting = walletStatus === 'connecting';

  // Pre-fill display name and X handle from Clerk user data
  useEffect(() => {
    if (!user) return;

    // Pre-fill display name from username or firstName
    const prefillName = user.username || user.firstName || '';
    if (prefillName && !displayName) {
      setDisplayName(prefillName);
    }

    // Pre-fill X handle from connected X/Twitter account
    const xAccount = user.externalAccounts?.find(
      account => account.provider === 'x' || account.provider === 'twitter'
    );
    if (xAccount?.username && !xHandle) {
      setXHandle(xAccount.username);
    }
  }, [user, displayName, xHandle]); // Include all deps but only set if empty

  // Fetch NFTs when wallet connects
  useEffect(() => {
    const fetchNfts = async () => {
      if (!isWalletConnected || !walletAddress) {
        setNftCount(null);
        return;
      }

      setIsLoadingNfts(true);
      try {
        const nfts = await getNFTs(WOJAK_COLLECTION_ID);
        setNftCount(nfts.length);
      } catch (error) {
        console.error('[OnboardingModal] NFT fetch error:', error);
        setNftCount(0);
      } finally {
        setIsLoadingNfts(false);
      }
    };

    fetchNfts();
  }, [isWalletConnected, walletAddress, getNFTs]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate displayName (required, 3-20 chars)
    if (!displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (displayName.length < 3 || displayName.length > 20) {
      newErrors.displayName = 'Display name must be 3-20 characters';
    }

    // Validate xHandle (optional, alphanumeric + underscore, 1-15 chars)
    const cleanHandle = xHandle.replace(/^@/, '');
    if (cleanHandle && !/^[a-zA-Z0-9_]{1,15}$/.test(cleanHandle)) {
      newErrors.xHandle = 'Handle must be 1-15 alphanumeric characters or underscores';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const success = await updateProfile({
        displayName: displayName.trim(),
        xHandle: xHandle.replace(/^@/, '') || null,
      });

      if (!success) {
        throw new Error('Failed to save profile');
      }

      // Refresh profile state to update needsOnboarding flag
      await refreshProfile();

      // Success - close modal
      onComplete();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('[OnboardingModal] Wallet connect error:', error);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onSkip}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md mx-4 rounded-xl overflow-hidden"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-modal-title"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onSkip}
            className="absolute top-4 right-4 p-1 rounded-full transition-colors hover:bg-white/10 text-tertiary"
            aria-label="Skip onboarding"
          >
            <X size={20} />
          </button>

          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <h1
                id="onboarding-modal-title"
                className="text-2xl font-bold mb-2 text-primary"
              >
                Welcome to the Grove
              </h1>
              <p
                className="text-sm text-secondary"
              >
                Set up your profile to get started...
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Display Name */}
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium mb-1 text-secondary"
                >
                  Display Name *
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={user?.firstName || 'Your display name'}
                  className="w-full px-3 py-2 rounded-lg text-base text-primary"
                  style={{
                    background: 'var(--color-bg)',
                    border: errors.displayName
                      ? '1px solid var(--color-error, #ef4444)'
                      : '1px solid var(--color-border)',
                  }}
                />
                {errors.displayName && (
                  <p className="text-sm mt-1" style={{ color: 'var(--color-error, #ef4444)' }}>
                    {errors.displayName}
                  </p>
                )}
              </div>

              {/* X Handle */}
              <div>
                <label
                  htmlFor="xHandle"
                  className="block text-sm font-medium mb-1 text-secondary"
                >
                  X Handle (optional)
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
                  >
                    @
                  </span>
                  <input
                    id="xHandle"
                    type="text"
                    value={xHandle}
                    onChange={(e) => setXHandle(e.target.value.replace(/^@/, ''))}
                    placeholder="yourhandle"
                    className="w-full pl-8 pr-3 py-2 rounded-lg text-base text-primary"
                    style={{
                      background: 'var(--color-bg)',
                      border: errors.xHandle
                        ? '1px solid var(--color-error, #ef4444)'
                        : '1px solid var(--color-border)',
                    }}
                  />
                </div>
                {errors.xHandle && (
                  <p className="text-sm mt-1" style={{ color: 'var(--color-error, #ef4444)' }}>
                    {errors.xHandle}
                  </p>
                )}
              </div>

              {/* Wallet Connection */}
              <div>
                <label
                  className="block text-sm font-medium mb-1 text-secondary"
                >
                  Sage Wallet (optional)
                </label>
                {isWalletConnected ? (
                  <div className="space-y-2">
                    <div
                      className="px-3 py-2 rounded-lg flex items-center gap-2"
                      style={{
                        background: 'var(--color-bg)',
                        border: '1px solid #22c55e',
                      }}
                    >
                      <Wallet size={18} style={{ color: '#22c55e' }} />
                      <span className="flex-1 text-sm text-primary">
                        {walletAddress.slice(0, 10)}...{walletAddress.slice(-6)}
                      </span>
                      <span style={{ color: '#22c55e' }}>✓</span>
                    </div>
                    {isLoadingNfts ? (
                      <p className="text-sm flex items-center gap-2 text-secondary">
                        <Loader2 size={14} className="animate-spin" />
                        Checking for Wojak Farmer NFTs...
                      </p>
                    ) : nftCount !== null && nftCount > 0 ? (
                      <p className="text-sm" style={{ color: '#22c55e' }}>
                        Found {nftCount} Wojak Farmer NFT{nftCount !== 1 ? 's' : ''}
                      </p>
                    ) : (
                      <p className="text-sm text-tertiary">
                        No Wojak Farmer NFTs found in wallet
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectWallet}
                    disabled={!walletInitialized || isWalletConnecting}
                    className="w-full px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-white"
                    style={{
                      background: 'var(--color-primary)',
                    }}
                  >
                    {isWalletConnecting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet size={18} />
                        Connect Sage Wallet
                      </>
                    )}
                  </button>
                )}
                <p
                  className="text-xs mt-1 text-tertiary"
                >
                  {isWalletConnected
                    ? 'Connected via WalletConnect'
                    : 'Connect to verify NFT ownership'}
                </p>
              </div>

              {/* Submit Error */}
              {submitError && (
                <div
                  className="p-3 rounded-lg text-sm"
                  style={{
                    background: 'var(--color-error-bg, #fef2f2)',
                    color: 'var(--color-error, #ef4444)',
                  }}
                >
                  {submitError}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-full font-medium text-base transition-opacity"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-primary-foreground, #fff)',
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>

              {/* Skip for now */}
              <button
                type="button"
                onClick={onSkip}
                className="w-full py-2 text-sm text-tertiary"
              >
                Skip for now
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
