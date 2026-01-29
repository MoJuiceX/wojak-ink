/**
 * Brick Breaker Sound Effects
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

// Helper function used by powerup collect (extralife)
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

// ============================================
// BRICK DESTROY VARIATIONS
// ============================================

/**
 * Brick Breaker Normal Brick Destroy: Satisfying pop/crunch when normal brick is destroyed
 * 100-150ms, crisp, rewarding
 * Has 4 variations to prevent audio fatigue
 */
const brickDestroyVariations = [
  // Variation 1: Classic pop/crunch (original)
  (ctx: AudioContext, isStrong: boolean, basePitch: number, baseVolume: number) => {
    const pitchVariation = 0.9 + Math.random() * 0.2;
    const baseFreq = 500 * basePitch * pitchVariation;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, ctx.currentTime + 0.1);
    osc.type = 'sine';
    gain.gain.setValueAtTime(baseVolume * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);

    // Noise layer
    const noiseLength = isStrong ? 0.15 : 0.1;
    const bufferSize = ctx.sampleRate * noiseLength;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const envelope = Math.exp(-i / (bufferSize * 0.3));
      noiseData[i] = (Math.random() * 2 - 1) * envelope;
    }
    const noiseSource = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    noiseSource.buffer = noiseBuffer;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(isStrong ? 1500 : 2000, ctx.currentTime);
    noiseFilter.Q.setValueAtTime(1, ctx.currentTime);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseGain.gain.setValueAtTime((isStrong ? 0.08 : 0.06) * volumeMultiplier, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + noiseLength);
    noiseSource.start(ctx.currentTime);

    if (!isStrong) {
      const pop = ctx.createOscillator();
      const popGain = ctx.createGain();
      pop.connect(popGain);
      popGain.connect(ctx.destination);
      pop.frequency.setValueAtTime(1200 * pitchVariation, ctx.currentTime);
      pop.frequency.exponentialRampToValueAtTime(600 * pitchVariation, ctx.currentTime + 0.04);
      pop.type = 'sine';
      popGain.gain.setValueAtTime(0.06 * volumeMultiplier, ctx.currentTime);
      popGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.05);
      pop.start(ctx.currentTime);
      pop.stop(ctx.currentTime + 0.05);
    }
  },
  // Variation 2: Bubbly pop
  (ctx: AudioContext, _isStrong: boolean, basePitch: number, baseVolume: number) => {
    const pitchVariation = 0.92 + Math.random() * 0.16;
    const baseFreq = 550 * basePitch * pitchVariation;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(baseFreq * 1.2, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, ctx.currentTime + 0.08);
    osc.type = 'sine';
    gain.gain.setValueAtTime(baseVolume * 0.9 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);

    // Bubble overtone
    const bubble = ctx.createOscillator();
    const bubbleGain = ctx.createGain();
    bubble.connect(bubbleGain);
    bubbleGain.connect(ctx.destination);
    bubble.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime + 0.01);
    bubble.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, ctx.currentTime + 0.06);
    bubble.type = 'sine';
    bubbleGain.gain.setValueAtTime(0.05 * volumeMultiplier, ctx.currentTime + 0.01);
    bubbleGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.07);
    bubble.start(ctx.currentTime + 0.01);
    bubble.stop(ctx.currentTime + 0.07);
  },
  // Variation 3: Snappy crack
  (ctx: AudioContext, isStrong: boolean, basePitch: number, baseVolume: number) => {
    const pitchVariation = 0.88 + Math.random() * 0.24;
    const baseFreq = 480 * basePitch * pitchVariation;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.25, ctx.currentTime + 0.07);
    osc.type = 'triangle';
    gain.gain.setValueAtTime(baseVolume * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.09);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.09);

    // Sharp transient
    const noiseLength = 0.04;
    const bufferSize = ctx.sampleRate * noiseLength;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const envelope = Math.exp(-i / (bufferSize * 0.15));
      noiseData[i] = (Math.random() * 2 - 1) * envelope;
    }
    const noiseSource = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    noiseSource.buffer = noiseBuffer;
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(isStrong ? 1800 : 2500, ctx.currentTime);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseGain.gain.setValueAtTime((isStrong ? 0.09 : 0.07) * volumeMultiplier, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + noiseLength);
    noiseSource.start(ctx.currentTime);
  },
  // Variation 4: Chunky crumble
  (ctx: AudioContext, _isStrong: boolean, basePitch: number, baseVolume: number) => {
    const pitchVariation = 0.85 + Math.random() * 0.3;
    const baseFreq = 420 * basePitch * pitchVariation;

    // Lower, heavier thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.2, ctx.currentTime + 0.12);
    osc.type = 'sine';
    gain.gain.setValueAtTime(baseVolume * 1.1 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.14);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.14);

    // Crumbly noise with multiple frequencies
    for (let j = 0; j < 2; j++) {
      const crumb = ctx.createOscillator();
      const crumbGain = ctx.createGain();
      crumb.connect(crumbGain);
      crumbGain.connect(ctx.destination);
      crumb.frequency.setValueAtTime(baseFreq * (1.5 + j * 0.5), ctx.currentTime + j * 0.02);
      crumb.frequency.exponentialRampToValueAtTime(baseFreq * (0.5 + j * 0.2), ctx.currentTime + 0.06 + j * 0.02);
      crumb.type = 'triangle';
      crumbGain.gain.setValueAtTime(0.04 * volumeMultiplier, ctx.currentTime + j * 0.02);
      crumbGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.08 + j * 0.02);
      crumb.start(ctx.currentTime + j * 0.02);
      crumb.stop(ctx.currentTime + 0.08 + j * 0.02);
    }
  },
];

