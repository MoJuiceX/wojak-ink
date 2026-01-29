/**
 * Generic Game Sound Effects
 *
 * Common sounds shared across multiple games:
 * - Win/level complete sounds (5 variations)
 * - Block land, perfect bonus, combo sounds
 * - Helper functions for sound design
 */

// Local audio context singleton
let audioContext: AudioContext | null = null;
let volumeMultiplier = 1;
let visibilityHandlerSetup = false;

export const getAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Set up visibility change handler once to suspend/resume audio context
      // This ensures synthesized sounds stop when browser goes to background on mobile
      if (!visibilityHandlerSetup) {
        visibilityHandlerSetup = true;
        document.addEventListener('visibilitychange', () => {
          if (audioContext) {
            if (document.hidden) {
              // Suspend audio context when page is hidden (stops all oscillators)
              audioContext.suspend();
            } else {
              // Resume audio context when page becomes visible
              audioContext.resume();
            }
          }
        });
      }
    } catch {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  // Resume if suspended (browsers require user interaction)
  if (audioContext.state === 'suspended' && !document.hidden) {
    audioContext.resume();
  }
  return audioContext;
};

export const setVolumeMultiplier = (multiplier: number) => {
  volumeMultiplier = multiplier;
};

// Combo pitch frequencies (musical semitones C5 -> C6)
const COMBO_FREQUENCIES = [
  523,  // C5  - combo 1
  587,  // D5  - combo 2
  659,  // E5  - combo 3
  784,  // G5  - combo 4
  880,  // A5  - combo 5
  1047, // C6  - combo max
];

// ============================================
// HELPER: Create soft, bubbly pop sound
// ============================================
export const createSoftPop = (ctx: AudioContext | null, freq: number = 800, duration: number = 0.08) => {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Soft pop: quick frequency drop gives "bubble pop" feel
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + duration);
    osc.type = 'sine';

    // Fast attack, smooth decay
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12 * volumeMultiplier, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail - don't break game flow
  }
};

// ============================================
// HELPER: Create chime tail (satisfying resonance)
// ============================================
export const createChimeTail = (ctx: AudioContext | null, freq: number = 1200, delay: number = 0.02) => {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    osc.type = 'sine';

    const startTime = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0.06 * volumeMultiplier, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, startTime + 0.15);

    osc.start(startTime);
    osc.stop(startTime + 0.15);
  } catch {
    // Silently fail - don't break game flow
  }
};

// ============================================
// HELPER: Create sparkle cascade
// ============================================
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

// ============================================
// WIN/LEVEL COMPLETE SOUNDS (5 variations)
// ============================================

// Triumphant sparkle cascade + chord
export const createWinSparkle = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Major chord (C5, E5, G5)
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.type = 'sine';

      const startTime = ctx.currentTime + i * 0.03;
      gain.gain.setValueAtTime(0.1 * volumeMultiplier, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, startTime + 0.5);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });

    // Sparkle overlay
    createSparkleCascade(ctx, 6, 1800);
  } catch {
    // Silently fail
  }
};

// Ascending arpeggio (C5 -> E5 -> G5 -> C6)
export const createWinArpeggio = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.type = 'triangle';

      const startTime = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1 * volumeMultiplier, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, startTime + 0.25);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  } catch {
    // Silently fail
  }
};

// Bubbly celebration (multiple soft pops)
export const createWinBubbles = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Rising frequency pops
    [600, 800, 1000, 1200, 1400].forEach((freq, i) => {
      setTimeout(() => {
        createSoftPop(ctx, freq, 0.1);
      }, i * 50);
    });
  } catch {
    // Silently fail
  }
};

// Gentle bell chime
export const createWinBell = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    // Bell: fundamental + overtone
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.setValueAtTime(880 * 2.4, ctx.currentTime); // Bell overtone ratio
    osc.type = 'sine';
    osc2.type = 'sine';

    gain.gain.setValueAtTime(0.12 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.6);

    osc.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    osc2.stop(ctx.currentTime + 0.6);

    // Add sparkle
    createSparkleCascade(ctx, 4, 2000);
  } catch {
    // Silently fail
  }
};

// Magical shimmer
export const createWinShimmer = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Multiple detuned oscillators for shimmer
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const baseFreq = 1047; // C6
      const detune = (i - 1.5) * 8; // Slight detune for shimmer
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.detune.setValueAtTime(detune, ctx.currentTime);
      osc.type = 'sine';

      gain.gain.setValueAtTime(0.06 * volumeMultiplier, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.8);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    }
  } catch {
    // Silently fail
  }
};

// Array of all win sounds for random selection
export const WIN_SOUNDS = [
  createWinSparkle,
  createWinArpeggio,
  createWinBubbles,
  createWinBell,
  createWinShimmer,
];

// ============================================
// GAME ACTION SOUNDS
// ============================================

/**
 * Score/Block Land: Soft POP + subtle chime tail
 * Like bubble popping, 50-80ms, ~800Hz with harmonic
 */
export const createBlockLandSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Main soft pop
    createSoftPop(ctx, 800, 0.06);

    // Subtle chime tail for satisfaction
    createChimeTail(ctx, 1200, 0.02);
  } catch {
    // Silently fail - don't break game flow
  }
};

/**
 * Perfect Bonus: Sparkle cascade + bright chord
 * Pure celebration - rising frequencies
 */
export const createPerfectBonusSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Quick ascending two-note chime (C5 -> E5)
    [523, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.type = 'sine';

      const startTime = ctx.currentTime + i * 0.06;
      gain.gain.setValueAtTime(0.1 * volumeMultiplier, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, startTime + 0.18);

      osc.start(startTime);
      osc.stop(startTime + 0.18);
    });

    // Add sparkle overlay
    createSparkleCascade(ctx, 4, 1600);
  } catch {
    // Silently fail - don't break game flow
  }
};

/**
 * Combo Sound: Escalating pitch (C5 -> C6)
 * THE ADDICTION ENGINE - each level rises by semitone/third
 * Makes players subconsciously want to hear the NEXT sound
 */
export const createComboSound = (comboLevel: number) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Get frequency based on combo level (capped at C6)
    const freqIndex = Math.min(comboLevel - 1, COMBO_FREQUENCIES.length - 1);
    const baseFreq = COMBO_FREQUENCIES[Math.max(0, freqIndex)];

    // Main bubbly pop
    createSoftPop(ctx, baseFreq, 0.08 + comboLevel * 0.01);

    // Chime that gets brighter with higher combos
    createChimeTail(ctx, baseFreq * 1.5, 0.015);

    // Add sparkle at higher combos
    if (comboLevel >= 3) {
      createSparkleCascade(ctx, Math.min(comboLevel - 1, 4), baseFreq * 2);
    }

    // At max combo, add magical shimmer
    if (comboLevel >= 6) {
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        const detune = (i - 1) * 12;
        osc.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime);
        osc.detune.setValueAtTime(detune, ctx.currentTime);
        osc.type = 'sine';

        const startTime = ctx.currentTime + 0.05;
        gain.gain.setValueAtTime(0.04 * volumeMultiplier, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, startTime + 0.3);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      }
    }
  } catch {
    // Silently fail - don't break game flow
  }
};
