// Removed IonPage/IonContent - they caused iOS overscroll bounce on tap
import { useState, useRef, useEffect, useCallback } from 'react';
import { Howler } from 'howler';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useHowlerSounds } from '@/hooks/useHowlerSounds';
import { useColorReactionSounds } from '@/hooks/useColorReactionSounds';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import { useGameEffects, GameEffects } from '@/components/media';
import { useGameHaptics } from '@/systems/haptics';
import { GameSEO } from '@/components/seo/GameSEO';
import { captureGameArea } from '@/systems/sharing/captureDOM';
import { ArcadeGameOverScreen } from '@/components/media/games/ArcadeGameOverScreen';
import { generateGameScorecard } from '@/systems/sharing/GameScorecard';
import { useGameMute } from '@/contexts/GameMuteContext';
import { useArcadeLights } from '@/contexts/ArcadeLightsContext';
import { useMobileGameFullscreen } from '@/hooks/useMobileGameFullscreen';
import { getComboTier, type GameEvent } from '@/config/arcade-light-mappings';
import { useGameSounds } from '@/hooks/useGameSounds';
import { GAME_OVER_SEQUENCE } from '@/lib/juice/brandConstants';
import { createManagedAudio } from '@/utils/audioElement';
import { safeStorage } from '@/utils/safeStorage';
import {
  FRUITS,
  COLORS,
  GRACE_PERIOD_MS,
  TAP_DEBOUNCE_MS,
  getCycleMs,
  getMatchWindowMs,
  getFullMatchChancePct,
  getPartialChancePct,
  calculateBasePoints,
  getStreakBonus,
  randomFruit,
  randomColor,
  randomFruitExcept,
  randomColorExcept,
} from './color-reaction-arcade-config';
import type { MatchType } from './color-reaction-arcade-config';
import './ColorReaction.css';


// Game state interface — Arcade: dual attribute (fruit + color)
interface GameState {
  status: 'idle' | 'playing' | 'gameover';
  targetFruit: number;
  targetColor: number;
  yourFruit: number;
  yourColor: number;
  score: number;
  streak: number;
  lives: number;
  bestReactionTime: number;
  matchType: MatchType;
  isMatchWindow: boolean;
  lastColorChangeTime: number;
}

// Floating score interface
interface FloatingScore {
  id: string;
  text: string;
  type: 'correct' | 'wrong' | 'warning';
  x: number;
  y: number;
}

const initialGameState: GameState = {
  status: 'idle',
  targetFruit: 0,
  targetColor: 1,
  yourFruit: 0,
  yourColor: 1,
  score: 0,
  streak: 0,
  lives: 3,
  bestReactionTime: Infinity,
  matchType: 'NO_MATCH',
  isMatchWindow: false,
  lastColorChangeTime: 0,
};

// Background music playlist
const MUSIC_PLAYLIST = [
  { src: '/audio/music/color-reaction/smb-main-theme-final.mp3', name: 'SMB Main Theme' },
  { src: '/audio/music/color-reaction/smw-overworld-final.mp3', name: 'SMW Overworld' },
  { src: '/audio/music/color-reaction/smb-underground-final.mp3', name: 'SMB Underground' },
  { src: '/audio/music/color-reaction/smw-title-theme-final.mp3', name: 'SMW Title' },
];

