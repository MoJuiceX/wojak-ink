/**
 * Avatar Upgrade Banner
 *
 * Shown to users with generic emoji avatars to encourage wallet connection.
 * Appears after a delay to not overwhelm new users immediately.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Wallet, X } from 'lucide-react';
import './AvatarUpgradeBanner.css';

interface AvatarUpgradeBannerProps {
  onConnectWallet: () => void;
  /** Delay before showing banner (ms) */
  showDelay?: number;
  /** Allow user to dismiss the banner */
  dismissible?: boolean;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

export const AvatarUpgradeBanner: React.FC<AvatarUpgradeBannerProps> = ({
  onConnectWallet,
  showDelay = 2000,
  dismissible = true,
  compact = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Check if user already dismissed this session
    const dismissed = sessionStorage.getItem('avatar_upgrade_dismissed');
    if (dismissed) {
      // Defer state update to avoid synchronous setState in effect
      const dismissTimer = setTimeout(() => setIsDismissed(true), 0);
      return () => clearTimeout(dismissTimer);
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, showDelay);

    return () => clearTimeout(timer);
  }, [showDelay]);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('avatar_upgrade_dismissed', 'true');
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`upgrade-banner ${compact ? 'upgrade-banner-compact' : ''}`}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
        >
          <div className="banner-content">
            {/* Bouncing orange icon */}
            <motion.span
              className="banner-icon"
              animate={prefersReducedMotion ? {} : { y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {compact ? '🖼️' : '🍊'}
            </motion.span>

            <div className="banner-text">
              <strong>{compact ? 'Upgrade avatar!' : 'Upgrade your avatar!'}</strong>
              {!compact && (
                <p>Connect your wallet to use your Wojak NFT and unlock the leaderboard</p>
              )}
            </div>

            <motion.button
              className="upgrade-btn"
              onClick={onConnectWallet}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Wallet size={16} />
              {compact ? 'Connect' : 'Connect Wallet'}
            </motion.button>

            {dismissible && (
              <button
                className="dismiss-btn"
                onClick={handleDismiss}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AvatarUpgradeBanner;
