/**
 * NFTSearchInput Component
 *
 * NFT ID search with auto-execute at 4 digits.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Search, Hash, Loader2 } from 'lucide-react';
import {
  searchInputVariants,
  diceRollVariants,
} from '@/config/bigpulpAnimations';

interface NFTSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (id: string) => void;
  onSurprise: () => void;
  onMyWojaks?: () => void;
  hasWallet?: boolean;
  ownedCount?: number;
  isLoading: boolean;
  error?: string;
}

export function NFTSearchInput({
  value,
  onChange,
  onSearch,
  onSurprise,
  onMyWojaks,
  hasWallet = false,
  ownedCount = 0,
  isLoading,
  error,
}: NFTSearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasAutoSearched, setHasAutoSearched] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Auto-search when 4 digits entered
  useEffect(() => {
    if (value.length === 4 && !hasAutoSearched && !isLoading) {
      queueMicrotask(() => setHasAutoSearched(true));
      onSearch(value);
      inputRef.current?.blur();
    }
  }, [value, hasAutoSearched, isLoading, onSearch]);

  // Reset auto-search flag when value changes
  useEffect(() => {
    if (value.length < 4) {
      queueMicrotask(() => setHasAutoSearched(false));
    }
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value.replace(/\D/g, '').slice(0, 4);
      onChange(newValue);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && value.length > 0) {
        const paddedValue = value.padStart(4, '0');
        onChange(paddedValue);
        onSearch(paddedValue);
        inputRef.current?.blur();
      }
    },
    [value, onChange, onSearch]
  );

  const handleSurprise = useCallback(() => {
    if (!isLoading) {
      setIsRolling(true);
      onSurprise();
      // Reset rolling state after animation
      setTimeout(() => setIsRolling(false), 600);
    }
  }, [isLoading, onSurprise]);

  const variants = prefersReducedMotion ? undefined : searchInputVariants;

  return (
    <div
      className="space-y-1 rounded-xl p-2"
      style={{ background: 'rgba(0, 0, 0, 0.75)' }}
    >
      <div className="flex gap-1.5 items-start">
        {/* Search input */}
        <motion.div
          className="relative"
          style={{ flex: '1 1 0', minWidth: 0 }}
          variants={variants}
          animate={error ? 'error' : isFocused ? 'focused' : 'idle'}
        >
          <div
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors"
            style={{
              background: 'var(--color-surface)',
              border: `1px solid ${error ? 'var(--color-error, #ef4444)' : isFocused ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
            }}
          >
            <Search
              size={14}
              style={{
                color: isFocused
                  ? 'var(--color-brand-primary)'
                  : 'var(--color-text-muted)',
              }}
            />
            <Hash
              size={12}
              style={{
                color: isFocused
                  ? 'var(--color-brand-primary)'
                  : 'var(--color-text-muted)',
                marginLeft: '-2px',
              }}
            />
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0420"
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isLoading}
              aria-label="Search NFT by ID number"
              aria-describedby={error ? 'search-error' : undefined}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm font-mono placeholder:opacity-40"
              style={{ color: 'var(--color-text-primary)', marginLeft: '-2px' }}
            />
            <AnimatePresence mode="wait">
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Loader2
                    size={14}
                    className="animate-spin"
                    style={{ color: 'var(--color-brand-primary)' }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Random dice button - blue like Generator */}
        <button
          className="flex items-center justify-center rounded-lg transition-colors flex-shrink-0"
          style={{
            background: '#3B82F6',
            border: '1px solid #3B82F6',
            width: '40px',
            height: '40px',
          }}
          onClick={handleSurprise}
          disabled={isLoading}
          aria-label="Get random NFT"
        >
          <motion.span
            className="text-base block"
            variants={prefersReducedMotion ? undefined : diceRollVariants}
            animate={isRolling || isLoading ? 'rolling' : 'idle'}
          >
            🎲
          </motion.span>
        </button>

        {/* My Wojaks button - only show if wallet connected with NFTs */}
        {hasWallet && ownedCount > 0 && onMyWojaks && (
          <button
            className="flex items-center justify-center gap-1 rounded-lg transition-colors flex-shrink-0 px-2"
            style={{
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              border: '1px solid #f97316',
              height: '40px',
              minWidth: '40px',
            }}
            onClick={onMyWojaks}
            disabled={isLoading}
            aria-label={`View your ${ownedCount} Wojaks`}
            title={`You own ${ownedCount} Wojak${ownedCount !== 1 ? 's' : ''}`}
          >
            <span className="text-base">👤</span>
            <span className="text-xs font-bold text-white">{ownedCount}</span>
          </button>
        )}
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            id="search-error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm px-1"
            style={{ color: 'var(--color-error, #ef4444)' }}
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

    </div>
  );
}

export default NFTSearchInput;
