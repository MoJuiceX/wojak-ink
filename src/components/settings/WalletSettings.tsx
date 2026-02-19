/**
 * Wallet Settings Component
 *
 * Wallet connection section for mobile settings.
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Wallet, Copy, Check, ExternalLink, LogOut } from 'lucide-react';
import { settingsSectionVariants } from '@/config/settingsAnimations';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

// Placeholder wallet state - will be replaced with actual wallet integration
interface WalletState {
  connected: boolean;
  address: string | null;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletSettings() {
  const prefersReducedMotion = useReducedMotion();
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
  });
  const { copy, copied } = useCopyToClipboard();

  const handleConnect = () => {
    // Placeholder - replace with actual wallet connection
    setWallet({
      connected: true,
      address: 'xch1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
    });
  };

  const handleDisconnect = () => {
    setWallet({ connected: false, address: null });
  };

  const handleCopyAddress = () => {
    if (wallet.address) {
      copy(wallet.address, { successMessage: 'Address copied!' });
    }
  };

  return (
    <motion.section
      variants={prefersReducedMotion ? undefined : settingsSectionVariants}
      initial="initial"
      animate="animate"
      className="space-y-4"
      aria-labelledby="wallet-section-heading"
    >
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Wallet size={20} style={{ color: 'var(--color-primary)' }} />
        <h2
          id="wallet-section-heading"
          className="text-lg font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          Wallet
        </h2>
      </div>

      {/* Wallet Card */}
      <div
        className="p-4 rounded-xl"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {!wallet.connected ? (
          /* Disconnected State */
          <div className="text-center py-4">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-elevated)' }}
            >
              <Wallet size={32} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <p
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Connect your wallet to access Treasury and exclusive features
            </p>
            <motion.button
              className="px-6 py-3 rounded-lg font-medium text-white"
              style={{
                background: 'var(--color-primary)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConnect}
            >
              <span className="flex items-center gap-2">
                <Wallet size={18} />
                Connect Wallet
              </span>
            </motion.button>
          </div>
        ) : (
          /* Connected State */
          <div className="space-y-4">
            {/* Address Display */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex-shrink-0"
                style={{
                  background: 'var(--gradient-accent)',
                }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text)' }}
                >
                  Connected
                </p>
                <p
                  className="text-sm font-mono truncate"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {wallet.address && truncateAddress(wallet.address)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  background: 'var(--color-elevated)',
                  color: copied ? 'var(--color-success)' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
                onClick={handleCopyAddress}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <a
                href={`https://spacescan.io/address/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  background: 'var(--color-elevated)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <ExternalLink size={16} />
                Explorer
              </a>
            </div>

            {/* Disconnect */}
            <button
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: 'transparent',
                color: 'var(--color-error)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
              onClick={handleDisconnect}
            >
              <LogOut size={16} />
              Disconnect Wallet
            </button>
          </div>
        )}
      </div>
    </motion.section>
  );
}

export default WalletSettings;
