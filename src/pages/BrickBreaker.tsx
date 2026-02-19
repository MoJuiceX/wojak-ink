/**
 * Brick Breaker Game
 *
 * Classic breakout-style game with powerups, level progression, and satisfying physics.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useGameHaptics } from '@/systems/haptics';
import { useGameEffects } from '@/components/media';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import { useGameNavigationGuard } from '@/hooks/useGameNavigationGuard';
import { useGameTouch } from '@/hooks/useGameTouch';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { LEVELS, generateRandomLevel } from './brickLevels';
import { GameSEO } from '@/components/seo';
import { ArcadeGameOverScreen } from '@/components/media/games/ArcadeGameOverScreen';
import { generateGameScorecard } from '@/systems/sharing/GameScorecard';
import './BrickBreaker.css';

// =============================================================================
// TYPES
// =============================================================================

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  isFireball: boolean;
  // Squash/stretch for visual juice
  squashX: number;
  squashY: number;
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  baseWidth: number;
  // Squash for visual juice
  squashY: number;
}

// Impact flash effect
interface ImpactFlash {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

// Brick shard for shatter effect
interface BrickShard {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  alpha: number;
}

// Ember particle for fireball effect (Enhancement #34)
interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

// Active powerup with timer (Enhancement #41)
interface ActivePowerup {
  type: PowerupType;
  expiresAt: number;
  duration: number;
}

// Multiball spawn effect (Enhancement #40)
interface SpawnEffect {
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

// Level transition state (Enhancement #42)
interface LevelTransition {
  phase: 'fadeOut' | 'display' | 'fadeIn';
  progress: number;
  levelNumber: number;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'normal' | 'strong' | 'unbreakable';
  hits: number;
}

type PowerupType = 'expand' | 'multiball' | 'fireball' | 'slow' | 'extralife';

interface Powerup {
  x: number;
  y: number;
  type: PowerupType;
  vy: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  life: number;
}

type GameStatus = 'idle' | 'playing' | 'paused' | 'levelComplete' | 'gameover';

// =============================================================================
// CONSTANTS
// =============================================================================

const DESKTOP_WIDTH = 650;
const DESKTOP_HEIGHT = 750; // Much taller playing field
const INITIAL_BALL_SPEED = 5;
const PADDLE_HEIGHT = 15;
const PADDLE_BASE_WIDTH = 100;
const BALL_RADIUS = 8;
const BRICK_HEIGHT = 25;
const BRICK_PADDING = 2;
const BRICK_TOP_OFFSET = 50;
const POWERUP_CHANCE = 0.15;
const POWERUP_SPEED = 2;
const POWERUP_RADIUS = 12;

const POWERUP_COLORS: Record<PowerupType, string> = {
  expand: '#00FF00',
  multiball: '#FF00FF',
  fireball: '#FF4400',
  slow: '#00FFFF',
  extralife: '#FF0000',
};

const POWERUP_ICONS: Record<PowerupType, string> = {
  expand: 'E',
  multiball: 'M',
  fireball: 'F',
  slow: 'S',
  extralife: '+',
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function BrickBreaker() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { playGameOver, playWinSound, playBallLaunch, playBrickBreakerPaddleHit, playBrickBreakerWallHit, playBrickBreakerBrickDestroy, playBrickBreakerBrickCrack, playBrickBreakerUnbreakableHit, playBrickBreakerPowerupSpawn, playBrickBreakerPowerupCollect, playBrickBreakerBallLost, playBrickBreakerCombo, playBrickBreakerComboBreak, startBrickBreakerAnticipationLoop, stopBrickBreakerAnticipationLoop, startBrickBreakerFireballLoop, stopBrickBreakerFireballLoop } = useGameSounds();
  const { hapticGameOver, hapticBBPaddleHit, hapticBBBrickNormal, hapticBBBrickCrack, hapticBBBrickStrong, hapticBBUnbreakable, hapticBBPowerupCollect, hapticBBBallLost, hapticBBNearMiss, hapticBBLevelComplete, hapticBBComboBreak, hapticCombo } = useGameHaptics();
  const {
    triggerScreenShake,
    triggerConfetti,
    showEpicCallout,
    addScorePopup,
  } = useGameEffects();
  const { submitScore, isSignedIn, leaderboard: globalLeaderboard } = useLeaderboard('brick-breaker');

  // Game status (moved before useGameNavigationGuard to avoid initialization order issue)
  const [status, setStatus] = useState<GameStatus>('idle');

  // Navigation guard - prevents accidental exits during gameplay
  const { showExitDialog, confirmExit, cancelExit } = useGameNavigationGuard({
    isPlaying: status === 'playing',
  });

  // Mobile fullscreen mode - hide header during gameplay
  useEffect(() => {
    if (isMobile && status === 'playing') {
      document.body.classList.add('game-fullscreen-mode');
    } else {
      document.body.classList.remove('game-fullscreen-mode');
    }
    return () => {
      document.body.classList.remove('game-fullscreen-mode');
    };
  }, [isMobile, status]);

  // Game dimensions
  const [gameWidth, setGameWidth] = useState(DESKTOP_WIDTH);
  const [gameHeight, setGameHeight] = useState(DESKTOP_HEIGHT);

  // Game state refs (using refs to avoid re-renders in game loop)
  const ballsRef = useRef<Ball[]>([]);
  const paddleRef = useRef<Paddle>({
    x: 0,
    y: 0,
    width: PADDLE_BASE_WIDTH,
    height: PADDLE_HEIGHT,
    baseWidth: PADDLE_BASE_WIDTH,
    squashY: 1, // Visual juice - paddle compression
  });
  const bricksRef = useRef<Brick[]>([]);
  const powerupsRef = useRef<Powerup[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scorePopupsRef = useRef<ScorePopup[]>([]);
  // Visual juice refs
  const impactFlashesRef = useRef<ImpactFlash[]>([]);
  const brickShardsRef = useRef<BrickShard[]>([]);

  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const statusRef = useRef<GameStatus>('idle');
  const comboCountRef = useRef(0);
  const comboTimeoutRef = useRef<number | null>(null);
  const totalBricksDestroyedRef = useRef(0);
  const animationFrameRef = useRef<number>(0);

  // Ref for game loop to check dialog state
  const showExitDialogRef = useRef(false);

  // Ref for anticipation sound state
  const anticipationPlayingRef = useRef(false);

  // Ref for fireball loop sound state
  const fireballLoopPlayingRef = useRef(false);

  // Ref for near-miss cooldown (to prevent spam)
  const nearMissCooldownRef = useRef(false);

  // Visual juice refs for Phase 4
  const screenFlashRef = useRef<{ color: string; alpha: number } | null>(null);
  const nearMissVisualRef = useRef<{ x: number; alpha: number } | null>(null);
  const freezeFrameUntilRef = useRef(0);
  const frameTimeRef = useRef(0);
  const emberParticlesRef = useRef<EmberParticle[]>([]);
  const animationTimeRef = useRef(0); // For time-based animations (powerup pulse)
  const activePowerupsRef = useRef<ActivePowerup[]>([]); // Enhancement #41
  const spawnEffectsRef = useRef<SpawnEffect[]>([]); // Enhancement #40
  const levelTransitionRef = useRef<LevelTransition | null>(null); // Enhancement #42
  const comboTimerStartRef = useRef(0); // When combo started for timer bar (#43)
  const comboBreakEffectRef = useRef<{ alpha: number; combo: number } | null>(null); // Enhancement #45

  // UI state (needs re-renders)
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gameScreenshot, setGameScreenshot] = useState<string | null>(null);

  // =============================================================================
  // GAME SETUP
  // =============================================================================

  const initializeBall = useCallback((width: number, height: number): Ball => {
    const angle = Math.PI / 4 + (Math.random() * Math.PI / 4); // 45-90 degrees
    const speed = INITIAL_BALL_SPEED * (1 + (levelRef.current - 1) * 0.05);
    return {
      x: width / 2,
      y: height - 80,
      vx: speed * Math.cos(angle) * (Math.random() > 0.5 ? 1 : -1),
      vy: -speed * Math.sin(angle),
      radius: BALL_RADIUS,
      speed,
      isFireball: false,
      squashX: 1, // Visual juice - ball compression
      squashY: 1,
    };
  }, []);

  const loadLevel = useCallback((levelNum: number, width: number, height: number) => {
    levelRef.current = levelNum;
    setLevel(levelNum);

    // Get level data
    const levelData = levelNum <= LEVELS.length
      ? LEVELS[levelNum - 1]
      : generateRandomLevel(levelNum);

    // Calculate brick dimensions
    const brickWidth = (width - BRICK_PADDING * 2) / 10;

    // Create bricks
    const bricks: Brick[] = [];
    levelData.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell === 0) return;

        const brick: Brick = {
          x: BRICK_PADDING + colIndex * brickWidth,
          y: BRICK_TOP_OFFSET + rowIndex * (BRICK_HEIGHT + BRICK_PADDING),
          width: brickWidth - BRICK_PADDING,
          height: BRICK_HEIGHT - BRICK_PADDING,
          type: cell === 9 ? 'unbreakable' : cell === 2 ? 'strong' : 'normal',
          hits: cell === 9 ? 999 : cell === 2 ? 2 : 1,
        };
        bricks.push(brick);
      });
    });

    bricksRef.current = bricks;
    powerupsRef.current = [];
    particlesRef.current = [];

    // Reset paddle
    paddleRef.current = {
      x: width / 2 - PADDLE_BASE_WIDTH / 2,
      y: height - 30,
      width: PADDLE_BASE_WIDTH,
      height: PADDLE_HEIGHT,
      baseWidth: PADDLE_BASE_WIDTH,
      squashY: 1, // Visual juice - paddle compression
    };

    // Create initial ball
    ballsRef.current = [initializeBall(width, height)];
  }, [initializeBall]);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = 3;
    totalBricksDestroyedRef.current = 0;
    comboCountRef.current = 0;
    setScore(0);
    setLives(3);
    setIsNewHighScore(false);
    setSubmitted(false);
    setGameScreenshot(null);

    loadLevel(1, gameWidth, gameHeight);
    if (soundEnabled) playBallLaunch();
    statusRef.current = 'playing';
    setStatus('playing');
  }, [gameWidth, gameHeight, loadLevel, soundEnabled, playBallLaunch]);

  // Share handler for game over scorecard
  const handleShare = useCallback(async () => {
    try {
      const highScore = globalLeaderboard[0]?.score || 0;
      const blob = await generateGameScorecard({
        gameName: 'Brick Breaker',
        gameNameParts: ['BRICK', 'BREAKER'],
        score: score,
        scoreLabel: 'points',
        bestScore: highScore,
        isNewRecord: isNewHighScore,
        screenshot: gameScreenshot,
        accentColor: '#ef4444', // Red accent for Brick Breaker
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `brick-breaker-${score}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      // Try Web Share API
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'brick-breaker-score.png', { type: 'image/png' });
        const shareData = {
          title: 'Brick Breaker Score',
          text: `🧱 I scored ${score} points in Brick Breaker! Can you beat me?`,
          files: [file],
        };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
        }
      }
    } catch (err) {
      console.error('Failed to generate share image:', err);
      const shareText = `🧱 Brick Breaker: ${score} points!\n\nCan you beat my score?\n\nhttps://wojak.ink/games`;
      if (navigator.share) {
        await navigator.share({ title: 'Brick Breaker', text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
      }
    }
  }, [score, globalLeaderboard, isNewHighScore, gameScreenshot]);

  // =============================================================================
  // VISUAL JUICE HELPERS
  // =============================================================================

  // Trigger ball squash on impact (Enhancement #25)
  const triggerBallSquash = useCallback((ball: Ball, isHorizontal: boolean) => {
    if (isHorizontal) {
      ball.squashX = 0.7;
      ball.squashY = 1.3;
    } else {
      ball.squashX = 1.3;
      ball.squashY = 0.7;
    }
  }, []);

  // Trigger paddle squash on ball hit (Enhancement #26)
  const triggerPaddleSquash = useCallback(() => {
    paddleRef.current.squashY = 0.7;
  }, []);

  // Create impact flash at collision point (Enhancement #28)
  const createImpactFlash = useCallback((x: number, y: number) => {
    impactFlashesRef.current.push({
      x,
      y,
      radius: 5,
      alpha: 1,
    });
  }, []);

  // Create brick shatter effect (Enhancement #29)
  const createBrickShatter = useCallback((brick: Brick) => {
    const shardCount = 6;
    const shardWidth = brick.width / 3;
    const shardHeight = brick.height / 2;
    const color = brick.type === 'strong' ? '#FF4444' : '#FF6B00';

    for (let i = 0; i < shardCount; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);

      brickShardsRef.current.push({
        x: brick.x + col * shardWidth + shardWidth / 2,
        y: brick.y + row * shardHeight + shardHeight / 2,
        width: shardWidth * 0.9,
        height: shardHeight * 0.9,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 5 - 2,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        color,
        alpha: 1,
      });
    }
  }, []);

  // Get combo trail color (Enhancement #31)
  const getComboTrailColor = useCallback((combo: number): string => {
    if (combo >= 10) return '#ff00ff'; // Magenta - UNSTOPPABLE
    if (combo >= 8) return '#ff4500';  // OrangeRed
    if (combo >= 5) return '#ffd700';  // Gold
    if (combo >= 3) return '#ffaa00';  // Orange
    return '#ff8c00'; // Default orange
  }, []);

  // Trigger screen flash for powerup activation (Enhancement #33)
  const triggerPowerupFlash = useCallback((powerupType: PowerupType) => {
    const colors: Record<PowerupType, string> = {
      expand: '#00ff00',
      multiball: '#ff00ff',
      fireball: '#ff6600',
      slow: '#00ffff',
      extralife: '#ff0000',
    };
    screenFlashRef.current = {
      color: colors[powerupType],
      alpha: 0.3,
    };
  }, []);

  // Trigger near-miss visual feedback (Enhancement #35)
  const triggerNearMissVisual = useCallback((x: number) => {
    nearMissVisualRef.current = { x, alpha: 1 };
  }, []);

  // Trigger freeze frame on big events (Enhancement #37)
  const triggerFreezeFrame = useCallback((duration: number) => {
    freezeFrameUntilRef.current = performance.now() + duration;
  }, []);

  // =============================================================================
  // COLLISION DETECTION
  // =============================================================================

  const checkWallCollision = useCallback((ball: Ball) => {
    // Left wall
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx = -ball.vx;
      if (soundEnabled) playBrickBreakerWallHit();
      triggerBallSquash(ball, true); // Horizontal impact
      createImpactFlash(0, ball.y);
    }

    // Right wall
    if (ball.x + ball.radius > gameWidth) {
      ball.x = gameWidth - ball.radius;
      ball.vx = -ball.vx;
      if (soundEnabled) playBrickBreakerWallHit();
      triggerBallSquash(ball, true); // Horizontal impact
      createImpactFlash(gameWidth, ball.y);
    }

    // Top wall
    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.vy = -ball.vy;
      if (soundEnabled) playBrickBreakerWallHit();
      triggerBallSquash(ball, false); // Vertical impact
      createImpactFlash(ball.x, 0);
    }
  }, [gameWidth, soundEnabled, playBrickBreakerWallHit, triggerBallSquash, createImpactFlash]);

  const checkPaddleCollision = useCallback((ball: Ball) => {
    const paddle = paddleRef.current;

    if (
      ball.y + ball.radius >= paddle.y &&
      ball.y - ball.radius <= paddle.y + paddle.height &&
      ball.x >= paddle.x &&
      ball.x <= paddle.x + paddle.width &&
      ball.vy > 0 // Only when moving downward
    ) {
      // Calculate hit position (0 = left, 1 = right)
      const hitPosition = (ball.x - paddle.x) / paddle.width;

      // Convert to angle: left = 150deg, center = 90deg, right = 30deg
      const minAngle = Math.PI / 6;
      const maxAngle = (Math.PI * 5) / 6;
      const angle = maxAngle - hitPosition * (maxAngle - minAngle);

      // Set new velocity
      ball.vx = ball.speed * Math.cos(angle);
      ball.vy = -ball.speed * Math.sin(angle);

      // Ensure ball is above paddle
      ball.y = paddle.y - ball.radius;

      if (soundEnabled) playBrickBreakerPaddleHit(hitPosition);
      hapticBBPaddleHit(); // Medium pulse - ball bounced
      triggerScreenShake(15);

      // Visual juice
      triggerBallSquash(ball, false); // Vertical impact
      triggerPaddleSquash();
      createImpactFlash(ball.x, paddle.y);
    }
  }, [soundEnabled, playBrickBreakerPaddleHit, hapticBBPaddleHit, triggerScreenShake, triggerBallSquash, triggerPaddleSquash, createImpactFlash]);

  const checkBrickCollision = useCallback((ball: Ball): { hit: boolean; destroyed: boolean; brick: Brick | null } => {
    const bricks = bricksRef.current;
    for (let i = 0; i < bricks.length; i++) {
      const brick = bricks[i];
      if (brick.hits <= 0) continue;

      // AABB collision
      if (
        ball.x + ball.radius > brick.x &&
        ball.x - ball.radius < brick.x + brick.width &&
        ball.y + ball.radius > brick.y &&
        ball.y - ball.radius < brick.y + brick.height
      ) {
        // Fireball goes through bricks
        if (!ball.isFireball) {
          // Determine collision side
          const overlapLeft = ball.x + ball.radius - brick.x;
          const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
          const overlapTop = ball.y + ball.radius - brick.y;
          const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);

          const minOverlapX = Math.min(overlapLeft, overlapRight);
          const minOverlapY = Math.min(overlapTop, overlapBottom);

          if (minOverlapX < minOverlapY) {
            ball.vx = -ball.vx;
          } else {
            ball.vy = -ball.vy;
          }
        }

        // Damage brick (unless unbreakable)
        if (brick.type !== 'unbreakable') {
          bricks[i] = { ...brick, hits: brick.hits - 1 };

          if (bricks[i].hits <= 0) {
            return { hit: true, destroyed: true, brick: bricks[i] };
          }
          return { hit: true, destroyed: false, brick: bricks[i] };
        }

        // Unbreakable brick - metallic clang
        if (soundEnabled) playBrickBreakerUnbreakableHit();
        hapticBBUnbreakable(); // Heavy thud - solid obstacle
        return { hit: true, destroyed: false, brick: null };
      }
    }

    return { hit: false, destroyed: false, brick: null };
  }, [soundEnabled, playBrickBreakerUnbreakableHit, hapticBBUnbreakable]);

  // =============================================================================
  // POWERUPS
  // =============================================================================

  const maybeSpawnPowerup = useCallback((brick: Brick) => {
    if (Math.random() < POWERUP_CHANCE) {
      const types: PowerupType[] = ['expand', 'multiball', 'fireball', 'slow', 'extralife'];
      const type = types[Math.floor(Math.random() * types.length)];

      powerupsRef.current.push({
        x: brick.x + brick.width / 2,
        y: brick.y + brick.height / 2,
        type,
        vy: POWERUP_SPEED,
      });

      // Play sparkle sound when powerup spawns
      if (soundEnabled) playBrickBreakerPowerupSpawn();
    }
  }, [soundEnabled, playBrickBreakerPowerupSpawn]);

  const applyPowerup = useCallback((type: PowerupType) => {
    if (soundEnabled) playBrickBreakerPowerupCollect(type);
    hapticBBPowerupCollect();
    showEpicCallout(type.toUpperCase() + '!');
    triggerPowerupFlash(type); // Enhancement #33 - Screen flash on collect

    switch (type) {
      case 'expand':
        paddleRef.current.width = Math.min(200, paddleRef.current.width * 1.5);
        // Track active powerup (Enhancement #41)
        activePowerupsRef.current.push({
          type: 'expand',
          expiresAt: performance.now() + 10000,
          duration: 10000,
        });
        setTimeout(() => {
          paddleRef.current.width = paddleRef.current.baseWidth;
          activePowerupsRef.current = activePowerupsRef.current.filter(p => p.type !== 'expand');
        }, 10000);
        break;

      case 'multiball':
        if (ballsRef.current.length > 0) {
          const ball = ballsRef.current[0];
          // Spawn effect (Enhancement #40)
          spawnEffectsRef.current.push(
            { x: ball.x, y: ball.y, alpha: 1, radius: 10 },
            { x: ball.x, y: ball.y, alpha: 1, radius: 10 }
          );
          ballsRef.current.push({
            ...ball,
            vx: -ball.vx,
            squashX: 0.5, // Spawn with squash for pop-in effect
            squashY: 1.5,
          });
          ballsRef.current.push({
            ...ball,
            vx: ball.vx * 0.5,
            vy: -ball.vy,
            squashX: 0.5,
            squashY: 1.5,
          });
        }
        break;

      case 'fireball':
        ballsRef.current.forEach((ball) => {
          ball.isFireball = true;
        });
        // Start fireball loop sound
        if (soundEnabled && !fireballLoopPlayingRef.current) {
          startBrickBreakerFireballLoop();
          fireballLoopPlayingRef.current = true;
        }
        // Track active powerup (Enhancement #41)
        activePowerupsRef.current.push({
          type: 'fireball',
          expiresAt: performance.now() + 8000,
          duration: 8000,
        });
        setTimeout(() => {
          ballsRef.current.forEach((ball) => {
            ball.isFireball = false;
          });
          // Stop fireball loop sound
          if (fireballLoopPlayingRef.current) {
            stopBrickBreakerFireballLoop();
            fireballLoopPlayingRef.current = false;
          }
          activePowerupsRef.current = activePowerupsRef.current.filter(p => p.type !== 'fireball');
        }, 8000);
        break;

      case 'slow':
        ballsRef.current.forEach((ball) => {
          ball.speed *= 0.7;
          ball.vx *= 0.7;
          ball.vy *= 0.7;
        });
        // Track active powerup (Enhancement #41)
        activePowerupsRef.current.push({
          type: 'slow',
          expiresAt: performance.now() + 8000,
          duration: 8000,
        });
        setTimeout(() => {
          ballsRef.current.forEach((ball) => {
            ball.speed /= 0.7;
          });
          activePowerupsRef.current = activePowerupsRef.current.filter(p => p.type !== 'slow');
        }, 8000);
        break;

      case 'extralife':
        livesRef.current++;
        setLives(livesRef.current);
        break;
    }
  }, [soundEnabled, playBrickBreakerPowerupCollect, hapticBBPowerupCollect, showEpicCallout, startBrickBreakerFireballLoop, stopBrickBreakerFireballLoop, triggerPowerupFlash]);

  // =============================================================================
  // BRICK HIT HANDLING
  // =============================================================================

  const onBrickHit = useCallback((brick: Brick, destroyed: boolean) => {
    if (destroyed) {
      // Brick was destroyed - play destroy sound based on type
      if (soundEnabled) playBrickBreakerBrickDestroy(brick.type === 'strong' ? 'strong' : 'normal');
      // Haptic feedback based on brick type
      if (brick.type === 'strong') {
        hapticBBBrickStrong(); // Double pulse for strong brick
      } else {
        hapticBBBrickNormal(); // Light tap for normal brick
      }
    } else {
      // Brick was hit but not destroyed (strong brick cracked)
      if (soundEnabled) playBrickBreakerBrickCrack();
      hapticBBBrickCrack(); // Medium tap for cracked brick
    }

    if (destroyed) {
      totalBricksDestroyedRef.current++;

      // Calculate combo multiplier (Enhancement #44)
      const combo = comboCountRef.current + 1; // +1 because we increment after
      let multiplier = 1;
      if (combo >= 10) multiplier = 2.5;
      else if (combo >= 8) multiplier = 2.0;
      else if (combo >= 5) multiplier = 1.5;
      else if (combo >= 3) multiplier = 1.2;

      // Add points with multiplier
      const basePoints = brick.type === 'strong' ? 25 : 10;
      const points = Math.floor(basePoints * multiplier);
      scoreRef.current += points;
      setScore(scoreRef.current);

      // Score popup - show multiplier if > 1
      const popupText = multiplier > 1 ? `+${points} (x${multiplier})` : `+${points}`;
      scorePopupsRef.current.push({
        x: brick.x + brick.width / 2,
        y: brick.y + brick.height / 2,
        text: popupText,
        life: 1,
      });

      // Enhanced particle burst (Enhancement #30) - 14 particles with varied sizes
      const particleCount = 14;
      const baseColor = brick.type === 'strong' ? '#FF4444' : '#FF6B00';
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 2 + Math.random() * 4;
        particlesRef.current.push({
          x: brick.x + brick.width / 2,
          y: brick.y + brick.height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2, // Bias upward
          color: i % 3 === 0 ? '#ffffff' : baseColor, // Some white sparkles
          life: 1,
        });
      }

      // Brick shatter effect (Enhancement #29)
      createBrickShatter(brick);

      // Impact flash at brick center
      createImpactFlash(brick.x + brick.width / 2, brick.y + brick.height / 2);

      // Freeze frame for strong brick destruction (Enhancement #37)
      if (brick.type === 'strong') {
        triggerFreezeFrame(50);
      }

      // Maybe spawn powerup
      maybeSpawnPowerup(brick);

      // Combo tracking
      comboCountRef.current++;
      comboTimerStartRef.current = performance.now(); // Track for combo meter (Enhancement #43)

      if (comboCountRef.current >= 3) {
        showEpicCallout(`COMBO x${comboCountRef.current}`);
        if (soundEnabled) playBrickBreakerCombo(comboCountRef.current);
        hapticCombo(comboCountRef.current); // Escalating combo haptic
      }
      if (comboCountRef.current >= 5) {
        triggerScreenShake(25);
        triggerFreezeFrame(60); // Enhancement #37 - Freeze frame for big combos
      }
      if (comboCountRef.current >= 10) {
        showEpicCallout('UNSTOPPABLE!');
        triggerConfetti();
      }

      // Reset combo after delay - with combo break feedback (Enhancement #45)
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
      comboTimeoutRef.current = window.setTimeout(() => {
        const lostCombo = comboCountRef.current;
        if (lostCombo >= 3) {
          // Trigger combo break feedback
          if (soundEnabled) playBrickBreakerComboBreak(lostCombo);
          if (lostCombo >= 5) hapticBBComboBreak();
          comboBreakEffectRef.current = { alpha: 1, combo: lostCombo };
        }
        comboCountRef.current = 0;
      }, 500);
    }
  }, [soundEnabled, playBrickBreakerBrickCrack, playBrickBreakerBrickDestroy, playBrickBreakerCombo, playBrickBreakerComboBreak, hapticBBBrickNormal, hapticBBBrickCrack, hapticBBBrickStrong, hapticBBComboBreak, hapticCombo, maybeSpawnPowerup, showEpicCallout, triggerScreenShake, triggerConfetti, createBrickShatter, createImpactFlash, triggerFreezeFrame]);

  // =============================================================================
  // GAME STATE HANDLERS
  // =============================================================================

  // Ref for handleGameOver to allow forward reference
  const handleGameOverRef = useRef<(() => void) | null>(null);

  const handleBallLost = useCallback(() => {
    livesRef.current--;
    setLives(livesRef.current);
    hapticBBBallLost(); // Long pulse - disappointing drop
    triggerScreenShake(30);

    if (livesRef.current <= 0) {
      handleGameOverRef.current?.();
    } else {
      // Play ball lost sound (not game over - just a setback)
      if (soundEnabled) playBrickBreakerBallLost();
      // Respawn ball
      ballsRef.current = [initializeBall(gameWidth, gameHeight)];
      if (soundEnabled) playBallLaunch();
    }
  }, [gameWidth, gameHeight, initializeBall, hapticBBBallLost, triggerScreenShake, soundEnabled, playBrickBreakerBallLost, playBallLaunch]);

  const handleLevelComplete = useCallback(() => {
    statusRef.current = 'levelComplete';
    setStatus('levelComplete');

    if (soundEnabled) playWinSound();
    hapticBBLevelComplete(); // Celebratory success pattern
    showEpicCallout(`LEVEL ${levelRef.current} COMPLETE!`);
    triggerConfetti();
    triggerFreezeFrame(80); // Enhancement #37 - Freeze frame for level complete

    // Life bonus
    const lifeBonus = livesRef.current * 100;
    scoreRef.current += lifeBonus;
    setScore(scoreRef.current);

    addScorePopup(`+${lifeBonus} LIFE BONUS`, gameWidth / 2, gameHeight * 0.35);

    // Clear active powerups on level complete
    activePowerupsRef.current = [];

    // Start level transition animation (Enhancement #42)
    const nextLevel = levelRef.current + 1;
    levelTransitionRef.current = {
      phase: 'fadeOut',
      progress: 0,
      levelNumber: nextLevel,
    };

    // Animate transition
    const transitionInterval = setInterval(() => {
      const transition = levelTransitionRef.current;
      if (!transition) {
        clearInterval(transitionInterval);
        return;
      }

      transition.progress += 0.033; // ~30fps

      if (transition.phase === 'fadeOut' && transition.progress >= 1) {
        transition.phase = 'display';
        transition.progress = 0;
        // Load new level during display phase
        loadLevel(nextLevel, gameWidth, gameHeight);
      } else if (transition.phase === 'display' && transition.progress >= 1) {
        transition.phase = 'fadeIn';
        transition.progress = 0;
      } else if (transition.phase === 'fadeIn' && transition.progress >= 1) {
        levelTransitionRef.current = null;
        statusRef.current = 'playing';
        setStatus('playing');
        clearInterval(transitionInterval);
      }
    }, 33);
  }, [gameWidth, gameHeight, soundEnabled, playWinSound, hapticBBLevelComplete, showEpicCallout, triggerConfetti, addScorePopup, loadLevel, triggerFreezeFrame]);

  const handleGameOver = useCallback(async () => {
    // CAPTURE SCREENSHOT FIRST - before any visual changes
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        const screenshot = canvas.toDataURL('image/png');
        setGameScreenshot(screenshot);
      } catch (e) {
        console.warn('[BrickBreaker] Failed to capture screenshot:', e);
      }
    }

    statusRef.current = 'gameover';
    setStatus('gameover');

    // Stop anticipation sound if playing
    if (anticipationPlayingRef.current) {
      stopBrickBreakerAnticipationLoop();
      anticipationPlayingRef.current = false;
    }

    // Stop fireball loop sound if playing
    if (fireballLoopPlayingRef.current) {
      stopBrickBreakerFireballLoop();
      fireballLoopPlayingRef.current = false;
    }

    if (soundEnabled) playGameOver();
    hapticGameOver();
    triggerScreenShake(40);

    // Submit score
    if (isSignedIn) {
      try {
        const result = await submitScore(scoreRef.current, levelRef.current, {
          highestLevel: levelRef.current,
          bricksDestroyed: totalBricksDestroyedRef.current,
        });
        if (result?.isNewHighScore) {
          setIsNewHighScore(true);
        }
        setSubmitted(true);
      } catch {
        // Ignore submission errors
      }
    }
  }, [soundEnabled, playGameOver, hapticGameOver, triggerScreenShake, isSignedIn, submitScore, stopBrickBreakerAnticipationLoop, stopBrickBreakerFireballLoop]);

  // Keep handleGameOverRef in sync
  useEffect(() => { handleGameOverRef.current = handleGameOver; }, [handleGameOver]);

  // =============================================================================
  // RENDERING
  // =============================================================================

  const render = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    // Count breakable bricks for last bricks highlight (Enhancement #36)
    const breakableBrickCount = bricksRef.current.filter(
      (b) => b.type !== 'unbreakable' && b.hits > 0
    ).length;
    const isLastBricks = breakableBrickCount > 0 && breakableBrickCount <= 3;
    const pulsePhase = Math.sin(animationTimeRef.current * 0.005) * 0.5 + 0.5; // 0-1 pulse

    // Draw bricks
    bricksRef.current.forEach((brick) => {
      if (brick.hits <= 0) return;

      // Last bricks highlight (Enhancement #36) - pulsing glow
      if (isLastBricks && brick.type !== 'unbreakable') {
        ctx.save();
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 15 + pulsePhase * 15;
        ctx.fillStyle = `rgba(255, 255, 0, ${0.2 + pulsePhase * 0.3})`;
        ctx.beginPath();
        ctx.roundRect(brick.x - 3, brick.y - 3, brick.width + 6, brick.height + 6, 6);
        ctx.fill();
        ctx.restore();
      }

      // Brick gradient
      const gradient = ctx.createLinearGradient(
        brick.x,
        brick.y,
        brick.x,
        brick.y + brick.height
      );

      if (brick.type === 'normal') {
        gradient.addColorStop(0, '#FF8533');
        gradient.addColorStop(1, '#FF6B00');
      } else if (brick.type === 'strong') {
        gradient.addColorStop(0, brick.hits === 2 ? '#FF6666' : '#FF3333');
        gradient.addColorStop(1, brick.hits === 2 ? '#FF4444' : '#CC0000');
      } else {
        gradient.addColorStop(0, '#666666');
        gradient.addColorStop(1, '#444444');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
      ctx.fill();

      // Highlight
      ctx.fillStyle = 'var(--color-white-20)';
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height / 3);

      // Crack effect for damaged strong bricks
      if (brick.type === 'strong' && brick.hits === 1) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(brick.x + brick.width * 0.3, brick.y);
        ctx.lineTo(brick.x + brick.width * 0.5, brick.y + brick.height * 0.5);
        ctx.lineTo(brick.x + brick.width * 0.7, brick.y + brick.height);
        ctx.stroke();
      }
    });

    // Draw paddle with squash effect (Enhancement #26)
    const paddle = paddleRef.current;
    ctx.save();
    // Apply squash transform centered on paddle
    ctx.translate(paddle.x + paddle.width / 2, paddle.y + paddle.height / 2);
    ctx.scale(1, paddle.squashY);
    ctx.translate(-(paddle.x + paddle.width / 2), -(paddle.y + paddle.height / 2));

    const paddleGradient = ctx.createLinearGradient(
      paddle.x,
      paddle.y,
      paddle.x,
      paddle.y + paddle.height
    );
    paddleGradient.addColorStop(0, '#FF8533');
    paddleGradient.addColorStop(1, '#FF6B00');

    ctx.fillStyle = paddleGradient;
    ctx.shadowColor = '#FF6B00';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Draw balls with squash/stretch (Enhancements #25, #27, #31)
    const comboCount = comboCountRef.current;
    const trailColor = getComboTrailColor(comboCount);

    ballsRef.current.forEach((ball) => {
      // Trail effect with combo-based colors (Enhancement #31)
      const trailLength = 5;
      for (let i = trailLength; i > 0; i--) {
        const alpha = 0.15 * (1 - i / trailLength);
        ctx.beginPath();
        ctx.arc(
          ball.x - ball.vx * i * 0.5,
          ball.y - ball.vy * i * 0.5,
          Math.max(1, ball.radius - i),
          0,
          Math.PI * 2
        );
        // Use combo color for trail, or fireball color
        if (ball.isFireball) {
          ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
        } else {
          // Parse combo color and apply alpha
          const r = parseInt(trailColor.slice(1, 3), 16);
          const g = parseInt(trailColor.slice(3, 5), 16);
          const b = parseInt(trailColor.slice(5, 7), 16);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        ctx.fill();
      }

      // Main ball with squash/stretch
      ctx.save();
      ctx.translate(ball.x, ball.y);

      // Apply velocity-based stretch (Enhancement #27)
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const velocityStretch = 1 + Math.min(speed / 20, 0.3);
      const angle = Math.atan2(ball.vy, ball.vx);
      ctx.rotate(angle);

      // Combine impact squash with velocity stretch
      const finalScaleX = ball.squashX * velocityStretch;
      const finalScaleY = ball.squashY / velocityStretch;
      ctx.scale(finalScaleX, finalScaleY);

      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);

      if (ball.isFireball) {
        ctx.fillStyle = '#FF4400';
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 20;
      } else {
        ctx.fillStyle = '#FF6B00';
        ctx.shadowColor = '#FF6B00';
        ctx.shadowBlur = 10;
      }

      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    });

    // Draw powerups with pulsing glow (Enhancement #32)
    const powerupPulse = Math.sin(animationTimeRef.current * 0.008) * 0.5 + 0.5;
    powerupsRef.current.forEach((powerup) => {
      const baseColor = POWERUP_COLORS[powerup.type];
      const glowRadius = POWERUP_RADIUS + 5 + powerupPulse * 8;

      // Outer pulsing glow
      ctx.save();
      ctx.globalAlpha = 0.3 + powerupPulse * 0.3;
      ctx.beginPath();
      ctx.arc(powerup.x, powerup.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = baseColor;
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 20 + powerupPulse * 10;
      ctx.fill();
      ctx.restore();

      // Main powerup circle
      ctx.beginPath();
      ctx.arc(powerup.x, powerup.y, POWERUP_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = baseColor;
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Icon
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(POWERUP_ICONS[powerup.type], powerup.x, powerup.y);
    });

    // Draw particles
    particlesRef.current.forEach((particle) => {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3 * particle.life, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.life;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Draw impact flashes (Enhancement #28)
    impactFlashesRef.current.forEach((flash) => {
      ctx.save();
      ctx.globalAlpha = flash.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw brick shards (Enhancement #29)
    brickShardsRef.current.forEach((shard) => {
      ctx.save();
      ctx.globalAlpha = shard.alpha;
      ctx.translate(shard.x, shard.y);
      ctx.rotate(shard.rotation);
      ctx.fillStyle = shard.color;
      ctx.fillRect(-shard.width / 2, -shard.height / 2, shard.width, shard.height);
      ctx.restore();
    });

    // Draw score popups
    scorePopupsRef.current.forEach((popup) => {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.globalAlpha = popup.life;
      ctx.fillText(popup.text, popup.x, popup.y - (1 - popup.life) * 30);
      ctx.globalAlpha = 1;
    });

    // Draw ember particles (Enhancement #34)
    emberParticlesRef.current.forEach((ember) => {
      ctx.save();
      ctx.globalAlpha = ember.alpha;
      ctx.fillStyle = ember.color;
      ctx.shadowColor = ember.color;
      ctx.shadowBlur = ember.size * 2;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw near-miss visual indicator (Enhancement #35)
    if (nearMissVisualRef.current) {
      const nearMiss = nearMissVisualRef.current;
      ctx.save();
      ctx.globalAlpha = nearMiss.alpha * 0.6;
      // Red flash at bottom of screen near miss location
      const gradient = ctx.createRadialGradient(
        nearMiss.x, gameHeight - 40, 0,
        nearMiss.x, gameHeight - 40, 60
      );
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(nearMiss.x - 60, gameHeight - 80, 120, 80);
      ctx.restore();
    }

    // Draw screen flash (Enhancement #33)
    if (screenFlashRef.current) {
      ctx.save();
      ctx.globalAlpha = screenFlashRef.current.alpha;
      ctx.fillStyle = screenFlashRef.current.color;
      ctx.fillRect(0, 0, gameWidth, gameHeight);
      ctx.restore();
    }

    // Draw ball approaching paddle warning (Enhancement #39)
    // Note: 'paddle' was declared earlier in this function
    ballsRef.current.forEach((ball) => {
      // Only show if ball is moving downward and in upper 70% of screen
      if (ball.vy <= 0 || ball.y > gameHeight * 0.7) return;

      // Calculate where ball will intersect paddle Y
      const timeToReach = (paddle.y - ball.y) / ball.vy;
      if (timeToReach < 0 || timeToReach > 60) return; // Only show when close

      const predictedX = ball.x + ball.vx * timeToReach;

      // Don't show if predicted position is off screen
      if (predictedX < 0 || predictedX > gameWidth) return;

      // Draw subtle indicator above paddle
      const alpha = Math.max(0, 1 - timeToReach / 60) * 0.6;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(predictedX, paddle.y - 8, 5, 0, Math.PI * 2);
      ctx.fill();
      // Add vertical line
      ctx.strokeStyle = 'var(--color-white-30)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(predictedX, ball.y);
      ctx.lineTo(predictedX, paddle.y - 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    });

    // Draw spawn effects (Enhancement #40)
    spawnEffectsRef.current.forEach((effect) => {
      ctx.save();
      ctx.globalAlpha = effect.alpha;
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // Draw powerup timer indicators (Enhancement #41)
    const currentTime = performance.now();
    activePowerupsRef.current.forEach((powerup, index) => {
      const remaining = powerup.expiresAt - currentTime;
      const progress = remaining / powerup.duration;

      if (progress <= 0) return;

      const x = 10;
      const y = 50 + index * 28;
      const width = 70;
      const height = 22;

      // Background
      ctx.fillStyle = 'var(--color-black-60)';
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 4);
      ctx.fill();

      // Progress bar
      const colors: Record<PowerupType, string> = {
        expand: '#00ff00',
        fireball: '#ff6600',
        slow: '#00ffff',
        multiball: '#ff00ff',
        extralife: '#ff0000',
      };
      ctx.fillStyle = colors[powerup.type];
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, (width - 4) * progress, height - 4, 2);
      ctx.fill();

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(powerup.type.toUpperCase().slice(0, 4), x + 6, y + 15);

      // Flash when about to expire
      if (remaining < 2000) {
        const flashAlpha = 0.5 + Math.sin(currentTime * 0.015) * 0.5;
        ctx.save();
        ctx.globalAlpha = flashAlpha;
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 4);
        ctx.stroke();
        ctx.restore();
      }
    });

    // Draw combo meter (Enhancement #43) - SMART POSITIONING based on brick locations
    const combo = comboCountRef.current;
    if (combo >= 2) {
      const comboWidth = 80;
      const comboHeight = 15;

      // Find brick bounds to determine safe zone for combo meter
      const remainingBricks = bricksRef.current.filter(b => b.hits > 0 && b.type !== 'unbreakable');
      let lowestBrickY = 0;
      let highestBrickY = gameHeight;

      remainingBricks.forEach(brick => {
        const brickBottom = brick.y + brick.height;
        if (brickBottom > lowestBrickY) lowestBrickY = brickBottom;
        if (brick.y < highestBrickY) highestBrickY = brick.y;
      });

      // Smart Y positioning:
      // - If bricks extend into lower half (lowestBrickY > gameHeight * 0.4), combo at TOP
      // - If bricks only at top (lowestBrickY <= gameHeight * 0.4), combo BELOW bricks
      // - Paddle safe zone: never below gameHeight - 120
      let comboY: number;
      const paddleSafeZone = gameHeight - 120;

      if (remainingBricks.length === 0 || lowestBrickY > gameHeight * 0.4) {
        // Bricks extend into middle/lower area OR no bricks - put combo at TOP
        comboY = 15;
      } else {
        // Bricks only at top - put combo BELOW the lowest brick
        comboY = Math.min(lowestBrickY + 20, paddleSafeZone - 40);
      }

      // X position: centered, away from edges
      const comboX = gameWidth / 2 - comboWidth / 2;

      // Calculate time remaining in combo (500ms timeout)
      const comboElapsed = currentTime - comboTimerStartRef.current;
      const comboProgress = Math.max(0, 1 - comboElapsed / 500);

      // Meter background
      ctx.fillStyle = 'var(--color-black-60)';
      ctx.beginPath();
      ctx.roundRect(comboX, comboY, comboWidth, comboHeight, 4);
      ctx.fill();

      // Meter fill (time remaining)
      const meterColor = combo >= 10 ? '#ff00ff' : combo >= 5 ? '#ffd700' : '#ff8c00';
      ctx.fillStyle = meterColor;
      ctx.beginPath();
      ctx.roundRect(comboX + 2, comboY + 2, (comboWidth - 4) * comboProgress, comboHeight - 4, 2);
      ctx.fill();

      // Combo count above meter
      ctx.save();
      if (combo >= 5) {
        ctx.shadowColor = meterColor;
        ctx.shadowBlur = 10 + Math.sin(currentTime * 0.01) * 5;
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`x${combo}`, comboX + comboWidth / 2, comboY - 6);
      ctx.restore();
    }

    // Draw combo break effect (Enhancement #45) - positioned in upper third, away from paddle safe zone
    if (comboBreakEffectRef.current) {
      const breakEffect = comboBreakEffectRef.current;
      ctx.save();
      ctx.globalAlpha = breakEffect.alpha * 0.6;
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`COMBO LOST x${breakEffect.combo}`, gameWidth / 2, gameHeight * 0.25);
      ctx.restore();
    }

    // Draw level transition (Enhancement #42)
    const transition = levelTransitionRef.current;
    if (transition) {
      ctx.save();
      let overlayAlpha = 0;

      if (transition.phase === 'fadeOut') {
        overlayAlpha = transition.progress;
      } else if (transition.phase === 'display') {
        overlayAlpha = 1;
      } else if (transition.phase === 'fadeIn') {
        overlayAlpha = 1 - transition.progress;
      }

      // Dark overlay
      ctx.globalAlpha = overlayAlpha * 0.9;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, gameWidth, gameHeight);

      // Level text (only during display phase)
      if (transition.phase === 'display') {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FF6B00';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#FF6B00';
        ctx.shadowBlur = 20;
        ctx.fillText(`LEVEL ${transition.levelNumber}`, gameWidth / 2, gameHeight / 2);
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    // UI is now rendered as React overlay (not on canvas)
  }, [gameWidth, gameHeight, getComboTrailColor]);

  // =============================================================================
  // GAME LOOP
  // =============================================================================

  // Ref for gameLoop to allow recursive calls
  const gameLoopRef = useRef<(() => void) | null>(null);

  const gameLoop = useCallback(() => {
    if (statusRef.current !== 'playing' || showExitDialogRef.current) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Get current time for animations
    const now = performance.now();
    animationTimeRef.current = now;
    frameTimeRef.current = now;

    // Freeze frame check (Enhancement #37)
    if (now < freezeFrameUntilRef.current) {
      // Still frozen - just render, don't update
      render(ctx);
      animationFrameRef.current = requestAnimationFrame(() => gameLoopRef.current?.());
      return;
    }

    // Update balls
    ballsRef.current.forEach((ball) => {
      ball.x += ball.vx;
      ball.y += ball.vy;

      checkWallCollision(ball);
      checkPaddleCollision(ball);

      const { destroyed, brick } = checkBrickCollision(ball);
      if (brick) {
        onBrickHit(brick, destroyed);
      }
    });

    // Check for near-miss (ball barely missed paddle)
    const paddle = paddleRef.current;
    ballsRef.current.forEach((ball) => {
      // Ball passed paddle level and is moving down, but didn't hit
      if (
        ball.vy > 0 &&
        ball.y > paddle.y &&
        ball.y < paddle.y + 30 &&
        !nearMissCooldownRef.current
      ) {
        // Check if ball was close to paddle edges (within 25px)
        const distanceFromPaddleLeft = Math.abs(ball.x - paddle.x);
        const distanceFromPaddleRight = Math.abs(ball.x - (paddle.x + paddle.width));
        const minDistance = Math.min(distanceFromPaddleLeft, distanceFromPaddleRight);

        if (minDistance < 25 && minDistance > 0) {
          hapticBBNearMiss(); // Ultra-light warning
          triggerNearMissVisual(ball.x); // Enhancement #35 - Visual feedback
          nearMissCooldownRef.current = true;
          // Reset cooldown after 500ms
          setTimeout(() => {
            nearMissCooldownRef.current = false;
          }, 500);
        }
      }
    });

    // Check for lost balls
    ballsRef.current = ballsRef.current.filter((ball) => ball.y - ball.radius <= gameHeight);

    if (ballsRef.current.length === 0) {
      handleBallLost();
    }

    // Update powerups
    powerupsRef.current.forEach((powerup) => {
      powerup.y += powerup.vy;
    });

    // Check powerup collision with paddle (reuse paddle from near-miss check)
    powerupsRef.current = powerupsRef.current.filter((powerup) => {
      if (
        powerup.y + POWERUP_RADIUS >= paddle.y &&
        powerup.x >= paddle.x &&
        powerup.x <= paddle.x + paddle.width
      ) {
        applyPowerup(powerup.type);
        return false;
      }
      return powerup.y < gameHeight;
    });

    // Update particles
    particlesRef.current.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1; // Gravity
      particle.life -= 0.02;
    });
    particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

    // Generate ember particles for fireball mode (Enhancement #34)
    ballsRef.current.forEach((ball) => {
      if (ball.isFireball && Math.random() < 0.3) {
        emberParticlesRef.current.push({
          x: ball.x + (Math.random() - 0.5) * ball.radius * 2,
          y: ball.y + (Math.random() - 0.5) * ball.radius * 2,
          vx: (Math.random() - 0.5) * 2 - ball.vx * 0.1,
          vy: -Math.random() * 2 - 1, // Float upward
          size: 2 + Math.random() * 3,
          alpha: 1,
          color: Math.random() > 0.5 ? '#ff4400' : '#ffaa00',
        });
      }
    });

    // Update ember particles
    emberParticlesRef.current.forEach((ember) => {
      ember.x += ember.vx;
      ember.y += ember.vy;
      ember.alpha -= 0.04;
      ember.size *= 0.97;
    });
    emberParticlesRef.current = emberParticlesRef.current.filter((e) => e.alpha > 0);

    // Update screen flash (Enhancement #33)
    if (screenFlashRef.current) {
      screenFlashRef.current.alpha -= 0.02;
      if (screenFlashRef.current.alpha <= 0) {
        screenFlashRef.current = null;
      }
    }

    // Update near-miss visual (Enhancement #35)
    if (nearMissVisualRef.current) {
      nearMissVisualRef.current.alpha -= 0.08;
      if (nearMissVisualRef.current.alpha <= 0) {
        nearMissVisualRef.current = null;
      }
    }

    // Update spawn effects (Enhancement #40)
    spawnEffectsRef.current.forEach((effect) => {
      effect.radius += 2;
      effect.alpha -= 0.05;
    });
    spawnEffectsRef.current = spawnEffectsRef.current.filter((e) => e.alpha > 0);

    // Update combo break effect (Enhancement #45)
    if (comboBreakEffectRef.current) {
      comboBreakEffectRef.current.alpha -= 0.03;
      if (comboBreakEffectRef.current.alpha <= 0) {
        comboBreakEffectRef.current = null;
      }
    }

    // Update ball squash recovery (Enhancement #25, #27)
    ballsRef.current.forEach((ball) => {
      const recovery = 0.15; // Per frame recovery
      ball.squashX += (1 - ball.squashX) * recovery;
      ball.squashY += (1 - ball.squashY) * recovery;
    });

    // Update paddle squash recovery (Enhancement #26)
    paddleRef.current.squashY += (1 - paddleRef.current.squashY) * 0.2;

    // Update impact flashes (Enhancement #28)
    impactFlashesRef.current.forEach((flash) => {
      flash.radius += 3;
      flash.alpha -= 0.15;
    });
    impactFlashesRef.current = impactFlashesRef.current.filter((f) => f.alpha > 0);

    // Update brick shards (Enhancement #29)
    const gravity = 0.3;
    brickShardsRef.current.forEach((shard) => {
      shard.x += shard.vx;
      shard.y += shard.vy;
      shard.vy += gravity;
      shard.rotation += shard.rotationSpeed;
      shard.alpha -= 0.02;
    });
    brickShardsRef.current = brickShardsRef.current.filter(
      (s) => s.alpha > 0 && s.y < gameHeight + 50
    );

    // Update score popups
    scorePopupsRef.current.forEach((popup) => {
      popup.life -= 0.02;
    });
    scorePopupsRef.current = scorePopupsRef.current.filter((p) => p.life > 0);

    // Check level complete
    const breakableBricks = bricksRef.current.filter(
      (b) => b.type !== 'unbreakable' && b.hits > 0
    );

    // Start/stop anticipation sound based on remaining bricks
    if (breakableBricks.length <= 3 && breakableBricks.length > 0) {
      if (!anticipationPlayingRef.current && soundEnabled) {
        startBrickBreakerAnticipationLoop();
        anticipationPlayingRef.current = true;
      }
    } else if (anticipationPlayingRef.current) {
      stopBrickBreakerAnticipationLoop();
      anticipationPlayingRef.current = false;
    }

    if (breakableBricks.length === 0) {
      // Stop anticipation on level complete
      if (anticipationPlayingRef.current) {
        stopBrickBreakerAnticipationLoop();
        anticipationPlayingRef.current = false;
      }
      handleLevelComplete();
      return;
    }

    // Render
    render(ctx);

    animationFrameRef.current = requestAnimationFrame(() => gameLoopRef.current?.());
  }, [
    gameHeight,
    checkWallCollision,
    checkPaddleCollision,
    checkBrickCollision,
    onBrickHit,
    handleBallLost,
    handleLevelComplete,
    applyPowerup,
    render,
    soundEnabled,
    startBrickBreakerAnticipationLoop,
    stopBrickBreakerAnticipationLoop,
    hapticBBNearMiss,
    triggerNearMissVisual,
  ]);

  // Keep gameLoopRef in sync
  useEffect(() => { gameLoopRef.current = gameLoop; }, [gameLoop]);

  // =============================================================================
  // INPUT HANDLERS
  // =============================================================================

  // Track last mouse X position for delta-based mouse movement
  const lastMouseXRef = useRef<number | null>(null);

  // Move paddle by delta (relative movement)
  const movePaddleByDelta = useCallback((delta: number) => {
    const paddle = paddleRef.current;
    paddle.x = Math.max(
      0,
      Math.min(paddle.x + delta, gameWidth - paddle.width)
    );
  }, [gameWidth]);

  // Touch handling via useGameTouch hook - provides dx (delta) directly
  const touchHandlers = useGameTouch({
    onDrag: (_x, _y, dx) => {
      if (statusRef.current === 'playing') {
        movePaddleByDelta(dx);
      }
    },
    onTap: () => {
      if (statusRef.current === 'idle') {
        startGame();
      }
    },
    preventScroll: true,
  });

  // Mouse handling (still needed for desktop - useGameTouch is touch-only)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (statusRef.current !== 'playing') return;
    if (lastMouseXRef.current !== null) {
      const delta = e.clientX - lastMouseXRef.current;
      movePaddleByDelta(delta);
    }
    lastMouseXRef.current = e.clientX;
  }, [movePaddleByDelta]);

  const handleCanvasClick = useCallback(() => {
    if (statusRef.current === 'idle') {
      startGame();
    }
  }, [startGame]);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Sync exit dialog ref with state for game loop
  useEffect(() => {
    showExitDialogRef.current = showExitDialog;
  }, [showExitDialog]);

  // Set up game dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (isMobile && containerRef.current) {
        const width = window.innerWidth;
        const height = window.innerHeight - 105;
        setGameWidth(width);
        setGameHeight(height);
      } else {
        // Force desktop dimensions - always use current constants
        setGameWidth(DESKTOP_WIDTH);
        setGameHeight(DESKTOP_HEIGHT);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isMobile]);

  // Force dimension sync when not playing (handles HMR constant changes)
  useEffect(() => {
    if (status === 'idle' && !isMobile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: sync dimensions on status/screen change
      setGameWidth(DESKTOP_WIDTH);
      setGameHeight(DESKTOP_HEIGHT);
    }
  }, [status, isMobile]);

  // Start game loop when playing
  useEffect(() => {
    if (status === 'playing') {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Clean up combo timeout to prevent memory leaks
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };
  }, [status, gameLoop]);

  // Global mouse tracking - paddle follows mouse anywhere on screen while playing
  // (Touch is handled by useGameTouch hook on the container)
  useEffect(() => {
    if (status !== 'playing') {
      // Reset tracking when not playing
      lastMouseXRef.current = null;
      return;
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (lastMouseXRef.current !== null) {
        const delta = e.clientX - lastMouseXRef.current;
        movePaddleByDelta(delta);
      }
      lastMouseXRef.current = e.clientX;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [status, movePaddleByDelta]);

  // Render idle screen
  useEffect(() => {
    if (status === 'idle') {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, gameWidth, gameHeight);

      ctx.fillStyle = '#FF6B00';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('BRICK BREAKER', gameWidth / 2, gameHeight / 2 - 40);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '20px Arial';
      ctx.fillText('Tap or Click to Start', gameWidth / 2, gameHeight / 2 + 20);
    }
  }, [status, gameWidth, gameHeight]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div
      ref={containerRef}
      className={`brick-breaker-container ${isMobile ? 'mobile' : ''}`}
      {...touchHandlers}
    >
      <GameSEO
        gameName="Brick Breaker"
        gameSlug="brick-breaker"
        description="Smash bricks with your paddle and ball! Collect powerups, clear levels, and chase high scores in this classic breakout-style arcade game."
        genre="Arcade"
        difficulty="Medium"
      />
      {/* Control buttons */}
      <button
        className="bb-back-btn"
        onClick={() => navigate('/games')}
        aria-label="Back to games"
      >
        ←
      </button>
      <button
        className="bb-sound-btn"
        onClick={() => setSoundEnabled(!soundEnabled)}
        aria-label={soundEnabled ? 'Mute' : 'Unmute'}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>

      {/* Stats Overlay - floating outside the canvas like Memory Match */}
      {status === 'playing' && (
        <div className="bb-stats-overlay">
          <div className="bb-stat level-stat">
            <span className="bb-stat-label">Level</span>
            <span className="bb-stat-value">{level}</span>
          </div>
          <div className="bb-stat score-stat">
            <span className="bb-stat-label">Score</span>
            <span className="bb-stat-value">{score}</span>
          </div>
          <div className="bb-stat lives-stat">
            <span className="bb-stat-label">Lives</span>
            <span className="bb-stat-value">{'❤️'.repeat(lives)}</span>
          </div>
        </div>
      )}

      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        width={gameWidth}
        height={gameHeight}
        className="bb-canvas"
        onMouseMove={handleMouseMove}
        onClick={handleCanvasClick}
      />

      {/* Game Over - Uses shared component */}
      {status === 'gameover' && (
        <ArcadeGameOverScreen
          score={score}
          highScore={globalLeaderboard[0]?.score || 0}
          scoreLabel="points"
          isNewPersonalBest={isNewHighScore}
          isSignedIn={isSignedIn}
          scoreSubmitted={submitted}
          leaderboard={globalLeaderboard}
          onPlayAgain={startGame}
          onShare={handleShare}
          accentColor="#ef4444"
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
}
