// src/components/generator/ai/AICreditsShop.tsx

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Lightbox } from '@/components/ui/Lightbox';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import { AI_CREDIT_BUNDLES } from '@/types/aiEnhance';

export function AICreditsShop() {
  const { isShopOpen, closeShop, balance, refetchBalance } = useAIEnhance();
  const prefersReducedMotion = useReducedMotion();
  const [selectedTier, setSelectedTier] = useState('15'); // Default to POPULAR
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const selectedBundle = AI_CREDIT_BUNDLES.find((b) => b.tier === selectedTier);

  const handlePurchase = async () => {
    if (!selectedBundle || isPurchasing) return;
    setIsPurchasing(true);
    setPurchaseError(null);
    setPurchaseSuccess(null);

    try {
      const res = await fetch('/api/ai/credits/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: 'TODO_WALLET', // Will be wired to actual wallet in integration
          tier: selectedBundle.tier,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPurchaseError(data.error || 'Purchase failed. Try again.');
        return;
      }

      // TODO: Integrate with wallet offer file acceptance flow
      // For now, auto-confirm for development
      const confirmRes = await fetch('/api/ai/credits/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId: data.purchaseId,
          walletAddress: 'TODO_WALLET',
        }),
      });

      if (confirmRes.ok) {
        const confirmData = await confirmRes.json();
        setPurchaseSuccess(`Added ${confirmData.creditsAdded} credits!`);
        await refetchBalance();
      } else {
        setPurchaseError('Confirmation failed. Contact support.');
      }
    } catch {
      setPurchaseError('Network error. Check your connection.');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Lightbox
      isOpen={isShopOpen}
      onClose={closeShop}
      title="Buy AI Credits"
      size="md"
    >
      <div className="flex flex-col gap-4">
        {/* Current balance */}
        <div className="text-center">
          <span className="text-secondary text-sm">Current balance: </span>
          <span className="font-semibold">{balance} credits</span>
        </div>

        {/* Bundle list */}
        <div className="flex flex-col gap-2">
          {AI_CREDIT_BUNDLES.map((bundle) => (
            <motion.button
              key={bundle.tier}
              className={`ai-bundle-option ${selectedTier === bundle.tier ? 'ai-bundle-option--selected' : ''}`}
              onClick={() => setSelectedTier(bundle.tier)}
              whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.99 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{bundle.credits} credit{bundle.credits !== 1 ? 's' : ''}</span>
                  {bundle.badge && (
                    <span className={`ai-bundle-badge ${bundle.badge === 'POPULAR' ? 'ai-bundle-badge--popular' : 'ai-bundle-badge--value'}`}>
                      {bundle.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {bundle.discount && (
                    <span className="text-xs" style={{ color: 'var(--color-success)' }}>
                      {bundle.discount}
                    </span>
                  )}
                  <span className="font-semibold">{bundle.priceXch} XCH</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Error / Success messages */}
        {purchaseError && (
          <p className="text-sm text-center" style={{ color: 'var(--color-error)' }}>
            {purchaseError}
          </p>
        )}
        {purchaseSuccess && (
          <p className="text-sm text-center" style={{ color: 'var(--color-success)' }}>
            {purchaseSuccess}
          </p>
        )}

        {/* Buy button */}
        <motion.button
          className="btn btn-primary w-full"
          onClick={handlePurchase}
          disabled={isPurchasing || !selectedBundle}
          whileHover={!isPurchasing && !prefersReducedMotion ? { scale: 1.02 } : {}}
          whileTap={!isPurchasing && !prefersReducedMotion ? { scale: 0.98 } : {}}
        >
          {isPurchasing
            ? 'Processing...'
            : `Buy ${selectedBundle?.credits ?? 0} credits \u2014 ${selectedBundle?.priceXch ?? 0} XCH`}
        </motion.button>

        <p className="text-muted text-xs text-center">
          1 credit = 1 AI enhancement. Credits are non-refundable.
        </p>
      </div>
    </Lightbox>
  );
}
