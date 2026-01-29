import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useGameHaptics } from '@/systems/haptics';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import { useAudio } from '@/contexts/AudioContext';
import { useGameEffects, GameEffects } from '@/components/media';
import { useGameMute } from '@/contexts/GameMuteContext';
import { useArcadeLights } from '@/contexts/ArcadeLightsContext';
import { GAME_COMBO_TIERS } from '@/config/arcade-light-mappings';
import type { GameEvent } from '@/config/arcade-light-mappings';
import { GAME_OVER_SEQUENCE } from '@/lib/juice/brandConstants';
import { useTimeUrgency, getUrgencyClass } from '@/hooks/useTimeUrgency';
import { useGameNavigationGuard } from '@/hooks/useGameNavigationGuard';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { getAllNfts, isReady as isPreloaderReady, initGalleryPreloader } from '@/services/galleryPreloader';
import { GameSEO } from '@/components/seo/GameSEO';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { captureGameArea } from '@/systems/sharing/captureDOM';
import { generateGameScorecard } from '@/systems/sharing/GameScorecard';
import { ArcadeGameOverScreen } from '@/components/media/games/ArcadeGameOverScreen';
import { GameButton } from '@/components/ui/GameButton';
import './MemoryMatch.css';

interface NFTMetadata {
  name: string;
  image: string;
  edition: number;
  attributes?: { trait_type: string; value: string }[];
}

// Round configuration - pairs and optional filter (from memory-match-filters.json)
// Levels 1-9: Scaling phase (pairs increase, +11s per additional pair)
// Levels 10-39: Base/combo/suit filters (-1s per level)
// Levels 40+: Random filter (-0.5s per level, no floor)
interface RoundConfig {
  pairs: number;
  filter?: string; // Filter name from memory-match-filters.json
}

const ROUND_CONFIG: RoundConfig[] = [
  // Levels 1-9: Scaling phase (no filter, random NFTs)
  { pairs: 6 },   // Level 1: 12 cards (4×3) - 36s
  { pairs: 7 },   // Level 2: 14 cards (5×3) - 47s
  { pairs: 9 },   // Level 3: 18 cards (6×3) - 69s
  { pairs: 11 },  // Level 4: 22 cards (6×4) - 91s
  { pairs: 12 },  // Level 5: 24 cards (6×4) - 102s
  { pairs: 13 },  // Level 6: 26 cards (7×4) - 113s
  { pairs: 14 },  // Level 7: 28 cards (7×4) - 124s
  { pairs: 15 },  // Level 8: 30 cards (8×4) - 135s
  { pairs: 16 },  // Level 9: 32 cards (8×4) - 146s
  // Levels 10-23: Base filters (14 bases, ordered by count)
  { pairs: 16, filter: 'Wojak' },        // Level 10: 145s
  { pairs: 16, filter: 'Soyjak' },       // Level 11: 144s
  { pairs: 16, filter: 'Papa Tang' },    // Level 12: 143s
  { pairs: 16, filter: 'Monkey Zoo' },   // Level 13: 142s
  { pairs: 16, filter: 'Waifu' },        // Level 14: 141s
  { pairs: 16, filter: 'Baddie' },       // Level 15: 140s
  { pairs: 16, filter: 'Bepe Wojak' },   // Level 16: 139s
  { pairs: 16, filter: 'Bepe Soyjak' },  // Level 17: 138s
  { pairs: 16, filter: 'Bepe Waifu' },   // Level 18: 137s
  { pairs: 16, filter: 'Bepe Baddie' },  // Level 19: 136s
  { pairs: 16, filter: 'Alien Wojak' },  // Level 20: 135s
  { pairs: 16, filter: 'Alien Soyjak' }, // Level 21: 134s
  { pairs: 16, filter: 'Alien Waifu' },  // Level 22: 133s
  { pairs: 16, filter: 'Alien Baddie' }, // Level 23: 132s
  // Levels 24-39: Combo and suit filters (16 filters, ordered by count)
  { pairs: 16, filter: 'Clown + Clown Nose' },                    // Level 24: 131s
  { pairs: 16, filter: 'Wizard Hat + Wizard Drip' },              // Level 25: 130s
  { pairs: 16, filter: 'Proof of Prayer' },                       // Level 26: 129s
  { pairs: 16, filter: 'Gopher Suit' },                           // Level 27: 128s
  { pairs: 16, filter: 'Super Saiyan + Super Saiyan Uniform' },   // Level 28: 127s
  { pairs: 16, filter: 'Roman Drip + Centurion' },                // Level 29: 126s
  { pairs: 16, filter: 'Pepe Suit' },                             // Level 30: 125s
  { pairs: 16, filter: 'Goose Suit' },                            // Level 31: 124s
  { pairs: 16, filter: 'Ronin Helmet + Ronin' },                  // Level 32: 123s
  { pairs: 16, filter: 'Bepe Suit' },                             // Level 33: 122s
  { pairs: 16, filter: 'Pickle Suit' },                           // Level 34: 121s
  { pairs: 16, filter: 'Bepe Army + Field Cap/Hard Hat' },        // Level 35: 120s
  { pairs: 16, filter: 'Viking Armor + Viking Helmet' },          // Level 36: 119s
  { pairs: 16, filter: 'Astronaut' },                             // Level 37: 118s
  { pairs: 16, filter: 'Sonic Suit' },                            // Level 38: 117s
  { pairs: 16, filter: 'Firefighter Helmet + Firefighter Uniform' }, // Level 39: 116s
];

// Fixed time per level (no more exponential increase)
// Levels 1-9: Pre-calculated based on +11s per additional pair
const LEVEL_TIMES = [36, 47, 69, 91, 102, 113, 124, 135, 146];

interface Card {
  id: number;
  nftId: number;
  name: string;
  image: string;
  isFlipped: boolean;
  isMatched: boolean;
}

// Background music playlist
const MUSIC_PLAYLIST = [
  { src: '/audio/music/memory-match/megaman-cutman-final.mp3', name: 'Cut Man Stage' },
  { src: '/audio/music/memory-match/megaman-elecman-final.mp3', name: 'Elec Man Stage' },
  { src: '/audio/music/memory-match/megaman-fireman-final.mp3', name: 'Fire Man Stage' },
  { src: '/audio/music/memory-match/sf2-zangief-final.mp3', name: 'Zangief Stage' },
];

// Fixed grid layouts optimized for MAXIMUM CARD SIZE
// DESKTOP (landscape): Add COLUMNS before ROWS - more horizontal space
// MOBILE (portrait): Add ROWS before COLUMNS - more vertical space
const GRID_LAYOUTS_DESKTOP: Record<number, { cols: number; rows: number }> = {
  // 3 rows - maximize card size by staying height-constrained
  12: { cols: 4, rows: 3 },   // Round 1: 4×3 (baseline)
  14: { cols: 5, rows: 3 },   // Round 2: 5×3 (1 empty)
  18: { cols: 6, rows: 3 },   // Round 3: 6×3 (fills grid)
  // 4 rows - gradual increase
  22: { cols: 6, rows: 4 },   // Round 4: 6×4 (2 empty)
  24: { cols: 6, rows: 4 },   // Round 5: 6×4 (fills grid)
  26: { cols: 7, rows: 4 },   // Round 6: 7×4 (2 empty)
  28: { cols: 7, rows: 4 },   // Round 7: 7×4 (fills grid)
  30: { cols: 8, rows: 4 },   // Round 8: 8×4 (2 empty)
  32: { cols: 8, rows: 4 },   // Round 9-15: 8×4 (fills grid)
};

