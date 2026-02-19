# Combat VFX & Audio System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port ClawCombat's battle visual effects (canvas particles, damage numbers, screen shake, status icons, HP ghost bar) and audio system (WAV SFX + synth + BGM crossfade) into wojak-ink's React/TypeScript combat components.

**Architecture:** Five independent modules: (1) Audio manager as a singleton class with Web Audio API, (2) Canvas particle renderer as a React component overlay, (3) Battle animation CSS in theme.css, (4) BattleView rewrite consuming animated turn playback, (5) Type color map as a shared constant. The particle system runs on a `<canvas>` overlaying the battle arena. Audio uses fetch-cached WAV samples with synth fallbacks. All CSS goes in `src/styles/theme.css` per project rules.

**Tech Stack:** React 18, TypeScript, Web Audio API, Canvas 2D, Tailwind (layout only), theme.css (all visuals)

**Source Reference:** ClawCombat files at `/Users/abit_hex/ClawCombat/apps/backend/src/public/`:
- `js/battle-audio.js` (752 lines) — audio manager
- `js/battle-particles.js` (2039 lines) — canvas particle system
- `js/battle-ui.js` (536 lines) — UI effects helpers
- `css/arena.css` (1853 lines) — battle CSS
- `js/type-colors.js` (88 lines) — type color map

---

## Dependency Order

```
Task 1 (type colors) — independent, used by everything
Task 2 (audio manager) — independent
Task 3 (battle animations CSS) — independent
Task 4 (canvas particle system) — depends on Task 1
Task 5 (battle playback engine) — depends on Tasks 1, 2, 3, 4
Task 6 (BattleView rewrite) — depends on Task 5
Task 7 (integration + smoke test) — depends on all
```

Tasks 1, 2, 3 can be parallelized. Task 4 can start after Task 1.

---

### Task 1: Type Color Map

Create a shared type-color constant map used by particles, audio profiles, and UI components.

**Files:**
- Create: `src/lib/combat/data/type-colors.ts`
- Test: `src/lib/combat/data/type-colors.test.ts`

**Step 1: Write the test**

```typescript
// src/lib/combat/data/type-colors.test.ts
import { describe, it, expect } from 'vitest';
import { TYPE_COLORS, getTypeColor, DARK_TEXT_TYPES } from './type-colors';
import { COMBAT_TYPES } from '../types';

describe('TYPE_COLORS', () => {
  it('has a color for every combat type', () => {
    for (const type of COMBAT_TYPES) {
      expect(TYPE_COLORS[type]).toBeDefined();
      expect(TYPE_COLORS[type]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('getTypeColor returns color for valid type', () => {
    expect(getTypeColor('FIRE')).toBe('#F08030');
  });

  it('getTypeColor returns fallback for unknown type', () => {
    expect(getTypeColor('INVALID' as any)).toBe('#666666');
  });

  it('getTypeColor is case-insensitive', () => {
    expect(getTypeColor('fire' as any)).toBe('#F08030');
  });

  it('DARK_TEXT_TYPES contains light-background types', () => {
    expect(DARK_TEXT_TYPES).toContain('NEUTRAL');
    expect(DARK_TEXT_TYPES).toContain('ELECTRIC');
    expect(DARK_TEXT_TYPES).not.toContain('FIRE');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/data/type-colors.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// src/lib/combat/data/type-colors.ts
// Type color map — ported from ClawCombat type-colors.js
// Canonical hex colors for 18 combat types

import type { CombatType } from '../types';

export const TYPE_COLORS: Record<CombatType, string> = {
  NEUTRAL:  '#A8A878',
  FIRE:     '#F08030',
  WATER:    '#6890F0',
  ELECTRIC: '#F8D030',
  GRASS:    '#78C850',
  ICE:      '#98D8D8',
  MARTIAL:  '#C03028',
  VENOM:    '#A040A0',
  EARTH:    '#E0C068',
  AIR:      '#A890F0',
  PSYCHE:   '#F85888',
  INSECT:   '#A8B820',
  STONE:    '#B8A038',
  GHOST:    '#705898',
  DRAGON:   '#7038F8',
  SHADOW:   '#705848',
  METAL:    '#B8B8D0',
  MYSTIC:   '#EE99AC',
};

/** Types whose badge backgrounds are light enough to need dark text */
export const DARK_TEXT_TYPES: CombatType[] = [
  'NEUTRAL', 'ELECTRIC', 'ICE', 'EARTH', 'INSECT', 'STONE', 'METAL', 'MYSTIC',
];

/** Safe color lookup, case-insensitive, falls back to #666666 */
export function getTypeColor(typeName: string): string {
  const key = typeName.toUpperCase() as CombatType;
  return TYPE_COLORS[key] ?? '#666666';
}

/** Flash overlay colors for screen effects (brighter versions) */
export const TYPE_FLASH_COLORS: Record<CombatType, string> = {
  NEUTRAL:  '#D4D4A0',
  FIRE:     '#FF9040',
  WATER:    '#88B0FF',
  ELECTRIC: '#FFEE60',
  GRASS:    '#A0E870',
  ICE:      '#C0F0F0',
  MARTIAL:  '#E04038',
  VENOM:    '#C060C0',
  EARTH:    '#F0D888',
  AIR:      '#C8B0FF',
  PSYCHE:   '#FF78A8',
  INSECT:   '#C8D830',
  STONE:    '#D8C058',
  GHOST:    '#9078B8',
  DRAGON:   '#9058FF',
  SHADOW:   '#907868',
  METAL:    '#D8D8F0',
  MYSTIC:   '#FFB9CC',
};
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/combat/data/type-colors.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/data/type-colors.ts src/lib/combat/data/type-colors.test.ts
git commit -m "feat: add type color map for combat VFX system"
```

---

### Task 2: Audio Manager

Port ClawCombat's battle-audio.js to a TypeScript singleton class. Copy the 15 SFX WAV files (skip 38MB of BGM WAVs for now — synth BGM later if needed).

**Files:**
- Copy: 15 WAV files from ClawCombat → `public/assets/sounds/combat/`
- Create: `src/lib/combat/audio.ts`
- Test: `src/lib/combat/audio.test.ts`

**Step 1: Copy WAV sound files**

```bash
mkdir -p public/assets/sounds/combat
cp /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/strike.wav \
   /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/hit.wav \
   /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/burst.wav \
   /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/beam.wav \
   /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/charge.wav \
   /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/projectile.wav \
   /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/electric.wav \
   /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/slash.wav \
   /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/wave.wav \
   /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/spin.wav \
   /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/drain.wav \
   /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/shield.wav \
   /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/boost.wav \
   /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/status.wav \
   /Users/abit_hex/ClawCombat/apps/backend/src/public/sounds/heal.wav \
   public/assets/sounds/combat/
```

**Step 2: Write the test**

```typescript
// src/lib/combat/audio.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BattleAudio } from './audio';

// Mock Web Audio API
const mockGainNode = { gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
const mockOscillator = { type: 'sine', frequency: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  createGain: vi.fn(() => ({ ...mockGainNode })),
  createOscillator: vi.fn(() => ({ ...mockOscillator })),
  createBiquadFilter: vi.fn(() => ({ type: 'lowpass', frequency: { value: 0 }, connect: vi.fn() })),
  createBufferSource: vi.fn(() => ({ buffer: null, playbackRate: { value: 1 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() })),
  decodeAudioData: vi.fn(async () => ({})),
  destination: {},
  resume: vi.fn(),
};

vi.stubGlobal('AudioContext', vi.fn(() => mockAudioContext));
vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));

describe('BattleAudio', () => {
  let audio: BattleAudio;

  beforeEach(() => {
    audio = new BattleAudio();
  });

  it('initializes with default settings', () => {
    expect(audio.sfxVolume).toBeGreaterThan(0);
    expect(audio.sfxVolume).toBeLessThanOrEqual(0.7);
    expect(audio.isMuted).toBe(false);
  });

  it('can set SFX volume', () => {
    audio.setSfxVolume(0.5);
    expect(audio.sfxVolume).toBe(0.5);
  });

  it('clamps volume to max 0.7', () => {
    audio.setSfxVolume(1.0);
    expect(audio.sfxVolume).toBe(0.7);
  });

  it('mute toggles', () => {
    audio.toggleMute();
    expect(audio.isMuted).toBe(true);
    audio.toggleMute();
    expect(audio.isMuted).toBe(false);
  });

  it('has type-specific audio profiles', () => {
    const profile = audio.getTypeProfile('FIRE');
    expect(profile).toBeDefined();
    expect(profile.wave).toBe('sawtooth');
    expect(profile.freq).toBe(250);
  });

  it('returns neutral profile for unknown type', () => {
    const profile = audio.getTypeProfile('INVALID' as any);
    expect(profile).toBeDefined();
    expect(profile.wave).toBe('square');
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/audio.test.ts`
Expected: FAIL — module not found

**Step 4: Write the audio manager**

