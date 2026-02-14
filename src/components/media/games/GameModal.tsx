/**
 * Game Modal Component
 *
 * Full-screen game container with instructions panel.
 * On desktop, renders the actual game component in a lightbox.
 */

import { useState, useEffect, lazy, Suspense, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, HelpCircle } from 'lucide-react';
import type { MiniGame } from '@/types/media';
import { ACCESSIBILITY_ICONS } from '@/config/games';
import {
  gameModalOverlayVariants,
  gameModalContentVariants,
} from '@/config/mediaAnimations';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { LeaderboardOverlay } from './LeaderboardOverlay';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import type { GameId } from '@/config/query/queryKeys';
import { Avatar } from '@/components/Avatar/Avatar';
import { ArcadeFrame } from '@/components/ArcadeFrame';
import type { LightSequence, LightOptions, PatternName } from '@/components/ArcadeButtonLights';
import { GameMuteContext } from '@/contexts/GameMuteContext';
import { ArcadeLightsProvider, useArcadeLights, GAME_LIGHT_INTENSITY } from '@/contexts/ArcadeLightsContext';
import { MobileGameControls } from './MobileGameControls';
import { CRTOverlay } from '@/components/arcade/CRTOverlay';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import './GameModal.css';

/**
 * Bridge component that syncs ArcadeLightsContext state to GameModal's state.
 * This allows games to control the arcade lights via useArcadeLights hook.
 *
 * Supports both:
 * - NEW API: triggerEvent() which sets `pattern` directly
 * - LEGACY API: setSequence() which sets both `sequence` and `pattern`
 */
function ArcadeLightsBridge({
  onStateChange,
}: {
  onStateChange: (sequence: LightSequence, options: LightOptions, pattern: PatternName | null) => void;
}) {
  const { sequence, options, pattern } = useArcadeLights();

  // Sync context state to GameModal state whenever it changes
  useEffect(() => {
    // NEW API: If pattern is set, always sync (games using triggerEvent)
    // LEGACY API: If sequence is a game-set value, sync
    const isGameSequence = sequence === 'playing' || sequence === 'score' || sequence === 'combo' ||
        sequence === 'gameOver' || sequence === 'highScore' || sequence === 'win' ||
        sequence === 'pipePass' || sequence === 'coinCollect';

    // Sync if pattern is set OR if sequence is a game-set value
    if (pattern !== null || isGameSequence) {
      onStateChange(sequence as LightSequence, options as LightOptions, pattern);
    }
  }, [sequence, options, pattern, onStateChange]);

  return null; // This component just syncs state, renders nothing
}

// Lazy load game components
const BrickByBrick = lazy(() => import('@/pages/BrickByBrick'));
const MemoryMatch = lazy(() => import('@/pages/MemoryMatch'));
const OrangePong = lazy(() => import('@/pages/OrangePong'));
const WojakRunner = lazy(() => import('@/pages/WojakRunner'));
const OrangeJuggle = lazy(() => import('@/pages/OrangeJuggle'));
const KnifeGame = lazy(() => import('@/pages/KnifeGame'));
const ColorReaction = lazy(() => import('@/pages/ColorReaction'));
const Merge2048Game = lazy(() => import('@/games/Merge2048/Merge2048Game'));
const WordleGame = lazy(() => import('@/games/Wordle/WordleGame'));
const BlockPuzzle = lazy(() => import('@/pages/BlockPuzzle'));
const FlappyOrange = lazy(() => import('@/pages/FlappyOrange'));
const CitrusDrop = lazy(() => import('@/pages/CitrusDrop'));
const OrangeSnake = lazy(() => import('@/pages/OrangeSnake'));
const BrickBreaker = lazy(() => import('@/pages/BrickBreaker'));
const WojakWhack = lazy(() => import('@/pages/WojakWhack'));

// Map game IDs to their components
const GAME_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC>> = {
  'orange-stack': BrickByBrick,
  'memory-match': MemoryMatch,
  'orange-pong': OrangePong,
  'wojak-runner': WojakRunner,
  'orange-juggle': OrangeJuggle,
  'knife-game': KnifeGame,
  'color-reaction': ColorReaction,
  'merge-2048': Merge2048Game,
  'orange-wordle': WordleGame,
  'block-puzzle': BlockPuzzle,
  'flappy-orange': FlappyOrange,
  'citrus-drop': CitrusDrop,
  'orange-snake': OrangeSnake,
  'brick-breaker': BrickBreaker,
  'wojak-whack': WojakWhack,
};

