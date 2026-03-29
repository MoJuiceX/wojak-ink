// src/components/generator/ai/AICreditsDisplay.tsx

import { Sparkles } from 'lucide-react';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';

export function AICreditsDisplay() {
  const { balance, isLoadingBalance, openShop } = useAIEnhance();

  const badgeClass = `ai-credits-badge${balance === 0 && !isLoadingBalance ? ' ai-credits-badge--empty' : ''}`;
  const showFullBuyHint = balance === 0 && !isLoadingBalance;
  const showLowBalanceHint = balance > 0 && balance <= 3 && !isLoadingBalance;
  const calloutClass = `ai-credits-callout${showLowBalanceHint ? ' ai-credits-callout--subtle' : ''}`;
  const calloutCopy = showLowBalanceHint ? 'Top up credits' : 'Buy credits';
  const calloutAriaLabel = showLowBalanceHint ? 'Top up AI credits' : 'Click here to buy AI credits';

  return (
    <div className="ai-credits-rail">
      <button
        className={badgeClass}
        onClick={openShop}
        title="Buy AI credits"
      >
        {isLoadingBalance ? '...' : `\u{1FA99} ${balance} credit${balance !== 1 ? 's' : ''}`}
      </button>

      {showFullBuyHint || showLowBalanceHint ? (
        <button
          type="button"
          className={calloutClass}
          onClick={openShop}
          aria-label={calloutAriaLabel}
        >
          {showFullBuyHint ? (
            <span className="ai-credits-callout-bridge" aria-hidden="true">
              <span className="ai-credits-callout-chevron" />
              <span className="ai-credits-callout-chevron" />
              <span className="ai-credits-callout-chevron" />
              <span className="ai-credits-callout-chevron" />
              <span className="ai-credits-callout-chevron" />
            </span>
          ) : null}
          <span className="ai-credits-callout-surface">
            {showFullBuyHint ? (
              <>
                <span className="ai-credits-callout-glint" aria-hidden="true" />
                <span className="ai-credits-callout-sparkle ai-credits-callout-sparkle--one" aria-hidden="true" />
                <span className="ai-credits-callout-sparkle ai-credits-callout-sparkle--two" aria-hidden="true" />
              </>
            ) : null}
            <span className="ai-credits-callout-icon">
              <Sparkles size={12} />
            </span>
            <span className="ai-credits-callout-copy">
              {calloutCopy}
            </span>
          </span>
        </button>
      ) : null}
    </div>
  );
}
