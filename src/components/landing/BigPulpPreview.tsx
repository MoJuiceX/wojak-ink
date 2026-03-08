/**
 * BigPulp Preview - Landing Section
 *
 * Features:
 * - Larger BigPulp image with two layers (base + crown)
 * - Speech bubble with SEPARATE animation
 * - Typing effect for AI responses
 */

import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const SAMPLE_INSIGHTS = [
  "This Wojak has a 0.8% rarity score...",
  "Crown + Wizard combo appears in only 12 NFTs...",
  "Average sale price for Alien base: 2.4 XCH...",
  "This trait combination is ultra rare...",
];

export const BigPulpPreview: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const [insightIndex, setInsightIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');

  // Typing effect for insights
  useEffect(() => {
    const fullText = SAMPLE_INSIGHTS[insightIndex];
    let charIndex = 0;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    setDisplayText('');

    const typingInterval = setInterval(() => {
      if (charIndex < fullText.length) {
        setDisplayText(fullText.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        // Move to next insight after delay
        delayTimer = setTimeout(() => {
          setInsightIndex((prev) => (prev + 1) % SAMPLE_INSIGHTS.length);
        }, 3000);
      }
    }, 50);

    return () => {
      clearInterval(typingInterval);
      if (delayTimer) clearTimeout(delayTimer);
    };
  }, [insightIndex]);

  return (
    <div className="bigpulp-preview">
      {/* BigPulp Character - Larger, with layers */}
      <motion.div
        className="bigpulp-character-large"
        animate={
          !prefersReducedMotion
            ? { y: [0, -12, 0] }
            : {}
        }
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Layered BigPulp: base (legs) + crown (body) */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '864 / 973',
          }}
        >
          {/* Layer 1: Base/Legs */}
          <img
            src="/assets/BigPulp/art/BigP_base.webp"
            alt="BigPulp AI analyst base layer"
            loading="lazy"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: 1,
            }}
          />
          {/* Layer 2: Upper body with crown */}
          <img
            src="/assets/BigPulp/art/BigP_crown.webp"
            alt="BigPulp AI Analyst"
            loading="lazy"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: 2,
            }}
          />
        </div>
      </motion.div>

      {/* Speech Bubble - SEPARATE Animation */}
      <motion.div
        className="bigpulp-speech-bubble"
        initial={{ opacity: 0, scale: 0.8, x: 20 }}
        whileInView={{ opacity: 1, scale: 1, x: 0 }}
        viewport={{ once: true }}
        animate={
          !prefersReducedMotion
            ? {
                y: [0, -6, 0],
                rotate: [0, 1, 0],
              }
            : {}
        }
        transition={{
          y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
          rotate: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <div className="speech-bubble-content">
          <span className="typing-text">{displayText}</span>
          <span className="typing-cursor">|</span>
        </div>
        <div className="speech-bubble-tail" />
      </motion.div>
    </div>
  );
};

export default BigPulpPreview;
