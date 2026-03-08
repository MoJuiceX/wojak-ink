// src/components/generator/ai/AICreditsShop.tsx

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Lightbox } from '@/components/ui/Lightbox';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import { AI_CREDIT_BUNDLES } from '@/types/aiEnhance';
import { Sparkles } from 'lucide-react';

const BASE_PRICE_PER_CREDIT = 0.08; // XCH — tier 1 single credit
const loadConfetti = () => import('canvas-confetti').then(m => m.default);

export function AICreditsShop() {
  const { isShopOpen, closeShop, balance, refetchBalance } = useAIEnhance();
  const prefersReducedMotion = useReducedMotion();
  const [selectedTier, setSelectedTier] = useState('15');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const selectedBundle = AI_CREDIT_BUNDLES.find((b) => b.tier === selectedTier);

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
    setIsPurchasing(true);
    setPurchaseError(null);
    setPurchaseSuccess(null);

    try {
      const res = await fetch('/api/ai/credits/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: 'TODO_WALLET',
          tier: selectedBundle.tier,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPurchaseError(data.error || 'Purchase failed. Try again.');
        return;
      }

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
                key={bundle.tier}
                className={`ai-shop-bundle ${isSelected ? 'ai-shop-bundle--selected' : ''}`}
                onClick={() => setSelectedTier(bundle.tier)}
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

        {/* Error / Success */}
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

        {/* Disclaimer */}
        <p className="text-muted text-xs text-center" style={{ opacity: 0.6 }}>
          Credits are non-refundable. Powered by Reve AI.
        </p>
      </div>
    </Lightbox>
  );
}
