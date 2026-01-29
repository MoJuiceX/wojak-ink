import React from 'react';
import type { ReactNode } from 'react';
import { EffectsProvider, EffectsLayer } from '../effects';
import './game-ui.css';

export interface GameShellProps {
  children: ReactNode;
  gameId: string;
  className?: string;
}

/**
 * GameShell wraps every game with:
 * - Effects system
 * - Common styling
 * - Accessibility attributes
 */
export const GameShell: React.FC<GameShellProps> = ({
  children,
  gameId,
  className = ''
}) => {
  return (
    <EffectsProvider>
      <div
        className={`game-shell game-shell-${gameId} ${className}`}
        data-game-id={gameId}
        role="application"
        aria-label={`${gameId} game`}
      >
        {children}
        <EffectsLayer />
      </div>
    </EffectsProvider>
  );
};
