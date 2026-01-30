import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pause, Play } from 'lucide-react';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useGameHaptics } from '@/systems/haptics';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useGameEffects, GameEffects } from '@/components/media';
import { useGameNavigationGuard } from '@/hooks/useGameNavigationGuard';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { GameSEO } from '@/components/seo/GameSEO';
import { useGameMute } from '@/contexts/GameMuteContext';
import { useMobileGameFullscreen } from '@/hooks/useMobileGameFullscreen';
import { useArcadeLights } from '@/contexts/ArcadeLightsContext';
import { GAME_OVER_SEQUENCE } from '@/lib/juice/brandConstants';
import { captureGameArea } from '@/systems/sharing/captureDOM';
import { generateGameScorecard } from '@/systems/sharing/GameScorecard';
import { ArcadeGameOverScreen } from '@/components/media/games/ArcadeGameOverScreen';
import { GameButton } from '@/components/ui/GameButton';
import {
  FREEZE_DURATIONS,
  SHAKE_CONFIG,
  CLEAR_CALLOUTS,
  DANGER_THRESHOLDS,
  DANGER_HAPTIC_INTERVALS,
  STREAK_CONFIG,
  PERFECT_CLEAR_BONUS,
  MUSIC_PLAYLIST,
  type DangerLevel,
} from './games/block-puzzle/config';
import {
  playComboNote as playComboNoteSound,
  playLineClearSound as playLineClearSoundFn,
  playSpawnSound as playSpawnSoundFn,
  playSnapSound as playSnapSoundFn,
  playInvalidSound as playInvalidSoundFn,
  playComboBreakSound as playComboBreakSoundFn,
  startDangerSound as startDangerSoundFn,
  stopDangerSound as stopDangerSoundFn,
  playPerfectClearSound as playPerfectClearSoundFn,
  playStreakFireSound as playStreakFireSoundFn,
  type DangerSoundState,
} from './games/block-puzzle/sounds';
import {
  triggerLineClearHaptic,
  triggerSnapHaptic,
  triggerInvalidHaptic,
  triggerDragStartHaptic,
  triggerPerfectClearHaptic,
  triggerDangerPulse,
  triggerStreakFireHaptic,
} from './games/block-puzzle/haptics';
import {
  createLineClearBurstParticles,
  createPlacementParticles as createPlacementParticlesFn,
  createPerfectClearParticles,
  createTrailParticle,
  createShockwave,
  updateTrailParticles,
  updateShockwaves,
} from './games/block-puzzle/effects';
import type {
  ClearParticle,
  TrailParticle,
  Shockwave,
  StreakState,
  Grid,
  DraggablePiece,
} from './games/block-puzzle/types';
import {
  createEmptyGrid,
  generateRandomPiece,
  generateThreePieces,
  canPlacePiece,
  canPlaceAnywhere,
  placePiece,
  clearLines,
  checkSameColorLines,
  isGameOver,
  getPreviewCells,
  countFilledCells,
  checkPerfectClear,
  countValidMoves,
  decodeChallenge,
} from './games/block-puzzle/game-logic';
import './BlockPuzzle.css';

