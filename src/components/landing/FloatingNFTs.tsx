/**
 * Floating NFTs
 *
 * Decorative floating NFT previews for the hero section
 * with smooth breathing animation and image rotation on cycle.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// Hero section uses Alien variants and base characters
const HERO_IMAGES = [
  '/assets/gallery-previews/alien-wojak.webp',
  '/assets/gallery-previews/alien-baddie.webp',
  '/assets/gallery-previews/alien-soyjak.webp',
  '/assets/gallery-previews/alien-waifu.webp',
  '/assets/gallery-previews/baddie.webp',
  '/assets/gallery-previews/soyjak.webp',
  '/assets/gallery-previews/waifu.webp',
  '/assets/gallery-previews/wojak.webp',
];

// More spread out positions - right side adjusted inward
const NFT_POSITIONS = [
  { id: 1, x: '3%', y: '8%', duration: 12, xDrift: 15 },
  { id: 2, x: '82%', y: '5%', duration: 14, xDrift: -20 },
  { id: 3, x: '78%', y: '72%', duration: 11, xDrift: -15 },
  { id: 4, x: '5%', y: '68%', duration: 13, xDrift: 20 },
  { id: 5, x: '2%', y: '38%', duration: 10, xDrift: 25 },
  { id: 6, x: '80%', y: '40%', duration: 15, xDrift: -18 },
];

function getRandomImage(exclude: Set<string>): string {
  const available = HERO_IMAGES.filter(img => !exclude.has(img));
  if (available.length === 0) {
    return HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

function getInitialImages(): string[] {
  const images: string[] = [];
  const used = new Set<string>();
  for (let i = 0; i < NFT_POSITIONS.length; i++) {
    const img = getRandomImage(used);
    images.push(img);
    used.add(img);
  }
  return images;
}

interface NFTPosition {
  id: number;
  x: string;
  y: string;
  duration: number;
  xDrift: number;
}

interface FloatingNFTProps {
  position: NFTPosition;
  image: string;
  reducedMotion: boolean | null;
}

const FloatingNFT: React.FC<FloatingNFTProps> = ({
  position,
  image,
  reducedMotion,
}) => {
  return (
    <motion.div
      className="floating-nft"
      style={{ left: position.x, top: position.y }}
      initial={{ opacity: 0.7 }}
      animate={
        !reducedMotion
          ? {
              y: [0, -15, 0],
              x: [0, position.xDrift * 0.5, 0],
            }
          : {}
      }
      transition={{
        duration: position.duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <div className="floating-nft-inner">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={image}
            src={image}
            alt="Floating Wojak NFT artwork"
            loading="eager"
            decoding="async"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{
              duration: 1.2,
              ease: 'easeInOut',
            }}
          />
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export const FloatingNFTs: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const [images, setImages] = useState<string[]>(getInitialImages);

  // Rotate images when animation cycles complete
  // Each NFT changes at its own rhythm based on its duration
  useEffect(() => {
    if (prefersReducedMotion) return;

    // Create separate intervals for each NFT based on its animation duration
    const intervals = NFT_POSITIONS.map((pos, index) => {
      return setInterval(() => {
        setImages(prev => {
          const newImages = [...prev];
          const currentSet = new Set(newImages);
          newImages[index] = getRandomImage(currentSet);
          return newImages;
        });
      }, pos.duration * 1000); // Change image at the end of each full cycle
    });

    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [prefersReducedMotion]);

  return (
    <>
      {NFT_POSITIONS.map((pos, index) => (
        <FloatingNFT
          key={pos.id}
          position={pos}
          image={images[index]}
          reducedMotion={prefersReducedMotion}
        />
      ))}
    </>
  );
};

export default FloatingNFTs;
