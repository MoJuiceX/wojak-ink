/**
 * Mint Flow Modal — Queue-Based Architecture
 *
 * Progress driven by server-side job state via polling.
 * Steps: confirming → submitted (with real progress) → awaiting_payment → success | error
 */

import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Loader2, CheckCircle, AlertCircle, Copy, ExternalLink, Wallet, Share2, Sparkles } from 'lucide-react';
import { useMint } from '@/contexts/MintContext';

interface MintFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Helpers ──

function getSecondsLeft(expiresAt: string | null | undefined): number {
  if (!expiresAt) return -1;
  const end = new Date(expiresAt).getTime();
  return Math.max(0, Math.floor((end - Date.now()) / 1000));
}

function formatTimeLeft(expiresAt: string | null | undefined): string {
  const left = getSecondsLeft(expiresAt);
  if (left < 0) return '--:--';
  const m = Math.floor(left / 60);
  const s = left % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Map raw API errors to user-friendly messages */
function friendlyErrorMessage(raw: string): { message: string; retryable: boolean } {
  if (/upload|IPFS|Pinata/i.test(raw)) {
    return { message: "Couldn't upload your artwork. Please try again.", retryable: true };
  }
  if (/MintGarden|MINTGARDEN/i.test(raw)) {
    return { message: 'The minting service is temporarily busy. Please try again.', retryable: true };
  }
  if (/does not match|mismatch/i.test(raw)) {
    return { message: "Connected wallet doesn't match this mint. Switch wallets or start a new mint.", retryable: false };
  }
  if (/concurrent|race/i.test(raw)) {
    return { message: 'Your credits were just used. Check your balance and try again.', retryable: true };
  }
  if (/rate limit|Too many/i.test(raw)) {
    return { message: 'Too many requests. Please wait a moment.', retryable: false };
  }
  if (/Sold out/i.test(raw)) {
    return { message: 'All 4,200 Wojaks have been minted!', retryable: false };
  }
  if (/Insufficient credits/i.test(raw)) {
    return { message: 'Not enough credits for this mint.', retryable: false };
  }
  if (/WALLET_LOCKED|already have a mint/i.test(raw)) {
    return { message: 'You already have a mint in progress. Please wait for it to complete.', retryable: false };
  }
  if (/expired/i.test(raw)) {
    return { message: 'Offer expired. Your design is saved — try again.', retryable: true };
  }
  if (/timeout/i.test(raw)) {
    return { message: 'Processing timed out. Please try again.', retryable: true };
  }
  return { message: raw, retryable: true };
}

export function MintFlowModal({ isOpen, onClose }: MintFlowModalProps) {
  const {
    mintStep,
    currentJob,
    errorMessage,
    credits,
    totalMinted,
    maxSupply,
    resetMintFlow,
    retryMint,
    confirmMint,
    acceptOfferInWallet,
    confirmMintManual,
    getTotalMintPrice,
  } = useMint();
  const prefersReducedMotion = useReducedMotion();
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Countdown timer for paid mints
  useEffect(() => {
    const expiresAt = currentJob?.expiresAt;
    if (!expiresAt) {
      setTimeLeft('');
      setIsExpired(false);
      return;
    }
    const tick = () => {
      const secs = getSecondsLeft(expiresAt);
      setTimeLeft(formatTimeLeft(expiresAt));
      setIsExpired(secs <= 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [currentJob?.expiresAt]);

  const handleClose = () => {
    resetMintFlow();
    onClose();
  };

  const handleCopyOffer = async () => {
    if (!currentJob?.offerFile) return;
    try {
      await navigator.clipboard.writeText(currentJob.offerFile);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const handleShare = () => {
    if (!currentJob) return;
    const text = `Just minted Wojak #${currentJob.mintNumber} on @WojakInk!`;
    const url = currentJob.mintgardenUrl || 'https://wojak.ink';
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleCopyLink = async () => {
    if (!currentJob?.mintgardenUrl) return;
    try {
      await navigator.clipboard.writeText(currentJob.mintgardenUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.open(currentJob.mintgardenUrl, '_blank');
    }
  };

  // Derive display state
  const isConfirming = mintStep === 'confirming';
  const isSubmitted = mintStep === 'submitted';
  const isAwaitingPayment = mintStep === 'awaiting_payment';
  const isSuccess = mintStep === 'success';
  const isError = mintStep === 'error';
  const isFreeMint = currentJob?.mintType === 'free';
  const showOfferActions = isAwaitingPayment && currentJob;

  // Progress bar
  const progressPct = currentJob
    ? Math.round((currentJob.stepNumber / currentJob.totalSteps) * 100)
    : 0;

  // Get title and icon
  const getStepDisplay = () => {
    if (isConfirming) {
      return { title: 'Confirm Mint', icon: <Sparkles size={40} className="text-accent" /> };
    }
    if (isSubmitted) {
      return { title: 'Minting', icon: <Loader2 size={40} className="animate-spin text-accent" /> };
    }
    if (isAwaitingPayment) {
      return { title: 'Accept Offer', icon: <Wallet size={40} className="animate-pulse text-accent" /> };
    }
    if (isSuccess) {
      return {
        title: isFreeMint ? 'Free Mint Complete!' : 'Minted!',
        icon: <CheckCircle size={40} className="text-success" />,
      };
    }
    if (isError) {
      return { title: 'Mint Failed', icon: <AlertCircle size={40} className="text-error" /> };
    }
    return { title: 'Mint', icon: <Loader2 size={40} className="animate-spin text-accent" /> };
  };

  const { title, icon } = getStepDisplay();
  const parsedError = errorMessage ? friendlyErrorMessage(errorMessage) : null;

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
              {icon}

              {/* ── Progress bar (during submitted/awaiting_payment) ── */}
              {(isSubmitted || isAwaitingPayment) && currentJob && (
                <div className="w-full">
                  <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--color-surface)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'var(--color-primary)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="text-muted text-[10px] mt-1 tabular-nums">
                    Step {currentJob.stepNumber} of {currentJob.totalSteps}
                  </p>
                </div>
              )}

              {/* ── Confirming step (pre-mint) ── */}
              {isConfirming && (() => {
                const price = getTotalMintPrice();
                const freeMints = credits?.free_mints_available ?? 0;
                const balance = Math.round((credits?.balance ?? 0) / 100);
                const isFreeConfirm = freeMints > 0;
                return (
                  <div className="w-full flex flex-col gap-3">
                    {isFreeConfirm ? (
                      <>
                        <p className="text-secondary text-sm">
                          This will use credits from your balance of {balance}.
                        </p>
                        <p className="text-muted text-xs">
                          Your Wojak will be minted instantly — no wallet signing needed.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-secondary text-sm">
                          Ready to mint for <span className="font-semibold text-accent">{price.totalXch.toFixed(2)} XCH</span>?
                        </p>
                        <p className="text-muted text-xs">
                          You'll have 15 minutes to accept the offer in your Sage Wallet.
                        </p>
                      </>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button type="button" className="btn btn-secondary flex-1" onClick={handleClose}>
                        Cancel
                      </button>
                      <button type="button" className="btn btn-primary flex-1" onClick={confirmMint}>
                        {isFreeConfirm ? 'Mint' : 'Continue'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* ── Submitted: real server-driven progress ── */}
              {isSubmitted && currentJob && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-secondary text-sm">{currentJob.stepLabel}</p>
                  <p className="text-muted text-[10px]">Please don&apos;t close this window</p>
                </div>
              )}

              {/* ── Awaiting Payment: offer + countdown ── */}
              {isAwaitingPayment && currentJob && (
                <p className="text-secondary text-sm">
                  Open your Sage Wallet app and accept the pending offer. Then return here.
                </p>
              )}

              {/* Countdown timer */}
              {showOfferActions && (
                <div className="w-full rounded-lg p-3 text-center" style={{ background: 'var(--color-surface)' }}>
                  <span className={`text-2xl font-mono tabular-nums ${isExpired ? 'text-error' : 'text-accent'}`}>{timeLeft}</span>
                  <p className="text-muted text-xs mt-1">
                    {isExpired ? 'Offer expired' : "We'll detect the approval automatically"}
                  </p>
                </div>
              )}

              {/* Expired message + Mint Again */}
              {showOfferActions && isExpired && (
                <div className="w-full flex flex-col gap-2">
                  <p className="text-error text-xs">Offer expired. Your design is saved.</p>
                  <button type="button" className="btn btn-primary w-full" onClick={handleClose}>
                    Mint Again
                  </button>
                </div>
              )}

              {/* Accept in Wallet — primary action */}
              {showOfferActions && currentJob?.offerFile && !isExpired && (
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
              {showOfferActions && currentJob?.offerFile && !isExpired && (
                <button
                  type="button"
                  className="btn btn-secondary w-full flex items-center justify-center gap-2"
                  onClick={handleCopyOffer}
                >
                  <Copy size={16} />
                  {copied ? 'Copied!' : 'Copy Offer (Manual)'}
                </button>
              )}

              {/* I've Already Accepted */}
              {showOfferActions && currentJob?.offerFile && !isExpired && (
                <button
                  type="button"
                  className="text-xs text-secondary underline hover:text-accent transition-colors"
                  onClick={confirmMintManual}
                >
                  I&apos;ve already accepted the offer
                </button>
              )}

              {/* ── Error ── */}
              {isError && parsedError && (
                <div className="w-full flex flex-col gap-3">
                  <p className="text-error text-sm">{parsedError.message}</p>
                  {currentJob?.creditsRefunded && (
                    <p className="text-muted text-xs">Your credits have been refunded.</p>
                  )}
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-secondary flex-1" onClick={handleClose}>
                      Close
                    </button>
                    {parsedError.retryable && (
                      <button type="button" className="btn btn-primary flex-1" onClick={() => { retryMint(); onClose(); }}>
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Success ── */}
              {isSuccess && currentJob && (
                <div className="w-full flex flex-col gap-3">
                  <p className="text-secondary text-sm">
                    Your Wojak #{currentJob.mintNumber}
                  </p>

                  {/* Free mint credit info */}
                  {isFreeMint && (
                    <p className="text-muted text-xs">
                      {currentJob.creditsSpent ?? 1} {(currentJob.creditsSpent ?? 1) === 1 ? 'credit' : 'credits'} used.
                      {currentJob.creditsRemaining != null && (
                        <> {currentJob.creditsRemaining} remaining.</>
                      )}
                    </p>
                  )}

                  {/* Supply */}
                  <p className="text-muted text-[10px] tabular-nums">
                    {totalMinted}/{maxSupply} minted
                  </p>

                  {/* Action buttons */}
                  {currentJob.mintgardenUrl && (
                    <a
                      href={currentJob.mintgardenUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost flex items-center justify-center gap-2 text-accent"
                    >
                      <ExternalLink size={16} />
                      View on MintGarden
                    </a>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-primary flex-1"
                      onClick={handleClose}
                    >
                      Mint Another
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary flex-1 flex items-center justify-center gap-1.5"
                      onClick={handleShare}
                    >
                      <Share2 size={14} />
                      Share
                    </button>
                  </div>

                  {currentJob.mintgardenUrl && (
                    <button
                      type="button"
                      className="text-xs text-secondary underline hover:text-accent transition-colors"
                      onClick={handleCopyLink}
                    >
                      {shareCopied ? 'Link copied!' : 'Copy link'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom close button — only for non-terminal, non-confirm states */}
            {!isSuccess && !isError && !isConfirming && !(showOfferActions && isExpired) && (
              <div className="mt-6 flex justify-end">
                <button type="button" className="btn btn-ghost" onClick={handleClose}>
                  Close
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

export default MintFlowModal;
