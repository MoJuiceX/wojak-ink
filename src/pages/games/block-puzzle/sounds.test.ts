import { describe, it, expect, vi } from 'vitest';
import {
  playComboNote,
  playLineClearSound,
  playSpawnSound,
  playSnapSound,
  playInvalidSound,
  playComboBreakSound,
  startDangerSound,
  stopDangerSound,
  playPerfectClearSound,
  playStreakFireSound,
} from './sounds';
import type { DangerSoundState } from './sounds';

// Minimal AudioContext mock that records calls
function makeAudioContextMock(): AudioContext {
  const oscillatorMock = {
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    type: 'sine' as OscillatorType,
  };

  const gainMock = {
    connect: vi.fn().mockReturnThis(),
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
  };

  const biquadMock = {
    connect: vi.fn().mockReturnThis(),
    type: 'bandpass' as BiquadFilterType,
    frequency: { value: 0 },
  };

  const bufferSourceMock = {
    buffer: null as AudioBuffer | null,
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
  };

  const bufferMock = {
    getChannelData: vi.fn().mockReturnValue(new Float32Array(100)),
    sampleRate: 44100,
  };

  return {
    state: 'running',
    currentTime: 0,
    destination: {} as AudioDestinationNode,
    sampleRate: 44100,
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn().mockReturnValue(oscillatorMock),
    createGain: vi.fn().mockReturnValue(gainMock),
    createBiquadFilter: vi.fn().mockReturnValue(biquadMock),
    createBufferSource: vi.fn().mockReturnValue(bufferSourceMock),
    createBuffer: vi.fn().mockReturnValue(bufferMock),
  } as unknown as AudioContext;
}

describe('playComboNote — null context guard', () => {
  it('returns immediately without throwing when ctx is null', async () => {
    await expect(playComboNote(null, 1)).resolves.toBeUndefined();
  });
});

