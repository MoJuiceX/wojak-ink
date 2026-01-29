/**
 * Game UI System
 *
 * Shared mobile game UI components and hooks.
 *
 * Usage:
 *   import { useGameViewport, MobileHUD, GameContainer } from '@/systems/game-ui';
 *   import '@/systems/game-ui/mobile-game-ui.css';
 */

// Hooks
export { useGameViewport } from './hooks/useGameViewport';
export type { ViewportInfo } from './hooks/useGameViewport';

// Components
export { MobileHUD } from './components/MobileHUD';
export type { HUDStat } from './components/MobileHUD';

export { GameContainer } from './components/GameContainer';
export type { GameState } from './components/GameContainer';

export { GameShell } from './GameShell';
export type { GameShellProps } from './GameShell';
