// src/lib/combat/audio.ts
// Battle Audio Manager — Web Audio API engine with WAV samples + synth fallback
// Ported from ClawCombat's battle-audio.js to TypeScript singleton

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TypeAudioProfile {
  wave: OscillatorType;
  freq: number;
  filter: BiquadFilterType | null;
  filterFreq: number;
  mod: number;
}

// ---------------------------------------------------------------------------
// Type-specific audio profiles (from ClawCombat)
// ---------------------------------------------------------------------------

export const TYPE_AUDIO_PROFILES: Record<string, TypeAudioProfile> = {
  FIRE:     { wave: 'sawtooth', freq: 250, filter: 'lowpass',  filterFreq: 600,  mod: 8  },
  WATER:    { wave: 'sine',     freq: 350, filter: 'lowpass',  filterFreq: 1200, mod: 5  },
  ELECTRIC: { wave: 'square',   freq: 600, filter: 'highpass', filterFreq: 1500, mod: 40 },
  GRASS:    { wave: 'triangle', freq: 300, filter: 'bandpass', filterFreq: 800,  mod: 3  },
  ICE:      { wave: 'sine',     freq: 500, filter: 'highpass', filterFreq: 2000, mod: 12 },
  SHADOW:   { wave: 'sawtooth', freq: 150, filter: 'lowpass',  filterFreq: 400,  mod: 6  },
  METAL:    { wave: 'square',   freq: 400, filter: 'bandpass', filterFreq: 1800, mod: 0  },
  PSYCHE:   { wave: 'sine',     freq: 700, filter: 'bandpass', filterFreq: 1400, mod: 8  },
  DRAGON:   { wave: 'sawtooth', freq: 200, filter: 'lowpass',  filterFreq: 500,  mod: 10 },
  MYSTIC:   { wave: 'sine',     freq: 800, filter: 'highpass', filterFreq: 1600, mod: 6  },
  NEUTRAL:  { wave: 'square',   freq: 200, filter: null,       filterFreq: 0,    mod: 0  },
};

/** Aliases map types that share audio profiles with a canonical type */
const TYPE_ALIASES: Record<string, string> = {
  MARTIAL: 'FIRE',
  VENOM:   'SHADOW',
  EARTH:   'NEUTRAL',
  AIR:     'ICE',
  INSECT:  'GRASS',
  STONE:   'METAL',
  GHOST:   'SHADOW',
};

/** Pitch rate per type for hit sounds */
const TYPE_HIT_RATES: Record<string, number> = {
  FIRE: 0.9, WATER: 1.1, ELECTRIC: 1.4, GRASS: 1.0, ICE: 1.2,
  SHADOW: 0.7, METAL: 0.85, PSYCHE: 1.3, DRAGON: 0.75, MYSTIC: 1.25,
};

// ---------------------------------------------------------------------------
// WAV path mapping
// ---------------------------------------------------------------------------

const WAV_BASE = '/assets/sounds/combat';

const WAV_PATHS: Record<string, string> = {
  strike:     `${WAV_BASE}/strike.wav`,
  hit:        `${WAV_BASE}/hit.wav`,
  burst:      `${WAV_BASE}/burst.wav`,
  beam:       `${WAV_BASE}/beam.wav`,
  charge:     `${WAV_BASE}/charge.wav`,
  projectile: `${WAV_BASE}/projectile.wav`,
  electric:   `${WAV_BASE}/electric.wav`,
  slash:      `${WAV_BASE}/slash.wav`,
  wave:       `${WAV_BASE}/wave.wav`,
  spin:       `${WAV_BASE}/spin.wav`,
  drain:      `${WAV_BASE}/drain.wav`,
  shield:     `${WAV_BASE}/shield.wav`,
  boost:      `${WAV_BASE}/boost.wav`,
  status:     `${WAV_BASE}/status.wav`,
  heal:       `${WAV_BASE}/heal.wav`,
};

// ---------------------------------------------------------------------------
// Volume constants
// ---------------------------------------------------------------------------

const DEFAULT_SFX_VOLUME = 0.35;
const MAX_SFX_VOLUME = 0.7;

