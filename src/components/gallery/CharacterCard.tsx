/**
 * CharacterCard Component
 *
 * Individual character type card with image, name, and count.
 * Features glassmorphism and hover glow effects.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { CharacterTypeConfig } from '@/types/nft';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useHaptic } from '@/hooks/useHaptic';

interface CharacterCardProps {
  character: CharacterTypeConfig;
  isSelected: boolean;
  onSelect: () => void;
  priority?: boolean;
  onHover?: () => void; // For preloading NFTs on hover
  index?: number; // For staggered animation
}

export function CharacterCard({
  character,
  isSelected,
  onSelect,
  priority = false,
  onHover,
  index = 0,
}: CharacterCardProps) {
  void index; // Reserved for staggered animation
  const prefersReducedMotion = usePrefersReducedMotion();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const haptic = useHaptic();

  // Get accent color or default
  const accentColor = character.accentColor || '#F97316';

  // Handle tap with haptic feedback
  const handleTap = () => {
    haptic.tap();
    onSelect();
  };

  // Premium hover animation with lift and glow
  const hoverAnimation = prefersReducedMotion
    ? { scale: 1 }
    : {
        y: -8,
        scale: 1.02,
        transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
      };

  // Tap animation with visual feedback
  const tapAnimation = prefersReducedMotion
    ? { scale: 1 }
    : {
        scale: 0.98,
        transition: { duration: 0.1 },
      };

  return (
    <motion.button
      className="character-card glass hover-lift glow-section w-full block text-left rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 aspect-square"
      style={{
        // Glassmorphism background
        background: `linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(0, 0, 0, 0.4) 100%)`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: isSelected
          ? `2px solid ${accentColor}`
          : '1px solid rgba(249, 115, 22, 0.2)',
        boxShadow: isSelected
          ? `0 0 30px ${accentColor}60, inset 0 0 20px rgba(249, 115, 22, 0.1)`
          : 'none',
        padding: 0,
        margin: 0,
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
      onClick={handleTap}
      onMouseEnter={onHover}
      whileHover={hoverAnimation}
      whileTap={tapAnimation}
      role="button"
      tabIndex={0}
      aria-label={`View ${character.name} NFTs, ${character.count} available`}
      aria-pressed={isSelected}
    >
      {/* Image container - square aspect ratio */}
      <div className="relative w-full h-full overflow-hidden rounded-xl">
        {/* Blur placeholder / loading state */}
        {!imageLoaded && !imageError && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{
              background: 'var(--color-glass-bg)',
            }}
          />
        )}

        {/* Character preview image */}
        {!imageError ? (
          <img
            src={character.previewImage}
            alt={character.name}
            className={`w-full h-full object-cover rounded-xl transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading={priority ? 'eager' : 'lazy'}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
          />
        ) : (
          // Fallback placeholder
          <div
            className="absolute inset-0 flex items-center justify-center text-6xl"
            style={{ background: 'var(--color-glass-bg)' }}
          >
            🎭
          </div>
        )}

        {/* Name overlay - bottom left with text shadow */}
        <div className="absolute bottom-1.5 left-1.5 right-1.5">
          <span
            className="relative text-xs font-bold character-name block"
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
          className="character-card-glow absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300"
          style={{
            boxShadow: 'inset 0 0 30px rgba(249, 115, 22, 0.2)',
            borderRadius: 'inherit',
          }}
        />
      </div>
    </motion.button>
  );
}

export default CharacterCard;
