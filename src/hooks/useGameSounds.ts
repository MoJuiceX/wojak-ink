/**
 * Game Sounds Hook
 *
 * Provides sound effects for all games.
 * Uses MP3-based sounds from SoundManager when available,
 * with Web Audio API synthesized sounds as fallback.
 */

import { useCallback, useRef, useEffect } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { useSettings } from '@/contexts/SettingsContext';
import { SoundManager } from '@/systems/audio/SoundManager';
import { getComboSound } from '@/systems/audio/sounds';
import {
  createCardHoverSound,
  createCardFlipSound,
  createMatchFoundSound,
  createFastMatchBonus,
  createAnticipationSound,
  createMismatchSound,
  setVolumeMultiplier as setMemoryMatchVolume,
} from './sounds/memory-match';
import {
  createBrickBreakerBrickDestroySound,
  createBrickBreakerComboSound,
  createBrickBreakerComboBreakSound,
  createBrickBreakerBallLostSound,
  createBrickBreakerPowerupCollectSound,
  createBrickBreakerPowerupSpawnSound,
  createBrickBreakerUnbreakableHitSound,
  createBrickBreakerBrickCrackSound,
  createBrickBreakerWallHitSound,
  createBrickBreakerPaddleHitSound,
  setVolumeMultiplier as setBrickBreakerVolume,
} from './sounds/brick-breaker';
import {
  WIN_SOUNDS,
  createBlockLandSound,
  createPerfectBonusSound,
  createComboSound,
  createSoftPop,
  createChimeTail,
  createSparkleCascade,
  getAudioContext,
  setVolumeMultiplier as setGenericVolume,
} from './sounds/generic';

// Volume multiplier for scaling gain nodes (local reference for sounds not yet extracted)
let volumeMultiplier = 1;

// Orange Pong sounds

/**
 * Paddle Hit: Satisfying "thock" - soft but present
 */
const createPaddleHitSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Soft thock
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.04);
  osc.type = 'sine'; // Softer than square

  gain.gain.setValueAtTime(0.1 * volumeMultiplier, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.06);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.06);

  // Light chime tail
  createChimeTail(ctx, 800, 0.02);
};

/**
 * Wall Bounce: Subtle soft tap
 */
const createWallBounceSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Very subtle pop
  createSoftPop(ctx, 500, 0.04);
};

/**
 * Score Point: Rising chime - satisfying "you scored!"
 */
const createScorePointSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Rising two-note chime
  [523, 659].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.type = 'sine';

    const startTime = ctx.currentTime + i * 0.08;
    gain.gain.setValueAtTime(0.1 * volumeMultiplier, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, startTime + 0.15);

    osc.start(startTime);
    osc.stop(startTime + 0.15);
  });
};

// Brick Breaker sounds

/**
 * Ball Launch: Ascending whoosh/ping when ball is launched
 * 150-200ms, energetic, conveys momentum
 */
const createBallLaunchSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Main ascending sweep (whoosh)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Rising frequency for launch feel
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.1 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.18);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);

    // Add a bright "ping" at the peak
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();

    ping.connect(pingGain);
    pingGain.connect(ctx.destination);

    ping.frequency.setValueAtTime(1200, ctx.currentTime + 0.08);
    ping.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.2);
    ping.type = 'sine';

    pingGain.gain.setValueAtTime(0.08 * volumeMultiplier, ctx.currentTime + 0.08);
    pingGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.2);

    ping.start(ctx.currentTime + 0.08);
    ping.stop(ctx.currentTime + 0.2);
  } catch {
    // Silently fail
  }
};


// Brick Breaker anticipation loop state
let brickBreakerAnticipationOsc: OscillatorNode | null = null;
let brickBreakerAnticipationGain: GainNode | null = null;

// Brick Breaker fireball loop state
let brickBreakerFireballOsc: OscillatorNode | null = null;
let brickBreakerFireballOsc2: OscillatorNode | null = null;
let brickBreakerFireballGain: GainNode | null = null;
let brickBreakerFireballNoiseSource: AudioBufferSourceNode | null = null;

/**
 * Brick Breaker Anticipation Loop: Tension-building sound when 1-3 bricks remain
 * Quieter, subtle tone that plays for 2 seconds then slowly fades out over 6 seconds
 */
const startBrickBreakerAnticipation = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx || brickBreakerAnticipationOsc) return; // Already playing

    brickBreakerAnticipationOsc = ctx.createOscillator();
    brickBreakerAnticipationGain = ctx.createGain();

    brickBreakerAnticipationOsc.connect(brickBreakerAnticipationGain);
    brickBreakerAnticipationGain.connect(ctx.destination);

    // Subtle pulsing tone (slightly lower frequency for less intensity)
    brickBreakerAnticipationOsc.frequency.setValueAtTime(180, ctx.currentTime);
    brickBreakerAnticipationOsc.type = 'sine';

    // Volume envelope:
    // - Quick fade in (0.3s)
    // - Hold at normal volume for 2 seconds
    // - Slow fade out over 6 seconds
    const maxVolume = 0.035 * volumeMultiplier; // Quieter than before (was 0.06)
    const fadeInEnd = ctx.currentTime + 0.3;
    const holdEnd = fadeInEnd + 2; // Hold for 2 seconds
    const fadeOutEnd = holdEnd + 6; // Fade out over 6 seconds

    brickBreakerAnticipationGain.gain.setValueAtTime(0, ctx.currentTime);
    brickBreakerAnticipationGain.gain.linearRampToValueAtTime(maxVolume, fadeInEnd);
    brickBreakerAnticipationGain.gain.setValueAtTime(maxVolume, holdEnd); // Hold
    brickBreakerAnticipationGain.gain.linearRampToValueAtTime(0, fadeOutEnd); // Slow 6s fade

    brickBreakerAnticipationOsc.start(ctx.currentTime);
    brickBreakerAnticipationOsc.stop(fadeOutEnd + 0.1); // Stop after fade completes

    // Add very subtle LFO for gentle pulsing effect (slower pulse)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    lfo.frequency.setValueAtTime(1.5, ctx.currentTime); // Slower pulse (was 2Hz)
    lfoGain.gain.setValueAtTime(0.01 * volumeMultiplier, ctx.currentTime); // Less intense pulse

    lfo.connect(lfoGain);
    lfoGain.connect(brickBreakerAnticipationGain.gain);
    lfo.start(ctx.currentTime);
    lfo.stop(fadeOutEnd + 0.1);

    // Auto-cleanup after sound ends
    setTimeout(() => {
      brickBreakerAnticipationOsc = null;
      brickBreakerAnticipationGain = null;
    }, (fadeOutEnd - ctx.currentTime + 0.2) * 1000);
  } catch {
    // Silently fail
  }
};

