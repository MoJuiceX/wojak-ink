// src/components/generator/ai/AICreditsDisplay.tsx

import { useAIEnhance } from '@/contexts/AIEnhanceContext';

export function AICreditsDisplay() {
  const { balance, isLoadingBalance, openShop } = useAIEnhance();

  return (
    <button
      className="ai-credits-badge"
      onClick={openShop}
      title="Buy AI credits"
    >
      {isLoadingBalance ? '...' : `\u{1FA99} ${balance} credit${balance !== 1 ? 's' : ''}`}
    </button>
  );
}