export const createBrickBreakerBrickDestroySound = (brickType: 'normal' | 'strong' = 'normal') => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const isStrong = brickType === 'strong';
    const baseVolume = isStrong ? 0.14 : 0.12;
    const basePitch = isStrong ? 0.85 : 1.0;

    // Randomly select a variation
    const variation = brickDestroyVariations[Math.floor(Math.random() * brickDestroyVariations.length)];
    variation(ctx, isStrong, basePitch, baseVolume);
  } catch {
    // Silently fail
  }
};

// ============================================
// WALL HIT VARIATIONS
// ============================================

/**
 * Brick Breaker Wall Hit: Subtle ping when ball bounces off walls
 * 50-80ms, clean, quieter than paddle/brick hits
 * Has 4 variations to prevent audio fatigue
 */
const wallHitVariations = [
  // Variation 1: Clean ping (original)
  (ctx: AudioContext) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const baseFreq = 600 + Math.random() * 100;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, ctx.currentTime + 0.05);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.06 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.06);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  },
  // Variation 2: Softer, lower tap
  (ctx: AudioContext) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const baseFreq = 500 + Math.random() * 80;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, ctx.currentTime + 0.04);
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.05 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  },
  // Variation 3: Brighter tick
  (ctx: AudioContext) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const baseFreq = 700 + Math.random() * 120;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, ctx.currentTime + 0.035);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.055 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.045);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.045);
  },
  // Variation 4: Subtle double-tap
  (ctx: AudioContext) => {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    const baseFreq = 550 + Math.random() * 90;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, ctx.currentTime + 0.03);
    osc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.015);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq, ctx.currentTime + 0.05);
    osc.type = 'sine';
    osc2.type = 'sine';
    gain.gain.setValueAtTime(0.04 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.055);
    osc.start(ctx.currentTime);
    osc2.start(ctx.currentTime + 0.015);
    osc.stop(ctx.currentTime + 0.03);
    osc2.stop(ctx.currentTime + 0.055);
  },
];

export const createBrickBreakerWallHitSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    // Randomly select a variation
    const variation = wallHitVariations[Math.floor(Math.random() * wallHitVariations.length)];
    variation(ctx);
  } catch {
    // Silently fail
  }
};

// ============================================
// PADDLE HIT VARIATIONS
// ============================================

/**
 * Brick Breaker Paddle Hit: Rubbery thwack with pitch variation based on hit position
 * 80-120ms, edges = higher pitch
 * hitPosition: 0 = left edge, 0.5 = center, 1 = right edge
 * Has 3 character variations to prevent audio fatigue
 */
