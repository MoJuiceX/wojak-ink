// src/components/generator/ai/AICreditsShop.tsx

import { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Lightbox } from '@/components/ui/Lightbox';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import { AI_CREDIT_BUNDLES } from '@/types/aiEnhance';
import { Sparkles, Check, Loader2, Clock, Shield } from 'lucide-react';
import { useSageWallet } from '@/sage-wallet';

const BASE_PRICE_PER_CREDIT = 0.10; // XCH — tier 1 single credit
const loadConfetti = () => import('canvas-confetti').then(m => m.default);

type PurchaseState = 'idle' | 'buying' | 'sending' | 'confirming' | 'success' | 'error';

const DYK_TIPS = [
  'Buying a Wojak Farmers Plot from secondary earns you AI and mint credits.',
  'Fading and glazing Wojaks in Fight Club increases your power level.',
  'Your first paid mint earns you a welcome bonus of 42 free mint credits.',
  'Wojak combat battles are coming soon \u2014 build your strongest Wojak now.',
  'Check the leaderboard for DIDs and individual Wojaks to see your ranking.',
  'Over 600 billion unique Wojak combinations are possible with AI enhancement.',
  'AI enhancements can be chained \u2014 enhance an already enhanced Wojak.',
  'Every trait and color you choose shapes your Wojak\u2019s combat identity.',
  'Only 4,200 Farmers Plot NFTs exist, but the Wojak supply is endless.',
  'What matters is how the community votes and how you battle in the arena.',
  'You can export your creation as a free image without minting.',
  'Each Wojak has a combat type, nature, and ability derived from its traits.',
  'Save your favorite builds and come back to them anytime.',
];

/** Rotate through tips every 15 seconds */
function getDYKIndex(elapsed: number): number {
  return Math.floor(elapsed / 15) % DYK_TIPS.length;
}

