/* eslint-disable react-refresh/only-export-components */
/**
 * SplitFlapDisplay Component
 *
 * Reusable split-flap animation display for prices and numbers.
 * Features realistic flip animation with top/bottom separation.
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import '../layout/PriceSplitFlap.css';

// Animation timing
const FLIP_DURATION = 240; // ms for full flip animation

// Split-Flap Character Component
interface FlapCharProps {
  char: string;
  index: number;
  muted?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const FlapChar = memo(function FlapChar({ char, index, muted = false, size = 'md' }: FlapCharProps) {
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

  const isSymbol = char === '$' || char === '(' || char === ')' || char === '≈';
  const isDecimal = char === '.';

  const sizeClass = size === 'lg' ? 'size-lg' : size === 'sm' ? 'size-sm' : '';

  return (
    <div
      className={`price-flap-char ${isFlipping ? 'flipping' : ''} ${muted ? 'muted' : ''} ${isSymbol ? 'char-symbol' : ''} ${isDecimal ? 'char-decimal' : ''} ${sizeClass}`}
      data-char={displayChar}
    >
      <div className="price-flap-bottom" data-char={displayChar} />
      <div className="price-flap-unfold-bottom" data-char={unfoldChar} />
      <div className="price-flap-top" data-char={displayChar} />
      <div className="price-flap-fold-top" data-char={foldChar} />
    </div>
  );
});

// Split-Flap Display Component
interface SplitFlapDisplayProps {
  text: string;
  muted?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SplitFlapDisplay({ text, muted = false, size = 'md' }: SplitFlapDisplayProps) {
  return (
    <div className={`price-flap-container ${size === 'lg' ? 'size-lg' : ''}`}>
      <div className="price-flap-display">
        {text.split('').map((char, index) => (
          <FlapChar key={index} char={char} index={index} muted={muted} size={size} />
        ))}
      </div>
    </div>
  );
}

// Ticker simulation utilities
export const TICKER_CONFIG = {
  MIN_INTERVAL: 5000,   // 5 seconds
  MAX_INTERVAL: 15000,  // 15 seconds
  MAX_DEVIATION: 0.04,  // ±4 cents from base
};

export function getRandomTickInterval() {
  return Math.floor(Math.random() * (TICKER_CONFIG.MAX_INTERVAL - TICKER_CONFIG.MIN_INTERVAL + 1)) + TICKER_CONFIG.MIN_INTERVAL;
}

export function getRandomCentChange() {
  // Random cents: 1 or 2
  const cents = Math.floor(Math.random() * 2) + 1;
  // Randomly positive or negative
  const direction = Math.random() < 0.5 ? -1 : 1;
  return (cents / 100) * direction;
}

// Hook for simulated price ticker
export function useSimulatedPrice(basePrice: number | null) {
  const [simulatedPrice, setSimulatedPrice] = useState<number | null>(null);
  const basePriceRef = useRef<number | null>(null);
  const tickerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update base price when it changes
  useEffect(() => {
    if (basePrice != null && basePrice > 0) {
      const previousBase = basePriceRef.current;
      basePriceRef.current = basePrice;

      // If initial load OR base changed significantly (> 1%), reset to real price
      if (simulatedPrice === null || (previousBase !== null && Math.abs(basePrice - previousBase) > previousBase * 0.01)) {
        queueMicrotask(() => setSimulatedPrice(basePrice));
      }
    }
  }, [basePrice, simulatedPrice]);

  // Simulated ticker - runs every 5-15 seconds
  useEffect(() => {
    if (basePrice == null || basePrice <= 0) return;

    const tick = () => {
      setSimulatedPrice(currentPrice => {
        const base = basePriceRef.current ?? basePrice;
        const currentValue = currentPrice ?? base;

        const centChange = getRandomCentChange();
        const newPrice = currentValue + centChange;

        // Keep within ±4 cents of base price
        const minPrice = base - TICKER_CONFIG.MAX_DEVIATION;
        const maxPrice = base + TICKER_CONFIG.MAX_DEVIATION;
        return Math.max(minPrice, Math.min(maxPrice, newPrice));
      });

      // Schedule next tick
      tickerTimeoutRef.current = setTimeout(tick, getRandomTickInterval());
    };

    // Start ticker after initial delay
    tickerTimeoutRef.current = setTimeout(tick, getRandomTickInterval());

    return () => {
      if (tickerTimeoutRef.current) {
        clearTimeout(tickerTimeoutRef.current);
      }
    };
  }, [basePrice]);

  return simulatedPrice ?? basePrice ?? 0;
}

export default SplitFlapDisplay;
