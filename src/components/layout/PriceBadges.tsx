/**
 * PriceBadges Component
 *
 * Displays floor price and XCH price in the header with split-flap animation.
 * Features simulated price ticker that randomly adjusts cents between API calls.
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { useFloorPrice } from '@/hooks/data/useMarket';
import { useXchPrice } from '@/hooks/data/useTreasuryData';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import './PriceSplitFlap.css';

// Animation timing
const FLIP_DURATION = 240; // ms for full flip animation

// Simulated ticker timing (ms)
const MIN_TICK_INTERVAL = 5000;   // 5 seconds
const MAX_TICK_INTERVAL = 15000;  // 15 seconds

function getRandomTickInterval() {
  return Math.floor(Math.random() * (MAX_TICK_INTERVAL - MIN_TICK_INTERVAL + 1)) + MIN_TICK_INTERVAL;
}

function getRandomCentChange() {
  // Random cents: 1 or 2
  const cents = Math.floor(Math.random() * 2) + 1;
  // Randomly positive or negative
  const direction = Math.random() < 0.5 ? -1 : 1;
  return (cents / 100) * direction; // Convert cents to dollars
}

// Split-Flap Character Component for prices
interface PriceFlapCharProps {
  char: string;
  index: number;
  muted?: boolean;
}

const PriceFlapChar = memo(function PriceFlapChar({ char, index, muted = false }: PriceFlapCharProps) {
  const [displayChar, setDisplayChar] = useState(char);
  const [isFlipping, setIsFlipping] = useState(false);
  const [foldChar, setFoldChar] = useState(char);
  const [unfoldChar, setUnfoldChar] = useState(char);
  const targetCharRef = useRef(char);

  const doFlip = useCallback((newChar: string) => {
    setFoldChar(displayChar);
    setUnfoldChar(newChar);
    setIsFlipping(true);

    setTimeout(() => {
      setIsFlipping(false);
      setDisplayChar(newChar);
      setFoldChar(newChar);
    }, FLIP_DURATION);
  }, [displayChar]);

  useEffect(() => {
    if (char !== targetCharRef.current) {
      targetCharRef.current = char;

      if (char === displayChar) return;

      // Start flip after small stagger delay
      const staggerTimeout = setTimeout(() => {
        doFlip(char);
      }, index * 30);

      return () => clearTimeout(staggerTimeout);
    }
  }, [char, index, displayChar, doFlip]);

  const isSymbol = char === '$' || char === '(' || char === ')';
  const isDecimal = char === '.';

  return (
    <div
      className={`price-flap-char ${isFlipping ? 'flipping' : ''} ${muted ? 'muted' : ''} ${isSymbol ? 'char-symbol' : ''} ${isDecimal ? 'char-decimal' : ''}`}
      data-char={displayChar}
    >
      <div className="price-flap-bottom" data-char={displayChar} />
      <div className="price-flap-unfold-bottom" data-char={unfoldChar} />
      <div className="price-flap-top" data-char={displayChar} />
      <div className="price-flap-fold-top" data-char={foldChar} />
    </div>
  );
});

// Split-Flap Price Display
interface PriceFlapDisplayProps {
  text: string;
  muted?: boolean;
}

function PriceFlapDisplay({ text, muted = false }: PriceFlapDisplayProps) {
  return (
    <div className="price-flap-container">
      <div className="price-flap-display">
        {text.split('').map((char, index) => (
          <PriceFlapChar key={index} char={char} index={index} muted={muted} />
        ))}
      </div>
    </div>
  );
}

interface PriceBadgesProps {
  size?: 'sm' | 'md';
}

// Live indicator pulsing seedling emoji
function LiveIndicator() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.span
      className="inline-block"
      style={{
        fontSize: '0.85em',
        lineHeight: 1,
      }}
      animate={prefersReducedMotion ? {} : {
        scale: [1, 1.2, 1],
        opacity: [1, 0.7, 1],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      🌱
    </motion.span>
  );
}

export function PriceBadges({ size = 'md' }: PriceBadgesProps) {
  const { data: floorPrice, isLoading: floorLoading } = useFloorPrice();
  const { data: xchPrice, isLoading: xchLoading } = useXchPrice();

  // Simulated prices with ticker effect
  const [simulatedXchPrice, setSimulatedXchPrice] = useState<number | null>(null);
  const [delayedFloorUsd, setDelayedFloorUsd] = useState<number | null>(null);
  const baseXchPriceRef = useRef<number | null>(null);
  const tickerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floorDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLoading = floorLoading || xchLoading;
  const floor = floorPrice ?? 0;

  // Update base price when API data changes
  // When real API price changes, reset simulated price to real value
  useEffect(() => {
    if (xchPrice != null && xchPrice > 0) {
      const previousBase = baseXchPriceRef.current;
      baseXchPriceRef.current = xchPrice;

      // If this is initial load OR the API price changed significantly (> 1%), reset to real price
      if (simulatedXchPrice === null || (previousBase !== null && Math.abs(xchPrice - previousBase) > previousBase * 0.01)) {
        queueMicrotask(() => setSimulatedXchPrice(xchPrice));
      }
    }
  }, [xchPrice, simulatedXchPrice]);

  // Simulated price ticker - runs every 5-15 seconds
  useEffect(() => {
    // Wait until we have a base price
    if (xchPrice == null || xchPrice <= 0) return;

    const tick = () => {
      setSimulatedXchPrice(currentPrice => {
        const basePrice = baseXchPriceRef.current ?? xchPrice;
        const currentValue = currentPrice ?? basePrice;

        // Apply random cent change (1 or 2 cents up or down)
        const centChange = getRandomCentChange();
        const newPrice = currentValue + centChange;

        // Keep within ±4 cents of base price
        const minPrice = basePrice - 0.04;
        const maxPrice = basePrice + 0.04;
        const clampedPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));

        return clampedPrice;
      });

      // Schedule next tick
      const nextInterval = getRandomTickInterval();
      tickerTimeoutRef.current = setTimeout(tick, nextInterval);
    };

    // Start ticker after initial delay
    const initialDelay = getRandomTickInterval();
    tickerTimeoutRef.current = setTimeout(tick, initialDelay);

    return () => {
      if (tickerTimeoutRef.current) {
        clearTimeout(tickerTimeoutRef.current);
      }
    };
  }, [xchPrice]);

  // Use simulated price or fall back to API price
  const displayXchPrice = simulatedXchPrice ?? xchPrice ?? 0;
  const calculatedFloorUsd = floor * displayXchPrice;

  // Delay floor USD update by ~250ms after XCH price changes
  useEffect(() => {
    // Clear any pending delay
    if (floorDelayTimeoutRef.current) {
      clearTimeout(floorDelayTimeoutRef.current);
    }

    // If this is the initial load, set immediately
    if (delayedFloorUsd === null) {
      queueMicrotask(() => setDelayedFloorUsd(calculatedFloorUsd));
      return;
    }

    // Otherwise delay the update
    floorDelayTimeoutRef.current = setTimeout(() => {
      setDelayedFloorUsd(calculatedFloorUsd);
    }, 175);

    return () => {
      if (floorDelayTimeoutRef.current) {
        clearTimeout(floorDelayTimeoutRef.current);
      }
    };
  }, [calculatedFloorUsd, delayedFloorUsd]);

  // Use delayed floor USD for display
  const floorUsd = delayedFloorUsd ?? calculatedFloorUsd;

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const gap = size === 'sm' ? 'gap-3' : 'gap-4';

  // Format prices for display
  const formatFloorXch = (price: number) => {
    if (price < 1) {
      return price.toFixed(2);
    }
    return price.toFixed(1);
  };

  const formatUsd = (price: number) => {
    return price.toFixed(2);
  };

  const floorXchText = formatFloorXch(floor);
  const floorUsdText = formatUsd(floorUsd);
  const xchPriceText = formatUsd(displayXchPrice);

  return (
    <div className={`flex items-center ${gap}`}>
      {/* Floor Price Badge */}
      <div
        className={`flex items-center px-3 rounded-lg`}
        style={{
          fontSize: size === 'sm' ? '0.75rem' : '0.875rem',
          background: 'rgba(74, 222, 128, 0.1)',
          border: '1px solid rgba(74, 222, 128, 0.2)',
          height: 'var(--header-badge-height)',
        }}
      >
        <span
          className={`${textSize} font-medium uppercase tracking-wide mr-2`}
          style={{ color: 'rgba(74, 222, 128, 0.7)' }}
        >
          Floor
        </span>
        {isLoading ? (
          <span
            className={`${textSize} font-bold text-muted`}
          >
            ...
          </span>
        ) : (
          <div className="flex items-center">
            <PriceFlapDisplay text={floorXchText} muted />
            <span
              className="font-bold ml-1 mr-3"
              style={{ color: '#4ade80' }}
            >
              XCH
            </span>
            <span style={{ color: 'rgba(74, 222, 128, 0.7)' }}>($</span>
            <PriceFlapDisplay text={floorUsdText} muted />
            <span style={{ color: 'rgba(74, 222, 128, 0.7)' }}>)</span>
          </div>
        )}
      </div>

      {/* XCH Price Badge with Live Indicator */}
      <div
        className={`flex items-center gap-2 px-3 rounded-lg`}
        style={{
          fontSize: size === 'sm' ? '0.75rem' : '0.875rem',
          background: 'rgba(74, 222, 128, 0.1)',
          border: '1px solid rgba(74, 222, 128, 0.2)',
          height: 'var(--header-badge-height)',
        }}
      >
        {/* Live indicator dot */}
        {!xchLoading && simulatedXchPrice !== null && <LiveIndicator />}

        <span
          className={`${textSize} font-medium uppercase tracking-wide`}
          style={{ color: 'rgba(74, 222, 128, 0.7)' }}
        >
          XCH
        </span>
        {xchLoading && simulatedXchPrice === null ? (
          <span
            className={`${textSize} font-bold text-muted`}
          >
            ...
          </span>
        ) : (
          <div className="flex items-center">
            <span style={{ color: 'rgba(74, 222, 128, 0.7)' }}>$</span>
            <PriceFlapDisplay text={xchPriceText} muted />
          </div>
        )}
      </div>
    </div>
  );
}

export default PriceBadges;
