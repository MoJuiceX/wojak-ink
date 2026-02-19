/**
 * CharacterGrid Component
 *
 * Grid display of all character types.
 * Responsive: 2 columns mobile, 3 tablet, 4-5 desktop.
 * Features staggered spring animations for premium entry effect.
 */

import { motion } from 'framer-motion';
import type { CharacterTypeConfig, CharacterType } from '@/types/nft';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { CharacterCard } from './CharacterCard';

// Premium staggered entry animation
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 40,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

interface CharacterGridProps {
  characters: CharacterTypeConfig[];
  onSelectCharacter: (character: CharacterType) => void;
  selectedCharacter?: CharacterType | null;
  isLoading?: boolean;
  onCharacterHover?: (character: CharacterType) => void; // For preloading NFTs
}

function CharacterCardSkeleton() {
  return (
    <div
      className="w-full rounded-xl overflow-hidden animate-pulse aspect-square"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    />
  );
}

export function CharacterGrid({
  characters,
  onSelectCharacter,
  selectedCharacter,
  isLoading = false,
  onCharacterHover,
}: CharacterGridProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-[3vw] gap-y-[3vw] sm:gap-3 md:gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <CharacterCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-[3vw] gap-y-[3vw] sm:gap-3 md:gap-4"
      variants={prefersReducedMotion ? undefined : containerVariants}
      initial="hidden"
      animate="visible"
    >
      {characters.map((character, index) => (
        <motion.div
          key={character.id}
          variants={prefersReducedMotion ? undefined : cardVariants}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.05, y: -10 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
          style={{ '--card-index': index } as React.CSSProperties}
        >
          <CharacterCard
            character={character}
            isSelected={selectedCharacter === character.id}
            onSelect={() => onSelectCharacter(character.id)}
            priority={index < 6} // Eager load first 6 (above fold)
            onHover={onCharacterHover ? () => onCharacterHover(character.id) : undefined}
            index={index} // Pass index for staggered float animation
          />
        </motion.div>
      ))}
      {/* Info box with matching glassmorphism */}
      <motion.div
        variants={prefersReducedMotion ? undefined : cardVariants}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
      >
        <div
          className="w-full h-full flex flex-col items-center justify-center p-4 text-center rounded-xl"
          style={{
            aspectRatio: '1 / 1',
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(0, 0, 0, 0.4) 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(249, 115, 22, 0.2)',
          }}
        >
          <h3
            className="text-sm font-semibold mb-1"
            style={{
              background: 'linear-gradient(90deg, #F97316, #FFD700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Explore the Collection
          </h3>
          <p
            className="text-xs leading-relaxed"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Pick a character to explore all their variations. Sort by ID, rank, or price to find what you were always dreaming of.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default CharacterGrid;