// ============================================
// MAIN COMPONENT
// ============================================
const BlockPuzzle: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { playGameOver, playWojakChime } = useGameSounds();
  const { hapticGameOver, hapticButton } = useGameHaptics();

  // Visual effects
  const {
    effects,
    triggerBigMoment,
    triggerConfetti,
    showEpicCallout,
    resetAllEffects,
    triggerScreenShake,
    triggerVignette,
  } = useGameEffects();

  // Leaderboard
  const {
    leaderboard: globalLeaderboard,
    submitScore,
    isSignedIn,
    userDisplayName,
    isSubmitting,
  } = useLeaderboard('block-puzzle');
  // Arcade frame mute control (from GameModal)
  const { isMuted: arcadeMuted, musicManagedExternally, gameStarted } = useGameMute();

  // Arcade lights control
  const { triggerEvent, setGameId } = useArcadeLights();

  // Register this game for per-game light overrides
  useEffect(() => {
    setGameId('block-puzzle');
  }, [setGameId]);

  // Game state
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [grid, setGrid] = useState<Grid>(createEmptyGrid);
  const [pieces, setPieces] = useState<DraggablePiece[]>(generateThreePieces);
  const [score, setScore] = useState(0);
  const [totalLinesCleared, setTotalLinesCleared] = useState(0);
  const [totalBlocksPlaced, setTotalBlocksPlaced] = useState(0);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [showPerfectClear, setShowPerfectClear] = useState(false);

  // PHASE 10: Viral Share System state
  // TASK 125: Track best combo for share
  const [bestCombo, setBestCombo] = useState(0);
  // TASK 114: Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [gameScreenshot, setGameScreenshot] = useState<string | null>(null);
  // TASK 116-117: Challenge system
  const [challengeTarget, setChallengeTarget] = useState<number | null>(null);
  const [challengeBeaten, setChallengeBeaten] = useState(false);
  // TASK 127: Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Drag state - use refs to avoid stale closures
  const [draggedPieceId, setDraggedPieceId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [previewPosition, setPreviewPosition] = useState<{ row: number; col: number } | null>(null);
  const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());
  const [justPlacedCells, setJustPlacedCells] = useState<Set<string>>(new Set());

  // Effect states for "juice"
  const [shakeLevel, setShakeLevel] = useState<'none' | 'light' | 'medium' | 'heavy'>('none');
  const [floatingScores, setFloatingScores] = useState<Array<{
    id: string;
    value: number;
    x: number;
    y: number;
    isBig: boolean;
    multiplier?: string; // TASK 107: Optional multiplier text
  }>>([]);
  const [combo, setCombo] = useState(0);
  const [newPieceId, setNewPieceId] = useState<string | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // TASK 103 & 110: Combo visualization state
  const comboStartTimeRef = useRef<number>(0);

  // PHASE 3: EXPLOSIVE LINE CLEARS state
  // TASK 27: Freeze frame state
  const [freezeFrame, setFreezeFrame] = useState(false);
  const freezeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // TASK 32: Particle state for line clear bursts
  // clearParticles state removed — particles now use direct DOM manipulation via spawnDOMParticles

  // TASK 30: Shockwave state
  const [shockwaves, setShockwaves] = useState<Shockwave[]>([]);

  // TASK 39: Screen flash state
  const [screenFlash, setScreenFlash] = useState<string | null>(null);

  // PHASE 4: Drag trail particles state
  // TASK 43: Trail particle state
  const [trailParticles, setTrailParticles] = useState<TrailParticle[]>([]);
  const lastTrailPosRef = useRef({ x: 0, y: 0 });
  // TASK 52: Snap detection state
  const [isSnapped, setIsSnapped] = useState(false);
  const prevSnappedRef = useRef(false);

  // PHASE 6: Danger state system
  // TASK 70: Danger level state
  const [dangerLevel, setDangerLevel] = useState<DangerLevel>('safe');
  // TASK 73: Valid placement cells for highlighting
  const [validPlacements, setValidPlacements] = useState<Set<string>>(new Set());
  // TASK 78: Moves left warning
  const [movesLeft, setMovesLeft] = useState<number | null>(null);
  const dangerHapticIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // PHASE 7: Streak fire mode state
  // TASK 83: Streak state
  const [streakState, setStreakState] = useState<StreakState>({ count: 0 });

  // PHASE 1: Audio context for procedural sounds
  const audioContextRef = useRef<AudioContext | null>(null);
  const dangerLoopRef = useRef<OscillatorNode | null>(null);
  const dangerGainRef = useRef<GainNode | null>(null);

  // Get or create audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Refs for drag state (to avoid stale closures) - MUST be before useEffect that uses them
  const containerRef = useRef<HTMLDivElement>(null);

  // iOS audio unlock - only check when context exists and isn't running
  // Optimized to avoid unnecessary work on every touch
  const audioUnlockedRef = useRef(false);

  useEffect(() => {
    const unlockAudio = () => {
      // Skip if already unlocked and running
      if (audioUnlockedRef.current && audioContextRef.current?.state === 'running') return;

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      if (audioContextRef.current.state !== 'running') {
        audioContextRef.current.resume().then(() => {
          audioUnlockedRef.current = true;
        }).catch(() => {});
      } else {
        audioUnlockedRef.current = true;
      }
    };

    document.addEventListener('touchstart', unlockAudio, { passive: true });
    return () => document.removeEventListener('touchstart', unlockAudio);
  }, []);

  const draggedPieceIdRef = useRef<string | null>(null);
  const previewPositionRef = useRef<{ row: number; col: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const piecesRef = useRef<DraggablePiece[]>(pieces);
  const gridStateRef = useRef<Grid>(grid);

  // High score
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('blockPuzzleHighScore') || '0', 10);
  });
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  // Sound and pause state
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('blockPuzzleSoundEnabled') !== 'false';
  });
  const [isPaused, setIsPaused] = useState(false);

  // Background music refs
  const playlistIndexRef = useRef(Math.floor(Math.random() * MUSIC_PLAYLIST.length));
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundEnabledRef = useRef(soundEnabled);
  const gameStateRef = useRef(gameState);

  // Keep refs in sync
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Ref for musicManagedExternally (to check in startGame)
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
      } else if (gameStateRef.current === 'playing' && !isPaused) {
        if (musicAudioRef.current) {
          musicAudioRef.current.play().catch(() => {});
        }
      }
    }
  }, [arcadeMuted, musicManagedExternally, isPaused]);

  // Play specific track
  const playTrack = useCallback((index: number) => {
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
    }
    playlistIndexRef.current = index;
    const track = MUSIC_PLAYLIST[index];
    const music = new Audio(track.src);
    music.volume = 1.0;
    music.addEventListener('ended', () => {
      playlistIndexRef.current = (playlistIndexRef.current + 1) % MUSIC_PLAYLIST.length;
      if (gameStateRef.current === 'playing' && soundEnabledRef.current) {
        playTrack(playlistIndexRef.current);
      }
    }, { once: true });
    musicAudioRef.current = music;
    music.play().catch(() => {});
  }, []);

  // Play next song in playlist
  const playNextSong = useCallback(() => {
    playTrack(playlistIndexRef.current);
  }, [playTrack]);

  // Cleanup music on unmount
  useEffect(() => {
    return () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current = null;
      }
    };
  }, []);

  // Visibility change handling - pause music when browser goes to background (mobile)
  const wasPlayingBeforeHiddenRef = useRef(false);
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - remember if music was playing and pause it
        wasPlayingBeforeHiddenRef.current = !!(musicAudioRef.current && !musicAudioRef.current.paused);
        if (musicAudioRef.current) {
          musicAudioRef.current.pause();
        }
      } else {
        // Page became visible - resume music if it was playing before
        if (wasPlayingBeforeHiddenRef.current && gameStateRef.current === 'playing' && soundEnabledRef.current && !musicManagedExternallyRef.current && !isPaused) {
          if (musicAudioRef.current) {
            musicAudioRef.current.play().catch(() => {});
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPaused]);

  // Control music based on game state and pause
  useEffect(() => {
    if (gameState === 'playing' && soundEnabled && !isPaused) {
      if (musicAudioRef.current) {
        musicAudioRef.current.play().catch(() => {});
      }
    } else {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
      }
    }
  }, [gameState, soundEnabled, isPaused]);

  // Mobile fullscreen mode - hide navigation and lock scroll for all active game states
  const isActiveGameState = gameState !== 'idle';
  useMobileGameFullscreen(isActiveGameState, isMobile);

  // Navigation guard - prevents accidental exits during gameplay
  const { showExitDialog, confirmExit, cancelExit } = useGameNavigationGuard({
    isPlaying: gameState === 'playing',
    onConfirmExit: () => navigate('/games'),
  });

  // Keep refs in sync with state
  useEffect(() => {
    piecesRef.current = pieces;
  }, [pieces]);

  useEffect(() => {
    gridStateRef.current = grid;
  }, [grid]);

  useEffect(() => {
    draggedPieceIdRef.current = draggedPieceId;
  }, [draggedPieceId]);

  useEffect(() => {
    previewPositionRef.current = previewPosition;
  }, [previewPosition]);

  // Calculate cell size based on viewport
  // Grid has: 2px border, padding (3px mobile, 4px desktop), 2px gaps between cells
  // Desktop arcade: larger grid (540px) to fill the screen height better
  // Mobile: responsive grid based on screen width
  const GRID_SIZE = isMobile ? Math.min(window.innerWidth - 32, 360) : 540;
  const GRID_BORDER = 2 * 2; // 4px
  const GRID_PADDING = isMobile ? 3 * 2 : 4 * 2; // 6px mobile, 8px desktop
  const GRID_GAPS = 2 * 7; // 14px (7 gaps between 8 cells)
  // With border-box, GRID_SIZE includes border. Content area is what's left for cells.
  const CELL_SIZE = (GRID_SIZE - GRID_BORDER - GRID_PADDING - GRID_GAPS) / 8;
  // Piece cell size must fit largest piece (5-wide) in slot: 5*cell + 4 gaps < slot width
  // Desktop arcade: 90px slots (vertical rack), Mobile: responsive based on width
  const getSlotSize = () => {
    if (!isMobile) return 90; // Matches .arcade-screen .bp-piece-slot CSS
    const width = window.innerWidth;    if (width <= 360) return 75;
    if (width <= 400) return 85;
    return 95;
  };
  const slotSize = getSlotSize();
  // Calculate cell size: (slotSize - 4 gaps) / 5 cells, with some padding
  const PIECE_CELL_SIZE = Math.floor((slotSize - 8) / 5);

  // Get piece by ID
  const getPieceById = useCallback((id: string): DraggablePiece | undefined => {
    return piecesRef.current.find(p => p.id === id);
  }, []);

  // Toggle pause
  const togglePause = useCallback(() => {
    if (gameState !== 'playing') return;
    // Unlock/resume audio on user gesture (iOS requirement)
    if (audioContextRef.current) {
      audioContextRef.current.resume().catch(() => {});
    }
    setIsPaused(prev => !prev);
    hapticButton();
  }, [gameState, hapticButton]);

  // Show floating score popup
  // TASK 107: Updated to show optional multiplier
  const showFloatingScore = useCallback((value: number, x: number, y: number, isBig = false, multiplier?: string) => {
    const id = `score-${Date.now()}-${Math.random()}`;
    setFloatingScores(prev => [...prev, { id, value, x, y, isBig, multiplier }]);
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(s => s.id !== id));
    }, 1000);
  }, []);

  // ============================================
  // PHASE 3: EXPLOSIVE LINE CLEARS FUNCTIONS
  // ============================================

  // TASK 27: Trigger freeze frame
  const triggerFreezeFrame = useCallback((duration: number) => {
    if (duration <= 0) return;
    setFreezeFrame(true);
    if (freezeTimeoutRef.current) clearTimeout(freezeTimeoutRef.current);
    freezeTimeoutRef.current = setTimeout(() => setFreezeFrame(false), duration);
  }, []);

  // TASK 33: Particle system — direct DOM for guaranteed fade-out
  const particleLayerRef = useRef<HTMLDivElement>(null);
  const spawnDOMParticles = useCallback((particles: ClearParticle[]) => {
    const layer = particleLayerRef.current;
    if (!layer) return;
    particles.forEach(p => {
      const el = document.createElement('div');
      el.className = 'bp-clear-particle';
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
      el.style.width = `${p.size}px`;
      el.style.height = `${p.size}px`;
      el.style.backgroundColor = p.color;
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%, -50%) scale(1)';
      el.style.transition = 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s ease-in';
      layer.appendChild(el);
      // Trigger reflow then animate to end state
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = '0';
          el.style.transform = `translate(calc(-50% + ${p.vx * 20}px), calc(-50% + ${p.vy * 20}px)) rotate(${p.rotation + p.rotationSpeed * 20}deg) scale(0.3)`;
        });
      });
      // Remove from DOM after transition completes
      setTimeout(() => el.remove(), 550);
    });
  }, []);

  // Shockwave animation — rAF-chaining pattern
  useEffect(() => {
    if (shockwaves.length === 0) return;
    const raf = requestAnimationFrame(() => {
      setShockwaves(updateShockwaves);
    });
    return () => cancelAnimationFrame(raf);
  }, [shockwaves]);

  // TASK 30: Trigger shockwave effect
  const triggerShockwave = useCallback((x: number, y: number, maxSize: number = 300) => {
    const shockwave = createShockwave(x, y, maxSize);
    setShockwaves(prev => [...prev, shockwave]);
  }, []);

  // TASK 32: Create particle burst from cleared cells
  const createLineClearBurst = useCallback((cells: { row: number; col: number }[], color: string) => {
    const newParticles = createLineClearBurstParticles(cells, color, CELL_SIZE);
    spawnDOMParticles(newParticles);
  }, [CELL_SIZE, spawnDOMParticles]);

  // TASK 39: Trigger screen flash
  const triggerScreenFlash = useCallback((color: string) => {
    setScreenFlash(color);
    setTimeout(() => setScreenFlash(null), 150);
  }, []);

  // Sound wrapper callbacks
  const dangerSoundStateRef = useRef<DangerSoundState>({ oscillator: null, gain: null });
  const playComboNote = useCallback(async (comboLevel: number) => {
    if (!soundEnabled) return;
    await playComboNoteSound(getAudioContext(), comboLevel);
  }, [soundEnabled, getAudioContext]);
  const playLineClearSound = useCallback((linesCleared: number) => {
    if (!soundEnabled) return;
    playLineClearSoundFn(getAudioContext(), linesCleared);
  }, [soundEnabled, getAudioContext]);
  const playSpawnSound = useCallback(() => {
    if (!soundEnabled) return;
    playSpawnSoundFn(getAudioContext());
  }, [soundEnabled, getAudioContext]);
  const playSnapSound = useCallback(() => {
    if (!soundEnabled) return;
    playSnapSoundFn(getAudioContext());
  }, [soundEnabled, getAudioContext]);
  const playInvalidSound = useCallback(() => {
    if (!soundEnabled) return;
    playInvalidSoundFn(getAudioContext());
  }, [soundEnabled, getAudioContext]);
  const playComboBreakSound = useCallback((lostCombo: number) => {
    if (!soundEnabled) return;
    playComboBreakSoundFn(getAudioContext(), lostCombo);
  }, [soundEnabled, getAudioContext]);
  const startDangerSound = useCallback(() => {
    if (!soundEnabled || dangerSoundStateRef.current.oscillator) return;
    const ctx = getAudioContext();
    const newState = startDangerSoundFn(ctx, dangerSoundStateRef.current);
    dangerSoundStateRef.current = newState;
    dangerLoopRef.current = newState.oscillator;
    dangerGainRef.current = newState.gain;
  }, [soundEnabled, getAudioContext]);
  const stopDangerSound = useCallback(() => {
    const ctx = getAudioContext();
    const newState = stopDangerSoundFn(ctx, dangerSoundStateRef.current);
    dangerSoundStateRef.current = newState;
    dangerLoopRef.current = null;
    dangerGainRef.current = null;
  }, [getAudioContext]);
  const playPerfectClearSound = useCallback(() => {
    if (!soundEnabled) return;
    playPerfectClearSoundFn(getAudioContext());
  }, [soundEnabled, getAudioContext]);
  const playStreakFireSound = useCallback(() => {
    if (!soundEnabled) return;
    playStreakFireSoundFn(getAudioContext());
  }, [soundEnabled, getAudioContext]);

  // Trail particle callbacks
  const emitTrailParticle = useCallback((x: number, y: number, color: string) => {
    const particle = createTrailParticle(x, y, lastTrailPosRef.current, color);
    if (particle) {
      lastTrailPosRef.current = { x, y };
      setTrailParticles(prev => [...prev, particle]);
    }
  }, []);
  const clearTrailParticles = useCallback(() => {
    setTrailParticles([]);
    lastTrailPosRef.current = { x: 0, y: 0 };
  }, []);
  useEffect(() => {
    if (trailParticles.length === 0) return;
    const interval = setInterval(() => setTrailParticles(updateTrailParticles), 16);
    return () => clearInterval(interval);
  }, [trailParticles.length > 0]);

  // Placement feedback callbacks
  const triggerMiniShake = useCallback(() => {
    setShakeLevel('light');
    setTimeout(() => setShakeLevel('none'), 100);
  }, []);
  const createPlacementParticles = useCallback((placedCells: string[], color: string) => {
    const newParticles = createPlacementParticlesFn(placedCells, color, CELL_SIZE);
    spawnDOMParticles(newParticles);
  }, [CELL_SIZE, spawnDOMParticles]);

  // Perfect clear effects
  const triggerMassiveConfetti = useCallback(() => {
    triggerConfetti();
    setTimeout(() => triggerConfetti(), 150);
    setTimeout(() => triggerConfetti(), 300);
    setTimeout(() => triggerConfetti(), 500);
    setTimeout(() => triggerConfetti(), 750);
  }, [triggerConfetti]);
  const triggerPerfectClear = useCallback(() => {
    playPerfectClearSound();
    triggerPerfectClearHaptic();
    setShowPerfectClear(true);
    showEpicCallout('PERFECT CLEAR!');
    triggerMassiveConfetti();
    triggerScreenFlash('#ffffff');
    const perfectParticles = createPerfectClearParticles(GRID_SIZE);
    spawnDOMParticles(perfectParticles);

    setTimeout(() => setShowPerfectClear(false), 2500);
  }, [playPerfectClearSound, triggerPerfectClearHaptic, showEpicCallout, triggerMassiveConfetti, triggerScreenFlash, GRID_SIZE]);

  // Share system callbacks
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);
  const generateShareImage = useCallback(async (): Promise<string> => {
    const blob = await generateGameScorecard({
      gameName: 'Block Puzzle',
      gameNameParts: ['BLOCK', 'PUZZLE'],
      score,
      scoreLabel: 'points',
      bestScore: highScore,
      isNewRecord: isNewPersonalBest,
      screenshot: gameScreenshot,
      accentColor: '#ff6b00', // Orange accent
    });

    // Convert blob to data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }, [score, highScore, isNewPersonalBest, gameScreenshot]);

  // TASK 122: Download share image
  const handleDownloadImage = useCallback(async () => {
    hapticButton();
    const imageUrl = await generateShareImage();
    const link = document.createElement('a');
    link.download = `block-puzzle-${score}.png`;
    link.href = imageUrl;
    link.click();
    showToast('Image downloaded!');
  }, [generateShareImage, score, showToast, hapticButton]);

  // TASK 114: Open share modal
  const openShareModal = useCallback(async () => {
    const imageUrl = await generateShareImage();
    setShareImageUrl(imageUrl);
    setShowShareModal(true);
  }, [generateShareImage]);

  // TASK 119: Celebrate challenge victory
  const celebrateChallengeVictory = useCallback(() => {
    setChallengeBeaten(true);
    showEpicCallout('CHALLENGE BEATEN!');
    triggerMassiveConfetti();
    playPerfectClearSound();
    triggerPerfectClearHaptic();
  }, [showEpicCallout, triggerMassiveConfetti, playPerfectClearSound, triggerPerfectClearHaptic]);

  // TASK 70: Update danger level based on grid fill
  useEffect(() => {
    if (gameState !== 'playing') return;

    const filledCells = countFilledCells(grid);
    const fillPercent = filledCells / 64;

    let newLevel: DangerLevel = 'safe';
    if (fillPercent >= DANGER_THRESHOLDS.imminent) {
      newLevel = 'imminent';
    } else if (fillPercent >= DANGER_THRESHOLDS.critical) {
      newLevel = 'critical';
    } else if (fillPercent >= DANGER_THRESHOLDS.warning) {
      newLevel = 'warning';
    }

    setDangerLevel(newLevel);
  }, [grid, gameState]);

  // TASK 73: Calculate valid placement cells when in danger
  useEffect(() => {
    if (dangerLevel === 'safe' || gameState !== 'playing') {
      setValidPlacements(new Set());
      return;
    }

    // Only highlight in critical/imminent states
    if (dangerLevel === 'warning') {
      setValidPlacements(new Set());
      return;
    }

    const valid = new Set<string>();
    pieces.forEach(piece => {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (canPlacePiece(grid, piece.shape, row, col)) {
            // Mark cells this piece would occupy
            piece.shape.forEach((shapeRow, r) => {
              shapeRow.forEach((cell, c) => {
                if (cell) valid.add(`${row + r}-${col + c}`);
              });
            });
          }
        }
      }
    });
    setValidPlacements(valid);
  }, [grid, pieces, dangerLevel, gameState]);

  // TASK 75-76: Start/stop danger sound based on danger level
  useEffect(() => {
    if (gameState !== 'playing') {
      stopDangerSound();
      return;
    }

    if (dangerLevel !== 'safe') {
      startDangerSound();
    } else {
      stopDangerSound();
    }
  }, [dangerLevel, gameState, startDangerSound, stopDangerSound]);

  // TASK 77: Periodic danger haptic
  useEffect(() => {
    if (dangerHapticIntervalRef.current) {
      clearInterval(dangerHapticIntervalRef.current);
      dangerHapticIntervalRef.current = null;
    }

    if (dangerLevel === 'safe' || gameState !== 'playing') return;

    const interval = DANGER_HAPTIC_INTERVALS[dangerLevel];
    if (interval > 0) {
      dangerHapticIntervalRef.current = setInterval(() => {
        triggerDangerPulse();
      }, interval);
    }

    return () => {
      if (dangerHapticIntervalRef.current) {
        clearInterval(dangerHapticIntervalRef.current);
      }
    };
  }, [dangerLevel, gameState, triggerDangerPulse]);

  // TASK 78: Calculate moves left when in imminent danger
  useEffect(() => {
    if (dangerLevel === 'imminent' && gameState === 'playing') {
      const count = countValidMoves(grid, pieces);
      setMovesLeft(count <= 10 ? count : null);
    } else {
      setMovesLeft(null);
    }
  }, [grid, pieces, dangerLevel, gameState]);

  // ============================================
  // PHASE 7: STREAK FIRE MODE FUNCTIONS
  // ============================================

  // TASK 85: Update streak on line clear or placement
  const updateStreak = useCallback((clearedLines: boolean) => {
    if (clearedLines) {
      setStreakState(prev => {
        const newCount = prev.count + 1;
        // Fire side effects on next tick to avoid setState-during-render
        if (newCount === STREAK_CONFIG.fireThreshold) {
          queueMicrotask(() => {
            playStreakFireSound();
            triggerStreakFireHaptic();
            triggerConfetti();
            showEpicCallout('STREAK FIRE!');
            triggerEvent('critical:hit');
          });
        }
        return { count: newCount };
      });
    } else {
      setStreakState({ count: 0 });
    }
  }, [playStreakFireSound, triggerStreakFireHaptic, triggerConfetti, showEpicCallout, triggerEvent]);

  // TASK 87: Calculate streak bonus — multiplier lookup
  const calculateStreakBonus = useCallback((baseScore: number): number => {
    if (streakState.count === 0) return baseScore;
    const idx = Math.min(streakState.count, STREAK_CONFIG.multipliers.length - 1);
    return Math.floor(baseScore * STREAK_CONFIG.multipliers[idx]);
  }, [streakState.count]);



  // TASK 117: Check for challenge on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeParam = params.get('challenge');
    if (challengeParam) {
      const targetScore = decodeChallenge(challengeParam);
      if (targetScore) {
        setChallengeTarget(targetScore);
      }
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // TASK 125: Track best combo
  useEffect(() => {
    if (combo > bestCombo) {
      setBestCombo(combo);
    }
  }, [combo, bestCombo]);

  // TASK 119: Check if challenge is beaten
  useEffect(() => {
    if (challengeTarget && score > challengeTarget && !challengeBeaten && gameState === 'playing') {
      celebrateChallengeVictory();
    }
  }, [score, challengeTarget, challengeBeaten, gameState, celebrateChallengeVictory]);

  // Start new game
  const startGame = useCallback(() => {
    // CRITICAL: Unlock WebAudio on game start (user gesture required on iOS)
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    audioContextRef.current.resume().catch(() => {});

    hapticButton();
    // Start/resume music on user gesture (required for mobile browsers)
    // Skip if GameModal manages the music (check both ref AND context for timing safety)
    if (soundEnabled && !musicManagedExternallyRef.current && !musicManagedExternally) {
      if (musicAudioRef.current) {
        musicAudioRef.current.play().catch(() => {});
      } else {
        playNextSong();
      }
    }
    const newGrid = createEmptyGrid();
    const newPieces = generateThreePieces();
    setGrid(newGrid);
    setPieces(newPieces);
    gridStateRef.current = newGrid;
    piecesRef.current = newPieces;
    setScore(0);
    setTotalLinesCleared(0);
    setTotalBlocksPlaced(0);
    setGameStartTime(Date.now());
    setScoreSubmitted(false);
    setIsNewPersonalBest(false);
    setIsPaused(false);
    setDraggedPieceId(null);
    setPreviewPosition(null);
    draggedPieceIdRef.current = null;
    previewPositionRef.current = null;
    // Reset effect states
    setShakeLevel('none');
    setFloatingScores([]);
    setCombo(0);

    setNewPieceId(null);
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
    // Reset Phase 3 states
    setFreezeFrame(false);
    // Clear any lingering DOM particles
    if (particleLayerRef.current) {
      particleLayerRef.current.innerHTML = '';
    }
    setShockwaves([]);
    setScreenFlash(null);
    if (freezeTimeoutRef.current) {
      clearTimeout(freezeTimeoutRef.current);
      freezeTimeoutRef.current = null;
    }
    // Reset Phase 4 states
    setTrailParticles([]);
    lastTrailPosRef.current = { x: 0, y: 0 };
    setIsSnapped(false);
    prevSnappedRef.current = false;
    // TASK 82: Reset Phase 6 danger states
    setDangerLevel('safe');
    setValidPlacements(new Set());
    setMovesLeft(null);
    stopDangerSound();
    if (dangerHapticIntervalRef.current) {
      clearInterval(dangerHapticIntervalRef.current);
      dangerHapticIntervalRef.current = null;
    }
    // TASK 94: Reset streak
    setStreakState({ count: 0 });
    // Reset Phase 8 perfect clear states
    setShowPerfectClear(false);
    comboStartTimeRef.current = 0;
    // TASK 126: Reset Phase 10 share states
    setBestCombo(0);
    setShowShareModal(false);
    setShareImageUrl(null);
    setGameScreenshot(null);
    setChallengeBeaten(false);
    // Note: Don't reset challengeTarget - keep the challenge active across games
    resetAllEffects();
    setGameState('playing');
    // Arcade lights: Game started (zen mode - simmer)
    triggerEvent('play:active');
  }, [soundEnabled, hapticButton, resetAllEffects, stopDangerSound, playNextSong, triggerEvent]);

  // Start game when user clicks PLAY in arcade frame (gameStarted becomes true)
  useEffect(() => {
    if (gameStarted && gameState === 'idle') {
      startGame();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted]);

  // Submit score
  const submitScoreGlobal = useCallback(async (finalScore: number) => {
    // Check minimum actions: 3 pieces placed for leaderboard
    if (!isSignedIn || scoreSubmitted || finalScore === 0 || totalBlocksPlaced < 3) return;

    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('blockPuzzleHighScore', String(finalScore));
      setIsNewPersonalBest(true);
    }

    setScoreSubmitted(true);
    const result = await submitScore(finalScore, undefined, {
      linesCleared: totalLinesCleared,
      blocksPlaced: totalBlocksPlaced,
      playTime: Date.now() - gameStartTime,
    });

    if (result.success) {
      // Score submitted successfully
    }
  }, [isSignedIn, scoreSubmitted, submitScore, highScore, totalLinesCleared, totalBlocksPlaced, gameStartTime]);

  // Handle game over
  const handleGameOver = useCallback(async (currentScore: number) => {
    // CAPTURE SCREENSHOT FIRST - before any visual changes
    // This captures the grid state at the moment of game over for sharing
    if (gridRef.current) {
      try {
        const screenshot = await captureGameArea(gridRef.current);
        setGameScreenshot(screenshot);
      } catch (e) {
        console.warn('[BlockPuzzle] Failed to capture screenshot:', e);
      }
    }

    // Stop background music immediately on death
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current = null;
    }
    if (soundEnabled) playGameOver();
    hapticGameOver();
    // Unified game-over effects
    triggerScreenShake(GAME_OVER_SEQUENCE.shakeDuration);
    triggerVignette(GAME_OVER_SEQUENCE.vignetteColor);
    // Arcade lights: Game over (check for high score)
    if (currentScore > highScore) {
      triggerEvent('game:highScore');
      if (soundEnabled) playWojakChime(); // Signature chime on new high score
    } else {
      triggerEvent('game:over');
    }
    setGameState('gameover');

    if (isSignedIn && currentScore > 0) {
      submitScoreGlobal(currentScore);
    }
  }, [soundEnabled, playGameOver, playWojakChime, hapticGameOver, isSignedIn, submitScoreGlobal, triggerEvent, triggerScreenShake, triggerVignette, highScore]);

  // Place piece on grid
  const attemptPlacement = useCallback((pieceId: string, row: number, col: number) => {
    const piece = getPieceById(pieceId);
    const currentGrid = gridStateRef.current;

    if (!piece) {
      return false;
    }

    if (!canPlacePiece(currentGrid, piece.shape, row, col)) {
      return false;
    }

    // Place the piece
    const { newGrid, placedCells } = placePiece(currentGrid, piece.shape, row, col, piece.color);

    // Calculate blocks placed
    const blocksInPiece = piece.shape.flat().filter(c => c === 1).length;
    setTotalBlocksPlaced(prev => prev + blocksInPiece);

    // TASK 12 & 19: Play snap sound and double-tap haptic confirmation
    playSnapSound();
    triggerSnapHaptic();
    // Arcade lights: Block placed (subtle)
    triggerEvent('score:tiny');

    // PHASE 5: Placement feedback
    // TASK 64: Mini screen shake on placement
    triggerMiniShake();

    // TASK 59-60: Create corner impact particles
    createPlacementParticles(placedCells, piece.color);

    // TASK 63: Show placed animation with bounce
    setJustPlacedCells(new Set(placedCells));
    setTimeout(() => setJustPlacedCells(new Set()), 300);

    // Add base points
    const basePoints = blocksInPiece * 10;

    // Show floating score for base points
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (gridRect) {
      showFloatingScore(basePoints, gridRect.left + gridRect.width / 2, gridRect.top + gridRect.height / 2, false);
    }

    // NEW: Check for same-color lines BEFORE clearing (need the colors)
    const { totalSameColorLines } = checkSameColorLines(newGrid);
    
    // Check for line clears
    const { clearedGrid, linesCleared, cellsCleared } = clearLines(newGrid);

    // Update score
    let newScore = score + basePoints;

    if (linesCleared > 0) {
      // Show clearing animation
      setClearingCells(cellsCleared);

      // Increment combo
      const newCombo = combo + 1;
      setCombo(newCombo);


      // Arcade lights: Streak-aware continuous surge — faster at higher streaks
      // streakState.count is pre-increment, so new streak = count + 1
      const newStreak = streakState.count + 1;
      if (newStreak >= 9) {
        triggerEvent('combo:max');
      } else if (newStreak >= 7) {
        triggerEvent('combo:high');
      } else if (newStreak >= 5) {
        triggerEvent('combo:mid');
      } else if (newStreak >= 3) {
        triggerEvent('combo:low');
      } else {
        // Streak 1-2: slowest surge
        triggerEvent('combo:start');
      }

      comboStartTimeRef.current = Date.now();

      // NEW: No timeout - combo only breaks on piece placed without clearing
      // Clear any existing timeout (backward compat)
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
        comboTimeoutRef.current = null;
      }

      // Calculate points with combo multiplier (reduced base: 50 per line)
      const linePoints = linesCleared * 50; // Was 100, now 50
      const lineComboMultiplier = linesCleared >= 2 ? linesCleared : 1;
      const comboBonus = newCombo >= 2 ? Math.min(newCombo, 5) : 1;
      
      // NEW: Same-color line bonus - 2x for each same-color line (stacks with combo)
      const sameColorMultiplier = totalSameColorLines > 0 ? 2 : 1;
      let totalPoints = linePoints * lineComboMultiplier * comboBonus * sameColorMultiplier;
      
      // Show same-color bonus callout
      if (totalSameColorLines > 0) {
        showEpicCallout(`🌈 ${totalSameColorLines}x SAME COLOR! 2x BONUS!`);
      }

      // TASK 85 & 87: Update streak and apply bonus
      updateStreak(true);
      totalPoints = calculateStreakBonus(totalPoints);
      newScore += totalPoints;

      // TASK 36: Enhanced screen shake based on lines cleared
      const shakeConfig = SHAKE_CONFIG[Math.min(linesCleared, 4)];
      if (linesCleared === 1) {
        setShakeLevel('light');
      } else if (linesCleared === 2) {
        setShakeLevel('medium');
      } else if (linesCleared >= 3) {
        setShakeLevel('heavy');
      }
      setTimeout(() => setShakeLevel('none'), shakeConfig.duration);

      // TASK 29: Trigger freeze frame on 2+ line clears
      const freezeDuration = FREEZE_DURATIONS[Math.min(linesCleared, 4)];
      if (freezeDuration > 0) {
        triggerFreezeFrame(freezeDuration);
      }

      // TASK 39: Screen flash on 3+ line clears
      if (linesCleared >= 3) {
        triggerScreenFlash('rgba(255, 200, 0, 0.4)');
      }

      // TASK 38 & 32: Create particle bursts from cleared cells
      const clearedCellsArray = Array.from(cellsCleared).map(key => {
        const [r, c] = key.split('-').map(Number);
        return { row: r, col: c };
      });
      createLineClearBurst(clearedCellsArray, piece.color);

      // TASK 41: Trigger shockwave from grid center on 2+ lines
      if (linesCleared >= 2 && gridRect) {
        const gridCenterX = gridRect.width / 2;
        const gridCenterY = gridRect.height / 2;
        triggerShockwave(gridCenterX, gridCenterY, 250 + linesCleared * 50);
      }

      setTimeout(() => {
        // Clear animation
        setClearingCells(new Set());
        setGrid(clearedGrid);
        gridStateRef.current = clearedGrid;
        setTotalLinesCleared(prev => prev + linesCleared);

        // TASK 98: Check for perfect clear after line clears
        if (checkPerfectClear(clearedGrid)) {
          // TASK 96: Award bonus for perfect clear
          newScore += PERFECT_CLEAR_BONUS;
          setScore(s => s + PERFECT_CLEAR_BONUS);
          triggerPerfectClear();
          // Arcade lights: Perfect clear (rare achievement!)
          triggerEvent('perfect:hit');

          // Show perfect clear bonus in floating score
          if (gridRect) {
            setTimeout(() => {
              showFloatingScore(PERFECT_CLEAR_BONUS, gridRect.left + gridRect.width / 2, gridRect.top + gridRect.height / 2, true);
            }, 300);
          }
        }

        // Show floating score with streak/same-color/combo multiplier info
        if (gridRect) {
          const multiplierParts: string[] = [];
          // Streak multiplier — streakState.count is pre-increment (updateStreak already called but setState is async)
          const newStreakCount = streakState.count + 1;
          const streakIdx = Math.min(newStreakCount, STREAK_CONFIG.multipliers.length - 1);
          const streakMult = STREAK_CONFIG.multipliers[streakIdx];
          if (streakMult > 1) multiplierParts.push(`🔥×${streakMult}`);
          if (sameColorMultiplier > 1) multiplierParts.push(`🌈×${sameColorMultiplier}`);
          if (newCombo >= 2) multiplierParts.push(`×${Math.min(newCombo, 5)}`);
          const multiplierLabel = multiplierParts.length > 0 ? multiplierParts.join(' ') : undefined;
          showFloatingScore(totalPoints, gridRect.left + gridRect.width / 2, gridRect.top + gridRect.height / 3, true, multiplierLabel);
        }

        // TASK 42: Epic callout with clear messages
        const calloutMessage = newCombo >= 2
          ? `${newCombo}x COMBO!`
          : CLEAR_CALLOUTS[Math.min(linesCleared, 5)] || '';

        // TASK 13: Effects based on lines cleared with musical scale
        // Play line clear sound + combo note
        playLineClearSound(linesCleared);
        playComboNote(newCombo);

        // TASK 26: Line-specific haptic patterns
        if (linesCleared === 1) {
          triggerLineClearHaptic(1);
          triggerBigMoment({
            shockwave: true,
            score: `+${totalPoints}`,
          });
        } else if (linesCleared === 2) {
          triggerLineClearHaptic(2);
          if (calloutMessage) showEpicCallout(calloutMessage);
          triggerBigMoment({
            shockwave: true,
            sparks: true,
            shake: true,
            score: `+${totalPoints}`,
            emoji: '🔥',
          });
        } else if (linesCleared === 3) {
          triggerLineClearHaptic(3);
          if (calloutMessage) showEpicCallout(calloutMessage);
          triggerConfetti();
          triggerBigMoment({
            shockwave: true,
            sparks: true,
            shake: true,
            vignette: true,
            score: `+${totalPoints}`,
            emoji: '💥',
          });
        } else if (linesCleared >= 4) {
          triggerLineClearHaptic(4);
          if (calloutMessage) showEpicCallout(calloutMessage);
          triggerConfetti();
          triggerBigMoment({
            shockwave: true,
            sparks: true,
            shake: true,
            vignette: true,
            score: `+${totalPoints}`,
            emoji: '⚡',
          });
        }
      }, 500 + freezeDuration);

      // Update grid immediately for visual feedback
      setGrid(newGrid);
      gridStateRef.current = newGrid;
    } else {
      // NEW: IMMEDIATE combo break on piece placed without clearing (no timeout)
      // This gives player unlimited time to plan, but must keep clearing lines
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
        comboTimeoutRef.current = null;
      }
      
      // Break combo immediately if it was active
      const currentCombo = combo;
      if (currentCombo > 0) {
        playComboBreakSound(currentCombo);
        if (currentCombo >= 2) {
          // Arcade lights: Streak broken — flash warn then return to calm ambient
          triggerEvent('combo:break');
          setTimeout(() => triggerEvent('play:active'), 500);
        }
      }
      setCombo(0);
  

      // TASK 85: Reset streak on placement without clear
      updateStreak(false);

      setGrid(newGrid);
      gridStateRef.current = newGrid;
    }

    setScore(newScore);

    // TASK 14: Replace used piece with spawn animation and sound
    const spawnedPiece = generateRandomPiece();
    playSpawnSound();
    setNewPieceId(spawnedPiece.id);
    setTimeout(() => setNewPieceId(null), 500);

    const newPieces = piecesRef.current.map(p =>
      p.id === pieceId ? spawnedPiece : p
    );
    setPieces(newPieces);
    piecesRef.current = newPieces;

    // Check game over after a tick (to let state update)
    setTimeout(() => {
      const finalGrid = linesCleared > 0 ? clearedGrid : newGrid;
      if (isGameOver(finalGrid, newPieces)) {
        handleGameOver(newScore);
      }
    }, linesCleared > 0 ? 600 : 100);

    return true;
  }, [score, combo, soundEnabled, getPieceById, playSnapSound, playLineClearSound, playComboNote, playSpawnSound, playComboBreakSound, triggerSnapHaptic, triggerLineClearHaptic, triggerMiniShake, createPlacementParticles, triggerBigMoment, triggerConfetti, showEpicCallout, showFloatingScore, handleGameOver, triggerFreezeFrame, triggerScreenFlash, createLineClearBurst, triggerShockwave, updateStreak, calculateStreakBonus, triggerPerfectClear, CELL_SIZE]);

  // Calculate grid position from screen coordinates
  const calculateGridPosition = useCallback((clientX: number, clientY: number, pieceId: string | null) => {
    const gridElement = gridRef.current;
    if (!gridElement || !pieceId) return null;

    const piece = getPieceById(pieceId);
    if (!piece) return null;

    const rect = gridElement.getBoundingClientRect();
    const pieceWidth = piece.shape[0].length;
    const pieceHeight = piece.shape.length;

    // Grid has border (2px) and padding (4px) that are also scaled by any CSS transforms
    // Calculate scale factor from rendered vs CSS size
    const scaleFactor = rect.width / GRID_SIZE;
    const borderPadding = (2 + 4) * scaleFactor; // (border + padding) scaled

    // Content area is the grid minus border and padding on both sides
    const contentWidth = rect.width - borderPadding * 2;

    // Cell slot size = content area divided by 8 cells
    // (This includes cell width + gap, distributed evenly)
    const actualCellSlot = contentWidth / 8;

    // Calculate relative position within the content area (after border/padding)
    const relativeX = clientX - rect.left - borderPadding;
    const relativeY = clientY - rect.top - borderPadding;

    // Calculate which cell the center of the piece would be in
    const col = Math.floor(relativeX / actualCellSlot - pieceWidth / 2 + 0.5);
    const row = Math.floor(relativeY / actualCellSlot - pieceHeight / 2 + 0.5);

    return { row, col };
  }, [getPieceById, GRID_SIZE]);

  // ============================================
  // TOUCH HANDLERS
  // ============================================
  const handleTouchStart = (e: React.TouchEvent, pieceId: string) => {
    if (gameState !== 'playing' || isPaused) return;

    const piece = getPieceById(pieceId);
    if (!piece || !canPlaceAnywhere(gridStateRef.current, piece)) return;

    // Resume audio context on touch (iOS requires user gesture)
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    // Don't preventDefault on touchstart - it's passive by default
    // preventDefault is handled in native touchmove/touchend listeners
    // TASK 24: Ultra-light tick on drag start
    triggerDragStartHaptic();

    setDraggedPieceId(pieceId);
    draggedPieceIdRef.current = pieceId;

    const touch = e.touches[0];
    setDragPosition({ x: touch.clientX, y: touch.clientY - 80 });
  };

  // Native touch move/end handlers (to use passive: false)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchMove = (e: TouchEvent) => {
      const pieceId = draggedPieceIdRef.current;
      if (!pieceId || gameState !== 'playing') return;

      e.preventDefault();

      const touch = e.touches[0];
      // Position the floating piece above the finger
      const dragX = touch.clientX;
      const dragY = touch.clientY - 80;
      setDragPosition({ x: dragX, y: dragY });

      // TASK 48: Emit trail particle on drag move
      const piece = getPieceById(pieceId);
      if (piece) {
        emitTrailParticle(dragX, dragY, piece.color);
      }

      // Calculate grid position (use the visual position, not finger position)
      const gridPos = calculateGridPosition(dragX, dragY, pieceId);
      if (gridPos) {
        setPreviewPosition(gridPos);
        previewPositionRef.current = gridPos;

        // TASK 56: Check snap and trigger haptic on snap detection
        if (piece && canPlacePiece(gridStateRef.current, piece.shape, gridPos.row, gridPos.col)) {
          if (!prevSnappedRef.current) {
            triggerSnapHaptic();
            prevSnappedRef.current = true;
          }
          setIsSnapped(true);
        } else {
          prevSnappedRef.current = false;
          setIsSnapped(false);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const pieceId = draggedPieceIdRef.current;
      const pos = previewPositionRef.current;


      if (pieceId && pos && gameState === 'playing') {
        e.preventDefault();
        const piece = getPieceById(pieceId);
        if (piece && canPlacePiece(gridStateRef.current, piece.shape, pos.row, pos.col)) {
          attemptPlacement(pieceId, pos.row, pos.col);
        } else if (piece && pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8) {
          // TASK 15 & 25: Play invalid sound and haptic when placement fails
          playInvalidSound();
          triggerInvalidHaptic();
        }
      }

      // TASK 49: Clear trail particles on drag end
      clearTrailParticles();
      prevSnappedRef.current = false;
      setIsSnapped(false);

      // Reset drag state
      setDraggedPieceId(null);
      setPreviewPosition(null);
      draggedPieceIdRef.current = null;
      previewPositionRef.current = null;
    };

    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState, calculateGridPosition, getPieceById, attemptPlacement, emitTrailParticle, clearTrailParticles, triggerSnapHaptic, playInvalidSound, triggerInvalidHaptic]);

  // ============================================
  // MOUSE HANDLERS (Desktop)
  // ============================================
  const handleMouseDown = (e: React.MouseEvent, pieceId: string) => {
    if (gameState !== 'playing' || isPaused) return;

    const piece = getPieceById(pieceId);
    if (!piece || !canPlaceAnywhere(gridStateRef.current, piece)) return;

    e.preventDefault();
    // TASK 24: Ultra-light tick on drag start
    triggerDragStartHaptic();

    setDraggedPieceId(pieceId);
    draggedPieceIdRef.current = pieceId;
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  // Global mouse move/up handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const pieceId = draggedPieceIdRef.current;
      if (!pieceId || gameState !== 'playing') return;

      const dragX = e.clientX;
      const dragY = e.clientY;
      setDragPosition({ x: dragX, y: dragY });

      // TASK 48: Emit trail particle on drag move
      const piece = getPieceById(pieceId);
      if (piece) {
        emitTrailParticle(dragX, dragY, piece.color);
      }

      const gridPos = calculateGridPosition(dragX, dragY, pieceId);
      if (gridPos) {
        setPreviewPosition(gridPos);
        previewPositionRef.current = gridPos;

        // TASK 56: Check snap and trigger haptic on snap detection
        if (piece && canPlacePiece(gridStateRef.current, piece.shape, gridPos.row, gridPos.col)) {
          if (!prevSnappedRef.current) {
            triggerSnapHaptic();
            prevSnappedRef.current = true;
          }
          setIsSnapped(true);
        } else {
          prevSnappedRef.current = false;
          setIsSnapped(false);
        }
      }
    };

    const handleMouseUp = () => {
      const pieceId = draggedPieceIdRef.current;
      const pos = previewPositionRef.current;

      if (pieceId && pos && gameState === 'playing') {
        const piece = getPieceById(pieceId);
        if (piece && canPlacePiece(gridStateRef.current, piece.shape, pos.row, pos.col)) {
          attemptPlacement(pieceId, pos.row, pos.col);
        } else if (piece && pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8) {
          // TASK 15 & 25: Play invalid sound and haptic when placement fails
          playInvalidSound();
          triggerInvalidHaptic();
        }
      }

      // TASK 49: Clear trail particles on drag end
      clearTrailParticles();
      prevSnappedRef.current = false;
      setIsSnapped(false);

      // Reset drag state
      setDraggedPieceId(null);
      setPreviewPosition(null);
      draggedPieceIdRef.current = null;
      previewPositionRef.current = null;
    };

    if (draggedPieceId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedPieceId, gameState, calculateGridPosition, getPieceById, attemptPlacement, emitTrailParticle, clearTrailParticles, triggerSnapHaptic, playInvalidSound, triggerInvalidHaptic]);

  // Get preview cells for current drag
  const previewCells = draggedPieceId && previewPosition
    ? getPreviewCells(previewPosition.row, previewPosition.col, getPieceById(draggedPieceId))
    : new Set<string>();

  const previewValid = draggedPieceId && previewPosition
    ? canPlacePiece(grid, getPieceById(draggedPieceId)?.shape || [[]], previewPosition.row, previewPosition.col)
    : false;

  // ============================================
  // RENDER - Updated with high-impact effects
  // ============================================
  return (
    <div
      ref={containerRef}
      className={`block-puzzle-container ${isMobile ? 'mobile' : 'desktop'}`}
    >
      <GameSEO
        gameName="Block Puzzle"
        gameSlug="block-puzzle"
        description="Drag and drop blocks to fill rows and columns! Strategic puzzle gameplay with combos, streaks, and satisfying line clears."
        genre="Puzzle"
        difficulty="Medium"
      />
      {/* Control buttons removed on mobile - using shared MobileGameControls (X and ?) from GameModal */}
      {/* Pause button - only on desktop (mobile uses shared controls) */}
      {!isMobile && gameState === 'playing' && (
        <button
          className="bp-pause-btn"
          onClick={togglePause}
          aria-label={isPaused ? 'Resume game' : 'Pause game'}
        >
          {isPaused ? <Play size={24} /> : <Pause size={24} />}
        </button>
      )}

      {/* Pause Overlay */}
      {isPaused && gameState === 'playing' && (
        <div className="bp-pause-overlay">
          <div className="bp-pause-content">
            <h2>Paused</h2>
            <div className="bp-pause-score">Score: {score}</div>
            <GameButton
              variant="primary"
              size="lg"
              onClick={togglePause}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                togglePause();
              }}
              className="bp-resume-btn"
            >
              Resume
            </GameButton>
            <GameButton
              variant="secondary"
              size="lg"
              onClick={() => navigate('/games')}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/games');
              }}
              className="bp-quit-btn"
            >
              Quit Game
            </GameButton>
          </div>
        </div>
      )}

      {/* Visual Effects */}
      <GameEffects effects={effects} accentColor="#ff6b00" />

      {/* Game Over - Uses shared component */}
      {gameState === 'gameover' && (
        <ArcadeGameOverScreen
          score={score}
          highScore={highScore}
          scoreLabel="points"
          isNewPersonalBest={isNewPersonalBest}
          isSignedIn={isSignedIn}
          isSubmitting={isSubmitting}
          scoreSubmitted={scoreSubmitted}
          userDisplayName={userDisplayName ?? undefined}
          leaderboard={globalLeaderboard}
          onPlayAgain={startGame}
          onShare={openShareModal}
          accentColor="#ff6b00"
          meetsMinimumActions={totalBlocksPlaced >= 3}
          minimumActionsMessage="Place at least 3 pieces to be on the leaderboard"
        />
      )}

      {/* Score boxes */}
      {gameState === 'playing' && (
        <div
          className={`bp-score-column ${streakState.count > 0 ? 'has-streak' : ''}`}
          style={{ '--streak': Math.min(streakState.count, 10) } as React.CSSProperties}
        >
          {/* Streak badge — above score boxes */}
          {streakState.count > 0 && (
            <div className={`bp-streak-badge ${streakState.count >= 3 ? 'fire' : streakState.count >= 2 ? 'warm' : ''}`}>
              🔥{streakState.count}
            </div>
          )}
          <div className="bp-stat-box bp-stat-score">
            <span className="bp-stat-value">{score}</span>
            <span className="bp-stat-label">Score</span>
          </div>
          <div className="bp-stat-box bp-stat-lines">
            <span className="bp-stat-value">{totalLinesCleared}</span>
            <span className="bp-stat-label">Lines</span>
          </div>
          <div className="bp-stat-box bp-stat-best">
            <span className="bp-stat-value">{Math.max(highScore, score)}</span>
            <span className="bp-stat-label">Best</span>
          </div>
        </div>
      )}

      {/* Game Grid */}
      {gameState === 'playing' && (
        <div
          ref={gridRef}
          className={`bp-game-grid ${shakeLevel !== 'none' ? `screen-shake-${shakeLevel}` : ''} ${draggedPieceId ? 'active' : ''} ${freezeFrame ? 'freeze-frame' : ''} ${dangerLevel !== 'safe' ? `bp-danger-${dangerLevel}` : ''} ${streakState.count > 0 ? 'has-streak' : ''}`}
          style={{
            width: GRID_SIZE,
            height: GRID_SIZE,
            '--streak': Math.min(streakState.count, 10),
          } as React.CSSProperties}
        >
          {grid.map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const cellKey = `${rowIdx}-${colIdx}`;
              const isPreview = previewCells.has(cellKey);
              const isClearing = clearingCells.has(cellKey);
              const isJustPlaced = justPlacedCells.has(cellKey);
              // TASK 73: Valid placement highlight in danger state
              const isValidPlacement = !cell.filled && validPlacements.has(cellKey);

              return (
                <div
                  key={cellKey}
                  className={`bp-grid-cell ${cell.filled ? 'filled' : ''} ${
                    isPreview ? (previewValid ? 'preview' : 'preview-invalid') : ''
                  } ${isClearing ? 'clearing' : ''} ${isJustPlaced ? 'just-placed' : ''} ${isValidPlacement ? 'valid-placement' : ''}`}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    background: cell.filled ? (cell.color ?? undefined) : undefined,
                  }}
                />
              );
            })
          )}
          {/* TASK 30: Shockwave effects layer */}
          {shockwaves.map(sw => (
            <div
              key={sw.id}
              className="bp-shockwave"
              style={{
                left: sw.x,
                top: sw.y,
                width: sw.size,
                height: sw.size,
                opacity: sw.alpha,
              }}
            />
          ))}

          {/* TASK 34: Particle layer for line clear bursts (DOM-driven) */}
          <div className="bp-particle-layer" ref={particleLayerRef} />
        </div>
      )}

      {/* TASK 40: Screen flash on big clears */}
      {screenFlash && (
        <div
          className="bp-screen-flash"
          style={{ backgroundColor: screenFlash }}
        />
      )}


      {/* TASK 79: Moves Left Warning */}
      {movesLeft !== null && movesLeft <= 8 && gameState === 'playing' && (
        <div className={`bp-moves-warning ${movesLeft <= 3 ? 'critical' : ''}`}>
          {movesLeft === 0 ? 'No moves!' : `${movesLeft} move${movesLeft !== 1 ? 's' : ''} left!`}
        </div>
      )}

      {/* Danger Vignette Overlay */}
      {dangerLevel !== 'safe' && gameState === 'playing' && (
        <div className={`bp-danger-vignette bp-vignette-${dangerLevel}`} />
      )}

      {/* TASK 100: Perfect Clear Flash Overlay */}
      {showPerfectClear && (
        <div className="bp-perfect-clear-overlay">
          <div className="bp-perfect-clear-text">PERFECT CLEAR!</div>
          <div className="bp-perfect-clear-bonus">+{PERFECT_CLEAR_BONUS} BONUS</div>
        </div>
      )}

      {/* Piece Rack */}
      {gameState === 'playing' && (
        <div className="bp-piece-rack">
          {pieces.map(piece => {
            const canPlace = canPlaceAnywhere(grid, piece);
            const isDragging = draggedPieceId === piece.id;
            const isSpawning = piece.id === newPieceId;

            // Calculate scaling for uniform visual appearance
            const pieceWidth = piece.shape[0].length;
            const pieceHeight = piece.shape.length;
            const maxDimension = Math.max(pieceWidth, pieceHeight);
            // Scale larger pieces down to fit uniformly in slot
            const targetSize = isMobile ? 65 : 75;
            const naturalSize = maxDimension * (PIECE_CELL_SIZE + 1);
            const scaleFactor = maxDimension <= 2 ? 1 : Math.min(1, targetSize / naturalSize);

            return (
              <div
                key={piece.id}
                className={`bp-piece-slot ${!canPlace ? 'disabled' : ''} ${isDragging ? 'dragging' : ''} ${isSpawning ? 'spawning' : ''} ${streakState.count >= 2 ? 'has-streak' : ''}`}
                style={streakState.count >= 2 ? { '--streak': Math.min(streakState.count, 10) } as React.CSSProperties : undefined}
                onMouseDown={(e) => handleMouseDown(e, piece.id)}
                onTouchStart={(e) => handleTouchStart(e, piece.id)}
              >
                <div
                  className="bp-piece-preview"
                  style={{ transform: `scale(${scaleFactor})` }}
                >
                  {piece.shape.map((row, rowIdx) => (
                    <div key={rowIdx} className="bp-piece-row">
                      {row.map((cell, colIdx) => (
                        <div
                          key={colIdx}
                          className={`bp-piece-cell ${cell ? 'filled' : ''}`}
                          style={{
                            width: PIECE_CELL_SIZE,
                            height: PIECE_CELL_SIZE,
                            background: cell ? piece.color : 'transparent',
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TASK 46: Trail Particle Layer */}
      {trailParticles.length > 0 && (() => {
        // Convert viewport coords to container-relative (arcade frame has transforms)
        const containerRect = containerRef.current?.getBoundingClientRect();
        return (
          <div className="bp-trail-particle-layer">
            {trailParticles.map(p => {
              const relX = containerRect ? p.x - containerRect.left : p.x;
              const relY = containerRect ? p.y - containerRect.top : p.y;
              return (
                <div
                  key={p.id}
                  className="bp-trail-particle"
                  style={{
                    left: relX,
                    top: relY,
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    opacity: p.alpha,
                  }}
                />
              );
            })}
          </div>
        );
      })()}

      {/* Floating Drag Preview - positioned relative to container */}
      {draggedPieceId && (() => {
        // Calculate position relative to container (needed because arcade frame has transforms)
        const containerRect = containerRef.current?.getBoundingClientRect();
        const relativeX = containerRect ? dragPosition.x - containerRect.left : dragPosition.x;
        const relativeY = containerRect ? dragPosition.y - containerRect.top : dragPosition.y;

        const piece = getPieceById(draggedPieceId);
        if (!piece) return null;

        // Use same cell size as grid for visual consistency
        const previewCellSize = CELL_SIZE;

        return (
          <div
            className={`bp-drag-preview ${isSnapped ? 'snapped' : ''}`}
            style={{
              left: relativeX,
              top: relativeY,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="bp-piece-preview floating" style={{ gap: '2px' }}>
              {piece.shape.map((row, rowIdx) => (
                <div key={rowIdx} className="bp-piece-row" style={{ gap: '2px' }}>
                  {row.map((cell, colIdx) => (
                    <div
                      key={colIdx}
                      className={`bp-piece-cell ${cell ? 'filled' : ''}`}
                      style={{
                        width: previewCellSize,
                        height: previewCellSize,
                        background: cell ? piece.color : 'transparent',
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Floating Scores */}
      {floatingScores.map(score => {
        // Convert viewport coords to container-relative (arcade frame has transforms)
        const containerRect = containerRef.current?.getBoundingClientRect();
        const relX = containerRect ? score.x - containerRect.left : score.x;
        const relY = containerRect ? score.y - containerRect.top : score.y;
        return (
          <div
            key={score.id}
            className={`bp-floating-score ${score.isBig ? 'big' : ''}`}
            style={{
              left: relX,
              top: relY,
            }}
          >
            +{score.value}
            {/* TASK 107: Show multiplier if present */}
            {score.multiplier && <span className="bp-floating-multiplier">{score.multiplier}</span>}
          </div>
        );
      })}

      {/* TASK 118: Challenge Target Banner */}
      {challengeTarget && gameState === 'playing' && !challengeBeaten && (
        <div className="bp-challenge-banner">
          <span className="bp-challenge-label">Challenge:</span>
          <span className="bp-challenge-target">Beat {challengeTarget.toLocaleString()} pts</span>
          <span className="bp-challenge-progress">
            {score >= challengeTarget ? '✅' : `${Math.floor((score / challengeTarget) * 100)}%`}
          </span>
        </div>
      )}

      {/* Challenge beaten banner */}
      {challengeBeaten && gameState === 'playing' && (
        <div className="bp-challenge-banner beaten">
          <span>🏆 Challenge Beaten!</span>
        </div>
      )}

      {/* TASK 114: Share Modal */}
      {showShareModal && (
        <div className="bp-share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="bp-share-modal" onClick={(e) => e.stopPropagation()}>
            <button className="bp-share-close" onClick={() => setShowShareModal(false)}>×</button>
            <h2 className="bp-share-title">Your Score Card</h2>

            {/* Preview image */}
            {shareImageUrl && (
              <div className="bp-share-preview">
                <img src={shareImageUrl} alt="Score card" />
              </div>
            )}

            {/* Download button */}
            <div className="bp-share-actions">
              <GameButton variant="primary" size="lg" onClick={handleDownloadImage} className="bp-share-action-btn">
                Download Image
              </GameButton>
            </div>
          </div>
        </div>
      )}

      {/* TASK 127: Toast Notification */}
      {toast && (
        <div className={`bp-toast ${toast.type}`}>
          {toast.message}
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

export default BlockPuzzle;
