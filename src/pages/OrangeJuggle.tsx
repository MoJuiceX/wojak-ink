import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useGameHaptics } from '@/systems/haptics';
import { useGameNavigationGuard } from '@/hooks/useGameNavigationGuard';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { GameSEO } from '@/components/seo/GameSEO';
import { ArcadeGameOverScreen } from '@/components/media/games/ArcadeGameOverScreen';
// import { useMedia } from '@/contexts/MediaContext'; // Temporarily disabled
import './OrangeJuggle.css';


// Game constants
const PADDLE_SIZE = 150; // Match the sprite display size
const PADDLE_COLLISION_RADIUS = 50; // Smaller hit area - orange must touch orangutan
const ORANGE_SIZE = 56; // Bigger oranges for better visibility
const POWERUP_SIZE = 35;
const BOUNCE_DAMPING = 0.7;
const HIT_VELOCITY = -7; // Gentle upward bounce

// Speed modifiers for power-ups (stacking)
// Bananas: 1=1.5x, 2=2x, 3=2.5x faster
// Rums: 1=0.7x, 2=0.5x, 3=0.3x + reversed
const BANANA_SPEEDS = [1, 1.5, 2.0, 2.5]; // Index = banana count
const RUM_SPEEDS = [1, 0.7, 0.5, 0.3]; // Index = rum count
const POWERUP_FALL_SPEED = 2; // Power-ups fall slowly at constant speed
const RUMS_FOR_REVERSE = 1; // Number of rums to trigger reversed controls (1 = immediate)

// Orangutan sprite (2 frames: left hands up, right hands up)

// Combo decay - reset combo if no hits for this duration (ms)
const COMBO_DECAY_TIME = 2500;

// Level configuration - 5 levels, progressively harder
// Level 1: Just oranges (learn to juggle)
// Level 2+: Rum spawns (1st = reverse controls, 2nd = slower, 3rd = even slower)
// Level 3+: Bananas spawn (speed boost + clears rum effects)
// Camels: hitting one = restart from level 1
// camelChance: probability (0-1) of spawning a camel every few seconds
const LEVEL_CONFIG = {
  1: { oranges: 1, rumEnabled: false, bananaEnabled: false, gravity: 0.12, time: 15, targetScore: 500, camelChance: 0, chaos: 1.0 },
  2: { oranges: 1, rumEnabled: true, bananaEnabled: false, gravity: 0.13, time: 20, targetScore: 2000, camelChance: 0.10, chaos: 1.3 },
  3: { oranges: 2, rumEnabled: true, bananaEnabled: true, gravity: 0.14, time: 25, targetScore: 5000, camelChance: 0.15, chaos: 1.6 },
  4: { oranges: 2, rumEnabled: true, bananaEnabled: true, gravity: 0.15, time: 30, targetScore: 10000, camelChance: 0.20, chaos: 2.0 },
  5: { oranges: 3, rumEnabled: true, bananaEnabled: true, gravity: 0.16, time: 40, targetScore: 0, camelChance: 0.25, chaos: 2.5 },
};

// Camel behavior constants
const CAMEL_SIZE = 50;
const CAMEL_SPAWN_INTERVAL = 2500; // Check for camel spawn every 2.5 seconds
const CAMEL_BOUNCE_VELOCITY = -8; // Small bounce when hitting bottom
const CAMEL_JUMP_VELOCITY = -14; // Jump off screen after bounce

// Camel spawn patterns - makes them more interesting
type CamelPattern = 'straight' | 'arc-left' | 'arc-right' | 'diagonal-left' | 'diagonal-right';
const CAMEL_PATTERNS: CamelPattern[] = ['straight', 'arc-left', 'arc-right', 'diagonal-left', 'diagonal-right'];

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

interface GameObject {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'orange' | 'golden' | 'banana' | 'rum' | 'camel';
  wasHit: boolean; // True if player has hit this orange at least once (actively juggling)
  bounceCount?: number; // For camels: track how many times they've bounced
  pattern?: CamelPattern; // Movement pattern for camels
  // Visual juice properties
  squashX: number; // Horizontal scale (1 = normal)
  squashY: number; // Vertical scale (1 = normal)
  trail: TrailPoint[]; // Motion trail for oranges
}

type GameState = 'menu' | 'playing' | 'levelComplete' | 'saveScore';
type GameMode = 'campaign';

