/**
 * Mint Flow Modal
 *
 * Shows the current mint step (confirm, signing, success, error).
 * Countdown and offer actions for paid pending; success with mint number and MintGarden link.
 *
 * AUDIT FIX: Added "Accept in Wallet" button that calls takeOffer via WalletConnect,
 * "Copy Offer" as secondary, and "I've Already Accepted" for manual confirmation.
 */

import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Loader2, CheckCircle, AlertCircle, Copy, ExternalLink, Wallet } from 'lucide-react';
import { useMint } from '@/contexts/MintContext';

interface MintFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const stepMessages: Record<string, { title: string; message: string }> = {
  idle: { title: 'Mint', message: 'Preparing...' },
  confirm: { title: 'Confirm mint', message: 'Review your Wojak and confirm in your wallet.' },
  signing: { title: 'Accept Offer', message: 'Accept the offer in your Sage wallet to complete the mint.' },
  submitting: { title: 'Submitting', message: 'Submitting your mint...' },
  accepting: { title: 'Accepting', message: 'Waiting for wallet approval...' },
  success: { title: 'Minted!', message: 'Your Wojak has been minted successfully.' },
  error: { title: 'Mint failed', message: 'Something went wrong. Try again or use a different wallet.' },
};

function formatTimeLeft(expiresAt: string | null): string {
  if (!expiresAt) return '--:--';
  const end = new Date(expiresAt).getTime();
  const now = Date.now();
  const left = Math.max(0, Math.floor((end - now) / 1000));
  const m = Math.floor(left / 60);
  const s = left % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MintFlowModal({ isOpen, onClose }: MintFlowModalProps) {
  const {
    mintStep,
    pendingMint,
    successResult,
    errorMessage,
    resetMintFlow,
    acceptOfferInWallet,
    confirmMintManual,
  } = useMint();
  const prefersReducedMotion = useReducedMotion();
  const [timeLeft, setTimeLeft] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!pendingMint?.expiresAt) {
      setTimeLeft('');
      return;
    }
    const tick = () => setTimeLeft(formatTimeLeft(pendingMint.expiresAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pendingMint?.expiresAt]);

  const handleClose = () => {
    resetMintFlow();
    onClose();
  };

  const handleCopyOffer = async () => {
    if (!pendingMint?.offerFile) return;
    try {
      await navigator.clipboard.writeText(pendingMint.offerFile);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const { title, message } = stepMessages[mintStep] || stepMessages.idle;
  const isPending = ['confirm', 'signing', 'submitting', 'accepting'].includes(mintStep);
  const isAccepting = mintStep === 'accepting';
  const isSuccess = mintStep === 'success';
  const isError = mintStep === 'error';
  const showOfferActions = mintStep === 'signing' && pendingMint;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.7)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          onClick={handleClose}
        >
          <motion.div
            className="card p-6 max-w-sm w-full"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={prefersReducedMotion ? { duration: 0.15 } : { type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mint-flow-title"
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 id="mint-flow-title" className="text-lg font-semibold">
                {title}
              </h2>
              <button
                type="button"
                className="btn btn-ghost p-2"
                onClick={handleClose}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 text-center">
              {(isPending && !isAccepting) && <Loader2 size={40} className="animate-spin text-accent" />}
              {isAccepting && <Wallet size={40} className="animate-pulse text-accent" />}
              {isSuccess && <CheckCircle size={40} className="text-success" />}
              {isError && <AlertCircle size={40} className="text-error" />}
              <p className="text-secondary text-sm">{message}</p>

              {/* Error message */}
              {isError && errorMessage && (
                <p className="text-error text-xs">{errorMessage}</p>
              )}

              {/* Countdown timer */}
              {showOfferActions && (
                <div className="w-full rounded-lg p-3 text-center" style={{ background: 'var(--color-surface)' }}>
                  <span className="text-2xl font-mono tabular-nums text-accent">{timeLeft}</span>
                  <p className="text-muted text-xs mt-1">remaining</p>
                </div>
              )}

              {/* Accept in Wallet — primary action */}
              {showOfferActions && pendingMint?.offerFile && (
                <button
                  type="button"
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                  onClick={acceptOfferInWallet}
                >
                  <Wallet size={16} />
                  Accept in Wallet
                </button>
              )}

              {/* Copy Offer — secondary action */}
              {showOfferActions && pendingMint?.offerFile && (
                <button
                  type="button"
                  className="btn btn-secondary w-full flex items-center justify-center gap-2"
                  onClick={handleCopyOffer}
                >
                  <Copy size={16} />
                  {copied ? 'Copied!' : 'Copy Offer (Manual)'}
                </button>
              )}

              {/* I've Already Accepted — for users who accepted outside this flow */}
              {showOfferActions && pendingMint?.offerFile && (
                <button
                  type="button"
                  className="text-xs text-secondary underline hover:text-accent transition-colors"
                  onClick={confirmMintManual}
                >
                  I&apos;ve already accepted the offer
                </button>
              )}

              {/* No offer file */}
              {showOfferActions && !pendingMint?.offerFile && pendingMint?.totalPriceXch != null && (
                <p className="text-muted text-xs">
                  Paid mint: MintGarden offer not yet configured. Your design is saved.
                </p>
              )}

              {/* Success info */}
              {isSuccess && successResult && (
                <div className="w-full flex flex-col gap-2 text-left">
                  <p className="text-secondary text-sm">
                    Your Wojak #{successResult.mintNumber}
                  </p>
                  {successResult.mintgardenUrl && (
                    <a
                      href={successResult.mintgardenUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost flex items-center justify-center gap-2 text-accent"
                    >
                      <ExternalLink size={16} />
                      View on MintGarden
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button type="button" className="btn btn-primary" onClick={handleClose}>
                {isSuccess ? 'Create Another' : 'Close'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

export default MintFlowModal;
