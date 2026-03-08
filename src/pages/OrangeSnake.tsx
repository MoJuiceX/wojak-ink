/**
 * Orange Snake Game
 *
 * A Slither.io style snake game with smooth continuous movement.
 * Player snake follows mouse/finger, competing against AI snakes.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useGameHaptics } from '@/systems/haptics';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useGameEffects, GameEffects } from '@/components/media';
import { useGameNavigationGuard } from '@/hooks/useGameNavigationGuard';
import { safeStorage } from '@/utils/safeStorage';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { GameSEO } from '@/components/seo/GameSEO';
import { ArcadeGameOverScreen } from '@/components/media/games/ArcadeGameOverScreen';
import './OrangeSnake.css';

// ============================================
// TYPES
// ============================================

interface Point {
  x: number;
  y: number;
}

interface Segment extends Point {
  radius: number;
}

interface Snake {
  id: string;
  segments: Segment[];
  color: string;
  glowColor: string;
  speed: number;
  direction: Point;
  isPlayer: boolean;
  targetFood: Point | null;
  isDead: boolean;
  isGrowing: boolean;
}

interface Food extends Point {
  id: string;
  radius: number;
}

type GameState = 'idle' | 'playing' | 'gameover';

// ============================================
// CONSTANTS
// ============================================

const SNAKE_SPEED = 2.5;
const TURN_RATE = 0.12;
const SEGMENT_SPACING = 6;
const HEAD_RADIUS = 12;
const TAIL_RADIUS = 5;
const STARTING_LENGTH = 12;
const FOOD_RADIUS = 5;
const MIN_FOOD = 35;
const AI_COUNT = 6;

const SNAKE_COLORS = [
  { color: '#FF6B00', glow: '#FF8C33' }, // Player (orange)
  { color: '#4CAF50', glow: '#81C784' }, // Green
  { color: '#2196F3', glow: '#64B5F6' }, // Blue
  { color: '#9C27B0', glow: '#BA68C8' }, // Purple
  { color: '#F44336', glow: '#E57373' }, // Red
  { color: '#00BCD4', glow: '#4DD0E1' }, // Cyan
  { color: '#FFEB3B', glow: '#FFF176' }, // Yellow
  { color: '#E91E63', glow: '#F06292' }, // Pink
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const createSnake = (
  id: string,
  x: number,
  y: number,
  colorIndex: number,
  isPlayer: boolean
): Snake => {
  const segments: Segment[] = [];
  const angle = Math.random() * Math.PI * 2;

  for (let i = 0; i < STARTING_LENGTH; i++) {
    const t = i / (STARTING_LENGTH - 1);
    segments.push({
      x: x - Math.cos(angle) * i * SEGMENT_SPACING,
      y: y - Math.sin(angle) * i * SEGMENT_SPACING,
      radius: HEAD_RADIUS - (HEAD_RADIUS - TAIL_RADIUS) * t,
    });
  }

  return {
    id,
    segments,
    color: SNAKE_COLORS[colorIndex].color,
    glowColor: SNAKE_COLORS[colorIndex].glow,
    speed: isPlayer ? SNAKE_SPEED : SNAKE_SPEED * (0.8 + Math.random() * 0.3),
    direction: { x: Math.cos(angle), y: Math.sin(angle) },
    isPlayer,
    targetFood: null,
    isDead: false,
    isGrowing: false,
  };
};

const spawnFood = (count: number, width: number, height: number): Food[] => {
  const food: Food[] = [];
  const margin = 40;

  for (let i = 0; i < count; i++) {
    food.push({
      id: `food-${Date.now()}-${Math.random()}`,
      x: margin + Math.random() * (width - margin * 2),
      y: margin + Math.random() * (height - margin * 2),
      radius: FOOD_RADIUS,
    });
  }

  return food;
};

const checkCircleCollision = (
  p1: Point,
  r1: number,
  p2: Point,
  r2: number
): boolean => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < r1 + r2;
};

// ============================================
// MAIN COMPONENT
// ============================================

const OrangeSnake: React.FC = () => {
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { playBlockLand, playPerfectBonus, playCombo, playGameOver, playGameStart } =
    useGameSounds();
  const { hapticScore, hapticCombo, hapticHighScore, hapticGameOver, hapticButton } =
    useGameHaptics();
  const {
    effects,
    triggerBigMoment,
    triggerConfetti,
    showEpicCallout,
    triggerScreenShake,
    resetAllEffects,
  } = useGameEffects();
  const {
    leaderboard: globalLeaderboard,
    submitScore,
    isSignedIn,
    userDisplayName,
    isSubmitting,
  } = useLeaderboard('orange-snake');

  // React state for UI (moved before useGameNavigationGuard to avoid initialization order issue)
  const [gameState, setGameState] = useState<GameState>('idle');

  // Navigation guard - prevents accidental exits during gameplay
  const { showExitDialog, confirmExit, cancelExit } = useGameNavigationGuard({
    isPlaying: gameState === 'playing',
  });

  // Mobile fullscreen mode - hide header during gameplay
  useEffect(() => {
    if (isMobile && gameState === 'playing') {
      document.body.classList.add('game-fullscreen-mode');
    } else {
      document.body.classList.remove('game-fullscreen-mode');
    }
    return () => {
      document.body.classList.remove('game-fullscreen-mode');
    };
  }, [isMobile, gameState]);

  // Ref for game loop to check dialog state
  const showExitDialogRef = useRef(false);
  useEffect(() => {
    showExitDialogRef.current = showExitDialog;
  }, [showExitDialog]);

  // Canvas dimensions
  const CANVAS_WIDTH = isMobile ? Math.min(window.innerWidth, 500) : 600;
  const CANVAS_HEIGHT = isMobile ? Math.min(window.innerHeight - 140, 700) : 500;

  // Game state ref (for game loop)
  const gameStateRef = useRef<{
    playerSnake: Snake;
    aiSnakes: Snake[];
    food: Food[];
    gameStatus: GameState;
    mousePosition: Point;
    gameTime: number;
    killCount: number;
  }>({
    playerSnake: createSnake('player', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0, true),
    aiSnakes: [],
    food: [],
    gameStatus: 'idle',
    mousePosition: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    gameTime: 0,
    killCount: 0,
  });

  // React state for UI
  const [score, setScore] = useState(STARTING_LENGTH);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(safeStorage.getItem('orangeSnakeHighScore') || '0', 10);
  });
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return safeStorage.getItem('orangeSnakeSoundEnabled') !== 'false';
  });

  const gameStartTimeRef = useRef<number>(0);
  const animationRef = useRef<number>(0);

  // Toggle sound
  const toggleSound = useCallback(() => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    safeStorage.setItem('orangeSnakeSoundEnabled', String(newState));
    hapticButton();
  }, [soundEnabled, hapticButton]);

  // ============================================
  // SNAKE MOVEMENT
  // ============================================

  const updateSnakeDirection = useCallback(
    (snake: Snake, targetX: number, targetY: number) => {
      const head = snake.segments[0];
      const dx = targetX - head.x;
      const dy = targetY - head.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 5) return;

      const targetDir = {
        x: dx / distance,
        y: dy / distance,
      };

      snake.direction.x += (targetDir.x - snake.direction.x) * TURN_RATE;
      snake.direction.y += (targetDir.y - snake.direction.y) * TURN_RATE;

      const len = Math.sqrt(snake.direction.x ** 2 + snake.direction.y ** 2);
      snake.direction.x /= len;
      snake.direction.y /= len;
    },
    []
  );

  const moveSnake = useCallback((snake: Snake) => {
    if (snake.isDead) return;

    const head = snake.segments[0];
    const newHead: Segment = {
      x: head.x + snake.direction.x * snake.speed,
      y: head.y + snake.direction.y * snake.speed,
      radius: HEAD_RADIUS,
    };

    snake.segments.unshift(newHead);

    if (!snake.isGrowing) {
      snake.segments.pop();
    } else {
      snake.isGrowing = false;
    }

    // Update segment radii
    snake.segments.forEach((seg, i) => {
      const t = i / Math.max(1, snake.segments.length - 1);
      seg.radius = HEAD_RADIUS - (HEAD_RADIUS - TAIL_RADIUS) * t;
    });

    // Smooth body following
    for (let i = 1; i < snake.segments.length; i++) {
      const current = snake.segments[i];
      const ahead = snake.segments[i - 1];
      const ddx = ahead.x - current.x;
      const ddy = ahead.y - current.y;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);

      if (dist > SEGMENT_SPACING) {
        const moveRatio = (dist - SEGMENT_SPACING) / dist;
        current.x += ddx * moveRatio;
        current.y += ddy * moveRatio;
      }
    }
  }, []);

  // ============================================
  // COLLISION DETECTION
  // ============================================

  const checkSelfCollision = useCallback((snake: Snake): boolean => {
    const head = snake.segments[0];
    for (let i = 12; i < snake.segments.length; i++) {
      const segment = snake.segments[i];
      if (checkCircleCollision(head, head.radius * 0.8, segment, segment.radius * 0.8)) {
        return true;
      }
    }
    return false;
  }, []);

  const checkWallCollision = useCallback(
    (snake: Snake): boolean => {
      const head = snake.segments[0];
      return (
        head.x - head.radius < 0 ||
        head.x + head.radius > CANVAS_WIDTH ||
        head.y - head.radius < 0 ||
        head.y + head.radius > CANVAS_HEIGHT
      );
    },
    [CANVAS_WIDTH, CANVAS_HEIGHT]
  );

  const checkSnakeCollision = useCallback(
    (snake: Snake, otherSnake: Snake): boolean => {
      const head = snake.segments[0];
      for (const segment of otherSnake.segments) {
        if (checkCircleCollision(head, head.radius * 0.7, segment, segment.radius * 0.7)) {
          return true;
        }
      }
      return false;
    },
    []
  );

  const checkFoodCollision = useCallback(
    (snake: Snake, food: Food[]): Food | null => {
      const head = snake.segments[0];
      for (const f of food) {
        if (checkCircleCollision(head, head.radius, f, f.radius)) {
          return f;
        }
      }
      return null;
    },
    []
  );

  // ============================================
  // AI BEHAVIOR
  // ============================================

  const updateAISnake = useCallback(
    (aiSnake: Snake, food: Food[]) => {
      if (aiSnake.isDead) return;

      const head = aiSnake.segments[0];

      // Find nearest food
      let nearestFood: Food | null = null;
      let nearestDist = Infinity;

      for (const f of food) {
        const dist = Math.hypot(f.x - head.x, f.y - head.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestFood = f;
        }
      }

      // Wander randomly sometimes
      if (Math.random() < 0.02 || !nearestFood) {
        aiSnake.targetFood = {
          x: 50 + Math.random() * (CANVAS_WIDTH - 100),
          y: 50 + Math.random() * (CANVAS_HEIGHT - 100),
        };
      } else {
        aiSnake.targetFood = nearestFood;
      }

      if (aiSnake.targetFood) {
        updateSnakeDirection(aiSnake, aiSnake.targetFood.x, aiSnake.targetFood.y);
      }

      // Wall avoidance
      const margin = 60;
      if (head.x < margin) aiSnake.direction.x += 0.08;
      if (head.x > CANVAS_WIDTH - margin) aiSnake.direction.x -= 0.08;
      if (head.y < margin) aiSnake.direction.y += 0.08;
      if (head.y > CANVAS_HEIGHT - margin) aiSnake.direction.y -= 0.08;

      const len = Math.sqrt(aiSnake.direction.x ** 2 + aiSnake.direction.y ** 2);
      if (len > 0) {
        aiSnake.direction.x /= len;
        aiSnake.direction.y /= len;
      }

      moveSnake(aiSnake);
    },
    [CANVAS_WIDTH, CANVAS_HEIGHT, updateSnakeDirection, moveSnake]
  );

  // ============================================
  // EFFECTS
  // ============================================

  const onFoodCollected = useCallback(
    (snake: Snake) => {
      snake.isGrowing = true;
      const length = snake.segments.length;

      if (snake.isPlayer) {
        setScore(length);
        if (soundEnabled) playBlockLand();
        hapticScore();

        if (length === 25) {
          showEpicCallout('GROWING!');
          hapticCombo(1);
        }
        if (length === 50) {
          showEpicCallout('SNAKE KING!');
          triggerScreenShake(200);
          if (soundEnabled) playCombo(1);
          hapticCombo(2);
        }
        if (length === 75) {
          showEpicCallout('SLITHER MASTER!');
          triggerBigMoment({ shockwave: true, sparks: true });
          if (soundEnabled) playPerfectBonus();
          hapticHighScore();
        }
        if (length === 100) {
          showEpicCallout('SLITHER GOD!');
          triggerConfetti();
          triggerBigMoment({ shockwave: true, sparks: true, vignette: true });
          if (soundEnabled) playPerfectBonus();
          hapticHighScore();
        }
        if (length === 150) {
          showEpicCallout('LEGENDARY!');
          triggerConfetti();
          triggerBigMoment({ shockwave: true, sparks: true, vignette: true, shake: true });
          if (soundEnabled) playPerfectBonus();
        }
      }
    },
    [
      soundEnabled,
      playBlockLand,
      playCombo,
      playPerfectBonus,
      hapticScore,
      hapticCombo,
      hapticHighScore,
      showEpicCallout,
      triggerScreenShake,
      triggerBigMoment,
      triggerConfetti,
    ]
  );

  const onAISnakeDeath = useCallback(
    (aiSnake: Snake, state: typeof gameStateRef.current) => {
      // Convert snake body to food
      aiSnake.segments.forEach((segment) => {
        state.food.push({
          id: `death-food-${Math.random()}`,
          x: segment.x + (Math.random() - 0.5) * 15,
          y: segment.y + (Math.random() - 0.5) * 15,
          radius: FOOD_RADIUS,
        });
      });

      state.killCount++;
      showEpicCallout(`+${aiSnake.segments.length}`);
      if (soundEnabled) playCombo(1);
      hapticCombo(1);

      // Schedule respawn
      setTimeout(() => {
        if (gameStateRef.current.gameStatus === 'playing') {
          const colorIndex = 1 + Math.floor(Math.random() * (SNAKE_COLORS.length - 1));
          const newSnake = createSnake(
            aiSnake.id,
            50 + Math.random() * (CANVAS_WIDTH - 100),
            50 + Math.random() * (CANVAS_HEIGHT - 100),
            colorIndex,
            false
          );
          const idx = state.aiSnakes.findIndex((s) => s.id === aiSnake.id);
          if (idx !== -1) {
            state.aiSnakes[idx] = newSnake;
          }
        }
      }, 3000 + Math.random() * 2000);
    },
    [CANVAS_WIDTH, CANVAS_HEIGHT, soundEnabled, playCombo, hapticCombo, showEpicCallout]
  );

  // ============================================
  // GAME OVER
  // ============================================

  const handleGameOver = useCallback(async () => {
    const state = gameStateRef.current;
    state.gameStatus = 'gameover';
    setGameState('gameover');

    if (soundEnabled) playGameOver();
    hapticGameOver();
    triggerScreenShake(300);

    const maxLength = state.playerSnake.segments.length;

    if (maxLength > highScore) {
      setHighScore(maxLength);
      safeStorage.setItem('orangeSnakeHighScore', String(maxLength));
      setIsNewPersonalBest(true);
    }

    if (isSignedIn && maxLength > 0) {
      setScoreSubmitted(true);
      await submitScore(maxLength, undefined, {
        survivalTime: Math.floor((Date.now() - gameStartTimeRef.current) / 1000),
        aiSnakesKilled: state.killCount,
      });
    }
  }, [
    soundEnabled,
    playGameOver,
    hapticGameOver,
    triggerScreenShake,
    highScore,
    isSignedIn,
    submitScore,
  ]);

  // ============================================
  // RENDERING
  // ============================================

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;

      const gridSize = 40;
      for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
    },
    [CANVAS_WIDTH, CANVAS_HEIGHT]
  );

  const drawSnake = useCallback((ctx: CanvasRenderingContext2D, snake: Snake) => {
    if (snake.isDead) return;

    ctx.save();

    if (snake.isPlayer) {
      ctx.shadowColor = snake.glowColor;
      ctx.shadowBlur = 12;
    }

    // Draw from tail to head
    for (let i = snake.segments.length - 1; i >= 0; i--) {
      const segment = snake.segments[i];
      const isHead = i === 0;

      ctx.beginPath();
      ctx.arc(segment.x, segment.y, segment.radius, 0, Math.PI * 2);
      ctx.fillStyle = snake.color;
      ctx.fill();

      if (isHead) {
        // Eyes
        const eyeOffset = segment.radius * 0.4;
        const eyeRadius = segment.radius * 0.25;

        ctx.shadowBlur = 0;

        // Left eye
        ctx.beginPath();
        ctx.arc(
          segment.x + snake.direction.x * eyeOffset - snake.direction.y * eyeOffset * 0.6,
          segment.y + snake.direction.y * eyeOffset + snake.direction.x * eyeOffset * 0.6,
          eyeRadius,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Right eye
        ctx.beginPath();
        ctx.arc(
          segment.x + snake.direction.x * eyeOffset + snake.direction.y * eyeOffset * 0.6,
          segment.y + snake.direction.y * eyeOffset - snake.direction.x * eyeOffset * 0.6,
          eyeRadius,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Pupils
        const pupilRadius = eyeRadius * 0.5;
        ctx.beginPath();
        ctx.arc(
          segment.x + snake.direction.x * eyeOffset * 1.2 - snake.direction.y * eyeOffset * 0.6,
          segment.y + snake.direction.y * eyeOffset * 1.2 + snake.direction.x * eyeOffset * 0.6,
          pupilRadius,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = '#000';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(
          segment.x + snake.direction.x * eyeOffset * 1.2 + snake.direction.y * eyeOffset * 0.6,
          segment.y + snake.direction.y * eyeOffset * 1.2 - snake.direction.x * eyeOffset * 0.6,
          pupilRadius,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = '#000';
        ctx.fill();
      }
    }

    ctx.restore();
  }, []);

  const drawFood = useCallback((ctx: CanvasRenderingContext2D, food: Food[]) => {
    ctx.fillStyle = '#FF6B00';
    ctx.shadowColor = '#FF6B00';
    ctx.shadowBlur = 6;

    food.forEach((f) => {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.shadowBlur = 0;
  }, []);

  const render = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const state = gameStateRef.current;

      // Clear
      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grid
      drawGrid(ctx);

      // Border
      ctx.strokeStyle = 'rgba(255, 107, 0, 0.3)';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, CANVAS_WIDTH - 4, CANVAS_HEIGHT - 4);

      // Food
      drawFood(ctx, state.food);

      // AI snakes
      state.aiSnakes.forEach((snake) => drawSnake(ctx, snake));

      // Player snake
      drawSnake(ctx, state.playerSnake);

      // Score
      ctx.save();
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'var(--color-black-50)';
      ctx.shadowBlur = 4;
      ctx.fillText(`Length: ${state.playerSnake.segments.length}`, 15, 35);
      ctx.restore();
    },
    [CANVAS_WIDTH, CANVAS_HEIGHT, drawGrid, drawFood, drawSnake]
  );

  // ============================================
  // GAME LOOP
  // ============================================

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const state = gameStateRef.current;

      if (state.gameStatus !== 'playing' || showExitDialogRef.current) {
        render(ctx);
        if (state.gameStatus === 'playing' && !showExitDialogRef.current) {
          animationRef.current = requestAnimationFrame(gameLoop);
        }
        return;
      }

      // Update player
      updateSnakeDirection(
        state.playerSnake,
        state.mousePosition.x,
        state.mousePosition.y
      );
      moveSnake(state.playerSnake);

      // Update AI
      state.aiSnakes.forEach((ai) => updateAISnake(ai, state.food));

      // Check player collisions
      if (checkSelfCollision(state.playerSnake) || checkWallCollision(state.playerSnake)) {
        handleGameOver();
        render(ctx);
        return;
      }

      for (const ai of state.aiSnakes) {
        if (!ai.isDead && checkSnakeCollision(state.playerSnake, ai)) {
          handleGameOver();
          render(ctx);
          return;
        }
      }

      // Player food collection
      const collectedFood = checkFoodCollision(state.playerSnake, state.food);
      if (collectedFood) {
        state.food = state.food.filter((f) => f.id !== collectedFood.id);
        onFoodCollected(state.playerSnake);
      }

      // AI food collection & collisions
      state.aiSnakes.forEach((ai) => {
        if (ai.isDead) return;

        const aiFood = checkFoodCollision(ai, state.food);
        if (aiFood) {
          state.food = state.food.filter((f) => f.id !== aiFood.id);
          ai.isGrowing = true;
        }

        // AI vs AI
        state.aiSnakes.forEach((other) => {
          if (other.id !== ai.id && !other.isDead && checkSnakeCollision(ai, other)) {
            ai.isDead = true;
            onAISnakeDeath(ai, state);
          }
        });

        // AI vs Player
        if (checkSnakeCollision(ai, state.playerSnake)) {
          ai.isDead = true;
          onAISnakeDeath(ai, state);
        }

        // AI wall collision
        if (checkWallCollision(ai)) {
          ai.isDead = true;
          onAISnakeDeath(ai, state);
        }
      });

      // Spawn food
      if (state.food.length < MIN_FOOD) {
        state.food.push(...spawnFood(5, CANVAS_WIDTH, CANVAS_HEIGHT));
      }

      state.gameTime = Date.now() - gameStartTimeRef.current;

      render(ctx);
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(animationRef.current);
  }, [
    gameState,
    showExitDialog,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    updateSnakeDirection,
    moveSnake,
    updateAISnake,
    checkSelfCollision,
    checkWallCollision,
    checkSnakeCollision,
    checkFoodCollision,
    handleGameOver,
    onFoodCollected,
    onAISnakeDeath,
    render,
  ]);

  // ============================================
  // INPUT HANDLERS
  // ============================================

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (gameStateRef.current.gameStatus !== 'playing') return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      gameStateRef.current.mousePosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  // ============================================
  // GAME CONTROLS
  // ============================================

  const startGame = useCallback(() => {
    // Initialize game state
    gameStateRef.current = {
      playerSnake: createSnake('player', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0, true),
      aiSnakes: Array.from({ length: AI_COUNT }, (_, i) =>
        createSnake(
          `ai-${i}`,
          50 + Math.random() * (CANVAS_WIDTH - 100),
          50 + Math.random() * (CANVAS_HEIGHT - 100),
          1 + (i % (SNAKE_COLORS.length - 1)),
          false
        )
      ),
      food: spawnFood(MIN_FOOD, CANVAS_WIDTH, CANVAS_HEIGHT),
      gameStatus: 'playing',
      mousePosition: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      gameTime: 0,
      killCount: 0,
    };

    setScore(STARTING_LENGTH);
    setGameState('playing');
    setScoreSubmitted(false);
    setIsNewPersonalBest(false);
    gameStartTimeRef.current = Date.now();
    resetAllEffects();

    if (soundEnabled) playGameStart();
    hapticButton();
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, soundEnabled, playGameStart, hapticButton, resetAllEffects]);

  const resetGame = useCallback(() => {
    startGame();
  }, [startGame]);

  // ============================================
  // IDLE SCREEN RENDERING
  // ============================================

  useEffect(() => {
    if (gameState !== 'idle') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawIdleScreen = () => {
      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawGrid(ctx);

      // Title
      ctx.save();
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FF6B00';
      ctx.shadowColor = '#FF6B00';
      ctx.shadowBlur = 20;
      ctx.fillText('Orange Snake', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
      ctx.restore();

      // Instruction
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText('Move mouse/finger to control', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

      // Tap to start
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#FF6B00';
      const bounce = Math.sin(Date.now() * 0.004) * 5;
      ctx.fillText('Tap to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60 + bounce);
    };

    drawIdleScreen();
    const interval = setInterval(drawIdleScreen, 50);

    return () => clearInterval(interval);
  }, [gameState, CANVAS_WIDTH, CANVAS_HEIGHT, drawGrid]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      ref={containerRef}
      className={`orange-snake-container ${isMobile ? 'mobile' : 'desktop'}`}
    >
      <GameSEO
        gameName="Orange Snake"
        gameSlug="snake"
        description="Guide your snake to eat oranges and grow longer! Avoid walls and your own tail in this classic arcade game with a citrus twist."
        genre="Arcade"
        difficulty="Easy"
      />
      {/* Sound Button */}
      <button
        className="osn-sound-btn"
        onClick={toggleSound}
        aria-label={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
      >
        {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
      </button>

      {/* Visual Effects */}
      <GameEffects effects={effects} accentColor="#ff6b00" />

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={gameState === 'idle' ? startGame : undefined}
        onPointerMove={handlePointerMove}
        className="osn-canvas"
        style={{ touchAction: 'none' }}
      />

      {/* Game Over - Uses shared component */}
      {gameState === 'gameover' && (
        <ArcadeGameOverScreen
          score={score}
          highScore={highScore}
          scoreLabel="max length"
          isNewPersonalBest={isNewPersonalBest}
          isSignedIn={isSignedIn}
          isSubmitting={isSubmitting}
          scoreSubmitted={scoreSubmitted}
          userDisplayName={userDisplayName ?? undefined}
          leaderboard={globalLeaderboard}
          onPlayAgain={resetGame}
          accentColor="#4ade80"
        />
      )}

      {/* Exit Game Confirmation Dialog */}
      <ConfirmModal
        isOpen={showExitDialog}
        onClose={cancelExit}
        onConfirm={confirmExit}
        title="Leave Game?"
        message="Your progress will be lost. Are you sure you want to leave?"
        confirmText="Leave"
        cancelText="Stay"
        variant="warning"
        icon="🎮"
      />
    </div>
  );
};

export default OrangeSnake;
