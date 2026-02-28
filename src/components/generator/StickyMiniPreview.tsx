/**
 * Sticky Mini Preview Component
 *
 * Floating preview for mobile when scrolling past the main preview.
 * Uses scrollContainerRef when provided (e.g. generator page scroll wrapper), otherwise window.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useGenerator } from '@/contexts/GeneratorContext';
import { isSelectionPathEmpty } from '@/types/generator';
import { stickyPreviewVariants } from '@/config/generatorAnimations';

interface StickyMiniPreviewProps {
  triggerOffset?: number;
  className?: string;
  /** When provided (e.g. generator mobile scroll wrapper), use this element's scrollTop instead of window.scrollY */
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function StickyMiniPreview({
  triggerOffset = 300,
  className = '',
  scrollContainerRef,
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

  // Track scroll position (from scroll container or window)
  useEffect(() => {
    const el = scrollContainerRef?.current ?? null;

    const handleScroll = () => {
      const position = el ? el.scrollTop : window.scrollY;
      setScrollPosition(position);
      setStickyPreview(position > triggerOffset && hasSelection);
    };

    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      return () => el.removeEventListener('scroll', handleScroll);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [triggerOffset, hasSelection, setStickyPreview, setScrollPosition, scrollContainerRef]);

  // Scroll to top when clicking preview (scroll container or window)
  const handleClick = () => {
    const el = scrollContainerRef?.current;
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
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
            background: 'var(--color-surface)',
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
            crossOrigin="anonymous"
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
