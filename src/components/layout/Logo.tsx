/**
 * Logo Component
 *
 * Displays the Wojak.ink logo with hover animation.
 * Features split-flap display animation for rotating taglines.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { DEFAULT_ROUTE } from '@/config/routes';
import type { HeaderBreadcrumb } from '@/contexts/LayoutContext';
import './SplitFlap.css';

// Rotating taglines in uppercase
const TAGLINES = [
  'BANGER NFTS ON CHIA',
  'ART FOR THE GROVE',
  'WOJAK FARMERS PLOT',
];

// Random interval range (ms)
const MIN_INTERVAL = 14000;
const MAX_INTERVAL = 22000;

// Animation timing
const FLIP_DURATION = 300;
const STAGGER_DELAY = 40;
const SCRAMBLE_ITERATIONS = 4;

// Character set for scrambling
const CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+-=';

// Calculate max length for fixed width
const maxLength = Math.max(...TAGLINES.map(t => t.length));

function getRandomInterval() {
  return Math.floor(Math.random() * (MAX_INTERVAL - MIN_INTERVAL + 1)) + MIN_INTERVAL;
}

function getRandomChar() {
  return CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)];
}

function padPhrase(phrase: string): string {
  const padding = maxLength - phrase.length;
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return ' '.repeat(leftPad) + phrase + ' '.repeat(rightPad);
}

// Split-Flap Character Component
interface FlapCharProps {
  char: string;
  index: number;
}

function FlapChar({ char, index }: FlapCharProps) {
  const [displayChar, setDisplayChar] = useState(char);
  const [isFlipping, setIsFlipping] = useState(false);
  const [foldChar, setFoldChar] = useState(char);
  const [unfoldChar, setUnfoldChar] = useState(char);
  const targetCharRef = useRef(char);
  const iterationRef = useRef(0);
  const doFlipRef = useRef<(newChar: string, isFinal: boolean) => void>(() => {});

  const doFlip = useCallback((newChar: string, isFinal: boolean) => {
    setFoldChar(displayChar);
    setUnfoldChar(newChar);
    setIsFlipping(true);

    setTimeout(() => {
      setIsFlipping(false);
      setDisplayChar(newChar);
      setFoldChar(newChar);

      if (!isFinal) {
        // Continue scrambling
        iterationRef.current++;
        if (iterationRef.current < SCRAMBLE_ITERATIONS) {
          setTimeout(() => {
            doFlipRef.current(getRandomChar(), false);
          }, 20);
        } else {
          // Final flip to target
          setTimeout(() => {
            doFlipRef.current(targetCharRef.current, true);
          }, 20);
        }
      }
    }, FLIP_DURATION);
  }, [displayChar]);

  // Keep doFlipRef up to date
  useEffect(() => {
    doFlipRef.current = doFlip;
  }, [doFlip]);

  useEffect(() => {
    if (char !== targetCharRef.current) {
      targetCharRef.current = char;

      if (char === displayChar) return;

      // Start scramble sequence after stagger delay
      const staggerTimeout = setTimeout(() => {
        iterationRef.current = 0;
        doFlipRef.current(getRandomChar(), false);
      }, index * STAGGER_DELAY);

      return () => clearTimeout(staggerTimeout);
    }
  }, [char, index, displayChar]);

  return (
    <div className={`flap-char ${isFlipping ? 'flipping' : ''}`} data-char={displayChar}>
      <div className="flap-bottom" data-char={displayChar} />
      <div className="flap-unfold-bottom" data-char={unfoldChar} />
      <div className="flap-top" data-char={displayChar} />
      <div className="flap-fold-top" data-char={foldChar} />
    </div>
  );
}

// Split-Flap Display Component
interface SplitFlapDisplayProps {
  text: string;
}

function SplitFlapDisplay({ text }: SplitFlapDisplayProps) {
  const paddedText = padPhrase(text);

  return (
    <div className="split-flap-display">
      {paddedText.split('').map((char, index) => (
        <FlapChar key={index} char={char} index={index} />
      ))}
    </div>
  );
}

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showTagline?: boolean;
  variant?: 'header' | 'sidebar';
  breadcrumb?: HeaderBreadcrumb | null;
}

const sizeStyles = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
} as const;

const iconSizes = {
  sm: { container: 'w-7 h-7', icon: 'w-6 h-6' },
  md: { container: 'w-8 h-8', icon: 'w-7 h-7' },
  lg: { container: 'w-10 h-10', icon: 'w-9 h-9' },
} as const;

// Pulsating emoji with smooth scale effect
function PulsatingEmoji({ emoji, delay = 0 }: { emoji: string; delay?: number }) {
  return (
    <motion.span
      className="inline-block"
      animate={{
        scale: [1, 1.15, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    >
      {emoji}
    </motion.span>
  );
}

export function Logo({ className = '', size = 'md', showText = true, showTagline = false, variant = 'header', breadcrumb }: LogoProps) {
  const iconSize = iconSizes[size];
  const [taglineIndex, setTaglineIndex] = useState(0);
  const isSidebar = variant === 'sidebar';
  const orangeControls = useAnimation();
  const prevShowTextRef = useRef(showText);
  const prevBreadcrumbRef = useRef(breadcrumb);

  // Wiggle animation for sidebar orange when expand/collapse
  useEffect(() => {
    if (isSidebar && prevShowTextRef.current !== showText) {
      orangeControls.start({
        rotate: [0, -20, 18, -15, 12, -8, 5, -3, 0],
        transition: { duration: 0.6, ease: 'easeInOut' }
      });
    }
    prevShowTextRef.current = showText;
  }, [showText, isSidebar, orangeControls]);

  // Trigger flip animation when returning to Gallery (breadcrumb becomes null)
  useEffect(() => {
    if (prevBreadcrumbRef.current && !breadcrumb && showTagline) {
      // Small delay to let the tagline fade in first, then trigger flip
      setTimeout(() => {
        setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
      }, 150);
    }
    prevBreadcrumbRef.current = breadcrumb;
  }, [breadcrumb, showTagline]);

  useEffect(() => {
    if (!showTagline) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const interval = getRandomInterval();
      timeoutId = setTimeout(() => {
        setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
        scheduleNext();
      }, interval);
    };

    scheduleNext();

    return () => clearTimeout(timeoutId);
  }, [showTagline]);

  return (
    <Link to={DEFAULT_ROUTE} className={`block ${className}`}>
      <motion.div
        className="flex items-center"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      >
        {isSidebar ? (
          // Sidebar variant: Orange emoji centered to match nav icons
          <>
            <motion.span
              className="flex items-center justify-center flex-shrink-0"
              style={{
                fontSize: '1.75rem',
                width: '48px',
                height: '24px',
              }}
              animate={orangeControls}
            >
              🍊
            </motion.span>

            <motion.span
              className={`font-bold tracking-tight ${sizeStyles[size]} whitespace-nowrap overflow-hidden`}
              style={{ marginLeft: '4px' }}
              initial={false}
              animate={{
                opacity: showText ? 1 : 0,
                width: showText ? 'auto' : 0,
              }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            >
              <span className="text-accent">Orange</span>
              <span style={{ color: 'white' }}> Labs</span>
            </motion.span>
          </>
        ) : (
          // Header variant: Wojak.ink branding with favicon (or breadcrumb when set)
          <>
            {/* Container for logo/breadcrumb - fixed width only when showing tagline without breadcrumb */}
            <div
              className="flex items-center flex-shrink-0"
              style={{ width: (showTagline && !breadcrumb) ? (size === 'lg' ? '152px' : '124px') : 'auto' }}
            >
              {breadcrumb ? (
                // Breadcrumb mode: back button + character name
                <>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      breadcrumb.onBack?.();
                    }}
                    className={`${iconSize.container} flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-surface-hover)] text-secondary`}
                    style={{
                      marginRight: '8px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      flexShrink: 0,
                    }}
                    aria-label="Go back"
                  >
                    <ArrowLeft size={size === 'sm' ? 16 : size === 'md' ? 18 : 20} />
                  </button>
                  {showText && (
                    <span
                      className={`font-bold tracking-tight ${sizeStyles[size]} truncate text-primary`}
                      style={{
                        maxWidth: 'min(45vw, 180px)',
                      }}
                    >
                      {breadcrumb.label.startsWith('Bepe ') ? (
                        <>
                          <span className="text-accent">Bepe</span>
                          {breadcrumb.label.slice(4)}
                        </>
                      ) : breadcrumb.label.startsWith('Alien ') ? (
                        <>
                          <span style={{ color: '#80b455' }}>Alien</span>
                          {breadcrumb.label.slice(5)}
                        </>
                      ) : (
                        breadcrumb.label
                      )}
                    </span>
                  )}
                </>
              ) : (
                // Default: favicon + Wojak.ink with pulse glow
                <>
                  <motion.div
                    className={`${iconSize.container} flex items-center justify-center flex-shrink-0`}
                    style={{ marginRight: '8px' }}
                    animate={{
                      filter: [
                        'drop-shadow(0 0 5px var(--color-primary-30))',
                        'drop-shadow(0 0 15px var(--color-primary-50))',
                        'drop-shadow(0 0 5px var(--color-primary-30))',
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <img
                      src="/assets/icons/Wojak_logo.png"
                      alt="Wojak"
                      className={`${iconSize.icon} object-contain rounded-lg`}
                    />
                  </motion.div>
                  {showText && (
                    <span
                      className={`font-bold tracking-tight ${sizeStyles[size]} text-primary`}
                    >
                      Wojak
                      <span className="text-accent">.ink</span>
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Tagline - fades out when character selected, fades in when returning to Gallery */}
            <AnimatePresence mode="wait">
              {showText && showTagline && !breadcrumb && (
                <motion.div
                  className="flex items-center"
                  style={{ marginLeft: '10px' }}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                >
                  <PulsatingEmoji emoji="🍊" delay={0} />
                  <div
                    className="split-flap-container"
                    role="marquee"
                    aria-live="polite"
                    aria-label="Rotating tagline"
                    style={{ marginLeft: '-3px' }}
                  >
                    <span className="sr-only">{TAGLINES[taglineIndex]}</span>
                    <SplitFlapDisplay text={TAGLINES[taglineIndex]} />
                  </div>
                  <span style={{ marginLeft: '-6px' }}>
                    <PulsatingEmoji emoji="🌱" delay={1} />
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </Link>
  );
}

export default Logo;
