/**
 * Mint Flow Modal
 *
 * Full-screen modal that guides the user through the minting process:
 * - Preparing (uploading to IPFS)
 * - Awaiting offer (paid mints — show offer, send to Sage)
 * - Countdown (waiting for user to accept in Sage)
 * - Confirming (polling for on-chain confirmation)
 * - Success (congratulations!)
 * - Failed / Expired (error recovery)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  ExternalLink,
  Wallet,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useMint, type MintFlowStep } from '@/contexts/MintContext';

interface MintFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MintFlowModal({ isOpen, onClose }: MintFlowModalProps) {
  const {
    mintStep,
    pendingMint,
    mintError,
    countdownSeconds,
    confirmPaidMint,
    resetMintFlow,
    copyOfferToClipboard,
  } = useMint();

  const [copiedOffer, setCopiedOffer] = useState(false);

  const handleClose = () => {
    if (mintStep === 'preparing' || mintStep === 'confirming') {
      // Don't allow closing during critical operations
      return;
    }
    resetMintFlow();
    onClose();
  };

  const handleCopyOffer = async () => {
    const ok = await copyOfferToClipboard();
    if (ok) {
      setCopiedOffer(true);
      setTimeout(() => setCopiedOffer(false), 2000);
    }
  };

  const formatCountdown = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 10000 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
          }}
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          className="card relative w-full max-w-md p-6 flex flex-col items-center gap-5"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
        >
          {/* Close button (when allowed) */}
          {mintStep !== 'preparing' && mintStep !== 'confirming' && (
            <button
              className="absolute top-4 right-4 text-secondary hover:text-white transition-colors"
              onClick={handleClose}
              aria-label="Close"
            >
              <XCircle size={24} />
            </button>
          )}

          {/* Step content */}
          <StepContent
            step={mintStep}
            pendingMint={pendingMint}
            mintError={mintError}
            countdownSeconds={countdownSeconds}
            formatCountdown={formatCountdown}
            onSendToWallet={confirmPaidMint}
            onCopyOffer={handleCopyOffer}
            copiedOffer={copiedOffer}
            onRetry={() => {
              resetMintFlow();
              onClose();
            }}
            onClose={handleClose}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============ Step content renderer ============

