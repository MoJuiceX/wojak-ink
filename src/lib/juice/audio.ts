/**
 * Audio & Haptics Library
 * Web Audio API helpers, procedural sounds, and haptic feedback
 *
 * @example
 * import { createAudioManager, playTone, triggerHaptic } from '@/lib/juice/audio';
 *
 * const audio = createAudioManager();
 * playTone(audio, 440, 0.1, 200); // Play A4 note
 * triggerHaptic('tap');
 */

// ============================================
// TYPES
// ============================================

export interface AudioManager {
  context: AudioContext | null;
  masterGain: GainNode | null;
  initialized: boolean;
  muted: boolean;
  volume: number;
}

export interface ToneOptions {
  frequency: number;
  volume?: number;
  duration?: number;
  type?: OscillatorType;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
}

// ============================================
// AUDIO MANAGER
// ============================================

/**
 * Create audio manager (must be initialized on user interaction)
 */
export const createAudioManager = (): AudioManager => ({
  context: null,
  masterGain: null,
  initialized: false,
  muted: false,
  volume: 1,
});

/**
 * Initialize audio context (MUST be called from user interaction)
 */
export const initAudio = (manager: AudioManager): boolean => {
  if (manager.initialized) return true;

  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      console.warn('Web Audio API not supported');
      return false;
    }

    manager.context = new AudioContextClass();
    manager.masterGain = manager.context.createGain();
    manager.masterGain.connect(manager.context.destination);
    manager.masterGain.gain.value = manager.volume;
    manager.initialized = true;

    // Resume if suspended (iOS Safari)
    if (manager.context.state === 'suspended') {
      manager.context.resume();
    }

    return true;
  } catch (e) {
    console.error('Failed to initialize audio:', e);
    return false;
  }
};

/**
 * Set master volume (0-1)
 */
export const setVolume = (manager: AudioManager, volume: number): void => {
  manager.volume = Math.max(0, Math.min(1, volume));
  if (manager.masterGain) {
    manager.masterGain.gain.value = manager.muted ? 0 : manager.volume;
  }
};

/**
 * Toggle mute
 */
export const toggleMute = (manager: AudioManager): boolean => {
  manager.muted = !manager.muted;
  if (manager.masterGain) {
    manager.masterGain.gain.value = manager.muted ? 0 : manager.volume;
  }
  return manager.muted;
};

// ============================================
// TONE GENERATION
// ============================================

/**
 * Play a simple tone
 */
export const playTone = (
  manager: AudioManager,
  frequency: number,
  volume: number = 0.1,
  duration: number = 150,
  type: OscillatorType = 'sine'
): void => {
  if (!manager.initialized || !manager.context || manager.muted) return;

  const ctx = manager.context;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(manager.masterGain!);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  // ADSR envelope (simplified)
  const now = ctx.currentTime;
  const durationSec = duration / 1000;

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + 0.01); // Quick attack
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

  oscillator.start(now);
  oscillator.stop(now + durationSec + 0.1);
};

/**
 * Play tone with full ADSR envelope
 */
export const playToneADSR = (
  manager: AudioManager,
  options: ToneOptions
): void => {
  if (!manager.initialized || !manager.context || manager.muted) return;

  const ctx = manager.context;
  const {
    frequency,
    volume = 0.1,
    duration = 300,
    type = 'sine',
    attack = 0.01,
    decay = 0.1,
    sustain = 0.7,
    release = 0.1,
  } = options;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(manager.masterGain!);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  const now = ctx.currentTime;
  const durationSec = duration / 1000;
  const sustainLevel = volume * sustain;

  // ADSR envelope
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + attack);
  gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attack + decay);
  gainNode.gain.setValueAtTime(sustainLevel, now + durationSec - release);
  gainNode.gain.linearRampToValueAtTime(0.001, now + durationSec);

  oscillator.start(now);
  oscillator.stop(now + durationSec + 0.1);
};

// ============================================
// MUSICAL NOTES
// ============================================

/**
 * Note frequencies (4th octave)
 */
export const NOTES = {
  C4: 261.63,
  'C#4': 277.18,
  D4: 293.66,
  'D#4': 311.13,
  E4: 329.63,
  F4: 349.23,
  'F#4': 369.99,
  G4: 392.0,
  'G#4': 415.3,
  A4: 440.0,
  'A#4': 466.16,
  B4: 493.88,
  C5: 523.25,
} as const;

/**
 * C Major scale frequencies
 */
export const C_MAJOR_SCALE = [
  NOTES.C4,
  NOTES.D4,
  NOTES.E4,
  NOTES.F4,
  NOTES.G4,
  NOTES.A4,
  NOTES.B4,
  NOTES.C5,
];

/**
 * Play note from scale based on index (loops)
 */
export const playScaleNote = (
  manager: AudioManager,
  index: number,
  scale: number[] = C_MAJOR_SCALE,
  volume: number = 0.1,
  duration: number = 150
): void => {
  const noteIndex = index % scale.length;
  playTone(manager, scale[noteIndex], volume, duration, 'sine');
};

/**
 * Play chord (multiple notes)
 */