```typescript
// src/lib/combat/audio.ts
// Battle audio manager — ported from ClawCombat battle-audio.js
// Web Audio API with WAV samples + synth fallback

type OscWave = OscillatorType; // 'sine' | 'square' | 'sawtooth' | 'triangle'

interface TypeAudioProfile {
  wave: OscWave;
  freq: number;
  filter: BiquadFilterType | null;
  filterFreq: number;
  modRate: number;
}

const TYPE_PROFILES: Record<string, TypeAudioProfile> = {
  FIRE:     { wave: 'sawtooth',  freq: 250, filter: 'lowpass',  filterFreq: 600,  modRate: 8 },
  WATER:    { wave: 'sine',      freq: 350, filter: 'lowpass',  filterFreq: 1200, modRate: 5 },
  ELECTRIC: { wave: 'square',    freq: 600, filter: 'highpass', filterFreq: 1500, modRate: 40 },
  GRASS:    { wave: 'triangle',  freq: 300, filter: 'bandpass', filterFreq: 800,  modRate: 3 },
  ICE:      { wave: 'sine',      freq: 500, filter: 'highpass', filterFreq: 2000, modRate: 12 },
  SHADOW:   { wave: 'sawtooth',  freq: 150, filter: 'lowpass',  filterFreq: 400,  modRate: 6 },
  METAL:    { wave: 'square',    freq: 400, filter: 'bandpass', filterFreq: 1800, modRate: 0 },
  PSYCHE:   { wave: 'sine',      freq: 700, filter: 'bandpass', filterFreq: 1400, modRate: 8 },
  DRAGON:   { wave: 'sawtooth',  freq: 200, filter: 'lowpass',  filterFreq: 500,  modRate: 10 },
  MYSTIC:   { wave: 'sine',      freq: 800, filter: 'highpass', filterFreq: 1600, modRate: 6 },
  NEUTRAL:  { wave: 'square',    freq: 200, filter: null,       filterFreq: 0,    modRate: 0 },
};

// Provide profiles for types that alias to the above (same audio treatment)
TYPE_PROFILES.MARTIAL = TYPE_PROFILES.FIRE;    // aggressive, close-range
TYPE_PROFILES.VENOM   = TYPE_PROFILES.SHADOW;  // dark, low
TYPE_PROFILES.EARTH   = TYPE_PROFILES.NEUTRAL; // grounded, basic
TYPE_PROFILES.AIR     = TYPE_PROFILES.ICE;     // light, airy
TYPE_PROFILES.INSECT  = TYPE_PROFILES.GRASS;   // natural
TYPE_PROFILES.STONE   = TYPE_PROFILES.METAL;   // hard, metallic
TYPE_PROFILES.GHOST   = TYPE_PROFILES.SHADOW;  // spectral

const WAV_PATHS: Record<string, string> = {
  strike:     '/assets/sounds/combat/strike.wav',
  hit:        '/assets/sounds/combat/hit.wav',
  burst:      '/assets/sounds/combat/burst.wav',
  beam:       '/assets/sounds/combat/beam.wav',
  charge:     '/assets/sounds/combat/charge.wav',
  projectile: '/assets/sounds/combat/projectile.wav',
  electric:   '/assets/sounds/combat/electric.wav',
  slash:      '/assets/sounds/combat/slash.wav',
  wave:       '/assets/sounds/combat/wave.wav',
  spin:       '/assets/sounds/combat/spin.wav',
  drain:      '/assets/sounds/combat/drain.wav',
  shield:     '/assets/sounds/combat/shield.wav',
  boost:      '/assets/sounds/combat/boost.wav',
  status:     '/assets/sounds/combat/status.wav',
  heal:       '/assets/sounds/combat/heal.wav',
};

const MAX_SFX_VOLUME = 0.7;

export class BattleAudio {
  private ctx: AudioContext | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private preloaded = false;

  sfxVolume = 0.35;
  isMuted = false;
  shakeEnabled = true;

  /** Lazy-init AudioContext (must be called after user gesture) */
  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /** Preload all WAV samples into buffer cache */
  async preload(): Promise<void> {
    if (this.preloaded) return;
    const ctx = this.getCtx();
    const entries = Object.entries(WAV_PATHS);
    await Promise.allSettled(
      entries.map(async ([key, path]) => {
        try {
          const res = await fetch(path);
          if (!res.ok) return;
          const buf = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(buf);
          this.bufferCache.set(key, decoded);
        } catch { /* Synth fallback if WAV fails */ }
      })
    );
    this.preloaded = true;
  }

  // ── Settings ──

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(MAX_SFX_VOLUME, v));
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
  }

  getTypeProfile(type: string): TypeAudioProfile {
    return TYPE_PROFILES[type.toUpperCase()] ?? TYPE_PROFILES.NEUTRAL;
  }

  // ── WAV playback ──

  private playWav(key: string, rate = 1.0, volume?: number): void {
    if (this.isMuted) return;
    const ctx = this.getCtx();
    const buf = this.bufferCache.get(key);
    if (!buf) { this.synthFallback(440, 0.1); return; }

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = volume ?? this.sfxVolume;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
  }

  /** Synth fallback — simple tone burst */
  private synthFallback(freq: number, duration: number, wave: OscWave = 'sine'): void {
    if (this.isMuted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = this.sfxVolume * 0.5;
    gain.gain.setValueAtTime(this.sfxVolume * 0.5, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  /** Type-specific synth sound using type profiles */
  private synthTyped(type: string, duration = 0.15): void {
    if (this.isMuted) return;
    const profile = this.getTypeProfile(type);
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    osc.type = profile.wave;
    osc.frequency.value = profile.freq;

    let node: AudioNode = osc;
    if (profile.filter) {
      const filter = ctx.createBiquadFilter();
      filter.type = profile.filter;
      filter.frequency.value = profile.filterFreq;
      osc.connect(filter);
      node = filter;
    }

    const gain = ctx.createGain();
    gain.gain.value = this.sfxVolume * 0.6;
    gain.gain.setValueAtTime(this.sfxVolume * 0.6, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    node.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // ── Sound Effects API (mirrors ClawCombat battle-audio.js) ──

  hit(moveType?: string): void {
    if (moveType) {
      const profile = this.getTypeProfile(moveType);
      const pitchShift = 0.8 + (profile.freq / 1000) * 0.4;
      this.playWav('strike', pitchShift);
    } else {
      this.playWav('strike');
    }
  }

  hitCrit(moveType?: string): void {
    this.playWav('hit', 1.0);
    if (moveType) this.synthTyped(moveType, 0.2);
  }

  hitSuper(moveType?: string): void {
    this.playWav('burst', 1.0);
    if (moveType) this.synthTyped(moveType, 0.25);
  }

  miss(): void {
    this.playWav('spin', 1.2);
  }

  faint(): void {
    this.playWav('drain', 1.6);
  }

  victory(): void {
    // C major fanfare (synth): C5 → E5 → G5 → C6
    const ctx = this.getCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const noteLen = 0.175;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * noteLen;
      gain.gain.setValueAtTime(this.sfxVolume * 0.4, start);
      gain.gain.linearRampToValueAtTime(0, start + noteLen * 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + noteLen * 2);
    });
  }

  defeat(): void {
    this.playWav('drain', 0.6);
  }

  statusInflict(): void {
    this.playWav('status', 1.0);
  }

  heal(): void {
    this.playWav('heal', 1.0);
  }

  moveSelect(): void {
    this.playWav('projectile', 1.5, this.sfxVolume * 0.3);
  }

  turnStart(): void {
    this.playWav('beam', 1.3, this.sfxVolume * 0.4);
  }

  statBoost(): void {
    this.playWav('shield', 1.0);
  }

  statDrop(): void {
    this.playWav('slash', 0.7);
  }

  matchFound(): void {
    this.playWav('charge', 1.0);
  }

  timerTick(): void {
    this.synthFallback(1000, 0.04);
  }
}

/** Singleton instance */
let _instance: BattleAudio | null = null;
export function getBattleAudio(): BattleAudio {
  if (!_instance) _instance = new BattleAudio();
  return _instance;
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/combat/audio.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add public/assets/sounds/combat/ src/lib/combat/audio.ts src/lib/combat/audio.test.ts
git commit -m "feat: add battle audio manager with WAV samples and synth fallback"
```

---

### Task 3: Battle Animation CSS

Add all battle animation keyframes, damage number styles, screen shake, HP ghost bar, status icon animations, effectiveness callouts, and critical hit effects to `theme.css`.

**Files:**
- Modify: `src/styles/theme.css` (append combat animation section)

**Step 1: Add CSS at the end of theme.css**

Append the following section after the existing combat styles (which end around line 2437). This CSS is ported from ClawCombat's `arena.css` — adapted for wojak-ink's dark theme and CSS variable system.

