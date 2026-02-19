# Combat Polish Phase 2: Sound System & Audio

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete combat sound system — Web Audio API engine with WAV sound effects, type-specific synth fallbacks, 3-level BGM with crossfading, and a React hook for component integration. Port the audio architecture from ClawCombat.

**Architecture:** Singleton `CombatSoundManager` class handles AudioContext, WAV loading, synth generation, and BGM crossfading. A `useCombatSound` React hook wraps it with lifecycle management and mute state sync. Sound files are served from `public/sounds/combat/`.

**Tech Stack:** Web Audio API, TypeScript, React hooks, Vitest

**Reference Files:**
- ClawCombat audio: `/Users/abit_hex/ClawCombat/apps/backend/src/public/js/battle-audio.js` (751 lines)
- ClawCombat sounds: `/Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/` (15 SFX + 3 BGM)
- Existing game mute: Search for `GameMuteContext` or similar mute context in the codebase

**Test Commands:**
- TypeScript: `npx tsc --noEmit`
- Unit: `npx vitest run src/lib/combat/`

**IMPORTANT:** This spec depends on Spec 1 (Battle Animations) being completed first, since BattleView integration references animation events.

---

## IMPORTANT: Read Before Starting

1. Check if a `GameMuteContext` or similar mute context exists — search the codebase first
2. If no mute context exists, create a minimal one in Task 2
3. Sound files are copied from ClawCombat — they're WAV format
4. The CombatSoundManager is a singleton (one AudioContext per page)
5. All WAV loading is lazy — sounds load on first use, not on page load
6. Synth fallbacks ensure sound works even if WAVs fail to load
7. Commit after each task

---

### Task 1: Copy sound files from ClawCombat to public/sounds/combat/

**Files:**
- Create: `public/sounds/combat/` directory
- Copy: 15 SFX files + 3 BGM files from ClawCombat

**Step 1: Create the directory and copy WAV files**

```bash
mkdir -p public/sounds/combat
```

**Step 2: Copy SFX files from ClawCombat**

```bash
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/beam.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/projectile.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/slash.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/charge.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/burst.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/drain.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/shield.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/status.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/hit.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/strike.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/spin.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/heal.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/wave.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/swarm.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/arc.wav public/sounds/combat/
```

**Step 3: Copy BGM files**

```bash
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/bgm_level1.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/bgm_level2.wav public/sounds/combat/
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/bgm_level3.wav public/sounds/combat/
```

**NOTE:** If any files are missing from ClawCombat, skip them — the synth fallback system handles missing WAVs gracefully. List which files were actually found and copied.

**Step 4: Verify files exist**

```bash
ls -la public/sounds/combat/
```

**Step 5: Commit**

```bash
git add public/sounds/combat/
git commit -m "feat(combat): add WAV sound files for combat SFX and BGM (copied from ClawCombat)"
```

---

### Task 2: Create or verify GameMuteContext

**Files:**
- Search for existing mute context first
- If not found, create: `src/contexts/GameMuteContext.tsx`

**Step 1: Search for existing mute context**

```bash
grep -rn "GameMute\|gameMute\|isMuted\|toggleMute" src/contexts/ src/hooks/
```

**Step 2: If a mute context already exists, note its import path and skip to Task 3**

**Step 3: If no mute context exists, create one**

```tsx
// src/contexts/GameMuteContext.tsx

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface GameMuteContextValue {
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
}

const GameMuteContext = createContext<GameMuteContextValue>({
  isMuted: false,
  toggleMute: () => {},
  setMuted: () => {},
});

export function GameMuteProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('wojak-game-muted') === 'true';
    } catch {
      return false;
    }
  });

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try { localStorage.setItem('wojak-game-muted', String(next)); } catch {}
      return next;
    });
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
    try { localStorage.setItem('wojak-game-muted', String(muted)); } catch {}
  }, []);

  return (
    <GameMuteContext.Provider value={{ isMuted, toggleMute, setMuted }}>
      {children}
    </GameMuteContext.Provider>
  );
}

export function useGameMute() {
  return useContext(GameMuteContext);
}
```

**Step 4: If you created the context, wrap it in the app's provider tree**

Find the main app component (likely `src/App.tsx` or `src/main.tsx`) and wrap the existing tree with `<GameMuteProvider>`. Place it near other context providers.

