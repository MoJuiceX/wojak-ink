import { useState, useEffect, useMemo, useRef } from 'react';
import './BigPulpCharacter.css';

interface BigPulpCharacterProps {
  message: string;
  isTyping?: boolean;
  headTrait?: string;
  onTypingComplete?: () => void;
}

// Map head traits to BigPulp images
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

// Wizard hat colors for random selection
const WIZARD_COLORS = [
  'BigP_wiz_orange.webp',
  'BigP_wiz_red.webp',
  'BigP_wiz_pink.webp',
  'BigP_wiz_blue.webp',
  'BigP_wiz_yellow.webp',
  'BigP_wiz_dark_blue.webp',
];

// All available BigPulp images for random selection when no match
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

const BigPulpCharacter: React.FC<BigPulpCharacterProps> = ({
  message,
  isTyping = false,
  headTrait,
  onTypingComplete
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isAnimatingText, setIsAnimatingText] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Determine the BigPulp image based on head trait
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

  const baseImagePath = '/assets/BigPulp/art/BigP_base.webp';
  const characterImagePath = `/assets/BigPulp/art/${bigPulpImage}`;

  // Typing animation effect
  useEffect(() => {
    if (!message) {
      setDisplayedText('');
      return;
    }

    if (isTyping) {
      setIsAnimatingText(true);
      setDisplayedText('');
      let index = 0;
      const typingSpeed = 20; // ms per character

      const timer = setInterval(() => {
        if (index < message.length) {
          setDisplayedText(message.slice(0, index + 1));
          index++;
        } else {
          clearInterval(timer);
          setIsAnimatingText(false);
          onTypingComplete?.();
        }
      }, typingSpeed);

      return () => clearInterval(timer);
    } else {
      setDisplayedText(message);
      setIsAnimatingText(false);
    }
  }, [message, isTyping, onTypingComplete]);

  // Check for overflow when text changes
  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      setHasOverflow(el.scrollHeight > el.clientHeight);
    }
  }, [displayedText]);

  return (
    <div className="bigpulp-character-container">
      {/* Speech Bubble */}
      <div className={`speech-bubble ${displayedText ? 'visible' : ''} ${hasOverflow ? 'has-overflow' : ''}`}>
        <div className="speech-content" ref={contentRef}>
          {displayedText}
          {isAnimatingText && <span className="typing-cursor">|</span>}
        </div>
        <div className="speech-tail" />
      </div>

      {/* BigPulp Character - Two Layer Animation */}
      <div className="bigpulp-character">
        <div className="character-layers">
          {/* Layer 1: Static base (feet) */}
          <img
            src={baseImagePath}
            alt="BigPulp base"
            className="bigpulp-layer bigpulp-layer-static"
          />
          {/* Layer 2: Character variant (moves) */}
          <img
            src={characterImagePath}
            alt="BigPulp"
            className="bigpulp-layer bigpulp-layer-moving"
          />
        </div>
      </div>
    </div>
  );
};

export default BigPulpCharacter;
