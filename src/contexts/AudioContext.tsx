/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { useSettings } from './SettingsContext';
import { SoundManager } from '@/systems/audio/SoundManager';
import type { SoundName } from '@/systems/audio/sounds';
import { createManagedAudio } from '@/utils/audioElement';

interface AudioContextType {
  // Background music controls
  isBackgroundMusicEnabled: boolean;
  isBackgroundMusicPlaying: boolean;
  playBackgroundMusic: () => void;
  pauseBackgroundMusic: () => void;
  forcePlayBackgroundMusic: () => void; // Bypasses isBackgroundMusicEnabled check (for games)
  setBackgroundMusicTrack: (trackUrl: string) => void;

  // Sound effects controls
  isSoundEffectsEnabled: boolean;
  playSound: (soundId: string) => void;

  // New game sound system
  playGameSound: (name: SoundName) => void;
  initializeSounds: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | null>(null);

// Legacy sound effect paths (kept for backward compatibility)
const SOUND_EFFECTS: Record<string, string> = {
  bubble_pop: '/assets/audio/sfx/bubble_pop.mp3',
  button_click: '/assets/audio/sfx/button_click.mp3',
  success: '/assets/audio/sfx/success.mp3',
  error: '/assets/audio/sfx/error.mp3',
};

// Background music tracks
const MUSIC_TRACKS: Record<string, string> = {
  default: '/assets/music/wojakmusic1.mp3',
};

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const { settings } = useSettings();

  // Derive enabled states from SettingsContext
  const isBackgroundMusicEnabled = settings.audio.backgroundMusicEnabled;
  const isSoundEffectsEnabled = settings.audio.soundEffectsEnabled;