function StepContent({
  step,
  pendingMint,
  mintError,
  countdownSeconds,
  formatCountdown,
  onSendToWallet,
  onCopyOffer,
  copiedOffer,
  onRetry,
  onClose,
}: {
  step: MintFlowStep;
  pendingMint: ReturnType<typeof useMint>['pendingMint'];
  mintError: string | null;
  countdownSeconds: number;
  formatCountdown: (s: number) => string;
  onSendToWallet: () => void;
  onCopyOffer: () => void;
  copiedOffer: boolean;
  onRetry: () => void;
  onClose: () => void;
}) {
  switch (step) {
    case 'preparing':
      return (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          >
            <Loader2 size={48} style={{ color: 'var(--color-primary)' }} />
          </motion.div>
          <h3 className="text-lg font-bold">Preparing Your Wojak</h3>
          <p className="text-secondary text-center text-sm">
            Uploading to IPFS and generating your NFT...
          </p>
          <div
            className="w-full rounded-lg p-3 text-xs text-secondary"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Loader2 size={12} className="animate-spin" />
              Uploading image to IPFS
            </div>
            <div className="flex items-center gap-2 mb-1 opacity-50">
              <Clock size={12} />
              Generating metadata
            </div>
            <div className="flex items-center gap-2 opacity-50">
              <Clock size={12} />
              Calling MintGarden
            </div>
          </div>
        </>
      );

    case 'awaiting_offer':
      return (
        <>
          <Wallet size={48} style={{ color: 'var(--color-primary)' }} />
          <h3 className="text-lg font-bold">{pendingMint?.nft_name || 'Your Wojak'}</h3>
          <p className="text-secondary text-center text-sm">
            Your NFT is ready! Send the offer to your Sage wallet to complete the mint.
          </p>

          {/* Price breakdown */}
          {pendingMint?.total_price_xch !== undefined && (
            <div
              className="w-full rounded-lg p-3 text-sm"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <div className="flex justify-between mb-1">
                <span className="text-secondary">Base price</span>
                <span>{pendingMint.base_price_xch || 0.2} XCH</span>
              </div>
              {(pendingMint.surcharge_xch || 0) > 0 && (
                <div className="flex justify-between mb-1">
                  <span className="text-secondary">
                    Trait premium ({pendingMint.highest_surcharge_trait?.split(':')[1]})
                  </span>
                  <span>+{pendingMint.surcharge_xch?.toFixed(3)} XCH</span>
                </div>
              )}
              <div
                className="flex justify-between pt-2 mt-2 font-bold"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <span>Total</span>
                <span className="text-accent">{pendingMint.total_price_xch?.toFixed(3)} XCH</span>
              </div>
            </div>
          )}

          {/* Timer */}
          {countdownSeconds > 0 && (
            <div className="flex items-center gap-2 text-sm text-secondary">
              <Clock size={14} />
              <span>Expires in {formatCountdown(countdownSeconds)}</span>
            </div>
          )}

          {/* Send to Sage */}
          <button
            className="btn btn-primary w-full flex items-center justify-center gap-2"
            onClick={onSendToWallet}
          >
            <Wallet size={18} />
            Accept in Sage Wallet
          </button>

          {/* Copy offer */}
          <button
            className="btn btn-ghost w-full flex items-center justify-center gap-2 text-sm"
            onClick={onCopyOffer}
          >
            <Copy size={14} />
            {copiedOffer ? 'Copied!' : 'Copy offer file (paste in Sage manually)'}
          </button>
        </>
      );

    case 'countdown':
      return (
        <>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Wallet size={48} style={{ color: 'var(--color-cyan)' }} />
          </motion.div>
          <h3 className="text-lg font-bold">Check Your Sage Wallet</h3>
          <p className="text-secondary text-center text-sm">
            Accept the offer in your Sage wallet to complete the mint.
          </p>
          {countdownSeconds > 0 && (
            <div
              className="text-3xl font-mono font-bold"
              style={{ color: countdownSeconds < 60 ? 'var(--color-error)' : 'var(--color-primary)' }}
            >
              {formatCountdown(countdownSeconds)}
            </div>
          )}
          <div
            className="w-full rounded-lg p-3 text-xs text-secondary text-center"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            Waiting for wallet confirmation...
          </div>
        </>
      );

    case 'confirming':
      return (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          >
            <Loader2 size={48} style={{ color: 'var(--color-success)' }} />
          </motion.div>
          <h3 className="text-lg font-bold">Confirming On-Chain</h3>
          <p className="text-secondary text-center text-sm">
            Your transaction was accepted! Waiting for blockchain confirmation...
          </p>
        </>
      );

    case 'success':
      return (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10, stiffness: 100 }}
          >
            <Sparkles size={56} style={{ color: 'var(--color-primary)' }} />
          </motion.div>
          <h3 className="text-xl font-bold">
            {pendingMint?.nft_name || 'Your Wojak'} Minted!
          </h3>
          <p className="text-secondary text-center text-sm">
            Congratulations! Your custom Wojak NFT has been minted to your wallet.
          </p>

          {/* NFT Preview */}
          {pendingMint?.ipfs_image_uri && (
            <div className="w-32 h-32 rounded-xl overflow-hidden" style={{ border: '2px solid var(--color-primary)' }}>
              <img
                src={pendingMint.ipfs_image_uri}
                alt={pendingMint.nft_name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* MintGarden link */}
          {pendingMint?.launcher_id && (
            <a
              href={`https://mintgarden.io/nfts/${pendingMint.launcher_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost flex items-center gap-2 text-sm"
            >
              <ExternalLink size={14} />
              View on MintGarden
            </a>
          )}

          <button
            className="btn btn-primary w-full"
            onClick={onClose}
          >
            <CheckCircle2 size={18} className="mr-2" />
            Done
          </button>
        </>
      );

    case 'failed':
      return (
        <>
          <XCircle size={48} style={{ color: 'var(--color-error)' }} />
          <h3 className="text-lg font-bold">Minting Failed</h3>
          <p className="text-secondary text-center text-sm">
            {mintError || 'Something went wrong. Please try again.'}
          </p>
          <button
            className="btn btn-primary w-full"
            onClick={onRetry}
          >
            Try Again
          </button>
        </>
      );

    case 'expired':
      return (
        <>
          <AlertTriangle size={48} style={{ color: 'var(--color-primary)' }} />
          <h3 className="text-lg font-bold">Offer Expired</h3>
          <p className="text-secondary text-center text-sm">
            The 15-minute window has passed. No charge was made.
            Your design is saved — you can mint again when ready.
          </p>
          <button
            className="btn btn-primary w-full"
            onClick={onRetry}
          >
            Try Again
          </button>
        </>
      );

    default:
      return null;
  }
}

export default MintFlowModal;
