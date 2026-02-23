import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useGameHaptics } from '@/systems/haptics';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import { useGameEffects, GameEffects } from '@/components/media';
import { useGameMute } from '@/contexts/GameMuteContext';
import { useMobileGameFullscreen } from '@/hooks/useMobileGameFullscreen';
import { useArcadeLights } from '@/contexts/ArcadeLightsContext';
import { useGameNavigationGuard } from '@/hooks/useGameNavigationGuard';
import { useGameTouch } from '@/hooks/useGameTouch';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { GameSEO } from '@/components/seo/GameSEO';
import { ArcadeGameOverScreen } from '@/components/media/games/ArcadeGameOverScreen';
import { captureGameArea } from '@/systems/sharing/captureDOM';
import { generateGameScorecard } from '@/systems/sharing/GameScorecard';
import { useIsMobile } from '@/hooks/useMediaQuery';
import './WojakRunner.css';

interface Obstacle {
  id: number;
  lane: number;
  y: number;
  type: 'camel' | 'bear';
}

interface Collectible {
  id: number;
  lane: number;
  y: number;
}

const LANE_WIDTH = 80;
const PLAYER_SIZE = 50;
const OBSTACLE_SIZE = 45;
const COLLECTIBLE_SIZE = 35;

// Background music playlist
const MUSIC_PLAYLIST = [
  { src: '/audio/music/wojak-runner/sonic-green-hill-final.mp3', name: 'Green Hill Zone' },
  { src: '/audio/music/wojak-runner/sonic-chemical-plant-final.mp3', name: 'Chemical Plant' },
  { src: '/audio/music/wojak-runner/street-fighter-mbison-final.mp3', name: 'M. Bison Stage' },
  { src: '/audio/music/wojak-runner/street-fighter-vega-final.mp3', name: 'Vega Stage' },
];

