/**
 * Tests for src/lib/juice/audio.ts
 *
 * NOTE: The requested file src/lib/combat/audio.ts does not exist. The
 * combat-relevant audio module lives at src/lib/juice/audio.ts. This test
 * file targets that module. Pure utility functions are exercised directly;
 * the Web Audio API surface is mocked via vi.stubGlobal / a constructable
 * class stub.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createAudioManager,
  initAudio,
  setVolume,
  toggleMute,
  playTone,
  NOTES,
  C_MAJOR_SCALE,
  playScaleNote,
  HAPTIC_PATTERNS,
  supportsHaptics,
  triggerHaptic,
  stopHaptic,
} from '@/lib/juice/audio';

// ---------------------------------------------------------------------------
// Web Audio API mock helpers
// ---------------------------------------------------------------------------

function buildGainNode() {
  return {
    connect: vi.fn(),
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
  };
}

function buildOscillator() {
  return {
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: {
      value: 0,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    type: 'sine' as OscillatorType,
  };
}

type MockAudioCtx = ReturnType<typeof buildMockAudioContext>;

function buildMockAudioContext() {
  const gainNode = buildGainNode();
  const oscillator = buildOscillator();

  const ctx = {
    state: 'running' as AudioContextState,
    currentTime: 0,
    sampleRate: 44100,
    destination: {} as AudioDestinationNode,
    createGain: vi.fn(() => gainNode),
    createOscillator: vi.fn(() => oscillator),
    createBuffer: vi.fn((_ch: number, size: number, _sr: number) => ({
      getChannelData: vi.fn(() => new Float32Array(size)),
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
    })),
    resume: vi.fn(),
  };

  return { ctx, gainNode, oscillator };
}

/**
 * Install a constructable AudioContext class on window that returns the
 * provided mock context object.
 */
