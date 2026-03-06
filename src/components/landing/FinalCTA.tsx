/**
 * Final CTA Section
 *
 * - Centered "Enter the Grove" button
 * - Floating NFTs on left and right
 * - No wallet connect button
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// FinalCTA uses all available NFTs - it's the last section so variety matters
const CTA_IMAGES = [
  '/assets/gallery-previews/wojak.webp',
  '/assets/gallery-previews/waifu.webp',
  '/assets/gallery-previews/soyjak.webp',
  '/assets/gallery-previews/baddie.webp',
  '/assets/gallery-previews/alien-wojak.webp',
  '/assets/gallery-previews/alien-waifu.webp',
  '/assets/gallery-previews/bepe-wojak.webp',
  '/assets/gallery-previews/monkey-zoo.webp',
  '/assets/gallery-previews/papa-tang.webp',
  '/assets/gallery-previews/bepe-baddie.png',
  '/assets/gallery-previews/alien-baddie.webp',
  '/assets/gallery-previews/alien-soyjak.webp',
];

const POSITIONS = {
  left: [
    { x: '5%', y: '20%', size: 100, delay: 0 },
    { x: '8%', y: '50%', size: 80, delay: 0.3 },
    { x: '3%', y: '75%', size: 90, delay: 0.6 },
  ],
  right: [
    { x: '85%', y: '15%', size: 90, delay: 0.2 },
    { x: '88%', y: '45%', size: 85, delay: 0.5 },
    { x: '82%', y: '70%', size: 95, delay: 0.8 },
  ],
};

function getRandomImages(count: number, offset: number = 0): string[] {
  // Use offset to get different starting images for left vs right
  const start = offset % CTA_IMAGES.length;
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(CTA_IMAGES[(start + i * 2) % CTA_IMAGES.length]);
  }
  return result;
}

export const FinalCTA: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [leftImages, setLeftImages] = useState<string[]>(() => getRandomImages(3, 0));
  const [rightImages, setRightImages] = useState<string[]>(() => getRandomImages(3, 5));

  // Rotate images
  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      const side = Math.random() > 0.5 ? 'left' : 'right';
      const setter = side === 'left' ? setLeftImages : setRightImages;

      setter(prev => {
        const newImages = [...prev];
        const randomIndex = Math.floor(Math.random() * 3);
        const allCurrentImages = [...leftImages, ...rightImages];
        const currentSet = new Set(allCurrentImages);
        const available = CTA_IMAGES.filter(img => !currentSet.has(img));
        if (available.length > 0) {
          newImages[randomIndex] = available[Math.floor(Math.random() * available.length)];
        }
        return newImages;
      });
    }, 7000);

    return () => clearInterval(interval);
  }, [prefersReducedMotion, leftImages, rightImages]);

  return (
    <div className="final-cta-container">
      {/* Left Floating NFTs */}
      <div className="cta-floating-nfts left">
        {POSITIONS.left.map((pos, index) => (
          <motion.div
            key={`left-${index}`}
            className="cta-floating-nft"
            style={{
              left: pos.x,
              top: pos.y,
              width: pos.size,
              height: pos.size,
            }}
            animate={
              !prefersReducedMotion
                ? {
                    y: [0, -15, 0],
                    rotate: [-5, 5, -5],
                  }
                : {}
            }
            transition={{
              y: { duration: 4 + pos.delay, repeat: Infinity, ease: 'easeInOut' },
              rotate: { duration: 5 + pos.delay, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={leftImages[index]}
                src={leftImages[index]}
                alt="Floating Wojak NFT preview"
                loading="lazy"
                decoding="async"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
              />
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Right Floating NFTs */}
      <div className="cta-floating-nfts right">
        {POSITIONS.right.map((pos, index) => (
          <motion.div
            key={`right-${index}`}
            className="cta-floating-nft"
            style={{
              left: pos.x,
              top: pos.y,
              width: pos.size,
              height: pos.size,
            }}
            animate={
              !prefersReducedMotion
                ? {
                    y: [0, -12, 0],
                    rotate: [5, -5, 5],
                  }
                : {}
            }
            transition={{
              y: { duration: 3.5 + pos.delay, repeat: Infinity, ease: 'easeInOut' },
              rotate: { duration: 4.5 + pos.delay, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={rightImages[index]}
                src={rightImages[index]}
                alt="Floating Wojak NFT preview"
                loading="lazy"
                decoding="async"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
              />
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Centered CTA Content */}
      <motion.div
        className="cta-content-centered"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2>Ready to Join?</h2>
        <p>Become part of the Wojak Farmer's Plot community</p>

        <motion.button
          className="enter-grove-btn large"
          onClick={() => navigate('/gallery')}
          whileHover={{
            scale: 1.05,
            boxShadow: '0 0 50px rgba(249, 115, 22, 0.6)',
          }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="btn-glow" />
          <span className="btn-text">Enter the Grove</span>
          <span className="btn-arrow">→</span>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default FinalCTA;
