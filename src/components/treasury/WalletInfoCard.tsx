/**
 * WalletInfoCard Component
 *
 * Displays wallet address with copy and explorer actions.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, ExternalLink, Check, Wallet } from 'lucide-react';
import type { WalletInfo } from '@/types/treasury';

interface WalletInfoCardProps {
  wallet: WalletInfo | null;
  onConnect?: () => void;
  isLoading?: boolean;
}

export function WalletInfoCard({ wallet, onConnect, isLoading = false }: WalletInfoCardProps) {
  // Hooks must be called before any early returns (rules of hooks)
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!wallet) return;

    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [wallet]);

  const handleExplorerClick = useCallback(() => {
    if (!wallet) return;
    window.open(wallet.explorerUrl, '_blank', 'noopener,noreferrer');
  }, [wallet]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div
        className="rounded-xl overflow-hidden animate-pulse"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--color-border)' }}
          />
          <div
            className="h-4 w-32 rounded"
            style={{ background: 'var(--color-border)' }}
          />
        </div>
        <div className="p-4 space-y-4">
          <div
            className="h-12 rounded-lg"
            style={{ background: 'var(--color-border)' }}
          />
          <div className="flex gap-3">
            <div
              className="flex-1 h-10 rounded-lg"
              style={{ background: 'var(--color-border)' }}
            />
            <div
              className="flex-1 h-10 rounded-lg"
              style={{ background: 'var(--color-border)' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Not connected state
  if (!wallet || !wallet.isConnected) {
    return (
      <motion.div
        className="rounded-xl p-6 text-center"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Wallet
          size={32}
          className="mx-auto mb-3 text-muted"
        />
        <p className="text-sm mb-4 text-muted">
          No wallet connected
        </p>
        {onConnect && (
          <motion.button
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--color-primary)',
              color: 'white',
            }}
            onClick={onConnect}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Connect Wallet
          </motion.button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--color-success)' }}
          aria-label="Connected"
        />
        <h3 className="text-sm font-semibold text-secondary">
          Connected Wallet
        </h3>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Address */}
        <button
          className="w-full text-left font-mono text-sm break-all p-3 rounded-lg transition-colors text-primary"
          style={{
            background: 'var(--color-border)',
          }}
          onClick={() => setShowFullAddress(!showFullAddress)}
          aria-label={showFullAddress ? 'Hide full address' : 'Show full address'}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={showFullAddress ? 'full' : 'truncated'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {showFullAddress ? wallet.address : wallet.addressTruncated}
            </motion.span>
          </AnimatePresence>
        </button>

        {/* Actions */}
        <div className="flex gap-3">
          {/* Copy button */}
          <motion.button
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              color: copied ? 'var(--color-success)' : 'var(--color-text-secondary)',
            }}
            onClick={handleCopy}
            whileHover={{ background: 'var(--color-surface)' }}
            whileTap={{ scale: 0.98 }}
            aria-label={copied ? 'Copied!' : 'Copy address'}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-2"
                >
                  <Check size={16} />
                  Copied!
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-2"
                >
                  <Copy size={16} />
                  Copy
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Explorer button */}
          <motion.button
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors text-secondary"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
            }}
            onClick={handleExplorerClick}
            whileHover={{ background: 'var(--color-surface)' }}
            whileTap={{ scale: 0.98 }}
            aria-label="View on block explorer"
          >
            <ExternalLink size={16} />
            Explorer
          </motion.button>
        </div>

        {/* Fingerprint (if available) */}
        {wallet.fingerprint && (
          <p className="text-xs text-center text-muted">
            Fingerprint: {wallet.fingerprint}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default WalletInfoCard;