// Preload functions for each game (call the import to cache it)
const GAME_PRELOADERS: Record<string, () => Promise<unknown>> = {
  'orange-stack': () => import('@/pages/BrickByBrick'),
  'memory-match': () => import('@/pages/MemoryMatch'),
  'orange-pong': () => import('@/pages/OrangePong'),
  'wojak-runner': () => import('@/pages/WojakRunner'),
  'orange-juggle': () => import('@/pages/OrangeJuggle'),
  'knife-game': () => import('@/pages/KnifeGame'),
  'color-reaction': () => import('@/pages/ColorReaction'),
  'merge-2048': () => import('@/games/Merge2048/Merge2048Game'),
  'orange-wordle': () => import('@/games/Wordle/WordleGame'),
  'block-puzzle': () => import('@/pages/BlockPuzzle'),
  'flappy-orange': () => import('@/pages/FlappyOrange'),
  'citrus-drop': () => import('@/pages/CitrusDrop'),
  'orange-snake': () => import('@/pages/OrangeSnake'),
  'brick-breaker': () => import('@/pages/BrickBreaker'),
  'wojak-whack': () => import('@/pages/WojakWhack'),
};

// Game-specific music playlists - music starts when modal opens
const GAME_MUSIC: Record<string, string[]> = {
  'orange-stack': [
    '/audio/music/brick-by-brick/yoshis-island-final.mp3',
    '/audio/music/brick-by-brick/wandering-the-plains-final.mp3',
    '/audio/music/brick-by-brick/valley-of-bowser-final.mp3',
    '/audio/music/brick-by-brick/forest-of-illusion-final.mp3',
  ],
  'flappy-orange': [
    '/audio/music/FlappyOrange/gourmet-race-whisper.mp3',
    '/audio/music/FlappyOrange/lost-woods-whisper.mp3',
    '/audio/music/FlappyOrange/tetris-troika-whisper.mp3',
    '/audio/music/FlappyOrange/smb3-overworld-whisper.mp3',
  ],
  'block-puzzle': [
    '/audio/music/block-puzzle/tetris-theme-final.mp3',
    '/audio/music/block-puzzle/mt-dedede-final.mp3',
    '/audio/music/block-puzzle/smb-underwater-final.mp3',
    '/audio/music/block-puzzle/street-fighter-balrog-final.mp3',
  ],
  'memory-match': [
    '/audio/music/memory-match/megaman-cutman-final.mp3',
    '/audio/music/memory-match/megaman-elecman-final.mp3',
    '/audio/music/memory-match/megaman-fireman-final.mp3',
    '/audio/music/memory-match/sf2-zangief-final.mp3',
  ],
  'wojak-runner': [
    '/audio/music/wojak-runner/sonic-green-hill-final.mp3',
    '/audio/music/wojak-runner/sonic-chemical-plant-final.mp3',
    '/audio/music/wojak-runner/street-fighter-mbison-final.mp3',
    '/audio/music/wojak-runner/street-fighter-vega-final.mp3',
  ],
  'color-reaction': [
    '/audio/music/color-reaction/smb-main-theme-final.mp3',
    '/audio/music/color-reaction/smw-overworld-final.mp3',
    '/audio/music/color-reaction/smb-underground-final.mp3',
    '/audio/music/color-reaction/smw-title-theme-final.mp3',
  ],
  'merge-2048': [
    '/audio/music/2048-merge/sf2-chunli-final.mp3',
    '/audio/music/2048-merge/sf2-blanka-final.mp3',
    '/audio/music/2048-merge/sf2-sagat-final.mp3',
    '/audio/music/2048-merge/sf2-ending-final.mp3',
  ],
};

interface GameModalProps {
  game: MiniGame | null;
  isOpen: boolean;
  onClose: () => void;
}

