/* eslint-disable react-refresh/only-export-components */
/**
 * Media Context
 *
 * Global media state provider for video and music playback.
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import type {
  VideoItem,
  MusicTrack,
  VideoPlayerState,
  MusicPlayerState,
  MediaContextValue,
  MediaPreferences,
  PlayerSize,
  RepeatMode,
} from '@/types/media';
import { useSettings } from './SettingsContext';

// ============ Initial States ============

const initialVideoState: VideoPlayerState = {
  currentVideo: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  isMinimized: false,
  isPictureInPicture: false,
  position: { x: 16, y: 16 },
  size: 'small',
  queue: [],
  queueIndex: 0,
  playbackRate: 1,
  isLooping: false,
  captionsEnabled: false,
  captionLanguage: 'en',
};

const initialMusicState: MusicPlayerState = {
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  isMuted: false,
  playlist: [],
  playlistIndex: 0,
  shuffleEnabled: false,
  repeatMode: 'off',
  persistAcrossNavigation: true,
};

const initialPreferences: MediaPreferences = {
  videoVolume: 0.8,
  musicVolume: 0.7,
  masterVolume: 1,
  autoplayNext: true,
  pauseMusicOnVideo: true,
  rememberPosition: true,
  alwaysShowCaptions: false,
  prefersReducedMotion: false,
  announceTrackChanges: true,
};

// ============ Action Types ============

type MediaAction =
  // Video actions
  | { type: 'SET_VIDEO'; video: VideoItem }
  | { type: 'SET_VIDEO_QUEUE'; videos: VideoItem[]; startIndex?: number }
  | { type: 'NEXT_VIDEO' }
  | { type: 'PLAY_VIDEO' }
  | { type: 'PAUSE_VIDEO' }
  | { type: 'CLOSE_VIDEO' }
  | { type: 'SET_VIDEO_TIME'; time: number }
  | { type: 'SET_VIDEO_DURATION'; duration: number }
  | { type: 'SET_VIDEO_VOLUME'; volume: number }
  | { type: 'SET_VIDEO_MUTED'; muted: boolean }
  | { type: 'SET_VIDEO_POSITION'; position: { x: number; y: number } }
  | { type: 'SET_VIDEO_SIZE'; size: PlayerSize }
  | { type: 'TOGGLE_VIDEO_MINIMIZE' }
  | { type: 'SET_PIP'; isPiP: boolean }
  // Music actions
  | { type: 'SET_TRACK'; track: MusicTrack }
  | { type: 'PLAY_MUSIC' }
  | { type: 'PAUSE_MUSIC' }
  | { type: 'SET_MUSIC_TIME'; time: number }
  | { type: 'SET_MUSIC_DURATION'; duration: number }
  | { type: 'SET_MUSIC_VOLUME'; volume: number }
  | { type: 'SET_MUSIC_MUTED'; muted: boolean }
  | { type: 'SET_PLAYLIST'; tracks: MusicTrack[] }
  | { type: 'NEXT_TRACK' }
  | { type: 'PREVIOUS_TRACK' }
  | { type: 'TOGGLE_SHUFFLE' }
  | { type: 'SET_REPEAT_MODE'; mode: RepeatMode }
  // Global actions
  | { type: 'STOP_ALL' }
  | { type: 'SET_PREFERENCES'; preferences: Partial<MediaPreferences> }
  | { type: 'LOAD_PREFERENCES'; preferences: MediaPreferences };

interface MediaState {
  videoPlayer: VideoPlayerState;
  musicPlayer: MusicPlayerState;
  preferences: MediaPreferences;
  musicWasPausedByVideo: boolean;
}

// ============ Reducer ============

function mediaReducer(state: MediaState, action: MediaAction): MediaState {
  switch (action.type) {
    // Video actions
    case 'SET_VIDEO':
      return {
        ...state,
        videoPlayer: {
          ...state.videoPlayer,
          currentVideo: action.video,
          currentTime: 0,
          duration: action.video.duration,
        },
      };

    case 'SET_VIDEO_QUEUE': {
      const startIndex = action.startIndex ?? 0;
      return {
        ...state,
        videoPlayer: {
          ...state.videoPlayer,
          queue: action.videos,
          queueIndex: startIndex,
          currentVideo: action.videos[startIndex] || null,
          currentTime: 0,
          duration: action.videos[startIndex]?.duration || 0,
        },
      };
    }

    case 'NEXT_VIDEO': {
      const { queue, queueIndex } = state.videoPlayer;
      if (queue.length === 0) return state;

      const nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        // End of queue, loop to start
        return {
          ...state,
          videoPlayer: {
            ...state.videoPlayer,
            queueIndex: 0,
            currentVideo: queue[0],
            currentTime: 0,
            duration: queue[0]?.duration || 0,
          },
        };
      }

      return {
        ...state,
        videoPlayer: {
          ...state.videoPlayer,
          queueIndex: nextIndex,
          currentVideo: queue[nextIndex],
          currentTime: 0,
          duration: queue[nextIndex]?.duration || 0,
        },
      };
    }

    case 'PLAY_VIDEO':
      return {
        ...state,
        videoPlayer: { ...state.videoPlayer, isPlaying: true },
        // Pause music if preference enabled
        musicPlayer:
          state.preferences.pauseMusicOnVideo && state.musicPlayer.isPlaying
            ? { ...state.musicPlayer, isPlaying: false }
            : state.musicPlayer,
        musicWasPausedByVideo:
          state.preferences.pauseMusicOnVideo && state.musicPlayer.isPlaying,
      };

    case 'PAUSE_VIDEO':
      return {
        ...state,
        videoPlayer: { ...state.videoPlayer, isPlaying: false },
      };

    case 'CLOSE_VIDEO':
      return {
        ...state,
        videoPlayer: { ...initialVideoState },
        // Resume music if it was paused by video
        musicPlayer: state.musicWasPausedByVideo
          ? { ...state.musicPlayer, isPlaying: true }
          : state.musicPlayer,
        musicWasPausedByVideo: false,
      };

    case 'SET_VIDEO_TIME':
      return {
        ...state,
        videoPlayer: { ...state.videoPlayer, currentTime: action.time },
      };

    case 'SET_VIDEO_DURATION':
      return {
        ...state,
        videoPlayer: { ...state.videoPlayer, duration: action.duration },
      };

    case 'SET_VIDEO_VOLUME':
      return {
        ...state,
        videoPlayer: { ...state.videoPlayer, volume: action.volume },
        preferences: { ...state.preferences, videoVolume: action.volume },
      };

    case 'SET_VIDEO_MUTED':
      return {
        ...state,
        videoPlayer: { ...state.videoPlayer, isMuted: action.muted },
      };

    case 'SET_VIDEO_POSITION':
      return {
        ...state,
        videoPlayer: { ...state.videoPlayer, position: action.position },
      };

    case 'SET_VIDEO_SIZE':
      return {
        ...state,
        videoPlayer: { ...state.videoPlayer, size: action.size },
      };

    case 'TOGGLE_VIDEO_MINIMIZE':
      return {
        ...state,
        videoPlayer: {
          ...state.videoPlayer,
          isMinimized: !state.videoPlayer.isMinimized,
        },
      };

    case 'SET_PIP':
      return {
        ...state,
        videoPlayer: { ...state.videoPlayer, isPictureInPicture: action.isPiP },
      };

    // Music actions
    case 'SET_TRACK': {
      const trackIndex = state.musicPlayer.playlist.findIndex(
        (t) => t.id === action.track.id
      );
      return {
        ...state,
        musicPlayer: {
          ...state.musicPlayer,
          currentTrack: action.track,
          currentTime: 0,
          duration: action.track.duration,
          playlistIndex: trackIndex >= 0 ? trackIndex : state.musicPlayer.playlistIndex,
        },
      };
    }

    case 'PLAY_MUSIC':
      return {
        ...state,
        musicPlayer: { ...state.musicPlayer, isPlaying: true },
      };

    case 'PAUSE_MUSIC':
      return {
        ...state,
        musicPlayer: { ...state.musicPlayer, isPlaying: false },
      };

    case 'SET_MUSIC_TIME':
      return {
        ...state,
        musicPlayer: { ...state.musicPlayer, currentTime: action.time },
      };

    case 'SET_MUSIC_DURATION':
      return {
        ...state,
        musicPlayer: { ...state.musicPlayer, duration: action.duration },
      };

    case 'SET_MUSIC_VOLUME':
      return {
        ...state,
        musicPlayer: { ...state.musicPlayer, volume: action.volume },
        preferences: { ...state.preferences, musicVolume: action.volume },
      };

    case 'SET_MUSIC_MUTED':
      return {
        ...state,
        musicPlayer: { ...state.musicPlayer, isMuted: action.muted },
      };

    case 'SET_PLAYLIST':
      return {
        ...state,
        musicPlayer: { ...state.musicPlayer, playlist: action.tracks },
      };

    case 'NEXT_TRACK': {
      const { playlist, playlistIndex, shuffleEnabled, repeatMode } = state.musicPlayer;
      if (playlist.length === 0) return state;

      let nextIndex: number;
      if (shuffleEnabled) {
        nextIndex = Math.floor(Math.random() * playlist.length);
      } else {
        nextIndex = playlistIndex + 1;
        if (nextIndex >= playlist.length) {
          nextIndex = repeatMode === 'all' ? 0 : playlistIndex;
        }
      }

      return {
        ...state,
        musicPlayer: {
          ...state.musicPlayer,
          currentTrack: playlist[nextIndex],
          playlistIndex: nextIndex,
          currentTime: 0,
        },
      };
    }

    case 'PREVIOUS_TRACK': {
      const { playlist, playlistIndex, currentTime } = state.musicPlayer;
      if (playlist.length === 0) return state;

      // If more than 3 seconds in, restart current track
      if (currentTime > 3) {
        return {
          ...state,
          musicPlayer: { ...state.musicPlayer, currentTime: 0 },
        };
      }

      const prevIndex = playlistIndex > 0 ? playlistIndex - 1 : playlist.length - 1;
      return {
        ...state,
        musicPlayer: {
          ...state.musicPlayer,
          currentTrack: playlist[prevIndex],
          playlistIndex: prevIndex,
          currentTime: 0,
        },
      };
    }

    case 'TOGGLE_SHUFFLE':
      return {
        ...state,
        musicPlayer: {
          ...state.musicPlayer,
          shuffleEnabled: !state.musicPlayer.shuffleEnabled,
        },
      };

    case 'SET_REPEAT_MODE':
      return {
        ...state,
        musicPlayer: { ...state.musicPlayer, repeatMode: action.mode },
      };

    // Global actions
    case 'STOP_ALL':
      return {
        ...state,
        videoPlayer: { ...state.videoPlayer, isPlaying: false },
        musicPlayer: { ...state.musicPlayer, isPlaying: false },
      };

    case 'SET_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.preferences },
      };

    case 'LOAD_PREFERENCES':
      return {
        ...state,
        preferences: action.preferences,
        videoPlayer: {
          ...state.videoPlayer,
          volume: action.preferences.videoVolume,
        },
        musicPlayer: {
          ...state.musicPlayer,
          volume: action.preferences.musicVolume,
        },
      };

    default:
      return state;
  }
}

// ============ Context ============

const MediaContext = createContext<MediaContextValue | null>(null);

// ============ Provider ============

interface MediaProviderProps {
  children: ReactNode;
}

export function MediaProvider({ children }: MediaProviderProps) {
  const [state, dispatch] = useReducer(mediaReducer, {
    videoPlayer: initialVideoState,
    musicPlayer: initialMusicState,
    preferences: initialPreferences,
    musicWasPausedByVideo: false,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get settings from SettingsContext
  const { settings } = useSettings();

  // Calculate effective volumes from settings
  const musicEnabled = settings.audio.backgroundMusicEnabled;
  const musicVolume = settings.audio.backgroundMusicVolume;

  // Sync music volume with settings - just control volume, don't pause
  // This way music keeps playing silently when muted and becomes audible when unmuted
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicEnabled ? musicVolume : 0;
    }
  }, [musicVolume, musicEnabled]);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('wojak-media-preferences');
      if (stored) {
        const prefs = JSON.parse(stored) as MediaPreferences;
        dispatch({ type: 'LOAD_PREFERENCES', preferences: prefs });
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        'wojak-media-preferences',
        JSON.stringify(state.preferences)
      );
    } catch {
      // Ignore storage errors
    }
  }, [state.preferences]);

  // Sync video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (state.videoPlayer.isPlaying) {
      video.play().catch(() => {
        dispatch({ type: 'PAUSE_VIDEO' });
      });
    } else {
      video.pause();
    }
  }, [state.videoPlayer.isPlaying]);

  // Sync audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (state.musicPlayer.isPlaying && state.musicPlayer.currentTrack) {
      audio.play().catch(() => {
        dispatch({ type: 'PAUSE_MUSIC' });
      });
    } else {
      audio.pause();
    }
  }, [state.musicPlayer.isPlaying, state.musicPlayer.currentTrack]);

  // Update Media Session
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const { currentTrack, isPlaying } = state.musicPlayer;
    const { currentVideo, isPlaying: videoPlaying } = state.videoPlayer;

    if (videoPlaying && currentVideo) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentVideo.title,
        artist: 'Wojak.ink Video',
        artwork: [{ src: currentVideo.thumbnailUrl, sizes: '512x512' }],
      });
    } else if (isPlaying && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Wojak.ink',
        artwork: [{ src: currentTrack.coverArtUrl, sizes: '512x512' }],
      });
    }

    navigator.mediaSession.setActionHandler('play', () => {
      if (videoPlaying || currentVideo) {
        dispatch({ type: 'PLAY_VIDEO' });
      } else {
        dispatch({ type: 'PLAY_MUSIC' });
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      if (videoPlaying) {
        dispatch({ type: 'PAUSE_VIDEO' });
      } else {
        dispatch({ type: 'PAUSE_MUSIC' });
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      dispatch({ type: 'NEXT_TRACK' });
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      dispatch({ type: 'PREVIOUS_TRACK' });
    });
  }, [state.musicPlayer, state.videoPlayer]);

  // Video actions
  const playVideo = useCallback((video: VideoItem) => {
    dispatch({ type: 'SET_VIDEO', video });
    dispatch({ type: 'PLAY_VIDEO' });
  }, []);

  const setVideoQueue = useCallback((videos: VideoItem[], startIndex?: number) => {
    dispatch({ type: 'SET_VIDEO_QUEUE', videos, startIndex });
    dispatch({ type: 'PLAY_VIDEO' });
  }, []);

  const nextVideo = useCallback(() => {
    dispatch({ type: 'NEXT_VIDEO' });
  }, []);

  const pauseVideo = useCallback(() => {
    dispatch({ type: 'PAUSE_VIDEO' });
  }, []);

  const closeVideoPlayer = useCallback(() => {
    dispatch({ type: 'CLOSE_VIDEO' });
  }, []);

  const setVideoVolume = useCallback((volume: number) => {
    dispatch({ type: 'SET_VIDEO_VOLUME', volume });
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, []);

  const seekVideo = useCallback((time: number) => {
    dispatch({ type: 'SET_VIDEO_TIME', time });
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  const togglePictureInPicture = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        dispatch({ type: 'SET_PIP', isPiP: false });
      } else {
        await videoRef.current.requestPictureInPicture();
        dispatch({ type: 'SET_PIP', isPiP: true });
      }
    } catch {
      // PiP not supported
    }
  }, []);

  const setVideoPosition = useCallback((position: { x: number; y: number }) => {
    dispatch({ type: 'SET_VIDEO_POSITION', position });
  }, []);

  const setVideoSize = useCallback((size: PlayerSize) => {
    dispatch({ type: 'SET_VIDEO_SIZE', size });
  }, []);

  const toggleVideoMinimize = useCallback(() => {
    dispatch({ type: 'TOGGLE_VIDEO_MINIMIZE' });
  }, []);

  // Music actions
  const playTrack = useCallback((track: MusicTrack) => {
    dispatch({ type: 'SET_TRACK', track });
    dispatch({ type: 'PLAY_MUSIC' });
  }, []);

  const pauseMusic = useCallback(() => {
    dispatch({ type: 'PAUSE_MUSIC' });
  }, []);

  const resumeMusic = useCallback(() => {
    dispatch({ type: 'PLAY_MUSIC' });
  }, []);

  const nextTrack = useCallback(() => {
    dispatch({ type: 'NEXT_TRACK' });
  }, []);

  const previousTrack = useCallback(() => {
    dispatch({ type: 'PREVIOUS_TRACK' });
  }, []);

  const setMusicVolume = useCallback((volume: number) => {
    dispatch({ type: 'SET_MUSIC_VOLUME', volume });
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, []);

  const seekMusic = useCallback((time: number) => {
    dispatch({ type: 'SET_MUSIC_TIME', time });
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const toggleShuffle = useCallback(() => {
    dispatch({ type: 'TOGGLE_SHUFFLE' });
  }, []);

  const setRepeatMode = useCallback((mode: RepeatMode) => {
    dispatch({ type: 'SET_REPEAT_MODE', mode });
  }, []);

  const setPlaylist = useCallback((tracks: MusicTrack[]) => {
    dispatch({ type: 'SET_PLAYLIST', tracks });
  }, []);

  // Global actions
  const stopAllMedia = useCallback(() => {
    dispatch({ type: 'STOP_ALL' });
  }, []);

  const updatePreferences = useCallback((prefs: Partial<MediaPreferences>) => {
    dispatch({ type: 'SET_PREFERENCES', preferences: prefs });
  }, []);

  // Memoized context value
  const value = useMemo<MediaContextValue>(
    () => ({
      videoPlayer: state.videoPlayer,
      playVideo,
      setVideoQueue,
      nextVideo,
      pauseVideo,
      closeVideoPlayer,
      setVideoVolume,
      seekVideo,
      togglePictureInPicture,
      setVideoPosition,
      setVideoSize,
      toggleVideoMinimize,
      musicPlayer: state.musicPlayer,
      playTrack,
      pauseMusic,
      resumeMusic,
      nextTrack,
      previousTrack,
      setMusicVolume,
      seekMusic,
      toggleShuffle,
      setRepeatMode,
      setPlaylist,
      stopAllMedia,
      preferences: state.preferences,
      updatePreferences,
      videoRef,
      audioRef,
    }),
    [
      state.videoPlayer,
      state.musicPlayer,
      state.preferences,
      playVideo,
      setVideoQueue,
      nextVideo,
      pauseVideo,
      closeVideoPlayer,
      setVideoVolume,
      seekVideo,
      togglePictureInPicture,
      setVideoPosition,
      setVideoSize,
      toggleVideoMinimize,
      playTrack,
      pauseMusic,
      resumeMusic,
      nextTrack,
      previousTrack,
      setMusicVolume,
      seekMusic,
      toggleShuffle,
      setRepeatMode,
      setPlaylist,
      stopAllMedia,
      updatePreferences,
    ]
  );

  return (
    <MediaContext.Provider value={value}>
      {children}

      {/* Hidden audio element for music */}
      <audio
        ref={audioRef}
        src={state.musicPlayer.currentTrack?.audioUrl}
        style={{ display: 'none' }}
        onTimeUpdate={(e) => {
          dispatch({
            type: 'SET_MUSIC_TIME',
            time: (e.target as HTMLAudioElement).currentTime,
          });
        }}
        onLoadedMetadata={(e) => {
          dispatch({
            type: 'SET_MUSIC_DURATION',
            duration: (e.target as HTMLAudioElement).duration,
          });
        }}
        onEnded={() => {
          if (state.musicPlayer.repeatMode === 'one') {
            seekMusic(0);
            resumeMusic();
          } else {
            nextTrack();
          }
        }}
      />
    </MediaContext.Provider>
  );
}

