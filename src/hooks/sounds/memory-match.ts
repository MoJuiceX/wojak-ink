/**
 * Memory Match Sound Effects
 *
 * Extracted from useGameSounds.ts for better modularity.
 * Uses Web Audio API for synthesized sounds.
 */

// Re-export audio context helpers for use by this module
// These are managed by the main useGameSounds hook
let audioContext: AudioContext | null = null;
let volumeMultiplier = 1;

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

export const setVolumeMultiplier = (multiplier: number) => {
  volumeMultiplier = multiplier;
};

// Helper: Create sparkle cascade effect
const createSparkleCascade = (ctx: AudioContext | null, count: number = 5, baseFreq: number = 1500) => {
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

// Hover debounce state
let lastHoverTime = 0;
const HOVER_DEBOUNCE = 50; // ms between hover sounds

/**
 * Card Hover: Ultra-subtle high tick feedback
 * Debounced to prevent spam during rapid mouse movement
 */
export const createCardHoverSound = () => {
  try {
    // Debounce to prevent spam during rapid mouse movement
    const now = Date.now();
    if (now - lastHoverTime < HOVER_DEBOUNCE) return;
    lastHoverTime = now;

    const ctx = getAudioContext();
    if (!ctx) return;

    // Ultra-subtle high tick
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(2000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.03);
    osc.type = 'sine';

    // Very quiet - just a hint
    gain.gain.setValueAtTime(0.03 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.035);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.035);
  } catch {
    // Silently fail
  }
};

/**
 * Card Flip: Smooth, gentle whoosh - like a soft page turn
 * Warm, pleasant tone with gentle attack/decay
 * With random pitch variation to prevent audio fatigue
 */
export const createCardFlipSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Random pitch variation (+/-8%)
    const pitchVariation = 0.92 + Math.random() * 0.16;

    // Warm, low-mid tone for pleasant flip feel
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Add subtle filter for warmth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(0.7, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    // Warm rising tone (like lifting a card)
    const baseFreq = 280 * pitchVariation;
    const peakFreq = 420 * pitchVariation;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(peakFreq, now + 0.04);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.9, now + 0.08);
    osc.type = 'sine';

    // Soft attack, smooth decay (no harsh transient)
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08 * volumeMultiplier, now + 0.015); // Soft attack
    gain.gain.linearRampToValueAtTime(0.06 * volumeMultiplier, now + 0.04);  // Sustain
    gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, now + 0.09); // Smooth decay

    osc.start(now);
    osc.stop(now + 0.09);

    // Add subtle breath/air texture for paper feel
    const noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.3;
    }
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(800, now);
    noiseFilter.Q.setValueAtTime(1.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.015 * volumeMultiplier, now + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, now + 0.06);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
  } catch {
    // Silently fail - don't break game flow
  }
};

/**
 * Match Found: Bubbly two-note rising chime with streak escalation
 * Streak 1: Normal match - basic chime
 * Streak 2: Very good - higher pitch + extra sparkle
 * Streak 3+: Max celebration - full excitement
 */
export const createMatchFoundSound = (streak: number = 1) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Base frequencies increase with streak + slight random variation (+/-5%)
    const randomVariation = 0.95 + Math.random() * 0.1;
    const pitchMultiplier = (streak >= 3 ? 1.15 : streak === 2 ? 1.08 : 1.0) * randomVariation;
    const baseFreqs = [523 * pitchMultiplier, 659 * pitchMultiplier];

    // Volume increases slightly with streak
    const baseVolume = streak >= 3 ? 0.12 : streak === 2 ? 0.11 : 0.1;

    // Rising two-note chime (C5 -> E5, pitched up for streaks)
    baseFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.type = 'sine';

      const startTime = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(baseVolume * volumeMultiplier, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, startTime + 0.15);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });

    // Sparkle intensity increases with streak
    if (streak >= 3) {
      // Max celebration - rich sparkle cascade
      createSparkleCascade(ctx, 5, 1600);
      // Add a third harmony note for max streak
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.frequency.setValueAtTime(784 * pitchMultiplier, ctx.currentTime); // G5
      osc3.type = 'sine';
      gain3.gain.setValueAtTime(0.08 * volumeMultiplier, ctx.currentTime + 0.16);
      gain3.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.3);
      osc3.start(ctx.currentTime + 0.16);
      osc3.stop(ctx.currentTime + 0.3);
    } else if (streak === 2) {
      // Very good - extra sparkle
      createSparkleCascade(ctx, 3, 1500);
    } else {
      // Normal - light sparkle
      createSparkleCascade(ctx, 2, 1400);
    }
  } catch {
    // Silently fail - don't break game flow
  }
};

/**
 * Fast Match Bonus: Extra "zing" layer for quick matches (under 2.5s)
 * Adds energy on top of the normal match sound
 */
export const createFastMatchBonus = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Quick ascending "zing" sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Rising frequency sweep
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.12);
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.08 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);

    // Add a subtle "whoosh" overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.frequency.setValueAtTime(1200, ctx.currentTime + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.1);
    osc2.type = 'sine';

    gain2.gain.setValueAtTime(0.05 * volumeMultiplier, ctx.currentTime + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.12);

    osc2.start(ctx.currentTime + 0.02);
    osc2.stop(ctx.currentTime + 0.12);
  } catch {
    // Silently fail
  }
};

/**
 * Near-Completion Anticipation: Building tension as finish line approaches
 * 2 pairs left: Subtle rising shimmer
 * 1 pair left: More intense anticipation
 */
export const createAnticipationSound = (pairsRemaining: number) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (pairsRemaining === 2) {
      // Subtle rising shimmer - gentle excitement
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
      osc.type = 'sine';

      gain.gain.setValueAtTime(0.05 * volumeMultiplier, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.35);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);

      // Add subtle sparkle
      createSparkleCascade(ctx, 2, 1600);
    } else if (pairsRemaining === 1) {
      // More intense - you're almost there!
      // Rising two-tone with shimmer overlay
      [900, 1100].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.2, ctx.currentTime + 0.25);
        osc.type = 'sine';

        const startTime = ctx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0.06 * volumeMultiplier, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, startTime + 0.3);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });

      // Richer sparkle
      createSparkleCascade(ctx, 4, 1800);
    }
  } catch {
    // Silently fail
  }
};

/**
 * Mismatch: Soft "bonk" - almost cute
 * Low thud (150Hz), quick, NO harsh buzz
 * NOT punishing - light-hearted
 * With random pitch variation
 */
export const createMismatchSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Random pitch variation (+/-8%)
    const pitchVariation = 0.92 + Math.random() * 0.16;
    const baseFreq = 180 * pitchVariation;
    const endFreq = 120 * pitchVariation;

    // Soft low bonk
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.08);
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.06 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.1);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // Silently fail - don't break game flow
  }
};