const paddleHitVariations = [
  // Variation 1: Classic rubbery thwack (original)
  (ctx: AudioContext, pitchMultiplier: number) => {
    const baseFreq = 350 * pitchMultiplier;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, ctx.currentTime + 0.08);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.12 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);

    // Boing overtone
    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtone.connect(overtoneGain);
    overtoneGain.connect(ctx.destination);
    overtone.frequency.setValueAtTime(baseFreq * 2.5, ctx.currentTime);
    overtone.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, ctx.currentTime + 0.06);
    overtone.type = 'sine';
    overtoneGain.gain.setValueAtTime(0.06 * volumeMultiplier, ctx.currentTime);
    overtoneGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.08);
    overtone.start(ctx.currentTime);
    overtone.stop(ctx.currentTime + 0.08);
  },
  // Variation 2: Snappier, shorter thwack
  (ctx: AudioContext, pitchMultiplier: number) => {
    const baseFreq = 380 * pitchMultiplier;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.35, ctx.currentTime + 0.06);
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.11 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);

    // Quick high tap
    const tap = ctx.createOscillator();
    const tapGain = ctx.createGain();
    tap.connect(tapGain);
    tapGain.connect(ctx.destination);
    tap.frequency.setValueAtTime(baseFreq * 3, ctx.currentTime);
    tap.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.03);
    tap.type = 'sine';
    tapGain.gain.setValueAtTime(0.05 * volumeMultiplier, ctx.currentTime);
    tapGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.04);
    tap.start(ctx.currentTime);
    tap.stop(ctx.currentTime + 0.04);
  },
  // Variation 3: Softer, bouncier hit
  (ctx: AudioContext, pitchMultiplier: number) => {
    const baseFreq = 320 * pitchMultiplier;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, ctx.currentTime + 0.1);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);

    // Warmer overtone
    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtone.connect(overtoneGain);
    overtoneGain.connect(ctx.destination);
    overtone.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime);
    overtone.frequency.exponentialRampToValueAtTime(baseFreq, ctx.currentTime + 0.08);
    overtone.type = 'sine';
    overtoneGain.gain.setValueAtTime(0.05 * volumeMultiplier, ctx.currentTime);
    overtoneGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.1);
    overtone.start(ctx.currentTime);
    overtone.stop(ctx.currentTime + 0.1);
  },
];

export const createBrickBreakerPaddleHitSound = (hitPosition: number = 0.5) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Base pitch varies based on hit position (edges = higher)
    const basePitch = 1.0;
    const pitchVariation = Math.abs(hitPosition - 0.5) * 0.3; // +/-15% at edges
    const pitchMultiplier = basePitch + pitchVariation;

    // Randomly select a variation
    const variation = paddleHitVariations[Math.floor(Math.random() * paddleHitVariations.length)];
    variation(ctx, pitchMultiplier);
  } catch {
    // Silently fail
  }
};

// ============================================
// COMBO SOUNDS
// ============================================

/**
 * Brick Breaker Combo Sound: Escalating pitch and layers with combo count
 * The addiction engine - each level rises, makes players want to hear NEXT sound
 */
export const createBrickBreakerComboSound = (combo: number) => {
  try {
    const ctx = getAudioContext();
    if (!ctx || combo < 3) return;

    // Escalating parameters
    const pitch = Math.min(1.0 + (combo - 3) * 0.1, 1.5);
    const volume = Math.min(0.4 + (combo - 3) * 0.05, 0.65);
    const baseFreq = 523 * pitch; // C5 scaled by pitch

    // Main combo chime
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, ctx.currentTime + 0.08);
    osc.type = 'sine';

    gain.gain.setValueAtTime(volume * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);

    // Add sparkle layer at combo 5+
    if (combo >= 5) {
      for (let i = 0; i < Math.min(combo - 3, 4); i++) {
        const sparkle = ctx.createOscillator();
        const sparkleGain = ctx.createGain();

        sparkle.connect(sparkleGain);
        sparkleGain.connect(ctx.destination);

        const sparkleFreq = baseFreq * 2 + i * 200 + Math.random() * 100;
        sparkle.frequency.setValueAtTime(sparkleFreq, ctx.currentTime);
        sparkle.type = 'sine';

        const startTime = ctx.currentTime + 0.03 + i * 0.02;
        sparkleGain.gain.setValueAtTime(0.04 * volumeMultiplier, startTime);
        sparkleGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, startTime + 0.1);

        sparkle.start(startTime);
        sparkle.stop(startTime + 0.1);
      }
    }

    // Add bass hit at combo 8+
    if (combo >= 8) {
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();

      bass.connect(bassGain);
      bassGain.connect(ctx.destination);

      bass.frequency.setValueAtTime(80, ctx.currentTime);
      bass.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
      bass.type = 'sine';

      bassGain.gain.setValueAtTime(0.15 * volumeMultiplier, ctx.currentTime);
      bassGain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.12);

      bass.start(ctx.currentTime);
      bass.stop(ctx.currentTime + 0.12);
    }

    // Full celebration shimmer at combo 10+
    if (combo >= 10) {
      for (let i = 0; i < 3; i++) {
        const shimmer = ctx.createOscillator();
        const shimmerGain = ctx.createGain();

        shimmer.connect(shimmerGain);
        shimmerGain.connect(ctx.destination);

        shimmer.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime);
        shimmer.detune.setValueAtTime((i - 1) * 10, ctx.currentTime);
        shimmer.type = 'sine';

        const startTime = ctx.currentTime + 0.05;
        shimmerGain.gain.setValueAtTime(0.05 * volumeMultiplier, startTime);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, startTime + 0.25);

        shimmer.start(startTime);
        shimmer.stop(startTime + 0.25);
      }
    }
  } catch {
    // Silently fail
  }
};