const WojakRunner: React.FC = () => {
  const { playCollect, playGameOver, playWojakChime } = useGameSounds();
  const { hapticScore, hapticGameOver } = useGameHaptics();

  // Visual effects system
  const {
    effects,
    triggerShockwave,
    triggerSparks,
    triggerVignette,
    triggerScreenShake,
    addFloatingEmoji,
    showEpicCallout,
    triggerConfetti,
    updateCombo,
    resetCombo,
    addScorePopup,
    resetAllEffects,
  } = useGameEffects();

  // Global leaderboard hook
  const {
    leaderboard: globalLeaderboard,
    submitScore,
    isSignedIn,
    userDisplayName,
    isSubmitting,
  } = useLeaderboard('wojak-runner');


  // Arcade frame shared mute state
  const { isMuted: arcadeMuted, musicManagedExternally, gameStarted, isPaused: isContextPaused } = useGameMute();

  // Arcade lights control
  const { triggerEvent, setGameId } = useArcadeLights();

  // Register this game for per-game light overrides
  useEffect(() => {
    setGameId('wojak-runner');
  }, [setGameId]);

  // Mobile detection for layout adjustments
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Bottom offset for player position - higher on mobile to clear icon bar
  const PLAYER_BOTTOM_OFFSET = isMobile ? 90 : 60;

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');

  // Navigation guard - prevents accidental exits during gameplay
  const { showExitDialog, confirmExit, cancelExit } = useGameNavigationGuard({
    isPlaying: gameState === 'playing',
    onConfirmExit: () => navigate('/games'),
  });

  // Mobile fullscreen mode - hide navigation and lock scroll for all active game states
  const isActiveGameState = gameState !== 'idle';
  useMobileGameFullscreen(isActiveGameState, isMobile);

  const [playerLane, setPlayerLane] = useState(1);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(6); // Start moderate, gets harder over time
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('wojakRunnerHighScore') || '0', 10);
  });
  const [gameScreenshot, setGameScreenshot] = useState<string | null>(null);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('wojakRunnerSoundEnabled') !== 'false';
  });

  // Simple score popup state (backup if GameEffects doesn't work)
  const [lastScorePopup, setLastScorePopup] = useState<{points: number, id: number} | null>(null);
  const scorePopupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const obstacleIdRef = useRef(0);
  const collectibleIdRef = useRef(0);
  const lastSpawnRef = useRef(0);

  // Fixed timestep for consistent speed across ALL devices (60Hz, 120Hz, etc.)
  // This ensures fair competition on leaderboards
  const lastFrameTimeRef = useRef(0);
  const accumulatorRef = useRef(0); // Accumulates time for fixed timestep
  const FIXED_TIMESTEP = 16.67; // Physics update every ~16.67ms (60 updates/sec)

  // Ref for game loop to check dialog state
  const showExitDialogRef = useRef(false);
  
  // Ref for game loop to check context pause state (quit dialog from GameModal)
  const isContextPausedRef = useRef(false);

  // Collect streak tracking
  const [collectStreak, setCollectStreak] = useState(0);
  const collectStreakRef = useRef(0);
  const lastDistanceMilestoneRef = useRef(0);

  // Track collected IDs to prevent double sound plays
  const collectedIdsRef = useRef<Set<number>>(new Set());

  // Refs for game loop to avoid stale closures (FlappyOrange pattern)
  const obstaclesRef = useRef<Obstacle[]>([]);
  const distanceRef = useRef(0);

  // Sound refs for use in game loop
  const playCollectRef = useRef(playCollect);
  const playGameOverRef = useRef(playGameOver);
  const playWojakChimeRef = useRef(playWojakChime);
  const triggerEventRef = useRef(triggerEvent);

  // Haptic refs for use in game loop
  const hapticScoreRef = useRef(hapticScore);
  const hapticGameOverRef = useRef(hapticGameOver);

  // Effect refs for use in game loop
  const triggerShockwaveRef = useRef(triggerShockwave);
  const triggerSparksRef = useRef(triggerSparks);
  const triggerVignetteRef = useRef(triggerVignette);
  const triggerScreenShakeRef = useRef(triggerScreenShake);
  const addFloatingEmojiRef = useRef(addFloatingEmoji);
  const showEpicCalloutRef = useRef(showEpicCallout);
  const triggerConfettiRef = useRef(triggerConfetti);
  const updateComboRef = useRef(updateCombo);
  const resetComboRef = useRef(resetCombo);
  const addScorePopupRef = useRef(addScorePopup);

  // Refs for synchronous score submission (avoids stale closure in game loop)
  const isSignedInRef = useRef(isSignedIn);
  const scoreSubmittedRef = useRef(scoreSubmitted);
  const submitScoreRef = useRef(submitScore);
  useEffect(() => { isSignedInRef.current = isSignedIn; }, [isSignedIn]);
  useEffect(() => { scoreSubmittedRef.current = scoreSubmitted; }, [scoreSubmitted]);
  useEffect(() => { submitScoreRef.current = submitScore; }, [submitScore]);

  // Player bottom offset ref for game loop (higher on mobile to clear icon bar)
  const playerBottomOffsetRef = useRef(PLAYER_BOTTOM_OFFSET);
  useEffect(() => {
    playerBottomOffsetRef.current = PLAYER_BOTTOM_OFFSET;
  }, [PLAYER_BOTTOM_OFFSET]);

  // Keep refs updated
  useEffect(() => {
    playCollectRef.current = playCollect;
    playGameOverRef.current = playGameOver;
    playWojakChimeRef.current = playWojakChime;
    triggerEventRef.current = triggerEvent;
    hapticScoreRef.current = hapticScore;
    hapticGameOverRef.current = hapticGameOver;
  }, [playCollect, playGameOver, playWojakChime, triggerEvent, hapticScore, hapticGameOver]);

  // Keep effect refs updated
  useEffect(() => {
    triggerShockwaveRef.current = triggerShockwave;
    triggerSparksRef.current = triggerSparks;
    triggerVignetteRef.current = triggerVignette;
    triggerScreenShakeRef.current = triggerScreenShake;
    addFloatingEmojiRef.current = addFloatingEmoji;
    showEpicCalloutRef.current = showEpicCallout;
    triggerConfettiRef.current = triggerConfetti;
    updateComboRef.current = updateCombo;
    resetComboRef.current = resetCombo;
    addScorePopupRef.current = addScorePopup;
  }, [triggerShockwave, triggerSparks, triggerVignette, triggerScreenShake, addFloatingEmoji, showEpicCallout, triggerConfetti, updateCombo, resetCombo, addScorePopup]);

  // Keep exit dialog ref in sync for game loop
  useEffect(() => {
    showExitDialogRef.current = showExitDialog;
  }, [showExitDialog]);

  // Keep context pause ref in sync for game loop
  useEffect(() => {
    isContextPausedRef.current = isContextPaused;
  }, [isContextPaused]);

  // Keep game state refs in sync for game loop reads (avoids stale closures)
  useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);
  useEffect(() => { distanceRef.current = distance; }, [distance]);

  // Background music refs
  const playlistIndexRef = useRef(Math.floor(Math.random() * MUSIC_PLAYLIST.length));
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const gameStateRefForMusic = useRef(gameState);

  // Keep game state ref in sync for music callbacks
  useEffect(() => { gameStateRefForMusic.current = gameState; }, [gameState]);

  // Sound enabled ref for music callbacks (must be before playTrack)
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  // Ref for musicManagedExternally (must be before playTrack)
  const musicManagedExternallyRef = useRef(musicManagedExternally);
  useEffect(() => { musicManagedExternallyRef.current = musicManagedExternally; }, [musicManagedExternally]);

  // Play specific track
  const playTrack = useCallback((index: number) => {
    // Never play game's own music if GameModal manages it
    if (musicManagedExternallyRef.current) return;

    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
    }
    playlistIndexRef.current = index;
    const track = MUSIC_PLAYLIST[index];
    const music = new Audio(track.src);
    music.volume = 1.0;
    music.addEventListener('ended', () => {
      playlistIndexRef.current = (playlistIndexRef.current + 1) % MUSIC_PLAYLIST.length;
      if (gameStateRefForMusic.current === 'playing' && soundEnabledRef.current && !musicManagedExternallyRef.current) {
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
        if (wasPlayingBeforeHiddenRef.current && gameStateRefForMusic.current === 'playing' && soundEnabledRef.current && !musicManagedExternallyRef.current) {
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

  // CRITICAL: Stop game's own music if GameModal takes over music management
  // This handles race conditions where music might start before context propagates
  useEffect(() => {
    if (musicManagedExternally && musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current = null;
    }
  }, [musicManagedExternally]);

  // Control music based on game state and sound enabled
  // Skip if GameModal manages the music (check both ref AND context for extra safety)
  useEffect(() => {
    // Double-check both ref and context to handle race conditions
    if (musicManagedExternally || musicManagedExternallyRef.current) return;

    if (gameState === 'playing' && soundEnabled) {
      if (musicAudioRef.current) {
        musicAudioRef.current.play().catch(() => {});
      }
    } else {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
      }
    }
  }, [gameState, soundEnabled, musicManagedExternally]);

  // Sync with arcade frame mute button (from GameMuteContext)
  // Only control game's own music if NOT managed externally
  useEffect(() => {
    // Skip if music is managed externally (check both ref and context)
    if (musicManagedExternally || musicManagedExternallyRef.current) return;

    setSoundEnabled(!arcadeMuted);
    if (arcadeMuted) {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
      }
    } else if (gameState === 'playing') {
      if (musicAudioRef.current) {
        musicAudioRef.current.play().catch(() => {});
      }
    }
  }, [arcadeMuted, musicManagedExternally, gameState]);

  // Running footstep sound removed - background music is sufficient
  // and the footsteps were distracting

  // Start game when arcade PLAY button is clicked
  useEffect(() => {
    if (gameStarted && gameState === 'idle') {
      startGame();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time arcade PLAY transition should not depend on unstable startGame
  }, [gameStarted, gameState]);

  const startGame = () => {
    setPlayerLane(1);
    setObstacles([]);
    setCollectibles([]);
    setScore(0);
    setDistance(0);
    setSpeed(6); // Start moderate, gets harder over time
    obstacleIdRef.current = 0;
    collectibleIdRef.current = 0;
    lastSpawnRef.current = 0;
    lastDistanceMilestoneRef.current = 0;
    setScoreSubmitted(false);
    scoreSubmittedRef.current = false; // Reset ref for new game
    setIsNewPersonalBest(false);
    setGameScreenshot(null); // Reset to prevent stale screenshot on replay
    // Reset streak and effects
    setCollectStreak(0);
    collectStreakRef.current = 0;
    collectedIdsRef.current.clear(); // Clear collected IDs to prevent stale checks
    accumulatorRef.current = 0; // Reset fixed timestep accumulator
    resetAllEffects();
    // Start music on user gesture (required for mobile browsers)
    // Skip if GameModal manages the music (check both ref AND context for timing safety)
    if (soundEnabled && !musicAudioRef.current && !musicManagedExternallyRef.current && !musicManagedExternally) {
      playNextSong();
    }
    setGameState('playing');
    // Arcade lights: Game started
    triggerEvent('play:active');
  };

  // Auto-submit score to global leaderboard (for signed-in users)
  // NOTE: This is now a FALLBACK - primary submission happens synchronously in game loop
  const submitScoreGlobal = useCallback(async (finalScore: number, orangesCollected: number) => {
    // Check ref first to prevent race conditions with synchronous submission
    if (scoreSubmittedRef.current) return;
    
    // Check minimum actions: need 3 oranges collected for leaderboard
    if (!isSignedIn || scoreSubmitted || finalScore === 0 || orangesCollected < 3) return;

    scoreSubmittedRef.current = true;
    setScoreSubmitted(true);
    const result = await submitScore(finalScore, undefined, {
      distance: distance,
      orangesCollected,
    });

    if (result.success) {
      if (result.isNewHighScore) {
        setIsNewPersonalBest(true);
      }
    } else {
      console.error('[WojakRunner] Failed to submit score:', result.error);
    }
  }, [isSignedIn, scoreSubmitted, submitScore, distance]);

  // Swipe controls using shared hook
  const touchHandlers = useGameTouch({
    onSwipe: (direction) => {
      if (gameState !== 'playing') return;
      if (direction === 'left') {
        setPlayerLane(prev => Math.max(0, prev - 1));
      } else if (direction === 'right') {
        setPlayerLane(prev => Math.min(2, prev + 1));
      }
    },
  });

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      if (e.key === 'ArrowLeft' && playerLane > 0) {
        setPlayerLane(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && playerLane < 2) {
        setPlayerLane(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, playerLane]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    // Initialize frame time on start
    lastFrameTimeRef.current = performance.now();

    const gameLoop = (currentTime: number) => {
      // Pause game loop when exit dialog is shown or quit dialog shown
      if (showExitDialogRef.current || isContextPausedRef.current) {
        lastFrameTimeRef.current = currentTime;
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // Calculate delta time
      const deltaTime = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;

      // Skip frame if it took way too long (tab was in background, etc.)
      if (deltaTime > 100) {
        accumulatorRef.current = 0; // Reset accumulator
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // Accumulate time for fixed timestep
      // This ensures SAME game speed on 60Hz, 120Hz, 30Hz, etc.
      // Fair for leaderboard competition!
      accumulatorRef.current += deltaTime;

      // Only update physics when enough time has accumulated
      // On 120Hz: sometimes 0 updates, sometimes 1
      // On 60Hz: usually 1 update
      // On 30Hz: usually 2 updates
      if (accumulatorRef.current < FIXED_TIMESTEP) {
        // Not enough time accumulated, just re-render and wait
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // Consume one timestep (cap at 3 to prevent spiral of death)
      const updateCount = Math.min(Math.floor(accumulatorRef.current / FIXED_TIMESTEP), 3);
      accumulatorRef.current -= updateCount * FIXED_TIMESTEP;

      const height = gameAreaRef.current?.offsetHeight || 600;

      // Update distance and speed (runs updateCount times for consistency)
      setDistance(prev => {
        const newDist = prev + updateCount;
        if (Math.floor(newDist) % 500 === 0 && Math.floor(prev) % 500 !== 0) {
          setSpeed(s => Math.min(s + 0.4, 15)); // Gradual increase, max 15
        }

        // Distance milestone callouts (every 100m)
        const distanceInMeters = Math.floor(newDist / 10);
        const lastMilestone = lastDistanceMilestoneRef.current;
        if (distanceInMeters >= 100 && distanceInMeters % 100 === 0 && distanceInMeters > lastMilestone) {
          lastDistanceMilestoneRef.current = distanceInMeters;
          if (distanceInMeters === 100) {
            showEpicCalloutRef.current('100m!');
            // Arcade lights: First distance milestone
            triggerEventRef.current('progress:forward');
          } else if (distanceInMeters === 250) {
            showEpicCalloutRef.current('250m!');
            triggerConfettiRef.current();
            // Arcade lights: Minor milestone
            triggerEventRef.current('progress:forward');
          } else if (distanceInMeters === 500) {
            showEpicCalloutRef.current('HALFWAY LEGEND!');
            triggerConfettiRef.current();
            // Arcade lights: Major milestone
            triggerEventRef.current('progress:complete');
          } else if (distanceInMeters === 1000) {
            showEpicCalloutRef.current('1KM MASTER!');
            triggerConfettiRef.current();
            // Arcade lights: Epic milestone
            triggerEventRef.current('progress:complete');
          } else if (distanceInMeters % 500 === 0) {
            showEpicCalloutRef.current(`${distanceInMeters}m!`);
            triggerConfettiRef.current();
            // Arcade lights: Major milestone
            triggerEventRef.current('progress:complete');
          }
        }

        return newDist;
      });

      // Spawn obstacles and collectibles (fixed timestep)
      lastSpawnRef.current += updateCount;
      if (lastSpawnRef.current >= 60) {
        lastSpawnRef.current = 0;

        // Spawn obstacle
        if (Math.random() < 0.7) {
          const lane = Math.floor(Math.random() * 3);
          setObstacles(prev => [
            ...prev,
            {
              id: obstacleIdRef.current++,
              lane,
              y: -OBSTACLE_SIZE,
              type: Math.random() < 0.5 ? 'camel' : 'bear',
            },
          ]);
        }

        // Spawn collectible
        if (Math.random() < 0.4) {
          const lane = Math.floor(Math.random() * 3);
          setCollectibles(prev => [
            ...prev,
            {
              id: collectibleIdRef.current++,
              lane,
              y: -COLLECTIBLE_SIZE,
            },
          ]);
        }
      }

      // Move obstacles (fixed timestep for consistent speed across all devices)
      setObstacles(prev =>
        prev
          .map(o => ({ ...o, y: o.y + speed * updateCount }))
          .filter(o => o.y < height + OBSTACLE_SIZE)
      );

      // Move collectibles (fixed timestep for consistent speed across all devices)
      // Also detect missed oranges to reset combo (unless blocked by obstacle)
      setCollectibles(prev => {
        const moved = prev.map(c => ({ ...c, y: c.y + speed * updateCount }));
        const remaining: Collectible[] = [];

        moved.forEach(c => {
          if (c.y < height + COLLECTIBLE_SIZE) {
            remaining.push(c);
          } else {
            // Orange went off screen - check if it was blocked by an obstacle
            // An orange is "blocked" if there's an obstacle in the same lane
            // that would have prevented the player from getting it
            const wasBlocked = obstaclesRef.current.some(o =>
              o.lane === c.lane &&
              Math.abs(o.y - c.y) < OBSTACLE_SIZE + COLLECTIBLE_SIZE
            );

            if (!wasBlocked && !collectedIdsRef.current.has(c.id)) {
              // Arcade lights: Combo broken (check BEFORE resetting)
              if (collectStreakRef.current >= 3) {
                triggerEventRef.current('combo:break');
              }
              // Missed a gettable orange - reset combo
              collectStreakRef.current = 0;
              setCollectStreak(0);
              resetComboRef.current();
            }
          }
        });

        return remaining;
      });

      // Collision detection - player position matches CSS (higher on mobile for icon bar)
      const playerY = height - playerBottomOffsetRef.current - PLAYER_SIZE;

      // Check obstacle collision
      obstaclesRef.current.forEach(obstacle => {
        if (obstacle.lane === playerLane) {
          const obstacleY = obstacle.y;
          if (
            obstacleY + OBSTACLE_SIZE > playerY &&
            obstacleY < playerY + PLAYER_SIZE
          ) {
            // Crash effects
            triggerVignetteRef.current('#ff0000');
            triggerScreenShakeRef.current(600);
            triggerSparksRef.current('#ff4444');
            addFloatingEmojiRef.current('💥');
            resetComboRef.current();

            // Capture screenshot before game over
            // Pause lane line animation for screenshot capture (html2canvas can't capture CSS animations)
            if (gameAreaRef.current) {
              const laneLines = gameAreaRef.current.querySelectorAll('.lane-line') as NodeListOf<HTMLElement>;
              laneLines.forEach(el => el.style.animationPlayState = 'paused');
              
              captureGameArea(gameAreaRef.current).then(screenshot => {
                // Restore animation (already game over, but clean up)
                laneLines.forEach(el => el.style.animationPlayState = 'running');
                if (screenshot) setGameScreenshot(screenshot);
              });
            }
            // Stop background music immediately on death
            if (musicAudioRef.current) {
              musicAudioRef.current.pause();
              musicAudioRef.current = null;
            }
            playGameOverRef.current();
            hapticGameOverRef.current();
            // Arcade lights: Game over (collision)
            const finalScore = score + Math.floor(distance / 10);
            if (finalScore > highScore) {
              triggerEventRef.current('game:highScore');
              playWojakChimeRef.current(); // Signature chime on new high score
            } else {
              triggerEventRef.current('game:over');
            }
            
            // CRITICAL: Submit score SYNCHRONOUSLY before setGameState
            // This ensures score is submitted even if modal closes quickly
            const orangesCollected = collectedIdsRef.current.size;
            if (isSignedInRef.current && !scoreSubmittedRef.current && 
                finalScore > 0 && orangesCollected >= 3) {
              scoreSubmittedRef.current = true;
              setScoreSubmitted(true);
              submitScoreRef.current(finalScore, undefined, {
                distance: Math.floor(distance),
                orangesCollected,
              }).then(result => {
                if (result.success && result.isNewHighScore) {
                  setIsNewPersonalBest(true);
                }
              });
            }
            
            setGameState('gameover');
            if (finalScore > highScore) {
              setHighScore(finalScore);
              localStorage.setItem('wojakRunnerHighScore', String(finalScore));
            }
          }
        }
      });

      // Check collectible collision
      setCollectibles(prev => {
        const remaining: Collectible[] = [];
        prev.forEach(collectible => {
          if (collectible.lane === playerLane) {
            const collectibleY = collectible.y;
            if (
              collectibleY + COLLECTIBLE_SIZE > playerY &&
              collectibleY < playerY + PLAYER_SIZE
            ) {
              // Prevent double sound - only play if not already collected
              if (collectedIdsRef.current.has(collectible.id)) {
                return; // Already collected, skip
              }
              collectedIdsRef.current.add(collectible.id);

              playCollectRef.current();
              hapticScoreRef.current(); // Collection haptic
              // Arcade lights: Orange collected (debounced)
              triggerEventRef.current('collect:coin');

              // Update streak
              collectStreakRef.current += 1;
              setCollectStreak(collectStreakRef.current);

              // Calculate bonus based on streak (NO CAP - rewards sustained streaks)
              const streakBonus = (collectStreakRef.current - 1) * 2;
              const totalPoints = 10 + streakBonus;
              setScore(s => s + totalPoints);

              // Simple inline score popup (guaranteed to show)
              // Clear previous timeout to prevent accumulation
              if (scorePopupTimeoutRef.current) {
                clearTimeout(scorePopupTimeoutRef.current);
              }
              setLastScorePopup({ points: totalPoints, id: Date.now() });
              scorePopupTimeoutRef.current = setTimeout(() => setLastScorePopup(null), 800);

              // Visual effects
              triggerShockwaveRef.current('#ff6b00', 0.6); // Orange shockwave
              triggerSparksRef.current('#ff6b00');
              // REMOVED: addScorePopupRef - was causing artifact on sides
              // We already have wr-inline-score-popup in the center
              updateComboRef.current();
              addFloatingEmojiRef.current('🍊');

              // Streak milestones
              if (collectStreakRef.current === 5) {
                showEpicCalloutRef.current('ORANGE FRENZY!');
                // Arcade lights: 5x streak
                triggerEventRef.current('combo:mid');
              } else if (collectStreakRef.current === 10) {
                showEpicCalloutRef.current('UNSTOPPABLE!');
                triggerConfettiRef.current();
                // Arcade lights: 10x streak
                triggerEventRef.current('combo:high');
              } else if (collectStreakRef.current === 15) {
                showEpicCalloutRef.current('LEGENDARY!');
                triggerConfettiRef.current();
                // Arcade lights: 15x streak (max)
                triggerEventRef.current('combo:max');
              }

              return; // Don't add to remaining
            }
          }
          remaining.push(collectible);
        });
        return remaining;
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Clean up score popup timeout
      if (scorePopupTimeoutRef.current) {
        clearTimeout(scorePopupTimeoutRef.current);
      }
    };
  // Note: obstacles and distance removed - we read from refs to avoid stale closures
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, speed, playerLane, score, highScore]);

  const totalScore = score + Math.floor(distance / 10);

  // Auto-submit score for signed-in users when game ends
  useEffect(() => {
    if (gameState === 'gameover' && isSignedIn && totalScore > 0 && !scoreSubmitted) {
      submitScoreGlobal(totalScore, collectedIdsRef.current.size);
    }
  }, [gameState, isSignedIn, totalScore, scoreSubmitted, submitScoreGlobal]);

  // Share handler for game over scorecard
  const handleShare = useCallback(async () => {
    try {
      const blob = await generateGameScorecard({
        gameName: 'Wojak Runner',
        gameNameParts: ['WOJAK', 'RUNNER'],
        score: totalScore,
        scoreLabel: 'points',
        bestScore: highScore,
        isNewRecord: isNewPersonalBest,
        screenshot: gameScreenshot,
        accentColor: '#ff6b00', // Orange accent
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `wojak-runner-${totalScore}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'wojak-runner-score.png', { type: 'image/png' });
        const shareData = {
          title: 'Wojak Runner Score',
          text: `🏃 I scored ${totalScore} points in Wojak Runner! Can you beat me?`,
          files: [file],
        };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
        }
      }
    } catch (err) {
      console.error('Failed to generate share image:', err);
      const shareText = `🏃 Wojak Runner: ${totalScore} points!\n\nCan you beat my score?\n\nhttps://wojak.ink/games`;
      if (navigator.share) {
        await navigator.share({ title: 'Wojak Runner', text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
      }
    }
  }, [totalScore, highScore, isNewPersonalBest, gameScreenshot]);

  const width = gameAreaRef.current?.offsetWidth || 300;
  const laneOffset = (width - LANE_WIDTH * 3) / 2;

  return (
    <div className={`runner-container ${gameState === 'playing' ? 'playing-mode' : ''}`}>
      <GameSEO
        gameName="Wojak Runner"
        gameSlug="runner"
        description="Run, dodge, and collect coins in this endless runner! Swipe to change lanes and avoid obstacles as the speed increases."
        genre="Arcade"
        difficulty="Hard"
      />
      {/* PLAYING STATE: Game Layout with Stats Panel on LEFT */}
      {gameState === 'playing' && (
        <div className="game-layout">
          {/* Stats Panel - LEFT side on desktop, TOP on mobile */}
          <div className="stats-panel">
            <div className="stat-item score-stat">
              <span className="stat-label">Score</span>
              <span className="stat-value">{totalScore}</span>
            </div>
            <div className="stat-item best-stat">
              <span className="stat-label">Best</span>
              <span className="stat-value">{highScore}</span>
            </div>
            <div className="stat-item speed-stat">
              <span className="stat-label">Speed</span>
              <span className="stat-value">{speed.toFixed(1)}x</span>
            </div>
            <div className="stat-item distance-stat">
              <span className="stat-label">Distance</span>
              <span className="stat-value">{Math.floor(distance / 10)}m</span>
            </div>
          </div>


          {/* Lightbox wrapper for game area - RIGHT side */}
          <div className={`lightbox-wrapper ${effects.screenShake ? 'screen-shake' : ''}`}>
            {/* Game Effects Layer - inside lightbox for proper centering on mobile */}
            <GameEffects effects={effects} accentColor="#ff6b00" />

            {/* Simple inline score popup - guaranteed visible */}
            {lastScorePopup && (
              <div
                key={lastScorePopup.id}
                className="wr-inline-score-popup"
              >
                +{lastScorePopup.points}
              </div>
            )}

            {/* Inline combo display - guaranteed visible */}
            {collectStreak > 1 && (
              <div className="wr-inline-combo">
                <span className="wr-combo-number">{collectStreak}</span>
                <span className="wr-combo-label">COMBO</span>
                {collectStreak >= 5 && <span className="wr-combo-fire">🔥</span>}
              </div>
            )}

            <div
              ref={gameAreaRef}
              className="runner-area playing"
              {...touchHandlers}
            >
              {/* Road lanes */}
              <div className="road" style={{ left: laneOffset }}>
                <div className="lane-line" style={{ left: LANE_WIDTH }} />
                <div className="lane-line" style={{ left: LANE_WIDTH * 2 }} />
              </div>

              {/* Player */}
              <div
                className="runner-player"
                style={{
                  left: laneOffset + playerLane * LANE_WIDTH + (LANE_WIDTH - PLAYER_SIZE) / 2,
                }}
              />

              {/* Obstacles */}
              {obstacles.map(obstacle => (
                <div
                  key={obstacle.id}
                  className={`runner-obstacle ${obstacle.type}`}
                  style={{
                    left: laneOffset + obstacle.lane * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_SIZE) / 2,
                    top: obstacle.y,
                  }}
                >
                  {obstacle.type === 'camel' ? '🐫' : '🐻'}
                </div>
              ))}

              {/* Collectibles */}
              {collectibles.map(collectible => (
                <div
                  key={collectible.id}
                  className="runner-collectible"
                  style={{
                    left: laneOffset + collectible.lane * LANE_WIDTH + (LANE_WIDTH - COLLECTIBLE_SIZE) / 2,
                    top: collectible.y,
                  }}
                >
                  &#x1F34A;
                </div>
              ))}

              {/* Swipe hint */}
              <div className="swipe-hint">← Swipe →</div>
            </div>
          </div>
        </div>
      )}

      {/* NON-PLAYING STATES: Menu and Game Over */}
      {gameState !== 'playing' && (
      <div className="runner-content">
        <div
          ref={gameAreaRef}
          className="runner-area"
          {...touchHandlers}
        >
          {/* Game Over - Uses shared component */}
          {gameState === 'gameover' && (
            <ArcadeGameOverScreen
              score={totalScore}
              highScore={highScore}
              scoreLabel="points"
              isNewPersonalBest={isNewPersonalBest}
              isSignedIn={isSignedIn}
              isSubmitting={isSubmitting}
              scoreSubmitted={scoreSubmitted}
              userDisplayName={userDisplayName ?? undefined}
              leaderboard={globalLeaderboard}
              onPlayAgain={startGame}
              onShare={handleShare}
              accentColor="#ff6b00"
              meetsMinimumActions={collectedIdsRef.current.size >= 3}
              minimumActionsMessage="Collect at least 3 oranges to be on the leaderboard"
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

export default WojakRunner;
