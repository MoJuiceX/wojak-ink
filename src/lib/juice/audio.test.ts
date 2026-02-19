import { describe, it, expect, vi } from 'vitest';
import {
  createAudioManager,
  setVolume,
  toggleMute,
  NOTES,
  C_MAJOR_SCALE,
  HAPTIC_PATTERNS,
  supportsHaptics,
  triggerHaptic,
  stopHaptic,

} from './audio';

// ============================================
// createAudioManager
// ============================================

describe('createAudioManager', () => {
  it('creates manager with context null', () => {
    const mgr = createAudioManager();
    expect(mgr.context).toBeNull();
  });

  it('creates manager with masterGain null', () => {
    const mgr = createAudioManager();
    expect(mgr.masterGain).toBeNull();
  });

  it('creates manager with initialized = false', () => {
    const mgr = createAudioManager();
    expect(mgr.initialized).toBe(false);
  });

  it('creates manager with muted = false', () => {
    const mgr = createAudioManager();
    expect(mgr.muted).toBe(false);
  });

  it('creates manager with volume = 1', () => {
    const mgr = createAudioManager();
    expect(mgr.volume).toBe(1);
  });

  it('creates a new independent manager on each call', () => {
    const mgr1 = createAudioManager();
    const mgr2 = createAudioManager();
    expect(mgr1).not.toBe(mgr2);
  });
});

// ============================================
// setVolume
// ============================================

describe('setVolume', () => {
  it('sets volume when within 0-1 range', () => {
    const mgr = createAudioManager();
    setVolume(mgr, 0.5);
    expect(mgr.volume).toBe(0.5);
  });

  it('clamps volume to 0 when given negative', () => {
    const mgr = createAudioManager();
    setVolume(mgr, -0.5);
    expect(mgr.volume).toBe(0);
  });

  it('clamps volume to 1 when given value > 1', () => {
    const mgr = createAudioManager();
    setVolume(mgr, 1.5);
    expect(mgr.volume).toBe(1);
  });

  it('allows setting volume to exactly 0', () => {
    const mgr = createAudioManager();
    setVolume(mgr, 0);
    expect(mgr.volume).toBe(0);
  });

  it('allows setting volume to exactly 1', () => {
    const mgr = createAudioManager();
    setVolume(mgr, 1);
    expect(mgr.volume).toBe(1);
  });

  it('updates masterGain when initialized', () => {
    const mockGain = { gain: { value: 1 } };
    const mgr = createAudioManager();
    mgr.masterGain = mockGain as unknown as GainNode;
    mgr.initialized = true;
    setVolume(mgr, 0.7);
    expect(mockGain.gain.value).toBe(0.7);
  });

  it('sets masterGain to 0 when muted', () => {
    const mockGain = { gain: { value: 1 } };
    const mgr = createAudioManager();
    mgr.masterGain = mockGain as unknown as GainNode;
    mgr.muted = true;
    setVolume(mgr, 0.8);
    expect(mockGain.gain.value).toBe(0);
  });
});

// ============================================
// toggleMute
// ============================================

describe('toggleMute', () => {
  it('toggles muted from false to true', () => {
    const mgr = createAudioManager();
    expect(mgr.muted).toBe(false);
    const result = toggleMute(mgr);
    expect(result).toBe(true);
    expect(mgr.muted).toBe(true);
  });

  it('toggles muted from true to false', () => {
    const mgr = createAudioManager();
    mgr.muted = true;
    const result = toggleMute(mgr);
    expect(result).toBe(false);
    expect(mgr.muted).toBe(false);
  });

  it('double-toggle returns to original state', () => {
    const mgr = createAudioManager();
    toggleMute(mgr);
    toggleMute(mgr);
    expect(mgr.muted).toBe(false);
  });

  it('sets masterGain to 0 when muting', () => {
    const mockGain = { gain: { value: 1 } };
    const mgr = createAudioManager();
    mgr.masterGain = mockGain as unknown as GainNode;
    mgr.volume = 0.8;
    toggleMute(mgr);
    expect(mockGain.gain.value).toBe(0);
  });

  it('restores masterGain to volume when unmuting', () => {
    const mockGain = { gain: { value: 0 } };
    const mgr = createAudioManager();
    mgr.masterGain = mockGain as unknown as GainNode;
    mgr.muted = true;
    mgr.volume = 0.6;
    toggleMute(mgr);
    expect(mockGain.gain.value).toBe(0.6);
  });
});

// ============================================
// NOTES constants
// ============================================

describe('NOTES', () => {
  it('defines A4 at 440 Hz', () => {
    expect(NOTES.A4).toBe(440.0);
  });

  it('defines C4 at 261.63 Hz', () => {
    expect(NOTES.C4).toBeCloseTo(261.63);
  });

  it('defines C5 at 523.25 Hz (one octave above C4)', () => {
    expect(NOTES.C5).toBeCloseTo(523.25);
  });

  it('C5 is approximately double C4 (octave relationship)', () => {
    expect(NOTES.C5 / NOTES.C4).toBeCloseTo(2, 0);
  });

  it('has 13 note entries', () => {
    expect(Object.keys(NOTES).length).toBe(13);
  });

  it('all notes have positive frequency values', () => {
    Object.values(NOTES).forEach(freq => {
      expect(freq).toBeGreaterThan(0);
    });
  });
});

// ============================================
// C_MAJOR_SCALE
// ============================================

