/**
 * BlockPuzzle Sound Functions
 *
 * Pure functions for game audio effects.
 * Each function takes an AudioContext as the first parameter.
 */

import {
  COMBO_SCALE_FREQUENCIES,
  COMBO_SOUND_CONFIG,
  LINE_CLEAR_SOUNDS,
} from './config';

/**
 * Get or create an AudioContext, handling browser prefixes.
 */
export function getAudioContext(
  audioContextRef: React.MutableRefObject<AudioContext | null>
): AudioContext {
  if (!audioContextRef.current) {
    audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContextRef.current;
}

/**
 * Play combo note with escalating musical scale.
 * Higher combos get sparkle and bass layers.
 */
export async function playComboNote(ctx: AudioContext | null, comboLevel: number): Promise<void> {
  if (!ctx) return;

  // Ensure context is running (critical for mobile)
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      console.warn('[BlockPuzzle] Failed to resume audio context for combo note');
      return;
    }
  }

  const config = COMBO_SOUND_CONFIG[Math.min(comboLevel, 5)];
  const frequency = COMBO_SCALE_FREQUENCIES[config.note];

  // Main note oscillator
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = frequency;
  osc.type = 'sine';
  gain.gain.setValueAtTime(config.volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);

  // Add sparkle layer for combo 3+
  if (config.layers >= 2) {
    const sparkleOsc = ctx.createOscillator();
    const sparkleGain = ctx.createGain();
    sparkleOsc.frequency.value = frequency * 2; // Octave up
    sparkleOsc.type = 'triangle';
    sparkleGain.gain.setValueAtTime(config.volume * 0.3, ctx.currentTime);
    sparkleGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    sparkleOsc.connect(sparkleGain).connect(ctx.destination);
    sparkleOsc.start();
    sparkleOsc.stop(ctx.currentTime + 0.15);
  }

  // Add bass layer for combo 5
  if (config.layers >= 3) {
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.frequency.value = frequency / 2; // Octave down
    bassOsc.type = 'sine';
    bassGain.gain.setValueAtTime(config.volume * 0.4, ctx.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    bassOsc.connect(bassGain).connect(ctx.destination);
    bassOsc.start();
    bassOsc.stop(ctx.currentTime + 0.2);
  }
}

/**
 * Play line clear sound with pitch variation based on lines cleared.
 * Multi-clears get an additional chime.
 */
export function playLineClearSound(ctx: AudioContext | null, linesCleared: number): void {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  try {
    const config = LINE_CLEAR_SOUNDS[Math.min(linesCleared, 4)];
    const baseFreq = 440 * config.pitch;

    // Ascending whoosh
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 0.5, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, ctx.currentTime + config.duration / 1000);
    gain.gain.setValueAtTime(config.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + config.duration / 1000);

    // Add chime for multi-clears
    if (linesCleared >= 2) {
      setTimeout(() => {
        try {
          const chimeOsc = ctx.createOscillator();
          const chimeGain = ctx.createGain();
          chimeOsc.frequency.value = baseFreq * 1.5;
          chimeOsc.type = 'triangle';
          chimeGain.gain.setValueAtTime(config.volume * 0.5, ctx.currentTime);
          chimeGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          chimeOsc.connect(chimeGain).connect(ctx.destination);
          chimeOsc.start();
          chimeOsc.stop(ctx.currentTime + 0.2);
        } catch (e) {
          console.error('[BlockPuzzle] chime error:', e);
        }
      }, 50);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Play piece spawn sound with slight pitch variation.
 */
export function playSpawnSound(ctx: AudioContext | null): void {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  try {
    const pitch = 0.95 + Math.random() * 0.1;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 600 * pitch;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Ignore errors
  }
}

/**
 * Play piece snap/lock sound - deep thunk with click overlay.
 */
export function playSnapSound(ctx: AudioContext | null): void {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  try {
    // Deep thunk (80Hz bass)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 80;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);

    // Click overlay
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.frequency.value = 400;
    clickOsc.type = 'square';
    clickGain.gain.setValueAtTime(0.15, ctx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
    clickOsc.connect(clickGain).connect(ctx.destination);
    clickOsc.start();
    clickOsc.stop(ctx.currentTime + 0.03);
  } catch {
    // Ignore errors
  }
}

/**
 * Play invalid placement sound - short buzz/rejection.
 */
export function playInvalidSound(ctx: AudioContext | null): void {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  try {
    // Short buzz/rejection sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 150;
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Ignore errors
  }
}

/**
 * Play combo break sound - descending "womp womp".
 * Only plays for combos of 3+.
 */
export function playComboBreakSound(ctx: AudioContext | null, lostCombo: number): void {
  if (!ctx || lostCombo < 3) return;
  if (ctx.state === 'suspended') ctx.resume();

  // Descending "womp womp"
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

/**
 * Danger sound state for managing the continuous danger oscillator.
 */
export interface DangerSoundState {
  oscillator: OscillatorNode | null;
  gain: GainNode | null;
}

/**
 * Start danger heartbeat loop - low frequency pulse.
 * Returns refs to oscillator and gain for later stopping.
 */
export function startDangerSound(
  ctx: AudioContext | null,
  dangerState: DangerSoundState
): DangerSoundState {
  if (!ctx || dangerState.oscillator) return dangerState;
  if (ctx.state === 'suspended') ctx.resume();

  // Low frequency pulse
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 40;
  osc.type = 'sine';
  gain.gain.value = 0;
  osc.connect(gain).connect(ctx.destination);
  osc.start();

  // Fade in
  gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.5);

  return {
    oscillator: osc,
    gain: gain,
  };
}

/**
 * Stop danger heartbeat loop with fade out.
 */
export function stopDangerSound(
  ctx: AudioContext | null,
  dangerState: DangerSoundState
): DangerSoundState {
  if (dangerState.oscillator && dangerState.gain && ctx) {
    dangerState.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    setTimeout(() => {
      dangerState.oscillator?.stop();
    }, 300);
  }
  return {
    oscillator: null,
    gain: null,
  };
}

/**
 * Play perfect clear fanfare - triumphant ascending arpeggio (C5-E5-G5-C6).
 */
export function playPerfectClearSound(ctx: AudioContext | null): void {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  // Triumphant ascending arpeggio (C5-E5-G5-C6)
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }, i * 100);
  });
}

/**
 * Play streak fire activation sound - whoosh + ignition.
 */
export function playStreakFireSound(ctx: AudioContext | null): void {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  // Whoosh + ignition
  const noiseLength = 0.3;
  const bufferSize = ctx.sampleRate * noiseLength;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  noise.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  noiseGain.gain.setValueAtTime(0.3, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + noiseLength);
  noise.connect(filter).connect(noiseGain).connect(ctx.destination);
  noise.start();
}
