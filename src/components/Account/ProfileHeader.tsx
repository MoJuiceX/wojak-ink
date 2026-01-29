/**
 * ProfileHeader Component (Premium Version)
 *
 * Identity hub with avatar, name, streak stats, and wallet integration.
 * Mobile-first design with responsive layout.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Edit3, Flame, Trophy, Wallet, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/Avatar/Avatar';
import { AvatarPickerModal } from '@/components/AvatarPicker/AvatarPickerModal';
// date-fns import removed - member duration feature removed
import { useSageWallet } from '@/sage-wallet';
import { useUserProfile } from '@/contexts/UserProfileContext';
import type { UserAvatar } from '@/types/avatar';
import './Account.css';

// Wojak Farmers Plot collection ID
const WOJAK_COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

interface ProfileHeaderProps {
  avatar: UserAvatar;
  displayName: string;
  xHandle?: string | null;
  walletAddress?: string | null; // Kept for interface compatibility
  createdAt?: Date; // Kept for interface compatibility, no longer displayed
  isOwnProfile: boolean;
  onEditName?: () => void;
  // Streak data
  currentStreak?: number;
  longestStreak?: number;
  // Currency data
  oranges?: number;
  gems?: number;
  donuts?: number;
  poops?: number;
}

export function ProfileHeader({
  avatar,
  displayName,
  xHandle,
  walletAddress: _walletAddress,
  createdAt: _createdAt,
  isOwnProfile,
  onEditName,
  currentStreak = 0,
  longestStreak = 0,
  oranges = 0,
  gems = 0,
  donuts = 0,
  poops = 0,
}: ProfileHeaderProps) {
  // Silence unused prop warnings - kept for API compatibility
  void _walletAddress;
  void _createdAt;

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Wallet integration
  const { profile, updateProfile, isSignedIn } = useUserProfile();
  const { status: walletStatus, address, connect, disconnect, getNFTs } = useSageWallet();
  const [, setIsRefreshing] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const walletConnected = walletStatus === 'connected' && !!address;
  const nftCount = profile?.nftCount;
  const hasVerified = nftCount !== null && nftCount !== undefined;

  // Handle wallet connect
  const handleConnect = useCallback(async () => {
    setWalletError(null);
    try {
      await connect();
    } catch (err) {
      console.error('[ProfileHeader] Connect error:', err);
      setWalletError('Failed to connect wallet');
    }
  }, [connect]);

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    setWalletError(null);
    try {
      await disconnect();
      await updateProfile({ walletAddress: null });
    } catch (err) {
      console.error('[ProfileHeader] Disconnect error:', err);
    }
  }, [disconnect, updateProfile]);

  // Fetch and save NFT count
  const refreshNftCount = useCallback(async () => {
    if (!address) return;

    setIsRefreshing(true);
    setWalletError(null);

    try {
      const nfts = await getNFTs(WOJAK_COLLECTION_ID);
      const count = nfts.length;

      await updateProfile({
        nftCount: count,
        nftVerifiedAt: new Date().toISOString(),
        walletAddress: address,
      });

    } catch (err) {
      console.error('[ProfileHeader] Error fetching NFTs:', err);
      setWalletError('Failed to fetch NFTs');
    } finally {
      setIsRefreshing(false);
    }
  }, [address, getNFTs, updateProfile]);

  // Track previous wallet address to detect new connections
  const prevAddressRef = useRef<string | null>(null);

  // Auto-fetch NFTs when wallet connects
  useEffect(() => {
    const prevAddress = prevAddressRef.current;
    prevAddressRef.current = address || null;

    if (
      walletConnected &&
      address &&
      prevAddress !== address &&
      (profile?.walletAddress !== address || !hasVerified)
    ) {
      refreshNftCount();
    }
  }, [walletConnected, address, profile?.walletAddress, hasVerified, refreshNftCount]);

  return (
    <motion.div 
      className="profile-header-premium"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Identity Section: Avatar + Name + Streak */}
      <div className="profile-header__identity">
        <div className="profile-avatar-section">
          <div className="profile-avatar-wrapper">
            <Avatar
              avatar={avatar}
              size="xlarge"
              showBadge={false}
              onClick={isOwnProfile ? () => setShowAvatarPicker(true) : undefined}
            />
            {isOwnProfile && (
              <button
                className="avatar-edit-button"
                onClick={() => setShowAvatarPicker(true)}
                aria-label="Change avatar"
              >
                <Edit3 size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="profile-header__info">
          {/* Desktop: Name + all stats in one row */}
          <div className="profile-header__top-row">
            <div className="profile-header__name-group">
              <h1 className="profile-display-name">{displayName}</h1>
              {isOwnProfile && onEditName && (
                <button className="edit-name-button" onClick={onEditName} aria-label="Edit name">
                  <Edit3 size={14} />
                </button>
              )}
            </div>

            {/* All stats inline */}
            <div className="profile-header__inline-stats">
              <div 
                className={`stat-badge stat-badge--streak ${currentStreak > 0 ? 'active' : ''}`}
                data-tooltip={currentStreak > 0 
                  ? `${currentStreak} day streak! Play today to keep it going.`
                  : 'Play a game to start your streak!'}
              >
                <Flame size={20} className={currentStreak > 0 ? 'flame-glow' : ''} />
                <span className="stat-badge__value">{currentStreak}</span>
                <span className="stat-badge__label">Streak</span>
              </div>
              <div 
                className={`stat-badge stat-badge--best ${longestStreak > 0 ? 'active' : ''}`}
                data-tooltip={`Your longest streak: ${longestStreak} days`}
              >
                <Trophy size={20} />
                <span className="stat-badge__value">{longestStreak}</span>
                <span className="stat-badge__label">Best</span>
              </div>
              <div className="stat-badge stat-badge--currency" data-tooltip="Earned from games and daily rewards">
                <span className="stat-badge__emoji">🍊</span>
                <span className="stat-badge__value">{oranges.toLocaleString()}</span>
              </div>
              <div className="stat-badge stat-badge--currency" data-tooltip="Premium currency for exclusive items">
                <span className="stat-badge__emoji">💎</span>
                <span className="stat-badge__value">{gems.toLocaleString()}</span>
              </div>
              <div className="stat-badge stat-badge--currency" data-tooltip="Donuts given to NFTs you like">
                <span className="stat-badge__emoji">🍩</span>
                <span className="stat-badge__value">{donuts}</span>
              </div>
              <div className="stat-badge stat-badge--currency" data-tooltip="Poops given to NFTs you don't like">
                <span className="stat-badge__emoji">💩</span>
                <span className="stat-badge__value">{poops}</span>
              </div>
            </div>
          </div>

          {xHandle && (
            <a
              href={`https://x.com/${xHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-x-handle"
            >
              @{xHandle}
            </a>
          )}
        </div>
      </div>

      {/* Wallet Section: Integrated into header */}
      {isOwnProfile && isSignedIn && (
        <div className="profile-header__wallet">
          {!walletConnected ? (
            <div className="wallet-cta">
              <p className="wallet-cta__text">
                Connect your Sage wallet to verify NFT holdings, choose your avatar, and enter chat rooms.
              </p>
              <button className="wallet-cta__btn" onClick={handleConnect}>
                <Wallet size={16} />
                Connect Sage Wallet
              </button>
            </div>
          ) : (
            <div className="wallet-status wallet-status--connected">
              <div className="wallet-status__header">
                <span className="wallet-status__badge">
                  <span className="wallet-status__dot dot--success" />
                  Connected
                </span>
              </div>
              <div className="wallet-status__details">
                <span className="wallet-status__address">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <span className="wallet-status__separator">•</span>
                <span className="wallet-status__nfts">
                  {hasVerified ? (
                    <><strong>{nftCount}</strong> NFT{nftCount !== 1 ? 's' : ''} verified</>
                  ) : (
                    'Verifying...'
                  )}
                </span>
              </div>
              <button
                className="wallet-disconnect-btn"
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            </div>
          )}
          {walletError && (
            <div className="wallet-error">
              <AlertCircle size={12} />
              {walletError}
            </div>
          )}
        </div>
      )}

      {isOwnProfile && (
        <AvatarPickerModal
          isOpen={showAvatarPicker}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </motion.div>
  );
}
