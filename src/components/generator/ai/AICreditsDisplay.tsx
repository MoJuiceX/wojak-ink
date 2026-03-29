// src/components/generator/ai/AICreditsDisplay.tsx

import { Sparkles } from 'lucide-react';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';

export function AICreditsDisplay() {
  const { balance, isLoadingBalance, openShop } = useAIEnhance();

  const badgeClass = `ai-credits-badge${balance === 0 && !isLoadingBalance ? ' ai-credits-badge--empty' : ''}`;
  const showBuyHint = balance === 0 && !isLoadingBalance;

  return (
    <div className="ai-credits-rail">
      <button
        className={badgeClass}
        onClick={openShop}
        title="Buy AI credits"
      >
        {isLoadingBalance ? '...' : `\u{1FA99} ${balance} credit${balance !== 1 ? 's' : ''}`}
      </button>

      {showBuyHint ? (
        <button
          type="button"
          className="ai-credits-callout"
          onClick={openShop}
          aria-label="Click here to buy AI credits"
        >
          <span className="ai-credits-callout-bridge" aria-hidden="true">
            <span className="ai-credits-callout-chevron" />
            <span className="ai-credits-callout-chevron" />
            <span className="ai-credits-callout-chevron" />
            <span className="ai-credits-callout-chevron" />
            <span className="ai-credits-callout-chevron" />
          </span>
          <span className="ai-credits-callout-surface">
            <span className="ai-credits-callout-glint" aria-hidden="true" />
            <span className="ai-credits-callout-sparkle ai-credits-callout-sparkle--one" aria-hidden="true" />
            <span className="ai-credits-callout-sparkle ai-credits-callout-sparkle--two" aria-hidden="true" />
            <span className="ai-credits-callout-icon">
              <Sparkles size={12} />
            </span>
            <span className="ai-credits-callout-copy">
              Buy credits
            </span>
          </span>
        </button>
      ) : null}
    </div>
  );
}
