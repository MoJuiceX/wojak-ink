/**
 * SmallTokensList Component
 *
 * Displays tokens with value less than $1 in a compact list format.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { WalletToken } from '@/types/treasury';

interface SmallTokensListProps {
  tokens: WalletToken[];
  maxDisplay?: number;
  isLoading?: boolean;
}

function TokenRow({ token, index }: { token: WalletToken; index: number }) {
  return (
    <motion.div
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:border-l-2"
      style={{
        borderBottom: '1px solid var(--color-border)',
        borderLeftColor: 'var(--color-brand-primary)',
      }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      role="listitem"
    >
      {/* Logo */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: token.color + '20' }}
      >
        {token.logoFallback}
      </div>

      {/* Token info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: 'var(--color-text)' }}
        >
          {token.symbol}
        </p>
        <p
          className="text-xs truncate"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {token.name}
        </p>
      </div>

      {/* Value */}
      <span
        className="text-sm font-mono flex-shrink-0"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        ${token.valueUSD.toFixed(2)}
      </span>
    </motion.div>
  );
}

function TokenRowSkeleton() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 animate-pulse"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div
        className="w-8 h-8 rounded-full flex-shrink-0"
        style={{ background: 'var(--color-border)' }}
      />
      <div className="flex-1 space-y-1.5">
        <div
          className="h-4 rounded"
          style={{ background: 'var(--color-border)', width: '40%' }}
        />
        <div
          className="h-3 rounded"
          style={{ background: 'var(--color-border)', width: '60%' }}
        />
      </div>
      <div
        className="h-4 w-12 rounded flex-shrink-0"
        style={{ background: 'var(--color-border)' }}
      />
    </div>
  );
}

export function SmallTokensList({ tokens, maxDisplay = 5, isLoading = false }: SmallTokensListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Loading skeleton
  if (isLoading) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div
            className="h-4 w-32 rounded animate-pulse"
            style={{ background: 'var(--color-border)' }}
          />
          <div
            className="h-3 w-16 rounded animate-pulse"
            style={{ background: 'var(--color-border)' }}
          />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <TokenRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Sort by value descending
  const sortedTokens = [...tokens].sort((a, b) => b.valueUSD - a.valueUSD);
  const displayTokens = isExpanded ? sortedTokens : sortedTokens.slice(0, maxDisplay);
  const hasMore = tokens.length > maxDisplay;

  if (tokens.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p style={{ color: 'var(--color-text-muted)' }}>No small token holdings</p>
      </div>
    );
  }

  return (
    <motion.div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Small Holdings ({'<'}$1)
        </h3>
        <span
          className="text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {tokens.length} tokens
        </span>
      </div>

      {/* Token list */}
      <div role="list" aria-label="Small token holdings">
        <AnimatePresence mode="popLayout">
          {displayTokens.map((token, index) => (
            <TokenRow key={token.id} token={token} index={index} />
          ))}
        </AnimatePresence>
      </div>

      {/* Show more/less button */}
      {hasMore && (
        <button
          className="w-full px-4 py-3 flex items-center justify-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--color-brand-primary)' }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              Show Less <ChevronUp size={16} />
            </>
          ) : (
            <>
              Show All ({tokens.length}) <ChevronDown size={16} />
            </>
          )}
        </button>
      )}
    </motion.div>
  );
}

export default SmallTokensList;