function stubWindowAudioContext(ctxInstance: MockAudioCtx['ctx']) {
  // Must be a real constructor function (class) so `new` works.
  class MockAudioContext {
    state = ctxInstance.state;
    currentTime = ctxInstance.currentTime;
    sampleRate = ctxInstance.sampleRate;
    destination = ctxInstance.destination;
    createGain = ctxInstance.createGain;
    createOscillator = ctxInstance.createOscillator;
    createBuffer = ctxInstance.createBuffer;
    createBufferSource = ctxInstance.createBufferSource;
    resume = ctxInstance.resume;
  }

  Object.defineProperty(window, 'AudioContext', {
    value: MockAudioContext,
    writable: true,
    configurable: true,
  });

  return MockAudioContext;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// createAudioManager
// ---------------------------------------------------------------------------

describe('audio (src/lib/juice/audio)', () => {
  describe('createAudioManager', () => {
    it('returns a manager with initialized = false', () => {
      expect(createAudioManager().initialized).toBe(false);
    });

    it('returns a manager with muted = false', () => {
      expect(createAudioManager().muted).toBe(false);
    });

    it('returns a manager with volume = 1', () => {
      expect(createAudioManager().volume).toBe(1);
    });

    it('returns null context and masterGain before initialization', () => {
      const mgr = createAudioManager();
      expect(mgr.context).toBeNull();
      expect(mgr.masterGain).toBeNull();
    });

    it('each call returns an independent manager object', () => {
      const a = createAudioManager();
      const b = createAudioManager();
      a.muted = true;
      expect(b.muted).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // initAudio
  // -------------------------------------------------------------------------

  describe('initAudio', () => {
    it('returns true and marks initialized when AudioContext is available', () => {
      const { ctx } = buildMockAudioContext();
      stubWindowAudioContext(ctx);

      const mgr = createAudioManager();
      const result = initAudio(mgr);

      expect(result).toBe(true);
      expect(mgr.initialized).toBe(true);
    });

    it('returns true immediately when already initialized (skips re-init)', () => {
      const mgr = createAudioManager();
      mgr.initialized = true;
      // No AudioContext needed — should bail out early
      const result = initAudio(mgr);
      expect(result).toBe(true);
    });

    it('returns false when AudioContext is unavailable', () => {
      Object.defineProperty(window, 'AudioContext', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      const win = window as unknown as Record<string, unknown>;
      const prev = win['webkitAudioContext'];
      delete win['webkitAudioContext'];

      const mgr = createAudioManager();
      expect(initAudio(mgr)).toBe(false);
      expect(mgr.initialized).toBe(false);

      if (prev !== undefined) win['webkitAudioContext'] = prev;
    });

    it('sets masterGain on the manager after init', () => {
      const { ctx } = buildMockAudioContext();
      stubWindowAudioContext(ctx);

      const mgr = createAudioManager();
      initAudio(mgr);

      expect(mgr.masterGain).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // setVolume
  // -------------------------------------------------------------------------

  describe('setVolume', () => {
    it('clamps volume to 0 for negative input', () => {
      const mgr = createAudioManager();
      setVolume(mgr, -5);
      expect(mgr.volume).toBe(0);
    });

    it('clamps volume to 1 for values above 1', () => {
      const mgr = createAudioManager();
      setVolume(mgr, 99);
      expect(mgr.volume).toBe(1);
    });

    it('accepts in-range values without clamping', () => {
      const mgr = createAudioManager();
      setVolume(mgr, 0.5);
      expect(mgr.volume).toBe(0.5);
    });

    it('updates masterGain.gain.value when a gain node exists', () => {
      const { gainNode } = buildMockAudioContext();
      const mgr = createAudioManager();
      mgr.masterGain = gainNode as unknown as GainNode;

      setVolume(mgr, 0.7);

      expect(gainNode.gain.value).toBe(0.7);
    });

    it('sets masterGain.gain.value to 0 when muted, regardless of volume', () => {
      const { gainNode } = buildMockAudioContext();
      const mgr = createAudioManager();
      mgr.masterGain = gainNode as unknown as GainNode;
      mgr.muted = true;

      setVolume(mgr, 0.8);

      expect(gainNode.gain.value).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // toggleMute
  // -------------------------------------------------------------------------

  describe('toggleMute', () => {
    it('toggles muted from false to true and returns true', () => {
      const mgr = createAudioManager();
      const result = toggleMute(mgr);
      expect(result).toBe(true);
      expect(mgr.muted).toBe(true);
    });

    it('toggles muted from true to false and returns false', () => {
      const mgr = createAudioManager();
      mgr.muted = true;
      const result = toggleMute(mgr);
      expect(result).toBe(false);
      expect(mgr.muted).toBe(false);
    });

    it('sets masterGain to 0 when muting', () => {
      const { gainNode } = buildMockAudioContext();
      const mgr = createAudioManager();
      mgr.masterGain = gainNode as unknown as GainNode;

      toggleMute(mgr);

      expect(gainNode.gain.value).toBe(0);
    });

    it('restores masterGain to volume when un-muting', () => {
      const { gainNode } = buildMockAudioContext();
      const mgr = createAudioManager();
      mgr.masterGain = gainNode as unknown as GainNode;
      mgr.muted = true;
      mgr.volume = 0.6;

      toggleMute(mgr);

      expect(gainNode.gain.value).toBe(0.6);
    });
  });

  // -------------------------------------------------------------------------
  // playTone
  // -------------------------------------------------------------------------

  describe('playTone', () => {
    it('does nothing when manager is not initialized', () => {
      const mgr = createAudioManager();
      expect(() => playTone(mgr, 440)).not.toThrow();
    });

    it('does nothing when manager is muted', () => {
      const { ctx, gainNode } = buildMockAudioContext();
      const mgr = createAudioManager();
      mgr.initialized = true;
      mgr.muted = true;
      mgr.context = ctx as unknown as AudioContext;
      mgr.masterGain = gainNode as unknown as GainNode;

      playTone(mgr, 440, 0.1, 150);

      expect(ctx.createOscillator).not.toHaveBeenCalled();
    });

    it('creates an oscillator and gain node when initialized and unmuted', () => {
      const { ctx, gainNode } = buildMockAudioContext();
      const mgr = createAudioManager();
      mgr.initialized = true;
      mgr.muted = false;
      mgr.context = ctx as unknown as AudioContext;
      mgr.masterGain = gainNode as unknown as GainNode;

      playTone(mgr, 440, 0.1, 150);

      expect(ctx.createOscillator).toHaveBeenCalledOnce();
      expect(ctx.createGain).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // NOTES constant
  // -------------------------------------------------------------------------

  describe('NOTES', () => {
    it('contains A4 at 440 Hz', () => {
      expect(NOTES.A4).toBe(440.0);
    });

    it('contains C4 at approximately 261.63 Hz', () => {
      expect(NOTES.C4).toBeCloseTo(261.63, 1);
    });

    it('C5 is approximately double C4 (one octave up)', () => {
      expect(NOTES.C5).toBeCloseTo(NOTES.C4 * 2, 0);
    });

    it('exports exactly 13 notes', () => {
      expect(Object.keys(NOTES).length).toBe(13);
    });

    it('all frequencies are positive numbers', () => {
      for (const freq of Object.values(NOTES)) {
        expect(freq).toBeGreaterThan(0);
      }
    });
  });

  // -------------------------------------------------------------------------
  // C_MAJOR_SCALE
  // -------------------------------------------------------------------------

  describe('C_MAJOR_SCALE', () => {
    it('has 8 notes (C4 through C5)', () => {
      expect(C_MAJOR_SCALE.length).toBe(8);
    });

    it('starts with C4', () => {
      expect(C_MAJOR_SCALE[0]).toBe(NOTES.C4);
    });

    it('ends with C5', () => {
      expect(C_MAJOR_SCALE[C_MAJOR_SCALE.length - 1]).toBe(NOTES.C5);
    });
  });

  // -------------------------------------------------------------------------
  // playScaleNote
  // -------------------------------------------------------------------------

  describe('playScaleNote', () => {
    it('does not throw for index 0 on an uninitialized manager', () => {
      expect(() => playScaleNote(createAudioManager(), 0)).not.toThrow();
    });

    it('wraps out-of-range index via modulo without throwing', () => {
      expect(() => playScaleNote(createAudioManager(), 8)).not.toThrow();
      expect(() => playScaleNote(createAudioManager(), 100)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // HAPTIC_PATTERNS
  // -------------------------------------------------------------------------

  describe('HAPTIC_PATTERNS', () => {
    it('defines a tap pattern equal to 10 ms', () => {
      expect(HAPTIC_PATTERNS.tap).toBe(10);
    });

    it('success pattern is an array', () => {
      expect(Array.isArray(HAPTIC_PATTERNS.success)).toBe(true);
    });

    it('error pattern has 3 pulses', () => {
      expect((HAPTIC_PATTERNS.error as number[]).length).toBe(3);
    });

    it('heavy pattern is a single number', () => {
      expect(typeof HAPTIC_PATTERNS.heavy).toBe('number');
    });

    it('flutter pattern is an array with multiple entries', () => {
      expect(Array.isArray(HAPTIC_PATTERNS.flutter)).toBe(true);
      expect((HAPTIC_PATTERNS.flutter as number[]).length).toBeGreaterThan(1);
    });
  });

  // -------------------------------------------------------------------------
  // supportsHaptics
  // -------------------------------------------------------------------------

  describe('supportsHaptics', () => {
    it('returns true when navigator.vibrate is present', () => {
      vi.stubGlobal('navigator', { vibrate: vi.fn() });
      expect(supportsHaptics()).toBe(true);
    });

    it('returns false when navigator.vibrate is absent', () => {
      vi.stubGlobal('navigator', {});
      expect(supportsHaptics()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // triggerHaptic
  // -------------------------------------------------------------------------

  describe('triggerHaptic', () => {
    it('returns false when haptics are not supported', () => {
      vi.stubGlobal('navigator', {});
      expect(triggerHaptic('tap')).toBe(false);
    });

    it('calls navigator.vibrate with the tap pattern for "tap"', () => {
      const vibrateMock = vi.fn();
      vi.stubGlobal('navigator', { vibrate: vibrateMock });

      triggerHaptic('tap');

      expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.tap);
    });

    it('calls navigator.vibrate with a custom array pattern', () => {
      const vibrateMock = vi.fn();
      vi.stubGlobal('navigator', { vibrate: vibrateMock });

      triggerHaptic([10, 50, 10]);

      expect(vibrateMock).toHaveBeenCalledWith([10, 50, 10]);
    });

    it('returns true when vibrate call succeeds', () => {
      vi.stubGlobal('navigator', { vibrate: vi.fn() });
      expect(triggerHaptic('success')).toBe(true);
    });

    it('falls back to tap pattern for unknown string patterns', () => {
      const vibrateMock = vi.fn();
      vi.stubGlobal('navigator', { vibrate: vibrateMock });

      triggerHaptic('nonexistent_pattern' as never);

      expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.tap);
    });
  });

  // -------------------------------------------------------------------------
  // stopHaptic
  // -------------------------------------------------------------------------

  describe('stopHaptic', () => {
    it('calls navigator.vibrate(0) to cancel ongoing haptic', () => {
      const vibrateMock = vi.fn();
      vi.stubGlobal('navigator', { vibrate: vibrateMock });

      stopHaptic();

      expect(vibrateMock).toHaveBeenCalledWith(0);
    });

    it('does not throw when haptics are not supported', () => {
      vi.stubGlobal('navigator', {});
      expect(() => stopHaptic()).not.toThrow();
    });
  });
});