export function GameModal({ game, isOpen, onClose }: GameModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const [showInstructions, setShowInstructions] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [, setGameReady] = useState(false);
  // Initialize with idle/breathe so lights show immediately on intro screen
  const [lightSequence, setLightSequence] = useState<LightSequence>('idle');
  const [lightOptions, setLightOptions] = useState<LightOptions>({});
  const [lightPattern, setLightPattern] = useState<PatternName | null>('breathe');
  const [isMuted, setIsMuted] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const isMobile = useIsMobile();

  // Handle close button click - show confirmation if game is in progress
  const handleCloseAttempt = useCallback(() => {
    if (gameStarted) {
      // Game is in progress - show confirmation dialog
      setShowCloseConfirm(true);
    } else {
      // Not playing - close immediately
      onClose();
    }
  }, [gameStarted, onClose]);

  // Handle confirmed exit - actually close the game
  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    onClose();
  }, [onClose]);

  // Handle cancel - stay in game
  const handleCancelClose = useCallback(() => {
    setShowCloseConfirm(false);
  }, []);

  // Game music management
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playlistIndexRef = useRef(0);
  const isMutedRef = useRef(false); // Ref for checking mute state in callbacks (avoids stale closures)

  // Keep isMutedRef in sync with isMuted state
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Play a track from the game's playlist
  const playGameMusic = useCallback((gameId: string) => {
    const playlist = GAME_MUSIC[gameId];
    if (!playlist || playlist.length === 0) return;

    // Start with random track
    playlistIndexRef.current = Math.floor(Math.random() * playlist.length);
    const track = playlist[playlistIndexRef.current];

    // Stop any existing music
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(track);
    audio.volume = 1.0;

    // When song ends, play next track (use ref to avoid stale closure)
    const handleEnded = () => {
      if (!isMutedRef.current) {
        playlistIndexRef.current = (playlistIndexRef.current + 1) % playlist.length;
        const nextTrack = playlist[playlistIndexRef.current];
        audio.src = nextTrack;
        audio.play().catch(() => {});
      }
    };
    audio.addEventListener('ended', handleEnded);

    audioRef.current = audio;
    audio.play().catch(() => {}); // Handle autoplay restrictions silently
  }, []); // No dependencies - uses refs for mutable values

  // Stop game music
  const stopGameMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
      audioRef.current = null;
    }
  }, []);

  // Stop music when browser tab is hidden or closed (especially important on mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && audioRef.current) {
        audioRef.current.pause();
      } else if (!document.hidden && audioRef.current && !isMutedRef.current) {
        audioRef.current.play().catch(() => {});
      }
    };

    // pagehide fires when user closes tab/browser - more reliable than unload on mobile
    const handlePageHide = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };

    // beforeunload as additional fallback for desktop browsers
    const handleBeforeUnload = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Reset when modal closes or game changes
  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => {
        setGameStarted(false);
        setGameReady(false);
        setShowInstructions(false);
        setShowLeaderboard(false);
        setLightSequence('off');
        setIsMuted(false);
      });
      stopGameMusic();

      // Exit fullscreen when game closes
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement) {
        (document as unknown as { webkitExitFullscreen?: () => void }).webkitExitFullscreen?.();
      }
    } else {
      // Go directly to idle pattern for intro screen
      // Use the new pattern system (not legacy sequence) for consistent positioning
      queueMicrotask(() => setLightSequence('idle'));
      // Game-specific idle/attract patterns
      queueMicrotask(() => {
        if (game?.id === 'orange-stack') {
          // Brick-by-Brick: Smooth perimeter flow wave
          setLightPattern('perimeterFlow');
        } else {
          setLightPattern('breathe');
        }
      });
      // Start game music immediately when modal opens
      if (game?.id && GAME_MUSIC[game.id]) {
        playGameMusic(game.id);
      }
    }
    // Cleanup on unmount — ensures music stops if component is destroyed while open
    return () => {
      stopGameMusic();
    };
  }, [isOpen, game?.id, playGameMusic, stopGameMusic]);

  // Handle mute toggle - simple pause/resume
  const handleMuteToggle = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      // If GameModal manages music, control it directly
      if (audioRef.current) {
        if (newMuted) {
          audioRef.current.pause();
        } else {
          audioRef.current.play().catch(() => {});
        }
      }
      return newMuted;
    });
  }, []);

  // Preload game component when modal opens (so it's ready when user clicks Play)
  useEffect(() => {
    if (isOpen && game?.id && GAME_PRELOADERS[game.id]) {
      GAME_PRELOADERS[game.id]().then(() => {
        setGameReady(true);
      });
    }
  }, [isOpen, game?.id]);

  // Transition from startup to idle, from gameStart to playing
  const handleLightSequenceComplete = () => {
    if (lightSequence === 'startup') {
      setLightSequence('idle');
      setLightPattern('breathe');
    } else if (lightSequence === 'gameStart') {
      // After game start burst, transition to playing state with ambient glow
      // Use glow pattern for consistent positioning (new pattern system)
      setLightSequence('playing');
      setLightPattern('glow');
      // lightOptions already set in handlePlayClick with game-specific intensity
    } else if (lightSequence === 'highScore') {
      // After high score celebration, return to idle/breathe
      setLightSequence('idle');
      setLightPattern('breathe');
      setLightOptions({});
    } else if (lightSequence === 'gameOver') {
      // After game over, return to idle/breathe for the game over screen
      setLightSequence('idle');
      setLightPattern('breathe');
      setLightOptions({});
    }
  };

  // Callback for ArcadeLightsBridge to sync context state to GameModal state
  const handleLightContextChange = useCallback((newSequence: LightSequence, newOptions: LightOptions, newPattern: PatternName | null) => {
    setLightSequence(newSequence);
    setLightOptions(newOptions);
    setLightPattern(newPattern);
  }, []);

  // Handle play button click with light sequence
  const handlePlayClick = () => {
    // Use explode pattern for game start (consistent positioning with new pattern system)
    setLightPattern('explode');
    setLightSequence('gameStart');
    setGameStarted(true);

    // Set playing intensity based on game after gameStart sequence completes
    // The handleLightSequenceComplete will transition to 'playing' with the right intensity
    if (game?.id) {
      const intensity = GAME_LIGHT_INTENSITY[game.id] || 'low';
      setLightOptions({ intensity });
    }

    // Request fullscreen on mobile for immersive gameplay
    if (isMobile) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if ((elem as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
        // Safari/iOS
        (elem as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
      }
    }
  };

  // Hide bottom navigation on mobile when modal is open (fullscreen from the start)
  // Also add scroll lock to prevent page scrolling on intro screen
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.classList.add('game-fullscreen-mode');
      // Add scroll lock to prevent page scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      document.body.classList.remove('game-fullscreen-mode');
      // Remove scroll lock
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }

    return () => {
      document.body.classList.remove('game-fullscreen-mode');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [isMobile, isOpen]);

  // Add class when arcade frame is visible (desktop only)
  useEffect(() => {
    const showArcadeFrame = !isMobile && isOpen && game?.status !== 'coming-soon';
    if (showArcadeFrame) {
      document.body.classList.add('arcade-frame-visible');
    } else {
      document.body.classList.remove('arcade-frame-visible');
    }

    return () => {
      document.body.classList.remove('arcade-frame-visible');
    };
  }, [isMobile, isOpen, game?.status]);

  // Browser back button support - push state when modal opens, close on popstate
  useEffect(() => {
    if (!isOpen) return;

    // Push a state when modal opens so back button has something to pop
    const stateId = `game-modal-${game?.id}-${Date.now()}`;
    window.history.pushState({ gameModal: stateId }, '');

    const handlePopState = (event: PopStateEvent) => {
      // If we're going back from our pushed state, close the modal
      if (!event.state?.gameModal || event.state.gameModal !== stateId) {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // If modal is closing normally (not via back button), clean up the history entry
      // Check if the current state is still our pushed state
      if (window.history.state?.gameModal === stateId) {
        window.history.back();
      }
    };
  }, [isOpen, game?.id, onClose]);

  // Fetch leaderboard data for intro screen
  const { leaderboard: introLeaderboard } = useLeaderboard(game?.id as GameId);

  if (!game) return null;

  const isComingSoon = game.status === 'coming-soon';

  const accessibilityList = Object.entries(game.accessibilityFeatures)
    .filter(([, enabled]) => enabled)
    .map(([key]) => ({
      key,
      ...ACCESSIBILITY_ICONS[key as keyof typeof ACCESSIBILITY_ICONS],
    }));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - no onClick, only close button closes the modal */}
          {/* This allows games to receive clicks anywhere on screen */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0, 0, 0, 0.9)' }}
            variants={prefersReducedMotion ? undefined : gameModalOverlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          />

          {/* Mobile game controls - shared component for all games */}
          {/* Shows on mobile during gameplay (not for coming soon on intro screen) */}
          {/* Games with hasOwnControls still use their own UI (e.g., Block Puzzle) */}
          {isMobile && gameStarted && !isComingSoon && !game.hasOwnControls && (
            <MobileGameControls onClose={handleCloseAttempt} />
          )}

          {/* Modal content - centering wrapper */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{
              // Mobile: no padding for true fullscreen experience
              // Desktop: padding for arcade frame positioning
              paddingTop: isMobile ? '0' : (game.id === 'memory-match' ? '55px' : '0'),
              paddingBottom: isMobile ? '0' : (game.id === 'memory-match' ? '15px' : '0'),
              paddingLeft: isMobile ? '0' : (game.id === 'memory-match' ? '72px' : '0'),
              paddingRight: isMobile ? '0' : (game.id === 'memory-match' ? '72px' : '0'),
            }}
          >
            {/* Arcade Frame wrapper - shows for ALL states on desktop (intro, gameplay, game over) */}
            {(() => {
              const frameVariant = 'standard';
              // Show arcade frame on desktop for all games (not mobile, not coming soon)
              const showArcadeFrame = !isMobile && !isComingSoon;

              if (showArcadeFrame) {
                // Arcade frame covers entire screen - contains intro OR game
                return (
                  <motion.div
                    className="arcade-frame-wrapper"
                    variants={prefersReducedMotion ? undefined : gameModalContentVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <ArcadeFrame
                      variant={frameVariant}
                      lightPattern={lightPattern}
                      lightSequence={lightSequence}
                      lightOptions={lightOptions}
                      onLightSequenceComplete={handleLightSequenceComplete}
                      showIntroButtons={true}
                      onHelpClick={() => setShowInstructions(prev => !prev)}
                      onCloseClick={handleCloseAttempt}
                      isMuted={isMuted}
                      onMuteClick={handleMuteToggle}
                    >
                      {/* Game content - renders behind intro, fades in when started */}
                      <div
                        className={`arcade-game-layer ${gameStarted ? 'active' : 'inactive'}`}
                        style={{
                          opacity: gameStarted ? 1 : 0,
                          transition: 'opacity 0.4s ease-out',
                          pointerEvents: gameStarted ? 'auto' : 'none',
                        }}
                      >
                        <ArcadeLightsProvider>
                          {/* Bridge syncs context state to GameModal for ArcadeFrame */}
                          <ArcadeLightsBridge onStateChange={handleLightContextChange} />
                          <GameMuteContext.Provider value={{ isMuted, setIsMuted, toggleMute: () => setIsMuted(prev => !prev), musicManagedExternally: !!GAME_MUSIC[game.id], gameStarted, isPaused: showCloseConfirm }}>
                            <Suspense
                              fallback={
                                <div
                                  className="w-full h-full flex items-center justify-center"
                                  style={{ background: '#000' }}
                                >
                                  <div className="text-center">
                                    <div className="text-4xl mb-4">{game.emoji}</div>
                                    <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
                                  </div>
                                </div>
                              }
                            >
                              {GAME_COMPONENTS[game.id] ? (
                                (() => {
                                  const GameComponent = GAME_COMPONENTS[game.id];
                                  return <GameComponent />;
                                })()
                              ) : null}
                            </Suspense>
                          </GameMuteContext.Provider>
                        </ArcadeLightsProvider>
                      </div>

                      {/* Intro Screen - only render when game hasn't started */}
                      {!gameStarted && (
                      <div
                        className="arcade-intro-screen"
                      >
                          {/* Background with blur and rounded corners */}
                          <div
                            className="arcade-intro-bg"
                            style={{
                              backgroundImage: `url('${game.introBackground || '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Orange Grove.png'}')`,
                            }}
                          />

                          {/* Dark gradient overlay for readability */}
                          <div className="arcade-intro-overlay" />

                          {/* Leaderboard Panel - slides in from left */}
                          <div className={`arcade-leaderboard-panel ${showLeaderboard ? 'visible' : ''}`}>
                            <div className="arcade-leaderboard-content">
                              <div className="arcade-leaderboard-list">
                                {Array.from({ length: 10 }, (_, index) => {
                                  const entry = introLeaderboard[index];
                                  const hasEntry = !!entry;
                                  return (
                                    <div key={index} className={`arcade-leaderboard-entry ${!hasEntry ? 'empty' : ''}`}>
                                      <span className="arcade-leaderboard-rank">#{index + 1}</span>
                                      {hasEntry ? (
                                        <Avatar
                                          avatar={entry.avatar || { type: 'emoji', value: '🎮', source: 'default' }}
                                          size="small"
                                          showBadge={false}
                                        />
                                      ) : (
                                        <div className="arcade-leaderboard-avatar-placeholder" />
                                      )}
                                      <span className={`arcade-leaderboard-name ${entry?.equipped?.nameEffect?.css_class || ''}`}>
                                        {entry?.displayName || '---'}
                                      </span>
                                      <span className="arcade-leaderboard-score">{entry?.score ?? '-'}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Premium centered card layout - pushes right when leaderboard opens */}
                          <div className={`arcade-intro-card ${showLeaderboard ? 'pushed' : ''}`}>
                            {/* Juiced-up title with glow and animation */}
                            <div
                              className="arcade-game-title"
                              style={{
                                color: 'white',
                                '--glow-color': game.accentColor,
                              } as React.CSSProperties}
                            >
                              {game.name}
                            </div>

                            {/* Big bouncing emoji/mascot */}
                            <div className="arcade-game-mascot">{game.emoji}</div>

                            {/* Action buttons - stacked and cohesive */}
                            <div className="arcade-buttons-stack">
                              <button
                                className="arcade-play-btn"
                                onClick={handlePlayClick}
                                style={{
                                  background: 'linear-gradient(180deg, #60a5fa 0%, #1e40af 100%)',
                                  boxShadow: '0 6px 24px rgba(30, 64, 175, 0.6), inset 0 1px 0 rgba(255,255,255,0.3)',
                                }}
                              >
                                <span className="play-icon">▶</span>
                                PLAY
                              </button>

                              {game.hasHighScores && (
                                <button
                                  className={`arcade-leaderboard-btn ${showLeaderboard ? 'active' : ''}`}
                                  onClick={() => setShowLeaderboard(!showLeaderboard)}
                                  style={{
                                    borderColor: `${game.accentColor}60`,
                                  }}
                                >
                                  <span className="trophy-icon">🏆</span>
                                  Leaderboard
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Instructions overlay inside arcade frame */}
                          <AnimatePresence>
                            {showInstructions && (
                              <motion.div
                                className="absolute inset-0 z-50 flex items-center justify-center"
                                style={{ background: 'rgba(0, 0, 0, 0.85)' }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={(e) => { e.stopPropagation(); setShowInstructions(false); }}
                              >
                                <motion.div
                                  className="w-fit max-h-[80%] overflow-y-auto p-6 rounded-xl whitespace-nowrap"
                                  style={{
                                    background: 'var(--color-bg-primary)',
                                    border: `1px solid ${game.accentColor}40`,
                                  }}
                                  initial={{ scale: 0.9, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.9, opacity: 0 }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <h2
                                    className="text-lg font-bold mb-4 text-center"
                                    style={{ color: game.accentColor }}
                                  >
                                    How to Play
                                  </h2>
                                  <ol className="space-y-3">
                                    {game.instructions.map((instruction) => (
                                      <li
                                        key={instruction.step}
                                        className="flex items-start gap-2 text-sm"
                                        style={{ color: 'var(--color-text-secondary)' }}
                                      >
                                        <span
                                          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                                          style={{
                                            background: `${game.accentColor}30`,
                                            color: game.accentColor,
                                          }}
                                        >
                                          {instruction.step}
                                        </span>
                                        <span>{instruction.text}</span>
                                      </li>
                                    ))}
                                  </ol>
                                  {game.controls.length > 0 && (
                                    <div className="mt-6">
                                      <h3
                                        className="text-sm font-semibold mb-3"
                                        style={{ color: 'var(--color-text-primary)' }}
                                      >
                                        Controls
                                      </h3>
                                      <div className="space-y-2">
                                        {game.controls.map((control, index) => (
                                          <div
                                            key={index}
                                            className="flex items-center justify-between p-2 rounded-lg"
                                            style={{ background: 'var(--color-surface)' }}
                                          >
                                            <span
                                              className="text-xs font-mono px-2 py-1 rounded"
                                              style={{
                                                background: `${game.accentColor}20`,
                                                color: game.accentColor,
                                              }}
                                            >
                                              {control.input}
                                            </span>
                                            <span
                                              className="text-sm"
                                              style={{ color: 'var(--color-text-secondary)' }}
                                            >
                                              {control.action}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                        </div>
                      )}
                    </ArcadeFrame>
                  </motion.div>
                );
              }

              // Regular modal (mobile, coming soon, wide games like memory-match)
              return (
            <motion.div
              className={`flex flex-col pointer-events-auto ${isMobile ? '' : 'rounded-2xl'}`}
              style={{
                // Mobile: TRUE full-screen (edge to edge), Desktop: constrained
                // Memory Match uses fit-content ONLY during gameplay (not intro)
                // When gameStarted on mobile, use full screen height (no subtraction)
                width: isMobile
                  ? '100vw'
                  : (game.id === 'memory-match' && gameStarted ? 'fit-content' : 'min(75vw, 900px)'),
                // Mobile: use dvh for better iOS Safari support, always full screen
                height: isMobile
                  ? '100dvh'  // Always full height on mobile (intro and gameplay)
                  : (game.id === 'memory-match' && gameStarted ? 'fit-content' : '88vh'),
                maxWidth: game.id === 'memory-match' && gameStarted && !isMobile ? 'calc(100vw - 145px)' : undefined,
                maxHeight: isMobile ? '100dvh' : 'calc(100vh - 70px)',
                background: isMobile
                  ? 'transparent' // Let game background show through on mobile
                  : `linear-gradient(135deg, ${game.accentColor}15 0%, ${game.accentColor}05 100%)`,
                border: isMobile ? 'none' : `1px solid ${game.accentColor}40`,
                boxShadow: isMobile ? 'none' : `0 8px 32px ${game.accentColor}20, 0 0 0 1px ${game.accentColor}10`,
                overflow: 'hidden',
              }}
              variants={prefersReducedMotion ? undefined : gameModalContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden min-h-0 relative">
              {/* Intro Screen - shows before game starts */}
              {!gameStarted && !isComingSoon && (
                <div
                  className="game-intro-screen"
                  style={{
                    backgroundImage: `url('${game.introBackground || '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Orange Grove.png'}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {/* Premium Glassmorphism Header Bar */}
                  <div className="game-intro-header-bar">
                    <button
                      className="game-intro-header-btn"
                      onClick={() => setShowInstructions(true)}
                      aria-label="How to play"
                    >
                      <HelpCircle size={20} />
                    </button>
                    <span className="game-intro-header-title">{game.name}</span>
                    <button
                      className="game-intro-header-btn"
                      onClick={handleCloseAttempt}
                      aria-label="Close game"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="game-intro-content">
                    <div className="game-intro-emoji">{game.emoji}</div>
                    <p className="game-intro-description">
                      {game.shortDescription || game.description}
                    </p>

                    <button
                      className="game-intro-play-btn"
                      onClick={() => setGameStarted(true)}
                      style={{
                        background: `linear-gradient(135deg, ${game.accentColor} 0%, ${game.accentColor}cc 100%)`,
                        boxShadow: `0 4px 24px ${game.accentColor}60, 0 0 60px ${game.accentColor}30`,
                      }}
                    >
                      PLAY
                    </button>

                    {game.hasHighScores && (
                      <button
                        className="game-intro-leaderboard-link"
                        onClick={() => setShowLeaderboard(true)}
                      >
                        🏆 View Leaderboard <span className="arrow">→</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Coming Soon state */}
              {isComingSoon && (
                <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex items-center justify-center p-4">
                  <div className="text-center max-w-md">
                    <div className="text-8xl mb-6">{game.emoji}</div>
                    <h3
                      className="text-2xl font-bold mb-4"
                      style={{ color: game.accentColor }}
                    >
                      Coming Soon!
                    </h3>
                    <p
                      className="text-base mb-6"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {game.description}
                    </p>

                    {/* Accessibility features */}
                    <div
                      className="p-4 rounded-xl mb-4"
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <h4
                        className="text-sm font-medium mb-3"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        Accessibility Features
                      </h4>
                      <div className="flex flex-wrap justify-center gap-3">
                        {accessibilityList.map(({ key, icon, label }) => (
                          <div
                            key={key}
                            className="flex items-center gap-1 text-sm"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            <span>{icon}</span>
                            <span>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Game area - only renders when game has started (mobile or wide games only - arcade frame handles desktop) */}
              {gameStarted && !isComingSoon && (
                <div className="w-full h-full overflow-hidden" style={{ position: 'relative' }}>
                  {/* CRITICAL: Mobile needs GameMuteContext.Provider too! Without it, musicManagedExternally is false and games start their own music */}
                  {/* ArcadeLightsProvider wraps for consistency, though lights are hidden on mobile */}
                  <ArcadeLightsProvider>
                    {/* Bridge syncs context state (mobile - no visible effect but keeps API consistent) */}
                    <ArcadeLightsBridge onStateChange={handleLightContextChange} />
                    <GameMuteContext.Provider value={{ isMuted, setIsMuted, toggleMute: () => setIsMuted(prev => !prev), musicManagedExternally: !!GAME_MUSIC[game.id], gameStarted, isPaused: showCloseConfirm }}>
                      <Suspense
                        fallback={
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: 'var(--color-surface)' }}
                          >
                            <div className="text-center">
                              <div className="text-4xl mb-4">{game.emoji}</div>
                              <p style={{ color: 'var(--color-text-muted)' }}>Loading game...</p>
                            </div>
                          </div>
                        }
                      >
                        {GAME_COMPONENTS[game.id] ? (
                          (() => {
                            const GameComponent = GAME_COMPONENTS[game.id];
                            return <GameComponent />;
                          })()
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: 'var(--color-surface)' }}
                          >
                            <p style={{ color: 'var(--color-text-muted)' }}>
                              Game not available
                            </p>
                          </div>
                        )}
                      </Suspense>
                    </GameMuteContext.Provider>
                  </ArcadeLightsProvider>
                  {/* CRT overlay for mobile - experimental; remove if disliked */}
                  <CRTOverlay />
                </div>
              )}
            </div>

            {/* Instructions overlay - renders on top of game */}
            <AnimatePresence>
              {showInstructions && (
                <motion.div
                  className="absolute inset-0 z-50 flex items-center justify-center"
                  style={{ background: 'rgba(0, 0, 0, 0.85)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={(e) => { e.stopPropagation(); setShowInstructions(false); }}
                >
                  <motion.div
                    className="w-fit max-h-[80%] overflow-y-auto p-6 rounded-xl whitespace-nowrap"
                    style={{
                      background: 'var(--color-bg-primary)',
                      border: `1px solid ${game.accentColor}40`,
                    }}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Title */}
                    <h2
                      className="text-lg font-bold mb-4 text-center"
                      style={{ color: game.accentColor }}
                    >
                      How to Play
                    </h2>

                    {/* Instructions */}
                    <ol className="space-y-3">
                      {game.instructions.map((instruction) => (
                        <li
                          key={instruction.step}
                          className="flex items-start gap-2 text-sm"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          <span
                            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                              background: `${game.accentColor}30`,
                              color: game.accentColor,
                            }}
                          >
                            {instruction.step}
                          </span>
                          <span>{instruction.text}</span>
                        </li>
                      ))}
                    </ol>

                    {/* Controls - only show if there are any */}
                    {game.controls.length > 0 && (
                      <div className="mt-6">
                        <h3
                          className="text-sm font-semibold mb-3"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          Controls
                        </h3>
                        <div className="space-y-2">
                          {game.controls.map((control, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 rounded-lg"
                              style={{
                                background: 'var(--color-surface)',
                              }}
                            >
                              <span
                                className="text-xs font-mono px-2 py-1 rounded"
                                style={{
                                  background: `${game.accentColor}20`,
                                  color: game.accentColor,
                                }}
                              >
                                {control.input}
                              </span>
                              <span
                                className="text-sm"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                {control.action}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Leaderboard Overlay */}
            <LeaderboardOverlay
              isOpen={showLeaderboard}
              onClose={() => setShowLeaderboard(false)}
              gameId={game.id}
              accentColor={game.accentColor}
            />

          </motion.div>
              );
            })()}
          </div>

          {/* Close confirmation dialog - shown when user tries to close during gameplay */}
          <ConfirmModal
            isOpen={showCloseConfirm}
            onClose={handleCancelClose}
            onConfirm={handleConfirmClose}
            title="Quit Game?"
            message="You'll lose your current progress if you quit now."
            confirmText="Quit Game"
            cancelText="Keep Playing"
            variant="warning"
            icon="🎮"
          />
        </>
      )}
    </AnimatePresence>
  );
}

export default GameModal;
