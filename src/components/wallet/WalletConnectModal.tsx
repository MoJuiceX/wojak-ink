/**
 * WalletConnectModal Component
 *
 * Modal for connecting to Sage Wallet via WalletConnect QR code.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Copy, Check } from 'lucide-react';

interface WalletConnectState {
  isConnecting: boolean;
  isConnected: boolean;
  qrCodeUri: string | null;
  connectionUri: string | null;
  error: string | null;
}

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletConnect: WalletConnectState;
}

export function WalletConnectModal({ isOpen, onClose, walletConnect }: WalletConnectModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyUri = async () => {
    if (walletConnect.connectionUri) {
      try {
        await navigator.clipboard.writeText(walletConnect.connectionUri);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative p-6 rounded-xl max-w-sm w-full mx-4"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full transition-colors"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                Connect Sage Wallet
              </h2>
              <p
                className="text-sm mb-4"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Scan the QR code with Sage Wallet to connect
              </p>

              {walletConnect.isConnecting && !walletConnect.qrCodeUri && (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="animate-spin mb-4" size={40} style={{ color: 'var(--color-primary)' }} />
                  <p style={{ color: 'var(--color-text-secondary)' }}>Initializing...</p>
                </div>
              )}

              {walletConnect.qrCodeUri && (
                <div className="flex flex-col items-center">
                  <div
                    className="p-4 rounded-lg mb-4"
                    style={{ background: '#ffffff' }}
                  >
                    <img
                      src={walletConnect.qrCodeUri}
                      alt="WalletConnect QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  <button
                    onClick={handleCopyUri}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg mb-3 transition-colors"
                    style={{
                      background: copied ? '#22c55e' : 'var(--color-primary)',
                      color: '#fff',
                    }}
                  >
                    {copied ? (
                      <>
                        <Check size={16} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy Link
                      </>
                    )}
                  </button>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Paste in Sage Wallet → Settings → WalletConnect
                  </p>
                </div>
              )}

              {walletConnect.error && (
                <div
                  className="p-3 rounded-lg text-sm mt-4"
                  style={{
                    background: 'var(--color-error-bg, #fef2f2)',
                    color: 'var(--color-error, #ef4444)',
                  }}
                >
                  {walletConnect.error}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default WalletConnectModal;
