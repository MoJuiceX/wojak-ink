/**
 * Section Floating NFTs
 *
 * Subtle floating NFT decorations for any section.
 * Fewer and smaller than hero, positioned at edges.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const NFT_IMAGE_POOL = [
  '/assets/gallery-previews/alien-wojak.webp',
  '/assets/gallery-previews/alien-baddie.webp',
  '/assets/gallery-previews/alien-soyjak.webp',
  '/assets/gallery-previews/alien-waifu.webp',
  '/assets/gallery-previews/baddie.webp',
  '/assets/gallery-previews/bepe-baddie.png',
  '/assets/gallery-previews/bepe-soyjak.webp',
  '/assets/gallery-previews/bepe-waifu.webp',
  '/assets/gallery-previews/bepe-wojak.webp',
  '/assets/gallery-previews/monkey-zoo.webp',
  '/assets/gallery-previews/papa-tang.webp',
  '/assets/gallery-previews/soyjak.webp',
  '/assets/gallery-previews/waifu.webp',
  '/assets/gallery-previews/wojak.webp',
];

interface Position {
  x: string;
  y: string;
  size: string;
  delay: number;
}

interface SectionFloatingNFTsProps {
  /** Number of NFTs to show (default: 4) */
  count?: number;
  /** Opacity of NFTs (default: 0.3 for subtle) */
  opacity?: number;
  /** Custom positions (optional) */
  positions?: Position[];
}

const DEFAULT_POSITIONS: Position[] = [
  { x: '2%', y: '15%', size: '60px', delay: 0 },
  { x: '92%', y: '25%', size: '50px', delay: 0.5 },
  { x: '5%', y: '75%', size: '55px', delay: 1 },
  { x: '88%', y: '80%', size: '45px', delay: 1.5 },
];

function getRandomImages(count: number): string[] {
  const shuffled = [...NFT_IMAGE_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const SectionFloatingNFTs: React.FC<SectionFloatingNFTsProps> = ({
  count = 4,
  opacity = 0.3,
  positions = DEFAULT_POSITIONS,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [images, setImages] = useState<string[]>(() => getRandomImages(count));

  // Rotate images periodically
  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      setImages(prev => {
        const newImages = [...prev];
        const randomIndex = Math.floor(Math.random() * count);
        const currentSet = new Set(newImages);
        const available = NFT_IMAGE_POOL.filter(img => !currentSet.has(img));
        if (available.length > 0) {
          newImages[randomIndex] = available[Math.floor(Math.random() * available.length)];
        }
        return newImages;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [count, prefersReducedMotion]);

  return (
    <div className="section-floating-nfts">
      {positions.slice(0, count).map((pos, index) => (
        <motion.div
          key={index}
          className="section-floating-nft"
          style={{
            left: pos.x,
            top: pos.y,
            width: pos.size,
            height: pos.size,
            opacity,
          }}
          animate={
            !prefersReducedMotion
              ? { y: [0, -8, 0], rotate: [-2, 2, -2] }
              : {}
          }
          transition={{
            y: { duration: 4 + pos.delay, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: 6 + pos.delay, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={images[index]}
              src={images[index]}
              alt="Decorative Wojak NFT"
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
  );
};

export default SectionFloatingNFTs;