/**
 * Brick Breaker Combo Break: Soft "plink-down" when combo is lost
 * Not harsh - subtle disappointment, encourages trying again
 */
export const createBrickBreakerComboBreakSound = (lostCombo: number) => {
  try {
    const ctx = getAudioContext();
    if (!ctx || lostCombo < 3) return; // Only for meaningful combos

    // Descending tone - opposite of combo escalation
    const baseFreq = 400 + Math.min(lostCombo, 10) * 20;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);

    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, ctx.currentTime + 0.2);
    osc.type = 'sine';

    const vol = Math.min(0.15 + lostCombo * 0.02, 0.3) * volumeMultiplier;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.25);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Silently fail
  }
};

// ============================================
// BALL LOST SOUND
// ============================================

/**
 * Brick Breaker Ball Lost: Descending "womp" when ball falls off bottom
 * 300-400ms, deflating, NOT game over - just a setback
 */
export const createBrickBreakerBallLostSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Descending tone - "womp"
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Falling frequency
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.35);
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.12 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.35);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);

    // Add subtle "aww" undertone
    const undertone = ctx.createOscillator();
    const undertoneGain = ctx.createGain();

    undertone.connect(undertoneGain);
    undertoneGain.connect(ctx.destination);

    undertone.frequency.setValueAtTime(300, ctx.currentTime + 0.05);
    undertone.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);
    undertone.type = 'sine';

    undertoneGain.gain.setValueAtTime(0.06 * volumeMultiplier, ctx.currentTime + 0.05);
    undertoneGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.4);

    undertone.start(ctx.currentTime + 0.05);
    undertone.stop(ctx.currentTime + 0.4);
  } catch {
    // Silently fail
  }
};

// ============================================
// POWERUP SOUNDS
// ============================================

/**
 * Brick Breaker Powerup Collect: Type-specific sounds for collecting powerups
 * Each type has a distinct character to build recognition
 */
export const createBrickBreakerPowerupCollectSound = (type: string) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    switch (type) {
      case 'expand': {
        // Stretching/growing sound - elastic feel
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.1 * volumeMultiplier, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.2);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);

        // Add "boing" overtone
        const boing = ctx.createOscillator();
        const boingGain = ctx.createGain();
        boing.connect(boingGain);
        boingGain.connect(ctx.destination);

        boing.frequency.setValueAtTime(800, ctx.currentTime + 0.05);
        boing.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
        boing.type = 'sine';

        boingGain.gain.setValueAtTime(0.06 * volumeMultiplier, ctx.currentTime + 0.05);
        boingGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.18);

        boing.start(ctx.currentTime + 0.05);
        boing.stop(ctx.currentTime + 0.18);
        break;
      }

      case 'multiball': {
        // Split/multiply - bubbly pops
        [400, 600, 800].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 0.08);
          osc.type = 'sine';

          const startTime = ctx.currentTime + i * 0.06;
          gain.gain.setValueAtTime(0.08 * volumeMultiplier, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, startTime + 0.1);

          osc.start(startTime);
          osc.stop(startTime + 0.1);
        });
        break;
      }

      case 'fireball': {
        // Ignition whoosh - fiery
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);
        osc.type = 'sawtooth';

        gain.gain.setValueAtTime(0.08 * volumeMultiplier, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.2);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);

        // Add crackle noise
        const noiseLength = 0.15;
        const bufferSize = ctx.sampleRate * noiseLength;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          const envelope = Math.exp(-i / (bufferSize * 0.4));
          noiseData[i] = (Math.random() * 2 - 1) * envelope;
        }

        const noiseSource = ctx.createBufferSource();
        const noiseFilter = ctx.createBiquadFilter();
        const noiseGain = ctx.createGain();

        noiseSource.buffer = noiseBuffer;
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(2000, ctx.currentTime);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        noiseGain.gain.setValueAtTime(0.05 * volumeMultiplier, ctx.currentTime + 0.05);
        noiseGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.2);

        noiseSource.start(ctx.currentTime + 0.05);
        break;
      }

      case 'slow': {
        // Deceleration - winding down
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.08 * volumeMultiplier, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.3);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        break;
      }

      case 'extralife': {
        // Triumphant celebration - rising chord
        const notes = [523, 659, 784]; // C, E, G (major chord)

        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          osc.type = 'sine';

          const startTime = ctx.currentTime + i * 0.05;
          gain.gain.setValueAtTime(0.08 * volumeMultiplier, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, startTime + 0.25);

          osc.start(startTime);
          osc.stop(startTime + 0.25);
        });

        // Add sparkle
        createSparkleCascade(ctx, 4, 1600);
        break;
      }

      default: {
        // Generic powerup sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.15);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.1 * volumeMultiplier, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.2);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      }
    }
  } catch {
    // Silently fail
  }
};

