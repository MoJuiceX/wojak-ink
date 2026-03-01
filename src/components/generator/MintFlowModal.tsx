/**
 * Mint Flow Modal — Queue-Based Architecture
 *
 * Progress driven by server-side job state via polling.
 * Steps: confirming → submitted (with real progress) → awaiting_payment → success | error
 */

import { createPortal } from 'react-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Loader2, CheckCircle, AlertCircle, Copy, ExternalLink, Wallet, Share2, Sparkles } from 'lucide-react';
import { useMint } from '@/contexts/MintContext';
import { useMetadataAttributes } from './MetadataPreview';
import { generateRandomName, validateName, MAX_NAME_LENGTH, getPlaceholderHint } from '@/lib/nameGenerator';
import { FighterRevealCard } from './FighterRevealCard';
import { MintPreviewPanel } from './MintPreviewPanel';

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
    rateLimitRetryAfterSeconds,
    credits,
    pendingMintType,
    pendingMintParams,
    totalMinted,
    maxSupply,
    resetMintFlow,
    retryMint,
    confirmMint,
    acceptOfferInWallet,
    getTotalMintPrice,
    customName,
    setCustomName,
  } = useMint();
  const metadataAttributes = useMetadataAttributes();
  const prefersReducedMotion = useReducedMotion();
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nameError, setNameError] = useState('');
  const [revealImageUrl, setRevealImageUrl] = useState<string>();
  const revealObjectUrlRef = useRef<string | null>(null);

  // Persist preview image across the whole mint flow (pendingMintParams is cleared on submit).
  useEffect(() => {
    const imageBlob = pendingMintParams?.imageBlob;
    if (!imageBlob) return;
    const nextUrl = URL.createObjectURL(imageBlob);
    if (revealObjectUrlRef.current) {
      URL.revokeObjectURL(revealObjectUrlRef.current);
    }
    revealObjectUrlRef.current = nextUrl;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRevealImageUrl(nextUrl);
  }, [pendingMintParams?.imageBlob]);

  useEffect(() => {
    if (!isOpen && revealObjectUrlRef.current) {
      URL.revokeObjectURL(revealObjectUrlRef.current);
      revealObjectUrlRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevealImageUrl(undefined);
    }
  }, [isOpen]);

  useEffect(() => () => {
    if (revealObjectUrlRef.current) {
      URL.revokeObjectURL(revealObjectUrlRef.current);
      revealObjectUrlRef.current = null;
    }
  }, []);

  const handleNameChange = (value: string) => {
    const validation = validateName(value);
    setNameError(validation.error || '');
    if (value.length <= MAX_NAME_LENGTH) {
      setCustomName(value);
    }
  };

  // Countdown timer for paid mints
  useEffect(() => {
    const expiresAt = currentJob?.expiresAt;
    if (!expiresAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (revealObjectUrlRef.current) {
      URL.revokeObjectURL(revealObjectUrlRef.current);
      revealObjectUrlRef.current = null;
      setRevealImageUrl(undefined);
    }
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
    const mintgardenUrl = currentJob.mintgardenUrl || 'https://mintgarden.io';
    const wojakLabel = currentJob.mintNumber ? `Your Wojak #${currentJob.mintNumber}` : 'a Your Wojak';
    const namePart = customName ? ` — ${customName}` : '';
    const text = `🌱 I just minted ${wojakLabel}${namePart} 🍊\n\nCreate yours at wojak.ink/generator\n@mojuicex`;
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(mintgardenUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
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
      return { title: 'Minting', icon: <Loader2 size={40} className="animate-spin text-accent" role="status" aria-label="Minting in progress" /> };
    }
    if (isAwaitingPayment) {
      return { title: 'Accept Offer', icon: <Wallet size={40} className="animate-pulse text-accent" /> };
    }
    if (isSuccess) {
      return {
        title: isFreeMint ? 'Free Mint Complete!' : 'Minted!',
        icon: <CheckCircle size={22} className="text-success" />,
      };
    }
    if (isError) {
      return { title: 'Mint Failed', icon: <AlertCircle size={40} className="text-error" /> };
    }
    return { title: 'Mint', icon: <Loader2 size={40} className="animate-spin text-accent" role="status" aria-label="Loading" /> };
  };

  const { title, icon } = getStepDisplay();
  const parsedError = errorMessage ? friendlyErrorMessage(errorMessage) : null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--color-black-70)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          onClick={handleClose}
        >
          <motion.div
            className="card p-4 sm:p-5 max-w-sm w-full max-h-[92vh] overflow-y-auto"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={prefersReducedMotion ? { duration: 0.15 } : { type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mint-flow-title"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 mb-3 -mx-1 px-1 py-1 backdrop-blur-sm">
              <h2 id="mint-flow-title" className="text-lg font-semibold flex items-center gap-2">
                {isSuccess && icon}
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

            <div className="flex flex-col items-center gap-2.5 text-center">
              {/* Icon — hidden for confirming and success steps (shown inline with title) */}
              {!isConfirming && !isSuccess && icon}

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
                const price = getTotalMintPrice(metadataAttributes);
                const balance = Math.round((credits?.balance ?? 0) / 100);
                const creditCost = Math.ceil(100 * price.totalXch / price.basePrice);
                const isFreeConfirm = pendingMintType === 'free';
                return (
                  <div className="w-full flex flex-col gap-2.5">
                    {/* NFT Preview Panel — image, headline, traits + price */}
                    <MintPreviewPanel
                      imageUrl={revealImageUrl}
                      attributes={metadataAttributes}
                      price={price}
                      isFree={isFreeConfirm}
                      creditCost={creditCost}
                      totalMinted={totalMinted}
                      maxSupply={maxSupply}
                    />

                    {/* Name your Wojak — simplified, centered label */}
                    <div className="flex flex-col gap-1.5 w-full">
                      <label className="text-xs text-muted text-center">
                        Name (optional)
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            className="input w-full pr-12"
                            type="text"
                            value={customName}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder={getPlaceholderHint(metadataAttributes)}
                            maxLength={MAX_NAME_LENGTH}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                            {customName.length}/{MAX_NAME_LENGTH}
                          </span>
                        </div>
                        <button
                          className="btn btn-ghost text-xs"
                          onClick={() => {
                            const name = generateRandomName(metadataAttributes);
                            setCustomName(name);
                            setNameError('');
                          }}
                          type="button"
                        >
                          Random
                        </button>
                      </div>
                      {nameError && <p className="text-xs text-error">{nameError}</p>}
                    </div>

                    {/* Condensed context footnote */}
                    <p className="text-[11px] text-muted text-center">
                      {isFreeConfirm
                        ? <>{creditCost} of {balance} credits · No wallet signing</>
                        : <>15 min to accept in your Sage Wallet</>
                      }
                    </p>

                    <div className="flex gap-2">
                      <button type="button" className="btn btn-secondary flex-1" onClick={handleClose}>
                        Cancel
                      </button>
                      <button type="button" className="btn btn-primary flex-1" onClick={confirmMint} disabled={!!nameError}>
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

              {/* Auto-detection notice — polling + cleanup handle confirmation automatically */}
              {showOfferActions && currentJob?.offerFile && !isExpired && (
                <p className="text-muted text-xs">
                  Already accepted? We&apos;ll detect it automatically.
                </p>
              )}

              {/* ── Error ── */}
              {isError && parsedError && (
                <div className="w-full flex flex-col gap-2.5">
                  <p className="text-error text-sm">{parsedError.message}</p>
                  {/rate limit|Too many/i.test(errorMessage ?? '') && rateLimitRetryAfterSeconds != null && rateLimitRetryAfterSeconds > 0 && (
                    <p className="text-muted text-xs tabular-nums">
                      Try again in {rateLimitRetryAfterSeconds} second{rateLimitRetryAfterSeconds !== 1 ? 's' : ''}.
                    </p>
                  )}
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
                  {/* Fighter Reveal Card if combat data available */}
                  {currentJob.combat && currentJob.mintNumber ? (
                    <FighterRevealCard
                      mintNumber={currentJob.mintNumber}
                      customName={customName || undefined}
                      combat={currentJob.combat}
                      imageUrl={revealImageUrl}
                    />
                  ) : (
                    <>
                      {/* Fallback: Celebration rings for non-combat mints */}
                      <div className="relative flex items-center justify-center" style={{ height: 0 }}>
                        <div className="mint-celebrate-ring mint-celebrate-ring-1" style={{ width: 60, height: 60, top: -30, left: 'calc(50% - 30px)' }} />
                        <div className="mint-celebrate-ring mint-celebrate-ring-2" style={{ width: 60, height: 60, top: -30, left: 'calc(50% - 30px)' }} />
                        <div className="mint-celebrate-ring mint-celebrate-ring-3" style={{ width: 60, height: 60, top: -30, left: 'calc(50% - 30px)' }} />
                      </div>
                      <p className="text-secondary text-sm">
                        Your Wojak #{currentJob.mintNumber}
                      </p>
                    </>
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