// MOBILE: Optimized for portrait - fewer columns, more rows = BIGGER cards
// IMPORTANT: Cards must get smaller (or stay same) as levels increase, never bigger!
// 4 columns = ~100px cards (sweet spot for mobile)
const GRID_LAYOUTS_MOBILE: Record<number, { cols: number; rows: number }> = {
  12: { cols: 3, rows: 4 },   // Round 1: 3×4 (~130px cards)
  14: { cols: 3, rows: 5 },   // Round 2: 3×5 (~130px cards, 1 empty)
  18: { cols: 3, rows: 6 },   // Round 3: 3×6 (~130px cards)
  22: { cols: 4, rows: 6 },   // Round 4: 4×6 (~100px cards, 2 empty)
  24: { cols: 4, rows: 6 },   // Round 5: 4×6 (~100px cards)
  26: { cols: 4, rows: 7 },   // Round 6: 4×7 (~100px cards, 2 empty)
  28: { cols: 4, rows: 7 },   // Round 7: 4×7 (~100px cards)
  30: { cols: 4, rows: 8 },   // Round 8: 4×8 (~100px cards, 2 empty) - NOT 5×6!
  32: { cols: 4, rows: 8 },   // Round 9-15: 4×8 (~100px cards)
};

// Get optimal grid layout for a card count
function getGridLayout(cardCount: number, isMobile: boolean): { cols: number; rows: number } {
  const layouts = isMobile ? GRID_LAYOUTS_MOBILE : GRID_LAYOUTS_DESKTOP;

  // Direct lookup for known card counts
  if (layouts[cardCount]) {
    return layouts[cardCount];
  }
  // Fallback: calculate based on orientation
  const sqrt = Math.sqrt(cardCount);
  if (isMobile) {
    // Portrait: fewer columns, more rows
    const cols = Math.ceil(sqrt * 0.75);
    const rows = Math.ceil(cardCount / cols);
    return { cols, rows };
  } else {
    // Landscape: more columns, fewer rows
    const cols = Math.ceil(sqrt * 1.5);
    const rows = Math.ceil(cardCount / cols);
    return { cols, rows };
  }
}

// Enhancement 23: Theme-specific callouts based on NFT Base attribute
const THEME_CALLOUTS: Record<string, string[]> = {
  'Alien Baddie': ['👽 Aliens Unite!', '🛸 Cosmic Match!', '✨ Out of This World!'],
  'Alien Waifu': ['💫 Stellar Memory!', '🌟 Space Brain!', '🚀 Galactic!'],
  'Bepe Baddie': ['🐸 Bepe Power!', '💎 Rare Find!', '👑 Legendary Bepe!'],
  'Bepe Waifu': ['🐸 Kawaii Bepe!', '✨ Bepe-tastic!', '💖 UwU Match!'],
  'Wojak': ['😏 Wojak Approved!', '🧠 Big Brain!', '💪 Based Match!'],
  'default': ['🎯 Nice Match!', '🔥 Keep Going!', '⭐ Memory Master!'],
};

// Get a random themed callout based on NFT's Base attribute
const getThemedCallout = (attributes?: { trait_type: string; value: string }[]): string => {
  const baseAttr = attributes?.find(attr => attr.trait_type === 'Base');
  const baseName = baseAttr?.value || 'default';
  const phrases = THEME_CALLOUTS[baseName] || THEME_CALLOUTS.default;
  return phrases[Math.floor(Math.random() * phrases.length)];
};

