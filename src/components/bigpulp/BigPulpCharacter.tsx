/**
 * BigPulpCharacter Component
 *
 * Two-layer animated BigPulp character with Orange Grove background
 * and speech bubble with typing animation.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import '../../components/BigPulpCharacter.css';

interface BigPulpCharacterProps {
  message: string;
  isTyping?: boolean;
  headTrait?: string;
  onTypingComplete?: () => void;
  onSkipMessage?: () => void;
  /** Compact mode for mobile empty state - smaller height, inline layout */
  compact?: boolean;
}

// Head trait to BigPulp image mapping
const HEAD_TO_BIGPULP: Record<string, string> = {
  'Crown': 'BigP_crown.webp',
  'Clown': 'BigP_clown.webp',
  'Military Beret': 'BigP_beret.webp',
  'Viking Helmet': 'BigP_viking.webp',
  'Tin Foil Hat': 'BigP_tin.webp',
  'Super Wojak Hat': 'BigP_super_wojak.webp',
  'Propeller Hat': 'BigP_propeller.webp',
  'Fedora': 'BigP_Fedora.webp',
};

// Wizard hat colors (random selection)
const WIZARD_COLORS = [
  'BigP_wiz_orange.webp',
  'BigP_wiz_red.webp',
  'BigP_wiz_pink.webp',
  'BigP_wiz_blue.webp',
  'BigP_wiz_yellow.webp',
  'BigP_wiz_dark_blue.webp',
];

// All images for random fallback
const ALL_BIGPULP_IMAGES = [
  'BigP_crown.webp',
  'BigP_clown.webp',
  'BigP_beret.webp',
  'BigP_viking.webp',
  'BigP_tin.webp',
  'BigP_super_wojak.webp',
  'BigP_propeller.webp',
  'BigP_Fedora.webp',
  ...WIZARD_COLORS,
];

export function BigPulpCharacter({
  message,
  isTyping = false,
  headTrait,
  onTypingComplete,
  onSkipMessage,
  compact = false,
}: BigPulpCharacterProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isAnimatingText, setIsAnimatingText] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<number | null>(null);

  // Determine which BigPulp image to use based on head trait
  const bigPulpImage = useMemo(() => {
    if (!headTrait) {
      // No trait provided - pick random
      return ALL_BIGPULP_IMAGES[Math.floor(Math.random() * ALL_BIGPULP_IMAGES.length)];
    }

    // Check for Wizard Hat - pick random wizard color
    if (headTrait === 'Wizard Hat') {
      return WIZARD_COLORS[Math.floor(Math.random() * WIZARD_COLORS.length)];
    }

    // Check for direct match
    if (HEAD_TO_BIGPULP[headTrait]) {
      return HEAD_TO_BIGPULP[headTrait];
    }

    // No match - pick random
    return ALL_BIGPULP_IMAGES[Math.floor(Math.random() * ALL_BIGPULP_IMAGES.length)];
  }, [headTrait]);

  // Typing animation effect
  useEffect(() => {
    // Clear any existing timer
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    if (!message) {
      setDisplayedText('');
      return;
    }

    if (isTyping) {
      setIsAnimatingText(true);
      setDisplayedText('');
      let index = 0;
      const typingSpeed = 20; // ms per character

      typingTimerRef.current = window.setInterval(() => {
        if (index < message.length) {
          setDisplayedText(message.slice(0, index + 1));
          index++;
        } else {
          if (typingTimerRef.current) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
          }
          setIsAnimatingText(false);
          onTypingComplete?.();
        }
      }, typingSpeed);

      return () => {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
      };
    } else {
      setDisplayedText(message);
      setIsAnimatingText(false);
    }
  }, [message, isTyping, onTypingComplete]);

  // Check for overflow (scrollable content)
  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      setHasOverflow(el.scrollHeight > el.clientHeight);
    }
  }, [displayedText]);

  // Handle click to skip typing
  const handleBubbleClick = () => {
    if (isAnimatingText && typingTimerRef.current) {
      // Skip to end of message
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
      setDisplayedText(message);
      setIsAnimatingText(false);
      onTypingComplete?.();
    } else {
      onSkipMessage?.();
    }
  };

  return (
    <div className={`bigpulp-character-container ${compact ? 'compact' : ''}`}>
      {/* Speech Bubble - positioned at top */}
      <div
        className={`speech-bubble ${displayedText ? 'visible' : ''} ${hasOverflow ? 'has-overflow' : ''}`}
        onClick={handleBubbleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBubbleClick();
          }
        }}
        aria-live="polite"
      >
        <div className="speech-content" ref={contentRef}>
          {displayedText}
          {isAnimatingText && <span className="typing-cursor">|</span>}
        </div>
        <div className="speech-tail" />
      </div>

      {/* Character with two layers */}
      <div className="bigpulp-character">
        <div className="character-layers">
          {/* Layer 1: Static base (feet) */}
          <img
            src="/assets/BigPulp/art/BigP_base.webp"
            alt="BigPulp base"
            className="bigpulp-layer bigpulp-layer-static"
          />
          {/* Layer 2: Moving character (floats up and down) */}
          <img
            src={`/assets/BigPulp/art/${bigPulpImage}`}
            alt="BigPulp"
            className="bigpulp-layer bigpulp-layer-moving"
          />
        </div>
      </div>
    </div>
  );
}

export default BigPulpCharacter;
