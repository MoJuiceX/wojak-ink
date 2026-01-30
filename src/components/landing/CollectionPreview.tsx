/**
 * Collection Preview - Gallery Section
 *
 * Features:
 * - Banner image (Wojak Farmers Plot artwork)
 * - Collection stats with real numbers
 * - Floating NFT previews with rotation
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// Different images from hero section - use Bepe variants and other unique ones
const COLLECTION_IMAGES = [
  '/assets/gallery-previews/bepe-baddie.png',
  '/assets/gallery-previews/monkey-zoo.png',
  '/assets/gallery-previews/papa-tang.png',
  '/assets/gallery-previews/bepe-waifu.png',
  '/assets/gallery-previews/bepe-soyjak.png',
  '/assets/gallery-previews/bepe-wojak.png',
];

// Collection stats
const COLLECTION_STATS = {
  baseCharacters: 14,
  totalTraits: 179,
};

function getCollectionImages(): string[] {
  // Start with specific images that differ from hero section
  return [
    COLLECTION_IMAGES[0],
    COLLECTION_IMAGES[1],
    COLLECTION_IMAGES[2],
  ];
}

export const CollectionPreview: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const [previewImages, setPreviewImages] = useState<string[]>(getCollectionImages);

  // Rotate preview images within the collection set
  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      setPreviewImages(prev => {
        const newImages = [...prev];
        const randomIndex = Math.floor(Math.random() * 3);
        const currentSet = new Set(newImages);
        const available = COLLECTION_IMAGES.filter(img => !currentSet.has(img));
        if (available.length > 0) {
          newImages[randomIndex] = available[Math.floor(Math.random() * available.length)];
        }
        return newImages;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  return (
    <div className="collection-preview">
      {/* Banner Image */}
      <motion.div
        className="collection-banner"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <img
          src="/assets/banners/gallery-banner.webp"
          alt="Wojak Farmers Plot Collection"
          loading="lazy"
        />
      </motion.div>

      {/* Floating NFT Previews */}
      <div className="collection-nft-previews">
        {previewImages.map((src, index) => (
          <motion.div
            key={index}
            className="preview-nft-card"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.15, duration: 0.5 }}
            animate={
              !prefersReducedMotion
                ? {
                    y: [0, -10, 0],
                    rotate: index === 1 ? [0, 0, 0] : [-2, 2, -2],
                  }
                : {}
            }
            whileHover={{ scale: 1.05, zIndex: 10 }}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={src}
                src={src}
                alt="Wojak NFT collection preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              />
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Collection Stats */}
      <motion.div
        className="collection-stats"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
      >
        <p className="stats-headline">
          <span className="stat-number">{COLLECTION_STATS.baseCharacters}</span> base characters
          <span className="stat-divider">•</span>
          <span className="stat-number">{COLLECTION_STATS.totalTraits}</span> unique traits
        </p>
        <p className="stats-tagline">Each NFT is a unique piece of art</p>
      </motion.div>
    </div>
  );
};

export default CollectionPreview;