/**
 * Brick Breaker Powerup Spawn: Sparkle/chime when powerup drops from destroyed brick
 * 200-300ms, magical, conveys something special
 */
export const createBrickBreakerPowerupSpawnSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Magical sparkle chime
    const notes = [1200, 1500, 1800]; // Rising sparkle

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.type = 'sine';

      const startTime = ctx.currentTime + i * 0.05;
      gain.gain.setValueAtTime(0.06 * volumeMultiplier, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, startTime + 0.15);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });

    // Add subtle shimmer overlay
    for (let i = 0; i < 3; i++) {
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();

      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);

      const shimmerFreq = 2000 + Math.random() * 500;
      shimmer.frequency.setValueAtTime(shimmerFreq, ctx.currentTime);
      shimmer.type = 'sine';

      const startTime = ctx.currentTime + 0.08 + i * 0.03;
      shimmerGain.gain.setValueAtTime(0.03 * volumeMultiplier, startTime);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, startTime + 0.1);

      shimmer.start(startTime);
      shimmer.stop(startTime + 0.1);
    }
  } catch {
    // Silently fail
  }
};

// ============================================
// BRICK HIT SOUNDS
// ============================================

/**
 * Brick Breaker Unbreakable Brick Hit: Metallic clang when hitting gray unbreakable bricks
 * 80-100ms, solid metallic thunk, conveys immovable obstacle
 */
export const createBrickBreakerUnbreakableHitSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Metallic clang - two detuned oscillators for bell-like quality
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    // Random slight pitch variation
    const pitchVariation = 0.95 + Math.random() * 0.1;
    const baseFreq = 180 * pitchVariation;

    // Low fundamental + high metallic overtone
    osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, ctx.currentTime + 0.08);
    osc1.type = 'triangle';

    osc2.frequency.setValueAtTime(baseFreq * 4.5, ctx.currentTime); // Metallic overtone
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 3, ctx.currentTime + 0.06);
    osc2.type = 'sine';

    gain.gain.setValueAtTime(0.1 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.1);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.1);

    // Add subtle metallic "ring" decay
    const ring = ctx.createOscillator();
    const ringGain = ctx.createGain();

    ring.connect(ringGain);
    ringGain.connect(ctx.destination);

    ring.frequency.setValueAtTime(baseFreq * 6, ctx.currentTime);
    ring.type = 'sine';

    ringGain.gain.setValueAtTime(0.03 * volumeMultiplier, ctx.currentTime + 0.02);
    ringGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.15);

    ring.start(ctx.currentTime + 0.02);
    ring.stop(ctx.currentTime + 0.15);
  } catch {
    // Silently fail
  }
};

/**
 * Brick Breaker Strong Brick Crack: Sound when strong brick is hit but not destroyed
 * 100-120ms, stone/concrete crack, conveys damage but not destruction
 */
export const createBrickBreakerBrickCrackSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Sharp crack sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Random pitch variation
    const pitchVariation = 0.9 + Math.random() * 0.2;
    const baseFreq = 300 * pitchVariation;

    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, ctx.currentTime + 0.08);
    osc.type = 'triangle'; // Slightly harsher than sine

    gain.gain.setValueAtTime(0.1 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.1);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);

    // Add sharp "crack" noise burst
    const crackLength = 0.06;
    const bufferSize = ctx.sampleRate * crackLength;
    const crackBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const crackData = crackBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const envelope = Math.exp(-i / (bufferSize * 0.15)); // Very quick decay
      crackData[i] = (Math.random() * 2 - 1) * envelope;
    }

    const crackSource = ctx.createBufferSource();
    const crackFilter = ctx.createBiquadFilter();
    const crackGain = ctx.createGain();

    crackSource.buffer = crackBuffer;
    crackFilter.type = 'highpass';
    crackFilter.frequency.setValueAtTime(1000, ctx.currentTime);

    crackSource.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(ctx.destination);

    crackGain.gain.setValueAtTime(0.08 * volumeMultiplier, ctx.currentTime);
    crackGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + crackLength);

    crackSource.start(ctx.currentTime);
  } catch {
    // Silently fail
  }
};