const MemoryMatch: React.FC = () => {
  const { playCardHover, playCardFlip, playMatchFound, playMismatch, playNearCompletion, playFastMatchBonus, playWinSound, playGameOver, playLevelUp, playWarning, playWojakChime } = useGameSounds();
  const { hapticCombo, hapticHighScore, hapticGameOver, hapticLevelUp, hapticMismatch, hapticHover, hapticUrgencyTick, hapticWarning, hapticButton } = useGameHaptics();
  const isMobile = useIsMobile();

  // Visual effects system
  const {
    effects,
    triggerBigMoment,
    updateCombo,
    resetCombo,
    triggerConfetti,
    showEpicCallout,
    resetAllEffects,
    triggerScreenShake: triggerGlobalScreenShake,
    triggerVignette,
  } = useGameEffects();

  // Global leaderboard hook
  const {
    leaderboard: globalLeaderboard,
    submitScore,
    isSignedIn,
    isAuthLoaded,
    userDisplayName,
    isSubmitting,
  } = useLeaderboard('memory-match');

  // Background music controls (useAudio provides global audio state)
  useAudio();

  // Arcade frame shared mute state and pause state (for quit dialog)
  const { isMuted: arcadeMuted, musicManagedExternally, gameStarted, isPaused: isContextPaused } = useGameMute();

  // Arcade lights control
  const { triggerEvent, setGameId } = useArcadeLights();

  // Register this game for per-game light overrides
  useEffect(() => {
    setGameId('memory-match');
  }, [setGameId]);

  const [gameState, setGameState] = useState<'idle' | 'loading' | 'playing' | 'roundComplete' | 'gameover'>('idle');
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);
  const [isChecking, setIsChecking] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // Pause timer when tab is hidden
  const [metadata, setMetadata] = useState<NFTMetadata[]>([]);
  const [gameScreenshot, setGameScreenshot] = useState<string | null>(null);

  // Pre-computed filter data for instant level loading
  interface FilterData {
    filters: Record<string, {
      type: string;
      count: number;
      nftIds: number[];
      traits?: Record<string, string | string[]>;
    }>;
    levelOrder: string[];
  }
  const [filterData, setFilterData] = useState<FilterData | null>(null);
  
  // Track last 3 filters used for random selection (prevents repeats)
  const lastFiltersRef = useRef<string[]>([]);
  
  // Track previous round's NFT IDs for smart exclusion
  const previousRoundNftIdsRef = useRef<number[]>([]);

  // Progressive rounds
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  
  // NEW: Real-time scoring within current round
  const [roundScore, setRoundScore] = useState(0);
  
  // NEW: Track total matches across all rounds for leaderboard minimum check
  const [totalMatchesFound, setTotalMatchesFound] = useState(0);
  
  // NEW: Track which NFT IDs have been seen (for known-pair penalty)
  // When both cards of a pair have been seen, mismatching with either = penalty
  const seenCardsRef = useRef<Set<number>>(new Set());
  const knownPairsRef = useRef<Set<number>>(new Set()); // NFT IDs where both cards have been seen

  // Streak tracking for combo effects
  const [streak, setStreak] = useState(0);
  const [lastMatchTime, setLastMatchTime] = useState<number | null>(null);

  // Visual juice states
  const [isFrozen, setIsFrozen] = useState(false);
  const [showNearWinShimmer, setShowNearWinShimmer] = useState(false);
  const [timelineCelebrating, setTimelineCelebrating] = useState(false);


  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('memoryMatchHighScore') || '0', 10);
  });
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('memoryMatchSoundEnabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Background music refs
  const playlistIndexRef = useRef(Math.floor(Math.random() * MUSIC_PLAYLIST.length));
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundEnabledRef = useRef(soundEnabled);
  const gameStateRefForMusic = useRef(gameState);
  
  // Keep refs in sync
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { gameStateRefForMusic.current = gameState; }, [gameState]);

  // Refs for timer (to avoid score dependencies in timer useEffect)
  const totalScoreRef = useRef(totalScore);
  const highScoreRef = useRef(highScore);
  const roundRef = useRef(round);
  const totalMatchesFoundRef = useRef(totalMatchesFound);
  const scoreSubmittedRef = useRef(scoreSubmitted);
  const isSignedInRef = useRef(isSignedIn);
  const isAuthLoadedRef = useRef(isAuthLoaded);
  const submitScoreRef = useRef(submitScore);
  useEffect(() => { totalScoreRef.current = totalScore; }, [totalScore]);
  useEffect(() => { highScoreRef.current = highScore; }, [highScore]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { totalMatchesFoundRef.current = totalMatchesFound; }, [totalMatchesFound]);
  useEffect(() => { scoreSubmittedRef.current = scoreSubmitted; }, [scoreSubmitted]);
  useEffect(() => { isSignedInRef.current = isSignedIn; }, [isSignedIn]);
  useEffect(() => { isAuthLoadedRef.current = isAuthLoaded; }, [isAuthLoaded]);
  useEffect(() => { submitScoreRef.current = submitScore; }, [submitScore]);

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
    const music = new Audio(track.src);
    music.volume = 1.0;
    music.addEventListener('ended', () => {
      playlistIndexRef.current = (playlistIndexRef.current + 1) % MUSIC_PLAYLIST.length;
      if (gameStateRefForMusic.current === 'playing' && soundEnabledRef.current) {
        playMusicTrack(playlistIndexRef.current);
      }
    }, { once: true });
    musicAudioRef.current = music;
    if (soundEnabledRef.current) {
      music.play().catch(() => {});
    }
  }, []);

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

  // Visibility change handling - pause timer and music when browser goes to background
  const wasPlayingBeforeHiddenRef = useRef(false);
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - pause timer and music
        setIsPaused(true);
        wasPlayingBeforeHiddenRef.current = !!(musicAudioRef.current && !musicAudioRef.current.paused);
        if (musicAudioRef.current) {
          musicAudioRef.current.pause();
        }
      } else {
        // Page became visible - resume timer and music
        setIsPaused(false);
        if (wasPlayingBeforeHiddenRef.current && gameStateRefForMusic.current === 'playing' && soundEnabledRef.current && !musicManagedExternallyRef.current) {
          if (musicAudioRef.current) {
            musicAudioRef.current.play().catch(() => {});
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also handle pagehide for when tab/browser is closed (especially on iOS Safari)
    const handlePageHide = () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current = null;
      }
    };
    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  // Control music based on game state and sound enabled
  useEffect(() => {
    if (gameState === 'playing' && soundEnabled) {
      if (musicAudioRef.current) {
        musicAudioRef.current.play().catch(() => {});
      }
    } else {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
      }
    }
  }, [gameState, soundEnabled]);

  // Sync with arcade frame mute button (from GameMuteContext)
  useEffect(() => {
    if (!musicManagedExternally) {
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
    }
  }, [arcadeMuted, musicManagedExternally, gameState]);

  // Track total time for current round (for urgency system)
  const [roundTotalTime, setRoundTotalTime] = useState(40);

  // Window size for responsive grid calculation
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Time urgency system - plays escalating warning sounds
  const { urgencyLevel } = useTimeUrgency({
    timeLeft,
    totalTime: roundTotalTime,
    isPlaying: gameState === 'playing',
    soundEnabled,
  });

  // Navigation guard - prevents accidental exits during gameplay
  const { showExitDialog, confirmExit, cancelExit } = useGameNavigationGuard({
    isPlaying: gameState === 'playing',
  });

  // Mobile fullscreen mode - hide navigation and lock scroll for all active game states
  // This includes: loading, playing, roundComplete, gameover (everything except idle)
  useEffect(() => {
    const isActiveGameState = gameState !== 'idle';
    if (isMobile && isActiveGameState) {
      document.body.classList.add('game-fullscreen-mode');
      // Lock body scroll during gameplay to prevent accidental scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      document.body.classList.remove('game-fullscreen-mode');
      // Restore body scroll
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
  }, [isMobile, gameState]);

  // Get current round config (cycle back if beyond defined rounds)
  // Time increases by 20% each round
  // Get round configuration with time based on new formulas
  // Levels 1-9: Fixed times from LEVEL_TIMES array
  // Levels 10-39: 146 - (round - 9) = starts at 145s, decreases by 1s per level
  // Levels 40+: 116 - (round - 39) * 0.5 = starts at 115.5s, decreases by 0.5s per level
  const getRoundConfig = (r: number): { pairs: number; time: number; filter?: string } => {
    let time: number;
    
    if (r <= 9) {
      // Levels 1-9: Use pre-calculated times
      time = LEVEL_TIMES[r - 1];
    } else if (r <= 39) {
      // Levels 10-39: Start at 145s, decrease by 1s per level
      time = 146 - (r - 9);
    } else {
      // Levels 40+: Start at 115.5s, decrease by 0.5s per level (no floor)
      time = 116 - (r - 39) * 0.5;
    }
    
    // Get config (use last defined config for levels 40+)
    if (r <= ROUND_CONFIG.length) {
      const config = ROUND_CONFIG[r - 1];
      return { ...config, time };
    } else {
      // Level 40+: Use random filter
      return { pairs: 16, filter: getRandomFilter(), time };
    }
  };

  // Preloaded cards for instant next game
  const preloadedCardsRef = useRef<Card[] | null>(null);
  const isPreloadingRef = useRef(false);

  // Track flipped cards with ref to avoid race conditions with rapid clicks
  const flippedCardsRef = useRef<number[]>([]);
  // Debounce rapid clicks - track last click time
  const lastClickTimeRef = useRef<number>(0);
  const CLICK_DEBOUNCE_MS = 200; // Minimum ms between flips - prevents rushing through cards
  // Ref to track current cards state (avoids stale closures in timeouts)
  const cardsRef = useRef<Card[]>([]);
  // Track anticipation mode to avoid DOM queries on every timer tick
  const anticipationModeRef = useRef<'none' | 'struggling' | 'near-win-2' | 'near-win-1'>('none');

  // Load metadata and filter data on mount
  useEffect(() => {
    const loadData = async () => {
      // Load metadata - use preloader cache if available (instant load)
      if (isPreloaderReady()) {
        const cachedNfts = getAllNfts();
        if (cachedNfts.length > 0) {
          setMetadata(cachedNfts);
        }
      } else {
        // Preloader not ready - initialize it (also caches for future)
        try {
          await initGalleryPreloader();
          const nfts = getAllNfts();
          if (nfts.length > 0) {
            setMetadata(nfts);
          } else {
            // Fallback to direct fetch if preloader failed
            const res = await fetch('/assets/nft-data/metadata.json');
            const data = await res.json();
            setMetadata(data);
          }
        } catch (err) {
          console.error('Failed to load metadata:', err);
        }
      }

      // Load pre-computed filter data for instant level loading
      try {
        const filterRes = await fetch('/assets/nft-data/memory-match-filters.json');
        const filters = await filterRes.json();
        setFilterData(filters);
      } catch (err) {
        console.error('Failed to load filter data:', err);
        // Game can still work without filter data using fallback
      }
    };

    loadData();
  }, []);

  // Get random filter for levels 40+ (excludes last 3 used filters)
  const getRandomFilter = useCallback((): string => {
    if (!filterData) {
      // Fallback if filter data not loaded
      return ROUND_CONFIG[ROUND_CONFIG.length - 1].filter || '';
    }
    
    const allFilters = Object.keys(filterData.filters);
    const available = allFilters.filter(f => !lastFiltersRef.current.includes(f));
    const selected = available[Math.floor(Math.random() * available.length)] || allFilters[0];
    
    // Update tracking (keep last 3)
    lastFiltersRef.current = [...lastFiltersRef.current.slice(-2), selected];
    return selected;
  }, [filterData]);

  // Create cards for a round using pre-computed filter data when available
  const shuffleCards = useCallback((pairsCount: number, filterName?: string, excludeNftIds: number[] = []) => {
    if (metadata.length === 0) return [];

    let availableNftIds: number[];

    // Try to use pre-computed filter data for instant loading
    if (filterData && filterName && filterData.filters[filterName]) {
      const filter = filterData.filters[filterName];
      availableNftIds = filter.nftIds.filter(id => !excludeNftIds.includes(id));
      
      // Smart exclusion: only exclude if enough remain after exclusion
      if (availableNftIds.length < pairsCount && filter.nftIds.length >= pairsCount) {
        // Not enough after exclusion, skip exclusion for this round
        availableNftIds = [...filter.nftIds];
      }
      
      // If still not enough (shouldn't happen), fall back to random
      if (availableNftIds.length < pairsCount) {
        console.warn(`[MemoryMatch] Filter ${filterName} has insufficient NFTs, falling back to random`);
        availableNftIds = metadata.map(nft => nft.edition).filter(id => !excludeNftIds.includes(id));
      }
    } else {
      // No filter or filter data not loaded - use all metadata (fallback behavior)
      availableNftIds = metadata.map(nft => nft.edition).filter(id => !excludeNftIds.includes(id));
    }

    // Fisher-Yates shuffle for proper randomization
    const shuffledIds = [...availableNftIds];
    for (let i = shuffledIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIds[i], shuffledIds[j]] = [shuffledIds[j], shuffledIds[i]];
    }
    const selectedIds = shuffledIds.slice(0, pairsCount);
    
    // Store for smart exclusion in next round
    previousRoundNftIdsRef.current = selectedIds;

    // Map IDs to metadata
    const metadataMap = new Map(metadata.map(nft => [nft.edition, nft]));
    const cardPairs: Card[] = [];

    selectedIds.forEach((nftId, index) => {
      const nft = metadataMap.get(nftId);
      if (!nft) return;
      
      // Create pair
      cardPairs.push({
        id: index * 2,
        nftId: nft.edition,
        name: nft.name,
        image: nft.image,
        isFlipped: false,
        isMatched: false,
      });
      cardPairs.push({
        id: index * 2 + 1,
        nftId: nft.edition,
        name: nft.name,
        image: nft.image,
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle cards
    for (let i = cardPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]];
    }

    return cardPairs;
  }, [metadata, filterData]);

  const preloadImages = (cards: Card[]): Promise<void[]> => {
    // Get unique images (each NFT appears twice)
    const uniqueImages = [...new Set(cards.map(c => c.image))];

    return Promise.all(
      uniqueImages.map(src => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Resolve anyway to not block
          img.src = src;
        });
      })
    );
  };

  // Preload next round's cards in the background
  const preloadNextRound = useCallback(async (nextRound: number, currentNftIds: number[] = []) => {
    if (isPreloadingRef.current || metadata.length === 0) return;

    isPreloadingRef.current = true;

    const config = getRoundConfig(nextRound);
    const nextCards = shuffleCards(config.pairs, config.filter, currentNftIds);

    if (nextCards.length > 0) {
      await preloadImages(nextCards);
      preloadedCardsRef.current = nextCards;
    }

    isPreloadingRef.current = false;
  }, [metadata, shuffleCards]);

  // Preload first round when metadata is ready and we're on idle screen
  useEffect(() => {
    if (metadata.length > 0 && gameState === 'idle' && !preloadedCardsRef.current) {
      preloadNextRound(1);
    }
  }, [metadata, gameState, preloadNextRound]);

  // Start game when user clicks PLAY in arcade frame (gameStarted becomes true)
  useEffect(() => {
    if (gameStarted && metadata.length > 0 && gameState === 'idle') {
      startGame();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, metadata]);

  // Start a new game from round 1
  const startGame = async () => {
    if (metadata.length === 0) {
      setGameState('loading');
      return;
    }

    // Haptic only - music will be added via GameModal
    hapticButton(); // Light tap on game start
    // Start music on user gesture (required for mobile browsers)
    // Skip if GameModal manages the music (check both ref AND current context value for safety)
    if (!musicAudioRef.current && !musicManagedExternallyRef.current && !musicManagedExternally) {
      playNextMusicTrack();
    }

    setRound(1);
    setTotalScore(0);
    setTotalMatchesFound(0); // NEW: Reset for leaderboard minimum check
    setScoreSubmitted(false);
    scoreSubmittedRef.current = false; // Reset ref for new game
    setIsNewPersonalBest(false);
    await startRound(1, true);
  };

  // Start a specific round
  const startRound = async (roundNum: number, _isNewGame: boolean = false) => {
    setGameState('loading');

    const config = getRoundConfig(roundNum);
    let newCards: Card[];

    // Use preloaded cards if available and it's the right round
    if (preloadedCardsRef.current && preloadedCardsRef.current.length === config.pairs * 2) {
      newCards = preloadedCardsRef.current;
      preloadedCardsRef.current = null;
    } else {
      newCards = shuffleCards(config.pairs, config.filter);
      await preloadImages(newCards);
    }

    setCards(newCards);
    setFlippedCards([]);
    flippedCardsRef.current = []; // Reset ref too
    lastClickTimeRef.current = 0; // Reset debounce timer
    setMoves(0);
    setMatches(0);
    setTimeLeft(config.time);
    setRoundTotalTime(config.time); // Track total time for urgency system
    setIsChecking(false);
    // Reset streak and effects for new round
    setStreak(0);
    setLastMatchTime(null);
    resetAllEffects();
    
    // NEW: Reset round-specific tracking for scoring
    setRoundScore(0);
    seenCardsRef.current = new Set();
    knownPairsRef.current = new Set();
    
    setGameState('playing');
    // Arcade lights: Round started
    triggerEvent('play:active');

    // Preload next round in background
    const currentNftIds = [...new Set(newCards.map(c => c.nftId))];
    preloadNextRound(roundNum + 1, currentNftIds);
  };

  // Continue to next round after completing current one
  const nextRound = async () => {
    // Play level up sound + haptic
    playLevelUp();
    hapticLevelUp();

    const newRound = round + 1;
    setRound(newRound);
    await startRound(newRound);
  };

  // Calculate round completion bonuses (time + completion)
  // NOTE: Match points are now added in real-time, so this only calculates BONUSES
  const calculateCompletionBonuses = () => {
    // Percentage-based time bonus: % of time remaining = % bonus on round score
    const timePercentage = timeLeft / roundTotalTime;
    const timeBonus = Math.floor(roundScore * timePercentage);
    
    // Completion bonus: 10% of round score
    const completionBonus = Math.floor(roundScore * 0.1);
    
    return { timeBonus, completionBonus, total: timeBonus + completionBonus };
  };
  
  // Add completion bonuses to total when round is completed
  const completeRound = () => {
    playWinSound();
    hapticHighScore(); // Strong haptic for round completion
    // Arcade lights: Escalating round complete celebration
    if (round <= 5) {
      // Early rounds (1-5): quick flash
      triggerEvent('game:win');
    } else if (round <= 10) {
      // Mid rounds (6-10): bigger explode
      triggerEvent('progress:complete');
    } else {
      // Late rounds (11-15): full fireworks
      triggerEvent('level:up');
    }
    triggerConfetti();
    showEpicCallout('🧠 PERFECT MEMORY!');
    
    // Calculate and apply completion bonuses
    const bonuses = calculateCompletionBonuses();
    setTotalScore(prev => prev + bonuses.total);
    
    setGameState('roundComplete');
  };

  // Auto-submit score to global leaderboard (for signed-in users)
  // NOTE: This is now a FALLBACK - primary submission happens synchronously in timer callback
  const submitScoreGlobal = useCallback(async (finalScore: number, finalRound: number, matchesFound: number) => {
    // Check ref first to prevent race conditions with synchronous submission
    if (scoreSubmittedRef.current) return;
    
    // NEW: Check minimum actions (3 matches) for leaderboard eligibility
    if (!isSignedIn || scoreSubmitted || matchesFound < 3) return;

    // Update local high score (only if positive score)
    if (finalScore > highScore && finalScore > 0) {
      setHighScore(finalScore);
      localStorage.setItem('memoryMatchHighScore', String(finalScore));
    }

    // Don't submit negative or zero scores to leaderboard
    if (finalScore <= 0) return;

    scoreSubmittedRef.current = true; // Set ref immediately to prevent race conditions
    setScoreSubmitted(true);
    const result = await submitScore(finalScore, finalRound, {
      roundsCompleted: finalRound - 1,
      matchesFound,
    });

    if (result.success) {
      if (result.isNewHighScore) {
        setIsNewPersonalBest(true);
      }
    } else {
      console.error('[MemoryMatch] Failed to submit score:', result.error);
    }
  }, [isSignedIn, scoreSubmitted, submitScore, highScore]);

  // Map global leaderboard for display
  // Retry start when metadata loads
  useEffect(() => {
    if (gameState === 'loading' && metadata.length > 0 && cards.length === 0) {
      startGame();
    }
  }, [metadata, gameState, cards.length]);

  // Keep flippedCardsRef in sync with state
  useEffect(() => {
    flippedCardsRef.current = flippedCards;
  }, [flippedCards]);

  // Keep cardsRef in sync with state (prevents stale closures in timeouts)
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  // Visual juice helper: Add temporary CSS class to card element
  const addCardAnimation = useCallback((cardId: number, className: string, duration: number) => {
    const cardEl = document.querySelector(`[data-card-id="${cardId}"]`);
    if (cardEl) {
      cardEl.classList.add(className);
      setTimeout(() => cardEl.classList.remove(className), duration);
    }
  }, []);

  // Visual juice helper: Trigger timeline celebration pulse
  const triggerTimelineCelebration = useCallback(() => {
    setTimelineCelebrating(true);
    setTimeout(() => setTimelineCelebrating(false), 400);
  }, []);

  // Visual juice helper: Trigger freeze frame (brief pause for impact)
  const triggerFreezeFrame = useCallback((duration: number = 60) => {
    setIsFrozen(true);
    setTimeout(() => setIsFrozen(false), duration);
  }, []);

  // Visual juice helper: Screen shake with variable intensity
  const triggerScreenShake = useCallback((streak: number) => {
    if (streak < 2) return;
    const container = document.querySelector('.mm-game-layout');
    if (!container) return;

    const shakeClass = streak >= 3 ? 'screen-shake-strong' : 'screen-shake-mild';
    container.classList.add(shakeClass);
    setTimeout(() => container.classList.remove(shakeClass), 200);
  }, []);

  // Share score handler - generates scorecard image and downloads it
  const handleShare = useCallback(async () => {
    try {
      // Generate the scorecard image using the new GameScorecard generator
      const blob = await generateGameScorecard({
        gameName: 'Memory Match',
        gameNameParts: ['MEMORY', 'MATCH'],
        score: totalScore,
        scoreLabel: 'points',
        bestScore: highScore,
        isNewRecord: isNewPersonalBest,
        screenshot: gameScreenshot,
        accentColor: '#10b981', // Memory Match emerald accent
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `memory-match-${totalScore}.png`;
      link.href = url;
      link.click();

      // Clean up
      URL.revokeObjectURL(url);

      // Try to also share via Web Share API if available
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'memory-match-score.png', { type: 'image/png' });
        const shareData = {
          title: 'Memory Match Score',
          text: `🧠 I scored ${totalScore} points in Memory Match (Round ${round})! Can you beat me?`,
          files: [file],
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
        }
      }
    } catch (err) {
      console.error('Failed to generate share image:', err);
      // Fallback to text share
      const shareText = `🧠 Memory Match: ${totalScore} points (Round ${round})!\n\nCan you beat my score?\n\nhttps://wojak.ink/games`;
      if (navigator.share) {
        await navigator.share({ title: 'Memory Match', text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
      }
    }
  }, [totalScore, highScore, isNewPersonalBest, gameScreenshot, round]);

  // Helper to flip a card (used by handleCardClick and queue processing)
  const flipCard = (cardId: number) => {
    const currentFlipped = flippedCardsRef.current;

    // Safety check: prevent flipping if already in flipped array or already 2 cards flipped
    if (currentFlipped.includes(cardId) || currentFlipped.length >= 2) {
      return currentFlipped;
    }

    // Safety check: prevent flipping if card is already flipped in state
    const card = cardsRef.current.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) {
      return currentFlipped;
    }

    // Play flip sound + haptic
    playCardFlip();
    hapticButton();
    // Arcade lights: Card flip (subtle)
    triggerEvent('score:tiny');

    // Update ref IMMEDIATELY (synchronous)
    const newFlipped = [...currentFlipped, cardId];
    flippedCardsRef.current = newFlipped;

    // Flip the card in state
    setCards(prev =>
      prev.map(c => (c.id === cardId ? { ...c, isFlipped: true } : c))
    );
    setFlippedCards(newFlipped);
    
    // NEW: Track that this card's NFT has been seen
    // If both cards of a pair have been seen, add to knownPairs
    const nftId = card.nftId;
    if (seenCardsRef.current.has(nftId)) {
      // Second card of this pair has been revealed - it's now a "known pair"
      knownPairsRef.current.add(nftId);
    } else {
      // First time seeing this NFT
      seenCardsRef.current.add(nftId);
    }

    // Enhancement 11: Squash animation when flip lands (after flip transition)
    setTimeout(() => addCardAnimation(cardId, 'flip-landed', 120), 250);

    return newFlipped;
  };

  const handleCardClick = (cardId: number) => {
    if (gameState !== 'playing') return;

    // Block clicks while checking - no queueing to prevent rushing
    if (isChecking) return;

    // Debounce rapid clicks - enforces pacing between flips
    const now = Date.now();
    if (now - lastClickTimeRef.current < CLICK_DEBOUNCE_MS) return;
    lastClickTimeRef.current = now;

    // Use ref for immediate, synchronous checks to prevent race conditions
    const currentFlipped = flippedCardsRef.current;

    // Prevent clicking same card twice or more than 2 cards
    if (currentFlipped.includes(cardId)) return;
    if (currentFlipped.length >= 2) return;

    // Check card state from cardsRef (not state) to avoid stale closure issues
    const currentCards = cardsRef.current;
    const card = currentCards.find(c => c.id === cardId);
    if (!card || card.isMatched) return;

    // Additional safety: if card shows as flipped but not in our tracking, skip it
    // Also skip if already flipped (even if in our tracking - prevents double-flip race condition)
    if (card.isFlipped) return;

    // Flip the card
    const newFlipped = flipCard(cardId);

    // Check for match when 2 cards are flipped
    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setIsChecking(true);

      const [firstId, secondId] = newFlipped;

      // Find cards using cardsRef to ensure we have latest state (avoids stale closure)
      const currentCardsForMatch = cardsRef.current;
      const firstCard = currentCardsForMatch.find(c => c.id === firstId);
      const secondCard = currentCardsForMatch.find(c => c.id === secondId);

      // Safety check: both cards must exist and have different IDs (not same card clicked twice)
      if (!firstCard || !secondCard || firstId === secondId) {
        // Invalid state - reset
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          flippedCardsRef.current = [];
          setFlippedCards([]);
          setIsChecking(false);
        }, 300);
        return;
      }

      if (firstCard.nftId === secondCard.nftId) {
        // Match found!
        // Capture config values BEFORE setTimeout to avoid closure issues
        const config = getRoundConfig(round);
        const totalPairs = config.pairs;
        const pairsForMilestone = Math.floor(totalPairs * 0.75);
        // Calculate new streak before setTimeout to use in sound
        const newStreak = streak + 1;
        
        // NEW: Calculate points immediately (not at round end)
        // Base: +10 per match, Streak bonus: +2 per streak level
        const streakBonus = newStreak * 2;
        const matchPoints = 10 + streakBonus;

        setTimeout(() => {
          try {
            playMatchFound(newStreak); // Pass streak for escalating sounds
            hapticCombo(newStreak); // Streak-based escalating haptic
            // Arcade lights: Match found with streak tier
            const streakTier = GAME_COMBO_TIERS['memory-match'](newStreak);
            if (streakTier !== 'start') {
              triggerEvent(`combo:${streakTier}` as GameEvent);
            } else {
              triggerEvent('score:medium'); // Base match
            }
          } catch {
            // Sound/haptic errors shouldn't break the game
          }

          try {
            // Enhancement 17: Freeze frame for impact
            triggerFreezeFrame(60);

            // Enhancement 12: Match pop animation with glow - faster
            addCardAnimation(firstId, 'match-pop', 280);
            addCardAnimation(secondId, 'match-pop', 280);

            // Enhancement 15: Timeline celebration pulse
            triggerTimelineCelebration();

            // Enhancement 21-22: Variable intensity screen shake
            triggerScreenShake(newStreak);

            setCards(prev =>
              prev.map(c =>
                c.id === firstId || c.id === secondId
                  ? { ...c, isMatched: true }
                  : c
              )
            );

            // Update streak and combo
            setStreak(newStreak);
            updateCombo();
            
            // NEW: Update round score and total score in REAL-TIME
            setRoundScore(prev => prev + matchPoints);
            setTotalScore(prev => prev + matchPoints);
            setTotalMatchesFound(prev => prev + 1);
            
            // Remove this NFT from knownPairs since it's now matched
            knownPairsRef.current.delete(firstCard.nftId);

            // Calculate time bonus for fast matches
            const now = Date.now();
            const timeSinceLastMatch = lastMatchTime ? now - lastMatchTime : 999999;
            const isFastMatch = timeSinceLastMatch < 2500;
            setLastMatchTime(now);

            // Trigger visual effects
            try {
              triggerBigMoment({
                shockwave: true,
                sparks: newStreak >= 2,
                shake: newStreak >= 4,
                vignette: newStreak >= 5,
                emoji: newStreak >= 3 ? '🔥' : '✨',
                score: isFastMatch ? `FAST +${matchPoints}` : `+${matchPoints}`,
              });

              // Fast match bonus callout and sound
              if (isFastMatch) {
                playFastMatchBonus(); // Extra "zing" sound layer
                // Arcade lights: Fast match bonus
                triggerEvent('score:large');
                if (newStreak >= 2) {
                  setTimeout(() => showEpicCallout('⚡ SPEED BONUS!'), 400);
                }
              }
            } catch {
              // Visual effects errors shouldn't break the game
            }

            // Update match count - CRITICAL for game completion
            setMatches(prev => {
              const newMatches = prev + 1;
              const remainingPairs = totalPairs - newMatches;

              // Enhancement 24: Contextual progress milestones
              try {
                const halfwayPoint = Math.floor(totalPairs / 2);
                if (newMatches === halfwayPoint) {
                  // Halfway milestone with progress numbers
                  setTimeout(() => showEpicCallout(`🎯 ${newMatches}/${totalPairs} - Halfway!`), 500);
                } else if (newMatches === pairsForMilestone) {
                  // 75% milestone with progress numbers
                  setTimeout(() => showEpicCallout(`🔥 ${newMatches}/${totalPairs} - Almost There!`), 500);
                }

                // Enhancement 23: Theme-specific callouts for streaks
                if (newStreak === 2) {
                  // Show themed callout on 2-streak (use firstCard's attributes)
                  const nftData = metadata.find(m => m.edition === firstCard.nftId);
                  const themedCallout = getThemedCallout(nftData?.attributes);
                  setTimeout(() => showEpicCallout(themedCallout), 400);
                } else if (newStreak >= 3) {
                  // Extra celebration for 3+ streak
                  setTimeout(() => showEpicCallout(`🔥 ${newMatches}/${totalPairs} - On Fire!`), 400);
                }

                // Near-completion anticipation sound (2 or 1 pairs remaining)
                if (remainingPairs === 2 || remainingPairs === 1) {
                  playNearCompletion(remainingPairs);
                }

                // Enhancement 16: Near-win shimmer for 1 pair remaining
                if (remainingPairs === 1) {
                  setShowNearWinShimmer(true);
                }
              } catch {
                // Callout errors shouldn't break match counting
              }
              return newMatches;
            });
          } catch (e) {
            console.error('Error in match handler:', e);
          } finally {
            // ALWAYS reset state to allow more clicks
            flippedCardsRef.current = [];
            setFlippedCards([]);
            setIsChecking(false);
          }
        }, 280); // Reduced from 500ms for instant-feeling matches
      } else {
        // No match - play mismatch sound/haptic immediately, then flip back
        playMismatch();
        hapticMismatch(); // Double-pulse error pattern
        // Arcade lights: Mismatch warning
        triggerEvent('miss:light');

        // Enhancement 14: Wobble animation before flip back (faster for snappy feel)
        addCardAnimation(firstId, 'mismatch-wobble', 200);
        addCardAnimation(secondId, 'mismatch-wobble', 200);
        
        // NEW: Known-pair penalty - if either card's NFT is a "known pair" (both cards seen), apply -1
        // This means the player saw both cards of a pair at some point but still mismatched
        const firstIsKnown = knownPairsRef.current.has(firstCard.nftId);
        const secondIsKnown = knownPairsRef.current.has(secondCard.nftId);
        if (firstIsKnown || secondIsKnown) {
          // Apply -1 penalty immediately - negative scores are allowed
          setRoundScore(prev => prev - 1);
          setTotalScore(prev => prev - 1);
          
          // Visual feedback for penalty
          try {
            triggerBigMoment({
              shake: true,
              emoji: '😬',
              score: '-1',
            });
          } catch {
            // Visual effects errors shouldn't break the game
          }
        }

        // Reset streak on mismatch immediately
        setStreak(0);
        resetCombo();

        // Cards flip back after animation (600ms)
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          // Unlock input after cards flip back - prevents rushing
          flippedCardsRef.current = [];
          setFlippedCards([]);
          setIsChecking(false);
        }, 600);
      }
    }
  };

  // Check round completion - all pairs matched
  useEffect(() => {
    const config = getRoundConfig(round);
    if (matches === config.pairs && gameState === 'playing') {
      completeRound();
    }
  }, [matches, gameState, round]);

  // Timer - time out = game over (pause when exit dialog shown, quit dialog shown, or tab hidden)
  useEffect(() => {
    if (gameState !== 'playing' || showExitDialog || isPaused || isContextPaused) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Capture screenshot BEFORE changing game state (cards disappear after state change)
          // Temporarily remove transform from cards grid for proper capture
          const cardsGrid = document.querySelector('.mm-cards-grid') as HTMLElement;
          if (cardsGrid) {
            // Store original styles
            const originalTransform = cardsGrid.style.transform;
            const originalLeft = cardsGrid.style.left;
            const originalTop = cardsGrid.style.top;
            const originalPosition = cardsGrid.style.position;

            // Remove centering transform for capture
            cardsGrid.style.transform = 'none';
            cardsGrid.style.left = '0';
            cardsGrid.style.top = '0';
            cardsGrid.style.position = 'relative';

            captureGameArea(cardsGrid).then(screenshot => {
              // Restore original styles
              cardsGrid.style.transform = originalTransform;
              cardsGrid.style.left = originalLeft;
              cardsGrid.style.top = originalTop;
              cardsGrid.style.position = originalPosition;

              if (screenshot) setGameScreenshot(screenshot);
            });
          }
          // Stop background music immediately on death
          if (musicAudioRef.current) {
            musicAudioRef.current.pause();
            musicAudioRef.current = null;
          }
          playGameOver();
          hapticGameOver();
          // Unified game-over effects
          triggerGlobalScreenShake(GAME_OVER_SEQUENCE.shakeDuration);
          triggerVignette(GAME_OVER_SEQUENCE.vignetteColor);
          // Arcade lights: Game over (check for high score using refs to avoid dependency)
          if (totalScoreRef.current > highScoreRef.current) {
            triggerEvent('game:highScore');
            playWojakChime(); // Signature chime on new high score
          } else {
            triggerEvent('game:over');
          }
          
          // CRITICAL: Submit score SYNCHRONOUSLY here, not in useEffect
          // This ensures score is submitted even if modal closes quickly
          if (isSignedInRef.current && !scoreSubmittedRef.current && 
              totalMatchesFoundRef.current >= 3 && totalScoreRef.current > 0) {
            scoreSubmittedRef.current = true; // Prevent double submission
            setScoreSubmitted(true);
            submitScoreRef.current(totalScoreRef.current, roundRef.current, {
              roundsCompleted: roundRef.current - 1,
              matchesFound: totalMatchesFoundRef.current,
            }).then(result => {
              if (result.success && result.isNewHighScore) {
                setIsNewPersonalBest(true);
              } else if (!result.success) {
                console.error('[MemoryMatch] Failed to submit score:', result.error);
              }
            });
            // Update local high score
            if (totalScoreRef.current > highScoreRef.current) {
              setHighScore(totalScoreRef.current);
              localStorage.setItem('memoryMatchHighScore', String(totalScoreRef.current));
            }
          }
          
          setGameState('gameover');
          return 0;
        }
        // Play warning sound at 10, 5, 4, 3, 2, 1 seconds
        // Use Math.floor for 10s check to handle decimal times (e.g., 10.5s on level 40+)
        if (Math.floor(prev) === 10 || prev <= 5) {
          playWarning();
          hapticWarning();
          // Arcade lights: Timer warnings
          if (Math.floor(prev) === 10) {
            triggerEvent('timer:warning');
          } else if (prev <= 5) {
            triggerEvent('timer:critical');
          }
        }
        // Subtle urgency tick haptic in final 5 seconds
        if (prev <= 5) {
          hapticUrgencyTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  // NOTE: submitScore intentionally NOT in deps - we use refs and call it inside the callback
  // Adding submitScore would cause the timer to restart on every render, breaking the countdown
  }, [gameState, showExitDialog, isPaused, isContextPaused, playGameOver, playWarning, playWojakChime, hapticGameOver, hapticWarning, triggerEvent, triggerGlobalScreenShake, triggerVignette, hapticUrgencyTick]);

  // Auto-submit score for signed-in users when game ends (FALLBACK)
  useEffect(() => {
    if (gameState === 'gameover' && isSignedIn && !scoreSubmitted) {
      submitScoreGlobal(totalScore, round, totalMatchesFound);
    }
  }, [gameState, isSignedIn, totalScore, round, totalMatchesFound, scoreSubmitted, submitScoreGlobal]);

  // Enhancement 18-20: Anticipation states for remaining unmatched cards
  // OPTIMIZED: Only run DOM manipulation when anticipation mode actually changes
  useEffect(() => {
    if (gameState !== 'playing') {
      anticipationModeRef.current = 'none';
      return;
    }

    // Compute config inline to avoid initialization order issues
    const config = getRoundConfig(round);
    const remainingPairs = config.pairs - matches;
    const isStruggling = timeLeft <= 10 && remainingPairs > 3;

    // Compute the current mode
    let newMode: 'none' | 'struggling' | 'near-win-2' | 'near-win-1' = 'none';
    if (remainingPairs === 1) {
      newMode = 'near-win-1';
    } else if (remainingPairs === 2) {
      newMode = 'near-win-2';
    } else if (isStruggling) {
      newMode = 'struggling';
    }

    // Skip DOM manipulation if mode hasn't changed
    if (newMode === anticipationModeRef.current) return;
    anticipationModeRef.current = newMode;

    const unmatchedCards = document.querySelectorAll('.mm-card:not(.matched)');

    // Clear all anticipation classes first
    unmatchedCards.forEach(card => {
      card.classList.remove('anticipation-1', 'anticipation-2', 'near-win-highlight', 'struggle-shimmer');
    });

    // Apply appropriate classes based on state
    if (newMode === 'near-win-1') {
      unmatchedCards.forEach(card => {
        card.classList.add('anticipation-1', 'near-win-highlight');
      });
    } else if (newMode === 'near-win-2') {
      unmatchedCards.forEach(card => {
        card.classList.add('anticipation-2');
      });
    } else if (newMode === 'struggling') {
      unmatchedCards.forEach(card => {
        card.classList.add('struggle-shimmer');
      });
    }

    return () => {
      // Cleanup on unmount
      document.querySelectorAll('.mm-card').forEach(card => {
        card.classList.remove('anticipation-1', 'anticipation-2', 'near-win-highlight', 'struggle-shimmer');
      });
    };
  }, [gameState, round, matches, timeLeft]);

  // Reset near-win shimmer on round start
  useEffect(() => {
    if (gameState === 'playing') {
      setShowNearWinShimmer(false);
    }
  }, [round, gameState]);

  // Handle window resize and orientation changes for responsive grid
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      }, 150); // debounce
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const currentConfig = getRoundConfig(round);
  const requiredPairs = currentConfig.pairs;

  return (
    <>
      <div className={`memory-container ${gameState === 'playing' ? 'playing-mode' : ''} ${gameState === 'playing' ? getUrgencyClass(urgencyLevel) : ''}`}>
        <GameSEO
          gameName="Memory Match"
          gameSlug="memory"
          description="Test your memory with this classic card-matching game! Find all the pairs before time runs out across multiple challenging rounds."
          genre="Puzzle"
          difficulty="Easy"
        />

        {/* Animated background elements - only show on menu and game over */}
      {gameState !== 'playing' && gameState !== 'loading' && (
        <div className="memory-bg-elements">
          <div className="floating-brain fb-1">🧠</div>
          <div className="floating-brain fb-2">🧠</div>
          <div className="floating-brain fb-3">🧠</div>
          <div className="floating-brain fb-4">🧠</div>
          <div className="floating-brain fb-5">🧠</div>
          <div className="floating-brain fb-6">🧠</div>
          <div className="floating-brain fb-7">🧠</div>
          <div className="floating-brain fb-8">🧠</div>
          <div className="floating-brain fb-9">🧠</div>
          <div className="floating-brain fb-10">🧠</div>
          <div className="floating-brain fb-11">🧠</div>
          <div className="floating-brain fb-12">🧠</div>
        </div>
      )}

      <div className="memory-content">
        <div className="memory-area">
          {/* Main Menu removed - now handled by unified GameModal intro screen */}

          {gameState === 'loading' && (
            <div className="game-menu">
              <div className="loading-spinner" />
              <p className="game-desc">Loading NFTs...</p>
            </div>
          )}

          {/* Round Complete Screen */}
          {gameState === 'roundComplete' && (() => {
            const bonuses = calculateCompletionBonuses();
            // totalScore already includes bonuses from completeRound()
            const currentScore = totalScore;
            // Find where current score would rank
            const sortedLeaderboard = [...(globalLeaderboard || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
            let rank = sortedLeaderboard.findIndex(entry => currentScore > (entry.score || 0));
            if (rank === -1) rank = sortedLeaderboard.length;
            const aboveEntry = rank > 0 ? sortedLeaderboard[rank - 1] : null;
            const belowEntry = sortedLeaderboard[rank] || null;

            return (
              <div className="mm-round-complete">
                <div className="mm-round-complete-content">
                  <div className="mm-game-title-header">Memory Match</div>
                  <div className="mm-round-complete-emoji">🎉</div>
                  <div className="mm-round-complete-title">Round {round} Complete!</div>
                  <div className="mm-round-complete-points">
                    <div>Match points: {roundScore}</div>
                    <div>Time bonus ({Math.round((timeLeft / roundTotalTime) * 100)}%): +{bonuses.timeBonus}</div>
                    <div>Completion bonus (10%): +{bonuses.completionBonus}</div>
                  </div>
                  <div className="mm-round-complete-score">
                    <span className="mm-score-value">{currentScore}</span>
                    <span className="mm-score-label">total score</span>
                  </div>
                  <GameButton onClick={nextRound} className="mm-next-round-btn" size="lg">
                    Next Round →
                  </GameButton>

                  {/* Mini Leaderboard Preview */}
                  <div className="mm-mini-leaderboard">
                    <div className="mm-mini-leaderboard-title">Leaderboard Position</div>
                    {aboveEntry && (
                      <div className="mm-mini-entry above">
                        <span className="mm-mini-rank">#{rank}</span>
                        <span className="mm-mini-name">{aboveEntry.displayName || 'Anonymous'}</span>
                        <span className="mm-mini-score">{aboveEntry.score || 0}</span>
                      </div>
                    )}
                    <div className="mm-mini-entry current">
                      <span className="mm-mini-rank">#{rank + 1}</span>
                      <span className="mm-mini-name">You</span>
                      <span className="mm-mini-score">{currentScore}</span>
                    </div>
                    {belowEntry && (
                      <div className="mm-mini-entry below">
                        <span className="mm-mini-rank">#{rank + 2}</span>
                        <span className="mm-mini-name">{belowEntry.displayName || 'Anonymous'}</span>
                        <span className="mm-mini-score">{belowEntry.score || 0}</span>
                      </div>
                    )}
                    {!aboveEntry && !belowEntry && (
                      <div className="mm-mini-entry empty">
                        <span className="mm-mini-name">Be the first on the leaderboard!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Game Over - Uses shared component */}
          {gameState === 'gameover' && (
            <ArcadeGameOverScreen
              score={totalScore}
              highScore={highScore}
              scoreLabel="total points"
              isNewPersonalBest={isNewPersonalBest}
              isSignedIn={isSignedIn}
              isSubmitting={isSubmitting}
              scoreSubmitted={scoreSubmitted}
              userDisplayName={userDisplayName ?? undefined}
              leaderboard={globalLeaderboard}
              onPlayAgain={startGame}
              onShare={handleShare}
              accentColor="#10b981"
              meetsMinimumActions={totalMatchesFound >= 3}
              minimumActionsMessage="Find at least 3 matches to be on the leaderboard"
            />
          )}

          {gameState === 'playing' && (() => {
            const totalCards = cards.length;

            // === SIMPLE GRID CALCULATION ===
            // PRIORITY: BIGGEST POSSIBLE CARDS - only shrink when absolutely necessary
            // Cards should fill the arcade screen edge-to-edge
            // Strategy: Calculate card size based on level 1 (4×3 grid), use SAME size for all levels
            // Only shrink when physically impossible to fit at level 1 size

            // Get the optimal grid layout for this card count (different for mobile vs desktop)
            const { cols, rows } = getGridLayout(totalCards, isMobile);

            // Available space - different for mobile vs desktop
            // Mobile: Use MAXIMUM space - stats overlay is position:fixed so it overlaps
            // Desktop: FIT WITHIN THE ARCADE SCREEN (no clipping!)
            const availableWidth = isMobile
              ? windowSize.width - 12      // Mobile: nearly full width (6px padding each side)
              : windowSize.width * 0.64;   // Desktop: 64% of viewport width (arcade frame)

            const availableHeight = isMobile
              ? windowSize.height - 90     // Mobile: only reserve ~90px (bottom nav 70px + small buffer)
              : windowSize.height * 0.58;  // Desktop: 58% of viewport height (room for stats/timeline)

            // Small gap between cards
            const gap = isMobile ? 6 : 5;

            // FIRST: Calculate what card size would be for Level 1 (4×3 grid)
            const level1Cols = 4;
            const level1Rows = 3;
            const level1CardByWidth = Math.floor((availableWidth - (level1Cols - 1) * gap) / level1Cols);
            const level1CardByHeight = Math.floor((availableHeight - (level1Rows - 1) * gap) / level1Rows);
            const level1CardSize = Math.min(level1CardByWidth, level1CardByHeight);

            // THEN: Check if level 1 card size fits in current grid
            const neededWidth = cols * level1CardSize + (cols - 1) * gap;
            const neededHeight = rows * level1CardSize + (rows - 1) * gap;

            // Use level 1 card size if it fits, otherwise calculate minimum needed
            let cardSize: number;
            if (neededWidth <= availableWidth && neededHeight <= availableHeight) {
              // Level 1 size fits! Use it for consistency
              cardSize = level1CardSize;
            } else {
              // Must shrink - calculate the size needed to fit
              const cardSizeByWidth = Math.floor((availableWidth - (cols - 1) * gap) / cols);
              const cardSizeByHeight = Math.floor((availableHeight - (rows - 1) * gap) / rows);
              cardSize = Math.min(cardSizeByWidth, cardSizeByHeight);
            }

            // Actual grid dimensions
            const gridWidth = cols * cardSize + (cols - 1) * gap;
            const gridHeight = rows * cardSize + (rows - 1) * gap;

            // No scrolling needed with proper sizing
            const needsScroll = false;

            return (
              <>
                {/* Stats Panel - floating overlay at top (OUTSIDE mm-game-layout to avoid transform issues) */}
                <div className="mm-stats-overlay">
                  <div className={`mm-stat round-stat`}>
                    <span className="mm-stat-label">Round</span>
                    <span className="mm-stat-value">{round}</span>
                  </div>
                  <div className={`mm-stat score-stat`}>
                    <span className="mm-stat-label">Score</span>
                    <span className="mm-stat-value">{totalScore}</span>
                  </div>
                  <div className={`mm-stat ${getUrgencyClass(urgencyLevel)}`}>
                    <span className="mm-stat-label">Time</span>
                    <span className="mm-stat-value">{Math.floor(timeLeft)}s</span>
                  </div>
                  <div className="mm-stat">
                    <span className="mm-stat-label">Pairs</span>
                    <span className="mm-stat-value">{matches}/{requiredPairs}</span>
                  </div>
                </div>

                {/* Timeline Bar - fills left to right (OUTSIDE mm-game-layout to avoid transform issues) */}
                <div className={`mm-timeline ${getUrgencyClass(urgencyLevel)} ${timelineCelebrating ? 'pulse-celebration' : ''}`}>
                  <div
                    className="mm-timeline-progress"
                    style={{
                      width: `${((roundTotalTime - timeLeft) / roundTotalTime) * 100}%`,
                      transition: `width 1s linear`
                    }}
                  />
                  <div className="mm-timeline-glow" />
                </div>

                <div className={`mm-game-layout ${effects.screenShake ? 'screen-shake' : ''} ${isFrozen ? 'frozen' : ''}`}>
                  {/* Visual Effects Layer */}
                  <GameEffects effects={effects} accentColor="#8b5cf6" />

                  {/* Enhancement 16: Near-win shimmer overlay */}
                  <div className={`mm-near-win-shimmer ${showNearWinShimmer ? 'active' : ''}`} />

                  {/* Card Grid - centered in lightbox, adapts to orientation */}
                  <div
                    className="mm-cards-grid"
                    style={{
                      width: needsScroll ? `${availableWidth}px` : `${gridWidth}px`,
                      height: needsScroll ? `${availableHeight}px` : `${gridHeight}px`,
                      gridTemplateColumns: `repeat(${cols}, ${cardSize}px)`,
                      gridTemplateRows: `repeat(${rows}, ${cardSize}px)`,
                      gap: `${gap}px`,
                      overflowY: needsScroll ? 'auto' : 'hidden',
                      overflowX: 'hidden',
                    } as React.CSSProperties}
                  >
                    {cards.map(card => (
                      <div
                        key={card.id}
                        data-card-id={card.id}
                        className={`mm-card ${card.isFlipped ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
                        onClick={() => handleCardClick(card.id)}
                        onMouseEnter={() => {
                          // Only play hover sound/haptic for unflipped, unmatched cards
                          if (!card.isFlipped && !card.isMatched) {
                            playCardHover();
                            hapticHover(); // Ultra-light 5ms tap
                          }
                        }}
                      >
                        <div className="mm-card-inner">
                          <div className="mm-card-front">
                            <img
                              src="/assets/Games/games_media/Memory_card.png"
                              alt=""
                              className="mm-card-img"
                            />
                          </div>
                          <div className="mm-card-back">
                            <img
                              src={card.image}
                              alt={card.name}
                              className="mm-card-img"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

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

export default MemoryMatch;
