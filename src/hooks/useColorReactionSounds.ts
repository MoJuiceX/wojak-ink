import { useCallback, useRef, useEffect } from 'react';

/**
 * Color Reaction Sound System
 *
 * Procedurally generated sounds using Web Audio API for:
 * - Reaction-time based feedback (pitch varies with speed)
 * - Countdown urgency escalation
 * - Life/streak events
 * - Time dilation effects
 */

export const useColorReactionSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isMutedRef = useRef(false);

  // Initialize AudioContext on first user interaction
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    isMutedRef.current = muted;
  }, []);

  // ========== TASK 13: Correct Tap Sound with Reaction Variation ==========
  const playCorrectTap = useCallback((reactionTimeMs: number) => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    // Base frequency increases with faster reactions
    const baseFreq = reactionTimeMs < 300 ? 880 :
                     reactionTimeMs < 500 ? 784 :
                     reactionTimeMs < 700 ? 698 :
                     reactionTimeMs < 1000 ? 622 : 554;

    // Add slight random pitch variation (±5%)
    const variation = 0.95 + Math.random() * 0.1;
    const freq = baseFreq * variation;

    // Main tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);

    // Add sparkle for PERFECT/GREAT
    if (reactionTimeMs < 500) {
      const sparkle = ctx.createOscillator();
      const sparkleGain = ctx.createGain();
      sparkle.type = 'sine';
      sparkle.frequency.setValueAtTime(freq * 2, ctx.currentTime);
      sparkleGain.gain.setValueAtTime(0.2, ctx.currentTime);
      sparkleGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      sparkle.connect(sparkleGain).connect(ctx.destination);
      sparkle.start();
      sparkle.stop(ctx.currentTime + 0.2);
    }

    // Add bass for PERFECT
    if (reactionTimeMs < 300) {
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'sine';
      bass.frequency.value = freq / 2;
      bassGain.gain.setValueAtTime(0.25, ctx.currentTime);
      bassGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

      bass.connect(bassGain).connect(ctx.destination);
      bass.start();
      bass.stop(ctx.currentTime + 0.18);
    }
  }, [getAudioContext]);

  // ========== TASK 14: Wrong Tap Sound (Gentle) ==========
  const playWrongTap = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    // Soft descending tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.15, ctx.currentTime); // Low volume - not punishing
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }, [getAudioContext]);

  // ========== TASK 15: Miss Sound (Window Expired) ==========
  const playMiss = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    // Whooshing fade-out
    const noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 0.3);
  }, [getAudioContext]);

  // ========== TASK 16: Match Window Start Sound ==========
  const playMatchStart = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    // Quick ascending "ding!"
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.setValueAtTime(900, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }, [getAudioContext]);

  // ========== TASK 17: Countdown Tick Sound ==========
  const playCountdownTick = useCallback((urgencyLevel: number = 0) => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Pitch increases with urgency (0-3)
    const baseFreq = 800 + urgencyLevel * 100;
    osc.type = 'sine';
    osc.frequency.value = baseFreq;

    // Volume increases with urgency
    const volume = 0.1 + urgencyLevel * 0.05;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }, [getAudioContext]);

  // ========== TASK 18: Countdown Warning Sound ==========
  const playCountdownWarning = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    // Double beep
    [0, 0.08].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = 1000;

      gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.06);

      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.06);
    });
  }, [getAudioContext]);

  // ========== TASK 19: Countdown Critical Sound ==========
  const playCountdownCritical = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    // Triple beep, ascending
    [0, 0.06, 0.12].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = 1000 + i * 100; // Ascending pitch

      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.05);

      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.05);
    });
  }, [getAudioContext]);

  // ========== TASK 20: Life Loss Sound ==========
  const playLifeLoss = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }, [getAudioContext]);

  // ========== TASK 21: Last Life Warning Sound ==========
  const playLastLifeWarning = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    // Low ominous tone with pulsing
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    // Add pulsing LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 8;
    lfoGain.gain.value = 0.1;
    lfo.connect(lfoGain).connect(gain.gain);
    lfo.start();
    lfo.stop(ctx.currentTime + 0.4);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }, [getAudioContext]);

  // ========== TASK 22: PERFECT Celebration Sound ==========
  const playPerfect = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    // Triumphant fanfare - A5, C#6, E6, A6
    const notes = [880, 1108, 1318, 1760];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const delay = i * 0.06;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.25);

      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.25);
    });

    // Shimmer overlay
    const noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 0.3);
  }, [getAudioContext]);

  // ========== TASK 23: Streak Milestone Sounds ==========
  const playStreakMilestone = useCallback((streak: number) => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    const noteCount = streak === 5 ? 3 : streak === 10 ? 4 : streak === 15 ? 5 : 6;
    const baseFreq = 523; // C5

    for (let i = 0; i < noteCount; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Major scale ascending
      const scaleSteps = [0, 2, 4, 5, 7, 9]; // C D E F G A
      const freq = baseFreq * Math.pow(2, scaleSteps[i % 6] / 12);

      osc.type = 'sine';
      osc.frequency.value = freq;

      const delay = i * 0.08;
      const volume = 0.3 + (streak / 20) * 0.1;

      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.2);

      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    }
  }, [getAudioContext]);

  // ========== TASK 24: Speed Up Notification Sound ==========
  const playSpeedUp = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    // Quick ascending whoosh
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }, [getAudioContext]);

  // ========== TASK 25: Color Change Sound ==========
  const playColorChange = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 440;

    gain.gain.setValueAtTime(0.05, ctx.currentTime); // Very quiet
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }, [getAudioContext]);

  // ========== TASK 26: Near-Miss "Too Slow" Sound ==========
  const playTooSlow = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    // Sympathetic descending tone (not harsh)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }, [getAudioContext]);

  // ========== TASK 27: Time Dilation Sound (Slow-Mo) ==========
  const playTimeDilation = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    // Whooshing time-stretch effect with slight detuning
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(200, ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.4);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(203, ctx.currentTime); // Slight detuning for ethereal effect
    osc2.frequency.linearRampToValueAtTime(152, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc1.connect(gain).connect(ctx.destination);
    osc2.connect(gain);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.4);
  }, [getAudioContext]);

  // ========== Game Start Sound ==========
  const playGameStart = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    // Pleasant ascending "ready, set, GO!" fanfare
    // Quick ascending arpeggio in C major - feels exciting and positive
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6 (C major arpeggio)
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const delay = i * 0.08; // Quick staccato
      const volume = i === 3 ? 0.35 : 0.25; // Last note slightly louder
      const duration = i === 3 ? 0.3 : 0.12; // Last note held longer
      
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + duration);
      
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration + 0.05);
    });
    
    // Add a subtle shimmer on the final note for extra sparkle
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.value = 2093; // C7 (octave above final note)
    shimmerGain.gain.setValueAtTime(0, ctx.currentTime + 0.24);
    shimmerGain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.26);
    shimmerGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
    shimmer.connect(shimmerGain).connect(ctx.destination);
    shimmer.start(ctx.currentTime + 0.24);
    shimmer.stop(ctx.currentTime + 0.5);
  }, [getAudioContext]);

  // ========== TASK 28: Game Over Sound ==========
  const playGameOver = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioContext();

    // Descending sad tones
    const notes = [392, 349, 330, 294]; // G4, F4, E4, D4

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const delay = i * 0.15;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.3);

      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.35);
    });
  }, [getAudioContext]);

  return {
    // Core sounds
    playCorrectTap,
    playWrongTap,
    playMiss,
    playMatchStart,
    playGameStart,

    // Countdown urgency
    playCountdownTick,
    playCountdownWarning,
    playCountdownCritical,

    // Life events
    playLifeLoss,
    playLastLifeWarning,
    playGameOver,

    // Celebrations
    playPerfect,
    playStreakMilestone,

    // Misc
    playSpeedUp,
    playColorChange,
    playTooSlow,
    playTimeDilation,

    // Control
    setMuted,
  };
};
