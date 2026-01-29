/**
 * GameCanvas Component
 * Main game component that ties together the game loop, input, and audio
 *
 * @example
 * <GameCanvas
 *   onGameOver={(score) => console.log('Game over!', score)}
 *   onScoreChange={(score) => setScore(score)}
 * />
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGameLoop, useAudio, useInput } from '../hooks';
import { GAME_CONFIG, COLORS, DEBUG, SCORING } from '../config';
import { setupHiDPICanvas, clearCanvas } from '@/lib/canvas';
import {
  createParticleSystem,
  updateParticles,
  drawParticles,
  spawnBurstParticles,
  PARTICLE_PRESETS,
} from '@/lib/juice';
import type { GameState, ParticleSystem } from '../types';

// ============================================
// TYPES
// ============================================

interface GameCanvasProps {
  onGameOver?: (score: number) => void;
  onScoreChange?: (score: number) => void;
  onStateChange?: (state: GameState['status']) => void;
}

// ============================================
// COMPONENT
// ============================================

export const GameCanvas: React.FC<GameCanvasProps> = ({
  onGameOver,
  onScoreChange,
  onStateChange,
}) => {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ParticleSystem>(createParticleSystem());

  // State
  const [gameState, setGameState] = useState<GameState>({
    status: 'menu',
    score: 0,
    highScore: 0,
    combo: 0,
    multiplier: 1,
  });

  // Hooks
  const { initAudio, playSound, isInitialized: audioInitialized } = useAudio();
  const { justPressed, clearJustPressed, isTouchDevice } = useInput(canvasRef);

  // ==========================================
  // GAME LOGIC
  // ==========================================

  // Start game
  const startGame = useCallback(() => {
    if (!audioInitialized) {
      initAudio();
    }

    setGameState((prev) => ({
      ...prev,
      status: 'playing',
      score: 0,
      combo: 0,
      multiplier: 1,
    }));

    playSound('tap', { haptic: 'tap' });
    onStateChange?.('playing');
  }, [audioInitialized, initAudio, playSound, onStateChange]);

  // Handle player action
  const handleAction = useCallback(() => {
    if (gameState.status !== 'playing') return;

    // Example: increment score on action
    const newScore = gameState.score + SCORING.points.basicAction * gameState.multiplier;

    // Check for milestone
    const milestone = SCORING.isMilestone(gameState.score, newScore);
    if (milestone) {
      playSound('milestone', { haptic: 'success' });

      // Spawn celebration particles
      const canvas = canvasRef.current;
      if (canvas) {
        spawnBurstParticles(
          particlesRef.current,
          canvas.width / 2,
          canvas.height / 2,
          PARTICLE_PRESETS.confetti
        );
      }
    } else {
      playSound('tap', { haptic: 'tap' });
    }

    setGameState((prev) => ({
      ...prev,
      score: newScore,
    }));

    onScoreChange?.(newScore);
  }, [gameState.status, gameState.score, gameState.multiplier, playSound, onScoreChange]);

  // Game over (example - call this when player loses)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const gameOver = useCallback(() => {
    playSound('fail', { haptic: 'heavy' });

    setGameState((prev) => ({
      ...prev,
      status: 'gameover',
      highScore: Math.max(prev.highScore, prev.score),
    }));

    onGameOver?.(gameState.score);
    onStateChange?.('gameover');
  }, [playSound, gameState.score, onGameOver, onStateChange]);

  // ==========================================
  // UPDATE LOOP
  // ==========================================

  const update = useCallback(
    (deltaTime: number) => {
      // Handle input
      if (justPressed('action') || justPressed('touch')) {
        if (gameState.status === 'menu' || gameState.status === 'gameover') {
          startGame();
        } else if (gameState.status === 'playing') {
          handleAction();
        }
      }

      if (justPressed('pause') && gameState.status === 'playing') {
        setGameState((prev) => ({ ...prev, status: 'paused' }));
        onStateChange?.('paused');
      }

      // Update particles
      updateParticles(particlesRef.current, deltaTime);

      // Clear just pressed flags
      clearJustPressed();
    },
    [justPressed, gameState.status, startGame, handleAction, clearJustPressed, onStateChange]
  );

  // ==========================================
  // RENDER LOOP
  // ==========================================

  const render = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (ctx: CanvasRenderingContext2D, interpolation: number) => {
      const { width, height } = ctx.canvas;

      // Clear
      clearCanvas(ctx, COLORS.ui.background);

      // Draw game objects based on state
      if (gameState.status === 'playing') {
        // Draw game world here

        // Draw particles
        drawParticles(ctx, particlesRef.current);

        // Draw score
        ctx.fillStyle = COLORS.ui.text;
        ctx.font = 'bold 48px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(String(gameState.score), width / 2, 80);
      } else if (gameState.status === 'menu') {
        // Draw menu
        ctx.fillStyle = COLORS.ui.text;
        ctx.font = 'bold 32px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(GAME_CONFIG.name, width / 2, height / 2 - 40);

        ctx.font = '20px system-ui';
        ctx.fillStyle = COLORS.ui.textMuted;
        ctx.fillText(
          isTouchDevice ? 'Tap to Start' : 'Press Space to Start',
          width / 2,
          height / 2 + 20
        );
      } else if (gameState.status === 'gameover') {
        // Draw game over
        ctx.fillStyle = COLORS.ui.text;
        ctx.font = 'bold 36px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', width / 2, height / 2 - 60);

        ctx.font = 'bold 48px system-ui';
        ctx.fillText(String(gameState.score), width / 2, height / 2);

        if (gameState.score >= gameState.highScore) {
          ctx.fillStyle = COLORS.game.collectible;
          ctx.font = '20px system-ui';
          ctx.fillText('New High Score!', width / 2, height / 2 + 40);
        }

        ctx.fillStyle = COLORS.ui.textMuted;
        ctx.font = '18px system-ui';
        ctx.fillText(
          isTouchDevice ? 'Tap to Restart' : 'Press Space to Restart',
          width / 2,
          height / 2 + 80
        );
      }

      // Debug info
      if (DEBUG.enabled && DEBUG.showFPS) {
        ctx.fillStyle = COLORS.ui.textMuted;
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`State: ${gameState.status}`, 10, 20);
      }
    },
    [gameState, isTouchDevice]
  );

  // ==========================================
  // GAME LOOP
  // ==========================================

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { start, stop, isRunning } = useGameLoop({
    update,
    render,
    canvasRef,
    targetFPS: GAME_CONFIG.timing.targetFPS,
    fixedTimeStep: GAME_CONFIG.timing.fixedTimeStep,
  });

  // Start loop on mount
  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  // ==========================================
  // CANVAS SETUP
  // ==========================================

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set up high-DPI canvas
    setupHiDPICanvas(canvas, GAME_CONFIG.canvas.width, GAME_CONFIG.canvas.height);

    // Prevent context menu on right-click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }, []);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <canvas
      ref={canvasRef}
      width={GAME_CONFIG.canvas.width}
      height={GAME_CONFIG.canvas.height}
      style={{
        width: '100%',
        maxWidth: GAME_CONFIG.canvas.width,
        height: 'auto',
        touchAction: 'none',
        userSelect: 'none',
      }}
    />
  );
};

export default GameCanvas;
