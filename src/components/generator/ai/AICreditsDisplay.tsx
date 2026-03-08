// src/components/generator/ai/AICreditsDisplay.tsx

import { useAIEnhance } from '@/contexts/AIEnhanceContext';

export function AICreditsDisplay() {
  const { balance, isLoadingBalance, openShop } = useAIEnhance();

  const badgeClass = `ai-credits-badge${balance === 0 && !isLoadingBalance ? ' ai-credits-badge--empty' : ''}`;

  return (
    <button
      className={badgeClass}
      onClick={openShop}
      title="Buy AI credits"
    >
      {isLoadingBalance ? '...' : `\u{1FA99} ${balance} credit${balance !== 1 ? 's' : ''}`}
    </button>
  );
}