  const [isBackgroundMusicPlaying, setIsBackgroundMusicPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<string>(MUSIC_TRACKS.default);

  // Audio elements
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const soundPoolRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Track if force play is active (bypasses auto-pause from settings)
  const forcePlayActiveRef = useRef<boolean>(false);

  // Compute effective volumes
  const musicVolume = settings.audio.backgroundMusicVolume;
  const sfxVolume = settings.audio.soundEffectsVolume;
  const initialMusicVolumeRef = useRef<number>(musicVolume);

  // Initialize background music audio element
  useEffect(() => {
    bgMusicRef.current = createManagedAudio();
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = initialMusicVolumeRef.current;
    bgMusicRef.current.src = MUSIC_TRACKS.default; // Set initial track

    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, []);

  // Update music volume when settings change
  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  // Update track when currentTrack changes
  useEffect(() => {
    if (bgMusicRef.current && currentTrack) {
      const wasPlaying = isBackgroundMusicPlaying;
      bgMusicRef.current.src = currentTrack;

      if (wasPlaying && isBackgroundMusicEnabled) {
        bgMusicRef.current.play().catch(() => { /* Autoplay may be blocked */ });
      }
    }
  }, [currentTrack, isBackgroundMusicEnabled, isBackgroundMusicPlaying]);

  // Handle background music enable/disable
  // Skip auto-pause when force play is active (games)
  useEffect(() => {
    if (!bgMusicRef.current) return;
    if (forcePlayActiveRef.current) return; // Don't auto-pause during force play

    if (!isBackgroundMusicEnabled && isBackgroundMusicPlaying) {
      bgMusicRef.current.pause();
      queueMicrotask(() => setIsBackgroundMusicPlaying(false));
    }
  }, [isBackgroundMusicEnabled, isBackgroundMusicPlaying]);

  const playBackgroundMusic = () => {
    if (!bgMusicRef.current || !isBackgroundMusicEnabled) return;

    bgMusicRef.current.play()
      .then(() => {
        setIsBackgroundMusicPlaying(true);
      })
      .catch(() => { /* Autoplay may be blocked */ });
  };

  // Force play - bypasses the isBackgroundMusicEnabled check (for games)
  const forcePlayBackgroundMusic = () => {
    // Set force play flag to prevent auto-pause from settings
    forcePlayActiveRef.current = true;

    if (!bgMusicRef.current) {
      bgMusicRef.current = createManagedAudio();
      bgMusicRef.current.loop = true;
      bgMusicRef.current.volume = musicVolume || 0.5;
    }

    // Ensure the track is loaded
    if (!bgMusicRef.current.src || bgMusicRef.current.src === '' || bgMusicRef.current.src === window.location.href) {
      bgMusicRef.current.src = currentTrack || MUSIC_TRACKS.default;
    }

    // Ensure volume is audible (minimum 0.3 if set to 0)
    if (bgMusicRef.current.volume === 0) {
      bgMusicRef.current.volume = 0.3;
    }

    bgMusicRef.current.play()
      .then(() => {
        setIsBackgroundMusicPlaying(true);
      })
      .catch(() => {
        forcePlayActiveRef.current = false; // Reset on failure
      });
  };

  const pauseBackgroundMusic = () => {
    if (!bgMusicRef.current) return;

    // Clear force play flag when explicitly pausing
    forcePlayActiveRef.current = false;

    bgMusicRef.current.pause();
    setIsBackgroundMusicPlaying(false);
  };

  const setBackgroundMusicTrack = (trackUrl: string) => {
    setCurrentTrack(trackUrl);
  };

  const playSound = (soundId: string) => {
    if (!isSoundEffectsEnabled) return;

    const soundPath = SOUND_EFFECTS[soundId];
    if (!soundPath) {
      console.warn(`Sound effect not found: ${soundId}`);
      return;
    }

    // Get or create audio element from pool
    let audio = soundPoolRef.current.get(soundId);
    if (!audio) {
      audio = new Audio(soundPath);
      soundPoolRef.current.set(soundId, audio);
    }

    // Update volume and play
    audio.volume = sfxVolume;
    audio.currentTime = 0;
    audio.play().catch(() => { /* Autoplay may be blocked */ });
  };

  // Initialize the new SoundManager system
  const initializeSounds = async () => {
    await SoundManager.initialize();
  };

  // Play a game sound using the new system
  const playGameSound = (name: SoundName) => {
    if (!isSoundEffectsEnabled) return;
    SoundManager.play(name);
  };

  // Auto-initialize sound system on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (!SoundManager.getIsInitialized()) {
        SoundManager.initialize();
      }
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Sync SoundManager mute state with settings
  useEffect(() => {
    SoundManager.setMuted(!isSoundEffectsEnabled);
  }, [isSoundEffectsEnabled]);

  // Sync SoundManager volume with settings
  useEffect(() => {
    SoundManager.setSfxVolume(sfxVolume);
  }, [sfxVolume]);

  // Track if music was playing before page was hidden (for resuming on mobile)
  const wasPlayingBeforeHiddenRef = useRef(false);

  // Visibility change handling - pause/resume background music when browser goes to background
  // This is critical for mobile where closing the browser tab should stop music
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden (user switched tabs, closed browser, etc.)
        wasPlayingBeforeHiddenRef.current = isBackgroundMusicPlaying;
        if (bgMusicRef.current && isBackgroundMusicPlaying) {
          bgMusicRef.current.pause();
        }
        // Also pause SoundManager
        SoundManager.stopAll();
      } else {
        // Page became visible again
        // Resume background music if it was playing before
        if (wasPlayingBeforeHiddenRef.current && bgMusicRef.current && isBackgroundMusicEnabled) {
          bgMusicRef.current.play().catch(() => {
            // Autoplay may be blocked, user will need to interact
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isBackgroundMusicPlaying, isBackgroundMusicEnabled]);

  return (
    <AudioContext.Provider
      value={{
        isBackgroundMusicEnabled,
        isBackgroundMusicPlaying,
        playBackgroundMusic,
        pauseBackgroundMusic,
        forcePlayBackgroundMusic,
        setBackgroundMusicTrack,
        isSoundEffectsEnabled,
        playSound,
        playGameSound,
        initializeSounds,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export default AudioContext;