export const playChord = (
  manager: AudioManager,
  frequencies: number[],
  volume: number = 0.08,
  duration: number = 300
): void => {
  const perNoteVolume = volume / frequencies.length;
  frequencies.forEach((freq) => {
    playTone(manager, freq, perNoteVolume, duration, 'sine');
  });
};

// ============================================
// SOUND EFFECTS (Procedural)
// ============================================

/**
 * Play flap sound with variation
 */
export const playFlapSound = (
  manager: AudioManager,
  variation: number = 0.15
): void => {
  const baseFreq = 200;
  const pitchVariation = 1 + (Math.random() - 0.5) * 2 * variation;
  const volumeVariation = 0.08 + Math.random() * 0.04;

  playTone(manager, baseFreq * pitchVariation, volumeVariation, 80, 'triangle');
};

/**
 * Play impact/hit sound
 */
export const playImpactSound = (manager: AudioManager): void => {
  if (!manager.initialized || !manager.context || manager.muted) return;

  const ctx = manager.context;

  // Low thump
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1);
  gain1.connect(manager.masterGain!);
  osc1.frequency.setValueAtTime(150, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
  osc1.type = 'sine';
  gain1.gain.setValueAtTime(0.3, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.2);

  // Noise burst
  const bufferSize = ctx.sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  noise.buffer = buffer;
  noise.connect(noiseGain);
  noiseGain.connect(manager.masterGain!);
  noiseGain.gain.setValueAtTime(0.1, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  noise.start(ctx.currentTime);
};

/**
 * Play success/pass sound
 */
export const playSuccessSound = (
  manager: AudioManager,
  pitch: number = 1
): void => {
  playTone(manager, 440 * pitch, 0.1, 100, 'sine');
  setTimeout(() => {
    playTone(manager, 554.37 * pitch, 0.08, 150, 'sine');
  }, 50);
};

/**
 * Play near miss "whoosh"
 */
export const playNearMissSound = (
  manager: AudioManager,
  intensity: number = 1
): void => {
  if (!manager.initialized || !manager.context || manager.muted) return;

  const ctx = manager.context;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(manager.masterGain!);

  // Pitch sweep up
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    600 * intensity,
    ctx.currentTime + 0.1
  );
  osc.type = 'sawtooth';

  gain.gain.setValueAtTime(0.05 * intensity, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
};

/**
 * Play fire mode activation
 */
export const playFireModeSound = (manager: AudioManager): void => {
  // Rising whoosh
  playTone(manager, 200, 0.1, 200, 'sawtooth');
  setTimeout(() => playTone(manager, 400, 0.1, 150, 'sawtooth'), 100);
  setTimeout(() => playTone(manager, 600, 0.15, 200, 'sawtooth'), 200);
};

// ============================================
// HAPTIC FEEDBACK
// ============================================

export type HapticPattern = 'tap' | 'double' | 'success' | 'error' | 'heavy' | 'light' | 'flutter' | 'impact' | number | number[];

/**
 * Haptic pattern presets (in milliseconds)
 */
export const HAPTIC_PATTERNS: Record<string, number | number[]> = {
  tap: 10,
  light: 5,
  double: [10, 50, 10],
  success: [10, 30, 10, 30, 20],
  error: [50, 50, 50],
  heavy: 40,
  impact: [5, 10, 30],
  flutter: [5, 10, 5, 10, 5, 10],
};

/**
 * Check if haptics are supported
 */
export const supportsHaptics = (): boolean => {
  return 'vibrate' in navigator;
};

/**
 * Trigger haptic feedback
 */
export const triggerHaptic = (pattern: HapticPattern): boolean => {
  if (!supportsHaptics()) return false;

  try {
    const vibrationPattern =
      typeof pattern === 'string'
        ? HAPTIC_PATTERNS[pattern] || HAPTIC_PATTERNS.tap
        : pattern;

    navigator.vibrate(vibrationPattern);
    return true;
  } catch {
    return false;
  }
};

/**
 * Stop any ongoing haptic
 */
export const stopHaptic = (): void => {
  if (supportsHaptics()) {
    navigator.vibrate(0);
  }
};

// ============================================
// COMBINED FEEDBACK
// ============================================

/**
 * Play sound and haptic together
 */
export const feedback = (
  _manager: AudioManager,
  sound: () => void,
  haptic: HapticPattern
): void => {
  sound();
  triggerHaptic(haptic);
};

/**
 * Preset feedback combinations
 */
export const FEEDBACK_PRESETS = {
  flap: (manager: AudioManager) => {
    playFlapSound(manager);
    triggerHaptic('tap');
  },

  pass: (manager: AudioManager, noteIndex: number) => {
    playScaleNote(manager, noteIndex);
    triggerHaptic('double');
  },

  nearMiss: (manager: AudioManager, intensity: number) => {
    playNearMissSound(manager, intensity);
    triggerHaptic('flutter');
  },

  death: (manager: AudioManager) => {
    playImpactSound(manager);
    triggerHaptic('heavy');
  },

  milestone: (manager: AudioManager) => {
    playSuccessSound(manager, 1.2);
    triggerHaptic('success');
  },

  fireMode: (manager: AudioManager) => {
    playFireModeSound(manager);
    triggerHaptic([10, 20, 10, 20, 10, 20, 30]);
  },
};