export function AICreditsShop() {
  const { isShopOpen, closeShop, balance, refetchBalance, sessionToken, ensureAuthenticated, reauthenticate } = useAIEnhance();
  const { status, sendXCH } = useSageWallet();
  const isConnected = status === 'connected';
  const prefersReducedMotion = useReducedMotion();
  const [selectedTier, setSelectedTier] = useState('25');
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('idle');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmElapsed, setConfirmElapsed] = useState(0);
  const confirmTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedBundle = AI_CREDIT_BUNDLES.find((b) => b.tier === selectedTier);
  const isPurchasing = purchaseState !== 'idle' && purchaseState !== 'success' && purchaseState !== 'error';

  // Tick elapsed timer during confirmation polling
  useEffect(() => {
    if (purchaseState === 'confirming') {
      setConfirmElapsed(0);
      confirmTimerRef.current = setInterval(() => setConfirmElapsed(s => s + 1), 1000);
    } else {
      if (confirmTimerRef.current) clearInterval(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
    return () => { if (confirmTimerRef.current) clearInterval(confirmTimerRef.current); };
  }, [purchaseState]);

  // On shop open, check for any pending purchase that may have been paid
  // while the user was away (e.g. closed browser during confirmation).
  // Uses sessionToken if available; skips if not (don't force auth just to check).
  useEffect(() => {
    if (!isShopOpen || !sessionToken) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/ai/credits/check-pending', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
        });
        if (cancelled) return;
        if (res.status === 401) return; // Session expired — will re-auth on purchase
        if (!res.ok) return;

        const data = await res.json();
        if (cancelled) return;

        if (data.confirmed && data.creditsAdded) {
          setPurchaseSuccess(`+${data.creditsAdded} AI credit${data.creditsAdded !== 1 ? 's' : ''} added!`);
          setPurchaseState('success');
          await refetchBalance();
        }
      } catch {
        // Silent — this is a best-effort background check
      }
    })();

    return () => { cancelled = true; };
  }, [isShopOpen, sessionToken, refetchBalance]);

  // Reset state and close shop
  const handleClose = () => {
    setPurchaseState('idle');
    setPurchaseError(null);
    setPurchaseSuccess(null);
    setStatusMessage(null);
    closeShop();
  };

  // Confetti burst on successful purchase
  useEffect(() => {
    if (purchaseSuccess && !prefersReducedMotion) {
      loadConfetti().then(confetti => {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.5 },
          colors: ['#F97316', '#FFD700', '#FF6B00', '#EA580C'],
        });
      });
    }
  }, [purchaseSuccess, prefersReducedMotion]);

  const handlePurchase = async () => {
    if (!selectedBundle || isPurchasing) return;
    setPurchaseError(null);
    setPurchaseSuccess(null);

    try {
      // Step 0: Ensure we have a valid session (lazy auth — prompts signing only when needed)
      setPurchaseState('buying');
      setStatusMessage('Preparing purchase...');

      let token = await ensureAuthenticated();
      if (!token) {
        setPurchaseError('Wallet authentication required. Please sign the message in your wallet.');
        setPurchaseState('error');
        setStatusMessage(null);
        return;
      }

      // Step 1: Create purchase intent
      const res = await fetch('/api/ai/credits/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier: selectedBundle.tier,
        }),
      });

      // Re-authenticate on 401 and retry once
      if (res.status === 401) {
        token = await reauthenticate();
        if (!token) {
          setPurchaseError('Session expired. Please try again.');
          setPurchaseState('error');
          setStatusMessage(null);
          return;
        }
        const retryRes = await fetch('/api/ai/credits/buy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ tier: selectedBundle.tier }),
        });
        const retryData = await retryRes.json();
        if (!retryRes.ok) {
          setPurchaseError(retryData.error || 'Purchase failed. Try again.');
          setPurchaseState('error');
          setStatusMessage(null);
          return;
        }
        // Continue with retry data
        return await continuePurchase(retryData, token);
      }

      const data = await res.json();

      if (!res.ok) {
        setPurchaseError(data.error || 'Purchase failed. Try again.');
        setPurchaseState('error');
        setStatusMessage(null);
        return;
      }

      await continuePurchase(data, token);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err);

      if (/rejected|denied/i.test(message)) {
        setPurchaseError('Transaction cancelled.');
      } else {
        setPurchaseError(message || 'Network error. Check your connection.');
      }
      setPurchaseState('error');
      setStatusMessage(null);
    }
  };

  const continuePurchase = async (data: { amountMojos: string; treasuryAddress: string; purchaseId: number }, authToken: string) => {
    // Step 2: Send XCH via wallet
    setPurchaseState('sending');
    setStatusMessage('Approve the transaction in your wallet...');

    // sendXCH takes XCH (not mojos), so convert from mojo string
    const amountXch = Number(data.amountMojos) / 1_000_000_000_000;
    await sendXCH(data.treasuryAddress, amountXch);

    // Step 3: Confirm on-chain
    // Chia blocks take ~45-90s, then Spacescan needs to index (~30-60s).
    // Total: ~2-3 minutes. The server does a single check per request
    // (no long polling that gets killed by CF Worker timeout).
    // Client polls every 15s for up to 3 minutes.
    setPurchaseState('confirming');
    setStatusMessage('Transaction sent! Waiting for on-chain confirmation...');

    const POLL_INTERVAL = 15_000; // 15 seconds between checks
    const MAX_POLLS = 12;         // 12 × 15s = 3 minutes total
    let confirmed = false;
    let token = authToken;

    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      if (attempt > 0) {
        const elapsed = attempt * 15;
        setStatusMessage(`Waiting for on-chain confirmation... (${elapsed}s)`);
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }

      try {
        let confirmRes = await fetch('/api/ai/credits/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            purchaseId: data.purchaseId,
          }),
        });

        // Re-authenticate on 401 and retry this poll
        if (confirmRes.status === 401) {
          const newToken = await reauthenticate();
          if (newToken) {
            token = newToken;
            confirmRes = await fetch('/api/ai/credits/confirm', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ purchaseId: data.purchaseId }),
            });
          }
        }

        // 4xx/5xx errors are real failures — stop polling
        if (confirmRes.status >= 400 && confirmRes.status !== 410) {
          setPurchaseError('Confirmation failed. Contact support.');
          setPurchaseState('error');
          setStatusMessage(null);
          return;
        }

        const confirmData = await confirmRes.json();

        if (confirmData.confirmed || confirmData.alreadyConfirmed) {
          const added = confirmData.creditsAdded ?? selectedBundle?.credits ?? 0;
          setPurchaseSuccess(`+${added} AI credit${added !== 1 ? 's' : ''} added!`);
          setPurchaseState('success');
          setStatusMessage(null);
          await refetchBalance();
          confirmed = true;
          break;
        }
        // 202: not yet detected, keep polling
      } catch {
        // Network error — keep trying (transient)
      }
    }

    if (!confirmed) {
      const credits = selectedBundle?.credits ?? 0;
      setPurchaseSuccess(`Payment sent! Your ${credits} credit${credits !== 1 ? 's' : ''} will appear shortly. Refresh the page to check.`);
      setPurchaseState('success');
      setStatusMessage(null);
    }
  };

  const getBuyButtonText = () => {
    switch (purchaseState) {
      case 'buying':
        return 'Preparing...';
      case 'sending':
        return 'Waiting for wallet...';
      case 'confirming':
        return 'Verifying on-chain...';
      case 'success':
        return 'Done!';
      default:
        return `Buy ${selectedBundle?.credits ?? 0} credits \u2014 ${selectedBundle?.priceXch ?? 0} XCH`;
    }
  };

  return (
    <Lightbox
      isOpen={isShopOpen}
      onClose={handleClose}
      title="AI Credits"
      size="md"
    >
      <div className="flex flex-col gap-4">
        {/* Hero balance + info */}
        <div className="ai-shop-balance">
          <div className="ai-shop-balance-icon">
            <Sparkles size={18} />
          </div>
          <span className="ai-shop-balance-count">{balance}</span>
          <span className="ai-shop-balance-label">
            credit{balance !== 1 ? 's' : ''} remaining
          </span>
          <span className="ai-shop-info-pill">
            1 credit = 1 enhancement
          </span>
        </div>

        {/* Wallet not connected warning */}
        {!isConnected && (
          <p className="text-sm text-center text-secondary">
            Connect your wallet to purchase credits
          </p>
        )}

        {/* Bundle list */}
        <div className="flex flex-col gap-2">
          {AI_CREDIT_BUNDLES.map((bundle) => {
            const isSelected = selectedTier === bundle.tier;
            const perCredit = bundle.priceXch / bundle.credits;
            const savings =
              bundle.credits > 1
                ? (BASE_PRICE_PER_CREDIT * bundle.credits - bundle.priceXch)
                : 0;

            return (
              <motion.button
                type="button"
                key={bundle.tier}
                className={`ai-shop-bundle ${isSelected ? 'ai-shop-bundle--selected' : ''}`}
                onClick={() => setSelectedTier(bundle.tier)}
                disabled={isPurchasing}
                whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.99 }}
              >
                {/* Left: credits number + label + badge inline */}
                <div className="ai-shop-bundle-left">
                  <span className="ai-shop-bundle-credits">
                    {bundle.credits}
                  </span>
                  <span className="ai-shop-bundle-label">
                    credit{bundle.credits !== 1 ? 's' : ''}
                  </span>
                  {bundle.badge && (
                    <span
                      className={`ai-bundle-badge ${
                        bundle.badge === 'POPULAR'
                          ? 'ai-bundle-badge--popular'
                          : 'ai-bundle-badge--value'
                      }`}
                    >
                      {bundle.badge}
                    </span>
                  )}
                </div>

                {/* Right: price top, details bottom */}
                <div className="ai-shop-bundle-right">
                  <span className="ai-shop-bundle-price">
                    {bundle.priceXch} XCH
                  </span>
                  <span className="ai-shop-bundle-details">
                    {perCredit.toFixed(3)}/credit
                    {bundle.discount && (
                      <> &middot; <span className="ai-shop-bundle-discount">{bundle.discount}</span></>
                    )}
                    {savings > 0 && (
                      <> &middot; <span className="ai-shop-bundle-savings">save {savings.toFixed(2)}</span></>
                    )}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Confirmation progress tracker */}
        <AnimatePresence mode="wait">
          {purchaseState === 'confirming' && (
            <motion.div
              className="ai-shop-confirm-tracker"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              key="confirm-tracker"
            >
              {/* Steps */}
              <div className="ai-shop-steps">
                <ConfirmStep
                  icon={<Check size={14} />}
                  label="Payment sent"
                  status="done"
                />
                <ConfirmStep
                  icon={confirmElapsed >= 90 ? <Check size={14} /> : <Loader2 size={14} className="ai-shop-spinner" />}
                  label={`Blockchain confirming${confirmElapsed > 0 ? ` (${confirmElapsed}s)` : ''}`}
                  status={confirmElapsed >= 90 ? 'done' : 'active'}
                />
                <ConfirmStep
                  icon={confirmElapsed >= 90 ? <Loader2 size={14} className="ai-shop-spinner" /> : <Clock size={14} />}
                  label="Verifying balance"
                  status={confirmElapsed >= 90 ? 'active' : 'pending'}
                />
              </div>

              {/* Reassurance message */}
              <div className="ai-shop-reassurance">
                <Shield size={14} />
                <span>
                  Your XCH has been sent. Your credit{selectedBundle && selectedBundle.credits !== 1 ? 's are' : ' is'} guaranteed
                  {' '}&mdash; the blockchain just needs a moment to confirm.
                </span>
              </div>

              {/* Rotating "Did you know?" tips */}
              <AnimatePresence mode="wait">
                <motion.div
                  className="ai-shop-tip"
                  key={getDYKIndex(confirmElapsed)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="ai-shop-tip-label block text-center">Did you know?</span>
                  <span className="block text-center">{DYK_TIPS[getDYKIndex(confirmElapsed)]}</span>
                </motion.div>
              </AnimatePresence>

              {/* Close-safe message after 2 minutes */}
              {confirmElapsed >= 120 && (
                <motion.p
                  className="text-xs text-center text-secondary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  You can safely close this window and come back later. Your credits will be waiting for you.
                </motion.p>
              )}

              {/* Progress bar */}
              <div className="ai-shop-progress-track">
                <motion.div
                  className="ai-shop-progress-fill"
                  initial={{ width: '5%' }}
                  animate={{ width: `${Math.min(95, 5 + confirmElapsed * 0.5)}%` }}
                  transition={{ ease: 'linear', duration: 1 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status message (for non-confirming states) */}
        {statusMessage && purchaseState !== 'confirming' && (
          <p className="text-sm text-center text-secondary">
            {statusMessage}
          </p>
        )}

        {/* Error / Success */}
        {purchaseError && (
          <p className="text-sm text-center text-error">
            {purchaseError}
          </p>
        )}
        {purchaseSuccess && (
          <p className="text-sm text-center text-success">
            {purchaseSuccess}
          </p>
        )}

        {/* Buy button */}
        <motion.button
          type="button"
          className="btn btn-primary w-full"
          onClick={purchaseState === 'success' ? handleClose : handlePurchase}
          disabled={(isPurchasing || !selectedBundle || !isConnected) && purchaseState !== 'success'}
          whileHover={!isPurchasing && !prefersReducedMotion ? { scale: 1.02 } : {}}
          whileTap={!isPurchasing && !prefersReducedMotion ? { scale: 0.98 } : {}}
        >
          {getBuyButtonText()}
        </motion.button>

        {/* Earn credits info */}
        <div className="ai-shop-earn-section">
          <div className="ai-shop-earn-divider">
            <span>or earn for free</span>
          </div>
          <div className="ai-shop-earn-methods">
            <div className="ai-shop-earn-method">
              <span className="ai-shop-earn-icon">🌾</span>
              <span className="ai-shop-earn-text">
                Buy a Wojak Farmers Plot <span className="text-accent">= +1 credit per XCH</span>
              </span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-muted text-xs text-center" style={{ opacity: 0.6 }}>
          Credits are non-refundable. Powered by Reve AI.
        </p>
      </div>
    </Lightbox>
  );
}

/** Individual step in the confirmation tracker */
function ConfirmStep({ icon, label, status }: {
  icon: React.ReactNode;
  label: string;
  status: 'done' | 'active' | 'pending';
}) {
  return (
    <div className={`ai-shop-step ai-shop-step--${status}`}>
      <span className="ai-shop-step-icon">{icon}</span>
      <span className="ai-shop-step-label">{label}</span>
    </div>
  );
}