const stopBrickBreakerAnticipation = () => {
  try {
    if (brickBreakerAnticipationOsc && brickBreakerAnticipationGain) {
      const ctx = getAudioContext();
      if (ctx) {
        // Cancel any scheduled values and fade out quickly
        brickBreakerAnticipationGain.gain.cancelScheduledValues(ctx.currentTime);
        brickBreakerAnticipationGain.gain.setValueAtTime(
          brickBreakerAnticipationGain.gain.value,
          ctx.currentTime
        );
        brickBreakerAnticipationGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        setTimeout(() => {
          try {
            brickBreakerAnticipationOsc?.stop();
          } catch {
            // Already stopped
          }
          brickBreakerAnticipationOsc = null;
          brickBreakerAnticipationGain = null;
        }, 550);
      }
    }
  } catch {
    // Silently fail
  }
};

/**
 * Brick Breaker Fireball Loop: Ambient fire/flame sound while fireball powerup is active
 * Crackly, fiery - conveys power and urgency
 */
const startBrickBreakerFireball = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx || brickBreakerFireballOsc) return; // Already playing

    // Create master gain node
    brickBreakerFireballGain = ctx.createGain();
    brickBreakerFireballGain.connect(ctx.destination);

    // Low rumble oscillator (fire base)
    brickBreakerFireballOsc = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    brickBreakerFireballOsc.connect(rumbleGain);
    rumbleGain.connect(brickBreakerFireballGain);

    brickBreakerFireballOsc.frequency.setValueAtTime(80, ctx.currentTime);
    brickBreakerFireballOsc.type = 'sawtooth';
    rumbleGain.gain.setValueAtTime(0.04 * volumeMultiplier, ctx.currentTime);

    // Add LFO for flickering effect
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(8, ctx.currentTime); // 8Hz flicker
    lfoGain.gain.setValueAtTime(0.02 * volumeMultiplier, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(rumbleGain.gain);
    lfo.start(ctx.currentTime);

    // Higher crackling oscillator
    brickBreakerFireballOsc2 = ctx.createOscillator();
    const crackleGain = ctx.createGain();
    brickBreakerFireballOsc2.connect(crackleGain);
    crackleGain.connect(brickBreakerFireballGain);

    brickBreakerFireballOsc2.frequency.setValueAtTime(200, ctx.currentTime);
    brickBreakerFireballOsc2.type = 'sawtooth';
    crackleGain.gain.setValueAtTime(0.02 * volumeMultiplier, ctx.currentTime);

    // Second LFO for crackle variation
    const lfo2 = ctx.createOscillator();
    const lfo2Gain = ctx.createGain();
    lfo2.frequency.setValueAtTime(12, ctx.currentTime); // Faster flicker
    lfo2Gain.gain.setValueAtTime(0.015 * volumeMultiplier, ctx.currentTime);
    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(crackleGain.gain);
    lfo2.start(ctx.currentTime);

    // Noise layer for fire crackle
    const noiseLength = 2; // 2 second loop
    const bufferSize = ctx.sampleRate * noiseLength;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Random crackle pattern
      noiseData[i] = (Math.random() * 2 - 1) * (Math.random() > 0.95 ? 1 : 0.3);
    }

    brickBreakerFireballNoiseSource = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();

    brickBreakerFireballNoiseSource.buffer = noiseBuffer;
    brickBreakerFireballNoiseSource.loop = true;

    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2000, ctx.currentTime);
    noiseFilter.Q.setValueAtTime(2, ctx.currentTime);

    brickBreakerFireballNoiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(brickBreakerFireballGain);
    noiseGain.gain.setValueAtTime(0.03 * volumeMultiplier, ctx.currentTime);

    // Fade in
    brickBreakerFireballGain.gain.setValueAtTime(0, ctx.currentTime);
    brickBreakerFireballGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.3);

    // Start all
    brickBreakerFireballOsc.start(ctx.currentTime);
    brickBreakerFireballOsc2.start(ctx.currentTime);
    brickBreakerFireballNoiseSource.start(ctx.currentTime);
  } catch {
    // Silently fail
  }
};

const stopBrickBreakerFireball = () => {
  try {
    if (brickBreakerFireballGain) {
      const ctx = getAudioContext();
      if (ctx) {
        // Fade out
        brickBreakerFireballGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        setTimeout(() => {
          try {
            brickBreakerFireballOsc?.stop();
            brickBreakerFireballOsc2?.stop();
            brickBreakerFireballNoiseSource?.stop();
          } catch {
            // Already stopped
          }
          brickBreakerFireballOsc = null;
          brickBreakerFireballOsc2 = null;
          brickBreakerFireballGain = null;
          brickBreakerFireballNoiseSource = null;
        }, 350);
      }
    }
  } catch {
    // Silently fail
  }
};