```css
/* ── Combat Battle Animations ── */

/* HP Ghost Bar (damage flash trail) */
.hp-bar-ghost {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(90deg, #fca5a5, #ef4444, #dc2626);
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.4s;
  opacity: 0.7;
}

.hp-bar-container {
  position: relative;
  overflow: hidden;
}

/* HP warning flash */
.hp-warning {
  animation: hpWarningFlash 1s ease-in-out infinite;
}
@keyframes hpWarningFlash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* HP bar shimmer */
.hp-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  animation: hpShimmer 3s linear infinite;
}
@keyframes hpShimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

/* Screen shake */
.screen-shake {
  animation: screenShake 0.4s ease-out;
}
@keyframes screenShake {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-4px, -2px); }
  20% { transform: translate(4px, 2px); }
  30% { transform: translate(-3px, 3px); }
  40% { transform: translate(3px, -3px); }
  50% { transform: translate(-2px, 2px); }
  60% { transform: translate(2px, -1px); }
  70% { transform: translate(-1px, 1px); }
}

.screen-shake-heavy {
  animation: screenShakeHeavy 0.5s ease-out;
}
@keyframes screenShakeHeavy {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-8px, -4px); }
  20% { transform: translate(8px, 4px); }
  30% { transform: translate(-6px, 6px); }
  40% { transform: translate(6px, -6px); }
  50% { transform: translate(-4px, 3px); }
  60% { transform: translate(4px, -2px); }
  70% { transform: translate(-2px, 1px); }
}

/* Flash screen overlay */
.battle-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: var(--radius-lg);
  animation: flashFade 0.2s ease-out forwards;
  z-index: 20;
}
@keyframes flashFade {
  0% { opacity: 0.3; }
  100% { opacity: 0; }
}

/* Floating damage numbers */
.damage-number {
  position: absolute;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  z-index: 25;
  animation: floatUp 1.2s ease-out forwards;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}
@keyframes floatUp {
  0% { opacity: 1; transform: translateY(0) scale(0.8); }
  20% { opacity: 1; transform: translateY(-20px) scale(1.2); }
  100% { opacity: 0; transform: translateY(-80px) scale(0.6); }
}
.damage-normal { color: #ff4444; font-size: 1.8rem; }
.damage-crit { color: #ffcc00; font-size: 2.4rem; }
.damage-heal { color: #4ade80; font-size: 1.8rem; }
.damage-super { color: #f97316; font-size: 2.2rem; }
.damage-resist { color: #94a3b8; font-size: 1.4rem; }
.damage-immune { color: #9ca3af; font-size: 1.6rem; }

/* Critical hit text popup */
.crit-text {
  position: absolute;
  font-size: 1.4rem;
  font-weight: 900;
  color: #fbbf24;
  text-shadow: 0 0 15px rgba(251, 191, 36, 0.6), 0 0 30px rgba(251, 191, 36, 0.3);
  pointer-events: none;
  z-index: 26;
  animation: critPop 0.8s ease-out forwards;
}
@keyframes critPop {
  0% { opacity: 1; transform: scale(0.5); }
  30% { opacity: 1; transform: scale(1.3); }
  100% { opacity: 0; transform: scale(1.0); }
}

/* Critical hit zoom on attacker */
.crit-zoom {
  animation: critZoomPulse 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes critZoomPulse {
  0% { transform: scale(1); filter: brightness(1); }
  30% { transform: scale(1.15); filter: brightness(1.4) drop-shadow(0 0 8px #fbbf24); }
  60% { transform: scale(1.08); filter: brightness(1.2); }
  100% { transform: scale(1); filter: brightness(1); }
}

/* Effectiveness callouts */
.effectiveness-callout {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: 900;
  text-transform: uppercase;
  pointer-events: none;
  z-index: 30;
  white-space: nowrap;
}
.effectiveness-super {
  color: #f97316;
  font-size: 1.6rem;
  text-shadow: 0 0 15px rgba(249, 115, 22, 0.5), 0 0 30px rgba(249, 115, 22, 0.25);
  animation: superEffectivePop 0.8s ease-out forwards;
}
@keyframes superEffectivePop {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(0.3); }
  40% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
}
.effectiveness-resist {
  color: #94a3b8;
  font-size: 1.1rem;
  animation: resistFade 0.6s ease-out forwards;
}
@keyframes resistFade {
  0% { opacity: 0.8; transform: translate(-50%, -50%) scale(0.9); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
}
.effectiveness-immune {
  color: #9ca3af;
  font-size: 1.4rem;
  animation: immuneBounce 0.5s ease-out forwards;
}
@keyframes immuneBounce {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
  50% { transform: translate(-50%, -50%) scale(1.15); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
}

/* Status effect icon animations */
.status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  font-size: 16px;
  backdrop-filter: blur(4px);
}
.status-burn {
  background: rgba(249, 115, 22, 0.25);
  animation: burnFlicker 0.3s ease-in-out infinite alternate;
}
@keyframes burnFlicker {
  0% { transform: scale(1); filter: brightness(1); }
  100% { transform: scale(1.1); filter: brightness(1.3); }
}
.status-poison {
  background: rgba(168, 85, 247, 0.25);
  animation: poisonBubble 1.5s ease-in-out infinite;
}
@keyframes poisonBubble {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
.status-paralysis {
  background: rgba(234, 179, 8, 0.25);
  animation: paralyzeJitter 0.1s linear infinite;
}
@keyframes paralyzeJitter {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-1px, 0); }
  75% { transform: translate(1px, 0); }
}
.status-freeze {
  background: rgba(34, 211, 238, 0.25);
  animation: freezeShiver 0.15s ease-in-out infinite;
}
@keyframes freezeShiver {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-2deg); }
  75% { transform: rotate(2deg); }
}
.status-sleep {
  background: rgba(100, 116, 139, 0.25);
  animation: sleepFloat 2s ease-in-out infinite;
}
@keyframes sleepFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
.status-confusion {
  background: rgba(244, 114, 182, 0.25);
  animation: confusionSpin 2s linear infinite;
}
@keyframes confusionSpin {
  0% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
  100% { transform: rotate(-5deg); }
}

/* Battle intro slide-in */
.battle-slide-left {
  animation: slideInLeft 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes slideInLeft {
  0% { opacity: 0; transform: translateX(-120px); }
  100% { opacity: 1; transform: translateX(0); }
}
.battle-slide-right {
  animation: slideInRight 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes slideInRight {
  0% { opacity: 0; transform: translateX(120px); }
  100% { opacity: 1; transform: translateX(0); }
}

/* Fighter faint animation */
.fighter-faint {
  animation: faintAnim 1s ease-out forwards;
}
@keyframes faintAnim {
  0% { opacity: 1; transform: rotate(0) translateY(0); }
  60% { opacity: 0.5; transform: rotate(15deg) translateY(30px); }
  100% { opacity: 0.2; transform: rotate(15deg) translateY(40px); filter: grayscale(0.8); }
}

/* Winner glow */
.fighter-winner {
  animation: winnerGlow 1.5s ease-in-out infinite alternate;
}
@keyframes winnerGlow {
  0% { filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.3)); }
  100% { filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.6)); }
}

/* Loser fade */
.fighter-loser {
  filter: grayscale(0.8) brightness(0.6);
  transition: filter 0.8s ease-out;
}

/* Attacker movement — charge / strike */
.fighter-charge-right {
  animation: chargeRight 0.4s ease-in-out;
}
@keyframes chargeRight {
  0% { transform: translateX(0); }
  40% { transform: translateX(60px) scale(1.05); }
  100% { transform: translateX(0); }
}
.fighter-charge-left {
  animation: chargeLeft 0.4s ease-in-out;
}
@keyframes chargeLeft {
  0% { transform: translateX(0); }
  40% { transform: translateX(-60px) scale(1.05); }
  100% { transform: translateX(0); }
}
.fighter-strike-right {
  animation: strikeRight 0.35s ease-in-out;
}
@keyframes strikeRight {
  0% { transform: translateX(0); }
  30% { transform: translateX(40px); }
  100% { transform: translateX(0); }
}
.fighter-strike-left {
  animation: strikeLeft 0.35s ease-in-out;
}
@keyframes strikeLeft {
  0% { transform: translateX(0); }
  30% { transform: translateX(-40px); }
  100% { transform: translateX(0); }
}

/* Hit reaction */
.fighter-hit {
  animation: hitShake 0.2s ease-out;
}
@keyframes hitShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-5px); }
  40% { transform: translateX(5px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

/* "X used Y!" action info box */
.action-info {
  position: absolute;
  bottom: 12px;
  padding: 6px 14px;
  border-radius: var(--radius-md);
  background: rgba(10, 10, 15, 0.85);
  border: 1px solid var(--color-border);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 15;
  pointer-events: none;
}
.action-info.visible { opacity: 1; }
.action-info.player-action { right: 12px; }
.action-info.opponent-action { left: 12px; }

/* Battle arena wrapper */
.battle-arena {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: radial-gradient(ellipse at 25% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse at 75% 20%, rgba(239, 68, 68, 0.08) 0%, transparent 50%),
              linear-gradient(180deg, rgba(12, 12, 25, 1) 0%, rgba(18, 18, 26, 1) 100%);
  border: 1px solid var(--color-border);
}

/* Scanlines overlay */
.battle-scanlines::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(255, 255, 255, 0.02) 2px,
    rgba(255, 255, 255, 0.02) 4px
  );
  pointer-events: none;
  z-index: 5;
}

/* Canvas particle overlay */
.battle-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

/* Reduced motion — disable all battle animations */
@media (prefers-reduced-motion: reduce) {
  .screen-shake,
  .screen-shake-heavy,
  .battle-flash,
  .damage-number,
  .crit-text,
  .crit-zoom,
  .effectiveness-callout,
  .effectiveness-super,
  .effectiveness-resist,
  .effectiveness-immune,
  .status-burn,
  .status-poison,
  .status-paralysis,
  .status-freeze,
  .status-sleep,
  .status-confusion,
  .battle-slide-left,
  .battle-slide-right,
  .fighter-faint,
  .fighter-winner,
  .fighter-charge-right,
  .fighter-charge-left,
  .fighter-strike-right,
  .fighter-strike-left,
  .fighter-hit,
  .hp-bar-fill::after {
    animation: none;
    transition: none;
  }
}
```

**Step 2: Verify no duplicate class names**

Run: `grep -c 'screen-shake\|damage-number\|crit-text\|battle-arena\|battle-flash' src/styles/theme.css`
Expected: Each class appears exactly once (only in the section you just added)

**Step 3: Verify build**

Run: `npm run build`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/styles/theme.css
git commit -m "feat: add battle animation CSS — damage numbers, screen shake, status icons, effects"
```

---

### Task 4: Canvas Particle System

Create a React canvas component that renders attack particles. Port the 10 attack patterns and 18 type configs from ClawCombat's `battle-particles.js`.

**Files:**
- Create: `src/lib/combat/particles.ts` (pure logic: particle class, patterns, type configs)
- Create: `src/components/combat/BattleCanvas.tsx` (React canvas component)
- Test: `src/lib/combat/particles.test.ts`

**Step 1: Write the test**

```typescript
// src/lib/combat/particles.test.ts
import { describe, it, expect } from 'vitest';
import { Particle, spawnAttack, TYPE_EFFECTS, ANIM_TIMING, powerScale } from './particles';

describe('Particle', () => {
  it('creates a particle with position and life', () => {
    const p = new Particle(100, 200, { color: '#FF0000', size: 5, life: 1.0, speed: 2, angle: 0 });
    expect(p.x).toBe(100);
    expect(p.y).toBe(200);
    expect(p.alive).toBe(true);
  });

  it('dies when life expires', () => {
    const p = new Particle(0, 0, { color: '#FF0000', size: 5, life: 0.01, speed: 0, angle: 0 });
    // Simulate many frames
    for (let i = 0; i < 100; i++) p.update(1 / 60);
    expect(p.alive).toBe(false);
  });
});

describe('TYPE_EFFECTS', () => {
  it('has configs for all 18 types', () => {
    const types = ['NEUTRAL', 'FIRE', 'WATER', 'ELECTRIC', 'GRASS', 'ICE', 'MARTIAL', 'VENOM', 'EARTH', 'AIR', 'PSYCHE', 'INSECT', 'STONE', 'GHOST', 'DRAGON', 'SHADOW', 'METAL', 'MYSTIC'];
    for (const t of types) {
      expect(TYPE_EFFECTS[t]).toBeDefined();
      expect(TYPE_EFFECTS[t].colors.length).toBeGreaterThan(0);
    }
  });
});

describe('ANIM_TIMING', () => {
  it('has phase delay and turn gap', () => {
    expect(ANIM_TIMING.phaseDelay).toBe(800);
    expect(ANIM_TIMING.turnGap).toBe(1500);
  });

  it('has travel times for all patterns', () => {
    expect(ANIM_TIMING.travelTime.beam).toBe(700);
    expect(ANIM_TIMING.travelTime.slash).toBe(350);
    expect(ANIM_TIMING.travelTime.charge).toBe(400);
  });
});

describe('powerScale', () => {
  it('returns larger values for higher power', () => {
    const low = powerScale(20);
    const high = powerScale(120);
    expect(high.particleCount).toBeGreaterThan(low.particleCount);
    expect(high.particleSize).toBeGreaterThan(low.particleSize);
  });

  it('shake only triggers at power >= 80', () => {
    expect(powerScale(50).shakeAmplitude).toBe(0);
    expect(powerScale(100).shakeAmplitude).toBeGreaterThan(0);
  });
});

