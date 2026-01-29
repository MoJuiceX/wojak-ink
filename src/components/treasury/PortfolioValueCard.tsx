/**
 * PortfolioValueCard Component
 *
 * Displays portfolio summary with split-flap animation and simulated ticker.
 * Uses the same realistic flip animation as the header price badges.
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { PortfolioSummary } from '@/types/treasury';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { SplitFlapDisplay } from '@/components/ui/SplitFlapDisplay';

interface PortfolioValueCardProps {
  portfolio: PortfolioSummary | null;
  isLoading?: boolean;
}

// Ticker simulation config
const MIN_TICK_INTERVAL = 5000;   // 5 seconds
const MAX_TICK_INTERVAL = 15000;  // 15 seconds
const MAX_DEVIATION = 0.04;       // ±4 cents from base

function getRandomTickInterval() {
  return Math.floor(Math.random() * (MAX_TICK_INTERVAL - MIN_TICK_INTERVAL + 1)) + MIN_TICK_INTERVAL;
}

function getRandomCentChange() {
  const cents = Math.floor(Math.random() * 2) + 1; // 1 or 2 cents
  const direction = Math.random() < 0.5 ? -1 : 1;
  return (cents / 100) * direction;
}

// Hook for simulated price ticker
function useSimulatedPrice(basePrice: number) {
  const [simulatedPrice, setSimulatedPrice] = useState(basePrice);
  const basePriceRef = useRef(basePrice);
  const tickerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update base price when it changes significantly
  useEffect(() => {
    if (Math.abs(basePrice - basePriceRef.current) > basePriceRef.current * 0.01) {
      basePriceRef.current = basePrice;
      queueMicrotask(() => setSimulatedPrice(basePrice));
    }
  }, [basePrice]);

  // Simulated ticker
  useEffect(() => {
    if (basePrice <= 0) return;

    const tick = () => {
      setSimulatedPrice(currentPrice => {
        const base = basePriceRef.current;
        const centChange = getRandomCentChange();
        const newPrice = currentPrice + centChange;

        // Keep within ±4 cents of base price
        const minPrice = base - MAX_DEVIATION;
        const maxPrice = base + MAX_DEVIATION;
        return Math.max(minPrice, Math.min(maxPrice, newPrice));
      });

      tickerTimeoutRef.current = setTimeout(tick, getRandomTickInterval());
    };

    tickerTimeoutRef.current = setTimeout(tick, getRandomTickInterval());

    return () => {
      if (tickerTimeoutRef.current) {
        clearTimeout(tickerTimeoutRef.current);
      }
    };
  }, [basePrice]);

  return simulatedPrice;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} mins ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  return `${diffHours} hours ago`;
}

function formatPrice(price: number, decimals: number = 2): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function PortfolioValueCard({
  portfolio,
  isLoading = false,
}: PortfolioValueCardProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  // Simulated prices with ticker effect (use 0 as fallback when portfolio is null)
  const simulatedTotalUSD = useSimulatedPrice(portfolio?.totalValueUSD ?? 0);
  const simulatedTotalXCH = useSimulatedPrice(portfolio?.totalValueXCH ?? 0);
  const simulatedXchUSD = useSimulatedPrice(portfolio?.xchValueUSD ?? 0);
  const simulatedCatsUSD = useSimulatedPrice(portfolio?.catsValueUSD ?? 0);

  // Skeleton loading state
  if (isLoading || !portfolio) {
    return (
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'var(--color-glass-bg)',
          border: '2px solid var(--color-border)',
        }}
      >
        <div className="p-6 space-y-4">
          <div className="h-10 w-48 rounded-lg animate-pulse mx-auto" style={{ background: 'var(--color-glass-hover)' }} />
          <div className="h-6 w-32 rounded-lg animate-pulse mx-auto" style={{ background: 'var(--color-glass-hover)' }} />
          <div className="h-px w-full" style={{ background: 'var(--color-border)' }} />
          <div className="h-5 w-56 rounded-lg animate-pulse mx-auto" style={{ background: 'var(--color-glass-hover)' }} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden hover-lift glow-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      role="region"
      aria-label="Portfolio summary"
      style={{
        // Gradient border using background-clip for consistent corner thickness
        background: `linear-gradient(var(--color-bg-secondary), var(--color-bg-secondary)) padding-box, linear-gradient(135deg, #ff6b00, #ff8c00, #ffaa00) border-box`,
        border: '2px solid transparent',
      }}
    >

      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          boxShadow: '0 0 30px rgba(255, 107, 0, 0.2), 0 0 60px rgba(255, 107, 0, 0.1)',
        }}
        animate={
          prefersReducedMotion
            ? {}
            : {
                opacity: [0.6, 1, 0.6],
              }
        }
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Content */}
      <div className="relative p-6 space-y-4 text-center">
        {/* Total USD value with split-flap animation */}
        <div
          className="text-3xl md:text-4xl font-bold flex items-center justify-center"
          aria-live="polite"
        >
          <span style={{ color: 'rgba(74, 222, 128, 0.7)' }}>$</span>
          <SplitFlapDisplay text={formatPrice(simulatedTotalUSD)} muted size="lg" />
        </div>

        {/* XCH equivalent with split-flap animation */}
        <div className="text-lg flex items-center justify-center">
          <span style={{ color: 'rgba(74, 222, 128, 0.7)' }}>≈ </span>
          <SplitFlapDisplay text={formatPrice(simulatedTotalXCH)} muted size="md" />
          <span className="ml-1 font-bold" style={{ color: '#4ade80' }}>XCH</span>
        </div>

        {/* Divider */}
        <div className="h-px" style={{ background: 'var(--color-border)' }} />

        {/* Breakdown with split-flap animation */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
          <div className="flex items-center">
            <span style={{ color: 'var(--color-text-secondary)' }}>XCH:&nbsp;</span>
            <span style={{ color: 'rgba(74, 222, 128, 0.7)' }}>$</span>
            <SplitFlapDisplay text={formatPrice(simulatedXchUSD)} muted size="sm" />
          </div>
          <span style={{ color: 'var(--color-text-muted)' }}>+</span>
          <div className="flex items-center">
            <span style={{ color: 'var(--color-text-secondary)' }}>CATs:&nbsp;</span>
            <span style={{ color: 'rgba(74, 222, 128, 0.7)' }}>$</span>
            <SplitFlapDisplay text={formatPrice(simulatedCatsUSD)} muted size="sm" />
          </div>
        </div>

        {/* Last updated */}
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Updated {formatTimeAgo(portfolio.lastUpdated)}
        </div>
      </div>
    </motion.div>
  );
}

export default PortfolioValueCard;