// ============ Hook ============

export function useMedia(): MediaContextValue {
  const context = useContext(MediaContext);
  if (!context) {
    // Return a safe fallback instead of throwing to prevent crashes
    // This shouldn't happen if MediaProvider is properly set up, but provides safety
    console.error('useMedia called outside of MediaProvider - returning fallback');
    return {
      videoPlayer: initialVideoState,
      playVideo: () => {},
      setVideoQueue: () => {},
      nextVideo: () => {},
      pauseVideo: () => {},
      closeVideoPlayer: () => {},
      setVideoVolume: () => {},
      seekVideo: () => {},
      togglePictureInPicture: async () => {},
      setVideoPosition: () => {},
      setVideoSize: () => {},
      toggleVideoMinimize: () => {},
      musicPlayer: initialMusicState,
      playTrack: () => {},
      pauseMusic: () => {},
      resumeMusic: () => {},
      nextTrack: () => {},
      previousTrack: () => {},
      setMusicVolume: () => {},
      seekMusic: () => {},
      toggleShuffle: () => {},
      setRepeatMode: () => {},
      setPlaylist: () => {},
      stopAllMedia: () => {},
      preferences: initialPreferences,
      updatePreferences: () => {},
      videoRef: { current: null },
      audioRef: { current: null },
    };
  }
  return context;
}
