/**
 * Orange Juggle Sound Effects
 *
 * Web Audio API synthesized sounds for the Orange Juggle game.
 * Extracted from useGameSounds.ts for modularity.
 */

// Import shared audio utilities
import { getAudioContext, volumeMultiplier } from './audio-context';

/**
 * Orange Juggle Hit Sound: Rubbery boing when orange is hit
 * @param hitPosition - Position on paddle (0-1), affects pitch variation
 */
export const createOrangeJuggleHitSound = (hitPosition: number = 0.5) => {
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
export const createOrangeDropSound = () => {
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
export const createGoldenOrangeHitSound = () => {
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
export const createBananaCollectSound = () => {
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
export const createRumCollectSound = () => {
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
export const createCamelWarningSound = () => {
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
export const createCamelImpactSound = () => {
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
export const createOrangeJuggleComboSound = (streak: number) => {
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
export const createOrangeJuggleComboBreakSound = (lostCombo: number) => {
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

/**
 * Orange Juggle Level Complete Sound: Triumphant fanfare
 */
export const createOrangeJuggleLevelCompleteSound = () => {
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
