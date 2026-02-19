/**
 * Game Card Component
 *
 * Individual game card with rank-based visual effects.
 * UPDATED: Added voting support with VoteCounter
 */

import { memo, useMemo, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { MiniGame } from '@/types/media';
import { getRankEffects } from '@/config/games';

interface GameCardProps {
  game: MiniGame;
  index: number;
  totalGames: number;
  onClick: () => void;
  // Voting props (optional)
  flickModeActive?: 'donut' | 'poop' | null;
  onFlick?: (gameId: string, clickX: number, clickY: number, cardRect: DOMRect) => void;
}

export const GameCard = memo(function GameCard({
  game,
  index,
  totalGames,
  onClick,
  flickModeActive,
  onFlick,
}: GameCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);

  const effects = useMemo(() => getRankEffects(index, totalGames), [index, totalGames]);

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const cardStyle = {
    background: '#000000',
    border: '1px solid var(--color-border)',
    outline: isHovered ? `${effects.borderWidth}px solid ${effects.color}` : 'none',
    outlineOffset: '-1px',
    boxShadow: isHovered
      ? `0 0 ${effects.glowRadius}px ${hexToRgba(effects.color, effects.glowOpacity)}`
      : 'none',
    backdropFilter: 'none',
  };

  // Handle click - either flick emoji or open game
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    // Don't allow clicks on disabled games
    if (game.disabled) return;

    if (flickModeActive && onFlick) {
      // Flick mode: send emoji to click position
      const rect = e.currentTarget.getBoundingClientRect();
      onFlick(game.id, e.clientX, e.clientY, rect);
    } else {
      // Normal mode: open game
      onClick();
    }
  }, [flickModeActive, onFlick, onClick, game.id, game.disabled]);

  // Disabled game styling
  const isDisabled = game.disabled;
  const disabledStyle = isDisabled ? {
    filter: 'grayscale(100%)',
    opacity: 0.5,
    cursor: 'not-allowed',
  } : {};

  return (
    <motion.button
      className="relative flex flex-col items-center p-5 sm:p-4 rounded-xl text-center hover-lift glow-section"
      style={{ ...cardStyle, ...disabledStyle, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
      data-vote-target={game.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDisabled ? 0.5 : 1, y: 0 }}
      whileHover={prefersReducedMotion || isDisabled ? undefined : { scale: effects.hoverScale }}
      whileTap={prefersReducedMotion || isDisabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      onMouseEnter={() => !isDisabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isDisabled}
    >
      {/* Rank badge for top 3 */}
      {effects.badge && game.status === 'available' && (
        <div
          className="absolute -top-2 -left-2 text-2xl sm:text-xl pointer-events-none"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))', zIndex: 10 }}
          title={`Ranked ${effects.badge.label}`}
        >
          {effects.badge.emoji}
        </div>
      )}

      {/* Emoji icon */}
      <div className="text-6xl sm:text-5xl mb-4 sm:mb-3 pointer-events-none">{game.emoji}</div>

      {/* Name */}
      <h3 className="text-lg sm:text-base font-semibold pointer-events-none text-primary">
        {game.name}
      </h3>

      {/* Status badge */}
      {game.status === 'coming-soon' && (
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium pointer-events-none"
          style={{ background: 'var(--color-primary)', color: 'white' }}
        >
          Coming Soon
        </div>
      )}

      {game.status === 'maintenance' && (
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium pointer-events-none"
          style={{ background: 'var(--color-warning)', color: 'black' }}
        >
          Maintenance
        </div>
      )}

      {/* Disabled badge */}
      {isDisabled && (
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium pointer-events-none"
          style={{ background: 'rgba(100, 100, 100, 0.8)', color: 'white' }}
        >
          Coming Soon
        </div>
      )}
    </motion.button>
  );
});

export default GameCard;
