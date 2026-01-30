/**
 * Hero Section
 *
 * Above-the-fold landing section with BigPulp character,
 * floating NFTs, and scroll indicator with parallax layers.
 */

import React, { useState, useEffect } from 'react';
import { motion, useTransform, useReducedMotion, MotionValue, AnimatePresence } from 'framer-motion';
import { FloatingNFTs } from './FloatingNFTs';

const TAGLINES = [
  '4,200 Unique Wojaks on Chia',
  'Banger NFTs on Chia',
  'Art for the Grove',
  'Wojak Farmers Plot',
];

interface HeroSectionProps {
  scrollProgress: MotionValue<number>;
  onExplore: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  scrollProgress,
  onExplore,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const parallaxMultiplier = prefersReducedMotion ? 0 : 1;
  const [taglineIndex, setTaglineIndex] = useState(0);

  // Rotate taglines
  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setTaglineIndex(prev => (prev + 1) % TAGLINES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  // Parallax layers at different speeds
  const bgY = useTransform(scrollProgress, [0, 0.3], [0, -150 * parallaxMultiplier]);
  const midY = useTransform(scrollProgress, [0, 0.3], [0, -80 * parallaxMultiplier]);
  const frontY = useTransform(scrollProgress, [0, 0.3], [0, -30 * parallaxMultiplier]);
  const textOpacity = useTransform(scrollProgress, [0, 0.15], [1, 0]);
  const scale = useTransform(scrollProgress, [0, 0.2], [1, 0.9]);

  return (
    <>
      {/* Background layer - gradient glow */}
      <motion.div
        className="hero-bg-layer"
        style={{ y: bgY }}
      />

      {/* Mid layer - floating NFTs */}
      <motion.div
        className="hero-mid-layer"
        style={{ y: midY }}
      >
        <FloatingNFTs />
      </motion.div>

      {/* Front layer - BigPulp */}
      <motion.div
        className="hero-front-layer"
        style={{ y: frontY, scale }}
      >
        <motion.div
          className="bigpulp-hero"
          animate={
            !prefersReducedMotion
              ? {
                  y: [0, -20, 0],
                }
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
              alt="BigPulp mascot base layer"
              loading="eager"
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
              alt="BigPulp"
              loading="eager"
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
      </motion.div>

      {/* Title at top */}
      <motion.div className="hero-title-wrapper" style={{ opacity: textOpacity }}>
        <motion.h1
          className="hero-title-golden"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Welcome to the Grove
        </motion.h1>
      </motion.div>

      {/* Tagline and scroll indicator at bottom */}
      <motion.div className="hero-bottom-content" style={{ opacity: textOpacity }}>
        <div className="hero-tagline-container">
          <AnimatePresence mode="wait">
            <motion.p
              key={taglineIndex}
              className="hero-tagline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              {TAGLINES[taglineIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <motion.div
          className="scroll-indicator-inline"
          animate={!prefersReducedMotion ? { y: [0, 8, 0] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
          onClick={onExplore}
        >
          <span>Scroll to Explore</span>
          <div className="scroll-arrow">↓</div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default HeroSection;
