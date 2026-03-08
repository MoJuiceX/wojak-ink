import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useGameHaptics } from '@/systems/haptics';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useGameEffects, GameEffects } from '@/components/media';
import { useGameNavigationGuard } from '@/hooks/useGameNavigationGuard';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useGameMute } from '@/contexts/GameMuteContext';
import { useMobileGameFullscreen } from '@/hooks/useMobileGameFullscreen';
import { useArcadeLights } from '@/contexts/ArcadeLightsContext';
import { GAME_OVER_SEQUENCE } from '@/lib/juice/brandConstants';
import { GameSEO } from '@/components/seo/GameSEO';
import { ArcadeGameOverScreen } from '@/components/media/games/ArcadeGameOverScreen';
import { getFlappyOrangeScorecardDataUrl, type FlappyScorecardData } from '@/systems/sharing/FlappyOrangeScorecard';
import { createManagedAudio } from '@/utils/audioElement';
import { safeStorage } from '@/utils/safeStorage';
// UI Components extracted from this file
import {
  ShareModal,
  ChallengeBanners,
  Toast,
  DebugMusicButtons,
  FloatingScores,
} from './games/flappy-orange/components';
// Config and types from extracted modules
import {
  PHYSICS,
  JUICE_CONFIG,
  WEATHER_CONFIG,
  CYCLE_DURATION_MS,
  BIRD_RADIUS,
  PIPE_WIDTH,
  PIPE_GAP,
  PIPE_SPACING,
  PERFORMANCE_MODE,
  ULTRA_PERFORMANCE_MODE,
  LIGHT_EFFECTS_MODE,
  BARE_BONES_MODE,
  USE_MESSAGE_CHANNEL_LOOP,
  DEBUG_OVERLAY,
} from './games/flappy-orange/config';
import type {
  Bird,
  Pipe,
  WeatherState,
  Particle,
  Snowflake,
  FallingLeaf,
  LightningBolt,
  BackgroundBird,
  Cloud,
  Tree,
  ShakeState,
  Coin,
  GameState,
} from './games/flappy-orange/types';
import {
  getCycleInfo,
  getInterpolatedColors,
  generateStars as generateStarsPure,
  type InterpolatedColors,
} from './games/flappy-orange/colors';
import {
  createDeathParticles,
  createWingParticles,
  createPassParticles,
  updateParticles,
  addParticles,
} from './games/flappy-orange/particles';
import {
  updateRainDrops,
  updateRainSplashes,
  createSnowflakes,
  updateSnowflakes as updateSnowflakesPure,
  addSnowflakes,
  createFallingLeaf,
  updateFallingLeaves as updateFallingLeavesPure,
  createBirdFlock,
  updateBackgroundBirds as updateBackgroundBirdsPure,
  canSpawnBirdFlock,
  // Weather state machine functions
  updateWeatherStateMachine,
  updateSnowAccumulation,
  // Lightning functions
  generateLightningBolt as generateLightningBoltPure,
  updateLightningBolts as updateLightningBoltsPure,
  getLightningFlashSequence,
  getThunderEffectParams,
  // Weather particle helpers
  calculateRainSpawnCount,
  createWeatherRainDrop,
  shouldSpawnSnow,
  calculateSnowSpawnCount,
} from './games/flappy-orange/weather';
import {
  MUSIC_PLAYLIST,
  playTone as playTonePure,
  playPassNote as playPassNotePure,
  playCoinSound as playCoinSoundPure,
  createAudioContext,
} from './games/flappy-orange/audio';
import {
  createScreenShake,
  applyShakeToContext,
  applyFlapDeformation as applyFlapDeformationPure,
  resetBirdDeformation,
  getDeathKnockback,
  EFFECT_DURATIONS,
} from './games/flappy-orange/effects';
import {
  checkCollision,
  generatePipe,
  updateBirdPhysics,
} from './games/flappy-orange/game-logic';
import {
  updatePipePositions,
  shouldSpawnPipe,
  updateCoinPositions,
  calculateMovementSpeed,
} from './games/flappy-orange/game-loop-helpers';
import {
  createInitialGameState,
  shouldIgnoreInput,
  shouldBlockTapPropagation,
} from './games/flappy-orange/input';
import {
  drawRain as drawRainRenderer,
  drawRainSplashes as drawRainSplashesRenderer,
  drawSnowflakes as drawSnowflakesRenderer,
  drawFog as drawFogRenderer,
  drawSnowAccumulation as drawSnowAccumulationRenderer,
  drawPipeFrost as drawPipeFrostRenderer,
  drawLightningFlash as drawLightningFlashRenderer,
  drawVignette as drawVignetteRenderer,
  drawBackgroundBirds as drawBackgroundBirdsRenderer,
  drawFallingLeaves as drawFallingLeavesRenderer,
  drawLightningBolts as drawLightningBoltsRenderer,
  drawTouchRipples as drawTouchRipplesRenderer,
  drawPipeGapHighlight as drawPipeGapHighlightRenderer,
  drawCoin as drawCoinRenderer,
  drawFireflies as drawFirefliesRenderer,
  drawBird as drawBirdRenderer,
  drawPipes as drawPipesRenderer,
  drawScore as drawScoreRenderer,
  drawParticles as drawParticlesRenderer,
  drawImpactFlash as drawImpactFlashRenderer,
  drawNearMissFlash as drawNearMissFlashRenderer,
  drawLeaderboardCountdown as drawLeaderboardCountdownRenderer,
  drawTookSpotMessage as drawTookSpotMessageRenderer,
  drawIdleScreen as drawIdleScreenRenderer,
} from './games/flappy-orange/renderers';
import {
  decodeChallenge,
  downloadImage,
  generateScoreFilename,
  clearChallengeFromUrl,
} from './games/flappy-orange/share';
import { drawBackground as drawBackgroundPure } from './games/flappy-orange/background';
import {
  processScore,
  calculateNextTarget,
  getStoredHighScore,
  captureGameScreenshot,
  handleGameOverScore,
} from './games/flappy-orange/scoring';
import { initializeParallaxElements } from './games/flappy-orange/environment';
import './FlappyOrange.css';

