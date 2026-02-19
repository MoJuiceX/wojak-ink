/**
 * DesktopCharacterCard Component
 *
 * Enhanced character card for desktop with premium cyberpunk effects:
 * - Glassmorphism background
 * - Glowing border on hover
 * - Gradient text for names
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { CharacterTypeConfig } from '@/types/nft';
import { DESKTOP_LAYOUT } from '@/config/desktopLayout';
import { DESKTOP_ANIMATIONS } from '@/config/desktopAnimations';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

interface DesktopCharacterCardProps {
  character: CharacterTypeConfig;
  onSelect: () => void;
  priority?: boolean;
  onHover?: () => void; // For preloading NFTs
}

export function DesktopCharacterCard({
  character,
  onSelect,
  priority = false,
  onHover,
}: DesktopCharacterCardProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isHovered, setIsHovered] = useState(false);

  const { cardHover } = DESKTOP_ANIMATIONS;
  const { card, cardHover: hoverConfig } = DESKTOP_LAYOUT;

  // Animation variants
  const cardVariants = prefersReducedMotion
    ? undefined
    : {
        rest: {
          y: 0,
          boxShadow: hoverConfig.shadow.default,
        },
        hover: {
          y: hoverConfig.liftY,
          boxShadow: hoverConfig.shadow.hover,
          transition: cardHover.lift.transition,
        },
        tap: {
          y: hoverConfig.liftYPressed,
          scale: hoverConfig.pressedScale,
          transition: { duration: 0.1 },
        },
      };

  const imageVariants = prefersReducedMotion
    ? undefined
    : {
        rest: { scale: 1 },
        hover: {
          scale: hoverConfig.imageScale,
          transition: cardHover.imageScale.transition,
        },
      };

  return (
    <motion.button
      className="character-card glass hover-lift glow-section w-full text-left overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
      style={{
        // Glassmorphism background
        background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(0, 0, 0, 0.4) 100%)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: isHovered
          ? '1px solid rgba(249, 115, 22, 0.6)'
          : '1px solid rgba(249, 115, 22, 0.2)',
        borderRadius: card.borderRadius,
        // Glow effect on hover
        boxShadow: isHovered
          ? '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(249, 115, 22, 0.3), inset 0 0 20px rgba(249, 115, 22, 0.1)'
          : 'none',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        // Focus ring styles
        outlineColor: 'var(--color-primary)',
        outlineOffset: 4,
      }}
      variants={cardVariants}
      initial="rest"
      animate={isHovered ? 'hover' : 'rest'}
      whileTap="tap"
      onHoverStart={() => {
        setIsHovered(true);
        onHover?.();
      }}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onSelect}
    >
      {/* Image container - square aspect ratio */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: '1 / 1',
          borderRadius: card.borderRadius,
        }}
      >
        <motion.img
          src={character.previewImage}
          alt={character.name}
          className="w-full h-full object-cover"
          variants={imageVariants}
          loading={priority ? 'eager' : 'lazy'}
          draggable={false}
        />

        {/* Name overlay - bottom left with text shadow */}
        <div className="absolute bottom-2 left-2 right-2">
          <span
            className="relative text-sm font-bold"
            style={{
              color: '#ffffff',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.9), 0 0 8px rgba(0, 0, 0, 0.8)',
              lineHeight: 1.2,
            }}
          >
            {character.name}
          </span>
        </div>

        {/* Hover glow overlay */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            boxShadow: 'inset 0 0 30px rgba(249, 115, 22, 0.2)',
            borderRadius: 'inherit',
            opacity: isHovered ? 1 : 0,
          }}
        />
      </div>
    </motion.button>
  );
}

export default DesktopCharacterCard;
