/**
 * Sticky Mini Preview Component
 *
 * Floating preview for mobile when scrolling past the main preview.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useGenerator } from '@/contexts/GeneratorContext';
import { isSelectionPathEmpty } from '@/types/generator';
import { stickyPreviewVariants } from '@/config/generatorAnimations';

interface StickyMiniPreviewProps {
  triggerOffset?: number;
  className?: string;
}

export function StickyMiniPreview({
  triggerOffset = 300,
  className = '',
}: StickyMiniPreviewProps) {
  const {
    previewImage,
    selectedLayers,
    showStickyPreview,
    setStickyPreview,
    setScrollPosition,
  } = useGenerator();
  const prefersReducedMotion = useReducedMotion();
  const basePath = selectedLayers.Base;
  const hasSelection = !isSelectionPathEmpty(basePath);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      const position = window.scrollY;
      setScrollPosition(position);
      setStickyPreview(position > triggerOffset && hasSelection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [triggerOffset, hasSelection, setStickyPreview, setScrollPosition]);

  // Scroll to top when clicking preview
  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {showStickyPreview && previewImage && (
        <motion.div
          className={`fixed left-4 z-40 rounded-xl overflow-hidden cursor-pointer ${className}`}
          style={{
            top: 70,
            width: 140,
            height: 200,
            background: 'var(--color-glass-bg)',
            border: '2px solid var(--color-primary)',
          }}
          variants={prefersReducedMotion ? undefined : stickyPreviewVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleClick}
          role="button"
          aria-label="Scroll to preview"
          title="Tap to scroll to preview"
        >
          <img
            src={previewImage}
            alt="Mini preview"
            className="w-full h-full object-cover"
            style={{ objectPosition: '55% center' }}
          />

          {/* Pulse ring */}
          <div
            className="absolute inset-0 rounded-xl animate-ping pointer-events-none"
            style={{
              border: '2px solid var(--color-primary)',
              opacity: 0.3,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default StickyMiniPreview;