describe('C_MAJOR_SCALE', () => {
  it('has 8 notes (octave)', () => {
    expect(C_MAJOR_SCALE).toHaveLength(8);
  });

  it('starts with C4', () => {
    expect(C_MAJOR_SCALE[0]).toBe(NOTES.C4);
  });

  it('ends with C5', () => {
    expect(C_MAJOR_SCALE[7]).toBe(NOTES.C5);
  });

  it('all notes are positive frequencies', () => {
    C_MAJOR_SCALE.forEach(freq => {
      expect(freq).toBeGreaterThan(0);
    });
  });

  it('notes are in ascending order', () => {
    for (let i = 0; i < C_MAJOR_SCALE.length - 1; i++) {
      expect(C_MAJOR_SCALE[i]).toBeLessThan(C_MAJOR_SCALE[i + 1]);
    }
  });
});

// ============================================
// HAPTIC_PATTERNS
// ============================================

describe('HAPTIC_PATTERNS', () => {
  it('defines "tap" pattern', () => {
    expect(HAPTIC_PATTERNS.tap).toBeDefined();
  });

  it('defines "success" pattern', () => {
    expect(HAPTIC_PATTERNS.success).toBeDefined();
  });

  it('defines "error" pattern', () => {
    expect(HAPTIC_PATTERNS.error).toBeDefined();
  });

  it('tap is a short duration (number)', () => {
    expect(typeof HAPTIC_PATTERNS.tap).toBe('number');
  });

  it('double is an array pattern', () => {
    expect(Array.isArray(HAPTIC_PATTERNS.double)).toBe(true);
  });

  it('success is an array pattern', () => {
    expect(Array.isArray(HAPTIC_PATTERNS.success)).toBe(true);
  });

  it('all pattern values are positive numbers or arrays of positive numbers', () => {
    Object.values(HAPTIC_PATTERNS).forEach(pattern => {
      if (typeof pattern === 'number') {
        expect(pattern).toBeGreaterThan(0);
      } else {
        (pattern as number[]).forEach(v => expect(v).toBeGreaterThanOrEqual(0));
      }
    });
  });
});

// ============================================
// supportsHaptics / triggerHaptic / stopHaptic
// ============================================

describe('supportsHaptics', () => {
  it('returns boolean', () => {
    expect(typeof supportsHaptics()).toBe('boolean');
  });

  it('returns false when navigator.vibrate is not present', () => {
    const originalVibrate = (navigator as unknown as Record<string, unknown>).vibrate;
    delete (navigator as unknown as Record<string, unknown>).vibrate;
    expect(supportsHaptics()).toBe(false);
    if (originalVibrate !== undefined) {
      (navigator as unknown as Record<string, unknown>).vibrate = originalVibrate;
    }
  });

  it('returns true when navigator.vibrate is defined', () => {
    const originalVibrate = (navigator as unknown as Record<string, unknown>).vibrate;
    (navigator as unknown as Record<string, unknown>).vibrate = vi.fn();
    expect(supportsHaptics()).toBe(true);
    (navigator as unknown as Record<string, unknown>).vibrate = originalVibrate;
  });
});

describe('triggerHaptic', () => {
  it('returns false when haptics not supported', () => {
    const originalVibrate = (navigator as unknown as Record<string, unknown>).vibrate;
    delete (navigator as unknown as Record<string, unknown>).vibrate;
    expect(triggerHaptic('tap')).toBe(false);
    if (originalVibrate !== undefined) {
      (navigator as unknown as Record<string, unknown>).vibrate = originalVibrate;
    }
  });

  it('returns true when haptics supported', () => {
    (navigator as unknown as Record<string, unknown>).vibrate = vi.fn(() => true);
    expect(triggerHaptic('tap')).toBe(true);
  });

  it('calls navigator.vibrate with a named pattern', () => {
    const vibrateMock = vi.fn();
    (navigator as unknown as Record<string, unknown>).vibrate = vibrateMock;
    triggerHaptic('tap');
    expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.tap);
  });

  it('calls navigator.vibrate with a numeric pattern directly', () => {
    const vibrateMock = vi.fn();
    (navigator as unknown as Record<string, unknown>).vibrate = vibrateMock;
    triggerHaptic(50);
    expect(vibrateMock).toHaveBeenCalledWith(50);
  });

  it('calls navigator.vibrate with an array pattern directly', () => {
    const vibrateMock = vi.fn();
    (navigator as unknown as Record<string, unknown>).vibrate = vibrateMock;
    triggerHaptic([10, 20, 30]);
    expect(vibrateMock).toHaveBeenCalledWith([10, 20, 30]);
  });

  it('falls back to tap pattern for unknown string patterns', () => {
    const vibrateMock = vi.fn();
    (navigator as unknown as Record<string, unknown>).vibrate = vibrateMock;
    triggerHaptic('unknown_pattern' as unknown as Parameters<typeof triggerHaptic>[0]);
    expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.tap);
  });
});

describe('stopHaptic', () => {
  it('calls navigator.vibrate(0) to stop', () => {
    const vibrateMock = vi.fn();
    (navigator as unknown as Record<string, unknown>).vibrate = vibrateMock;
    stopHaptic();
    expect(vibrateMock).toHaveBeenCalledWith(0);
  });

  it('does not throw when haptics not supported', () => {
    const originalVibrate = (navigator as unknown as Record<string, unknown>).vibrate;
    delete (navigator as unknown as Record<string, unknown>).vibrate;
    expect(() => stopHaptic()).not.toThrow();
    if (originalVibrate !== undefined) {
      (navigator as unknown as Record<string, unknown>).vibrate = originalVibrate;
    }
  });
});