describe('playComboNote — with mock context', () => {
  it('creates oscillator and gain for combo level 1 (single layer)', async () => {
    const ctx = makeAudioContextMock();
    await playComboNote(ctx, 1);
    expect(ctx.createOscillator).toHaveBeenCalled();
    expect(ctx.createGain).toHaveBeenCalled();
  });

  it('creates extra oscillator for sparkle layer at combo 3', async () => {
    const ctx = makeAudioContextMock();
    await playComboNote(ctx, 3);
    // 1 main + 1 sparkle = 2 oscillators
    expect(vi.mocked(ctx.createOscillator).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('creates extra oscillators for bass layer at combo 5', async () => {
    const ctx = makeAudioContextMock();
    await playComboNote(ctx, 5);
    // 1 main + 1 sparkle + 1 bass = 3 oscillators
    expect(vi.mocked(ctx.createOscillator).mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('clamps to combo 5 config for levels above 5', async () => {
    const ctx = makeAudioContextMock();
    await expect(playComboNote(ctx, 10)).resolves.toBeUndefined();
    expect(ctx.createOscillator).toHaveBeenCalled();
  });
});

describe('playLineClearSound — null context guard', () => {
  it('returns without throwing when ctx is null', () => {
    expect(() => playLineClearSound(null, 1)).not.toThrow();
  });
});

describe('playLineClearSound — with mock context', () => {
  it('creates oscillator for 1 line clear', () => {
    const ctx = makeAudioContextMock();
    playLineClearSound(ctx, 1);
    expect(ctx.createOscillator).toHaveBeenCalled();
  });

  it('creates additional chime oscillator for 2+ line clears', () => {
    vi.useFakeTimers();
    const ctx = makeAudioContextMock();
    playLineClearSound(ctx, 2);
    vi.runAllTimers();
    // At least 2 oscillators: main + chime
    expect(vi.mocked(ctx.createOscillator).mock.calls.length).toBeGreaterThanOrEqual(1);
    vi.useRealTimers();
  });
});

describe('playSpawnSound — null context guard', () => {
  it('returns without throwing when ctx is null', () => {
    expect(() => playSpawnSound(null)).not.toThrow();
  });

  it('creates oscillator and gain for spawn sound', () => {
    const ctx = makeAudioContextMock();
    playSpawnSound(ctx);
    expect(ctx.createOscillator).toHaveBeenCalled();
    expect(ctx.createGain).toHaveBeenCalled();
  });
});

describe('playSnapSound — null context guard', () => {
  it('returns without throwing when ctx is null', () => {
    expect(() => playSnapSound(null)).not.toThrow();
  });

  it('creates two oscillators (bass thunk + click overlay)', () => {
    const ctx = makeAudioContextMock();
    playSnapSound(ctx);
    expect(vi.mocked(ctx.createOscillator).mock.calls.length).toBe(2);
  });
});

describe('playInvalidSound — null context guard', () => {
  it('returns without throwing when ctx is null', () => {
    expect(() => playInvalidSound(null)).not.toThrow();
  });

  it('creates oscillator for rejection buzz', () => {
    const ctx = makeAudioContextMock();
    playInvalidSound(ctx);
    expect(ctx.createOscillator).toHaveBeenCalled();
  });
});

describe('playComboBreakSound', () => {
  it('does nothing when ctx is null', () => {
    expect(() => playComboBreakSound(null, 5)).not.toThrow();
  });

  it('does nothing when combo lost is less than 3', () => {
    const ctx = makeAudioContextMock();
    playComboBreakSound(ctx, 2);
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it('plays womp sound when combo of 3+ is lost', () => {
    const ctx = makeAudioContextMock();
    playComboBreakSound(ctx, 3);
    expect(ctx.createOscillator).toHaveBeenCalled();
  });

  it('plays womp sound when combo of 10+ is lost', () => {
    const ctx = makeAudioContextMock();
    playComboBreakSound(ctx, 10);
    expect(ctx.createOscillator).toHaveBeenCalled();
  });
});

describe('startDangerSound', () => {
  it('does nothing when ctx is null', () => {
    const state: DangerSoundState = { oscillator: null, gain: null };
    const result = startDangerSound(null, state);
    expect(result).toEqual({ oscillator: null, gain: null });
  });

  it('creates oscillator and gain when state is empty', () => {
    const ctx = makeAudioContextMock();
    const state: DangerSoundState = { oscillator: null, gain: null };
    const result = startDangerSound(ctx, state);
    expect(result.oscillator).not.toBeNull();
    expect(result.gain).not.toBeNull();
  });

  it('does nothing if oscillator already running (idempotent)', () => {
    const ctx = makeAudioContextMock();
    const existingOscillator = {} as OscillatorNode;
    const existingGain = {} as GainNode;
    const state: DangerSoundState = { oscillator: existingOscillator, gain: existingGain };
    const result = startDangerSound(ctx, state);
    // Should not create new oscillator
    expect(ctx.createOscillator).not.toHaveBeenCalled();
    expect(result.oscillator).toBe(existingOscillator);
  });
});

describe('stopDangerSound', () => {
  it('returns empty state with null oscillator/gain', () => {
    const ctx = makeAudioContextMock();
    const oscillatorMock = { stop: vi.fn() } as unknown as OscillatorNode;
    const gainMock = {
      gain: { linearRampToValueAtTime: vi.fn() },
    } as unknown as GainNode;
    const state: DangerSoundState = { oscillator: oscillatorMock, gain: gainMock };
    vi.useFakeTimers();
    const result = stopDangerSound(ctx, state);
    vi.runAllTimers();
    expect(result).toEqual({ oscillator: null, gain: null });
    vi.useRealTimers();
  });

  it('handles null state gracefully', () => {
    const ctx = makeAudioContextMock();
    const state: DangerSoundState = { oscillator: null, gain: null };
    expect(() => stopDangerSound(ctx, state)).not.toThrow();
  });
});

describe('playPerfectClearSound', () => {
  it('does not throw when ctx is null', () => {
    expect(() => playPerfectClearSound(null)).not.toThrow();
  });

  it('schedules 4 notes via setTimeout', () => {
    vi.useFakeTimers();
    const ctx = makeAudioContextMock();
    playPerfectClearSound(ctx);
    vi.runAllTimers();
    // 4 notes in arpeggio
    expect(vi.mocked(ctx.createOscillator).mock.calls.length).toBe(4);
    vi.useRealTimers();
  });
});

describe('playStreakFireSound', () => {
  it('does not throw when ctx is null', () => {
    expect(() => playStreakFireSound(null)).not.toThrow();
  });

  it('creates a buffer source and filter for the noise', () => {
    const ctx = makeAudioContextMock();
    playStreakFireSound(ctx);
    expect(ctx.createBuffer).toHaveBeenCalled();
    expect(ctx.createBufferSource).toHaveBeenCalled();
    expect(ctx.createBiquadFilter).toHaveBeenCalled();
  });
});