// ============================================
// MAIN COMPONENT
// ============================================
const FlappyOrange: React.FC = () => {

  const navigate = useNavigate();
  const realIsMobile = useIsMobile();
  const isMobile = BARE_BONES_MODE ? true : realIsMobile; // Force mobile in bare bones
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // In BARE_BONES mode, use dummy functions to avoid hook overhead
  const realGameSounds = useGameSounds();
  const realGameHaptics = useGameHaptics();
  const realGameEffects = useGameEffects();
  const realLeaderboard = useLeaderboard('flappy-orange');

  // Arcade frame mute control (from GameModal)
  const { isMuted: arcadeMuted, musicManagedExternally, isPaused: isContextPaused } = useGameMute();

  // Arcade lights control (from GameModal)
  // NEW: Using event-based API for better pattern management
  const {
    triggerEvent,
    setGameId,
    // Legacy methods kept for backward compatibility
    setSequence: _setLightSequence,
    triggerPipePass: _triggerPipePass,
    triggerCoinCollect: _triggerCoinCollect,
    clearCombo: clearLightCombo,
  } = useArcadeLights();

  // Register this game for per-game light overrides
  useEffect(() => {
    setGameId('flappy-orange');
  }, [setGameId]);

  // Use real or dummy based on mode
  const { playBlockLand, playPerfectBonus, playCombo, playGameOver, playWojakChime } = BARE_BONES_MODE
    ? { playBlockLand: () => {}, playPerfectBonus: () => {}, playCombo: () => {}, playGameOver: () => {}, playWojakChime: () => {} }
    : realGameSounds;
  const { hapticScore, hapticCombo, hapticHighScore, hapticGameOver, hapticButton } = BARE_BONES_MODE
    ? { hapticScore: () => {}, hapticCombo: () => {}, hapticHighScore: () => {}, hapticGameOver: () => {}, hapticButton: () => {} }
    : realGameHaptics;

  // Visual effects
  const { effects, triggerBigMoment, triggerConfetti, showEpicCallout, resetAllEffects, triggerScreenShake: triggerGlobalScreenShake, triggerVignette } = BARE_BONES_MODE
    ? { effects: { showShockwave: false, shockwaveColor: '#ff6b00', shockwaveScale: 1, showImpactSparks: false, sparksColor: '#ff6b00', showVignette: false, vignetteColor: '#ff0000', screenShake: false, floatingEmojis: [] as { id: string; emoji: string; x: number }[], epicCallout: null as string | null, showConfetti: false, combo: 0, scorePopups: [] as { id: string; x: number; y: number; score: number; color?: string }[] }, triggerBigMoment: () => {}, triggerConfetti: () => {}, showEpicCallout: (_msg: string) => {}, resetAllEffects: () => {}, triggerScreenShake: (_duration?: number) => {}, triggerVignette: (_color?: string) => {} }
    : realGameEffects;

  // Leaderboard
  const { leaderboard: globalLeaderboard, submitScore, isSignedIn, userDisplayName, isSubmitting } = BARE_BONES_MODE
    ? { leaderboard: [], submitScore: () => Promise.resolve(), isSignedIn: false, userDisplayName: '', isSubmitting: false }
    : realLeaderboard;
  const [isGameOverExiting, setIsGameOverExiting] = useState(false);

  // Dynamic canvas dimensions - measured from container
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: BARE_BONES_MODE ? 320 : 500,
    height: BARE_BONES_MODE ? 480 : 600
  });

  // Measure container and update canvas dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Fill the entire container - no padding/margins
        const width = Math.max(rect.width, 320);
        const height = Math.max(rect.height, 400);
        setCanvasDimensions({ width, height });
      }
    };

    // Initial measurement after a short delay to let CSS settle
    const timeoutId = setTimeout(updateDimensions, 50);

    // Use ResizeObserver to detect container size changes (e.g., when fullscreen mode removes padding)
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerRef.current);
    }

    // Update on resize
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, [isMobile]);

  // Canvas dimensions from state (or static in BARE_BONES mode)
  const CANVAS_WIDTH = BARE_BONES_MODE ? 320 : canvasDimensions.width;
  const CANVAS_HEIGHT = BARE_BONES_MODE ? 480 : canvasDimensions.height;
  const BIRD_X = BARE_BONES_MODE ? 80 : CANVAS_WIDTH * 0.25;

  // Game refs (to avoid stale closures in game loop)
  const gameStateRef = useRef<{
    bird: Bird;
    pipes: Pipe[];
    score: number;
    gameState: GameState;
    frameCount: number;
    stars: Array<{ x: number; y: number; size: number; alpha: number }>;
    // Juice additions
    isFrozen: boolean;
    timeScale: number;
    isDying: boolean;
  }>({
    bird: { y: CANVAS_HEIGHT / 2, velocity: 0, rotation: 0, scaleX: 1, scaleY: 1, velocityX: 0, rotationVelocity: 0 },
    pipes: [],
    score: 0,
    gameState: 'idle',
    frameCount: 0,
    stars: [],
    isFrozen: false,
    timeScale: 1,
    isDying: false,
  });

  // Juice refs
  const deathParticlesRef = useRef<Particle[]>([]);
  const wingParticlesRef = useRef<Particle[]>([]);
  const passParticlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<ShakeState | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const freezeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const slowMoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parallax refs
  const cloudsRef = useRef<Cloud[]>([]);
  const treesRef = useRef<Tree[]>([]);
  const treesFarRef = useRef<Tree[]>([]);
  const scrollOffsetRef = useRef(0);
  const grassTuftsRef = useRef<Array<{ x: number; height: number }>>([]);

  // Coin collectibles (coins add to main score)
  const coinsRef = useRef<Coin[]>([]);
  
  // NEW: Coin combo tracking for scoring system
  // Combo increments on collect, resets on miss
  const coinComboRef = useRef(1);
  const pipesPassed = useRef(0); // Track for minimum actions

  // Fireflies for night mode
  const firefliesRef = useRef<Array<{ x: number; y: number; phase: number; speed: number }>>([]);

  // Day/Night cycle time tracking (accumulates via deltaTime for smooth animation)
  const cycleTimeRef = useRef(0);  // Accumulated time in ms, loops at CYCLE_DURATION_MS

  // Color cache - only recalculate colors every 500ms for performance
  // (cycleInfo is always fresh for smooth animation)
  const colorCacheRef = useRef<{
    lastUpdate: number;
    colors: InterpolatedColors | null;
  }>({ lastUpdate: 0, colors: null });

  // Gradient cache - recreate only when colors change (not every frame!)
  const gradientCacheRef = useRef<{
    skyGradient: CanvasGradient | null;
    lastColorKey: string;
  }>({ skyGradient: null, lastColorKey: '' });

  // Touch ripple refs
  const touchRipplesRef = useRef<Array<{ x: number; y: number; radius: number; alpha: number; startTime: number }>>([]);

  // Weather refs (storm mode)
  const rainDropsRef = useRef<Array<{ x: number; y: number; length: number; speed: number; opacity: number; foreground: boolean }>>([]);
  const rainSplashesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number }>>([]);
  const lightningRef = useRef<{ alpha: number; sequence: number; startTime: number } | null>(null);

  // React state for UI
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [highScore, setHighScore] = useState(getStoredHighScore);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return safeStorage.getItem('flappyOrangeSoundEnabled') !== 'false';
  });
  const [floatingScores, setFloatingScores] = useState<Array<{
    id: string;
    value: string;
    x: number;
    y: number;
  }>>([]);

  const gameStartTimeRef = useRef<number>(0);

  // Leaderboard countdown state
  const [nextTarget, setNextTarget] = useState<{ rank: number; score: number; name: string } | null>(null);
  const [tookSpotMessage, setTookSpotMessage] = useState<string | null>(null);
  const beatenRanksRef = useRef<Set<number>>(new Set()); // Track which ranks we've beaten this game

  // Juice state - using refs for game loop performance (avoids re-creating loop on state change)
  const [impactFlashAlpha, setImpactFlashAlpha] = useState(0);
  const [screenBrightness, setScreenBrightness] = useState(1);
  const [nearMissFlashAlpha, setNearMissFlashAlpha] = useState(0);

  // Refs for game loop to read (synced from state)
  const impactFlashAlphaRef = useRef(0);
  const screenBrightnessRef = useRef(1);
  const nearMissFlashAlphaRef = useRef(0);
  const lightningAlphaRef = useRef(0);

  // Share system state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [gameScreenshot, setGameScreenshot] = useState<string | null>(null);
  const [challengeTarget, setChallengeTarget] = useState<number | null>(null);
  const [challengeBeaten, setChallengeBeaten] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Weather state
  const [lightningAlpha, setLightningAlpha] = useState(0);

  // Navigation guard - prevents accidental exits during gameplay
  const { showExitDialog, confirmExit, cancelExit } = useGameNavigationGuard({
    isPlaying: gameState === 'playing',
  });

  // Ref for game loop to check dialog state
  const showExitDialogRef = useRef(false);
  useEffect(() => {
    showExitDialogRef.current = showExitDialog;
  }, [showExitDialog]);

  // Ref for game loop to check context pause state (quit dialog from GameModal)
  const isContextPausedRef = useRef(false);
  useEffect(() => {
    isContextPausedRef.current = isContextPaused;
  }, [isContextPaused]);

  // Sync juice state to refs for game loop (prevents game loop recreation)
  useEffect(() => {
    impactFlashAlphaRef.current = impactFlashAlpha;
  }, [impactFlashAlpha]);
  useEffect(() => {
    screenBrightnessRef.current = screenBrightness;
  }, [screenBrightness]);
  useEffect(() => {
    nearMissFlashAlphaRef.current = nearMissFlashAlpha;
  }, [nearMissFlashAlpha]);
  useEffect(() => {
    lightningAlphaRef.current = lightningAlpha;
  }, [lightningAlpha]);

  // Start with random track on first load (MUSIC_PLAYLIST imported from audio.ts)
  const playlistIndexRef = useRef(Math.floor(Math.random() * 4));
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);

  // Play specific track - simplified, all tracks normalized
  const playTrack = useCallback((index: number) => {
    // Stop current music but don't reset position
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
    }

    playlistIndexRef.current = index;
    const track = MUSIC_PLAYLIST[index];

    const music = createManagedAudio(track.src);
    music.volume = 1.0;  // All tracks are normalized

    // When song ends, play next
    music.addEventListener('ended', () => {
      playlistIndexRef.current = (playlistIndexRef.current + 1) % MUSIC_PLAYLIST.length;
      if (gameStateRef.current.gameState === 'playing' && soundEnabledRef.current) {
        playTrack(playlistIndexRef.current);
      }
    }, { once: true });

    musicAudioRef.current = music;
    music.play().catch(() => {});  // Silently ignore errors
  }, []);

  // Play next song in playlist
  const playNextSong = useCallback(() => {
    playTrack(playlistIndexRef.current);
  }, [playTrack]);

  // Ref for soundEnabled (for use in callbacks - gameStateRef already exists above)
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  // Ref for musicManagedExternally (to check in touch handlers)
  const musicManagedExternallyRef = useRef(musicManagedExternally);
  useEffect(() => { musicManagedExternallyRef.current = musicManagedExternally; }, [musicManagedExternally]);

  // Sync with arcade frame mute button (from GameMuteContext)
  useEffect(() => {
    // Only sync if NOT managed externally (meaning this game controls its own music)
    if (!musicManagedExternally) {
      // Arcade mute button changed - sync local state
      setSoundEnabled(!arcadeMuted);
      // Also directly pause/resume music for immediate feedback
      if (arcadeMuted) {
        if (musicAudioRef.current) {
          musicAudioRef.current.pause();
        }
      } else if (gameStateRef.current.gameState === 'playing') {
        if (musicAudioRef.current) {
          musicAudioRef.current.play().catch(() => {});
        }
      }
    }
  }, [arcadeMuted, musicManagedExternally]);

  // Ref for playNextSong so touch handler can call it (needed for mobile audio)
  const playNextSongRef = useRef(playNextSong);
  useEffect(() => { playNextSongRef.current = playNextSong; }, [playNextSong]);

  // Ref for generateStars so touch handler can call it
  const generateStarsRef = useRef(() => generateStarsPure(CANVAS_WIDTH, CANVAS_HEIGHT));

  // Initialize music on mount
  useEffect(() => {
    return () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current = null;
      }
    };
  }, []);

  // Control music based on game state - resume from where it left off
  useEffect(() => {
    if (gameState === 'playing' && soundEnabled) {
      // Resume music if paused (continues from current position)
      if (musicAudioRef.current) {
        musicAudioRef.current.play().catch(() => {});
      }
      // Note: music is started directly from touch handler for mobile compatibility
    } else {
      // Pause current music (keeps position for resume)
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
      }
    }
  }, [gameState, soundEnabled]);

  // Mobile fullscreen mode - hide navigation and lock scroll for all active game states
  const isActiveGameState = gameState !== 'idle';
  useMobileGameFullscreen(isActiveGameState, isMobile);

  // Page Visibility API - pause game and audio when backgrounded (battery optimization)
  const wasPlayingBeforeHiddenRef = useRef(false);
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden (backgrounded)
        wasPlayingBeforeHiddenRef.current = gameStateRef.current.gameState === 'playing';

        // Pause music
        if (musicAudioRef.current) {
          musicAudioRef.current.pause();
        }

        // Suspend audio contexts to save battery
        if (audioContextRef.current?.state === 'running') {
          audioContextRef.current.suspend();
        }
        if (coinAudioCtxRef.current?.state === 'running') {
          coinAudioCtxRef.current.suspend();
        }
      } else {
        // Page is visible again - resume audio contexts
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
        if (coinAudioCtxRef.current?.state === 'suspended') {
          coinAudioCtxRef.current.resume();
        }

        // Resume music if game was playing and sound is enabled
        if (wasPlayingBeforeHiddenRef.current && soundEnabled && musicAudioRef.current) {
          musicAudioRef.current.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [soundEnabled]);

  // Audio context for synthesized sounds
  const coinAudioCtxRef = useRef<AudioContext | null>(null);


  // ============================================
  // WEATHER SYSTEM REFS
  // ============================================
  const weatherRef = useRef<WeatherState>({
    current: 'clear',
    intensity: 0,
    windSpeed: 0,
    windDirection: 1,
    transitionProgress: 1,
    nextWeather: null,
    fogIntensity: 0,  // Fog is separate overlay
    currentSequence: ['clear'],  // Start with clear
    sequenceIndex: 0,
    inClearBuffer: false,
  });
  const weatherTimerRef = useRef(WEATHER_CONFIG.MIN_WEATHER_DURATION + Math.random() * (WEATHER_CONFIG.MAX_WEATHER_DURATION - WEATHER_CONFIG.MIN_WEATHER_DURATION));
  const fogTimerRef = useRef(0);  // Timer for fog overlay
  const snowAccumulationRef = useRef(0);  // Ground snow level (0-1), for spawning new snow
  const snowGroundEdgeRef = useRef(0);  // Right edge of snow on ground (scrolls left when snow stops)
  const snowflakesRef = useRef<Snowflake[]>([]);
  const backgroundBirdsRef = useRef<BackgroundBird[]>([]);
  const fallingLeavesRef = useRef<FallingLeaf[]>([]);
  const lightningBoltsRef = useRef<LightningBolt[]>([]);
  const lastBirdSpawnRef = useRef(0);

  // Initialize audio context on first interaction
  useEffect(() => {
    const initAudioContext = () => {
      if (!coinAudioCtxRef.current) {
        coinAudioCtxRef.current = createAudioContext();
      }
    };
    // Initialize on any user interaction
    const events = ['touchstart', 'mousedown', 'keydown'];
    events.forEach(e => document.addEventListener(e, initAudioContext, { once: true }));
    return () => {
      events.forEach(e => document.removeEventListener(e, initAudioContext));
    };
  }, []);

  // Play soft synthesized coin chime - uses pure function from audio.ts
  const playCoinSound = useCallback(() => {
    if (!soundEnabled) return;

    // Lazy init audio context
    if (!coinAudioCtxRef.current) {
      coinAudioCtxRef.current = createAudioContext();
    }
    playCoinSoundPure(coinAudioCtxRef.current);
  }, [soundEnabled]);

  // Initialize parallax elements on mount and when dimensions change
  useEffect(() => {
    const elements = initializeParallaxElements(CANVAS_WIDTH, CANVAS_HEIGHT);
    cloudsRef.current = elements.clouds;
    treesRef.current = elements.treesNear;
    treesFarRef.current = elements.treesFar;
    grassTuftsRef.current = elements.grassTufts;
    firefliesRef.current = elements.fireflies;
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  // Generate stars on mount so they can fade in during day-to-night transition
  // (generateStarsPure imported from ./games/flappy-orange/colors.ts)
  useEffect(() => {
    if (gameStateRef.current.stars.length === 0) {
      gameStateRef.current.stars = generateStarsPure(CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);


  // ============================================
  // TIME-BASED DAY/NIGHT CYCLE SYSTEM
  // (Pure functions imported from ./games/flappy-orange/colors.ts)
  // ============================================

  // Cached color getter - cycleInfo is always fresh (for smooth animation),
  // but colors are cached every 100ms (expensive to calculate, change slowly)
  const getCachedColors = useCallback(() => {
    const now = performance.now();
    const cache = colorCacheRef.current;

    // Always get fresh cycleInfo for smooth celestial body movement
    const cycleInfo = getCycleInfo(cycleTimeRef.current);

    // Recalculate colors every 100ms for smooth transitions (still cached, not every frame)
    if (!cache.colors || now - cache.lastUpdate > 100) {
      cache.colors = getInterpolatedColors(cycleInfo);
      cache.lastUpdate = now;
    }

    return { cycleInfo, colors: cache.colors! };
  }, []);


  // ============================================
  // JUICE HELPER FUNCTIONS
  // ============================================

  // Play a tone using Web Audio API - uses pure function from audio.ts
  const playTone = useCallback((frequency: number, volume: number, duration: number) => {
    if (!soundEnabled) return;
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    playTonePure(audioContextRef.current, frequency, volume, duration);
  }, [soundEnabled]);

  // Trigger haptic feedback
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Trigger screen shake - uses pure function from effects.ts
  const triggerScreenShake = useCallback((intensity: number, duration: number) => {
    shakeRef.current = createScreenShake(intensity, duration);
  }, []);

  // Spawn death particles (using pure function from particles.ts)
  const spawnDeathParticles = useCallback((x: number, y: number) => {
    deathParticlesRef.current = createDeathParticles(x, y);
  }, []);

  // Spawn wing particles on flap (using pure function from particles.ts)
  const spawnWingParticles = useCallback((x: number, y: number) => {
    wingParticlesRef.current = addParticles(
      wingParticlesRef.current,
      createWingParticles(x, y),
      JUICE_CONFIG.MAX_WING_PARTICLES
    );
  }, []);

  // Spawn pass particles (using pure function from particles.ts)
  const spawnPassParticles = useCallback((x: number, gapY: number) => {
    passParticlesRef.current = addParticles(
      passParticlesRef.current,
      createPassParticles(x, gapY),
      JUICE_CONFIG.MAX_PASS_PARTICLES
    );
  }, []);

  // Play musical note for pipe pass - uses pure function from audio.ts
  const playPassNote = useCallback((pipeNumber: number) => {
    if (!soundEnabled) return;
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    playPassNotePure(audioContextRef.current, pipeNumber);
  }, [soundEnabled]);

  // Apply flap deformation (squash/stretch) - uses pure functions from effects.ts
  const applyFlapDeformation = useCallback(() => {
    const state = gameStateRef.current;
    const deformed = applyFlapDeformationPure(state.bird);
    state.bird.scaleX = deformed.scaleX;
    state.bird.scaleY = deformed.scaleY;

    setTimeout(() => {
      // Smooth return using pure function
      const reset = resetBirdDeformation(state.bird);
      state.bird.scaleX = reset.scaleX;
      state.bird.scaleY = reset.scaleY;
    }, EFFECT_DURATIONS.FLAP);
  }, []);

  // Start slow-motion death sequence - uses pure functions from effects.ts
  const startSlowMotionDeath = useCallback(() => {
    const state = gameStateRef.current;
    state.timeScale = JUICE_CONFIG.SLOW_MO_SCALE;

    // Apply death knockback using pure function
    const knockback = getDeathKnockback();
    state.bird.rotationVelocity = knockback.rotationVelocity;
    state.bird.velocityX = knockback.velocityX;
    state.bird.velocity = knockback.velocityY;

    slowMoTimeoutRef.current = setTimeout(() => {
      state.timeScale = 1;
    }, EFFECT_DURATIONS.SLOW_MO);
  }, []);

  const triggerDeathFreeze = useCallback(() => {
    const state = gameStateRef.current;
    if (state.isDying) return;
    state.isDying = true;
    state.isFrozen = true;
    if (musicAudioRef.current) musicAudioRef.current.pause();
    setImpactFlashAlpha(JUICE_CONFIG.IMPACT_FLASH_ALPHA);
    setTimeout(() => setImpactFlashAlpha(0), JUICE_CONFIG.IMPACT_FLASH_DURATION);
    triggerScreenShake(JUICE_CONFIG.SCREEN_SHAKE_INTENSITY, JUICE_CONFIG.SCREEN_SHAKE_DURATION);
    spawnDeathParticles(BIRD_X, state.bird.y);
    triggerHaptic(40);
    freezeTimeoutRef.current = setTimeout(() => {
      state.isFrozen = false;
      startSlowMotionDeath();
    }, JUICE_CONFIG.FREEZE_DURATION);
  }, [BIRD_X, triggerScreenShake, spawnDeathParticles, triggerHaptic, startSlowMotionDeath]);

  // ============================================
  // SHARE SYSTEM FUNCTIONS
  // ============================================

  // Show toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Generate share image using new Flappy Orange Scorecard (PDF spec design)
  const generateShareImage = useCallback(async (): Promise<string> => {
    const isNewRecord = score >= highScore && score > 0;
    const scorecardData: FlappyScorecardData = {
      score,
      bestScore: highScore,
      isNewRecord,
      screenshot: gameScreenshot,
      // Future: add streak and gamesPlayed from user profile
      streak: 0,
      gamesPlayed: 0,
    };

    // Generate image using new Flappy Orange Scorecard design
    return await getFlappyOrangeScorecardDataUrl(scorecardData);
  }, [score, highScore, gameScreenshot]);

  // Open share modal - show immediately, generate image in background
  const openShareModal = useCallback(() => {
    triggerHaptic(10);
    setShareImageUrl(null); // Clear any previous image
    setShowShareModal(true); // Show modal immediately
    // Generate image in background
    generateShareImage().then(imageUrl => {
      setShareImageUrl(imageUrl);
    });
  }, [generateShareImage, triggerHaptic]);

  // Download share image
  const handleDownloadImage = useCallback(() => {
    if (!shareImageUrl) return;
    downloadImage(shareImageUrl, generateScoreFilename(score));
    showToast('Image downloaded!');
  }, [shareImageUrl, score, showToast]);

  // Check for challenge on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeParam = params.get('challenge');
    if (challengeParam) {
      const target = decodeChallenge(challengeParam);
      if (target && target > 0) {
        setChallengeTarget(target);
        clearChallengeFromUrl();
      }
    }
  }, []);

  // Check if challenge beaten
  useEffect(() => {
    if (challengeTarget && score >= challengeTarget && !challengeBeaten) {
      setChallengeBeaten(true);
      showEpicCallout('🏆 CHALLENGE BEATEN! 🏆');
      triggerConfetti();
      triggerHaptic([20, 50, 20, 50, 20]);
    }
  }, [score, challengeTarget, challengeBeaten, showEpicCallout, triggerConfetti, triggerHaptic]);

  // ============================================
  // WEATHER EFFECTS (Storm Mode)
  // ============================================

  // Update rain drops - uses pure function from weather module
  const handleUpdateRainDrops = useCallback(() => {
    const groundY = CANVAS_HEIGHT - 20;
    const maxSplashes = 50 - rainSplashesRef.current.length;
    const { drops, newSplashes } = updateRainDrops(
      rainDropsRef.current,
      CANVAS_HEIGHT,
      groundY,
      maxSplashes
    );
    rainDropsRef.current = drops;
    rainSplashesRef.current = [...rainSplashesRef.current, ...newSplashes];
  }, [CANVAS_HEIGHT]);

  // ============================================
  // WEATHER SYSTEM FUNCTIONS
  // ============================================

  // Note: getTimeOfDayPhase available via getTimeOfDayPhasePure(cycleTimeRef.current)
  // Note: getDifficultyTier, getCurrentGapSize, getSpeedMultiplier are imported from game-logic.ts

  // Update weather state machine - thin wrapper for pure function
  const updateWeather = useCallback((deltaTime: number) => {
    if (PERFORMANCE_MODE || ULTRA_PERFORMANCE_MODE) return;

    const { weatherTimer, fogTimer, result } = updateWeatherStateMachine(
      weatherRef.current,
      weatherTimerRef.current,
      fogTimerRef.current,
      deltaTime
    );
    weatherTimerRef.current = weatherTimer;
    fogTimerRef.current = fogTimer;

    // Handle fog start if triggered
    if (result.startFog) {
      fogTimerRef.current = result.fogDuration;
    }

    // Update snow accumulation using pure function
    const isPlaying = gameStateRef.current.gameState === 'playing';
    const snowResult = updateSnowAccumulation(
      weatherRef.current,
      snowAccumulationRef.current,
      snowGroundEdgeRef.current,
      CANVAS_WIDTH,
      isPlaying,
      deltaTime
    );
    snowAccumulationRef.current = snowResult.snowAccumulation;
    snowGroundEdgeRef.current = snowResult.snowGroundEdge;
  }, [CANVAS_WIDTH]);

  // Spawn snowflakes - uses pure function from weather module
  const spawnSnowflakes = useCallback((count: number, staggerY: boolean = false) => {
    const newFlakes = createSnowflakes(
      count,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      staggerY,
      WEATHER_CONFIG.MAX_SNOWFLAKES,
      snowflakesRef.current.length
    );
    snowflakesRef.current = addSnowflakes(snowflakesRef.current, newFlakes);
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  // Update snowflakes - uses pure function from weather module
  const updateSnowflakes = useCallback((deltaTime: number) => {
    const wind = weatherRef.current.windSpeed;
    snowflakesRef.current = updateSnowflakesPure(
      snowflakesRef.current,
      deltaTime,
      wind,
      CANVAS_WIDTH,
      CANVAS_HEIGHT
    );
  }, [CANVAS_HEIGHT, CANVAS_WIDTH]);

  // Spawn bird flock - uses pure function from weather module
  const spawnBirdFlock = useCallback(() => {
    if (!canSpawnBirdFlock(backgroundBirdsRef.current.length)) return;
    backgroundBirdsRef.current = createBirdFlock(CANVAS_WIDTH, CANVAS_HEIGHT);
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  // Spawn falling leaf - uses pure function from weather module
  const spawnFallingLeaf = useCallback(() => {
    if (fallingLeavesRef.current.length >= WEATHER_CONFIG.MAX_LEAVES) return;
    const newLeaf = createFallingLeaf(CANVAS_WIDTH);
    fallingLeavesRef.current.push(newLeaf);
  }, [CANVAS_WIDTH]);

  // Trigger lightning bolt - uses pure function for flash sequence
  const triggerLightningBolt = useCallback(() => {
    lightningBoltsRef.current.push(generateLightningBoltPure(CANVAS_WIDTH, CANVAS_HEIGHT));
    // Trigger flash sequence using pure function data
    const flashSequence = getLightningFlashSequence();
    flashSequence.forEach(({ delay, alpha }) => {
      setTimeout(() => setLightningAlpha(alpha), delay);
    });
    // Thunder shake using pure function params
    const thunder = getThunderEffectParams();
    setTimeout(() => {
      triggerScreenShake(thunder.shakeIntensity, thunder.shakeDuration);
      playTone(thunder.toneFreq, thunder.toneVolume, thunder.toneDuration);
    }, thunder.delay);
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, triggerScreenShake, playTone]);

  // Show floating score - skip in ultra mode to avoid re-renders
  const showFloatingScore = useCallback((value: string, x: number, y: number) => {
    if (ULTRA_PERFORMANCE_MODE) return; // Skip to avoid state updates
    const id = `score-${Date.now()}-${Math.random()}`;
    setFloatingScores(prev => [...prev, { id, value, x, y }]);
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(s => s.id !== id));
    }, 800);
  }, []);

  // Generate pipe - uses imported pure function, handles coin spawning side effect
  const generatePipeWithCoins = useCallback((isFirst: boolean = false, currentScore: number = 0): Pipe => {
    // Generate pipe using imported pure function
    const pipe = generatePipe(CANVAS_WIDTH, CANVAS_HEIGHT, currentScore, isFirst, snowAccumulationRef.current);

    // 40% chance to spawn a coin in the pipe gap (side effect)
    if (Math.random() < 0.4 && !isFirst) {
      coinsRef.current.push({
        x: CANVAS_WIDTH + PIPE_WIDTH + PIPE_SPACING / 2,
        y: pipe.gapY + (Math.random() - 0.5) * (pipe.gapSize * 0.5),
        collected: false,
        rotation: 0,
      });
    }

    return pipe;
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  // Update next leaderboard target - uses pure function from scoring.ts
  const updateNextTarget = useCallback((currentScore: number) => {
    const target = calculateNextTarget(currentScore, globalLeaderboard, beatenRanksRef.current);
    setNextTarget(target);
    return target;
  }, [globalLeaderboard]);


  // Handle score point - uses processScore from scoring.ts for milestone/leaderboard logic
  const onScorePoint = useCallback((newScore: number, pipeGapY?: number, _pointsEarned?: number, _actionWord?: string) => {
    setScore(newScore);

    // Process score through scoring module (milestones + leaderboard)
    const result = processScore(newScore, globalLeaderboard, beatenRanksRef.current);

    // Handle leaderboard beat celebration
    if (result.beatenEntry) {
      beatenRanksRef.current.add(result.beatenEntry.rank);
      setTookSpotMessage(result.tookSpotMessage);
      if (result.beatenRankCallout) showEpicCallout(result.beatenRankCallout);
      setTimeout(() => setTookSpotMessage(null), 3000);
      
      // Arcade lights: Victory lap pattern (wave + rise sequence)
      triggerEvent('progress:forward');  // waveRight
      setTimeout(() => triggerEvent('progress:up'), 350);  // rise after wave
    }

    // Update next target
    setNextTarget(result.nextTarget);

    // Arcade lights: Trigger pipe pass with progressive intensity
    // NEW: Using event-based API - pattern is determined by arcade-light-mappings.ts
    triggerEvent('progress:forward');

    // Arcade lights: Coin collect celebration on special milestones (every 10)
    if (newScore % 10 === 0 && newScore > 0) {
      triggerEvent('collect:coin');
    }

    // In ultra performance mode, skip ALL effects including sound
    if (ULTRA_PERFORMANCE_MODE) return;

    // In light effects mode, still show floating score + sound
    if (LIGHT_EFFECTS_MODE) {
      if (soundEnabled) playPassNote(newScore);
      return;
    }

    // Juice: Musical pass note (rising scale)
    playPassNote(newScore);

    // Juice: Pass particles at gap location
    if (pipeGapY !== undefined) {
      spawnPassParticles(BIRD_X + 50, pipeGapY);
    }

    // Juice: Screen brightness pulse
    setScreenBrightness(1 + JUICE_CONFIG.SCREEN_PULSE_INTENSITY);
    setTimeout(() => setScreenBrightness(1), 100);

    // Sound and haptic for every point
    if (soundEnabled) playBlockLand();
    hapticScore();

    // Apply effects based on milestone/interval type from scoring module
    const { effects, callout, emoji, specialMilestone, intervalType } = result;

    // Show callout if any (from special milestone or interval)
    if (callout) {
      const displayCallout = specialMilestone ? `${emoji} ${callout}` : callout;
      showEpicCallout(displayCallout);
    }

    // Trigger visual effects based on effects object
    if (effects.shockwave || effects.sparks || effects.vignette || effects.shake) {
      triggerBigMoment({
        shockwave: effects.shockwave,
        sparks: effects.sparks,
        vignette: effects.vignette,
        shake: effects.shake,
        score: String(newScore),
        emoji: emoji || undefined,
      });
    }

    // Sound/haptic based on celebration level
    if (effects.confetti) triggerConfetti();
    if (effects.perfectBonus && soundEnabled) playPerfectBonus();
    if (effects.highScoreHaptic) hapticHighScore();

    // Medium celebration (every 5) combo sound
    if (intervalType === 'medium') {
      if (soundEnabled) playCombo(1);
      hapticCombo(1);
    }

    // Big celebration (every 10) combo haptic
    if (intervalType === 'big') {
      hapticCombo(2);
    }
  }, [soundEnabled, playBlockLand, playCombo, playPerfectBonus, hapticScore, hapticCombo, hapticHighScore, showEpicCallout, triggerBigMoment, triggerConfetti, BIRD_X, playPassNote, spawnPassParticles, globalLeaderboard, triggerEvent]);

  // Handle game over
  const handleGameOver = useCallback(async () => {
    const state = gameStateRef.current;

    // Capture screenshot and stop music immediately
    setGameScreenshot(captureGameScreenshot(canvasRef.current));
    if (musicAudioRef.current) musicAudioRef.current.pause();
    playGameOver();

    // Clear combo lights on death
    clearLightCombo();

    // Update scores and submit to leaderboard
    const updateScores = () => {
      const result = handleGameOverScore(state.score, highScore);
      if (result.isNewHighScore) {
        setHighScore(result.newHighScore);
        setIsNewPersonalBest(true);
        playWojakChime(); // Signature chime on new high score
        // Trigger high score celebration after game over sequence
        setTimeout(() => {
          triggerEvent('game:highScore');
        }, 1600); // After gameOver animation (1500ms)
      }
      // Only submit score if minimum actions met (3 pipes passed)
      if (isSignedIn && state.score > 0 && pipesPassed.current >= 3) {
        setScoreSubmitted(true);
        submitScore(state.score, undefined, { 
          playTime: Date.now() - gameStartTimeRef.current,
          pipesPassed: pipesPassed.current,
        });
      }
    };

    // Ultra mode: skip death effects
    if (ULTRA_PERFORMANCE_MODE) {
      state.gameState = 'gameover';
      setGameState('gameover');
      triggerEvent('game:over');
      // Unified game-over effects (minimal in ultra mode)
      triggerGlobalScreenShake(GAME_OVER_SEQUENCE.shakeDuration);
      triggerVignette(GAME_OVER_SEQUENCE.vignetteColor);
      updateScores();
      return;
    }

    // Trigger death sequence with delay
    triggerDeathFreeze();
    setTimeout(() => {
      state.gameState = 'gameover';
      setGameState('gameover');
      triggerEvent('game:over');
      hapticGameOver();
      // Unified game-over effects
      triggerGlobalScreenShake(GAME_OVER_SEQUENCE.shakeDuration);
      triggerVignette(GAME_OVER_SEQUENCE.vignetteColor);
      updateScores();
    }, JUICE_CONFIG.FREEZE_DURATION + JUICE_CONFIG.SLOW_MO_DURATION + 200);
  }, [playGameOver, playWojakChime, hapticGameOver, highScore, isSignedIn, submitScore, triggerDeathFreeze, clearLightCombo, triggerEvent, triggerGlobalScreenShake, triggerVignette]);

  // Check collision - wrapper for imported pure function
  const checkCollisionWrapper = useCallback((bird: Bird, pipes: Pipe[]): boolean => {
    return checkCollision(bird, pipes, CANVAS_HEIGHT, BIRD_X);
  }, [CANVAS_HEIGHT, BIRD_X]);

  // Update bird physics - wrapper for imported pure function
  const updateBird = useCallback((bird: Bird, timeScale: number = 1, isDying: boolean = false): Bird => {
    return updateBirdPhysics(bird, timeScale, isDying);
  }, []);

  // Update pipes - uses pure helpers for physics, handles effects here
  const updatePipes = useCallback((pipes: Pipe[], currentScore: number, deltaTime: number = 1): { pipes: Pipe[]; newScore: number } => {
    const birdY = gameStateRef.current.bird.y;
    const speed = calculateMovementSpeed(currentScore, deltaTime);

    // Use helper for pipe positions and scoring
    const pipeResult = updatePipePositions(pipes, currentScore, deltaTime, CANVAS_HEIGHT, BIRD_X, birdY);
    let newScore = pipeResult.newScore;

    // Handle pipe pass effects (sound, floating score)
    // Also track pipes passed for minimum actions requirement
    if (pipeResult.passedPipes.length > 0) {
      pipesPassed.current += pipeResult.passedPipes.length;
    }
    for (const { pipe, birdY: passedBirdY } of pipeResult.passedPipes) {
      if (ULTRA_PERFORMANCE_MODE) {
        onScorePoint(newScore);
      } else {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (canvasRect && containerRect) {
          const canvasOffsetX = canvasRect.left - containerRect.left;
          const canvasOffsetY = canvasRect.top - containerRect.top;
          const scaleX = canvasRect.width / CANVAS_WIDTH;
          const scaleY = canvasRect.height / CANVAS_HEIGHT;
          showFloatingScore('+1', canvasOffsetX + (BIRD_X + 40) * scaleX, canvasOffsetY + (passedBirdY - 20) * scaleY);
        }
        onScorePoint(newScore, pipe.gapY, 1, '');
      }
    }

    // Use helper for coin positions and collection
    const coinResult = updateCoinPositions(coinsRef.current, speed, deltaTime, BIRD_X, birdY);
    coinsRef.current = coinResult.coins.filter(c => !c.collected);
    
    // NEW: Check for missed coins - reset combo
    if (coinResult.missedCoins.length > 0) {
      coinComboRef.current = 1; // Reset combo on missed coin
    }
    
    // NEW: Calculate score with combo system (+5 base × combo)
    let coinScoreTotal = 0;
    for (let i = 0; i < coinResult.collectedCoins.length; i++) {
      const coinScore = 5 * coinComboRef.current; // +5 × combo
      coinScoreTotal += coinScore;
      coinComboRef.current++; // Increment combo for next coin
    }
    newScore += coinScoreTotal;

    // Handle coin collection effects (sound, floating score)
    let comboForDisplay = coinComboRef.current - coinResult.collectedCoins.length; // Combo at time of first collect
    for (const coin of coinResult.collectedCoins) {
      playCoinSound();
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (canvasRect && containerRect) {
        const canvasOffsetX = canvasRect.left - containerRect.left;
        const canvasOffsetY = canvasRect.top - containerRect.top;
        const scaleX = canvasRect.width / CANVAS_WIDTH;
        const scaleY = canvasRect.height / CANVAS_HEIGHT;
        const coinPoints = 5 * comboForDisplay;
        const comboText = comboForDisplay > 1 ? ` 🔥${comboForDisplay}x` : '';
        showFloatingScore(`+${coinPoints}${comboText}`, canvasOffsetX + coin.x * scaleX, canvasOffsetY + (coin.y - 20) * scaleY);
        comboForDisplay++;
      }
    }

    // Use helper to check if we should spawn a new pipe
    const resultPipes = pipeResult.pipes;
    if (shouldSpawnPipe(resultPipes, CANVAS_WIDTH)) {
      resultPipes.push(generatePipeWithCoins(resultPipes.length === 0, currentScore));
    }

    return { pipes: resultPipes, newScore };
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, BIRD_X, generatePipeWithCoins, onScorePoint, showFloatingScore, playCoinSound]);

  // Draw background - wrapper for extracted renderer
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, _currentScore: number, _frameCount: number) => {
    const { cycleInfo, colors } = getCachedColors();
    const state = gameStateRef.current;

    drawBackgroundPure({
      ctx,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      cycleInfo,
      colors,
      stars: state.stars,
      clouds: cloudsRef.current,
      treesNear: treesRef.current,
      treesFar: treesFarRef.current,
      scrollOffset: scrollOffsetRef.current,
      performanceMode: PERFORMANCE_MODE,
      gradientCache: gradientCacheRef.current,
    });
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, getCachedColors]);

  // Jump function - ultra optimized for performance mode
  const jump = useCallback(() => {
    const state = gameStateRef.current;

    if (state.gameState === 'gameover' || state.isDying) return;

    // ULTRA mode: absolute minimum work
    if (ULTRA_PERFORMANCE_MODE) {
      if (state.gameState === 'idle') {
        state.gameState = 'playing';
        state.stars = generateStarsPure(CANVAS_WIDTH, CANVAS_HEIGHT);  // Generate stars for night sky
        gameStartTimeRef.current = Date.now();
        setGameState('playing');
        triggerEvent('play:active');
      }
      if (state.gameState === 'playing') {
        state.bird.velocity = PHYSICS.JUMP_VELOCITY;
        state.bird.rotation = -0.4;
      }
      return;
    }

    // LIGHT mode: deformation + score sound only (no wing particles for performance)
    if (LIGHT_EFFECTS_MODE) {
      if (state.gameState === 'idle') {
        state.gameState = 'playing';
        state.stars = generateStarsPure(CANVAS_WIDTH, CANVAS_HEIGHT);  // Generate stars for night sky
        gameStartTimeRef.current = Date.now();
        setGameState('playing');
        triggerEvent('play:active');
      }
      if (state.gameState === 'playing') {
        state.bird.velocity = PHYSICS.JUMP_VELOCITY;
        state.bird.rotation = -0.4;
        applyFlapDeformation();
      }
      return;
    }

    // Normal mode with all effects
    if (state.gameState === 'idle') {
      state.gameState = 'playing';
      state.stars = generateStarsPure(CANVAS_WIDTH, CANVAS_HEIGHT);
      gameStartTimeRef.current = Date.now();
      setGameState('playing');
      triggerEvent('play:active');
      // Removed playGameStart beep - background music plays instead
    }

    if (state.gameState === 'playing') {
      state.bird.velocity = PHYSICS.JUMP_VELOCITY;
      state.bird.rotation = -0.4;

      // Juice: Squash/stretch on flap
      applyFlapDeformation();

      // Juice: Wing particles
      spawnWingParticles(BIRD_X, state.bird.y);

      // Juice: Varied pitch haptic
      triggerHaptic(8);

      if (soundEnabled) playBlockLand();
      hapticButton();
    }
  }, [soundEnabled, playBlockLand, hapticButton, applyFlapDeformation, spawnWingParticles, triggerHaptic, BIRD_X, CANVAS_WIDTH, CANVAS_HEIGHT, triggerEvent]);

  // Reset game
  const resetGame = useCallback(() => {
    gameStateRef.current = createInitialGameState(CANVAS_HEIGHT);

    // Clear juice state
    deathParticlesRef.current = [];
    wingParticlesRef.current = [];
    passParticlesRef.current = [];
    shakeRef.current = null;
    birdXOffsetRef.current = 0;
    setImpactFlashAlpha(0);
    setScreenBrightness(1);
    setNearMissFlashAlpha(0);

    // KEEP parallax scroll position and background elements (trees, clouds, grass)
    // This prevents jarring visual changes when restarting
    // Don't reset: scrollOffsetRef, cloudsRef, treesRef, treesFarRef, grassTuftsRef
    touchRipplesRef.current = [];
    rainDropsRef.current = [];
    lightningRef.current = null;
    setLightningAlpha(0);

    // Reset coins and combo tracking
    coinsRef.current = [];
    coinComboRef.current = 1; // Reset coin combo to 1
    pipesPassed.current = 0; // Reset pipes passed for minimum actions

    // Clear timeouts
    if (freezeTimeoutRef.current) clearTimeout(freezeTimeoutRef.current);
    if (slowMoTimeoutRef.current) clearTimeout(slowMoTimeoutRef.current);

    // Music will resume from current position via useEffect when gameState changes to 'playing'

    setScore(0);
    setGameState('idle');
    setScoreSubmitted(false);
    setIsNewPersonalBest(false);
    setFloatingScores([]);
    setShowShareModal(false);
    setShareImageUrl(null);
    setGameScreenshot(null);
    setChallengeBeaten(false);
    resetAllEffects();

    // Reset leaderboard tracking
    beatenRanksRef.current = new Set();
    setNextTarget(null);
    setTookSpotMessage(null);
    updateNextTarget(0);
  }, [CANVAS_HEIGHT, resetAllEffects, updateNextTarget]);

  // Animated play again - fades out game over overlay before resetting
  const handlePlayAgain = useCallback(() => {
    setIsGameOverExiting(true);
    setTimeout(() => {
      resetGame();
      setIsGameOverExiting(false);
    }, 300); // Match the CSS animation duration
  }, [resetGame]);

  // Refs for touch handler to avoid recreating listeners
  const jumpRef = useRef<() => void>(() => {});
  const resetGameRef = useRef<() => void>(() => {});

  // Keep refs in sync
  useEffect(() => { jumpRef.current = jump; }, [jump]);
  useEffect(() => { resetGameRef.current = resetGame; }, [resetGame]);

  // Handle tap/click - simplified (for desktop, touch handler handles mobile)
  const handleTap = useCallback((_e: React.MouseEvent) => {
    // Don't do anything when game is over or dying
    if (shouldIgnoreInput(gameStateRef.current.gameState, gameStateRef.current.isDying, showExitDialogRef.current)) {
      return;
    }
    // Start/resume music if transitioning from idle (needs user gesture for audio)
    // Skip if GameModal manages the music
    if (gameStateRef.current.gameState === 'idle' && soundEnabledRef.current && !musicManagedExternallyRef.current) {
      if (musicAudioRef.current) {
        // Resume existing paused music
        musicAudioRef.current.play().catch(() => {});
      } else {
        // Start new music
        playNextSongRef.current();
      }
    }
    jumpRef.current();
  }, []);

  // Native touch handler - only set up once, uses refs
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouch = () => {
      const state = gameStateRef.current;

      // Don't do anything when game is over - use Play Again button
      if (state.gameState === 'gameover') {
        return;
      }

      // Jump - works for both idle and playing
      state.bird.velocity = PHYSICS.JUMP_VELOCITY;
      state.bird.rotation = -0.4;

      // Start game if idle
      if (state.gameState === 'idle') {
        state.gameState = 'playing';
        state.stars = generateStarsRef.current();  // Generate stars for night sky
        gameStartTimeRef.current = Date.now();
        setGameState('playing');

        // Start/resume music immediately from user gesture (required for mobile browsers)
        // Skip if GameModal manages the music
        if (soundEnabledRef.current && !musicManagedExternallyRef.current) {
          if (musicAudioRef.current) {
            // Resume existing paused music
            musicAudioRef.current.play().catch(() => {});
          } else {
            // Start new music
            playNextSongRef.current();
          }
        }
      }
    };

    // passive: true for best performance - CSS touch-action: none handles scroll prevention
    canvas.addEventListener('touchstart', handleTouch, { passive: true });
    return () => canvas.removeEventListener('touchstart', handleTouch);
  }, []); // Empty deps - only runs once!

  // Track bird X offset for death knockback
  const birdXOffsetRef = useRef(0);

  // FPS tracking for debugging
  const fpsRef = useRef({
    frames: 0,
    lastTime: performance.now(),
    fps: 0,
    rafCalls: 0,
    lastRafTime: 0,
    frameTimeMs: 0,      // Current frame time in ms
    avgFrameTime: 0,     // Rolling average frame time
    minFps: 999,         // Minimum FPS seen
    maxFrameTime: 0,     // Maximum frame time seen (worst lag)
  });

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Safari iOS optimization: disable alpha and enable desynchronized for smoother animation
    const ctx = canvas.getContext('2d', {
      alpha: false,           // No transparency needed - faster
      desynchronized: true,   // Bypass compositor for lower latency
    });
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      // Track actual RAF interval
      fpsRef.current.lastRafTime = currentTime;
      fpsRef.current.rafCalls++;

      // Frame time calculation
      const frameTimeMs = currentTime - fpsRef.current.lastRafTime;
      fpsRef.current.frameTimeMs = frameTimeMs;

      // Rolling average (smoothed)
      fpsRef.current.avgFrameTime = fpsRef.current.avgFrameTime * 0.9 + frameTimeMs * 0.1;

      // Track worst frame time
      if (frameTimeMs > fpsRef.current.maxFrameTime && fpsRef.current.frames > 10) {
        fpsRef.current.maxFrameTime = frameTimeMs;
      }

      // FPS calculation
      fpsRef.current.frames++;
      if (currentTime - fpsRef.current.lastTime >= 1000) {
        fpsRef.current.fps = fpsRef.current.frames;
        // Track minimum FPS
        if (fpsRef.current.fps < fpsRef.current.minFps && fpsRef.current.fps > 0) {
          fpsRef.current.minFps = fpsRef.current.fps;
        }
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = currentTime;
      }

      // Normalize to 60fps, cap at 4x to handle devices running as low as 15fps
      const deltaTime = Math.min((currentTime - lastTime) / 16.67, 4);
      lastTime = currentTime;

      // Update day/night cycle time (always runs, independent of game state)
      cycleTimeRef.current += deltaTime * 16.67;  // Convert back to ms
      if (cycleTimeRef.current >= CYCLE_DURATION_MS) {
        cycleTimeRef.current = cycleTimeRef.current % CYCLE_DURATION_MS;
      }

      const state = gameStateRef.current;

      // ============================================
      // WEATHER SYSTEM UPDATE (runs in idle AND playing for testing)
      // ============================================
      if (!PERFORMANCE_MODE && !ULTRA_PERFORMANCE_MODE && !state.isFrozen) {
        updateWeather(deltaTime);
        const weather = weatherRef.current;

        // Rain particles - use helper functions from weather module
        const dropsToSpawn = calculateRainSpawnCount(weather);
        const isStorm = weather.current === 'storm';
        for (let i = 0; i < dropsToSpawn && rainDropsRef.current.length < WEATHER_CONFIG.MAX_RAIN_DROPS; i++) {
          rainDropsRef.current.push(createWeatherRainDrop(CANVAS_WIDTH, isStorm));
        }
        // Trigger lightning using helper function
        if (isStorm && Math.random() < 0.008 * deltaTime && weather.intensity > 0.3) {
          triggerLightningBolt();
        }
        // Update rain drops and splashes
        if (rainDropsRef.current.length > 0) handleUpdateRainDrops();
        if (rainSplashesRef.current.length > 0) rainSplashesRef.current = updateRainSplashes(rainSplashesRef.current);

        // Snow particles - use helper functions from weather module
        if (shouldSpawnSnow(weather, deltaTime)) {
          spawnSnowflakes(calculateSnowSpawnCount(weather));
        }
        if (snowflakesRef.current.length > 0) updateSnowflakes(deltaTime);

        // Background birds (spawn periodically)
        const now = Date.now();
        if (now - lastBirdSpawnRef.current > WEATHER_CONFIG.BIRD_SPAWN_INTERVAL) {
          if (Math.random() < 0.3) spawnBirdFlock();
          lastBirdSpawnRef.current = now;
        }
        backgroundBirdsRef.current = updateBackgroundBirdsPure(backgroundBirdsRef.current, deltaTime, CANVAS_WIDTH);

        // Falling leaves (dawn, golden, sunset phases)
        const { colors: cycleColors } = getCachedColors();
        const isLeafSeason = cycleColors.currentEnv === 'golden' || cycleColors.currentEnv === 'sunset' || cycleColors.currentEnv === 'dawn';
        if (isLeafSeason && Math.random() < WEATHER_CONFIG.LEAF_SPAWN_RATE * deltaTime) {
          spawnFallingLeaf();
          if (Math.random() < 0.3) spawnFallingLeaf();
        }
        fallingLeavesRef.current = updateFallingLeavesPure(fallingLeavesRef.current, deltaTime, weatherRef.current.windSpeed, CANVAS_HEIGHT);
        lightningBoltsRef.current = updateLightningBoltsPure(lightningBoltsRef.current);
      }


      // Update physics (skip if frozen or paused by dialogs)
      const shouldUpdatePhysics = !state.isFrozen && !showExitDialogRef.current && !isContextPausedRef.current;

      if (shouldUpdatePhysics) {
        // Apply time scale for slow-mo, multiply by deltaTime for frame-rate independence
        const effectiveTimeScale = state.timeScale * deltaTime;

        if (state.gameState === 'playing' || state.isDying) {
          state.bird = updateBird(state.bird, effectiveTimeScale, state.isDying);

          // Update bird X offset for knockback
          if (state.isDying) {
            birdXOffsetRef.current += state.bird.velocityX * effectiveTimeScale;
          }

          if (!state.isDying) {
            const { pipes, newScore } = updatePipes(state.pipes, state.score, deltaTime);
            state.pipes = pipes;
            state.score = newScore;

            if (checkCollisionWrapper(state.bird, state.pipes)) {
              handleGameOver();
            }
          }
        }
      }

      // Update wing particles in LIGHT mode
      if (LIGHT_EFFECTS_MODE) {
        wingParticlesRef.current = updateParticles(wingParticlesRef.current, deltaTime);
      }

      // Update particles (skip in performance mode except death)
      if (!PERFORMANCE_MODE) {
        deathParticlesRef.current = updateParticles(deathParticlesRef.current, deltaTime);
        if (!LIGHT_EFFECTS_MODE) wingParticlesRef.current = updateParticles(wingParticlesRef.current, deltaTime);
        passParticlesRef.current = updateParticles(passParticlesRef.current, deltaTime);

        // Update scroll offset for parallax
        if (state.gameState === 'playing' && !state.isFrozen) {
          const speed = 1.5 + Math.max(0, Math.floor((state.score - 5) / 20)) * 0.15;
          scrollOffsetRef.current += speed * state.timeScale * deltaTime;
        }

        // Update touch ripples
        touchRipplesRef.current = touchRipplesRef.current.filter(ripple => {
          const elapsed = Date.now() - ripple.startTime;
          if (elapsed > 400) return false;
          ripple.radius += 3 * deltaTime;
          ripple.alpha = 1 - (elapsed / 400);
          return true;
        });

      }

      state.frameCount++;

      // === RENDER ===
      ctx.save();

      // BARE BONES MODE - absolute minimum rendering for performance testing
      if (BARE_BONES_MODE) {
        // Clear
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Ground
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);

        // Pipes - just green rectangles
        ctx.fillStyle = '#228B22';
        state.pipes.forEach(pipe => {
          const topH = pipe.gapY - PIPE_GAP / 2;
          const bottomY = pipe.gapY + PIPE_GAP / 2;
          ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topH);
          ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, CANVAS_HEIGHT - bottomY - 20);
        });

        // Bird - just an orange circle
        ctx.fillStyle = '#FF6B00';
        ctx.beginPath();
        ctx.arc(BIRD_X, state.bird.y, BIRD_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Score
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(String(state.score), CANVAS_WIDTH / 2, 50);

        // FPS
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = fpsRef.current.fps < 30 ? '#FF0000' : fpsRef.current.fps < 50 ? '#FFAA00' : '#00FF00';
        ctx.textAlign = 'left';
        ctx.fillText(`FPS: ${fpsRef.current.fps}`, 10, 20);
        ctx.fillText(`DT: ${deltaTime.toFixed(2)}`, 10, 36);

        // Idle screen
        if (state.gameState === 'idle') {
          ctx.fillStyle = 'var(--color-black-50)';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.fillStyle = '#FFF';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Tap to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        }

        ctx.restore();
        // Don't call requestAnimationFrame here - MessageChannel handles it
        return;
      }

      // Apply screen shake
      if (applyShakeToContext(ctx, shakeRef.current)) shakeRef.current = null;

      // Apply screen brightness - skip in performance mode (filters are expensive)
      if (!PERFORMANCE_MODE) {
        const brightness = screenBrightnessRef.current;
        if (brightness !== 1) {
          ctx.filter = `brightness(${brightness})`;
        }
      }

      ctx.clearRect(-10, -10, CANVAS_WIDTH + 20, CANVAS_HEIGHT + 20);
      drawBackground(ctx, state.score, state.frameCount);

      // Draw fireflies at night BEFORE pipes
      const { cycleInfo } = getCachedColors();
      if (!cycleInfo.isDay && !PERFORMANCE_MODE) {
        drawFirefliesRenderer(ctx, firefliesRef.current);
      }

      // WEATHER BACKGROUND ELEMENTS (before pipes)
      if (!PERFORMANCE_MODE && !ULTRA_PERFORMANCE_MODE) {
        const weather = weatherRef.current;
        drawBackgroundBirdsRenderer(ctx, backgroundBirdsRef.current);
        drawFallingLeavesRenderer(ctx, fallingLeavesRef.current);
        if (weather.current === 'storm' && weather.intensity > 0) {
          ctx.save();
          ctx.fillStyle = `rgba(30, 30, 50, ${0.35 * weather.intensity})`;
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.restore();
        }
        if (weather.current === 'snow' || snowflakesRef.current.length > 0) {
          drawSnowflakesRenderer(ctx, snowflakesRef.current, false);
        }
        if (weather.current === 'rain' || weather.current === 'storm' || rainDropsRef.current.length > 0) {
          drawRainRenderer(ctx, rainDropsRef.current, false);
        }
        if (rainSplashesRef.current.length > 0) drawRainSplashesRenderer(ctx, rainSplashesRef.current);
        if (weather.fogIntensity > 0) drawFogRenderer(ctx, weather.fogIntensity, CANVAS_WIDTH, CANVAS_HEIGHT);
        if (lightningBoltsRef.current.length > 0) drawLightningBoltsRenderer(ctx, lightningBoltsRef.current);
      }

      if (!PERFORMANCE_MODE && state.gameState === 'playing') {
        drawPipeGapHighlightRenderer(ctx, state.pipes, BIRD_X);
      }

      drawPipesRenderer(ctx, state.pipes, CANVAS_HEIGHT, PERFORMANCE_MODE);

      // Snow accumulation and frost
      if (!PERFORMANCE_MODE && !ULTRA_PERFORMANCE_MODE) {
        if (snowGroundEdgeRef.current > 0 && snowAccumulationRef.current > 0) {
          drawSnowAccumulationRenderer(ctx, snowAccumulationRef.current, snowGroundEdgeRef.current, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
        drawPipeFrostRenderer(ctx, state.pipes, CANVAS_HEIGHT);
      }

      // Draw coins
      coinsRef.current.forEach(coin => drawCoinRenderer(ctx, coin, PERFORMANCE_MODE || ULTRA_PERFORMANCE_MODE));

      // Draw wing particles (LIGHT mode or full mode)
      if (LIGHT_EFFECTS_MODE || !PERFORMANCE_MODE) drawParticlesRenderer(ctx, wingParticlesRef.current);

      // Draw bird
      drawBirdRenderer(ctx, state.bird, BIRD_X, birdXOffsetRef.current);

      // Draw particles (skip in performance mode)
      if (!PERFORMANCE_MODE) {
        drawParticlesRenderer(ctx, passParticlesRef.current);
        drawParticlesRenderer(ctx, deathParticlesRef.current);
      }

      // WEATHER FOREGROUND ELEMENTS (on top of pipes/bird)
      if (!PERFORMANCE_MODE && !ULTRA_PERFORMANCE_MODE) {
        const weather = weatherRef.current;
        if (weather.current === 'snow' || snowflakesRef.current.length > 0) drawSnowflakesRenderer(ctx, snowflakesRef.current, true);
        if (weather.current === 'rain' || weather.current === 'storm' || rainDropsRef.current.length > 0) drawRainRenderer(ctx, rainDropsRef.current, true);
        if (weather.fogIntensity > 0) {
          ctx.save();
          ctx.fillStyle = `rgba(220, 220, 230, ${0.25 * weather.fogIntensity})`;
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          const fogGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.6, 0, CANVAS_HEIGHT);
          fogGradient.addColorStop(0, 'rgba(200, 200, 210, 0)');
          fogGradient.addColorStop(1, `rgba(180, 180, 195, ${0.35 * weather.fogIntensity})`);
          ctx.fillStyle = fogGradient;
          ctx.fillRect(0, CANVAS_HEIGHT * 0.6, CANVAS_WIDTH, CANVAS_HEIGHT * 0.4);
          ctx.restore();
        }
      }

      if (state.gameState === 'playing' || state.isDying) {
        drawScoreRenderer(ctx, state.score, CANVAS_WIDTH);
        drawLeaderboardCountdownRenderer(ctx, state.score, CANVAS_WIDTH, nextTarget);
        drawTookSpotMessageRenderer(ctx, CANVAS_WIDTH, tookSpotMessage);
      }

      if (state.gameState === 'idle') drawIdleScreenRenderer(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Post-processing effects
      if (!PERFORMANCE_MODE) {
        drawTouchRipplesRenderer(ctx, touchRipplesRef.current);
        const { colors: cycleColors } = getCachedColors();
        drawVignetteRenderer(ctx, cycleColors.currentEnv, CANVAS_WIDTH);
        drawNearMissFlashRenderer(ctx, nearMissFlashAlphaRef.current, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawLightningFlashRenderer(ctx, lightningAlphaRef.current, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawImpactFlashRenderer(ctx, impactFlashAlphaRef.current, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // Debug overlay - shows performance metrics
      // Compact FPS display in top center
      if (DEBUG_OVERLAY) {
        ctx.save();
        const fps = fpsRef.current.fps;
        const minFps = fpsRef.current.minFps === 999 ? '--' : fpsRef.current.minFps;
        const text = `FPS: ${fps} | Min: ${minFps}`;

        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';

        // Position at top center
        const textX = CANVAS_WIDTH / 2;
        const textY = 20;

        // Draw background pill
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = 'var(--color-black-60)';
        ctx.beginPath();
        ctx.roundRect(textX - textWidth / 2 - 10, textY - 12, textWidth + 20, 18, 9);
        ctx.fill();

        // Draw text with color coding
        ctx.fillStyle = fps >= 60 ? '#00FF00' : fps >= 45 ? '#FFFF00' : fps >= 30 ? '#FFA500' : '#FF0000';
        ctx.fillText(text, textX, textY);

        ctx.restore();
      }

      ctx.restore();

      // Only use RAF if not using MessageChannel
      if (!USE_MESSAGE_CHANNEL_LOOP) {
        animationId = requestAnimationFrame(gameLoop);
      }
    };

    // Use MessageChannel for iOS Safari/WebKit - bypasses RAF throttling
    if (USE_MESSAGE_CHANNEL_LOOP) {
      const messageChannel = new MessageChannel();
      let running = true;
      let lastFrameTime = 0;
      // Target ~72fps (14ms) for slightly lower input latency than 60fps (16.67ms)
      const targetFrameTime = 14;

      const fastLoop = () => {
        if (!running) return;

        const now = performance.now();
        const elapsed = now - lastFrameTime;

        // Render if enough time has passed
        if (elapsed >= targetFrameTime) {
          lastFrameTime = now;
          gameLoop(now);
        }

        messageChannel.port1.postMessage(null);
      };

      messageChannel.port2.onmessage = fastLoop;
      messageChannel.port1.postMessage(null);

      return () => {
        running = false;
        messageChannel.port1.close();
        messageChannel.port2.close();
      };
    }

    // Start the loop if not using MessageChannel (MessageChannel starts itself above)
    if (!USE_MESSAGE_CHANNEL_LOOP) {
      animationId = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (!USE_MESSAGE_CHANNEL_LOOP) {
        cancelAnimationFrame(animationId);
      }
      // Cleanup timeouts
      if (freezeTimeoutRef.current) clearTimeout(freezeTimeoutRef.current);
      if (slowMoTimeoutRef.current) clearTimeout(slowMoTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CANVAS_WIDTH, CANVAS_HEIGHT, BIRD_X]);

  // ============================================
  // RENDER
  // Document-level click listener for clicking anywhere to jump
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Don't trigger anything when game is over - let buttons handle themselves
      if (gameStateRef.current.gameState === 'gameover') {
        return;
      }

      // Don't trigger jump if clicking on buttons or debug panel
      const target = e.target as HTMLElement;
      if (shouldBlockTapPropagation(target)) {
        return;
      }

      // Only respond to clicks inside the game container (not intro screen)
      // The flappy-container must be visible AND the click must be within it
      if (!containerRef.current?.contains(target)) {
        return;
      }

      handleTap(e as unknown as React.MouseEvent);
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [handleTap]);

  // ============================================
  return (
    <>
      <div ref={containerRef} className={`flappy-container ${isMobile ? 'mobile' : 'desktop'}`}>
      <GameSEO
        gameName="Flappy Orange"
        gameSlug="flappy-orange"
        description="Guide your orange through pipes in this addictive arcade game. Tap to flap and avoid obstacles!"
        genre="Arcade"
      />
      {/* Control Buttons */}
      <button
        className="fo-back-btn"
        onClick={(e) => { e.stopPropagation(); navigate('/games'); }}
        aria-label="Back to games"
      >
        <ArrowLeft size={24} />
      </button>

      {/* Debug: Music track switcher */}
      <DebugMusicButtons enabled={DEBUG_OVERLAY} playTrack={playTrack} />

      {/* Visual Effects - disabled in performance mode */}
      {!PERFORMANCE_MODE && <GameEffects effects={effects} accentColor="#ff6b00" />}

      {/* Game Canvas - touch handled via native listener for performance */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleTap}
        className="fo-canvas"
      />

      {/* Floating Scores */}
      <FloatingScores scores={floatingScores} />

      {/* Game Over Overlay - Uses shared component */}
      {gameState === 'gameover' && (
        <ArcadeGameOverScreen
          score={score}
          highScore={highScore}
          scoreLabel="pipes passed"
          isNewPersonalBest={isNewPersonalBest}
          isSignedIn={isSignedIn}
          isSubmitting={isSubmitting}
          scoreSubmitted={scoreSubmitted}
          userDisplayName={userDisplayName ?? undefined}
          leaderboard={globalLeaderboard}
          onPlayAgain={handlePlayAgain}
          onShare={openShareModal}
          accentColor="#ff6b00"
          isExiting={isGameOverExiting}
          meetsMinimumActions={pipesPassed.current >= 3}
          minimumActionsMessage="Pass at least 3 pipes to be on the leaderboard"
        />
      )}

      {/* Challenge Banners */}
      <ChallengeBanners
        challengeTarget={challengeTarget}
        challengeBeaten={challengeBeaten}
        gameState={gameState}
      />

      {/* Toast Notification */}
      <Toast toast={toast} />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareImageUrl={shareImageUrl}
        onDownload={handleDownloadImage}
      />

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
    </>
  );
};

export default FlappyOrange;