**Step 5: Verify**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/contexts/GameMuteContext.tsx src/App.tsx
git commit -m "feat(combat): add GameMuteContext with localStorage persistence"
```

---

### Task 3: Create CombatSoundManager — core class with AudioContext setup

**Files:**
- Create: `src/lib/combat/sound-manager.ts`

**Step 1: Create the file with the full CombatSoundManager class**

This is a large file (~400 lines). Create it with all the core infrastructure:

```typescript
// src/lib/combat/sound-manager.ts

/**
 * CombatSoundManager — singleton Web Audio API engine for battle sounds.
 *
 * Architecture:
 *   AudioContext
 *     └─▶ masterGain (mute control)
 *           ├─▶ sfxGain (0.7) ─▶ WAV buffers / synth oscillators
 *           └─▶ bgmGain (0.3) ─▶ BGM source (looped, crossfaded)
 *
 * Features:
 * - Lazy AudioContext creation (must be triggered by user gesture)
 * - WAV file loading with fetch + decodeAudioData
 * - 18 type-specific synth profiles as fallback
 * - Animation pattern → sound file mapping
 * - Hit outcome sounds (normal/crit/super-effective)
 * - Status, stat change, heal, faint sounds
 * - 3-level BGM with crossfade transitions
 * - Victory fanfare (pure synth)
 * - Mute toggle via master gain
 */

import type { CombatType } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AnimationPattern =
  | 'beam' | 'projectile' | 'arc' | 'charge' | 'slash'
  | 'wave' | 'swarm' | 'drain' | 'self_aura' | 'status_drift';

export type HitOutcome = 'normal' | 'critical' | 'super_effective';

export type BGMLevel = 1 | 2 | 3;

// ─── Constants ───────────────────────────────────────────────────────────────

const SFX_BASE_PATH = '/sounds/combat/';

const SFX_FILES = [
  'beam', 'projectile', 'slash', 'charge', 'burst',
  'drain', 'shield', 'status', 'hit', 'strike',
  'spin', 'heal', 'wave', 'swarm', 'arc',
] as const;

const BGM_FILES = ['bgm_level1', 'bgm_level2', 'bgm_level3'] as const;

const SFX_GAIN = 0.7;
const BGM_GAIN = 0.3;
const BGM_CROSSFADE_DURATION = 4; // seconds
const BGM_FADE_IN_DURATION = 3;   // seconds

/** Map animation patterns to their primary sound file */
const PATTERN_SOUND_MAP: Record<AnimationPattern, string> = {
  beam: 'beam',
  projectile: 'projectile',
  arc: 'arc',
  charge: 'charge',
  slash: 'slash',
  wave: 'wave',
  swarm: 'swarm',
  drain: 'drain',
  self_aura: 'shield',
  status_drift: 'status',
};

/** Map hit outcomes to sound files */
const HIT_SOUND_MAP: Record<HitOutcome, string> = {
  normal: 'strike',
  critical: 'hit',
  super_effective: 'burst',
};

/**
 * Type-specific synth profiles — used as fallback when WAV files aren't loaded.
 * Each profile defines oscillator type, base frequency, and attack envelope.
 */
const TYPE_SYNTH_PROFILES: Record<string, { oscType: OscillatorType; freq: number; attack: number; decay: number }> = {
  NEUTRAL:  { oscType: 'triangle', freq: 440, attack: 0.01, decay: 0.2 },
  FIRE:     { oscType: 'sawtooth', freq: 220, attack: 0.005, decay: 0.3 },
  WATER:    { oscType: 'sine', freq: 330, attack: 0.02, decay: 0.4 },
  ELECTRIC: { oscType: 'square', freq: 880, attack: 0.002, decay: 0.15 },
  GRASS:    { oscType: 'sine', freq: 392, attack: 0.03, decay: 0.35 },
  ICE:      { oscType: 'sine', freq: 1047, attack: 0.01, decay: 0.5 },
  MARTIAL:  { oscType: 'sawtooth', freq: 165, attack: 0.005, decay: 0.2 },
  VENOM:    { oscType: 'sawtooth', freq: 277, attack: 0.01, decay: 0.25 },
  EARTH:    { oscType: 'triangle', freq: 110, attack: 0.02, decay: 0.4 },
  AIR:      { oscType: 'sine', freq: 587, attack: 0.015, decay: 0.3 },
  PSYCHE:   { oscType: 'sine', freq: 698, attack: 0.02, decay: 0.4 },
  INSECT:   { oscType: 'square', freq: 523, attack: 0.003, decay: 0.1 },
  STONE:    { oscType: 'triangle', freq: 147, attack: 0.01, decay: 0.35 },
  GHOST:    { oscType: 'sine', freq: 370, attack: 0.03, decay: 0.5 },
  DRAGON:   { oscType: 'sawtooth', freq: 196, attack: 0.005, decay: 0.4 },
  SHADOW:   { oscType: 'sawtooth', freq: 247, attack: 0.01, decay: 0.3 },
  METAL:    { oscType: 'square', freq: 740, attack: 0.002, decay: 0.2 },
  MYSTIC:   { oscType: 'sine', freq: 659, attack: 0.025, decay: 0.45 },
};

