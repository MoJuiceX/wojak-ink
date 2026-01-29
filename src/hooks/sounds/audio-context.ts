/**
 * Shared Audio Context Utilities
 *
 * Provides a singleton AudioContext and volume multiplier
 * for all game sound modules.
 */

// Create audio context singleton
let audioContext: AudioContext | null = null;

export const getAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  // Resume if suspended (browsers require user interaction)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

// Volume multiplier for scaling gain nodes
export let volumeMultiplier = 1;

export const setVolumeMultiplier = (value: number) => {
  volumeMultiplier = value;
};

/**
 * Helper: Create sparkle cascade effect
 * Used for celebratory sounds like match found and anticipation
 */
export const createSparkleCascade = (ctx: AudioContext | null, count: number = 5, baseFreq: number = 1500) => {
  if (!ctx) return;
  try {
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Rising sparkle frequencies
      const freq = baseFreq + i * 200 + Math.random() * 100;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.type = 'sine';

      const startTime = ctx.currentTime + i * 0.04;
      gain.gain.setValueAtTime(0.05 * volumeMultiplier, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, startTime + 0.12);

      osc.start(startTime);
      osc.stop(startTime + 0.12);
    }
  } catch {
    // Silently fail - don't break game flow
  }
};
