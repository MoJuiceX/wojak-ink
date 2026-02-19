/**
 * WalletSection Component (Compact Version)
 *
 * Slim wallet verification section for the Account page.
 * Two states:
 * - Not connected: Single sentence + connect button (~80px height)
 * - Connected: Status bar with address, NFT count, refresh, disconnect (~60px height)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Wallet, RefreshCw, X, AlertCircle } from 'lucide-react';
import { useSageWallet } from '@/sage-wallet';
import { useUserProfile } from '@/contexts/UserProfileContext';
import './WalletSection.css';

// Wojak Farmers Plot collection ID
const WOJAK_COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

export function WalletSection() {
  const { profile, updateProfile, isSignedIn } = useUserProfile();
  const { status: walletStatus, address, connect, disconnect, getNFTs } = useSageWallet();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const walletConnected = walletStatus === 'connected' && !!address;
  const nftCount = profile?.nftCount;
  const hasVerified = nftCount !== null && nftCount !== undefined;

  // Handle wallet connect
  const handleConnect = useCallback(async () => {
    setError(null);
    try {
      await connect();
    } catch (err) {
      console.error('[WalletSection] Connect error:', err);
      setError('Failed to connect wallet');
    }
  }, [connect]);

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    setError(null);
    try {
      await disconnect();
      await updateProfile({ walletAddress: null });
    } catch (err) {
      console.error('[WalletSection] Disconnect error:', err);
    }
  }, [disconnect, updateProfile]);

  // Fetch and save NFT count
  const refreshNftCount = useCallback(async () => {
    if (!address) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const nfts = await getNFTs(WOJAK_COLLECTION_ID);
      const count = nfts.length;

      await updateProfile({
        nftCount: count,
        nftVerifiedAt: new Date().toISOString(),
        walletAddress: address,
      });

    } catch (err) {
      console.error('[WalletSection] Error fetching NFTs:', err);
      setError('Failed to fetch NFTs');
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

  if (!isSignedIn) {
    return null;
  }

  // State: Wallet not connected - compact card
  if (!walletConnected) {
    return (
      <motion.section
        className="wallet-compact wallet-compact--disconnected"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="wallet-compact__content">
          <Wallet className="wallet-compact__icon" size={20} />
          <p className="wallet-compact__message">
            Connect your Sage wallet to verify NFT holdings, choose your avatar, and enter chat rooms.
          </p>
        </div>
        <button
          type="button"
          className="wallet-compact__connect-btn"
          onClick={handleConnect}
        >
          <Wallet size={16} />
          Connect Sage Wallet
        </button>
        {error && (
          <div className="wallet-compact__error">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </motion.section>
    );
  }

  // State: Wallet connected - slim status bar
  return (
    <motion.section
      className="wallet-compact wallet-compact--connected"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="wallet-compact__status">
        <div className={`wallet-compact__dot ${hasVerified && nftCount! > 0 ? 'dot--success' : hasVerified && nftCount === 0 ? 'dot--warning' : 'dot--neutral'}`} />
        <span className="wallet-compact__address">
          {address?.slice(0, 8)}...{address?.slice(-6)}
        </span>
        <span className="wallet-compact__divider">|</span>
        <span className="wallet-compact__nft-count">
          {hasVerified ? (
            <>
              <strong>{nftCount}</strong> NFT{nftCount !== 1 ? 's' : ''} verified
            </>
          ) : (
            'Verifying...'
          )}
        </span>
      </div>
      <div className="wallet-compact__actions">
        <button
          className="wallet-compact__icon-btn"
          onClick={refreshNftCount}
          disabled={isRefreshing}
          title="Refresh NFT count"
          aria-label="Refresh NFT count"
        >
          <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
        </button>
        <button
          className="wallet-compact__icon-btn wallet-compact__icon-btn--danger"
          onClick={handleDisconnect}
          title="Disconnect wallet"
          aria-label="Disconnect wallet"
        >
          <X size={16} />
        </button>
      </div>
      {error && (
        <div className="wallet-compact__error">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </motion.section>
  );
}

export default WalletSection;
