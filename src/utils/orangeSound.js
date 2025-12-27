// Singleton AudioContext for orange bounce sound effects
let ctx;
let unlocked = false;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

/**
 * Initialize audio context on first user interaction.
 * Call this once when user first interacts (pointerdown/click).
 */
export async function ensureOrangeAudioUnlocked() {
  try {
    const c = getCtx();
    if (c.state === "suspended") await c.resume();
    unlocked = true;
  } catch {}
}

/**
 * Play a bouncy "boing" sound when orange is touched.
 * Uses triangle waveform for a softer, more natural boing sound.
 */
export function playOrangeClickSound() {
  try {
    const c = getCtx();
    if (!unlocked || c.state !== "running") return;

    // Store currentTime explicitly for safe scheduling
    const t0 = c.currentTime;

    // Create oscillator and gain nodes
    const osc = c.createOscillator();
    const gain = c.createGain();

    // Triangle wave for softer boing sound (not harsh square wave)
    osc.type = "triangle";
    
    // Frequency drops from 520Hz to 220Hz (bouncy pitch drop)
    osc.frequency.setValueAtTime(520, t0);
    osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.06);

    // Smooth gain envelope (quick attack, exponential decay)
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.22, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.10);

    // Connect nodes
    osc.connect(gain);
    gain.connect(c.destination);

    // Schedule playback
    osc.start(t0);
    osc.stop(t0 + 0.11);

    // Clean up nodes after playback to prevent memory leaks
    osc.onended = () => {
      try { osc.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    };
  } catch {}
}



