// Wojak Runner sounds

/**
 * Collect: Coin "clink" + light sparkle
 * Classic satisfying coin sound, high metallic ~2kHz
 */
const createCollectSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Main coin clink
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(2000, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.08);
  osc.type = 'sine';

  gain.gain.setValueAtTime(0.08 * volumeMultiplier, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.1);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);

  // Tiny sparkle
  createSparkleCascade(ctx, 2, 2200);
};

/**
 * Whoosh: Smooth air swoosh - light and playful
 */
const createWhooshSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Filtered noise for smooth whoosh
  const bufferSize = ctx.sampleRate * 0.12;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    // Smooth envelope
    const envelope = Math.sin((i / bufferSize) * Math.PI);
    data[i] = (Math.random() * 2 - 1) * envelope;
  }

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.12);
  filter.Q.setValueAtTime(1, ctx.currentTime);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0.06 * volumeMultiplier, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.12);

  source.start(ctx.currentTime);
};

/**
 * Speed Up: Whoosh + bright ascending stab
 */
const createSpeedUpSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Quick ascending sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.15);
  osc.type = 'sine';

  gain.gain.setValueAtTime(0.06 * volumeMultiplier, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.15);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);

  // Bright stab at end
  createChimeTail(ctx, 1200, 0.1);
};

/**
 * Footstep: Soft thump - not intrusive
 */
const createFootstepSound = (pitch: number = 1) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  // Soft low thud
  osc.frequency.setValueAtTime(100 * pitch, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60 * pitch, ctx.currentTime + 0.04);
  osc.type = 'sine';

  gain.gain.setValueAtTime(0.04 * volumeMultiplier, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.06);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.06);
};

// Running rhythm loop state
let runningLoopInterval: number | null = null;
let runningLoopStep = 0;

const startRunningLoop = (bpm: number = 180) => {
  if (runningLoopInterval) return;

  const intervalMs = (60 / bpm) * 1000 / 2;
  runningLoopStep = 0;

  runningLoopInterval = window.setInterval(() => {
    const pitch = runningLoopStep % 2 === 0 ? 1.0 : 1.08;
    createFootstepSound(pitch);
    runningLoopStep++;
  }, intervalMs);
};

const stopRunningLoop = () => {
  if (runningLoopInterval) {
    clearInterval(runningLoopInterval);
    runningLoopInterval = null;
    runningLoopStep = 0;
  }
};

// Memory Match sounds imported from ./sounds/memory-match


/**
 * Wojak Chime: Signature brand sound for new high scores
 * Triumphant, celebratory, and memorable
 * A magical ascending arpeggio with sparkle layer
 */
const createWojakChimeSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Main triumphant arpeggio (C-E-G-C in major)
    const melody = [523, 659, 784, 1047]; // C5, E5, G5, C6
    const duration = 0.15;

    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);

      // Bright attack, smooth decay
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.25 * volumeMultiplier, ctx.currentTime + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + i * 0.1 + duration);

      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + duration);
    });

    // Sparkle layer - high harmonic shimmer
    const sparkle = ctx.createOscillator();
    const sparkleGain = ctx.createGain();
    sparkle.type = 'sine';
    sparkle.frequency.setValueAtTime(2093, ctx.currentTime + 0.3); // C7
    sparkle.frequency.linearRampToValueAtTime(2637, ctx.currentTime + 0.5); // E7
    sparkleGain.gain.setValueAtTime(0.08 * volumeMultiplier, ctx.currentTime + 0.3);
    sparkleGain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.6);

    sparkle.connect(sparkleGain).connect(ctx.destination);
    sparkle.start(ctx.currentTime + 0.3);
    sparkle.stop(ctx.currentTime + 0.6);

    // Final resonant bass note for satisfying "completion" feel
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(131, ctx.currentTime + 0.35); // C3
    bassGain.gain.setValueAtTime(0.15 * volumeMultiplier, ctx.currentTime + 0.35);
    bassGain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.7);

    bass.connect(bassGain).connect(ctx.destination);
    bass.start(ctx.currentTime + 0.35);
    bass.stop(ctx.currentTime + 0.7);
  } catch {
    // Silently fail
  }
};

/**
 * Game Over: Gentle descending hum + soft "aww"
 * NOT punishing - light-hearted like Candy Crush fail
 * We want players to try again, not feel bad
 */
const createGameOverSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Gentle descending hum (not harsh)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Soft falling frequency
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.4);
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.08 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.4);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);

    // Soft "aww" undertone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.frequency.setValueAtTime(300, ctx.currentTime + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.5);
    osc2.type = 'sine';

    gain2.gain.setValueAtTime(0.05 * volumeMultiplier, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.5);

    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.5);
  } catch {
    // Silently fail - don't break game flow
  }
};

// ============================================
// ORANGE JUGGLE SOUNDS
// ============================================

/**
 * Orange Juggle Hit Sound: Bouncy "boing" when orangutan hits an orange
 * Position-based pitch variation for variety
 */
const createOrangeJuggleHitSound = (hitPosition: number = 0.5) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Rubbery boing with pitch variation based on hit position
    osc.type = 'sine';
    const basePitch = 280;
    const pitchVariation = (hitPosition - 0.5) * 80; // Edge hits = higher pitch
    osc.frequency.setValueAtTime(basePitch + pitchVariation, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.35 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Silently fail
  }
};

/**
 * Orange Drop Sound: Descending "womp" when orange is missed
 */
const createOrangeDropSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Descending tone - disappointment but not harsh
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.2 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.4);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Silently fail
  }
};

/**
 * Golden Orange Hit Sound: Magical chime with sparkle layer
 */
const createGoldenOrangeHitSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Layer 1: Base chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // High A
    gain1.gain.setValueAtTime(0.25 * volumeMultiplier, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.3);

    // Layer 2: Harmonic sparkle
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, ctx.currentTime); // High E
    osc2.frequency.setValueAtTime(1760, ctx.currentTime + 0.1); // Higher A
    gain2.gain.setValueAtTime(0.15 * volumeMultiplier, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.4);

    // Layer 3: Shimmer (filtered noise)
    const noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 8000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.06 * volumeMultiplier, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001 * volumeMultiplier, ctx.currentTime + 0.3);

    // Connect all
    osc1.connect(gain1).connect(ctx.destination);
    osc2.connect(gain2).connect(ctx.destination);
    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    noise.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 0.4);
    noise.stop(ctx.currentTime + 0.3);
  } catch {
    // Silently fail
  }
};

/**
 * Banana Collect Sound: Happy ascending arpeggio
 */
const createBananaCollectSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523, 659, 784]; // C5, E5, G5 - happy major arpeggio

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.3 * volumeMultiplier, ctx.currentTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + i * 0.08 + 0.15);

      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.15);
    });
  } catch {
    // Silently fail
  }
};

/**
 * Rum Collect Sound: Sloshing "glug-glug" with woozy warble
 */
const createRumCollectSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Glug 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(200, ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.1);
    gain1.gain.setValueAtTime(0.25 * volumeMultiplier, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.12);

    // Glug 2 (delayed)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
    osc2.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.25);
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(0.2 * volumeMultiplier, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.28);

    // Woozy warble overlay
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 5; // Slow wobble
    lfoGain.gain.value = 30;

    const mainOsc = ctx.createOscillator();
    const mainGain = ctx.createGain();
    mainOsc.type = 'triangle';
    mainOsc.frequency.setValueAtTime(150, ctx.currentTime);
    mainGain.gain.setValueAtTime(0.12 * volumeMultiplier, ctx.currentTime);
    mainGain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.4);

    lfo.connect(lfoGain).connect(mainOsc.frequency);

    osc1.connect(gain1).connect(ctx.destination);
    osc2.connect(gain2).connect(ctx.destination);
    mainOsc.connect(mainGain).connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    lfo.start(ctx.currentTime);
    mainOsc.start(ctx.currentTime);

    osc1.stop(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.28);
    lfo.stop(ctx.currentTime + 0.4);
    mainOsc.stop(ctx.currentTime + 0.4);
  } catch {
    // Silently fail
  }
};

/**
 * Camel Warning Sound: Dramatic descending horn when camel shadow appears
 */
const createCamelWarningSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Alarm horn
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.25 * volumeMultiplier, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35 * volumeMultiplier, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.5);

    // Low rumble
    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumble.type = 'sine';
    rumble.frequency.value = 60;
    rumbleGain.gain.setValueAtTime(0.15 * volumeMultiplier, ctx.currentTime);
    rumbleGain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.6);

    osc.connect(gain).connect(ctx.destination);
    rumble.connect(rumbleGain).connect(ctx.destination);

    osc.start(ctx.currentTime);
    rumble.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    rumble.stop(ctx.currentTime + 0.6);
  } catch {
    // Silently fail
  }
};

/**
 * Camel Impact Sound: Heavy crash/thud for game over moment
 */
const createCamelImpactSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Heavy impact thud
    const impact = ctx.createOscillator();
    const impactGain = ctx.createGain();
    impact.type = 'sine';
    impact.frequency.setValueAtTime(80, ctx.currentTime);
    impact.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
    impactGain.gain.setValueAtTime(0.4 * volumeMultiplier, ctx.currentTime);
    impactGain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.4);

    // Crash noise
    const noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(2000, ctx.currentTime);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.4);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3 * volumeMultiplier, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.4);

    impact.connect(impactGain).connect(ctx.destination);
    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);

    impact.start(ctx.currentTime);
    noise.start(ctx.currentTime);
    impact.stop(ctx.currentTime + 0.4);
    noise.stop(ctx.currentTime + 0.4);
  } catch {
    // Silently fail
  }
};

/**
 * Orange Juggle Combo Sound: Escalating pitch and layers with streak count
 * @param streak - Consecutive hit count (can exceed 10, keeps escalating)
 */