// ---------------------------------------------------------------------------
// BattleAudio class
// ---------------------------------------------------------------------------

export class BattleAudio {
  private _ctx: AudioContext | null = null;
  private _sfxVolume: number = DEFAULT_SFX_VOLUME;
  private _isMuted: boolean = false;
  private _shakeEnabled: boolean = true;
  private _wavCache: Map<string, AudioBuffer | Promise<AudioBuffer | null> | null> = new Map();
  private _preloaded: boolean = false;

  // ---- AudioContext (lazy init) ----

  private getCtx(): AudioContext {
    if (!this._ctx) {
      const Ctor = (window as unknown as Record<string, unknown>).AudioContext
        ?? (window as unknown as Record<string, unknown>).webkitAudioContext;
      if (!Ctor) throw new Error('Web Audio API not supported');
      this._ctx = new (Ctor as new () => AudioContext)();
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  }

  // ---- Settings ----

  get sfxVolume(): number {
    return this._sfxVolume;
  }

  set sfxVolume(v: number) {
    this._sfxVolume = Math.max(0, Math.min(MAX_SFX_VOLUME, v));
  }

  get isMuted(): boolean {
    return this._isMuted;
  }

  get shakeEnabled(): boolean {
    return this._shakeEnabled;
  }

  set shakeEnabled(v: boolean) {
    this._shakeEnabled = v;
  }

  toggleMute(): void {
    this._isMuted = !this._isMuted;
  }

  /** Suspend audio context - stops all playing sounds immediately */
  suspend(): void {
    if (this._ctx && this._ctx.state === 'running') {
      this._ctx.suspend().catch(() => {});
    }
  }

  /** Resume audio context */
  resume(): void {
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
  }

  // ---- Type profile resolution ----

  getTypeProfile(type: string): TypeAudioProfile {
    const resolved = TYPE_ALIASES[type] ?? type;
    return TYPE_AUDIO_PROFILES[resolved] ?? TYPE_AUDIO_PROFILES.NEUTRAL;
  }

  // ---- WAV path check ----

  hasWavPath(name: string): boolean {
    return name in WAV_PATHS;
  }

  // ---- WAV loading ----

  private loadWav(name: string): Promise<AudioBuffer | null> | AudioBuffer | null {
    const cached = this._wavCache.get(name);
    if (cached !== undefined) return cached;

    const path = WAV_PATHS[name];
    if (!path) return null;

    const promise = fetch(path)
      .then((r) => r.arrayBuffer())
      .then((buf) => this.getCtx().decodeAudioData(buf))
      .then((decoded) => {
        this._wavCache.set(name, decoded);
        return decoded;
      })
      .catch(() => {
        this._wavCache.set(name, null);
        return null;
      });

    this._wavCache.set(name, promise);
    return promise;
  }

  /** Preload all WAV samples — call after first user gesture */
  preload(): void {
    if (this._preloaded) return;
    this._preloaded = true;
    for (const name of Object.keys(WAV_PATHS)) {
      this.loadWav(name);
    }
  }

  // ---- WAV playback ----

  private playWav(name: string, vol: number, rate: number): boolean {
    const buf = this._wavCache.get(name);
    if (!buf || buf instanceof Promise) return false;

    const c = this.getCtx();
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;

    const g = c.createGain();
    g.gain.value = vol * this._sfxVolume;
    src.connect(g);
    g.connect(c.destination);
    src.start(0);
    return true;
  }

  private playWavFade(name: string, vol: number, rate: number): boolean {
    const buf = this._wavCache.get(name);
    if (!buf || buf instanceof Promise) return false;

    const c = this.getCtx();
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;

    const duration = buf.duration / rate;
    const g = c.createGain();
    const startVol = vol * this._sfxVolume;
    const t = c.currentTime;

    g.gain.setValueAtTime(startVol, t);
    g.gain.setValueAtTime(startVol, t + duration * 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);

    src.connect(g);
    g.connect(c.destination);
    src.start(0);
    src.stop(t + duration);
    return true;
  }

  // ---- Synth primitives ----

  private osc(
    type: OscillatorType,
    freq: number,
    start: number,
    dur: number,
    vol: number,
    dest?: AudioNode,
  ): OscillatorNode {
    const c = this.getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime((vol ?? 0.3) * this._sfxVolume, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.connect(g);
    g.connect(dest ?? c.destination);
    o.start(start);
    o.stop(start + dur);
    return o;
  }

  private filtOsc(
    type: OscillatorType,
    freq: number,
    start: number,
    dur: number,
    vol: number,
    filterType: BiquadFilterType | null,
    filterFreq: number,
    modRate: number,
  ): void {
    const c = this.getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime((vol ?? 0.3) * this._sfxVolume, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.connect(g);

    let output: AudioNode = g;
    if (filterType) {
      const f = c.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = filterFreq || 1000;
      f.Q.value = 2;
      g.connect(f);
      output = f;
    }
    if (modRate) {
      const lfo = c.createOscillator();
      const lfoG = c.createGain();
      lfo.frequency.value = modRate;
      lfoG.gain.value = freq * 0.1;
      lfo.connect(lfoG);
      lfoG.connect(o.frequency as unknown as AudioNode);
      lfo.start(start);
      lfo.stop(start + dur);
    }
    output.connect(c.destination);
    o.start(start);
    o.stop(start + dur);
  }

  private filtNoise(
    start: number,
    dur: number,
    vol: number,
    filterType: BiquadFilterType | null,
    filterFreq: number,
  ): void {
    const c = this.getCtx();
    const bufferSize = Math.floor(c.sampleRate * Math.max(dur, 0.01));
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = buffer;

    const g = c.createGain();
    g.gain.setValueAtTime((vol ?? 0.15) * this._sfxVolume, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    src.connect(g);

    if (filterType) {
      const f = c.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = filterFreq || 800;
      f.Q.value = 1;
      g.connect(f);
      f.connect(c.destination);
    } else {
      g.connect(c.destination);
    }
    src.start(start);
    src.stop(start + dur);
  }

  // ---- Guard helper ----

  private guard(): boolean {
    return this._isMuted;
  }

  // ---- Sound effects API ----

  /** Normal hit — strike.wav pitched by move type */
  hit(moveType?: string): void {
    if (this.guard()) return;
    try {
      const resolved = moveType ? (TYPE_ALIASES[moveType] ?? moveType) : undefined;
      const rate = (resolved && TYPE_HIT_RATES[resolved]) || 1.0;
      if (this.playWav('strike', 0.55, rate)) return;
      // Synth fallback
      const c = this.getCtx();
      const t = c.currentTime;
      const p = this.getTypeProfile(moveType ?? 'NEUTRAL');
      this.filtNoise(t, 0.12, 0.3, 'lowpass', 400);
      this.filtOsc(p.wave, p.freq, t, 0.1, 0.25, p.filter, p.filterFreq, p.mod);
      this.filtOsc(p.wave, p.freq * 0.6, t + 0.03, 0.1, 0.2, p.filter, p.filterFreq, 0);
    } catch { /* AudioContext not allowed yet */ }
  }

  /** Critical hit — hit.wav + synth */
  hitCrit(moveType?: string): void {
    if (this.guard()) return;
    try {
      if (this.playWav('hit', 0.7, 1.0)) return;
      const c = this.getCtx();
      const t = c.currentTime;
      const p = this.getTypeProfile(moveType ?? 'NEUTRAL');
      this.filtNoise(t, 0.2, 0.45, 'lowpass', 500);
      this.filtOsc(p.wave, p.freq * 1.5, t, 0.06, 0.4, p.filter, p.filterFreq, p.mod);
      this.filtOsc('square', p.freq * 2, t + 0.02, 0.08, 0.35, p.filter, p.filterFreq * 1.2, 0);
      this.filtOsc(p.wave, p.freq * 0.7, t + 0.06, 0.14, 0.28, p.filter, p.filterFreq, 0);
    } catch { /* AudioContext not allowed yet */ }
  }

  /** Super effective hit — burst.wav + synth */
  hitSuper(moveType?: string): void {
    if (this.guard()) return;
    try {
      if (this.playWav('burst', 0.7, 1.0)) return;
      const c = this.getCtx();
      const t = c.currentTime;
      const p = this.getTypeProfile(moveType ?? 'NEUTRAL');
      this.filtNoise(t, 0.22, 0.4, 'lowpass', 500);
      this.filtOsc(p.wave, p.freq * 2, t, 0.05, 0.35, p.filter, p.filterFreq, p.mod);
      this.filtOsc('square', p.freq * 1.4, t + 0.03, 0.07, 0.3, p.filter, p.filterFreq, 0);
      this.filtOsc(p.wave, p.freq, t + 0.06, 0.12, 0.28, p.filter, p.filterFreq, 0);
      this.osc('sine', 800, t + 0.1, 0.1, 0.18);
    } catch { /* AudioContext not allowed yet */ }
  }

  /** Miss — spin.wav at 1.2x speed */
  miss(): void {
    if (this.guard()) return;
    try {
      if (this.playWav('spin', 0.4, 1.2)) return;
      // Synth fallback: descending whoosh
      const c = this.getCtx();
      const t = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(400, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.18);
      g.gain.setValueAtTime(0.15 * this._sfxVolume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.18);
    } catch { /* AudioContext not allowed yet */ }
  }

  /** Faint — drain.wav at 1.6x with fade */
  faint(): void {
    if (this.guard()) return;
    try {
      if (this.playWavFade('drain', 0.6, 1.6)) return;
      // Synth fallback: descending filtered squares
      const c = this.getCtx();
      const t = c.currentTime;
      for (let i = 0; i < 6; i++) {
        this.filtOsc('square', 350 - i * 45, t + i * 0.07, 0.12, 0.22 - i * 0.03, 'lowpass', 600 - i * 60, 0);
      }
      this.filtNoise(t + 0.08, 0.35, 0.18, 'lowpass', 300);
    } catch { /* AudioContext not allowed yet */ }
  }

  /** Victory — C major synth fanfare (C5-E5-G5-C6) */
  victory(): void {
    if (this.guard()) return;
    try {
      const c = this.getCtx();
      const t = c.currentTime;
      // Layer 1: bright square wave melody
      const fanfare = [
        { f: 523, t: 0,    d: 0.18 },  // C5
        { f: 659, t: 0.12, d: 0.18 },  // E5
        { f: 784, t: 0.24, d: 0.18 },  // G5
        { f: 784, t: 0.40, d: 0.12 },  // G5 (grace)
        { f: 1047, t: 0.50, d: 0.70 }, // C6 (sustained)
      ];
      for (const n of fanfare) {
        this.osc('square', n.f, t + n.t, n.d, 0.18);
      }
      // Layer 2: warm sine harmony (thirds below)
      const harmony = [
        { f: 440, t: 0,    d: 0.18 },  // A4
        { f: 523, t: 0.12, d: 0.18 },  // C5
        { f: 659, t: 0.24, d: 0.18 },  // E5
        { f: 659, t: 0.40, d: 0.12 },  // E5
        { f: 784, t: 0.50, d: 0.70 },  // G5
      ];
      for (const h of harmony) {
        this.osc('sine', h.f, t + h.t, h.d, 0.14);
      }
      // Layer 3: sub-bass root notes
      this.osc('sine', 262, t + 0.0, 0.35, 0.12);   // C4
      this.osc('sine', 392, t + 0.40, 0.15, 0.10);   // G4
      this.osc('sine', 523, t + 0.50, 0.80, 0.10);   // C5
      // Layer 4: shimmer
      this.osc('triangle', 2093, t + 0.55, 0.50, 0.06); // C7
      this.osc('triangle', 2637, t + 0.60, 0.40, 0.04); // E7
    } catch { /* AudioContext not allowed yet */ }
  }

  /** Defeat — drain.wav at 0.6x speed */
  defeat(): void {
    if (this.guard()) return;
    try {
      if (this.playWav('drain', 0.5, 0.6)) return;
      // Synth fallback: descending sawtooth
      const c = this.getCtx();
      const t = c.currentTime;
      const notes = [400, 350, 300, 200];
      for (let i = 0; i < notes.length; i++) {
        this.filtOsc('sawtooth', notes[i], t + i * 0.18, 0.28, 0.2, 'lowpass', 500, 0);
      }
    } catch { /* AudioContext not allowed yet */ }
  }

  /** Status inflict — status.wav */
  statusInflict(): void {
    if (this.guard()) return;
    try {
      if (this.playWav('status', 0.5, 1.0)) return;
      const c = this.getCtx();
      const t = c.currentTime;
      this.filtOsc('sine', 600, t, 0.08, 0.2, 'bandpass', 900, 6);
      this.filtOsc('sine', 800, t + 0.06, 0.08, 0.15, 'bandpass', 900, 6);
      this.filtOsc('sine', 600, t + 0.12, 0.12, 0.1, 'bandpass', 900, 0);
    } catch { /* AudioContext not allowed yet */ }
  }

  /** Heal — heal.wav */
  heal(): void {
    if (this.guard()) return;
    try {
      if (this.playWav('heal', 0.5, 1.0)) return;
      const c = this.getCtx();
      const t = c.currentTime;
      const notes = [400, 500, 600, 800];
      for (let i = 0; i < notes.length; i++) {
        this.osc('sine', notes[i], t + i * 0.08, 0.15, 0.18);
      }
    } catch { /* AudioContext not allowed yet */ }
  }

  /** Move select — projectile.wav at 1.5x, 0.3 vol */
  moveSelect(): void {
    if (this.guard()) return;
    try {
      if (this.playWav('projectile', 0.3, 1.5)) return;
      const c = this.getCtx();
      const t = c.currentTime;
      this.filtOsc('square', 600, t, 0.04, 0.12, 'highpass', 1000, 0);
    } catch { /* AudioContext not allowed yet */ }
  }

  /** Turn start — beam.wav at 1.3x, 0.4 vol */
  turnStart(): void {
    if (this.guard()) return;
    try {
      if (this.playWav('beam', 0.4, 1.3)) return;
      const c = this.getCtx();
      const t = c.currentTime;
      this.osc('sine', 660, t, 0.08, 0.12);
      this.osc('sine', 880, t + 0.06, 0.1, 0.1);
    } catch { /* AudioContext not allowed yet */ }
  }

  /** Stat boost — shield.wav */
  statBoost(): void {
    if (this.guard()) return;
    try {
      if (this.playWav('shield', 0.4, 1.0)) return;
      const c = this.getCtx();
      const t = c.currentTime;
      this.osc('sine', 500, t, 0.1, 0.12);
      this.osc('sine', 700, t + 0.06, 0.1, 0.12);
    } catch { /* AudioContext not allowed yet */ }
  }

  /** Stat drop — slash.wav at 0.7x */
  statDrop(): void {
    if (this.guard()) return;
    try {
      if (this.playWav('slash', 0.35, 0.7)) return;
      const c = this.getCtx();
      const t = c.currentTime;
      this.osc('sine', 500, t, 0.1, 0.12);
      this.osc('sine', 350, t + 0.06, 0.1, 0.12);
    } catch { /* AudioContext not allowed yet */ }
  }

  /** Match found — charge.wav */
  matchFound(): void {
    if (this.guard()) return;
    try {
      if (this.playWav('charge', 0.6, 1.0)) return;
      const c = this.getCtx();
      const t = c.currentTime;
      this.osc('square', 440, t, 0.1, 0.25);
      this.osc('square', 554, t + 0.1, 0.1, 0.25);
      this.osc('square', 659, t + 0.2, 0.1, 0.25);
      this.osc('square', 880, t + 0.3, 0.22, 0.3);
    } catch { /* AudioContext not allowed yet */ }
  }

  /** Timer tick — synth sine 1000Hz 40ms */
  timerTick(): void {
    if (this.guard()) return;
    try {
      const c = this.getCtx();
      const t = c.currentTime;
      this.osc('sine', 1000, t, 0.04, 0.1);
    } catch { /* AudioContext not allowed yet */ }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _instance: BattleAudio | null = null;

/** Get the battle audio manager singleton */
export function getBattleAudio(opts?: { forceNew?: boolean }): BattleAudio {
  if (opts?.forceNew || !_instance) {
    _instance = new BattleAudio();
  }
  return _instance;
}
