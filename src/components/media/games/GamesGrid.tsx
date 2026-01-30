/**
 * Games Grid Component
 *
 * Responsive grid of game cards.
 * UPDATED: Added voting props support
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { MiniGame } from '@/types/media';
import { GameCard } from './GameCard';
import { gameGridVariants } from '@/config/mediaAnimations';

interface GamesGridProps {
  games: MiniGame[];
  onGameSelect: (game: MiniGame) => void;
  isLoading?: boolean;
  // Voting props (optional for backward compatibility)
  flickModeActive?: 'donut' | 'poop' | null;
  onFlick?: (gameId: string, clickX: number, clickY: number, cardRect: DOMRect) => void;
}

function GameCardSkeleton() {
  return (
    <div
      className="rounded-xl overflow-hidden animate-pulse"
      style={{
        background: 'var(--color-glass-bg)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="aspect-video" style={{ background: 'var(--color-border)' }} />
      <div className="p-3 space-y-2">
        <div className="h-4 rounded" style={{ background: 'var(--color-border)', width: '70%' }} />
        <div className="h-3 rounded" style={{ background: 'var(--color-border)', width: '50%' }} />
      </div>
    </div>
  );
}

export function GamesGrid({
  games,
  onGameSelect,
  isLoading = false,
  flickModeActive,
  onFlick,
}: GamesGridProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="pb-2">
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6"
          variants={prefersReducedMotion ? undefined : gameGridVariants}
          initial="initial"
          animate="animate"
        >
          {games.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              index={index}
              totalGames={games.length}
              onClick={() => onGameSelect(game)}
              flickModeActive={flickModeActive}
              onFlick={onFlick}
            />
          ))}
        </motion.div>
      )}

      {!isLoading && games.length === 0 && (
        <div
          className="p-8 rounded-xl text-center"
          style={{ background: 'var(--color-glass-bg)', border: '1px solid var(--color-border)' }}
        >
          <span className="text-5xl block mb-4 opacity-30">🎮</span>
          <p style={{ color: 'var(--color-text-muted)' }}>No games available yet</p>
        </div>
      )}
    </div>
  );
}

export default GamesGrid;