const createOrangeJuggleComboSound = (streak: number) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Base frequency escalates continuously (capped at streak 50 for sanity)
    const streakCapped = Math.min(streak, 50);
    const baseFreq = 400 + streakCapped * 15; // Continuous escalation

    // Base hit - gets brighter with streak
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = streak >= 20 ? 'triangle' : 'sine'; // Brighter waveform at high streaks
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.25 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.12);

    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);

    // Add sparkle at streak 5+
    if (streak >= 5) {
      const sparkle = ctx.createOscillator();
      const sparkleGain = ctx.createGain();
      sparkle.type = 'sine';
      sparkle.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime);
      const sparkleIntensity = Math.min(0.12 + (streak - 5) * 0.01, 0.25); // Gets louder
      sparkleGain.gain.setValueAtTime(sparkleIntensity * volumeMultiplier, ctx.currentTime);
      sparkleGain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.2);

      sparkle.connect(sparkleGain).connect(ctx.destination);
      sparkle.start(ctx.currentTime);
      sparkle.stop(ctx.currentTime + 0.2);
    }

    // Add bass hit at streak 8+
    if (streak >= 8) {
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'sine';
      const bassFreq = 80 + Math.min(streak - 8, 20) * 2; // Bass rises slightly
      bass.frequency.setValueAtTime(bassFreq, ctx.currentTime);
      bassGain.gain.setValueAtTime(0.2 * volumeMultiplier, ctx.currentTime);
      bassGain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.15);

      bass.connect(bassGain).connect(ctx.destination);
      bass.start(ctx.currentTime);
      bass.stop(ctx.currentTime + 0.15);
    }

    // Add shimmer at streak 10+ (continuous escalation)
    if (streak >= 10) {
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.type = 'sine';
      const shimmerMult = 3 + Math.min(streak - 10, 15) * 0.1; // Gets higher
      shimmer.frequency.setValueAtTime(baseFreq * shimmerMult, ctx.currentTime);
      shimmer.frequency.linearRampToValueAtTime(baseFreq * (shimmerMult + 1), ctx.currentTime + 0.25);
      const shimmerIntensity = Math.min(0.08 + (streak - 10) * 0.005, 0.18);
      shimmerGain.gain.setValueAtTime(shimmerIntensity * volumeMultiplier, ctx.currentTime);
      shimmerGain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.25);

      shimmer.connect(shimmerGain).connect(ctx.destination);
      shimmer.start(ctx.currentTime);
      shimmer.stop(ctx.currentTime + 0.25);
    }

    // Add celestial harmonic at streak 15+ (new layer!)
    if (streak >= 15) {
      const celestial = ctx.createOscillator();
      const celestialGain = ctx.createGain();
      celestial.type = 'sine';
      const celestialFreq = baseFreq * 4 + (streak - 15) * 10;
      celestial.frequency.setValueAtTime(celestialFreq, ctx.currentTime);
      celestial.frequency.exponentialRampToValueAtTime(celestialFreq * 1.5, ctx.currentTime + 0.15);
      const celestialIntensity = Math.min(0.06 + (streak - 15) * 0.003, 0.12);
      celestialGain.gain.setValueAtTime(celestialIntensity * volumeMultiplier, ctx.currentTime);
      celestialGain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.18);

      celestial.connect(celestialGain).connect(ctx.destination);
      celestial.start(ctx.currentTime);
      celestial.stop(ctx.currentTime + 0.18);
    }

    // Add sub-bass rumble at streak 20+ (new layer!)
    if (streak >= 20) {
      const subBass = ctx.createOscillator();
      const subBassGain = ctx.createGain();
      subBass.type = 'sine';
      subBass.frequency.setValueAtTime(50, ctx.currentTime);
      subBass.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.2);
      const subIntensity = Math.min(0.1 + (streak - 20) * 0.005, 0.2);
      subBassGain.gain.setValueAtTime(subIntensity * volumeMultiplier, ctx.currentTime);
      subBassGain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.2);

      subBass.connect(subBassGain).connect(ctx.destination);
      subBass.start(ctx.currentTime);
      subBass.stop(ctx.currentTime + 0.2);
    }

    // Add echo/delay effect at streak 25+ (epic territory!)
    if (streak >= 25) {
      const delay = ctx.createDelay();
      const echoGain = ctx.createGain();
      delay.delayTime.value = 0.08; // Quick slap-back echo

      const echo = ctx.createOscillator();
      echo.type = 'sine';
      echo.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime);
      const echoIntensity = Math.min(0.08 + (streak - 25) * 0.003, 0.15);
      echoGain.gain.setValueAtTime(echoIntensity * volumeMultiplier, ctx.currentTime);
      echoGain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.3);

      echo.connect(delay).connect(echoGain).connect(ctx.destination);
      echo.start(ctx.currentTime);
      echo.stop(ctx.currentTime + 0.3);
    }

    // Add crystalline overtones at streak 30+ (legendary!)
    if (streak >= 30) {
      const crystal1 = ctx.createOscillator();
      const crystal2 = ctx.createOscillator();
      const crystalGain = ctx.createGain();

      crystal1.type = 'sine';
      crystal2.type = 'sine';
      const crystalBase = baseFreq * 5;
      crystal1.frequency.setValueAtTime(crystalBase, ctx.currentTime);
      crystal2.frequency.setValueAtTime(crystalBase * 1.25, ctx.currentTime); // Perfect 4th harmony

      const crystalIntensity = Math.min(0.05 + (streak - 30) * 0.002, 0.1);
      crystalGain.gain.setValueAtTime(crystalIntensity * volumeMultiplier, ctx.currentTime);
      crystalGain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.2);

      crystal1.connect(crystalGain).connect(ctx.destination);
      crystal2.connect(crystalGain).connect(ctx.destination);
      crystal1.start(ctx.currentTime);
      crystal2.start(ctx.currentTime);
      crystal1.stop(ctx.currentTime + 0.2);
      crystal2.stop(ctx.currentTime + 0.2);
    }

    // Add godlike choir at streak 40+ (transcendent!)
    if (streak >= 40) {
      // Multiple detuned oscillators for choir effect
      const choirFreqs = [baseFreq * 2, baseFreq * 2.5, baseFreq * 3];
      const choirIntensity = Math.min(0.04 + (streak - 40) * 0.002, 0.08);

      choirFreqs.forEach((freq, i) => {
        const voice = ctx.createOscillator();
        const voiceGain = ctx.createGain();
        voice.type = 'sine';
        voice.frequency.setValueAtTime(freq + (i - 1) * 5, ctx.currentTime); // Slight detune
        voiceGain.gain.setValueAtTime(choirIntensity * volumeMultiplier, ctx.currentTime);
        voiceGain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.25);

        voice.connect(voiceGain).connect(ctx.destination);
        voice.start(ctx.currentTime + i * 0.02); // Staggered start
        voice.stop(ctx.currentTime + 0.25);
      });
    }
  } catch {
    // Silently fail
  }
};

/**
 * Orange Juggle Combo Break Sound: Deflating whoosh when combo expires
 */
const createOrangeJuggleComboBreakSound = (lostCombo: number) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (lostCombo < 3) return; // Only for meaningful combos

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Descending whoosh
    osc.type = 'triangle';
    const startFreq = 400 + Math.min(lostCombo, 10) * 20;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.15 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.35);

    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Silently fail
  }
};

