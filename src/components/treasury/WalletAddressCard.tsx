/**
 * WalletAddressCard Component
 *
 * Compact display of treasury wallet address with copy and explorer buttons.
 * Everything fits on one row for minimal vertical space.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface WalletAddressCardProps {
  address: string;
  explorerUrl: string;
}

export function WalletAddressCard({ address, explorerUrl }: WalletAddressCardProps) {
  const [copied, setCopied] = useState(false);

  // Truncate: first 5 chars + ... + last 4 chars
  const truncatedAddress = address.length > 12
    ? `${address.slice(0, 5)}...${address.slice(-4)}`
    : address;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleOpenExplorer = () => {
    window.open(explorerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
    >
      <div className="px-3 py-2.5">
        {/* Single row: Label + Address + Buttons */}
        <div className="flex items-center gap-2">
          {/* Label */}
          <span
            className="text-xs font-medium uppercase tracking-wide flex-shrink-0 text-muted"
          >
            Wallet
          </span>

          {/* Address */}
          <span
            className="text-sm font-mono flex-1 truncate text-primary"
          >
            {truncatedAddress}
          </span>

          {/* Copy button (icon only) */}
          <motion.button
            className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
            style={{
              background: copied ? 'rgba(34, 197, 94, 0.2)' : 'var(--color-surface)',
              border: copied ? '1px solid var(--color-success)' : '1px solid var(--color-border)',
              color: copied ? 'var(--color-success)' : 'var(--color-text-secondary)',
            }}
            onClick={handleCopy}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Copy address"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </motion.button>

          {/* SpaceScan button (icon only) */}
          <motion.button
            className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
            onClick={handleOpenExplorer}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="View on SpaceScan"
          >
            <ExternalLink size={14} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default WalletAddressCard;
