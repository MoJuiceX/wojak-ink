/**
 * WalletButton Component
 *
 * Displays wallet connection state with connect/disconnect functionality.
 * Shows truncated address when connected, "Connect Wallet" when disconnected.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, ChevronDown, LogOut, Copy, Check, ExternalLink } from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

interface WalletButtonProps {
  className?: string;
  size?: 'sm' | 'md';
}

// Placeholder wallet state - will be replaced with actual wallet integration
interface WalletState {
  connected: boolean;
  address: string | null;
}

const sizeStyles = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
} as const;

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletButton({ className = '', size = 'md' }: WalletButtonProps) {
  // Placeholder state - replace with actual wallet context
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { copy, copied } = useCopyToClipboard();

  const handleDisconnect = () => {
    setWallet({ connected: false, address: null });
    setIsDropdownOpen(false);
  };

  const handleCopyAddress = () => {
    if (wallet.address) {
      copy(wallet.address, { successMessage: 'Address copied!' });
    }
  };

  if (!wallet.connected) {
    return (
      <motion.button
        type="button"
        className={`
          relative flex items-center justify-center rounded-xl font-medium overflow-hidden
          ${sizeStyles[size]}
          ${className}
        `}
        style={{
          background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
        }}
        whileHover={{
          boxShadow: '0 0 20px rgba(249, 115, 22, 0.5), 0 10px 30px rgba(249, 115, 22, 0.3)',
          y: -2,
        }}
        whileTap={{ scale: 0.98 }}
        title="Connect Wallet"
      >
        {/* Shine effect overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
            transform: 'translateX(-100%)',
          }}
          animate={{
            transform: ['translateX(-100%)', 'translateX(100%)'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          }}
        />
        <Wallet size={size === 'sm' ? 16 : 18} />
        <span>Connect</span>
      </motion.button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <motion.button
        type="button"
        className={`
          flex items-center justify-center rounded-lg font-medium
          transition-colors duration-200 text-primary
          ${sizeStyles[size]}
        `}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
        whileHover={{
          borderColor: 'var(--color-primary)',
        }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        {/* Avatar placeholder */}
        <div
          className="w-5 h-5 rounded-full"
          style={{
            background: 'var(--gradient-primary)',
          }}
        />
        <span className="font-mono">
          {wallet.address && truncateAddress(wallet.address)}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${
            isDropdownOpen ? 'rotate-180' : ''
          }`}
        />
      </motion.button>

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsDropdownOpen(false)}
          />

          <motion.div
            className="absolute right-0 top-full mt-2 w-48 rounded-lg overflow-hidden z-20"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-lg)',
            }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
              style={{ color: copied ? '#22c55e' : 'var(--color-text-secondary)' }}
              onClick={handleCopyAddress}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-surface-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied!' : 'Copy Address'}</span>
            </button>

            <a
              href={`https://spacescan.io/address/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-secondary"
              onClick={() => setIsDropdownOpen(false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-surface-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <ExternalLink size={16} />
              <span>View on Explorer</span>
            </a>

            <div
              className="h-px mx-3"
              style={{ background: 'var(--color-border)' }}
            />

            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-error"
              onClick={handleDisconnect}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-surface-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <LogOut size={16} />
              <span>Disconnect</span>
            </button>
          </motion.div>
        </>
      )}
    </div>
  );
}

export default WalletButton;