// Rum ambient loop state
let rumAmbientOscillators: OscillatorNode[] = [];
let rumAmbientGains: GainNode[] = [];
let rumAmbientPlaying = false;

/**
 * Start Rum Ambient Loop: Woozy sloshing while rum effect active
 */
const startRumAmbientLoop = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx || rumAmbientPlaying) return;
    rumAmbientPlaying = true;

    // Woozy LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.5; // Very slow wobble
    lfoGain.gain.value = 20;

    // Main woozy tone
    const main = ctx.createOscillator();
    const mainGain = ctx.createGain();
    main.type = 'triangle';
    main.frequency.value = 100;
    mainGain.gain.value = 0.08 * volumeMultiplier;

    lfo.connect(lfoGain).connect(main.frequency);
    main.connect(mainGain).connect(ctx.destination);

    lfo.start(ctx.currentTime);
    main.start(ctx.currentTime);

    rumAmbientOscillators = [lfo, main];
    rumAmbientGains = [lfoGain, mainGain];
  } catch {
    // Silently fail
  }
};

/**
 * Stop Rum Ambient Loop
 */
const stopRumAmbientLoop = () => {
  if (!rumAmbientPlaying) return;
  rumAmbientPlaying = false;

  try {
    const ctx = getAudioContext();
    if (ctx) {
      rumAmbientGains.forEach(g => {
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      });
    }

    setTimeout(() => {
      rumAmbientOscillators.forEach(o => {
        try { o.stop(); } catch { /* already stopped */ }
      });
      rumAmbientOscillators = [];
      rumAmbientGains = [];
    }, 500);
  } catch {
    // Silently fail
  }
};

// Banana ambient loop state
let bananaAmbientOscillators: OscillatorNode[] = [];
let bananaAmbientGains: GainNode[] = [];
let bananaAmbientPlaying = false;

/**
 * Start Banana Ambient Loop: Energetic shimmer during multiplier
 */
const startBananaAmbientLoop = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx || bananaAmbientPlaying) return;
    bananaAmbientPlaying = true;

    // Fast shimmer LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 8; // Faster, energetic
    lfoGain.gain.value = 15;

    // Bright sparkle tone
    const main = ctx.createOscillator();
    const mainGain = ctx.createGain();
    main.type = 'sine';
    main.frequency.value = 800;
    mainGain.gain.value = 0.05 * volumeMultiplier;

    // Second harmonic
    const harm = ctx.createOscillator();
    const harmGain = ctx.createGain();
    harm.type = 'sine';
    harm.frequency.value = 1200;
    harmGain.gain.value = 0.03 * volumeMultiplier;

    lfo.connect(lfoGain).connect(main.frequency);
    main.connect(mainGain).connect(ctx.destination);
    harm.connect(harmGain).connect(ctx.destination);

    lfo.start(ctx.currentTime);
    main.start(ctx.currentTime);
    harm.start(ctx.currentTime);

    bananaAmbientOscillators = [lfo, main, harm];
    bananaAmbientGains = [lfoGain, mainGain, harmGain];
  } catch {
    // Silently fail
  }
};

/**
 * Stop Banana Ambient Loop
 */
const stopBananaAmbientLoop = () => {
  if (!bananaAmbientPlaying) return;
  bananaAmbientPlaying = false;

  try {
    const ctx = getAudioContext();
    if (ctx) {
      bananaAmbientGains.forEach(g => {
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      });
    }

    setTimeout(() => {
      bananaAmbientOscillators.forEach(o => {
        try { o.stop(); } catch { /* already stopped */ }
      });
      bananaAmbientOscillators = [];
      bananaAmbientGains = [];
    }, 300);
  } catch {
    // Silently fail
  }
};

/**
 * Orange Juggle Level Complete Sound: Triumphant fanfare
 */
const createOrangeJuggleLevelCompleteSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const melody = [523, 659, 784, 1047]; // C5, E5, G5, C6

    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.35 * volumeMultiplier, ctx.currentTime + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + i * 0.12 + 0.3);

      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  } catch {
    // Silently fail
  }
};

/**
 * Arm Swing Whoosh: Subtle whoosh when orangutan swings arm
 */
const createArmSwingSound = (isLeftArm: boolean = true) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = isLeftArm ? 800 : 900; // Slight variation
    filter.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08 * volumeMultiplier, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * volumeMultiplier, ctx.currentTime + 0.08);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.08);
  } catch {
    // Silently fail
  }
};

// ============================================
// HOOK
// ============================================

