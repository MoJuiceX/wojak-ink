/**
 * useAudio Hook
 * Manages Web Audio API initialization and sound playback
 *
 * @example
 * const { audioManager, initAudio, playSound } = useAudio();
 *
 * // Initialize on first user interaction
 * const handleFirstClick = () => {
 *   initAudio();
 *   playSound('tap');
 * };
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  createAudioManager,
  initAudio as initAudioSystem,
  playTone,
  playImpactSound,
  playSuccessSound,
  triggerHaptic,
  type AudioManager,
  type HapticPattern,
} from '@/lib/juice';
import { AUDIO } from '../config';

// ============================================
// TYPES
// ============================================

export interface UseAudioReturn {
  audioManagerRef: React.RefObject<AudioManager>;
  isInitialized: boolean;
  isMuted: boolean;
  initAudio: () => boolean;
  playSound: (sound: SoundType, options?: SoundOptions) => void;
  playToneHz: (frequency: number, duration?: number) => void;
  triggerFeedback: (haptic?: HapticPattern) => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
}

export type SoundType =
  | 'tap'
  | 'success'
  | 'fail'
  | 'impact'
  | 'milestone'
  | 'combo'
  | 'powerup'
  | 'warning';

export interface SoundOptions {
  volume?: number;
  pitch?: number;
  haptic?: HapticPattern;
}

// ============================================
// SOUND DEFINITIONS
// ============================================

const SOUNDS: Record<SoundType, (manager: AudioManager, options?: SoundOptions) => void> = {
  tap: (manager, options) => {
    playTone(manager, AUDIO.tones.tap * (options?.pitch ?? 1), options?.volume ?? 0.1, 80, 'triangle');
  },

  success: (manager, options) => {
    const [freq1, freq2] = AUDIO.tones.success;
    playTone(manager, freq1 * (options?.pitch ?? 1), options?.volume ?? 0.1, 100, 'sine');
    setTimeout(() => {
      playTone(manager, freq2 * (options?.pitch ?? 1), (options?.volume ?? 0.1) * 0.8, 150, 'sine');
    }, 50);
  },

  fail: (manager, options) => {
    const [freq1, freq2] = AUDIO.tones.fail;
    playTone(manager, freq1, options?.volume ?? 0.15, 200, 'sine');
    setTimeout(() => {
      playTone(manager, freq2, (options?.volume ?? 0.15) * 0.7, 300, 'sine');
    }, 100);
  },

  impact: (manager) => {
    playImpactSound(manager);
  },

  milestone: (manager, options) => {
    const [freq1, freq2, freq3] = AUDIO.tones.milestone;
    playTone(manager, freq1, options?.volume ?? 0.12, 150, 'sine');
    setTimeout(() => playTone(manager, freq2, (options?.volume ?? 0.12) * 0.9, 150, 'sine'), 80);
    setTimeout(() => playTone(manager, freq3, (options?.volume ?? 0.12) * 0.8, 200, 'sine'), 160);
  },

  combo: (manager, options) => {
    // Pitch increases with combo level (passed via pitch option)
    const basePitch = options?.pitch ?? 1;
    playSuccessSound(manager, basePitch);
  },

  powerup: (manager, options) => {
    // Rising arpeggio
    [1, 1.25, 1.5, 2].forEach((mult, i) => {
      setTimeout(() => {
        playTone(manager, 440 * mult, (options?.volume ?? 0.1) * (1 - i * 0.15), 100, 'sine');
      }, i * 60);
    });
  },

  warning: (manager, options) => {
    // Pulsing alert
    [0, 200, 400].forEach((delay) => {
      setTimeout(() => {
        playTone(manager, 220, options?.volume ?? 0.15, 100, 'square');
      }, delay);
    });
  },
};

// ============================================
// HOOK
// ============================================

export const useAudio = (): UseAudioReturn => {
  const audioManagerRef = useRef<AudioManager>(createAudioManager());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Initialize audio (must be called from user interaction)
  const initAudio = useCallback((): boolean => {
    if (isInitialized) return true;

    const success = initAudioSystem(audioManagerRef.current);
    if (success) {
      setIsInitialized(true);
      // Set initial volume
      if (audioManagerRef.current.masterGain) {
        audioManagerRef.current.masterGain.gain.value = AUDIO.masterVolume;
      }
    }
    return success;
  }, [isInitialized]);

  // Play a predefined sound
  const playSound = useCallback(
    (sound: SoundType, options?: SoundOptions) => {
      if (!isInitialized || isMuted) return;

      const soundFn = SOUNDS[sound];
      if (soundFn) {
        soundFn(audioManagerRef.current, options);
      }

      // Trigger haptic if specified
      if (options?.haptic) {
        triggerHaptic(options.haptic);
      }
    },
    [isInitialized, isMuted]
  );

  // Play a raw tone by frequency
  const playToneHz = useCallback(
    (frequency: number, duration: number = 150) => {
      if (!isInitialized || isMuted) return;
      playTone(audioManagerRef.current, frequency, 0.1, duration, 'sine');
    },
    [isInitialized, isMuted]
  );

  // Combined audio + haptic feedback
  const triggerFeedback = useCallback(
    (haptic: HapticPattern = 'tap') => {
      triggerHaptic(haptic);
    },
    []
  );

  // Set mute state
  const handleSetMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
    audioManagerRef.current.muted = muted;
    if (audioManagerRef.current.masterGain) {
      audioManagerRef.current.masterGain.gain.value = muted ? 0 : AUDIO.masterVolume;
    }
  }, []);

  // Set volume
  const handleSetVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioManagerRef.current.volume = clampedVolume;
    if (audioManagerRef.current.masterGain && !isMuted) {
      audioManagerRef.current.masterGain.gain.value = clampedVolume;
    }
  }, [isMuted]);

  return {
    audioManagerRef,
    isInitialized,
    isMuted,
    initAudio,
    playSound,
    playToneHz,
    triggerFeedback,
    setMuted: handleSetMuted,
    setVolume: handleSetVolume,
  };
};

export default useAudio;
