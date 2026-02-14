/**
 * OtherTokensCard Component
 *
 * Displays small token holdings (<$1) in a grid with logo, name, and value.
 * Styled to match the current theme.
 */

import { motion } from 'framer-motion';
import type { WalletToken } from '@/types/treasury';
import { getFallbackLogo } from '@/services/treasuryFallback';

interface OtherTokensCardProps {
  tokens: WalletToken[];
  isLoading?: boolean;
}

export function OtherTokensCard({ tokens, isLoading = false }: OtherTokensCardProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="p-4">
          <div
            className="h-4 w-24 rounded mb-4 animate-pulse"
            style={{ background: 'var(--color-border)' }}
          />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-lg animate-pulse"
                style={{ background: 'var(--color-border)' }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Don't render if no tokens
  if (tokens.length === 0) {
    return null;
  }

  // Sort by value descending
  const sortedTokens = [...tokens].sort((a, b) => b.valueUSD - a.valueUSD);

  return (
    <motion.div
      className="rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      {/* Token list - scrollable content area */}
      <div className="p-3">
        <div className="flex flex-col gap-1.5">
          {sortedTokens.map((token, index) => (
            <motion.div
              key={token.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Token logo */}
              <img
                src={token.logoUrl || getFallbackLogo(token.symbol)}
                alt={token.symbol}
                className="w-7 h-7 rounded-full flex-shrink-0"
                style={{ objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getFallbackLogo(token.symbol);
                }}
              />

              {/* Token name - full width, no truncation */}
              <span
                className="text-sm font-medium flex-1"
                style={{ color: 'var(--color-text)' }}
              >
                {token.symbol}
              </span>

              {/* Token value */}
              <span
                className="text-sm font-semibold flex-shrink-0"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                ${token.valueUSD.toFixed(2)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default OtherTokensCard;
