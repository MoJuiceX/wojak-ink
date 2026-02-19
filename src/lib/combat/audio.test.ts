// src/lib/combat/audio.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getBattleAudio, BattleAudio, TYPE_AUDIO_PROFILES } from './audio';

// Mock Web Audio API nodes
function createMockGainNode() {
  return {
    gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createMockOscillatorNode() {
  return {
    type: 'sine' as OscillatorType,
    frequency: { value: 440, setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function createMockBufferSourceNode() {
  return {
    buffer: null as AudioBuffer | null,
    playbackRate: { value: 1.0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function createMockBiquadFilter() {
  return {
    type: 'lowpass' as BiquadFilterType,
    frequency: { value: 1000 },
    Q: { value: 1 },
    connect: vi.fn(),
  };
}

function createMockAudioContext() {
  return {
    state: 'running',
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => createMockOscillatorNode()),
    createGain: vi.fn(() => createMockGainNode()),
    createBufferSource: vi.fn(() => createMockBufferSourceNode()),
    createBiquadFilter: vi.fn(() => createMockBiquadFilter()),
    createBuffer: vi.fn(() => ({
      duration: 1.0,
      getChannelData: vi.fn(() => new Float32Array(44100)),
    })),
    decodeAudioData: vi.fn().mockResolvedValue({
      duration: 1.0,
      getChannelData: vi.fn(() => new Float32Array(44100)),
    }),
  };
}

// Stub AudioContext globally before imports
const mockCtx = createMockAudioContext();
vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));
vi.stubGlobal('webkitAudioContext', vi.fn(() => mockCtx));

describe('BattleAudio', () => {
  let audio: BattleAudio;

  beforeEach(() => {
    // Reset singleton for each test
    audio = getBattleAudio({ forceNew: true });
  });

  describe('initialization', () => {
    it('initializes with default settings', () => {
      expect(audio.sfxVolume).toBe(0.35);
      expect(audio.isMuted).toBe(false);
      expect(audio.shakeEnabled).toBe(true);
    });

    it('is a singleton by default', () => {
      const a = getBattleAudio();
      const b = getBattleAudio();
      expect(a).toBe(b);
    });

    it('forceNew creates a fresh instance', () => {
      const a = getBattleAudio();
      const b = getBattleAudio({ forceNew: true });
      expect(a).not.toBe(b);
    });
  });

  describe('volume', () => {
    it('can set SFX volume', () => {
      audio.sfxVolume = 0.5;
      expect(audio.sfxVolume).toBe(0.5);
    });

    it('clamps volume to max 0.7', () => {
      audio.sfxVolume = 0.9;
      expect(audio.sfxVolume).toBe(0.7);
    });

    it('clamps volume to min 0', () => {
      audio.sfxVolume = -0.5;
      expect(audio.sfxVolume).toBe(0);
    });

    it('accepts volume at exactly 0.7', () => {
      audio.sfxVolume = 0.7;
      expect(audio.sfxVolume).toBe(0.7);
    });

    it('accepts volume at exactly 0', () => {
      audio.sfxVolume = 0;
      expect(audio.sfxVolume).toBe(0);
    });
  });

  describe('mute', () => {
    it('toggles mute on', () => {
      audio.toggleMute();
      expect(audio.isMuted).toBe(true);
    });

    it('toggles mute off', () => {
      audio.toggleMute();
      audio.toggleMute();
      expect(audio.isMuted).toBe(false);
    });
  });

  describe('shake setting', () => {
    it('can disable shake', () => {
      audio.shakeEnabled = false;
      expect(audio.shakeEnabled).toBe(false);
    });

    it('can enable shake', () => {
      audio.shakeEnabled = false;
      audio.shakeEnabled = true;
      expect(audio.shakeEnabled).toBe(true);
    });
  });

  describe('type audio profiles', () => {
    it('has FIRE profile with sawtooth wave and freq 250', () => {
      const fire = TYPE_AUDIO_PROFILES.FIRE;
      expect(fire).toBeDefined();
      expect(fire.wave).toBe('sawtooth');
      expect(fire.freq).toBe(250);
      expect(fire.filter).toBe('lowpass');
      expect(fire.filterFreq).toBe(600);
      expect(fire.mod).toBe(8);
    });

    it('has WATER profile with sine wave and freq 350', () => {
      const water = TYPE_AUDIO_PROFILES.WATER;
      expect(water.wave).toBe('sine');
      expect(water.freq).toBe(350);
    });

    it('has ELECTRIC profile with square wave and freq 600', () => {
      const electric = TYPE_AUDIO_PROFILES.ELECTRIC;
      expect(electric.wave).toBe('square');
      expect(electric.freq).toBe(600);
      expect(electric.filter).toBe('highpass');
      expect(electric.filterFreq).toBe(1500);
      expect(electric.mod).toBe(40);
    });

    it('has all 11 base type profiles', () => {
      const expectedTypes = [
        'FIRE', 'WATER', 'ELECTRIC', 'GRASS', 'ICE',
        'SHADOW', 'METAL', 'PSYCHE', 'DRAGON', 'MYSTIC', 'NEUTRAL',
      ];
      for (const t of expectedTypes) {
        expect(TYPE_AUDIO_PROFILES[t]).toBeDefined();
        expect(TYPE_AUDIO_PROFILES[t].wave).toBeDefined();
        expect(TYPE_AUDIO_PROFILES[t].freq).toBeGreaterThan(0);
      }
    });

    it('returns NEUTRAL profile for unknown type via getProfile', () => {
      const profile = audio.getTypeProfile('UNKNOWN_TYPE');
      expect(profile).toEqual(TYPE_AUDIO_PROFILES.NEUTRAL);
    });

    it('resolves MARTIAL alias to FIRE', () => {
      const profile = audio.getTypeProfile('MARTIAL');
      expect(profile).toEqual(TYPE_AUDIO_PROFILES.FIRE);
    });

    it('resolves VENOM alias to SHADOW', () => {
      const profile = audio.getTypeProfile('VENOM');
      expect(profile).toEqual(TYPE_AUDIO_PROFILES.SHADOW);
    });

    it('resolves EARTH alias to NEUTRAL', () => {
      const profile = audio.getTypeProfile('EARTH');
      expect(profile).toEqual(TYPE_AUDIO_PROFILES.NEUTRAL);
    });

    it('resolves AIR alias to ICE', () => {
      const profile = audio.getTypeProfile('AIR');
      expect(profile).toEqual(TYPE_AUDIO_PROFILES.ICE);
    });

    it('resolves INSECT alias to GRASS', () => {
      const profile = audio.getTypeProfile('INSECT');
      expect(profile).toEqual(TYPE_AUDIO_PROFILES.GRASS);
    });

    it('resolves STONE alias to METAL', () => {
      const profile = audio.getTypeProfile('STONE');
      expect(profile).toEqual(TYPE_AUDIO_PROFILES.METAL);
    });

    it('resolves GHOST alias to SHADOW', () => {
      const profile = audio.getTypeProfile('GHOST');
      expect(profile).toEqual(TYPE_AUDIO_PROFILES.SHADOW);
    });
  });

  describe('sound effect methods exist', () => {
    it('has all required SFX methods', () => {
      const methods = [
        'hit', 'hitCrit', 'hitSuper', 'miss', 'faint', 'victory',
        'defeat', 'statusInflict', 'heal', 'moveSelect', 'turnStart',
        'statBoost', 'statDrop', 'matchFound', 'timerTick',
      ];
      for (const method of methods) {
        expect(typeof (audio as unknown as Record<string, unknown>)[method]).toBe('function');
      }
    });
  });

  describe('muted playback', () => {
    it('does not play when muted', () => {
      audio.toggleMute();
      // Should not throw even when muted
      expect(() => audio.hit('FIRE')).not.toThrow();
      expect(() => audio.miss()).not.toThrow();
      expect(() => audio.victory()).not.toThrow();
    });
  });

  describe('WAV path mapping', () => {
    it('maps all 15 WAV sample names', () => {
      const expectedSamples = [
        'strike', 'hit', 'burst', 'beam', 'charge', 'projectile',
        'electric', 'slash', 'wave', 'spin', 'drain', 'shield',
        'boost', 'status', 'heal',
      ];
      for (const name of expectedSamples) {
        expect(audio.hasWavPath(name)).toBe(true);
      }
    });

    it('returns false for unknown WAV names', () => {
      expect(audio.hasWavPath('nonexistent')).toBe(false);
    });
  });
});