export function useGameSounds() {
  const { isSoundEffectsEnabled } = useAudio();
  const { settings } = useSettings();
  const lastWinSoundRef = useRef(-1);

  // Get sound effects volume from settings
  const effectiveVolume = settings.audio.soundEffectsVolume;

  // Update the global volume multiplier when settings change
  useEffect(() => {
    volumeMultiplier = effectiveVolume;
    setMemoryMatchVolume(effectiveVolume);
    setBrickBreakerVolume(effectiveVolume);
    setGenericVolume(effectiveVolume);
  }, [effectiveVolume]);

  // Initialize audio context and SoundManager on first user interaction
  useEffect(() => {
    const initAudio = () => {
      getAudioContext();
      // Also initialize the MP3-based SoundManager
      if (!SoundManager.getIsInitialized()) {
        SoundManager.initialize();
      }
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
    document.addEventListener('click', initAudio);
    document.addEventListener('touchstart', initAudio);
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);

  // Play a win/high-score sound - uses MP3 with synthesized fallback
  const playWinSound = useCallback(() => {
    if (!isSoundEffectsEnabled) return;

    // Try MP3 first
    SoundManager.play('high-score');

    // Also play synthesized sound for extra richness
    let index = Math.floor(Math.random() * WIN_SOUNDS.length);
    if (index === lastWinSoundRef.current && WIN_SOUNDS.length > 1) {
      index = (index + 1) % WIN_SOUNDS.length;
    }
    lastWinSoundRef.current = index;
    WIN_SOUNDS[index]();
  }, [isSoundEffectsEnabled]);

  // Brick by Brick sounds
  const playBlockLand = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    // Use MP3 score sound for landing
    SoundManager.play('score');
    // Also play synthesized for extra feedback
    createBlockLandSound();
  }, [isSoundEffectsEnabled]);

  const playPerfectBonus = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    // Perfect drops use success sound
    SoundManager.play('success');
    createPerfectBonusSound();
  }, [isSoundEffectsEnabled]);

  const playCombo = useCallback((level: number) => {
    if (!isSoundEffectsEnabled) return;
    // Use escalating MP3 combo sounds
    const comboSound = getComboSound(level);
    SoundManager.play(comboSound);
    // Also play synthesized for layered effect
    createComboSound(level);
  }, [isSoundEffectsEnabled]);

  // Orange Pong sounds
  const playPaddleHit = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    SoundManager.play('score');
    createPaddleHitSound();
  }, [isSoundEffectsEnabled]);

  const playWallBounce = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createWallBounceSound();
  }, [isSoundEffectsEnabled]);

  const playScorePoint = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    SoundManager.play('score');
    createScorePointSound();
  }, [isSoundEffectsEnabled]);

  // Wojak Runner sounds
  const playCollect = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    SoundManager.play('currency-earn');
    createCollectSound();
  }, [isSoundEffectsEnabled]);

  const playWhoosh = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createWhooshSound();
  }, [isSoundEffectsEnabled]);

  const playSpeedUp = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    SoundManager.play('level-up');
    createSpeedUpSound();
  }, [isSoundEffectsEnabled]);

  // Memory Match sounds
  const playCardHover = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createCardHoverSound();
  }, [isSoundEffectsEnabled]);

  const playCardFlip = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createCardFlipSound();
  }, [isSoundEffectsEnabled]);

  const playMatchFound = useCallback((streak: number = 1) => {
    if (!isSoundEffectsEnabled) return;
    // Use different MP3 sounds based on streak level
    if (streak >= 3) {
      SoundManager.play('achievement'); // More celebratory for max streak
    } else {
      SoundManager.play('success');
    }
    createMatchFoundSound(streak);
  }, [isSoundEffectsEnabled]);

  const playMismatch = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    SoundManager.play('error');
    createMismatchSound();
  }, [isSoundEffectsEnabled]);

  // Near-completion anticipation sound
  const playNearCompletion = useCallback((pairsRemaining: number) => {
    if (!isSoundEffectsEnabled) return;
    createAnticipationSound(pairsRemaining);
  }, [isSoundEffectsEnabled]);

  // Fast match bonus sound (layers on top of normal match)
  const playFastMatchBonus = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createFastMatchBonus();
  }, [isSoundEffectsEnabled]);

  // Game over sound
  const playGameOver = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    SoundManager.play('game-over');
    createGameOverSound();
  }, [isSoundEffectsEnabled]);

  // Signature brand chime for new high scores
  const playWojakChime = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    SoundManager.play('high-score');
    createWojakChimeSound();
  }, [isSoundEffectsEnabled]);

  // Running footstep loop for continuous movement sound
  const startRunning = useCallback((bpm: number = 180) => {
    if (isSoundEffectsEnabled) startRunningLoop(bpm);
  }, [isSoundEffectsEnabled]);

  const stopRunning = useCallback(() => {
    stopRunningLoop();
  }, []);

  // Cleanup running loop on unmount
  useEffect(() => {
    return () => {
      stopRunningLoop();
    };
  }, []);

  // New MP3-based sounds
  const playGameStart = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    SoundManager.play('game-start');
  }, [isSoundEffectsEnabled]);

  const playCountdown = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    SoundManager.play('countdown');
  }, [isSoundEffectsEnabled]);

  const playCountdownGo = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    SoundManager.play('countdown-go');
  }, [isSoundEffectsEnabled]);

  const playWarning = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    SoundManager.play('warning');
  }, [isSoundEffectsEnabled]);

  const playAchievement = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    SoundManager.play('achievement');
  }, [isSoundEffectsEnabled]);

  const playLevelUp = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    SoundManager.play('level-up');
  }, [isSoundEffectsEnabled]);

  const playButtonClick = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    SoundManager.play('button-click');
  }, [isSoundEffectsEnabled]);

  // Brick Breaker sounds
  const playBallLaunch = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createBallLaunchSound();
  }, [isSoundEffectsEnabled]);

  const playBrickBreakerPaddleHit = useCallback((hitPosition: number = 0.5) => {
    if (!isSoundEffectsEnabled) return;
    createBrickBreakerPaddleHitSound(hitPosition);
  }, [isSoundEffectsEnabled]);

  const playBrickBreakerWallHit = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createBrickBreakerWallHitSound();
  }, [isSoundEffectsEnabled]);

  const playBrickBreakerBrickDestroy = useCallback((brickType: 'normal' | 'strong' = 'normal') => {
    if (!isSoundEffectsEnabled) return;
    createBrickBreakerBrickDestroySound(brickType);
  }, [isSoundEffectsEnabled]);

  const playBrickBreakerBrickCrack = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createBrickBreakerBrickCrackSound();
  }, [isSoundEffectsEnabled]);

  const playBrickBreakerUnbreakableHit = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createBrickBreakerUnbreakableHitSound();
  }, [isSoundEffectsEnabled]);

  const playBrickBreakerPowerupSpawn = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createBrickBreakerPowerupSpawnSound();
  }, [isSoundEffectsEnabled]);

  const playBrickBreakerPowerupCollect = useCallback((type: string) => {
    if (!isSoundEffectsEnabled) return;
    createBrickBreakerPowerupCollectSound(type);
  }, [isSoundEffectsEnabled]);

  const playBrickBreakerBallLost = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createBrickBreakerBallLostSound();
  }, [isSoundEffectsEnabled]);

  const playBrickBreakerCombo = useCallback((combo: number) => {
    if (!isSoundEffectsEnabled) return;
    createBrickBreakerComboSound(combo);
  }, [isSoundEffectsEnabled]);

  const playBrickBreakerComboBreak = useCallback((lostCombo: number) => {
    if (!isSoundEffectsEnabled) return;
    createBrickBreakerComboBreakSound(lostCombo);
  }, [isSoundEffectsEnabled]);

  const startBrickBreakerAnticipationLoop = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    startBrickBreakerAnticipation();
  }, [isSoundEffectsEnabled]);

  const stopBrickBreakerAnticipationLoop = useCallback(() => {
    stopBrickBreakerAnticipation();
  }, []);

  const startBrickBreakerFireballLoop = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    startBrickBreakerFireball();
  }, [isSoundEffectsEnabled]);

  const stopBrickBreakerFireballLoop = useCallback(() => {
    stopBrickBreakerFireball();
  }, []);

  // Orange Juggle sounds
  const playOrangeJuggleHit = useCallback((hitPosition: number = 0.5) => {
    if (!isSoundEffectsEnabled) return;
    createOrangeJuggleHitSound(hitPosition);
  }, [isSoundEffectsEnabled]);

  const playOrangeDrop = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createOrangeDropSound();
  }, [isSoundEffectsEnabled]);

  const playGoldenOrangeHit = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createGoldenOrangeHitSound();
  }, [isSoundEffectsEnabled]);

  const playBananaCollect = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createBananaCollectSound();
  }, [isSoundEffectsEnabled]);

  const playRumCollect = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createRumCollectSound();
  }, [isSoundEffectsEnabled]);

  const playCamelWarning = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createCamelWarningSound();
  }, [isSoundEffectsEnabled]);

  const playCamelImpact = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createCamelImpactSound();
  }, [isSoundEffectsEnabled]);

  const playOrangeJuggleCombo = useCallback((comboCount: number) => {
    if (!isSoundEffectsEnabled) return;
    createOrangeJuggleComboSound(comboCount);
  }, [isSoundEffectsEnabled]);

  const playOrangeJuggleComboBreak = useCallback((lostCombo: number) => {
    if (!isSoundEffectsEnabled) return;
    createOrangeJuggleComboBreakSound(lostCombo);
  }, [isSoundEffectsEnabled]);

  const startRumAmbient = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    startRumAmbientLoop();
  }, [isSoundEffectsEnabled]);

  const stopRumAmbient = useCallback(() => {
    stopRumAmbientLoop();
  }, []);

  const startBananaAmbient = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    startBananaAmbientLoop();
  }, [isSoundEffectsEnabled]);

  const stopBananaAmbient = useCallback(() => {
    stopBananaAmbientLoop();
  }, []);

  const playOrangeJuggleLevelComplete = useCallback(() => {
    if (!isSoundEffectsEnabled) return;
    createOrangeJuggleLevelCompleteSound();
  }, [isSoundEffectsEnabled]);

  const playArmSwing = useCallback((isLeftArm: boolean = true) => {
    if (!isSoundEffectsEnabled) return;
    createArmSwingSound(isLeftArm);
  }, [isSoundEffectsEnabled]);

  // Cleanup Orange Juggle ambient loops on unmount
  useEffect(() => {
    return () => {
      stopRumAmbientLoop();
      stopBananaAmbientLoop();
    };
  }, []);

  return {
    // Win/level complete
    playWinSound,

    // Brick by Brick
    playBlockLand,
    playPerfectBonus,
    playCombo,

    // Orange Pong
    playPaddleHit,
    playWallBounce,
    playScorePoint,

    // Wojak Runner
    playCollect,
    playWhoosh,
    playSpeedUp,
    startRunning,
    stopRunning,

    // Memory Match
    playCardHover,
    playCardFlip,
    playMatchFound,
    playMismatch,
    playNearCompletion,
    playFastMatchBonus,

    // Game over
    playGameOver,

    // Signature brand chime (high score only)
    playWojakChime,

    // New MP3-based sounds
    playGameStart,
    playCountdown,
    playCountdownGo,
    playWarning,
    playAchievement,
    playLevelUp,
    playButtonClick,

    // Brick Breaker
    playBallLaunch,
    playBrickBreakerPaddleHit,
    playBrickBreakerWallHit,
    playBrickBreakerBrickDestroy,
    playBrickBreakerBrickCrack,
    playBrickBreakerUnbreakableHit,
    playBrickBreakerPowerupSpawn,
    playBrickBreakerPowerupCollect,
    playBrickBreakerBallLost,
    playBrickBreakerCombo,
    playBrickBreakerComboBreak,
    startBrickBreakerAnticipationLoop,
    stopBrickBreakerAnticipationLoop,
    startBrickBreakerFireballLoop,
    stopBrickBreakerFireballLoop,

    // Orange Juggle
    playOrangeJuggleHit,
    playOrangeDrop,
    playGoldenOrangeHit,
    playBananaCollect,
    playRumCollect,
    playCamelWarning,
    playCamelImpact,
    playOrangeJuggleCombo,
    playOrangeJuggleComboBreak,
    startRumAmbient,
    stopRumAmbient,
    startBananaAmbient,
    stopBananaAmbient,
    playOrangeJuggleLevelComplete,
    playArmSwing,
  };
}

export default useGameSounds;