const ColorReaction: React.FC = () => {
  const isMobile = useIsMobile();
  
  // TASK 93: Reduced motion mode - respect system preference (reactive)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Arcade frame mute control (from GameModal)
  const { isMuted: arcadeMuted, musicManagedExternally, isPaused: isContextPaused } = useGameMute();

  // Arcade lights control (from GameModal via context)
  const { triggerEvent, setGameId } = useArcadeLights();

  // Register this game for per-game light overrides
  useEffect(() => {
    setGameId('color-reaction');
  }, [setGameId]);

  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [screenShake, setScreenShake] = useState(false);
  const [epicCallout, setEpicCallout] = useState<string | null>(null);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [playerFlash, setPlayerFlash] = useState<'correct' | 'wrong' | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [matchProgress, setMatchProgress] = useState(0); // 0-100 for countdown ring

  // Background music refs
  const playlistIndexRef = useRef(0);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const gameStatusRefForMusic = useRef(gameState.status);
  const isMutedRef = useRef(isMuted);
  // Ref for the playMusicTrack function to allow recursive calls
  const playMusicTrackRef = useRef<((index: number) => void) | null>(null);

  // Initialize random playlist index on mount (avoids Math.random during render)
  useEffect(() => {
    playlistIndexRef.current = Math.floor(Math.random() * MUSIC_PLAYLIST.length);
  }, []);

  // Keep refs in sync
  useEffect(() => { gameStatusRefForMusic.current = gameState.status; }, [gameState.status]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Ref for musicManagedExternally (to check in startGame)
  const musicManagedExternallyRef = useRef(musicManagedExternally);
  useEffect(() => { musicManagedExternallyRef.current = musicManagedExternally; }, [musicManagedExternally]);

  // Play specific track
  const playMusicTrack = useCallback((index: number) => {
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
    }
    playlistIndexRef.current = index;
    const track = MUSIC_PLAYLIST[index];
    const music = createManagedAudio(track.src);
    music.volume = 1.0;
    music.addEventListener('ended', () => {
      playlistIndexRef.current = (playlistIndexRef.current + 1) % MUSIC_PLAYLIST.length;
      if (gameStatusRefForMusic.current === 'playing' && !isMutedRef.current) {
        // Use ref to call playMusicTrack recursively (avoids stale closure)
        playMusicTrackRef.current?.(playlistIndexRef.current);
      }
    }, { once: true });
    musicAudioRef.current = music;
    if (!isMutedRef.current) {
      music.play().catch(() => {});
    }
  }, []);

  // Keep playMusicTrackRef in sync
  useEffect(() => { playMusicTrackRef.current = playMusicTrack; }, [playMusicTrack]);

  // Play next song in playlist
  const playNextMusicTrack = useCallback(() => {
    playMusicTrack(playlistIndexRef.current);
  }, [playMusicTrack]);

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
        // Page became visible - resume music if it was playing before and game is still playing
        if (wasPlayingBeforeHiddenRef.current && gameStatusRefForMusic.current === 'playing' && !isMutedRef.current) {
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
  }, []);

  // Control music based on game state and mute
  useEffect(() => {
    if (gameState.status === 'playing' && !isMuted) {
      if (musicAudioRef.current) {
        musicAudioRef.current.play().catch(() => {});
      }
    } else {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
      }
    }
  }, [gameState.status, isMuted]);

  // Mobile fullscreen mode - hide navigation and lock scroll as soon as game page opens
  useMobileGameFullscreen(isMobile, isMobile);

  const [livesWarning, setLivesWarning] = useState<string | null>(null);

  // Phase 3: Urgency system state
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'warning' | 'critical'>('normal');

  // Phase 4: Perfect celebration state
  const [perfectFlash, setPerfectFlash] = useState(false);
  const [perfectPulse, setPerfectPulse] = useState(false);
  const [showReactionTime, setShowReactionTime] = useState<number | null>(null);
  const [showConnectionLine, setShowConnectionLine] = useState(false);

  // Phase 5: Visual juice state
  const [tapSquash, setTapSquash] = useState(false);
  const [impactFlash, setImpactFlash] = useState(false);
  const [backgroundPulse, setBackgroundPulse] = useState(false);
  const [streakFire, setStreakFire] = useState(false);

  // Phase 6: Streak & Scoring Polish state
  const [scorePop, setScorePop] = useState(false);
  const [highScoreBeat, setHighScoreBeat] = useState(false);
  const [bestTimeBeat, setBestTimeBeat] = useState(false);
  const [currentRating, setCurrentRating] = useState<string | null>(null);

  // Phase 7: Failure & Warning States
  const [lastLifeWarning, setLastLifeWarning] = useState(false);
  const [floatingX, setFloatingX] = useState(false);
  const [floatingClock, setFloatingClock] = useState(false);

  // Phase 8: Visual feedback states
  const [tooLateFeedback, setTooLateFeedback] = useState(false);
  const [mismatchFruit, setMismatchFruit] = useState(false);
  const [mismatchColor, setMismatchColor] = useState(false);
  const [reactionTimePopup, setReactionTimePopup] = useState<number | null>(null); // Shows ms under player circle

  // Phase 10: Fever Mode & Advanced Combos
  const [feverMode, setFeverMode] = useState(false);
  const [feverIntensity, setFeverIntensity] = useState(0); // 0-3 intensity levels
  const [feverActivating, setFeverActivating] = useState(false);

  // Phase 11: Advanced Visual Effects
  const [hitStop, setHitStop] = useState(false);

  // Phase 13: Pressure Mode - visual intensity at high scores
  const [pressureLevel, setPressureLevel] = useState(0); // 0-4

  // Phase 12: Viral & Share System
  // bestMomentsRef commented out - tracked but never displayed
  // const bestMomentsRef = useRef<{ type: string; value: number; timestamp: number }[]>([]);

  // #region agent log - DISABLED to prevent layout thrashing
  // Debug instrumentation removed - was causing the very layout shifts we were debugging
  // #endregion

  // Hide instruction after 15 seconds of gameplay
  const [showInstruction, setShowInstruction] = useState(true);
  const showInstructionRef = useRef(true); // Ref for synchronous access in scheduleNextCycle
  const instructionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Game over screen states
  const [gameScreenshot, setGameScreenshot] = useState<string | null>(null);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [meetsMinimumActions, setMeetsMinimumActions] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(safeStorage.getItem('colorReactionHighScore') || '0', 10);
  });

  // Arcade lights: React to game over (must be after highScore state is defined)
  useEffect(() => {
    if (gameState.status === 'gameover') {
      // Check if this was a high score
      if (gameState.score > highScore) {
        // Trigger high score after a brief delay for game over animation
        setTimeout(() => {
          triggerEvent('game:highScore');
        }, 1600);
      }
      triggerEvent('game:over');
    }
  }, [gameState.status, gameState.score, highScore, triggerEvent]);

  // Sound hooks - legacy Howler sounds (most replaced by Color Reaction procedural sounds)
  const { setMuted: setMutedHowler } = useHowlerSounds();

  // Color Reaction procedural sounds (Web Audio API)
  const {
    playCorrectTap: playCRCorrectTap,
    playWrongTap: playCRWrongTap,
    playMiss: playCRMiss,
    playMatchStart: playCRMatchStart,
    playLifeLoss: playCRLifeLoss,
    playLastLifeWarning: playCRLastLifeWarning,
    playGameOver: playCRGameOver,
    playPerfect: playCRPerfect,
    playStreakMilestone: playCRStreakMilestone,
    // playSpeedUp reserved for speed increase notifications
    // playSpeedUp: playCRSpeedUp,
    playTimeDilation: playCRTimeDilation,
    playGameStart: playCRGameStart,
    setMuted: setMutedCR,
  } = useColorReactionSounds();

  // Combined mute function
  const setMuted = useCallback((muted: boolean) => {
    setMutedHowler(muted);
    setMutedCR(muted);
  }, [setMutedHowler, setMutedCR]);

  // Sync with arcade frame mute button (from GameMuteContext)
  useEffect(() => {
    // Only sync if NOT managed externally (meaning this game controls its own music)
    if (!musicManagedExternally) {
      // Arcade mute button changed - sync local state
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: sync external mute state to local state
      setIsMuted(arcadeMuted);
      setMuted(arcadeMuted);
      // Also directly pause/resume music for immediate feedback
      if (arcadeMuted) {
        if (musicAudioRef.current) {
          musicAudioRef.current.pause();
        }
      } else if (gameStatusRefForMusic.current === 'playing') {
        if (musicAudioRef.current) {
          musicAudioRef.current.play().catch(() => {});
        }
      }
    }
  }, [arcadeMuted, musicManagedExternally, setMuted]);

  // Haptic hooks - Color Reaction specific patterns
  const {
    // Generic haptics (most replaced by Color Reaction specific patterns)
    hapticGameOver,
    // Color Reaction specific
    hapticCRTap,
    hapticCRPerfect,
    hapticCRGreat,
    hapticCRGood,
    hapticCROk,
    hapticCRWrong,
    hapticCRMiss,
    hapticCRLoseLife,
    hapticCRLastLife,
    hapticCRStreak5,
    hapticCRStreak10,
    hapticCRStreak15,
    hapticCRStreak20,
  } = useGameHaptics();

  // Leaderboard hooks
  const { submitScore, isSignedIn, leaderboard: globalLeaderboard, userDisplayName, isSubmitting } = useLeaderboard('color-reaction');

  // Universal visual effects system
  const {
    effects,
    triggerShockwave,
    triggerSparks,
    triggerVignette,
    addFloatingEmoji,
    triggerConfetti,
    updateCombo,
    resetCombo,
    resetAllEffects,
  } = useGameEffects();

  // Standard game sounds (for signature chime only - other sounds use useColorReactionSounds)
  const { playWojakChime } = useGameSounds();

  // Timer refs
  const roundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchWindowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mismatchHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxStreakRef = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameStartTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);

  // Refs for immediate state access (avoid stale closures on mobile)
  const isMatchWindowRef = useRef(false);
  const gameStatusRef = useRef<'idle' | 'playing' | 'gameover'>('idle');
  const targetFruitRef = useRef(0);
  const targetColorRef = useRef(0);
  const yourFruitRef = useRef(0);
  const yourColorRef = useRef(1);
  
  // Ref for game loop to check context pause state (quit dialog from GameModal)
  const isContextPausedRef = useRef(false);

  // Match timing — source of truth (use performance.now())
  const matchActiveRef = useRef(false);
  const matchStartTsRef = useRef<number | null>(null);
  const matchWindowMsRef = useRef(1000);

  // Match ID: increment only on FULL_MATCH start; prevents stale timeout processing
  const currentRoundIdRef = useRef(0);
  const matchHandledRef = useRef(true);

  // Cycle / target-update
  const cycleCountRef = useRef(0);
  const prevYourFruitRef = useRef(-1);
  const prevYourColorRef = useRef(-1);
  const lastFullMatchTimeRef = useRef<number>(0); // Track time since last FULL_MATCH for guarantee
  const processingCycleRef = useRef(false); // Prevent concurrent scheduleNextCycle calls
  const isFirstCycleRef = useRef(true); // Prevent FULL_MATCH on first cycle (ease-in)
  const prevMatchTypeRef = useRef<MatchType>('NO_MATCH'); // Track previous match type to prevent consecutive FULL
  const wrongTapWarningsRef = useRef(0); // Track wrong tap warnings (first = warning, second = life)

  // Game stats - tracks successful taps for leaderboard eligibility
  const gameStatsRef = useRef({ successes: 0 });

  // Prevent double-tap from mobile firing both touchstart and click
  const lastWrongTapTimeRef = useRef(0);
  const WRONG_TAP_COOLDOWN_MS = 600; // Prevent double wrong tap penalty

  // CRITICAL: Prevent "TOO LATE" from showing after a successful tap
  const lastSuccessTapTimeRef = useRef(0);
  const SUCCESS_TAP_GRACE_MS = 500; // Grace period after success to ignore "TOO LATE"

  // CRITICAL: Prevent losing more than 1 life per 500ms no matter what
  const lastLifeLostTimeRef = useRef(0);
  const LIFE_LOSS_COOLDOWN_MS = 1500; // 1.5 seconds recovery after any life loss

  const displaySize = isMobile ? 210 : 252; // 40% bigger (was 150/180)

  // iOS audio unlock
  useEffect(() => {
    const unlock = () => {
      Howler.ctx?.resume();
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('touchstart', unlock);
    return () => document.removeEventListener('touchstart', unlock);
  }, []);

  const cleanupAllTimers = useCallback(() => {
    if (roundTimeoutRef.current) {
      clearTimeout(roundTimeoutRef.current);
      roundTimeoutRef.current = null;
    }
    if (matchWindowTimeoutRef.current) {
      clearTimeout(matchWindowTimeoutRef.current);
      matchWindowTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (mismatchHighlightTimeoutRef.current) {
      clearTimeout(mismatchHighlightTimeoutRef.current);
      mismatchHighlightTimeoutRef.current = null;
    }
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => cleanupAllTimers();
  }, [cleanupAllTimers]);

  // Cleanup all timers on game over (prevents phantom misses)
  useEffect(() => {
    if (gameState.status === 'gameover') {
      cleanupAllTimers();
    }
  }, [gameState.status, cleanupAllTimers]);

  // Track max streak
  useEffect(() => {
    if (gameState.streak > maxStreakRef.current) {
      maxStreakRef.current = gameState.streak;
    }
  }, [gameState.streak]);

  // Update pressure level based on score (visual intensity)
  // Higher thresholds for smoother progression
  useEffect(() => {
    const score = gameState.score;
    let newLevel = 0;
    if (score >= 2000) {
      newLevel = 4; // THE ZONE - maximum intensity
    } else if (score >= 1400) {
      newLevel = 3; // High intensity
    } else if (score >= 900) {
      newLevel = 2; // Medium intensity
    } else if (score >= 500) {
      newLevel = 1; // Subtle intensity
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: derived state from score for visual intensity
    setPressureLevel(newLevel);
  }, [gameState.score]);

  // Hide instruction after 15 seconds of gameplay (tutorial period)
  // During tutorial: show hints + play match sound
  // After tutorial: no hints + play decoy sounds to confuse
  useEffect(() => {
    if (gameState.status === 'playing' && showInstruction) {
      // Start 15-second timer to hide instruction (end tutorial)
      instructionTimerRef.current = setTimeout(() => {
        setShowInstruction(false);
        showInstructionRef.current = false;
      }, 15000);
    } else if (gameState.status === 'idle') {
      // Reset when game returns to idle
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: reset tutorial state when returning to idle
      setShowInstruction(true);
      showInstructionRef.current = true;
      if (instructionTimerRef.current) {
        clearTimeout(instructionTimerRef.current);
      }
    }
    return () => {
      if (instructionTimerRef.current) {
        clearTimeout(instructionTimerRef.current);
      }
    };
  }, [gameState.status, showInstruction]);

  // Keep refs in sync with state (for tap handler). matchActiveRef is source of truth, set in scheduleNextCycle/tap/miss.
  useEffect(() => {
    isMatchWindowRef.current = gameState.isMatchWindow;
    targetFruitRef.current = gameState.targetFruit;
    targetColorRef.current = gameState.targetColor;
    yourFruitRef.current = gameState.yourFruit;
    yourColorRef.current = gameState.yourColor;
    gameStatusRef.current = gameState.status;
    
  }, [gameState.isMatchWindow, gameState.targetFruit, gameState.targetColor, gameState.yourFruit, gameState.yourColor, gameState.status]);

  // Sync context pause state to ref
  useEffect(() => {
    isContextPausedRef.current = isContextPaused;
  }, [isContextPaused]);

  // Ref for tracking lives changes
  const prevLivesRef = useRef(gameState.lives);

  // Effect triggers
  const triggerScreenShake = useCallback((duration: number = 100) => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), duration);
  }, []);

  const showEpicCallout = useCallback((text: string) => {
    setEpicCallout(text);
    setTimeout(() => setEpicCallout(null), 1500);
  }, []);

  const triggerPlayerFlash = useCallback((type: 'correct' | 'wrong') => {
    setPlayerFlash(type);
    setTimeout(() => setPlayerFlash(null), 300);
  }, []);

  const showFloatingScore = useCallback((text: string, type: 'correct' | 'wrong' | 'warning') => {
    const id = `score-${performance.now()}`;
    const newScore: FloatingScore = {
      id,
      text,
      type,
      x: 50, // Centered horizontally (between the two circles)
      y: 50, // Centered vertically (exactly between the circles)
    };
    setFloatingScores((prev) => [...prev, newScore]);
    setTimeout(() => {
      setFloatingScores((prev) => prev.filter((s) => s.id !== id));
    }, 1200);
  }, []);

  const showLivesWarning = useCallback((lives: number) => {
    const warnings: Record<number, string> = {
      2: '2 LIVES LEFT!',
      1: 'LAST LIFE!',
    };
    if (warnings[lives]) {
      setLivesWarning(warnings[lives]);
      setTimeout(() => setLivesWarning(null), 1500);
    }
  }, []);

  // Refs for game over handler (avoids stale closures in scheduleNextCycle)
  const isSignedInRef = useRef(isSignedIn);
  const submitScoreRef = useRef(submitScore);
  const highScoreRef = useRef(highScore);
  
  useEffect(() => { isSignedInRef.current = isSignedIn; }, [isSignedIn]);
  useEffect(() => { submitScoreRef.current = submitScore; }, [submitScore]);
  useEffect(() => { highScoreRef.current = highScore; }, [highScore]);

  // Shared game over handler - captures screenshot, submits score, sets game over state
  const handleGameOver = useCallback(async (finalScore: number, bestReactionTime: number) => {
    gameStatusRef.current = 'gameover';
    
    // Stop music
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current = null;
    }

    // Check for new high score
    const currentHighScore = highScoreRef.current;
    const isNewBest = finalScore > currentHighScore;
    if (isNewBest) {
      setIsNewPersonalBest(true);
      setHighScore(finalScore);
      safeStorage.setItem('colorReactionHighScore', String(finalScore));
      playWojakChime();
    } else {
      setIsNewPersonalBest(false);
    }

    // Capture screenshot BEFORE showing game over (wait for it)
    if (gameAreaRef.current) {
      const screenshot = await captureGameArea(gameAreaRef.current);
      if (screenshot) {
        setGameScreenshot(screenshot);
      }
    }

    // Check minimum actions and store in state (for render without ref access)
    const hasMinimumActions = gameStatsRef.current.successes >= 3;
    setMeetsMinimumActions(hasMinimumActions);

    // Submit score if signed in and met minimum actions
    if (isSignedInRef.current && hasMinimumActions) {
      submitScoreRef.current(finalScore, undefined, {
        bestReactionTime: bestReactionTime === Infinity ? null : Math.round(bestReactionTime),
        maxStreak: maxStreakRef.current,
        correctTaps: gameStatsRef.current.successes,
      });
    }

    // Set game over state
    setGameState((prev) => ({ ...prev, status: 'gameover', lives: 0, streak: 0, isMatchWindow: false }));
  }, [playWojakChime]);

  // Ref for handleGameOver to use in scheduleNextCycle
  const handleGameOverRef = useRef(handleGameOver);
  useEffect(() => { handleGameOverRef.current = handleGameOver; }, [handleGameOver]);

  // Ref for scheduleNextCycle to allow recursive calls
  const scheduleNextCycleRef = useRef<((currentScore: number, caller?: string) => void) | null>(null);

  const scheduleNextCycle = useCallback((currentScore: number, caller?: string) => {
    // Prevent concurrent calls
    if (processingCycleRef.current) {
      return;
    }
    // Pause game cycle when quit dialog is shown
    if (isContextPausedRef.current) {
      setTimeout(() => {
        scheduleNextCycleRef.current?.(currentScore, caller || 'retry-after-pause');
      }, 100);
      return;
    }
    // CRITICAL: Never allow scheduleNextCycle if a match window is still active
    if (matchActiveRef.current || isMatchWindowRef.current) {
      if (caller !== 'miss-handler' && caller !== 'handleTap-success') {
        processingCycleRef.current = false;
        return;
      }
      if (isMatchWindowRef.current) {
        processingCycleRef.current = false;
        setTimeout(() => {
          scheduleNextCycleRef.current?.(currentScore, caller || 'retry-after-match-window');
        }, 100);
        return;
      }
    }
    processingCycleRef.current = true;
    cleanupAllTimers();
    const now = performance.now();

    // ========== ALL RANDOM DECISIONS HAPPEN HERE (OUTSIDE setGameState) ==========
    // This prevents React StrictMode double-call from producing different results
    const cycleCount = cycleCountRef.current + 1;
    cycleCountRef.current = cycleCount;

    const fullMatchChancePct = getFullMatchChancePct(currentScore);
    const partialChancePct = getPartialChancePct(currentScore);
    const cycleMs = getCycleMs(currentScore);

    // Target update decision (computed ONCE)
    const targetJustUpdated = (cycleCount % 4 === 0) || Math.random() < 0.25;
    let newTargetFruit = targetFruitRef.current;
    let newTargetColor = targetColorRef.current;
    if (targetJustUpdated) {
      newTargetFruit = randomFruit();
      newTargetColor = randomColor();
    }

    // Match type decision (computed ONCE)
    const timeSinceLastFullMatch = now - lastFullMatchTimeRef.current;
    const mustForceFullMatch = timeSinceLastFullMatch >= 5000;
    const shouldForceFullMatch = timeSinceLastFullMatch >= 3000 && Math.random() < 0.4;
    
    const isFirstCycle = isFirstCycleRef.current;
    if (isFirstCycle) {
      isFirstCycleRef.current = false;
    }
    
    const pastGrace = now - gameStartTimeRef.current >= GRACE_PERIOD_MS;
    const wasLastMatchFull = prevMatchTypeRef.current === 'FULL_MATCH';
    
    // COOLDOWN: Minimum 2 seconds between FULL matches (prevents FULL->brief_partial->FULL feeling)
    const MIN_TIME_BETWEEN_FULL_MS = 2000;
    const cooldownExpired = timeSinceLastFullMatch >= MIN_TIME_BETWEEN_FULL_MS;
    
    // CRITICAL: All conditions must be met for FULL to spawn
    const canSpawnFull = pastGrace && !isFirstCycle && !wasLastMatchFull && cooldownExpired;
    
    const effectiveFullMatchChance = targetJustUpdated 
      ? Math.max(10, fullMatchChancePct * 0.8)
      : fullMatchChancePct;
    
    const rand1 = Math.random() * 100;
    // Force logic also respects cooldown
    const effectiveMustForce = mustForceFullMatch && pastGrace && cooldownExpired;
    const effectiveShouldForce = shouldForceFullMatch && pastGrace && cooldownExpired;
    
    let matchType: MatchType;
    
    if ((effectiveMustForce || effectiveShouldForce || rand1 < effectiveFullMatchChance) && canSpawnFull) {
      matchType = 'FULL_MATCH';
    } else {
      const rand2 = Math.random() * 100;
      matchType = rand2 < partialChancePct ? 'PARTIAL_MATCH' : 'NO_MATCH';
    }
    
    // Update prev match type ref (for consecutive prevention)
    prevMatchTypeRef.current = matchType;

    // Compute yourFruit/yourColor (computed ONCE)
    let newYourFruit: number;
    let newYourColor: number;
    if (matchType === 'FULL_MATCH') {
      newYourFruit = newTargetFruit;
      newYourColor = newTargetColor;
    } else if (matchType === 'PARTIAL_MATCH') {
      const fruitMatch = Math.random() < 0.5;
      if (fruitMatch) {
        newYourFruit = newTargetFruit;
        newYourColor = randomColorExcept(newTargetColor);
      } else {
        newYourColor = newTargetColor;
        newYourFruit = randomFruitExcept(newTargetFruit);
      }
    } else {
      newYourFruit = randomFruitExcept(newTargetFruit);
      newYourColor = randomColorExcept(newTargetColor);
    }

    // Duplicate check for PARTIAL/NO_MATCH only
    if (matchType !== 'FULL_MATCH' && newYourFruit === prevYourFruitRef.current && newYourColor === prevYourColorRef.current) {
      if (matchType === 'PARTIAL_MATCH') {
        const fruitMatch = Math.random() < 0.5;
        if (fruitMatch) {
          newYourFruit = newTargetFruit;
          newYourColor = randomColorExcept(newTargetColor);
        } else {
          newYourColor = newTargetColor;
          newYourFruit = randomFruitExcept(newTargetFruit);
        }
      } else {
        newYourFruit = randomFruitExcept(newTargetFruit);
        newYourColor = randomColorExcept(newTargetColor);
      }
    }

    // Update all refs IMMEDIATELY (before setGameState)
    prevYourFruitRef.current = newYourFruit;
    prevYourColorRef.current = newYourColor;
    targetFruitRef.current = newTargetFruit;
    targetColorRef.current = newTargetColor;
    yourFruitRef.current = newYourFruit;
    yourColorRef.current = newYourColor;
    isMatchWindowRef.current = matchType === 'FULL_MATCH';

    if (matchType === 'FULL_MATCH') {
      matchActiveRef.current = true;
      lastFullMatchTimeRef.current = now;
    } else {
      matchActiveRef.current = false;
    }

    const plannedVisualMatch = (newTargetFruit === newYourFruit && newTargetColor === newYourColor);

    if (matchType === 'FULL_MATCH' && !plannedVisualMatch) {
      console.error("[CR][BUG] FULL_MATCH but plannedVisualMatch is FALSE!", {
        newTargetFruit, newTargetColor, newYourFruit, newYourColor
      });
    }

    // ========== NOW APPLY TO STATE (setGameState just applies pre-computed values) ==========
    setGameState((prev) => {
      if (prev.status !== 'playing') {
        processingCycleRef.current = false;
        return prev;
      }

      // Just apply the pre-computed values - NO random decisions here!
      return {
        ...prev,
        targetFruit: newTargetFruit,
        targetColor: newTargetColor,
        yourFruit: newYourFruit,
        yourColor: newYourColor,
        matchType,
        isMatchWindow: matchType === 'FULL_MATCH',
        lastColorChangeTime: now,
      };
    });

    // Set up timers AFTER state update
    if (matchType === 'FULL_MATCH') {
      currentRoundIdRef.current += 1;
      const localMatchId = currentRoundIdRef.current;
      matchHandledRef.current = false;
      matchStartTsRef.current = now;
      
      // EARLY GAME BONUS: Grace period to learn the game
      // Gradual ramp over 2 minutes for smooth difficulty curve
      const gameTimeSeconds = (now - gameStartTimeRef.current) / 1000;
      let earlyGameBonus = 0;
      if (gameTimeSeconds < 20) {
        earlyGameBonus = 200; // First 20 seconds: tutorial mode
      } else if (gameTimeSeconds < 45) {
        earlyGameBonus = 150; // 20-45 seconds: still learning
      } else if (gameTimeSeconds < 75) {
        earlyGameBonus = 100; // 45-75 seconds: getting comfortable
      } else if (gameTimeSeconds < 120) {
        earlyGameBonus = 50; // 75-120 seconds: nearly full difficulty
      }
      // After 2 minutes: full difficulty
      
      const baseWindowMs = getMatchWindowMs(currentScore, 0);
      const windowMs = Math.min(1100, baseWindowMs + earlyGameBonus); // Cap at 1100ms max
      matchWindowMsRef.current = windowMs;

      setMatchProgress(100);
      setUrgencyLevel('normal');
      
      // TUTORIAL MODE: Play match sound to help user learn
      // HARD MODE (after tutorial): No sound - user must watch carefully
      if (showInstructionRef.current) {
        playCRMatchStart();
      }

      const startTime = now;
      let pausedTime = 0;
      let lastPauseStart = 0;
      countdownIntervalRef.current = setInterval(() => {
        // Track pause time to freeze the countdown
        if (isContextPausedRef.current) {
          if (lastPauseStart === 0) {
            lastPauseStart = performance.now();
          }
          return; // Don't update progress while paused
        } else if (lastPauseStart > 0) {
          // Resumed from pause - add pause duration to offset
          pausedTime += performance.now() - lastPauseStart;
          lastPauseStart = 0;
        }
        
        const elapsed = performance.now() - startTime - pausedTime;
        const progress = Math.max(0, 100 * (1 - elapsed / windowMs));
        setMatchProgress(progress);
        
        // Update urgency level based on remaining time
        if (progress > 50) {
          setUrgencyLevel('normal');
        } else if (progress > 25) {
          setUrgencyLevel('warning');
        } else {
          setUrgencyLevel('critical');
        }
        
        if (progress <= 0 && countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }, 50);

      matchWindowTimeoutRef.current = setTimeout(() => {
        // Don't process misses when game is paused (quit dialog shown)
        // The game will continue when the pause ends via scheduleNextCycle retry
        if (isContextPausedRef.current) {
          return;
        }
        
        // Check match ID FIRST
        if (localMatchId !== currentRoundIdRef.current) {
          return;
        }
        
        if (matchHandledRef.current || !matchActiveRef.current) {
          return;
        }
        
        const visualsMatch = targetFruitRef.current === yourFruitRef.current && targetColorRef.current === yourColorRef.current;
        if (!visualsMatch) {
          matchHandledRef.current = true;
          matchActiveRef.current = false;
          return;
        }
        
        matchHandledRef.current = true;
        matchActiveRef.current = false;
        isMatchWindowRef.current = false;
        
        // CRITICAL: Set life loss cooldown to prevent double punishment
        // Player already lost a life for timing out - don't punish again if they tap late
        lastLifeLostTimeRef.current = performance.now();
        
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setMatchProgress(0);
        hapticCRMiss();
        playCRMiss();
        // Arcade lights: Warning flash for miss
        triggerEvent('miss:light');
        setFloatingClock(true);
        setTimeout(() => setFloatingClock(false), 800);

        // Use a ref to track if we've already scheduled the next cycle
        // This prevents React StrictMode from scheduling twice
        let nextCycleScheduled = false;
        let gameOverHandled = false;
        
        setGameState((currentState) => {
          if (currentState.status !== 'playing') {
            return currentState;
          }
          
          const currentLives = currentState.lives;
          const newLives = currentLives - 1;
          
          if (newLives <= 0) {
            // Use shared game over handler (handles screenshot + score submission)
            if (!gameOverHandled) {
              gameOverHandled = true;
              handleGameOverRef.current(currentState.score, currentState.bestReactionTime);
            }
            // Return unchanged - handleGameOver will set the state
            return currentState;
          } else {
            // CRITICAL: Only schedule next cycle ONCE (prevent StrictMode double-scheduling)
            if (!nextCycleScheduled) {
              nextCycleScheduled = true;
              // 500ms delay gives player breathing room
              setTimeout(() => {
                scheduleNextCycleRef.current?.(currentScore, 'miss-handler');
              }, 500);
            }
            return { ...currentState, lives: newLives, streak: 0, isMatchWindow: false };
          }
        });
      }, windowMs);
    } else {
      matchHandledRef.current = true;
      matchActiveRef.current = false;
      
      // HARD MODE: After tutorial, randomly play DECOY sounds to confuse the player
      // This makes them rely on visual matching, not audio cues
      if (!showInstructionRef.current && Math.random() < 0.15) {
        // 15% chance to play a decoy sound on non-FULL cycles
        // Use a different sound that's similar but not the same as match sound
        playCRTimeDilation(); // Plays a subtle "woosh" - sounds exciting but isn't a match
      }
      
      roundTimeoutRef.current = setTimeout(() => {
        scheduleNextCycleRef.current?.(currentScore, 'cycle-timeout');
      }, cycleMs);
    }

    processingCycleRef.current = false;
  }, [cleanupAllTimers, playCRMatchStart, hapticCRMiss, playCRMiss, playCRTimeDilation, triggerEvent]);

  // Keep scheduleNextCycleRef in sync
  useEffect(() => { scheduleNextCycleRef.current = scheduleNextCycle; }, [scheduleNextCycle]);

  // Handle correct tap with all effects (Arcade: points = basePoints + streakBonus, no multiplier)
  const handleCorrectTap = useCallback(
    (actualPoints: number, rating: string, reactionMs: number, newStreak: number) => {
      triggerScreenShake(100);
      triggerPlayerFlash('correct');

      // Arcade lights: Trigger score event based on rating
      if (rating === 'PERFECT') {
        triggerEvent('perfect:hit');
      } else if (rating === 'GREAT') {
        triggerEvent('score:large');
      } else if (rating === 'GOOD') {
        triggerEvent('score:medium');
      } else {
        triggerEvent('score:small');
      }

      // Arcade lights: Update combo tier
      if (newStreak >= 2) {
        const comboTier = getComboTier(newStreak);
        triggerEvent(`combo:${comboTier}` as GameEvent);
      }

      if (rating !== 'PERFECT') {
        setCurrentRating(rating);
        setTimeout(() => setCurrentRating(null), 800);
      }
      // Show points centered between circles
      showFloatingScore(`+${actualPoints}`, 'correct');
      
      // Show reaction time separately under player circle
      setReactionTimePopup(Math.round(reactionMs));
      setTimeout(() => setReactionTimePopup(null), 1200);

      // TASK 70: Score pop effect
      setScorePop(true);
      setTimeout(() => setScorePop(false), 200);

      playCRCorrectTap(reactionMs);

      // TASK 4: Reaction-time based haptics
      if (rating === 'PERFECT') {
        hapticCRPerfect();
        // TASK 22: PERFECT celebration sound + TASK 27: Time dilation sound
        playCRPerfect();
        playCRTimeDilation();

        // === PHASE 4: PERFECT CELEBRATION EFFECTS ===

        // TASK 40: Gold screen flash
        setPerfectFlash(true);
        setTimeout(() => setPerfectFlash(false), 150);

        // TASK 44: Screen shake on PERFECT
        triggerScreenShake(200);

        // TASK 45: Circle pulse on PERFECT
        setPerfectPulse(true);
        setTimeout(() => setPerfectPulse(false), 400);

        // TASK 46: Confetti burst on PERFECT
        triggerConfetti();

        setShowReactionTime(reactionMs);
        setTimeout(() => setShowReactionTime(null), 1500);

        // TASK 48: Connection line between circles
        setShowConnectionLine(true);
        setTimeout(() => setShowConnectionLine(false), 500);

      } else if (rating === 'GREAT') {
        hapticCRGreat();
      } else if (rating === 'GOOD') {
        hapticCRGood();
      } else {
        hapticCROk();
      }

      const colorIdx = yourColorRef.current;
      const hex = COLORS[colorIdx]?.hex ?? '#FF6B00';
      const emoji = FRUITS[yourFruitRef.current]?.emoji ?? '🍊';
      triggerShockwave(hex, 0.5);
      triggerSparks(hex);
      addFloatingEmoji(emoji);
      updateCombo();

      // TASK 51: Impact flash on correct tap
      setImpactFlash(true);
      setTimeout(() => setImpactFlash(false), 150);

      // TASK 60: Background pulse on correct
      setBackgroundPulse(true);
      setTimeout(() => setBackgroundPulse(false), 300);

      // TASK 110: Hit-stop on correct tap (scaled by rating)
      const hitStopDuration = rating === 'PERFECT' ? 80 : rating === 'GREAT' ? 50 : 30;
      setHitStop(true);
      setTimeout(() => setHitStop(false), hitStopDuration);

      // TASK 61: Streak fire effect at high streaks
      if (newStreak >= 5) {
        setStreakFire(true);
      }

      // TASK 101-107: Fever Mode activation at 15+ streak
      if (newStreak === 15 && !feverMode) {
        // TASK 102: Dramatic Fever Mode activation
        setFeverActivating(true);
        setTimeout(() => {
          setFeverActivating(false);
          setFeverMode(true);
          setFeverIntensity(1);
        }, 500);
        showEpicCallout('🔥 FEVER MODE! 🔥');
      } else if (feverMode) {
        // TASK 107: Fever intensity grows with continued success
        if (newStreak >= 25) {
          setFeverIntensity(3);
        } else if (newStreak >= 20) {
          setFeverIntensity(2);
        }
      }

      if (rating === 'PERFECT') {
        // REMOVED: epicCallout('PERFECT!') - showReactionTime already displays "XXXms PERFECT!"
        // Having both was redundant and confusing

        // TASK 42: Major particle burst for PERFECT
        triggerShockwave('#FFD700', 1.0); // Larger gold shockwave
        triggerSparks('#FFD700'); // Gold sparks
        // TASK 117: Track best moments for sharing (disabled - not displayed)
        // bestMomentsRef.current.push({ type: 'perfect', value: reactionMs, timestamp: performance.now() });
      }

      // TASK 11 & 23: Streak milestones with confetti, haptics, and sounds
      if (newStreak === 5) {
        showEpicCallout('NICE!');
        playCRStreakMilestone(5);
        hapticCRStreak5();
      } else if (newStreak === 10) {
        showEpicCallout('GREAT!');
        playCRStreakMilestone(10);
        triggerConfetti();
        hapticCRStreak10();
      } else if (newStreak === 15) {
        showEpicCallout('AMAZING!');
        playCRStreakMilestone(15);
        triggerConfetti();
        hapticCRStreak15();
      } else if (newStreak === 20) {
        showEpicCallout('UNSTOPPABLE!');
        playCRStreakMilestone(20);
        triggerConfetti();
        hapticCRStreak20();
      }

      if (reactionMs < 200 && rating !== 'PERFECT') {
        showEpicCallout('LIGHTNING!');
      }
    },
    [triggerScreenShake, triggerPlayerFlash, showFloatingScore, showEpicCallout, triggerShockwave, triggerSparks, addFloatingEmoji, updateCombo, triggerConfetti, hapticCRPerfect, hapticCRGreat, hapticCRGood, hapticCROk, hapticCRStreak5, hapticCRStreak10, hapticCRStreak15, hapticCRStreak20, playCRCorrectTap, playCRPerfect, playCRTimeDilation, playCRStreakMilestone, triggerEvent, feverMode]
  );

  // Handle wrong tap with effects
  const handleWrongTap = useCallback((hadStreak: boolean = false) => {
    triggerScreenShake(150);
    triggerPlayerFlash('wrong');
    showFloatingScore('-1 ❤️', 'wrong');
    // TASK 14: Wrong tap sound (gentle)
    playCRWrongTap();
    // TASK 5: Wrong tap haptic - gentle error
    hapticCRWrong();
    // Arcade lights: Dramatic red alarm for wrong tap
    triggerEvent('damage:light');
    // Universal effects
    triggerVignette('#ff0000');
    triggerSparks('#ff4444');
    addFloatingEmoji('💔');
    resetCombo();
    // TASK 61: Reset streak fire on wrong tap
    setStreakFire(false);
    // TASK 65: Streak break feedback (if had a streak going)
    if (hadStreak) {
      // Show streak broken message handled via floating score
      showFloatingScore('STREAK BROKEN!', 'warning');
    }
    // TASK 106: Fever Mode deactivation on wrong tap
    if (feverMode) {
      setFeverMode(false);
      setFeverIntensity(0);
    }
  }, [triggerScreenShake, triggerPlayerFlash, showFloatingScore, playCRWrongTap, triggerVignette, triggerSparks, addFloatingEmoji, resetCombo, hapticCRWrong, feverMode, triggerEvent]);

  // Track lives changes for effects
  useEffect(() => {
    if (gameState.lives < prevLivesRef.current && gameState.status === 'playing') {
      // TASK 65: Pass whether there was a streak for streak break feedback
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: handleWrongTap triggers visual feedback
      handleWrongTap(gameState.streak > 0);
      showLivesWarning(gameState.lives);
      // TASK 10: Life loss haptic
      hapticCRLoseLife();
      // TASK 20: Life loss sound
      playCRLifeLoss();
      // TASK 77: Show floating X on wrong tap
      setFloatingX(true);
      setTimeout(() => setFloatingX(false), 800);
      // Extra urgent warning if last life
      if (gameState.lives === 1) {
        setTimeout(() => hapticCRLastLife(), 200);
        // TASK 21: Last life warning sound (ominous tone)
        setTimeout(() => playCRLastLifeWarning(), 250);
        // TASK 73: Persistent last life warning state
        setLastLifeWarning(true);
      }
    }
    // Reset last life warning when lives go back up (e.g., restart)
    if (gameState.lives > 1) {
      setLastLifeWarning(false);
    }
    if (gameState.status === 'gameover' && prevLivesRef.current > 0) {
      // TASK 28: Game over sound (CR-specific descending tones)
      playCRGameOver();
      // TASK 12: Game over haptic
      hapticGameOver();
      // Unified game-over effects
      triggerScreenShake(GAME_OVER_SEQUENCE.shakeDuration);
      triggerVignette(GAME_OVER_SEQUENCE.vignetteColor);
    }
    prevLivesRef.current = gameState.lives;
  }, [gameState.lives, gameState.status, gameState.streak, handleWrongTap, playCRGameOver, playCRLifeLoss, playCRLastLifeWarning, showLivesWarning, hapticCRLoseLife, hapticCRLastLife, hapticGameOver, triggerScreenShake, triggerVignette]);

  // Handle tap - uses refs for immediate state access (avoids stale closures on mobile)
  const handleTap = useCallback(() => {
    const now = performance.now();
    
    // Debounce
    if (now - lastTapTimeRef.current < TAP_DEBOUNCE_MS) {
      return;
    }
    lastTapTimeRef.current = now;

    // Don't process taps when game is paused (quit dialog shown)
    if (isContextPausedRef.current) {
      return;
    }

    // TASK 3: Immediate ultra-light haptic on every tap (before determining result)
    hapticCRTap();

    // TASK 49: Squash effect on every tap
    setTapSquash(true);
    setTimeout(() => {
      setTapSquash(false);
    }, 100);

    const currentStatus = gameStatusRef.current;
    // CRITICAL FIX: Refs are updated SYNCHRONOUSLY when FULL_MATCH is created, but gameState updates ASYNCHRONOUSLY
    // For match detection, refs are the source of truth because they're set immediately before the match window
    // Check refs FIRST (they're always up-to-date), then fall back to state
    const tfRef = targetFruitRef.current;
    const tcRef = targetColorRef.current;
    const yfRef = yourFruitRef.current;
    const ycRef = yourColorRef.current;
    const isVisualFullMatchRef = tfRef === yfRef && tcRef === ycRef;
    
    // Also check state (what's rendered) as fallback
    const tf = gameState.targetFruit;
    const tc = gameState.targetColor;
    const yf = gameState.yourFruit;
    const yc = gameState.yourColor;
    const isVisualFullMatch = tf === yf && tc === yc;
    
    // CRITICAL: Prefer refs (synchronous, always current) over state (async, might be stale)
    // For FULL_MATCH, refs are set synchronously before match window, so they're authoritative
    const visualMatch = isVisualFullMatchRef || isVisualFullMatch;
    const matchActive = matchActiveRef.current;
    const matchStartTs = matchStartTsRef.current;
    const matchWindowMs = matchWindowMsRef.current;
    const withinWindow =
      matchStartTs !== null && matchWindowMs > 0 && now - matchStartTs <= matchWindowMs;

    if (currentStatus === 'idle') {
      gameStartTimeRef.current = now;
      const tF = randomFruit();
      const tC = randomColor();
      const yF = randomFruit();
      const yC = randomColor();
      targetFruitRef.current = tF;
      targetColorRef.current = tC;
      yourFruitRef.current = yF;
      yourColorRef.current = yC;
      gameStatusRef.current = 'playing';

      playCRGameStart();

      setGameState({
        ...initialGameState,
        status: 'playing',
        targetFruit: tF,
        targetColor: tC,
        yourFruit: yF,
        yourColor: yC,
        lastColorChangeTime: now,
      });

      // Arcade lights: Game start
      triggerEvent('play:active');

      maxStreakRef.current = 0;
      isFirstCycleRef.current = true; // Reset first cycle flag when starting game
      prevMatchTypeRef.current = 'NO_MATCH'; // Reset to allow FULL_MATCH (not consecutive)
      // Start music on user gesture (required for mobile browsers)
      // Skip if GameModal manages the music (check both ref AND context for timing safety)
      if (!musicAudioRef.current && !musicManagedExternallyRef.current && !musicManagedExternally) {
        playNextMusicTrack();
      }
      scheduleNextCycle(0, 'handleTap-idle');
      return;
    }

    if (currentStatus !== 'playing') return;

    // Grace period after game starts
    if (now - gameStartTimeRef.current < GRACE_PERIOD_MS) {
      return;
    }

    const actualElapsed = matchStartTs !== null ? now - matchStartTs : 500;
    const isSuccess = matchActive && withinWindow && visualMatch;

    if (isSuccess) {
      // CRITICAL: Set all guards FIRST before clearing timeout to prevent race condition
      // If timeout fires between setting matchHandled and clearing, it will see matchHandled=true
      matchHandledRef.current = true;
      matchActiveRef.current = false;
      isMatchWindowRef.current = false;
      
      // CRITICAL: Increment match ID to invalidate any pending timeout
      // This ensures the miss handler sees a stale matchId and returns early
      currentRoundIdRef.current += 1;
      
      // Now clear timers (they're safe to clear now that guards are set)
      if (matchWindowTimeoutRef.current) {
        clearTimeout(matchWindowTimeoutRef.current);
        matchWindowTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setMatchProgress(0);

      const reactionMs = actualElapsed;
      const basePoints = calculateBasePoints(reactionMs);
      const nextStreak = gameState.streak + 1;
      const streakBonus = getStreakBonus(nextStreak);
      // NEW: Apply 1.5x multiplier during Fever Mode (15+ streak)
      const rawPoints = basePoints + streakBonus;
      const actualPoints = feverMode ? Math.floor(rawPoints * 1.5) : rawPoints;
      const rating =
        reactionMs < 300 ? 'PERFECT' : reactionMs < 500 ? 'GREAT' : reactionMs < 700 ? 'GOOD' : reactionMs < 1000 ? 'OK' : 'SLOW';

      setGameState((prev) => {
        const newScore = prev.score + actualPoints;
        const newBestTime = Math.min(prev.bestReactionTime, reactionMs);
        if (newScore > highScore && prev.score <= highScore) {
          setHighScoreBeat(true);
          setTimeout(() => setHighScoreBeat(false), 1500);
        }
        if (reactionMs < prev.bestReactionTime && prev.bestReactionTime !== Infinity) {
          setBestTimeBeat(true);
          setTimeout(() => setBestTimeBeat(false), 1500);
        }
        return {
          ...prev,
          score: newScore,
          streak: nextStreak,
          bestReactionTime: newBestTime,
          isMatchWindow: false,
          lastColorChangeTime: now,
        };
      });

      gameStatsRef.current.successes++;
      wrongTapWarningsRef.current = 0; // Reset wrong tap warnings on successful tap
      lastSuccessTapTimeRef.current = now; // Track success time to prevent "TOO LATE" on quick re-tap
      handleCorrectTap(actualPoints, rating, reactionMs, nextStreak);
      
      // CRITICAL FIX: Add a small delay after success to give user time to see their success
      // Also ensures previous match is fully cleaned up before starting next cycle
      setTimeout(() => {
        // Double-check match is fully cleared before scheduling next cycle
        if (!matchActiveRef.current && !isMatchWindowRef.current) {
          scheduleNextCycle(gameState.score + actualPoints, 'handleTap-success');
        }
      }, 300); // 300ms delay - enough to see success feedback, not too long to feel sluggish
    } else if (!visualMatch) {
      // WRONG TAP: Colors/fruits DON'T match - handle this FIRST before "too late"
      if (matchActive && matchHandledRef.current) {
        return;
      }
      if (now - lastWrongTapTimeRef.current < WRONG_TAP_COOLDOWN_MS) {
        return;
      }
      lastWrongTapTimeRef.current = now;
      
      // FORGIVENESS: Only during tutorial (first 20 seconds)
      // After tutorial: every wrong tap costs a life immediately
      const isPartialMatch = (tf === yf && tc !== yc) || (tf !== yf && tc === yc);
      const gameTimeSeconds = (now - gameStartTimeRef.current) / 1000;
      const inTutorial = gameTimeSeconds < 20;
      
      if (inTutorial) {
        wrongTapWarningsRef.current++;
        
        if (wrongTapWarningsRef.current === 1) {
          // First wrong tap during tutorial - WARNING ONLY
          triggerScreenShake(50);
          triggerPlayerFlash('wrong');
          const warningMsg = isPartialMatch ? 'CLOSE! BE CAREFUL' : 'WRONG! BE CAREFUL';
          showFloatingScore(warningMsg, 'warning');
          // Just reset streak, don't lose life
          setGameState((prev) => ({
            ...prev,
            streak: 0,
          }));
          return;
        } else {
          // Second+ wrong tap during tutorial - loses life
          wrongTapWarningsRef.current = 0;
          // Don't return - fall through to life loss below
        }
      }
      // After tutorial: No forgiveness - immediate life loss
      
      // Wrong tap after warning - loses life
      const now2 = performance.now();
      if (now2 - lastLifeLostTimeRef.current < LIFE_LOSS_COOLDOWN_MS) {
        return;
      }
      lastLifeLostTimeRef.current = now2;

      if (mismatchHighlightTimeoutRef.current) {
        clearTimeout(mismatchHighlightTimeoutRef.current);
      }
      setMismatchFruit(yf !== tf);
      setMismatchColor(yc !== tc);
      mismatchHighlightTimeoutRef.current = setTimeout(() => {
        setMismatchFruit(false);
        setMismatchColor(false);
        mismatchHighlightTimeoutRef.current = null;
      }, 500);

      // Handle game over or continue with reduced lives
      if (gameState.lives <= 1) {
        // Use shared game over handler (handles screenshot + score submission)
        handleGameOver(gameState.score, gameState.bestReactionTime);
      } else {
        setGameState((prev) => ({ ...prev, lives: prev.lives - 1, streak: 0 }));
      }
    } else if (visualMatch && !matchActive) {
      // TOO LATE: Colors match but the match window has expired
      // CRITICAL: Skip if user just had a successful tap (prevents double feedback)
      if (now - lastSuccessTapTimeRef.current < SUCCESS_TAP_GRACE_MS) {
        return;
      }
      
      // Debounce rapid taps
      if (now - lastWrongTapTimeRef.current < WRONG_TAP_COOLDOWN_MS) {
        return;
      }
      lastWrongTapTimeRef.current = now;
      
      // Clear the match window
      matchActiveRef.current = false;
      isMatchWindowRef.current = false;
      setMatchProgress(0);
      if (matchWindowTimeoutRef.current) {
        clearTimeout(matchWindowTimeoutRef.current);
        matchWindowTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      
      // TOO LATE: Only give warnings during tutorial (first 20 seconds)
      const gameTimeSecondsLate = (now - gameStartTimeRef.current) / 1000;
      const inTutorialLate = gameTimeSecondsLate < 20;
      
      if (inTutorialLate) {
        wrongTapWarningsRef.current++;
        
        if (wrongTapWarningsRef.current === 1) {
          // First "too late" tap during tutorial - WARNING ONLY
          setTooLateFeedback(true);
          setTimeout(() => setTooLateFeedback(false), 600);
          triggerScreenShake(50);
          triggerPlayerFlash('wrong');
          showFloatingScore('TOO LATE! BE CAREFUL', 'warning');
          setGameState((prev) => ({
            ...prev,
            isMatchWindow: false,
            streak: 0,
          }));
          scheduleNextCycle(gameState.score, 'handleTap-too-late-warning');
          return;
        }
        
        // Second+ "too late" during tutorial - loses life
        wrongTapWarningsRef.current = 0;
      }
      // After tutorial: No forgiveness - immediate life loss
      
      const now2 = performance.now();
      if (now2 - lastLifeLostTimeRef.current < LIFE_LOSS_COOLDOWN_MS) {
        scheduleNextCycle(gameState.score, 'handleTap-too-late-cooldown');
        return;
      }
      lastLifeLostTimeRef.current = now2;
      
      setTooLateFeedback(true);
      setTimeout(() => setTooLateFeedback(false), 600);
      triggerScreenShake(80);
      triggerPlayerFlash('wrong');
      showFloatingScore('TOO LATE!', 'wrong');
      
      // Handle game over or continue with reduced lives
      if (gameState.lives <= 1) {
        handleGameOver(gameState.score, gameState.bestReactionTime);
      } else {
        setGameState((prev) => ({ ...prev, lives: prev.lives - 1, streak: 0, isMatchWindow: false }));
        scheduleNextCycle(gameState.score, 'handleTap-too-late-life-loss');
      }
    }
  }, [scheduleNextCycle, handleCorrectTap, handleGameOver, gameState.streak, gameState.lives, gameState.score, gameState.bestReactionTime, gameState.targetFruit, gameState.targetColor, gameState.yourFruit, gameState.yourColor, hapticCRTap, musicManagedExternally, playNextMusicTrack, triggerEvent, playCRGameStart, highScore, feverMode, triggerScreenShake, triggerPlayerFlash, showFloatingScore]);

  // Handle game restart - TASK 82: Retry animation (smooth transition)
  const handleRestart = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const now = performance.now();
    gameStartTimeRef.current = now;
    lastTapTimeRef.current = now;

    cleanupAllTimers();
    setMatchProgress(0);
    setLivesWarning(null);
    resetAllEffects();

    // Reset game over screen states to prevent stale data on replay
    setGameScreenshot(null);
    setIsNewPersonalBest(false);
    setMeetsMinimumActions(false);

    // Reset timing refs to prevent edge case bugs on quick restart
    lastWrongTapTimeRef.current = 0;
    lastSuccessTapTimeRef.current = 0;
    lastLifeLostTimeRef.current = 0;
    // bestMomentsRef.current = [];
    matchStartTsRef.current = null;
    matchWindowMsRef.current = 1000;

    // Reset game stats
    gameStatsRef.current = { successes: 0 };
    wrongTapWarningsRef.current = 0; // Reset wrong tap warnings on restart

    // Reset Phase 6, 7, 10 & 13 states
    setLastLifeWarning(false);
    setFloatingX(false);
    setFloatingClock(false);
    setStreakFire(false);
    setFeverMode(false);
    setFeverIntensity(0);
    setFeverActivating(false);
    setTooLateFeedback(false);
    setMismatchFruit(false);
    setMismatchColor(false);
    setReactionTimePopup(null);
    setPressureLevel(0);

    setGameState({
      ...initialGameState,
      status: 'playing',
      targetFruit: randomFruit(),
      targetColor: randomColor(),
      yourFruit: randomFruit(),
      yourColor: randomColor(),
      lastColorChangeTime: now,
    });

    // Arcade lights: Restart game
    triggerEvent('play:active');

    maxStreakRef.current = 0;
    cycleCountRef.current = 0;
    prevYourFruitRef.current = -1;
    prevYourColorRef.current = -1;
    isFirstCycleRef.current = true; // Reset first cycle flag on restart
    prevMatchTypeRef.current = 'NO_MATCH'; // Reset to allow FULL_MATCH (not consecutive)
    setShowInstruction(true); // Reset tutorial hints on restart
    showInstructionRef.current = true;
    if (!musicAudioRef.current && !musicManagedExternallyRef.current && !musicManagedExternally) {
      playNextMusicTrack();
    }
    lastFullMatchTimeRef.current = 0;
    scheduleNextCycle(0, 'handleRestart');
  }, [cleanupAllTimers, scheduleNextCycle, resetAllEffects, playNextMusicTrack, musicManagedExternally, triggerEvent]);

  // Share handler for game over scorecard
  const handleShare = useCallback(async () => {
    try {
      const blob = await generateGameScorecard({
        gameName: 'Color Reaction',
        gameNameParts: ['COLOR', 'REACTION'],
        score: gameState.score,
        scoreLabel: 'points',
        bestScore: highScore,
        isNewRecord: isNewPersonalBest,
        screenshot: gameScreenshot,
        accentColor: '#ff6b00', // Orange accent
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `color-reaction-${gameState.score}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'color-reaction-score.png', { type: 'image/png' });
        const shareData = {
          title: 'Color Reaction Score',
          text: `🎨 I scored ${gameState.score} points in Color Reaction! Can you beat me?`,
          files: [file],
        };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
        }
      }
    } catch (err) {
      console.error('Failed to generate share image:', err);
      const shareText = `🎨 Color Reaction: ${gameState.score} points!\n\nCan you beat my score?\n\nhttps://wojak.ink/games`;
      if (navigator.share) {
        await navigator.share({ title: 'Color Reaction', text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
      }
    }
  }, [gameState.score, highScore, isNewPersonalBest, gameScreenshot]);

  // Render lives as hearts
  const renderLives = () => (
    <div className="lives-display">
      {[...Array(3)].map((_, i) => (
        <span
          key={i}
          className={`heart ${i < gameState.lives ? 'active' : 'lost'} ${
            i === gameState.lives && playerFlash === 'wrong' ? 'breaking' : ''
          }`}
        >
          {i < gameState.lives ? '❤️' : '💔'}
        </span>
      ))}
    </div>
  );

  // #region agent log - removed render log to reduce noise
  // #endregion

  return (
    <>
      <GameSEO
        gameName="Color Reaction"
        gameSlug="color-reaction"
        description="Test your reflexes! Tap when the colors match in this fast-paced reaction game. Build combos and chase high scores."
        genre="Arcade"
        difficulty="Easy"
      />
      <div
        ref={gameAreaRef}
        className={`color-reaction-container ${isMobile ? 'mobile' : 'desktop'} ${screenShake && !prefersReducedMotion ? 'shaking' : ''} ${gameState.isMatchWindow ? `container-urgency-${urgencyLevel}` : ''} ${perfectFlash && !prefersReducedMotion ? 'perfect-flash' : ''} ${backgroundPulse && !prefersReducedMotion ? 'background-pulse' : ''} ${streakFire && !prefersReducedMotion ? 'streak-fire' : ''} ${lastLifeWarning ? 'last-life-danger' : ''} ${prefersReducedMotion ? 'reduced-motion' : ''} ${feverMode ? `fever-mode fever-intensity-${feverIntensity}` : ''} ${feverActivating ? 'fever-activating' : ''} ${hitStop ? 'hit-stop' : ''} ${pressureLevel > 0 ? `pressure-level-${pressureLevel}` : ''}`}
        onPointerDown={gameState.status !== 'gameover' ? handleTap : undefined}
      >
          {/* Universal Game Effects Layer */}
          <GameEffects effects={effects} accentColor={COLORS[gameState.yourColor]?.hex ?? '#FF6B00'} />


          {/* Stats Panel */}
          <div className="stats-panel">
            <div className="stat">
              <span className="stat-label">Score</span>
              <span className={`stat-value ${scorePop ? 'score-pop' : ''}`}>{gameState.score}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Streak</span>
              <span className="stat-value">{gameState.streak}</span>
              {/* TASK 66: Score multiplier display */}
              {gameState.streak >= 5 && (
                <span className={`multiplier-badge ${gameState.streak >= 20 ? 'x4' : gameState.streak >= 10 ? 'x3' : 'x2'}`}>
                  x{gameState.streak >= 20 ? 4 : gameState.streak >= 10 ? 3 : 2}
                </span>
              )}
            </div>
            <div className="stat">
              <span className="stat-label">Lives</span>
              {renderLives()}
            </div>
          </div>

          {/* TASK 104: Fever Mode score display */}
          {feverMode && (
            <div className={`fever-multiplier fever-intensity-${feverIntensity}`}>
              <span className="fever-icon">🔥</span>
              <span className="fever-text">FEVER x{feverIntensity >= 3 ? 4 : feverIntensity >= 2 ? 3 : 2}</span>
              <span className="fever-icon">🔥</span>
            </div>
          )}

          {/* Game Area */}
          <div className="game-area">
            {/* TASK 48: Connection line between circles on PERFECT */}
            {showConnectionLine && (
              <div className="connection-line" />
            )}

            {/* Target: fruit + color */}
            <div className="color-section">
              <span className="color-label">TARGET</span>
              <div
                className={`color-display target-display ${perfectPulse ? 'perfect-pulse' : ''}`}
                style={{
                  backgroundColor: COLORS[gameState.targetColor].hex,
                  width: displaySize,
                  height: displaySize,
                }}
              >
                <span className="color-emoji">{FRUITS[gameState.targetFruit].emoji}</span>
              </div>
            </div>

            {/* Player Color Display with countdown ring */}
            <div className="color-section">
              <span className="color-label">YOUR</span>
              {/* TASK 34: Add shake class in critical state */}
              <div className={`player-circle-wrapper ${urgencyLevel === 'critical' ? 'critical-shake' : ''}`} style={{ width: displaySize + 20, height: displaySize + 20 }}>
                {/* Countdown ring - ALWAYS rendered but hidden to prevent layout shifts */}
                <svg 
                  className={`countdown-ring urgency-${urgencyLevel}`} 
                  viewBox="0 0 100 100"
                  style={{ opacity: gameState.isMatchWindow ? 1 : 0, pointerEvents: 'none' }}
                >
                  <circle
                    className="countdown-ring-bg"
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="var(--color-white-20)"
                    strokeWidth="4"
                  />
                  <circle
                    className="countdown-ring-progress"
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${matchProgress * 2.89} 289`}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div
                  className={`color-display player-display ${gameState.isMatchWindow ? 'matching match-glow' : ''} ${playerFlash ? `flash-${playerFlash}` : ''} ${perfectPulse ? 'perfect-pulse' : ''} ${tapSquash ? 'tap-squash' : ''} ${impactFlash ? 'impact-flash' : ''} ${tooLateFeedback ? 'too-late-flash' : ''} ${mismatchColor ? 'mismatch-color' : ''}`}
                  style={{
                    backgroundColor: COLORS[gameState.yourColor].hex,
                    width: displaySize,
                    height: displaySize,
                  }}
                >
                  <span className={`color-emoji ${mismatchFruit ? 'mismatch-fruit' : ''}`}>{FRUITS[gameState.yourFruit].emoji}</span>
                </div>
                {/* REMOVED: Countdown milliseconds display was confusing users */}
              {/* They thought it was reaction time. The countdown ring is enough visual feedback. */}
              </div>
              
              {/* Reaction Time Popup - shows ms after successful tap */}
              {reactionTimePopup !== null && (
                <div className="reaction-time-popup">
                  <span className="reaction-time-value">{reactionTimePopup}</span>
                  <span className="reaction-time-unit">ms</span>
                </div>
              )}
            </div>

            {/* Floating Scores - INSIDE game-area so 50%,50% centers between circles */}
            {floatingScores.map((score) => (
              <div
                key={score.id}
                className={`floating-score ${score.type}`}
                style={{ left: `${score.x}%`, top: `${score.y}%` }}
              >
                {score.text}
              </div>
            ))}
          </div>

          {/* Tap Instruction - TASK 32: Text urgency with pulsing and color */}
          {/* Tap Instruction - hidden after 15 seconds of gameplay */}
          {(gameState.status === 'idle' || showInstruction) && (
            <div className={`tap-instruction ${gameState.isMatchWindow ? `urgency-${urgencyLevel}` : ''}`}>
              {gameState.status === 'idle' && <span>TAP TO START</span>}
              {gameState.status === 'playing' && !gameState.isMatchWindow && <span>WAIT FOR MATCH...</span>}
              {gameState.status === 'playing' && gameState.isMatchWindow && (
                <span className={`tap-now urgency-${urgencyLevel}`}>TAP NOW!</span>
              )}
            </div>
          )}

          {/* Lives Warning */}
          {livesWarning && <div className="lives-warning">{livesWarning}</div>}

          {/* Epic Callout */}
          {epicCallout && <div className="epic-callout">{epicCallout}</div>}

          {/* TASK 47: Reaction time display on PERFECT */}
          {showReactionTime !== null && (
            <div className="perfect-reaction-time">
              <span className="reaction-ms">{Math.round(showReactionTime)}ms</span>
              <span className="reaction-label">PERFECT!</span>
            </div>
          )}

          {/* TASK 67: High score notification */}
          {highScoreBeat && (
            <div className="high-score-notification">NEW HIGH SCORE!</div>
          )}

          {/* TASK 69: Best reaction time notification */}
          {bestTimeBeat && (
            <div className="best-time-notification">NEW BEST TIME!</div>
          )}

          {/* TASK 71: Current rating display */}
          {currentRating && (
            <div className={`rating-display rating-${currentRating.toLowerCase()}`}>{currentRating}</div>
          )}

          {/* TASK 77: Floating X on wrong tap */}
          {floatingX && (
            <div className="floating-icon floating-x">✕</div>
          )}

          {/* TASK 78: Floating clock on miss */}
          {floatingClock && (
            <div className="floating-icon floating-clock">⏰</div>
          )}

          {/* Game Over - Uses shared component */}
          {gameState.status === 'gameover' && (
            <ArcadeGameOverScreen
              score={gameState.score}
              highScore={highScore}
              scoreLabel="points"
              isNewPersonalBest={isNewPersonalBest}
              isSignedIn={isSignedIn}
              isSubmitting={isSubmitting}
              userDisplayName={userDisplayName ?? undefined}
              leaderboard={globalLeaderboard}
              onPlayAgain={handleRestart}
              onShare={handleShare}
              accentColor="#ff6b00"
              meetsMinimumActions={meetsMinimumActions}
              minimumActionsMessage="Get at least 3 correct taps to be on the leaderboard"
            />
          )}
      </div>
    </>
  );
};

export default ColorReaction;