describe('spawnAttack', () => {
  it('returns particles for a beam pattern', () => {
    const particles = spawnAttack({
      pattern: 'beam',
      moveType: 'FIRE',
      startX: 50, startY: 150,
      targetX: 350, targetY: 150,
      power: 90,
    });
    expect(particles.length).toBeGreaterThan(0);
  });

  it('returns particles for a slash pattern', () => {
    const particles = spawnAttack({
      pattern: 'slash',
      moveType: 'MARTIAL',
      startX: 50, startY: 150,
      targetX: 350, targetY: 150,
      power: 50,
    });
    expect(particles.length).toBeGreaterThan(0);
  });

  it('returns particles for all supported patterns', () => {
    const patterns = ['beam', 'projectile', 'arc', 'slash', 'charge', 'wave', 'swarm', 'drain', 'self_aura', 'burst'] as const;
    for (const pattern of patterns) {
      const particles = spawnAttack({
        pattern,
        moveType: 'FIRE',
        startX: 50, startY: 150,
        targetX: 350, targetY: 150,
        power: 80,
      });
      expect(particles.length).toBeGreaterThan(0, `Pattern "${pattern}" should produce particles`);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/particles.test.ts`
Expected: FAIL — module not found

**Step 3: Write the particle engine**

Create `src/lib/combat/particles.ts` — this is a large file (~600 lines). Port the core logic from ClawCombat's `battle-particles.js`:

```typescript
// src/lib/combat/particles.ts
// Canvas particle system — ported from ClawCombat battle-particles.js
// Pure logic: no DOM, no canvas context. Used by BattleCanvas.tsx for rendering.

import { getTypeColor, TYPE_FLASH_COLORS } from './data/type-colors';

// ── Animation Timing Constants (from ClawCombat battle-ui.js) ──

export const ANIM_TIMING = {
  phaseDelay: 800,
  turnGap: 1500,
  useMoveTelegraph: 600,
  travelTime: {
    beam: 700,
    slash: 350,
    arc: 900,
    charge: 400,
    wave: 800,
    projectile: 700,
    swarm: 900,
    drain: 800,
    status_drift: 700,
    self_aura: 700,
    burst: 500,
    default: 700,
  } as Record<string, number>,
  critFreeze: 200,
  damageDisplay: 600,
  hitRecover: 500,
  postDamage: 400,
  statusInflict: 800,
  healEffect: 800,
  missEffect: 700,
  statChange: 600,
  knockoutPause: 800,
  victoryDelay: 1000,
};

// ── Type Effect Configs ──

interface TypeEffectConfig {
  colors: string[];
  flashColor: string;
  shapes: ParticleShape[];
  gravity: number;
}

export type ParticleShape = 'circle' | 'star' | 'square' | 'line' | 'leaf' | 'snowflake' | 'bolt' | 'ring' | 'bubble' | 'text';

export const TYPE_EFFECTS: Record<string, TypeEffectConfig> = {
  NEUTRAL:  { colors: ['#D4D4A0', '#C8C878', '#B8B868'], flashColor: '#D4D4A0', shapes: ['circle', 'star'], gravity: 0 },
  FIRE:     { colors: ['#FF6030', '#FF9040', '#FFD060', '#FF4020'], flashColor: '#FF9040', shapes: ['circle', 'star'], gravity: -0.3 },
  WATER:    { colors: ['#4080F0', '#60A0FF', '#88C0FF', '#A0D4FF'], flashColor: '#88B0FF', shapes: ['circle', 'bubble'], gravity: 0.2 },
  ELECTRIC: { colors: ['#FFE030', '#FFF060', '#FFFF90', '#E0C020'], flashColor: '#FFEE60', shapes: ['bolt', 'star'], gravity: 0 },
  GRASS:    { colors: ['#40B030', '#60D040', '#80E060', '#A0F080'], flashColor: '#A0E870', shapes: ['leaf', 'circle'], gravity: 0.1 },
  ICE:      { colors: ['#80E0F0', '#A0F0FF', '#C0FFFF', '#60C0E0'], flashColor: '#C0F0F0', shapes: ['snowflake', 'circle'], gravity: 0.15 },
  MARTIAL:  { colors: ['#E04038', '#FF5040', '#FF7060', '#C03028'], flashColor: '#FF5040', shapes: ['star', 'circle'], gravity: 0 },
  VENOM:    { colors: ['#C060C0', '#D080D0', '#E0A0E0', '#A040A0'], flashColor: '#C060C0', shapes: ['bubble', 'circle'], gravity: 0.1 },
  EARTH:    { colors: ['#D0A040', '#E0C060', '#B08030', '#C09030'], flashColor: '#F0D888', shapes: ['square', 'circle'], gravity: 0.4 },
  AIR:      { colors: ['#C8B0FF', '#D8C8FF', '#E8E0FF', '#A890F0'], flashColor: '#C8B0FF', shapes: ['ring', 'circle'], gravity: -0.2 },
  PSYCHE:   { colors: ['#FF78A8', '#FF90B8', '#FFA8C8', '#E060A0'], flashColor: '#FF78A8', shapes: ['ring', 'star'], gravity: -0.1 },
  INSECT:   { colors: ['#B8C830', '#D0E040', '#C8D020', '#A0B020'], flashColor: '#C8D830', shapes: ['circle', 'star'], gravity: 0 },
  STONE:    { colors: ['#C8A840', '#B89838', '#A08830', '#D8B850'], flashColor: '#D8C058', shapes: ['square', 'circle'], gravity: 0.5 },
  GHOST:    { colors: ['#8068A8', '#9078B8', '#A090C8', '#706098'], flashColor: '#9078B8', shapes: ['ring', 'circle'], gravity: -0.15 },
  DRAGON:   { colors: ['#8050F0', '#9068FF', '#7040E0', '#A080FF'], flashColor: '#9058FF', shapes: ['star', 'circle'], gravity: 0 },
  SHADOW:   { colors: ['#806858', '#907868', '#685040', '#A08878'], flashColor: '#907868', shapes: ['circle', 'star'], gravity: 0 },
  METAL:    { colors: ['#C0C0E0', '#D0D0F0', '#B0B0D0', '#E0E0FF'], flashColor: '#D8D8F0', shapes: ['square', 'star'], gravity: 0.3 },
  MYSTIC:   { colors: ['#FFB0CC', '#FFC0D8', '#FF90BC', '#FFD0E0'], flashColor: '#FFB9CC', shapes: ['ring', 'star'], gravity: -0.1 },
};

// ── Power Scaling (from ClawCombat) ──

export interface PowerScaleResult {
  particleCount: number;
  particleSize: number;
  shakeAmplitude: number;
  shakeDuration: number;
  travelSpeed: number;
  flashOpacity: number;
}

export function powerScale(power: number): PowerScaleResult {
  const p = Math.max(0, Math.min(200, power));
  return {
    particleCount: Math.round(25 + (p / 120) * 100),
    particleSize: 0.8 + (p / 120) * 1.0,
    shakeAmplitude: p >= 80 ? 2 + (p - 80) / 10 : 0,
    shakeDuration: p >= 80 ? 100 + (p - 80) * 3 : 0,
    travelSpeed: 6 + (p / 120) * 4,
    flashOpacity: p >= 100 ? 0.15 + (p - 100) / 200 : 0,
  };
}

// ── Particle Class ──

interface ParticleConfig {
  color: string;
  size: number;
  life: number;
  speed: number;
  angle: number;
  shape?: ParticleShape;
  gravity?: number;
  text?: string;
  targetX?: number;
  targetY?: number;
  travelSpeed?: number;
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  shape: ParticleShape;
  gravity: number;
  text: string;
  rotation: number;
  rotationSpeed: number;
  // Projectile travel
  targetX: number | null;
  targetY: number | null;
  travelSpeed: number;
  arrived: boolean;

  constructor(x: number, y: number, config: ParticleConfig) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(config.angle) * config.speed;
    this.vy = Math.sin(config.angle) * config.speed;
    this.color = config.color;
    this.size = config.size;
    this.life = config.life;
    this.maxLife = config.life;
    this.shape = config.shape ?? 'circle';
    this.gravity = config.gravity ?? 0;
    this.text = config.text ?? '';
    this.rotation = 0;
    this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    this.targetX = config.targetX ?? null;
    this.targetY = config.targetY ?? null;
    this.travelSpeed = config.travelSpeed ?? 6;
    this.arrived = false;
  }

  get alive(): boolean {
    return this.life > 0;
  }

  get alpha(): number {
    return Math.max(0, this.life / this.maxLife);
  }

  update(dt: number): void {
    // Projectile travel toward target
    if (this.targetX !== null && this.targetY !== null && !this.arrived) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.travelSpeed * 2) {
        this.arrived = true;
        this.x = this.targetX;
        this.y = this.targetY;
        // Burst on arrival
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
      } else {
        this.x += (dx / dist) * this.travelSpeed;
        this.y += (dy / dist) * this.travelSpeed;
      }
    } else {
      // Standard physics
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.vx *= 0.98;
      this.vy *= 0.98;
    }
    this.rotation += this.rotationSpeed;
    this.life -= dt;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    switch (this.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        break;

      case 'star': {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? this.size : this.size * 0.4;
          const method = i === 0 ? 'moveTo' : 'lineTo';
          ctx[method](Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'square':
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        break;

      case 'line':
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-this.size, 0);
        ctx.lineTo(this.size, 0);
        ctx.stroke();
        break;

      case 'leaf': {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'snowflake': {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * this.size, Math.sin(a) * this.size);
          ctx.stroke();
        }
        break;
      }

      case 'bolt': {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const s = this.size;
        ctx.moveTo(-s * 0.3, -s);
        ctx.lineTo(s * 0.1, -s * 0.2);
        ctx.lineTo(-s * 0.1, -s * 0.2);
        ctx.lineTo(s * 0.3, s);
        ctx.stroke();
        break;
      }

      case 'ring':
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'bubble':
        ctx.fillStyle = this.color;
        ctx.globalAlpha *= 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        // highlight
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha *= 0.5;
        ctx.beginPath();
        ctx.arc(-this.size * 0.3, -this.size * 0.3, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'text':
        ctx.font = `${Math.round(this.size * 2)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, 0, 0);
        break;
    }

    ctx.restore();
  }
}

// ── Attack Pattern Spawners ──

export type AttackPattern = 'beam' | 'projectile' | 'arc' | 'slash' | 'charge' | 'wave' | 'swarm' | 'drain' | 'self_aura' | 'status_drift' | 'burst';

interface SpawnConfig {
  pattern: AttackPattern;
  moveType: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  power: number;
  moveName?: string;
}

export function spawnAttack(config: SpawnConfig): Particle[] {
  const { pattern, moveType, startX, startY, targetX, targetY, power } = config;
  const typeConfig = TYPE_EFFECTS[moveType.toUpperCase()] ?? TYPE_EFFECTS.NEUTRAL;
  const scale = powerScale(power);
  const particles: Particle[] = [];

  const pickColor = () => typeConfig.colors[Math.floor(Math.random() * typeConfig.colors.length)];
  const pickShape = () => typeConfig.shapes[Math.floor(Math.random() * typeConfig.shapes.length)];
  const randRange = (min: number, max: number) => min + Math.random() * (max - min);

  switch (pattern) {
    case 'beam': {
      // Main beam: stretched particle along path
      const dx = targetX - startX;
      const dy = targetY - startY;
      const angle = Math.atan2(dy, dx);
      const count = Math.round(scale.particleCount * 0.5);
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const x = startX + dx * t + randRange(-10, 10);
        const y = startY + dy * t + randRange(-10, 10);
        particles.push(new Particle(x, y, {
          color: pickColor(),
          size: scale.particleSize * randRange(3, 6),
          life: 1.2,
          speed: randRange(0.5, 2),
          angle: angle + randRange(-0.3, 0.3),
          shape: pickShape(),
          gravity: typeConfig.gravity * 0.5,
        }));
      }
      break;
    }

    case 'projectile': {
      const count = Math.round(scale.particleCount * 0.8);
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(
          startX + randRange(-25, 25),
          startY + randRange(-25, 25),
          {
            color: pickColor(),
            size: scale.particleSize * randRange(2, 5),
            life: randRange(1.5, 2.0),
            speed: 0,
            angle: 0,
            shape: pickShape(),
            gravity: typeConfig.gravity * 0.3,
            targetX: targetX + randRange(-15, 15),
            targetY: targetY + randRange(-15, 15),
            travelSpeed: scale.travelSpeed + randRange(-1, 1),
          }
        ));
      }
      break;
    }

    case 'arc': {
      // Parabolic arc (simulate with angled upward velocity)
      const count = Math.round(scale.particleCount * 0.6);
      const dx = targetX - startX;
      const dy = targetY - startY;
      const baseAngle = Math.atan2(dy, dx);
      for (let i = 0; i < count; i++) {
        const spread = (i / count - 0.5) * 0.6;
        particles.push(new Particle(
          startX + randRange(-10, 10),
          startY + randRange(-10, 10),
          {
            color: pickColor(),
            size: scale.particleSize * randRange(3, 7),
            life: 1.5,
            speed: scale.travelSpeed * 1.2,
            angle: baseAngle - 0.5 + spread,
            shape: pickShape(),
            gravity: 0.15 + typeConfig.gravity * 0.3,
          }
        ));
      }
      break;
    }

    case 'slash': {
      const count = Math.max(8, Math.round(scale.particleCount * 0.3));
      const angle = Math.atan2(targetY - startY, targetX - startX);
      for (let i = 0; i < count; i++) {
        const slashAngle = angle + randRange(-0.8, 0.8);
        particles.push(new Particle(
          targetX + randRange(-20, 20),
          targetY + randRange(-20, 20),
          {
            color: pickColor(),
            size: scale.particleSize * randRange(4, 8),
            life: randRange(0.2, 0.5),
            speed: randRange(2, 5),
            angle: slashAngle,
            shape: 'line',
            gravity: 0,
          }
        ));
      }
      // Impact burst
      const burstCount = Math.round(count * 0.6);
      for (let i = 0; i < burstCount; i++) {
        particles.push(new Particle(targetX, targetY, {
          color: pickColor(),
          size: scale.particleSize * randRange(2, 4),
          life: 0.4,
          speed: randRange(3, 7),
          angle: Math.random() * Math.PI * 2,
          shape: pickShape(),
          gravity: typeConfig.gravity,
        }));
      }
      break;
    }

    case 'charge': {
      // Trail from start to target + impact burst
      const dx = targetX - startX;
      const dy = targetY - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const count = Math.round(scale.particleCount * 0.4);
      for (let i = 0; i < count; i++) {
        const t = i / count;
        particles.push(new Particle(
          startX + dx * t + randRange(-15, 15),
          startY + dy * t + randRange(-15, 15),
          {
            color: pickColor(),
            size: scale.particleSize * randRange(2, 5),
            life: 0.18 + t * 0.3,
            speed: randRange(0.5, 2),
            angle: Math.random() * Math.PI * 2,
            shape: pickShape(),
            gravity: typeConfig.gravity * 0.3,
          }
        ));
      }
      // Impact burst
      const burstCount = Math.round(scale.particleCount * 0.8);
      for (let i = 0; i < burstCount; i++) {
        particles.push(new Particle(targetX, targetY, {
          color: pickColor(),
          size: scale.particleSize * randRange(3, 6),
          life: 0.5,
          speed: randRange(3, 8),
          angle: Math.random() * Math.PI * 2,
          shape: pickShape(),
          gravity: typeConfig.gravity,
        }));
      }
      break;
    }

    case 'wave': {
      // Expanding wave pulses from start toward target
      const dx = targetX - startX;
      const dy = targetY - startY;
      const baseAngle = Math.atan2(dy, dx);
      const pulses = 5;
      const perPulse = Math.max(4, Math.round(scale.particleCount / pulses));
      for (let p = 0; p < pulses; p++) {
        for (let i = 0; i < perPulse; i++) {
          const spreadAngle = baseAngle + randRange(-0.6, 0.6);
          particles.push(new Particle(
            startX + randRange(-10, 10),
            startY + randRange(-10, 10),
            {
              color: pickColor(),
              size: scale.particleSize * randRange(3, 6),
              life: 1.0 + p * 0.1,
              speed: scale.travelSpeed * randRange(0.7, 1.3),
              angle: spreadAngle,
              shape: pickShape(),
              gravity: typeConfig.gravity * 0.2,
            }
          ));
        }
      }
      break;
    }

    case 'swarm': {
      // Staggered multi-hit from various angles
      const waves = 5;
      const perWave = Math.max(3, Math.round(scale.particleCount / waves));
      for (let w = 0; w < waves; w++) {
        for (let i = 0; i < perWave; i++) {
          const offX = randRange(-50, 50);
          const offY = randRange(-50, 50);
          particles.push(new Particle(
            startX + offX,
            startY + offY,
            {
              color: pickColor(),
              size: scale.particleSize * randRange(2, 5),
              life: 1.5 + w * 0.15,
              speed: 0,
              angle: 0,
              shape: pickShape(),
              gravity: typeConfig.gravity * 0.2,
              targetX: targetX + randRange(-20, 20),
              targetY: targetY + randRange(-20, 20),
              travelSpeed: scale.travelSpeed * randRange(0.6, 1.0),
            }
          ));
        }
      }
      break;
    }

    case 'drain': {
      // Phase 1: gather at target, Phase 2: drain back to start
      const count = Math.round(scale.particleCount * 0.5);
      // Gather particles around target
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(
          targetX + randRange(-60, 60),
          targetY + randRange(-60, 60),
          {
            color: pickColor(),
            size: scale.particleSize * randRange(2, 5),
            life: 2.0,
            speed: 0,
            angle: 0,
            shape: pickShape(),
            gravity: 0,
            targetX: targetX,
            targetY: targetY,
            travelSpeed: 3,
          }
        ));
      }
      // Drain particles from target to start (delayed start via higher life)
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(
          targetX + randRange(-15, 15),
          targetY + randRange(-15, 15),
          {
            color: pickColor(),
            size: scale.particleSize * randRange(3, 5),
            life: 2.5,
            speed: 0,
            angle: 0,
            shape: pickShape(),
            gravity: 0,
            targetX: startX + randRange(-10, 10),
            targetY: startY + randRange(-10, 10),
            travelSpeed: scale.travelSpeed * 0.8,
          }
        ));
      }
      break;
    }

    case 'self_aura': {
      // Buff particles around the caster
      const count = Math.round(scale.particleCount * 0.6);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radius = randRange(20, 50);
        particles.push(new Particle(
          startX + Math.cos(angle) * radius,
          startY + Math.sin(angle) * radius,
          {
            color: pickColor(),
            size: scale.particleSize * randRange(2, 5),
            life: 1.2,
            speed: randRange(0.5, 2),
            angle: angle + Math.PI / 2,
            shape: pickShape(),
            gravity: -0.2,
          }
        ));
      }
      // Central glow burst
      for (let i = 0; i < 10; i++) {
        particles.push(new Particle(startX, startY, {
          color: typeConfig.flashColor,
          size: scale.particleSize * randRange(4, 8),
          life: 0.8,
          speed: randRange(1, 3),
          angle: Math.random() * Math.PI * 2,
          shape: 'ring',
          gravity: -0.1,
        }));
      }
      break;
    }

    case 'status_drift': {
      // Floating particles drifting to target
      const count = Math.round(15 * scale.particleSize);
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(
          startX + randRange(-20, 20),
          startY + randRange(-20, 20),
          {
            color: pickColor(),
            size: scale.particleSize * randRange(3, 6),
            life: 1.5,
            speed: 0,
            angle: 0,
            shape: pickShape(),
            gravity: typeConfig.gravity * 0.3,
            targetX: targetX + randRange(-15, 15),
            targetY: targetY + randRange(-15, 15),
            travelSpeed: randRange(5, 7),
          }
        ));
      }
      break;
    }

    case 'burst':
    default: {
      // Simple radial burst at target
      const count = scale.particleCount;
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(targetX, targetY, {
          color: pickColor(),
          size: scale.particleSize * randRange(2, 5),
          life: randRange(0.4, 0.8),
          speed: randRange(2, 8),
          angle: Math.random() * Math.PI * 2,
          shape: pickShape(),
          gravity: typeConfig.gravity,
        }));
      }
      break;
    }
  }

  return particles;
}

// ── Move-to-Pattern Resolver ──

/** Determine which attack pattern to use based on move properties */
export function resolveAttackPattern(moveName: string, category: string, power: number, effects?: { type: string }[]): AttackPattern {
  const name = moveName.toLowerCase();

  // Status moves
  if (category === 'status') {
    if (effects?.some(e => e.type === 'heal')) return 'self_aura';
    if (effects?.some(e => e.type === 'stat_boost')) return 'self_aura';
    if (effects?.some(e => e.type === 'status')) return 'status_drift';
    return 'self_aura';
  }

  // Drain moves
  if (effects?.some(e => e.type === 'drain')) return 'drain';

  // Keyword matching (from ClawCombat MOVE_OVERRIDES)
  if (/charge|rush|tackle|slam/.test(name)) return 'charge';
  if (/slash|strike|punch|kick|chop|fist|claw|edge|blade/.test(name)) return 'slash';
  if (/beam|ray|cannon|blast|overload|freeze/.test(name)) return 'beam';
  if (/wave|pulse|plume|storm|spin|field/.test(name)) return 'wave';
  if (/throw|meteor|stone|hurl|toss|crash/.test(name)) return 'arc';
  if (/swarm|hive|volley|burst|avalanche/.test(name)) return 'swarm';
  if (/shot|ball|sphere|bomb/.test(name)) return 'projectile';
  if (/lullaby|wail|cry|song|screech/.test(name)) return 'wave';

  // Default by category
  if (category === 'physical') return power >= 80 ? 'charge' : 'slash';
  return power >= 80 ? 'beam' : 'projectile';
}
```

**Step 4: Write the React canvas component**

```tsx
// src/components/combat/BattleCanvas.tsx
// Canvas overlay for battle particle effects

import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Particle, spawnAttack, type AttackPattern } from '@/lib/combat/particles';

const MAX_PARTICLES = 500;

export interface BattleCanvasRef {
  playAttack: (config: {
    pattern: AttackPattern;
    moveType: string;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    power: number;
    moveName?: string;
  }) => void;
  clear: () => void;
}

export const BattleCanvas = forwardRef<BattleCanvasRef, { className?: string }>(
  ({ className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animFrameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    // Animation loop
    const animate = useCallback((timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dt = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 1 / 60;
      lastTimeRef.current = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(dt);
        if (!particles[i].alive) {
          particles.splice(i, 1);
        } else {
          particles[i].draw(ctx);
        }
      }

      if (particles.length > 0) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        animFrameRef.current = 0;
      }
    }, []);

    // Resize canvas to match container
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const resizeObserver = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
      });
      resizeObserver.observe(canvas.parentElement ?? canvas);
      return () => resizeObserver.disconnect();
    }, []);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }, []);

    // Expose API via ref
    useImperativeHandle(ref, () => ({
      playAttack(config) {
        const newParticles = spawnAttack(config);
        const all = particlesRef.current;
        all.push(...newParticles);
        // Memory cap
        while (all.length > MAX_PARTICLES) all.shift();
        // Start animation loop if not running
        if (!animFrameRef.current) {
          lastTimeRef.current = 0;
          animFrameRef.current = requestAnimationFrame(animate);
        }
      },
      clear() {
        particlesRef.current = [];
      },
    }), [animate]);

    return (
      <canvas
        ref={canvasRef}
        className={`battle-canvas ${className}`}
      />
    );
  }
);

BattleCanvas.displayName = 'BattleCanvas';
```

**Step 5: Run tests to verify**

Run: `npx vitest run src/lib/combat/particles.test.ts`
Expected: PASS

**Step 6: Verify TypeScript compiles**

Run: `npm run build`
Expected: 0 errors

**Step 7: Commit**

```bash
git add src/lib/combat/particles.ts src/lib/combat/particles.test.ts src/components/combat/BattleCanvas.tsx
git commit -m "feat: add canvas particle system with 10 attack patterns and 18 type configs"
```

---

### Task 5: Battle Playback Engine

Create a hook that takes a `TurnResult[]` and plays them back with timed animations, audio, particles, and DOM effects (damage numbers, screen shake, etc.). This is the orchestrator that ties audio, particles, and CSS together.

**Files:**
- Create: `src/hooks/useBattlePlayback.ts`
- Test: `src/hooks/useBattlePlayback.test.ts`

**Step 1: Write the test**

```typescript
// src/hooks/useBattlePlayback.test.ts
import { describe, it, expect, vi } from 'vitest';
import { buildTurnTimeline, type TimelineEvent } from '../hooks/useBattlePlayback';

describe('buildTurnTimeline', () => {
  const baseTurn = {
    turn: 1,
    fighter_a: { move: 'poke_fire_flamethrower', damage_dealt: 50, critical: false, effectiveness: 'neutral' as const, status_applied: null, hp_before: 100, hp_after: 50 },
    fighter_b: { move: 'poke_water_water-gun', damage_dealt: 30, critical: false, effectiveness: 'super_effective' as const, status_applied: null, hp_before: 100, hp_after: 70 },
    order: 'a_first' as const,
    end_of_turn: { fighter_a_hp: 70, fighter_b_hp: 50, fighter_a_status: null, fighter_b_status: null, fighter_a_stat_stages: {}, fighter_b_stat_stages: {}, ability_triggered: null },
  };

  it('produces timeline events in order', () => {
    const timeline = buildTurnTimeline(baseTurn, 'FIRE', 'WATER');
    expect(timeline.length).toBeGreaterThan(0);
    // First event should be turn announcement or first move
    expect(timeline[0].type).toBeDefined();
  });

  it('includes damage events for both fighters', () => {
    const timeline = buildTurnTimeline(baseTurn, 'FIRE', 'WATER');
    const damageEvents = timeline.filter(e => e.type === 'damage');
    expect(damageEvents.length).toBe(2);
  });

  it('includes effectiveness callout for super effective', () => {
    const timeline = buildTurnTimeline(baseTurn, 'FIRE', 'WATER');
    const effEvents = timeline.filter(e => e.type === 'effectiveness');
    expect(effEvents.some(e => e.effectiveness === 'super_effective')).toBe(true);
  });

  it('includes crit event when critical is true', () => {
    const critTurn = {
      ...baseTurn,
      fighter_a: { ...baseTurn.fighter_a, critical: true },
    };
    const timeline = buildTurnTimeline(critTurn, 'FIRE', 'WATER');
    const critEvents = timeline.filter(e => e.type === 'crit');
    expect(critEvents.length).toBeGreaterThan(0);
  });

  it('includes status event when status applied', () => {
    const statusTurn = {
      ...baseTurn,
      fighter_a: { ...baseTurn.fighter_a, status_applied: 'burn' },
    };
    const timeline = buildTurnTimeline(statusTurn, 'FIRE', 'WATER');
    const statusEvents = timeline.filter(e => e.type === 'status');
    expect(statusEvents.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useBattlePlayback.test.ts`
Expected: FAIL — module not found

**Step 3: Write the playback engine**

```typescript
// src/hooks/useBattlePlayback.ts
// Battle playback orchestrator — converts TurnResult[] into timed animation events

import { useState, useRef, useCallback } from 'react';
import { ANIM_TIMING, resolveAttackPattern, type AttackPattern } from '@/lib/combat/particles';
import { getMoveById } from '@/lib/combat/data/moves';
import type { TurnResult } from '@/lib/combat/battle-state';
import type { BattleCanvasRef } from '@/components/combat/BattleCanvas';
import { getBattleAudio } from '@/lib/combat/audio';

// ── Timeline Event Types ──

export type TimelineEvent =
  | { type: 'turn_start'; turn: number; delay: number }
  | { type: 'move_announce'; side: 'a' | 'b'; moveName: string; delay: number }
  | { type: 'attack_anim'; side: 'a' | 'b'; pattern: AttackPattern; moveType: string; power: number; delay: number }
  | { type: 'damage'; side: 'a' | 'b'; amount: number; effectiveness: string; isCrit: boolean; delay: number }
  | { type: 'crit'; side: 'a' | 'b'; delay: number }
  | { type: 'effectiveness'; side: 'a' | 'b'; effectiveness: string; delay: number }
  | { type: 'hp_update'; side: 'a' | 'b'; hp: number; maxHp: number; delay: number }
  | { type: 'status'; side: 'a' | 'b'; status: string; delay: number }
  | { type: 'heal'; side: 'a' | 'b'; amount: number; delay: number }
  | { type: 'shake'; amplitude: number; delay: number }
  | { type: 'faint'; side: 'a' | 'b'; delay: number };

/** Build a flat timeline of animation events from a single TurnResult */
export function buildTurnTimeline(turn: TurnResult, typeA: string, typeB: string): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  let t = 0;

  // Determine move order
  const first = turn.order === 'a_first' ? 'a' : 'b';
  const second = first === 'a' ? 'b' : 'a';
  const sides = [first, second] as const;

  for (const side of sides) {
    const attacker = side === 'a' ? turn.fighter_a : turn.fighter_b;
    const defender = side === 'a' ? turn.fighter_b : turn.fighter_a;
    const defSide = side === 'a' ? 'b' : 'a';
    const attackerType = side === 'a' ? typeA : typeB;

    const move = getMoveById(attacker.move);
    const moveName = move?.name ?? attacker.move;
    const moveType = move?.type ?? attackerType;
    const power = move?.power ?? 0;
    const category = move?.category ?? 'physical';

    // Skip if no move (flinched, frozen, etc)
    if (attacker.damage_dealt === 0 && !attacker.status_applied && !attacker.heal_amount) {
      t += ANIM_TIMING.missEffect;
      continue;
    }

    // Move announcement
    events.push({ type: 'move_announce', side, moveName, delay: t });
    t += ANIM_TIMING.useMoveTelegraph;

    // Attack animation (particles + attacker movement)
    const pattern = resolveAttackPattern(moveName, category, power, move?.effects);
    const travelKey = pattern in ANIM_TIMING.travelTime ? pattern : 'default';
    events.push({ type: 'attack_anim', side, pattern, moveType, power, delay: t });
    t += ANIM_TIMING.travelTime[travelKey];

    // Critical hit
    if (attacker.critical) {
      events.push({ type: 'crit', side: defSide, delay: t });
      events.push({ type: 'shake', amplitude: 6, delay: t });
      t += ANIM_TIMING.critFreeze;
    }

    // Damage number
    if (attacker.damage_dealt > 0) {
      events.push({
        type: 'damage',
        side: defSide,
        amount: attacker.damage_dealt,
        effectiveness: attacker.effectiveness,
        isCrit: attacker.critical,
        delay: t,
      });

      // Screen shake for high-power hits
      if (power >= 80) {
        events.push({ type: 'shake', amplitude: power >= 100 ? 6 : 3, delay: t });
      }

      t += ANIM_TIMING.damageDisplay;
    }

    // Effectiveness callout
    if (attacker.effectiveness !== 'neutral') {
      events.push({ type: 'effectiveness', side: defSide, effectiveness: attacker.effectiveness, delay: t });
      t += 400;
    }

    // HP update for defender
    events.push({ type: 'hp_update', side: defSide, hp: defender.hp_after, maxHp: defender.hp_before + attacker.damage_dealt, delay: t });

    // Status applied
    if (attacker.status_applied) {
      events.push({ type: 'status', side: defSide, status: attacker.status_applied, delay: t });
      t += ANIM_TIMING.statusInflict;
    }

    // Healing
    if (attacker.heal_amount && attacker.heal_amount > 0) {
      events.push({ type: 'heal', side, amount: attacker.heal_amount, delay: t });
      t += ANIM_TIMING.healEffect;
    }

    t += ANIM_TIMING.postDamage;
  }

  // Check for faints at end of turn
  if (turn.end_of_turn.fighter_a_hp <= 0) {
    events.push({ type: 'faint', side: 'a', delay: t });
  }
  if (turn.end_of_turn.fighter_b_hp <= 0) {
    events.push({ type: 'faint', side: 'b', delay: t });
  }

  return events;
}

// ── React Hook ──

interface PlaybackState {
  isPlaying: boolean;
  currentTurn: number;
  speed: number;
}

interface PlaybackCallbacks {
  onHpUpdate?: (side: 'a' | 'b', hp: number, maxHp: number) => void;
  onStatusChange?: (side: 'a' | 'b', status: string | null) => void;
  onComplete?: () => void;
}

export function useBattlePlayback(callbacks?: PlaybackCallbacks) {
  const [state, setState] = useState<PlaybackState>({ isPlaying: false, currentTurn: 0, speed: 1 });
  const canvasRef = useRef<BattleCanvasRef | null>(null);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const scheduleEvent = useCallback((event: TimelineEvent, speedMult: number, posA: { x: number; y: number }, posB: { x: number; y: number }) => {
    const delay = Math.max(50, event.delay / speedMult);
    const audio = getBattleAudio();

    const timer = setTimeout(() => {
      switch (event.type) {
        case 'move_announce':
          audio.turnStart();
          break;

        case 'attack_anim': {
          const isA = event.side === 'a';
          const start = isA ? posA : posB;
          const target = isA ? posB : posA;
          canvasRef.current?.playAttack({
            pattern: event.pattern,
            moveType: event.moveType,
            startX: start.x,
            startY: start.y,
            targetX: target.x,
            targetY: target.y,
            power: event.power,
          });
          break;
        }

        case 'damage': {
          if (event.isCrit) {
            audio.hitCrit(event.effectiveness === 'super_effective' ? undefined : undefined);
          } else if (event.effectiveness === 'super_effective') {
            audio.hitSuper();
          } else if (event.effectiveness === 'immune') {
            audio.miss();
          } else {
            audio.hit();
          }
          // Show floating damage number via DOM
          showDamageNumber(arenaRef.current, event.side, event.amount, event.isCrit, event.effectiveness);
          break;
        }

        case 'crit':
          audio.hitCrit();
          showCritText(arenaRef.current, event.side);
          break;

        case 'shake':
          triggerShake(arenaRef.current, event.amplitude);
          break;

        case 'hp_update':
          callbacks?.onHpUpdate?.(event.side, event.hp, event.maxHp);
          break;

        case 'status':
          audio.statusInflict();
          callbacks?.onStatusChange?.(event.side, event.status);
          break;

        case 'heal':
          audio.heal();
          showDamageNumber(arenaRef.current, event.side, event.amount, false, 'heal');
          break;

        case 'faint':
          audio.faint();
          break;

        case 'effectiveness':
          showEffectivenessCallout(arenaRef.current, event.effectiveness);
          break;
      }
    }, delay);

    timersRef.current.push(timer);
  }, [callbacks]);

  const playTurns = useCallback((turns: TurnResult[], typeA: string, typeB: string, posA: { x: number; y: number }, posB: { x: number; y: number }) => {
    clearTimers();
    setState(prev => ({ ...prev, isPlaying: true, currentTurn: 0 }));

    let totalDelay = 0;
    for (let i = 0; i < turns.length; i++) {
      const timeline = buildTurnTimeline(turns[i], typeA, typeB);
      for (const event of timeline) {
        const shifted = { ...event, delay: event.delay + totalDelay };
        scheduleEvent(shifted, state.speed, posA, posB);
      }
      // Add gap between turns
      const maxDelay = Math.max(...timeline.map(e => e.delay), 0);
      totalDelay += maxDelay + ANIM_TIMING.turnGap;

      // Update turn counter
      const turnDelay = totalDelay;
      const turnNum = i + 1;
      timersRef.current.push(setTimeout(() => {
        setState(prev => ({ ...prev, currentTurn: turnNum }));
      }, Math.max(50, turnDelay / state.speed)));
    }

    // Mark playback complete
    timersRef.current.push(setTimeout(() => {
      setState(prev => ({ ...prev, isPlaying: false }));
      callbacks?.onComplete?.();
    }, Math.max(50, (totalDelay + ANIM_TIMING.victoryDelay) / state.speed)));
  }, [clearTimers, scheduleEvent, state.speed, callbacks]);

  const stop = useCallback(() => {
    clearTimers();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, [clearTimers]);

  const setSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, speed }));
  }, []);

  return {
    state,
    canvasRef,
    arenaRef,
    playTurns,
    stop,
    setSpeed,
  };
}

// ── DOM Effect Helpers ──

function showDamageNumber(arena: HTMLDivElement | null, side: 'a' | 'b', amount: number, isCrit: boolean, effectiveness: string): void {
  if (!arena) return;
  const el = document.createElement('div');
  el.className = `damage-number ${getDamageClass(isCrit, effectiveness)}`;
  el.textContent = effectiveness === 'heal' ? `+${amount}` : `-${amount}`;
  // Position above the fighter panel
  el.style.left = side === 'a' ? '25%' : '75%';
  el.style.top = '30%';
  arena.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function getDamageClass(isCrit: boolean, effectiveness: string): string {
  if (effectiveness === 'heal') return 'damage-heal';
  if (isCrit) return 'damage-crit';
  if (effectiveness === 'super_effective') return 'damage-super';
  if (effectiveness === 'not_very_effective') return 'damage-resist';
  if (effectiveness === 'immune') return 'damage-immune';
  return 'damage-normal';
}

function showCritText(arena: HTMLDivElement | null, side: 'a' | 'b'): void {
  if (!arena) return;
  const el = document.createElement('div');
  el.className = 'crit-text';
  el.textContent = 'CRITICAL!';
  el.style.left = side === 'a' ? '25%' : '75%';
  el.style.top = '20%';
  arena.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function triggerShake(arena: HTMLDivElement | null, amplitude: number): void {
  if (!arena) return;
  const cls = amplitude >= 5 ? 'screen-shake-heavy' : 'screen-shake';
  arena.classList.add(cls);
  setTimeout(() => arena.classList.remove(cls), amplitude >= 5 ? 500 : 400);
}

function showEffectivenessCallout(arena: HTMLDivElement | null, effectiveness: string): void {
  if (!arena) return;
  const el = document.createElement('div');
  let text = '';
  let cls = 'effectiveness-callout ';
  switch (effectiveness) {
    case 'super_effective':
      text = 'SUPER EFFECTIVE!';
      cls += 'effectiveness-super';
      break;
    case 'not_very_effective':
      text = 'Not very effective...';
      cls += 'effectiveness-resist';
      break;
    case 'immune':
      text = 'NO EFFECT!';
      cls += 'effectiveness-immune';
      break;
    default:
      return;
  }
  el.className = cls;
  el.textContent = text;
  arena.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useBattlePlayback.test.ts`
Expected: PASS

**Step 5: Verify TypeScript compiles**

Run: `npm run build`
Expected: 0 errors

**Step 6: Commit**

```bash
git add src/hooks/useBattlePlayback.ts src/hooks/useBattlePlayback.test.ts
git commit -m "feat: add battle playback engine with timed animations, audio, and particle orchestration"
```

---

### Task 6: BattleView Rewrite

Rewrite `BattleView.tsx` to use the battle arena layout, canvas overlay, animated HP bars with ghost damage, status icons, and the playback engine from Task 5.

**Files:**
- Modify: `src/components/combat/BattleView.tsx`
- Modify: `src/components/combat/HPBar.tsx` (add ghost bar)
- Modify: `src/components/combat/index.ts` (export BattleCanvas)

**Step 1: Update HPBar with ghost damage effect**

Rewrite `HPBar.tsx` to include the ghost bar (red trail showing damage taken):

```tsx
// src/components/combat/HPBar.tsx

interface HPBarProps {
  current: number;
  max: number;
  label?: string;
  ghost?: number; // Previous HP value (for ghost damage trail)
}

export function HPBar({ current, max, label, ghost }: HPBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const ghostPct = ghost != null && max > 0 ? Math.max(0, Math.min(100, (ghost / max) * 100)) : pct;
  const tier = pct > 50 ? 'hp-high' : pct > 20 ? 'hp-mid' : 'hp-low';
  const isWarning = pct <= 25 && pct > 0;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-secondary">{label}</span>
          <span className="font-mono text-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {current}/{max}
          </span>
        </div>
      )}
      <div className={`hp-bar hp-bar-container ${isWarning ? 'hp-warning' : ''}`}>
        {/* Ghost bar (previous HP, fades after delay) */}
        {ghostPct > pct && (
          <div className="hp-bar-ghost" style={{ width: `${ghostPct}%` }} />
        )}
        <div className={`hp-bar-fill ${tier}`} style={{ width: `${pct}%`, position: 'relative' }} />
      </div>
    </div>
  );
}
```

**Step 2: Rewrite BattleView with arena, canvas, and playback**

```tsx
// src/components/combat/BattleView.tsx
// Full battle view with animated playback, particles, and audio

import { useState, useEffect, useCallback, useRef } from 'react';
import { HPBar } from './HPBar';
import { TurnLog } from './TurnLog';
import { MoveButtons } from './MoveButtons';
import { BattleCanvas, type BattleCanvasRef } from './BattleCanvas';
import { useBattlePlayback } from '@/hooks/useBattlePlayback';
import { getBattleAudio } from '@/lib/combat/audio';
import type { CombatType } from '@/lib/combat/types';
import type { TurnResult } from '@/lib/combat/battle-state';

interface FighterDisplay {
  nft_id: string;
  edition?: number;
  type: CombatType;
  nature: string;
  ability: string;
  level: number;
  elo: number;
  moves: { id: string; name: string; power: number; accuracy: number; category: string }[];
  imageUrl?: string;
}

interface BattleData {
  id: number;
  status: string;
  currentTurn: number;
  maxTurns: number;
  winner: string | null;
  fighterA: FighterDisplay | null;
  fighterB: FighterDisplay | null;
  turns: TurnResult[];
  eloChangeA?: number;
  eloChangeB?: number;
  xpAwardedA?: number;
  xpAwardedB?: number;
}

interface BattleViewProps {
  battleId: number;
  playerNftId?: string;
}

export function BattleView({ battleId, playerNftId }: BattleViewProps) {
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hpA, setHpA] = useState<{ current: number; ghost: number }>({ current: 0, ghost: 0 });
  const [hpB, setHpB] = useState<{ current: number; ghost: number }>({ current: 0, ghost: 0 });
  const [statusA, setStatusA] = useState<string | null>(null);
  const [statusB, setStatusB] = useState<string | null>(null);
  const [playedTurns, setPlayedTurns] = useState(0);
  const arenaContainerRef = useRef<HTMLDivElement>(null);

  const playback = useBattlePlayback({
    onHpUpdate: (side, hp, maxHp) => {
      const setter = side === 'a' ? setHpA : setHpB;
      setter(prev => ({ current: hp, ghost: prev.current }));
    },
    onStatusChange: (side, status) => {
      if (side === 'a') setStatusA(status);
      else setStatusB(status);
    },
    onComplete: () => {},
  });

  // Fetch battle state
  const fetchBattle = useCallback(async () => {
    try {
      const res = await fetch(`/api/combat/battle?id=${battleId}`);
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setBattle(data);
    } catch { setError('Failed to load battle'); }
  }, [battleId]);

  useEffect(() => {
    fetchBattle();
    const interval = setInterval(fetchBattle, 3000);
    return () => clearInterval(interval);
  }, [fetchBattle]);

  // Preload audio on first render
  useEffect(() => {
    getBattleAudio().preload();
  }, []);

  // Initialize HP on first battle data
  useEffect(() => {
    if (!battle) return;
    const maxA = computeMaxHP(battle.fighterA?.level ?? 1);
    const maxB = computeMaxHP(battle.fighterB?.level ?? 1);
    if (battle.turns.length === 0) {
      setHpA({ current: maxA, ghost: maxA });
      setHpB({ current: maxB, ghost: maxB });
    }
  }, [battle?.id]);

  // Play new turns as they arrive
  useEffect(() => {
    if (!battle || playback.state.isPlaying) return;
    const newTurns = battle.turns.slice(playedTurns);
    if (newTurns.length === 0) return;

    const typeA = battle.fighterA?.type ?? 'NEUTRAL';
    const typeB = battle.fighterB?.type ?? 'NEUTRAL';

    // Fighter positions relative to arena (approximate)
    const posA = { x: 100, y: 150 };
    const posB = { x: 300, y: 150 };

    playback.playTurns(newTurns, typeA, typeB, posA, posB);
    setPlayedTurns(battle.turns.length);
  }, [battle?.turns.length, playback.state.isPlaying]);

  const handleSubmitMove = useCallback(async (moveId: string) => {
    if (!playerNftId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/combat/submit-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId, nftId: playerNftId, moveId }),
      });
      const data = await res.json();
      if (data.turnResult) await fetchBattle();
    } catch (err) {
      console.error('[BattleView] Submit move error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [battleId, playerNftId, fetchBattle]);

  if (error) {
    return <div className="card-static p-6 text-center"><p className="text-error text-sm">{error}</p></div>;
  }
  if (!battle) {
    return <div className="card-static p-6 text-center"><p className="text-muted text-sm">Loading battle...</p></div>;
  }

  const isComplete = battle.status === 'completed';
  const isPlayerA = playerNftId === battle.fighterA?.nft_id;
  const playerFighter = isPlayerA ? battle.fighterA : battle.fighterB;
  const opponentFighter = isPlayerA ? battle.fighterB : battle.fighterA;
  const playerHp = isPlayerA ? hpA : hpB;
  const opponentHp = isPlayerA ? hpB : hpA;
  const playerStatus = isPlayerA ? statusA : statusB;
  const opponentStatus = isPlayerA ? statusB : statusA;
  const playerMaxHP = computeMaxHP(playerFighter?.level ?? 1);
  const opponentMaxHP = computeMaxHP(opponentFighter?.level ?? 1);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Battle header */}
      <div className="flex items-center justify-between text-sm text-muted">
        <span>Battle #{battle.id}</span>
        <span>Turn {playback.state.currentTurn || battle.currentTurn}/{battle.maxTurns}</span>
      </div>

      {/* Battle arena with canvas overlay */}
      <div
        ref={(el) => { playback.arenaRef.current = el; arenaContainerRef.current = el; }}
        className="battle-arena battle-scanlines"
        style={{ minHeight: '320px' }}
      >
        <BattleCanvas ref={(ref) => { playback.canvasRef.current = ref; }} />

        <div className="grid grid-cols-2 gap-4 p-4 relative z-[2]">
          {/* Player side */}
          <div className={`card p-3 flex flex-col gap-2 ${isComplete && battle.winner === playerFighter?.nft_id ? 'fighter-winner' : ''} ${isComplete && battle.winner && battle.winner !== playerFighter?.nft_id ? 'fighter-loser' : ''}`}>
            {playerFighter?.imageUrl && (
              <div className="battle-nft-image battle-slide-left">
                <img src={playerFighter.imageUrl} alt="Your fighter" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className={`badge badge-${playerFighter?.type.toLowerCase()}`}>{playerFighter?.type}</span>
              <span className="text-xs text-muted">Lv.{playerFighter?.level}</span>
            </div>
            {playerStatus && <StatusIcon status={playerStatus} />}
            <HPBar current={playerHp.current} max={playerMaxHP} ghost={playerHp.ghost} label="HP" />
          </div>

          {/* Opponent side */}
          <div className={`card p-3 flex flex-col gap-2 ${isComplete && battle.winner === opponentFighter?.nft_id ? 'fighter-winner' : ''} ${isComplete && battle.winner && battle.winner !== opponentFighter?.nft_id ? 'fighter-loser' : ''}`}>
            {opponentFighter?.imageUrl && (
              <div className="battle-nft-image battle-slide-right">
                <img src={opponentFighter.imageUrl} alt="Opponent" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className={`badge badge-${opponentFighter?.type.toLowerCase()}`}>{opponentFighter?.type}</span>
              <span className="text-xs text-muted">Lv.{opponentFighter?.level}</span>
            </div>
            {opponentStatus && <StatusIcon status={opponentStatus} />}
            <HPBar current={opponentHp.current} max={opponentMaxHP} ghost={opponentHp.ghost} label="HP" />
          </div>
        </div>
      </div>

      {/* Move buttons (manual mode) */}
      {!isComplete && playerFighter?.moves && playerNftId && (
        <MoveButtons moves={playerFighter.moves} onSubmit={handleSubmitMove} disabled={isSubmitting} />
      )}

      {/* Turn log */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Battle Log</h3>
        <TurnLog turns={battle.turns} />
      </div>

      {/* Result */}
      {isComplete && (
        <div className="card p-4 text-center">
          <p className="text-lg font-bold">
            {battle.winner === playerNftId ? 'Victory!' : battle.winner ? 'Defeat' : 'Draw'}
          </p>
          {battle.eloChangeA != null && (
            <div className="flex items-center justify-center gap-4 mt-2 text-sm text-secondary">
              <span>ELO: {(isPlayerA ? battle.eloChangeA : battle.eloChangeB) ?? 0 > 0 ? '+' : ''}{isPlayerA ? battle.eloChangeA : battle.eloChangeB}</span>
              <span>XP: +{isPlayerA ? battle.xpAwardedA : battle.xpAwardedB}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ──

function computeMaxHP(level: number): number {
  return Math.floor((2 * 80 + 31) * level / 100) + level + 10;
}

const STATUS_ICONS: Record<string, { icon: string; cls: string }> = {
  burn:      { icon: '\uD83D\uDD25', cls: 'status-burn' },
  burned:    { icon: '\uD83D\uDD25', cls: 'status-burn' },
  poison:    { icon: '\u2620\uFE0F', cls: 'status-poison' },
  paralysis: { icon: '\u26A1', cls: 'status-paralysis' },
  freeze:    { icon: '\u2744\uFE0F', cls: 'status-freeze' },
  frozen:    { icon: '\u2744\uFE0F', cls: 'status-freeze' },
  sleep:     { icon: '\uD83D\uDCA4', cls: 'status-sleep' },
  confusion: { icon: '\uD83D\uDE35', cls: 'status-confusion' },
  confused:  { icon: '\uD83D\uDE35', cls: 'status-confusion' },
};

function StatusIcon({ status }: { status: string }) {
  const info = STATUS_ICONS[status.toLowerCase()];
  if (!info) return null;
  return (
    <div className={`status-icon ${info.cls}`} title={status}>
      {info.icon}
    </div>
  );
}
```

**Step 3: Update barrel export**

In `src/components/combat/index.ts`, add:

```typescript
export { BattleCanvas } from './BattleCanvas';
```

**Step 4: Verify TypeScript compiles**

Run: `npm run build`
Expected: 0 errors

**Step 5: Commit**

```bash
git add src/components/combat/BattleView.tsx src/components/combat/HPBar.tsx src/components/combat/BattleCanvas.tsx src/components/combat/index.ts
git commit -m "feat: rewrite BattleView with animated playback, canvas particles, and audio"
```

---

### Task 7: Integration + Smoke Test

Wire everything together, verify the build, run tests, and push.

**Files:** None new (verification only)

**Step 1: Run TypeScript build**

Run: `npm run build`
Expected: 0 errors

**Step 2: Run combat unit tests**

Run: `npx vitest run src/lib/combat/`
Expected: 197+ tests passing (original 197 + new type-color, particles, audio, playback tests)

**Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 4: Verify git is clean and commit count**

Run: `git status && git log --oneline -10`
Expected: All changes committed, 6+ new commits from tasks 1-6

**Step 5: Push to remote**

Run: `git push origin main`
Expected: Push succeeds

**Step 6: Deploy (optional)**

Run: `/deploy` skill
Expected: Build + deploy succeeds

---

## Summary of Created Files

| File | Purpose | Lines (est) |
|------|---------|-------------|
| `src/lib/combat/data/type-colors.ts` | 18-type color map + flash colors | ~60 |
| `src/lib/combat/data/type-colors.test.ts` | Type color tests | ~30 |
| `src/lib/combat/audio.ts` | Web Audio manager (WAV + synth) | ~250 |
| `src/lib/combat/audio.test.ts` | Audio manager tests | ~50 |
| `src/lib/combat/particles.ts` | Particle engine (10 patterns) | ~600 |
| `src/lib/combat/particles.test.ts` | Particle system tests | ~80 |
| `src/components/combat/BattleCanvas.tsx` | React canvas overlay | ~80 |
| `src/hooks/useBattlePlayback.ts` | Playback orchestrator hook | ~250 |
| `src/hooks/useBattlePlayback.test.ts` | Playback timeline tests | ~60 |
| **Total new code** | | **~1460** |
| **Modified files** | theme.css, BattleView.tsx, HPBar.tsx, index.ts | |
| **Copied assets** | 15 WAV files (~7.2MB total) | |