// ─── CombatSoundManager ─────────────────────────────────────────────────────

export class CombatSoundManager {
  private static instance: CombatSoundManager | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private muted = false;
  private currentBGMSource: AudioBufferSourceNode | null = null;
  private bgmFadeGain: GainNode | null = null;
  private currentBGMLevel: BGMLevel | null = null;

  private constructor() {}

  static getInstance(): CombatSoundManager {
    if (!CombatSoundManager.instance) {
      CombatSoundManager.instance = new CombatSoundManager();
    }
    return CombatSoundManager.instance;
  }

  // ─── Init & Loading ──────────────────────────────────────────────────────

  /** Initialize AudioContext (MUST be called from user gesture handler) */
  async init(): Promise<void> {
    if (this.ctx) return;

    this.ctx = new AudioContext();

    // Master gain (mute control)
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 1;
    this.masterGain.connect(this.ctx.destination);

    // SFX bus
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = SFX_GAIN;
    this.sfxGain.connect(this.masterGain);

    // BGM bus
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = BGM_GAIN;
    this.bgmGain.connect(this.masterGain);

    // Resume suspended context (Chrome autoplay policy)
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /** Ensure context exists, resume if suspended. Returns false if no context. */
  private ensureContext(): boolean {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  /** Load all WAV files (SFX + BGM). Safe to call multiple times. */
  async loadAll(): Promise<void> {
    if (!this.ctx) return;

    const promises: Promise<void>[] = [];

    for (const name of SFX_FILES) {
      if (!this.buffers.has(name)) {
        promises.push(this.loadBuffer(name, `${SFX_BASE_PATH}${name}.wav`));
      }
    }

    for (const name of BGM_FILES) {
      if (!this.buffers.has(name)) {
        promises.push(this.loadBuffer(name, `${SFX_BASE_PATH}${name}.wav`));
      }
    }

    await Promise.allSettled(promises);
  }

  private async loadBuffer(name: string, url: string): Promise<void> {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[CombatSound] Failed to load ${name}: ${res.status}`);
        return;
      }
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
      this.buffers.set(name, audioBuffer);
    } catch (err) {
      console.warn(`[CombatSound] Error loading ${name}:`, err);
    }
  }

  // ─── Mute Control ────────────────────────────────────────────────────────

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(muted ? 0 : 1, now);
    }
  }

  getMuted(): boolean {
    return this.muted;
  }

  // ─── SFX Playback ────────────────────────────────────────────────────────

  /** Play a WAV buffer with optional pitch shift and volume */
  private playSFXBuffer(name: string, playbackRate = 1, volume = 1): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;

    const buffer = this.buffers.get(name);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;

    if (volume !== 1) {
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(this.sfxGain);
    } else {
      source.connect(this.sfxGain);
    }

    source.start();
  }

  /** Play a type-specific synth tone (fallback for missing WAVs) */
  private playSynth(type: CombatType | string, duration = 0.3): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    if (this.muted) return;

    const profile = TYPE_SYNTH_PROFILES[type] ?? TYPE_SYNTH_PROFILES.NEUTRAL;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = profile.oscType;
    osc.frequency.setValueAtTime(profile.freq, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + profile.attack);
    gain.gain.exponentialRampToValueAtTime(0.001, now + profile.attack + profile.decay);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /** Play WAV with synth fallback */
  private playWithFallback(
    soundName: string,
    type: CombatType | string,
    playbackRate = 1,
    volume = 1,
    synthDuration = 0.3,
  ): void {
    if (this.buffers.has(soundName)) {
      this.playSFXBuffer(soundName, playbackRate, volume);
    } else {
      this.playSynth(type, synthDuration);
    }
  }

  /** Synth frequency sweep (for miss/dodge) */
  private playSynthSweep(
    freqStart: number,
    freqEnd: number,
    duration: number,
    volume: number,
  ): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    if (this.muted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // ─── Public Sound Methods ────────────────────────────────────────────────

  /** Play an attack sound based on move animation pattern and type */
  playAttack(pattern: AnimationPattern, type: CombatType): void {
    if (this.muted) return;
    const soundName = PATTERN_SOUND_MAP[pattern];
    if (!soundName) {
      this.playSynth(type, 0.3);
      return;
    }
    this.playWithFallback(soundName, type);
  }

  /** Play a hit impact sound based on outcome */
  playHit(outcome: HitOutcome, type: CombatType): void {
    if (this.muted) return;
    const soundName = HIT_SOUND_MAP[outcome];
    const volume = outcome === 'normal' ? 0.8 : 1.0;
    this.playWithFallback(soundName, type, 1, volume);
  }

  /** Play a miss/dodge sound (whoosh) */
  playMiss(): void {
    if (this.muted) return;
    if (this.buffers.has('spin')) {
      this.playSFXBuffer('spin', 1.2, 0.5);
    } else {
      this.playSynthSweep(800, 200, 0.15, 0.3);
    }
  }

  /** Play a status effect infliction sound */
  playStatus(statusName: string): void {
    if (this.muted) return;
    this.playWithFallback('status', 'NEUTRAL', 1, 0.6, 0.4);
  }

  /** Play a stat boost or drop sound */
  playStatChange(boost: boolean): void {
    if (this.muted) return;
    if (boost) {
      if (this.buffers.has('shield')) {
        this.playSFXBuffer('shield', 1, 0.6);
      } else {
        this.playSynthSweep(300, 800, 0.3, 0.4);
      }
    } else {
      if (this.buffers.has('slash')) {
        this.playSFXBuffer('slash', 0.7, 0.5);
      } else {
        this.playSynthSweep(800, 300, 0.3, 0.4);
      }
    }
  }

  /** Play a healing/recovery sound */
  playHeal(): void {
    if (this.muted) return;
    this.playWithFallback('heal', 'MYSTIC', 1, 0.7, 0.5);
  }

  /** Play a faint/KO sound */
  playFaint(): void {
    if (this.muted) return;
    if (this.buffers.has('drain')) {
      this.playSFXBuffer('drain', 0.6, 0.8);
    } else {
      this.playSynthSweep(400, 80, 0.8, 0.5);
    }
  }

  // ─── BGM ─────────────────────────────────────────────────────────────────

  /** Play battle BGM at the given intensity level with crossfading */
  playBGM(level: BGMLevel): void {
    if (!this.ensureContext() || !this.ctx || !this.bgmGain) return;
    if (this.currentBGMLevel === level) return;

    const bufferName = `bgm_level${level}`;
    const buffer = this.buffers.get(bufferName);
    if (!buffer) {
      console.warn(`[CombatSound] BGM buffer not found: ${bufferName}`);
      return;
    }

    const now = this.ctx.currentTime;

    // Fade out current BGM
    if (this.currentBGMSource && this.bgmFadeGain) {
      const oldSource = this.currentBGMSource;
      const oldGain = this.bgmFadeGain;
      oldGain.gain.setValueAtTime(oldGain.gain.value, now);
      oldGain.gain.linearRampToValueAtTime(0, now + BGM_CROSSFADE_DURATION);
      setTimeout(() => {
        try { oldSource.stop(); } catch { /* already stopped */ }
      }, BGM_CROSSFADE_DURATION * 1000);
    }

    // Create new BGM source
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const fadeGain = this.ctx.createGain();
    fadeGain.gain.setValueAtTime(0, now);
    fadeGain.gain.linearRampToValueAtTime(1, now + BGM_FADE_IN_DURATION);

    source.connect(fadeGain);
    fadeGain.connect(this.bgmGain);
    source.start(now);

    this.currentBGMSource = source;
    this.bgmFadeGain = fadeGain;
    this.currentBGMLevel = level;
  }

  /** Stop BGM with optional fade-out */
  stopBGM(fadeOut = 2): void {
    if (!this.currentBGMSource || !this.bgmFadeGain || !this.ctx) {
      this.currentBGMSource = null;
      this.bgmFadeGain = null;
      this.currentBGMLevel = null;
      return;
    }

    const now = this.ctx.currentTime;
    const source = this.currentBGMSource;
    const gain = this.bgmFadeGain;

    if (fadeOut > 0) {
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + fadeOut);
      setTimeout(() => {
        try { source.stop(); } catch { /* already stopped */ }
      }, fadeOut * 1000);
    } else {
      try { source.stop(); } catch { /* already stopped */ }
    }

    this.currentBGMSource = null;
    this.bgmFadeGain = null;
    this.currentBGMLevel = null;
  }

  getCurrentBGMLevel(): BGMLevel | null {
    return this.currentBGMLevel;
  }

  // ─── Victory / Defeat / UI Sounds ────────────────────────────────────────

  /** Victory fanfare: C5-E5-G5 arpeggio + C6 chord + shimmer */
  playVictory(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    if (this.muted) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    // Arpeggio
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      const gain = this.ctx!.createGain();
      const start = now + i * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.4, start + 0.05);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.3);
      gain.gain.linearRampToValueAtTime(0, start + 0.6);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.6);
    });

    // Final chord (C6)
    const chordStart = now + 0.5;
    const chordOsc = this.ctx.createOscillator();
    chordOsc.type = 'sine';
    chordOsc.frequency.setValueAtTime(1046.5, chordStart);
    const chordGain = this.ctx.createGain();
    chordGain.gain.setValueAtTime(0, chordStart);
    chordGain.gain.linearRampToValueAtTime(0.5, chordStart + 0.05);
    chordGain.gain.linearRampToValueAtTime(0, chordStart + 1.2);
    chordOsc.connect(chordGain);
    chordGain.connect(this.sfxGain);
    chordOsc.start(chordStart);
    chordOsc.stop(chordStart + 1.2);
  }

  /** Defeat sound: slowed drain or descending synth */
  playDefeat(): void {
    if (this.muted) return;
    if (this.buffers.has('drain')) {
      this.playSFXBuffer('drain', 0.4, 0.7);
    } else {
      this.playSynthSweep(500, 60, 1.2, 0.5);
    }
  }

  /** Timer tick: short 1000Hz pulse */
  playTimerTick(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    if (this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /** Match found sound: charge.wav + ascending tones */
  playMatchFound(): void {
    if (this.muted) return;
    if (this.buffers.has('charge')) {
      this.playSFXBuffer('charge', 1, 0.6);
    }
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const tones = [400, 500, 650, 800];
    tones.forEach((freq, i) => {
      const start = now + 0.15 + i * 0.1;
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.03);
      gain.gain.linearRampToValueAtTime(0, start + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  }
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/lib/combat/sound-manager.ts
git commit -m "feat(combat): add CombatSoundManager — Web Audio API engine with WAV loading, type synth fallbacks, BGM crossfading, and full SFX API"
```

---

### Task 4: Create useCombatSound React hook

**Files:**
- Create: `src/hooks/useCombatSound.ts`

**Step 1: Create the hook**

```typescript
// src/hooks/useCombatSound.ts

import { useEffect, useRef, useCallback } from 'react';
import { useGameMute } from '../contexts/GameMuteContext';
import {
  CombatSoundManager,
  type AnimationPattern,
  type CombatType,
  type HitOutcome,
  type BGMLevel,
} from '../lib/combat/sound-manager';

/**
 * React hook wrapping CombatSoundManager.
 *
 * Handles:
 * - Lazy AudioContext init on first user interaction
 * - WAV preloading
 * - Mute state sync with GameMuteContext
 * - Cleanup on unmount
 *
 * Usage:
 *   const sound = useCombatSound();
 *   sound.playAttack('beam', 'FIRE');
 *   sound.playHit('critical', 'FIRE');
 */
export function useCombatSound() {
  const { isMuted } = useGameMute();
  const managerRef = useRef<CombatSoundManager | null>(null);
  const initializedRef = useRef(false);

  const getManager = useCallback((): CombatSoundManager => {
    if (!managerRef.current) {
      managerRef.current = CombatSoundManager.getInstance();
    }
    return managerRef.current;
  }, []);

  /** Initialize audio context (call from user gesture handler) */
  const initAudio = useCallback(async () => {
    if (initializedRef.current) return;
    const mgr = getManager();
    await mgr.init();
    await mgr.loadAll();
    initializedRef.current = true;
  }, [getManager]);

  // Sync mute state
  useEffect(() => {
    const mgr = getManager();
    mgr.setMuted(isMuted);
  }, [isMuted, getManager]);

  // Cleanup — stop BGM on unmount but don't destroy singleton
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.stopBGM(0);
      }
    };
  }, []);

  // ─── Public API ──────────────────────────────────────────────────────────

  const playAttack = useCallback(
    (pattern: AnimationPattern, type: CombatType) => getManager().playAttack(pattern, type),
    [getManager],
  );

  const playHit = useCallback(
    (outcome: HitOutcome, type: CombatType) => getManager().playHit(outcome, type),
    [getManager],
  );

  const playMiss = useCallback(() => getManager().playMiss(), [getManager]);

  const playStatus = useCallback(
    (statusName: string) => getManager().playStatus(statusName),
    [getManager],
  );

  const playStatChange = useCallback(
    (boost: boolean) => getManager().playStatChange(boost),
    [getManager],
  );

  const playHeal = useCallback(() => getManager().playHeal(), [getManager]);
  const playFaint = useCallback(() => getManager().playFaint(), [getManager]);
  const playVictory = useCallback(() => getManager().playVictory(), [getManager]);
  const playDefeat = useCallback(() => getManager().playDefeat(), [getManager]);
  const playTimerTick = useCallback(() => getManager().playTimerTick(), [getManager]);
  const playMatchFound = useCallback(() => getManager().playMatchFound(), [getManager]);

  const playBGM = useCallback(
    (level: BGMLevel) => getManager().playBGM(level),
    [getManager],
  );

  const stopBGM = useCallback(
    (fadeOut?: number) => getManager().stopBGM(fadeOut),
    [getManager],
  );

  return {
    initAudio,
    playAttack,
    playHit,
    playMiss,
    playStatus,
    playStatChange,
    playHeal,
    playFaint,
    playVictory,
    playDefeat,
    playTimerTick,
    playMatchFound,
    playBGM,
    stopBGM,
    isMuted,
  };
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/hooks/useCombatSound.ts
git commit -m "feat(combat): add useCombatSound React hook — wraps CombatSoundManager with lifecycle, mute sync, and stable callbacks"
```

---

### Task 5: Integrate sound into BattleView

**Files:**
- Modify: `src/components/combat/BattleView.tsx`

**NOTE:** This task assumes Spec 1 (Battle Animations) has been completed. BattleView should already have the animation state from Spec 1.

**Step 1: Add sound hook import at the top of BattleView.tsx**

```typescript
import { useCombatSound } from '@/hooks/useCombatSound';
```

**Step 2: Add hook call inside the BattleView component, near other hooks**

```typescript
  const sound = useCombatSound();
```

**Step 3: Add audio init on first user interaction**

Add a ref and handler inside the component:

```typescript
  const audioInitRef = useRef(false);

  const handleUserInteraction = useCallback(() => {
    if (!audioInitRef.current) {
      audioInitRef.current = true;
      sound.initAudio().then(() => {
        sound.playBGM(1);
      });
    }
  }, [sound]);
```

Add `onClick={handleUserInteraction}` to the outermost container div.

**Step 4: Add sound triggers in the turn processing useEffect**

Find the `useEffect` that processes new turns (from Spec 1 — the one that spawns damage numbers). Add sound calls at these points:

After spawning damage numbers:
```typescript
// Play hit sounds for each damage number
newNumbers.forEach((d) => {
  if (d.type === 'crit') {
    sound.playHit('critical', playerFighter?.type ?? 'NEUTRAL');
  } else if (d.type === 'super-effective') {
    sound.playHit('super_effective', playerFighter?.type ?? 'NEUTRAL');
  } else {
    sound.playHit('normal', playerFighter?.type ?? 'NEUTRAL');
  }
});
```

After processing status effects:
```typescript
latestTurn.events?.forEach((event: any) => {
  if (event.type === 'status_inflicted') {
    sound.playStatus(event.status ?? 'burn');
  }
  if (event.type === 'stat_change') {
    sound.playStatChange((event.stages ?? 0) > 0);
  }
  if (event.type === 'heal') {
    sound.playHeal();
  }
});
```

**Step 5: Add BGM intensity based on HP**

After the turn processing, add:

```typescript
// Adjust BGM intensity based on lowest HP ratio
const playerHpRatio = playerMaxHP > 0 ? playerHP / playerMaxHP : 1;
const opponentHpRatio = opponentMaxHP > 0 ? opponentHP / opponentMaxHP : 1;
const lowestHpRatio = Math.min(playerHpRatio, opponentHpRatio);

if (lowestHpRatio < 0.25) {
  sound.playBGM(3);
} else if (lowestHpRatio < 0.5) {
  sound.playBGM(2);
}
```

**Step 6: Add faint and victory/defeat sounds**

In the faint detection useEffect:
```typescript
if (playerHP <= 0) {
  sound.playFaint();
}
if (opponentHP <= 0) {
  sound.playFaint();
}
```

When battle completes (add a useEffect for battle end):
```typescript
useEffect(() => {
  if (!isComplete) return;
  sound.stopBGM(1);
  if (playerIsWinner) {
    sound.playVictory();
  } else if (battle?.winner) {
    sound.playDefeat();
  }
}, [isComplete, playerIsWinner, battle?.winner, sound]);
```

**Step 7: Verify**

```bash
npx tsc --noEmit
```

**Step 8: Commit**

```bash
git add src/components/combat/BattleView.tsx
git commit -m "feat(combat): integrate sound system into BattleView — attack/hit/miss/status/heal/faint/victory sounds + dynamic BGM"
```

---

### Task 6: Add mute toggle button to BattleView

**Files:**
- Modify: `src/components/combat/BattleView.tsx`

**Step 1: Import useGameMute at the top**

```typescript
import { useGameMute } from '@/contexts/GameMuteContext';
```

**Step 2: Add mute toggle to the battle header**

Find the battle header div and add a mute button:

```tsx
{/* Battle header */}
<div className="flex items-center justify-between text-sm text-muted">
  <span>Battle #{battle.id}</span>
  <div className="flex items-center gap-2">
    <span>Turn {battle.currentTurn}/{battle.maxTurns}</span>
    <button
      className="btn btn-ghost"
      onClick={toggleMute}
      aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
      title={isMuted ? 'Unmute sound' : 'Mute sound'}
      style={{ padding: '4px 8px', minWidth: 'auto' }}
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
  </div>
</div>
```

**Step 3: Add the hook call in the component**

```typescript
const { isMuted, toggleMute } = useGameMute();
```

**Step 4: Verify**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/components/combat/BattleView.tsx
git commit -m "feat(combat): add mute toggle button to battle header"
```

---

### Task 7: Final Verification

**Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 2: Run tests**

```bash
npx vitest run src/lib/combat/
```

**Step 3: Verify file inventory**

**New files:**
- `public/sounds/combat/` — 18 WAV files (15 SFX + 3 BGM)
- `src/lib/combat/sound-manager.ts` — CombatSoundManager class
- `src/hooks/useCombatSound.ts` — React hook wrapper
- `src/contexts/GameMuteContext.tsx` — Mute state context (if it didn't exist)

**Modified files:**
- `src/components/combat/BattleView.tsx` — Sound integration + mute button
- `src/App.tsx` — GameMuteProvider wrapper (if context was new)

**Step 4: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix(combat): final verification pass for combat sound system"
```

---

## Summary

### Architecture
```
GameMuteContext (new or existing)
  └─▶ useCombatSound (hook)
        └─▶ CombatSoundManager (singleton)
              ├─▶ AudioContext
              │     ├─▶ masterGain (mute control)
              │     │     ├─▶ sfxGain (0.7)
              │     │     │     └─▶ WAV buffers / synth oscillators
              │     │     └─▶ bgmGain (0.3)
              │     │           └─▶ BGM source (looped, crossfaded)
              │     └─▶ destination (speakers)
              ├─▶ WAV Loader (fetch + decodeAudioData)
              └─▶ Synth Fallback (18 type profiles)
```

### Sound Routing
```
Move animation pattern ──▶ PATTERN_SOUND_MAP ──▶ WAV file ──▶ sfxGain
                                                     │
                                                     ▼ (fallback)
                                           TYPE_SYNTH_PROFILES ──▶ sfxGain

Hit outcome ──▶ HIT_SOUND_MAP ──▶ strike/hit/burst.wav ──▶ sfxGain

HP thresholds ──▶ BGM level 1/2/3 ──▶ crossfade ──▶ bgmGain
```
