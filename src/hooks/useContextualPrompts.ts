import { useMemo } from 'react';
import type { Message } from '@/types/bigpulp';

const PROMPT_SETS = {
  initial: [
    "What's trending today?",
    "Find undervalued NFTs",
    "Show me the floor",
    "Which traits are rarest?",
  ],
  afterNFTView: [
    "Find similar to this",
    "What's this trait worth?",
    "Is this a good deal?",
    "Show price history",
  ],
  afterPriceQuery: [
    "Compare to similar",
    "Show sales history",
    "What affects this price?",
    "Alert me if it drops",
  ],
  afterTraitQuery: [
    "Show NFTs with this trait",
    "What pairs well with this?",
    "Rarest combos with this trait",
    "Price range for this trait",
  ],
  afterMarketQuery: [
    "Who's buying?",
    "Recent big sales",
    "Volume trends",
    "Whale activity",
  ],
};

export function useContextualPrompts(conversationHistory: Message[]): string[] {
  return useMemo(() => {
    if (conversationHistory.length === 0) {
      return PROMPT_SETS.initial;
    }

    const lastUserMessage = [...conversationHistory]
      .reverse()
      .find(m => m.role === 'user');

    if (!lastUserMessage) {
      return PROMPT_SETS.initial;
    }

    const content = lastUserMessage.content.toLowerCase();

    if (content.includes('nft #') || content.includes('wojak #')) {
      return PROMPT_SETS.afterNFTView;
    }

    if (content.includes('price') || content.includes('worth') || content.includes('value')) {
      return PROMPT_SETS.afterPriceQuery;
    }

    if (content.includes('trait') || content.includes('attribute')) {
      return PROMPT_SETS.afterTraitQuery;
    }

    if (content.includes('market') || content.includes('floor') || content.includes('volume')) {
      return PROMPT_SETS.afterMarketQuery;
    }

    return PROMPT_SETS.initial;
  }, [conversationHistory]);
}