const OrangeJuggle: React.FC = () => {
  const isMobile = useIsMobile();
  // Audio context for sound effects
  const { isBackgroundMusicPlaying, playBackgroundMusic, pauseBackgroundMusic } = useAudio();
  const {
    playGameStart, playLevelUp, playGameOver,
    // Orange Juggle specific sounds
    playOrangeJuggleHit, playOrangeDrop, playGoldenOrangeHit,
    playBananaCollect, playRumCollect, playCamelWarning, playCamelImpact,
    playOrangeJuggleCombo, playOrangeJuggleComboBreak,
    startRumAmbient, stopRumAmbient, startBananaAmbient, stopBananaAmbient,
    playOrangeJuggleLevelComplete, playArmSwing
  } = useGameSounds();
  const {
    hapticScore, hapticCombo, hapticHighScore, hapticGameOver, hapticLevelUp,
    // Orange Juggle specific haptics
    hapticOJOrangeHit, hapticOJGoldenHit, hapticOJOrangeDrop,
    hapticOJBananaCollect, hapticOJRumCollect,
    hapticOJCamelWarning, hapticOJCamelImpact, hapticOJLevelComplete
  } = useGameHaptics();
  // const { videoPlayer, musicPlayer } = useMedia(); // Temporarily disabled

  // Global leaderboard hook
  const {
    leaderboard: globalLeaderboard,
    submitScore,
    isSignedIn,
    userDisplayName,
    isSubmitting,
  } = useLeaderboard('orange-juggle');

  // Game state
  const [gameState, setGameState] = useState<GameState>('menu');

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

  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [orangutanBounce, setOrangutanBounce] = useState(false); // Visual bounce effect
  const [armSwing, setArmSwing] = useState<'left' | 'right' | null>(null); // JUICE: Track arm swing direction
  const [impactFlashes, setImpactFlashes] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const impactFlashIdRef = useRef(0);
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    alpha: number;
  }>>([]);
  const particleIdRef = useRef(0);
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0 });
  const freezeFrameUntilRef = useRef(0); // JUICE: Freeze frame until this timestamp
  // JUICE: Panic indicators for multiple falling oranges
  const [panicLevel, setPanicLevel] = useState(0); // 0-4 based on falling orange count
  const [landingIndicators, setLandingIndicators] = useState<Array<{ id: number; x: number }>>([]);
  const [lostByCamel, setLostByCamel] = useState(false); // Track if lost by hitting camel


  // High scores and leaderboard
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('orangeJuggleHighScore') || '0', 10);
  });
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);

  // Game objects
  const [objects, setObjects] = useState<GameObject[]>([]);
  const [paddleX, setPaddleX] = useState(0);
  const [paddleY, setPaddleY] = useState(0);

  // Power-up effects
  const [isReversed, setIsReversed] = useState(false); // UI state for reversed controls indicator
  const [rumCount, setRumCount] = useState(0); // UI state for rum count
  const [bananaCount, setBananaCount] = useState(0); // UI state for banana count

  // Refs - use refs for game loop to avoid stale closures
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const objectIdRef = useRef(0);
  const lastHitTimeRef = useRef(0);
  const goldenSpawnTimeRef = useRef(0);
  const paddleRef = useRef({ x: 0, y: 0 });
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const streakRef = useRef(0); // Consecutive hits for sound escalation (can exceed 10)
  const objectsRef = useRef<GameObject[]>([]); // Direct access to objects for game loop
  const speedModifierRef = useRef(1);
  const powerupTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const nextPowerupSpawnRef = useRef(0); // Time for next power-up spawn
  const nextCamelSpawnRef = useRef(0); // Time for next camel spawn check
  const rumCountRef = useRef(0); // Track consecutive rums for reversed controls
  const bananaCountRef = useRef(0); // Track consecutive bananas for speed boost
  const isReversedRef = useRef(false); // Whether controls are reversed

  // Refs for synchronous score submission (avoids stale closure in game loop)
  const isSignedInRef = useRef(isSignedIn);
  const scoreSubmittedRef = useRef(scoreSubmitted);
  const levelRef = useRef(level);
  const lostByCamelRef = useRef(lostByCamel);
  const submitScoreRef = useRef(submitScore);
  useEffect(() => { isSignedInRef.current = isSignedIn; }, [isSignedIn]);
  useEffect(() => { scoreSubmittedRef.current = scoreSubmitted; }, [scoreSubmitted]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { lostByCamelRef.current = lostByCamel; }, [lostByCamel]);
  useEffect(() => { submitScoreRef.current = submitScore; }, [submitScore]);

  // Ref for game loop to check dialog state
  const showExitDialogRef = useRef(false);


  // Keep exit dialog ref in sync with state
  useEffect(() => {
    showExitDialogRef.current = showExitDialog;
  }, [showExitDialog]);

  // Auto-start game when in menu state (on mount or after returning to menu)
  useEffect(() => {
    if (gameState === 'menu' && !gameMode) {
      startGame('campaign');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, gameMode]);

  // Background music disabled for now - can re-enable later
  // useEffect(() => {
  //   if (gameState === 'playing') {
  //     const isVideoPlaying = videoPlayer?.isPlaying;
  //     const isMusicPlaying = musicPlayer?.isPlaying;
  //     if (!isVideoPlaying && !isMusicPlaying && !isBackgroundMusicPlaying) {
  //       playBackgroundMusic();
  //     }
  //   }
  // }, [gameState, videoPlayer?.isPlaying, musicPlayer?.isPlaying, isBackgroundMusicPlaying, playBackgroundMusic]);


  // Trigger orangutan bounce animation
  const triggerOrangutanBounce = useCallback(() => {
    setOrangutanBounce(true);
    setTimeout(() => setOrangutanBounce(false), 100);
  }, []);

  // JUICE: Trigger arm swing animation based on hit position
  const triggerArmSwing = useCallback((hitX: number, paddleCenterX: number) => {
    const isLeftArm = hitX < paddleCenterX;
    setArmSwing(isLeftArm ? 'left' : 'right');
    // Play arm whoosh sound
    playArmSwing(isLeftArm);
    setTimeout(() => setArmSwing(null), 200);
  }, [playArmSwing]);

  // JUICE: Create impact flash at collision point
  const createImpactFlash = useCallback((x: number, y: number) => {
    const flashId = impactFlashIdRef.current++;
    setImpactFlashes(prev => [...prev, { id: flashId, x, y }]);
    // Remove flash after animation completes
    setTimeout(() => {
      setImpactFlashes(prev => prev.filter(f => f.id !== flashId));
    }, 300);
  }, []);

  // JUICE: Create particle burst at impact point
  const createParticleBurst = useCallback((x: number, y: number, currentCombo: number, isGolden: boolean) => {
    const count = isGolden ? 16 : 12;
    const colors = isGolden
      ? ['#ffd700', '#fff4b0', '#ffaa00', '#ffffff']
      : currentCombo >= 10
        ? ['#ff00ff', '#ff66ff', '#ffffff', '#ffaa00']
        : currentCombo >= 5
          ? ['#ffd700', '#ffaa00', '#ff8c00', '#ffffff']
          : ['#ff8c00', '#ffaa00', '#ff6b00', '#ffffff'];

    const newParticles = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 3 + Math.random() * 5;
      return {
        id: particleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // Bias upward
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 4,
        alpha: 1,
      };
    });

    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  // JUICE: Update particles each frame
  useEffect(() => {
    if (particles.length === 0 || gameState !== 'playing') return;

    const updateInterval = setInterval(() => {
      setParticles(prev => {
        return prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15, // Gravity
            alpha: p.alpha - 0.03,
          }))
          .filter(p => p.alpha > 0);
      });
    }, 16);

    return () => clearInterval(updateInterval);
  }, [particles.length, gameState]);

  // JUICE: Trigger freeze frame for impactful moments
  const triggerFreezeFrame = useCallback((duration: number) => {
    freezeFrameUntilRef.current = performance.now() + duration;
  }, []);

  // JUICE: Trigger screen shake with intensity and duration
  const triggerScreenShake = useCallback((intensity: number, duration: number = 150) => {
    const startTime = performance.now();
    const shakeInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      if (elapsed > duration) {
        clearInterval(shakeInterval);
        setScreenShake({ x: 0, y: 0 });
        return;
      }
      const progress = elapsed / duration;
      const currentIntensity = intensity * (1 - progress); // Decay
      setScreenShake({
        x: (Math.random() - 0.5) * 2 * currentIntensity,
        y: (Math.random() - 0.5) * 2 * currentIntensity,
      });
    }, 16);
  }, []);

  // Get current level config
  const getLevelConfig = useCallback(() => {
    return LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG[1];
  }, [level]);

  // Spawn an object
  const spawnObject = useCallback((type: 'orange' | 'golden' | 'banana' | 'rum' | 'camel') => {
    const width = gameAreaRef.current?.offsetWidth || 300;

    // Power-ups fall straight down, other objects use normal physics
    const isPowerup = type === 'banana' || type === 'rum';
    const isCamel = type === 'camel';

    // Default spawn values
    let spawnX = 50 + Math.random() * (width - 100);
    let spawnY = isPowerup ? -50 : 50 + Math.random() * 100;
    let spawnVx = 0;
    let spawnVy = isPowerup ? POWERUP_FALL_SPEED : 0;
    let pattern: CamelPattern | undefined = undefined;

    // Camel spawn patterns - more interesting movement!
    if (isCamel) {
      pattern = CAMEL_PATTERNS[Math.floor(Math.random() * CAMEL_PATTERNS.length)];

      switch (pattern) {
        case 'straight':
          // Fall straight down from random position
          spawnX = 50 + Math.random() * (width - 100);
          spawnY = -CAMEL_SIZE;
          spawnVx = 0;
          spawnVy = 2;
          break;
        case 'arc-left':
          // Start from right, arc to the left
          spawnX = width - 50;
          spawnY = -CAMEL_SIZE;
          spawnVx = -3 - Math.random() * 2;
          spawnVy = 1;
          break;
        case 'arc-right':
          // Start from left, arc to the right
          spawnX = 50;
          spawnY = -CAMEL_SIZE;
          spawnVx = 3 + Math.random() * 2;
          spawnVy = 1;
          break;
        case 'diagonal-left':
          // Start from upper right, move diagonally left
          spawnX = width - 30;
          spawnY = -CAMEL_SIZE;
          spawnVx = -2;
          spawnVy = 2.5;
          break;
        case 'diagonal-right':
          // Start from upper left, move diagonally right
          spawnX = 30;
          spawnY = -CAMEL_SIZE;
          spawnVx = 2;
          spawnVy = 2.5;
          break;
      }
    }

    const obj: GameObject = {
      id: objectIdRef.current++,
      x: spawnX,
      y: spawnY,
      vx: spawnVx,
      vy: spawnVy,
      type,
      wasHit: false,
      bounceCount: isCamel ? 0 : undefined,
      pattern: isCamel ? pattern : undefined,
      // Visual juice - start at normal scale
      squashX: 1,
      squashY: 1,
      trail: [], // Motion trail for fast-moving oranges
    };

    // Update both ref and state
    objectsRef.current = [...objectsRef.current, obj];
    setObjects(objectsRef.current);
    return obj;
  }, []);

  // Initialize game
  const startGame = useCallback((mode: GameMode) => {
    // Play game start sound + haptic
    playGameStart();
    hapticScore(); // Light tap on game start

    setGameMode(mode);
    setGameState('playing');
    setScore(0);
    setCombo(0);
    setScoreSubmitted(false);
    scoreSubmittedRef.current = false; // Reset ref for new game
    setIsNewPersonalBest(false);
    objectsRef.current = [];
    setObjects([]);
    // Reset refs
    objectIdRef.current = 0;
    goldenSpawnTimeRef.current = Date.now() + 15000;
    scoreRef.current = 0;
    comboRef.current = 0;
    streakRef.current = 0; // Reset streak for sound escalation
    lastHitTimeRef.current = Date.now(); // Start combo decay timer from now
    // Reset power-up state
    speedModifierRef.current = 1;
    rumCountRef.current = 0;
    bananaCountRef.current = 0;
    setRumCount(0);
    setBananaCount(0);
    isReversedRef.current = false;
    setIsReversed(false);
    if (powerupTimerRef.current) {
      clearTimeout(powerupTimerRef.current);
    }
    // Power-ups spawn after 5 seconds in levels that have them
    nextPowerupSpawnRef.current = Date.now() + 5000;
    // Camels start spawning after 3 seconds
    nextCamelSpawnRef.current = Date.now() + 3000;
    // Initialize paddle to center-bottom of screen
    const width = gameAreaRef.current?.offsetWidth || 300;
    const height = gameAreaRef.current?.offsetHeight || 500;
    const startX = (width - PADDLE_SIZE) / 2;
    const startY = height - PADDLE_SIZE; // Anchored at bottom
    setPaddleX(startX);
    setPaddleY(startY);
    paddleRef.current = { x: startX, y: startY };

    const config = mode === 'campaign'
      ? LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG]
      : LEVEL_CONFIG[1];

    setTimeLeft(config.time);

    // Spawn initial oranges
    for (let i = 0; i < config.oranges; i++) {
      setTimeout(() => spawnObject('orange'), i * 500);
    }
  }, [level, spawnObject, playGameStart, hapticScore]);

  // Start next level
  const startNextLevel = useCallback(() => {
    // Play level up sound + haptic
    playLevelUp();
    hapticLevelUp();

    const nextLevel = level + 1;
    if (nextLevel > 5) {
      // This shouldn't happen normally, but just in case
      setGameState('saveScore');
      return;
    }

    setLevel(nextLevel);
    setScoreSubmitted(false);
    scoreSubmittedRef.current = false; // Reset ref for new level
    objectsRef.current = [];
    setObjects([]);
    setCombo(0);
    comboRef.current = 0;
    streakRef.current = 0; // Reset streak for new level
    lastHitTimeRef.current = Date.now(); // Reset combo decay timer
    goldenSpawnTimeRef.current = Date.now() + 15000;
    // Reset power-up state for new level
    speedModifierRef.current = 1;
    rumCountRef.current = 0;
    bananaCountRef.current = 0;
    setRumCount(0);
    setBananaCount(0);
    isReversedRef.current = false;
    setIsReversed(false);
    if (powerupTimerRef.current) {
      clearTimeout(powerupTimerRef.current);
    }
    nextPowerupSpawnRef.current = Date.now() + 5000;
    nextCamelSpawnRef.current = Date.now() + 3000;

    const config = LEVEL_CONFIG[nextLevel as keyof typeof LEVEL_CONFIG];
    setTimeLeft(config.time);
    setGameState('playing');

    // Spawn oranges for new level
    for (let i = 0; i < config.oranges; i++) {
      setTimeout(() => spawnObject('orange'), i * 500);
    }
  }, [level, spawnObject, playLevelUp]);

  // Handle paddle movement - free horizontal, anchored at bottom with 10% vertical range
  // Speed modifier affects how quickly paddle reaches target position
  // Reversed controls: X movement is inverted (move right = go left)
  const updatePaddle = useCallback((clientX: number, clientY: number) => {
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate target position relative to game area
    let targetX = clientX - rect.left - PADDLE_SIZE / 2;
    let targetY = clientY - rect.top - PADDLE_SIZE / 2;

    // If controls are reversed, invert X around the center of the screen
    if (isReversedRef.current) {
      const centerX = rect.width / 2;
      targetX = centerX + (centerX - targetX) - PADDLE_SIZE / 2;
    }

    // Horizontal: allow 10% overflow on sides
    const overflowX = rect.width * 0.10;
    const minX = -overflowX;
    const maxX = rect.width - PADDLE_SIZE + overflowX;

    // Vertical: bottom of orangutan stays at lightbox bottom, can move 15% up
    // Sprite (120px) is centered in paddle (150px), so there's 15px gap at bottom
    const spriteOffset = 15; // Adjust for centered sprite
    const bottomPosition = rect.height - PADDLE_SIZE + spriteOffset;
    const minY = bottomPosition - (rect.height * 0.15); // Can move 15% up
    const maxY = bottomPosition; // Cannot go below - bottom stays at lightbox bottom

    targetX = Math.max(minX, Math.min(maxX, targetX));
    targetY = Math.max(minY, Math.min(maxY, targetY));

    // Apply smooth interpolation for fluid movement
    // Base smoothness factor (0.25 = smooth, 1.0 = instant)
    const baseSmoothness = 0.25;
    const speed = speedModifierRef.current;
    const currentX = paddleRef.current.x;
    const currentY = paddleRef.current.y;

    // Adjust smoothness based on power-ups
    // Banana (speed > 1): more responsive (higher lerp)
    // Rum (speed < 1): more sluggish (lower lerp)
    let lerpFactor;
    if (speed >= 1) {
      // Normal or fast - responsive but still smooth
      lerpFactor = baseSmoothness + (speed - 1) * 0.15; // 1.0 = 0.25, 2.5 = 0.475
      lerpFactor = Math.min(lerpFactor, 0.5); // Cap at 0.5 for some smoothness
    } else {
      // Slow (rum effect) - more sluggish
      lerpFactor = baseSmoothness * speed; // 0.5 = 0.125, very laggy
    }

    // Lerp toward target position
    const x = currentX + (targetX - currentX) * lerpFactor;
    const y = currentY + (targetY - currentY) * lerpFactor;

    setPaddleX(x);
    setPaddleY(y);
    // Update ref for collision detection (avoids stale closure)
    paddleRef.current = { x, y };
  }, []);

  // Use document-level mouse/touch events so paddle works even outside lightbox
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleMouseMove = (e: MouseEvent) => {
      updatePaddle(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      updatePaddle(e.touches[0].clientX, e.touches[0].clientY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [gameState, updatePaddle]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = () => {
      // Pause game loop when exit dialog is shown
      if (showExitDialogRef.current) {
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // JUICE: Freeze frame - skip physics updates but keep rendering
      if (performance.now() < freezeFrameUntilRef.current) {
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const width = gameAreaRef.current?.offsetWidth || 300;
      const height = gameAreaRef.current?.offsetHeight || 500;
      // Get gravity based on current level
      const gravity = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG]?.gravity || 0.3;

      // Track hits this frame
      let hitOrange = false;
      let hitGolden = false;
      let hitCamel = false;
      let hitPositionX = 0; // JUICE: Track where the hit occurred for arm swing
      let hitPositionY = 0; // JUICE: Track Y position for impact flash
      let collectedPowerup: 'banana' | 'rum' | null = null;
      const objectsToRemove: number[] = []; // IDs of objects to remove (power-ups and dropped oranges)
      const droppedOrangeIds: number[] = []; // Track which oranges were dropped this frame

      // Process objects directly using ref (avoids async state issues)
      const newObjects = objectsRef.current.map(obj => {
        let { x, y, vx, vy, type, id, wasHit, bounceCount, pattern, squashX, squashY, trail } = obj;
        // Get size based on object type
        const size = type === 'camel' ? CAMEL_SIZE
          : (type === 'banana' || type === 'rum') ? POWERUP_SIZE
          : ORANGE_SIZE;

        const isPowerup = type === 'banana' || type === 'rum';
        const isCamel = type === 'camel';

        // Apply gravity (not for power-ups at constant speed, camels use gravity)
        if (!isPowerup) {
          vy += gravity;
        }

        // Update position
        x += vx;
        y += vy;

        // Bounce off walls (left, right only - top is open)
        // Power-ups and camels don't bounce off walls - they just fall straight down
        if (!isPowerup && !isCamel) {
          if (x <= 0) {
            x = 0;
            vx = Math.abs(vx) * BOUNCE_DAMPING;
          }
          if (x >= width - size) {
            x = width - size;
            vx = -Math.abs(vx) * BOUNCE_DAMPING;
          }
        }

        // PADDLE COLLISION - check BEFORE bottom collision so we score points
        const objCenterX = x + size / 2;
        const objCenterY = y + size / 2;
        const paddleCenterX = paddleRef.current.x + PADDLE_SIZE / 2;
        // Collision point at orangutan's hands (top of sprite area)
        const paddleHandsY = paddleRef.current.y + 45; // Hands area
        const dx = objCenterX - paddleCenterX;
        const dy = objCenterY - paddleHandsY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const collisionRadius = size / 2 + PADDLE_COLLISION_RADIUS;

        let hitPaddle = false;
        // Only bounce if coming from above (vy > 0 means falling down)
        if (distance < collisionRadius && vy > 0) {
          hitPaddle = true;

          // Camel collision = game over!
          if (type === 'camel') {
            hitCamel = true;
          }
          // Power-ups are collected, not bounced
          else if (type === 'banana' || type === 'rum') {
            collectedPowerup = type;
            objectsToRemove.push(id);
          } else {
            // BOUNCE with randomness that increases per level (chaos multiplier)
            const currentConfig = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG[1];
            const chaos = currentConfig.chaos || 1.0;

            // Random height: base 0.7x to 1.4x, scaled by chaos
            const heightRange = 0.7 * chaos; // More chaos = bigger height variation
            const heightVariation = 0.7 + Math.random() * heightRange;
            vy = HIT_VELOCITY * heightVariation;

            // Random horizontal direction: scaled by chaos
            // Base direction from hit offset, plus random component that grows with chaos
            const hitOffset = dx / collisionRadius;
            const baseHorizontal = hitOffset * 3;
            const randomDirection = (Math.random() - 0.5) * (10 * chaos); // More chaos = more sideways
            vx = baseHorizontal + randomDirection;

            wasHit = true; // Mark as actively juggled

            // JUICE: Trigger squash on impact (compress vertically, expand horizontally)
            squashX = 1.4;
            squashY = 0.6;

            // Track what was hit and where (for arm swing and impact flash)
            hitPositionX = x + size / 2; // Center of the hit orange
            hitPositionY = y + size / 2;
            if (type === 'golden') {
              hitGolden = true;
            } else {
              hitOrange = true;
            }
          }
        }

        // JUICE: Squash recovery - smoothly return to normal scale
        const squashRecovery = 0.15;
        squashX += (1 - squashX) * squashRecovery;
        squashY += (1 - squashY) * squashRecovery;

        // JUICE: Update trail for oranges (only when moving fast)
        const isOrangeOrGolden = type === 'orange' || type === 'golden';
        if (isOrangeOrGolden) {
          const speed = Math.sqrt(vx * vx + vy * vy);
          // Add new trail point when moving fast
          if (speed > 4) {
            trail = [...trail, { x: x + size / 2, y: y + size / 2, alpha: 0.7 }];
          }
          // Update existing trail points (fade out)
          trail = trail
            .map(point => ({ ...point, alpha: point.alpha - 0.08 }))
            .filter(point => point.alpha > 0)
            .slice(-8); // Keep max 8 trail points
        }

        // Bottom collision - only if didn't hit paddle
        if (!hitPaddle && y >= height - size) {
          // Power-ups disappear when they hit the bottom (no penalty)
          if (type === 'banana' || type === 'rum') {
            objectsToRemove.push(id);
          }
          // Camel: bounce once, then jump off screen
          else if (type === 'camel') {
            y = height - size;
            if (bounceCount === 0) {
              // First bounce - small bounce
              vy = CAMEL_BOUNCE_VELOCITY;
              bounceCount = 1;
            } else {
              // Second hit - big jump to exit
              vy = CAMEL_JUMP_VELOCITY;
              bounceCount = 2;
            }
          } else {
            y = height - size;
            vy = -Math.abs(vy) * BOUNCE_DAMPING;

            // Track that this orange just hit the ground (for combo check)
            if ((type === 'orange' || type === 'golden') && wasHit) {
              droppedOrangeIds.push(id);
            }

            // Orange stopped bouncing = remove and respawn
            if ((type === 'orange' || type === 'golden') && Math.abs(vy) < 2) {
              objectsToRemove.push(id); // Remove dropped orange from game
              // Spawn a new orange to replace it
              if (type === 'orange') {
                setTimeout(() => spawnObject('orange'), 500);
              }
            }
          }
        }

        // Remove camels that have jumped off the top of the screen
        if (type === 'camel' && bounceCount === 2 && y < -CAMEL_SIZE) {
          objectsToRemove.push(id);
        }

        return { id, x, y, vx, vy, type, wasHit, bounceCount, pattern, squashX, squashY, trail };
      });

      // Filter out removed objects (collected power-ups and dropped oranges)
      const filteredObjects = objectsToRemove.length > 0
        ? newObjects.filter(obj => !objectsToRemove.includes(obj.id))
        : newObjects;

      // Update both ref and state
      objectsRef.current = filteredObjects;
      setObjects(filteredObjects);

      // JUICE: Calculate panic indicators for multiple falling oranges
      const fallingOranges = filteredObjects.filter(obj =>
        (obj.type === 'orange' || obj.type === 'golden') && obj.vy > 3 // Falling fast
      );
      const newPanicLevel = Math.min(fallingOranges.length - 1, 4);
      if (newPanicLevel !== panicLevel && newPanicLevel >= 0) {
        setPanicLevel(Math.max(0, newPanicLevel));
      } else if (newPanicLevel < 0 && panicLevel > 0) {
        setPanicLevel(0);
      }

      // Calculate landing indicators for falling oranges
      if (fallingOranges.length > 1) {
        const dangerZoneY = height - 80; // Near bottom
        const indicators = fallingOranges.map(orange => {
          // Predict landing position
          const timeToBottom = Math.max(0, (dangerZoneY - orange.y) / orange.vy);
          const predictedX = Math.max(0, Math.min(width, orange.x + orange.vx * timeToBottom));
          return { id: orange.id, x: predictedX };
        });
        setLandingIndicators(indicators);
      } else {
        if (landingIndicators.length > 0) {
          setLandingIndicators([]);
        }
      }

      // Check if combo should be reset (when a juggled orange hits the ground)
      if (droppedOrangeIds.length > 0) {
        // Play orange drop sound and haptic
        playOrangeDrop();
        hapticOJOrangeDrop(); // Long drop feeling

        // Count oranges that are actively being juggled:
        // - wasHit = true (player has hit it)
        // - vy < 0 (moving upward, meaning it was just hit and is in the air)
        const orangesActivelyJuggled = newObjects.filter(obj => {
          // Exclude oranges that just hit the ground this frame
          if (droppedOrangeIds.includes(obj.id)) return false;
          // Only count oranges (not power-ups)
          if (obj.type !== 'orange' && obj.type !== 'golden') return false;
          // Must have been hit at least once
          if (!obj.wasHit) return false;
          // Must be moving upward (was just hit) - this means actively juggled
          return obj.vy < 0;
        });

        // Reset combo if NO other oranges are actively being juggled (moving upward)
        if (orangesActivelyJuggled.length === 0) {
          // Play combo break sound if we had a combo going
          const lostCombo = comboRef.current;
          const lostStreak = streakRef.current;
          if (lostCombo >= 3) {
            playOrangeJuggleComboBreak(lostStreak); // Use streak for more dramatic break sound
          }
          comboRef.current = 0;
          streakRef.current = 0; // Reset streak when combo breaks
          setCombo(0);
        }
      }

      // Apply collected power-up (stacking effects)
      if (collectedPowerup) {
        if (collectedPowerup === 'banana') {
          // Play banana collect sound/haptic and stop rum ambient if playing
          playBananaCollect();
          hapticOJBananaCollect(); // Energetic triple pulse
          stopRumAmbient();
          startBananaAmbient();

          // Banana: faster movement, reset rum count and reversed controls
          rumCountRef.current = 0;
          setRumCount(0);
          isReversedRef.current = false;
          setIsReversed(false);

          // Stack bananas up to 3
          bananaCountRef.current = Math.min(bananaCountRef.current + 1, 3);
          setBananaCount(bananaCountRef.current);

          // Apply stacking speed boost
          const speedIndex = bananaCountRef.current;
          speedModifierRef.current = BANANA_SPEEDS[speedIndex];
        } else {
          // Play rum collect sound/haptic and stop banana ambient if playing
          playRumCollect();
          hapticOJRumCollect(); // Woozy double pulse
          stopBananaAmbient();
          startRumAmbient();

          // Rum: slower movement, reset banana count
          bananaCountRef.current = 0;
          setBananaCount(0);

          // Stack rums up to 3
          rumCountRef.current = Math.min(rumCountRef.current + 1, 3);
          setRumCount(rumCountRef.current);

          // Apply stacking speed slow
          const speedIndex = rumCountRef.current;
          speedModifierRef.current = RUM_SPEEDS[speedIndex];

          // 3 rums = reversed controls!
          if (rumCountRef.current >= RUMS_FOR_REVERSE) {
            isReversedRef.current = true;
            setIsReversed(true);
          }
        }
      }

      // Process collision results - score points!
      if (hitOrange || hitGolden) {
        comboRef.current = Math.min(comboRef.current + 1, 10); // Multiplier caps at 10x
        streakRef.current++; // Streak continues for sound escalation (no cap!)
        let points = hitGolden ? 50 * comboRef.current : 10 * comboRef.current;
        // 2x multiplier when controls are reversed (rum effect) - risk/reward!
        if (isReversedRef.current) {
          points *= 2;
        }
        scoreRef.current += points;
        setScore(scoreRef.current);
        setCombo(comboRef.current);
        lastHitTimeRef.current = Date.now(); // Reset combo decay timer

        // Play hit sounds and haptics - different for golden vs regular orange
        if (hitGolden) {
          playGoldenOrangeHit();
          hapticOJGoldenHit(); // Celebratory triple burst
        } else {
          // Position-based pitch variation (0 = left edge, 1 = right edge)
          const hitPosition = paddleRef.current.x / (width - PADDLE_SIZE);
          playOrangeJuggleHit(hitPosition);
          hapticOJOrangeHit(); // Medium bounce pulse
        }
        // Play combo escalation sound - uses streak for continuous escalation!
        playOrangeJuggleCombo(streakRef.current);
        triggerOrangutanBounce();
        // JUICE: Trigger arm swing based on hit position
        const paddleCenterX = paddleRef.current.x + PADDLE_SIZE / 2;
        triggerArmSwing(hitPositionX, paddleCenterX);
        // JUICE: Create impact flash at collision point
        createImpactFlash(hitPositionX, hitPositionY);
        // JUICE: Create particle burst
        createParticleBurst(hitPositionX, hitPositionY, comboRef.current, hitGolden);
        // JUICE: Screen shake - intensity based on combo and golden
        const shakeIntensity = hitGolden ? 6 : (comboRef.current >= 10 ? 8 : comboRef.current >= 5 ? 5 : 3);
        triggerScreenShake(shakeIntensity);
        // JUICE: Freeze frame for big hits
        if (hitGolden) {
          triggerFreezeFrame(50); // Golden orange
        } else if (comboRef.current >= 10) {
          triggerFreezeFrame(60); // Max combo
        } else if (comboRef.current >= 5) {
          triggerFreezeFrame(40); // High combo
        }
        // Additional haptic feedback on combo escalation
        if (comboRef.current >= 3) {
          hapticCombo(comboRef.current); // Escalating combo haptic
        }
      }

      // Combo decay - reset combo if no hits for too long
      if (comboRef.current > 0 && Date.now() - lastHitTimeRef.current > COMBO_DECAY_TIME) {
        comboRef.current = 0;
        streakRef.current = 0; // Reset streak when combo decays
        setCombo(0);
      }

      // Check for golden orange spawn
      if (Date.now() > goldenSpawnTimeRef.current) {
        setObjects(prev => {
          const hasGolden = prev.some(o => o.type === 'golden');
          if (!hasGolden) {
            setTimeout(() => {
              spawnObject('golden');
              setTimeout(() => {
                objectsRef.current = objectsRef.current.filter(o => o.type !== 'golden');
                setObjects(objectsRef.current);
              }, 5000);
            }, 0);
          }
          return prev;
        });
        goldenSpawnTimeRef.current = Date.now() + 15000 + Math.random() * 5000;
      }

      // Check for power-up spawn (rum from level 2, banana from level 3)
      const currentConfig = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG[1];
      if (Date.now() > nextPowerupSpawnRef.current) {
        // Determine which powerups can spawn this level
        const canSpawnRum = currentConfig.rumEnabled;
        const canSpawnBanana = currentConfig.bananaEnabled;

        if (canSpawnRum || canSpawnBanana) {
          let powerupType: 'banana' | 'rum' | null = null;

          if (canSpawnRum && canSpawnBanana) {
            // Both available - random choice
            powerupType = Math.random() > 0.5 ? 'banana' : 'rum';
          } else if (canSpawnRum) {
            // Only rum available (level 2)
            powerupType = 'rum';
          } else if (canSpawnBanana) {
            // Only banana available (shouldn't happen with current config)
            powerupType = 'banana';
          }

          if (powerupType) {
            setTimeout(() => {
              spawnObject(powerupType!);
            }, 0);
          }
          // Next power-up in 3-6 seconds
          nextPowerupSpawnRef.current = Date.now() + 3000 + Math.random() * 3000;
        }
      }

      // Check for camel spawn (based on level's camelChance)
      if (currentConfig.camelChance > 0 && Date.now() > nextCamelSpawnRef.current) {
        // Roll the dice - spawn camel based on chance
        if (Math.random() < currentConfig.camelChance) {
          // Play camel warning sound and haptic
          playCamelWarning();
          hapticOJCamelWarning(); // Urgent triple pulse - danger incoming!
          setTimeout(() => {
            spawnObject('camel');
          }, 0);
        }
        // Check again in 2 seconds
        nextCamelSpawnRef.current = Date.now() + CAMEL_SPAWN_INTERVAL;
      }

      // Handle camel collision - restart from level 1!
      if (hitCamel) {
        // Stop the game loop
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        // Play camel impact sound and haptic
        playCamelImpact();
        stopRumAmbient();
        stopBananaAmbient();
        hapticOJCamelImpact(); // Heavy game over pulse
        // Set camel loss state
        setLostByCamel(true);
        
        // CRITICAL: Submit score SYNCHRONOUSLY before setGameState
        const finalScore = scoreRef.current;
        if (isSignedInRef.current && !scoreSubmittedRef.current && finalScore > 0) {
          scoreSubmittedRef.current = true;
          setScoreSubmitted(true);
          submitScoreRef.current(finalScore, levelRef.current, {
            lostByCamel: true,
            completed: false,
          }).then(result => {
            if (result.success && result.isNewHighScore) {
              setIsNewPersonalBest(true);
            }
          });
        }
        
        // Reset to level 1 and show save score screen
        setLevel(1);
        setGameState('saveScore');
        return;
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, gameMode, level, highScore]); // Using refs for most logic, minimal deps

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const config = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG[1];

    timerRef.current = setInterval(() => {
      // Pause timer when exit dialog is shown
      if (showExitDialogRef.current) return;

      setTimeLeft(prev => {
        if (prev <= 1) {
          // Stop ambient loops when level ends
          stopRumAmbient();
          stopBananaAmbient();

          // Time's up! Use scoreRef.current to get latest score (avoids stale closure)
          const currentScore = scoreRef.current;
          if (currentScore >= config.targetScore) {
            // Play level complete sound
            playOrangeJuggleLevelComplete();
            if (level >= 5) {
              // Completed all levels - go to save score screen
              hapticHighScore(); // Victory haptic
              
              // CRITICAL: Submit score SYNCHRONOUSLY before setGameState
              if (isSignedInRef.current && !scoreSubmittedRef.current && currentScore > 0) {
                scoreSubmittedRef.current = true;
                setScoreSubmitted(true);
                submitScoreRef.current(currentScore, level, {
                  lostByCamel: false,
                  completed: true,
                }).then(result => {
                  if (result.success && result.isNewHighScore) {
                    setIsNewPersonalBest(true);
                  }
                });
              }
              
              setGameState('saveScore');
              if (currentScore > highScore) {
                setHighScore(currentScore);
                localStorage.setItem('orangeJuggleHighScore', String(currentScore));
              }
            } else {
              hapticOJLevelComplete(); // Extended celebration burst
              setGameState('levelComplete');
            }
          } else {
            // Didn't reach target score - game over
            playGameOver();
            hapticGameOver();
            
            // CRITICAL: Submit score SYNCHRONOUSLY before setGameState
            if (isSignedInRef.current && !scoreSubmittedRef.current && currentScore > 0) {
              scoreSubmittedRef.current = true;
              setScoreSubmitted(true);
              submitScoreRef.current(currentScore, level, {
                lostByCamel: false,
                completed: false,
              }).then(result => {
                if (result.success && result.isNewHighScore) {
                  setIsNewPersonalBest(true);
                }
              });
            }
            
            setGameState('saveScore'); // Still allow saving score
            if (currentScore > highScore) {
              setHighScore(currentScore);
              localStorage.setItem('orangeJuggleHighScore', String(currentScore));
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState, gameMode, level, highScore]);

  // Submit score to global leaderboard (for signed-in users)
  // NOTE: This is now a FALLBACK - primary submission happens synchronously in game loop
  const submitScoreGlobal = useCallback(
    async (finalScore: number, finalLevel: number) => {
      // Check ref first to prevent race conditions with synchronous submission
      if (scoreSubmittedRef.current) return;
      
      if (!isSignedIn || scoreSubmitted || finalScore === 0) return;
      scoreSubmittedRef.current = true;
      setScoreSubmitted(true);
      const result = await submitScore(finalScore, finalLevel, {
        lostByCamel,
        completed: finalLevel >= 5,
      });
      if (result.success) {
        if (result.isNewHighScore) {
          setIsNewPersonalBest(true);
        }
      }
    },
    [isSignedIn, scoreSubmitted, submitScore, lostByCamel]
  );

  // Auto-submit score for signed-in users when game ends
  useEffect(() => {
    if (gameState === 'saveScore' && isSignedIn && score > 0 && !scoreSubmitted) {
      submitScoreGlobal(score, level);
    }
  }, [gameState, isSignedIn, score, level, scoreSubmitted, submitScoreGlobal]);

  const config = getLevelConfig();

  return (
    <div className={`juggle-container ${gameState === 'playing' ? 'playing-mode' : ''}`}>
      <GameSEO
        gameName="Orange Juggle"
        gameSlug="juggle"
        description="Keep the oranges in the air! Tap to bounce them and don't let any fall. Increasingly challenging levels test your reflexes."
        genre="Arcade"
        difficulty="Hard"
      />
      {/* PLAYING STATE: Game fills the container */}
      {gameState === 'playing' && (
        <div className="game-layout">
          {/* Stats Overlay - OUTSIDE lightbox, fixed at top aligned with lightbox edge */}
          <div className="oj-stats-overlay">
            <div className="oj-stat level-stat">
              <span className="oj-stat-label">LVL</span>
              <span className="oj-stat-value">{level}</span>
            </div>
            <div className={`oj-stat score-stat ${isReversed ? 'multiplied' : ''}`}>
              <span className="oj-stat-label">Score</span>
              <span className="oj-stat-value">{score.toLocaleString()}</span>
            </div>
            <div className={`oj-stat time-stat ${timeLeft <= 10 ? 'urgency-critical' : timeLeft <= 20 ? 'urgency-warning' : ''}`}>
              <span className="oj-stat-label">Time</span>
              <span className="oj-stat-value">{timeLeft}s</span>
            </div>
            <div className="oj-stat goal-stat">
              <span className="oj-stat-label">Goal</span>
              <span className="oj-stat-value">{config.targetScore.toLocaleString()}</span>
            </div>
          </div>

          {/* Lightbox = Game Area (game fills entire lightbox) */}
          <div
            ref={gameAreaRef}
            className="lightbox-wrapper"
            style={{
              // JUICE: Screen shake transform
              transform: screenShake.x !== 0 || screenShake.y !== 0
                ? `translate(${screenShake.x}px, ${screenShake.y}px)`
                : undefined,
            }}
          >
            {/* Floating Multiplier Display (on game field) */}
            {(combo > 1 || isReversed) && (
              <div className="oj-multiplier-display">
                {combo > 1 && <span className={`oj-combo-text combo-level-${Math.min(combo, 10)}`}>x{combo}</span>}
                {isReversed && <span className="oj-rum-multiplier">2X</span>}
              </div>
            )}

            {/* Music toggle button */}
            <button
              className="music-toggle-btn"
              onClick={() => isBackgroundMusicPlaying ? pauseBackgroundMusic() : playBackgroundMusic()}
            >
              {isBackgroundMusicPlaying ? '🔊' : '🔇'}
            </button>

            {/* Power-up overlay (floats in corner, doesn't affect layout) */}
            {(bananaCount > 0 || rumCount > 0) && (
              <div className="powerup-overlay">
                {bananaCount > 0 && <span className="powerup-indicator banana">{'🍌'.repeat(bananaCount)}</span>}
                {rumCount > 0 && <span className={`powerup-indicator rum ${isReversed ? 'reversed' : ''}`}>{'🥃'.repeat(rumCount)}{isReversed && ' 🔄'}</span>}
              </div>
            )}
              {/* Game Objects */}
              {objects.map(obj => {
                const objSize = obj.type === 'camel' ? CAMEL_SIZE
                  : (obj.type === 'banana' || obj.type === 'rum') ? POWERUP_SIZE
                  : ORANGE_SIZE;

                // JUICE: Calculate velocity stretch for oranges
                const isOrangeType = obj.type === 'orange' || obj.type === 'golden';
                const speed = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
                const velocityStretch = isOrangeType ? 1 + Math.min(speed / 20, 0.3) : 1; // Max 30% stretch
                const angle = isOrangeType && speed > 3 ? Math.atan2(obj.vy, obj.vx) * (180 / Math.PI) : 0;

                // Combine squash and velocity stretch
                const scaleX = (obj.squashX || 1) * velocityStretch;
                const scaleY = (obj.squashY || 1) / velocityStretch;

                // JUICE: Get combo-based trail color
                const getTrailColor = () => {
                  if (combo >= 10) return '#ff00ff'; // Magenta
                  if (combo >= 8) return '#ff4500';  // OrangeRed
                  if (combo >= 5) return '#ffd700';  // Gold
                  if (combo >= 3) return '#ffaa00';  // Orange
                  return '#ff8c00'; // Default orange
                };

                return (
                  <React.Fragment key={obj.id}>
                    {/* JUICE: Render trail behind orange */}
                    {isOrangeType && obj.trail && obj.trail.map((point, idx) => (
                      <div
                        key={`trail-${obj.id}-${idx}`}
                        className="orange-trail"
                        style={{
                          left: point.x,
                          top: point.y,
                          opacity: point.alpha,
                          backgroundColor: getTrailColor(),
                          width: 16 + idx * 2,
                          height: 16 + idx * 2,
                        }}
                      />
                    ))}
                    <div
                      className={`game-object ${obj.type}`}
                      style={{
                        left: obj.x,
                        top: obj.y,
                        width: objSize,
                        height: objSize,
                        // JUICE: Apply squash and velocity stretch transforms
                        transform: isOrangeType
                          ? `scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)}) rotate(${angle.toFixed(1)}deg)`
                          : undefined,
                      }}
                    >
                      {obj.type === 'orange' && '🍊'}
                      {obj.type === 'golden' && '🍊'}
                      {obj.type === 'camel' && '🐫'}
                      {obj.type === 'banana' && '🍌'}
                      {obj.type === 'rum' && '🥃'}
                    </div>
                  </React.Fragment>
                );
              })}

            {/* JUICE: Impact Flashes */}
            {impactFlashes.map(flash => (
              <div
                key={flash.id}
                className="impact-flash"
                style={{
                  left: flash.x,
                  top: flash.y,
                }}
              />
            ))}

            {/* JUICE: Particles */}
            {particles.map(particle => (
              <div
                key={particle.id}
                className="particle"
                style={{
                  left: particle.x,
                  top: particle.y,
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: particle.color,
                  opacity: particle.alpha,
                }}
              />
            ))}

            {/* Paddle (Orangutan) */}
            <div
              className={`paddle ${orangutanBounce ? 'bounce' : ''} ${armSwing ? `swing-${armSwing}` : ''} ${combo >= 10 ? 'combo-glow-4' : combo >= 7 ? 'combo-glow-3' : combo >= 5 ? 'combo-glow-2' : combo >= 3 ? 'combo-glow-1' : ''}`}
              style={{
                left: paddleX,
                top: paddleY,
                width: PADDLE_SIZE,
                height: PADDLE_SIZE,
              }}
            >
              <div className="juggle-sprite" />
            </div>

            {/* Danger zone indicator */}
            <div className="danger-zone" />

            {/* JUICE: Panic indicators for multiple falling oranges */}
            {panicLevel > 0 && (
              <div
                className={`panic-vignette panic-level-${panicLevel}`}
                style={{ opacity: 0.3 + panicLevel * 0.15 }}
              />
            )}

            {/* JUICE: Landing zone indicators */}
            {landingIndicators.map(indicator => (
              <div
                key={indicator.id}
                className={`landing-indicator panic-level-${panicLevel}`}
                style={{ left: indicator.x }}
              />
            ))}
          </div>
        </div>
      )}

      {/* NON-PLAYING STATES: Menu, Level Complete, Save Score */}
      {gameState !== 'playing' && (
        <div className="juggle-content">
          <div
            ref={gameAreaRef}
            className="juggle-area"
          >
            {/* Level Complete */}
            {gameState === 'levelComplete' && (
              <div className="game-menu">
                <div className="game-title">Level {level} Complete!</div>
                <div className="game-emoji">🎉</div>
                <div className="final-score">
                  <span className="score-label">Score</span>
                  <span className="score-value">{score}</span>
                </div>
                <button onClick={startNextLevel} className="play-btn">
                  Next Level
                </button>
              </div>
            )}

            {/* Save Score Screen */}
            {gameState === 'saveScore' && (
              <ArcadeGameOverScreen
                score={score}
                highScore={highScore}
                scoreLabel={`Level ${level}`}
                isNewPersonalBest={isNewPersonalBest || (score >= highScore && score > 0)}
                isSignedIn={isSignedIn}
                isSubmitting={isSubmitting}
                scoreSubmitted={scoreSubmitted}
                userDisplayName={userDisplayName ?? undefined}
                leaderboard={globalLeaderboard}
                onPlayAgain={() => startGame('campaign')}
                title={
                  level >= 5 && score >= (LEVEL_CONFIG[5].targetScore)
                    ? 'You Won!'
                    : lostByCamel
                      ? 'Camel Got You!'
                      : 'Not Enough Points!'
                }
                subtitle={
                  level >= 5 && score >= (LEVEL_CONFIG[5].targetScore)
                    ? 'You completed all levels!'
                    : lostByCamel
                      ? 'You touched a camel!'
                      : `Needed ${LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG].targetScore.toLocaleString()} points`
                }
                accentColor="#ff6b00"
              />
            )}
          </div>
        </div>
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

export default OrangeJuggle;
